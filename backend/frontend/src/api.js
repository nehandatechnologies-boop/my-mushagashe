const API_BASE = 'http://localhost:5000/api';

const api = {
  // Auth
  login: (email, password) =>
    fetch(`${API_BASE}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    }).then(res => res.json()),

  register: (data) =>
    fetch(`${API_BASE}/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    }).then(res => res.json()),

  getProfile: (token) =>
    fetch(`${API_BASE}/profile`, {
      headers: { Authorization: `Bearer ${token}` },
    }).then(res => res.json()),

  // Applications
  submitApplication: (token, data) =>
    fetch(`${API_BASE}/applications`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(data),
    }).then(res => res.json()),

  getApplications: (token) =>
    fetch(`${API_BASE}/applications`, {
      headers: { Authorization: `Bearer ${token}` },
    }).then(res => res.json()),

  updateApplicationStatus: (token, id, status) =>
    fetch(`${API_BASE}/applications/${id}/status`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ status }),
    }).then(res => res.json()),

  // Updates
  getUpdates: () =>
    fetch(`${API_BASE}/updates`).then(res => res.json()),

  createUpdate: (token, data) =>
    fetch(`${API_BASE}/updates`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(data),
    }).then(res => res.json()),

  // Fees
  getFees: (token) =>
    fetch(`${API_BASE}/fees`, {
      headers: { Authorization: `Bearer ${token}` },
    }).then(res => res.json()),

  createFee: (token, data) =>
    fetch(`${API_BASE}/fees`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(data),
    }).then(res => res.json()),

  markFeePaid: (token, id) =>
    fetch(`${API_BASE}/fees/${id}/pay`, {
      method: 'PUT',
      headers: { Authorization: `Bearer ${token}` },
    }).then(res => res.json()),
};

export default api;
