// API Base URL
const API_BASE_URL = window.API_BASE_URL || 'http://localhost:3000';

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

document.getElementById('resetForm').addEventListener('submit', async (e) => {
  e.preventDefault();

  const newPassword = document.getElementById('new-password').value;
  const confirmPassword = document.getElementById('confirm-password').value;
  
  // Get OTP data from session storage
  const otpDataString = sessionStorage.getItem('otpData');
  if (!otpDataString) {
    alert('Session expired. Please start over.');
    window.location.href = 'forgot_password.html';
    return;
  }

  const otpData = JSON.parse(otpDataString);
  const { email, otp } = otpData;

  if (!email || !otp) {
    alert('Session expired. Please start over.');
    window.location.href = 'forgot_password.html';
    return;
  }

  // Validate passwords
  if (newPassword !== confirmPassword) {
    alert('Passwords do not match!');
    return;
  }

  const passwordErrors = validatePasswordStrength(newPassword);
  if (passwordErrors.length > 0) {
    alert(passwordErrors[0]);
    return;
  }

  // Disable submit button
  const submitBtn = e.target.querySelector('button[type="submit"]');
  submitBtn.disabled = true;
  submitBtn.textContent = 'Resetting...';

  try {
    const res = await fetch(`${API_BASE_URL}/api/auth/reset-password`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, otp, newPassword })
    });

    const result = await res.json();

    if (res.ok) {
      // Clear temporary data
      sessionStorage.removeItem('otpData');
      
      alert(result.message || 'Password reset successfully. Please login with your new password.');
      // Redirect to login page
      window.location.href = 'login.html';
    } else {
      const errorMsg = result.errors ? result.errors.map(e => e.message).join(', ') : result.message;
      alert(errorMsg || 'Failed to reset password. Please try again.');
    }
  } catch (error) {
    console.error('Error:', error);
    alert('Network error. Please try again.');
  } finally {
    submitBtn.disabled = false;
    submitBtn.textContent = 'Reset';
  }
});

