import express from 'express';
import {
  createInitialBooking,
  getUserData,
  createBooking,
  getBooking,
  updatePaymentStatus,
  getAvailableSlots
} from '../controllers/bookingController.js';
import { authenticateToken } from '../utils/jwt.js';

const router = express.Router();

/**
 * Booking Routes
 */

// Create initial booking from landing page (no auth required)
router.post('/create-initial', createInitialBooking);

// Get user data for auto-fill (requires auth)
router.get('/user-data', authenticateToken, getUserData);

// Get available time slots
router.get('/available-slots', getAvailableSlots);

// Create full booking (auth optional for guest bookings)
router.post('/create', createBooking);

// Get booking by ID
router.get('/:bookingId', getBooking);

// Update payment status
router.post('/update-payment', updatePaymentStatus);

export default router;

