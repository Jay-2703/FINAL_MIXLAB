import { verifyToken } from '../utils/jwt.js';
import { query } from '../config/db.js';

/**
 * Admin authentication middleware
 * Verifies JWT token and checks if user has admin or instructor role
 */
export const requireAdmin = async (req, res, next) => {
  try {
    // Get token from Authorization header or cookie
    const authHeader = req.headers['authorization'];
    let token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN

    if (!token) {
      token = req.cookies?.token;
    }

    if (!token) {
      return res.status(401).json({
        success: false,
        message: 'Authentication required. Please login.'
      });
    }

    // Verify token
    const decoded = verifyToken(token);
    if (!decoded) {
      return res.status(403).json({
        success: false,
        message: 'Invalid or expired token. Please login again.'
      });
    }

    // Check if user exists and has admin/instructor role
    const [users] = await query(
      'SELECT id, username, email, role, is_verified FROM users WHERE id = ?',
      [decoded.id]
    );

    if (!users || users.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    const user = users[0];

    // Check if account is verified
    if (!user.is_verified) {
      return res.status(403).json({
        success: false,
        message: 'Please verify your email address'
      });
    }

    // Check if user has admin or instructor role
    if (user.role !== 'admin' && user.role !== 'instructor') {
      return res.status(403).json({
        success: false,
        message: 'Access denied. Admin or instructor privileges required.'
      });
    }

    // Attach user to request
    req.user = {
      id: user.id,
      username: user.username,
      email: user.email,
      role: user.role
    };

    next();
  } catch (error) {
    console.error('Admin auth middleware error:', error);
    return res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
};

/**
 * Admin-only middleware (excludes instructors)
 */
export const requireAdminOnly = async (req, res, next) => {
  try {
    // First check admin/instructor
    await requireAdmin(req, res, () => {
      // Then check if it's admin only
      if (req.user.role !== 'admin') {
        return res.status(403).json({
          success: false,
          message: 'Access denied. Admin privileges required.'
        });
      }
      next();
    });
  } catch (error) {
    console.error('Admin-only middleware error:', error);
    return res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
};

