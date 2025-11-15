import { query } from '../config/db.js';
import { getIO } from '../config/socket.js';

/**
 * Get notifications
 * GET /api/admin/notifications
 */
export const getNotifications = async (req, res) => {
  try {
    const { user_id, type, is_read, page = 1, limit = 50 } = req.query;
    const offset = (page - 1) * limit;

    let sql = `
      SELECT n.*, u.username, u.email
      FROM notifications n
      LEFT JOIN users u ON n.user_id = u.id
      WHERE (n.user_id IS NULL OR n.user_id = ?)
    `;
    const params = [req.user.id]; // For admins, show broadcast notifications (user_id IS NULL) or their own

    if (user_id) {
      sql += ' AND n.user_id = ?';
      params.push(user_id);
    }
    if (type) {
      sql += ' AND n.type = ?';
      params.push(type);
    }
    if (is_read !== undefined) {
      sql += ' AND n.is_read = ?';
      params.push(is_read === 'true' ? 1 : 0);
    }

    // Get total count
    const countSql = sql.replace(/SELECT.*FROM/, 'SELECT COUNT(*) as count FROM');
    const [countResult] = await query(countSql, params);
    const total = countResult[0]?.count || 0;

    sql += ' ORDER BY n.created_at DESC LIMIT ? OFFSET ?';
    params.push(parseInt(limit), parseInt(offset));

    const notifications = await query(sql, params);

    res.json({
      success: true,
      data: {
        notifications,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total,
          pages: Math.ceil(total / limit)
        }
      }
    });
  } catch (error) {
    console.error('Get notifications error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch notifications'
    });
  }
};

/**
 * Create notification
 * POST /api/admin/notifications
 */
export const createNotification = async (req, res) => {
  try {
    const { user_id, type, message, link } = req.body;

    if (!type || !message) {
      return res.status(400).json({
        success: false,
        message: 'Missing required fields: type, message'
      });
    }

    const result = await query(
      'INSERT INTO notifications (user_id, type, message, link) VALUES (?, ?, ?, ?)',
      [user_id || null, type, message, link || null]
    );

    // Send real-time notification
    const io = getIO();
    if (io) {
      if (user_id) {
        // Send to specific user
        io.to(`user:${user_id}`).emit('notification', {
          id: result.insertId,
          type,
          message,
          link: link || null,
          is_read: false,
          created_at: new Date().toISOString()
        });
      } else {
        // Broadcast to all users
        io.emit('notification', {
          id: result.insertId,
          type,
          message,
          link: link || null,
          is_read: false,
          created_at: new Date().toISOString()
        });
      }
    }

    // Log activity
    await query(
      'INSERT INTO activity_logs (user_id, type, details, status) VALUES (?, ?, ?, ?)',
      [req.user.id, 'notification_created', JSON.stringify({ notificationId: result.insertId, type, user_id }), 'success']
    );

    res.json({
      success: true,
      message: 'Notification created successfully',
      data: { notificationId: result.insertId }
    });
  } catch (error) {
    console.error('Create notification error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to create notification'
    });
  }
};

/**
 * Mark notification as read
 * PUT /api/admin/notifications/:id/read
 */
export const markNotificationRead = async (req, res) => {
  try {
    const { id } = req.params;

    await query('UPDATE notifications SET is_read = 1 WHERE id = ?', [id]);

    res.json({
      success: true,
      message: 'Notification marked as read'
    });
  } catch (error) {
    console.error('Mark notification read error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to mark notification as read'
    });
  }
};

/**
 * Mark all notifications as read
 * PUT /api/admin/notifications/read-all
 */
export const markAllNotificationsRead = async (req, res) => {
  try {
    const { user_id } = req.body;

    if (user_id) {
      await query('UPDATE notifications SET is_read = 1 WHERE user_id = ?', [user_id]);
    } else {
      await query('UPDATE notifications SET is_read = 1 WHERE is_read = 0');
    }

    res.json({
      success: true,
      message: 'All notifications marked as read'
    });
  } catch (error) {
    console.error('Mark all notifications read error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to mark all notifications as read'
    });
  }
};

/**
 * Get unread notification count
 * GET /api/admin/notifications/unread-count
 */
export const getUnreadCount = async (req, res) => {
  try {
    const { user_id } = req.query;

    let sql = 'SELECT COUNT(*) as count FROM notifications WHERE is_read = 0';
    const params = [];

    if (user_id) {
      sql += ' AND user_id = ?';
      params.push(user_id);
    }

    const [result] = await query(sql, params);

    res.json({
      success: true,
      data: {
        unreadCount: result[0]?.count || 0
      }
    });
  } catch (error) {
    console.error('Get unread count error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch unread count'
    });
  }
};

/**
 * Get activity logs
 * GET /api/admin/activity-logs
 */
export const getActivityLogs = async (req, res) => {
  try {
    const { user_id, type, status, start_date, end_date, page = 1, limit = 50 } = req.query;
    const offset = (page - 1) * limit;

    let sql = `
      SELECT al.*, u.username, u.email
      FROM activity_logs al
      LEFT JOIN users u ON al.user_id = u.id
      WHERE 1=1
    `;
    const params = [];

    if (user_id) {
      sql += ' AND al.user_id = ?';
      params.push(user_id);
    }
    if (type) {
      sql += ' AND al.type = ?';
      params.push(type);
    }
    if (status) {
      sql += ' AND al.status = ?';
      params.push(status);
    }
    if (start_date) {
      sql += ' AND al.timestamp >= ?';
      params.push(start_date);
    }
    if (end_date) {
      sql += ' AND al.timestamp <= ?';
      params.push(end_date);
    }

    // Get total count
    const countSql = sql.replace(/SELECT.*FROM/, 'SELECT COUNT(*) as count FROM');
    const [countResult] = await query(countSql, params);
    const total = countResult[0]?.count || 0;

    sql += ' ORDER BY al.timestamp DESC LIMIT ? OFFSET ?';
    params.push(parseInt(limit), parseInt(offset));

    const logs = await query(sql, params);

    res.json({
      success: true,
      data: {
        logs,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total,
          pages: Math.ceil(total / limit)
        }
      }
    });
  } catch (error) {
    console.error('Get activity logs error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch activity logs'
    });
  }
};

