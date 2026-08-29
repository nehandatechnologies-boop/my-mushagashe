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
  // For Render, use relative path since backend serves frontend
  API_BASE = '/api';
} else if (isFly) {
  // For fly.io, use relative path since backend serves frontend
  API_BASE = '/api';
} else if (isLocalhost) {
  API_BASE = 'http://localhost:5000/api';
} else {
  // For other environments, try relative path first
  API_BASE = '/api';
}

// Get stored token and user data
const token = localStorage.getItem('token');
const user = JSON.parse(localStorage.getItem('user') || '{}');

// API Request helper with authentication
async function apiRequest(endpoint, options = {}) {
    const url = `${API_BASE}${endpoint}`;
    
    const defaultOptions = {
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
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

// Show toast notification
function showToast(message, type = 'success') {
    const toast = document.getElementById('toast');
    const toastMessage = document.getElementById('toastMessage');
    
    toastMessage.textContent = message;
    toast.style.display = 'block';
    toast.style.background = type === 'error' ? '#EF4444' : '#10B981';
    
    setTimeout(() => {
        toast.style.display = 'none';
    }, 3000);
}

function hideToast() {
    document.getElementById('toast').style.display = 'none';
}

// Page navigation
function navigateTo(page) {
    // Hide all pages
    document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
    
    // Show selected page
    document.getElementById(`${page}-page`).classList.add('active');
    
    // Update nav items
    document.querySelectorAll('.nav-item').forEach(item => {
        item.classList.remove('active');
        if (item.dataset.page === page) {
            item.classList.add('active');
        }
    });

    // Load page data
    loadPageData(page);
}

// Load page-specific data
async function loadPageData(page) {
    switch(page) {
        case 'overview':
            await loadDashboardData();
            break;
        case 'fees':
            await loadFees();
            break;
        case 'results':
            await loadResults();
            break;
        case 'announcements':
            await loadAnnouncements();
            break;
        case 'profile':
            await loadProfile();
            break;
    }
}

// Load dashboard overview data
async function loadDashboardData() {
    try {
        console.log('Loading student dashboard data...');
        const data = await apiRequest('/dashboard/student');
        console.log('Student dashboard data received:', data);
        
        // Update user info
        if (data.user) {
            document.getElementById('studentName').textContent = data.user.full_name;
            document.getElementById('headerStudentName').textContent = data.user.full_name;
            document.getElementById('studentNumber').textContent = data.user.student_number;
        }
        
        // Update stats
        document.getElementById('courseName').textContent = data.user?.course_name || 'Not assigned';
        document.getElementById('outstandingBalance').textContent = `$${(data.fees?.outstanding_balance || 0).toFixed(2)}`;
        document.getElementById('gpa').textContent = (data.results?.gpa || 0).toFixed(2);
        
        // Load announcements
        loadAnnouncementsList(data.announcements || []);
        
        // Load recent results
        await loadRecentResults();
        
    } catch (error) {
        console.error('Error loading dashboard data:', error);
        // Set default values on error
        document.getElementById('courseName').textContent = 'Not assigned';
        document.getElementById('outstandingBalance').textContent = '$0.00';
        document.getElementById('gpa').textContent = '0.00';
        showToast('Failed to load dashboard data', 'error');
    }
}

// Load announcements list
function loadAnnouncementsList(announcements) {
    const container = document.getElementById('announcementsList');
    
    if (!announcements || announcements.length === 0) {
        container.innerHTML = `
            <div class="empty-state">
                <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"></path>
                    <path d="M13.73 21a2 2 0 0 1-3.46 0"></path>
                </svg>
                <p>No announcements yet</p>
            </div>
        `;
        return;
    }

    container.innerHTML = announcements.map(announcement => {
        return `
        <div class="announcement-item ${announcement.priority}">
            <div class="announcement-title">${announcement.title}</div>
            <div class="announcement-message">${announcement.message}</div>
            <div class="announcement-meta">${new Date(announcement.created_at).toLocaleDateString()}</div>
        </div>
    `;
    }).join('');
}

// Load recent results
async function loadRecentResults() {
    try {
        const results = await apiRequest('/results');
        const container = document.getElementById('recentResults');
        
        if (!results || results.length === 0) {
            container.innerHTML = `
                <div class="empty-state">
                    <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
                    </svg>
                    <p>No results available</p>
                </div>
            `;
            return;
        }

        container.innerHTML = results.slice(0, 5).map(result => `
            <div class="result-item">
                <span class="result-course">${result.course_name}</span>
                <span class="result-grade ${result.grade}">${result.grade}</span>
            </div>
        `).join('');
    } catch (error) {
        console.error('Error loading results:', error);
    }
}

// Load fees
async function loadFees() {
    try {
        const fees = await apiRequest('/fees');
        const tbody = document.getElementById('feesTableBody');
        
        if (!fees || fees.length === 0) {
            tbody.innerHTML = '<tr><td colspan="6" class="text-center">No fees found</td></tr>';
            return;
        }

        tbody.innerHTML = fees.map(fee => `
            <tr>
                <td>${fee.description || fee.fee_category}</td>
                <td>$${fee.amount.toFixed(2)}</td>
                <td>$${(fee.amount_paid || 0).toFixed(2)}</td>
                <td>$${fee.balance.toFixed(2)}</td>
                <td><span class="status-badge status-${fee.status}">${fee.status}</span></td>
                <td>${fee.due_date ? new Date(fee.due_date).toLocaleDateString() : 'N/A'}</td>
            </tr>
        `).join('');
    } catch (error) {
        console.error('Error loading fees:', error);
        showToast('Failed to load fees', 'error');
    }
}

// Load results
async function loadResults() {
    try {
        const results = await apiRequest('/results');
        const tbody = document.getElementById('resultsTableBody');
        
        if (!results || results.length === 0) {
            tbody.innerHTML = '<tr><td colspan="7" class="text-center">No results found</td></tr>';
            return;
        }

        tbody.innerHTML = results.map(result => `
            <tr>
                <td>${result.course_name}</td>
                <td>${result.semester}</td>
                <td>${result.academic_year}</td>
                <td>${result.assessment_mark || 'N/A'}</td>
                <td>${result.exam_mark || 'N/A'}</td>
                <td>${result.final_mark || 'N/A'}</td>
                <td><span class="result-grade ${result.grade}">${result.grade}</span></td>
            </tr>
        `).join('');
    } catch (error) {
        console.error('Error loading results:', error);
        showToast('Failed to load results', 'error');
    }
}

// Download PDF results
document.getElementById('downloadPDFBtn').addEventListener('click', async () => {
    const semester = document.getElementById('termSelect').value;
    const academicYear = document.getElementById('yearSelect').value;

    if (!semester || !academicYear) {
        showToast('Please select both term and year', 'error');
        return;
    }

    try {
        const url = `${API_BASE}/results/download/pdf?semester=${semester}&academic_year=${academicYear}`;
        
        const response = await fetch(url, {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });

        if (!response.ok) {
            const error = await response.json();
            
            // Handle outstanding fees error specifically
            if (response.status === 403 && error.outstanding_balance !== undefined) {
                showToast(error.message || 'Outstanding fees must be paid before downloading results', 'error');
                // Optionally show a more detailed message or redirect to fees page
                console.error('Outstanding balance:', error.outstanding_balance);
                return;
            }
            
            throw new Error(error.error || 'Failed to download PDF');
        }

        // Create blob and download
        const blob = await response.blob();
        const downloadUrl = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = downloadUrl;
        a.download = `results_${user.student_number}_term${semester}_${academicYear}.pdf`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        window.URL.revokeObjectURL(downloadUrl);

        showToast('PDF downloaded successfully');
    } catch (error) {
        console.error('Error downloading PDF:', error);
        showToast(error.message || 'Failed to download PDF', 'error');
    }
});

// Load announcements
async function loadAnnouncements() {
    try {
        const announcements = await apiRequest('/announcements');
        const container = document.getElementById('allAnnouncements');
        
        if (!announcements || announcements.length === 0) {
            container.innerHTML = `
                <div class="empty-state">
                    <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"></path>
                        <path d="M13.73 21a2 2 0 0 1-3.46 0"></path>
                    </svg>
                    <p>No announcements yet</p>
                </div>
            `;
            return;
        }

        container.innerHTML = announcements.map(announcement => `
            <div class="announcement-item ${announcement.priority}">
                <div class="announcement-title">${announcement.title}</div>
                <div class="announcement-message">${announcement.message}</div>
                <div class="announcement-meta">
                    ${new Date(announcement.created_at).toLocaleString()} • 
                    Priority: ${announcement.priority}
                </div>
            </div>
        `).join('');
    } catch (error) {
        console.error('Error loading announcements:', error);
        showToast('Failed to load announcements', 'error');
    }
}

// Load profile
async function loadProfile() {
    try {
        const profile = await apiRequest('/auth/profile');
        
        document.getElementById('profileFullName').value = profile.full_name;
        document.getElementById('profileStudentNumber').value = profile.student_number;
        document.getElementById('profileCourse').value = profile.course_name || 'Not assigned';
        document.getElementById('profilePhone').value = profile.phone || '';
        document.getElementById('profileEmail').value = profile.email || '';
        document.getElementById('profileGuardianPhone').value = profile.guardian_phone || '';
        
        // Display profile picture
        const profilePictureContainer = document.getElementById('profilePictureDisplay');
        if (profilePictureContainer) {
            if (profile.profile_picture_url) {
                profilePictureContainer.innerHTML = `<img src="${profile.profile_picture_url}" alt="Profile Picture" style="width: 200px; height: 200px; border-radius: 50%; object-fit: cover;">`;
            } else {
                profilePictureContainer.innerHTML = `<div style="width: 200px; height: 200px; border-radius: 50%; background: #ddd; display: flex; align-items: center; justify-content: center; font-size: 60px; color: #666;">${profile.full_name.charAt(0).toUpperCase()}</div>`;
            }
        }
    } catch (error) {
        console.error('Error loading profile:', error);
        showToast('Failed to load profile', 'error');
    }
}

// Profile form handler
document.getElementById('profileForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const updateData = {
        phone: document.getElementById('profilePhone').value,
        guardian_phone: document.getElementById('profileGuardianPhone').value
    };

    try {
        await apiRequest('/auth/profile', {
            method: 'PUT',
            body: JSON.stringify(updateData)
        });
        
        showToast('Profile updated successfully');
    } catch (error) {
        console.error('Error updating profile:', error);
        showToast('Failed to update profile', 'error');
    }
});

// Password form handler
document.getElementById('passwordForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const currentPassword = document.getElementById('currentPassword').value;
    const newPassword = document.getElementById('newPassword').value;
    const confirmPassword = document.getElementById('confirmPassword').value;

    if (newPassword !== confirmPassword) {
        showToast('Passwords do not match', 'error');
        return;
    }

    try {
        await apiRequest('/auth/change-password', {
            method: 'PUT',
            body: JSON.stringify({
                current_password: currentPassword,
                new_password: newPassword
            })
        });
        
        showToast('Password changed successfully');
        e.target.reset();
    } catch (error) {
        console.error('Error changing password:', error);
        showToast('Failed to change password', 'error');
    }
});

// Change password handler
document.getElementById('changePasswordBtn').addEventListener('click', () => {
    showChangePasswordModal();
});

// Show change password modal
function showChangePasswordModal() {
    const modalHtml = `
        <div class="modal-backdrop" onclick="closeModal()">
            <div class="modal-content" onclick="event.stopPropagation()">
                <div class="modal-header">
                    <h2>Change Password</h2>
                    <button class="modal-close" onclick="closeModal()">&times;</button>
                </div>
                <div class="modal-body">
                    <form id="changePasswordForm">
                        <div class="form-group">
                            <label for="current_password">Current Password *</label>
                            <input type="password" id="current_password" name="current_password" required>
                        </div>
                        <div class="form-group">
                            <label for="new_password">New Password *</label>
                            <input type="password" id="new_password" name="new_password" required minlength="6">
                        </div>
                        <div class="form-group">
                            <label for="confirm_password">Confirm New Password *</label>
                            <input type="password" id="confirm_password" name="confirm_password" required minlength="6">
                        </div>
                        <button type="submit" class="btn btn-primary">Change Password</button>
                    </form>
                </div>
            </div>
        </div>
    `;
    
    document.getElementById('modalContainer').innerHTML = modalHtml;
    document.getElementById('modalContainer').style.display = 'flex';
    
    document.getElementById('changePasswordForm').addEventListener('submit', async (e) => {
        e.preventDefault();
        const currentPassword = document.getElementById('current_password').value;
        const newPassword = document.getElementById('new_password').value;
        const confirmPassword = document.getElementById('confirm_password').value;
        
        if (newPassword !== confirmPassword) {
            showToast('Passwords do not match', 'error');
            return;
        }
        
        try {
            await apiRequest('/auth/change-password', {
                method: 'PUT',
                body: JSON.stringify({
                    current_password: currentPassword,
                    new_password: newPassword
                })
            });
            showToast('Password changed successfully');
            closeModal();
        } catch (error) {
            showToast(error.message || 'Failed to change password', 'error');
        }
    });
}

// Close modal
function closeModal() {
    document.getElementById('modalContainer').style.display = 'none';
}

// Logout handler
document.getElementById('logoutBtn').addEventListener('click', () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    window.location.href = 'index.html';
});

// Navigation click handlers
document.querySelectorAll('.nav-item').forEach(item => {
    item.addEventListener('click', (e) => {
        e.preventDefault();
        const page = item.dataset.page;
        navigateTo(page);
    });
});

// View all links
document.querySelectorAll('.view-all').forEach(link => {
    link.addEventListener('click', (e) => {
        e.preventDefault();
        const page = link.dataset.page;
        navigateTo(page);
    });
});

// Check authentication on load
window.addEventListener('load', () => {
    if (!token || user.role !== 'student') {
        window.location.href = 'student-login.html';
        return;
    }

    // Load initial data
    loadDashboardData();
});
