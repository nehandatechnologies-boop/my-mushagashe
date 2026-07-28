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
    document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
    document.getElementById(`${page}-page`).classList.add('active');
    
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
        case 'fees':
            await loadFees();
            break;
        case 'results':
            await loadResults();
            break;
        case 'announcements':
            await loadAnnouncements();
            break;
    }
}

// Load dashboard statistics
async function loadDashboardStatistics() {
    try {
        const stats = await apiRequest('/dashboard/statistics');
        
        document.getElementById('totalStudents').textContent = stats.students.total;
        document.getElementById('totalCourses').textContent = stats.courses.total;
        document.getElementById('revenueCollected').textContent = `$${stats.fees.total_collected.toFixed(2)}`;
        document.getElementById('pendingFees').textContent = stats.fees.unpaid;
        
        document.getElementById('activeStudents').textContent = stats.students.active;
        document.getElementById('suspendedStudents').textContent = stats.students.suspended;
        document.getElementById('maleStudents').textContent = stats.students.male;
        document.getElementById('femaleStudents').textContent = stats.students.female;
        
        // Load recent announcements
        await loadRecentAnnouncements();
        
    } catch (error) {
        console.error('Error loading statistics:', error);
        showToast('Failed to load statistics', 'error');
    }
}

// Load recent announcements
async function loadRecentAnnouncements() {
    try {
        const announcements = await apiRequest('/announcements?limit=5');
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
            return;
        }

        container.innerHTML = announcements.map(announcement => `
            <div class="announcement-item ${announcement.priority}">
                <div class="announcement-title">${announcement.title}</div>
                <div class="announcement-message">${announcement.message}</div>
                <div class="announcement-meta">${new Date(announcement.created_at).toLocaleDateString()}</div>
            </div>
        `).join('');
    } catch (error) {
        console.error('Error loading announcements:', error);
    }
}

// Load students
async function loadStudents() {
    try {
        const search = document.getElementById('studentSearch').value;
        const filter = document.getElementById('studentFilter').value;
        
        let endpoint = '/students';
        const params = [];
        if (search) params.push(`search=${encodeURIComponent(search)}`);
        if (filter) params.push(`status=${filter}`);
        if (params.length) endpoint += '?' + params.join('&');
        
        const students = await apiRequest(endpoint);
        const tbody = document.getElementById('studentsTableBody');
        
        if (!students || students.length === 0) {
            tbody.innerHTML = '<tr><td colspan="6" class="text-center">No students found</td></tr>';
            return;
        }

        tbody.innerHTML = students.map(student => `
            <tr>
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
    } catch (error) {
        console.error('Error loading students:', error);
        showToast('Failed to load students', 'error');
    }
}

// Load courses
async function loadCourses() {
    try {
        const search = document.getElementById('courseSearch').value;
        
        let endpoint = '/courses';
        if (search) endpoint += `?search=${encodeURIComponent(search)}`;
        
        const courses = await apiRequest(endpoint);
        const tbody = document.getElementById('coursesTableBody');
        
        if (!courses || courses.length === 0) {
            tbody.innerHTML = '<tr><td colspan="6" class="text-center">No courses found</td></tr>';
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
    } catch (error) {
        console.error('Error loading courses:', error);
        showToast('Failed to load courses', 'error');
    }
}

// Load fees
async function loadFees() {
    try {
        const search = document.getElementById('feeSearch').value;
        const filter = document.getElementById('feeFilter').value;
        
        let endpoint = '/fees';
        const params = [];
        if (search) params.push(`search=${encodeURIComponent(search)}`);
        if (filter) params.push(`status=${filter}`);
        if (params.length) endpoint += '?' + params.join('&');
        
        const fees = await apiRequest(endpoint);
        const tbody = document.getElementById('feesTableBody');
        
        if (!fees || fees.length === 0) {
            tbody.innerHTML = '<tr><td colspan="7" class="text-center">No fees found</td></tr>';
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
                    <button class="action-btn edit" onclick="recordPayment(${fee.id})">Pay</button>
                    <button class="action-btn delete" onclick="deleteFee(${fee.id})">Delete</button>
                </td>
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
        const search = document.getElementById('resultSearch').value;
        const semesterFilter = document.getElementById('semesterFilter').value;
        
        let endpoint = '/results';
        const params = [];
        if (search) params.push(`search=${encodeURIComponent(search)}`);
        if (semesterFilter) params.push(`semester=${semesterFilter}`);
        if (params.length) endpoint += '?' + params.join('&');
        
        const results = await apiRequest(endpoint);
        const tbody = document.getElementById('resultsTableBody');
        
        if (!results || results.length === 0) {
            tbody.innerHTML = '<tr><td colspan="7" class="text-center">No results found</td></tr>';
            return;
        }

        tbody.innerHTML = results.map(result => `
            <tr>
                <td>${result.full_name || 'Unknown'}</td>
                <td>${result.course_name}</td>
                <td>${result.semester}</td>
                <td>${result.academic_year}</td>
                <td>${result.final_mark || 'N/A'}</td>
                <td><span class="result-grade ${result.grade}">${result.grade}</span></td>
                <td>
                    <button class="action-btn edit" onclick="editResult(${result.id})">Edit</button>
                    <button class="action-btn delete" onclick="deleteResult(${result.id})">Delete</button>
                </td>
            </tr>
        `).join('');
    } catch (error) {
        console.error('Error loading results:', error);
        showToast('Failed to load results', 'error');
    }
}

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
                <div class="announcement-actions">
                    <button class="action-btn edit" onclick="editAnnouncement(${announcement.id})">Edit</button>
                    <button class="action-btn delete" onclick="deleteAnnouncement(${announcement.id})">Delete</button>
                </div>
            </div>
        `).join('');
    } catch (error) {
        console.error('Error loading announcements:', error);
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
document.getElementById('importExcelBtn').addEventListener('click', () => {
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

document.getElementById('addStudentBtn').addEventListener('click', () => {
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
    
    // Load courses for dropdown
    loadCourseDropdown();
    
    document.getElementById('addStudentForm').addEventListener('submit', async (e) => {
        e.preventDefault();
        const formData = new FormData(e.target);
        const studentData = Object.fromEntries(formData);
        
        try {
            await apiRequest('/students', {
                method: 'POST',
                body: JSON.stringify(studentData)
            });
            showToast('Student added successfully');
            hideModal();
            loadStudents();
        } catch (error) {
            showToast('Failed to add student', 'error');
        }
    });
});

window.editStudent = async function(id) {
    try {
        const student = await apiRequest(`/students/${id}`);
        
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
                <button type="submit" class="btn btn-primary">Update Student</button>
            </form>
        `);
        
        loadCourseDropdown(student.course_id);
        
        document.getElementById('editStudentForm').addEventListener('submit', async (e) => {
            e.preventDefault();
            const formData = new FormData(e.target);
            const updateData = Object.fromEntries(formData);
            
            try {
                await apiRequest(`/students/${id}`, {
                    method: 'PUT',
                    body: JSON.stringify(updateData)
                });
                showToast('Student updated successfully');
                hideModal();
                loadStudents();
            } catch (error) {
                console.error('Update student error:', error);
                showToast('Failed to update student: ' + (error.message || 'Unknown error'), 'error');
            }
        });
    } catch (error) {
        console.error('Load student error:', error);
        showToast('Failed to load student data: ' + (error.message || 'Unknown error'), 'error');
    }
};

window.deleteStudent = async function(id) {
    if (!confirm('Are you sure you want to delete this student?')) return;
    
    try {
        await apiRequest(`/students/${id}`, { method: 'DELETE' });
        showToast('Student deleted successfully');
        loadStudents();
    } catch (error) {
        console.error('Delete student error:', error);
        showToast('Failed to delete student: ' + (error.message || 'Unknown error'), 'error');
    }
};

// Course CRUD operations
document.getElementById('addCourseBtn').addEventListener('click', () => {
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
    try {
        const search = document.getElementById('lecturerSearch').value;
        const filter = document.getElementById('lecturerFilter').value;
        
        let endpoint = '/students/lecturers';
        const params = [];
        if (search) params.push(`search=${encodeURIComponent(search)}`);
        if (filter) params.push(`status=${filter}`);
        if (params.length) endpoint += '?' + params.join('&');
        
        const lecturers = await apiRequest(endpoint);
        const tbody = document.getElementById('lecturersTableBody');
        
        if (!lecturers || lecturers.length === 0) {
            tbody.innerHTML = '<tr><td colspan="6" class="text-center">No lecturers found</td></tr>';
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
    } catch (error) {
        console.error('Error loading lecturers:', error);
        showToast('Failed to load lecturers', 'error');
    }
}

// Lecturer CRUD operations
document.getElementById('addLecturerBtn').addEventListener('click', async () => {
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
        showToast('Failed to load courses', 'error');
    }
});

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

// Fee CRUD operations
document.getElementById('addFeeBtn').addEventListener('click', async () => {
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

// Result CRUD operations
document.getElementById('addResultBtn').addEventListener('click', async () => {
    try {
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
                    <label>Course Name *</label>
                    <input type="text" name="course_name" required>
                </div>
                <div class="form-group">
                    <label>Semester *</label>
                    <select name="semester" required>
                        <option value="1">Semester 1</option>
                        <option value="2">Semester 2</option>
                    </select>
                </div>
                <div class="form-group">
                    <label>Academic Year *</label>
                    <input type="number" name="academic_year" required min="2000" max="2100">
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
        
        document.getElementById('addResultForm').addEventListener('submit', async (e) => {
            e.preventDefault();
            const formData = new FormData(e.target);
            const resultData = Object.fromEntries(formData);
            
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
        showToast('Failed to load students', 'error');
    }
});

async function editResult(id) {
    try {
        const result = await apiRequest(`/results/${id}`);
        
        showModal(`
            <div class="modal-header">
                <h3>Edit Result</h3>
                <button class="modal-close" onclick="hideModal()">&times;</button>
            </div>
            <form id="editResultForm" class="modal-form">
                <div class="form-group">
                    <label>Course Name</label>
                    <input type="text" name="course_name" value="${result.course_name}">
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
                showToast('Failed to update result', 'error');
            }
        });
    } catch (error) {
        showToast('Failed to load result data', 'error');
    }
}

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

// Announcement CRUD operations
document.getElementById('addAnnouncementBtn').addEventListener('click', () => {
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
        const announcementData = Object.fromEntries(formData);
        
        try {
            await apiRequest('/announcements', {
                method: 'POST',
                body: JSON.stringify(announcementData)
            });
            showToast('Announcement added successfully');
            hideModal();
            loadAnnouncements();
        } catch (error) {
            showToast('Failed to add announcement', 'error');
        }
    });
});

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
            const updateData = Object.fromEntries(formData);
            
            try {
                await apiRequest(`/announcements/${id}`, {
                    method: 'PUT',
                    body: JSON.stringify(updateData)
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

// Search and filter event listeners
document.getElementById('studentSearch').addEventListener('input', loadStudents);
document.getElementById('studentFilter').addEventListener('change', loadStudents);
document.getElementById('courseSearch').addEventListener('input', loadCourses);
document.getElementById('feeSearch').addEventListener('input', loadFees);
document.getElementById('feeFilter').addEventListener('change', loadFees);
document.getElementById('resultSearch').addEventListener('input', loadResults);
document.getElementById('semesterFilter').addEventListener('change', loadResults);

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

// Logout handler
document.getElementById('logoutBtn').addEventListener('click', () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    window.location.href = 'index.html';
});

// Check authentication on load
window.addEventListener('load', () => {
    if (!token || user.role !== 'admin') {
        window.location.href = 'admin-login.html';
        return;
    }

    // Update header
    document.getElementById('adminName').textContent = user.full_name;
    document.getElementById('headerAdminName').textContent = user.full_name;

    // Load initial data
    loadDashboardStatistics();
});

// Close modal when clicking outside
document.getElementById('modalContainer').addEventListener('click', (e) => {
    if (e.target.id === 'modalContainer') {
        hideModal();
    }
});
