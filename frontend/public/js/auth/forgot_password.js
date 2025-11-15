// API Base URL
const API_BASE_URL = window.API_BASE_URL || 'http://localhost:3000';

document.getElementById('forgotForm').addEventListener('submit', async (e) => {
  e.preventDefault();

  const email = document.getElementById('email').value.trim();

  // Validate email
  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    alert('Please enter a valid email address');
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
      
      alert(result.message || 'If an account exists with this email, an OTP has been sent.');
      // Redirect to OTP verification page
      window.location.href = 'verify-otp.html';
    } else {
      alert(result.message || 'Failed to send OTP. Please try again.');
    }
  } catch (error) {
    console.error('Error:', error);
    alert('Network error. Please try again.');
  } finally {
    submitBtn.disabled = false;
    submitBtn.textContent = 'Next';
  }
});

