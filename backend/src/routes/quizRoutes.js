import express from 'express';
import {
  getQuizzes,
  getQuiz,
  submitQuiz,
  getUserQuizStats
} from '../controllers/quizController.js';
import { authenticateToken } from '../utils/jwt.js';

const router = express.Router();

/**
 * Quiz Routes
 */

// Get quizzes for instrument and level (public)
router.get('/quizzes/:instrument/:level', getQuizzes);

// Get single quiz (public)
router.get('/:quizId', getQuiz);

// Submit quiz results (requires auth)
router.post('/submit', authenticateToken, submitQuiz);

// Get user quiz statistics (requires auth)
router.get('/stats', authenticateToken, getUserQuizStats);

export default router;

