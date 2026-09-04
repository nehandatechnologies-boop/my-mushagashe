const API_BASE = 'https://my-mushagashe.onrender.com/api';

async function apiRequest(endpoint, options = {}) {
    const token = localStorage.getItem('token');
    const headers = {
        'Content-Type': 'application/json',
        ...(token && { 'Authorization': `Bearer ${token}` })
    };

    const response = await fetch(`${API_BASE}${endpoint}`, {
        ...options,
        headers: {
            ...headers,
            ...options.headers
        }
    });

    if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Request failed');
    }

    return response.json();
}

function togglePassword(inputId) {
    const input = document.getElementById(inputId);
    const type = input.type === 'password' ? 'text' : 'password';
    input.type = type;
}

function showError(message) {
    const errorDiv = document.getElementById('error-message');
    errorDiv.textContent = message;
    errorDiv.style.display = 'block';
}

function hideError() {
    const errorDiv = document.getElementById('error-message');
    errorDiv.style.display = 'none';
}

// Load saved email if remember me was checked
function loadSavedEmail() {
    const savedEmail = localStorage.getItem('lecturer_email');
    const rememberMe = localStorage.getItem('lecturer_remember_me');
    
    if (savedEmail && rememberMe === 'true') {
        document.getElementById('email').value = savedEmail;
        document.querySelector('input[name="remember"]').checked = true;
    }
}

// Save email if remember me is checked
function saveEmail(email, remember) {
    if (remember) {
        localStorage.setItem('lecturer_email', email);
        localStorage.setItem('lecturer_remember_me', 'true');
    } else {
        localStorage.removeItem('lecturer_email');
        localStorage.removeItem('lecturer_remember_me');
    }
}

// Forgot password handler
document.querySelector('.forgot-link').addEventListener('click', (e) => {
    e.preventDefault();
    alert('To reset your password, please contact the IT Support Desk:\n\nEmail: support@mushagashe.edu\nPhone: +263-77-123-4567\n\nOffice hours: Monday - Friday, 8:00 AM - 5:00 PM');
});

document.getElementById('lecturerLoginForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    hideError();

    const formData = new FormData(e.target);
    const loginData = Object.fromEntries(formData);
    const rememberMe = e.target.querySelector('input[name="remember"]').checked;

    const submitBtn = e.target.querySelector('button[type="submit"]');
    const btnText = submitBtn.querySelector('.btn-text');
    const btnLoader = submitBtn.querySelector('.btn-loader');

    submitBtn.disabled = true;
    btnText.style.display = 'none';
    btnLoader.style.display = 'inline-block';

    try {
        const response = await apiRequest('/auth/lecturer/login', {
            method: 'POST',
            body: JSON.stringify({
                email: loginData.email,
                password: loginData.password
            })
        });

        // Save email if remember me is checked
        saveEmail(loginData.email, rememberMe);

        localStorage.setItem('token', response.token);
        localStorage.setItem('auth_type', response.auth_type || 'custom');
        if (response.refresh_token) {
            localStorage.setItem('refresh_token', response.refresh_token);
        }
        localStorage.setItem('user', JSON.stringify(response.user));

        window.location.href = 'lecturer-dashboard.html';
    } catch (error) {
        showError(error.message);
    } finally {
        submitBtn.disabled = false;
        btnText.style.display = 'inline';
        btnLoader.style.display = 'none';
    }
});

// Load saved email on page load
loadSavedEmail();
