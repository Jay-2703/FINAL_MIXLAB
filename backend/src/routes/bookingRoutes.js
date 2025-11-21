import express from 'express';
import { optionalAuth, requireAuth } from '../middleware/auth.js';

// Import only what exists in your bookingController
import {
  createBooking,
  getAvailableSlots
} from '../controllers/bookingController.js';

const router = express.Router();

/**
 * User Booking Routes
 * These routes are for regular users to manage their bookings
 */

// Get available time slots (no auth required)
router.get('/available-slots', getAvailableSlots);

// Create new booking (optional auth - supports guest bookings)
router.post('/create', optionalAuth, createBooking);

// TODO: Add these routes later when you implement the functions
// router.get('/my-bookings', requireAuth, getUserBookings);
// router.get('/:bookingId', requireAuth, getBooking);
// router.post('/update-payment', requireAuth, updatePaymentStatus);

export default router;