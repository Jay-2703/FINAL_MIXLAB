import { query, getConnection } from '../config/db.js';
import { verifyToken } from '../utils/jwt.js';
import { notifyAdmins } from '../services/notificationService.js';

/**
 * Lesson Controller
 * Handles learning modules, lessons, progress, and gamification
 */

/**
 * Get all instruments
 * GET /api/lessons/instruments
 */
export const getInstruments = async (req, res) => {
  try {
    const instruments = await query(
      'SELECT * FROM instruments ORDER BY display_order ASC'
    );

    res.json({
      success: true,
      data: instruments
    });
  } catch (error) {
    console.error('Error getting instruments:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
};

/**
 * Get all modules for an instrument
 * GET /api/lessons/modules/:instrument
 */
export const getModules = async (req, res) => {
  try {
    const { instrument } = req.params;

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

    // Get modules with lesson count
    const modules = await query(
      `SELECT m.*, COUNT(l.id) as lesson_count
       FROM modules m
       LEFT JOIN lessons l ON m.id = l.module_id
       WHERE m.instrument_id = ?
       GROUP BY m.id
       ORDER BY m.level ASC, m.display_order ASC`,
      [instrumentData.id]
    );

    res.json({
      success: true,
      data: modules
    });
  } catch (error) {
    console.error('Error getting modules:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
};

/**
 * Get all lessons for a module
 * GET /api/lessons/modules/:instrument/:moduleId
 */
export const getModuleLessons = async (req, res) => {
  try {
    const { instrument, moduleId } = req.params;

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

    // Get module
    const [module] = await query(
      'SELECT * FROM modules WHERE id = ? AND instrument_id = ?',
      [moduleId, instrumentData.id]
    );

    if (!module) {
      return res.status(404).json({
        success: false,
        message: 'Module not found'
      });
    }

    // Get lessons
    const lessons = await query(
      'SELECT * FROM lessons WHERE module_id = ? ORDER BY display_order ASC',
      [moduleId]
    );

    // Parse images JSON if exists
    const lessonsWithParsedImages = lessons.map(lesson => ({
      ...lesson,
      images: lesson.images ? JSON.parse(lesson.images) : []
    }));

    res.json({
      success: true,
      data: {
        module,
        lessons: lessonsWithParsedImages
      }
    });
  } catch (error) {
    console.error('Error getting module lessons:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
};

/**
 * Get single lesson content
 * GET /api/lessons/lesson/:lessonId
 */
export const getLesson = async (req, res) => {
  try {
    const { lessonId } = req.params;

    const [lesson] = await query(
      `SELECT l.*, m.name as module_name, m.level, i.name as instrument_name
       FROM lessons l
       JOIN modules m ON l.module_id = m.id
       JOIN instruments i ON m.instrument_id = i.id
       WHERE l.id = ?`,
      [lessonId]
    );

    if (!lesson) {
      return res.status(404).json({
        success: false,
        message: 'Lesson not found'
      });
    }

    // Parse images JSON
    lesson.images = lesson.images ? JSON.parse(lesson.images) : [];

    res.json({
      success: true,
      data: lesson
    });
  } catch (error) {
    console.error('Error getting lesson:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
};

/**
 * Mark lesson as complete
 * POST /api/lessons/complete
 */
export const completeLesson = async (req, res) => {
  const connection = await getConnection();
  
  try {
    await connection.beginTransaction();

    const { lessonId } = req.body;

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

    // Check if lesson exists
    const [lesson] = await connection.execute(
      'SELECT * FROM lessons WHERE id = ?',
      [lessonId]
    );

    if (!lesson || lesson.length === 0) {
      await connection.rollback();
      return res.status(404).json({
        success: false,
        message: 'Lesson not found'
      });
    }

    const lessonData = lesson[0];

    // Check if already completed
    const [existing] = await connection.execute(
      'SELECT * FROM user_module_progress WHERE user_id = ? AND lesson_id = ?',
      [userId, lessonId]
    );

    if (existing && existing.length > 0) {
      await connection.rollback();
      return res.json({
        success: true,
        message: 'Lesson already completed',
        alreadyCompleted: true
      });
    }

    // Mark lesson as complete
    const pointsEarned = lessonData.points || 10;
    await connection.execute(
      'INSERT INTO user_module_progress (user_id, lesson_id, points_earned) VALUES (?, ?, ?)',
      [userId, lessonId, pointsEarned]
    );

    // Update user points
    const [userPoints] = await connection.execute(
      'SELECT * FROM user_points WHERE user_id = ?',
      [userId]
    );

    if (userPoints && userPoints.length > 0) {
      await connection.execute(
        `UPDATE user_points 
         SET total_points = total_points + ?, 
             learn_points = learn_points + ?,
             updated_at = NOW()
         WHERE user_id = ?`,
        [pointsEarned, pointsEarned, userId]
      );
    } else {
      await connection.execute(
        'INSERT INTO user_points (user_id, total_points, learn_points) VALUES (?, ?, ?)',
        [userId, pointsEarned, pointsEarned]
      );
    }

    // Check and award achievements
    const achievements = await checkAndAwardAchievements(userId, connection);

    await connection.commit();

    // Get updated user points
    const [updatedPoints] = await query(
      'SELECT * FROM user_points WHERE user_id = ?',
      [userId]
    );

    res.json({
      success: true,
      message: 'Lesson completed!',
      data: {
        pointsEarned,
        totalPoints: updatedPoints?.total_points || pointsEarned,
        achievements: achievements
      }
    });
  } catch (error) {
    await connection.rollback();
    console.error('Error completing lesson:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  } finally {
    connection.release();
  }
};

/**
 * Get user progress
 * GET /api/lessons/progress
 */
export const getUserProgress = async (req, res) => {
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

    // Get user points (includes learn, play, and quiz points)
    let [userPoints] = await query(
      'SELECT * FROM user_points WHERE user_id = ?',
      [userId]
    );

    // If no points record exists, create one with zeros
    if (!userPoints || userPoints.length === 0) {
      await query(
        'INSERT INTO user_points (user_id, total_points, learn_points, play_points, quiz_points) VALUES (?, 0, 0, 0, 0)',
        [userId]
      );
      [userPoints] = await query(
        'SELECT * FROM user_points WHERE user_id = ?',
        [userId]
      );
    }

    // Get completed lessons
    const completedLessons = await query(
      `SELECT ump.*, l.title, l.module_id, m.name as module_name, m.instrument_id, i.name as instrument_name
       FROM user_module_progress ump
       JOIN lessons l ON ump.lesson_id = l.id
       JOIN modules m ON l.module_id = m.id
       JOIN instruments i ON m.instrument_id = i.id
       WHERE ump.user_id = ?
       ORDER BY ump.completed_at DESC`,
      [userId]
    );

    // Get user achievements
    const achievements = await query(
      `SELECT ua.*, a.name, a.description, a.icon, a.badge_type
       FROM user_achievements ua
       JOIN achievements a ON ua.achievement_id = a.id
       WHERE ua.user_id = ?
       ORDER BY ua.earned_at DESC`,
      [userId]
    );

    // Calculate progress percentages
    const totalLessons = await query('SELECT COUNT(*) as total FROM lessons');
    const totalLessonsCount = totalLessons[0]?.total || 0;
    const completedCount = completedLessons.length;
    const progressPercentage = totalLessonsCount > 0 
      ? Math.round((completedCount / totalLessonsCount) * 100) 
      : 0;

    // Get final points (in case it was just created)
    const [finalPoints] = await query(
      'SELECT * FROM user_points WHERE user_id = ?',
      [userId]
    );

    res.json({
      success: true,
      data: {
        points: finalPoints || { total_points: 0, learn_points: 0, play_points: 0, quiz_points: 0 },
        completedLessons: completedLessons.length,
        totalLessons: totalLessonsCount,
        progressPercentage,
        completedLessonsList: completedLessons,
        achievements
      }
    });
  } catch (error) {
    console.error('Error getting user progress:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
};

/**
 * Check and award achievements
 */
async function checkAndAwardAchievements(userId, connection) {
  const newAchievements = [];

  try {
    // Get user stats
    const [userPoints] = await connection.execute(
      'SELECT * FROM user_points WHERE user_id = ?',
      [userId]
    );

    const [completedLessons] = await connection.execute(
      'SELECT lesson_id FROM user_module_progress WHERE user_id = ?',
      [userId]
    );

    const completedCount = completedLessons.length;

    // Get all achievements
    const [allAchievements] = await connection.execute(
      'SELECT * FROM achievements',
      []
    );

    // Get user's existing achievements
    const [userAchievements] = await connection.execute(
      'SELECT achievement_id FROM user_achievements WHERE user_id = ?',
      [userId]
    );

    const earnedAchievementIds = userAchievements.map(ua => ua.achievement_id);

    // Check each achievement
    for (const achievement of allAchievements) {
      // Skip if already earned
      if (earnedAchievementIds.includes(achievement.id)) {
        continue;
      }

      let shouldAward = false;

      switch (achievement.condition_type) {
        case 'lessons_completed':
          if (completedCount >= achievement.condition_value) {
            shouldAward = true;
          }
          break;
        case 'points_earned':
          const totalPoints = userPoints?.total_points || 0;
          if (totalPoints >= achievement.points_required) {
            shouldAward = true;
          }
          break;
        case 'modules_completed':
          // Count unique modules completed
          const [moduleIds] = await connection.execute(
            `SELECT DISTINCT m.id
             FROM user_module_progress ump
             JOIN lessons l ON ump.lesson_id = l.id
             JOIN modules m ON l.module_id = m.id
             WHERE ump.user_id = ?`,
            [userId]
          );
          if (moduleIds.length >= achievement.condition_value) {
            shouldAward = true;
          }
          break;
        case 'instruments_completed':
          // Count unique instruments with all lessons completed
          const [instrumentProgress] = await connection.execute(
            `SELECT i.id, i.name, COUNT(DISTINCT l.id) as completed, 
                    (SELECT COUNT(*) FROM lessons l2 
                     JOIN modules m2 ON l2.module_id = m2.id 
                     WHERE m2.instrument_id = i.id) as total
             FROM instruments i
             LEFT JOIN modules m ON i.id = m.instrument_id
             LEFT JOIN lessons l ON m.id = l.module_id
             LEFT JOIN user_module_progress ump ON l.id = ump.lesson_id AND ump.user_id = ?
             GROUP BY i.id
             HAVING completed = total AND total > 0`,
            [userId]
          );
          if (instrumentProgress.length >= achievement.condition_value) {
            shouldAward = true;
          }
          break;
      }

      if (shouldAward) {
        // Award achievement
        await connection.execute(
          'INSERT INTO user_achievements (user_id, achievement_id) VALUES (?, ?)',
          [userId, achievement.id]
        );

        newAchievements.push({
          id: achievement.id,
          name: achievement.name,
          description: achievement.description,
          icon: achievement.icon,
          badge_type: achievement.badge_type
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
    console.error('Error checking achievements:', error);
    return newAchievements;
  }
}

