import { query } from '../config/db.js';
import { getIO } from '../config/socket.js';

/**
 * Notification Service
 * Handles creation, storage, and real-time delivery of notifications
 */

/**
 * Create a notification and broadcast to admins
 * @param {Object} notificationData - Notification data
 * @param {number|null} notificationData.user_id - Target user ID (null for broadcast to all admins)
 * @param {string} notificationData.type - Notification type (system, user, appointment, gamification, announcement)
 * @param {string} notificationData.message - Notification message (will be sanitized)
 * @param {string|null} notificationData.link - Optional link to related page
 * @returns {Promise<number>} Notification ID
 */
export async function createNotification({ user_id = null, type, message, link = null }) {
  try {
    // Sanitize message to prevent XSS
    const sanitizedMessage = sanitizeMessage(message);

    // Insert notification into database
    const result = await query(
      'INSERT INTO notifications (user_id, type, message, link, is_read) VALUES (?, ?, ?, ?, 0)',
      [user_id, type, sanitizedMessage, link]
    );

    const notificationId = result.insertId;

    // Get the created notification
    const [notifications] = await query(
      'SELECT * FROM notifications WHERE id = ?',
      [notificationId]
    );

    const notification = notifications && notifications[0];

    // Broadcast to admins via Socket.IO
    if (notification) {
      await broadcastNotification(notification, user_id);
    }

    return notificationId;
  } catch (error) {
    console.error('Error creating notification:', error);
    throw error;
  }
}

/**
 * Broadcast notification to admins via Socket.IO
 * @param {Object} notification - Notification object
 * @param {number|null} targetUserId - Specific user ID or null for all admins
 */
async function broadcastNotification(notification, targetUserId = null) {
  try {
    const io = getIO();
    if (!io) {
      console.warn('Socket.IO not initialized, notification not broadcasted');
      return;
    }

    if (targetUserId) {
      // Send to specific user
      io.to(`user:${targetUserId}`).emit('notification', {
        id: notification.id,
        type: notification.type,
        message: notification.message,
        link: notification.link,
        is_read: notification.is_read === 1,
        created_at: notification.created_at
      });
    } else {
      // Broadcast to all admins and instructors
      // Use emit to all connected clients, they'll filter on frontend
      io.emit('admin_notification', {
        id: notification.id,
        type: notification.type,
        message: notification.message,
        link: notification.link,
        is_read: notification.is_read === 1,
        created_at: notification.created_at
      });
    }

    console.log(`📢 Notification broadcasted: ${notification.type} - ${notification.message}`);
  } catch (error) {
    console.error('Error broadcasting notification:', error);
  }
}

/**
 * Notify all admins about an event
 * @param {string} type - Notification type
 * @param {string} message - Notification message
 * @param {string|null} link - Optional link
 */
export async function notifyAdmins(type, message, link = null) {
  return await createNotification({
    user_id: null, // null = broadcast to all admins
    type,
    message,
    link
  });
}

/**
 * Notify specific user
 * @param {number} userId - User ID
 * @param {string} type - Notification type
 * @param {string} message - Notification message
 * @param {string|null} link - Optional link
 */
export async function notifyUser(userId, type, message, link = null) {
  return await createNotification({
    user_id: userId,
    type,
    message,
    link
  });
}

/**
 * Sanitize message to prevent XSS
 * @param {string} message - Raw message
 * @returns {string} Sanitized message
 */
function sanitizeMessage(message) {
  if (typeof message !== 'string') {
    return String(message);
  }

  // Remove HTML tags and escape special characters
  return message
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#x27;')
    .replace(/\//g, '&#x2F;')
    .trim();
}

/**
 * Get unread notification count for a user
 * @param {number|null} userId - User ID (null for all admins)
 * @returns {Promise<number>} Unread count
 */
export async function getUnreadCount(userId = null) {
  try {
    let sql = 'SELECT COUNT(*) as count FROM notifications WHERE is_read = 0';
    const params = [];

    if (userId) {
      sql += ' AND user_id = ?';
      params.push(userId);
    } else {
      // For admins, count notifications where user_id is NULL (broadcast)
      sql += ' AND (user_id IS NULL OR user_id = ?)';
      // We'll need to pass userId if it's an admin
    }

    const [result] = await query(sql, params);
    return result[0]?.count || 0;
  } catch (error) {
    console.error('Error getting unread count:', error);
    return 0;
  }
}

/**
 * Mark notification as read
 * @param {number} notificationId - Notification ID
 * @param {number} userId - User ID (for verification)
 */
export async function markAsRead(notificationId, userId = null) {
  try {
    let sql = 'UPDATE notifications SET is_read = 1 WHERE id = ?';
    const params = [notificationId];

    if (userId) {
      sql += ' AND (user_id = ? OR user_id IS NULL)';
      params.push(userId);
    }

    await query(sql, params);
  } catch (error) {
    console.error('Error marking notification as read:', error);
    throw error;
  }
}

/**
 * Mark all notifications as read for a user
 * @param {number|null} userId - User ID (null for all admins)
 */
export async function markAllAsRead(userId = null) {
  try {
    let sql = 'UPDATE notifications SET is_read = 1 WHERE is_read = 0';
    const params = [];

    if (userId) {
      sql += ' AND (user_id = ? OR user_id IS NULL)';
      params.push(userId);
    }

    await query(sql, params);
  } catch (error) {
    console.error('Error marking all notifications as read:', error);
    throw error;
  }
}

