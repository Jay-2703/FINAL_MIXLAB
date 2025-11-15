# MixLab Studio Authentication Backend

## Environment Variables

Create a `.env` file in the `backend` directory with the following variables:

```env
# Server Configuration
PORT=3000
NODE_ENV=development
FRONTEND_URL=http://localhost:3000

# Database Configuration (MySQL)
DB_HOST=localhost
DB_USER=root
DB_PASSWORD=your_database_password
DB_NAME=mixlab_studio

# JWT Configuration
JWT_SECRET=your-super-secret-jwt-key-change-this-in-production-min-32-characters
JWT_EXPIRES_IN=7d
JWT_REFRESH_SECRET=your-super-secret-refresh-key-change-this-in-production-min-32-characters
JWT_REFRESH_EXPIRES_IN=30d

# Brevo (Sendinblue) Email Service Configuration
BREVO_API_KEY=your_brevo_api_key_here
BREVO_SENDER_EMAIL=noreply@mixlabstudio.com
BREVO_SENDER_NAME=MixLab Studio

# Google OAuth Configuration (Optional)
GOOGLE_CLIENT_ID=your_google_client_id
GOOGLE_CLIENT_SECRET=your_google_client_secret
GOOGLE_REDIRECT_URI=http://localhost:3000/api/auth/google/callback

# Facebook OAuth Configuration (Optional)
FACEBOOK_APP_ID=your_facebook_app_id
FACEBOOK_APP_SECRET=your_facebook_app_secret
FACEBOOK_REDIRECT_URI=http://localhost:3000/api/auth/facebook/callback
```

## Quick Start

1. Install dependencies: `npm install`
2. Set up database: Run `database/schema.sql` in MySQL
3. Configure `.env` file with your credentials
4. Start server: `npm run dev` (development) or `npm start` (production)

## API Endpoints

### Authentication Routes (`/api/auth`)

- `POST /send-registration-otp` - Send OTP for registration
- `POST /verify-registration-otp` - Verify OTP and create account
- `POST /resend-registration-otp` - Resend registration OTP
- `POST /login` - User login
- `POST /forgot-password` - Send password reset OTP
- `POST /verify-reset-otp` - Verify password reset OTP
- `POST /reset-password` - Reset password with verified OTP
- `POST /resend-otp` - Resend password reset OTP
- `POST /logout` - Logout user
- `GET /google` - Initiate Google OAuth
- `GET /google/callback` - Google OAuth callback
- `GET /facebook` - Initiate Facebook OAuth
- `GET /facebook/callback` - Facebook OAuth callback

## Security Features

- ✅ Password hashing with bcrypt (12 rounds)
- ✅ JWT token authentication
- ✅ HTTP-only secure cookies
- ✅ Rate limiting on all endpoints
- ✅ Brute-force protection
- ✅ Input validation and sanitization
- ✅ SQL injection protection (parameterized queries)
- ✅ XSS protection
- ✅ CSRF protection (SameSite cookies)
- ✅ Strong password requirements enforced

## Database Schema

See `database/schema.sql` for complete schema. Main tables:
- `users` - User accounts
- `otp_verification` - OTP codes for email verification and password reset
- `sessions` - Session management (optional)
- `failed_login_attempts` - Brute-force protection tracking

