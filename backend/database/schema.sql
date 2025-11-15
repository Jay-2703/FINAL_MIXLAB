-- MixLab Studio Authentication Database Schema
-- MySQL Database Setup Script

-- Create database (uncomment if needed)
-- CREATE DATABASE IF NOT EXISTS mixlab_studio CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
-- USE mixlab_studio;

-- Users table for authentication
CREATE TABLE IF NOT EXISTS users (
    id INT AUTO_INCREMENT PRIMARY KEY,
    username VARCHAR(50) NOT NULL UNIQUE,
    first_name VARCHAR(100) NOT NULL,
    last_name VARCHAR(100) NOT NULL,
    email VARCHAR(255) NOT NULL UNIQUE,
    birthday DATE,
    contact VARCHAR(20),
    home_address TEXT,
    hashed_password VARCHAR(255),
    role ENUM('student', 'admin', 'instructor') DEFAULT 'student',
    is_verified BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    -- Indexes for performance
    INDEX idx_email (email),
    INDEX idx_username (username),
    INDEX idx_role (role),
    INDEX idx_is_verified (is_verified),
    INDEX idx_created_at (created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- OTP Verification table for email verification and password reset
CREATE TABLE IF NOT EXISTS otp_verification (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NULL,
    email VARCHAR(255) NOT NULL,
    otp_code VARCHAR(6) NOT NULL,
    expires_at TIMESTAMP NOT NULL,
    type ENUM('verify_email', 'reset_password') NOT NULL,
    is_used BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    -- Foreign key constraint (optional, allows NULL for pre-registration OTPs)
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    
    -- Indexes for performance
    INDEX idx_email (email),
    INDEX idx_otp_code (otp_code),
    INDEX idx_expires_at (expires_at),
    INDEX idx_type (type),
    INDEX idx_is_used (is_used),
    INDEX idx_user_id (user_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Sessions table for session management (optional, if using database sessions)
CREATE TABLE IF NOT EXISTS sessions (
    id VARCHAR(128) PRIMARY KEY,
    user_id INT NOT NULL,
    expires_at TIMESTAMP NOT NULL,
    data TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    INDEX idx_user_id (user_id),
    INDEX idx_expires_at (expires_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Failed login attempts table for brute-force protection
CREATE TABLE IF NOT EXISTS failed_login_attempts (
    id INT AUTO_INCREMENT PRIMARY KEY,
    identifier VARCHAR(255) NOT NULL, -- username or email
    ip_address VARCHAR(45),
    attempts INT DEFAULT 1,
    last_attempt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    locked_until TIMESTAMP NULL,
    
    INDEX idx_identifier (identifier),
    INDEX idx_ip_address (ip_address),
    INDEX idx_locked_until (locked_until)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Bookings table for studio bookings
CREATE TABLE IF NOT EXISTS bookings (
    id INT AUTO_INCREMENT PRIMARY KEY,
    booking_id VARCHAR(50) NOT NULL UNIQUE,
    user_id INT NULL, -- NULL for guest bookings
    name VARCHAR(200) NOT NULL,
    birthday DATE,
    email VARCHAR(255),
    contact VARCHAR(20),
    home_address TEXT,
    service_type VARCHAR(50) DEFAULT 'rehearsal',
    booking_date DATE NOT NULL,
    booking_time TIME NOT NULL,
    hours INT NOT NULL DEFAULT 1,
    members INT DEFAULT 1,
    payment_method ENUM('gcash', 'credit_card', 'debit_card', 'cash') NOT NULL,
    amount DECIMAL(10, 2) NOT NULL,
    payment_status ENUM('pending', 'paid', 'failed', 'cash') DEFAULT 'pending',
    reference_number VARCHAR(100),
    xendit_invoice_id VARCHAR(100),
    xendit_payment_id VARCHAR(100),
    qr_code_path VARCHAR(500),
    qr_code_data TEXT, -- Store QR code data as base64 or JSON
    check_in_status ENUM('pending', 'checked_in', 'completed', 'cancelled') DEFAULT 'pending',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL,
    
    -- Indexes for performance
    INDEX idx_booking_id (booking_id),
    INDEX idx_user_id (user_id),
    INDEX idx_booking_date (booking_date),
    INDEX idx_booking_time (booking_time),
    INDEX idx_payment_status (payment_status),
    INDEX idx_check_in_status (check_in_status),
    INDEX idx_created_at (created_at),
    -- Composite index for checking time conflicts
    INDEX idx_date_time (booking_date, booking_time, hours)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Learning Modules and Lessons
CREATE TABLE IF NOT EXISTS instruments (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(100) NOT NULL UNIQUE,
    description TEXT,
    icon VARCHAR(255),
    display_order INT DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    INDEX idx_display_order (display_order)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS modules (
    id INT AUTO_INCREMENT PRIMARY KEY,
    instrument_id INT NOT NULL,
    name VARCHAR(200) NOT NULL,
    description TEXT,
    level INT DEFAULT 1,
    display_order INT DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    FOREIGN KEY (instrument_id) REFERENCES instruments(id) ON DELETE CASCADE,
    INDEX idx_instrument_id (instrument_id),
    INDEX idx_level (level),
    INDEX idx_display_order (display_order)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS lessons (
    id INT AUTO_INCREMENT PRIMARY KEY,
    module_id INT NOT NULL,
    title VARCHAR(200) NOT NULL,
    content TEXT,
    images TEXT, -- JSON array of image URLs
    audio_url VARCHAR(500),
    youtube_video_id VARCHAR(100),
    points INT DEFAULT 10,
    display_order INT DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    FOREIGN KEY (module_id) REFERENCES modules(id) ON DELETE CASCADE,
    INDEX idx_module_id (module_id),
    INDEX idx_display_order (display_order)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- User Progress and Gamification
CREATE TABLE IF NOT EXISTS user_module_progress (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    lesson_id INT NOT NULL,
    completed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    points_earned INT DEFAULT 0,
    
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (lesson_id) REFERENCES lessons(id) ON DELETE CASCADE,
    UNIQUE KEY unique_user_lesson (user_id, lesson_id),
    INDEX idx_user_id (user_id),
    INDEX idx_lesson_id (lesson_id),
    INDEX idx_completed_at (completed_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS user_points (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL UNIQUE,
    total_points INT DEFAULT 0,
    learn_points INT DEFAULT 0,
    play_points INT DEFAULT 0,
    quiz_points INT DEFAULT 0,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    INDEX idx_total_points (total_points)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS achievements (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(100) NOT NULL UNIQUE,
    description TEXT,
    icon VARCHAR(255),
    badge_type ENUM('first_lesson', 'first_module', 'instrument_complete', 'milestone', 'special') NOT NULL,
    points_required INT DEFAULT 0,
    condition_type VARCHAR(50), -- e.g., 'lessons_completed', 'instruments_completed'
    condition_value INT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    INDEX idx_badge_type (badge_type)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS user_achievements (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    achievement_id INT NOT NULL,
    earned_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (achievement_id) REFERENCES achievements(id) ON DELETE CASCADE,
    UNIQUE KEY unique_user_achievement (user_id, achievement_id),
    INDEX idx_user_id (user_id),
    INDEX idx_achievement_id (achievement_id),
    INDEX idx_earned_at (earned_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Insert default instruments
INSERT INTO instruments (name, description, icon, display_order) VALUES
('Piano', 'Learn piano fundamentals and advanced techniques', '🎹', 1),
('Guitar', 'Master guitar chords, scales, and songs', '🎸', 2),
('Music Theory', 'Understand music fundamentals and composition', '🎵', 3)
ON DUPLICATE KEY UPDATE name=name;

-- Insert default achievements
INSERT INTO achievements (name, description, icon, badge_type, points_required, condition_type, condition_value) VALUES
('First Steps', 'Complete your first lesson', '🌟', 'first_lesson', 0, 'lessons_completed', 1),
('Module Master', 'Complete your first module', '⭐', 'first_module', 0, 'modules_completed', 1),
('Instrument Expert', 'Complete all lessons in an instrument', '🏆', 'instrument_complete', 0, 'instruments_completed', 1),
('Point Collector', 'Earn 100 points', '💎', 'milestone', 100, 'points_earned', 100),
('Point Champion', 'Earn 500 points', '👑', 'milestone', 500, 'points_earned', 500),
('Point Legend', 'Earn 1000 points', '💫', 'milestone', 1000, 'points_earned', 1000)
ON DUPLICATE KEY UPDATE name=name;

-- Quiz System Tables
CREATE TABLE IF NOT EXISTS quizzes (
    id INT AUTO_INCREMENT PRIMARY KEY,
    instrument_id INT NOT NULL,
    level INT NOT NULL,
    title VARCHAR(200) NOT NULL,
    description TEXT,
    questions JSON NOT NULL, -- Array of question objects
    time_limit INT DEFAULT 300, -- Time limit in seconds
    points_per_question INT DEFAULT 10,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    FOREIGN KEY (instrument_id) REFERENCES instruments(id) ON DELETE CASCADE,
    INDEX idx_instrument_level (instrument_id, level)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS quiz_attempts (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    quiz_id INT NOT NULL,
    score INT NOT NULL, -- Percentage score
    correct_answers INT NOT NULL,
    total_questions INT NOT NULL,
    max_streak INT DEFAULT 0, -- Longest streak of correct answers
    time_taken INT, -- Time taken in seconds
    points_earned INT DEFAULT 0,
    completed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (quiz_id) REFERENCES quizzes(id) ON DELETE CASCADE,
    INDEX idx_user_id (user_id),
    INDEX idx_quiz_id (quiz_id),
    INDEX idx_completed_at (completed_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS quiz_achievements (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(100) NOT NULL UNIQUE,
    description TEXT,
    icon VARCHAR(255),
    achievement_type ENUM('score', 'streak', 'participation') NOT NULL,
    threshold_value INT NOT NULL, -- Score percentage, streak count, or quiz count
    points_reward INT DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    INDEX idx_achievement_type (achievement_type)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS user_quiz_achievements (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    quiz_achievement_id INT NOT NULL,
    earned_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (quiz_achievement_id) REFERENCES quiz_achievements(id) ON DELETE CASCADE,
    UNIQUE KEY unique_user_quiz_achievement (user_id, quiz_achievement_id),
    INDEX idx_user_id (user_id),
    INDEX idx_earned_at (earned_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Insert quiz achievements
INSERT INTO quiz_achievements (name, description, icon, achievement_type, threshold_value, points_reward) VALUES
-- Score-based badges
('First Note', 'Score 50% or higher on a quiz', '🎵', 'score', 50, 20),
('Rising Melody', 'Score 70% or higher on a quiz', '🎶', 'score', 70, 30),
('Perfect Harmony', 'Score 90% or higher on a quiz', '🎼', 'score', 90, 50),
('Maestro', 'Score 100% on a quiz', '🎹', 'score', 100, 100),
-- Streak-based badges
('Hot Beat', 'Get 3 correct answers in a row', '🔥', 'streak', 3, 15),
('Groove Master', 'Get 5 correct answers in a row', '🥁', 'streak', 5, 25),
('Symphony Streak', 'Get 10 correct answers in a row', '🎺', 'streak', 10, 50),
-- Participation-based badges
('Open Mic', 'Complete your first quiz', '🎤', 'participation', 1, 10),
('Band Member', 'Complete 5 quizzes', '🎸', 'participation', 5, 40),
('Concert Performer', 'Complete 10 quizzes', '🎻', 'participation', 10, 75)
ON DUPLICATE KEY UPDATE name=name;

-- Admin Panel Tables
-- Appointments table for lesson scheduling
CREATE TABLE IF NOT EXISTS appointments (
    id INT AUTO_INCREMENT PRIMARY KEY,
    student_id INT NOT NULL,
    instructor_id INT NULL, -- NULL if not assigned yet
    booking_id VARCHAR(50) NULL, -- Link to booking if exists
    date DATE NOT NULL,
    time TIME NOT NULL,
    service_type VARCHAR(50) DEFAULT 'lesson',
    status ENUM('pending', 'confirmed', 'cancelled', 'completed', 'rescheduled') DEFAULT 'pending',
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    FOREIGN KEY (student_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (instructor_id) REFERENCES users(id) ON DELETE SET NULL,
    INDEX idx_student_id (student_id),
    INDEX idx_instructor_id (instructor_id),
    INDEX idx_date (date),
    INDEX idx_status (status),
    INDEX idx_booking_id (booking_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Announcements table
CREATE TABLE IF NOT EXISTS announcements (
    id INT AUTO_INCREMENT PRIMARY KEY,
    title VARCHAR(200) NOT NULL,
    content TEXT NOT NULL,
    audience ENUM('all', 'students', 'instructors', 'admins') DEFAULT 'all',
    scheduled_at TIMESTAMP NULL, -- NULL for immediate posting
    created_by INT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE CASCADE,
    INDEX idx_audience (audience),
    INDEX idx_scheduled_at (scheduled_at),
    INDEX idx_created_at (created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Activity logs table
CREATE TABLE IF NOT EXISTS activity_logs (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NULL, -- NULL for system actions
    type VARCHAR(50) NOT NULL, -- e.g., 'user_created', 'booking_cancelled', 'module_updated'
    details TEXT, -- JSON or text description
    status VARCHAR(50) DEFAULT 'success',
    ip_address VARCHAR(45),
    user_agent TEXT,
    timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL,
    INDEX idx_user_id (user_id),
    INDEX idx_type (type),
    INDEX idx_timestamp (timestamp),
    INDEX idx_status (status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Notifications table
CREATE TABLE IF NOT EXISTS notifications (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NULL, -- NULL for broadcast notifications
    type ENUM('system', 'user', 'appointment', 'gamification', 'announcement') NOT NULL,
    message TEXT NOT NULL,
    link VARCHAR(500), -- Optional link to related page
    is_read BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    INDEX idx_user_id (user_id),
    INDEX idx_type (type),
    INDEX idx_is_read (is_read),
    INDEX idx_created_at (created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Note: Run these ALTER TABLE statements separately if columns don't exist
-- ALTER TABLE modules ADD COLUMN status ENUM('active', 'inactive', 'draft') DEFAULT 'active';
-- ALTER TABLE modules ADD COLUMN service_type VARCHAR(50) DEFAULT 'lesson';
-- ALTER TABLE modules ADD COLUMN level_requirement INT DEFAULT 1;
-- ALTER TABLE lessons ADD COLUMN status ENUM('active', 'inactive', 'draft') DEFAULT 'active';
-- ALTER TABLE quizzes ADD COLUMN status ENUM('active', 'inactive', 'draft') DEFAULT 'active';

