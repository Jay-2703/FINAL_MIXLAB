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
 * Check for time conflicts
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
      AND check_in_status != 'cancelled'
      AND (
        (booking_time <= ? AND ADDTIME(booking_time, CONCAT(hours, ':00:00')) > ?)
        OR (booking_time < ? AND ADDTIME(booking_time, CONCAT(hours, ':00:00')) >= ?)
        OR (booking_time >= ? AND booking_time < ?)
      )
    `;

    const params = [bookingDate, startTimeStr, startTimeStr, endTimeStr, startTimeStr, startTimeStr, endTimeStr];

    if (excludeBookingId) {
      conflictQuery += ' AND booking_id != ?';
      params.push(excludeBookingId);
    }

    const conflicts = await query(conflictQuery, params);

    return conflicts.length > 0;
  } catch (error) {
    console.error('Error checking time conflict:', error);
    return false; // On error, allow booking (can be made stricter)
  }
}

/**
 * Create booking from landing page input
 * POST /api/bookings/create-initial
 */
export const createInitialBooking = async (req, res) => {
  try {
    const { name, birthday, hours } = req.body;

    // Validation
    if (!name || !birthday || !hours) {
      return res.status(400).json({
        success: false,
        message: 'Name, birthday, and hours are required'
      });
    }

    // Validate hours
    const hoursNum = parseInt(hours);
    if (isNaN(hoursNum) || hoursNum < 1 || hoursNum > 8) {
      return res.status(400).json({
        success: false,
        message: 'Hours must be between 1 and 8'
      });
    }

    // Store in session storage (will be used on booking page)
    // For now, return success and let frontend handle storage
    res.json({
      success: true,
      message: 'Booking data saved',
      data: {
        name,
        birthday,
        hours: hoursNum
      }
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
 * GET /api/bookings/user-data
 */
export const getUserData = async (req, res) => {
  try {
    // Get user from token
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

    // Get user data
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
 * Create full booking
 * POST /api/bookings/create
 */
export const createBooking = async (req, res) => {
  const connection = await getConnection();
  
  try {
    await connection.beginTransaction();

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

    // Validation
    if (!name || !bookingDate || !bookingTime || !hours || !paymentMethod) {
      await connection.rollback();
      return res.status(400).json({
        success: false,
        message: 'Missing required fields'
      });
    }

    // Check for time conflicts
    const hasConflict = await checkTimeConflict(bookingDate, bookingTime, hours);
    if (hasConflict) {
      await connection.rollback();
      return res.status(409).json({
        success: false,
        message: 'Time slot is already booked. Please choose another time.'
      });
    }

    // Get user ID if authenticated
    let userId = null;
    const authHeader = req.headers['authorization'];
    if (authHeader) {
      const token = authHeader.split(' ')[1];
      const decoded = verifyToken(token);
      if (decoded && decoded.id) {
        userId = decoded.id;
      }
    }

    // Calculate amount
    const amount = calculateAmount(serviceType || 'rehearsal', hours);

    // Generate booking ID
    const bookingId = generateBookingId();

    // Determine payment status
    let paymentStatus = 'pending';
    let referenceNumber = null;
    let xenditInvoiceId = null;

    if (paymentMethod === 'cash') {
      paymentStatus = 'cash';
      referenceNumber = `CASH-${bookingId}`;
    } else {
      // For digital payments, create Xendit invoice
      const invoiceResult = await createInvoice({
        externalId: bookingId,
        amount: amount,
        payerEmail: email || 'guest@mixlab.com',
        description: `MixLab Studio Booking - ${serviceType || 'rehearsal'}`,
        paymentMethods: paymentMethod === 'gcash' ? ['GCASH'] : ['CREDIT_CARD', 'DEBIT_CARD'],
        metadata: {
          bookingId: bookingId,
          serviceType: serviceType,
          hours: hours
        }
      });

      if (invoiceResult.success) {
        xenditInvoiceId = invoiceResult.data.id;
        referenceNumber = invoiceResult.data.external_id;
      } else {
        await connection.rollback();
        return res.status(500).json({
          success: false,
          message: 'Failed to create payment invoice',
          error: invoiceResult.error
        });
      }
    }

    // Create booking
    const [result] = await query(
      `INSERT INTO bookings (
        booking_id, user_id, name, birthday, email, contact, home_address,
        service_type, booking_date, booking_time, hours, members,
        payment_method, amount, payment_status, reference_number, xendit_invoice_id
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        bookingId, userId, name, birthday || null, email || null, contact || null, homeAddress || null,
        serviceType || 'rehearsal', bookingDate, bookingTime, hours, members || 1,
        paymentMethod, amount, paymentStatus, referenceNumber, xenditInvoiceId
      ],
      connection
    );

    const bookingDbId = result.insertId;

    // Generate QR code
    const bookingData = {
      booking_id: bookingId,
      name,
      booking_date: bookingDate,
      booking_time: bookingTime,
      hours
    };

    const qrResult = await qrService.generateBookingQR(bookingData, bookingId);

    if (!qrResult.success) {
      console.error('Failed to generate QR code:', qrResult.error);
      // Continue without QR code, can be generated later
    }

    // Update booking with QR code
    if (qrResult.success) {
      await query(
        'UPDATE bookings SET qr_code_path = ?, qr_code_data = ? WHERE id = ?',
        [qrResult.qrPath, qrResult.qrDataUrl, bookingDbId],
        connection
      );
    }

    // Get full booking data
    const [booking] = await query(
      'SELECT * FROM bookings WHERE id = ?',
      [bookingDbId],
      connection
    );

    await connection.commit();

    // Send email with QR code if email provided
    if (email && qrResult.success) {
      bookingEmailService.sendBookingConfirmation(booking, qrResult.qrDataUrl)
        .catch(err => console.error('Failed to send booking email:', err));
    }

    res.json({
      success: true,
      message: 'Booking created successfully',
      data: {
        booking: booking,
        qrCode: qrResult.qrDataUrl,
        paymentUrl: paymentMethod !== 'cash' && invoiceResult.success ? invoiceResult.data.invoice_url : null
      }
    });
  } catch (error) {
    await connection.rollback();
    console.error('Error creating booking:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  } finally {
    connection.release();
  }
};

/**
 * Get booking by ID
 * GET /api/bookings/:bookingId
 */
export const getBooking = async (req, res) => {
  try {
    const { bookingId } = req.params;

    const [booking] = await query(
      'SELECT * FROM bookings WHERE booking_id = ?',
      [bookingId]
    );

    if (!booking) {
      return res.status(404).json({
        success: false,
        message: 'Booking not found'
      });
    }

    res.json({
      success: true,
      data: booking
    });
  } catch (error) {
    console.error('Error getting booking:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
};

/**
 * Update booking payment status
 * POST /api/bookings/update-payment
 */
export const updatePaymentStatus = async (req, res) => {
  try {
    const { bookingId, paymentStatus, xenditPaymentId } = req.body;

    if (!bookingId || !paymentStatus) {
      return res.status(400).json({
        success: false,
        message: 'Booking ID and payment status are required'
      });
    }

    await query(
      'UPDATE bookings SET payment_status = ?, xendit_payment_id = ?, updated_at = NOW() WHERE booking_id = ?',
      [paymentStatus, xenditPaymentId || null, bookingId]
    );

    res.json({
      success: true,
      message: 'Payment status updated'
    });
  } catch (error) {
    console.error('Error updating payment status:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
};

/**
 * Get available time slots for a date
 * GET /api/bookings/available-slots
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

    // Studio hours: 9 AM to 9 PM
    const startHour = 9;
    const endHour = 21;
    const hoursNeeded = parseInt(hours) || 1;

    // Get all bookings for this date
    const bookings = await query(
      `SELECT booking_time, hours FROM bookings 
       WHERE booking_date = ? 
       AND payment_status IN ('pending', 'paid', 'cash')
       AND check_in_status != 'cancelled'`,
      [date]
    );

    // Calculate occupied time slots
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

    // Generate available slots
    const availableSlots = [];
    for (let hour = startHour; hour <= endHour - hoursNeeded; hour++) {
      for (let minute = 0; minute < 60; minute += 30) {
        const slotTime = `${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`;
        let isAvailable = true;

        // Check if this slot and the next hours are available
        for (let h = 0; h < hoursNeeded; h++) {
          const checkHour = hour + h;
          const checkMinute = minute;
          const checkTime = `${checkHour.toString().padStart(2, '0')}:${checkMinute.toString().padStart(2, '0')}`;
          
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
      data: {
        date,
        availableSlots,
        hours: hoursNeeded
      }
    });
  } catch (error) {
    console.error('Error getting available slots:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
};

