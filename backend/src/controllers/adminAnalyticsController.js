import { query } from '../config/db.js';

/**
 * Get analytics data
 * GET /api/admin/analytics
 */
export const getAnalytics = async (req, res) => {
  try {
    const { start_date, end_date } = req.query;

    // Build date filter
    let dateFilter = '';
    const params = [];
    if (start_date && end_date) {
      dateFilter = ' AND created_at >= ? AND created_at <= ?';
      params.push(start_date, end_date);
    }

    // Revenue analytics
    const revenueData = await query(
      `SELECT 
       DATE(created_at) as date,
       COALESCE(SUM(amount), 0) as revenue,
       COUNT(*) as transaction_count
       FROM bookings
       WHERE payment_status IN ('paid', 'cash')
       ${dateFilter}
       GROUP BY DATE(created_at)
       ORDER BY date ASC`,
      params
    );

    // User engagement
    const engagementData = await query(
      `SELECT 
       DATE(completed_at) as date,
       COUNT(DISTINCT user_id) as active_users,
       COUNT(*) as lessons_completed
       FROM user_module_progress
       WHERE 1=1 ${dateFilter}
       GROUP BY DATE(completed_at)
       ORDER BY date ASC`,
      params
    );

    // Top lessons
    const topLessons = await query(
      `SELECT l.id, l.title, m.name as module_name, COUNT(ump.id) as completion_count
       FROM lessons l
       LEFT JOIN modules m ON l.module_id = m.id
       LEFT JOIN user_module_progress ump ON l.id = ump.lesson_id
       WHERE 1=1 ${dateFilter.replace('created_at', 'ump.completed_at')}
       GROUP BY l.id
       ORDER BY completion_count DESC
       LIMIT 10`,
      params
    );

    // Top paying lessons/services
    const topPayingServices = await query(
      `SELECT service_type, 
       COALESCE(SUM(amount), 0) as total_revenue,
       COUNT(*) as booking_count
       FROM bookings
       WHERE payment_status IN ('paid', 'cash')
       ${dateFilter}
       GROUP BY service_type
       ORDER BY total_revenue DESC`
    );

    // Gamification stats
    const gamificationStats = await query(
      `SELECT 
       COUNT(DISTINCT ua.user_id) as users_with_achievements,
       COUNT(ua.id) as total_achievements_earned,
       COUNT(DISTINCT ua.achievement_id) as unique_achievements
       FROM user_achievements ua
       WHERE 1=1 ${dateFilter.replace('created_at', 'ua.earned_at')}`,
      params
    );

    // Quiz performance
    const quizStats = await query(
      `SELECT 
       AVG(score) as average_score,
       COUNT(*) as total_attempts,
       COUNT(DISTINCT user_id) as unique_participants
       FROM quiz_attempts
       WHERE 1=1 ${dateFilter.replace('created_at', 'completed_at')}`,
      params
    );

    res.json({
      success: true,
      data: {
        revenue: revenueData,
        engagement: engagementData,
        topLessons,
        topPayingServices,
        gamification: gamificationStats[0] || {},
        quizzes: quizStats[0] || {}
      }
    });
  } catch (error) {
    console.error('Get analytics error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch analytics'
    });
  }
};

/**
 * Get booking report
 * GET /api/admin/reports/bookings
 */
export const getBookingReport = async (req, res) => {
  try {
    const { start_date, end_date, student_id, service_type, status } = req.query;

    let sql = `
      SELECT b.*,
      u.first_name, u.last_name, u.email,
      i.name as instructor_name
      FROM bookings b
      LEFT JOIN users u ON b.user_id = u.id
      LEFT JOIN appointments a ON b.booking_id = a.booking_id
      LEFT JOIN users i ON a.instructor_id = i.id
      WHERE 1=1
    `;
    const params = [];

    if (start_date) {
      sql += ' AND b.created_at >= ?';
      params.push(start_date);
    }
    if (end_date) {
      sql += ' AND b.created_at <= ?';
      params.push(end_date);
    }
    if (student_id) {
      sql += ' AND b.user_id = ?';
      params.push(student_id);
    }
    if (service_type) {
      sql += ' AND b.service_type = ?';
      params.push(service_type);
    }
    if (status) {
      sql += ' AND b.payment_status = ?';
      params.push(status);
    }

    sql += ' ORDER BY b.created_at DESC';

    const bookings = await query(sql, params);

    res.json({
      success: true,
      data: bookings
    });
  } catch (error) {
    console.error('Get booking report error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch booking report'
    });
  }
};

/**
 * Get lesson completion report
 * GET /api/admin/reports/lessons
 */
export const getLessonCompletionReport = async (req, res) => {
  try {
    const { start_date, end_date, student_id, module_id } = req.query;

    let sql = `
      SELECT ump.*,
      u.first_name, u.last_name, u.email,
      l.title as lesson_title,
      m.name as module_name
      FROM user_module_progress ump
      LEFT JOIN users u ON ump.user_id = u.id
      LEFT JOIN lessons l ON ump.lesson_id = l.id
      LEFT JOIN modules m ON l.module_id = m.id
      WHERE 1=1
    `;
    const params = [];

    if (start_date) {
      sql += ' AND ump.completed_at >= ?';
      params.push(start_date);
    }
    if (end_date) {
      sql += ' AND ump.completed_at <= ?';
      params.push(end_date);
    }
    if (student_id) {
      sql += ' AND ump.user_id = ?';
      params.push(student_id);
    }
    if (module_id) {
      sql += ' AND m.id = ?';
      params.push(module_id);
    }

    sql += ' ORDER BY ump.completed_at DESC';

    const completions = await query(sql, params);

    res.json({
      success: true,
      data: completions
    });
  } catch (error) {
    console.error('Get lesson completion report error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch lesson completion report'
    });
  }
};

/**
 * Get gamification report
 * GET /api/admin/reports/gamification
 */
export const getGamificationReport = async (req, res) => {
  try {
    const { start_date, end_date, student_id } = req.query;

    let sql = `
      SELECT u.id, u.first_name, u.last_name, u.email,
      COALESCE(up.total_points, 0) as total_points,
      COALESCE(up.learn_points, 0) as learn_points,
      COALESCE(up.play_points, 0) as play_points,
      (SELECT COUNT(*) FROM user_achievements ua WHERE ua.user_id = u.id) as badges_earned,
      (SELECT MAX(earned_at) FROM user_achievements ua WHERE ua.user_id = u.id) as last_activity
      FROM users u
      LEFT JOIN user_points up ON u.id = up.user_id
      WHERE u.role = 'student'
    `;
    const params = [];

    if (start_date) {
      sql += ' AND u.created_at >= ?';
      params.push(start_date);
    }
    if (end_date) {
      sql += ' AND u.created_at <= ?';
      params.push(end_date);
    }
    if (student_id) {
      sql += ' AND u.id = ?';
      params.push(student_id);
    }

    sql += ' ORDER BY up.total_points DESC';

    const users = await query(sql, params);

    res.json({
      success: true,
      data: users
    });
  } catch (error) {
    console.error('Get gamification report error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch gamification report'
    });
  }
};

/**
 * Get transactions report
 * GET /api/admin/reports/transactions
 */
export const getTransactionsReport = async (req, res) => {
  try {
    const { start_date, end_date, payment_method, status } = req.query;

    let sql = `
      SELECT b.*,
      u.first_name, u.last_name, u.email
      FROM bookings b
      LEFT JOIN users u ON b.user_id = u.id
      WHERE 1=1
    `;
    const params = [];

    if (start_date) {
      sql += ' AND b.created_at >= ?';
      params.push(start_date);
    }
    if (end_date) {
      sql += ' AND b.created_at <= ?';
      params.push(end_date);
    }
    if (payment_method) {
      sql += ' AND b.payment_method = ?';
      params.push(payment_method);
    }
    if (status) {
      sql += ' AND b.payment_status = ?';
      params.push(status);
    }

    sql += ' ORDER BY b.created_at DESC';

    const transactions = await query(sql, params);

    res.json({
      success: true,
      data: transactions
    });
  } catch (error) {
    console.error('Get transactions report error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch transactions report'
    });
  }
};

