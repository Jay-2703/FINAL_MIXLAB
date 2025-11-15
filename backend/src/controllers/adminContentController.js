import { query } from '../config/db.js';
import { notifyAdmins } from '../services/notificationService.js';

/**
 * Get all modules
 * GET /api/admin/modules
 */
export const getModules = async (req, res) => {
  try {
    const { instrument_id, status, page = 1, limit = 20 } = req.query;
    const offset = (page - 1) * limit;

    let sql = `
      SELECT m.*, i.name as instrument_name
      FROM modules m
      LEFT JOIN instruments i ON m.instrument_id = i.id
      WHERE 1=1
    `;
    const params = [];

    if (instrument_id) {
      sql += ' AND m.instrument_id = ?';
      params.push(instrument_id);
    }
    if (status) {
      sql += ' AND m.status = ?';
      params.push(status);
    }

    // Get total count
    const countSql = sql.replace(/SELECT.*FROM/, 'SELECT COUNT(*) as count FROM');
    const [countResult] = await query(countSql, params);
    const total = countResult[0]?.count || 0;

    sql += ' ORDER BY m.display_order ASC, m.created_at DESC LIMIT ? OFFSET ?';
    params.push(parseInt(limit), parseInt(offset));

    const modules = await query(sql, params);

    res.json({
      success: true,
      data: {
        modules,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total,
          pages: Math.ceil(total / limit)
        }
      }
    });
  } catch (error) {
    console.error('Get modules error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch modules'
    });
  }
};

/**
 * Create module
 * POST /api/admin/modules
 */
export const createModule = async (req, res) => {
  try {
    const { instrument_id, name, description, level, display_order, status, service_type, level_requirement } = req.body;

    if (!instrument_id || !name) {
      return res.status(400).json({
        success: false,
        message: 'Missing required fields: instrument_id, name'
      });
    }

    const result = await query(
      `INSERT INTO modules (instrument_id, name, description, level, display_order, status, service_type, level_requirement)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        instrument_id,
        name,
        description || null,
        level || 1,
        display_order || 0,
        status || 'active',
        service_type || 'lesson',
        level_requirement || 1
      ]
    );

    // Log activity
    await query(
      'INSERT INTO activity_logs (user_id, type, details, status) VALUES (?, ?, ?, ?)',
      [req.user.id, 'module_created', JSON.stringify({ moduleId: result.insertId, name }), 'success']
    );

    // Notify admins about new content
    try {
      await notifyAdmins(
        'system',
        `New module added: ${name}`,
        `/frontend/views/admin/modules.html`
      );
    } catch (notifError) {
      console.error('Error sending module notification:', notifError);
    }

    res.json({
      success: true,
      message: 'Module created successfully',
      data: { moduleId: result.insertId }
    });
  } catch (error) {
    console.error('Create module error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to create module'
    });
  }
};

/**
 * Update module
 * PUT /api/admin/modules/:id
 */
export const updateModule = async (req, res) => {
  try {
    const { id } = req.params;
    const { name, description, level, display_order, status, service_type, level_requirement } = req.body;

    const updates = [];
    const params = [];

    if (name !== undefined) {
      updates.push('name = ?');
      params.push(name);
    }
    if (description !== undefined) {
      updates.push('description = ?');
      params.push(description);
    }
    if (level !== undefined) {
      updates.push('level = ?');
      params.push(level);
    }
    if (display_order !== undefined) {
      updates.push('display_order = ?');
      params.push(display_order);
    }
    if (status !== undefined) {
      updates.push('status = ?');
      params.push(status);
    }
    if (service_type !== undefined) {
      updates.push('service_type = ?');
      params.push(service_type);
    }
    if (level_requirement !== undefined) {
      updates.push('level_requirement = ?');
      params.push(level_requirement);
    }

    if (updates.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'No fields to update'
      });
    }

    params.push(id);

    await query(
      `UPDATE modules SET ${updates.join(', ')} WHERE id = ?`,
      params
    );

    // Log activity
    await query(
      'INSERT INTO activity_logs (user_id, type, details, status) VALUES (?, ?, ?, ?)',
      [req.user.id, 'module_updated', JSON.stringify({ moduleId: id, updates }), 'success']
    );

    res.json({
      success: true,
      message: 'Module updated successfully'
    });
  } catch (error) {
    console.error('Update module error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update module'
    });
  }
};

/**
 * Delete module
 * DELETE /api/admin/modules/:id
 */
export const deleteModule = async (req, res) => {
  try {
    const { id } = req.params;

    await query('DELETE FROM modules WHERE id = ?', [id]);

    // Log activity
    await query(
      'INSERT INTO activity_logs (user_id, type, details, status) VALUES (?, ?, ?, ?)',
      [req.user.id, 'module_deleted', JSON.stringify({ moduleId: id }), 'success']
    );

    res.json({
      success: true,
      message: 'Module deleted successfully'
    });
  } catch (error) {
    console.error('Delete module error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to delete module'
    });
  }
};

/**
 * Get all lessons
 * GET /api/admin/lessons
 */
export const getLessons = async (req, res) => {
  try {
    const { module_id, status, page = 1, limit = 20 } = req.query;
    const offset = (page - 1) * limit;

    let sql = `
      SELECT l.*, m.name as module_name, m.instrument_id, i.name as instrument_name
      FROM lessons l
      LEFT JOIN modules m ON l.module_id = m.id
      LEFT JOIN instruments i ON m.instrument_id = i.id
      WHERE 1=1
    `;
    const params = [];

    if (module_id) {
      sql += ' AND l.module_id = ?';
      params.push(module_id);
    }
    if (status) {
      sql += ' AND l.status = ?';
      params.push(status);
    }

    // Get total count
    const countSql = sql.replace(/SELECT.*FROM/, 'SELECT COUNT(*) as count FROM');
    const [countResult] = await query(countSql, params);
    const total = countResult[0]?.count || 0;

    sql += ' ORDER BY l.display_order ASC, l.created_at DESC LIMIT ? OFFSET ?';
    params.push(parseInt(limit), parseInt(offset));

    const lessons = await query(sql, params);

    res.json({
      success: true,
      data: {
        lessons,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total,
          pages: Math.ceil(total / limit)
        }
      }
    });
  } catch (error) {
    console.error('Get lessons error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch lessons'
    });
  }
};

/**
 * Create lesson
 * POST /api/admin/lessons
 */
export const createLesson = async (req, res) => {
  try {
    const { module_id, title, content, images, audio_url, youtube_video_id, points, display_order, status } = req.body;

    if (!module_id || !title) {
      return res.status(400).json({
        success: false,
        message: 'Missing required fields: module_id, title'
      });
    }

    const imagesJson = images ? JSON.stringify(images) : null;

    const result = await query(
      `INSERT INTO lessons (module_id, title, content, images, audio_url, youtube_video_id, points, display_order, status)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        module_id,
        title,
        content || null,
        imagesJson,
        audio_url || null,
        youtube_video_id || null,
        points || 10,
        display_order || 0,
        status || 'active'
      ]
    );

    // Log activity
    await query(
      'INSERT INTO activity_logs (user_id, type, details, status) VALUES (?, ?, ?, ?)',
      [req.user.id, 'lesson_created', JSON.stringify({ lessonId: result.insertId, title }), 'success']
    );

    // Notify admins about new content
    try {
      await notifyAdmins(
        'system',
        `New lesson added: ${title}`,
        `/frontend/views/admin/modules.html`
      );
    } catch (notifError) {
      console.error('Error sending lesson notification:', notifError);
    }

    res.json({
      success: true,
      message: 'Lesson created successfully',
      data: { lessonId: result.insertId }
    });
  } catch (error) {
    console.error('Create lesson error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to create lesson'
    });
  }
};

/**
 * Update lesson
 * PUT /api/admin/lessons/:id
 */
export const updateLesson = async (req, res) => {
  try {
    const { id } = req.params;
    const { title, content, images, audio_url, youtube_video_id, points, display_order, status } = req.body;

    const updates = [];
    const params = [];

    if (title !== undefined) {
      updates.push('title = ?');
      params.push(title);
    }
    if (content !== undefined) {
      updates.push('content = ?');
      params.push(content);
    }
    if (images !== undefined) {
      updates.push('images = ?');
      params.push(JSON.stringify(images));
    }
    if (audio_url !== undefined) {
      updates.push('audio_url = ?');
      params.push(audio_url);
    }
    if (youtube_video_id !== undefined) {
      updates.push('youtube_video_id = ?');
      params.push(youtube_video_id);
    }
    if (points !== undefined) {
      updates.push('points = ?');
      params.push(points);
    }
    if (display_order !== undefined) {
      updates.push('display_order = ?');
      params.push(display_order);
    }
    if (status !== undefined) {
      updates.push('status = ?');
      params.push(status);
    }

    if (updates.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'No fields to update'
      });
    }

    params.push(id);

    await query(
      `UPDATE lessons SET ${updates.join(', ')} WHERE id = ?`,
      params
    );

    // Log activity
    await query(
      'INSERT INTO activity_logs (user_id, type, details, status) VALUES (?, ?, ?, ?)',
      [req.user.id, 'lesson_updated', JSON.stringify({ lessonId: id, updates }), 'success']
    );

    res.json({
      success: true,
      message: 'Lesson updated successfully'
    });
  } catch (error) {
    console.error('Update lesson error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update lesson'
    });
  }
};

/**
 * Delete lesson
 * DELETE /api/admin/lessons/:id
 */
export const deleteLesson = async (req, res) => {
  try {
    const { id } = req.params;

    await query('DELETE FROM lessons WHERE id = ?', [id]);

    // Log activity
    await query(
      'INSERT INTO activity_logs (user_id, type, details, status) VALUES (?, ?, ?, ?)',
      [req.user.id, 'lesson_deleted', JSON.stringify({ lessonId: id }), 'success']
    );

    res.json({
      success: true,
      message: 'Lesson deleted successfully'
    });
  } catch (error) {
    console.error('Delete lesson error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to delete lesson'
    });
  }
};

/**
 * Get all quizzes
 * GET /api/admin/quizzes
 */
export const getQuizzes = async (req, res) => {
  try {
    const { instrument_id, level, status, page = 1, limit = 20 } = req.query;
    const offset = (page - 1) * limit;

    let sql = `
      SELECT q.*, i.name as instrument_name,
      JSON_LENGTH(q.questions) as questions_count
      FROM quizzes q
      LEFT JOIN instruments i ON q.instrument_id = i.id
      WHERE 1=1
    `;
    const params = [];

    if (instrument_id) {
      sql += ' AND q.instrument_id = ?';
      params.push(instrument_id);
    }
    if (level) {
      sql += ' AND q.level = ?';
      params.push(level);
    }
    if (status) {
      sql += ' AND q.status = ?';
      params.push(status);
    }

    // Get total count
    const countSql = sql.replace(/SELECT.*FROM/, 'SELECT COUNT(*) as count FROM');
    const [countResult] = await query(countSql, params);
    const total = countResult[0]?.count || 0;

    sql += ' ORDER BY q.created_at DESC LIMIT ? OFFSET ?';
    params.push(parseInt(limit), parseInt(offset));

    const quizzes = await query(sql, params);

    res.json({
      success: true,
      data: {
        quizzes,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total,
          pages: Math.ceil(total / limit)
        }
      }
    });
  } catch (error) {
    console.error('Get quizzes error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch quizzes'
    });
  }
};

/**
 * Create quiz
 * POST /api/admin/quizzes
 */
export const createQuiz = async (req, res) => {
  try {
    const { instrument_id, level, title, description, questions, time_limit, points_per_question, status } = req.body;

    if (!instrument_id || !level || !title || !questions) {
      return res.status(400).json({
        success: false,
        message: 'Missing required fields: instrument_id, level, title, questions'
      });
    }

    const questionsJson = JSON.stringify(questions);

    const result = await query(
      `INSERT INTO quizzes (instrument_id, level, title, description, questions, time_limit, points_per_question, status)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        instrument_id,
        level,
        title,
        description || null,
        questionsJson,
        time_limit || 300,
        points_per_question || 10,
        status || 'active'
      ]
    );

    // Log activity
    await query(
      'INSERT INTO activity_logs (user_id, type, details, status) VALUES (?, ?, ?, ?)',
      [req.user.id, 'quiz_created', JSON.stringify({ quizId: result.insertId, title }), 'success']
    );

    // Notify admins about new content
    try {
      await notifyAdmins(
        'system',
        `New quiz added: ${title}`,
        `/frontend/views/admin/quizzes.html`
      );
    } catch (notifError) {
      console.error('Error sending quiz notification:', notifError);
    }

    res.json({
      success: true,
      message: 'Quiz created successfully',
      data: { quizId: result.insertId }
    });
  } catch (error) {
    console.error('Create quiz error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to create quiz'
    });
  }
};

/**
 * Update quiz
 * PUT /api/admin/quizzes/:id
 */
export const updateQuiz = async (req, res) => {
  try {
    const { id } = req.params;
    const { title, description, questions, time_limit, points_per_question, status } = req.body;

    const updates = [];
    const params = [];

    if (title !== undefined) {
      updates.push('title = ?');
      params.push(title);
    }
    if (description !== undefined) {
      updates.push('description = ?');
      params.push(description);
    }
    if (questions !== undefined) {
      updates.push('questions = ?');
      params.push(JSON.stringify(questions));
    }
    if (time_limit !== undefined) {
      updates.push('time_limit = ?');
      params.push(time_limit);
    }
    if (points_per_question !== undefined) {
      updates.push('points_per_question = ?');
      params.push(points_per_question);
    }
    if (status !== undefined) {
      updates.push('status = ?');
      params.push(status);
    }

    if (updates.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'No fields to update'
      });
    }

    params.push(id);

    await query(
      `UPDATE quizzes SET ${updates.join(', ')} WHERE id = ?`,
      params
    );

    // Log activity
    await query(
      'INSERT INTO activity_logs (user_id, type, details, status) VALUES (?, ?, ?, ?)',
      [req.user.id, 'quiz_updated', JSON.stringify({ quizId: id, updates }), 'success']
    );

    res.json({
      success: true,
      message: 'Quiz updated successfully'
    });
  } catch (error) {
    console.error('Update quiz error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update quiz'
    });
  }
};

/**
 * Delete quiz
 * DELETE /api/admin/quizzes/:id
 */
export const deleteQuiz = async (req, res) => {
  try {
    const { id } = req.params;

    await query('DELETE FROM quizzes WHERE id = ?', [id]);

    // Log activity
    await query(
      'INSERT INTO activity_logs (user_id, type, details, status) VALUES (?, ?, ?, ?)',
      [req.user.id, 'quiz_deleted', JSON.stringify({ quizId: id }), 'success']
    );

    res.json({
      success: true,
      message: 'Quiz deleted successfully'
    });
  } catch (error) {
    console.error('Delete quiz error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to delete quiz'
    });
  }
};

