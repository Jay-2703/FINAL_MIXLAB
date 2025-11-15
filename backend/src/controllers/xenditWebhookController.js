import { query, getConnection } from '../config/db.js';
import { verifyWebhookToken, getInvoiceStatus } from '../utils/xendit.js';
import qrService from '../services/qrService.js';
import bookingEmailService from '../services/bookingEmailService.js';

/**
 * Xendit Webhook Controller
 * Handles payment callbacks from Xendit
 */

/**
 * Handle Xendit webhook
 * POST /api/webhooks/xendit
 */
export const handleXenditWebhook = async (req, res) => {
  try {
    // Verify webhook token
    const webhookToken = req.headers['x-callback-token'];
    if (!verifyWebhookToken(webhookToken)) {
      return res.status(401).json({
        success: false,
        message: 'Invalid webhook token'
      });
    }

    const event = req.body;

    // Handle different event types
    switch (event.status) {
      case 'PAID':
        await handlePaymentSuccess(event);
        break;
      case 'EXPIRED':
        await handlePaymentExpired(event);
        break;
      case 'FAILED':
        await handlePaymentFailed(event);
        break;
      default:
        console.log('Unhandled webhook event:', event.status);
    }

    // Always return 200 to acknowledge receipt
    res.status(200).json({ received: true });
  } catch (error) {
    console.error('Error handling Xendit webhook:', error);
    // Still return 200 to prevent Xendit from retrying
    res.status(200).json({ received: true, error: error.message });
  }
};

/**
 * Handle successful payment
 */
async function handlePaymentSuccess(event) {
  const connection = await getConnection();
  
  try {
    await connection.beginTransaction();

    const externalId = event.external_id;
    const invoiceId = event.id;
    const paymentId = event.payment_id;

    // Find booking by external_id (booking_id)
    const [booking] = await query(
      'SELECT * FROM bookings WHERE booking_id = ?',
      [externalId],
      connection
    );

    if (!booking) {
      console.error('Booking not found for payment:', externalId);
      await connection.rollback();
      return;
    }

    // Update booking payment status
    await query(
      `UPDATE bookings 
       SET payment_status = 'paid', 
           xendit_payment_id = ?,
           reference_number = ?,
           updated_at = NOW()
       WHERE booking_id = ?`,
      [paymentId, invoiceId, externalId],
      connection
    );

    // Generate QR code if not already generated
    let qrDataUrl = booking.qr_code_data;
    
    if (!qrDataUrl) {
      const qrResult = await qrService.generateBookingQR(booking, booking.booking_id);
      if (qrResult.success) {
        qrDataUrl = qrResult.qrDataUrl;
        await query(
          'UPDATE bookings SET qr_code_path = ?, qr_code_data = ? WHERE booking_id = ?',
          [qrResult.qrPath, qrDataUrl, externalId],
          connection
        );
      }
    }

    await connection.commit();

    // Send confirmation email with QR code
    if (booking.email && qrDataUrl) {
      const updatedBooking = { ...booking, payment_status: 'paid', reference_number: invoiceId };
      await bookingEmailService.sendBookingConfirmation(updatedBooking, qrDataUrl);
    }

    console.log(`✅ Payment successful for booking ${externalId}`);
  } catch (error) {
    await connection.rollback();
    console.error('Error handling payment success:', error);
    throw error;
  } finally {
    connection.release();
  }
}

/**
 * Handle expired payment
 */
async function handlePaymentExpired(event) {
  try {
    const externalId = event.external_id;

    await query(
      `UPDATE bookings 
       SET payment_status = 'failed',
           updated_at = NOW()
       WHERE booking_id = ? AND payment_status = 'pending'`,
      [externalId]
    );

    console.log(`⏰ Payment expired for booking ${externalId}`);
  } catch (error) {
    console.error('Error handling payment expired:', error);
  }
}

/**
 * Handle failed payment
 */
async function handlePaymentFailed(event) {
  try {
    const externalId = event.external_id;

    await query(
      `UPDATE bookings 
       SET payment_status = 'failed',
           updated_at = NOW()
       WHERE booking_id = ? AND payment_status = 'pending'`,
      [externalId]
    );

    console.log(`❌ Payment failed for booking ${externalId}`);
  } catch (error) {
    console.error('Error handling payment failed:', error);
  }
}

/**
 * Verify payment status manually
 * GET /api/webhooks/xendit/verify/:bookingId
 */
export const verifyPaymentStatus = async (req, res) => {
  try {
    const { bookingId } = req.params;

    const [booking] = await query(
      'SELECT * FROM bookings WHERE booking_id = ?',
      [bookingId]
    );

    if (!booking) {
      return res.status(404).json({
        success: false,
        message: 'Booking not found'
      });
    }

    // If has Xendit invoice ID, check status
    if (booking.xendit_invoice_id) {
      const invoiceStatus = await getInvoiceStatus(booking.xendit_invoice_id);
      
      if (invoiceStatus.success && invoiceStatus.data.status === 'PAID') {
        // Update booking status
        await query(
          'UPDATE bookings SET payment_status = "paid" WHERE booking_id = ?',
          [bookingId]
        );
      }
    }

    // Get updated booking
    const [updatedBooking] = await query(
      'SELECT * FROM bookings WHERE booking_id = ?',
      [bookingId]
    );

    res.json({
      success: true,
      data: updatedBooking
    });
  } catch (error) {
    console.error('Error verifying payment status:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
};

