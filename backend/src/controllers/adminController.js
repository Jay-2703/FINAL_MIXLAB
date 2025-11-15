import { query } from '../config/db.js';
import { hashPassword } from '../utils/passwordUtils.js';
import { getIO } from '../config/socket.js';

/**
 * Admin Dashboard - Get metrics and statistics
 * GET /api/admin/dashboard
 */
export const getDashboardMetrics = async (req, res) => {
  try {
    const userId = req.user.id;

    // Total users count
    const totalUsers = await query('SELECT COUNT(*) as count FROM users WHERE role = "student"');
    const lastMonthUsers = await query(
      'SELECT COUNT(*) as count FROM users WHERE role = "student" AND created_at >= DATE_SUB(NOW(), INTERVAL 1 MONTH)'
    );

    // Total appointments
    const totalAppointments = await query('SELECT COUNT(*) as count FROM appointments WHERE status != "cancelled"');
    const lastWeekAppointments = await query(
      'SELECT COUNT(*) as count FROM appointments WHERE status != "cancelled" AND created_at >= DATE_SUB(NOW(), INTERVAL 7 DAY)'
    );

    // Completed lessons
    const completedLessons = await query('SELECT COUNT(*) as count FROM user_module_progress');
    const thisMonthLessons = await query(
      'SELECT COUNT(*) as count FROM user_module_progress WHERE completed_at >= DATE_SUB(NOW(), INTERVAL 1 MONTH)'
    );

    // Monthly revenue (from bookings)
    const monthlyRevenue = await query(
      `SELECT COALESCE(SUM(amount), 0) as total FROM bookings 
       WHERE payment_status IN ('paid', 'cash') 
       AND created_at >= DATE_SUB(NOW(), INTERVAL 1 MONTH)`
    );
    const lastMonthRevenue = await query(
      `SELECT COALESCE(SUM(amount), 0) as total FROM bookings 
       WHERE payment_status IN ('paid', 'cash') 
       AND created_at >= DATE_SUB(NOW(), INTERVAL 2 MONTH) 
       AND created_at < DATE_SUB(NOW(), INTERVAL 1 MONTH)`
    );

    // Engagement rate (users who completed at least one lesson in last week)
    const activeUsers = await query(
      `SELECT COUNT(DISTINCT user_id) as count FROM user_module_progress 
       WHERE completed_at >= DATE_SUB(NOW(), INTERVAL 7 DAY)`
    );
    const totalActiveUsers = await query(
      `SELECT COUNT(*) as count FROM users WHERE role = "student" AND is_verified = 1`
    );

    const engagementRate = (totalActiveUsers && totalActiveUsers[0]?.count > 0)
      ? ((activeUsers && activeUsers[0]?.count || 0) / totalActiveUsers[0].count * 100).toFixed(1)
      : 0;

    // Calculate percentage changes
    const userGrowth = lastMonthUsers && lastMonthUsers[0]?.count > 0
      ? (((totalUsers && totalUsers[0]?.count || 0) - lastMonthUsers[0].count) / lastMonthUsers[0].count * 100).toFixed(1)
      : 0;

    const appointmentGrowth = lastWeekAppointments && lastWeekAppointments[0]?.count > 0
      ? (((totalAppointments && totalAppointments[0]?.count || 0) - lastWeekAppointments[0].count) / lastWeekAppointments[0].count * 100).toFixed(1)
      : 0;

    const revenueGrowth = lastMonthRevenue && lastMonthRevenue[0]?.total > 0
      ? (((monthlyRevenue && monthlyRevenue[0]?.total || 0) - lastMonthRevenue[0].total) / lastMonthRevenue[0].total * 100).toFixed(1)
      : 0;

    // Get upcoming appointments (next 5)
    const upcomingAppointments = await query(
      `SELECT a.*, 
       u1.first_name as student_first_name, u1.last_name as student_last_name, u1.email as student_email,
       u2.first_name as instructor_first_name, u2.last_name as instructor_last_name
       FROM appointments a
       LEFT JOIN users u1 ON a.student_id = u1.id
       LEFT JOIN users u2 ON a.instructor_id = u2.id
       WHERE a.status IN ('pending', 'confirmed')
       AND (a.date > CURDATE() OR (a.date = CURDATE() AND a.time >= CURTIME()))
       ORDER BY a.date ASC, a.time ASC
       LIMIT 5`
    );

    // Get recent users (last 6)
    const recentUsers = await query(
      `SELECT u.*, 
       COALESCE(up.total_points, 0) as total_points,
       (SELECT COUNT(*) FROM user_module_progress ump WHERE ump.user_id = u.id) as completed_lessons
       FROM users u
       LEFT JOIN user_points up ON u.id = up.user_id
       WHERE u.role = 'student'
       ORDER BY u.created_at DESC
       LIMIT 6`
    );

    // Revenue trends (last 6 months)
    const revenueTrends = await query(
      `SELECT 
       DATE_FORMAT(created_at, '%Y-%m') as month,
       COALESCE(SUM(amount), 0) as revenue
       FROM bookings
       WHERE payment_status IN ('paid', 'cash')
       AND created_at >= DATE_SUB(NOW(), INTERVAL 6 MONTH)
       GROUP BY DATE_FORMAT(created_at, '%Y-%m')
       ORDER BY month ASC`
    );

    // User engagement (last 7 days)
    const userEngagement = await query(
      `SELECT 
       DATE(completed_at) as date,
       COUNT(DISTINCT user_id) as active_users,
       COUNT(*) as lessons_completed
       FROM user_module_progress
       WHERE completed_at >= DATE_SUB(NOW(), INTERVAL 7 DAY)
       GROUP BY DATE(completed_at)
       ORDER BY date ASC`
    );

    res.json({
      success: true,
      data: {
        metrics: {
          totalUsers: (totalUsers && totalUsers[0]?.count) || 0,
          userGrowth: `+${userGrowth}%`,
          totalAppointments: (totalAppointments && totalAppointments[0]?.count) || 0,
          appointmentGrowth: `+${appointmentGrowth}%`,
          completedLessons: (completedLessons && completedLessons[0]?.count) || 0,
          newLessonsThisMonth: (thisMonthLessons && thisMonthLessons[0]?.count) || 0,
          monthlyRevenue: parseFloat((monthlyRevenue && monthlyRevenue[0]?.total) || 0).toFixed(2),
          revenueGrowth: `+${revenueGrowth}%`,
          engagementRate: `${engagementRate}%`
        },
        upcomingAppointments,
        recentUsers,
        revenueTrends,
        userEngagement
      }
    });
  } catch (error) {
    console.error('Dashboard metrics error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch dashboard metrics'
    });
  }
};

/**
 * Get all users with filters
 * GET /api/admin/users
 */
export const getUsers = async (req, res) => {
  try {
    const { search, status, role, page = 1, limit = 10 } = req.query;
    const offset = (page - 1) * limit;

    let sql = `
      SELECT u.*, 
      COALESCE(up.total_points, 0) as total_points,
      COALESCE(up.learn_points, 0) as learn_points,
      COALESCE(up.play_points, 0) as play_points,
      (SELECT COUNT(*) FROM user_module_progress ump WHERE ump.user_id = u.id) as completed_lessons,
      (SELECT COUNT(*) FROM lessons) as total_lessons
      FROM users u
      LEFT JOIN user_points up ON u.id = up.user_id
      WHERE 1=1
    `;
    const params = [];

    // Role filter
    if (role) {
      sql += ' AND u.role = ?';
      params.push(role);
    } else {
      sql += ' AND u.role = "student"'; // Default to students
    }

    // Status filter (based on is_verified)
    if (status === 'active') {
      sql += ' AND u.is_verified = 1';
    } else if (status === 'inactive') {
      sql += ' AND u.is_verified = 0';
    }

    // Search filter
    if (search) {
      sql += ' AND (u.username LIKE ? OR u.email LIKE ? OR u.first_name LIKE ? OR u.last_name LIKE ?)';
      const searchTerm = `%${search}%`;
      params.push(searchTerm, searchTerm, searchTerm, searchTerm);
    }

    // Get total count
    const countSql = sql.replace(/SELECT.*FROM/, 'SELECT COUNT(*) as count FROM');
    const [countResult] = await query(countSql, params);
    const total = countResult[0]?.count || 0;

    // Get paginated results
    sql += ' ORDER BY u.created_at DESC LIMIT ? OFFSET ?';
    params.push(parseInt(limit), parseInt(offset));

    const users = await query(sql, params);

    res.json({
      success: true,
      data: {
        users,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total,
          pages: Math.ceil(total / limit)
        }
      }
    });
  } catch (error) {
    console.error('Get users error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch users'
    });
  }
};

/**
 * Create new user
 * POST /api/admin/users
 */
export const createUser = async (req, res) => {
  try {
    const { username, first_name, last_name, email, password, role = 'student', birthday, contact, home_address } = req.body;

    // Validation
    if (!username || !first_name || !last_name || !email || !password) {
      return res.status(400).json({
        success: false,
        message: 'Missing required fields'
      });
    }

    // Check if username or email already exists
    const [existing] = await query(
      'SELECT id FROM users WHERE username = ? OR email = ?',
      [username, email]
    );

    if (existing && existing.length > 0) {
      return res.status(400).json({
        success: false,
        message: 'Username or email already exists'
      });
    }

    // Hash password
    const hashedPassword = await hashPassword(password);

    // Insert user
    const result = await query(
      `INSERT INTO users (username, first_name, last_name, email, hashed_password, role, birthday, contact, home_address, is_verified)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 1)`,
      [username, first_name, last_name, email, hashedPassword, role, birthday || null, contact || null, home_address || null]
    );

    // Log activity
    await query(
      'INSERT INTO activity_logs (user_id, type, details, status) VALUES (?, ?, ?, ?)',
      [req.user.id, 'user_created', JSON.stringify({ username, email, role }), 'success']
    );

    res.json({
      success: true,
      message: 'User created successfully',
      data: { userId: result.insertId }
    });
  } catch (error) {
    console.error('Create user error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to create user'
    });
  }
};

/**
 * Update user
 * PUT /api/admin/users/:id
 */
export const updateUser = async (req, res) => {
  try {
    const { id } = req.params;
    const { first_name, last_name, email, role, birthday, contact, home_address, is_verified } = req.body;

    // Build update query dynamically
    const updates = [];
    const params = [];

    if (first_name !== undefined) {
      updates.push('first_name = ?');
      params.push(first_name);
    }
    if (last_name !== undefined) {
      updates.push('last_name = ?');
      params.push(last_name);
    }
    if (email !== undefined) {
      updates.push('email = ?');
      params.push(email);
    }
    if (role !== undefined) {
      updates.push('role = ?');
      params.push(role);
    }
    if (birthday !== undefined) {
      updates.push('birthday = ?');
      params.push(birthday);
    }
    if (contact !== undefined) {
      updates.push('contact = ?');
      params.push(contact);
    }
    if (home_address !== undefined) {
      updates.push('home_address = ?');
      params.push(home_address);
    }
    if (is_verified !== undefined) {
      updates.push('is_verified = ?');
      params.push(is_verified);
    }

    if (updates.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'No fields to update'
      });
    }

    params.push(id);

    await query(
      `UPDATE users SET ${updates.join(', ')} WHERE id = ?`,
      params
    );

    // Log activity
    await query(
      'INSERT INTO activity_logs (user_id, type, details, status) VALUES (?, ?, ?, ?)',
      [req.user.id, 'user_updated', JSON.stringify({ userId: id, updates }), 'success']
    );

    res.json({
      success: true,
      message: 'User updated successfully'
    });
  } catch (error) {
    console.error('Update user error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update user'
    });
  }
};

/**
 * Delete user
 * DELETE /api/admin/users/:id
 */
export const deleteUser = async (req, res) => {
  try {
    const { id } = req.params;

    // Prevent deleting yourself
    if (parseInt(id) === req.user.id) {
      return res.status(400).json({
        success: false,
        message: 'Cannot delete your own account'
      });
    }

    await query('DELETE FROM users WHERE id = ?', [id]);

    // Log activity
    await query(
      'INSERT INTO activity_logs (user_id, type, details, status) VALUES (?, ?, ?, ?)',
      [req.user.id, 'user_deleted', JSON.stringify({ userId: id }), 'success']
    );

    res.json({
      success: true,
      message: 'User deleted successfully'
    });
  } catch (error) {
    console.error('Delete user error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to delete user'
    });
  }
};

