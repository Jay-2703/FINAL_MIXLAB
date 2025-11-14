// ========================================
// MIXLAB ADMIN PANEL - COMPLETE JAVASCRIPT
// ========================================

class AdminPanel {
    constructor() {
        this.currentSection = 'dashboard';
        this.currentMonth = new Date();
        this.dashboardMonth = new Date();
        this.selectedAppointmentId = null;
        this.charts = {};
        this.init();
    }

    // ========================================
    // INITIALIZATION
    // ========================================
    init() {
        this.setupEventListeners();
        this.loadDashboardData();
        this.initializeCharts();
        this.loadUsers();
        this.loadAppointments();
        this.loadModules();
        this.loadAnnouncements();
        this.loadActivityLogs();
        this.generateCalendar();
        this.generateDashboardCalendar();
    }

    setupEventListeners() {
        // Navigation
        document.querySelectorAll('.nav-item').forEach(item => {
            item.addEventListener('click', (e) => {
                e.preventDefault();
                const section = item.dataset.section;
                this.switchSection(section);
                document.querySelectorAll('.nav-item').forEach(i => i.classList.remove('active'));
                item.classList.add('active');
            });
        });

        // Toggle sidebar on mobile
        const toggleBtn = document.querySelector('.toggle-sidebar');
        if (toggleBtn) {
            toggleBtn.addEventListener('click', () => {
                document.querySelector('.sidebar').classList.toggle('active');
            });
        }

        // Dashboard calendar controls
        document.getElementById('dashboardPrevMonth')?.addEventListener('click', () => this.prevDashboardMonth());
        document.getElementById('dashboardNextMonth')?.addEventListener('click', () => this.nextDashboardMonth());

        // Admin profile modal
        const userProfile = document.querySelector('.user-profile');
        if (userProfile) {
            userProfile.addEventListener('click', () => this.openProfile());
        }

        const adminProfileForm = document.getElementById('adminProfileForm');
        if (adminProfileForm) {
            adminProfileForm.addEventListener('submit', (e) => this.handleProfileSubmit(e));
        }

        // Date filter
        const applyFilterBtn = document.getElementById('applyDateFilter');
        if (applyFilterBtn) {
            applyFilterBtn.addEventListener('click', () => this.applyDateFilter());
        }

        // User management
        const addUserBtn = document.getElementById('addUserBtn');
        if (addUserBtn) {
            addUserBtn.addEventListener('click', () => this.openUserForm());
        }

        const userForm = document.getElementById('userForm');
        if (userForm) {
            userForm.addEventListener('submit', (e) => this.handleUserFormSubmit(e));
        }

        // Appointments
        document.querySelectorAll('.appointment-tabs .tab-btn').forEach(btn => {
            btn.addEventListener('click', () => this.switchAppointmentTab(btn.dataset.tab));
        });

        document.getElementById('prevMonth').addEventListener('click', () => this.prevMonth());
        document.getElementById('nextMonth').addEventListener('click', () => this.nextMonth());

        // Content management
        document.querySelectorAll('.content-tabs .tab-btn').forEach(btn => {
            btn.addEventListener('click', () => this.switchContentTab(btn.dataset.tab));
        });

        const addModuleBtn = document.getElementById('addModuleBtn');
        if (addModuleBtn) {
            addModuleBtn.addEventListener('click', () => this.openModuleForm());
        }

        const moduleForm = document.getElementById('moduleForm');
        if (moduleForm) {
            moduleForm.addEventListener('submit', (e) => this.handleModuleFormSubmit(e));
        }

        // Analytics
        const generateReportBtn = document.getElementById('generateReportBtn');
        if (generateReportBtn) {
            generateReportBtn.addEventListener('click', () => this.generateReport());
        }

        document.getElementById('exportPdfBtn').addEventListener('click', () => this.exportReportPDF());
        document.getElementById('exportExcelBtn').addEventListener('click', () => this.exportReportExcel());
        document.getElementById('exportCsvBtn').addEventListener('click', () => this.exportReportCSV());

        // Announcements
        const createAnnouncementBtn = document.getElementById('createNewAnnouncementBtn');
        if (createAnnouncementBtn) {
            createAnnouncementBtn.addEventListener('click', () => this.openAnnouncementForm());
        }

        const announcementForm = document.getElementById('announcementForm');
        if (announcementForm) {
            announcementForm.addEventListener('submit', (e) => this.handleAnnouncementFormSubmit(e));
        }

        const scheduleCheckbox = document.getElementById('scheduleAnnouncement');
        if (scheduleCheckbox) {
            scheduleCheckbox.addEventListener('change', () => {
                document.getElementById('scheduleDateGroup').style.display = 
                    scheduleCheckbox.checked ? 'block' : 'none';
            });
        }

        // Modal close buttons
        document.querySelectorAll('.close').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.target.closest('.modal').classList.remove('active');
            });
        });

        // Quick actions
        document.getElementById('createAnnouncementBtn')?.addEventListener('click', () => {
            this.switchSection('announcements');
            this.openAnnouncementForm();
        });

        document.getElementById('viewBookingsBtn')?.addEventListener('click', () => {
            this.switchSection('appointments');
            document.querySelector('[data-tab="table"]').click();
        });

        // Convenience buttons
        document.getElementById('addLessonBtn')?.addEventListener('click', () => {
            // Open module form directly
            this.switchSection('content');
            // ensure modules tab is active
            this.switchContentTab('modules');
            this.openModuleForm();
        });

        document.getElementById('addQuizBtn')?.addEventListener('click', () => {
            this.switchSection('content');
            this.switchContentTab('quizzes');
            // no quiz form implemented yet; focus on quizzes tab
        });

        document.getElementById('exportReportBtn')?.addEventListener('click', () => {
            this.switchSection('analytics');
        });

        document.getElementById('saveTimeSlotsBtn')?.addEventListener('click', () => {
            // placeholder: implement actual save logic with backend
            alert('Time slots saved (placeholder)');
        });

        // Global search - placeholder logging
        document.getElementById('globalSearch')?.addEventListener('input', (e) => {
            // Could be wired to filter current active table
            console.log('Global search:', e.target.value);
        });
    }

    // ========================================
    // SECTION MANAGEMENT
    // ========================================
    switchSection(section) {
        // Hide all sections
        document.querySelectorAll('.section').forEach(s => {
            s.classList.remove('active');
        });

        // Show selected section
        const selectedSection = document.getElementById(section);
        if (selectedSection) {
            selectedSection.classList.add('active');
            document.getElementById('pageTitle').textContent = this.getSectionTitle(section);
        }

        this.currentSection = section;

        // Trigger section-specific data loading
        if (section === 'appointments') {
            this.generateCalendar();
        } else if (section === 'analytics') {
            this.loadAnalyticsData();
        }
    }

    getSectionTitle(section) {
        const titles = {
            dashboard: 'Dashboard',
            appointments: 'Appointments',
            users: 'Users',
            content: 'Content',
            analytics: 'Analytics',
            announcements: 'Announcements',
            settings: 'Settings'
        };

        return titles[section] || '';

    }

    // ========================================
    // DASHBOARD
    // ========================================
    async loadDashboardData() {
        try {
            const res = await fetch('/api/admin/dashboard');
            if (!res.ok) throw new Error(`Status ${res.status}`);
            const json = await res.json();

            if (json && json.success && json.data && json.data.overview) {
                const d = json.data.overview;
                // Not all metrics may be present; use safe fallbacks
                document.getElementById('totalRevenue').textContent = (json.data.revenue || 0).toLocaleString();
                document.getElementById('totalStudents').textContent = d.total_students ?? '0';
                document.getElementById('totalAppointments').textContent = d.total_appointments ?? '0';
                document.getElementById('activeUsers').textContent = d.total_students ?? '0';
                document.getElementById('pendingAppointments').textContent = (json.data.recent_bookings || []).filter(b => b.status === 'pending').length;
                document.getElementById('completionRate').textContent = json.data.performance?.avg_completion_rate ?? '0';
                return;
            }

            // If payload is unexpected, leave dashboard blank so you can verify live backend data
            console.warn('Unexpected dashboard payload — leaving dashboard values blank for testing');
            document.getElementById('totalRevenue').textContent = '';
            document.getElementById('totalStudents').textContent = '';
            document.getElementById('totalAppointments').textContent = '';
            document.getElementById('activeUsers').textContent = '';
            document.getElementById('pendingAppointments').textContent = '';
            document.getElementById('completionRate').textContent = '';
        } catch (err) {
            console.error('Failed to load dashboard data:', err);
            // keep fields blank on error so admin shows only live data
            document.getElementById('totalRevenue').textContent = '';
            document.getElementById('totalStudents').textContent = '';
            document.getElementById('totalAppointments').textContent = '';
            document.getElementById('activeUsers').textContent = '';
            document.getElementById('pendingAppointments').textContent = '';
            document.getElementById('completionRate').textContent = '';
        }
    }

    initializeCharts() {
        this.createRevenueChart();
        this.createServiceChart();
        this.createEngagementChart();
        this.createPerformanceChart();
    }

    createRevenueChart() {
        const ctx = document.getElementById('revenueChart');
        if (!ctx) return;

        this.charts.revenue = new Chart(ctx, {
            type: 'line',
            data: {
                labels: [],
                datasets: [{
                    label: 'Revenue',
                    data: [],
                    borderColor: 'rgba(255,215,0,0.9)',
                    backgroundColor: 'rgba(255,215,0,0.07)',
                    tension: 0.4,
                    fill: true,
                    pointRadius: 5,
                    pointBackgroundColor: 'rgba(255,215,0,0.9)',
                    pointBorderColor: '#111',
                    pointBorderWidth: 2
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: true,
                plugins: {
                    legend: {
                        display: true,
                        labels: { font: { size: 12 } }
                    }
                },
                scales: {
                    y: {
                        beginAtZero: true,
                        ticks: {
                            callback: function(value) {
                                return '$' + value.toLocaleString();
                            }
                        }
                    }
                }
            }
        });
    }

    createServiceChart() {
        const ctx = document.getElementById('serviceChart');
        if (!ctx) return;

        this.charts.service = new Chart(ctx, {
            type: 'doughnut',
            data: {
                labels: [],
                datasets: [{
                    data: [],
                    backgroundColor: [
                        'rgba(255,215,0,0.9)',
                        'rgba(255,215,0,0.6)',
                        'rgba(255,215,0,0.3)'
                    ],
                    borderColor: 'rgba(255,255,255,0.05)',
                    borderWidth: 2
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: true,
                plugins: {
                    legend: {
                        position: 'bottom'
                    }
                }
            }
        });
    }

    createEngagementChart() {
        const ctx = document.getElementById('engagementChart');
        if (!ctx) return;

        this.charts.engagement = new Chart(ctx, {
            type: 'bar',
            data: {
                labels: [],
                datasets: [{
                    label: 'Active Users',
                    data: [],
                    backgroundColor: 'rgba(255,215,0,0.9)',
                    borderRadius: 8,
                    borderSkipped: false
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: true,
                indexAxis: 'x',
                plugins: {
                    legend: { display: false }
                },
                scales: {
                    y: { beginAtZero: true }
                }
            }
        });
    }

    createPerformanceChart() {
        const ctx = document.getElementById('performanceChart');
        if (!ctx) return;

        this.charts.performance = new Chart(ctx, {
            type: 'radar',
            data: {
                labels: [],
                datasets: [{
                    label: 'Metrics',
                    data: [],
                    borderColor: 'rgba(255,215,0,0.9)',
                    backgroundColor: 'rgba(255,215,0,0.07)',
                    pointBackgroundColor: 'rgba(255,215,0,0.9)'
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: true,
                plugins: {
                    legend: { display: true }
                },
                scales: {
                    r: {
                        beginAtZero: true,
                        max: 100
                    }
                }
            }
        });
    }

    applyDateFilter() {
        const startDate = document.getElementById('startDate').value;
        const endDate = document.getElementById('endDate').value;
        console.log('Filter applied:', startDate, 'to', endDate);
        // Implement date-based filtering logic here
    }

    // ========================================
    // USER MANAGEMENT
    // ========================================
    async loadUsers() {
        try {
            const res = await fetch('/api/admin/users?limit=200');
            if (!res.ok) throw new Error(`Status ${res.status}`);
            const json = await res.json();

            const users = (json && json.success && Array.isArray(json.data)) ? json.data : [];

            // map to expected shape for rendering (add placeholder status)
            const mapped = users.map(u => ({
                id: u.id,
                username: u.username,
                email: u.email,
                role: u.role,
                date: u.created_at?.split('T')?.[0] ?? u.created_at ?? '',
                status: u.is_active || u.status || 'active'
            }));

            this.renderUsersTable(mapped);
            this.setupUserFilters(mapped);
        } catch (err) {
            console.error('Failed to load users from API:', err);
            // If the API is unreachable show an empty users table so you can verify DB connectivity from the backend.
            const users = [];
            this.renderUsersTable(users);
            this.setupUserFilters(users);
        }
    }
    

    renderUsersTable(users) {
        const tbody = document.getElementById('usersTableBody');
        if (!tbody) return;

        tbody.innerHTML = users.map(user => `
            <tr>
                <td><strong>${user.username}</strong></td>
                <td>${user.email}</td>
                <td>${user.role}</td>
                <td>${user.date}</td>
                <td>
                    <span class="status-badge status-${user.status}">
                        ${user.status}
                    </span>
                </td>
                <td>
                    <button class="btn btn-primary" onclick="admin.viewUserDetails(${user.id})">View</button>
                    <button class="btn btn-secondary" onclick="admin.editUser(${user.id})">Edit</button>
                    <button class="btn btn-danger" onclick="admin.deleteUser(${user.id})">Delete</button>
                </td>
            </tr>
        `).join('');
    }

    setupUserFilters(users) {
        const searchInput = document.getElementById('userSearchInput');
        const roleFilter = document.getElementById('roleFilter');
        const statusFilter = document.getElementById('statusFilter');

        const filterUsers = () => {
            const search = searchInput.value.toLowerCase();
            const role = roleFilter.value;
            const status = statusFilter.value;

            const filtered = users.filter(user =>
                (user.username.toLowerCase().includes(search) || user.email.toLowerCase().includes(search)) &&
                (!role || user.role === role) &&
                (!status || user.status === status)
            );

            this.renderUsersTable(filtered);
        };

        searchInput?.addEventListener('input', filterUsers);
        roleFilter?.addEventListener('change', filterUsers);
        statusFilter?.addEventListener('change', filterUsers);
    }

    openUserForm(userId = null) {
        const modal = document.getElementById('userFormModal');
        const title = document.getElementById('userFormTitle');

        if (userId) {
            title.textContent = 'Edit User';
            // Load user data
        } else {
            title.textContent = 'Add New User';
            document.getElementById('userForm').reset();
        }

        modal.classList.add('active');
    }

    handleUserFormSubmit(e) {
        e.preventDefault();
        const username = document.getElementById('userUsername').value;
        const email = document.getElementById('userEmail').value;
        const role = document.getElementById('userRole').value;
        const status = document.getElementById('userStatus').value;

        console.log('User form submitted:', { username, email, role, status });
        alert('User saved successfully!');
        document.getElementById('userFormModal').classList.remove('active');
        this.loadUsers(); // Reload users
    }

    viewUserDetails(userId) {
        const modal = document.getElementById('userDetailsModal');
        const content = document.getElementById('userDetailsContent');

        content.innerHTML = `
            <div class="user-details-card">
                <h3>Profile Information</h3>
                <p><strong>User ID:</strong> ${userId}</p>
                <p><strong>Username:</strong> john_musician</p>
                <p><strong>Email:</strong> john@example.com</p>
                <p><strong>Role:</strong> Student</p>
                <p><strong>Joined:</strong> January 15, 2024</p>
                <p><strong>XP Points:</strong> 2,500</p>
                <p><strong>Level:</strong> 12</p>

                <h3 style="margin-top: 20px;">Appointment History</h3>
                <ul>
                    <li>Piano Lesson - Jan 10, 2024 - Completed</li>
                    <li>Guitar Session - Jan 15, 2024 - Completed</li>
                    <li>Theory Class - Jan 20, 2024 - Pending</li>
                </ul>

                <h3 style="margin-top: 20px;">Learning Progress</h3>
                <p>Modules Completed: 8/15</p>
                <p>Overall Progress: 53%</p>
            </div>
        `;

        modal.classList.add('active');
    }

    editUser(userId) {
        this.openUserForm(userId);
    }

    deleteUser(userId) {
        if (confirm('Are you sure you want to delete this user?')) {
            console.log('User deleted:', userId);
            alert('User deleted successfully!');
            this.loadUsers();
        }
    }

    // ========================================
    // APPOINTMENTS
    // ========================================
    async loadAppointments() {
        try {
            const res = await fetch('/api/admin/appointments?limit=200');
            if (!res.ok) throw new Error(`Status ${res.status}`);
            const json = await res.json();

            const appointments = (json && json.success && Array.isArray(json.data)) ? json.data.map(a => ({
                id: a.booking_id || a.id,
                date: a.booking_date?.split('T')?.[0] ?? a.booking_date ?? '',
                time: (a.start_time && a.end_time) ? `${a.start_time} - ${a.end_time}` : (a.time || ''),
                student: a.student_name ?? a.student ?? '',
                instructor: a.instructor_name ?? a.instructor ?? '',
                service: a.lesson_type ?? a.service ?? '',
                status: a.status ?? 'pending'
            })) : [];

            this.renderAppointmentsTable(appointments);
        } catch (err) {
            console.error('Failed to load appointments from API:', err);
            // No sample fallback — keep table empty so you can verify live backend connectivity.
            const appointments = [];
            this.renderAppointmentsTable(appointments);
        }
    }

    renderAppointmentsTable(appointments) {
        const tbody = document.getElementById('appointmentsTableBody');
        if (!tbody) return;

        tbody.innerHTML = appointments.map(apt => `
            <tr>
                <td>${apt.date}</td>
                <td>${apt.time}</td>
                <td>${apt.student}</td>
                <td>${apt.instructor}</td>
                <td>${apt.service}</td>
                <td><span class="status-badge status-${apt.status}">${apt.status}</span></td>
                <td>
                    <button class="btn btn-secondary" onclick="admin.editAppointment(${apt.id})">Edit</button>
                    <button class="btn btn-danger" onclick="admin.deleteAppointment(${apt.id})">Delete</button>
                </td>
            </tr>
        `).join('');
    }

    editAppointment(appointmentId) {
        this.selectedAppointmentId = appointmentId;
        const modal = document.getElementById('appointmentFormModal');
        modal.classList.add('active');
    }

    deleteAppointment(appointmentId) {
        if (confirm('Delete this appointment?')) {
            console.log('Appointment deleted:', appointmentId);
            this.loadAppointments();
        }
    }

    // ========================================
    // CALENDAR
    // ========================================
    generateCalendar() {
        const year = this.currentMonth.getFullYear();
        const month = this.currentMonth.getMonth();

        document.getElementById('currentMonth').textContent = 
            this.currentMonth.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });

        const firstDay = new Date(year, month, 1);
        const lastDay = new Date(year, month + 1, 0);
        const daysInMonth = lastDay.getDate();
        const startingDayOfWeek = firstDay.getDay();

        let html = '';

        // Days of week headers
        const daysOfWeek = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
        daysOfWeek.forEach(day => {
            html += `<div class="calendar-day header">${day}</div>`;
        });

        // Empty cells for days before month starts
        for (let i = 0; i < startingDayOfWeek; i++) {
            html += `<div class="calendar-day other-month"></div>`;
        }

        // Days of the month
        for (let day = 1; day <= daysInMonth; day++) {
            const isToday = new Date().toDateString() === new Date(year, month, day).toDateString();
            const hasEvents = day % 3 === 0; // Sample: every 3rd day has events

            html += `
                <div class="calendar-day ${isToday ? 'today' : ''} ${hasEvents ? 'has-events' : ''}">
                    ${day}
                </div>
            `;
        }

        document.getElementById('calendar').innerHTML = html;
    }

    // Dashboard calendar (compact) - uses its own month state
    generateDashboardCalendar() {
        const year = this.dashboardMonth.getFullYear();
        const month = this.dashboardMonth.getMonth();

        const current = document.getElementById('dashboardCurrentMonth');
        if (current) {
            current.textContent = this.dashboardMonth.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
        }

        const firstDay = new Date(year, month, 1);
        const lastDay = new Date(year, month + 1, 0);
        const daysInMonth = lastDay.getDate();
        const startingDayOfWeek = firstDay.getDay();

        let html = '';

        // Days of week headers
        const daysOfWeek = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
        daysOfWeek.forEach(day => {
            html += `<div class="calendar-day header">${day}</div>`;
        });

        // Empty cells for days before month starts
        for (let i = 0; i < startingDayOfWeek; i++) {
            html += `<div class="calendar-day other-month"></div>`;
        }

        // Days of the month (compact marking only)
        for (let day = 1; day <= daysInMonth; day++) {
            const isToday = new Date().toDateString() === new Date(year, month, day).toDateString();
            html += `
                <div class="calendar-day ${isToday ? 'today' : ''}">
                    ${day}
                </div>
            `;
        }

        const el = document.getElementById('dashboardCalendar');
        if (el) el.innerHTML = html;
    }

    prevDashboardMonth() {
        this.dashboardMonth.setMonth(this.dashboardMonth.getMonth() - 1);
        this.generateDashboardCalendar();
    }

    nextDashboardMonth() {
        this.dashboardMonth.setMonth(this.dashboardMonth.getMonth() + 1);
        this.generateDashboardCalendar();
    }

    prevMonth() {
        this.currentMonth.setMonth(this.currentMonth.getMonth() - 1);
        this.generateCalendar();
    }

    nextMonth() {
        this.currentMonth.setMonth(this.currentMonth.getMonth() + 1);
        this.generateCalendar();
    }

    switchAppointmentTab(tab) {
        // Activate the tab button that matches the provided tab key
        document.querySelectorAll('.appointment-tabs .tab-btn').forEach(btn => {
            btn.classList.toggle('active', btn.dataset.tab === tab);
        });

        // Hide all appointment tab contents, then show the selected one
        document.querySelectorAll('#appointments .tab-content').forEach(content => content.classList.remove('active'));
        const target = document.getElementById(`${tab}-tab`);
        if (target) target.classList.add('active');
    }

    // ========================================
    // CONTENT MANAGEMENT
    // ========================================
    async loadModules() {
        try {
            const res = await fetch('/api/admin/lessons?limit=200');
            if (!res.ok) throw new Error(`Status ${res.status}`);
            const json = await res.json();

            const modules = (json && json.success && Array.isArray(json.data)) ? json.data.map(m => ({
                id: m.lesson_id || m.id,
                name: m.title || m.name,
                level: m.level || m.order_index || 1,
                service: m.instrument || m.service || '',
                status: m.is_active ? 'active' : (m.status || 'active'),
                enrolled: m.enrolled || 0
            })) : [];

            const tbody = document.getElementById('modulesTableBody');
            if (!tbody) return;

            tbody.innerHTML = modules.map(m => `
                <tr>
                    <td>${m.name}</td>
                    <td>Level ${m.level}</td>
                    <td>${m.service}</td>
                    <td><span class="status-badge status-${m.status}">${m.status}</span></td>
                    <td>${m.enrolled}</td>
                    <td>
                        <button class="btn btn-secondary" onclick="admin.editModule(${m.id})">Edit</button>
                        <button class="btn btn-danger" onclick="admin.deleteModule(${m.id})">Delete</button>
                    </td>
                </tr>
            `).join('');
        } catch (err) {
            console.error('Failed to load modules from API:', err);
            const tbody = document.getElementById('modulesTableBody');
            if (!tbody) return;
            tbody.innerHTML = ''; // empty when API fails
        }
    }

    openModuleForm(moduleId = null) {
        const modal = document.getElementById('moduleFormModal');
        document.getElementById('moduleFormTitle').textContent = moduleId ? 'Edit Module' : 'Add New Module';
        modal.classList.add('active');
    }

    handleModuleFormSubmit(e) {
        e.preventDefault();
        alert('Module saved successfully!');
        document.getElementById('moduleFormModal').classList.remove('active');
        this.loadModules();
    }

    editModule(moduleId) {
        this.openModuleForm(moduleId);
    }

    deleteModule(moduleId) {
        if (confirm('Delete this module?')) {
            alert('Module deleted successfully!');
            this.loadModules();
        }
    }

    switchContentTab(tab) {
        document.querySelectorAll('.content-tabs .tab-btn').forEach(btn => {
            btn.classList.remove('active');
        });
        document.querySelectorAll('.tab-content').forEach(content => {
            content.classList.remove('active');
        });

            // Toggle active state on content tab buttons
            document.querySelectorAll('.content-tabs .tab-btn').forEach(btn => {
                btn.classList.toggle('active', btn.dataset.tab === tab);
            });

            // Hide all content tab contents within the content section
            document.querySelectorAll('#content .tab-content').forEach(content => content.classList.remove('active'));
            const target = document.getElementById(`${tab}-tab`);
            if (target) target.classList.add('active');
    }

    // ========================================
    // ANALYTICS & REPORTS
    // ========================================
    generateReport() {
        const startDate = document.getElementById('reportStartDate').value;
        const endDate = document.getElementById('reportEndDate').value;
        const reportType = document.getElementById('reportTypeSelect').value;

        const reportHTML = `
            <div style="margin-top: 20px;">
                <h3>Report Generated</h3>
                <p><strong>Type:</strong> ${reportType}</p>
                <p><strong>Period:</strong> ${startDate} to ${endDate}</p>
                <div style="margin-top: 20px; padding: 20px; background: #f3f4f6; border-radius: 12px;">
                    <canvas id="generatedChart"></canvas>
                </div>
            </div>
        `;

        document.getElementById('reportVisualization').innerHTML = reportHTML;
        setTimeout(() => this.createGeneratedChart(reportType), 100);
    }

    createGeneratedChart(type) {
        const ctx = document.getElementById('generatedChart');
        if (!ctx) return;

        new Chart(ctx, {
            type: type === 'revenue' ? 'line' : 'bar',
            data: {
                labels: ['Week 1', 'Week 2', 'Week 3', 'Week 4'],
                datasets: [{
                    label: 'Data',
                    data: [100, 150, 120, 200],
                    backgroundColor: '#5b5bff',
                    borderColor: '#5b5bff'
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: true
            }
        });
    }

    exportReportPDF() {
        alert('Exporting to PDF...');
        // Implement PDF export
    }

    exportReportExcel() {
        alert('Exporting to Excel...');
        // Implement Excel export
    }

    exportReportCSV() {
        alert('Exporting to CSV...');
        // Implement CSV export
    }

    loadAnalyticsData() {
        // Load analytics-specific data
        console.log('Loading analytics data');
    }

    // ========================================
    // ANNOUNCEMENTS
    // ========================================
    loadAnnouncements() {
        // Announcements will be provided by the backend API. Leave empty so admin shows live data only.
        const announcements = [];
        const list = document.getElementById('announcementsList');
        if (!list) return;

        if (announcements.length === 0) {
            list.innerHTML = '<div class="announcement-empty">No announcements available.</div>';
            return;
        }

        list.innerHTML = announcements.map(ann => `
            <div class="announcement-card">
                <h4>${ann.title}</h4>
                <p>${ann.content}</p>
                <div class="announcement-meta">
                    <span>${ann.date}</span>
                    <span>${ann.audience}</span>
                    <div>
                        <button class="btn btn-secondary" onclick="admin.editAnnouncement(${ann.id})">Edit</button>
                        <button class="btn btn-danger" onclick="admin.deleteAnnouncement(${ann.id})">Delete</button>
                    </div>
                </div>
            </div>
        `).join('');
    }

    openAnnouncementForm() {
        const modal = document.getElementById('announcementFormModal');
        document.getElementById('announcementForm').reset();
        modal.classList.add('active');
    }

    handleAnnouncementFormSubmit(e) {
        e.preventDefault();
        const title = document.getElementById('announcementTitle').value;
        const content = document.getElementById('announcementContent').value;
        const audience = document.getElementById('announcementAudience').value;

        console.log('Announcement created:', { title, content, audience });
        alert('Announcement posted successfully!');
        document.getElementById('announcementFormModal').classList.remove('active');
        this.loadAnnouncements();
    }

    editAnnouncement(announcementId) {
        this.openAnnouncementForm();
    }

    deleteAnnouncement(announcementId) {
        if (confirm('Delete this announcement?')) {
            alert('Announcement deleted successfully!');
            this.loadAnnouncements();
        }
    }

    // ========================================
    // ACTIVITY LOGS
    // ========================================
    loadActivityLogs() {
        // Activity logs should come from the backend. Show empty state so the UI reflects live data.
        const logs = [];
        const tbody = document.getElementById('logsTableBody');
        if (!tbody) return;
        tbody.innerHTML = '';
    }

    // ========================================
    // UTILITY FUNCTIONS
    // ========================================
    showNotification(message, type = 'info') {
        console.log(`[${type}] ${message}`);
        // Implement notification system
    }

    // ========================================
    // ADMIN PROFILE
    // ========================================
    openProfile() {
        const modal = document.getElementById('adminProfileModal');
        if (!modal) return;
        // Prefill with defaults (could fetch from API)
        document.getElementById('adminDisplayName').value = 'Admin';
        document.getElementById('adminEmail').value = 'admin@example.com';
        document.getElementById('adminNotifications').value = 'yes';
        document.getElementById('adminTheme').value = 'dark';
        modal.classList.add('active');
    }

    handleProfileSubmit(e) {
        e.preventDefault();
        const name = document.getElementById('adminDisplayName').value;
        const email = document.getElementById('adminEmail').value;
        const notifications = document.getElementById('adminNotifications').value;
        const theme = document.getElementById('adminTheme').value;

        console.log('Profile saved:', { name, email, notifications, theme });
        alert('Profile settings saved (local only).');
        document.getElementById('adminProfileModal').classList.remove('active');
    }
}

// Initialize admin panel when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    window.admin = new AdminPanel();
});
