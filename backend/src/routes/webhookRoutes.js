import express from 'express';
import { handleXenditWebhook, verifyPaymentStatus } from '../controllers/xenditWebhookController.js';

const router = express.Router();

/**
 * Webhook Routes
 * These routes handle external service callbacks
 */

// Xendit payment webhook
router.post('/xendit', handleXenditWebhook);

// Verify payment status manually
router.get('/xendit/verify/:bookingId', verifyPaymentStatus);

export default router;

