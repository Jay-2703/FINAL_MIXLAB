// Users Management JavaScript

const API_BASE_URL = window.API_BASE_URL || 'http://localhost:3000';

let currentPage = 1;
let currentSearch = '';
let currentStatus = '';

// Load users
async function loadUsers(page = 1, search = '', status = '') {
  const token = localStorage.getItem('token');
  if (!token) return;

  try {
    const params = new URLSearchParams({
      page: page.toString(),
      limit: '10'
    });
    if (search) params.append('search', search);
    if (status) params.append('status', status);

    const response = await fetch(`${API_BASE_URL}/api/admin/users?${params}`, {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });

    if (!response.ok) {
      throw new Error('Failed to load users');
    }

    const result = await response.json();
    const data = result.data;

    displayUsers(data.users);
    displayPagination(data.pagination);

    currentPage = page;
    currentSearch = search;
    currentStatus = status;
  } catch (error) {
    console.error('Error loading users:', error);
    showToast('Failed to load users', 'error');
  }
}

// Display users in table
function displayUsers(users) {
  const tbody = document.getElementById('usersTableBody');
  if (!tbody) return;

  if (!users || users.length === 0) {
    tbody.innerHTML = '<tr><td colspan="6" style="text-align: center; padding: 40px; color: #a0a0a0;">No users found</td></tr>';
    return;
  }

  tbody.innerHTML = users.map(user => {
    const name = `${user.first_name || ''} ${user.last_name || ''}`.trim() || user.username;
    const initial = name.charAt(0).toUpperCase();
    const completedModules = user.completed_lessons || 0;
    const totalModules = user.total_lessons || 0;
    const progressPercent = totalModules > 0 ? (completedModules / totalModules * 100).toFixed(0) : 0;
    const level = user.total_points > 0 ? Math.floor(user.total_points / 100) + 1 : 1;
    const status = user.is_verified ? 'active' : 'inactive';

    return `
      <tr>
        <td>
          <div class="user-cell">
            <div class="user-avatar-table">${initial}</div>
            <div class="user-name-email">
              <div class="user-name-table">${name}</div>
              <div class="user-email-table">${user.email || ''}</div>
            </div>
          </div>
        </td>
        <td>${user.email || ''}</td>
        <td>
          <div class="modules-progress">
            <span>${completedModules}/${totalModules}</span>
            <div class="progress-bar-small">
              <div class="progress-fill-small" style="width: ${progressPercent}%"></div>
            </div>
          </div>
        </td>
        <td>
          <div class="gamified-score">Lvl ${level} • ${user.total_points || 0} pts</div>
        </td>
        <td>
          <span class="status-badge ${status}">${status}</span>
        </td>
        <td>
          <div class="action-buttons">
            <button class="btn-action edit" onclick="editUser(${user.id})">
              <i class="fas fa-edit"></i> Edit
            </button>
            <button class="btn-action delete" onclick="deleteUser(${user.id})">
              <i class="fas fa-trash"></i> Delete
            </button>
          </div>
        </td>
      </tr>
    `;
  }).join('');
}

// Display pagination
function displayPagination(pagination) {
  const container = document.getElementById('pagination');
  if (!container || !pagination) return;

  const { page, pages, total } = pagination;
  if (pages <= 1) {
    container.innerHTML = '';
    return;
  }

  let html = '';
  
  // Previous button
  html += `<button ${page === 1 ? 'disabled' : ''} onclick="loadUsers(${page - 1}, '${currentSearch}', '${currentStatus}')">
    <i class="fas fa-chevron-left"></i>
  </button>`;

  // Page numbers
  for (let i = 1; i <= pages; i++) {
    if (i === 1 || i === pages || (i >= page - 2 && i <= page + 2)) {
      html += `<button class="${i === page ? 'active' : ''}" onclick="loadUsers(${i}, '${currentSearch}', '${currentStatus}')">${i}</button>`;
    } else if (i === page - 3 || i === page + 3) {
      html += '<span>...</span>';
    }
  }

  // Next button
  html += `<button ${page === pages ? 'disabled' : ''} onclick="loadUsers(${page + 1}, '${currentSearch}', '${currentStatus}')">
    <i class="fas fa-chevron-right"></i>
  </button>`;

  container.innerHTML = html;
}

// Open add user modal
function openAddUserModal() {
  const modal = document.getElementById('userModal');
  const form = document.getElementById('userForm');
  const title = document.getElementById('modalTitle');
  
  if (modal && form && title) {
    form.reset();
    document.getElementById('userId').value = '';
    title.textContent = 'Add New User';
    document.getElementById('password').required = true;
    modal.classList.add('active');
  }
}

// Edit user
async function editUser(userId) {
  const token = localStorage.getItem('token');
  if (!token) return;

  try {
    const response = await fetch(`${API_BASE_URL}/api/admin/users?search=&page=1&limit=1000`, {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });

    if (!response.ok) throw new Error('Failed to fetch users');

    const result = await response.json();
    const user = result.data.users.find(u => u.id === userId);

    if (!user) {
      showToast('User not found', 'error');
      return;
    }

    const modal = document.getElementById('userModal');
    const form = document.getElementById('userForm');
    const title = document.getElementById('modalTitle');

    if (modal && form && title) {
      document.getElementById('userId').value = user.id;
      document.getElementById('username').value = user.username || '';
      document.getElementById('firstName').value = user.first_name || '';
      document.getElementById('lastName').value = user.last_name || '';
      document.getElementById('email').value = user.email || '';
      document.getElementById('role').value = user.role || 'student';
      document.getElementById('isVerified').checked = user.is_verified || false;
      document.getElementById('password').required = false;
      title.textContent = 'Edit User';
      modal.classList.add('active');
    }
  } catch (error) {
    console.error('Error loading user:', error);
    showToast('Failed to load user data', 'error');
  }
}

// Delete user
async function deleteUser(userId) {
  if (!confirm('Are you sure you want to delete this user? This action cannot be undone.')) {
    return;
  }

  const token = localStorage.getItem('token');
  if (!token) return;

  try {
    const response = await fetch(`${API_BASE_URL}/api/admin/users/${userId}`, {
      method: 'DELETE',
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });

    if (!response.ok) {
      const result = await response.json();
      throw new Error(result.message || 'Failed to delete user');
    }

    showToast('User deleted successfully', 'success');
    loadUsers(currentPage, currentSearch, currentStatus);
  } catch (error) {
    console.error('Error deleting user:', error);
    showToast(error.message || 'Failed to delete user', 'error');
  }
}

// Handle form submission
function setupUserForm() {
  const form = document.getElementById('userForm');
  if (!form) return;

  form.addEventListener('submit', async (e) => {
    e.preventDefault();

    const token = localStorage.getItem('token');
    if (!token) return;

    const userId = document.getElementById('userId').value;
    const formData = {
      username: document.getElementById('username').value,
      first_name: document.getElementById('firstName').value,
      last_name: document.getElementById('lastName').value,
      email: document.getElementById('email').value,
      role: document.getElementById('role').value,
      is_verified: document.getElementById('isVerified').checked ? 1 : 0
    };

    const password = document.getElementById('password').value;
    if (password) {
      formData.password = password;
    }

    try {
      let response;
      if (userId) {
        // Update user
        response = await fetch(`${API_BASE_URL}/api/admin/users/${userId}`, {
          method: 'PUT',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(formData)
        });
      } else {
        // Create user
        if (!password) {
          showToast('Password is required for new users', 'error');
          return;
        }
        response = await fetch(`${API_BASE_URL}/api/admin/users`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(formData)
        });
      }

      if (!response.ok) {
        const result = await response.json();
        throw new Error(result.message || 'Failed to save user');
      }

      showToast(userId ? 'User updated successfully' : 'User created successfully', 'success');
      document.getElementById('userModal').classList.remove('active');
      loadUsers(currentPage, currentSearch, currentStatus);
    } catch (error) {
      console.error('Error saving user:', error);
      showToast(error.message || 'Failed to save user', 'error');
    }
  });
}

// Setup event listeners
document.addEventListener('DOMContentLoaded', () => {
  // Load initial users
  loadUsers();

  // Add user button
  const addBtn = document.getElementById('addUserBtn');
  if (addBtn) {
    addBtn.addEventListener('click', openAddUserModal);
  }

  // Close modal buttons
  const closeBtn = document.getElementById('closeModal');
  const cancelBtn = document.getElementById('cancelBtn');
  const modal = document.getElementById('userModal');

  if (closeBtn) {
    closeBtn.addEventListener('click', () => {
      if (modal) modal.classList.remove('active');
    });
  }

  if (cancelBtn) {
    cancelBtn.addEventListener('click', () => {
      if (modal) modal.classList.remove('active');
    });
  }

  // Close modal on outside click
  if (modal) {
    modal.addEventListener('click', (e) => {
      if (e.target === modal) {
        modal.classList.remove('active');
      }
    });
  }

  // Search input
  const searchInput = document.getElementById('userSearch');
  if (searchInput) {
    let searchTimeout;
    searchInput.addEventListener('input', (e) => {
      clearTimeout(searchTimeout);
      searchTimeout = setTimeout(() => {
        loadUsers(1, e.target.value, currentStatus);
      }, 500);
    });
  }

  // Status filter
  const statusFilter = document.getElementById('statusFilter');
  if (statusFilter) {
    statusFilter.addEventListener('change', (e) => {
      loadUsers(1, currentSearch, e.target.value);
    });
  }

  // Setup form
  setupUserForm();
});

// Make functions global for onclick handlers
window.editUser = editUser;
window.deleteUser = deleteUser;
window.loadUsers = loadUsers;

