import express from 'express';
import {
  getInstruments,
  getModules,
  getModuleLessons,
  getLesson,
  completeLesson,
  getUserProgress
} from '../controllers/lessonController.js';
import { authenticateToken } from '../utils/jwt.js';

const router = express.Router();

/**
 * Lesson Routes
 */

// Get all instruments (public)
router.get('/instruments', getInstruments);

// Get modules for an instrument (public)
router.get('/modules/:instrument', getModules);

// Get lessons for a module (public)
router.get('/modules/:instrument/:moduleId', getModuleLessons);

// Get single lesson (public)
router.get('/lesson/:lessonId', getLesson);

// Mark lesson as complete (requires auth)
router.post('/complete', authenticateToken, completeLesson);

// Get user progress (requires auth)
router.get('/progress', authenticateToken, getUserProgress);

export default router;

