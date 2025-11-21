// MixLab Admin Dashboard - Vanilla JavaScript

// Data
const appointments = [
  { course: "Guitar Lesson", user: "Sarah Johnson", instructor: "Mike Smith", date: "Nov 18, 2024", time: "10:00 AM", status: "Confirmed", icon: "calendar" },
  { course: "Piano Session", user: "David Lee", instructor: "Emma Wilson", date: "Nov 18, 2024", time: "2:00 PM", status: "Confirmed", icon: "video" },
  { course: "Drum Workshop", user: "Alex Martinez", instructor: "Chris Brown", date: "Nov 19, 2024", time: "11:30 AM", status: "Pending", icon: "calendar" },
  { course: "Vocal Training", user: "Emily Davis", instructor: "Lisa Anderson", date: "Nov 20, 2024", time: "3:00 PM", status: "Confirmed", icon: "video" },
  { course: "Music Theory", user: "James Wilson", instructor: "Dr. Roberts", date: "Nov 21, 2024", time: "9:00 AM", status: "Cancelled", icon: "calendar" }
];

const recentUsers = [
  { name: "Sophie Chen", email: "sophie.c@email.com", course: "Guitar Basics", enrolled: "Nov 15, 2024", status: "Active", initials: "SC" },
  { name: "Marcus Brown", email: "marcus.b@email.com", course: "Piano Advanced", enrolled: "Nov 14, 2024", status: "Active", initials: "MB" },
  { name: "Olivia Taylor", email: "olivia.t@email.com", course: "Drum Fundamentals", enrolled: "Nov 13, 2024", status: "Pending", initials: "OT" },
  { name: "Ryan Garcia", email: "ryan.g@email.com", course: "Vocal Performance", enrolled: "Nov 12, 2024", status: "Active", initials: "RG" },
  { name: "Emma Wilson", email: "emma.w@email.com", course: "Music Production", enrolled: "Nov 11, 2024", status: "Inactive", initials: "EW" },
  { name: "Lucas Anderson", email: "lucas.a@email.com", course: "Bass Guitar", enrolled: "Nov 10, 2024", status: "Active", initials: "LA" }
];

// State
let currentMonth = new Date();

// Initialize Dashboard (single DOMContentLoaded)
document.addEventListener("DOMContentLoaded", function () {
  initNavigation();
  renderAppointments();
  renderUsers();
  renderCalendar();
  initDateFilter();
  initExportButtons();
  initSidebarToggle();
  initLogout();

  // Render icons after DOM changes (Lucide)
  setTimeout(() => {
    if (window.lucide && typeof lucide.createIcons === "function") {
      lucide.createIcons();
    }
  }, 50);
});

// Navigation and interactions
function initNavigation() {
  const navItems = document.querySelectorAll(".nav-item");

  navItems.forEach(item => {
    item.addEventListener("click", function () {
      navItems.forEach(nav => nav.classList.remove("active"));
      this.classList.add("active");

      const navType = this.getAttribute("data-nav");
      console.log(`Navigating to: ${navType}`);
      // Here you could trigger content swaps for each section
    });
  });
}

function initLogout() {
  const logoutBtn = document.getElementById("logoutBtn");
  if (logoutBtn) {
    logoutBtn.addEventListener("click", function () {
      // Replace with actual logout logic in production
      alert("Logging out...");
    });
  }
}

// Render Appointments
function renderAppointments() {
  const appointmentsList = document.getElementById("appointmentsList");
  if (!appointmentsList) return;

  appointmentsList.innerHTML = appointments.map(apt => {
    const statusClass = `status-${apt.status.toLowerCase()}`;
    return `
      <div class="appointment-item">
        <div class="appointment-icon">
          <i data-lucide="${apt.icon}"></i>
        </div>
        <div class="appointment-details">
          <h4 class="appointment-course">${escapeHtml(apt.course)}</h4>
          <p class="appointment-people">${escapeHtml(apt.user)} • ${escapeHtml(apt.instructor)}</p>
          <p class="appointment-time">${escapeHtml(apt.date)} at ${escapeHtml(apt.time)}</p>
        </div>
        <span class="status-badge ${statusClass}">
          ${escapeHtml(apt.status)}
        </span>
      </div>
    `;
  }).join("");
}

// Render Users Table
function renderUsers() {
  const usersTableBody = document.getElementById("usersTableBody");
  if (!usersTableBody) return;

  usersTableBody.innerHTML = recentUsers.map(user => {
    const statusClass = `status-${user.status.toLowerCase()}`;
    return `
      <tr>
        <td>
          <div class="user-info">
            <div class="user-avatar-small">${escapeHtml(user.initials)}</div>
            <div>
              <div class="user-name">${escapeHtml(user.name)}</div>
              <div class="user-email">${escapeHtml(user.email)}</div>
            </div>
          </div>
        </td>
        <td>${escapeHtml(user.course)}</td>
        <td>${escapeHtml(user.enrolled)}</td>
        <td>
          <span class="status-badge ${statusClass}">
            ${escapeHtml(user.status)}
          </span>
        </td>
      </tr>
    `;
  }).join("");
}

// Calendar Functions
function renderCalendar() {
  const monthNames = ["January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December"];

  const year = currentMonth.getFullYear();
  const month = currentMonth.getMonth();

  // Update month/year display
  const monthYearEl = document.getElementById("calendarMonthYear");
  if (monthYearEl) monthYearEl.textContent = `${monthNames[month]} ${year}`;

  // Calculate calendar data
  const firstDay = new Date(year, month, 1);
  const lastDay = new Date(year, month + 1, 0);
  const daysInMonth = lastDay.getDate();
  const startingDayOfWeek = firstDay.getDay();

  // Check if current month
  const today = new Date();
  const isCurrentMonth = month === today.getMonth() && year === today.getFullYear();

  // Example event days (this can be driven by your appointments/events)
  const eventDays = [5, 12, 18, 25];

  // Render calendar days
  const calendarDaysEl = document.getElementById("calendarDays");
  if (!calendarDaysEl) return;

  let daysHTML = "";

  // Empty cells for days before month starts
  for (let i = 0; i < startingDayOfWeek; i++) {
    daysHTML += '<div class="calendar-day empty" aria-hidden="true"></div>';
  }

  // Days of the month
  for (let day = 1; day <= daysInMonth; day++) {
    const isToday = isCurrentMonth && day === today.getDate();
    const hasEvent = eventDays.includes(day);

    let classes = "calendar-day";
    if (isToday) classes += " today";
    if (hasEvent) classes += " has-event";

    daysHTML += `<div class="${classes}" role="button" tabindex="0">${day}</div>`;
  }

  calendarDaysEl.innerHTML = daysHTML;

  // Re-init icons for any new <i data-lucide> inside generated content
  if (window.lucide && typeof lucide.createIcons === "function") {
    setTimeout(() => lucide.createIcons(), 20);
  }
}

// Calendar navigation
document.addEventListener("click", function (e) {
  // Delegate prev/next buttons
  if (e.target.closest("#dashboardPrevMonth")) {
    currentMonth = new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1);
    renderCalendar();
  } else if (e.target.closest("#dashboardNextMonth")) {
    currentMonth = new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1);
    renderCalendar();
  }
});

// Date Filter
function initDateFilter() {
  const presetBtns = document.querySelectorAll(".preset-btn");

  presetBtns.forEach(btn => {
    btn.addEventListener("click", function () {
      const preset = this.getAttribute("data-preset");
      setDatePreset(preset);
    });
  });
}

function setDatePreset(preset) {
  const endDate = new Date();
  let startDate = new Date();

  switch (preset) {
    case "7days":
      startDate.setDate(endDate.getDate() - 7);
      break;
    case "30days":
      startDate.setDate(endDate.getDate() - 30);
      break;
    case "month":
      startDate = new Date(endDate.getFullYear(), endDate.getMonth(), 1);
      break;
    case "year":
      startDate = new Date(endDate.getFullYear(), 0, 1);
      break;
  }

  // Format dates for input fields
  const startEl = document.getElementById("startDate");
  const endEl = document.getElementById("endDate");
  if (startEl) startEl.value = formatDate(startDate);
  if (endEl) endEl.value = formatDate(endDate);

  console.log(`Date range set: ${formatDate(startDate)} to ${formatDate(endDate)}`);
}

function formatDate(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

// Export Functions
function initExportButtons() {
  const exportBtns = document.querySelectorAll(".export-btn");

  exportBtns.forEach(btn => {
    btn.addEventListener("click", function () {
      const format = this.getAttribute("data-format");
      handleExport(format);
    });
  });
}

function handleExport(format) {
  const startDate = document.getElementById("startDate")?.value || "";
  const endDate = document.getElementById("endDate")?.value || "";

  alert(`Exporting data as ${format} for date range: ${startDate} to ${endDate}`);
  console.log(`Export ${format} from ${startDate} to ${endDate}`);

  // Implement actual export logic here (fetch server endpoint, generate blob, etc.)
}

// Responsive Sidebar Toggle (mobile)
function initSidebarToggle() {
  const menuToggle = document.getElementById("menuToggle");
  const sidebar = document.getElementById("sidebar");
  if (!menuToggle || !sidebar) return;

  menuToggle.addEventListener("click", function () {
    sidebar.classList.toggle("open");
  });

  // Close sidebar when clicking outside on small screens
  document.addEventListener("click", function (e) {
    if (window.innerWidth <= 768 && sidebar.classList.contains("open")) {
      const clickedInside = e.target.closest("#sidebar") || e.target.closest("#menuToggle");
      if (!clickedInside) {
        sidebar.classList.remove("open");
      }
    }
  });

  window.addEventListener("resize", function () {
    if (window.innerWidth > 768) sidebar.classList.remove("open");
  });
}

// Utility: simple text escape to avoid injection in generated markup
function escapeHtml(str) {
  if (typeof str !== "string") return str;
  return str.replace(/[&<>"'`=\/]/g, function (s) {
    return {
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      '"': "&quot;",
      "'": "&#39;",
      "/": "&#x2F;",
      "`": "&#x60;",
      "=": "&#x3D;"
    }[s];
  });
}