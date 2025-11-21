(function(){
  // Get user data
  const raw = localStorage.getItem('user');
  let user = null;
  try { user = raw ? JSON.parse(raw) : null; } catch(e) { user = null; }

  function getName(u){ 
    if(!u) return null; 
    return u.username || u.name || u.fullname || u.email || 'MixLab User'; 
  }

  const name = getName(user);
  const userNameEl = document.getElementById('userName');
  const emailEl = document.getElementById('email');
  const fullNameEl = document.getElementById('fullName');
  const usernameEl = document.getElementById('username');
  
  if(userNameEl) userNameEl.textContent = name;
  if(emailEl) emailEl.textContent = user && user.email ? user.email : 'user@mixlab.com';
  if(fullNameEl) fullNameEl.textContent = name;
  if(usernameEl) usernameEl.textContent = user && user.username ? user.username : 'mixlab_user';

  // Set avatar initial
  const avatarEl = document.getElementById('userAvatar');
  if(avatarEl && name) {
    avatarEl.textContent = name.charAt(0).toUpperCase();
  }

  // Load user progress and achievements from API
  loadUserProgress();
  loadUserAchievements();

  // Update points display
  function updatePointsDisplay(points) {
    const totalPointsEl = document.getElementById('totalPoints');
    if (totalPointsEl) {
      totalPointsEl.textContent = points?.total_points || 0;
    }
  }

  // Load user progress
  async function loadUserProgress() {
    const token = localStorage.getItem('token');
    if (!token) return;

    const API_BASE_URL = window.API_BASE_URL || 'http://localhost:3000';

    try {
      const response = await fetch(`${API_BASE_URL}/api/lessons/progress`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (response.ok) {
        const result = await response.json();
        const data = result.data;

        // Update points
        updatePointsDisplay(data.points);

        // Update progress bar
        const progressBar = document.getElementById('levelProgress');
        if (progressBar) {
          progressBar.style.width = `${data.progressPercentage || 0}%`;
        }

        // Update completed lessons count (if element exists)
        const completedLessonsEl = document.getElementById('completedLessons');
        if (completedLessonsEl) {
          completedLessonsEl.textContent = `${data.completedLessons || 0} lessons`;
        }

        // Also load quiz stats to get total points
        loadQuizStatsForPoints();
      }
    } catch (error) {
      console.error('Error loading progress:', error);
    }
  }

  // Load user achievements (lessons + quizzes)
  async function loadUserAchievements() {
    const token = localStorage.getItem('token');
    if (!token) return;

    const API_BASE_URL = window.API_BASE_URL || 'http://localhost:3000';

    try {
      // Load lesson achievements
      const lessonResponse = await fetch(`${API_BASE_URL}/api/lessons/progress`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      // Load quiz achievements
      const quizResponse = await fetch(`${API_BASE_URL}/api/quiz/stats`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      let allAchievements = [];

      if (lessonResponse.ok) {
        const lessonResult = await lessonResponse.json();
        const lessonAchievements = lessonResult.data?.achievements || [];
        allAchievements = allAchievements.concat(lessonAchievements);
      }

      if (quizResponse.ok) {
        const quizResult = await quizResponse.json();
        const quizAchievements = quizResult.data?.achievements || [];
        allAchievements = allAchievements.concat(quizAchievements);
      }

      // Sort by earned date (most recent first)
      allAchievements.sort((a, b) => {
        const dateA = new Date(a.earned_at || 0);
        const dateB = new Date(b.earned_at || 0);
        return dateB - dateA;
      });

      // Display achievements
      const achievementsList = document.getElementById('achievementsList');
      if (achievementsList) {
        achievementsList.innerHTML = '';
        
        if (allAchievements.length === 0) {
          achievementsList.innerHTML = '<div style="text-align: center; color: #666; padding: 20px;">No achievements yet. Complete lessons or quizzes to earn achievements!</div>';
        } else {
          allAchievements.forEach(achievement => {
            const date = new Date(achievement.earned_at);
            const dateStr = formatDate(date);
            
            const achEl = document.createElement('div');
            achEl.className = 'achievement-item';
            achEl.innerHTML = `
              <div class="achievement-icon">${achievement.icon || '🌟'}</div>
              <div class="achievement-details">
                <div class="achievement-name">${achievement.name}</div>
                <div class="achievement-desc">${achievement.description || ''}</div>
              </div>
              <div class="achievement-date">${dateStr}</div>
            `;
            achievementsList.appendChild(achEl);
          });
        }
      }

      // Display badges (achievements as badges)
      const badgesGrid = document.getElementById('badgesGrid');
      if (badgesGrid) {
        badgesGrid.innerHTML = '';
        
        if (allAchievements.length === 0) {
          badgesGrid.innerHTML = '<div style="text-align: center; color: #666; padding: 20px;">No badges yet. Start learning or playing to earn badges!</div>';
        } else {
          allAchievements.forEach(achievement => {
            const badgeEl = document.createElement('div');
            badgeEl.className = 'badge-item';
            badgeEl.title = achievement.description || achievement.name;
            badgeEl.innerHTML = `
              <div class="badge-icon">${achievement.icon || '🌟'}</div>
              <div class="badge-name">${achievement.name}</div>
            `;
            badgesGrid.appendChild(badgeEl);
          });
        }
      }

      // Update total badges count
      const totalBadgesEl = document.getElementById('totalBadges');
      if (totalBadgesEl) {
        totalBadgesEl.textContent = `${allAchievements.length} badges`;
      }
    } catch (error) {
      console.error('Error loading achievements:', error);
    }
  }

  // Load quiz stats to update total points (combines learn + play + quiz points)
  async function loadQuizStatsForPoints() {
    const token = localStorage.getItem('token');
    if (!token) return;

    const API_BASE_URL = window.API_BASE_URL || 'http://localhost:3000';

    try {
      // Re-fetch progress to get updated total points (which includes play_points)
      const response = await fetch(`${API_BASE_URL}/api/lessons/progress`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (response.ok) {
        const result = await response.json();
        const points = result.data?.points;
        
        // Update points display with combined total
        if (points) {
          updatePointsDisplay(points);
        }
      }
    } catch (error) {
      console.error('Error loading quiz stats:', error);
    }
  }

  function formatDate(date) {
    const now = new Date();
    const diff = now - date;
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    
    if (days === 0) return 'Today';
    if (days === 1) return 'Yesterday';
    if (days < 7) return `${days} days ago`;
    if (days < 30) return `${Math.floor(days / 7)} weeks ago`;
    if (days < 365) return `${Math.floor(days / 30)} months ago`;
    return `${Math.floor(days / 365)} years ago`;
  }

  // Booking History
  const bookings = [
    { name: 'Studio A Recording', date: 'Nov 12, 2025', status: 'Completed' },
    { name: 'Mixing Session', date: 'Nov 10, 2025', status: 'Completed' },
    { name: 'Vocal Recording', date: 'Nov 8, 2025', status: 'Completed' },
    { name: 'Beat Production', date: 'Nov 15, 2025', status: 'Upcoming' },
    { name: 'Mastering Session', date: 'Nov 18, 2025', status: 'Upcoming' },
  ];

  const bookingHistory = document.getElementById('bookingHistory');
  if(bookingHistory) {
    bookings.forEach(booking => {
      const bookingEl = document.createElement('div');
      bookingEl.className = 'history-item';
      bookingEl.innerHTML = `
        <span>${booking.name}</span>
        <span class="history-date">${booking.date}</span>
      `;
      bookingHistory.appendChild(bookingEl);
    });
  }

  // Notification toggles
  const notifications = [
    { id: 'bookingReminder', label: 'Booking Reminders', active: true },
    { id: 'levelUp', label: 'Level Up Notifications', active: true },
    { id: 'newBadge', label: 'New Badge Alerts', active: true },
    { id: 'weeklyReport', label: 'Weekly Progress Report', active: false },
    { id: 'friendActivity', label: 'Friend Activity', active: true },
  ];

  const notificationToggles = document.getElementById('notificationToggles');
  if(notificationToggles) {
    notifications.forEach(notif => {
      const toggleEl = document.createElement('div');
      toggleEl.className = 'notification-toggle';
      toggleEl.innerHTML = `
        <span>${notif.label}</span>
        <div class="toggle-switch ${notif.active ? 'active' : ''}" data-id="${notif.id}">
          <div class="toggle-slider"></div>
        </div>
      `;
      
      toggleEl.addEventListener('click', function() {
        const toggle = this.querySelector('.toggle-switch');
        toggle.classList.toggle('active');
      });
      
      notificationToggles.appendChild(toggleEl);
    });
  }

  // ===================================================================
  // LOGOUT MODAL
  // ===================================================================
  
  // Create logout modal
  const logoutModal = document.createElement('div');
  logoutModal.id = 'logoutModal';
  logoutModal.className = 'logout-modal';
  logoutModal.innerHTML = `
    <div class="logout-modal-content">
      <div class="logout-modal-icon">👋</div>
      <h2 class="logout-modal-title">Log Out?</h2>
      <p class="logout-modal-text">Are you sure you want to log out of your account?</p>
      <div class="logout-modal-buttons">
        <button class="logout-modal-btn cancel" id="cancelLogout">Cancel</button>
        <button class="logout-modal-btn confirm" id="confirmLogout">Yes, Log Out</button>
      </div>
    </div>
  `;
  document.body.appendChild(logoutModal);

  // Add modal styles
  const modalStyles = document.createElement('style');
  modalStyles.textContent = `
    .logout-modal {
      display: none;
      position: fixed;
      z-index: 10000;
      left: 0;
      top: 0;
      width: 100%;
      height: 100%;
      background-color: rgba(0, 0, 0, 0.6);
      animation: fadeIn 0.3s ease;
    }

    .logout-modal.active {
      display: flex;
      align-items: center;
      justify-content: center;
    }

    .logout-modal-content {
      background: white;
      border-radius: 16px;
      padding: 40px;
      max-width: 400px;
      width: 90%;
      text-align: center;
      box-shadow: 0 10px 40px rgba(0, 0, 0, 0.2);
      animation: slideUp 0.3s ease;
    }

    .logout-modal-icon {
      font-size: 60px;
      margin-bottom: 20px;
    }

    .logout-modal-title {
      font-size: 24px;
      font-weight: 700;
      color: #333;
      margin-bottom: 10px;
    }

    .logout-modal-text {
      font-size: 16px;
      color: #666;
      margin-bottom: 30px;
    }

    .logout-modal-buttons {
      display: flex;
      gap: 15px;
      justify-content: center;
    }

    .logout-modal-btn {
      padding: 12px 30px;
      border: none;
      border-radius: 8px;
      font-size: 16px;
      font-weight: 600;
      cursor: pointer;
      transition: all 0.3s ease;
    }

    .logout-modal-btn.cancel {
      background: #f0f0f0;
      color: #333;
    }

    .logout-modal-btn.cancel:hover {
      background: #e0e0e0;
    }

    .logout-modal-btn.confirm {
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      color: white;
    }

    .logout-modal-btn.confirm:hover {
      transform: translateY(-2px);
      box-shadow: 0 5px 15px rgba(102, 126, 234, 0.4);
    }

    @keyframes fadeIn {
      from { opacity: 0; }
      to { opacity: 1; }
    }

    @keyframes slideUp {
      from {
        transform: translateY(50px);
        opacity: 0;
      }
      to {
        transform: translateY(0);
        opacity: 1;
      }
    }
  `;
  document.head.appendChild(modalStyles);

  // Logout functionality with modal
  const logoutBtn = document.getElementById('profileLogout');
  const logoutBtnMobile = document.getElementById('profileLogoutMobile');
  const cancelLogout = document.getElementById('cancelLogout');
  const confirmLogout = document.getElementById('confirmLogout');

  function showLogoutModal() {
    logoutModal.classList.add('active');
  }

  function hideLogoutModal() {
    logoutModal.classList.remove('active');
  }

  function handleLogout() {
    try { 
      localStorage.removeItem('token'); 
      localStorage.removeItem('user'); 
      sessionStorage.clear(); 
    } catch(e){}
    window.location.href = '/frontend/views/auth/login.html';
  }
  
  if(logoutBtn){
    logoutBtn.addEventListener('click', (e) => {
      e.preventDefault();
      showLogoutModal();
    });
  }
  
  if(logoutBtnMobile){
    logoutBtnMobile.addEventListener('click', (e) => {
      e.preventDefault();
      showLogoutModal();
    });
  }

  if(cancelLogout){
    cancelLogout.addEventListener('click', hideLogoutModal);
  }

  if(confirmLogout){
    confirmLogout.addEventListener('click', handleLogout);
  }

  // Close modal when clicking outside
  logoutModal.addEventListener('click', (e) => {
    if (e.target === logoutModal) {
      hideLogoutModal();
    }
  });
})();