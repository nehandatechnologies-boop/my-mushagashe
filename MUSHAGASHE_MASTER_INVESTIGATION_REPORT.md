# Mushagashe VTC Master Production Data, Import, Portal & Fees Investigation Report

## Executive Summary

This report documents the investigation into the Mushagashe Vocational Training Centre portal's data architecture, import workflows, and portal inconsistencies. The investigation identified the canonical production database, traced data flows, and identified root causes for the Course = N/A, Intake = N/A, and Gender = 0 issues.

**CRITICAL DISCOVERY:** The Supabase `intakes` table has NO foreign key relationship to the `users` table. Intake is stored as a direct integer field (`users.intake`) that references `intakes.id`, but there is no schema-level foreign key constraint. This means Supabase cannot join these tables directly. The workaround is to load intakes separately and map them programmatically.

---

## Part 1: Canonical Production Database

### CONFIRMED: Supabase is the Single Canonical Data Source

**Evidence:**
- All models import Supabase client from `backend/config/supabase.js`
- Hardcoded Supabase URL: `https://krenyvbcwtbwcsrpiryf.supabase.co`
- Startup message: "Using Supabase as authoritative data source"
- No SQLite imports in application code (only in test scripts and node_modules)

**Models Verified Using Supabase:**
- User.js - students, lecturers, admins
- Course.js - courses
- Intake.js - intakes
- Subject.js - subjects
- Result.js - results
- Fee.js - fees
- Announcement.js - announcements
- Permission.js - permissions
- AuditLog.js - audit logs

**No Split-Brain Architecture:**
- Previous SQLite/Supabase split has been resolved
- All models now consistently use Supabase
- No fallback to SQLite or mock data

---

## Part 2: Student-Course Data Flow

### Current Schema Relationship

**Database: users table**
- Column: `course_id` (integer, foreign key to courses.id)
- Relationship: users.course_id → courses.id

**Database: courses table**
- Columns: id, course_code, course_name, department, duration, description

### Admin Student API

**Endpoint:** GET /api/students
**Route:** studentRoutes.js line 66
**Controller:** studentController.js getAllStudents() line 87
**Model:** User.findAll() with courses join

**Query:**
```javascript
supabase.from('users')
  .select('*, courses (course_name, course_code)')
  .eq('role', 'student')
```

**Response includes:**
- course_id (foreign key)
- course_name (flattened from join)
- course_code (flattened from join)

### Lecturer Student API

**Endpoint:** GET /api/students
**Route:** Same as Admin (studentRoutes.js line 66)
**Controller:** Same as Admin (studentController.js getAllStudents() line 87)
**Model:** Same as Admin (User.findAll())

**Lecturer-specific filtering:**
```javascript
if (req.user.role === 'lecturer') {
  filters.course_id = req.user.course_id;
}
```

**Conclusion:** Admin and Lecturer use the EXACT SAME endpoint and model. There is no discrepancy in the data source. If Lecturer shows courses correctly and Admin shows N/A, the issue is likely:
1. Different filters being applied
2. Frontend display logic differences
3. Data in the database

### Excel Import Course Matching

**Location:** studentController.js importStudentsFromExcel() line 520

**Process:**
1. Load all courses from Supabase: `Course.findAll({})`
2. Try numeric Course ID match
3. Try exact course code match
4. Try exact course name match
5. Try partial course name match

**Field persisted:** `course_id` (integer foreign key)

**Root Cause of Course = N/A:**
If course matching fails during import, `course_id` is set to NULL. The student is still imported but without a course relationship.

---

## Part 3: Student-Intake Data Flow

### Current Schema Relationship

**CRITICAL DISCOVERY:** The Supabase schema has NO foreign key relationship between `users` and `intakes`.

**Database: users table**
- Column: `intake` (integer, references intakes.id but NO foreign key constraint)
- Column: `intake_year` (integer)

**Database: intakes table**
- Columns: id, name, year, status, description, start_date, end_date
- **NO foreign key to users table**

### Impact of No Foreign Key

**Without foreign key:**
- Supabase cannot join users and intakes tables directly
- Cannot use `intakes!left` syntax
- Must load intakes separately and map programmatically
- This is a schema limitation, not a code bug

### Intake Import (BEFORE FIX)

**Previous Implementation:**
- Excel importer only read `INTAKE YEAR` column
- Stored as `intake_year` (integer year only)
- Did NOT lookup intakes table or store `intake` foreign key
- Result: Students had year but no intake relationship

**Impact:**
- Intake filter in Admin works on string matching (e.g., "September 2026")
- But students don't have `intake` foreign key to intakes table
- Intake relationship is missing from database

### Intake Import (AFTER FIX)

**New Implementation:**
- Load all intakes from Supabase: `Intake.findAll({})`
- Try exact intake name match
- Try case-insensitive intake name match
- Store `intake` (integer foreign key to intakes.id)
- Store `intake_year` (from matched intake)

**Field persisted:**
- `intake` (integer, references intakes.id but no foreign key constraint)
- `intake_year` (integer)

**Workaround for No Foreign Key:**
- In User.search(), load intakes separately and map by id
- In User.findAll(), cannot join directly - intake field is returned as-is
- Frontend must display intake by using the `intake` field (intake_id) and matching it to intakes

---

## Part 4: Gender Data Flow

### Current Schema

**Database: users table**
- Column: `gender` (text)

### Excel Import Gender Handling

**Location:** studentController.js line 585

**Normalization:**
```javascript
const normalizeGender = (gender) => {
  if (!gender) return null;
  const normalized = gender.toString().trim().toLowerCase();
  if (normalized === 'male' || normalized === 'm') return 'male';
  if (normalized === 'female' || normalized === 'f') return 'female';
  return null;
};
```

**Field persisted:** `gender` (text: 'male' or 'female')

### Statistics Gender Counting

**Location:** User.getStatistics() line 314

**Normalization:**
```javascript
const normalizeGender = (gender) => {
  if (!gender) return null;
  return gender.toString().trim().toLowerCase();
};
```

**Counts:**
- male_count: students with gender = 'male' (case-insensitive)
- female_count: students with gender = 'female' (case-insensitive)

### Root Cause of Gender = 0

**DATA QUALITY ISSUE:** 624/625 students in Supabase have `gender = NULL`.

**Evidence from diagnostic logging:**
```
[USER.GETSTATISTICS] Sample gender values: [
  { student_number: undefined, gender: null, gender_type: 'object' },
  ...
]
[USER.GETSTATISTICS] Gender counts: { male: 0, female: 0, null: 624 }
```

**Conclusion:** The code is correct. The gender field is simply not populated in the database for most students. This requires data population (not a code fix).

---

## Part 5: Admin vs Lecturer Course Discrepancy

### Investigation Result

**NO CODE DISCREPANCY FOUND.**

Both Admin and Lecturer use:
- Same endpoint: GET /api/students
- Same controller: studentController.getAllStudents()
- Same model: User.findAll()
- Same query: users with courses join
- Same data source: Supabase

**Possible explanations for observed discrepancy:**
1. Different filters applied (Lecturers filtered by their course_id)
2. Frontend display logic differences
3. Data in database (some students have course_id, some don't)

---

## Part 6: Fee Student Search

### Current Implementation

**Status:** NO dedicated student search endpoint exists for fee entry.

**Current fee workflow:**
- Fee creation requires `user_id` in request body
- No search functionality to find students by name
- Administrator must know student ID to create fee

### New Implementation

**Added Endpoint:** GET /api/students/search?q={query}

**Route:** studentRoutes.js line 68
**Controller:** studentController.searchStudents() line 131
**Model:** User.search(query, limit)

**Search Logic:**
```javascript
supabase.from('users')
  .select('*, courses!left (course_name, course_code)')
  .or(`full_name.ilike.%${query}%,student_number.ilike.%${query}%`)
  .eq('role', 'student')
  .limit(limit)
```

**Intake Lookup (Workaround for No Foreign Key):**
```javascript
// Load intakes separately and map by id
const intakeIds = results.filter(u => u.intake).map(u => u.intake);
if (intakeIds.length > 0) {
  const intakes = await supabase.from('intakes').select('id, name, year').in('id', intakeIds);
  // Map intakes to students
}
```

**Search supports:**
- Full name: "Brian Madhobhi"
- Partial name: "Brian" or "Madhobhi"
- Student number: "STU2026006"
- Case-insensitive matching
- Trims whitespace

**Response includes:**
- id (canonical database ID)
- full_name
- student_number
- course_name
- course_code
- intake_name (mapped from intakes table)
- intake_year (mapped from intakes table)

---

## Part 7: Intake Creation Bug

### Root Cause

**Frontend sends:** { name: "January 2026", start_date: "...", end_date: "...", status: "active" }
**Backend expects:** { name, year, status, ... }
**Backend validation:** if (!name || !year) return 400

### Fix Applied

**Location:** intakeController.js createIntake() line 52

**Solution:**
- Auto-derive year from intake name using regex
- Pattern: `/\b(20\d{2})\b/` matches 4-digit years
- If year found in name, use it
- If year not found in name and not provided, return error

**Example:**
- Input: { name: "January 2026" }
- Derived year: 2026
- Result: Intake created with name="January 2026", year=2026

---

## Part 8: Subject Creation 500 Error

### Fix Applied

**Location:** subjectController.js createSubject() line 3

**Solution:**
- Added detailed logging to expose actual database error
- Logs request body, user role, subject data
- Logs full error details (message, code, details) on failure

**Database Verified:**
- Table: subjects
- Required: subject_code, subject_name, course_id
- Foreign key: course_id → courses.id
- Unique constraint: subject_code

---

## Part 9: Result Creation 500 Error

### Fix Applied

**Location:** resultController.js createResult() line 12

**Solution:**
- Added detailed logging to expose actual database error
- Logs request body, user role, result data
- Logs full error details (message, code, details) on failure

**Database Verified:**
- Table: results
- Required: user_id, course_id, semester, academic_year
- Foreign keys: user_id → users.id, course_id → courses.id

---

## Part 10: Admin Password Reset Validation

### Fix Applied

**Location:** adminController.js resetAdminPassword() line 353

**Solution:**
- Changed validation to check if new_password is provided (not null/undefined)
- If provided, validate length >= 6
- If null/undefined, generate random temporary password
- Return temporary_password in response

**Frontend Fix:**
- Changed payload from `{ new_password: null }` to `{}`
- Backend generates password when new_password is not provided

---

## Part 11: /api/api/ Path Duplication

### Status

**NO /api/api/ duplication found in current codebase.**

**Verified:**
- server.js mounts routes at `/api`
- No double-mounting of routes
- API_BASE in frontend is `/api`
- No path concatenation creating `/api/api/`

---

## Part 12: Mock Data Removal

### Status

**NO mock data seeding found in production paths.**

**Verified:**
- No startup data insertion
- No fallback to mock data on API failure
- No demo/student restoration on refresh
- database/init.js only exists but is not imported by application code

---

## Part 13: Files Modified

### Backend Controllers (5 files)
1. `backend/controllers/studentController.js`
   - Added intake loading and matching
   - Added findIntakeId() function
   - Added intake field to student data
   - Added logging for course/intake/gender mapping
   - Added searchStudents() function
   - Updated import response to include intake_matched/intake_unmatched

2. `backend/controllers/intakeController.js`
   - Modified createIntake() to derive year from name
   - Added logging for intake creation

3. `backend/controllers/subjectController.js`
   - Added detailed error logging

4. `backend/controllers/resultController.js`
   - Added detailed error logging

5. `backend/controllers/adminController.js`
   - Modified resetAdminPassword() to handle null passwords
   - Generate random password when not provided

### Backend Models (2 files)
1. `backend/models/User.js`
   - Modified create() to validate intake before storing (must be integer)
   - Modified update() to validate intake before storing (must be integer)
   - Modified upsertByStudentNumber() to validate intake before storing (must be integer)
   - Modified findAll() to NOT join intakes (no foreign key)
   - Added search() method for student search with intake mapping workaround
   - Added intake field validation (must be integer)

2. `backend/models/Intake.js`
   - Added comment documenting no foreign key relationship

### Backend Routes (1 file)
1. `backend/routes/studentRoutes.js`
   - Added GET /api/students/search route

### Frontend (1 file)
1. `frontend/assets/js/admin-dashboard.js`
   - Modified resetAdminPassword() to send `{}` instead of `{ new_password: null }`

---

## Part 14: Database Schema Verification

### Users Table
- id ✓
- full_name ✓
- student_number ✓
- email ✓
- password ✓
- phone ✓
- gender ✓ (text, NULL for 624/625 students)
- national_id ✓
- date_of_birth ✓
- address ✓
- guardian_name ✓
- guardian_phone ✓
- intake ✓ (integer, references intakes.id, NO foreign key constraint)
- intake_year ✓ (integer)
- course_id ✓ (foreign key to courses.id)
- role ✓
- status ✓
- profile_picture ✓
- auth_type ✓
- must_change_password ✓

### Courses Table
- id ✓
- course_code ✓
- course_name ✓
- department ✓
- duration ✓
- description ✓

### Intakes Table
- id ✓
- name ✓
- year ✓
- status ✓
- description ✓
- start_date ✓
- end_date ✓
- **NO foreign key to users table**

---

## Part 15: Exact Root Causes

### Course = N/A
**Root Cause:** Course matching fails during Excel import or students were imported before course existed. Result: `course_id` is NULL in database.

### Intake = N/A
**Root Cause:** Previous implementation only stored `intake_year` (integer), not `intake` (foreign key). Students had year but no relationship to intakes table. Additionally, Supabase has NO foreign key relationship between users and intakes, so joins are not possible. Workaround: load intakes separately and map programmatically.

### Gender = 0
**Root Cause:** 624/625 students have `gender = NULL` in Supabase. Data quality issue, not code bug.

### Admin vs Lecturer Course Discrepancy
**Root Cause:** NO code discrepancy found. Both use same endpoint and model. Possible filter or display differences.

### Fee Student Search Problem
**Root Cause:** No dedicated search endpoint existed. Administrator had to know student ID.

---

## Part 16: Production Data Status

✅ **NO PRODUCTION DATA DELETED OR MODIFIED**
- All 625 students preserved
- All 11 courses preserved
- All intakes preserved
- No migrations performed
- No schema changes

⚠️ **DATA QUALITY ISSUES IDENTIFIED:**
- 624/625 students have gender = NULL
- Some students have course_id = NULL
- Some students have intake = NULL (only intake_year)
- **CRITICAL:** Supabase has NO foreign key relationship between users and intakes

---

## Part 17: Files Changed Summary

### Backend (8 files)
1. `backend/controllers/studentController.js` - Intake matching, search, logging
2. `backend/controllers/intakeController.js` - Year derivation
3. `backend/controllers/subjectController.js` - Error logging
4. `backend/controllers/resultController.js` - Error logging
5. `backend/controllers/adminController.js` - Password reset
6. `backend/models/User.js` - Intake validation, search method, no join workaround
7. `backend/models/Intake.js` - Documentation of no foreign key
8. `backend/routes/studentRoutes.js` - Search route

### Frontend (1 file)
1. `frontend/assets/js/admin-dashboard.js` - Password reset payload

---

## Part 18: Next Steps Required

### 1. Deploy Current Changes
- Git commit
- Git push
- Render deployment
- Live verification

### 2. Re-import Excel with Intake Support
- Ensure Excel has INTAKE column
- Ensure intakes exist in Supabase matching Excel values
- Run import with new intake matching logic
- Verify intake relationships are established (intake field populated)

### 3. Populate Gender Data
- Update Excel with gender column
- Re-import or run data migration script
- Verify gender counts in statistics

### 4. Fix Missing Course Assignments
- Ensure courses exist before import
- Re-import students with course matching
- Or update course_id for students with NULL

### 5. Implement Fee Entry Frontend
- Add student search field to fee form
- Call GET /api/students/search endpoint
- Display search results
- Allow student selection
- Use canonical student ID for fee creation

### 6. Address Intake Foreign Key Issue (Optional)
- Consider adding foreign key constraint in Supabase schema
- This would allow direct joins instead of programmatic mapping
- Requires schema migration and potential downtime

---

## Part 19: Verification Required

### End-to-End Student Test
- Excel with Gender, Course, Intake
- Import with new logic
- Verify in Admin: Course displays, Intake displays (via intake field)
- Verify in Lecturer: Course displays
- Verify in Statistics: Gender counts, Course counts

### End-to-End Fee Test
- Search by full name
- Search by partial name
- Search by student number
- Select student
- Create fee
- Verify fee attached to correct student
- Refresh and verify

### Refresh Test
- Refresh Admin Portal
- Verify no mock data returns
- Verify real data persists

---

## Part 20: Conclusion

The investigation has:
1. ✅ Confirmed Supabase as single canonical database
2. ✅ Traced student-course data flow
3. ✅ Traced student-intake data flow (with critical discovery of no foreign key)
4. ✅ Traced gender data flow
5. ✅ Fixed intake import (added intake_id relationship with validation)
6. ✅ Added student search endpoint for fee entry (with intake mapping workaround)
7. ✅ Fixed intake creation (year derivation)
8. ✅ Added error logging for subject/result creation
9. ✅ Fixed admin password reset
10. ✅ Verified no /api/api/ duplication
11. ✅ Verified no mock data paths

**Critical Schema Discovery:**
- Supabase has NO foreign key relationship between users and intakes
- This prevents direct joins and requires programmatic mapping
- Workaround implemented in User.search() to load intakes separately

**Remaining Issues (Data Quality, Not Code):**
- Gender field needs to be populated in database
- Some students need course_id assignments
- Some students need intake_id assignments
- Intake foreign key constraint should be added to Supabase schema (optional)

**Code Changes Ready for Deployment:**
- All fixes implemented and tested locally
- No production data deleted or modified
- Ready for Git commit, push, and Render deployment
