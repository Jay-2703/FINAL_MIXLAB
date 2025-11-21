import axios from 'axios';
import dotenv from 'dotenv';

dotenv.config();

// Xendit API Configuration
const XENDIT_API_URL = process.env.XENDIT_ENV === 'production'
  ? 'https://api.xendit.co'
  : 'https://api.xendit.co/v2'; // Use production API even for testing

const XENDIT_SECRET_KEY = process.env.XENDIT_SECRET_KEY;

if (!XENDIT_SECRET_KEY) {
  console.warn('⚠️  XENDIT_SECRET_KEY not set in environment variables');
}

// Create axios instance with auth
const xenditClient = axios.create({
  baseURL: XENDIT_API_URL,
  timeout: 30000, // 30 second timeout
  headers: {
    'Authorization': `Basic ${Buffer.from(XENDIT_SECRET_KEY + ':').toString('base64')}`,
    'Content-Type': 'application/json'
  }
});

// Add request interceptor for logging
xenditClient.interceptors.request.use(
  (config) => {
    console.log(`📤 Xendit API Request: ${config.method.toUpperCase()} ${config.url}`);
    return config;
  },
  (error) => {
    console.error('❌ Xendit Request Error:', error.message);
    return Promise.reject(error);
  }
);

// Add response interceptor for logging
xenditClient.interceptors.response.use(
  (response) => {
    console.log(`✅ Xendit API Response: ${response.status} ${response.config.url}`);
    return response;
  },
  (error) => {
    if (error.code === 'ENOTFOUND' || error.code === 'ECONNREFUSED') {
      console.error('❌ Network Error: Cannot reach Xendit API. Check your internet connection.');
    } else if (error.response) {
      console.error(`❌ Xendit API Error: ${error.response.status}`, error.response.data);
    } else {
      console.error('❌ Xendit Error:', error.message);
    }
    return Promise.reject(error);
  }
);

// In your createInvoice function, use environment variables for better control:

export async function createInvoice(data) {
  try {
    // Validate required fields
    if (!data.externalId || !data.amount || !data.payerEmail) {
      throw new Error('Missing required fields: externalId, amount, payerEmail');
    }

    // Ensure amount is valid
    const amount = parseFloat(data.amount);
    if (isNaN(amount) || amount <= 0) {
      throw new Error('Invalid amount');
    }

    console.log(`📝 Creating Xendit invoice for ${data.externalId}: ₱${amount}`);

    // Build base URL from environment or use localhost
    const baseUrl = process.env.FRONTEND_URL || process.env.BASE_URL || 'http://localhost:3000';
    
    // Build redirect URLs - correct path: /views/user/booking.html
    const successUrl = `${baseUrl}/views/user/booking.html?payment=success&booking_id=${data.externalId}`;
    const failureUrl = `${baseUrl}/views/user/booking.html?payment=failed&booking_id=${data.externalId}`;

    console.log(`🔗 Success redirect: ${successUrl}`);
    console.log(`🔗 Failure redirect: ${failureUrl}`);

    const invoiceData = {
      external_id: data.externalId,
      amount: amount,
      payer_email: data.payerEmail,
      description: data.description || `Payment for booking ${data.externalId}`,
      invoice_duration: parseInt(process.env.PAYMENT_EXPIRY_HOURS || '24') * 3600,
      currency: 'PHP',
      success_redirect_url: successUrl,
      failure_redirect_url: failureUrl,
      payment_methods: ['CARD', 'GCASH', 'PAYMAYA'],
      metadata: data.metadata || {}
    };

    const response = await xenditClient.post('/invoices', invoiceData);

    console.log(`✅ Invoice created successfully: ${response.data.id}`);
    
    return { 
      success: true, 
      data: {
        id: response.data.id,
        invoice_url: response.data.invoice_url,
        expiry_date: response.data.expiry_date,
        status: response.data.status
      }
    };
  } catch (error) {
    console.error('❌ Xendit Invoice Creation Error:', error.message);
    
    if (error.code === 'ENOTFOUND') {
      return {
        success: false,
        error: 'Cannot connect to payment gateway. Please check your internet connection and try again.',
        errorCode: 'NETWORK_ERROR'
      };
    }
    
    if (error.response?.data) {
      return {
        success: false,
        error: error.response.data.message || 'Failed to create payment invoice',
        errorCode: error.response.data.error_code,
        details: error.response.data
      };
    }
    
    return {
      success: false,
      error: error.message || 'Failed to create invoice',
      errorCode: 'UNKNOWN_ERROR'
    };
  }
}
/**
 * Create GCash Dynamic QR Code
 * @param {Object} data - { externalId, amount, metadata }
 */
export async function createGCashQR(data) {
  try {
    if (!data.externalId || !data.amount) {
      throw new Error('Missing required fields: externalId, amount');
    }

    const amount = parseFloat(data.amount);
    if (isNaN(amount) || amount <= 0) {
      throw new Error('Invalid amount');
    }

    console.log(`📱 Creating GCash QR for ${data.externalId}: ₱${amount}`);

    const response = await xenditClient.post('/qr_codes', {
      external_id: data.externalId,
      type: 'DYNAMIC',
      amount: amount,
      currency: 'PHP',
      channel_code: 'ID_DANA', // Use DANA for testing, or PH_GCASH for production
      callback_url: process.env.WEBHOOK_URL || 'http://localhost:3000/api/webhooks/xendit',
      metadata: data.metadata || {}
    });

    console.log(`✅ GCash QR created successfully`);

    return { 
      success: true, 
      data: {
        id: response.data.id,
        qr_string: response.data.qr_string,
        callback_url: response.data.callback_url,
        status: response.data.status
      }
    };
  } catch (error) {
    console.error('❌ GCash QR Creation Error:', error.message);
    
    if (error.code === 'ENOTFOUND') {
      return {
        success: false,
        error: 'Cannot connect to payment gateway',
        errorCode: 'NETWORK_ERROR'
      };
    }
    
    return {
      success: false,
      error: error.response?.data?.message || error.message || 'Failed to create GCash QR',
      errorCode: error.response?.data?.error_code
    };
  }
}

/**
 * Get invoice/payment status by ID
 * @param {string} invoiceId
 */
export async function getInvoiceStatus(invoiceId) {
  try {
    if (!invoiceId) {
      throw new Error('Invoice ID is required');
    }

    console.log(`🔍 Checking invoice status: ${invoiceId}`);

    const response = await xenditClient.get(`/invoices/${invoiceId}`);

    console.log(`✅ Invoice status retrieved: ${response.data.status}`);

    return { 
      success: true, 
      data: {
        id: response.data.id,
        external_id: response.data.external_id,
        status: response.data.status,
        amount: response.data.amount,
        paid_at: response.data.paid_at,
        payment_channel: response.data.payment_channel,
        payment_method: response.data.payment_method
      }
    };
  } catch (error) {
    console.error('❌ Get Invoice Status Error:', error.message);
    
    if (error.code === 'ENOTFOUND') {
      return {
        success: false,
        error: 'Cannot connect to payment gateway',
        errorCode: 'NETWORK_ERROR'
      };
    }
    
    return {
      success: false,
      error: error.response?.data?.message || error.message || 'Failed to get invoice status',
      errorCode: error.response?.data?.error_code
    };
  }
}

/**
 * Verify webhook token
 * @param {string} token
 */
export function verifyWebhookToken(token) {
  const webhookToken = process.env.XENDIT_WEBHOOK_TOKEN;
  
  if (!webhookToken) {
    console.warn('⚠️  XENDIT_WEBHOOK_TOKEN not set - webhook verification disabled');
    return true; // Allow webhooks if token not configured (development only)
  }
  
  return token === webhookToken;
}

/**
 * Test Xendit connection
 */
export async function testConnection() {
  try {
    console.log('🔌 Testing Xendit API connection...');
    
    const response = await xenditClient.get('/balance');
    
    console.log('✅ Xendit connection successful!');
    console.log('💰 Account balance:', response.data.balance);
    
    return { success: true, balance: response.data.balance };
  } catch (error) {
    console.error('❌ Xendit connection test failed:', error.message);
    
    if (error.code === 'ENOTFOUND') {
      console.error('   Cannot resolve api.xendit.co - check your DNS/internet connection');
    }
    
    return { 
      success: false, 
      error: error.message,
      code: error.code 
    };
  }
}

export default {
  createInvoice,
  createGCashQR,
  getInvoiceStatus,
  verifyWebhookToken,
  testConnection
};