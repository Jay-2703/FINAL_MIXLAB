# Google OAuth Access Blocked - Troubleshooting Guide

## Common Reasons Google Blocks OAuth Access

### 1. **OAuth App Not Verified / In Testing Mode**

**Problem:** Google restricts unverified apps to testing mode, limiting access to test users only.

**Solution:**
1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Navigate to **APIs & Services** → **OAuth consent screen**
3. Check your app's publishing status:
   - **Testing Mode:** Only test users can access
   - **In Production:** Available to all users (requires verification)

**Fix Options:**
- **Option A:** Add test users
  - Go to **OAuth consent screen** → **Test users**
  - Click **+ ADD USERS**
  - Add your email addresses that need access
  - Test users can access immediately

- **Option B:** Publish your app (for production)
  - Complete OAuth consent screen configuration
  - Submit for verification (if requesting sensitive scopes)
  - Wait for Google's approval (can take days/weeks)

### 2. **Redirect URI Mismatch**

**Problem:** The redirect URI in your code doesn't match Google Cloud Console.

**Check Your Current Configuration:**
```javascript
// In backend/src/controllers/oauthController.js
const redirectUri = process.env.GOOGLE_REDIRECT_URI || 
  `${req.protocol}://${req.get('host')}/api/auth/google/callback`;
```

**Solution:**
1. Go to **APIs & Services** → **Credentials**
2. Click on your OAuth 2.0 Client ID
3. Under **Authorized redirect URIs**, ensure you have:
   - For development: `http://localhost:3000/api/auth/google/callback`
   - For production: `https://yourdomain.com/api/auth/google/callback`
4. **Important:** Must match EXACTLY (including http/https, port, trailing slashes)

### 3. **Missing or Incorrect Credentials**

**Problem:** Wrong Client ID or Client Secret in `.env` file.

**Solution:**
1. Check your `.env` file:
```env
GOOGLE_CLIENT_ID=your_google_client_id_here
GOOGLE_CLIENT_SECRET=your_google_client_secret_here
GOOGLE_REDIRECT_URI=http://localhost:3000/api/auth/google/callback
```

2. Verify in Google Cloud Console:
   - **APIs & Services** → **Credentials**
   - Copy the correct Client ID and Client Secret
   - Ensure they match your `.env` file

### 4. **OAuth Consent Screen Not Configured**

**Problem:** OAuth consent screen is incomplete.

**Solution:**
1. Go to **OAuth consent screen**
2. Complete all required fields:
   - **App name:** Your app name
   - **User support email:** Your email
   - **Developer contact information:** Your email
   - **Scopes:** `profile`, `email` (already in code)
3. Save and continue

### 5. **Rate Limiting / Quota Exceeded**

**Problem:** Too many OAuth requests in a short time.

**Solution:**
- Wait a few minutes and try again
- Check **APIs & Services** → **Quotas** for limits
- Consider implementing request throttling

### 6. **Security Restrictions**

**Problem:** Google detected suspicious activity or security issues.

**Solution:**
- Check your Google account security settings
- Review any security alerts in your Google account
- Ensure your app follows Google's OAuth policies

## Quick Fix Checklist

- [ ] **OAuth consent screen is configured** (App name, email, scopes)
- [ ] **Redirect URI matches exactly** in Google Cloud Console
- [ ] **Client ID and Secret are correct** in `.env` file
- [ ] **App is in Testing mode** with test users added, OR **App is published**
- [ ] **Scopes are correct:** `profile email` (already in code)
- [ ] **No rate limiting** - wait if needed
- [ ] **Check browser console** for specific error messages

## Step-by-Step Setup (If Starting Fresh)

### 1. Create OAuth Credentials
1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select existing
3. Enable **Google+ API** (if needed)
4. Go to **APIs & Services** → **Credentials**
5. Click **+ CREATE CREDENTIALS** → **OAuth client ID**
6. Choose **Web application**
7. Add authorized redirect URI: `http://localhost:3000/api/auth/google/callback`
8. Copy Client ID and Client Secret

### 2. Configure OAuth Consent Screen
1. Go to **OAuth consent screen**
2. Choose **External** (unless you have Google Workspace)
3. Fill required fields:
   - App name: "MixLab Studio"
   - User support email: your email
   - Developer contact: your email
4. Add scopes: `profile`, `email`
5. Add test users (if in testing mode)
6. Save

### 3. Update Your .env File
```env
GOOGLE_CLIENT_ID=your_client_id_from_step_1
GOOGLE_CLIENT_SECRET=your_client_secret_from_step_1
GOOGLE_REDIRECT_URI=http://localhost:3000/api/auth/google/callback
```

### 4. Test
1. Restart your backend server
2. Try logging in with Google
3. Check browser console for errors
4. Check backend logs for OAuth errors

## Common Error Messages

### "Error 400: redirect_uri_mismatch"
- **Fix:** Ensure redirect URI in code matches Google Cloud Console exactly

### "Error 403: access_denied"
- **Fix:** App is in testing mode - add your email as a test user

### "Error 401: invalid_client"
- **Fix:** Check Client ID and Secret in `.env` file

### "This app isn't verified"
- **Fix:** Add yourself as a test user, or submit for verification

## Production Deployment

For production, you need to:
1. **Publish your app** in OAuth consent screen
2. **Submit for verification** (if using sensitive scopes)
3. **Update redirect URI** to production domain:
   ```env
   GOOGLE_REDIRECT_URI=https://yourdomain.com/api/auth/google/callback
   ```
4. **Use HTTPS** (required for production OAuth)

## Still Having Issues?

1. **Check backend logs** for specific error messages
2. **Check browser console** for client-side errors
3. **Verify network requests** in browser DevTools → Network tab
4. **Test with Google's OAuth Playground** to verify credentials work

---

**Most Common Fix:** Add your email as a test user in OAuth consent screen if app is in testing mode!

