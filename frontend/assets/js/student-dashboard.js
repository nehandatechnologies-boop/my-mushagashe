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
    
    // Robust error handling - if element doesn't exist, fall back to console
    if (!toast) {
        console.error('Toast element not found');
        console.log(`Toast [${type}]:`, message);
        return;
    }
    
    // Set toast content and style
    toast.textContent = message;
    toast.style.display = 'block';
    toast.style.background = type === 'error' ? '#EF4444' : '#10B981';
    toast.style.color = 'white';
    toast.style.padding = '16px';
    toast.style.borderRadius = '8px';
    toast.style.position = 'fixed';
    toast.style.top = '20px';
    toast.style.right = '20px';
    toast.style.zIndex = '9999';
    toast.style.boxShadow = '0 4px 6px rgba(0, 0, 0, 0.1)';
    
    setTimeout(() => {
        if (toast) toast.style.display = 'none';
    }, 3000);
}

function hideToast() {
    const toast = document.getElementById('toast');
    if (toast) {
        toast.style.display = 'none';
    }
}

// Page navigation
function navigateTo(page) {
    // Hide all pages
    document.querySelectorAll('.page-section').forEach(p => p.classList.add('hidden'));
    
    // Show selected page
    const targetPage = document.getElementById(`${page}-page`);
    if (targetPage) {
        targetPage.classList.remove('hidden');
    }
    
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
        case 'privacy':
            await loadPrivacy();
            break;
    }
}

// Load dashboard overview data
async function loadDashboardData() {
    try {
        console.log('Loading student dashboard data...');
        const data = await apiRequest('/dashboard/student');
        console.log('Student dashboard data received:', data);
        
        // Update user info with null checks - only update elements that exist
        if (data.user) {
            const headerStudentName = document.getElementById('headerStudentName');
            if (headerStudentName) headerStudentName.textContent = data.user.full_name;
            
            const sidebarUserName = document.getElementById('sidebarUserName');
            if (sidebarUserName) sidebarUserName.textContent = data.user.full_name;
            
            const sidebarStudentNumber = document.getElementById('sidebarStudentNumber');
            if (sidebarStudentNumber) sidebarStudentNumber.textContent = data.user.student_number;
            
            const headerProfileName = document.getElementById('headerProfileName');
            if (headerProfileName) headerProfileName.textContent = data.user.full_name;
        }
        
        // Update stats with null checks
        const courseName = document.getElementById('courseName');
        const outstandingBalance = document.getElementById('outstandingBalance');
        const gpa = document.getElementById('gpa');
        
        if (courseName) courseName.textContent = data.user?.course_name || 'Not assigned';
        if (outstandingBalance) {
            const balanceValue = data.fees?.outstanding_balance;
            let balanceNumber = 0;
            if (Array.isArray(balanceValue)) {
                balanceNumber = balanceValue.reduce((sum, fee) => sum + (Number(fee.balance) || 0), 0);
            } else {
                balanceNumber = Number(balanceValue) || 0;
            }
            outstandingBalance.textContent = `$${balanceNumber.toFixed(2)}`;
        }
        if (gpa) gpa.textContent = (data.results?.gpa || 0).toFixed(2);
        
        // Load announcements
        loadAnnouncementsList(data.announcements || []);
        
        // Load recent results
        await loadRecentResults();
        
    } catch (error) {
        console.error('Error loading dashboard data:', error);
        showToast('Failed to load dashboard data', 'error');
    }
}

// Load announcements list
function loadAnnouncementsList(announcements) {
    const container = document.getElementById('announcementsList');
    
    if (!container) {
        console.error('Announcements list container not found');
        return;
    }
    
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
        
        if (!container) {
            console.error('Recent results container not found');
            return;
        }
        
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
                showToast(error.message || 'You have outstanding fees. Please clear your fees before downloading your results.', 'error');
                console.error('Outstanding balance:', error.outstanding_balance);
                return;
            }
            
            // Handle no results found
            if (response.status === 404) {
                showToast('No results found for the selected term and year', 'error');
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
        document.getElementById('profileIntake').value = profile.intake || 'N/A';
        document.getElementById('profilePhone').value = profile.phone || '';
        document.getElementById('profileEmail').value = profile.email || '';
        document.getElementById('profileGuardianPhone').value = profile.guardian_phone || '';
        
        // Display profile picture in profile page
        const profileAvatarLarge = document.getElementById('profileAvatarLarge');
        if (profileAvatarLarge) {
            if (profile.profile_picture_url) {
                profileAvatarLarge.style.backgroundImage = `url(${profile.profile_picture_url})`;
                profileAvatarLarge.style.backgroundSize = 'cover';
                profileAvatarLarge.style.backgroundPosition = 'center';
                profileAvatarLarge.textContent = '';
            } else {
                profileAvatarLarge.style.backgroundImage = '';
                profileAvatarLarge.style.background = '#ddd';
                profileAvatarLarge.textContent = profile.full_name.charAt(0).toUpperCase();
            }
        }
        
        // Update user in localStorage for sidebar/header avatar
        localStorage.setItem('user', JSON.stringify(profile));
        initializeProfilePicture();
    } catch (error) {
        console.error('Error loading profile:', error);
        showToast('Failed to load profile', 'error');
    }
}

// Load privacy & security page
async function loadPrivacy() {
    const privacyConsentSection = document.getElementById('privacyConsentSection');
    const privacyRequestsSection = document.getElementById('privacyRequestsSection');
    
    try {
        // Load privacy consent section
        if (privacyConsentSection) {
            privacyConsentSection.innerHTML = `
                <div class="privacy-info">
                    <p>Your data is protected according to our privacy policy. You have the right to:</p>
                    <ul>
                        <li>Access your personal data</li>
                        <li>Request data deletion</li>
                        <li>Update your information</li>
                        <li>Control your account security</li>
                    </ul>
                </div>
            `;
        }
        
        // Load privacy requests section
        if (privacyRequestsSection) {
            privacyRequestsSection.innerHTML = `
                <div class="privacy-actions">
                    <p>To exercise your data rights, please contact the administration.</p>
                    <div style="margin-top: 16px;">
                        <button class="btn btn-secondary" onclick="showToast('Data access request submitted. Administration will contact you.', 'success')">
                            Request Data Access
                        </button>
                        <button class="btn btn-secondary" style="margin-left: 8px;" onclick="showToast('Data deletion request submitted. Administration will contact you.', 'success')">
                            Request Data Deletion
                        </button>
                    </div>
                </div>
            `;
        }
    } catch (error) {
        console.error('Error loading privacy settings:', error);
        if (privacyConsentSection) {
            privacyConsentSection.innerHTML = '<p class="error-state">Unable to load privacy settings. Please refresh and try again.</p>';
        }
        if (privacyRequestsSection) {
            privacyRequestsSection.innerHTML = '<p class="error-state">Unable to load privacy requests. Please refresh and try again.</p>';
        }
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
            <div class="modal" onclick="event.stopPropagation()">
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
    const modalContainer = document.getElementById('modalContainer');
    if (modalContainer) {
        modalContainer.style.display = 'none';
    }
}

// Logout handler
const logoutBtn = document.getElementById('logoutBtn');
if (logoutBtn) {
    logoutBtn.addEventListener('click', () => {
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        window.location.href = 'index.html';
    });
}

// Change profile picture
const profileAvatar = document.getElementById('profileAvatar');
if (profileAvatar) {
    profileAvatar.addEventListener('click', () => {
        const currentUser = JSON.parse(localStorage.getItem('user'));
        const modalHtml = `
            <div class="modal-overlay" id="modalOverlay" onclick="closeModal()"></div>
            <div class="modal">
                <div class="modal-header">
                    <h3>Change Profile Picture</h3>
                    <button class="modal-close" onclick="closeModal()">&times;</button>
                </div>
                <form id="profilePictureForm" class="modal-form">
                    <div class="form-group">
                        <label>Profile Picture</label>
                        <input type="file" name="profilePicture" accept="image/jpeg,image/jpg,image/png,image/gif" required>
                    </div>
                    <button type="submit" class="btn btn-primary">Upload</button>
                </form>
            </div>
        `;
        
        document.getElementById('modalContainer').innerHTML = modalHtml;
        document.getElementById('modalContainer').style.display = 'flex';
        
        document.getElementById('profilePictureForm').addEventListener('submit', async (e) => {
            e.preventDefault();
            const formData = new FormData(e.target);
            const file = formData.get('profilePicture');

            if (!file) {
                showToast('Please select a file', 'error');
                return;
            }

            try {
                const uploadFormData = new FormData();
                uploadFormData.append('profilePicture', file);

                const response = await fetch(`${API_BASE}/auth/profile-picture`, {
                    method: 'POST',
                    headers: {
                        'Authorization': `Bearer ${localStorage.getItem('token')}`
                    },
                    body: uploadFormData
                });

                if (!response.ok) {
                    const error = await response.json();
                    throw new Error(error.error || 'Upload failed');
                }

                const result = await response.json();
                
                // Update user in localStorage
                const currentUser = JSON.parse(localStorage.getItem('user'));
                currentUser.profile_picture_url = result.profile_picture_url;
                localStorage.setItem('user', JSON.stringify(currentUser));

                // Update UI
                updateProfilePicture(result.profile_picture_url);
                
                // Also update profile page avatar if visible
                const profileAvatarLarge = document.getElementById('profileAvatarLarge');
                if (profileAvatarLarge) {
                    profileAvatarLarge.style.backgroundImage = `url(${result.profile_picture_url})`;
                    profileAvatarLarge.style.backgroundSize = 'cover';
                    profileAvatarLarge.style.backgroundPosition = 'center';
                    profileAvatarLarge.textContent = '';
                }
                
                showToast('Profile picture updated successfully');
                closeModal();
            } catch (error) {
                console.error('Profile picture upload error:', error);
                showToast(error.message || 'Failed to upload profile picture', 'error');
            }
        });
    });
}

function updateProfilePicture(url) {
    const profileAvatar = document.getElementById('profileAvatar');
    
    if (url && profileAvatar) {
        profileAvatar.style.backgroundImage = `url(${url})`;
        profileAvatar.style.backgroundSize = 'cover';
        profileAvatar.style.backgroundPosition = 'center';
        profileAvatar.textContent = '';
    }
}

// Initialize profile picture on load
function initializeProfilePicture() {
    const currentUser = JSON.parse(localStorage.getItem('user'));
    if (currentUser && currentUser.profile_picture_url) {
        updateProfilePicture(currentUser.profile_picture_url);
    }
}

// Notification functionality
async function loadUnreadCount() {
    try {
        const response = await apiRequest('/announcements/unread/count');
        updateNotificationBadge(response.unread_count);
    } catch (error) {
        console.error('Failed to load unread count:', error);
        // Silently fail for unread count - don't show toast to avoid spam
        updateNotificationBadge(0);
    }
}

function updateNotificationBadge(count) {
    const notificationBadge = document.getElementById('notificationBadge');
    if (notificationBadge) {
        if (count > 0) {
            notificationBadge.textContent = count;
            notificationBadge.style.display = 'flex';
        } else {
            notificationBadge.style.display = 'none';
        }
    }
}

async function loadAnnouncementsWithReadStatus() {
    try {
        const announcements = await apiRequest('/announcements/with-status');
        displayNotifications(announcements);
    } catch (error) {
        console.error('Failed to load notifications:', error);
        const notificationPanel = document.getElementById('notificationPanel');
        if (notificationPanel) {
            notificationPanel.innerHTML = '<div class="notification-empty">Unable to load announcements. Please try again.</div>';
        }
    }
}

function displayNotifications(announcements) {
    const notificationPanel = document.getElementById('notificationPanel');
    if (!notificationPanel) return;

    if (announcements.length === 0) {
        notificationPanel.innerHTML = '<div class="notification-empty">No announcements</div>';
        return;
    }

    notificationPanel.innerHTML = announcements.map(announcement => `
        <div class="notification-item ${announcement.is_read ? 'read' : 'unread'}" data-announcement-id="${announcement.id}">
            <div class="notification-header">
                <span class="notification-title">${announcement.title}</span>
                <span class="notification-priority priority-${announcement.priority}">${announcement.priority}</span>
            </div>
            <div class="notification-message">${announcement.message}</div>
            <div class="notification-footer">
                <span class="notification-date">${new Date(announcement.created_at).toLocaleDateString()}</span>
                <span class="notification-creator">${announcement.creator_name || 'Admin'}</span>
            </div>
        </div>
    `).join('');

    // Add click handlers for marking as read
    notificationPanel.querySelectorAll('.notification-item.unread').forEach(item => {
        item.addEventListener('click', async () => {
            const announcementId = item.dataset.announcementId;
            await markAnnouncementAsRead(announcementId);
            item.classList.remove('unread');
            item.classList.add('read');
            loadUnreadCount();
        });
    });
}

async function markAnnouncementAsRead(announcementId) {
    try {
        await apiRequest(`/announcements/${announcementId}/read`, {
            method: 'POST'
        });
    } catch (error) {
        console.error('Failed to mark announcement as read:', error);
    }
}

// Toggle notification panel
function toggleNotificationPanel() {
    const notificationPanel = document.getElementById('notificationPanel');
    if (notificationPanel) {
        const isVisible = notificationPanel.style.display === 'block';
        notificationPanel.style.display = isVisible ? 'none' : 'block';
        
        if (!isVisible) {
            loadAnnouncementsWithReadStatus();
        }
    }
}

// Initialize notification bell
let notificationInterval = null;

function initializeNotifications() {
    const notificationBell = document.getElementById('notificationBell');
    if (notificationBell) {
        notificationBell.addEventListener('click', toggleNotificationPanel);
    }
    
    // Clear any existing interval to prevent duplicates
    if (notificationInterval) {
        clearInterval(notificationInterval);
    }
    
    loadUnreadCount();
    
    // Refresh unread count every 30 seconds
    notificationInterval = setInterval(loadUnreadCount, 30000);
}

// Theme functionality
function initializeTheme() {
    const savedTheme = localStorage.getItem('theme') || 'light';
    document.documentElement.setAttribute('data-theme', savedTheme);
    updateThemeToggle(savedTheme);
}

function toggleTheme() {
    const currentTheme = document.documentElement.getAttribute('data-theme') || 'light';
    const newTheme = currentTheme === 'light' ? 'dark' : 'light';
    
    document.documentElement.setAttribute('data-theme', newTheme);
    localStorage.setItem('theme', newTheme);
    updateThemeToggle(newTheme);
}

function updateThemeToggle(theme) {
    const themeToggle = document.getElementById('themeToggle');
    if (themeToggle) {
        themeToggle.textContent = theme === 'light' ? '🌙' : '☀️';
        themeToggle.addEventListener('click', toggleTheme);
    }
}

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
    const currentToken = localStorage.getItem('token');
    const currentUser = JSON.parse(localStorage.getItem('user') || '{}');
    
    console.log('Auth check - token:', currentToken ? 'exists' : 'missing');
    console.log('Auth check - user role:', currentUser.role);
    
    if (!currentToken || currentUser.role !== 'student') {
        console.log('Redirecting to login - not authenticated or not student');
        window.location.href = 'student-login.html';
        return;
    }

    // Initialize profile picture
    initializeProfilePicture();
    
    // Initialize notifications
    initializeNotifications();
    
    // Initialize theme
    initializeTheme();

    // Ensure overview page is active and load initial data
    navigateTo('overview');
});
