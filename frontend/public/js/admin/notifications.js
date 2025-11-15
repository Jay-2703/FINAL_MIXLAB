// Admin Notifications JavaScript
// Handles notification display, real-time updates, and management

const API_BASE_URL = window.API_BASE_URL || 'http://localhost:3000';
let socket = null;
let notifications = [];
let unreadCount = 0;

// Initialize notifications
async function initNotifications() {
  await loadNotifications();
  await loadUnreadCount();
  setupSocketConnection();
  setupNotificationUI();
}

// Load notifications from API
async function loadNotifications() {
  const token = localStorage.getItem('token');
  if (!token) return;

  try {
    const response = await fetch(`${API_BASE_URL}/api/admin/notifications?limit=50`, {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });

    if (response.ok) {
      const result = await response.json();
      notifications = result.data?.notifications || [];
      updateNotificationUI();
    }
  } catch (error) {
    console.error('Error loading notifications:', error);
  }
}

// Load unread count
async function loadUnreadCount() {
  const token = localStorage.getItem('token');
  if (!token) return;

  try {
    const response = await fetch(`${API_BASE_URL}/api/admin/notifications/unread-count`, {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });

    if (response.ok) {
      const result = await response.json();
      unreadCount = result.data?.unreadCount || 0;
      updateUnreadBadge();
    }
  } catch (error) {
    console.error('Error loading unread count:', error);
  }
}

// Setup Socket.IO connection for real-time notifications
function setupSocketConnection() {
  const token = localStorage.getItem('token');
  if (!token) return;

  // Import Socket.IO client (assuming it's loaded via CDN or bundled)
  if (typeof io === 'undefined') {
    console.warn('Socket.IO client not loaded');
    return;
  }

  socket = io(API_BASE_URL, {
    auth: {
      token: token
    },
    transports: ['websocket', 'polling']
  });

  socket.on('connect', () => {
    console.log('✅ Connected to notification server');
    // Join admin role room
    socket.emit('authenticate', token);
  });

  socket.on('notification', (notification) => {
    handleNewNotification(notification);
  });

  socket.on('admin_notification', (notification) => {
    handleNewNotification(notification);
  });

  socket.on('disconnect', () => {
    console.log('❌ Disconnected from notification server');
  });

  socket.on('error', (error) => {
    console.error('Socket error:', error);
  });
}

// Setup notification UI elements
function setupNotificationUI() {
  const bell = document.getElementById('notificationBell');
  const dropdown = document.getElementById('notificationDropdown');

  if (bell) {
    bell.addEventListener('click', (e) => {
      e.stopPropagation();
      toggleNotificationDropdown();
    });
  }

  // Close dropdown when clicking outside
  document.addEventListener('click', (e) => {
    if (dropdown && !dropdown.contains(e.target) && !bell?.contains(e.target)) {
      closeNotificationDropdown();
    }
  });
}

// Toggle notification dropdown
function toggleNotificationDropdown() {
  const dropdown = document.getElementById('notificationDropdown');
  if (dropdown) {
    dropdown.classList.toggle('active');
    if (dropdown.classList.contains('active')) {
      loadNotifications(); // Refresh when opening
    }
  }
}

// Close notification dropdown
function closeNotificationDropdown() {
  const dropdown = document.getElementById('notificationDropdown');
  if (dropdown) {
    dropdown.classList.remove('active');
  }
}

// Update notification UI
function updateNotificationUI() {
  const container = document.getElementById('notificationList');
  if (!container) return;

  if (notifications.length === 0) {
    container.innerHTML = '<div class="notification-empty">No notifications</div>';
    return;
  }

  container.innerHTML = notifications.slice(0, 10).map(notif => {
    const isRead = notif.is_read === 1 || notif.is_read === true;
    const date = new Date(notif.created_at);
    const timeAgo = getTimeAgo(date);
    const icon = getNotificationIcon(notif.type);

    return `
      <div class="notification-item ${isRead ? 'read' : 'unread'}" data-id="${notif.id}">
        <div class="notification-icon">${icon}</div>
        <div class="notification-content">
          <div class="notification-message">${notif.message}</div>
          <div class="notification-time">${timeAgo}</div>
        </div>
        ${!isRead ? '<div class="notification-dot"></div>' : ''}
      </div>
    `;
  }).join('');

  // Add click handlers
  container.querySelectorAll('.notification-item').forEach(item => {
    item.addEventListener('click', async () => {
      const id = item.dataset.id;
      await markAsRead(id);
      
      // Navigate if link exists
      const notif = notifications.find(n => n.id == id);
      if (notif && notif.link) {
        window.location.href = notif.link;
      }
    });
  });
}

// Update unread badge
function updateUnreadBadge() {
  const badge = document.getElementById('notificationBadge');
  if (badge) {
    if (unreadCount > 0) {
      badge.textContent = unreadCount > 99 ? '99+' : unreadCount;
      badge.style.display = 'flex';
    } else {
      badge.style.display = 'none';
    }
  }
}

// Mark notification as read
async function markAsRead(notificationId) {
  const token = localStorage.getItem('token');
  if (!token) return;

  try {
    const response = await fetch(`${API_BASE_URL}/api/admin/notifications/${notificationId}/read`, {
      method: 'PUT',
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });

    if (response.ok) {
      // Update local state
      const notif = notifications.find(n => n.id == notificationId);
      if (notif) {
        notif.is_read = 1;
        unreadCount = Math.max(0, unreadCount - 1);
        updateNotificationUI();
        updateUnreadBadge();
      }
    }
  } catch (error) {
    console.error('Error marking notification as read:', error);
  }
}

// Mark all as read
async function markAllAsRead() {
  const token = localStorage.getItem('token');
  if (!token) return;

  try {
    const response = await fetch(`${API_BASE_URL}/api/admin/notifications/read-all`, {
      method: 'PUT',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({})
    });

    if (response.ok) {
      notifications.forEach(n => n.is_read = 1);
      unreadCount = 0;
      updateNotificationUI();
      updateUnreadBadge();
    }
  } catch (error) {
    console.error('Error marking all as read:', error);
  }
}

// Get notification icon based on type
function getNotificationIcon(type) {
  const icons = {
    system: '🔔',
    user: '👤',
    appointment: '📅',
    gamification: '🏆',
    announcement: '📢'
  };
  return icons[type] || '🔔';
}

// Get time ago string
function getTimeAgo(date) {
  const now = new Date();
  const diff = now - date;
  const seconds = Math.floor(diff / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);

  if (days > 0) return `${days}d ago`;
  if (hours > 0) return `${hours}h ago`;
  if (minutes > 0) return `${minutes}m ago`;
  return 'Just now';
}

// Handle new notification
function handleNewNotification(notification) {
  console.log('📨 New notification received:', notification);
  
  // Add to notifications array
  notifications.unshift(notification);
  
  // Update UI
  updateNotificationUI();
  unreadCount++;
  updateUnreadBadge();
  
  // Show toast for urgent notifications
  if (notification.type === 'system' || notification.type === 'appointment') {
    showNotificationToast(notification);
  }
}

// Show notification toast
function showNotificationToast(notification) {
  const toast = document.createElement('div');
  toast.className = 'notification-toast';
  toast.innerHTML = `
    <div class="toast-icon">${getNotificationIcon(notification.type)}</div>
    <div class="toast-content">
      <div class="toast-message">${notification.message}</div>
    </div>
  `;

  document.body.appendChild(toast);

  // Animate in
  setTimeout(() => toast.classList.add('show'), 10);

  // Remove after 5 seconds
  setTimeout(() => {
    toast.classList.remove('show');
    setTimeout(() => toast.remove(), 300);
  }, 5000);
}

// Initialize on page load
document.addEventListener('DOMContentLoaded', () => {
  initNotifications();
  
  // Refresh notifications every 30 seconds
  setInterval(() => {
    loadNotifications();
    loadUnreadCount();
  }, 30000);
});

// Export functions for global access
window.markAllAsRead = markAllAsRead;

