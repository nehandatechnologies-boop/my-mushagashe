// Frontend Permission Helper
// This provides utility functions to check user permissions on the frontend
// NOTE: Frontend checks are for UX only. Backend must enforce permissions.

// Get stored permissions from localStorage
function getStoredPermissions() {
  const permissions = localStorage.getItem('permissions');
  return permissions ? JSON.parse(permissions) : [];
}

// Get stored user role
function getUserRole() {
  const user = JSON.parse(localStorage.getItem('user') || '{}');
  return user.role || null;
}

// Check if user has a specific permission
function hasPermission(permissionName) {
  const role = getUserRole();
  
  // SUPER_ADMIN has all permissions
  if (role === 'SUPER_ADMIN' || role === 'super_admin') {
    return true;
  }
  
  const permissions = getStoredPermissions();
  return permissions.some(p => p.name === permissionName);
}

// Check if user has any of the specified permissions
function hasAnyPermission(permissionNames) {
  const role = getUserRole();
  
  // SUPER_ADMIN has all permissions
  if (role === 'SUPER_ADMIN' || role === 'super_admin') {
    return true;
  }
  
  const permissions = getStoredPermissions();
  const userPermissionNames = permissions.map(p => p.name);
  return permissionNames.some(name => userPermissionNames.includes(name));
}

// Check if user has all of the specified permissions
function hasAllPermissions(permissionNames) {
  const role = getUserRole();
  
  // SUPER_ADMIN has all permissions
  if (role === 'SUPER_ADMIN' || role === 'super_admin') {
    return true;
  }
  
  const permissions = getStoredPermissions();
  const userPermissionNames = permissions.map(p => p.name);
  return permissionNames.every(name => userPermissionNames.includes(name));
}

// Check if user has a specific role
function hasRole(roleName) {
  const role = getUserRole();
  return role === roleName || role === roleName.toLowerCase();
}

// Check if user is SUPER_ADMIN
function isSuperAdmin() {
  const role = getUserRole();
  return role === 'SUPER_ADMIN' || role === 'super_admin';
}

// Check if user is ACADEMIC_ADMIN
function isAcademicAdmin() {
  const role = getUserRole();
  return role === 'ACADEMIC_ADMIN';
}

// Check if user is FINANCE_ADMIN
function isFinanceAdmin() {
  const role = getUserRole();
  return role === 'FINANCE_ADMIN';
}

// Check if user is ADMISSIONS_ADMIN
function isAdmissionsAdmin() {
  const role = getUserRole();
  return role === 'ADMISSIONS_ADMIN';
}

// Check if user is LECTURER_ADMIN
function isLecturerAdmin() {
  const role = getUserRole();
  return role === 'LECTURER_ADMIN';
}

// Get role display name
function getRoleDisplayName() {
  const role = getUserRole();
  const roleNames = {
    'SUPER_ADMIN': 'Super Administrator',
    'super_admin': 'Super Administrator',
    'ACADEMIC_ADMIN': 'Academic Administrator',
    'FINANCE_ADMIN': 'Finance Administrator',
    'ADMISSIONS_ADMIN': 'Admissions Administrator',
    'LECTURER_ADMIN': 'Lecturer Administrator',
    'admin': 'Administrator'
  };
  return roleNames[role] || role || 'Unknown';
}

// Get permissions by category
function getPermissionsByCategory(category) {
  const permissions = getStoredPermissions();
  return permissions.filter(p => p.category === category);
}

// Show/hide element based on permission
function toggleByPermission(elementId, permissionName) {
  const element = document.getElementById(elementId);
  if (!element) return;
  
  if (hasPermission(permissionName)) {
    element.style.display = '';
  } else {
    element.style.display = 'none';
  }
}

// Show/hide element based on role
function toggleByRole(elementId, roleName) {
  const element = document.getElementById(elementId);
  if (!element) return;
  
  if (hasRole(roleName)) {
    element.style.display = '';
  } else {
    element.style.display = 'none';
  }
}

// Disable/enable button based on permission
function disableByPermission(buttonId, permissionName) {
  const button = document.getElementById(buttonId);
  if (!button) return;
  
  if (hasPermission(permissionName)) {
    button.disabled = false;
  } else {
    button.disabled = true;
  }
}

// Apply permissions to navigation menu
function applyPermissionsToNav() {
  // Hide/show navigation items based on permissions
  const navItems = document.querySelectorAll('[data-permission]');
  
  navItems.forEach(item => {
    const requiredPermission = item.getAttribute('data-permission');
    if (!hasPermission(requiredPermission)) {
      item.style.display = 'none';
    }
  });
  
  // Hide/show navigation items based on role
  const roleItems = document.querySelectorAll('[data-role]');
  
  roleItems.forEach(item => {
    const requiredRole = item.getAttribute('data-role');
    if (!hasRole(requiredRole)) {
      item.style.display = 'none';
    }
  });
}

// Permission check for common actions
const can = {
  // Students
  viewStudents: () => hasPermission('students.view'),
  createStudent: () => hasPermission('students.create'),
  editStudent: () => hasPermission('students.edit'),
  deleteStudent: () => hasPermission('students.delete'),
  approveStudent: () => hasPermission('students.approve'),
  suspendStudent: () => hasPermission('students.suspend'),
  
  // Lecturers
  viewLecturers: () => hasPermission('lecturers.view'),
  createLecturer: () => hasPermission('lecturers.create'),
  editLecturer: () => hasPermission('lecturers.edit'),
  deleteLecturer: () => hasPermission('lecturers.delete'),
  suspendLecturer: () => hasPermission('lecturers.suspend'),
  
  // Courses
  viewCourses: () => hasPermission('courses.view'),
  createCourse: () => hasPermission('courses.create'),
  editCourse: () => hasPermission('courses.edit'),
  deleteCourse: () => hasPermission('courses.delete'),
  
  // Subjects
  viewSubjects: () => hasPermission('subjects.view'),
  createSubject: () => hasPermission('subjects.create'),
  editSubject: () => hasPermission('subjects.edit'),
  deleteSubject: () => hasPermission('subjects.delete'),
  
  // Results
  viewResults: () => hasPermission('results.view'),
  createResult: () => hasPermission('results.create'),
  editResult: () => hasPermission('results.edit'),
  deleteResult: () => hasPermission('results.delete'),
  publishResult: () => hasPermission('results.publish'),
  
  // Fees
  viewFees: () => hasPermission('fees.view'),
  createFee: () => hasPermission('fees.create'),
  editFee: () => hasPermission('fees.edit'),
  deleteFee: () => hasPermission('fees.delete'),
  
  // Payments
  viewPayments: () => hasPermission('payments.view'),
  createPayment: () => hasPermission('payments.create'),
  editPayment: () => hasPermission('payments.edit'),
  deletePayment: () => hasPermission('payments.delete'),
  viewFinancialReports: () => hasPermission('financial_reports.view'),
  
  // Announcements
  viewAnnouncements: () => hasPermission('announcements.view'),
  createAnnouncement: () => hasPermission('announcements.create'),
  editAnnouncement: () => hasPermission('announcements.edit'),
  deleteAnnouncement: () => hasPermission('announcements.delete'),
  
  // Intakes
  viewIntakes: () => hasPermission('intakes.view'),
  createIntake: () => hasPermission('intakes.create'),
  editIntake: () => hasPermission('intakes.edit'),
  deleteIntake: () => hasPermission('intakes.delete'),
  
  // Admins
  viewAdmins: () => hasPermission('admins.view'),
  createAdmin: () => hasPermission('admins.create'),
  editAdmin: () => hasPermission('admins.edit'),
  deleteAdmin: () => hasPermission('admins.delete'),
  suspendAdmin: () => hasPermission('admins.suspend'),
  
  // Audit Logs
  viewAuditLogs: () => hasPermission('audit_logs.view'),
  
  // Settings
  viewSettings: () => hasPermission('settings.view'),
  editSettings: () => hasPermission('settings.edit')
};

// Export for use in other files
if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    hasPermission,
    hasAnyPermission,
    hasAllPermissions,
    hasRole,
    isSuperAdmin,
    isAcademicAdmin,
    isFinanceAdmin,
    isAdmissionsAdmin,
    isLecturerAdmin,
    getRoleDisplayName,
    getPermissionsByCategory,
    toggleByPermission,
    toggleByRole,
    disableByPermission,
    applyPermissionsToNav,
    can
  };
}
