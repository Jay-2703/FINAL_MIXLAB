// middleware/validation.js or validators/authValidation.js
import { body, validationResult } from 'express-validator';

/**
 * Middleware to handle validation errors
 */
export const handleValidationErrors = (req, res, next) => {
  const errors = validationResult(req);
  
  if (!errors.isEmpty()) {
    const errorMessages = errors.array().map(err => err.msg);
    const firstError = errors.array()[0];
    
    return res.status(400).json({
      success: false,
      message: firstError.msg,
      errors: errorMessages,
      field: firstError.path // The field that caused the error
    });
  }
  
  next();
};

/**
 * Registration validation rules
 * Updated to make birthday optional and allow ages 5-120
 */
export const registerValidation = [
  body('username')
    .trim()
    .notEmpty().withMessage('Username is required')
    .isLength({ min: 3 }).withMessage('Username must be at least 3 characters long'),
  
  body('first_name')
    .trim()
    .notEmpty().withMessage('First name is required'),
  
  body('last_name')
  .optional({ checkFalsy: true })  // allows empty, null, undefined
  .trim()
  .isLength({ min: 1 }).withMessage('Last name cannot be empty if provided'),
  
  body('email')
    .trim()
    .notEmpty().withMessage('Email is required')
    .isEmail().withMessage('Please enter a valid email address')
    .normalizeEmail(),
  
  body('birthday')
    .optional({ checkFalsy: true }) // Allow empty, null, or undefined
    .custom((value) => {
      // If no value provided, it's optional so return true
      if (!value || value.trim() === '') return true;
      
      // Check if it's a valid ISO8601 date
      const birthDate = new Date(value);
      if (isNaN(birthDate.getTime())) {
        throw new Error('Please provide a valid date');
      }
      
      const today = new Date();
      
      // Check if date is in the future
      if (birthDate > today) {
        throw new Error('Birth date cannot be in the future');
      }
      
      // Calculate age
      let age = today.getFullYear() - birthDate.getFullYear();
      const monthDiff = today.getMonth() - birthDate.getMonth();
      if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
        age--;
      }
      
      // Validate age range: 5-100 years
      if (age < 5) {
        throw new Error('You must be at least 5 years old to register');
      }
      if (age > 100) {
        throw new Error('Age cannot exceed 100 years. Please enter a valid birth date');
      }
      
      return true;
    }),
  
  body('contact')
  .trim()
  .notEmpty().withMessage('Contact number is required')
  .matches(/^(?:\+63|0)?9\d{9}$/),
  
  body('home_address')
    .optional({ checkFalsy: true }) // Allow empty, null, undefined
    .trim()
    .custom((value) => {
      if (!value) return true; // Address is optional
      
      // Must be at least 5 characters long (to avoid nonsense)
      if (value.length < 5) {
        throw new Error('Please enter a more complete address');
      }

      // Must include at least one space (to avoid single-word inputs)
      if (!value.includes(' ')) {
        throw new Error('Please enter a more complete address');
      }

      return true;
    }),

  
  body('password')
    .notEmpty().withMessage('Password is required')
    .isLength({ min: 8 }).withMessage('Password must be at least 8 characters long')
    .matches(/[A-Z]/).withMessage('Password must contain at least one uppercase letter')
    .matches(/[a-z]/).withMessage('Password must contain at least one lowercase letter')
    .matches(/[0-9]/).withMessage('Password must contain at least one number')
    .matches(/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/).withMessage('Password must contain at least one special character')
];

/**
 * Alias for registerValidation to match router import
 */
export const validateRegistration = registerValidation;

/**
 * Login validation rules
 */
export const validateLogin = [
  body('username')
    .trim()
    .notEmpty().withMessage('Username or email is required'),
  
  body('password')
    .notEmpty().withMessage('Password is required')
];

/**
 * OTP verification validation rules
 */
export const verifyOTPValidation = [
  body('email')
    .trim()
    .notEmpty().withMessage('Email is required')
    .isEmail().withMessage('Please enter a valid email address'),
  
  body('otp')
    .trim()
    .notEmpty().withMessage('OTP is required')
    .isLength({ min: 6, max: 6 }).withMessage('OTP must be 6 digits'),
  
  body('username')
    .trim()
    .notEmpty().withMessage('Username is required')
    .isLength({ min: 3 }).withMessage('Username must be at least 3 characters long'),
  
  body('first_name')
    .trim()
    .notEmpty().withMessage('First name is required'),
  
  body('last_name')
    .optional({ checkFalsy: true }), // Allow empty, null, or undefined
  
  body('birthday')
    .optional({ checkFalsy: true }), // Allow empty, null, or undefined
  
  body('contact')
    .trim()
    .notEmpty().withMessage('Contact number is required'),
  
  body('home_address')
    .optional({ checkFalsy: true }), // Allow empty, null, or undefined
  
  body('password')
    .notEmpty().withMessage('Password is required')
];

/**
 * Simple OTP validation (for verify-reset-otp endpoint)
 */
export const validateOTP = [
  body('email')
    .trim()
    .notEmpty().withMessage('Email is required')
    .isEmail().withMessage('Please enter a valid email address'),
  
  body('otp')
    .trim()
    .notEmpty().withMessage('OTP is required')
    .isLength({ min: 6, max: 6 }).withMessage('OTP must be 6 digits')
];

/**
 * Forgot password validation (email only)
 */
export const validateForgotPassword = [
  body('email')
    .trim()
    .notEmpty().withMessage('Email is required')
    .isEmail().withMessage('Please enter a valid email address')
];

/**
 * Reset password validation
 * UPDATED: Removed OTP validation since it's already verified in verify-reset-otp
 */
export const validateResetPassword = [
  body('email')
    .trim()
    .notEmpty().withMessage('Email is required')
    .isEmail().withMessage('Please enter a valid email address'),
  
  body('newPassword')
    .notEmpty().withMessage('New password is required')
    .isLength({ min: 8 }).withMessage('Password must be at least 8 characters long')
    .matches(/[A-Z]/).withMessage('Password must contain at least one uppercase letter')
    .matches(/[a-z]/).withMessage('Password must contain at least one lowercase letter')
    .matches(/[0-9]/).withMessage('Password must contain at least one number')
    .matches(/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/).withMessage('Password must contain at least one special character')
  ,
  // Require reset token returned by verify-reset-otp
  body('resetToken')
    .trim()
    .notEmpty().withMessage('Reset token is required')
];