// Admin Dashboard JavaScript

const API_BASE_URL = window.API_BASE_URL || 'http://localhost:3000';

let revenueChart = null;
let engagementChart = null;
let currentCalendarDate = new Date();

// Load dashboard data
async function loadDashboardData() {
  const token = localStorage.getItem('token');
  if (!token) return;

  try {
    const response = await fetch(`${API_BASE_URL}/api/admin/dashboard`, {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });

    if (!response.ok) {
      throw new Error('Failed to load dashboard data');
    }

    const result = await response.json();
    const data = result.data;

    // Update metrics
    updateMetrics(data.metrics);
    
    // Update charts
    updateCharts(data.revenueTrends, data.userEngagement);
    
    // Update appointments
    updateAppointments(data.upcomingAppointments);
    
    // Update recent users
    updateRecentUsers(data.recentUsers);
    
  } catch (error) {
    console.error('Error loading dashboard:', error);
    showToast('Failed to load dashboard data', 'error');
  }
}

// Update metrics
function updateMetrics(metrics) {
  if (!metrics) return;

  const elements = {
    totalUsers: document.getElementById('totalUsers'),
    userGrowth: document.getElementById('userGrowth'),
    totalAppointments: document.getElementById('totalAppointments'),
    appointmentGrowth: document.getElementById('appointmentGrowth'),
    completedLessons: document.getElementById('completedLessons'),
    newLessons: document.getElementById('newLessons'),
    monthlyRevenue: document.getElementById('monthlyRevenue'),
    revenueGrowth: document.getElementById('revenueGrowth'),
    engagementRate: document.getElementById('engagementRate'),
    engagementGrowth: document.getElementById('engagementGrowth')
  };

  if (elements.totalUsers) elements.totalUsers.textContent = metrics.totalUsers || 0;
  if (elements.userGrowth) elements.userGrowth.textContent = metrics.userGrowth || '+0%';
  if (elements.totalAppointments) elements.totalAppointments.textContent = metrics.totalAppointments || 0;
  if (elements.appointmentGrowth) elements.appointmentGrowth.textContent = metrics.appointmentGrowth || '+0%';
  if (elements.completedLessons) elements.completedLessons.textContent = metrics.completedLessons || 0;
  if (elements.newLessons) elements.newLessons.textContent = `${metrics.newLessonsThisMonth || 0} new this month`;
  if (elements.monthlyRevenue) elements.monthlyRevenue.textContent = `$${parseFloat(metrics.monthlyRevenue || 0).toFixed(1)}K`;
  if (elements.revenueGrowth) elements.revenueGrowth.textContent = metrics.revenueGrowth || '+0%';
  if (elements.engagementRate) elements.engagementRate.textContent = metrics.engagementRate || '0%';
  if (elements.engagementGrowth) elements.engagementGrowth.textContent = metrics.engagementGrowth || '+0%';
}

// Update charts
function updateCharts(revenueData, engagementData) {
  // Revenue Chart
  const revenueCtx = document.getElementById('revenueChart');
  if (revenueCtx && revenueData) {
    if (revenueChart) {
      revenueChart.destroy();
    }

    const labels = revenueData.map(d => {
      const date = new Date(d.month + '-01');
      return date.toLocaleDateString('en-US', { month: 'short' });
    });
    const revenues = revenueData.map(d => parseFloat(d.revenue || 0));

    revenueChart = new Chart(revenueCtx, {
      type: 'line',
      data: {
        labels: labels,
        datasets: [{
          label: 'Revenue',
          data: revenues,
          borderColor: '#f4c542',
          backgroundColor: 'rgba(244, 197, 66, 0.1)',
          fill: true,
          tension: 0.4
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: {
            display: false
          }
        },
        scales: {
          y: {
            beginAtZero: true,
            ticks: {
              color: '#a0a0a0'
            },
            grid: {
              color: '#2a2d3a'
            }
          },
          x: {
            ticks: {
              color: '#a0a0a0'
            },
            grid: {
              color: '#2a2d3a'
            }
          }
        }
      }
    });
  }

  // Engagement Chart
  const engagementCtx = document.getElementById('engagementChart');
  if (engagementCtx && engagementData) {
    if (engagementChart) {
      engagementChart.destroy();
    }

    const labels = engagementData.map(d => {
      const date = new Date(d.date);
      return date.toLocaleDateString('en-US', { weekday: 'short' });
    });
    const activeUsers = engagementData.map(d => d.active_users || 0);
    const lessonsCompleted = engagementData.map(d => d.lessons_completed || 0);

    engagementChart = new Chart(engagementCtx, {
      type: 'bar',
      data: {
        labels: labels,
        datasets: [
          {
            label: 'Active Users',
            data: activeUsers,
            backgroundColor: '#f4c542',
            borderRadius: 8
          },
          {
            label: 'Lessons Completed',
            data: lessonsCompleted,
            backgroundColor: '#27ae60',
            borderRadius: 8
          }
        ]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: {
            display: true,
            labels: {
              color: '#a0a0a0'
            }
          }
        },
        scales: {
          y: {
            beginAtZero: true,
            ticks: {
              color: '#a0a0a0'
            },
            grid: {
              color: '#2a2d3a'
            }
          },
          x: {
            ticks: {
              color: '#a0a0a0'
            },
            grid: {
              color: '#2a2d3a'
            }
          }
        }
      }
    });
  }
}

// Update appointments list
function updateAppointments(appointments) {
  const container = document.getElementById('appointmentsList');
  if (!container) return;

  if (!appointments || appointments.length === 0) {
    container.innerHTML = '<div style="text-align: center; color: #a0a0a0; padding: 20px;">No upcoming appointments</div>';
    return;
  }

  container.innerHTML = appointments.slice(0, 5).map(apt => {
    const studentName = `${apt.student_first_name || ''} ${apt.student_last_name || ''}`.trim();
    const instructorName = apt.instructor_first_name 
      ? `${apt.instructor_first_name} ${apt.instructor_last_name || ''}`.trim()
      : 'Not assigned';
    const date = new Date(apt.date);
    const time = apt.time.substring(0, 5);

    return `
      <div class="appointment-item">
        <div class="appointment-info">
          <div class="appointment-course">${apt.service_type || 'Lesson'}</div>
          <div class="appointment-details">
            ${studentName} • ${instructorName} • ${date.toLocaleDateString()} ${time}
          </div>
        </div>
        <div class="appointment-status ${apt.status}">${apt.status}</div>
      </div>
    `;
  }).join('');
}

// Update recent users
function updateRecentUsers(users) {
  const container = document.getElementById('recentUsersTable');
  if (!container) return;

  if (!users || users.length === 0) {
    container.innerHTML = '<div style="text-align: center; color: #a0a0a0; padding: 20px;">No recent users</div>';
    return;
  }

  container.innerHTML = users.map(user => {
    const name = `${user.first_name || ''} ${user.last_name || ''}`.trim() || user.username;
    const initial = name.charAt(0).toUpperCase();
    const level = user.total_points > 0 ? Math.floor(user.total_points / 100) + 1 : 1;
    const status = user.is_verified ? 'active' : 'pending';

    return `
      <div class="user-row">
        <div class="user-avatar-small">${initial}</div>
        <div class="user-info">
          <div class="user-name">${name}</div>
          <div class="user-email">${user.email || ''}</div>
        </div>
        <div class="user-stats">
          <div class="user-level">Lvl ${level} • ${user.total_points || 0} pts</div>
          <div class="user-status ${status}">${status}</div>
        </div>
      </div>
    `;
  }).join('');
}

// Generate calendar
function generateCalendar(year, month) {
  const firstDay = new Date(year, month, 1);
  const lastDay = new Date(year, month + 1, 0);
  const daysInMonth = lastDay.getDate();
  const startingDayOfWeek = firstDay.getDay();

  const monthNames = ['January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'];

  const monthYearEl = document.getElementById('calendarMonthYear');
  if (monthYearEl) {
    monthYearEl.textContent = `${monthNames[month]} ${year}`;
  }

  const calendarEl = document.getElementById('dashboardCalendar');
  if (!calendarEl) return;

  let html = '<div class="calendar-grid">';
  
  // Day headers
  const dayHeaders = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  dayHeaders.forEach(day => {
    html += `<div class="calendar-day-header">${day}</div>`;
  });

  // Empty cells for days before month starts
  for (let i = 0; i < startingDayOfWeek; i++) {
    html += '<div class="calendar-day empty"></div>';
  }

  // Days of the month
  const today = new Date();
  for (let day = 1; day <= daysInMonth; day++) {
    const isToday = today.getDate() === day && 
                    today.getMonth() === month && 
                    today.getFullYear() === year;
    html += `<div class="calendar-day ${isToday ? 'today' : ''}">${day}</div>`;
  }

  html += '</div>';
  calendarEl.innerHTML = html;
}

// Calendar navigation
function setupCalendar() {
  const prevBtn = document.getElementById('dashboardPrevMonth');
  const nextBtn = document.getElementById('dashboardNextMonth');

  if (prevBtn) {
    prevBtn.addEventListener('click', () => {
      currentCalendarDate.setMonth(currentCalendarDate.getMonth() - 1);
      generateCalendar(currentCalendarDate.getFullYear(), currentCalendarDate.getMonth());
    });
  }

  if (nextBtn) {
    nextBtn.addEventListener('click', () => {
      currentCalendarDate.setMonth(currentCalendarDate.getMonth() + 1);
      generateCalendar(currentCalendarDate.getFullYear(), currentCalendarDate.getMonth());
    });
  }

  generateCalendar(currentCalendarDate.getFullYear(), currentCalendarDate.getMonth());
}

// Initialize dashboard
document.addEventListener('DOMContentLoaded', () => {
  loadDashboardData();
  setupCalendar();
  
  // Refresh data every 5 minutes
  setInterval(loadDashboardData, 5 * 60 * 1000);
});

// Add calendar styles
const calendarStyle = document.createElement('style');
calendarStyle.textContent = `
  .calendar-grid {
    display: grid;
    grid-template-columns: repeat(7, 1fr);
    gap: 4px;
  }
  .calendar-day-header {
    text-align: center;
    font-weight: 600;
    font-size: 0.85rem;
    color: var(--admin-text-secondary);
    padding: 8px;
  }
  .calendar-day {
    aspect-ratio: 1;
    display: flex;
    align-items: center;
    justify-content: center;
    border-radius: 6px;
    background: var(--admin-bg-secondary);
    color: var(--admin-text-primary);
    font-size: 0.9rem;
    cursor: pointer;
    transition: all 0.2s ease;
  }
  .calendar-day:hover {
    background: var(--admin-bg-card);
    border: 1px solid var(--admin-accent);
  }
  .calendar-day.today {
    background: var(--admin-accent);
    color: var(--admin-bg-primary);
    font-weight: 600;
  }
  .calendar-day.empty {
    background: transparent;
    cursor: default;
  }
`;
document.head.appendChild(calendarStyle);

