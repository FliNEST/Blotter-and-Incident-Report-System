// ============================================================
//  api.js  —  Drop this into your /js/ folder
//  Usage:  import { api, auth } from './api.js'  (or script tag)
// ============================================================

const BASE_URL = 'http://localhost:3000/api';

// ── Token helpers ─────────────────────────────────────────────
const getToken  = () => localStorage.getItem('token');
const getUser   = () => JSON.parse(localStorage.getItem('user') || 'null');
const setSession = (token, user) => {
  localStorage.setItem('token', token);
  localStorage.setItem('user',  JSON.stringify(user));
};
const clearSession = () => {
  localStorage.removeItem('token');
  localStorage.removeItem('user');
};

// ── Base fetch wrapper ────────────────────────────────────────
async function request(endpoint, options = {}) {
  const token = getToken();
  const headers = { 'Content-Type': 'application/json', ...(options.headers || {}) };
  if (token) headers['Authorization'] = `Bearer ${token}`;

  // If body is FormData, remove Content-Type (let browser set it)
  if (options.body instanceof FormData) delete headers['Content-Type'];

  const res = await fetch(BASE_URL + endpoint, { ...options, headers });
  const data = await res.json().catch(() => ({}));

  if (!res.ok) {
    if (res.status === 401) { clearSession(); window.location.href = '/login.html'; }
    throw new Error(data.message || `HTTP ${res.status}`);
  }
  return data;
}

// ── Auth API ──────────────────────────────────────────────────
const auth = {
  async login(email, password) {
    const data = await request('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password })
    });
    setSession(data.token, data.user);
    return data;
  },
  logout() {
    clearSession();
    window.location.href = '/login.html';
  },
  async me() {
    return request('/auth/me');
  },
  async changePassword(old_password, new_password) {
    return request('/auth/change-password', {
      method: 'PUT',
      body: JSON.stringify({ old_password, new_password })
    });
  },
  isLoggedIn: () => !!getToken(),
  getUser,
  getRole:    () => getUser()?.role || null,
};

// ── Blotter API ───────────────────────────────────────────────
const blotter = {
  // GET all (with optional filters: status, type, search, page, limit)
  list(params = {}) {
    const qs = new URLSearchParams(params).toString();
    return request(`/blotter${qs ? '?' + qs : ''}`);
  },
  // GET single
  get(id) { return request(`/blotter/${id}`); },

  // POST — submit new complaint (FormData for file uploads)
  submit(formData) {
    return request('/blotter', { method: 'POST', body: formData });
  },
  // PUT — update status
  updateStatus(id, status) {
    return request(`/blotter/${id}/status`, {
      method: 'PUT', body: JSON.stringify({ status })
    });
  },
  // PUT — assign to kagawad
  assign(id, assigned_to) {
    return request(`/blotter/${id}/assign`, {
      method: 'PUT', body: JSON.stringify({ assigned_to })
    });
  },
  // POST — add investigation note
  addNote(id, notes) {
    return request(`/blotter/${id}/notes`, {
      method: 'POST', body: JSON.stringify({ notes })
    });
  },
  // POST — upload attachments
  uploadFiles(id, formData) {
    return request(`/blotter/${id}/attachments`, { method: 'POST', body: formData });
  },
  // DELETE
  delete(id) { return request(`/blotter/${id}`, { method: 'DELETE' }); },
  // Dashboard stats
  stats() { return request('/blotter/stats/dashboard'); },
};

// ── Schedule API ──────────────────────────────────────────────
const schedules = {
  list()       { return request('/schedules'); },
  get(id)      { return request(`/schedules/${id}`); },
  create(data) { return request('/schedules', { method: 'POST', body: JSON.stringify(data) }); },
  update(id, data) { return request(`/schedules/${id}`, { method: 'PUT', body: JSON.stringify(data) }); },
  delete(id)   { return request(`/schedules/${id}`, { method: 'DELETE' }); },
};

// ── Users API (Admin) ─────────────────────────────────────────
const users = {
  list()             { return request('/users'); },
  get(id)            { return request(`/users/${id}`); },
  register(data)     { return request('/auth/register', { method: 'POST', body: JSON.stringify(data) }); },
  update(id, data)   { return request(`/users/${id}`, { method: 'PUT', body: JSON.stringify(data) }); },
  setStatus(id, status) {
    return request(`/users/${id}/status`, { method: 'PUT', body: JSON.stringify({ status }) });
  },
  delete(id)         { return request(`/users/${id}`, { method: 'DELETE' }); },
  stats()            { return request('/users/stats/summary'); },
};

// ── Role-based redirect on page load ─────────────────────────
function requireAuth(allowedRoles = []) {
  if (!auth.isLoggedIn()) { window.location.href = '/login.html'; return; }
  const role = auth.getRole();
  if (allowedRoles.length && !allowedRoles.includes(role)) {
    alert('Access denied. Redirecting to your dashboard.');
    redirectByRole(role);
  }
}
function redirectByRole(role) {
  const map = { admin: '/admin.html', captain: '/kagawad.html', kagawad: '/kagawad.html', resident: '/Resident.html' };
  window.location.href = map[role] || '/login.html';
}

// Export for use in other scripts
window.api    = { auth, blotter, schedules, users };
window.requireAuth  = requireAuth;
window.redirectByRole = redirectByRole;
