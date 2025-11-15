import { query } from '../config/db.js';
import emailService from './emailService.js';

/**
 * OTP Service
 * Handles OTP generation, storage, verification, and expiration
 */
class OTPService {
  /**
   * Generate a random 6-digit OTP
   * @returns {string} 6-digit OTP code
   */
  generateOTP() {
    return Math.floor(100000 + Math.random() * 900000).toString();
  }

  /**
   * Create and send OTP for email verification (registration)
   * @param {string} email - User email
   * @param {string} type - OTP type ('verify_email' or 'reset_password')
   * @returns {Promise<{success: boolean, otp?: string, message?: string}>}
   */
  async createAndSendOTP(email, type = 'verify_email') {
    try {
      // Generate OTP
      const otp = this.generateOTP();
      
      // Set expiration (10 minutes from now)
      const expiresAt = new Date();
      expiresAt.setMinutes(expiresAt.getMinutes() + 10);

      // Invalidate any existing unused OTPs for this email and type
      await query(
        'UPDATE otp_verification SET is_used = TRUE WHERE email = ? AND type = ? AND is_used = FALSE',
        [email, type]
      );

      // Store OTP in database
      await query(
        `INSERT INTO otp_verification (email, otp_code, expires_at, type, user_id) 
         VALUES (?, ?, ?, ?, NULL)`,
        [email, otp, expiresAt, type]
      );

      // Send OTP via email
      let emailSent = false;
      if (type === 'verify_email') {
        emailSent = await emailService.sendRegistrationOTP(email, otp);
      } else if (type === 'reset_password') {
        emailSent = await emailService.sendPasswordResetOTP(email, otp);
      }

      if (!emailSent) {
        console.warn(`⚠️  OTP generated but email failed to send for ${email}`);
        // Still return success as OTP is stored (for development/testing)
      }

      return {
        success: true,
        otp: process.env.NODE_ENV === 'development' ? otp : undefined, // Only return OTP in dev mode
        message: 'OTP sent successfully'
      };
    } catch (error) {
      console.error('Error creating OTP:', error);
      return {
        success: false,
        message: 'Failed to generate OTP. Please try again.'
      };
    }
  }

  /**
   * Verify OTP code
   * @param {string} email - User email
   * @param {string} otp - OTP code to verify
   * @param {string} type - OTP type ('verify_email' or 'reset_password')
   * @returns {Promise<{valid: boolean, message?: string}>}
   */
  async verifyOTP(email, otp, type) {
    try {
      // Find the most recent unused OTP for this email and type
      const [otpRecord] = await query(
        `SELECT * FROM otp_verification 
         WHERE email = ? AND type = ? AND is_used = FALSE 
         ORDER BY created_at DESC 
         LIMIT 1`,
        [email, type]
      );

      if (!otpRecord) {
        return {
          valid: false,
          message: 'Invalid or expired OTP. Please request a new one.'
        };
      }

      // Check if OTP has expired
      const now = new Date();
      const expiresAt = new Date(otpRecord.expires_at);
      
      if (now > expiresAt) {
        // Mark as used to prevent reuse
        await query(
          'UPDATE otp_verification SET is_used = TRUE WHERE id = ?',
          [otpRecord.id]
        );
        return {
          valid: false,
          message: 'OTP has expired. Please request a new one.'
        };
      }

      // Verify OTP code
      if (otpRecord.otp_code !== otp) {
        return {
          valid: false,
          message: 'Invalid OTP code. Please try again.'
        };
      }

      // Mark OTP as used
      await query(
        'UPDATE otp_verification SET is_used = TRUE WHERE id = ?',
        [otpRecord.id]
      );

      return {
        valid: true,
        message: 'OTP verified successfully'
      };
    } catch (error) {
      console.error('Error verifying OTP:', error);
      return {
        valid: false,
        message: 'Error verifying OTP. Please try again.'
      };
    }
  }

  /**
   * Clean up expired OTPs (can be run as a cron job)
   */
  async cleanupExpiredOTPs() {
    try {
      const result = await query(
        'UPDATE otp_verification SET is_used = TRUE WHERE expires_at < NOW() AND is_used = FALSE'
      );
      console.log(`🧹 Cleaned up ${result.affectedRows} expired OTPs`);
      return result.affectedRows;
    } catch (error) {
      console.error('Error cleaning up expired OTPs:', error);
      return 0;
    }
  }
}

export default new OTPService();

