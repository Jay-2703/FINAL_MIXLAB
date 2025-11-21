import express from 'express';
import { requireAdmin, requireAdminOnly } from '../middleware/adminAuth.js';
import * as adminController from '../controllers/adminController.js';
import * as adminBookingController from '../controllers/adminBookingController.js';
import * as adminContentController from '../controllers/adminContentController.js';
import * as adminAnalyticsController from '../controllers/adminAnalyticsController.js';
import * as adminNotificationController from '../controllers/adminNotificationController.js';

const router = express.Router();

// All routes require admin authentication
router.use(requireAdmin);

// Dashboard
router.get('/dashboard', adminController.getDashboardMetrics);

// Users management
router.get('/users', adminController.getUsers);
router.post('/users', requireAdminOnly, adminController.createUser);
router.put('/users/:id', requireAdminOnly, adminController.updateUser);
router.delete('/users/:id', requireAdminOnly, adminController.deleteUser);

// Bookings Management
// IMPORTANT: Specific routes (/bookings/slots) must come BEFORE dynamic routes (/bookings/:id)
router.get('/bookings/slots', adminBookingController.getAvailableSlots);
router.get('/bookings', adminBookingController.getBookings);
router.post('/bookings', adminBookingController.createBooking);
router.put('/bookings/:id', adminBookingController.updateBooking);
router.delete('/bookings/:id', adminBookingController.deleteBooking);

// Content Management - Modules
router.get('/modules', adminContentController.getModules);
router.post('/modules', requireAdminOnly, adminContentController.createModule);
router.put('/modules/:id', requireAdminOnly, adminContentController.updateModule);
router.delete('/modules/:id', requireAdminOnly, adminContentController.deleteModule);

// Content Management - Lessons
router.get('/lessons', adminContentController.getLessons);
router.post('/lessons', requireAdminOnly, adminContentController.createLesson);
router.put('/lessons/:id', requireAdminOnly, adminContentController.updateLesson);
router.delete('/lessons/:id', requireAdminOnly, adminContentController.deleteLesson);

// Content Management - Quizzes
router.get('/quizzes', adminContentController.getQuizzes);
router.post('/quizzes', requireAdminOnly, adminContentController.createQuiz);
router.put('/quizzes/:id', requireAdminOnly, adminContentController.updateQuiz);
router.delete('/quizzes/:id', requireAdminOnly, adminContentController.deleteQuiz);

// Analytics
router.get('/analytics', adminAnalyticsController.getAnalytics);

// Reports
router.get('/reports/bookings', adminAnalyticsController.getBookingReport);
router.get('/reports/lessons', adminAnalyticsController.getLessonCompletionReport);
router.get('/reports/gamification', adminAnalyticsController.getGamificationReport);
router.get('/reports/transactions', adminAnalyticsController.getTransactionsReport);

// Notifications
router.get('/notifications', adminNotificationController.getNotifications);
router.post('/notifications', adminNotificationController.createNotification);
router.put('/notifications/:id/read', adminNotificationController.markNotificationRead);
router.put('/notifications/read-all', adminNotificationController.markAllNotificationsRead);
router.get('/notifications/unread-count', adminNotificationController.getUnreadCount);

// Activity Logs
router.get('/activity-logs', adminNotificationController.getActivityLogs);

export default router;