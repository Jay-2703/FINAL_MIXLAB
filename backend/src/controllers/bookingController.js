import { query, getConnection } from '../config/db.js';
import { verifyToken } from '../utils/jwt.js';
import qrService from '../services/qrService.js';
import bookingEmailService from '../services/bookingEmailService.js';
import { createInvoice, getInvoiceStatus } from '../utils/xendit.js';
import crypto from 'crypto';

/**
 * Booking Controller
 * Handles all booking-related operations
 */

// Pricing per hour (in PHP)
const PRICING = {
  music_lesson: 500,
  recording: 1500,
  rehearsal: 800,
  dance: 600,
  arrangement: 2000,
  voiceover: 1000
};

/**
 * Generate unique booking ID
 */
function generateBookingId() {
  const timestamp = Date.now().toString(36).toUpperCase();
  const random = crypto.randomBytes(4).toString('hex').toUpperCase();
  return `MIX-${timestamp}-${random}`;
}

/**
 * Calculate booking amount
 */
function calculateAmount(serviceType, hours) {
  const rate = PRICING[serviceType] || PRICING.rehearsal;
  return rate * parseInt(hours);
}

/**
 * Check for time conflicts — UPDATED VERSION
 */
async function checkTimeConflict(bookingDate, bookingTime, hours, excludeBookingId = null) {
  try {
    // Calculate end time
    const [timeHours, timeMinutes] = bookingTime.split(':').map(Number);
    const startMinutes = timeHours * 60 + timeMinutes;
    const endMinutes = startMinutes + (hours * 60);

    // Convert to time strings for comparison
    const startTimeStr = `${Math.floor(startMinutes / 60).toString().padStart(2, '0')}:${(startMinutes % 60).toString().padStart(2, '0')}:00`;
    const endTimeStr = `${Math.floor(endMinutes / 60).toString().padStart(2, '0')}:${(endMinutes % 60).toString().padStart(2, '0')}:00`;

    let conflictQuery = `
      SELECT * FROM bookings 
      WHERE booking_date = ?
      AND payment_status IN ('pending', 'paid', 'cash')
      AND check_in_status NOT IN ('cancelled')
      AND (
        (booking_time <= ? AND ADDTIME(booking_time, CONCAT(hours, ':00:00')) > ?)
        OR (booking_time < ? AND ADDTIME(booking_time, CONCAT(hours, ':00:00')) >= ?)
        OR (booking_time >= ? AND booking_time < ?)
      )
    `;

    const params = [
      bookingDate,
      startTimeStr, startTimeStr,
      endTimeStr, startTimeStr,
      startTimeStr, endTimeStr
    ];

    if (excludeBookingId) {
      conflictQuery += ' AND booking_id != ?';
      params.push(excludeBookingId);
    }

    const conflicts = await query(conflictQuery, params);
    return conflicts.length > 0;
  } catch (error) {
    console.error('Error checking time conflict:', error);
    return false;
  }
}

/**
 * Helper: Notify admins
 */
async function notifyAdmins(type, message, link) {
  console.log(`[ADMIN NOTIFICATION] ${type}: ${message} - ${link}`);
}

/**
 * Create booking from landing page input
 */
export const createInitialBooking = async (req, res) => {
  try {
    const { name, birthday, hours } = req.body;

    if (!name || !birthday || !hours) {
      return res.status(400).json({
        success: false,
        message: 'Name, birthday, and hours are required'
      });
    }

    const hoursNum = parseInt(hours);
    if (isNaN(hoursNum) || hoursNum < 1 || hoursNum > 8) {
      return res.status(400).json({
        success: false,
        message: 'Hours must be between 1 and 8'
      });
    }

    res.json({
      success: true,
      message: 'Booking data saved',
      data: { name, birthday, hours: hoursNum }
    });
  } catch (error) {
    console.error('Error creating initial booking:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
};

/**
 * Get user data for auto-fill
 */
export const getUserData = async (req, res) => {
  try {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) {
      return res.status(401).json({
        success: false,
        message: 'Authentication required'
      });
    }

    const decoded = verifyToken(token);
    if (!decoded || !decoded.id) {
      return res.status(401).json({
        success: false,
        message: 'Invalid token'
      });
    }

    const [user] = await query(
      'SELECT id, first_name, last_name, email, birthday, contact, home_address FROM users WHERE id = ?',
      [decoded.id]
    );

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    res.json({
      success: true,
      data: {
        name: `${user.first_name} ${user.last_name}`,
        firstName: user.first_name,
        lastName: user.last_name,
        email: user.email,
        birthday: user.birthday,
        contact: user.contact,
        homeAddress: user.home_address
      }
    });
  } catch (error) {
    console.error('Error getting user data:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
};

/**
 * Create new booking
 */
export const createBooking = async (req, res) => {
  try {
    const {
      name,
      birthday,
      email,
      contact,
      homeAddress,
      serviceType,
      bookingDate,
      bookingTime,
      hours,
      members,
      paymentMethod
    } = req.body;

    if (!name || !email || !contact || !serviceType || !bookingDate || !bookingTime) {
      return res.status(400).json({
        success: false,
        message: 'Missing required fields'
      });
    }

    const bookingHours = parseInt(hours) || 1;

    if (bookingHours < 1 || bookingHours > 12) {
      return res.status(400).json({
        success: false,
        message: 'Hours must be between 1 and 12'
      });
    }

    // CONFIRM NO TIME CONFLICT
    const hasConflict = await checkTimeConflict(bookingDate, bookingTime, bookingHours);
    if (hasConflict) {
      return res.status(409).json({
        success: false,
        message: 'This time slot is already booked. Please choose another time.'
      });
    }

    const userId = req.user?.id || null;

    const totalPrice = calculateAmount(serviceType, bookingHours);

    const bookingId = generateBookingId();

    // Insert booking
    const result = await query(
      `INSERT INTO bookings 
       (booking_id, user_id, name, birthday, email, contact, home_address, 
        service_type, booking_date, booking_time, hours, members, 
        payment_method, total_price, payment_status, check_in_status, created_at) 
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'pending', 'pending', NOW())`,
      [
        bookingId,
        userId,
        name,
        birthday,
        email,
        contact,
        homeAddress,
        serviceType,
        bookingDate,
        bookingTime,
        bookingHours,
        members || 1,
        paymentMethod,
        totalPrice
      ]
    );

    let paymentUrl = null;
    let xenditInvoiceId = null;

    if (paymentMethod === 'gcash' || paymentMethod === 'credit_card') {
      try {
        const invoiceResult = await createInvoice({
          externalId: bookingId,
          amount: totalPrice,
          payerEmail: email,
          description: `MixLab Studio - ${formatServiceType(serviceType)} Booking`,
          metadata: {
            booking_id: bookingId,
            service_type: serviceType,
            booking_date: bookingDate,
            booking_time: bookingTime,
            customer_name: name
          }
        });

        if (invoiceResult.success) {
          paymentUrl = invoiceResult.data.invoice_url;
          xenditInvoiceId = invoiceResult.data.id;

          await query(
            'UPDATE bookings SET xendit_invoice_id = ? WHERE booking_id = ?',
            [xenditInvoiceId, bookingId]
          );
        } else {
          return res.status(500).json({
            success: false,
            message: 'Failed to create payment invoice'
          });
        }
      } catch (error) {
        console.error(error);
        return res.status(500).json({
          success: false,
          message: 'Failed to initialize payment'
        });
      }
    }

    await notifyAdmins(
      'booking',
      `New booking from ${name} for ${serviceType} on ${bookingDate}`,
      `/frontend/views/admin/bookings.html`
    );

    res.status(201).json({
      success: true,
      message: 'Booking created successfully',
      data: {
        booking: {
          booking_id: bookingId,
          id: result.insertId,
          status: 'pending',
          payment_status: 'pending',
          total_price: totalPrice,
          service_type: serviceType,
          booking_date: bookingDate,
          booking_time: bookingTime
        },
        paymentUrl
      }
    });

  } catch (error) {
    console.error('Create booking error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to create booking'
    });
  }
};

/**
 * Get user's bookings
 */
export const getUserBookings = async (req, res) => {
  try {
    const userId = req.user.id;

    const bookings = await query(
      `SELECT * FROM bookings 
       WHERE user_id = ? 
       ORDER BY booking_date DESC, booking_time DESC`,
      [userId]
    );

    res.json({
      success: true,
      data: { bookings }
    });
  } catch (error) {
    console.error('Get user bookings error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch bookings'
    });
  }
};

/**
 * Get specific booking
 */
export const getBooking = async (req, res) => {
  try {
    const { bookingId } = req.params;
    const userId = req.user.id;

    const bookings = await query(
      `SELECT * FROM bookings 
       WHERE id = ? AND user_id = ?`,
      [bookingId, userId]
    );

    if (!bookings || bookings.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Booking not found'
      });
    }

    res.json({
      success: true,
      data: { booking: bookings[0] }
    });
  } catch (error) {
    console.error('Get booking error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch booking'
    });
  }
};

/**
 * Update payment status
 */
export const updatePaymentStatus = async (req, res) => {
  try {
    const { bookingId, paymentStatus } = req.body;

    if (!bookingId || !paymentStatus) {
      return res.status(400).json({
        success: false,
        message: 'Missing required fields'
      });
    }

    await query(
      'UPDATE bookings SET payment_status = ? WHERE booking_id = ?',
      [paymentStatus, bookingId]
    );

    res.json({
      success: true,
      message: 'Payment status updated'
    });
  } catch (error) {
    console.error('Update payment status error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update payment status'
    });
  }
};

/**
 * Format service type
 */
function formatServiceType(type) {
  const types = {
    'recording': 'Recording Studio',
    'voiceover': 'Voiceover/Podcast',
    'arrangement': 'Music Arrangement'
  };
  return types[type] || type;
}

/**
 * Get available time slots — UPDATED VERSION
 */
export const getAvailableSlots = async (req, res) => {
  try {
    const { date, hours } = req.query;

    if (!date) {
      return res.status(400).json({
        success: false,
        message: 'Date is required'
      });
    }

    const startHour = 9;
    const endHour = 21;
    const hoursNeeded = parseInt(hours) || 1;

    const bookings = await query(
      `SELECT booking_time, hours FROM bookings 
       WHERE booking_date = ?
       AND payment_status IN ('pending', 'paid', 'cash')
       AND check_in_status NOT IN ('cancelled')`,
      [date]
    );

    const occupiedSlots = new Set();

    bookings.forEach(booking => {
      const [timeHours, timeMinutes] = booking.booking_time.split(':').map(Number);
      const startMinutes = timeHours * 60 + timeMinutes;
      const endMinutes = startMinutes + (booking.hours * 60);

      for (let min = startMinutes; min < endMinutes; min += 30) {
        const hour = Math.floor(min / 60);
        const minute = min % 60;
        occupiedSlots.add(`${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`);
      }
    });

    const availableSlots = [];

    for (let hour = startHour; hour <= endHour - hoursNeeded; hour++) {
      for (let minute = 0; minute < 60; minute += 30) {
        const slotTime = `${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`;

        let isAvailable = true;

        for (let h = 0; h < hoursNeeded; h++) {
          const checkHour = hour + h;
          const checkTime = `${checkHour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`;

          if (occupiedSlots.has(checkTime) || checkHour >= endHour) {
            isAvailable = false;
            break;
          }
        }

        if (isAvailable) {
          availableSlots.push(slotTime);
        }
      }
    }

    res.json({
      success: true,
      data: { date, availableSlots, hours: hoursNeeded }
    });

  } catch (error) {
    console.error('Error getting available slots:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
};
