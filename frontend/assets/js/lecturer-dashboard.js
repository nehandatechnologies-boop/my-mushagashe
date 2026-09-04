// API Configuration - Detect environment
const isNgrok = window.location.hostname.includes('ngrok-free.app') || window.location.hostname.includes('ngrok.io');
const isRender = window.location.hostname.includes('onrender.com');
const isFly = window.location.hostname.includes('fly.dev');
const isLocalhost = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';

let API_BASE;
if (isNgrok) {
  API_BASE = '/api';
} else if (isRender) {
  API_BASE = '/api';
} else if (isFly) {
  API_BASE = '/api';
} else if (isLocalhost) {
  API_BASE = 'http://localhost:5000/api';
} else {
  API_BASE = '/api';
}

async function apiRequest(endpoint, options = {}) {
    const token = localStorage.getItem('token');
    const headers = {};
    
    headers['Content-Type'] = 'application/json';
    
    if (token) {
        headers['Authorization'] = `Bearer ${token}`;
    }

    const response = await fetch(`${API_BASE}${endpoint}`, {
        ...options,
        headers: {
            ...headers,
            ...options.headers
        }
    });

    if (!response.ok) {
        const error = await response.json();
        // If token is invalid, clear it and redirect to login
        if (response.status === 401) {
            localStorage.removeItem('token');
            localStorage.removeItem('user');
            window.location.href = 'lecturer-login.html';
        }
        throw new Error(error.error || 'Request failed');
    }

    return response.json();
}

function showModal(content) {
    const modal = document.getElementById('modal');
    modal.innerHTML = `
        <div class="modal-backdrop" onclick="hideModal()">
            <div class="modal" onclick="event.stopPropagation()">
                ${content}
            </div>
        </div>
    `;
    modal.style.display = 'flex';
}

function hideModal() {
    document.getElementById('modal').style.display = 'none';
}

function showToast(message, type = 'success') {
    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    toast.textContent = message;
    document.body.appendChild(toast);
    setTimeout(() => toast.remove(), 3000);
}

// Check authentication
function checkAuth() {
    const token = localStorage.getItem('token');
    const user = JSON.parse(localStorage.getItem('user'));
    
    if (!token || !user || user.role !== 'lecturer') {
        window.location.href = 'lecturer-login.html';
        return false;
    }
    
    return user;
}

// Load lecturer info
async function loadLecturerInfo() {
    const user = checkAuth();
    const lecturerNameEl = document.getElementById('lecturerName');
    if (lecturerNameEl) {
        lecturerNameEl.textContent = user.full_name;
    }
    initializeProfilePicture();
    initializeNotifications();
    initializeTheme();
    return user;
}

// Navigation
document.querySelectorAll('.nav-item').forEach(link => {
    link.addEventListener('click', (e) => {
        e.preventDefault();
        const page = link.dataset.page;
        
        document.querySelectorAll('.nav-item').forEach(l => l.classList.remove('active'));
        link.classList.add('active');
        
        document.querySelectorAll('.page-section').forEach(s => s.classList.add('hidden'));
        document.getElementById(`${page}-page`).classList.remove('hidden');
        
        if (page === 'students') loadStudents();
        if (page === 'results') loadResults();
        if (page === 'subjects') loadSubjects();
    });
});

// Load students in lecturer's course
async function loadStudents() {
    try {
        const students = await apiRequest('/students');
        const tbody = document.getElementById('students-table-body');
        
        if (students.length === 0) {
            tbody.innerHTML = '<tr><td colspan="4" class="text-center">No students found</td></tr>';
            return;
        }
        
        tbody.innerHTML = students.map(student => `
            <tr>
                <td>${student.student_number}</td>
                <td>${student.full_name}</td>
                <td>${student.email || 'N/A'}</td>
                <td><span class="badge badge-${student.status === 'active' ? 'success' : 'warning'}">${student.status}</span></td>
            </tr>
        `).join('');
    } catch (error) {
        console.error('Error loading students:', error);
        showToast('Failed to load students', 'error');
    }
}

// Load results for lecturer's course
async function loadResults() {
    try {
        const results = await apiRequest('/results');
        const tbody = document.getElementById('results-table-body');
        
        if (results.length === 0) {
            tbody.innerHTML = '<tr><td colspan="9" class="text-center">No results found</td></tr>';
            return;
        }

        // Group results by student
        const resultsByStudent = results.reduce((acc, result) => {
            const studentKey = `${result.full_name}_${result.student_number}`;
            if (!acc[studentKey]) {
                acc[studentKey] = {
                    full_name: result.full_name,
                    student_number: result.student_number,
                    results: []
                };
            }
            acc[studentKey].results.push(result);
            return acc;
        }, {});

        // Generate HTML grouped by student
        let html = '';
        Object.values(resultsByStudent).forEach(student => {
            html += `
                <tr class="student-header-row" style="background: #f0f9ff; cursor: pointer;" onclick="window.showStudentResults('${student.full_name}', '${student.student_number}')">
                    <td colspan="9" style="padding: 0.75rem 1rem; font-weight: 600; color: #1e40af;">
                        ${student.full_name} (${student.student_number}) ▼
                    </td>
                </tr>
            `;
        });

        tbody.innerHTML = html;
    } catch (error) {
        console.error('Error loading results:', error);
        showToast('Failed to load results', 'error');
    }
}

// Show detailed results for a specific student
window.showStudentResults = async (studentName, studentNumber) => {
    try {
        const results = await apiRequest('/results');
        const studentResults = results.filter(r => r.full_name === studentName && r.student_number === studentNumber);
        
        if (studentResults.length === 0) {
            showToast('No results found for this student', 'error');
            return;
        }

        const resultsHtml = studentResults.map(result => {
            const subjectMarksHtml = result.subject_results && result.subject_results.length > 0
                ? `<div class="subject-marks" style="margin-top: 0.5rem;">
                    ${result.subject_results.map(sr => `
                        <span class="subject-mark-badge">${sr.subject_name}: ${sr.mark} (${sr.grade})</span>
                    `).join('')}
                   </div>`
                : '';
            
            return `
                <div style="background: #f9fafb; padding: 1rem; margin-bottom: 0.5rem; border-radius: 0.5rem;">
                    <div style="display: flex; justify-content: space-between; align-items: start;">
                        <div>
                            <div style="font-weight: 600; color: #1e40af;">${result.course_name || 'N/A'}</div>
                            <div style="color: #6b7280; font-size: 0.9rem;">Term ${result.semester} - ${result.academic_year}</div>
                            <div style="margin-top: 0.5rem;">
                                <span style="font-weight: 500;">Final Mark:</span> ${result.final_mark || 'N/A'}
                                <span style="margin-left: 1rem; font-weight: 500;">Grade:</span> 
                                <span class="badge badge-${getGradeBadgeClass(result.grade)}">${result.grade || 'N/A'}</span>
                            </div>
                            ${subjectMarksHtml}
                        </div>
                        <div style="display: flex; gap: 0.5rem;">
                            <button class="btn btn-sm lecturer-edit-btn" onclick="window.editResult(${result.id}); event.stopPropagation();">Edit</button>
                            <button class="btn btn-sm btn-danger" onclick="window.deleteResult(${result.id}); event.stopPropagation();" style="background: #dc2626; color: white; border: none; padding: 0.5rem 1rem; border-radius: 0.375rem; cursor: pointer;">Delete</button>
                        </div>
                    </div>
                </div>
            `;
        }).join('');

        showModal(`
            <div class="modal-header">
                <h3>Results - ${studentName} (${studentNumber})</h3>
                <button class="modal-close" onclick="hideModal()">&times;</button>
            </div>
            <div class="modal-content" style="max-height: 500px; overflow-y: auto;">
                ${resultsHtml}
            </div>
        `);
    } catch (error) {
        console.error('Error loading student results:', error);
        showToast('Failed to load student results', 'error');
    }
};

function getGradeBadgeClass(grade) {
    if (!grade) return 'secondary';
    if (grade === 'A' || grade === 'B') return 'success';
    if (grade === 'C' || grade === 'D') return 'warning';
    return 'danger';
}

// Add result
document.getElementById('addResultBtn').addEventListener('click', async () => {
    try {
        const user = JSON.parse(localStorage.getItem('user'));
        const students = await apiRequest('/students');
        
        showModal(`
            <div class="modal-header">
                <h3>Add New Result</h3>
                <button class="modal-close" onclick="hideModal()">&times;</button>
            </div>
            <form id="addResultForm" class="modal-form">
                <div class="form-group">
                    <label>Student *</label>
                    <select name="user_id" required>
                        <option value="">Select Student</option>
                        ${students.map(s => `<option value="${s.id}">${s.full_name} (${s.student_number})</option>`).join('')}
                    </select>
                </div>
                <div class="form-group">
                    <label>Term *</label>
                    <select name="semester" required>
                        <option value="1">Term 1</option>
                        <option value="2">Term 2</option>
                        <option value="3">Term 3</option>
                    </select>
                </div>
                <div class="form-group">
                    <label>Academic Year *</label>
                    <input type="number" name="academic_year" required min="2000" max="2100" value="${new Date().getFullYear()}">
                </div>
                <div id="subjectsContainer" style="display: none;">
                    <h4>Subject Marks</h4>
                    <div id="subjectsList"></div>
                </div>
                <div class="form-group">
                    <label>Assessment Mark</label>
                    <input type="number" name="assessment_mark" min="0" max="100">
                </div>
                <div class="form-group">
                    <label>Exam Mark</label>
                    <input type="number" name="exam_mark" min="0" max="100">
                </div>
                <div class="form-group">
                    <label>Remarks</label>
                    <input type="text" name="remarks">
                </div>
                <input type="hidden" name="course_id" value="${user.course_id || ''}">
                <button type="submit" class="btn btn-primary">Add Result</button>
            </form>
        `);
        
        // Load subjects for lecturer's course
        if (user.course_id) {
            try {
                const subjects = await apiRequest(`/subjects/course/${user.course_id}`);
                const subjectsContainer = document.getElementById('subjectsContainer');
                const subjectsList = document.getElementById('subjectsList');
                
                if (subjects && subjects.length > 0) {
                    subjectsContainer.style.display = 'block';
                    subjectsList.innerHTML = subjects.map(subject => `
                        <div class="form-group subject-mark-group">
                            <label>${subject.subject_name} (${subject.subject_code})</label>
                            <div class="subject-inputs-row">
                                <div class="subject-input-group">
                                    <input type="number" 
                                           class="subject-mark-input" 
                                           data-subject-id="${subject.id}" 
                                           placeholder="Mark (0-100)" 
                                           min="0" 
                                           max="100">
                                </div>
                                <div class="subject-input-group">
                                    <input type="text" 
                                           class="subject-remarks-input" 
                                           data-subject-id="${subject.id}" 
                                           placeholder="Remarks (optional)">
                                </div>
                            </div>
                        </div>
                    `).join('');
                }
            } catch (error) {
                console.error('Failed to load subjects:', error);
            }
        }
        
        document.getElementById('addResultForm').addEventListener('submit', async (e) => {
            e.preventDefault();
            const formData = new FormData(e.target);
            const resultData = Object.fromEntries(formData);
            
            // Collect subject marks and remarks
            const subjectMarks = [];
            document.querySelectorAll('.subject-mark-input').forEach(input => {
                if (input.value) {
                    const subjectId = input.dataset.subjectId;
                    const remarksInput = document.querySelector(`.subject-remarks-input[data-subject-id="${subjectId}"]`);
                    subjectMarks.push({
                        subject_id: subjectId,
                        mark: parseFloat(input.value),
                        remarks: remarksInput ? remarksInput.value : null
                    });
                }
            });
            
            if (subjectMarks.length > 0) {
                resultData.subject_marks = subjectMarks;
            }
            
            try {
                await apiRequest('/results', {
                    method: 'POST',
                    body: JSON.stringify(resultData)
                });
                showToast('Result added successfully');
                hideModal();
                loadResults();
            } catch (error) {
                showToast(error.message || 'Failed to add result', 'error');
            }
        });
    } catch (error) {
        showToast('Failed to load students', 'error');
    }
});

// Edit result
window.editResult = async (id) => {
    try {
        const user = JSON.parse(localStorage.getItem('user'));
        const result = await apiRequest(`/results/${id}`);
        const students = await apiRequest('/students');
        
        showModal(`
            <div class="modal-header">
                <h3>Edit Result</h3>
                <button class="modal-close" onclick="hideModal()">&times;</button>
            </div>
            <form id="editResultForm" class="modal-form">
                <div class="form-group">
                    <label>Student</label>
                    <select name="user_id" required>
                        ${students.map(s => `<option value="${s.id}" ${result.user_id === s.id ? 'selected' : ''}>${s.full_name} (${s.student_number})</option>`).join('')}
                    </select>
                </div>
                <div class="form-group">
                    <label>Term *</label>
                    <select name="semester" required>
                        <option value="1" ${result.semester === 1 ? 'selected' : ''}>Term 1</option>
                        <option value="2" ${result.semester === 2 ? 'selected' : ''}>Term 2</option>
                        <option value="3" ${result.semester === 3 ? 'selected' : ''}>Term 3</option>
                    </select>
                </div>
                <div class="form-group">
                    <label>Academic Year *</label>
                    <input type="number" name="academic_year" required min="2000" max="2100" value="${result.academic_year}">
                </div>
                <div id="subjectsContainer">
                    <h4>Subject Marks</h4>
                    <div id="subjectsList"></div>
                </div>
                <div class="form-group">
                    <label>Assessment Mark</label>
                    <input type="number" name="assessment_mark" min="0" max="100" value="${result.assessment_mark || ''}">
                </div>
                <div class="form-group">
                    <label>Exam Mark</label>
                    <input type="number" name="exam_mark" min="0" max="100" value="${result.exam_mark || ''}">
                </div>
                <div class="form-group">
                    <label>Remarks</label>
                    <input type="text" name="remarks" value="${result.remarks || ''}">
                </div>
                <input type="hidden" name="course_id" value="${user.course_id || result.course_id || ''}">
                <button type="submit" class="btn btn-primary">Update Result</button>
            </form>
        `);
        
        // Load subjects for lecturer's course and populate with existing marks
        if (user.course_id) {
            try {
                const subjects = await apiRequest(`/subjects/course/${user.course_id}`);
                const subjectsList = document.getElementById('subjectsList');
                
                if (subjects && subjects.length > 0) {
                    subjectsList.innerHTML = subjects.map(subject => {
                        const existingMark = result.subject_results && result.subject_results.find(sr => sr.subject_id === subject.id);
                        return `
                            <div class="form-group subject-mark-group">
                                <label>${subject.subject_name} (${subject.subject_code})</label>
                                <div class="subject-inputs-row">
                                    <div class="subject-input-group">
                                        <input type="number" 
                                               class="subject-mark-input" 
                                               data-subject-id="${subject.id}" 
                                               placeholder="Mark (0-100)" 
                                               min="0" 
                                               max="100"
                                               value="${existingMark ? existingMark.mark : ''}">
                                    </div>
                                    <div class="subject-input-group">
                                        <input type="text" 
                                               class="subject-remarks-input" 
                                               data-subject-id="${subject.id}" 
                                               placeholder="Remarks (optional)"
                                               value="${existingMark ? (existingMark.remarks || '') : ''}">
                                    </div>
                                </div>
                            </div>
                        `;
                    }).join('');
                }
            } catch (error) {
                console.error('Failed to load subjects:', error);
            }
        }
        
        document.getElementById('editResultForm').addEventListener('submit', async (e) => {
            e.preventDefault();
            const formData = new FormData(e.target);
            const updateData = Object.fromEntries(formData);
            
            // Collect subject marks and remarks
            const subjectMarks = [];
            document.querySelectorAll('.subject-mark-input').forEach(input => {
                if (input.value) {
                    const subjectId = input.dataset.subjectId;
                    const remarksInput = document.querySelector(`.subject-remarks-input[data-subject-id="${subjectId}"]`);
                    subjectMarks.push({
                        subject_id: subjectId,
                        mark: parseFloat(input.value),
                        remarks: remarksInput ? remarksInput.value : null
                    });
                }
            });
            
            if (subjectMarks.length > 0) {
                updateData.subject_marks = subjectMarks;
            }
            
            try {
                await apiRequest(`/results/${id}`, {
                    method: 'PUT',
                    body: JSON.stringify(updateData)
                });
                showToast('Result updated successfully');
                hideModal();
                loadResults();
            } catch (error) {
                showToast(error.message || 'Failed to update result', 'error');
            }
        });
    } catch (error) {
        showToast('Failed to load result data', 'error');
    }
};

// Delete result
window.deleteResult = async (id) => {
    if (!confirm('Are you sure you want to delete this result?')) return;
    
    try {
        await apiRequest(`/results/${id}`, { method: 'DELETE' });
        showToast('Result deleted successfully');
        hideModal();
        loadResults();
    } catch (error) {
        showToast('Failed to delete result', 'error');
    }
};

// Logout
document.getElementById('logoutBtn').addEventListener('click', () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    window.location.href = 'lecturer-login.html';
});

// Change password
document.getElementById('changePasswordBtn').addEventListener('click', () => {
    showModal(`
        <div class="modal-header">
            <h3>Change Password</h3>
            <button class="modal-close" onclick="hideModal()">&times;</button>
        </div>
        <form id="changePasswordForm" class="modal-form">
            <div class="form-group">
                <label>Current Password *</label>
                <input type="password" name="current_password" required>
            </div>
            <div class="form-group">
                <label>New Password *</label>
                <input type="password" name="new_password" required minlength="6">
            </div>
            <div class="form-group">
                <label>Confirm New Password *</label>
                <input type="password" name="confirm_password" required minlength="6">
            </div>
            <button type="submit" class="btn btn-primary">Change Password</button>
        </form>
    `);

    document.getElementById('changePasswordForm').addEventListener('submit', async (e) => {
        e.preventDefault();
        const formData = new FormData(e.target);
        const data = Object.fromEntries(formData);

        if (data.new_password !== data.confirm_password) {
            showToast('Passwords do not match', 'error');
            return;
        }

        try {
            await apiRequest('/auth/change-password', {
                method: 'PUT',
                body: JSON.stringify({
                    current_password: data.current_password,
                    new_password: data.new_password
                })
            });
            showToast('Password changed successfully');
            hideModal();
        } catch (error) {
            showToast(error.message || 'Failed to change password', 'error');
        }
    });
});

// Change profile picture
document.getElementById('sidebarAvatar').addEventListener('click', () => {
    const user = JSON.parse(localStorage.getItem('user'));
    showModal(`
        <div class="modal-header">
            <h3>Change Profile Picture</h3>
            <button class="modal-close" onclick="hideModal()">&times;</button>
        </div>
        <form id="profilePictureForm" class="modal-form">
            <div class="form-group">
                <label>Profile Picture</label>
                <input type="file" name="profilePicture" accept="image/jpeg,image/jpg,image/png,image/gif" required>
            </div>
            <button type="submit" class="btn btn-primary">Upload</button>
        </form>
    `);

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
            user.profile_picture_url = result.profile_picture_url;
            localStorage.setItem('user', JSON.stringify(user));

            // Update UI
            updateProfilePicture(result.profile_picture_url);
            
            showToast('Profile picture updated successfully');
            hideModal();
        } catch (error) {
            showToast(error.message || 'Failed to upload profile picture', 'error');
        }
    });
});

function updateProfilePicture(url) {
    const sidebarAvatar = document.getElementById('sidebarAvatar');
    const headerAvatar = document.getElementById('headerAvatar');
    
    if (url) {
        if (sidebarAvatar) {
            sidebarAvatar.style.backgroundImage = `url(${url})`;
            sidebarAvatar.style.backgroundSize = 'cover';
            sidebarAvatar.style.backgroundPosition = 'center';
            sidebarAvatar.textContent = '';
        }
        if (headerAvatar) {
            headerAvatar.style.backgroundImage = `url(${url})`;
            headerAvatar.style.backgroundSize = 'cover';
            headerAvatar.style.backgroundPosition = 'center';
            headerAvatar.textContent = '';
        }
    }
}

// Initialize profile picture on load
function initializeProfilePicture() {
    const user = JSON.parse(localStorage.getItem('user'));
    if (user && user.profile_picture_url) {
        updateProfilePicture(user.profile_picture_url);
    }
}

// Notification functionality
async function loadUnreadCount() {
    try {
        const response = await apiRequest('/announcements/unread/count');
        updateNotificationBadge(response.unread_count);
    } catch (error) {
        console.error('Failed to load unread count:', error);
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
function initializeNotifications() {
    const notificationBell = document.getElementById('notificationBell');
    if (notificationBell) {
        notificationBell.addEventListener('click', toggleNotificationPanel);
    }
    
    loadUnreadCount();
    
    // Refresh unread count every 30 seconds
    setInterval(loadUnreadCount, 30000);
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

// Load subjects for lecturer's course
async function loadSubjects() {
    try {
        const user = JSON.parse(localStorage.getItem('user'));
        const subjects = await apiRequest(`/subjects/course/${user.course_id}`);
        const tbody = document.getElementById('subjects-table-body');
        
        if (!subjects || subjects.length === 0) {
            tbody.innerHTML = '<tr><td colspan="4" class="text-center">No subjects found</td></tr>';
            return;
        }

        tbody.innerHTML = subjects.map(subject => `
            <tr>
                <td>${subject.subject_code}</td>
                <td>${subject.subject_name}</td>
                <td>${subject.credits || 1}</td>
                <td>
                    <button class="btn btn-sm lecturer-edit-btn" onclick="window.editSubject(${subject.id})">Edit</button>
                </td>
            </tr>
        `).join('');
    } catch (error) {
        console.error('Error loading subjects:', error);
        showToast('Failed to load subjects', 'error');
    }
}

// Add subject
window.addSubject = async () => {
    try {
        const user = JSON.parse(localStorage.getItem('user'));
        
        showModal(`
            <div class="modal-header">
                <h3>Add New Subject</h3>
                <button class="modal-close" onclick="hideModal()">&times;</button>
            </div>
            <form id="addSubjectForm" class="modal-form">
                <div class="form-group">
                    <label>Subject Code *</label>
                    <input type="text" name="subject_code" required>
                </div>
                <div class="form-group">
                    <label>Subject Name *</label>
                    <input type="text" name="subject_name" required>
                </div>
                <div class="form-group">
                    <label>Credits</label>
                    <input type="number" name="credits" value="1" min="1" max="10">
                </div>
                <input type="hidden" name="course_id" value="${user.course_id}">
                <button type="submit" class="btn btn-primary">Add Subject</button>
            </form>
        `);
        
        document.getElementById('addSubjectForm').addEventListener('submit', async (e) => {
            e.preventDefault();
            const formData = new FormData(e.target);
            const subjectData = Object.fromEntries(formData);
            
            try {
                await apiRequest('/subjects', {
                    method: 'POST',
                    body: JSON.stringify(subjectData)
                });
                showToast('Subject added successfully');
                hideModal();
                loadSubjects();
            } catch (error) {
                showToast('Failed to add subject: ' + (error.message || 'Unknown error'), 'error');
            }
        });
    } catch (error) {
        console.error('Add subject error:', error);
        showToast('Failed to add subject', 'error');
    }
};

// Edit subject
window.editSubject = async (id) => {
    try {
        const subject = await apiRequest(`/subjects/${id}`);
        
        showModal(`
            <div class="modal-header">
                <h3>Edit Subject</h3>
                <button class="modal-close" onclick="hideModal()">&times;</button>
            </div>
            <form id="editSubjectForm" class="modal-form">
                <div class="form-group">
                    <label>Subject Code *</label>
                    <input type="text" name="subject_code" value="${subject.subject_code}" required>
                </div>
                <div class="form-group">
                    <label>Subject Name *</label>
                    <input type="text" name="subject_name" value="${subject.subject_name}" required>
                </div>
                <div class="form-group">
                    <label>Credits</label>
                    <input type="number" name="credits" value="${subject.credits || 1}" min="1" max="10">
                </div>
                <button type="submit" class="btn btn-primary">Update Subject</button>
            </form>
        `);
        
        document.getElementById('editSubjectForm').addEventListener('submit', async (e) => {
            e.preventDefault();
            const formData = new FormData(e.target);
            const updateData = Object.fromEntries(formData);
            
            try {
                await apiRequest(`/subjects/${id}`, {
                    method: 'PUT',
                    body: JSON.stringify(updateData)
                });
                showToast('Subject updated successfully');
                hideModal();
                loadSubjects();
            } catch (error) {
                showToast('Failed to update subject: ' + (error.message || 'Unknown error'), 'error');
            }
        });
    } catch (error) {
        console.error('Edit subject error:', error);
        showToast('Failed to load subject data', 'error');
    }
};

// Initialize
loadLecturerInfo();
loadStudents();
