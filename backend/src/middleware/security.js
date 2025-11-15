import rateLimit from 'express-rate-limit';
import { query } from '../config/db.js';

/**
 * Security middleware for authentication endpoints
 */

// Rate limiting configuration
export const createRateLimiter = (windowMs, max, message) => {
  return rateLimit({
    windowMs: windowMs, // Time window in milliseconds
    max: max, // Maximum number of requests
    message: { success: false, message: message },
    standardHeaders: true,
    legacyHeaders: false,
    // Skip rate limiting for successful requests (to avoid blocking legitimate users)
    skipSuccessfulRequests: false,
    // Use IP address for rate limiting
    keyGenerator: (req) => {
      return req.ip || req.connection.remoteAddress;
    }
  });
};

// Specific rate limiters for different endpoints
export const loginRateLimiter = createRateLimiter(
  15 * 60 * 1000, // 15 minutes
  5, // 5 attempts per 15 minutes
  'Too many login attempts. Please try again after 15 minutes.'
);

export const registrationRateLimiter = createRateLimiter(
  60 * 60 * 1000, // 1 hour
  3, // 3 registrations per hour per IP
  'Too many registration attempts. Please try again later.'
);

export const otpRateLimiter = createRateLimiter(
  15 * 60 * 1000, // 15 minutes
  5, // 5 OTP requests per 15 minutes
  'Too many OTP requests. Please try again after 15 minutes.'
);

export const passwordResetRateLimiter = createRateLimiter(
  60 * 60 * 1000, // 1 hour
  3, // 3 password reset attempts per hour
  'Too many password reset attempts. Please try again later.'
);

/**
 * Brute-force protection: Track failed login attempts
 */
export const trackFailedLoginAttempt = async (identifier, ipAddress) => {
  try {
    // Check if there's an existing record
    const [existing] = await query(
      'SELECT * FROM failed_login_attempts WHERE identifier = ?',
      [identifier]
    );

    if (existing) {
      // Update existing record
      const attempts = existing.attempts + 1;
      const lockDuration = attempts >= 5 ? 30 : 0; // Lock for 30 minutes after 5 failed attempts
      const lockedUntil = lockDuration > 0 
        ? new Date(Date.now() + lockDuration * 60 * 1000)
        : null;

      await query(
        `UPDATE failed_login_attempts 
         SET attempts = ?, last_attempt = NOW(), locked_until = ?, ip_address = ?
         WHERE identifier = ?`,
        [attempts, lockedUntil, ipAddress, identifier]
      );

      return {
        locked: lockDuration > 0,
        lockedUntil: lockedUntil,
        attempts: attempts
      };
    } else {
      // Create new record
      await query(
        `INSERT INTO failed_login_attempts (identifier, ip_address, attempts, last_attempt)
         VALUES (?, ?, 1, NOW())`,
        [identifier, ipAddress]
      );

      return {
        locked: false,
        lockedUntil: null,
        attempts: 1
      };
    }
  } catch (error) {
    console.error('Error tracking failed login attempt:', error);
    return { locked: false, attempts: 0 };
  }
};

/**
 * Check if account is locked due to brute-force attempts
 */
export const checkAccountLock = async (identifier) => {
  try {
    const [record] = await query(
      'SELECT * FROM failed_login_attempts WHERE identifier = ?',
      [identifier]
    );

    if (!record) {
      return { locked: false };
    }

    // Check if account is locked
    if (record.locked_until) {
      const lockedUntil = new Date(record.locked_until);
      const now = new Date();

      if (now < lockedUntil) {
        const minutesRemaining = Math.ceil((lockedUntil - now) / 60000);
        return {
          locked: true,
          lockedUntil: lockedUntil,
          minutesRemaining: minutesRemaining,
          message: `Account is temporarily locked due to multiple failed login attempts. Please try again in ${minutesRemaining} minute(s).`
        };
      } else {
        // Lock expired, reset attempts
        await query(
          'UPDATE failed_login_attempts SET attempts = 0, locked_until = NULL WHERE identifier = ?',
          [identifier]
        );
        return { locked: false };
      }
    }

    // Reset attempts if last attempt was more than 15 minutes ago
    const lastAttempt = new Date(record.last_attempt);
    const now = new Date();
    const minutesSinceLastAttempt = (now - lastAttempt) / 60000;

    if (minutesSinceLastAttempt > 15) {
      await query(
        'UPDATE failed_login_attempts SET attempts = 0 WHERE identifier = ?',
        [identifier]
      );
      return { locked: false };
    }

    return { locked: false, attempts: record.attempts };
  } catch (error) {
    console.error('Error checking account lock:', error);
    return { locked: false };
  }
};

/**
 * Reset failed login attempts on successful login
 */
export const resetFailedLoginAttempts = async (identifier) => {
  try {
    await query(
      'DELETE FROM failed_login_attempts WHERE identifier = ?',
      [identifier]
    );
  } catch (error) {
    console.error('Error resetting failed login attempts:', error);
  }
};

/**
 * HTTPS enforcement middleware (for production)
 */
export const enforceHTTPS = (req, res, next) => {
  if (process.env.NODE_ENV === 'production') {
    // Check if request is secure
    if (req.header('x-forwarded-proto') !== 'https') {
      return res.status(403).json({
        success: false,
        message: 'HTTPS required. Please use a secure connection.'
      });
    }
  }
  next();
};

