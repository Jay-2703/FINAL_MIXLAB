import express from 'express';
import {
  validateRegistration,
  validateLogin,
  validateOTP,
  validateForgotPassword,
  validateResetPassword,
  handleValidationErrors
} from '../middleware/validation.js';
import {
  loginRateLimiter,
  registrationRateLimiter,
  otpRateLimiter,
  passwordResetRateLimiter
} from '../middleware/security.js';
import {
  sendRegistrationOTP,
  verifyRegistrationOTP,
  resendRegistrationOTP,
  login,
  forgotPassword,
  verifyResetOTP,
  resetPassword,
  resendPasswordResetOTP,
  logout
} from '../controllers/authController.js';
import { googleAuth, googleCallback, facebookAuth, facebookCallback } from '../controllers/oauthController.js';

const router = express.Router();

/**
 * Registration Flow
 */
// Send registration OTP
router.post(
  '/send-registration-otp',
  registrationRateLimiter,
  validateRegistration.slice(0, 4), // Only validate email and username for OTP sending
  handleValidationErrors,
  sendRegistrationOTP
);

// Verify registration OTP and create account
router.post(
  '/verify-registration-otp',
  registrationRateLimiter,
  validateRegistration,
  validateOTP,
  handleValidationErrors,
  verifyRegistrationOTP
);

// Resend registration OTP
router.post(
  '/resend-registration-otp',
  otpRateLimiter,
  validateForgotPassword, // Reuse email validation
  handleValidationErrors,
  resendRegistrationOTP
);

/**
 * Login
 */
router.post(
  '/login',
  loginRateLimiter,
  validateLogin,
  handleValidationErrors,
  login
);

/**
 * Password Reset Flow
 */
// Forgot password - send OTP
router.post(
  '/forgot-password',
  passwordResetRateLimiter,
  validateForgotPassword,
  handleValidationErrors,
  forgotPassword
);

// Verify OTP for password reset
router.post(
  '/verify-reset-otp',
  otpRateLimiter,
  validateOTP,
  handleValidationErrors,
  verifyResetOTP
);

// Reset password
router.post(
  '/reset-password',
  passwordResetRateLimiter,
  validateResetPassword,
  handleValidationErrors,
  resetPassword
);

// Resend password reset OTP
router.post(
  '/resend-otp',
  otpRateLimiter,
  validateForgotPassword,
  handleValidationErrors,
  resendPasswordResetOTP
);

/**
 * OAuth Routes
 */
// Google OAuth
router.get('/google', googleAuth);
router.get('/google/callback', googleCallback);

// Facebook OAuth
router.get('/facebook', facebookAuth);
router.get('/facebook/callback', facebookCallback);

/**
 * Logout
 */
router.post('/logout', logout);

export default router;

