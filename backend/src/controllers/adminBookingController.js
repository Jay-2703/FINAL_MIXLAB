import { query } from "../config/db.js";
import { getIO } from "../config/socket.js";
import { notifyAdmins } from "../services/notificationService.js";

/**
 * Get all bookings
 * GET /api/admin/bookings
 */
export const getBookings = async (req, res) => {
  try {
    const { date, service_type, status, page = 1, limit = 20 } = req.query;
    const offset = (page - 1) * limit;

    let sql = `
      SELECT b.*, 
      u.username AS customer_name,
      u.email AS customer_email,
      u.contact AS customer_contact
      FROM bookings b
      LEFT JOIN users u ON b.user_id = u.id
      WHERE 1=1
    `;

    const params = [];

    if (date) {
      sql += " AND b.booking_date = ?";
      params.push(date);
    }

    if (service_type) {
      sql += " AND b.service_type = ?";
      params.push(service_type);
    }

    if (status) {
      sql += " AND b.status = ?";
      params.push(status);
    }

    // Count query
    const countSql = sql.replace(/SELECT(.|\n)*?FROM/, "SELECT COUNT(*) AS count FROM");
    const [countResult] = await query(countSql, params);
    const total = countResult[0]?.count || 0;

    // Fetch records
    sql += " ORDER BY b.booking_date ASC, b.booking_time ASC LIMIT ? OFFSET ?";
    params.push(parseInt(limit), parseInt(offset));

    const bookings = await query(sql, params);

    res.json({
      success: true,
      data: {
        bookings,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total,
          pages: Math.ceil(total / limit),
        },
      },
    });
  } catch (error) {
    console.error("Get bookings error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch bookings",
    });
  }
};

/**
 * Create new booking
 * POST /api/admin/bookings
 */
export const createBooking = async (req, res) => {
  try {
    const { user_id, booking_date, booking_time, service_type, notes } = req.body;

    if (!user_id || !booking_date || !booking_time) {
      return res.status(400).json({
        success: false,
        message: "Missing required fields: user_id, booking_date, booking_time",
      });
    }

    const result = await query(
      `INSERT INTO bookings (user_id, booking_date, booking_time, service_type, notes, status)
       VALUES (?, ?, ?, ?, ?, 'pending')`,
      [user_id, booking_date, booking_time, service_type || "recording", notes || null]
    );

    // Notify admins
    await notifyAdmins(
      "booking",
      `New booking created for ${booking_date} at ${booking_time}`,
      `/frontend/views/admin/bookings.html`
    );

    res.json({
      success: true,
      message: "Booking created successfully",
      data: { bookingId: result.insertId },
    });
  } catch (error) {
    console.error("Create booking error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to create booking",
    });
  }
};

/**
 * Update booking
 * PUT /api/admin/bookings/:id
 */
export const updateBooking = async (req, res) => {
  try {
    const { id } = req.params;
    const { booking_date, booking_time, service_type, status, notes } = req.body;

    const updates = [];
    const params = [];

    if (booking_date !== undefined) {
      updates.push("booking_date = ?");
      params.push(booking_date);
    }
    if (booking_time !== undefined) {
      updates.push("booking_time = ?");
      params.push(booking_time);
    }
    if (service_type !== undefined) {
      updates.push("service_type = ?");
      params.push(service_type);
    }
    if (status !== undefined) {
      updates.push("status = ?");
      params.push(status);
    }
    if (notes !== undefined) {
      updates.push("notes = ?");
      params.push(notes);
    }

    if (updates.length === 0) {
      return res.status(400).json({
        success: false,
        message: "No fields to update",
      });
    }

    params.push(id);

    await query(`UPDATE bookings SET ${updates.join(", ")} WHERE id = ?`, params);

    // Notify admins
    await notifyAdmins(
      "booking",
      `Booking updated (ID: ${id})`,
      `/frontend/views/admin/bookings.html`
    );

    res.json({
      success: true,
      message: "Booking updated successfully",
    });
  } catch (error) {
    console.error("Update booking error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to update booking",
    });
  }
};

/**
 * Delete booking
 * DELETE /api/admin/bookings/:id
 */
export const deleteBooking = async (req, res) => {
  try {
    const { id } = req.params;

    await query("DELETE FROM bookings WHERE id = ?", [id]);

    await notifyAdmins(
      "booking",
      "A booking has been deleted",
      `/frontend/views/admin/bookings.html`
    );

    res.json({
      success: true,
      message: "Booking deleted successfully",
    });
  } catch (error) {
    console.error("Delete booking error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to delete booking",
    });
  }
};

/**
 * Get available time slots
 * GET /api/admin/bookings/slots
 */
export const getAvailableSlots = async (req, res) => {
  try {
    const { date } = req.query;

    if (!date) {
      return res.status(400).json({
        success: false,
        message: "Date parameter is required",
      });
    }

    const booked = await query(
      `SELECT booking_time FROM bookings 
       WHERE booking_date = ? AND status != 'cancelled'`,
      [date]
    );

    // Generate 9 AM – 9 PM slots
    const allSlots = [];
    for (let hour = 9; hour < 21; hour++) {
      allSlots.push(`${hour.toString().padStart(2, "0")}:00:00`);
    }

    const bookedTimes = booked.map((b) => b.booking_time);
    const availableSlots = allSlots.filter((slot) => !bookedTimes.includes(slot));

    res.json({
      success: true,
      data: { availableSlots, bookedTimes },
    });
  } catch (error) {
    console.error("Get available slots error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch time slots",
    });
  }
};