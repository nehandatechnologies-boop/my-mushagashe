# Excel Import Pipeline Fix Report
## Mushagashe VTC Portal

---

## Executive Summary

Critical fixes have been applied to the Excel import pipeline to ensure Gender, Course, and Intake are correctly imported and existing students are updated without data loss. The previous `studentNumber` variable bug has been fixed, and blank field preservation logic has been implemented.

---

## A. Root Causes Identified

### 1. Blank Field Overwrite Bug (CRITICAL)

**Location:** `backend/models/User.js` upsertByStudentNumber() lines 286-293

**Problem:** The upsert logic converted empty strings to NULL:
```javascript
Object.keys(updateData).forEach(key => {
  if (updateData[key] === undefined) {
    delete updateData[key];
  } else if (updateData[key] === '') {
    updateData[key] = null;  // BUG: Overwrites existing data
  }
});
```

**Impact:** If an Excel cell was blank, the importer would overwrite existing Supabase values with NULL, destroying existing student data.

**Fix:** Implemented selective field updating - only update fields that are provided and non-null/empty:
```javascript
const addField = (field, value) => {
  if (value !== undefined && value !== null && value !== '') {
    updateData[field] = value;
  }
};
```

---

### 2. studentNumber Variable Bug (PREVIOUSLY FIXED)

**Location:** `backend/models/User.js` line 232

**Problem:** Variable name mismatch (`studentNumber` vs `student_number`) caused upsert to always create new students instead of updating existing ones.

**Status:** FIXED in previous changes

---

### 3. Intake Matching Lack of Partial Match

**Location:** `backend/controllers/studentController.js` findIntakeId()

**Problem:** Intake matching only tried exact and case-insensitive matches, no partial matching.

**Fix:** Added partial matching to handle variations like "September 2026" vs "September 2026 Intake"

---

## B. Files Modified

### Backend (2 files)

1. **`backend/models/User.js`**
   - Modified upsertByStudentNumber() to preserve existing data when Excel fields are blank
   - Added comprehensive logging for upsert operations
   - Added helper function addField() for selective field updates
   - Only updates fields that are provided and non-null/empty

2. **`backend/controllers/studentController.js`**
   - Enhanced findCourseId() with detailed logging
   - Enhanced findIntakeId() with detailed logging and partial matching
   - Added logging of available courses/intakes when match fails

---

## C. Pipeline Improvements

### Gender Import

**Status:** Already implemented correctly

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

**Supported values:** Male, Female, M, F, MALE, FEMALE, male, female, etc.

---

### Course Import

**Status:** Enhanced with detailed logging

**Matching priority:**
1. Exact course ID (numeric)
2. Exact course code
3. Exact course name
4. Partial course name match

**Logging:** Now logs:
- Input course ID and name
- Normalized values
- Match method used
- Available courses when match fails

---

### Intake Import

**Status:** Enhanced with partial matching and detailed logging

**Matching priority:**
1. Exact intake name
2. Case-insensitive intake name
3. Partial intake name match

**Logging:** Now logs:
- Input intake name
- Normalized values
- Match method used
- Available intakes when match fails

---

### Blank Field Preservation

**Status:** Implemented

**Logic:**
- Blank Excel field → Preserve existing database value
- Non-blank Excel field → Update database value

**Example:**
- Excel: gender="", Database: gender="Female" → Result: gender="Female" (preserved)
- Excel: gender="Male", Database: gender="Female" → Result: gender="Male" (updated)

---

## D. Excel Header Normalization

**Already implemented:** The importer supports multiple header variations:

**Student Number:**
- STUDENT NUMBER
- Student Number
- student_number
- Student_Number
- StudentNo
- Student No.
- STUDENT NO

**Full Name:**
- FULL NAME
- Full Name
- full_name
- Full_Name
- Name
- NAME

**Gender:**
- GENDER
- Gender
- gender
- SEX
- Sex
- sex

**Course:**
- COURSE ID
- Course ID
- course_id
- Course_ID
- COURSE
- Course
- course
- PROGRAMME
- Programme
- programme

**Intake:**
- INTAKE
- Intake
- intake

---

## E. Upsert System

**Status:** Already implemented with studentNumber bug fix

**Primary key:** student_number

**Logic:**
1. Check if student exists by student_number
2. If exists: UPDATE with provided fields (preserving blanks)
3. If not exists: CREATE new student

**Duplicate prevention:**
- Checks for duplicate student_number within spreadsheet
- Checks for existing student in database

---

## F. Import Results Transparency

**Status:** Already implemented

**Returns:**
- Total rows
- New students
- Updated students
- Skipped rows (unmatched courses/intakes)
- Failed rows
- Duplicate spreadsheet rows
- Course matches
- Course unmatched
- Intake matches
- Intake unmatched
- Sample data for each category

**Error details include:**
- Row number
- Student number
- Full name
- Field
- Error message
- Received value

---

## G. Supabase as Single Source of Truth

**Status:** Verified - All models use Supabase

**Verified models:**
- User.js - Supabase
- Course.js - Supabase
- Intake.js - Supabase
- Fee.js - Supabase
- Result.js - Supabase
- Subject.js - Supabase
- Announcement.js - Supabase

**No SQLite fallback found in application code**

---

## H. Admin Student List Display

**Status:** Fixed in previous changes

**API returns:**
- course_name (flattened from courses join)
- course_code (flattened from courses join)
- intake_name (mapped from intakes table)
- intake_year (mapped from intakes table)
- gender (direct field)

**Frontend displays:**
- course_name
- course_code
- intake_name
- gender

---

## I. Lecturer Student Data Consistency

**Status:** Verified - Uses same endpoint

**Lecturer uses:** GET /api/students (same as Admin)

**Lecturer-specific filtering:**
```javascript
if (req.user.role === 'lecturer') {
  filters.course_id = req.user.course_id;
}
```

**Issue:** If lecturer's course_id is NULL, requests to `/api/subjects/course/null` will fail. This needs investigation in the lecturer account creation/assignment process.

---

## J. Dashboard Statistics

**Status:** Already correct

**Calculates from:**
- Actual Supabase users table
- role = 'student'
- gender field (normalized case-insensitive)
- status field

**No hardcoded values**

---

## K. Administrator Login

**Status:** NOT YET INVESTIGATED

**Pending investigation:**
- Multi-admin authentication flow
- Email vs username vs student_number
- Password verification
- Role check
- JWT/session creation
- Actual administrator records in Supabase

---

## L. Other Admin Account Workflows

**Status:** NOT YET INVESTIGATED

**Pending:**
- SUPER_ADMIN creates administrator
- Administrator receives credentials
- Administrator logs in
- Authentication mechanism consistency

---

## M. Portal Bug Audit

**Status:** NOT YET PERFORMED

**Pending audit of:**
- Admin pages (Dashboard, Students, Courses, Lecturers, Subjects, Results, Fees, Announcements, Intakes, Administrators, Audit Logs, Settings)
- Lecturer pages (Dashboard, Students, Subjects, Results, Profile, Course-dependent data)
- Student pages (Dashboard, Profile, Results, Fees, Announcements, Course, Intake)

**Issues to check:**
- 404, 400, 401, 403, 429, 500 errors
- /api/api/... duplication
- /course/null requests
- Missing IDs
- Undefined fields
- Null values
- Stale localStorage
- Mock data
- SQLite fallback
- Failed Supabase queries
- Broken joins
- Incorrect field names
- Authentication inconsistencies
- Authorization inconsistencies
- Duplicate records
- Frontend/backend schema mismatches

---

## N. API Contract Audit

**Status:** NOT YET PERFORMED

**Pending audit of:**
- GET /api/students
- GET /api/students/search
- POST /api/students
- PUT/PATCH student update endpoint
- Student import endpoint
- Lecturer student endpoint
- Dashboard statistics endpoint

**Goal:** Consistent field names across all endpoints

---

## O. Stale/Mock Data Paths

**Status:** NOT YET AUDITED

**Pending search for:**
- mockStudents
- demoStudents
- seedStudents
- sampleStudents
- fallbackStudents
- localStorage student data
- sessionStorage student data
- Hardcoded student arrays
- SQLite fallback

---

## P. Production Verification

**Status:** NOT YET PERFORMED

**Pending:**
- Git commit
- Git push
- Render deployment
- Deployment SHA verification
- Controlled test with one existing student
- End-to-end verification

---

## Q. Controlled Test Plan

When ready for production testing:

1. Select one existing student (e.g., STU-624)
2. Confirm current Supabase values (gender, course_id, intake)
3. Modify that student's Excel row with new values
4. Upload workbook
5. Verify importer reports "Updated: 1"
6. Query Supabase to verify same student ID was updated
7. Verify no duplicate was created
8. Refresh Admin Student List
9. Verify Gender/Course/Intake display correctly
10. Open Lecturer view
11. Verify same student has same course/intake/gender
12. Refresh browser
13. Verify values remain
14. Verify dashboard statistics changed correctly

---

## R. Summary of Completed Fixes

✅ **Fixed:** Blank field overwrite bug (preserves existing data)
✅ **Fixed:** studentNumber variable bug (enables upsert)
✅ **Enhanced:** Course matching with detailed logging
✅ **Enhanced:** Intake matching with partial matching and logging
✅ **Verified:** Supabase as single source of truth
✅ **Verified:** Admin Student List display
✅ **Verified:** Lecturer uses same endpoint as Admin
✅ **Verified:** Dashboard statistics use actual data
✅ **Implemented:** Gender normalization
✅ **Implemented:** Header normalization
✅ **Implemented:** Upsert by student_number
✅ **Implemented:** Transparent import results

---

## S. Remaining Work

**High Priority:**
- Administrator login investigation
- Lecturer course_id NULL issue investigation
- Controlled production test with one student
- Deployment and verification

**Medium Priority:**
- Portal bug audit (all pages)
- API contract audit
- Stale/mock data path audit

**Status:** Code changes complete. Pending deployment and production verification.

---

## T. Files Modified Summary

**Backend (2 files):**
1. `backend/models/User.js` - Blank field preservation, comprehensive logging
2. `backend/controllers/studentController.js` - Enhanced course/intake matching with logging

**Total lines changed:** ~80 lines added/modified

---

## U. Conclusion

The critical Excel import pipeline issues have been fixed:
1. Existing students are now correctly updated (not duplicated)
2. Blank Excel fields no longer overwrite existing data
3. Course and intake matching is more robust with detailed logging
4. Gender normalization is already correct

The fixes are ready for controlled production testing. The remaining tasks (admin login, lecturer course issue, portal audit) require separate investigation and are not part of the Excel import pipeline fix.
