import axios from 'axios';
import dotenv from 'dotenv';

dotenv.config();

/**
 * Brevo (formerly Sendinblue) Email Service
 * Handles sending OTP emails for registration and password reset
 */
class EmailService {
  constructor() {
    this.apiKey = process.env.BREVO_API_KEY;
    this.senderEmail = process.env.BREVO_SENDER_EMAIL || 'noreply@mixlabstudio.com';
    this.senderName = process.env.BREVO_SENDER_NAME || 'MixLab Studio';
    this.apiUrl = 'https://api.brevo.com/v3/smtp/email';
    
    if (!this.apiKey) {
      console.warn('⚠️  BREVO_API_KEY not set. Email functionality will be disabled.');
    }
  }

  /**
   * Send OTP email for registration
   * @param {string} email - Recipient email
   * @param {string} otp - 6-digit OTP code
   * @returns {Promise<boolean>}
   */
  async sendRegistrationOTP(email, otp) {
    const subject = 'Verify Your MixLab Studio Account';
    const htmlContent = `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="UTF-8">
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
            .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px; }
            .otp-box { background: white; border: 2px dashed #667eea; padding: 20px; text-align: center; margin: 20px 0; border-radius: 8px; }
            .otp-code { font-size: 32px; font-weight: bold; color: #667eea; letter-spacing: 5px; }
            .footer { text-align: center; margin-top: 20px; color: #666; font-size: 12px; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>Welcome to MixLab Studio!</h1>
            </div>
            <div class="content">
              <p>Thank you for registering with MixLab Studio. To complete your registration, please verify your email address using the OTP code below:</p>
              
              <div class="otp-box">
                <p style="margin: 0 0 10px 0; color: #666;">Your verification code:</p>
                <div class="otp-code">${otp}</div>
              </div>
              
              <p>This code will expire in 10 minutes. If you didn't request this code, please ignore this email.</p>
              
              <p>Best regards,<br>The MixLab Studio Team</p>
            </div>
            <div class="footer">
              <p>This is an automated message. Please do not reply to this email.</p>
            </div>
          </div>
        </body>
      </html>
    `;

    return this.sendEmail(email, subject, htmlContent);
  }

  /**
   * Send OTP email for password reset
   * @param {string} email - Recipient email
   * @param {string} otp - 6-digit OTP code
   * @returns {Promise<boolean>}
   */
  async sendPasswordResetOTP(email, otp) {
    const subject = 'Reset Your MixLab Studio Password';
    const htmlContent = `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="UTF-8">
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: linear-gradient(135deg, #f093fb 0%, #f5576c 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
            .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px; }
            .otp-box { background: white; border: 2px dashed #f5576c; padding: 20px; text-align: center; margin: 20px 0; border-radius: 8px; }
            .otp-code { font-size: 32px; font-weight: bold; color: #f5576c; letter-spacing: 5px; }
            .footer { text-align: center; margin-top: 20px; color: #666; font-size: 12px; }
            .warning { background: #fff3cd; border-left: 4px solid #ffc107; padding: 15px; margin: 20px 0; border-radius: 4px; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>Password Reset Request</h1>
            </div>
            <div class="content">
              <p>We received a request to reset your password for your MixLab Studio account. Use the OTP code below to proceed:</p>
              
              <div class="otp-box">
                <p style="margin: 0 0 10px 0; color: #666;">Your reset code:</p>
                <div class="otp-code">${otp}</div>
              </div>
              
              <div class="warning">
                <strong>⚠️ Security Notice:</strong> This code will expire in 10 minutes. If you didn't request a password reset, please ignore this email and your password will remain unchanged.
              </div>
              
              <p>Best regards,<br>The MixLab Studio Team</p>
            </div>
            <div class="footer">
              <p>This is an automated message. Please do not reply to this email.</p>
            </div>
          </div>
        </body>
      </html>
    `;

    return this.sendEmail(email, subject, htmlContent);
  }

  /**
   * Send email via Brevo API
   * @param {string} to - Recipient email
   * @param {string} subject - Email subject
   * @param {string} htmlContent - HTML email content
   * @returns {Promise<boolean>}
   */
  async sendEmail(to, subject, htmlContent) {
    if (!this.apiKey) {
      console.error('❌ Brevo API key not configured. Email not sent.');
      return false;
    }

    try {
      const response = await axios.post(
        this.apiUrl,
        {
          sender: {
            name: this.senderName,
            email: this.senderEmail
          },
          to: [
            {
              email: to
            }
          ],
          subject: subject,
          htmlContent: htmlContent
        },
        {
          headers: {
            'api-key': this.apiKey,
            'Content-Type': 'application/json'
          }
        }
      );

      if (response.status === 201) {
        console.log(`✅ Email sent successfully to ${to}`);
        return true;
      } else {
        console.error('❌ Failed to send email:', response.data);
        return false;
      }
    } catch (error) {
      console.error('❌ Error sending email:', error.response?.data || error.message);
      return false;
    }
  }
}

export default new EmailService();

