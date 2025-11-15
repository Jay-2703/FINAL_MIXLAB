// API Base URL - can be configured via environment or use default
const API_BASE_URL = window.API_BASE_URL || 'http://localhost:3000';

// Helper function to show inline error messages
function showError(fieldId, message) {
  const field = document.getElementById(fieldId);
  const errorElement = document.getElementById(`${fieldId}-error`) || createErrorElement(fieldId);
  errorElement.textContent = message;
  errorElement.style.display = 'block';
  field.classList.add('error');
}

function hideError(fieldId) {
  const field = document.getElementById(fieldId);
  const errorElement = document.getElementById(`${fieldId}-error`);
  if (errorElement) {
    errorElement.style.display = 'none';
  }
  field.classList.remove('error');
}

function createErrorElement(fieldId) {
  const field = document.getElementById(fieldId);
  const errorElement = document.createElement('small');
  errorElement.id = `${fieldId}-error`;
  errorElement.className = 'error-message';
  errorElement.style.display = 'none';
  errorElement.style.color = '#e74c3c';
  field.parentNode.appendChild(errorElement);
  return errorElement;
}

// Password strength validation
function validatePasswordStrength(password) {
  const errors = [];
  
  if (password.length < 8) {
    errors.push('Password must be at least 8 characters long');
  }
  if (!/[A-Z]/.test(password)) {
    errors.push('Password must contain at least one uppercase letter');
  }
  if (!/[a-z]/.test(password)) {
    errors.push('Password must contain at least one lowercase letter');
  }
  if (!/[0-9]/.test(password)) {
    errors.push('Password must contain at least one number');
  }
  if (!/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password)) {
    errors.push('Password must contain at least one special character');
  }
  
  return errors;
}

document.getElementById('registerForm').addEventListener('submit', async (e) => {
  e.preventDefault();

  // Clear previous errors
  ['username', 'first', 'last', 'email', 'birthday', 'contact_number', 'password', 'confirm-password'].forEach(id => {
    hideError(id);
  });

  // Get form values
  const username = document.getElementById('username').value.trim();
  const first_name = document.getElementById('first').value.trim();
  const last_name = document.getElementById('last').value.trim();
  const email = document.getElementById('email').value.trim();
  const homeAddress = document.getElementById('home-address') ? document.getElementById('home-address').value.trim() : '';
  const password = document.getElementById('password').value;
  const confirmPassword = document.getElementById('confirm-password').value;
  const contact_number = document.getElementById('contact_number').value.trim();
  const birthday = document.getElementById('birthday').value;

  // Validation
  let hasErrors = false;

  if (!username || username.length < 3) {
    showError('username', 'Username must be at least 3 characters long');
    hasErrors = true;
  }

  if (!first_name) {
    showError('first', 'First name is required');
    hasErrors = true;
  }

  if (!last_name) {
    showError('last', 'Last name is required');
    hasErrors = true;
  }

  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    showError('email', 'Please enter a valid email address');
    hasErrors = true;
  }

  if (!birthday) {
    showError('birthday', 'Birthday is required');
    hasErrors = true;
  }

  if (!contact_number) {
    showError('contact_number', 'Contact number is required');
    hasErrors = true;
  }

  // Password validation
  const passwordErrors = validatePasswordStrength(password);
  if (passwordErrors.length > 0) {
    showError('password', passwordErrors[0]);
    hasErrors = true;
  }

  if (password !== confirmPassword) {
    showError('confirm-password', 'Passwords do not match');
    hasErrors = true;
  }

  if (hasErrors) {
    return;
  }

  // Disable submit button
  const submitBtn = e.target.querySelector('button[type="submit"]');
  submitBtn.disabled = true;
  submitBtn.textContent = 'Sending OTP...';

  try {
    // Send registration request to generate OTP
    const res = await fetch(`${API_BASE_URL}/api/auth/send-registration-otp`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, email })
    });

    const result = await res.json();

    if (res.ok) {
      // Store registration data for verification (password will be sent during OTP verification)
      const otpData = {
        email,
        username,
        password, // Will be hashed on backend
        first_name,
        last_name,
        contact_number,
        home_address: homeAddress,
        birthday,
        type: 'register'
      };
      
      sessionStorage.setItem('otpData', JSON.stringify(otpData));

      // Redirect to OTP verification page
      window.location.href = 'verify-otp.html';
    } else {
      // Show error message
      const errorMsg = result.errors ? result.errors.map(e => e.message).join(', ') : result.message;
      alert(errorMsg || 'Registration failed. Please try again.');
    }
  } catch (error) {
    console.error('Error:', error);
    alert('Network error. Please try again.');
  } finally {
    submitBtn.disabled = false;
    submitBtn.textContent = 'Register';
  }
});

// Handle Google Sign In
document.getElementById('googleSignInBtn')?.addEventListener('click', function() {
  window.location.href = `${API_BASE_URL}/api/auth/google`;
});

// Handle Facebook Sign In
document.querySelector('.social-btn.facebook')?.addEventListener('click', function() {
  window.location.href = `${API_BASE_URL}/api/auth/facebook`;
});
