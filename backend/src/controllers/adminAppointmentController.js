import { query } from '../config/db.js';
import { getIO } from '../config/socket.js';
import { notifyAdmins } from '../services/notificationService.js';

/**
 * Get all appointments with filters
 * GET /api/admin/appointments
 */
export const getAppointments = async (req, res) => {
  try {
    const { date, instructor_id, service_type, status, page = 1, limit = 20 } = req.query;
    const offset = (page - 1) * limit;

    let sql = `
      SELECT a.*,
      u1.first_name as student_first_name, u1.last_name as student_last_name, u1.email as student_email,
      u2.first_name as instructor_first_name, u2.last_name as instructor_last_name, u2.email as instructor_email
      FROM appointments a
      LEFT JOIN users u1 ON a.student_id = u1.id
      LEFT JOIN users u2 ON a.instructor_id = u2.id
      WHERE 1=1
    `;
    const params = [];

    if (date) {
      sql += ' AND a.date = ?';
      params.push(date);
    }
    if (instructor_id) {
      sql += ' AND a.instructor_id = ?';
      params.push(instructor_id);
    }
    if (service_type) {
      sql += ' AND a.service_type = ?';
      params.push(service_type);
    }
    if (status) {
      sql += ' AND a.status = ?';
      params.push(status);
    }

    // Get total count
    const countSql = sql.replace(/SELECT.*FROM/, 'SELECT COUNT(*) as count FROM');
    const [countResult] = await query(countSql, params);
    const total = countResult[0]?.count || 0;

    // Get paginated results
    sql += ' ORDER BY a.date ASC, a.time ASC LIMIT ? OFFSET ?';
    params.push(parseInt(limit), parseInt(offset));

    const appointments = await query(sql, params);

    res.json({
      success: true,
      data: {
        appointments,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total,
          pages: Math.ceil(total / limit)
        }
      }
    });
  } catch (error) {
    console.error('Get appointments error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch appointments'
    });
  }
};

/**
 * Create appointment
 * POST /api/admin/appointments
 */
export const createAppointment = async (req, res) => {
  try {
    const { student_id, instructor_id, booking_id, date, time, service_type, notes } = req.body;

    if (!student_id || !date || !time) {
      return res.status(400).json({
        success: false,
        message: 'Missing required fields: student_id, date, time'
      });
    }

    const result = await query(
      `INSERT INTO appointments (student_id, instructor_id, booking_id, date, time, service_type, notes, status)
       VALUES (?, ?, ?, ?, ?, ?, ?, 'pending')`,
      [student_id, instructor_id || null, booking_id || null, date, time, service_type || 'lesson', notes || null]
    );

    // Notify student
    await query(
      'INSERT INTO notifications (user_id, type, message, link) VALUES (?, ?, ?, ?)',
      [student_id, 'appointment', `New appointment scheduled for ${date} at ${time}`, `/appointments/${result.insertId}`]
    );

    // Notify admins about new appointment
    try {
      await notifyAdmins(
        'appointment',
        `New appointment created: ${date} at ${time}`,
        `/frontend/views/admin/appointments.html`
      );
    } catch (notifError) {
      console.error('Error sending appointment notification:', notifError);
    }

    // Send real-time notification to student
    const io = getIO();
    if (io) {
      io.to(`user:${student_id}`).emit('notification', {
        type: 'appointment',
        message: `New appointment scheduled for ${date} at ${time}`,
        link: `/appointments/${result.insertId}`
      });
    }

    // Log activity
    await query(
      'INSERT INTO activity_logs (user_id, type, details, status) VALUES (?, ?, ?, ?)',
      [req.user.id, 'appointment_created', JSON.stringify({ appointmentId: result.insertId, student_id, date, time }), 'success']
    );

    res.json({
      success: true,
      message: 'Appointment created successfully',
      data: { appointmentId: result.insertId }
    });
  } catch (error) {
    console.error('Create appointment error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to create appointment'
    });
  }
};

/**
 * Update appointment
 * PUT /api/admin/appointments/:id
 */
export const updateAppointment = async (req, res) => {
  try {
    const { id } = req.params;
    const { instructor_id, date, time, service_type, status, notes } = req.body;

    const updates = [];
    const params = [];

    if (instructor_id !== undefined) {
      updates.push('instructor_id = ?');
      params.push(instructor_id);
    }
    if (date !== undefined) {
      updates.push('date = ?');
      params.push(date);
    }
    if (time !== undefined) {
      updates.push('time = ?');
      params.push(time);
    }
    if (service_type !== undefined) {
      updates.push('service_type = ?');
      params.push(service_type);
    }
    if (status !== undefined) {
      updates.push('status = ?');
      params.push(status);
    }
    if (notes !== undefined) {
      updates.push('notes = ?');
      params.push(notes);
    }

    if (updates.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'No fields to update'
      });
    }

    params.push(id);

    await query(
      `UPDATE appointments SET ${updates.join(', ')} WHERE id = ?`,
      params
    );

    // Get appointment to notify student and admins
    const [appointments] = await query('SELECT student_id, date, time, status FROM appointments WHERE id = ?', [id]);
    if (appointments && appointments.length > 0) {
      const appointment = appointments[0];
      
      // Notify student
      await query(
        'INSERT INTO notifications (user_id, type, message, link) VALUES (?, ?, ?, ?)',
        [appointment.student_id, 'appointment', `Your appointment has been ${status || 'updated'}`, `/appointments/${id}`]
      );

      // Notify admins about appointment update
      try {
        await notifyAdmins(
          'appointment',
          `Appointment updated: ${appointment.date} at ${appointment.time} - Status: ${status || 'updated'}`,
          `/frontend/views/admin/appointments.html`
        );
      } catch (notifError) {
        console.error('Error sending appointment update notification:', notifError);
      }

      // Send real-time notification to student
      const io = getIO();
      if (io) {
        io.to(`user:${appointment.student_id}`).emit('notification', {
          type: 'appointment',
          message: `Your appointment has been ${status || 'updated'}`,
          link: `/appointments/${id}`
        });
      }
    }

    // Log activity
    await query(
      'INSERT INTO activity_logs (user_id, type, details, status) VALUES (?, ?, ?, ?)',
      [req.user.id, 'appointment_updated', JSON.stringify({ appointmentId: id, updates }), 'success']
    );

    res.json({
      success: true,
      message: 'Appointment updated successfully'
    });
  } catch (error) {
    console.error('Update appointment error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update appointment'
    });
  }
};

/**
 * Delete appointment
 * DELETE /api/admin/appointments/:id
 */
export const deleteAppointment = async (req, res) => {
  try {
    const { id } = req.params;

    // Get appointment before deleting
    const [appointments] = await query('SELECT student_id FROM appointments WHERE id = ?', [id]);
    
    await query('DELETE FROM appointments WHERE id = ?', [id]);

    // Notify student and admins if appointment existed
    if (appointments && appointments.length > 0) {
      const studentId = appointments[0].student_id;
      
      // Notify student
      await query(
        'INSERT INTO notifications (user_id, type, message) VALUES (?, ?, ?)',
        [studentId, 'appointment', 'Your appointment has been cancelled']
      );

      // Notify admins about appointment cancellation
      try {
        await notifyAdmins(
          'appointment',
          'An appointment has been cancelled',
          `/frontend/views/admin/appointments.html`
        );
      } catch (notifError) {
        console.error('Error sending cancellation notification:', notifError);
      }

      const io = getIO();
      if (io) {
        io.to(`user:${studentId}`).emit('notification', {
          type: 'appointment',
          message: 'Your appointment has been cancelled'
        });
      }
    }

    // Log activity
    await query(
      'INSERT INTO activity_logs (user_id, type, details, status) VALUES (?, ?, ?, ?)',
      [req.user.id, 'appointment_deleted', JSON.stringify({ appointmentId: id }), 'success']
    );

    res.json({
      success: true,
      message: 'Appointment deleted successfully'
    });
  } catch (error) {
    console.error('Delete appointment error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to delete appointment'
    });
  }
};

/**
 * Get available time slots for a date
 * GET /api/admin/appointments/slots
 */
export const getAvailableSlots = async (req, res) => {
  try {
    const { date, instructor_id } = req.query;

    if (!date) {
      return res.status(400).json({
        success: false,
        message: 'Date parameter is required'
      });
    }

    // Get booked slots
    let sql = 'SELECT time, hours FROM appointments WHERE date = ? AND status != "cancelled"';
    const params = [date];

    if (instructor_id) {
      sql += ' AND instructor_id = ?';
      params.push(instructor_id);
    }

    const bookedSlots = await query(sql, params);

    // Generate available slots (9 AM to 9 PM, hourly)
    const allSlots = [];
    for (let hour = 9; hour < 21; hour++) {
      allSlots.push(`${hour.toString().padStart(2, '0')}:00:00`);
    }

    // Filter out booked slots
    const bookedTimes = bookedSlots.map(slot => slot.time);
    const availableSlots = allSlots.filter(slot => !bookedTimes.includes(slot));

    res.json({
      success: true,
      data: {
        availableSlots,
        bookedSlots: bookedSlots.map(slot => ({ time: slot.time, hours: slot.hours || 1 }))
      }
    });
  } catch (error) {
    console.error('Get available slots error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch available slots'
    });
  }
};

