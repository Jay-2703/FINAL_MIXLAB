import { query, getConnection } from '../config/db.js';
import { generateToken } from '../utils/jwt.js';
import axios from 'axios';
import dotenv from 'dotenv';

dotenv.config();

/**
 * OAuth Controller
 * Handles Google and Facebook OAuth authentication
 */

/**
 * Google OAuth - Initiate authentication
 * GET /api/auth/google
 */
export const googleAuth = async (req, res) => {
  const clientId = process.env.GOOGLE_CLIENT_ID;
  const redirectUri = process.env.GOOGLE_REDIRECT_URI || `${req.protocol}://${req.get('host')}/api/auth/google/callback`;
  const scope = 'profile email';

  if (!clientId) {
    return res.status(500).json({
      success: false,
      message: 'Google OAuth not configured'
    });
  }

  const authUrl = `https://accounts.google.com/o/oauth2/v2/auth?` +
    `client_id=${clientId}&` +
    `redirect_uri=${encodeURIComponent(redirectUri)}&` +
    `response_type=code&` +
    `scope=${encodeURIComponent(scope)}&` +
    `access_type=offline&` +
    `prompt=consent`;

  res.redirect(authUrl);
};

/**
 * Google OAuth - Handle callback
 * GET /api/auth/google/callback
 */
export const googleCallback = async (req, res) => {
  try {
    const { code } = req.query;

    if (!code) {
      return res.redirect('/frontend/views/auth/login.html?error=oauth_failed');
    }

    const clientId = process.env.GOOGLE_CLIENT_ID;
    const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
    const redirectUri = process.env.GOOGLE_REDIRECT_URI || `${req.protocol}://${req.get('host')}/api/auth/google/callback`;

    // Exchange code for access token
    const tokenResponse = await axios.post('https://oauth2.googleapis.com/token', {
      code,
      client_id: clientId,
      client_secret: clientSecret,
      redirect_uri: redirectUri,
      grant_type: 'authorization_code'
    });

    const { access_token } = tokenResponse.data;

    // Get user info from Google
    const userResponse = await axios.get('https://www.googleapis.com/oauth2/v2/userinfo', {
      headers: {
        Authorization: `Bearer ${access_token}`
      }
    });

    const { id, email, given_name, family_name, picture } = userResponse.data;

    // Check if user exists
    const [existingUser] = await query(
      'SELECT * FROM users WHERE email = ?',
      [email]
    );

    let user;

    if (existingUser) {
      // Update user if needed
      user = existingUser;
    } else {
      // Create new user
      const connection = await getConnection();
      try {
        await connection.beginTransaction();

        // Generate a username from email
        const username = email.split('@')[0] + '_' + id.substring(0, 6);

        const [result] = await query(
          `INSERT INTO users (username, first_name, last_name, email, role, is_verified, hashed_password)
           VALUES (?, ?, ?, ?, 'student', TRUE, ?)`,
          [username, given_name || 'User', family_name || '', email, 'oauth_user_' + id]
        );

        const [newUser] = await query(
          'SELECT id, username, first_name, last_name, email, role, is_verified, created_at FROM users WHERE id = ?',
          [result.insertId]
        );

        user = newUser;
        await connection.commit();
      } catch (error) {
        await connection.rollback();
        throw error;
      } finally {
        connection.release();
      }
    }

    // Generate JWT token
    const token = generateToken({
      id: user.id,
      username: user.username,
      email: user.email,
      role: user.role
    });

    // Set HTTP-only cookie
    res.cookie('token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 7 * 24 * 60 * 60 * 1000
    });

    // Redirect to frontend with token
    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
    res.redirect(`${frontendUrl}/frontend/views/auth/login.html?token=${token}&oauth=google`);
  } catch (error) {
    console.error('Google OAuth error:', error);
    res.redirect('/frontend/views/auth/login.html?error=oauth_failed');
  }
};

/**
 * Facebook OAuth - Initiate authentication
 * GET /api/auth/facebook
 */
export const facebookAuth = async (req, res) => {
  const appId = process.env.FACEBOOK_APP_ID;
  const redirectUri = process.env.FACEBOOK_REDIRECT_URI || `${req.protocol}://${req.get('host')}/api/auth/facebook/callback`;

  if (!appId) {
    return res.status(500).json({
      success: false,
      message: 'Facebook OAuth not configured'
    });
  }

  const authUrl = `https://www.facebook.com/v18.0/dialog/oauth?` +
    `client_id=${appId}&` +
    `redirect_uri=${encodeURIComponent(redirectUri)}&` +
    `scope=email,public_profile&` +
    `response_type=code`;

  res.redirect(authUrl);
};

/**
 * Facebook OAuth - Handle callback
 * GET /api/auth/facebook/callback
 */
export const facebookCallback = async (req, res) => {
  try {
    const { code } = req.query;

    if (!code) {
      return res.redirect('/frontend/views/auth/login.html?error=oauth_failed');
    }

    const appId = process.env.FACEBOOK_APP_ID;
    const appSecret = process.env.FACEBOOK_APP_SECRET;
    const redirectUri = process.env.FACEBOOK_REDIRECT_URI || `${req.protocol}://${req.get('host')}/api/auth/facebook/callback`;

    // Exchange code for access token
    const tokenResponse = await axios.get('https://graph.facebook.com/v18.0/oauth/access_token', {
      params: {
        client_id: appId,
        client_secret: appSecret,
        redirect_uri: redirectUri,
        code
      }
    });

    const { access_token } = tokenResponse.data;

    // Get user info from Facebook
    const userResponse = await axios.get('https://graph.facebook.com/me', {
      params: {
        fields: 'id,email,first_name,last_name,picture',
        access_token
      }
    });

    const { id, email, first_name, last_name } = userResponse.data;

    // Check if user exists
    const [existingUser] = await query(
      'SELECT * FROM users WHERE email = ?',
      [email]
    );

    let user;

    if (existingUser) {
      user = existingUser;
    } else {
      // Create new user
      const connection = await getConnection();
      try {
        await connection.beginTransaction();

        // Generate a username from email or Facebook ID
        const username = (email ? email.split('@')[0] : 'user') + '_' + id.substring(0, 6);

        const [result] = await query(
          `INSERT INTO users (username, first_name, last_name, email, role, is_verified, hashed_password)
           VALUES (?, ?, ?, ?, 'student', TRUE, ?)`,
          [username, first_name || 'User', last_name || '', email || `facebook_${id}@facebook.com`, 'oauth_user_' + id]
        );

        const [newUser] = await query(
          'SELECT id, username, first_name, last_name, email, role, is_verified, created_at FROM users WHERE id = ?',
          [result.insertId]
        );

        user = newUser;
        await connection.commit();
      } catch (error) {
        await connection.rollback();
        throw error;
      } finally {
        connection.release();
      }
    }

    // Generate JWT token
    const token = generateToken({
      id: user.id,
      username: user.username,
      email: user.email,
      role: user.role
    });

    // Set HTTP-only cookie
    res.cookie('token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 7 * 24 * 60 * 60 * 1000
    });

    // Redirect to frontend with token
    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
    res.redirect(`${frontendUrl}/frontend/views/auth/login.html?token=${token}&oauth=facebook`);
  } catch (error) {
    console.error('Facebook OAuth error:', error);
    res.redirect('/frontend/views/auth/login.html?error=oauth_failed');
  }
};

