// API Base URL
const API_BASE_URL = window.API_BASE_URL || 'http://localhost:3000';

// Password visibility toggle functionality
function setupPasswordToggle(toggleBtnId, inputId, iconId) {
  const toggleBtn = document.getElementById(toggleBtnId);
  const passwordInput = document.getElementById(inputId);
  const eyeIcon = document.getElementById(iconId);

  if (toggleBtn && passwordInput && eyeIcon) {
    toggleBtn.addEventListener('click', function(e) {
      e.preventDefault();
      
      const isPassword = passwordInput.type === 'password';
      passwordInput.type = isPassword ? 'text' : 'password';
      
      if (isPassword) {
        eyeIcon.innerHTML = `
          <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path>
          <circle cx="12" cy="12" r="3"></circle>
        `;
      } else {
        eyeIcon.innerHTML = `
          <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"></path>
          <line x1="1" y1="1" x2="23" y2="23"></line>
        `;
      }
    });
  }
}

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
  if (errorElement) errorElement.style.display = 'none';
  field.classList.remove('error');
}

function createErrorElement(fieldId) {
  const field = document.getElementById(fieldId);
  const errorElement = document.createElement('small');
  errorElement.id = `${fieldId}-error`;
  errorElement.className = 'error-message';
  errorElement.style.cssText = 'color: #e74c3c; display: none; margin-top: 4px; font-size: 13px;';
  
  const wrapper = field.closest('.password-input-wrapper');
  if (wrapper) {
    wrapper.parentNode.insertBefore(errorElement, wrapper.nextSibling);
  } else {
    field.parentNode.appendChild(errorElement);
  }
  
  return errorElement;
}

// Show general error message at the top of the form
function showGeneralError(message) {
  const existingError = document.querySelector('.general-error');
  if (existingError) existingError.remove();

  const errorDiv = document.createElement('div');
  errorDiv.className = 'general-error';
  errorDiv.style.cssText = 'background-color: #fee; border: 1px solid #e74c3c; color: #e74c3c; padding: 12px; border-radius: 4px; margin-bottom: 16px;';
  errorDiv.textContent = message;

  const form = document.getElementById('registerForm');
  form.insertBefore(errorDiv, form.firstChild);

  setTimeout(() => errorDiv.remove(), 5000);
}

// Initialize password toggles when page loads
document.addEventListener('DOMContentLoaded', function() {
  setupPasswordToggle('togglePassword', 'password', 'eyeIconPassword');
  setupPasswordToggle('toggleConfirmPassword', 'confirm-password', 'eyeIconConfirm');
});

document.getElementById('registerForm').addEventListener('submit', async (e) => {
  e.preventDefault();

  // Clear previous errors
  ['username', 'first_name', 'last_name', 'email', 'birthday', 'contact', 'home_address', 'password', 'confirm-password']
    .forEach(id => hideError(id));

  const existingError = document.querySelector('.general-error');
  if (existingError) existingError.remove();

  // Get form values
  const username = document.getElementById('username').value.trim();
  const first_name = document.getElementById('first_name').value.trim();
  const last_name = document.getElementById('last_name').value.trim();
  const email = document.getElementById('email').value.trim();
  const birthday = document.getElementById('birthday').value;
  const contact = document.getElementById('contact').value.trim();
  const home_address = document.getElementById('home_address').value.trim();
  const password = document.getElementById('password').value;
  const confirmPassword = document.getElementById('confirm-password').value;

  let hasErrors = false;

  // SIMPLIFIED FRONTEND VALIDATION - Only basic UX checks
  // Backend will handle detailed validation (TLD, password strength, age, address format)

  // Basic required field checks
  if (!username) { 
    showError('username', 'Username is required'); 
    hasErrors = true; 
  }
  
  if (!first_name) { 
    showError('first_name', 'First name is required'); 
    hasErrors = true; 
  }

  // Basic email format check only
  if (!email) {
    showError('email', 'Email is required');
    hasErrors = true;
  } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    showError('email', 'Please enter a valid email address');
    hasErrors = true;
  }
  // Note: Email TLD validation removed - backend will handle this

  // Contact number basic check
  if (!contact) { 
    showError('contact', 'Contact number is required'); 
    hasErrors = true; 
  } else if (!/^[0-9]{10}$/.test(contact)) {
    showError('contact', 'Please enter a valid 10-digit Philippine mobile number (e.g., 9123456789)');
    hasErrors = true;
  }

  // Basic password checks only
  if (!password) {
    showError('password', 'Password is required');
    hasErrors = true;
  } else if (password.length < 8) {
    showError('password', 'Password must be at least 8 characters long');
    hasErrors = true;
  }
  // Note: Detailed password strength validation removed - backend will handle this

  // Password match check (frontend only)
  if (password !== confirmPassword) {
    showError('confirm-password', 'Passwords do not match');
    hasErrors = true;
  }

  // Note: Birthday age validation removed - backend will handle this
  // Note: Address format validation removed - backend will handle this

  if (hasErrors) return;

  // Disable button
  const submitBtn = e.target.querySelector('button[type="submit"]');
  const originalText = submitBtn.textContent;
  submitBtn.disabled = true;
  submitBtn.textContent = 'Sending OTP...';

  try {
    // Format contact number with Philippine country code
    const formattedContact = `+63${contact}`;
    
    // Prepare the data to send
    const registrationData = {
      username,
      email,
      password,
      first_name,
      last_name: last_name || null,
      birthday: birthday || null,
      contact: formattedContact,
      home_address: home_address || null
    };
    
    console.log('Sending registration data:', { ...registrationData, password: '***' });
    
    // Send registration data to backend to trigger OTP email
    const res = await fetch(`${API_BASE_URL}/api/auth/send-registration-otp`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(registrationData)
    });

    const result = await res.json();
    console.log('Server response:', result);

    if (res.ok) {
      // Store data for OTP verify
      const otpData = {
        type: 'register',
        username,
        email,
        password,
        first_name,
        last_name: last_name || null,
        birthday: birthday || null,
        contact: formattedContact,
        home_address: home_address || null
      };

      sessionStorage.setItem('otpData', JSON.stringify(otpData));

      // CRITICAL: Store user data temporarily for auto-fill after registration
      // This will be used by booking form to auto-fill user information
      const tempUserData = {
        username,
        email,
        first_name,
        last_name: last_name || null,
        birthday: birthday || null,
        contact: formattedContact,
        home_address: home_address || null,
        name: last_name ? `${first_name} ${last_name}` : first_name,
        fullname: last_name ? `${first_name} ${last_name}` : first_name
      };
      
      // Store temporarily (will be replaced with actual user data after login)
      localStorage.setItem('tempUserData', JSON.stringify(tempUserData));

      // Redirect to OTP
      window.location.href = 'verify-otp.html';
    } else {
      // Show specific error message from backend
      console.error('Registration failed:', result);
      
      if (result.message) {
        // Check if backend specified which field has the error
        if (result.field === 'username') {
          showError('username', result.message);
        } else if (result.field === 'email') {
          showError('email', result.message);
        } else if (result.field === 'birthday') {
          showError('birthday', result.message);
        } else if (result.field === 'contact') {
          showError('contact', result.message);
        } else if (result.field === 'home_address') {
          showError('home_address', result.message);
        } else if (result.field === 'password' || result.message.toLowerCase().includes('password')) {
          // Show password requirement errors from backend
          if (result.errors && Array.isArray(result.errors)) {
            showError('password', result.errors.join('. '));
          } else {
            showError('password', result.message);
          }
        } else if (result.errors && Array.isArray(result.errors)) {
          // Handle validation errors array
          const errorMessages = result.errors.map(err => {
            if (typeof err === 'object' && err.message) {
              return err.message;
            }
            return err;
          }).join('. ');
          showGeneralError(`${result.message}: ${errorMessages}`);
        } else {
          // Fallback: try to detect from message text
          const msg = result.message.toLowerCase();
          
          if (msg.includes('username')) {
            showError('username', result.message);
          } else if (msg.includes('email')) {
            showError('email', result.message);
          } else if (msg.includes('birthday') || msg.includes('age')) {
            showError('birthday', result.message);
          } else if (msg.includes('address')) {
            showError('home_address', result.message);
          } else {
            // General error - show at top
            showGeneralError(result.message);
          }
        }
      } else {
        showGeneralError('Registration failed. Please check your information and try again.');
      }
    }
  } catch (err) {
    console.error('Registration error:', err);
    showGeneralError('Network error. Please check your connection and try again.');
  } finally {
    submitBtn.disabled = false;
    submitBtn.textContent = originalText;
  }
});

// Google Sign In
document.getElementById('googleSignInBtn')?.addEventListener('click', () => {
  window.location.href = `${API_BASE_URL}/api/auth/google`;
});

// Facebook Sign In
document.querySelector('.social-btn.facebook')?.addEventListener('click', () => {
  window.location.href = `${API_BASE_URL}/api/auth/facebook`;
});