document.addEventListener('DOMContentLoaded', function() {
  // === DOM Elements ===
  const otpForm = document.getElementById('otpForm');
  const otpInput = document.getElementById('otp');
  const resendBtn = document.getElementById('resendBtn');
  const resendTimer = document.getElementById('resendTimer');
  const emailDisplay = document.getElementById('emailDisplay');
  const errorMessage = document.getElementById('errorMessage');
  const successMessage = document.getElementById('successMessage');
  const backLink = document.getElementById('backLink');
  const pageTitle = document.getElementById('pageTitle');
  const pageSubtitle = document.getElementById('pageSubtitle');

  // === Helper Functions ===
  function showError(message) {
    errorMessage.textContent = message;
    errorMessage.style.display = 'block';
    successMessage.style.display = 'none';
    setTimeout(() => {
      errorMessage.style.display = 'none';
    }, 5000);
  }

  function showSuccess(message) {
    successMessage.textContent = message;
    successMessage.style.display = 'block';
    errorMessage.style.display = 'none';
  }

  function startResendTimer() {
    resendBtn.disabled = true;
    let seconds = 60;
    resendTimer.textContent = `Resend in ${seconds}s`;
    resendTimer.style.display = 'block';
    
    const interval = setInterval(() => {
      seconds--;
      resendTimer.textContent = `Resend in ${seconds}s`;
      if (seconds <= 0) {
        clearInterval(interval);
        resendBtn.disabled = false;
        resendTimer.style.display = 'none';
      }
    }, 1000);
  }

  // === Get OTP Data from Session Storage ===
  const otpDataString = sessionStorage.getItem('otpData');
  
  if (!otpDataString) {
    showError('Your session has expired. Please start again.');
    otpForm.querySelector('button[type="submit"]').disabled = true;
    return;
  }

  const otpData = JSON.parse(otpDataString);
  const { email, username, password, type } = otpData;

  // Validate required data
  if (!email || !type) {
    showError('Invalid session data. Please start again.');
    otpForm.querySelector('button[type="submit"]').disabled = true;
    return;
  }

  // === Set Dynamic Content Based on Flow Type ===
  // Set page title and subtitle
  if (pageTitle) pageTitle.textContent = config.title;
  if (pageSubtitle) pageSubtitle.textContent = config.subtitle;
  
  // Set email display
  emailDisplay.textContent = `Code sent to ${email}`;

  // Set back link
  if (backLink) backLink.href = config.backUrl;

  // === Flow Configuration ===
  const flowConfig = {
    register: {
      title: 'Verify Your Email',
      subtitle: 'Enter the OTP sent to your email address',
      verifyEndpoint: '/api/auth/verify-registration-otp',
      resendEndpoint: '/api/auth/resend-registration-otp',
      successMessage: 'Email verified! Completing registration...',
      redirectUrl: '../Account-created/account-created.html',
      backUrl: '../Register/register.html',
      saveToken: true
    },
    forgot: {
      title: 'Verify OTP',
      subtitle: 'Enter the OTP sent to reset your password',
      verifyEndpoint: '/api/auth/verify-otp',
      resendEndpoint: '/api/auth/resend-otp',
      successMessage: 'OTP verified! Redirecting to set new password...',
      redirectUrl: '../New-password/new-password.html',
      backUrl: '../Forgot-password/forgot-password.html',
      saveToken: false
    }
  };

  const config = flowConfig[type];

  if (!config) {
    showError('Invalid flow type. Please start again.');
    return;
  }

  // === Handle OTP Form Submission ===
  otpForm.addEventListener('submit', async (e) => {
    e.preventDefault();

    const otp = otpInput.value.trim();

    if (otp.length !== 6) {
      showError('Please enter a valid 6-digit OTP');
      return;
    }

    // Build request body based on flow type
    const requestBody = {
      email,
      otp
    };

    // Add username and password only for registration
    if (type === 'register') {
      requestBody.username = username;
      requestBody.password = password;
    }

    try {
      console.log(`Sending OTP verification to: ${config.verifyEndpoint}`);
      console.log('Request body:', requestBody);

      const response = await fetch(`http://localhost:5000${config.verifyEndpoint}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(requestBody)
      });

      console.log('Response status:', response.status);
      const result = await response.json();
      console.log('Response data:', result);

      if (response.ok) {
        showSuccess(config.successMessage);

        // Save token and user data if applicable (registration flow)
        if (config.saveToken && result.token) {
          localStorage.setItem('token', result.token);
          if (result.user) {
            localStorage.setItem('user', JSON.stringify(result.user));
          }
        }

        // Clear session storage
        sessionStorage.removeItem('otpData');

        // Redirect after a short delay
        setTimeout(() => {
          window.location.href = config.redirectUrl;
        }, 1500);
      } else {
        showError(result.message || 'Invalid OTP. Please try again.');
      }
    } catch (error) {
      console.error('Error verifying OTP:', error);
      showError('Network error. Please check console for details.');
    }
  });

  // === Handle Resend OTP ===
  resendBtn.addEventListener('click', async (e) => {
    e.preventDefault();

    try {
      const response = await fetch(`http://localhost:5000${config.resendEndpoint}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email })
      });

      const result = await response.json();

      if (response.ok) {
        showSuccess('OTP resent to your email');
        startResendTimer();
      } else {
        showError(result.message || 'Failed to resend OTP');
      }
    } catch (error) {
      console.error('Error resending OTP:', error);
      showError('Network error. Please try again.');
    }
  });
});