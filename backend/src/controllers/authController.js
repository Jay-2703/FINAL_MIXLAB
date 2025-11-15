import { query, getConnection } from '../config/db.js';
import { hashPassword, comparePassword, validatePasswordStrength } from '../utils/passwordUtils.js';
import { generateToken } from '../utils/jwt.js';
import otpService from '../services/otpService.js';
import { trackFailedLoginAttempt, checkAccountLock, resetFailedLoginAttempts } from '../middleware/security.js';
import { notifyAdmins } from '../services/notificationService.js';

/**
 * Authentication Controller
 * Handles all authentication-related operations
 */

/**
 * Send registration OTP
 * POST /api/auth/send-registration-otp
 */
export const sendRegistrationOTP = async (req, res) => {
  try {
    const { email, username } = req.body;

    // Check if username already exists
    const [existingUser] = await query(
      'SELECT id FROM users WHERE username = ? OR email = ?',
      [username, email]
    );

    if (existingUser) {
      return res.status(400).json({
        success: false,
        message: 'Username or email already exists'
      });
    }

    // Generate and send OTP
    const result = await otpService.createAndSendOTP(email, 'verify_email');

    if (!result.success) {
      return res.status(500).json({
        success: false,
        message: result.message
      });
    }

    res.json({
      success: true,
      message: 'OTP sent to your email. Please check your inbox.',
      // Only return OTP in development mode
      ...(process.env.NODE_ENV === 'development' && { otp: result.otp })
    });
  } catch (error) {
    console.error('Error sending registration OTP:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error. Please try again later.'
    });
  }
};

/**
 * Verify registration OTP and create user account
 * POST /api/auth/verify-registration-otp
 */
export const verifyRegistrationOTP = async (req, res) => {
  const connection = await getConnection();
  
  try {
    await connection.beginTransaction();

    const { email, otp, username, password, first_name, last_name, birthday, contact, home_address } = req.body;

    // Verify OTP
    const otpResult = await otpService.verifyOTP(email, otp, 'verify_email');
    
    if (!otpResult.valid) {
      await connection.rollback();
      return res.status(400).json({
        success: false,
        message: otpResult.message
      });
    }

    // Validate password strength
    const passwordValidation = validatePasswordStrength(password);
    if (!passwordValidation.valid) {
      await connection.rollback();
      return res.status(400).json({
        success: false,
        message: 'Password does not meet requirements',
        errors: passwordValidation.errors
      });
    }

    // Check if user already exists
    const [existingUser] = await query(
      'SELECT id FROM users WHERE username = ? OR email = ?',
      [username, email]
    );

    if (existingUser) {
      await connection.rollback();
      return res.status(400).json({
        success: false,
        message: 'User already exists'
      });
    }

    // Hash password
    const hashedPassword = await hashPassword(password);

    // Create user account
    const [result] = await query(
      `INSERT INTO users (username, first_name, last_name, email, birthday, contact, home_address, hashed_password, role, is_verified)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'student', TRUE)`,
      [username, first_name, last_name, email, birthday || null, contact || null, home_address || null, hashedPassword]
    );

    const userId = result.insertId;

    // Get created user (without password)
    const [user] = await query(
      'SELECT id, username, first_name, last_name, email, role, is_verified, created_at FROM users WHERE id = ?',
      [userId]
    );

    // Generate JWT token
    const token = generateToken({
      id: user.id,
      username: user.username,
      email: user.email,
      role: user.role
    });

    await connection.commit();

    // Notify admins about new user registration
    try {
      await notifyAdmins(
        'user',
        `New user registered: ${user.first_name} ${user.last_name} (${user.email})`,
        `/frontend/views/admin/users.html`
      );
    } catch (notifError) {
      console.error('Error sending registration notification:', notifError);
      // Don't fail registration if notification fails
    }

    // Set HTTP-only cookie
    res.cookie('token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 7 * 24 * 60 * 60 * 1000 // 7 days
    });

    res.json({
      success: true,
      message: 'Account created successfully',
      token: token,
      user: user
    });
  } catch (error) {
    await connection.rollback();
    console.error('Error verifying registration OTP:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error. Please try again later.'
    });
  } finally {
    connection.release();
  }
};

/**
 * Resend registration OTP
 * POST /api/auth/resend-registration-otp
 */
export const resendRegistrationOTP = async (req, res) => {
  try {
    const { email } = req.body;

    const result = await otpService.createAndSendOTP(email, 'verify_email');

    if (!result.success) {
      return res.status(500).json({
        success: false,
        message: result.message
      });
    }

    res.json({
      success: true,
      message: 'OTP resent to your email',
      ...(process.env.NODE_ENV === 'development' && { otp: result.otp })
    });
  } catch (error) {
    console.error('Error resending registration OTP:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error. Please try again later.'
    });
  }
};

/**
 * User login
 * POST /api/auth/login
 */
export const login = async (req, res) => {
  try {
    const { username, password } = req.body;
    const ipAddress = req.ip || req.connection.remoteAddress;

    // Check if account is locked
    const lockStatus = await checkAccountLock(username);
    if (lockStatus.locked) {
      return res.status(423).json({
        success: false,
        message: lockStatus.message
      });
    }

    // Find user by username or email
    const [user] = await query(
      'SELECT * FROM users WHERE username = ? OR email = ?',
      [username, username]
    );

    if (!user) {
      // Track failed attempt
      await trackFailedLoginAttempt(username, ipAddress);
      return res.status(401).json({
        success: false,
        message: 'Invalid username or password'
      });
    }

    // Check if account is verified
    if (!user.is_verified) {
      return res.status(403).json({
        success: false,
        message: 'Please verify your email address before logging in'
      });
    }

    // Verify password
    const passwordMatch = await comparePassword(password, user.hashed_password);
    
    if (!passwordMatch) {
      // Track failed attempt
      await trackFailedLoginAttempt(username, ipAddress);
      return res.status(401).json({
        success: false,
        message: 'Invalid username or password'
      });
    }

    // Reset failed login attempts on successful login
    await resetFailedLoginAttempts(username);

    // Generate JWT token
    const token = generateToken({
      id: user.id,
      username: user.username,
      email: user.email,
      role: user.role
    });

    // Set HTTP-only cookie
    res.cookie('token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 7 * 24 * 60 * 60 * 1000 // 7 days
    });

    // Return user data (without password)
    const { hashed_password, ...userData } = user;

    res.json({
      success: true,
      message: 'Login successful',
      token: token,
      user: userData
    });
  } catch (error) {
    console.error('Error during login:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error. Please try again later.'
    });
  }
};

/**
 * Forgot password - Send OTP
 * POST /api/auth/forgot-password
 */
export const forgotPassword = async (req, res) => {
  try {
    const { email } = req.body;

    // Check if user exists
    const [user] = await query(
      'SELECT id, email FROM users WHERE email = ?',
      [email]
    );

    if (!user) {
      // Don't reveal if email exists (security best practice)
      return res.json({
        success: true,
        message: 'If an account exists with this email, an OTP has been sent.'
      });
    }

    // Generate and send OTP
    const result = await otpService.createAndSendOTP(email, 'reset_password');

    if (!result.success) {
      return res.status(500).json({
        success: false,
        message: result.message
      });
    }

    res.json({
      success: true,
      message: 'If an account exists with this email, an OTP has been sent.',
      ...(process.env.NODE_ENV === 'development' && { otp: result.otp })
    });
  } catch (error) {
    console.error('Error in forgot password:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error. Please try again later.'
    });
  }
};

/**
 * Verify OTP for password reset
 * POST /api/auth/verify-reset-otp
 */
export const verifyResetOTP = async (req, res) => {
  try {
    const { email, otp } = req.body;

    // Verify OTP
    const otpResult = await otpService.verifyOTP(email, otp, 'reset_password');
    
    if (!otpResult.valid) {
      return res.status(400).json({
        success: false,
        message: otpResult.message
      });
    }

    // Generate a temporary reset token (can be used for additional security)
    const resetToken = generateToken({ email, type: 'password_reset' });

    res.json({
      success: true,
      message: 'OTP verified successfully',
      resetToken: resetToken
    });
  } catch (error) {
    console.error('Error verifying reset OTP:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error. Please try again later.'
    });
  }
};

/**
 * Reset password
 * POST /api/auth/reset-password
 */
export const resetPassword = async (req, res) => {
  const connection = await getConnection();
  
  try {
    await connection.beginTransaction();

    const { email, otp, newPassword } = req.body;

    // Verify OTP first
    const otpResult = await otpService.verifyOTP(email, otp, 'reset_password');
    
    if (!otpResult.valid) {
      await connection.rollback();
      return res.status(400).json({
        success: false,
        message: otpResult.message
      });
    }

    // Validate password strength
    const passwordValidation = validatePasswordStrength(newPassword);
    if (!passwordValidation.valid) {
      await connection.rollback();
      return res.status(400).json({
        success: false,
        message: 'Password does not meet requirements',
        errors: passwordValidation.errors
      });
    }

    // Find user
    const [user] = await query(
      'SELECT id FROM users WHERE email = ?',
      [email]
    );

    if (!user) {
      await connection.rollback();
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    // Hash new password
    const hashedPassword = await hashPassword(newPassword);

    // Update password
    await query(
      'UPDATE users SET hashed_password = ? WHERE id = ?',
      [hashedPassword, user.id]
    );

    await connection.commit();

    res.json({
      success: true,
      message: 'Password reset successfully. Please login with your new password.'
    });
  } catch (error) {
    await connection.rollback();
    console.error('Error resetting password:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error. Please try again later.'
    });
  } finally {
    connection.release();
  }
};

/**
 * Resend password reset OTP
 * POST /api/auth/resend-otp
 */
export const resendPasswordResetOTP = async (req, res) => {
  try {
    const { email } = req.body;

    const result = await otpService.createAndSendOTP(email, 'reset_password');

    if (!result.success) {
      return res.status(500).json({
        success: false,
        message: result.message
      });
    }

    res.json({
      success: true,
      message: 'OTP resent to your email',
      ...(process.env.NODE_ENV === 'development' && { otp: result.otp })
    });
  } catch (error) {
    console.error('Error resending password reset OTP:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error. Please try again later.'
    });
  }
};

/**
 * Logout
 * POST /api/auth/logout
 */
export const logout = async (req, res) => {
  res.clearCookie('token');
  res.json({
    success: true,
    message: 'Logged out successfully'
  });
};

