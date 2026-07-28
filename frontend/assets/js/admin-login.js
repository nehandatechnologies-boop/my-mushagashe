// API Configuration - Detect environment
const isNgrok = window.location.hostname.includes('ngrok-free.app') || window.location.hostname.includes('ngrok.io');
const isRender = window.location.hostname.includes('onrender.com');
const isLocalhost = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';

let API_BASE;
if (isNgrok) {
  // For ngrok, use relative path since backend serves frontend
  API_BASE = '/api';
} else if (isRender) {
  // For Render, use relative path since backend serves frontend
  API_BASE = '/api';
} else if (isLocalhost) {
  API_BASE = 'http://localhost:5000/api';
} else {
  // For other environments, try relative path first
  API_BASE = '/api';
}

// Toggle password visibility
function togglePassword(inputId) {
    const input = document.getElementById(inputId);
    input.type = input.type === 'password' ? 'text' : 'password';
}

// API Request helper
async function apiRequest(endpoint, options = {}) {
    const url = `${API_BASE}${endpoint}`;
    
    const defaultOptions = {
        headers: {
            'Content-Type': 'application/json'
        }
    };

    const finalOptions = { ...defaultOptions, ...options };

    try {
        const response = await fetch(url, finalOptions);
        const data = await response.json();

        if (!response.ok) {
            throw new Error(data.error || 'Request failed');
        }

        return data;
    } catch (error) {
        console.error('API Error:', error);
        throw error;
    }
}

// Show error message
function showError(message) {
    const errorDiv = document.getElementById('error-message');
    errorDiv.textContent = message;
    errorDiv.style.display = 'block';
}

// Hide error message
function hideError() {
    const errorDiv = document.getElementById('error-message');
    errorDiv.style.display = 'none';
}

// Set loading state
function setLoading(loading) {
    const form = document.getElementById('adminLoginForm');
    const submitBtn = form.querySelector('button[type="submit"]');
    const btnText = submitBtn.querySelector('.btn-text');
    const btnLoader = submitBtn.querySelector('.btn-loader');

    submitBtn.disabled = loading;
    btnText.style.display = loading ? 'none' : 'inline';
    btnLoader.style.display = loading ? 'inline' : 'none';
}

// Admin login form handler
document.getElementById('adminLoginForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    hideError();

    const formData = new FormData(e.target);
    const loginData = {
        email: formData.get('email'),
        password: formData.get('password')
    };

    setLoading(true);

    try {
        const response = await apiRequest('/auth/admin/login', {
            method: 'POST',
            body: JSON.stringify(loginData)
        });

        // Store token and user data
        localStorage.setItem('token', response.token);
        localStorage.setItem('user', JSON.stringify(response.user));

        // Redirect to dashboard
        window.location.href = 'admin-dashboard.html';
    } catch (error) {
        showError(error.message || 'Login failed. Please try again.');
    } finally {
        setLoading(false);
    }
});

// Check if already logged in
window.addEventListener('load', () => {
    const token = localStorage.getItem('token');
    const user = JSON.parse(localStorage.getItem('user') || '{}');

    if (token && user.role === 'admin') {
        window.location.href = 'admin-dashboard.html';
    }
});
