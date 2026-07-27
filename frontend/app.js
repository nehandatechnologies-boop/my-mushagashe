// API Base URL
const API_BASE = 'http://localhost:5000/api';

// State Management
let currentUser = null;
let currentToken = null;
let currentPage = 'student-login';

// DOM Elements
const app = document.getElementById('app');

// Initialize App
function init() {
    const token = localStorage.getItem('token');
    const user = localStorage.getItem('user');
    
    if (token && user) {
        currentToken = token;
        currentUser = JSON.parse(user);
        
        if (currentUser.role === 'admin') {
            currentPage = 'admin';
        } else {
            currentPage = 'dashboard';
        }
    }
    
    render();
}

// Routing
function navigate(page) {
    currentPage = page;
    render();
}

// API Functions
async function apiRequest(endpoint, options = {}) {
    const url = `${API_BASE}${endpoint}`;
    const headers = {
        'Content-Type': 'application/json',
        ...options.headers
    };
    
    if (currentToken) {
        headers['Authorization'] = `Bearer ${currentToken}`;
    }
    
    try {
        console.log('Making request to:', url);
        const response = await fetch(url, {
            ...options,
            headers
        });
        
        console.log('Response status:', response.status);
        
        if (!response.ok) {
            const errorData = await response.json();
            console.error('API Error Response:', errorData);
            throw new Error(errorData.error || 'Request failed');
        }
        
        const data = await response.json();
        return data;
    } catch (error) {
        console.error('API Error:', error);
        throw error;
    }
}

// Auth Functions
async function studentLogin(studentNumber, password) {
    try {
        const response = await apiRequest('/auth/student/login', {
            method: 'POST',
            body: JSON.stringify({ student_number: studentNumber, password })
        });
        
        if (response.token) {
            currentToken = response.token;
            currentUser = response.user;
            localStorage.setItem('token', response.token);
            localStorage.setItem('user', JSON.stringify(response.user));
            navigate('dashboard');
        } else {
            return { error: response.error || 'Login failed' };
        }
    } catch (error) {
        return { error: 'An error occurred. Please try again.' };
    }
}

async function adminLogin(email, password) {
    try {
        const response = await apiRequest('/auth/admin/login', {
            method: 'POST',
            body: JSON.stringify({ email, password })
        });
        
        if (response.token) {
            currentToken = response.token;
            currentUser = response.user;
            localStorage.setItem('token', response.token);
            localStorage.setItem('user', JSON.stringify(response.user));
            navigate('admin');
        } else {
            return { error: response.error || 'Login failed' };
        }
    } catch (error) {
        return { error: 'An error occurred. Please try again.' };
    }
}

function logout() {
    currentToken = null;
    currentUser = null;
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    navigate('student-login');
}

// Render Functions
function render() {
    switch (currentPage) {
        case 'student-login':
            renderStudentLogin();
            break;
        case 'admin-login':
            renderAdminLogin();
            break;
        case 'dashboard':
            renderDashboard();
            break;
        case 'admin':
            renderAdminPanel();
            break;
        default:
            renderStudentLogin();
    }
}

// Student Login Page
function renderStudentLogin() {
    app.innerHTML = `
        <div class="login-container">
            <div class="login-card">
                <div class="login-header">
                    <div class="login-logo">🎓</div>
                    <h1>Mushagashe</h1>
                    <h2>Vocational Training Centre</h2>
                    <p>Student Portal</p>
                </div>
                <div id="login-error"></div>
                <form id="student-login-form">
                    <div class="form-group">
                        <label>Student Number</label>
                        <input type="text" id="student-number" placeholder="Enter your student number" required>
                    </div>
                    <div class="form-group">
                        <label>Password</label>
                        <input type="password" id="password" placeholder="Enter your password" required>
                    </div>
                    <button type="submit" class="btn btn-primary" style="width: 100%;">Sign In</button>
                </form>
                <div class="text-center mt-4">
                    <p>Staff? <a href="#" onclick="navigate('admin-login'); return false;" style="color: var(--purple-600); font-weight: 600;">Access Admin Portal</a></p>
                </div>
                <div class="text-center mt-4" style="font-size: 14px; color: var(--gray-500);">
                    <p>© <span class="copyright-year">2024</span> Mushagashe Vocational Training Centre</p>
                    <p>Financed by Ecobank</p>
                </div>
            </div>
        </div>
    `;
    
    document.getElementById('student-login-form').addEventListener('submit', async (e) => {
        e.preventDefault();
        const studentNumber = document.getElementById('student-number').value;
        const password = document.getElementById('password').value;
        
        const result = await studentLogin(studentNumber, password);
        if (result.error) {
            document.getElementById('login-error').innerHTML = `<div class="error">${result.error}</div>`;
        }
    });
}

// Admin Login Page
function renderAdminLogin() {
    app.innerHTML = `
        <div class="login-container">
            <div class="login-card">
                <div class="login-header">
                    <div class="login-logo" style="background: linear-gradient(135deg, var(--yellow-500), var(--yellow-600));">🛡️</div>
                    <h1>Mushagashe</h1>
                    <h2 style="color: var(--yellow-600);">Vocational Training Centre</h2>
                    <p>Admin Portal</p>
                </div>
                <div id="login-error"></div>
                <form id="admin-login-form">
                    <div class="form-group">
                        <label>Email Address</label>
                        <input type="email" id="email" placeholder="admin@mushagashe.edu" required>
                    </div>
                    <div class="form-group">
                        <label>Password</label>
                        <input type="password" id="password" placeholder="Enter your password" required>
                    </div>
                    <button type="submit" class="btn btn-secondary" style="width: 100%;">Sign In</button>
                </form>
                <div class="text-center mt-4">
                    <p>Student? <a href="#" onclick="navigate('student-login'); return false;" style="color: var(--yellow-600); font-weight: 600;">Access Student Portal</a></p>
                </div>
                <div class="card mt-4" style="background: var(--yellow-50); border-color: var(--yellow-200);">
                    <p style="font-weight: 600; color: var(--yellow-800); margin-bottom: 4px;">Demo Credentials:</p>
                    <p style="font-size: 14px; color: var(--yellow-700);">admin@mushagashe.edu / admin123</p>
                </div>
                <div class="text-center mt-4" style="font-size: 14px; color: var(--gray-500);">
                    <p>© <span class="copyright-year">2024</span> Mushagashe Vocational Training Centre</p>
                    <p>Financed by Ecobank</p>
                </div>
            </div>
        </div>
    `;
    
    document.getElementById('admin-login-form').addEventListener('submit', async (e) => {
        e.preventDefault();
        const email = document.getElementById('email').value;
        const password = document.getElementById('password').value;
        
        const result = await adminLogin(email, password);
        if (result.error) {
            document.getElementById('login-error').innerHTML = `<div class="error">${result.error}</div>`;
        }
    });
}

// Student Dashboard
async function renderDashboard() {
    if (!currentUser) {
        navigate('student-login');
        return;
    }
    
    app.innerHTML = `
        <header class="header">
            <div class="container header-content">
                <div class="logo">
                    <div class="logo-icon">🎓</div>
                    <div class="logo-text">
                        <h1>Mushagashe Vocational Training Centre</h1>
                        <p>Student Portal</p>
                    </div>
                </div>
                <div class="user-info">
                    <div class="user-details">
                        <p class="user-name">${currentUser.full_name}</p>
                        <p class="user-id">${currentUser.student_number}</p>
                    </div>
                    <button class="btn-logout" onclick="logout()">Logout</button>
                </div>
            </div>
        </header>
        <main class="container" style="padding: 32px 20px;">
            <div style="margin-bottom: 32px;">
                <h2 style="font-size: 32px; font-weight: bold; color: var(--gray-800); margin-bottom: 8px;">Welcome back, ${currentUser.full_name}!</h2>
                <p style="color: var(--gray-600);">Here's an overview of your academic journey</p>
            </div>
            <div id="dashboard-content">
                <div class="spinner"></div>
                <p class="text-center mt-4" style="color: var(--gray-600);">Loading your portal...</p>
            </div>
        </main>
        <footer class="footer">
            <div class="container">
                <p>© <span class="copyright-year">2024</span> Mushagashe Vocational Training Centre</p>
                <small>Financed by Ecobank</small>
            </div>
        </footer>
    `;
    
    try {
        const [fees, results, updates] = await Promise.all([
            apiRequest('/fees'),
            apiRequest('/results'),
            apiRequest('/updates')
        ]);
        
        const feesData = fees || [];
        const resultsData = results || [];
        const updatesData = updates || [];
        
        const outstandingBalance = feesData.filter(f => f.status === 'unpaid').reduce((sum, fee) => sum + fee.amount, 0);
        const allFeesPaid = feesData.length > 0 && feesData.every(f => f.status === 'paid');
        
        document.getElementById('dashboard-content').innerHTML = `
            <div class="stats-grid">
                <div class="stat-card">
                    <div class="stat-icon green">💰</div>
                    <div class="stat-value">$${outstandingBalance.toFixed(2)}</div>
                    <div class="stat-label">Outstanding Balance</div>
                </div>
                <div class="stat-card">
                    <div class="stat-icon purple">🏆</div>
                    <div class="stat-value">${resultsData.length}</div>
                    <div class="stat-label">Results Available</div>
                </div>
                <div class="stat-card">
                    <div class="stat-icon yellow">🔔</div>
                    <div class="stat-value">${updatesData.length}</div>
                    <div class="stat-label">Updates</div>
                </div>
            </div>
            
            <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(400px, 1fr)); gap: 32px; margin-bottom: 32px;">
                <div class="card">
                    <div style="display: flex; align-items: center; gap: 12px; margin-bottom: 24px;">
                        <div class="stat-icon green" style="width: 40px; height: 40px; font-size: 24px; margin-bottom: 0;">💰</div>
                        <h3 style="font-size: 20px; font-weight: bold; color: var(--gray-800);">Fee Status</h3>
                    </div>
                    ${feesData.length === 0 ? `
                        <div class="empty-state">
                            <div class="empty-state-icon">💰</div>
                            <p class="empty-state-text">No fee records found</p>
                        </div>
                    ` : feesData.map(fee => `
                        <div style="border: 1px solid var(--gray-200); border-radius: 12px; padding: 20px; margin-bottom: 16px;">
                            <div style="display: flex; justify-content: space-between; align-items: start; margin-bottom: 12px;">
                                <div>
                                    <h4 style="font-weight: 600; color: var(--gray-800); font-size: 18px;">${fee.description || 'Course Fee'}</h4>
                                    <p style="font-size: 24px; font-weight: bold; color: var(--purple-600);">$${fee.amount.toFixed(2)}</p>
                                </div>
                                <span class="badge ${fee.status === 'paid' ? 'badge-green' : 'badge-red'}">${fee.status.charAt(0).toUpperCase() + fee.status.slice(1)}</span>
                            </div>
                            ${fee.due_date ? `<p style="font-size: 14px; color: var(--gray-600);">Due: ${new Date(fee.due_date).toLocaleDateString()}</p>` : ''}
                        </div>
                    `).join('')}
                </div>
                
                <div class="card">
                    <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 24px;">
                        <div style="display: flex; align-items: center; gap: 12px;">
                            <div class="stat-icon purple" style="width: 40px; height: 40px; font-size: 24px; margin-bottom: 0;">🏆</div>
                            <h3 style="font-size: 20px; font-weight: bold; color: var(--gray-800);">My Results</h3>
                        </div>
                        ${allFeesPaid && resultsData.length > 0 ? `
                            <button class="btn btn-primary" onclick="downloadResults()">Download</button>
                        ` : ''}
                    </div>
                    ${!allFeesPaid ? `
                        <div class="empty-state" style="background: var(--yellow-50); border: 1px solid var(--yellow-200);">
                            <div class="empty-state-icon">🔒</div>
                            <p style="font-weight: 600; color: var(--yellow-800); margin-bottom: 4px;">Fee Payment Required</p>
                            <p class="empty-state-text">Complete all fee payments to view results</p>
                        </div>
                    ` : resultsData.length === 0 ? `
                        <div class="empty-state">
                            <div class="empty-state-icon">🏆</div>
                            <p class="empty-state-text">No results available yet</p>
                        </div>
                    ` : resultsData.map(result => `
                        <div style="border: 1px solid var(--gray-200); border-radius: 12px; padding: 20px; margin-bottom: 16px;">
                            <div style="display: flex; justify-content: space-between; align-items: start; margin-bottom: 12px;">
                                <div>
                                    <h4 style="font-weight: 600; color: var(--gray-800); font-size: 18px;">${result.course_name}</h4>
                                    <p style="font-size: 14px; color: var(--gray-600);">Semester: ${result.semester || 'N/A'} | Year: ${result.year || 'N/A'}</p>
                                </div>
                                <span class="badge badge-purple">${result.grade}</span>
                            </div>
                            <p style="font-size: 14px; color: var(--gray-600);"><strong>Score:</strong> ${result.score || 'N/A'}</p>
                            ${result.remarks ? `<p style="font-size: 14px; color: var(--gray-600); margin-top: 8px; background: var(--gray-50); padding: 12px; border-radius: 8px;"><strong>Remarks:</strong> ${result.remarks}</p>` : ''}
                        </div>
                    `).join('')}
                </div>
            </div>
            
            <div class="card">
                <div style="display: flex; align-items: center; gap: 12px; margin-bottom: 24px;">
                    <div class="stat-icon yellow" style="width: 40px; height: 40px; font-size: 24px; margin-bottom: 0;">🔔</div>
                    <h3 style="font-size: 20px; font-weight: bold; color: var(--gray-800);">Latest Updates</h3>
                </div>
                ${updatesData.length === 0 ? `
                    <div class="empty-state">
                        <div class="empty-state-icon">🔔</div>
                        <p class="empty-state-text">No updates available</p>
                    </div>
                ` : updatesData.map(update => `
                    <div style="border: 1px solid var(--gray-200); border-radius: 12px; padding: 20px; margin-bottom: 16px;">
                        <h4 style="font-weight: 600; color: var(--gray-800); font-size: 18px; margin-bottom: 8px;">${update.title}</h4>
                        <p style="color: var(--gray-600); margin-bottom: 12px;">${update.content}</p>
                        <p style="font-size: 14px; color: var(--gray-500);">Posted: ${new Date(update.created_at).toLocaleDateString()}</p>
                    </div>
                `).join('')}
            </div>
        `;
        
        // Store results for download
        window.currentResults = resultsData;
        
    } catch (error) {
        document.getElementById('dashboard-content').innerHTML = `
            <div class="error">Failed to load data. Please try again.</div>
        `;
    }
}

// Download Results
function downloadResults() {
    if (!window.currentResults || window.currentResults.length === 0) return;
    
    let content = `Mushagashe Vocational Training Centre - Student Results\n`;
    content += `Student: ${currentUser.full_name}\n`;
    content += `Student Number: ${currentUser.student_number}\n`;
    content += `Generated: ${new Date().toLocaleString()}\n\n`;
    content += `Results:\n`;
    content += `${'='.repeat(50)}\n`;
    
    window.currentResults.forEach((result, index) => {
        content += `${index + 1}. ${result.course_name}\n`;
        content += `   Grade: ${result.grade}\n`;
        content += `   Score: ${result.score || 'N/A'}\n`;
        content += `   Semester: ${result.semester || 'N/A'}\n`;
        content += `   Year: ${result.year || 'N/A'}\n`;
        content += `   Remarks: ${result.remarks || 'N/A'}\n\n`;
    });
    
    const blob = new Blob([content], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `results_${currentUser.student_number}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
}

// Admin Panel
let adminActiveTab = 'students';

async function renderAdminPanel() {
    if (!currentUser || currentUser.role !== 'admin') {
        navigate('admin-login');
        return;
    }
    
    app.innerHTML = `
        <header class="header">
            <div class="container header-content">
                <div class="logo">
                    <div class="logo-icon" style="background: linear-gradient(135deg, var(--yellow-500), var(--yellow-600));">🛡️</div>
                    <div class="logo-text">
                        <h1>Mushagashe Vocational Training Centre</h1>
                        <p>Admin Portal</p>
                    </div>
                </div>
                <div class="user-info">
                    <div class="user-details">
                        <p class="user-name">${currentUser.full_name}</p>
                        <p class="user-id">Administrator</p>
                    </div>
                    <button class="btn-logout" style="background: var(--yellow-100); color: var(--yellow-700);" onclick="logout()">Logout</button>
                </div>
            </div>
        </header>
        <main class="container" style="padding: 32px 20px;">
            <div style="margin-bottom: 32px;">
                <h2 style="font-size: 32px; font-weight: bold; color: var(--gray-800); margin-bottom: 8px;">Admin Dashboard</h2>
                <p style="color: var(--gray-600);">Manage students, fees, results, and announcements</p>
            </div>
            <div id="admin-content">
                <div class="spinner"></div>
                <p class="text-center mt-4" style="color: var(--gray-600);">Loading admin panel...</p>
            </div>
        </main>
        <footer class="footer">
            <div class="container">
                <p>© <span class="copyright-year">2024</span> Mushagashe Vocational Training Centre</p>
                <small>Financed by Ecobank</small>
            </div>
        </footer>
    `;
    
    try {
        const [students, fees, results, updates] = await Promise.all([
            apiRequest('/students'),
            apiRequest('/fees'),
            apiRequest('/results'),
            apiRequest('/updates')
        ]);
        
        const studentsData = students || [];
        const feesData = fees || [];
        const resultsData = results || [];
        const updatesData = updates || [];
        
        const totalFees = feesData.reduce((sum, fee) => sum + fee.amount, 0);
        
        renderAdminContent(studentsData, feesData, resultsData, updatesData, totalFees);
        
    } catch (error) {
        document.getElementById('admin-content').innerHTML = `
            <div class="error">Failed to load data. Please try again.</div>
        `;
    }
}

function renderAdminContent(students, fees, results, updates, totalFees) {
    const content = `
        <div class="stats-grid">
            <div class="stat-card">
                <div class="stat-icon purple">👥</div>
                <div class="stat-value">${students.length}</div>
                <div class="stat-label">Students</div>
            </div>
            <div class="stat-card">
                <div class="stat-icon green">💰</div>
                <div class="stat-value">$${totalFees.toFixed(2)}</div>
                <div class="stat-label">Total Fees</div>
            </div>
            <div class="stat-card">
                <div class="stat-icon yellow">🏆</div>
                <div class="stat-value">${results.length}</div>
                <div class="stat-label">Results</div>
            </div>
            <div class="stat-card">
                <div class="stat-icon purple">🔔</div>
                <div class="stat-value">${updates.length}</div>
                <div class="stat-label">Updates</div>
            </div>
        </div>
        
        <div class="card">
            <div class="tabs">
                <button class="tab ${adminActiveTab === 'students' ? 'active' : ''}" onclick="switchAdminTab('students')">Students</button>
                <button class="tab ${adminActiveTab === 'fees' ? 'active' : ''}" onclick="switchAdminTab('fees')">Fees</button>
                <button class="tab ${adminActiveTab === 'results' ? 'active' : ''}" onclick="switchAdminTab('results')">Results</button>
                <button class="tab ${adminActiveTab === 'updates' ? 'active' : ''}" onclick="switchAdminTab('updates')">Updates</button>
            </div>
            <div id="tab-content"></div>
        </div>
    `;
    
    document.getElementById('admin-content').innerHTML = content;
    
    // Store data for tab switching
    window.adminData = { students, fees, results, updates, totalFees };
    
    renderAdminTab();
}

function switchAdminTab(tab) {
    adminActiveTab = tab;
    renderAdminContent(
        window.adminData.students,
        window.adminData.fees,
        window.adminData.results,
        window.adminData.updates,
        window.adminData.totalFees
    );
}

function renderAdminTab() {
    const { students, fees, results, updates } = window.adminData;
    const tabContent = document.getElementById('tab-content');
    
    switch (adminActiveTab) {
        case 'students':
            renderStudentsTab(students, tabContent);
            break;
        case 'fees':
            renderFeesTab(fees, tabContent);
            break;
        case 'results':
            renderResultsTab(results, tabContent);
            break;
        case 'updates':
            renderUpdatesTab(updates, tabContent);
            break;
    }
}

function renderStudentsTab(students, container) {
    container.innerHTML = `
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 24px;">
            <h3 style="font-size: 20px; font-weight: bold; color: var(--gray-800);">Student Management</h3>
            <button class="btn btn-primary" onclick="showStudentModal()">Add Student</button>
        </div>
        ${students.length === 0 ? `
            <div class="empty-state">
                <div class="empty-state-icon">👥</div>
                <p class="empty-state-text">No students registered</p>
            </div>
        ` : students.map(student => `
            <div style="border: 1px solid var(--gray-200); border-radius: 12px; padding: 20px; margin-bottom: 16px; display: flex; justify-content: space-between; align-items: center;">
                <div style="display: flex; align-items: center; gap: 16px;">
                    <div style="width: 48px; height: 48px; background: var(--purple-100); border-radius: 12px; display: flex; align-items: center; justify-content: center; font-size: 24px;">🎓</div>
                    <div>
                        <h4 style="font-weight: 600; color: var(--gray-800); font-size: 18px;">${student.full_name}</h4>
                        <p style="font-size: 14px; color: var(--gray-600);">Student Number: ${student.student_number}</p>
                        <p style="font-size: 14px; color: var(--gray-600);">Phone: ${student.phone || 'N/A'}</p>
                    </div>
                </div>
                <button class="btn btn-danger" onclick="deleteStudent(${student.id})">Delete</button>
            </div>
        `).join('')}
    `;
}

function renderFeesTab(fees, container) {
    container.innerHTML = `
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 24px;">
            <h3 style="font-size: 20px; font-weight: bold; color: var(--gray-800);">Fee Management</h3>
            <button class="btn btn-success" onclick="showFeeModal()">Add Fee</button>
        </div>
        ${fees.length === 0 ? `
            <div class="empty-state">
                <div class="empty-state-icon">💰</div>
                <p class="empty-state-text">No fee records found</p>
            </div>
        ` : fees.map(fee => `
            <div style="border: 1px solid var(--gray-200); border-radius: 12px; padding: 20px; margin-bottom: 16px;">
                <div style="display: flex; justify-content: space-between; align-items: start; margin-bottom: 12px;">
                    <div>
                        <h4 style="font-weight: 600; color: var(--gray-800); font-size: 18px;">${fee.full_name} (${fee.student_number})</h4>
                        <p style="font-size: 24px; font-weight: bold; color: #16a34a;">$${fee.amount.toFixed(2)}</p>
                        <p style="font-size: 14px; color: var(--gray-600);">${fee.description || 'Course Fee'}</p>
                    </div>
                    <div style="display: flex; align-items: center; gap: 8px;">
                        <span class="badge ${fee.status === 'paid' ? 'badge-green' : 'badge-red'}">${fee.status.charAt(0).toUpperCase() + fee.status.slice(1)}</span>
                        ${fee.status === 'unpaid' ? `<button class="btn btn-success" onclick="markFeePaid(${fee.id})">Mark Paid</button>` : ''}
                        <button class="btn btn-danger" onclick="deleteFee(${fee.id})">Delete</button>
                    </div>
                </div>
                ${fee.due_date ? `<p style="font-size: 14px; color: var(--gray-600);">Due: ${new Date(fee.due_date).toLocaleDateString()}</p>` : ''}
            </div>
        `).join('')}
    `;
}

function renderResultsTab(results, container) {
    container.innerHTML = `
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 24px;">
            <h3 style="font-size: 20px; font-weight: bold; color: var(--gray-800);">Results Management</h3>
            <button class="btn btn-secondary" onclick="showResultModal()">Add Result</button>
        </div>
        ${results.length === 0 ? `
            <div class="empty-state">
                <div class="empty-state-icon">🏆</div>
                <p class="empty-state-text">No results posted</p>
            </div>
        ` : results.map(result => `
            <div style="border: 1px solid var(--gray-200); border-radius: 12px; padding: 20px; margin-bottom: 16px;">
                <div style="display: flex; justify-content: space-between; align-items: start; margin-bottom: 12px;">
                    <div>
                        <h4 style="font-weight: 600; color: var(--gray-800); font-size: 18px;">${result.course_name}</h4>
                        <p style="font-size: 14px; color: var(--gray-600);">Student: ${result.full_name} (${result.student_number})</p>
                        <p style="font-size: 14px; color: var(--gray-600);">Grade: ${result.grade} | Score: ${result.score || 'N/A'}</p>
                        <p style="font-size: 14px; color: var(--gray-600);">Semester: ${result.semester || 'N/A'} | Year: ${result.year || 'N/A'}</p>
                    </div>
                    <button class="btn btn-danger" onclick="deleteResult(${result.id})">Delete</button>
                </div>
            </div>
        `).join('')}
    `;
}

function renderUpdatesTab(updates, container) {
    container.innerHTML = `
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 24px;">
            <h3 style="font-size: 20px; font-weight: bold; color: var(--gray-800);">Announcements</h3>
            <button class="btn btn-primary" onclick="showUpdateModal()">Post Update</button>
        </div>
        ${updates.length === 0 ? `
            <div class="empty-state">
                <div class="empty-state-icon">🔔</div>
                <p class="empty-state-text">No updates posted</p>
            </div>
        ` : updates.map(update => `
            <div style="border: 1px solid var(--gray-200); border-radius: 12px; padding: 20px; margin-bottom: 16px;">
                <h4 style="font-weight: 600; color: var(--gray-800); font-size: 18px; margin-bottom: 8px;">${update.title}</h4>
                <p style="color: var(--gray-600); margin-bottom: 12px;">${update.content}</p>
                <p style="font-size: 14px; color: var(--gray-500);">Posted: ${new Date(update.created_at).toLocaleString()}</p>
            </div>
        `).join('')}
    `;
}

// Modal Functions
function showStudentModal() {
    const modal = document.createElement('div');
    modal.className = 'modal active';
    modal.innerHTML = `
        <div class="modal-content">
            <div class="modal-header">
                <h3>Add New Student</h3>
                <button class="modal-close" onclick="this.closest('.modal').remove()">×</button>
            </div>
            <form id="student-form">
                <div class="form-group">
                    <label>Student Number</label>
                    <input type="text" id="new-student-number" required>
                </div>
                <div class="form-group">
                    <label>Full Name</label>
                    <input type="text" id="new-student-name" required>
                </div>
                <div class="form-group">
                    <label>Phone</label>
                    <input type="text" id="new-student-phone">
                </div>
                <div class="form-group">
                    <label>Password</label>
                    <input type="password" id="new-student-password" required>
                </div>
                <div style="display: flex; gap: 12px; margin-top: 24px;">
                    <button type="submit" class="btn btn-primary" style="flex: 1;">Add Student</button>
                    <button type="button" class="btn" style="flex: 1; background: var(--gray-200);" onclick="this.closest('.modal').remove()">Cancel</button>
                </div>
            </form>
        </div>
    `;
    document.body.appendChild(modal);
    
    document.getElementById('student-form').addEventListener('submit', async (e) => {
        e.preventDefault();
        const studentNumber = document.getElementById('new-student-number').value;
        const fullName = document.getElementById('new-student-name').value;
        const phone = document.getElementById('new-student-phone').value;
        const password = document.getElementById('new-student-password').value;
        
        try {
            await apiRequest('/students', {
                method: 'POST',
                body: JSON.stringify({ student_number: studentNumber, full_name: fullName, phone, password })
            });
            modal.remove();
            renderAdminPanel();
        } catch (error) {
            alert('Failed to add student');
        }
    });
}

async function deleteStudent(id) {
    if (!confirm('Are you sure you want to delete this student?')) return;
    
    try {
        await apiRequest(`/students/${id}`, { method: 'DELETE' });
        renderAdminPanel();
    } catch (error) {
        alert('Failed to delete student');
    }
}

function showFeeModal() {
    const modal = document.createElement('div');
    modal.className = 'modal active';
    modal.innerHTML = `
        <div class="modal-content">
            <div class="modal-header">
                <h3>Add New Fee</h3>
                <button class="modal-close" onclick="this.closest('.modal').remove()">×</button>
            </div>
            <form id="fee-form">
                <div class="form-group">
                    <label>Student ID</label>
                    <input type="number" id="new-fee-user-id" required>
                </div>
                <div class="form-group">
                    <label>Amount</label>
                    <input type="number" step="0.01" id="new-fee-amount" required>
                </div>
                <div class="form-group">
                    <label>Description</label>
                    <input type="text" id="new-fee-description">
                </div>
                <div class="form-group">
                    <label>Due Date</label>
                    <input type="date" id="new-fee-due-date">
                </div>
                <div style="display: flex; gap: 12px; margin-top: 24px;">
                    <button type="submit" class="btn btn-success" style="flex: 1;">Add Fee</button>
                    <button type="button" class="btn" style="flex: 1; background: var(--gray-200);" onclick="this.closest('.modal').remove()">Cancel</button>
                </div>
            </form>
        </div>
    `;
    document.body.appendChild(modal);
    
    document.getElementById('fee-form').addEventListener('submit', async (e) => {
        e.preventDefault();
        const userId = document.getElementById('new-fee-user-id').value;
        const amount = parseFloat(document.getElementById('new-fee-amount').value);
        const description = document.getElementById('new-fee-description').value;
        const dueDate = document.getElementById('new-fee-due-date').value;
        
        try {
            await apiRequest('/fees', {
                method: 'POST',
                body: JSON.stringify({ user_id: userId, amount, description, due_date: dueDate })
            });
            modal.remove();
            renderAdminPanel();
        } catch (error) {
            alert('Failed to add fee');
        }
    });
}

async function markFeePaid(id) {
    try {
        await apiRequest(`/fees/${id}/pay`, { method: 'PUT' });
        renderAdminPanel();
    } catch (error) {
        alert('Failed to mark fee as paid');
    }
}

async function deleteFee(id) {
    if (!confirm('Are you sure you want to delete this fee?')) return;
    
    try {
        await apiRequest(`/fees/${id}`, { method: 'DELETE' });
        renderAdminPanel();
    } catch (error) {
        alert('Failed to delete fee');
    }
}

function showResultModal() {
    const modal = document.createElement('div');
    modal.className = 'modal active';
    modal.innerHTML = `
        <div class="modal-content">
            <div class="modal-header">
                <h3>Add New Result</h3>
                <button class="modal-close" onclick="this.closest('.modal').remove()">×</button>
            </div>
            <form id="result-form">
                <div class="form-group">
                    <label>Student ID</label>
                    <input type="number" id="new-result-user-id" required>
                </div>
                <div class="form-group">
                    <label>Course Name</label>
                    <input type="text" id="new-result-course" required>
                </div>
                <div class="form-group">
                    <label>Grade</label>
                    <input type="text" id="new-result-grade" required>
                </div>
                <div class="form-group">
                    <label>Score</label>
                    <input type="number" step="0.01" id="new-result-score">
                </div>
                <div class="form-group">
                    <label>Semester</label>
                    <input type="text" id="new-result-semester">
                </div>
                <div class="form-group">
                    <label>Year</label>
                    <input type="number" id="new-result-year">
                </div>
                <div class="form-group">
                    <label>Remarks</label>
                    <textarea id="new-result-remarks"></textarea>
                </div>
                <div style="display: flex; gap: 12px; margin-top: 24px;">
                    <button type="submit" class="btn btn-secondary" style="flex: 1;">Add Result</button>
                    <button type="button" class="btn" style="flex: 1; background: var(--gray-200);" onclick="this.closest('.modal').remove()">Cancel</button>
                </div>
            </form>
        </div>
    `;
    document.body.appendChild(modal);
    
    document.getElementById('result-form').addEventListener('submit', async (e) => {
        e.preventDefault();
        const userId = document.getElementById('new-result-user-id').value;
        const courseName = document.getElementById('new-result-course').value;
        const grade = document.getElementById('new-result-grade').value;
        const score = parseFloat(document.getElementById('new-result-score').value) || null;
        const semester = document.getElementById('new-result-semester').value;
        const year = parseInt(document.getElementById('new-result-year').value) || null;
        const remarks = document.getElementById('new-result-remarks').value;
        
        try {
            await apiRequest('/results', {
                method: 'POST',
                body: JSON.stringify({ user_id: userId, course_name: courseName, grade, score, semester, year, remarks })
            });
            modal.remove();
            renderAdminPanel();
        } catch (error) {
            alert('Failed to add result');
        }
    });
}

async function deleteResult(id) {
    if (!confirm('Are you sure you want to delete this result?')) return;
    
    try {
        await apiRequest(`/results/${id}`, { method: 'DELETE' });
        renderAdminPanel();
    } catch (error) {
        alert('Failed to delete result');
    }
}

function showUpdateModal() {
    const modal = document.createElement('div');
    modal.className = 'modal active';
    modal.innerHTML = `
        <div class="modal-content">
            <div class="modal-header">
                <h3>Post New Update</h3>
                <button class="modal-close" onclick="this.closest('.modal').remove()">×</button>
            </div>
            <form id="update-form">
                <div class="form-group">
                    <label>Title</label>
                    <input type="text" id="new-update-title" required>
                </div>
                <div class="form-group">
                    <label>Content</label>
                    <textarea id="new-update-content" required></textarea>
                </div>
                <div style="display: flex; gap: 12px; margin-top: 24px;">
                    <button type="submit" class="btn btn-primary" style="flex: 1;">Post Update</button>
                    <button type="button" class="btn" style="flex: 1; background: var(--gray-200);" onclick="this.closest('.modal').remove()">Cancel</button>
                </div>
            </form>
        </div>
    `;
    document.body.appendChild(modal);
    
    document.getElementById('update-form').addEventListener('submit', async (e) => {
        e.preventDefault();
        const title = document.getElementById('new-update-title').value;
        const content = document.getElementById('new-update-content').value;
        
        try {
            await apiRequest('/updates', {
                method: 'POST',
                body: JSON.stringify({ title, content })
            });
            modal.remove();
            renderAdminPanel();
        } catch (error) {
            alert('Failed to post update');
        }
    });
}

// Initialize the app
init();

// Update copyright year automatically
function updateCopyrightYear() {
    const currentYear = new Date().getFullYear();
    const copyrightElements = document.querySelectorAll('.copyright-year');
    copyrightElements.forEach(element => {
        element.textContent = currentYear;
    });
}

// Call copyright update after each render
const originalRender = render;
render = function() {
    originalRender();
    setTimeout(updateCopyrightYear, 100); // Small delay to ensure DOM is updated
};
