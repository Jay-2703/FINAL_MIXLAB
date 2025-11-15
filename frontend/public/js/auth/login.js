// API Base URL
const API_BASE_URL = window.API_BASE_URL || 'http://localhost:3000';

// Check for OAuth token in URL (from OAuth callback)
const urlParams = new URLSearchParams(window.location.search);
const oauthToken = urlParams.get('token');
const oauthProvider = urlParams.get('oauth');

if (oauthToken) {
  // Save token from OAuth
  localStorage.setItem('token', oauthToken);
  // Redirect to landing page
  window.location.href = '/frontend/public/landing.html';
}

document.getElementById('loginForm').addEventListener('submit', async (e) => {
  e.preventDefault();

  const username = document.getElementById('username').value.trim();
  const password = document.getElementById('password').value;

  // Basic validation
  if (!username || !password) {
    alert('Please enter both username and password');
    return;
  }

  // Disable submit button
  const submitBtn = e.target.querySelector('button[type="submit"]');
  submitBtn.disabled = true;
  submitBtn.textContent = 'Logging in...';

  try {
    const res = await fetch(`${API_BASE_URL}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include', // Include cookies
      body: JSON.stringify({ username, password })
    });

    const result = await res.json();

    if (res.ok) {
      // Save token to localStorage
      if (result.token) {
        localStorage.setItem('token', result.token);
      }
      if (result.user) {
        localStorage.setItem('user', JSON.stringify(result.user));
      }

      // If there is a pending booking saved (user started booking before login), go to booking page
      try {
        const pending = sessionStorage.getItem('pendingBooking');
        if (pending) {
          // Redirect to booking page where the pending data will be prefilled
          window.location.href = '/frontend/views/user/booking.html';
          return;
        }
      } catch (err) {
        // ignore
      }

      // Default redirect after login
      window.location.href = '/frontend/public/landing.html';
    } else {
      alert(result.message || 'Login failed. Please try again.');
    }
  } catch (error) {
    console.error('Error:', error);
    alert('Network error. Please try again.');
  } finally {
    submitBtn.disabled = false;
    submitBtn.textContent = 'Login';
  }
});

// Handle Google Sign In
document.querySelector('.social-btn.google')?.addEventListener('click', function() {
  window.location.href = `${API_BASE_URL}/api/auth/google`;
});

// Handle Facebook Sign In
document.querySelector('.social-btn.facebook')?.addEventListener('click', function() {
  window.location.href = `${API_BASE_URL}/api/auth/facebook`;
});

