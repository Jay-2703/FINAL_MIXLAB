const API_BASE_URL = window.API_BASE_URL || 'http://localhost:3000';

// Password toggle functionality
document.getElementById('togglePassword').addEventListener('click', function() {
  const passwordInput = document.getElementById('new-password');
  const eyeIcon = document.getElementById('eyeIconPassword');
  
  if (passwordInput.type === 'password') {
    passwordInput.type = 'text';
    eyeIcon.innerHTML = '<path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path><circle cx="12" cy="12" r="3"></circle>';
  } else {
    passwordInput.type = 'password';
    eyeIcon.innerHTML = '<path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"></path><line x1="1" y1="1" x2="23" y2="23"></line>';
  }
});

document.getElementById('toggleConfirmPassword').addEventListener('click', function() {
  const confirmPasswordInput = document.getElementById('confirm-password');
  const eyeIconConfirm = document.getElementById('eyeIconConfirm');
  
  if (confirmPasswordInput.type === 'password') {
    confirmPasswordInput.type = 'text';
    eyeIconConfirm.innerHTML = '<path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path><circle cx="12" cy="12" r="3"></circle>';
  } else {
    confirmPasswordInput.type = 'password';
    eyeIconConfirm.innerHTML = '<path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"></path><line x1="1" y1="1" x2="23" y2="23"></line>';
  }
});

// Helper function to show inline error messages
function showError(fieldId, message) {
  const group = document.getElementById(`${fieldId}-group`);
  const errorElement = document.getElementById(`${fieldId}-error`);
  
  if (errorElement) {
    errorElement.textContent = message;
    errorElement.style.display = 'block';
  }
  
  if (group) {
    group.classList.add('error');
  }
}

function hideError(fieldId) {
  const group = document.getElementById(`${fieldId}-group`);
  const errorElement = document.getElementById(`${fieldId}-error`);
  
  if (errorElement) {
    errorElement.style.display = 'none';
  }
  
  if (group) {
    group.classList.remove('error');
  }
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

// Show success message
// Show success message inside the container
function showSuccess(message) {
  const formWrapper = document.querySelector('.reset-password-card');

  // Remove previous success messages (clean UI)
  const existing = formWrapper.querySelector('.success-message');
  if (existing) existing.remove();

  // Create success message box
  const successDiv = document.createElement('div');
  successDiv.className = 'success-message';
  successDiv.textContent = message;

  // Insert at the top of the form container
  const form = document.getElementById('resetForm');
  form.insertBefore(successDiv, form.firstChild);
}


document.getElementById('resetForm').addEventListener('submit', async (e) => {
  e.preventDefault();

  // Clear previous errors
  hideError('new-password');
  hideError('confirm-password');

  const newPassword = document.getElementById('new-password').value;
  const confirmPassword = document.getElementById('confirm-password').value;
  
  // Get data from session storage
  const otpDataString = sessionStorage.getItem('otpData');
  
  console.log('Session Storage Check:', {
    hasOtpData: !!otpDataString,
    otpDataString: otpDataString
  });
  
  if (!otpDataString) {
    showError('new-password', 'Session expired. Please start over from forgot password page.');
    setTimeout(() => {
      window.location.href = 'forgot_password.html';
    }, 3000);
    return;
  }

  let otpData;
  try {
    otpData = JSON.parse(otpDataString);
  } catch (error) {
    console.error('Failed to parse otpData:', error);
    showError('new-password', 'Session data corrupted. Please start over.');
    setTimeout(() => {
      window.location.href = 'forgot_password.html';
    }, 3000);
    return;
  }
  
  const { email, resetToken } = otpData;

  console.log('OTP Data parsed:', { 
    email
  });

  if (!email) {
    showError('new-password', 'Missing email. Please verify OTP again.');
    console.error('Missing email field');
    setTimeout(() => {
      window.location.href = 'verify-otp.html';
    }, 3000);
    return;
  }

  // Validate passwords match
  if (newPassword !== confirmPassword) {
    showError('confirm-password', 'Passwords do not match');
    return;
  }

  // Validate password strength
  const passwordErrors = validatePasswordStrength(newPassword);
  if (passwordErrors.length > 0) {
    showError('new-password', passwordErrors[0]);
    return;
  }

  // Disable submit button
  const submitBtn = e.target.querySelector('button[type="submit"]');
  const originalText = submitBtn.textContent;
  submitBtn.disabled = true;
  submitBtn.textContent = 'Resetting Password...';

  try {
    const res = await fetch(`${API_BASE_URL}/api/auth/reset-password`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, newPassword, resetToken })
    });

    const result = await res.json();
    console.log('Reset password response:', result);

    if (res.ok) {
      // Clear temporary data
      sessionStorage.removeItem('otpData');
      
      // Show success message
      showSuccess('Password reset successfully! Redirecting to login...');
      
      // Redirect to login page after 2 seconds
      setTimeout(() => {
        window.location.href = 'login.html';
      }, 2000);
    } else {
      // Show validation errors
      if (result.errors && Array.isArray(result.errors)) {
        // Show first error on new-password field
        showError('new-password', result.errors[0] || result.message);
      } else if (result.message) {
        showError('new-password', result.message);
      } else {
        showError('new-password', 'Failed to reset password. Please try again.');
      }
      
      submitBtn.disabled = false;
      submitBtn.textContent = originalText;
    }
  } catch (error) {
    console.error('Error:', error);
    showError('new-password', 'Network error. Please try again.');
    submitBtn.disabled = false;
    submitBtn.textContent = originalText;
  }
});