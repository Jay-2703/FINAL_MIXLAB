import { query, getConnection } from '../config/db.js';
import { verifyToken } from '../utils/jwt.js';

/**
 * Quiz Controller
 * Handles quiz gameplay, scoring, and achievements
 */

/**
 * Get quizzes for an instrument and level
 * GET /api/quiz/quizzes/:instrument/:level
 */
export const getQuizzes = async (req, res) => {
  try {
    const { instrument, level } = req.params;

    // Get instrument ID
    const [instrumentData] = await query(
      'SELECT id FROM instruments WHERE name = ? OR id = ?',
      [instrument, instrument]
    );

    if (!instrumentData) {
      return res.status(404).json({
        success: false,
        message: 'Instrument not found'
      });
    }

    // Get quizzes
    const quizzes = await query(
      'SELECT * FROM quizzes WHERE instrument_id = ? AND level = ? ORDER BY id ASC',
      [instrumentData.id, level]
    );

    // Parse questions JSON
    const quizzesWithParsedQuestions = quizzes.map(quiz => ({
      ...quiz,
      questions: quiz.questions ? JSON.parse(quiz.questions) : []
    }));

    res.json({
      success: true,
      data: quizzesWithParsedQuestions
    });
  } catch (error) {
    console.error('Error getting quizzes:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
};

/**
 * Get single quiz
 * GET /api/quiz/:quizId
 */
export const getQuiz = async (req, res) => {
  try {
    const { quizId } = req.params;

    const [quiz] = await query(
      `SELECT q.*, i.name as instrument_name
       FROM quizzes q
       JOIN instruments i ON q.instrument_id = i.id
       WHERE q.id = ?`,
      [quizId]
    );

    if (!quiz) {
      return res.status(404).json({
        success: false,
        message: 'Quiz not found'
      });
    }

    // Parse questions JSON
    quiz.questions = quiz.questions ? JSON.parse(quiz.questions) : [];

    res.json({
      success: true,
      data: quiz
    });
  } catch (error) {
    console.error('Error getting quiz:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
};

/**
 * Submit quiz results
 * POST /api/quiz/submit
 */
export const submitQuiz = async (req, res) => {
  const connection = await getConnection();
  
  try {
    await connection.beginTransaction();

    const { quizId, answers, timeTaken, maxStreak } = req.body;

    // Get user from token
    const authHeader = req.headers['authorization'];
    if (!authHeader) {
      await connection.rollback();
      return res.status(401).json({
        success: false,
        message: 'Authentication required'
      });
    }

    const token = authHeader.split(' ')[1];
    const decoded = verifyToken(token);
    
    if (!decoded || !decoded.id) {
      await connection.rollback();
      return res.status(401).json({
        success: false,
        message: 'Invalid token'
      });
    }

    const userId = decoded.id;

    // Get quiz
    const [quiz] = await connection.execute(
      'SELECT * FROM quizzes WHERE id = ?',
      [quizId]
    );

    if (!quiz || quiz.length === 0) {
      await connection.rollback();
      return res.status(404).json({
        success: false,
        message: 'Quiz not found'
      });
    }

    const quizData = quiz[0];
    const questions = JSON.parse(quizData.questions);

    // Calculate score
    let correctCount = 0;
    questions.forEach((question, index) => {
      if (answers[index] === question.correctAnswer) {
        correctCount++;
      }
    });

    const score = Math.round((correctCount / questions.length) * 100);
    const pointsEarned = correctCount * (quizData.points_per_question || 10);

    // Save quiz attempt
    const [attemptResult] = await connection.execute(
      `INSERT INTO quiz_attempts 
       (user_id, quiz_id, score, correct_answers, total_questions, max_streak, time_taken, points_earned)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [userId, quizId, score, correctCount, questions.length, maxStreak || 0, timeTaken || 0, pointsEarned]
    );

    // Update user points (add to play_points)
    const [userPoints] = await connection.execute(
      'SELECT * FROM user_points WHERE user_id = ?',
      [userId]
    );

    if (userPoints && userPoints.length > 0) {
      await connection.execute(
        `UPDATE user_points 
         SET total_points = total_points + ?, 
             play_points = play_points + ?,
             updated_at = NOW()
         WHERE user_id = ?`,
        [pointsEarned, pointsEarned, userId]
      );
    } else {
      await connection.execute(
        'INSERT INTO user_points (user_id, total_points, play_points) VALUES (?, ?, ?)',
        [userId, pointsEarned, pointsEarned]
      );
    }

    // Check and award quiz achievements
    const achievements = await checkAndAwardQuizAchievements(
      userId, 
      score, 
      maxStreak || 0, 
      connection
    );

    // Get updated points before commit
    const [updatedPoints] = await connection.execute(
      'SELECT * FROM user_points WHERE user_id = ?',
      [userId]
    );

    await connection.commit();

    res.json({
      success: true,
      message: 'Quiz submitted successfully',
      data: {
        score,
        correctAnswers: correctCount,
        totalQuestions: questions.length,
        pointsEarned,
        totalPoints: (updatedPoints && updatedPoints.length > 0 && updatedPoints[0]?.total_points) || pointsEarned,
        maxStreak: maxStreak || 0,
        achievements: achievements
      }
    });
  } catch (error) {
    await connection.rollback();
    console.error('Error submitting quiz:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  } finally {
    connection.release();
  }
};

/**
 * Get user quiz statistics
 * GET /api/quiz/stats
 */
export const getUserQuizStats = async (req, res) => {
  try {
    // Get user from token
    const authHeader = req.headers['authorization'];
    if (!authHeader) {
      return res.status(401).json({
        success: false,
        message: 'Authentication required'
      });
    }

    const token = authHeader.split(' ')[1];
    const decoded = verifyToken(token);
    
    if (!decoded || !decoded.id) {
      return res.status(401).json({
        success: false,
        message: 'Invalid token'
      });
    }

    const userId = decoded.id;

    // Get quiz attempts
    const attempts = await query(
      `SELECT qa.*, q.title as quiz_title, q.level, i.name as instrument_name
       FROM quiz_attempts qa
       JOIN quizzes q ON qa.quiz_id = q.id
       JOIN instruments i ON q.instrument_id = i.id
       WHERE qa.user_id = ?
       ORDER BY qa.completed_at DESC`,
      [userId]
    );

    // Get quiz achievements
    const achievements = await query(
      `SELECT uqa.*, qa.name, qa.description, qa.icon, qa.achievement_type
       FROM user_quiz_achievements uqa
       JOIN quiz_achievements qa ON uqa.quiz_achievement_id = qa.id
       WHERE uqa.user_id = ?
       ORDER BY uqa.earned_at DESC`,
      [userId]
    );

    // Calculate statistics
    const totalQuizzes = attempts.length;
    const averageScore = totalQuizzes > 0
      ? Math.round(attempts.reduce((sum, a) => sum + a.score, 0) / totalQuizzes)
      : 0;
    const bestScore = totalQuizzes > 0
      ? Math.max(...attempts.map(a => a.score))
      : 0;
    const totalPoints = attempts.reduce((sum, a) => sum + (a.points_earned || 0), 0);

    res.json({
      success: true,
      data: {
        totalQuizzes,
        averageScore,
        bestScore,
        totalPoints,
        attempts,
        achievements
      }
    });
  } catch (error) {
    console.error('Error getting quiz stats:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
};

/**
 * Check and award quiz achievements
 */
async function checkAndAwardQuizAchievements(userId, score, maxStreak, connection) {
  const newAchievements = [];

  try {
    // Get all quiz achievements
    const [allAchievements] = await connection.execute(
      'SELECT * FROM quiz_achievements'
    );

    // Get user's existing quiz achievements
    const [userAchievements] = await connection.execute(
      'SELECT quiz_achievement_id FROM user_quiz_achievements WHERE user_id = ?',
      [userId]
    );

    const earnedAchievementIds = userAchievements.map(ua => ua.quiz_achievement_id);

    // Get user's quiz statistics
    const [userStats] = await connection.execute(
      `SELECT 
        COUNT(*) as total_quizzes,
        MAX(max_streak) as best_streak
       FROM quiz_attempts
       WHERE user_id = ?`,
      [userId]
    );

    const stats = userStats[0] || { total_quizzes: 0, best_streak: 0 };

    // Check each achievement
    for (const achievement of allAchievements) {
      // Skip if already earned
      if (earnedAchievementIds.includes(achievement.id)) {
        continue;
      }

      let shouldAward = false;

      switch (achievement.achievement_type) {
        case 'score':
          // Check if score meets threshold
          if (score >= achievement.threshold_value) {
            shouldAward = true;
          }
          break;

        case 'streak':
          // Check if streak meets threshold
          if (maxStreak >= achievement.threshold_value) {
            shouldAward = true;
          }
          break;

        case 'participation':
          // Check if total quizzes meets threshold
          if (stats.total_quizzes >= achievement.threshold_value) {
            shouldAward = true;
          }
          break;
      }

      if (shouldAward) {
        // Award achievement
        await connection.execute(
          'INSERT INTO user_quiz_achievements (user_id, quiz_achievement_id) VALUES (?, ?)',
          [userId, achievement.id]
        );

        // Award points if specified
        if (achievement.points_reward > 0) {
          const [userPoints] = await connection.execute(
            'SELECT * FROM user_points WHERE user_id = ?',
            [userId]
          );

          if (userPoints && userPoints.length > 0) {
            await connection.execute(
              `UPDATE user_points 
               SET total_points = total_points + ?,
                   play_points = play_points + ?,
                   updated_at = NOW()
               WHERE user_id = ?`,
              [achievement.points_reward, achievement.points_reward, userId]
            );
          } else {
            await connection.execute(
              'INSERT INTO user_points (user_id, total_points, play_points) VALUES (?, ?, ?)',
              [userId, achievement.points_reward, achievement.points_reward]
            );
          }
        }

        newAchievements.push({
          id: achievement.id,
          name: achievement.name,
          description: achievement.description,
          icon: achievement.icon,
          achievement_type: achievement.achievement_type,
          points_reward: achievement.points_reward
        });

        // Notify admins about achievement unlocked
        try {
          await notifyAdmins(
            'gamification',
            `Achievement unlocked: ${achievement.name}`,
            `/frontend/views/admin/gamification.html`
          );
        } catch (notifError) {
          console.error('Error sending achievement notification:', notifError);
        }
      }
    }

    return newAchievements;
  } catch (error) {
    console.error('Error checking quiz achievements:', error);
    return newAchievements;
  }
}

