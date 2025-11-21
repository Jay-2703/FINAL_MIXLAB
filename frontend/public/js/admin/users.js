/**
 * users.js
 * Frontend behavior for MixLab Admin - Users page (Backend Integrated)
 *
 * Features:
 * - Fetches users from backend API with pagination, search, and filtering
 * - Create, update, view, and delete users via API
 * - Form validation with password strength checks
 * - Real-time notifications
 * - Mobile responsive with sidebar toggle
 */

(() => {
  // Configuration
  // Detect if we're running on Live Server or served from backend
  const isLiveServer = window.location.port === '5500' || window.location.port === '5501';
  const API_BASE = isLiveServer ? 'http://localhost:3000/api/admin' : '/api/admin';
  const PER_PAGE = 10;

  // DOM elements
  const usersTableBody = document.getElementById("usersTableBody");
  const userSearch = document.getElementById("userSearch");
  const statusFilter = document.getElementById("statusFilter");
  const addUserBtn = document.getElementById("addUserBtn");
  const userModal = document.getElementById("userModal");
  const modalBackdrop = document.getElementById("modalBackdrop");
  const closeModalBtn = document.getElementById("closeModal");
  const userForm = document.getElementById("userForm");
  const formUserId = document.getElementById("formUserId");
  const cancelBtn = document.getElementById("cancelBtn");
  const passwordFieldLabel = document.getElementById("passwordFieldLabel");
  const confirmPasswordLabel = document.getElementById("confirmPasswordLabel");
  const togglePassword = document.getElementById("togglePassword");
  const password = document.getElementById("password");
  const confirmPassword = document.getElementById("confirmPassword");
  const ruleLength = document.getElementById("rule-length");
  const ruleUpper = document.getElementById("rule-upper");
  const ruleLower = document.getElementById("rule-lower");
  const ruleNumber = document.getElementById("rule-number");
  const ruleSpecial = document.getElementById("rule-special");
  const errPassword = document.getElementById("err-password");
  const paginationContainer = document.getElementById("pagination");
  const rowsInfo = document.getElementById("rowsInfo");
  const menuToggle = document.getElementById("menuToggle");
  const sidebar = document.getElementById("sidebar");
  const sidebarOverlay = document.getElementById("sidebarOverlay");
  const notificationBadge = document.getElementById("notificationBadge");

  // State
  let currentPage = 1;
  let totalPages = 1;
  let totalUsers = 0;
  let currentSearch = '';
  let currentStatus = '';

  /* -------------------------
     API Helper Functions
     ------------------------- */
  async function apiRequest(endpoint, options = {}) {
    try {
      const response = await fetch(`${API_BASE}${endpoint}`, {
        ...options,
        headers: {
          'Content-Type': 'application/json',
          ...options.headers,
        },
        credentials: 'include', // Include cookies for authentication
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || 'API request failed');
      }

      return data;
    } catch (error) {
      console.error('API Error:', error);
      showNotification(error.message || 'An error occurred', 'error');
      throw error;
    }
  }

  /* -------------------------
     Fetch Users from Backend
     ------------------------- */
  async function fetchUsers(page = 1) {
    try {
      showLoading(true);
      
      const params = new URLSearchParams({
        page: page,
        limit: PER_PAGE,
      });

      if (currentSearch) {
        params.append('search', currentSearch);
      }

      if (currentStatus) {
        params.append('status', currentStatus);
      }

      const result = await apiRequest(`/users?${params.toString()}`);

      if (result.success) {
        renderTable(result.data.users, result.data.pagination);
      }
    } catch (error) {
      console.error('Failed to fetch users:', error);
      usersTableBody.innerHTML = `
        <tr>
          <td colspan="9" style="padding: 24px; text-align: center; color: #ef4444;">
            Failed to load users. Please try again.
          </td>
        </tr>
      `;
    } finally {
      showLoading(false);
    }
  }

  /* -------------------------
     Rendering Functions
     ------------------------- */
  function renderTable(users, pagination) {
    usersTableBody.innerHTML = "";
    
    currentPage = pagination.page;
    totalPages = pagination.pages;
    totalUsers = pagination.total;

    if (!users || users.length === 0) {
      const tr = document.createElement("tr");
      const td = document.createElement("td");
      td.colSpan = 9;
      td.style.padding = "24px";
      td.style.textAlign = "center";
      td.textContent = "No users found.";
      tr.appendChild(td);
      usersTableBody.appendChild(tr);
    } else {
      users.forEach(u => {
        const tr = document.createElement("tr");
        tr.dataset.id = u.id;

        // Format status badge
        const statusBadge = u.is_verified 
          ? '<span style="color: #10b981; font-size: 0.875rem;">●</span>' 
          : '<span style="color: #ef4444; font-size: 0.875rem;">●</span>';

        tr.innerHTML = `
          <td>${escapeHtml(u.id)}</td>
          <td>
            <div class="user-cell">
              <div class="user-initials">${initials(u)}</div>
              <div class="user-info">
                <div class="user-name">${escapeHtml(u.first_name + ' ' + u.last_name)}</div>
                <div class="user-email">${escapeHtml(u.username || "")}</div>
              </div>
            </div>
          </td>
          <td>${escapeHtml(u.email || "")}</td>
          <td>${escapeHtml(u.contact || "N/A")}</td>
          <td>${formatDateDisplay(u.birthday)}</td>
          <td>${escapeHtml(u.home_address || "N/A")}</td>
          <td>${formatDateDisplay(u.created_at)}</td>
          <td>${statusBadge} ${u.is_verified ? 'Active' : 'Inactive'}</td>
          <td>
            <div class="row-actions">
              <button class="action-btn btn-view" title="View" data-action="view" aria-label="View ${escapeHtml(u.first_name)}">
                <i class="fas fa-eye"></i>
              </button>
              <button class="action-btn btn-edit" title="Edit" data-action="edit" aria-label="Edit ${escapeHtml(u.first_name)}">
                <i class="fas fa-edit"></i>
              </button>
              <button class="action-btn btn-delete" title="Delete" data-action="delete" aria-label="Delete ${escapeHtml(u.first_name)}">
                <i class="fas fa-trash"></i>
              </button>
            </div>
          </td>
        `;
        usersTableBody.appendChild(tr);
      });
    }

    // Update pagination info
    const from = totalUsers === 0 ? 0 : (currentPage - 1) * PER_PAGE + 1;
    const to = Math.min(currentPage * PER_PAGE, totalUsers);
    rowsInfo.textContent = `Showing ${from}-${to} of ${totalUsers} users`;

    renderPagination();
  }

  function renderPagination() {
    paginationContainer.innerHTML = "";
    
    // Previous button
    const prev = createPageButton("Prev", currentPage > 1, () => fetchUsers(currentPage - 1));
    paginationContainer.appendChild(prev);

    // Page numbers
    const maxButtons = 7;
    let start = 1;
    let end = totalPages;
    
    if (totalPages > maxButtons) {
      const mid = Math.floor(maxButtons / 2);
      start = Math.max(1, currentPage - mid);
      end = Math.min(totalPages, start + maxButtons - 1);
      if (end - start + 1 < maxButtons) {
        start = Math.max(1, end - maxButtons + 1);
      }
    }

    for (let i = start; i <= end; i++) {
      const btn = createPageButton(String(i), true, () => fetchUsers(i));
      if (i === currentPage) {
        btn.classList.add("active");
        btn.disabled = true;
      }
      paginationContainer.appendChild(btn);
    }

    // Next button
    const next = createPageButton("Next", currentPage < totalPages, () => fetchUsers(currentPage + 1));
    paginationContainer.appendChild(next);
  }

  function createPageButton(text, enabled, onClick) {
    const btn = document.createElement("button");
    btn.className = "page-btn";
    btn.textContent = text;
    if (!enabled) {
      btn.disabled = true;
    } else {
      btn.addEventListener("click", onClick);
    }
    return btn;
  }

  /* -------------------------
     Modal Functions
     ------------------------- */
  function openUserModal({ mode = "create", userId = null } = {}) {
    resetFormErrors();
    
    if (mode === "create") {
      formUserId.value = "";
      userForm.reset();
      passwordFieldLabel.hidden = false;
      confirmPasswordLabel.hidden = false;
      password.required = true;
      confirmPassword.required = true;
      userForm.querySelectorAll("input, select").forEach((el) => (el.disabled = false));
      document.getElementById("modalTitle").textContent = "Register User";
    } else {
      // Fetch user details for edit/view
      fetchUserDetails(userId, mode);
    }

    userModal.setAttribute("aria-hidden", "false");
    userModal.style.display = "flex";
    setTimeout(() => {
      (userForm.querySelector("input:not([type=hidden])") || closeModalBtn).focus();
    }, 60);
  }

  async function fetchUserDetails(userId, mode) {
    try {
      // We'll need to fetch from the users list we already have
      // or make a separate API call if you have a GET /api/admin/users/:id endpoint
      const params = new URLSearchParams({ page: 1, limit: 1000 });
      const result = await apiRequest(`/users?${params.toString()}`);
      const user = result.data.users.find(u => u.id == userId);
      
      if (!user) {
        showNotification('User not found', 'error');
        closeUserModal();
        return;
      }

      formUserId.value = user.id;
      userForm.username.value = user.username || "";
      userForm.first_name.value = user.first_name || "";
      userForm.last_name.value = user.last_name || "";
      userForm.email.value = user.email || "";
      userForm.contact.value = user.contact || "";
      userForm.birthday.value = user.birthday || "";
      userForm.homeAddress.value = user.home_address || "";
      userForm.role.value = user.role || "student";

      if (mode === "view") {
        passwordFieldLabel.hidden = true;
        confirmPasswordLabel.hidden = true;
        password.required = false;
        confirmPassword.required = false;
        userForm.querySelectorAll("input, select").forEach((el) => (el.disabled = true));
        document.getElementById("modalTitle").textContent = "View User";
      } else {
        passwordFieldLabel.hidden = false;
        confirmPasswordLabel.hidden = false;
        password.required = false; // Optional for edit
        confirmPassword.required = false;
        userForm.querySelectorAll("input, select").forEach((el) => (el.disabled = false));
        document.getElementById("modalTitle").textContent = "Edit User";
      }
    } catch (error) {
      showNotification('Failed to load user details', 'error');
      closeUserModal();
    }
  }

  function closeUserModal() {
    userModal.setAttribute("aria-hidden", "true");
    userModal.style.display = "none";
    resetFormErrors();
    userForm.reset();
  }

  /* -------------------------
     Form Submission
     ------------------------- */
  userForm?.addEventListener("submit", async (e) => {
    e.preventDefault();
    
    const userId = formUserId.value;
    const isCreate = !userId;
    const { valid, data } = validateForm(!isCreate);
    
    if (!valid) return;

    try {
      showLoading(true);
      
      if (isCreate) {
        // Create new user
        await apiRequest('/users', {
          method: 'POST',
          body: JSON.stringify(data),
        });
        showNotification('User created successfully', 'success');
      } else {
        // Update existing user
        await apiRequest(`/users/${userId}`, {
          method: 'PUT',
          body: JSON.stringify(data),
        });
        showNotification('User updated successfully', 'success');
      }
      
      closeUserModal();
      fetchUsers(currentPage);
    } catch (error) {
      // Error already handled in apiRequest
    } finally {
      showLoading(false);
    }
  });

  /* -------------------------
     Delete User
     ------------------------- */
  async function handleDelete(id) {
    const confirmed = confirm('Are you sure you want to delete this user? This action cannot be undone.');
    
    if (!confirmed) return;

    try {
      showLoading(true);
      await apiRequest(`/users/${id}`, { method: 'DELETE' });
      showNotification('User deleted successfully', 'success');
      fetchUsers(currentPage);
    } catch (error) {
      // Error already handled in apiRequest
    } finally {
      showLoading(false);
    }
  }

  /* -------------------------
     Row Actions
     ------------------------- */
  usersTableBody?.addEventListener("click", (e) => {
    const btn = e.target.closest("button");
    if (!btn) return;
    
    const tr = btn.closest("tr");
    if (!tr) return;
    
    const id = tr.dataset.id;
    const action = btn.dataset.action;
    
    if (!action) return;
    
    if (action === "view") {
      openUserModal({ mode: "view", userId: id });
    } else if (action === "edit") {
      openUserModal({ mode: "edit", userId: id });
    } else if (action === "delete") {
      handleDelete(id);
    }
  });

  /* -------------------------
     Validation Functions
     ------------------------- */
  function validateForm(isEdit = false) {
    resetFormErrors();
    
    const data = {
      username: userForm.username.value.trim(),
      first_name: userForm.first_name.value.trim(),
      last_name: userForm.last_name.value.trim(),
      email: userForm.email.value.trim(),
      contact: userForm.contact.value.trim(),
      birthday: userForm.birthday.value,
      home_address: userForm.homeAddress.value.trim(),
      role: userForm.role.value,
    };

    let valid = true;

    if (!data.username) {
      document.getElementById("err-username").textContent = "Username is required.";
      valid = false;
    }
    if (!data.first_name) {
      document.getElementById("err-firstName").textContent = "First name is required.";
      valid = false;
    }
    if (!data.last_name) {
      document.getElementById("err-lastName").textContent = "Last name is required.";
      valid = false;
    }
    if (!data.email) {
      document.getElementById("err-email").textContent = "Email is required.";
      valid = false;
    } else if (!validateEmail(data.email)) {
      document.getElementById("err-email").textContent = "Enter a valid email address.";
      valid = false;
    }

    // Password validation
    const pw = password?.value || "";
    const cpw = confirmPassword?.value || "";
    
    if (!isEdit && !pw) {
      // Creating new user - password required
      errPassword.textContent = "Password is required.";
      valid = false;
    } else if (pw) {
      // Validate password strength if provided
      const checks = passwordChecks(pw);
      const allOk = Object.values(checks).every(Boolean);
      
      if (!allOk) {
        errPassword.textContent = "Password does not meet required rules.";
        valid = false;
      }
      
      if (pw !== cpw) {
        document.getElementById("err-confirmPassword").textContent = "Passwords do not match.";
        valid = false;
      }
      
      if (allOk && pw === cpw) {
        data.password = pw;
      }
    }

    return { valid, data };
  }

  function validateEmail(email) {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  }

  function passwordChecks(pw) {
    return {
      length: pw.length >= 8,
      upper: /[A-Z]/.test(pw),
      lower: /[a-z]/.test(pw),
      number: /[0-9]/.test(pw),
      special: /[^A-Za-z0-9]/.test(pw),
    };
  }

  function updatePasswordRuleIndicators(pw = "") {
    const checks = passwordChecks(pw);
    function mark(el, ok) {
      el.querySelector?.("i")?.classList?.toggle("fa-check-circle", ok);
      el.querySelector?.("i")?.classList?.toggle("fa-circle", !ok);
      el.style.color = ok ? "var(--gold)" : "";
    }
    mark(ruleLength, checks.length);
    mark(ruleUpper, checks.upper);
    mark(ruleLower, checks.lower);
    mark(ruleNumber, checks.number);
    mark(ruleSpecial, checks.special);
  }

  function resetFormErrors() {
    userForm.querySelectorAll(".error-text").forEach((el) => (el.textContent = ""));
    errPassword.textContent = "";
  }

  /* -------------------------
     Search & Filter
     ------------------------- */
  function debounce(fn, wait = 500) {
    let t;
    return (...args) => {
      clearTimeout(t);
      t = setTimeout(() => fn(...args), wait);
    };
  }

  const debouncedSearch = debounce(() => {
    currentSearch = userSearch.value.trim();
    fetchUsers(1);
  }, 500);

  userSearch?.addEventListener("input", debouncedSearch);
  
  statusFilter?.addEventListener("change", () => {
    currentStatus = statusFilter.value;
    fetchUsers(1);
  });

  /* -------------------------
     UI Helpers
     ------------------------- */
  function showLoading(show) {
    if (show) {
      usersTableBody.innerHTML = `
        <tr>
          <td colspan="9" style="padding: 24px; text-align: center;">
            <i class="fas fa-spinner fa-spin"></i> Loading...
          </td>
        </tr>
      `;
    }
  }

  function showNotification(message, type = 'info') {
    // Create notification element
    const notification = document.createElement('div');
    notification.className = `notification notification-${type}`;
    notification.style.cssText = `
      position: fixed;
      top: 20px;
      right: 20px;
      padding: 16px 24px;
      background: ${type === 'success' ? '#10b981' : type === 'error' ? '#ef4444' : '#3b82f6'};
      color: white;
      border-radius: 8px;
      box-shadow: 0 4px 6px rgba(0,0,0,0.1);
      z-index: 10000;
      animation: slideIn 0.3s ease;
    `;
    notification.textContent = message;
    document.body.appendChild(notification);

    setTimeout(() => {
      notification.style.animation = 'slideOut 0.3s ease';
      setTimeout(() => notification.remove(), 300);
    }, 3000);
  }

  function initials(u) {
    if (!u) return "";
    const first = (u.first_name || "").trim().charAt(0);
    const last = (u.last_name || "").trim().charAt(0);
    return ((first || "") + (last || "")).toUpperCase() || (u.username || "").slice(0, 2).toUpperCase();
  }

  function escapeHtml(str) {
    if (!str && str !== 0) return "";
    return String(str)
      .replace(/&/g, "&amp;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#39;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;");
  }

  function formatDateDisplay(isoDate) {
    if (!isoDate) return "N/A";
    const d = new Date(isoDate);
    return d.toLocaleDateString(undefined, { 
      year: "numeric", 
      month: "short", 
      day: "numeric" 
    });
  }

  /* -------------------------
     Password Visibility Toggle
     ------------------------- */
  togglePassword?.addEventListener("click", () => {
    if (!password) return;
    const type = password.getAttribute("type") === "password" ? "text" : "password";
    password.setAttribute("type", type);
    togglePassword.innerHTML = type === "text" 
      ? '<i class="fas fa-eye-slash"></i>' 
      : '<i class="fas fa-eye"></i>';
  });

  password?.addEventListener("input", (e) => updatePasswordRuleIndicators(e.target.value));

  /* -------------------------
     Sidebar Toggle
     ------------------------- */
  function openSidebar() {
    sidebar.classList.add("open");
    sidebarOverlay.hidden = false;
    menuToggle.setAttribute("aria-expanded", "true");
  }

  function closeSidebar() {
    sidebar.classList.remove("open");
    sidebarOverlay.hidden = true;
    menuToggle.setAttribute("aria-expanded", "false");
  }

  menuToggle?.addEventListener("click", () => {
    sidebar.classList.contains("open") ? closeSidebar() : openSidebar();
  });

  sidebarOverlay?.addEventListener("click", closeSidebar);

  /* -------------------------
     Modal Close Handlers
     ------------------------- */
  modalBackdrop?.addEventListener("click", closeUserModal);
  closeModalBtn?.addEventListener("click", closeUserModal);
  cancelBtn?.addEventListener("click", (e) => {
    e.preventDefault();
    closeUserModal();
  });

  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape") {
      if (userModal && userModal.getAttribute("aria-hidden") === "false") {
        closeUserModal();
      } else if (sidebar.classList.contains("open")) {
        closeSidebar();
      }
    }
  });

  /* -------------------------
     Add User Button
     ------------------------- */
  addUserBtn?.addEventListener("click", () => openUserModal({ mode: "create" }));

  /* -------------------------
     Initialization
     ------------------------- */
  function init() {
    // Add CSS for notifications
    const style = document.createElement('style');
    style.textContent = `
      @keyframes slideIn {
        from { transform: translateX(100%); opacity: 0; }
        to { transform: translateX(0); opacity: 1; }
      }
      @keyframes slideOut {
        from { transform: translateX(0); opacity: 1; }
        to { transform: translateX(100%); opacity: 0; }
      }
    `;
    document.head.appendChild(style);

    // Initial load
    fetchUsers(1);
  }

  // Run init on DOMContentLoaded
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();