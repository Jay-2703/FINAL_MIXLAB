// API Base URL
const API_BASE_URL = window.API_BASE_URL || 'http://localhost:3000';

// ============================================================================
// USER DATA HANDLER - Merge temp registration data with actual user data
// ============================================================================
function handleUserDataAfterLogin(userData) {
  try {
    // Check if there's temporary user data from registration
    const tempUserDataJson = localStorage.getItem('tempUserData');
    
    if (tempUserDataJson) {
      const tempUserData = JSON.parse(tempUserDataJson);
      
      // Merge temp data with actual user data (server data takes priority)
      const mergedUserData = {
        ...tempUserData,  // Registration data (fallback)
        ...userData       // Server data (priority)
      };
      
      // Save merged data
      localStorage.setItem('user', JSON.stringify(mergedUserData));
      
      // Clean up temp data
      localStorage.removeItem('tempUserData');
      
      console.log('User data merged successfully');
    } else {
      // No temp data, just save the user data from server
      localStorage.setItem('user', JSON.stringify(userData));
    }
  } catch (err) {
    console.error('Error handling user data:', err);
    // Fallback: just save the server data
    localStorage.setItem('user', JSON.stringify(userData));
  }
}

/* ---------------------------------------------------
   SHOW MESSAGE HELPERS (Using your CSS classes)
--------------------------------------------------- */
function showLoginError(message) {
  const formWrapper = document.querySelector('.login-card');
  if (!formWrapper) return;

  formWrapper.querySelector('.error-message')?.remove();
  formWrapper.querySelector('.success-message')?.remove();

  const div = document.createElement('div');
  div.className = 'error-message';
  div.textContent = message;

  const form = document.getElementById('loginForm');
  form.insertBefore(div, form.firstChild);
}

function showLoginSuccess(message) {
  const formWrapper = document.querySelector('.login-card');
  if (!formWrapper) return;

  formWrapper.querySelector('.success-message')?.remove();
  formWrapper.querySelector('.error-message')?.remove();

  const div = document.createElement('div');
  div.className = 'success-message';
  div.textContent = message;

  const form = document.getElementById('loginForm');
  form.insertBefore(div, form.firstChild);
}

/* ---------------------------------------------------
   TOGGLE PASSWORD
--------------------------------------------------- */
document.getElementById('togglePassword')?.addEventListener('click', function () {
  const passwordInput = document.getElementById('password');
  const eyeIcon = document.getElementById('eyeIcon');
  const isPassword = passwordInput.type === 'password';

  passwordInput.type = isPassword ? 'text' : 'password';

  if (isPassword) {
    // OPEN eye
    eyeIcon.innerHTML = `
      <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path>
      <circle cx="12" cy="12" r="3"></circle>
    `;
  } else {
    // EYE with slash
    eyeIcon.innerHTML = `
      <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"></path>
      <line x1="1" y1="1" x2="23" y2="23"></line>
    `;
  }
});

/* ---------------------------------------------------
   HANDLE OAUTH REDIRECT
--------------------------------------------------- */
const urlParams = new URLSearchParams(window.location.search);
const oauthToken = urlParams.get('token');
const oauthUser = urlParams.get('user');
const oauthProvider = urlParams.get('oauth');

if (oauthToken) {
  localStorage.setItem('token', oauthToken);
  
  // Handle OAuth user data if provided
  if (oauthUser) {
    try {
      const userData = JSON.parse(decodeURIComponent(oauthUser));
      handleUserDataAfterLogin(userData);
    } catch (err) {
      console.error('Error parsing OAuth user data:', err);
    }
  } else {
    // If backend only returned a token, decode payload to get user info
    try {
      const parts = oauthToken.split('.');
      if (parts.length === 3) {
        const payload = parts[1];
        // Add padding if necessary
        const pad = payload.length % 4;
        const padded = pad ? payload + '='.repeat(4 - pad) : payload;
        const json = decodeURIComponent(Array.prototype.map.call(atob(padded), function(c) {
          return '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2);
        }).join(''));
        const decoded = JSON.parse(json);
        // expected fields: id, username, email, role
        // Build a friendly display name. Prefer explicit first_name/last_name,
        // otherwise use username or local-part of email.
        const firstName = decoded.first_name || null;
        const lastName = decoded.last_name || null;
        let displayName = null;
        if (firstName) displayName = lastName ? `${firstName} ${lastName}` : firstName;
        if (!displayName) {
          if (decoded.username) displayName = decoded.username;
          else if (decoded.email) displayName = decoded.email.split('@')[0];
        }

        const userData = {
          id: decoded.id,
          username: decoded.username || decoded.email.split('@')[0],
          name: displayName,
          first_name: firstName,
          last_name: lastName,
          email: decoded.email,
          role: decoded.role
        };
        handleUserDataAfterLogin(userData);
      }
    } catch (err) {
      console.error('Failed to decode OAuth token payload:', err);
    }
  }

  // Redirect to landing page (frontend will read `localStorage.user`)
  window.location.href = '/landing.html';
}

/* ---------------------------------------------------
   LOGIN FORM SUBMIT
--------------------------------------------------- */
document.getElementById('loginForm').addEventListener('submit', async (e) => {
  e.preventDefault();

  const username = document.getElementById('username').value.trim();
  const password = document.getElementById('password').value;

  // Basic validation
  if (!username || !password) {
    showLoginError('Please enter both username and password');
    return;
  }

  // Disable submit button
  const submitBtn = e.target.querySelector('button[type="submit"]');
  const originalText = submitBtn.textContent;
  submitBtn.disabled = true;
  submitBtn.textContent = 'Logging in...';

  try {
    const res = await fetch(`${API_BASE_URL}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ username, password })
    });

    const result = await res.json();

    if (res.ok) {
      // Save token
      if (result.token) localStorage.setItem('token', result.token);
      
      // CRITICAL: Use handleUserDataAfterLogin to merge temp data with actual user data
      if (result.user) {
        handleUserDataAfterLogin(result.user);
      }

      // Show success message
      showLoginSuccess('Login successful! Redirecting...');

      // If pending booking exists
      try {
        const pending = sessionStorage.getItem('pendingBooking');
        if (pending) {
          setTimeout(() => {
            window.location.href = '/frontend/views/user/booking.html';
          }, 600);
          return;
        }
      } catch (err) {}

      // Default redirect
      setTimeout(() => {
        window.location.href = '/frontend/public/landing.html';
      }, 600);

    } else {
      showLoginError(result.message || 'Login failed. Please try again.');
      submitBtn.disabled = false;
      submitBtn.textContent = originalText;
    }

  } catch (error) {
    console.error('Error:', error);
    showLoginError('Network error. Please try again.');
    submitBtn.disabled = false;
    submitBtn.textContent = originalText;
  }
});

/* ---------------------------------------------------
   SOCIAL LOGIN
--------------------------------------------------- */
document.querySelector('.social-btn.google')?.addEventListener('click', function () {
  window.location.href = `${API_BASE_URL}/api/auth/google`;
});

document.querySelector('.social-btn.facebook')?.addEventListener('click', function () {
  window.location.href = `${API_BASE_URL}/api/auth/facebook`;
});