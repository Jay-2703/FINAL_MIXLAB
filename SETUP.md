# MixLab Studio Authentication System - Setup Guide

This guide will help you set up the complete authentication system for MixLab Studio.

## 📋 Table of Contents

1. [Prerequisites](#prerequisites)
2. [Database Setup](#database-setup)
3. [Backend Setup](#backend-setup)
4. [Frontend Setup](#frontend-setup)
5. [Email Service Configuration](#email-service-configuration)
6. [OAuth Configuration (Optional)](#oauth-configuration-optional)
7. [Running the Application](#running-the-application)
8. [Testing](#testing)
9. [Production Deployment](#production-deployment)
10. [Troubleshooting](#troubleshooting)

## Prerequisites

Before you begin, ensure you have the following installed:

- **Node.js** (v18 or higher)
- **MySQL** (v8.0 or higher)
- **npm** or **yarn**
- A **Brevo account** (for email service) - [Sign up here](https://www.brevo.com/)

## Database Setup

### 1. Create MySQL Database

```bash
# Login to MySQL
mysql -u root -p

# Create database
CREATE DATABASE mixlab_studio CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

# Exit MySQL
exit;
```

### 2. Run Database Schema

```bash
# Navigate to backend directory
cd backend

# Run the schema SQL file
mysql -u root -p mixlab_studio < database/schema.sql
```

Or import via MySQL Workbench/phpMyAdmin:
- Open `backend/database/schema.sql`
- Execute the SQL script in your MySQL client

### 3. Verify Tables

```sql
USE mixlab_studio;
SHOW TABLES;
-- Should show: users, otp_verification, sessions, failed_login_attempts
```

## Backend Setup

### 1. Install Dependencies

```bash
cd backend
npm install
```

### 2. Configure Environment Variables

```bash
# Copy the example environment file
cp .env.example .env

# Edit .env with your actual values
# Use a text editor to fill in:
# - Database credentials
# - JWT secrets (generate strong random strings)
# - Brevo API key
# - OAuth credentials (if using)
```

**Important:** Generate strong JWT secrets:
```bash
# Generate random secret (Linux/Mac)
openssl rand -base64 32

# Or use Node.js
node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"
```

### 3. Update Database Configuration

Edit `backend/.env`:
```env
DB_HOST=localhost
DB_USER=your_mysql_username
DB_PASSWORD=your_mysql_password
DB_NAME=mixlab_studio
```

## Frontend Setup

The frontend files are already in place. No additional setup is required, but you can configure the API base URL if needed.

### Optional: Configure API Base URL

If your backend runs on a different port or domain, you can set it in the frontend:

1. Edit each JS file in `frontend/public/js/auth/` and update:
```javascript
const API_BASE_URL = window.API_BASE_URL || 'http://localhost:3000';
```

2. Or set it globally in your HTML:
```html
<script>
  window.API_BASE_URL = 'http://your-backend-url:port';
</script>
```

## Email Service Configuration

### 1. Create Brevo Account

1. Sign up at [Brevo](https://www.brevo.com/)
2. Verify your email address
3. Go to **Settings** → **API Keys**
4. Create a new API key
5. Copy the API key

### 2. Configure Brevo in Backend

Edit `backend/.env`:
```env
BREVO_API_KEY=your_brevo_api_key_here
BREVO_SENDER_EMAIL=your-verified-email@domain.com
BREVO_SENDER_NAME=MixLab Studio
```

**Note:** The sender email must be verified in your Brevo account.

### 3. Test Email Service

The system will automatically use Brevo to send OTP emails. In development mode, OTPs are also logged to the console.

## OAuth Configuration (Optional)

### Google OAuth

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select existing
3. Enable **Google+ API**
4. Go to **Credentials** → **Create Credentials** → **OAuth 2.0 Client ID**
5. Configure:
   - Application type: Web application  
   - Authorized redirect URIs: `http://localhost:3000/api/auth/google/callback`
6. Copy Client ID and Client Secret

Edit `backend/.env`:
```env
GOOGLE_CLIENT_ID=your_google_client_id
GOOGLE_CLIENT_SECRET=your_google_client_secret
GOOGLE_REDIRECT_URI=http://localhost:3000/api/auth/google/callback
```

### Facebook OAuth

1. Go to [Facebook Developers](https://developers.facebook.com/)
2. Create a new app
3. Add **Facebook Login** product
4. Configure:
   - Valid OAuth Redirect URIs: `http://localhost:3000/api/auth/facebook/callback`
5. Copy App ID and App Secret

Edit `backend/.env`:
```env
FACEBOOK_APP_ID=your_facebook_app_id
FACEBOOK_APP_SECRET=your_facebook_app_secret
FACEBOOK_REDIRECT_URI=http://localhost:3000/api/auth/facebook/callback
```

## Running the Application

### 1. Start Backend Server

```bash
cd backend

# Development mode (with auto-reload)
npm run dev

# Production mode
npm start
```

The server will start on `http://localhost:3000` (or your configured PORT).

### 2. Access Frontend

Open your browser and navigate to:
- **Registration**: `http://localhost:3000/frontend/views/auth/register.html`
- **Login**: `http://localhost:3000/frontend/views/auth/login.html`
- **Landing Page**: `http://localhost:3000/frontend/public/landing.html`

## Testing

### Test Registration Flow

1. Go to registration page
2. Fill in all required fields:
   - Username (min 3 characters)
   - First Name, Last Name
   - Email
   - Birthday
   - Contact Number
   - Password (must meet strength requirements)
   - Confirm Password
3. Submit form
4. Check email for OTP (or check console in dev mode)
5. Enter OTP on verification page
6. Should redirect to account created page

### Test Login Flow

1. Go to login page
2. Enter username and password
3. Should redirect to landing page on success

### Test Password Reset Flow

1. Go to forgot password page
2. Enter email address
3. Check email for OTP
4. Enter OTP on verification page
5. Enter new password
6. Should redirect to login page

### Test OAuth (if configured)

1. Click Google/Facebook login button
2. Complete OAuth flow
3. Should redirect back and log in automatically

## Production Deployment

### Security Checklist

- [ ] Change all default passwords and secrets
- [ ] Set `NODE_ENV=production`
- [ ] Use strong JWT secrets (32+ characters)
- [ ] Enable HTTPS
- [ ] Configure proper CORS origins
- [ ] Set up database backups
- [ ] Configure rate limiting appropriately
- [ ] Use environment variables (never hardcode secrets)
- [ ] Enable database SSL connections
- [ ] Set up monitoring and logging

### Environment Variables for Production

```env
NODE_ENV=production
PORT=3000
FRONTEND_URL=https://yourdomain.com

# Use production database
DB_HOST=your_production_db_host
DB_USER=your_production_db_user
DB_PASSWORD=your_secure_password
DB_NAME=mixlab_studio

# Strong JWT secrets
JWT_SECRET=your-production-jwt-secret-min-32-characters
JWT_REFRESH_SECRET=your-production-refresh-secret-min-32-characters

# Production email settings
BREVO_API_KEY=your_production_brevo_key
BREVO_SENDER_EMAIL=noreply@yourdomain.com

# Production OAuth redirects
GOOGLE_REDIRECT_URI=https://yourdomain.com/api/auth/google/callback
FACEBOOK_REDIRECT_URI=https://yourdomain.com/api/auth/facebook/callback
```

### Database Maintenance

Set up a cron job to clean up expired OTPs:

```bash
# Add to crontab (runs daily at 2 AM)
0 2 * * * mysql -u root -p mixlab_studio -e "UPDATE otp_verification SET is_used = TRUE WHERE expires_at < NOW() AND is_used = FALSE;"
```

## Troubleshooting

### Database Connection Issues

**Error:** `ER_BAD_DB_ERROR`
- **Solution:** Ensure database exists and name matches `.env` configuration

**Error:** `Access denied for user`
- **Solution:** Check MySQL username and password in `.env`

### Email Not Sending

**Issue:** OTP emails not received
- **Solution:** 
  - Verify Brevo API key is correct
  - Check sender email is verified in Brevo
  - Check spam folder
  - In development, check console for OTP (it's logged)

### OAuth Not Working

**Issue:** OAuth redirect fails
- **Solution:**
  - Verify redirect URIs match exactly in OAuth provider settings
  - Check OAuth credentials in `.env`
  - Ensure HTTPS in production

### Port Already in Use

**Error:** `EADDRINUSE`
- **Solution:** Change PORT in `.env` or kill the process using the port

### CORS Errors

**Issue:** Frontend can't connect to backend
- **Solution:**
  - Check `FRONTEND_URL` in `.env` matches your frontend URL
  - Verify CORS configuration in `server.js`

## Project Structure

```
Mixlab_final/
├── backend/
│   ├── database/
│   │   └── schema.sql          # Database schema
│   ├── src/
│   │   ├── config/
│   │   │   └── db.js           # Database configuration
│   │   ├── controllers/
│   │   │   ├── authController.js    # Auth logic
│   │   │   └── oauthController.js  # OAuth logic
│   │   ├── middleware/
│   │   │   ├── validation.js   # Input validation
│   │   │   └── security.js     # Security middleware
│   │   ├── routes/
│   │   │   └── authRoutes.js   # Auth routes
│   │   ├── services/
│   │   │   ├── emailService.js # Brevo email service
│   │   │   └── otpService.js   # OTP management
│   │   └── utils/
│   │       ├── jwt.js          # JWT utilities
│   │       └── passwordUtils.js # Password hashing
│   ├── .env.example           # Environment template
│   ├── package.json
│   └── server.js              # Main server file
├── frontend/
│   ├── public/
│   │   ├── css/
│   │   ├── js/
│   │   │   └── auth/          # Auth JavaScript files
│   │   └── landing.html
│   └── views/
│       └── auth/              # Auth HTML pages
└── SETUP.md                   # This file
```

## Support

For issues or questions:
1. Check the troubleshooting section
2. Review error logs in console
3. Verify all environment variables are set correctly
4. Ensure database schema is properly imported

## Security Best Practices

1. **Never commit `.env` file** - It's in `.gitignore`
2. **Use strong passwords** - For database, JWT secrets, etc.
3. **Enable HTTPS in production** - Use SSL/TLS certificates
4. **Regular updates** - Keep dependencies updated
5. **Rate limiting** - Already configured, adjust as needed
6. **Input validation** - All inputs are validated and sanitized
7. **Password hashing** - Using bcrypt with 12 rounds
8. **SQL injection protection** - Using parameterized queries
9. **XSS protection** - Input sanitization implemented
10. **CSRF protection** - SameSite cookies enabled

---

**Last Updated:** 2024
**Version:** 1.0.0

