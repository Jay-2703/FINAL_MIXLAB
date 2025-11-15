// Admin Common JavaScript
// Shared functionality for all admin pages

const API_BASE_URL = window.API_BASE_URL || 'http://localhost:3000';

// Get auth token
function getAuthToken() {
  return localStorage.getItem('token');
}

// Check if user is admin/instructor
async function checkAdminAuth() {
  const token = getAuthToken();
  if (!token) {
    window.location.href = '/frontend/views/auth/login.html';
    return false;
  }

  try {
    const response = await fetch(`${API_BASE_URL}/api/auth/me`, {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });

    if (!response.ok) {
      throw new Error('Unauthorized');
    }

    const result = await response.json();
    const user = result.data;

    if (user.role !== 'admin' && user.role !== 'instructor') {
      alert('Access denied. Admin or instructor privileges required.');
      window.location.href = '/frontend/public/landing.html';
      return false;
    }

    // Set user avatar
    const avatarEl = document.getElementById('userAvatar');
    if (avatarEl && user.first_name) {
      avatarEl.textContent = user.first_name.charAt(0).toUpperCase();
    }

    return true;
  } catch (error) {
    console.error('Auth check error:', error);
    window.location.href = '/frontend/views/auth/login.html';
    return false;
  }
}

// Logout functionality
function setupLogout() {
  const logoutBtn = document.getElementById('logoutBtn');
  if (logoutBtn) {
    logoutBtn.addEventListener('click', () => {
      if (confirm('Are you sure you want to logout?')) {
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        sessionStorage.clear();
        window.location.href = '/frontend/views/auth/login.html';
      }
    });
  }
}

// Format date
function formatDate(dateString) {
  const date = new Date(dateString);
  return date.toLocaleDateString('en-US', { 
    year: 'numeric', 
    month: 'short', 
    day: 'numeric' 
  });
}

// Format currency
function formatCurrency(amount) {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD'
  }).format(amount);
}

// Show toast notification
function showToast(message, type = 'info') {
  const toast = document.createElement('div');
  toast.className = `toast toast-${type}`;
  toast.textContent = message;
  toast.style.cssText = `
    position: fixed;
    top: 20px;
    right: 20px;
    background: var(--admin-bg-card);
    border: 1px solid var(--admin-border);
    border-left: 4px solid var(--admin-accent);
    color: var(--admin-text-primary);
    padding: 16px 24px;
    border-radius: 8px;
    box-shadow: 0 4px 20px rgba(0,0,0,0.3);
    z-index: 10000;
    animation: slideIn 0.3s ease;
  `;

  document.body.appendChild(toast);

  setTimeout(() => {
    toast.style.animation = 'slideOut 0.3s ease';
    setTimeout(() => toast.remove(), 300);
  }, 3000);
}

// Initialize on page load
document.addEventListener('DOMContentLoaded', async () => {
  const isAuth = await checkAdminAuth();
  if (isAuth) {
    setupLogout();
  }
});

// Add CSS animations
const style = document.createElement('style');
style.textContent = `
  @keyframes slideIn {
    from {
      transform: translateX(100%);
      opacity: 0;
    }
    to {
      transform: translateX(0);
      opacity: 1;
    }
  }
  @keyframes slideOut {
    from {
      transform: translateX(0);
      opacity: 1;
    }
    to {
      transform: translateX(100%);
      opacity: 0;
    }
  }
`;
document.head.appendChild(style);

