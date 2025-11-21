// API Base URL
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
  errorElement.style.marginTop = '5px';
  errorElement.style.fontSize = '14px';
  field.parentNode.appendChild(errorElement);
  return errorElement;
}

document.getElementById('forgotForm').addEventListener('submit', async (e) => {
  e.preventDefault();

  // Clear previous errors
  hideError('email');

  const email = document.getElementById('email').value.trim();

  // Validate email
  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    showError('email', 'Please enter a valid email address');
    return;
  }

  // Disable submit button
  const submitBtn = e.target.querySelector('button[type="submit"]');
  submitBtn.disabled = true;
  submitBtn.textContent = 'Sending...';

  try {
    const res = await fetch(`${API_BASE_URL}/api/auth/forgot-password`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email })
    });

    const result = await res.json();

    if (res.ok) {
      // Store OTP data for verification
      const otpData = {
        email,
        type: 'forgot'
      };
      sessionStorage.setItem('otpData', JSON.stringify(otpData));
      
      // Automatically redirect to OTP verification page (no alert needed)
      window.location.href = 'verify-otp.html';
    } else {
      // Email does not exist - show inline error
      showError('email', result.message || 'Email address not found. Please check and try again.');
    }
  } catch (error) {
    console.error('Error:', error);
    showError('email', 'Network error. Please try again.');
  } finally {
    submitBtn.disabled = false;
    submitBtn.textContent = 'Next';
  }
});