document.addEventListener('DOMContentLoaded', function() {
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

  function showError(msg) {
    errorMessage.textContent = msg;
    errorMessage.style.display = 'block';
    successMessage.style.display = 'none';
    setTimeout(() => { errorMessage.style.display = 'none'; }, 5000);
  }

  function showSuccess(msg) {
    successMessage.textContent = msg;
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

  const otpDataString = sessionStorage.getItem('otpData');
  if (!otpDataString) {
    showError('Your session has expired. Please start again.');
    otpForm.querySelector('button[type="submit"]').disabled = true;
    return;
  }

  const otpData = JSON.parse(otpDataString);
  const { email, username, password, first_name, last_name, contact, home_address, birthday, type } = otpData;

  if (!email || !type) {
    showError('Invalid session data. Please start again.');
    otpForm.querySelector('button[type="submit"]').disabled = true;
    return;
  }

  emailDisplay.textContent = `Code sent to ${email}`;

  const flowConfig = {
    register: {
      title: 'Verify Your Email',
      subtitle: 'Enter the OTP sent to your email address',
      verifyEndpoint: '/api/auth/verify-registration-otp',
      resendEndpoint: '/api/auth/resend-registration-otp',
      successMessage: 'Email verified! Completing registration...',
      redirectUrl: 'account-created.html',
      backUrl: 'register.html',
      saveToken: true
    },
    forgot: {
      title: 'Verify OTP',
      subtitle: 'Enter the OTP sent to reset your password',
      verifyEndpoint: '/api/auth/verify-reset-otp',
      resendEndpoint: '/api/auth/resend-otp',
      successMessage: 'OTP verified! Redirecting to set new password...',
      redirectUrl: 'reset_password.html',
      backUrl: 'forgot_password.html',
      saveToken: false
    }
  };

  const config = flowConfig[type];
  if (!config) {
    showError('Invalid flow type. Please start again.');
    return;
  }

  if (pageTitle) pageTitle.textContent = config.title;
  if (pageSubtitle) pageSubtitle.textContent = config.subtitle;
  if (backLink) backLink.href = config.backUrl;

  otpForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const otp = otpInput.value.trim();
    if (otp.length !== 6) { showError('Please enter a valid 6-digit OTP'); return; }

    let requestBody;
    
    if (type === 'register') {
      requestBody = {
        email,
        otp,
        username,
        password,
        first_name,
        contact,
      };

      // Add optional fields ONLY if user entered them
      if (last_name && last_name.trim() !== "") requestBody.last_name = last_name;
      if (birthday && birthday.trim() !== "") requestBody.birthday = birthday;
      if (home_address && home_address.trim() !== "") requestBody.home_address = home_address;
  
    } else {
      requestBody = { email, otp };
    }

    try {
      const API_BASE_URL = window.API_BASE_URL || 'http://localhost:3000';
      const response = await fetch(`${API_BASE_URL}${config.verifyEndpoint}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(requestBody)
      });

      const result = await response.json();

      if (response.ok) {
        showSuccess(config.successMessage);
        
        if (config.saveToken && result.token) {
          // Registration flow - save token and handle user data
          localStorage.setItem('token', result.token);
          
          // CRITICAL: Use handleUserDataAfterLogin to merge temp data with actual user data
          if (result.user) {
            handleUserDataAfterLogin(result.user);
          }
          
          sessionStorage.removeItem('otpData');
        } else if (type === 'forgot') {
          // Forgot password flow - save email and reset token for reset password page
          // Backend returns a short-lived resetToken which must be used to reset password
          sessionStorage.setItem('otpData', JSON.stringify({
            email: email,
            type: 'reset',
            resetToken: result.resetToken || null
          }));
        }
        
        setTimeout(() => { window.location.href = config.redirectUrl; }, 1500);
      } else {
        const errorText = result.errors ? result.errors.map(e => e.msg || e.message).join(', ') : result.message;
        showError(errorText || 'Invalid OTP. Please try again.');
      }
    } catch (err) {
      console.error('OTP verify error:', err);
      showError('Network error. Please check console.');
    }
  });

  resendBtn.addEventListener('click', async (e) => {
    e.preventDefault();
    try {
      const API_BASE_URL = window.API_BASE_URL || 'http://localhost:3000';
      const response = await fetch(`${API_BASE_URL}${config.resendEndpoint}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email })
      });
      const result = await response.json();
      if (response.ok) { showSuccess('OTP resent to your email'); startResendTimer(); }
      else showError(result.message || 'Failed to resend OTP');
    } catch (err) {
      console.error('Resend OTP error:', err);
      showError('Network error. Please try again.');
    }
  });
});