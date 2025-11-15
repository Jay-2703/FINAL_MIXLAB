import axios from 'axios';
import dotenv from 'dotenv';

dotenv.config();

const XENDIT_API_URL = 'https://api.xendit.co/v2';
const XENDIT_SECRET_KEY = process.env.XENDIT_SECRET_KEY;

// Create axios instance with auth header
const xenditClient = axios.create({
  baseURL: XENDIT_API_URL,
  headers: {
    'Authorization': `Basic ${Buffer.from(XENDIT_SECRET_KEY + ':').toString('base64')}`,
    'Content-Type': 'application/json'
  }
});

/**
 * Create Xendit Invoice for payment
 */
async function createInvoice(data) {
  try {
    const response = await xenditClient.post('/invoices', {
      external_id: data.externalId,
      amount: data.amount,
      payer_email: data.payerEmail,
      description: data.description,
      invoice_duration: parseInt(process.env.PAYMENT_EXPIRY_HOURS) * 3600 || 86400,
      currency: process.env.CURRENCY || 'PHP',
      success_redirect_url: `${process.env.FRONTEND_URL}/payment-success.html`,
      failure_redirect_url: `${process.env.FRONTEND_URL}/payment-failed.html`,
      payment_methods: data.paymentMethods || ['GCASH', 'CREDIT_CARD', 'DEBIT_CARD'],
      metadata: data.metadata || {}
    });

    return {
      success: true,
      data: response.data
    };
  } catch (error) {
    console.error('Xendit Invoice Error:', error.response?.data || error.message);
    return {
      success: false,
      error: error.response?.data?.message || 'Failed to create payment'
    };
  }
}

/**
 * Create GCash QR Code payment
 */
async function createGCashQR(data) {
  try {
    const response = await axios.post(
      'https://api.xendit.co/qr_codes',
      {
        external_id: data.externalId,
        type: 'DYNAMIC',
        callback_url: `${process.env.WEBHOOK_URL}`,
        amount: data.amount,
        currency: 'PHP',
        channel_code: 'ID_DANA', // Use appropriate channel for GCash
        metadata: data.metadata || {}
      },
      {
        headers: {
          'Authorization': `Basic ${Buffer.from(XENDIT_SECRET_KEY + ':').toString('base64')}`,
          'Content-Type': 'application/json'
        }
      }
    );

    return {
      success: true,
      data: response.data
    };
  } catch (error) {
    console.error('GCash QR Error:', error.response?.data || error.message);
    return {
      success: false,
      error: error.response?.data?.message || 'Failed to create GCash QR'
    };
  }
}

/**
 * Get payment/invoice status
 */
async function getInvoiceStatus(invoiceId) {
  try {
    const response = await xenditClient.get(`/invoices/${invoiceId}`);
    return {
      success: true,
      data: response.data
    };
  } catch (error) {
    console.error('Get Invoice Error:', error.response?.data || error.message);
    return {
      success: false,
      error: error.response?.data?.message || 'Failed to get invoice status'
    };
  }
}

/**
 * Verify webhook callback token
 */
function verifyWebhookToken(token) {
  return token === process.env.XENDIT_WEBHOOK_TOKEN;
}

export {
  createInvoice,
  createGCashQR,
  getInvoiceStatus,
  verifyWebhookToken
};