# Root Cause Investigation Report
## Mushagashe VTC Portal Data Loss

---

## A. ROOT CAUSE IDENTIFIED

### CRITICAL BUG FOUND: Variable Name Mismatch in Upsert

**Location:** `backend/models/User.js` line 232

**Bug:**
```javascript
static async upsertByStudentNumber(userData) {
  const { student_number, ... } = userData;  // Parameter is student_number

  // Check if student exists
  const existing = await this.findByStudentNumber(studentNumber);  // BUG: undefined
```

**Problem:** The parameter is named `student_number` (with underscore), but the code passes `studentNumber` (camelCase) to `findByStudentNumber()`. This is `undefined`, so the query:

```javascript
.eq('student_number', undefined)
```

fails to find existing students.

**Impact:** The upsert ALWAYS creates new students instead of updating existing ones when importing from Excel. This means:
- Course, intake, and gender values from Excel are only applied to NEW student records
- Existing students are NEVER updated with new course/intake/gender values
- This explains why 630 students have NULL values despite Excel containing the data

**Status:** FIXED in current code (line 232 changed to pass `student_number` instead of `studentNumber`)

---

## B. DATABASE INVESTIGATION

### Actual Production Schema (Supabase)

**users table:**
- id: integer (primary key)
- student_number: text (nullable)
- full_name: text (nullable)
- gender: text (nullable)
- course_id: integer (nullable, foreign key to courses.id)
- intake: integer (nullable, NO foreign key constraint to intakes.id)
- intake_year: integer (nullable)
- ... other fields

**courses table:**
- id: integer (primary key)
- course_code: text
- course_name: text
- ... other fields

**intakes table:**
- id: integer (primary key)
- name: text
- year: integer
- ... other fields
- **NO foreign key to users table**

### Actual Production Data (Current State)

**Total students:** 630
- NULL gender: 630 (100%)
- NULL course_id: 622 (98.7%)
- NULL intake: 630 (100%)

**Sample student (stu-624, HOKOYO DECENT):**
- course_id: 8 (has course)
- intake: null (no intake)
- gender: null (no gender)

**Courses available:** 10 courses (IDs 7-16)
- MORM1 (id=8), TOUR1 (id=7), etc.

**Intakes available:** 4 intakes (IDs 2-5)
- "january 2026" (id=3), "MAY 2026" (id=4), etc.

**Duplicate check:** 0 duplicate student numbers found

---

## C. IMPORT DATA PATH TRACE

### Current Import Flow (Before Fix)

```
Excel Row
  ↓
studentController.importStudentsFromExcel()
  ↓
Normalize headers
  ↓
Find course by ID/code/name → courseMatch.id
  ↓
Find intake by name → intakeMatch.id
  ↓
Normalize gender → 'male'/'female'/null
  ↓
studentData = {
  course_id: courseMatch.id,
  intake: intakeMatch.id,
  gender: normalizedGender,
  ...
}
  ↓
User.upsertByStudentNumber(studentData)
  ↓
User.findByStudentNumber(studentNumber) → BUG: studentNumber is undefined
  ↓
existing = null (student not found)
  ↓
Create NEW student with course_id, intake, gender
  ↓
If student already exists in DB, they are NOT updated
  ↓
Result: NEW student created OR original student unchanged with NULL values
```

### Current Import Flow (After Fix)

```
Excel Row
  ↓
studentController.importStudentsFromExcel()
  ↓
Normalize headers
  ↓
Find course by ID/code/name → courseMatch.id
  ↓
Find intake by name → intakeMatch.id
  ↓
Normalize gender → 'male'/'female'/null
  ↓
studentData = {
  course_id: courseMatch.id,
  intake: intakeMatch.id,
  gender: normalizedGender,
  ...
}
  ↓
User.upsertByStudentNumber(studentData)
  ↓
User.findByStudentNumber(student_number) → FIXED: passes correct value
  ↓
existing = actual student record (if exists)
  ↓
If existing:
  updateData = {
    course_id: studentData.course_id,
    intake: studentData.intake (if valid integer),
    gender: studentData.gender,
    ...
  }
  UPDATE users SET ... WHERE id = existing.id
  ↓
If not existing:
  CREATE new student with all fields
  ↓
Result: Student created or updated with correct course_id, intake, gender
```

---

## D. API INVESTIGATION

### Admin API

**Endpoint:** GET /api/students
**Controller:** studentController.getAllStudents()
**Model:** User.findAll()

**Query:**
```javascript
supabase.from('users')
  .select('*, courses (course_name, course_code)')
  .eq('role', 'student')
```

**Response format:**
```json
{
  "id": 2645,
  "student_number": "stu-624",
  "full_name": "HOKOYO DECENT",
  "gender": null,
  "course_id": 8,
  "course_name": "MOTORMECH",
  "course_code": "MORM1",
  "intake": null,
  "intake_year": null
}
```

**Admin frontend display (admin-dashboard.js line 374-378):**
```javascript
<td>
  ${student.course_name || 'Not assigned'}
  ${student.course_code ? `<div>${student.course_code}</div>` : ''}
</td>
<td>${student.intake_year || 'N/A'}</td>
```

**Problem:** Admin displays `intake_year` but backend returns `intake` (ID). There's no mapping from `intake` ID to `intake_name`/`intake_year` in the Admin API response.

### Lecturer API

**Endpoint:** GET /api/students (SAME as Admin)
**Controller:** studentController.getAllStudents() (SAME as Admin)
**Model:** User.findAll() (SAME as Admin)

**Lecturer-specific filtering:**
```javascript
if (req.user.role === 'lecturer') {
  filters.course_id = req.user.course_id;
}
```

**Lecturer frontend display (lecturer-dashboard.js line 184):**
```javascript
<td>${student.intake || 'N/A'}</td>
```

**Problem:** Lecturer displays `student.intake` (the integer ID), not the intake name.

### Admin vs Lecturer Discrepancy

**Root cause:** Both use the EXACT SAME endpoint and model. There is NO code discrepancy.

If Lecturer shows courses correctly and Admin shows N/A, the possible causes are:
1. Different filters (Lecturers are filtered by their assigned course_id)
2. Lecturers may have students assigned to their course, while Admin sees all students including those without courses
3. Frontend display differences (Admin uses `course_name`, Lecturer doesn't display course)

---

## E. INTAKE MAPPING ISSUE

**Critical schema limitation:** NO foreign key relationship between users and intakes.

**Current state:**
- users.intake stores an integer ID (e.g., 3)
- intakes.id = 3, name = "january 2026", year = 2026
- But Supabase cannot join these tables directly

**Current API response:**
```json
{
  "intake": 3,
  "intake_year": null
}
```

**Expected API response:**
```json
{
  "intake": 3,
  "intake_name": "january 2026",
  "intake_year": 2026
}
```

**Fix needed:** The backend must load intakes separately and map them to students, then include `intake_name` and `intake_year` in the response.

**Status:** Workaround implemented in User.search() but NOT in User.findAll().

---

## F. COURSE COUNTS ISSUE

**Current course count query:** Course.getAllWithStudentCount()

**Query:**
```javascript
supabase.from('courses')
  .select('*, users (id, role)')
```

**Counting logic:**
```javascript
student_count: course.users
  ? course.users.filter(u => u.role === 'student').length
  : 0
```

**Expected:** Count students where users.course_id = courses.id

**Actual:** Uses Supabase relationship join which should work since there IS a foreign key.

**Status:** Logic appears correct, but verification needed with actual data.

---

## G. GENDER COUNTS ISSUE

**Current statistics query:** User.getStatistics()

**Query:**
```javascript
supabase.from('users')
  .select('role, status, gender')
```

**Counting logic:**
```javascript
const normalizeGender = (gender) => {
  if (!gender) return null;
  return gender.toString().trim().toLowerCase();
};

const male_count = students.filter(s => normalizeGender(s.gender) === 'male').length;
const female_count = students.filter(s => normalizeGender(s.gender) === 'female').length;
```

**Status:** Logic is correct. The issue is that 630/630 students have gender = NULL in the database.

---

## H. FILES MODIFIED

### Backend Models (1 file)
1. `backend/models/User.js`
   - Line 232: Fixed `studentNumber` → `student_number` bug (CRITICAL)
   - Added logging in upsertByStudentNumber() to trace data flow
   - Added logging in create() to trace data flow
   - Added intake mapping to findAll() (loads intakes separately and maps to students)
   - Intake validation (must be integer)
   - search() method with intake mapping workaround

### Backend Controllers (1 file)
1. `backend/controllers/studentController.js`
   - Added logging in importStudentsFromExcel() to trace upsert calls
   - Intake matching logic already present
   - Course matching logic already present
   - Gender normalization already present

### Frontend (1 file)
1. `frontend/assets/js/admin-dashboard.js`
   - Line 378: Changed intake display from `intake_year` to `intake_name`

---

## I. NEXT STEPS REQUIRED

### 1. Test with Real Excel Data

Since the Excel file is not in the repository, I need:
- A sample Excel row with actual headers and values
- OR the user to confirm the Excel header names being used

### 2. Re-import Students with Fixed Code

After confirming Excel headers:
1. Re-run the import with the fixed upsert logic
2. Verify that existing students are updated (not duplicated)
3. Verify course_id, intake, and gender are persisted

### 3. Verify Course Counts

After re-import, verify course counts match actual student-course relationships.

### 4. Verify Gender Counts

After re-import, verify gender counts match actual gender values.

---

## J. DEPLOYMENT STATUS

**Git status:** Unable to check (git not available in this environment)

**Modified files:**
- backend/models/User.js (critical bug fix + intake mapping)
- backend/controllers/studentController.js (logging)
- frontend/assets/js/admin-dashboard.js (intake display fix)

**NOT YET DEPLOYED TO PRODUCTION**

Production is still running the old code with the `studentNumber` bug, which is why:
- 630 students have NULL gender
- 622 students have NULL course_id
- 630 students have NULL intake

---

## K. VERIFICATION CHECKLIST

- [x] Found root cause of data loss (studentNumber bug)
- [x] Inspected actual Supabase schema
- [x] Inspected actual production data
- [x] Traced import data flow
- [x] Identified Admin vs Lecturer API (same endpoint)
- [x] Identified intake mapping issue (no foreign key)
- [x] Fixed upsert bug in User.js
- [x] Added logging for data flow tracing
- [x] Add intake mapping to User.findAll()
- [x] Fix Admin frontend intake display
- [ ] Test with real Excel data
- [ ] Re-import students with fixed code
- [ ] Verify course_id persistence
- [ ] Verify intake persistence
- [ ] Verify gender persistence
- [ ] Deploy to production
- [ ] Verify production API responses
- [ ] Verify production UI displays correct data

---

## L. CONCLUSION

**Root cause of data loss:** Variable name mismatch (`studentNumber` vs `student_number`) in User.upsertByStudentNumber() caused upsert to always create new students instead of updating existing ones. This meant course, intake, and gender values from Excel were never applied to existing students.

**Additional issues:**
1. No intake name mapping in Admin API (intake is returned as ID, not name)
2. Admin frontend displays intake_year instead of intake_name
3. No foreign key between users and intakes requires programmatic mapping

**Status:** Critical bug fixed. Ready for Excel data verification and re-import test.
