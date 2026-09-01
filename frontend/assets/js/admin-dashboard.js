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
    const currentToken = localStorage.getItem('token');
    
    // If no token and not a login request, redirect to login
    if (!currentToken && !endpoint.includes('/auth/')) {
        window.location.href = 'admin-login.html';
        throw new Error('Not authenticated');
    }
    
    const defaultOptions = {
        headers: {}
    };

    // Only set Content-Type if not sending FormData
    if (!(options.body instanceof FormData)) {
        defaultOptions.headers['Content-Type'] = 'application/json';
    }
    
    // Only add Authorization header if token exists
    if (currentToken) {
        defaultOptions.headers['Authorization'] = `Bearer ${currentToken}`;
    }

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
    const toast = document.getElementById('toast');
    if (toast) {
        toast.style.display = 'none';
    }
}

// Page navigation
function navigateTo(page) {
    document.querySelectorAll('.page-section').forEach(p => p.classList.add('hidden'));
    document.querySelectorAll('.page-section').forEach(p => p.classList.remove('active'));
    
    const targetPage = document.getElementById(`${page}-page`);
    if (targetPage) {
        targetPage.classList.remove('hidden');
        targetPage.classList.add('active');
    }
    
    document.querySelectorAll('.nav-item').forEach(item => {
        item.classList.remove('active');
        if (item.dataset.page === page) {
            item.classList.add('active');
        }
    });

    loadPageData(page);
}

// Load page-specific data
async function loadPageData(page) {
    switch(page) {
        case 'overview':
            await loadDashboardStatistics();
            break;
        case 'students':
            await loadStudents();
            break;
        case 'courses':
            await loadCourses();
            break;
        case 'lecturers':
            await loadLecturers();
            break;
        case 'subjects':
            await loadSubjects();
            await loadSubjectCourseFilter();
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
        case 'settings':
            await loadTemplateInfo();
            break;
    }
}

// Load dashboard statistics
async function loadDashboardStatistics() {
    console.log('STEP 1: dashboard initialization started');
    try {
        console.log('STEP 2: requesting statistics');
        const stats = await apiRequest('/dashboard/statistics');
        
        console.log('STEP 3: statistics response received');
        console.log('STEP 4: FULL RESPONSE:', JSON.stringify(stats, null, 2));
        
        console.log('STEP 5: beginning statistics rendering');
        
        document.getElementById('totalStudents').textContent = stats.students.total || 0;
        document.getElementById('totalCourses').textContent = stats.courses.total || 0;
        document.getElementById('revenueCollected').textContent = `$${(stats.fees.total_collected || 0).toFixed(2)}`;
        document.getElementById('pendingFees').textContent = stats.fees.unpaid || 0;
        
        document.getElementById('activeStudents').textContent = stats.students.active || 0;
        document.getElementById('suspendedStudents').textContent = stats.students.suspended || 0;
        document.getElementById('maleStudents').textContent = stats.students.male || 0;
        document.getElementById('femaleStudents').textContent = stats.students.female || 0;
        
        console.log('STEP 6: statistics rendering completed');
        
    } catch (error) {
        console.error('STEP ERROR: Error loading statistics:', error);
        console.error('Error stack:', error.stack);
        // Set default values on error
        document.getElementById('totalStudents').textContent = '0';
        document.getElementById('totalCourses').textContent = '0';
        document.getElementById('revenueCollected').textContent = '$0.00';
        document.getElementById('pendingFees').textContent = '0';
        document.getElementById('activeStudents').textContent = '0';
        document.getElementById('suspendedStudents').textContent = '0';
        document.getElementById('maleStudents').textContent = '0';
        document.getElementById('femaleStudents').textContent = '0';
        showToast('Failed to load statistics', 'error');
    }
}

// Load recent announcements
async function loadRecentAnnouncements() {
    console.log('STEP 7: requesting announcements');
    try {
        const announcements = await apiRequest('/announcements?limit=5');
        
        console.log('STEP 8: announcements response received');
        console.log('STEP 9: FULL ANNOUNCEMENTS:', JSON.stringify(announcements, null, 2));
        
        console.log('STEP 10: beginning announcements rendering');
        
        const container = document.getElementById('recentAnnouncements');
        
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
            console.log('STEP 11: announcements rendering completed (empty state)');
            return;
        }

        container.innerHTML = announcements.map(announcement => {
            let mediaIndicator = '';
            if (announcement.image_url || announcement.video_url) {
                mediaIndicator = `<span style="margin-left: 8px; font-size: 0.8rem; color: #6b7280;">📎 Media</span>`;
            }
            
            return `
            <div class="announcement-item ${announcement.priority}">
                <div class="announcement-title">${announcement.title}</div>
                <div class="announcement-message">${announcement.message}</div>
                <div class="announcement-meta">${new Date(announcement.created_at).toLocaleDateString()}${mediaIndicator}</div>
            </div>
        `;
        }).join('');
        
        console.log('STEP 11: announcements rendering completed');
    } catch (error) {
        console.error('STEP ERROR: Error loading announcements:', error);
        console.error('Error stack:', error.stack);
    }
}

// Load students
async function loadStudents() {
    console.log('[STUDENTS] Request started');
    const tbody = document.getElementById('studentsTableBody');
    if (!tbody) {
        console.error('[STUDENTS] Table body not found');
        return;
    }
    
    // Set loading state
    tbody.innerHTML = '<tr><td colspan="7" class="text-center">Loading students...</td></tr>';
    
    try {
        const studentSearch = document.getElementById('studentSearch');
        const studentFilter = document.getElementById('studentFilter');
        const search = studentSearch ? studentSearch.value : '';
        const filter = studentFilter ? studentFilter.value : '';
        
        let endpoint = '/students';
        const params = [];
        if (search) params.push(`search=${encodeURIComponent(search)}`);
        if (filter) params.push(`status=${filter}`);
        if (params.length) endpoint += '?' + params.join('&');
        
        console.log(`[STUDENTS] API Endpoint: GET ${endpoint}`);
        const students = await apiRequest(endpoint);
        console.log('[STUDENTS] Response received');
        console.log('[STUDENTS] Data:', JSON.stringify(students, null, 2));
        
        if (!students || students.length === 0) {
            tbody.innerHTML = '<tr><td colspan="7" class="text-center">No students found</td></tr>';
            console.log('[STUDENTS] Success: No students found');
            return;
        }

        tbody.innerHTML = students.map(student => `
            <tr>
                <td>
                    ${student.profile_picture_url 
                        ? `<img src="${student.profile_picture_url}" alt="${student.full_name}" style="width: 60px; height: 60px; border-radius: 50%; object-fit: cover; cursor: pointer;" onclick="viewProfilePicture('${student.profile_picture_url}', '${student.full_name}')">` 
                        : `<div style="width: 60px; height: 60px; border-radius: 50%; background: #ddd; display: flex; align-items: center; justify-content: center; font-size: 20px;">${student.full_name.charAt(0).toUpperCase()}</div>`
                    }
                </td>
                <td>${student.student_number}</td>
                <td>${student.full_name}</td>
                <td>${student.course_name || 'Not assigned'}</td>
                <td>${student.phone || 'N/A'}</td>
                <td><span class="status-badge status-${student.status}">${student.status}</span></td>
                <td>
                    <button class="action-btn edit" onclick="editStudent(${student.id})">Edit</button>
                    <button class="action-btn delete" onclick="deleteStudent(${student.id})">Delete</button>
                </td>
            </tr>
        `).join('');
        console.log('[STUDENTS] Success: Data rendered');
    } catch (error) {
        console.error('[STUDENTS] Error:', error);
        console.error('[STUDENTS] Error message:', error.message);
        tbody.innerHTML = '<tr><td colspan="7" class="text-center">Failed to load students. Please try again.</td></tr>';
        showToast('Failed to load students', 'error');
    }
}

// Load courses
async function loadCourses() {
    console.log('[COURSES] Request started');
    try {
        const courseSearch = document.getElementById('courseSearch');
        const search = courseSearch ? courseSearch.value : '';
        
        let endpoint = '/courses/with-count';
        if (search) endpoint += `?search=${encodeURIComponent(search)}`;
        
        console.log(`[COURSES] API Endpoint: GET ${endpoint}`);
        const courses = await apiRequest(endpoint);
        console.log('[COURSES] Response received');
        console.log('[COURSES] Data:', JSON.stringify(courses, null, 2));
        
        const tbody = document.getElementById('coursesTableBody');
        
        if (!courses || courses.length === 0) {
            tbody.innerHTML = '<tr><td colspan="6" class="text-center">No courses found</td></tr>';
            console.log('[COURSES] Success: No courses found');
            return;
        }

        tbody.innerHTML = courses.map(course => `
            <tr>
                <td>${course.course_code}</td>
                <td>${course.course_name}</td>
                <td>${course.department || 'N/A'}</td>
                <td>${course.duration ? `${course.duration} years` : 'N/A'}</td>
                <td>${course.student_count || 0}</td>
                <td>
                    <button class="action-btn edit" onclick="editCourse(${course.id})">Edit</button>
                    <button class="action-btn delete" onclick="deleteCourse(${course.id})">Delete</button>
                </td>
            </tr>
        `).join('');
        console.log('[COURSES] Success: Data rendered');
    } catch (error) {
        console.error('[COURSES] Error:', error);
        console.error('[COURSES] Error message:', error.message);
        const tbody = document.getElementById('coursesTableBody');
        if (tbody) {
            tbody.innerHTML = '<tr><td colspan="6" class="text-center">Failed to load courses. Please try again.</td></tr>';
        }
        showToast('Failed to load courses', 'error');
    }
}

// Load fees
async function loadFees() {
    console.log('[FEES] Request started');
    try {
        const feeSearch = document.getElementById('feeSearch');
        const feeFilter = document.getElementById('feeFilter');
        const search = feeSearch ? feeSearch.value : '';
        const filter = feeFilter ? feeFilter.value : '';
        
        let endpoint = '/fees';
        const params = [];
        if (search) params.push(`search=${encodeURIComponent(search)}`);
        if (filter) params.push(`status=${filter}`);
        if (params.length) endpoint += '?' + params.join('&');
        
        console.log(`[FEES] API Endpoint: GET ${endpoint}`);
        const fees = await apiRequest(endpoint);
        console.log('[FEES] Response received');
        console.log('[FEES] Data:', JSON.stringify(fees, null, 2));
        
        const tbody = document.getElementById('feesTableBody');
        
        if (!fees || fees.length === 0) {
            tbody.innerHTML = '<tr><td colspan="7" class="text-center">No fees found</td></tr>';
            console.log('[FEES] Success: No fees found');
            return;
        }

        tbody.innerHTML = fees.map(fee => `
            <tr>
                <td>${fee.full_name || 'Unknown'}</td>
                <td>${fee.fee_category}</td>
                <td>$${fee.amount.toFixed(2)}</td>
                <td>$${(fee.amount_paid || 0).toFixed(2)}</td>
                <td>$${fee.balance.toFixed(2)}</td>
                <td><span class="status-badge status-${fee.status}">${fee.status}</span></td>
                <td>
                    <button class="action-btn edit" onclick="editFee(${fee.id})">Edit</button>
                    <button class="action-btn edit" onclick="recordPayment(${fee.id})">Pay</button>
                    <button class="action-btn delete" onclick="deleteFee(${fee.id})">Delete</button>
                </td>
            </tr>
        `).join('');
        console.log('[FEES] Success: Data rendered');
    } catch (error) {
        console.error('[FEES] Error:', error);
        console.error('[FEES] Error message:', error.message);
        const tbody = document.getElementById('feesTableBody');
        if (tbody) {
            tbody.innerHTML = '<tr><td colspan="7" class="text-center">Failed to load fees. Please try again.</td></tr>';
        }
        showToast('Failed to load fees', 'error');
    }
}

// Load results
async function loadResults() {
    console.log('[RESULTS] Request started');
    try {
        const resultSearch = document.getElementById('resultSearch');
        const semesterFilter = document.getElementById('semesterFilter');
        const search = resultSearch ? resultSearch.value : '';
        const semester = semesterFilter ? semesterFilter.value : '';
        
        let endpoint = '/results';
        const params = [];
        if (search) params.push(`search=${encodeURIComponent(search)}`);
        if (semester) params.push(`semester=${semester}`);
        if (params.length) endpoint += '?' + params.join('&');
        
        console.log(`[RESULTS] API Endpoint: GET ${endpoint}`);
        const results = await apiRequest(endpoint);
        console.log('[RESULTS] Response received');
        console.log('[RESULTS] Data:', JSON.stringify(results, null, 2));
        
        const tbody = document.getElementById('resultsTableBody');
        
        if (!results || results.length === 0) {
            tbody.innerHTML = '<tr><td colspan="7" class="text-center">No results found</td></tr>';
            console.log('[RESULTS] Success: No results found');
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
                    <td colspan="7" style="padding: 0.75rem 1rem; font-weight: 600; color: #1e40af;">
                        ${student.full_name} (${student.student_number}) ▼
                    </td>
                </tr>
            `;
        });

        tbody.innerHTML = html;
        console.log('[RESULTS] Success: Data rendered');
    } catch (error) {
        console.error('[RESULTS] Error:', error);
        console.error('[RESULTS] Error message:', error.message);
        const tbody = document.getElementById('resultsTableBody');
        if (tbody) {
            tbody.innerHTML = '<tr><td colspan="7" class="text-center">Failed to load results. Please try again.</td></tr>';
        }
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
                                <span class="result-grade ${result.grade}">${result.grade || 'N/A'}</span>
                            </div>
                            ${subjectMarksHtml}
                        </div>
                        <div style="display: flex; gap: 0.5rem;">
                            <button class="action-btn edit" onclick="editResult(${result.id}); event.stopPropagation();">Edit</button>
                            <button class="action-btn delete" onclick="deleteResult(${result.id}); event.stopPropagation();">Delete</button>
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

// Load announcements
async function loadAnnouncements() {
    console.log('[ANNOUNCEMENTS] Request started');
    try {
        console.log('[ANNOUNCEMENTS] API Endpoint: GET /announcements');
        const announcements = await apiRequest('/announcements');
        console.log('[ANNOUNCEMENTS] Response received');
        console.log('[ANNOUNCEMENTS] Data:', JSON.stringify(announcements, null, 2));
        
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
            console.log('[ANNOUNCEMENTS] Success: No announcements found');
            return;
        }

        container.innerHTML = announcements.map(announcement => {
            return `
            <div class="announcement-item ${announcement.priority}">
                <div class="announcement-title">${announcement.title}</div>
                <div class="announcement-message">${announcement.message}</div>
                <div class="announcement-meta">
                    ${new Date(announcement.created_at).toLocaleString()} • 
                    Priority: ${announcement.priority}
                </div>
                <div class="announcement-actions">
                    <button class="action-btn edit" onclick="editAnnouncement(${announcement.id})">Edit</button>
                    <button class="action-btn delete" onclick="deleteAnnouncement(${announcement.id})">Delete</button>
                </div>
            </div>
        `;
        }).join('');
        console.log('[ANNOUNCEMENTS] Success: Data rendered');
    } catch (error) {
        console.error('[ANNOUNCEMENTS] Error:', error);
        console.error('[ANNOUNCEMENTS] Error message:', error.message);
        const container = document.getElementById('allAnnouncements');
        if (container) {
            container.innerHTML = '<div class="text-center">Failed to load announcements. Please try again.</div>';
        }
        showToast('Failed to load announcements', 'error');
    }
}

// Modal functions
function showModal(content) {
    const container = document.getElementById('modalContainer');
    container.innerHTML = `
        <div class="modal">
            ${content}
        </div>
    `;
    container.style.display = 'flex';
}

function hideModal() {
    document.getElementById('modalContainer').style.display = 'none';
}

// Student CRUD operations
const importExcelBtn = document.getElementById('importExcelBtn');
if (importExcelBtn) {
    importExcelBtn.addEventListener('click', () => {
        showModal(`
            <div class="modal-header">
                <h3>Import Students from Excel</h3>
                <button class="modal-close" onclick="hideModal()">&times;</button>
            </div>
            <form id="importExcelForm" class="modal-form">
                <div class="form-group">
                    <label>Excel File *</label>
                    <input type="file" name="file" accept=".xlsx,.xls" required>
                    <small class="form-help">Supported columns: Full Name, Student Number, Email, Password, Phone, Gender, National ID, Date of Birth, Address, Guardian Name, Guardian Phone, Intake Year, Course ID</small>
                </div>
                <button type="submit" class="btn btn-primary">Import Students</button>
            </form>
        `);
        
        document.getElementById('importExcelForm').addEventListener('submit', async (e) => {
            e.preventDefault();
            const fileInput = e.target.querySelector('input[type="file"]');
            const file = fileInput.files[0];
            
            if (!file) {
                showToast('Please select a file', 'error');
                return;
            }

            const formData = new FormData();
            formData.append('file', file);

            try {
                const response = await fetch(`${API_BASE}/students/import/excel`, {
                    method: 'POST',
                    headers: {
                        'Authorization': `Bearer ${token}`
                    },
                    body: formData
                });

                const data = await response.json();

                if (!response.ok) {
                    throw new Error(data.error || 'Import failed');
                }

                showToast(`Imported ${data.imported.length} students successfully`);
                
                if (data.errors && data.errors.length > 0) {
                    console.warn('Import errors:', data.errors);
                    // Show first few errors in toast
                    const errorSample = data.errors.slice(0, 3).map(e => e.error || e.message).join('; ');
                    showToast(`${data.errors.length} rows had errors. Sample: ${errorSample}`, 'error');
                }

                hideModal();
                loadStudents();
            } catch (error) {
                console.error('Import error:', error);
                showToast('Failed to import students', 'error');
            }
        });
    });
}

const addStudentBtn = document.getElementById('addStudentBtn');
if (addStudentBtn) {
    addStudentBtn.addEventListener('click', () => {
        console.log('[CRUD-ADD] BUTTON CLICKED');
        showModal(`
            <div class="modal-header">
                <h3>Add New Student</h3>
                <button class="modal-close" onclick="hideModal()">&times;</button>
            </div>
            <form id="addStudentForm" class="modal-form">
                <div class="form-group">
                    <label>Full Name *</label>
                    <input type="text" name="full_name" required>
                </div>
                <div class="form-group">
                    <label>Student Number *</label>
                    <input type="text" name="student_number" required>
                </div>
                <div class="form-group">
                    <label>Email</label>
                    <input type="email" name="email">
                </div>
                <div class="form-group">
                    <label>Password *</label>
                    <input type="password" name="password" required minlength="6">
                </div>
                <div class="form-group">
                    <label>Phone</label>
                    <input type="tel" name="phone">
                </div>
                <div class="form-group">
                    <label>Course</label>
                    <select name="course_id" id="courseSelect">
                        <option value="">Select Course</option>
                    </select>
                </div>
                <button type="submit" class="btn btn-primary">Add Student</button>
            </form>
        `);
        console.log('[CRUD-ADD] MODAL OPENED');
        
        // Load courses for dropdown
        loadCourseDropdown();
        
        const addForm = document.getElementById('addStudentForm');
        if (addForm) {
            console.log('[CRUD-ADD] FORM FOUND');
            addForm.addEventListener('submit', async (e) => {
                console.log('[CRUD-ADD] FORM SUBMIT');
                e.preventDefault();
                const formData = new FormData(e.target);
                const studentData = Object.fromEntries(formData);
                console.log('[CRUD-ADD] FORM DATA:', studentData);
                
                try {
                    console.log('[CRUD-ADD] API REQUEST STARTING: POST /students');
                    await apiRequest('/students', {
                        method: 'POST',
                        body: JSON.stringify(studentData)
                    });
                    console.log('[CRUD-ADD] API REQUEST SUCCESS');
                    showToast('Student added successfully');
                    hideModal();
                    loadStudents();
                } catch (error) {
                    console.error('[CRUD-ADD] API REQUEST ERROR:', error);
                    showToast('Failed to add student', 'error');
                }
            });
        } else {
            console.error('[CRUD-ADD] FORM NOT FOUND');
        }
    });
} else {
    console.error('[CRUD-ADD] BUTTON NOT FOUND');
}

window.editStudent = async function(id) {
    console.log('[CRUD-EDIT] BUTTON CLICKED', id);
    try {
        console.log('[CRUD-EDIT] FETCHING STUDENT DATA');
        const student = await apiRequest(`/students/${id}`);
        console.log('[CRUD-EDIT] STUDENT DATA RECEIVED:', student);
        
        showModal(`
            <div class="modal-header">
                <h3>Edit Student</h3>
                <button class="modal-close" onclick="hideModal()">&times;</button>
            </div>
            <form id="editStudentForm" class="modal-form">
                <div class="form-group">
                    <label>Full Name</label>
                    <input type="text" name="full_name" value="${student.full_name}">
                </div>
                <div class="form-group">
                    <label>Phone</label>
                    <input type="tel" name="phone" value="${student.phone || ''}">
                </div>
                <div class="form-group">
                    <label>Status</label>
                    <select name="status">
                        <option value="active" ${student.status === 'active' ? 'selected' : ''}>Active</option>
                        <option value="suspended" ${student.status === 'suspended' ? 'selected' : ''}>Suspended</option>
                    </select>
                </div>
                <div class="form-group">
                    <label>Course</label>
                    <select name="course_id" id="courseSelect">
                        <option value="">Select Course</option>
                    </select>
                </div>
                <div class="form-group">
                    <label>Profile Picture</label>
                    ${student.profile_picture_url 
                        ? `<div style="margin-bottom: 10px;">
                            <img src="${student.profile_picture_url}" alt="Current profile picture" style="width: 100px; height: 100px; border-radius: 50%; object-fit: cover;">
                            <button type="button" class="btn btn-danger" onclick="deleteProfilePicture(${student.id})" style="margin-left: 10px;">Remove</button>
                           </div>` 
                        : '<p>No profile picture set</p>'
                    }
                    <input type="file" name="profilePicture" accept="image/*">
                </div>
                <button type="submit" class="btn btn-primary">Update Student</button>
            </form>
        `);
        console.log('[CRUD-EDIT] MODAL OPENED');
        
        loadCourseDropdown(student.course_id);
        
        const editForm = document.getElementById('editStudentForm');
        if (editForm) {
            console.log('[CRUD-EDIT] FORM FOUND');
            editForm.addEventListener('submit', async (e) => {
                console.log('[CRUD-EDIT] FORM SUBMIT');
                e.preventDefault();
                const formData = new FormData(e.target);
                const updateData = {
                    full_name: formData.get('full_name'),
                    phone: formData.get('phone'),
                    status: formData.get('status'),
                    course_id: formData.get('course_id')
                };
                console.log('[CRUD-EDIT] UPDATE DATA:', updateData);
                
                // Handle profile picture upload
                const profilePictureFile = formData.get('profilePicture');
                if (profilePictureFile && profilePictureFile.size > 0) {
                    console.log('[CRUD-EDIT] UPLOADING PROFILE PICTURE');
                    const profileFormData = new FormData();
                    profileFormData.append('profilePicture', profilePictureFile);
                    
                    try {
                        await apiRequest(`/students/${id}/profile-picture`, {
                            method: 'POST',
                            body: profileFormData
                        });
                        console.log('[CRUD-EDIT] PROFILE PICTURE UPLOADED');
                    } catch (error) {
                        console.error('[CRUD-EDIT] PROFILE PICTURE UPLOAD ERROR:', error);
                        showToast('Failed to upload profile picture', 'error');
                        return;
                    }
                }
                
                try {
                    console.log('[CRUD-EDIT] API REQUEST STARTING: PUT /students/' + id);
                    await apiRequest(`/students/${id}`, {
                        method: 'PUT',
                        body: JSON.stringify(updateData)
                    });
                    console.log('[CRUD-EDIT] API REQUEST SUCCESS');
                    showToast('Student updated successfully');
                    hideModal();
                    loadStudents();
                } catch (error) {
                    console.error('[CRUD-EDIT] API REQUEST ERROR:', error);
                    showToast('Failed to update student', 'error');
                }
            });
        } else {
            console.error('[CRUD-EDIT] FORM NOT FOUND');
        }
    } catch (error) {
        console.error('[CRUD-EDIT] LOAD STUDENT ERROR:', error);
        showToast('Failed to load student data', 'error');
    }
};

window.deleteProfilePicture = async function(id) {
    if (!confirm('Are you sure you want to remove this profile picture?')) return;
    
    try {
        await apiRequest(`/students/${id}/profile-picture`, { method: 'DELETE' });
        showToast('Profile picture removed successfully');
        editStudent(id); // Reload the edit form
    } catch (error) {
        console.error('Delete profile picture error:', error);
        showToast('Failed to remove profile picture', 'error');
    }
};

window.viewProfilePicture = function(imageUrl, studentName) {
    showModal(`
        <div class="modal-header">
            <h3>${studentName} - Profile Picture</h3>
            <button class="modal-close" onclick="hideModal()">&times;</button>
        </div>
        <div style="display: flex; justify-content: center; align-items: center; padding: 20px;">
            <img src="${imageUrl}" alt="${studentName}" style="max-width: 100%; max-height: 500px; border-radius: 8px; object-fit: contain;">
        </div>
    `);
};

window.deleteStudent = async function(id) {
    console.log('[CRUD-DELETE] BUTTON CLICKED', id);
    if (!confirm('Are you sure you want to delete this student?')) {
        console.log('[CRUD-DELETE] CONFIRMATION CANCELLED');
        return;
    }
    console.log('[CRUD-DELETE] CONFIRMED');
    
    try {
        console.log('[CRUD-DELETE] API REQUEST STARTING: DELETE /students/' + id);
        await apiRequest(`/students/${id}`, { method: 'DELETE' });
        console.log('[CRUD-DELETE] API REQUEST SUCCESS');
        showToast('Student deleted successfully');
        loadStudents();
    } catch (error) {
        console.error('[CRUD-DELETE] API REQUEST ERROR:', error);
        showToast('Failed to delete student: ' + (error.message || 'Unknown error'), 'error');
    }
};

// Course CRUD operations
const addCourseBtn = document.getElementById('addCourseBtn');
if (addCourseBtn) {
    addCourseBtn.addEventListener('click', () => {
        showModal(`
            <div class="modal-header">
                <h3>Add New Course</h3>
                <button class="modal-close" onclick="hideModal()">&times;</button>
            </div>
            <form id="addCourseForm" class="modal-form">
                <div class="form-group">
                    <label>Course Code *</label>
                    <input type="text" name="course_code" required>
                </div>
                <div class="form-group">
                    <label>Course Name *</label>
                    <input type="text" name="course_name" required>
                </div>
                <div class="form-group">
                    <label>Department</label>
                    <input type="text" name="department">
                </div>
                <div class="form-group">
                    <label>Duration (years)</label>
                    <input type="number" name="duration" min="1">
                </div>
                <div class="form-group">
                    <label>Description</label>
                    <textarea name="description" rows="3"></textarea>
                </div>
                <button type="submit" class="btn btn-primary">Add Course</button>
            </form>
        `);
        
        document.getElementById('addCourseForm').addEventListener('submit', async (e) => {
            e.preventDefault();
            const formData = new FormData(e.target);
            const courseData = Object.fromEntries(formData);
            
            try {
                await apiRequest('/courses', {
                    method: 'POST',
                    body: JSON.stringify(courseData)
                });
                showToast('Course added successfully');
                hideModal();
                loadCourses();
            } catch (error) {
                showToast('Failed to add course', 'error');
            }
        });
    });
}

window.editCourse = async function(id) {
    try {
        const course = await apiRequest(`/courses/${id}`);
        
        showModal(`
            <div class="modal-header">
                <h3>Edit Course</h3>
                <button class="modal-close" onclick="hideModal()">&times;</button>
            </div>
            <form id="editCourseForm" class="modal-form">
                <div class="form-group">
                    <label>Course Code</label>
                    <input type="text" name="course_code" value="${course.course_code}">
                </div>
                <div class="form-group">
                    <label>Course Name</label>
                    <input type="text" name="course_name" value="${course.course_name}">
                </div>
                <div class="form-group">
                    <label>Department</label>
                    <input type="text" name="department" value="${course.department || ''}">
                </div>
                <div class="form-group">
                    <label>Duration (years)</label>
                    <input type="number" name="duration" value="${course.duration || ''}" min="1">
                </div>
                <div class="form-group">
                    <label>Description</label>
                    <textarea name="description" rows="3">${course.description || ''}</textarea>
                </div>
                <button type="submit" class="btn btn-primary">Update Course</button>
            </form>
        `);
        
        document.getElementById('editCourseForm').addEventListener('submit', async (e) => {
            e.preventDefault();
            const formData = new FormData(e.target);
            const updateData = Object.fromEntries(formData);
            
            try {
                await apiRequest(`/courses/${id}`, {
                    method: 'PUT',
                    body: JSON.stringify(updateData)
                });
                showToast('Course updated successfully');
                hideModal();
                loadCourses();
            } catch (error) {
                console.error('Update course error:', error);
                showToast('Failed to update course: ' + (error.message || 'Unknown error'), 'error');
            }
        });
    } catch (error) {
        console.error('Load course error:', error);
        showToast('Failed to load course data: ' + (error.message || 'Unknown error'), 'error');
    }
};

window.deleteCourse = async function(id) {
    if (!confirm('Are you sure you want to delete this course?')) return;
    
    try {
        await apiRequest(`/courses/${id}`, { method: 'DELETE' });
        showToast('Course deleted successfully');
        loadCourses();
    } catch (error) {
        console.error('Delete course error:', error);
        showToast('Failed to delete course: ' + (error.message || 'Unknown error'), 'error');
    }
};

// Load lecturers
async function loadLecturers() {
    console.log('[LECTURERS] Request started');
    try {
        const lecturerSearch = document.getElementById('lecturerSearch');
        const lecturerFilter = document.getElementById('lecturerFilter');
        const search = lecturerSearch ? lecturerSearch.value : '';
        const filter = lecturerFilter ? lecturerFilter.value : '';
        
        let endpoint = '/students/lecturers';
        const params = [];
        if (search) params.push(`search=${encodeURIComponent(search)}`);
        if (filter) params.push(`status=${filter}`);
        if (params.length) endpoint += '?' + params.join('&');
        
        console.log(`[LECTURERS] API Endpoint: GET ${endpoint}`);
        const lecturers = await apiRequest(endpoint);
        console.log('[LECTURERS] Response received');
        console.log('[LECTURERS] Data:', JSON.stringify(lecturers, null, 2));
        
        const tbody = document.getElementById('lecturersTableBody');
        
        if (!lecturers || lecturers.length === 0) {
            tbody.innerHTML = '<tr><td colspan="6" class="text-center">No lecturers found</td></tr>';
            console.log('[LECTURERS] Success: No lecturers found');
            return;
        }

        tbody.innerHTML = lecturers.map(lecturer => `
            <tr>
                <td>${lecturer.full_name}</td>
                <td>${lecturer.email}</td>
                <td>${lecturer.course_name || 'Not assigned'}</td>
                <td>${lecturer.phone || 'N/A'}</td>
                <td><span class="status-badge status-${lecturer.status}">${lecturer.status}</span></td>
                <td>
                    <button class="action-btn edit" onclick="editLecturer(${lecturer.id})">Edit</button>
                    <button class="action-btn delete" onclick="deleteLecturer(${lecturer.id})">Delete</button>
                </td>
            </tr>
        `).join('');
        console.log('[LECTURERS] Success: Data rendered');
    } catch (error) {
        console.error('[LECTURERS] Error:', error);
        console.error('[LECTURERS] Error message:', error.message);
        const tbody = document.getElementById('lecturersTableBody');
        if (tbody) {
            tbody.innerHTML = '<tr><td colspan="6" class="text-center">Failed to load lecturers. Please try again.</td></tr>';
        }
        showToast('Failed to load lecturers', 'error');
    }
}

// Lecturer CRUD operations
const addLecturerBtn = document.getElementById('addLecturerBtn');
if (addLecturerBtn) {
    addLecturerBtn.addEventListener('click', async () => {
        try {
            const courses = await apiRequest('/courses');
            
            showModal(`
                <div class="modal-header">
                    <h3>Add New Lecturer</h3>
                    <button class="modal-close" onclick="hideModal()">&times;</button>
                </div>
                <form id="addLecturerForm" class="modal-form">
                    <div class="form-group">
                        <label>Full Name *</label>
                        <input type="text" name="full_name" required>
                    </div>
                    <div class="form-group">
                        <label>Email *</label>
                        <input type="email" name="email" required>
                    </div>
                    <div class="form-group">
                        <label>Password *</label>
                        <input type="password" name="password" required minlength="6">
                    </div>
                    <div class="form-group">
                        <label>Phone</label>
                        <input type="tel" name="phone">
                    </div>
                    <div class="form-group">
                        <label>Gender</label>
                        <select name="gender">
                            <option value="">Select Gender</option>
                            <option value="male">Male</option>
                            <option value="female">Female</option>
                        </select>
                    </div>
                    <div class="form-group">
                        <label>Course *</label>
                        <select name="course_id" required>
                            <option value="">Select Course</option>
                            ${courses.map(c => `<option value="${c.id}">${c.course_name} (${c.course_code})</option>`).join('')}
                        </select>
                    </div>
                    <button type="submit" class="btn btn-primary">Add Lecturer</button>
                </form>
            `);
            
            document.getElementById('addLecturerForm').addEventListener('submit', async (e) => {
                e.preventDefault();
                const formData = new FormData(e.target);
                const lecturerData = Object.fromEntries(formData);
                
                try {
                    await apiRequest('/students/lecturers', {
                        method: 'POST',
                        body: JSON.stringify(lecturerData)
                    });
                    showToast('Lecturer added successfully');
                    hideModal();
                    loadLecturers();
                } catch (error) {
                    showToast('Failed to add lecturer', 'error');
                }
            });
        } catch (error) {
            console.error('Load courses error:', error);
            showToast('Failed to load courses', 'error');
        }
    });
}

async function editLecturer(id) {
    try {
        const lecturer = await apiRequest(`/students/lecturers/${id}`);
        const courses = await apiRequest('/courses');
        
        showModal(`
            <div class="modal-header">
                <h3>Edit Lecturer</h3>
                <button class="modal-close" onclick="hideModal()">&times;</button>
            </div>
            <form id="editLecturerForm" class="modal-form">
                <div class="form-group">
                    <label>Full Name</label>
                    <input type="text" name="full_name" value="${lecturer.full_name}">
                </div>
                <div class="form-group">
                    <label>Email</label>
                    <input type="email" name="email" value="${lecturer.email}">
                </div>
                <div class="form-group">
                    <label>Phone</label>
                    <input type="tel" name="phone" value="${lecturer.phone || ''}">
                </div>
                <div class="form-group">
                    <label>Gender</label>
                    <select name="gender">
                        <option value="">Select Gender</option>
                        <option value="male" ${lecturer.gender === 'male' ? 'selected' : ''}>Male</option>
                        <option value="female" ${lecturer.gender === 'female' ? 'selected' : ''}>Female</option>
                    </select>
                </div>
                <div class="form-group">
                    <label>Course</label>
                    <select name="course_id">
                        <option value="">Select Course</option>
                        ${courses.map(c => `<option value="${c.id}" ${lecturer.course_id === c.id ? 'selected' : ''}>${c.course_name} (${c.course_code})</option>`).join('')}
                    </select>
                </div>
                <div class="form-group">
                    <label>Status</label>
                    <select name="status">
                        <option value="active" ${lecturer.status === 'active' ? 'selected' : ''}>Active</option>
                        <option value="suspended" ${lecturer.status === 'suspended' ? 'selected' : ''}>Suspended</option>
                    </select>
                </div>
                <button type="submit" class="btn btn-primary">Update Lecturer</button>
            </form>
        `);
        
        document.getElementById('editLecturerForm').addEventListener('submit', async (e) => {
            e.preventDefault();
            const formData = new FormData(e.target);
            const updateData = Object.fromEntries(formData);
            
            try {
                await apiRequest(`/students/lecturers/${id}`, {
                    method: 'PUT',
                    body: JSON.stringify(updateData)
                });
                showToast('Lecturer updated successfully');
                hideModal();
                loadLecturers();
            } catch (error) {
                showToast('Failed to update lecturer', 'error');
            }
        });
    } catch (error) {
        showToast('Failed to load lecturer data', 'error');
    }
}

window.editLecturer = editLecturer;

async function deleteLecturer(id) {
    if (!confirm('Are you sure you want to delete this lecturer?')) return;
    
    try {
        await apiRequest(`/students/lecturers/${id}`, { method: 'DELETE' });
        showToast('Lecturer deleted successfully');
        loadLecturers();
    } catch (error) {
        showToast('Failed to delete lecturer', 'error');
    }
}

window.deleteLecturer = deleteLecturer;

// Fee CRUD operations
const addFeeBtn = document.getElementById('addFeeBtn');
if (addFeeBtn) {
    addFeeBtn.addEventListener('click', async () => {
        try {
            const students = await apiRequest('/students');
            
            showModal(`
                <div class="modal-header">
                    <h3>Add New Fee</h3>
                    <button class="modal-close" onclick="hideModal()">&times;</button>
                </div>
                <form id="addFeeForm" class="modal-form">
                    <div class="form-group">
                        <label>Student *</label>
                        <select name="user_id" required>
                            <option value="">Select Student</option>
                            ${students.map(s => `<option value="${s.id}">${s.full_name} (${s.student_number})</option>`).join('')}
                        </select>
                    </div>
                    <div class="form-group">
                        <label>Fee Category *</label>
                        <select name="fee_category" required>
                            <option value="Registration">Registration</option>
                            <option value="Tuition">Tuition</option>
                            <option value="Examination">Examination</option>
                            <option value="Accommodation">Accommodation</option>
                            <option value="Library">Library</option>
                            <option value="Other">Other</option>
                        </select>
                    </div>
                    <div class="form-group">
                        <label>Amount *</label>
                        <input type="number" name="amount" required min="0" step="0.01">
                    </div>
                    <div class="form-group">
                        <label>Due Date</label>
                        <input type="date" name="due_date">
                    </div>
                    <button type="submit" class="btn btn-primary">Add Fee</button>
                </form>
            `);
            
            document.getElementById('addFeeForm').addEventListener('submit', async (e) => {
                e.preventDefault();
                const formData = new FormData(e.target);
                const feeData = Object.fromEntries(formData);
                
                try {
                    await apiRequest('/fees', {
                        method: 'POST',
                        body: JSON.stringify(feeData)
                    });
                    showToast('Fee added successfully');
                    hideModal();
                    loadFees();
                } catch (error) {
                    showToast('Failed to add fee', 'error');
                }
            });
        } catch (error) {
            showToast('Failed to load students', 'error');
        }
    });
}

async function recordPayment(id) {
    showModal(`
        <div class="modal-header">
            <h3>Record Payment</h3>
            <button class="modal-close" onclick="hideModal()">&times;</button>
        </div>
        <form id="paymentForm" class="modal-form">
            <div class="form-group">
                <label>Amount Paid *</label>
                <input type="number" name="amount_paid" required min="0" step="0.01">
            </div>
            <div class="form-group">
                <label>Payment Method</label>
                <select name="payment_method">
                    <option value="Cash">Cash</option>
                    <option value="Bank Transfer">Bank Transfer</option>
                    <option value="Mobile Money">Mobile Money</option>
                    <option value="Card">Card</option>
                </select>
            </div>
            <div class="form-group">
                <label>Payment Reference</label>
                <input type="text" name="payment_reference">
            </div>
            <button type="submit" class="btn btn-primary">Record Payment</button>
        </form>
    `);
    
    document.getElementById('paymentForm').addEventListener('submit', async (e) => {
        e.preventDefault();
        const formData = new FormData(e.target);
        const paymentData = Object.fromEntries(formData);
        
        try {
            await apiRequest(`/fees/${id}/payment`, {
                method: 'POST',
                body: JSON.stringify(paymentData)
            });
            showToast('Payment recorded successfully');
            hideModal();
            loadFees();
        } catch (error) {
            showToast('Failed to record payment', 'error');
        }
    });
}

async function editFee(id) {
    try {
        const fee = await apiRequest(`/fees/${id}`);
        const students = await apiRequest('/students');
        const paymentHistory = await apiRequest(`/payment-history/fee/${id}`);
        
        const historyHtml = paymentHistory.length > 0 
            ? `<div class="payment-history">
                <h4>Payment History</h4>
                <table class="payment-history-table">
                    <thead>
                        <tr>
                            <th>Date</th>
                            <th>Amount</th>
                            <th>Method</th>
                            <th>Reference</th>
                            <th>Receipt</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${paymentHistory.map(p => `
                            <tr>
                                <td>${new Date(p.payment_date).toLocaleDateString()}</td>
                                <td>$${p.amount_paid.toFixed(2)}</td>
                                <td>${p.payment_method || 'N/A'}</td>
                                <td>${p.payment_reference || 'N/A'}</td>
                                <td>${p.receipt_number || 'N/A'}</td>
                            </tr>
                        `).join('')}
                    </tbody>
                </table>
            </div>`
            : '<p>No payment history</p>';
        
        showModal(`
            <div class="modal-header">
                <h3>Edit Fee - ${fee.full_name}</h3>
                <button class="modal-close" onclick="hideModal()">&times;</button>
            </div>
            <div class="modal-content">
                <div class="fee-summary">
                    <p><strong>Total Amount:</strong> $${fee.amount.toFixed(2)}</p>
                    <p><strong>Amount Paid:</strong> $${fee.amount_paid.toFixed(2)}</p>
                    <p><strong>Balance:</strong> $${fee.balance.toFixed(2)}</p>
                    <p><strong>Status:</strong> ${fee.status}</p>
                </div>
                ${historyHtml}
                <hr>
                <h4>Record New Payment</h4>
                <form id="paymentForm" class="modal-form">
                    <div class="form-group">
                        <label>Amount Paid *</label>
                        <input type="number" name="amount_paid" required min="0" step="0.01">
                    </div>
                    <div class="form-group">
                        <label>Payment Method</label>
                        <select name="payment_method">
                            <option value="Cash">Cash</option>
                            <option value="Bank Transfer">Bank Transfer</option>
                            <option value="Mobile Money">Mobile Money</option>
                            <option value="Card">Card</option>
                        </select>
                    </div>
                    <div class="form-group">
                        <label>Payment Reference</label>
                        <input type="text" name="payment_reference">
                    </div>
                    <button type="submit" class="btn btn-primary">Record Payment</button>
                </form>
            </div>
        `);
        
        document.getElementById('paymentForm').addEventListener('submit', async (e) => {
            e.preventDefault();
            const formData = new FormData(e.target);
            const paymentData = Object.fromEntries(formData);
            
            try {
                await apiRequest(`/fees/${id}/payment`, {
                    method: 'POST',
                    body: JSON.stringify(paymentData)
                });
                showToast('Payment recorded successfully');
                hideModal();
                loadFees();
            } catch (error) {
                showToast('Failed to record payment', 'error');
            }
        });
    } catch (error) {
        showToast('Failed to load fee details', 'error');
    }
}

async function deleteFee(id) {
    if (!confirm('Are you sure you want to delete this fee?')) return;
    
    try {
        await apiRequest(`/fees/${id}`, { method: 'DELETE' });
        showToast('Fee deleted successfully');
        loadFees();
    } catch (error) {
        showToast('Failed to delete fee', 'error');
    }
}

window.deleteFee = deleteFee;

// Result CRUD operations
const addResultBtn = document.getElementById('addResultBtn');
if (addResultBtn) {
    addResultBtn.addEventListener('click', async () => {
        try {
            const students = await apiRequest('/students');
            const courses = await apiRequest('/courses');
            
            showModal(`
                <div class="modal-header">
                    <h3>Add New Result</h3>
                    <button class="modal-close" onclick="hideModal()">&times;</button>
                </div>
                <form id="addResultForm" class="modal-form">
                    <div class="form-group">
                        <label>Student *</label>
                        <select name="user_id" required id="studentSelect">
                            <option value="">Select Student</option>
                            ${students.map(s => `<option value="${s.id}">${s.full_name} (${s.student_number})</option>`).join('')}
                        </select>
                    </div>
                    <div class="form-group">
                        <label>Course *</label>
                        <select name="course_id" required id="courseSelect">
                            <option value="">Select Course</option>
                            ${courses.map(c => `<option value="${c.id}">${c.course_name} (${c.course_code})</option>`).join('')}
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
                    <button type="submit" class="btn btn-primary">Add Result</button>
                </form>
            `);
            
            // Load subjects when course is selected
            const courseSelect = document.getElementById('courseSelect');
            if (courseSelect) {
                courseSelect.addEventListener('change', async (e) => {
                    const courseId = e.target.value;
                    if (courseId) {
                        try {
                            const subjects = await apiRequest(`/subjects/course/${courseId}`);
                            const subjectsContainer = document.getElementById('subjectsContainer');
                            const subjectsList = document.getElementById('subjectsList');
                            
                            if (subjects && subjects.length > 0) {
                                subjectsContainer.style.display = 'block';
                                subjectsList.innerHTML = subjects.map(subject => `
                                    <div class="form-group subject-mark-group">
                                        <label>${subject.subject_name} (${subject.subject_code})</label>
                                        <input type="number" 
                                               class="subject-mark-input" 
                                               data-subject-id="${subject.id}" 
                                               placeholder="Enter mark (0-100)" 
                                               min="0" 
                                               max="100">
                                    </div>
                                `).join('');
                            } else {
                                subjectsContainer.style.display = 'none';
                            }
                        } catch (error) {
                            console.error('Failed to load subjects:', error);
                        }
                    } else {
                        const subjectsContainer = document.getElementById('subjectsContainer');
                        if (subjectsContainer) subjectsContainer.style.display = 'none';
                    }
                });
            }
            
            document.getElementById('addResultForm').addEventListener('submit', async (e) => {
                e.preventDefault();
                const formData = new FormData(e.target);
                const resultData = Object.fromEntries(formData);
                
                // Collect subject marks
                const subjectMarks = [];
                document.querySelectorAll('.subject-mark-input').forEach(input => {
                    if (input.value) {
                        subjectMarks.push({
                            subject_id: input.dataset.subjectId,
                            mark: parseFloat(input.value)
                        });
                    }
                });
                
                resultData.subject_results = subjectMarks;
                
                try {
                    await apiRequest('/results', {
                        method: 'POST',
                        body: JSON.stringify(resultData)
                    });
                    showToast('Result added successfully');
                    hideModal();
                    loadResults();
                } catch (error) {
                    showToast('Failed to add result', 'error');
                }
            });
        } catch (error) {
            console.error('Load data error:', error);
            showToast('Failed to load data', 'error');
        }
    });
}

async function editResult(id) {
    try {
        const result = await apiRequest(`/results/${id}`);
        const students = await apiRequest('/students');
        const courses = await apiRequest('/courses');
        
        showModal(`
            <div class="modal-header">
                <h3>Edit Result</h3>
                <button class="modal-close" onclick="hideModal()">&times;</button>
            </div>
            <form id="editResultForm" class="modal-form">
                <div class="form-group">
                    <label>Student *</label>
                    <select name="user_id" required>
                        ${students.map(s => `<option value="${s.id}" ${result.user_id === s.id ? 'selected' : ''}>${s.full_name} (${s.student_number})</option>`).join('')}
                    </select>
                </div>
                <div class="form-group">
                    <label>Course *</label>
                    <select name="course_id" required>
                        ${courses.map(c => `<option value="${c.id}" ${result.course_id === c.id ? 'selected' : ''}>${c.course_name} (${c.course_code})</option>`).join('')}
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
                <div class="form-group">
                    <label>Assessment Mark</label>
                    <input type="number" name="assessment_mark" value="${result.assessment_mark || ''}" min="0" max="100">
                </div>
                <div class="form-group">
                    <label>Exam Mark</label>
                    <input type="number" name="exam_mark" value="${result.exam_mark || ''}" min="0" max="100">
                </div>
                <div class="form-group">
                    <label>Remarks</label>
                    <input type="text" name="remarks" value="${result.remarks || ''}">
                </div>
                <button type="submit" class="btn btn-primary">Update Result</button>
            </form>
        `);
        
        document.getElementById('editResultForm').addEventListener('submit', async (e) => {
            e.preventDefault();
            const formData = new FormData(e.target);
            const updateData = Object.fromEntries(formData);
            
            try {
                await apiRequest(`/results/${id}`, {
                    method: 'PUT',
                    body: JSON.stringify(updateData)
                });
                showToast('Result updated successfully');
                hideModal();
                loadResults();
            } catch (error) {
                showToast('Failed to update result: ' + (error.message || 'Unknown error'), 'error');
            }
        });
    } catch (error) {
        showToast('Failed to load result data: ' + (error.message || 'Unknown error'), 'error');
    }
}

window.editResult = editResult;

async function deleteResult(id) {
    if (!confirm('Are you sure you want to delete this result?')) return;
    
    try {
        await apiRequest(`/results/${id}`, { method: 'DELETE' });
        showToast('Result deleted successfully');
        loadResults();
    } catch (error) {
        showToast('Failed to delete result', 'error');
    }
}

window.deleteResult = deleteResult;

// Subject CRUD operations
async function loadSubjects() {
    console.log('[SUBJECTS] Request started');
    try {
        const subjectSearch = document.getElementById('subjectSearch');
        const courseFilter = document.getElementById('courseFilter');
        const search = subjectSearch ? subjectSearch.value : '';
        const courseFilterValue = courseFilter ? courseFilter.value : '';
        
        let endpoint = '/subjects';
        const params = [];
        if (search) params.push(`search=${encodeURIComponent(search)}`);
        if (courseFilterValue) params.push(`course_id=${courseFilterValue}`);
        if (params.length) endpoint += '?' + params.join('&');
        
        console.log(`[SUBJECTS] API Endpoint: GET ${endpoint}`);
        const subjects = await apiRequest(endpoint);
        console.log('[SUBJECTS] Response received');
        console.log('[SUBJECTS] Data:', JSON.stringify(subjects, null, 2));
        
        const tbody = document.getElementById('subjectsTableBody');
        
        if (!subjects || subjects.length === 0) {
            tbody.innerHTML = '<tr><td colspan="5" class="text-center">No subjects found</td></tr>';
            console.log('[SUBJECTS] Success: No subjects found');
            return;
        }

        tbody.innerHTML = subjects.map(subject => `
            <tr>
                <td>${subject.subject_code}</td>
                <td>${subject.subject_name}</td>
                <td>${subject.course_name || 'N/A'}</td>
                <td>${subject.credits || 1}</td>
                <td>
                    <button class="action-btn edit" onclick="editSubject(${subject.id})">Edit</button>
                    <button class="action-btn delete" onclick="deleteSubject(${subject.id})">Delete</button>
                </td>
            </tr>
        `).join('');
        console.log('[SUBJECTS] Success: Data rendered');
    } catch (error) {
        console.error('[SUBJECTS] Error:', error);
        console.error('[SUBJECTS] Error message:', error.message);
        const tbody = document.getElementById('subjectsTableBody');
        if (tbody) {
            tbody.innerHTML = '<tr><td colspan="5" class="text-center">Failed to load subjects. Please try again.</td></tr>';
        }
        showToast('Failed to load subjects', 'error');
    }
}

window.addSubject = async () => {
    try {
        const courses = await apiRequest('/courses');
        
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
                    <label>Course *</label>
                    <select name="course_id" required>
                        <option value="">Select Course</option>
                        ${courses.map(c => `<option value="${c.id}">${c.course_name} (${c.course_code})</option>`).join('')}
                    </select>
                </div>
                <div class="form-group">
                    <label>Credits</label>
                    <input type="number" name="credits" value="1" min="1" max="10">
                </div>
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
        showToast('Failed to load courses', 'error');
    }
};

async function editSubject(id) {
    try {
        const subject = await apiRequest(`/subjects/${id}`);
        const courses = await apiRequest('/courses');
        
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
                    <label>Course *</label>
                    <select name="course_id" required>
                        ${courses.map(c => `<option value="${c.id}" ${subject.course_id === c.id ? 'selected' : ''}>${c.course_name} (${c.course_code})</option>`).join('')}
                    </select>
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
        showToast('Failed to load subject data: ' + (error.message || 'Unknown error'), 'error');
    }
}

window.editSubject = editSubject;

async function deleteSubject(id) {
    if (!confirm('Are you sure you want to delete this subject? This will also delete all associated subject marks.')) return;
    
    try {
        await apiRequest(`/subjects/${id}`, { method: 'DELETE' });
        showToast('Subject deleted successfully');
        loadSubjects();
    } catch (error) {
        showToast('Failed to delete subject', 'error');
    }
}

window.deleteSubject = deleteSubject;

// Load courses for subject filter
async function loadSubjectCourseFilter() {
    try {
        const courses = await apiRequest('/courses');
        const select = document.getElementById('subjectCourseFilter');
        
        select.innerHTML = '<option value="">All Courses</option>' + 
            courses.map(c => `<option value="${c.id}">${c.course_name} (${c.course_code})</option>`).join('');
    } catch (error) {
        console.error('Error loading courses for filter:', error);
    }
}

// Announcement CRUD operations
const addAnnouncementBtn = document.getElementById('addAnnouncementBtn');
if (addAnnouncementBtn) {
    addAnnouncementBtn.addEventListener('click', () => {
        showModal(`
            <div class="modal-header">
                <h3>Add New Announcement</h3>
                <button class="modal-close" onclick="hideModal()">&times;</button>
            </div>
            <form id="addAnnouncementForm" class="modal-form">
                <div class="form-group">
                    <label>Title *</label>
                    <input type="text" name="title" required>
                </div>
                <div class="form-group">
                    <label>Message *</label>
                    <textarea name="message" rows="4" required></textarea>
                </div>
                <div class="form-group">
                    <label>Priority</label>
                    <select name="priority">
                        <option value="low">Low</option>
                        <option value="normal" selected>Normal</option>
                        <option value="important">Important</option>
                        <option value="urgent">Urgent</option>
                    </select>
                </div>
                <button type="submit" class="btn btn-primary">Add Announcement</button>
            </form>
        `);
        
        document.getElementById('addAnnouncementForm').addEventListener('submit', async (e) => {
            e.preventDefault();
            const formData = new FormData(e.target);
            const data = {
                title: formData.get('title'),
                message: formData.get('message'),
                priority: formData.get('priority')
            };
            
            try {
                await apiRequest('/announcements', {
                    method: 'POST',
                    body: JSON.stringify(data)
                });
                showToast('Announcement added successfully');
                hideModal();
                loadAnnouncements();
            } catch (error) {
                showToast('Failed to add announcement', 'error');
            }
        });
    });
}

async function editAnnouncement(id) {
    try {
        const announcement = await apiRequest(`/announcements/${id}`);
        
        showModal(`
            <div class="modal-header">
                <h3>Edit Announcement</h3>
                <button class="modal-close" onclick="hideModal()">&times;</button>
            </div>
            <form id="editAnnouncementForm" class="modal-form">
                <div class="form-group">
                    <label>Title</label>
                    <input type="text" name="title" value="${announcement.title}">
                </div>
                <div class="form-group">
                    <label>Message</label>
                    <textarea name="message" rows="4">${announcement.message}</textarea>
                </div>
                <div class="form-group">
                    <label>Priority</label>
                    <select name="priority">
                        <option value="low" ${announcement.priority === 'low' ? 'selected' : ''}>Low</option>
                        <option value="normal" ${announcement.priority === 'normal' ? 'selected' : ''}>Normal</option>
                        <option value="important" ${announcement.priority === 'important' ? 'selected' : ''}>Important</option>
                        <option value="urgent" ${announcement.priority === 'urgent' ? 'selected' : ''}>Urgent</option>
                    </select>
                </div>
                <button type="submit" class="btn btn-primary">Update Announcement</button>
            </form>
        `);
        
        document.getElementById('editAnnouncementForm').addEventListener('submit', async (e) => {
            e.preventDefault();
            const formData = new FormData(e.target);
            const data = {
                title: formData.get('title'),
                message: formData.get('message'),
                priority: formData.get('priority')
            };
            
            try {
                await apiRequest(`/announcements/${id}`, {
                    method: 'PUT',
                    body: JSON.stringify(data)
                });
                showToast('Announcement updated successfully');
                hideModal();
                loadAnnouncements();
            } catch (error) {
                showToast('Failed to update announcement', 'error');
            }
        });
    } catch (error) {
        showToast('Failed to load announcement data', 'error');
    }
}

window.editAnnouncement = editAnnouncement;

async function deleteAnnouncement(id) {
    if (!confirm('Are you sure you want to delete this announcement?')) return;
    
    try {
        await apiRequest(`/announcements/${id}`, { method: 'DELETE' });
        showToast('Announcement deleted successfully');
        loadAnnouncements();
    } catch (error) {
        showToast('Failed to delete announcement', 'error');
    }
}

window.deleteAnnouncement = deleteAnnouncement;

// Helper function to load courses dropdown
async function loadCourseDropdown(selectedId = null) {
    try {
        const courses = await apiRequest('/courses');
        const select = document.getElementById('courseSelect');
        if (select) {
            select.innerHTML = '<option value="">Select Course</option>' + 
                courses.map(c => `<option value="${c.id}" ${c.id === selectedId ? 'selected' : ''}>${c.course_name}</option>`).join('');
        }
    } catch (error) {
        console.error('Error loading courses:', error);
    }
}

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
    
    const modalContainer = document.getElementById('modalContainer');
    if (modalContainer) {
        modalContainer.innerHTML = modalHtml;
        modalContainer.style.display = 'flex';
        
        const changePasswordForm = document.getElementById('changePasswordForm');
        if (changePasswordForm) {
            changePasswordForm.addEventListener('submit', async (e) => {
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
                        method: 'POST',
                        body: JSON.stringify({ current_password: currentPassword, new_password: newPassword })
                    });
                    showToast('Password changed successfully');
                    closeModal();
                } catch (error) {
                    showToast('Failed to change password', 'error');
                }
            });
        }
    }
}

// Close modal
function closeModal() {
    const modalContainer = document.getElementById('modalContainer');
    if (modalContainer) {
        modalContainer.style.display = 'none';
    }
}

// Search and filter event listeners
const studentSearch = document.getElementById('studentSearch');
const studentFilter = document.getElementById('studentFilter');
const courseSearch = document.getElementById('courseSearch');
const feeSearch = document.getElementById('feeSearch');
const feeFilter = document.getElementById('feeFilter');
const resultSearch = document.getElementById('resultSearch');
const semesterFilter = document.getElementById('semesterFilter');
const subjectSearch = document.getElementById('subjectSearch');

if (studentSearch) studentSearch.addEventListener('input', loadStudents);
if (studentFilter) studentFilter.addEventListener('change', loadStudents);
if (courseSearch) courseSearch.addEventListener('input', loadCourses);
if (feeSearch) feeSearch.addEventListener('input', loadFees);
if (feeFilter) feeFilter.addEventListener('change', loadFees);
if (resultSearch) resultSearch.addEventListener('input', loadResults);
if (semesterFilter) semesterFilter.addEventListener('change', loadResults);
if (subjectSearch) subjectSearch.addEventListener('input', loadSubjects);
// Subject course filter change handler
const subjectCourseFilter = document.getElementById('subjectCourseFilter');
if (subjectCourseFilter) {
    subjectCourseFilter.addEventListener('change', loadSubjects);
}

// View all links
document.querySelectorAll('.view-all').forEach(link => {
    link.addEventListener('click', (e) => {
        e.preventDefault();
        const page = link.dataset.page;
        navigateTo(page);
    });
});

// Backup database handler
const backupDbBtn = document.getElementById('backupDbBtn');
if (backupDbBtn) {
    backupDbBtn.addEventListener('click', async () => {
        try {
            const response = await fetch(`${API_BASE}/auth/backup/database`, {
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });
            
            if (!response.ok) {
                throw new Error('Failed to backup database');
            }
            
            const blob = await response.blob();
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `mushagashe-db-backup-${new Date().toISOString().split('T')[0]}.db`;
            document.body.appendChild(a);
            a.click();
            window.URL.revokeObjectURL(url);
            document.body.removeChild(a);
            
            showToast('Database backed up successfully');
        } catch (error) {
            console.error('Backup error:', error);
            showToast('Failed to backup database', 'error');
        }
    });
}

// Restore database handler
const restoreDbBtn = document.getElementById('restoreDbBtn');
if (restoreDbBtn) {
    restoreDbBtn.addEventListener('click', () => {
        showRestoreModal();
    });
}

// Show restore modal
function showRestoreModal() {
    const modalHtml = `
        <div class="modal-backdrop" onclick="closeModal()">
            <div class="modal-content" onclick="event.stopPropagation()">
                <div class="modal-header">
                    <h2>Restore Database</h2>
                    <button class="modal-close" onclick="closeModal()">&times;</button>
                </div>
                <div class="modal-body">
                    <p style="margin-bottom: 15px; color: var(--danger);">
                        ⚠️ Warning: This will replace all current data with the backup. This action cannot be undone.
                    </p>
                    <form id="restoreForm">
                        <div class="form-group">
                            <label for="dbFile">Select Database File (.db)</label>
                            <input type="file" id="dbFile" name="database" accept=".db" required>
                        </div>
                        <button type="submit" class="btn btn-primary">Restore Database</button>
                    </form>
                </div>
            </div>
        </div>
    `;
    
    document.getElementById('modalContainer').innerHTML = modalHtml;
    document.getElementById('modalContainer').style.display = 'flex';
    
    document.getElementById('restoreForm').addEventListener('submit', async (e) => {
        e.preventDefault();
        const fileInput = document.getElementById('dbFile');
        const file = fileInput.files[0];
        
        if (!file) {
            showToast('Please select a database file', 'error');
            return;
        }
        
        const formData = new FormData();
        formData.append('database', file);
        
        try {
            const response = await fetch(`${API_BASE}/auth/restore/database`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`
                },
                body: formData
            });
            
            const data = await response.json();
            
            if (!response.ok) {
                throw new Error(data.error || 'Failed to restore database');
            }
            
            showToast('Database restored successfully. Please refresh the page.');
            closeModal();
            location.reload();
        } catch (error) {
            console.error('Restore error:', error);
            showToast(error.message || 'Failed to restore database', 'error');
        }
    });
}

// Change password handler
const changePasswordBtn = document.getElementById('changePasswordBtn');
if (changePasswordBtn) {
    changePasswordBtn.addEventListener('click', () => {
        showChangePasswordModal();
    });
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

// Template management functions
async function loadTemplateInfo() {
    try {
        const templateInfo = await apiRequest('/templates/info');
        const templateInfoDiv = document.getElementById('templateInfo');
        const templateActions = document.getElementById('templateActions');
        
        if (templateInfoDiv && templateActions) {
            if (templateInfo.hasTemplate) {
                templateInfoDiv.innerHTML = `
                    <div class="template-status success">
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path>
                            <polyline points="22 4 12 14.01 9 11.01"></polyline>
                        </svg>
                        <span>Template uploaded on ${new Date(templateInfo.uploadedAt).toLocaleDateString()} (${(templateInfo.size / 1024).toFixed(2)} KB)</span>
                    </div>
                `;
                templateActions.style.display = 'block';
            } else {
                templateInfoDiv.innerHTML = `
                    <div class="template-status warning">
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <circle cx="12" cy="12" r="10"></circle>
                            <line x1="12" y1="8" x2="12" y2="12"></line>
                            <line x1="12" y1="16" x2="12.01" y2="16"></line>
                        </svg>
                        <span>No custom template uploaded. Using default template.</span>
                    </div>
                `;
                templateActions.style.display = 'none';
            }
        }
    } catch (error) {
        console.error('Failed to load template info:', error);
        const templateInfoDiv = document.getElementById('templateInfo');
        if (templateInfoDiv) {
            templateInfoDiv.innerHTML = `
                <div class="template-status error">
                    <span>Failed to load template information</span>
                </div>
            `;
        }
    }
}

// Template upload handler
document.getElementById('uploadTemplateForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const formData = new FormData(e.target);
    const file = formData.get('template');
    
    if (!file) {
        showToast('Please select a file', 'error');
        return;
    }
    
    if (file.size > 10 * 1024 * 1024) {
        showToast('File size exceeds 10MB limit', 'error');
        return;
    }
    
    if (file.type !== 'application/pdf') {
        showToast('Only PDF files are allowed', 'error');
        return;
    }
    
    try {
        const currentToken = localStorage.getItem('token');
        const response = await fetch(`${API_BASE}/templates/upload`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${currentToken}`
            },
            body: formData
        });
        
        const data = await response.json();
        
        if (!response.ok) {
            throw new Error(data.error || 'Failed to upload template');
        }
        
        showToast('Template uploaded successfully');
        e.target.reset();
        loadTemplateInfo();
    } catch (error) {
        console.error('Upload error:', error);
        showToast(error.message || 'Failed to upload template', 'error');
    }
});

// Template delete handler
document.getElementById('deleteTemplateBtn').addEventListener('click', async () => {
    if (!confirm('Are you sure you want to delete the custom template? The default template will be used instead.')) return;
    
    try {
        await apiRequest('/templates/delete', { method: 'DELETE' });
        showToast('Template deleted successfully');
        loadTemplateInfo();
    } catch (error) {
        console.error('Delete error:', error);
        showToast('Failed to delete template', 'error');
    }
});

// Check authentication on load
window.addEventListener('load', () => {
    const currentToken = localStorage.getItem('token');
    const currentUser = JSON.parse(localStorage.getItem('user') || '{}');
    
    if (!currentToken || currentUser.role !== 'admin') {
        window.location.href = 'admin-login.html';
        return;
    }

    // Update header
    const adminName = document.getElementById('adminName');
    const headerAdminName = document.getElementById('headerAdminName');
    if (adminName) adminName.textContent = currentUser.full_name;
    if (headerAdminName) headerAdminName.textContent = currentUser.full_name;

    // Load initial data
    loadDashboardStatistics();
});

// Close modal when clicking outside
const modalContainer = document.getElementById('modalContainer');
if (modalContainer) {
    modalContainer.addEventListener('click', (e) => {
        if (e.target.id === 'modalContainer') {
            hideModal();
        }
    });
}
