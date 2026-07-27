// API Configuration - Detect environment
const isNgrok = window.location.hostname.includes('ngrok-free.app') || window.location.hostname.includes('ngrok.io');
const isRender = window.location.hostname.includes('onrender.com');
const isFly = window.location.hostname.includes('fly.dev');
const isLocalhost = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';

let API_BASE;
if (isNgrok) {
  // For ngrok, use relative path since backend serves frontend
  API_BASE = '/api';
} else if (isRender) {
  API_BASE = 'https://mushagashe-backend.onrender.com/api';
} else if (isFly) {
  // For fly.io, use relative path since backend serves frontend
  API_BASE = '/api';
} else if (isLocalhost) {
  API_BASE = 'http://localhost:5000/api';
} else {
  // For other environments, try relative path first
  API_BASE = '/api';
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
    document.getElementById('success-message').style.display = 'none';
}

// Show success message
function showSuccess(message) {
    const successDiv = document.getElementById('success-message');
    successDiv.textContent = message;
    successDiv.style.display = 'block';
    document.getElementById('error-message').style.display = 'none';
}

// Hide messages
function hideMessages() {
    document.getElementById('error-message').style.display = 'none';
    document.getElementById('success-message').style.display = 'none';
}

// Set loading state
function setLoading(loading) {
    const form = document.getElementById('studentRegisterForm');
    const submitBtn = form.querySelector('button[type="submit"]');
    const btnText = submitBtn.querySelector('.btn-text');
    const btnLoader = submitBtn.querySelector('.btn-loader');

    submitBtn.disabled = loading;
    btnText.style.display = loading ? 'none' : 'inline';
    btnLoader.style.display = loading ? 'inline' : 'none';
}

// Student registration form handler
document.getElementById('studentRegisterForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    hideMessages();

    const formData = new FormData(e.target);
    const password = formData.get('password');
    const confirmPassword = formData.get('confirm_password');

    // Validate passwords match
    if (password !== confirmPassword) {
        showError('Passwords do not match');
        return;
    }

    const registerData = {
        full_name: formData.get('full_name'),
        student_number: formData.get('student_number'),
        email: formData.get('email'),
        phone: formData.get('phone'),
        gender: formData.get('gender'),
        national_id: formData.get('national_id'),
        date_of_birth: formData.get('date_of_birth'),
        address: formData.get('address'),
        guardian_name: formData.get('guardian_name'),
        guardian_phone: formData.get('guardian_phone'),
        intake_year: parseInt(formData.get('intake_year')),
        password: password
    };

    setLoading(true);

    try {
        const response = await apiRequest('/students/register', {
            method: 'POST',
            body: JSON.stringify(registerData)
        });

        showSuccess('Account created successfully! Redirecting to login...');
        
        // Redirect to login after 2 seconds
        setTimeout(() => {
            window.location.href = 'student-login.html';
        }, 2000);
    } catch (error) {
        showError(error.message || 'Registration failed. Please try again.');
    } finally {
        setLoading(false);
    }
});
