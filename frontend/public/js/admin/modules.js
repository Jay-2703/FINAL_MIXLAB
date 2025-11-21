// Connected Admin Dashboard Script
// Replace your existing script with this

const API_BASE_URL = 'http://localhost:3000/api';

// State management
let modules = [];
let lessons = [];
let quizzes = [];
let instruments = [];

// ============ API SERVICE ============

class AdminAPI {
  constructor() {
    this.token = this.getToken();
  }

  getToken() {
    const cookieToken = document.cookie
      .split('; ')
      .find(row => row.startsWith('token='))
      ?.split('=')[1];
    return cookieToken || localStorage.getItem('token');
  }

  getHeaders() {
    const headers = { 'Content-Type': 'application/json' };
    if (this.token) headers['Authorization'] = `Bearer ${this.token}`;
    return headers;
  }

  async request(endpoint, options = {}) {
    try {
      const response = await fetch(`${API_BASE_URL}${endpoint}`, {
        ...options,
        headers: this.getHeaders(),
        credentials: 'include'
      });

      const data = await response.json();
      if (!response.ok) throw new Error(data.message || 'Request failed');
      return data;
    } catch (error) {
      console.error('API Error:', error);
      alert('Error: ' + error.message);
      throw error;
    }
  }

  // Module endpoints
  async getModules(params = {}) {
    const query = new URLSearchParams(params).toString();
    return this.request(`/admin/modules?${query}`);
  }

  async createModule(data) {
    return this.request('/admin/modules', {
      method: 'POST',
      body: JSON.stringify(data)
    });
  }

  async updateModule(id, data) {
    return this.request(`/admin/modules/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data)
    });
  }

  async deleteModule(id) {
    return this.request(`/admin/modules/${id}`, { method: 'DELETE' });
  }

  // Lesson endpoints
  async getLessons(params = {}) {
    const query = new URLSearchParams(params).toString();
    return this.request(`/admin/lessons?${query}`);
  }

  async createLesson(data) {
    return this.request('/admin/lessons', {
      method: 'POST',
      body: JSON.stringify(data)
    });
  }

  async updateLesson(id, data) {
    return this.request(`/admin/lessons/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data)
    });
  }

  async deleteLesson(id) {
    return this.request(`/admin/lessons/${id}`, { method: 'DELETE' });
  }

  // Quiz endpoints
  async getQuizzes(params = {}) {
    const query = new URLSearchParams(params).toString();
    return this.request(`/admin/quizzes?${query}`);
  }

  async createQuiz(data) {
    return this.request('/admin/quizzes', {
      method: 'POST',
      body: JSON.stringify(data)
    });
  }

  async updateQuiz(id, data) {
    return this.request(`/admin/quizzes/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data)
    });
  }

  async deleteQuiz(id) {
    return this.request(`/admin/quizzes/${id}`, { method: 'DELETE' });
  }

  // Get instruments
  async getInstruments() {
    return this.request('/lessons/instruments');
  }
}

const api = new AdminAPI();

// ============ INITIALIZATION ============

async function init() {
  try {
    showLoading();
    await loadInstruments();
    await loadModules();
    await loadLessons();
    await loadQuizzes();
    updateStats();
    hideLoading();
  } catch (error) {
    console.error('Init error:', error);
    hideLoading();
  }
}

async function loadInstruments() {
  try {
    const response = await api.getInstruments();
    if (response.success) {
      instruments = response.data || [];
    }
  } catch (error) {
    console.error('Error loading instruments:', error);
  }
}

// ============ MODULE FUNCTIONS ============

async function loadModules() {
  try {
    const response = await api.getModules({ limit: 100 });
    if (response.success) {
      modules = response.data.modules || [];
      renderModules();
    }
  } catch (error) {
    console.error('Error loading modules:', error);
  }
}

async function saveModule(formData) {
  try {
    showLoading();
    
    const moduleData = {
      instrument_id: parseInt(formData.instrument_id) || null,
      name: formData.name,
      description: formData.description || null,
      level: parseInt(formData.level) || 1,
      display_order: parseInt(formData.display_order) || 0,
      status: formData.status || 'active',
      service_type: formData.service_type || 'lesson',
      level_requirement: parseInt(formData.level_requirement) || 1
    };

    let response;
    if (formData.id) {
      response = await api.updateModule(formData.id, moduleData);
    } else {
      response = await api.createModule(moduleData);
    }

    if (response.success) {
      alert(response.message);
      await loadModules();
      closeForm();
    }
    hideLoading();
  } catch (error) {
    hideLoading();
  }
}

async function deleteModule(id) {
  if (!confirm('Are you sure you want to delete this module?')) return;
  
  try {
    showLoading();
    const response = await api.deleteModule(id);
    if (response.success) {
      alert(response.message);
      await loadModules();
    }
    hideLoading();
  } catch (error) {
    hideLoading();
  }
}

// ============ LESSON FUNCTIONS ============

async function loadLessons() {
  try {
    const response = await api.getLessons({ limit: 100 });
    if (response.success) {
      lessons = response.data.lessons || [];
      renderLessons();
    }
  } catch (error) {
    console.error('Error loading lessons:', error);
  }
}

async function saveLesson(formData) {
  try {
    showLoading();
    
    const lessonData = {
      module_id: parseInt(formData.module_id) || null,
      title: formData.name, // Using 'name' from form as 'title' for backend
      content: formData.description || null,
      images: formData.imageUrls ? formData.imageUrls.split(',').map(u => u.trim()).filter(u => u) : [],
      audio_url: formData.audioUrl || null,
      youtube_video_id: formData.videoUrl || null,
      points: parseInt(formData.points) || 10,
      display_order: parseInt(formData.display_order) || 0,
      status: formData.status || 'active'
    };

    let response;
    if (formData.id) {
      response = await api.updateLesson(formData.id, lessonData);
    } else {
      response = await api.createLesson(lessonData);
    }

    if (response.success) {
      alert(response.message);
      await loadLessons();
      closeForm();
    }
    hideLoading();
  } catch (error) {
    hideLoading();
  }
}

async function deleteLesson(id) {
  if (!confirm('Are you sure you want to delete this lesson?')) return;
  
  try {
    showLoading();
    const response = await api.deleteLesson(id);
    if (response.success) {
      alert(response.message);
      await loadLessons();
    }
    hideLoading();
  } catch (error) {
    hideLoading();
  }
}

// ============ QUIZ FUNCTIONS ============

async function loadQuizzes() {
  try {
    const response = await api.getQuizzes({ limit: 100 });
    if (response.success) {
      quizzes = response.data.quizzes || [];
      renderQuizzes();
    }
  } catch (error) {
    console.error('Error loading quizzes:', error);
  }
}

async function saveQuiz(formData) {
  try {
    showLoading();
    
    const quizData = {
      instrument_id: parseInt(formData.instrument_id) || null,
      level: parseInt(formData.level) || 1,
      title: formData.name,
      description: formData.description || null,
      questions: JSON.parse(formData.questions || '[]'),
      time_limit: parseInt(formData.time_limit) || 300,
      points_per_question: parseInt(formData.points_per_question) || 10,
      status: formData.status || 'active'
    };

    let response;
    if (formData.id) {
      response = await api.updateQuiz(formData.id, quizData);
    } else {
      response = await api.createQuiz(quizData);
    }

    if (response.success) {
      alert(response.message);
      await loadQuizzes();
      closeForm();
    }
    hideLoading();
  } catch (error) {
    hideLoading();
  }
}

async function deleteQuiz(id) {
  if (!confirm('Are you sure you want to delete this quiz?')) return;
  
  try {
    showLoading();
    const response = await api.deleteQuiz(id);
    if (response.success) {
      alert(response.message);
      await loadQuizzes();
    }
    hideLoading();
  } catch (error) {
    hideLoading();
  }
}

// ============ UI FUNCTIONS ============

function updateStats() {
  const total = modules.length + lessons.length + quizzes.length;
  const el = document.getElementById('totalItems');
  if (el) el.textContent = `${total} Items`;
}

function showTab(tab) {
  document.querySelectorAll('.tab-content').forEach(tc => tc.style.display = 'none');
  document.getElementById(tab).style.display = 'block';
  document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
  event.target.classList.add('active');
}

function openForm(type, id = null) {
  document.getElementById('popupForm').style.display = 'block';
  document.getElementById('overlay').style.display = 'block';
  document.getElementById('itemType').value = type;
  document.getElementById('itemId').value = id || '';
  document.getElementById('formTitle').innerText = id ? 
    `Edit ${type.charAt(0).toUpperCase() + type.slice(1)}` : 
    `Add ${type.charAt(0).toUpperCase() + type.slice(1)}`;
  
  // Reset form
  document.getElementById('name').value = '';
  document.getElementById('description').value = '';
  document.getElementById('level').value = '';
  document.getElementById('status').value = 'active';
  document.getElementById('videoUrl').value = '';
  document.getElementById('audioUrl').value = '';
  document.getElementById('imageUrls').value = '';
  document.getElementById('extra').value = '';
  
  // Load existing data if editing
  if (id) {
    let itemArray = type === 'module' ? modules : type === 'lesson' ? lessons : quizzes;
    let item = itemArray.find(i => i.id == id);
    if (item) {
      document.getElementById('name').value = item.name || item.title || '';
      document.getElementById('description').value = item.description || item.content || '';
      document.getElementById('level').value = item.level || '';
      document.getElementById('status').value = item.status || 'active';
      document.getElementById('videoUrl').value = item.videoUrl || item.youtube_video_id || '';
      document.getElementById('audioUrl').value = item.audioUrl || item.audio_url || '';
      
      if (item.images && Array.isArray(item.images)) {
        document.getElementById('imageUrls').value = item.images.join(', ');
      } else if (item.imageUrls) {
        document.getElementById('imageUrls').value = item.imageUrls.join(', ');
      }
      
      document.getElementById('extra').value = item.extra || '';
    }
  }
}

function closeForm() {
  document.getElementById('popupForm').style.display = 'none';
  document.getElementById('overlay').style.display = 'none';
}

function saveItem() {
  const type = document.getElementById('itemType').value;
  const id = document.getElementById('itemId').value;
  
  const formData = {
    id: id || null,
    name: document.getElementById('name').value,
    description: document.getElementById('description').value,
    level: document.getElementById('level').value,
    status: document.getElementById('status').value,
    videoUrl: document.getElementById('videoUrl').value,
    audioUrl: document.getElementById('audioUrl').value,
    imageUrls: document.getElementById('imageUrls').value,
    extra: document.getElementById('extra').value
  };

  if (type === 'module') {
    saveModule(formData);
  } else if (type === 'lesson') {
    saveLesson(formData);
  } else if (type === 'quiz') {
    saveQuiz(formData);
  }
}

function deleteItem(type, id) {
  if (type === 'module') deleteModule(id);
  else if (type === 'lesson') deleteLesson(id);
  else if (type === 'quiz') deleteQuiz(id);
}

function getStatusBadge(status) {
  const statusLower = (status || 'active').toLowerCase();
  return `<span class="status-badge ${statusLower}">${status || 'active'}</span>`;
}

function renderModules() {
  let tbody = document.getElementById('moduleTable')?.querySelector('tbody');
  if (!tbody) return;
  
  tbody.innerHTML = '';
  
  if (modules.length === 0) {
    tbody.innerHTML = `
      <tr>
        <td colspan="8">
          <div class="empty-state">
            <h3>No Modules Yet</h3>
            <p>Click "Add Module" to create your first module</p>
          </div>
        </td>
      </tr>`;
    return;
  }
  
  modules.forEach(m => {
    tbody.innerHTML += `
      <tr>
        <td><strong>#${m.id}</strong></td>
        <td><strong>${m.name}</strong></td>
        <td>${m.description || 'N/A'}</td>
        <td>${m.instrument_name || 'N/A'}</td>
        <td>Level ${m.level || 'N/A'}</td>
        <td>${getStatusBadge(m.status)}</td>
        <td>${m.service_type || 'lesson'}</td>
        <td>
          <button class="action-btn edit-btn" onclick="openForm('module', ${m.id})">Edit</button>
          <button class="action-btn delete-btn" onclick="deleteItem('module', ${m.id})">Delete</button>
        </td>
      </tr>`;
  });
}

function renderLessons() {
  let tbody = document.getElementById('lessonTable')?.querySelector('tbody');
  if (!tbody) return;
  
  tbody.innerHTML = '';
  
  if (lessons.length === 0) {
    tbody.innerHTML = `
      <tr>
        <td colspan="8">
          <div class="empty-state">
            <h3>No Lessons Yet</h3>
            <p>Click "Add Lesson" to create your first lesson</p>
          </div>
        </td>
      </tr>`;
    return;
  }
  
  lessons.forEach(l => {
    tbody.innerHTML += `
      <tr>
        <td><strong>#${l.id}</strong></td>
        <td><strong>${l.title}</strong></td>
        <td>${l.module_name || 'N/A'}</td>
        <td>${l.instrument_name || 'N/A'}</td>
        <td>${l.content ? l.content.substring(0, 50) + '...' : 'N/A'}</td>
        <td>${l.points || 10} pts</td>
        <td>${getStatusBadge(l.status)}</td>
        <td>
          <button class="action-btn edit-btn" onclick="openForm('lesson', ${l.id})">Edit</button>
          <button class="action-btn delete-btn" onclick="deleteItem('lesson', ${l.id})">Delete</button>
        </td>
      </tr>`;
  });
}

function renderQuizzes() {
  let tbody = document.getElementById('quizTable')?.querySelector('tbody');
  if (!tbody) return;
  
  tbody.innerHTML = '';
  
  if (quizzes.length === 0) {
    tbody.innerHTML = `
      <tr>
        <td colspan="7">
          <div class="empty-state">
            <h3>No Quizzes Yet</h3>
            <p>Click "Add Quiz" to create your first quiz</p>
          </div>
        </td>
      </tr>`;
    return;
  }
  
  quizzes.forEach(q => {
    tbody.innerHTML += `
      <tr>
        <td><strong>#${q.id}</strong></td>
        <td><strong>${q.title}</strong></td>
        <td>${q.instrument_name || 'N/A'}</td>
        <td>Level ${q.level || 'N/A'}</td>
        <td>${q.questions_count || 0} questions</td>
        <td>${getStatusBadge(q.status)}</td>
        <td>
          <button class="action-btn edit-btn" onclick="openForm('quiz', ${q.id})">Edit</button>
          <button class="action-btn delete-btn" onclick="deleteItem('quiz', ${q.id})">Delete</button>
        </td>
      </tr>`;
  });
}

function showLoading() {
  const loader = document.getElementById('loader');
  if (loader) loader.style.display = 'flex';
}

function hideLoading() {
  const loader = document.getElementById('loader');
  if (loader) loader.style.display = 'none';
}

// Initialize on page load
document.addEventListener('DOMContentLoaded', init);