import emailService from './emailService.js';
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * Booking Email Service
 * Sends booking confirmation emails with QR codes
 */
class BookingEmailService {
  /**
   * Send booking confirmation email with QR code
   * @param {object} booking - Booking data
   * @param {string} qrDataUrl - QR code as data URL (base64)
   * @returns {Promise<boolean>}
   */
  async sendBookingConfirmation(booking, qrDataUrl) {
    try {
      const email = booking.email;
      if (!email) {
        console.warn('No email provided for booking confirmation');
        return false;
      }

      const subject = `Booking Confirmed - ${booking.booking_id} | MixLab Studio`;
      
      // Format booking date and time
      const bookingDate = new Date(`${booking.booking_date}T${booking.booking_time}`).toLocaleString('en-US', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });

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
              .booking-details { background: white; padding: 20px; margin: 20px 0; border-radius: 8px; border-left: 4px solid #667eea; }
              .detail-row { display: flex; justify-content: space-between; padding: 10px 0; border-bottom: 1px solid #eee; }
              .detail-row:last-child { border-bottom: none; }
              .detail-label { font-weight: bold; color: #666; }
              .detail-value { color: #333; }
              .qr-section { text-align: center; margin: 30px 0; padding: 20px; background: white; border-radius: 8px; }
              .qr-code { max-width: 300px; margin: 20px auto; }
              .instructions { background: #fff3cd; border-left: 4px solid #ffc107; padding: 15px; margin: 20px 0; border-radius: 4px; }
              .footer { text-align: center; margin-top: 20px; color: #666; font-size: 12px; }
              .status-badge { display: inline-block; padding: 5px 15px; border-radius: 20px; font-weight: bold; }
              .status-paid { background: #d4edda; color: #155724; }
              .status-pending { background: #fff3cd; color: #856404; }
              .status-cash { background: #d1ecf1; color: #0c5460; }
            </style>
          </head>
          <body>
            <div class="container">
              <div class="header">
                <h1>🎵 Booking Confirmed!</h1>
                <p>Your MixLab Studio session is booked</p>
              </div>
              <div class="content">
                <p>Hello ${booking.name},</p>
                <p>Your studio booking has been confirmed. Please find your booking details and QR code below.</p>
                
                <div class="booking-details">
                  <h3 style="margin-top: 0;">Booking Details</h3>
                  <div class="detail-row">
                    <span class="detail-label">Booking ID:</span>
                    <span class="detail-value"><strong>${booking.booking_id}</strong></span>
                  </div>
                  <div class="detail-row">
                    <span class="detail-label">Name:</span>
                    <span class="detail-value">${booking.name}</span>
                  </div>
                  <div class="detail-row">
                    <span class="detail-label">Service:</span>
                    <span class="detail-value">${this.formatServiceType(booking.service_type)}</span>
                  </div>
                  <div class="detail-row">
                    <span class="detail-label">Date & Time:</span>
                    <span class="detail-value">${bookingDate}</span>
                  </div>
                  <div class="detail-row">
                    <span class="detail-label">Duration:</span>
                    <span class="detail-value">${booking.hours} hour(s)</span>
                  </div>
                  <div class="detail-row">
                    <span class="detail-label">Payment Method:</span>
                    <span class="detail-value">${this.formatPaymentMethod(booking.payment_method)}</span>
                  </div>
                  <div class="detail-row">
                    <span class="detail-label">Payment Status:</span>
                    <span class="detail-value">
                      <span class="status-badge status-${booking.payment_status}">
                        ${booking.payment_status.toUpperCase()}
                      </span>
                    </span>
                  </div>
                  ${booking.reference_number ? `
                  <div class="detail-row">
                    <span class="detail-label">Reference Number:</span>
                    <span class="detail-value">${booking.reference_number}</span>
                  </div>
                  ` : ''}
                </div>

                <div class="qr-section">
                  <h3>Check-In QR Code</h3>
                  <p>Please present this QR code when you arrive at the studio.</p>
                  <img src="${qrDataUrl}" alt="Booking QR Code" class="qr-code" />
                  <p style="margin-top: 15px; font-size: 14px; color: #666;">
                    <strong>Booking ID:</strong> ${booking.booking_id}
                  </p>
                </div>

                <div class="instructions">
                  <strong>📋 Important Instructions:</strong>
                  <ul style="margin: 10px 0; padding-left: 20px;">
                    <li>Please arrive 10 minutes before your scheduled time</li>
                    <li>Present this QR code at the front desk for check-in</li>
                    <li>Keep this email for your records</li>
                    ${booking.payment_status === 'pending' ? '<li>Complete your payment before your booking date</li>' : ''}
                  </ul>
                </div>

                <p>If you have any questions or need to make changes, please contact us.</p>
                
                <p>Best regards,<br>The MixLab Studio Team</p>
              </div>
              <div class="footer">
                <p>This is an automated message. Please do not reply to this email.</p>
                <p>MixLab Studio | Professional Music Production & Recording</p>
              </div>
            </div>
          </body>
        </html>
      `;

      // Send email using Brevo service
      return await emailService.sendEmail(email, subject, htmlContent);
    } catch (error) {
      console.error('Error sending booking confirmation email:', error);
      return false;
    }
  }

  /**
   * Format service type for display
   */
  formatServiceType(serviceType) {
    const types = {
      'music_lesson': 'Music Lesson',
      'recording': 'Recording Studio',
      'rehearsal': 'Band Rehearsal',
      'dance': 'Dance Studio',
      'arrangement': 'Music Arrangement',
      'voiceover': 'Voiceover/Dubbing'
    };
    return types[serviceType] || serviceType;
  }

  /**
   * Format payment method for display
   */
  formatPaymentMethod(method) {
    const methods = {
      'gcash': 'GCash',
      'credit_card': 'Credit Card',
      'debit_card': 'Debit Card',
      'cash': 'Cash (Pay on Arrival)'
    };
    return methods[method] || method;
  }
}

export default new BookingEmailService();

