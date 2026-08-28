# Mushagashe VTC Student Portal - Security Audit Report

**Date:** August 26, 2026  
**Audit Type:** Data Protection & Security Compliance Assessment  
**Objective:** Identify security gaps and compliance requirements for Zimbabwe's Cyber and Data Protection Act

---

## EXECUTIVE SUMMARY

This report documents the current state of the Mushagashe VTC Student Portal and identifies security gaps that must be addressed to meet compliance requirements under Zimbabwe's Cyber and Data Protection Act [Chapter 12:07] and related regulations.

**Overall Assessment:** The portal has basic security controls but lacks comprehensive data protection features required for compliance.

---

## 1. EXISTING ARCHITECTURE

### 1.1 Technology Stack
- **Backend:** Node.js with Express
- **Database:** Supabase (PostgreSQL)
- **Frontend:** HTML/CSS/JavaScript (Vanilla)
- **Authentication:** JWT tokens with bcrypt password hashing
- **File Storage:** Supabase Storage (profile pictures)
- **Deployment:** Render (production), Local development

### 1.2 Frontend Architecture
**Pages:**
- index.html - Landing page
- student-login.html - Student login
- student-register.html - Student registration
- student-dashboard.html - Student dashboard
- admin-login.html - Admin login
- admin-dashboard.html - Admin dashboard
- lecturer-login.html - Lecturer login
- lecturer-dashboard.html - Lecturer dashboard

### 1.3 Backend Architecture
**Controllers:** authController, studentController, resultController, feeController, courseController, announcementController, dashboardController, paymentHistoryController, templateController, subjectController

**Models:** User, Result, Fee, Course, Subject, SubjectResult, Announcement, PaymentHistory

**Middleware:** auth.js (JWT auth), security.js (headers, rate limiting, CORS), errorHandler.js

### 1.4 API Endpoints
**Auth:** /api/auth/* (login, profile, password)
**Students:** /api/students/* (CRUD, profile picture)
**Results:** /api/results/* (CRUD, PDF download)
**Fees:** /api/fees/* (CRUD, payments)
**Courses:** /api/courses/* (CRUD)
**Announcements:** /api/announcements/* (CRUD)

---

## 2. EXISTING USER ROLES

### 2.1 Current Roles
1. **admin** - Full administrative access
2. **lecturer** - Course-specific access
3. **student** - Own data access only

### 2.2 Role-Based Access Control
**Current:**
- JWT tokens with role
- Middleware checks for route access
- Course-based access for lecturers
- Student data isolation

**Gaps:**
- No granular permissions
- Missing roles: SUPER_ADMIN, REGISTRAR, FINANCE, INSTRUCTOR
- No permission-based access (only role-based)
- No audit trail for permission changes

---

## 3. PERSONAL DATA FIELDS

### 3.1 User Table (Personal Data)
**Fields:**
- full_name, email, student_number, phone, gender
- national_id **(HIGHLY SENSITIVE)**
- date_of_birth
- address
- guardian_name, guardian_phone
- profile_picture_url
- course_id
- status, role, password

### 3.2 Result Table (Academic Data)
**Fields:**
- user_id, course_id, semester, academic_year
- assessment_mark, exam_mark, final_mark, grade
- lecturer, remarks

### 3.3 Fee Table (Financial Data)
**Fields:**
- user_id, fee_category, amount, amount_paid, balance
- payment_reference, payment_method, receipt_number
- payment_date, due_date, status

### 3.4 Other Tables
- courses: course_name, course_code, department, duration
- announcements: title, content, priority, created_by
- payment_history: payment records

---

## 4. SECURITY WEAKNESSES IDENTIFIED

### 4.1 Critical Issues

**1. No Audit Logging System**
- No server-side audit log for data access/modifications
- No tracking of who viewed/changed student records
- No record of result modifications
- No record of fee changes
- No record of login/logout events (except console logs)

**2. No Result Change History**
- Results can be modified without preserving history
- No tracking of original vs new values
- No reason required for result changes
- No approval workflow for result changes

**3. Incomplete IDOR Protection**
- Some endpoints check user ownership
- Not all endpoints have consistent IDOR checks
- Students can potentially access other students' data via ID manipulation in some cases

**4. No Data Subject Rights Implementation**
- No privacy request system
- No data access request handling
- No data correction request handling
- No consent management system
- No data deletion/anonymization workflow

**5. No Data Retention Policy**
- No retention periods configured
- No automated archival/deletion
- No retention tracking

### 4.2 High Priority Issues

**6. Weak Password Requirements**
- Minimum 6 characters only
- No complexity requirements (uppercase, lowercase, numbers, special chars)
- No password history tracking
- No forced password expiration

**7. No MFA Implementation**
- No multi-factor authentication
- No MFA architecture for privileged users
- No 2FA for admin/finance/registrar accounts

**8. No Security Event Monitoring**
- No security event logging
- No failed login tracking
- No suspicious activity detection
- No brute force protection beyond rate limiting

**9. No Incident Management System**
- No data breach incident tracking
- No incident response workflow
- No DPO notification system

**10. No Compliance Dashboard**
- No DPO interface
- No compliance status tracking
- No processing register
- No DPIA support

### 4.3 Medium Priority Issues

**11. Incomplete Permission System**
- Only role-based, not permission-based
- No granular permissions (VIEW_STUDENT, EDIT_RESULTS, etc.)
- No permission assignment interface

**12. No Staff Access Review**
- No periodic access review
- No staff account audit
- No permission audit trail

**13. No Data Export Controls**
- No export permission checks
- No export logging
- No export reason tracking

**14. No Document Security**
- Profile pictures stored in Supabase Storage (good)
- No document access logging
- No document upload restrictions beyond file type

**15. No Privacy Notice**
- No privacy notice displayed
- No consent mechanism
- No privacy policy accessible

### 4.4 Low Priority Issues

**16. Console Logging Exposes Data**
- Request headers logged (line 54 in server.js)
- User data logged in various controllers
- Passwords masked in some places but not all

**17. No Backup Status Monitoring**
- No backup status tracking
- No restoration testing
- No backup verification

**18. CSP Headers Incomplete**
- CSP configured but may need refinement
- Some inline scripts allowed (unsafe-inline)

---

## 5. COMPLIANCE GAPS

### 5.1 Cyber and Data Protection Act Requirements

**Missing:**
- Data Protection Officer designation system
- Processing Activities Register
- Data Processor Register
- DPIA (Data Protection Impact Assessment) system
- Data subject rights implementation
- Consent management
- Data breach notification workflow
- Data retention policies
- Cross-border data transfer controls

**Partially Implemented:**
- Data security (basic authentication, encryption in transit)
- Access control (role-based but not granular)
- Data minimization (some fields collected but may be excessive)

**Well Implemented:**
- Password hashing (bcrypt)
- Rate limiting
- Security headers (Helmet)
- CORS configuration

---

## 6. RECOMMENDED IMPLEMENTATION PLAN

### Phase 1: Foundation (Critical)
1. Implement comprehensive audit logging system
2. Implement result change history
3. Strengthen IDOR protection across all endpoints
4. Implement granular permissions system
5. Add missing roles (SUPER_ADMIN, REGISTRAR, FINANCE)

### Phase 2: Data Protection
6. Implement privacy notice
7. Implement consent management
8. Implement data subject rights system
9. Implement data retention framework
10. Add minor/guardian data handling

### Phase 3: Security Hardening
11. Strengthen password requirements
12. Implement MFA architecture
13. Implement security event monitoring
14. Implement incident management system
15. Add staff access review

### Phase 4: Compliance Features
16. Implement DPO dashboard
17. Implement processing activities register
18. Implement data processor register
19. Implement DPIA support
20. Implement data export controls

### Phase 5: Testing & Documentation
21. Security testing (IDOR, XSS, SQL injection, CSRF)
22. Regression testing
23. Documentation update
24. User training materials

---

## 7. DATABASE MIGRATIONS NEEDED

### New Tables Required:
1. **audit_logs** - Audit trail
2. **result_history** - Result change tracking
3. **permissions** - Granular permissions
4. **role_permissions** - Role-permission mapping
5. **consent_records** - Consent tracking
6. **privacy_requests** - Data subject requests
7. **security_events** - Security event logging
8. **security_incidents** - Incident management
9. **data_processing_activities** - Processing register
10. **data_processors** - Processor register
11. **dpia_records** - DPIA documentation
12. **retention_policies** - Retention configuration
13. **data_retention_events** - Retention tracking
14. **access_reviews** - Staff access review
15. **document_access_logs** - Document access tracking
16. **data_exports** - Export tracking

### Existing Table Modifications:
1. **users** - Add is_minor, guardian_relationship, guardian_verified, last_password_change, account_locked_until
2. **results** - Add status (draft, submitted, reviewed, approved, published), approved_by, approved_at, change_reason

---

## 8. ENVIRONMENT VARIABLES NEEDED

**New Variables:**
- MFA_ENABLED (boolean)
- MFA_SECRET_KEY
- AUDIT_LOG_RETENTION_DAYS
- DATA_RETENTION_DEFAULT_DAYS
- SESSION_TIMEOUT_MINUTES
- MAX_LOGIN_ATTEMPTS
- ACCOUNT_LOCKOUT_DURATION_MINUTES
- PASSWORD_MIN_LENGTH
- PASSWORD_REQUIRE_UPPERCASE
- PASSWORD_REQUIRE_LOWERCASE
- PASSWORD_REQUIRE_NUMBERS
- PASSWORD_REQUIRE_SPECIAL_CHARS
- PASSWORD_EXPIRY_DAYS
- DPO_EMAIL
- SECURITY_ALERT_EMAIL

---

## 9. FILES TO BE CREATED

**Backend:**
- middleware/auditLogger.js
- middleware/permissionChecker.js
- middleware/mfa.js
- controllers/auditController.js
- controllers/permissionController.js
- controllers/privacyController.js
- controllers/complianceController.js
- controllers/securityController.js
- models/AuditLog.js
- models/ResultHistory.js
- models/Permission.js
- models/ConsentRecord.js
- models/PrivacyRequest.js
- models/SecurityEvent.js
- models/SecurityIncident.js
- models/DataProcessingActivity.js
- models/DataProcessor.js
- models/DpiaRecord.js
- models/RetentionPolicy.js
- services/auditService.js
- services/permissionService.js
- services/privacyService.js
- services/securityService.js

**Frontend:**
- pages/privacy-notice.html
- pages/privacy-request.html
- pages/compliance-dashboard.html
- pages/security-events.html
- assets/js/compliance-dashboard.js
- assets/js/privacy-request.js

**SQL Migrations:**
- sql/create_audit_tables.sql
- sql/create_compliance_tables.sql
- sql/alter_users_table.sql
- sql/alter_results_table.sql

---

## 10. FILES TO BE MODIFIED

**Backend:**
- middleware/auth.js - Add permission checking
- middleware/security.js - Add MFA, strengthen rate limiting
- controllers/authController.js - Add password complexity, MFA
- controllers/studentController.js - Add audit logging, permission checks
- controllers/resultController.js - Add change history, audit logging
- controllers/feeController.js - Add audit logging
- models/User.js - Add new fields
- models/Result.js - Add status tracking
- routes/* - Add permission middleware

**Frontend:**
- pages/student-dashboard.html - Add privacy notice link
- pages/admin-dashboard.html - Add compliance section
- pages/student-register.html - Add consent checkboxes
- assets/js/*.js - Add permission-aware UI

---

## CONCLUSION

The Mushagashe VTC Student Portal has a solid foundation with basic security controls, but requires significant enhancements to meet Zimbabwe's Cyber and Data Protection Act requirements. The most critical gaps are the lack of audit logging, result change history, and data subject rights implementation.

The implementation should proceed in phases, prioritizing critical security and compliance features first, then building out the comprehensive compliance framework.

**Estimated Implementation Time:** 3-4 weeks for full compliance implementation

**Risk Level:** HIGH - Current system lacks essential data protection controls required by law

**Recommendation:** Begin Phase 1 implementation immediately to address critical security gaps.
