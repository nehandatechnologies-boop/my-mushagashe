# EXCEL IMPORT UPSERT FUNCTIONALITY REPORT

## Executive Summary

The Excel import system has been enhanced to support true UPSERT (UPDATE + INSERT) functionality. The system now correctly handles both new student creation and existing student updates without duplicating records or losing existing data.

---

## UPSERT Implementation

### Primary Match Key

**Student Number** is the unique identity key for UPSERT operations.

- **If Student Number DOES NOT exist**: CREATE the student
- **If Student Number ALREADY exists**: UPDATE the existing student
- **NEVER create duplicates** when the student number already exists

---

## Partial Update Support

### Empty Excel Cells Preserve Existing Data

The system now correctly handles partial updates:

**Rule**: If an Excel cell is empty, the existing database value is preserved.

**Example**:
```
Existing student:
- Student Number: STU2026006
- Name: Brian Madhobhi
- Course: NULL
- Gender: Male
- Intake: January 2026
- Phone: +263123456789

Excel row:
- Student Number: STU2026006
- Course ID: TOUR1
- (All other cells empty)

Result:
- Student Number: STU2026006
- Name: Brian Madhobhi (PRESERVED)
- Course: TOUR1's actual course ID (UPDATED)
- Gender: Male (PRESERVED)
- Intake: January 2026 (PRESERVED)
- Phone: +263123456789 (PRESERVED)
```

### Implementation

**File**: `backend/models/User.js` (Lines 297-340)

```javascript
// Update existing student - ONLY update fields that are provided and non-null
const updateData = {};

// Helper to add field to updateData only if it's provided and meaningful
const addField = (field, value) => {
  if (value !== undefined && value !== null && value !== '') {
    updateData[field] = value;
  }
};

addField('full_name', full_name);
addField('email', email);
addField('phone', phone);
addField('gender', gender);
addField('national_id', national_id);
addField('date_of_birth', date_of_birth);
addField('address', address);
addField('guardian_name', guardian_name);
addField('guardian_phone', guardian_phone);
addField('intake_year', intake_year);
addField('course_id', course_id);
addField('status', status);

// Handle password: hash if provided, otherwise preserve existing password
if (password) {
  updateData.password = password;  // Pass plaintext, User.update will hash it
  updateData.must_change_password = true;
} else {
  console.log('[USER.UPSERT] No password provided, preserving existing password');
  // Do NOT update password field - preserve existing password
}
```

**File**: `backend/controllers/studentController.js` (Lines 1035-1068)

```javascript
const studentData = {
  full_name: normalizeHeader(row, 'FULL NAME')?.toString().trim() || null,
  student_number: normalizeHeader(row, 'STUDENT NUMBER')?.toString().trim() || null,
  course_id: courseMatch ? courseMatch.id : null,
  // ... other fields ...
};

// Track which fields are actually provided in Excel (not null/empty)
const providedFields = Object.keys(studentData).filter(key => {
  const value = studentData[key];
  return value !== null && value !== undefined && value !== '';
});

console.log(`[IMPORT] ROW ${rowNum} - Provided fields:`, providedFields.join(', '));
```

---

## Course Code Resolution

### Course Codes Supported

The importer correctly resolves course codes to database IDs:

**Supported Course Codes**:
- TOUR1
- MOTOR1
- ELEC1
- AUTO1
- MOTO1
- BUILD1
- WELD1
- CLOTH1
- CARP1
- PLUMB1
- COSMO1

### Resolution Process

**File**: `backend/controllers/studentController.js` (Lines 846-930)

```javascript
const findCourseId = async (courseCodeFromExcel, courseNameFromExcel) => {
  // PRIORITY 1: Try exact match on course code (normalized)
  if (courseCodeFromExcel) {
    const normalizedCode = courseCodeFromExcel.toString().trim().toUpperCase();
    const byCode = allCourses.find(c =>
      c.course_code && c.course_code.toUpperCase() === normalizedCode
    );
    if (byCode) {
      return { id: byCode.id, name: byCode.course_name, code: byCode.course_code, matchedBy: 'code' };
    }
  }

  // PRIORITY 2: Try exact match on course name (normalized)
  // PRIORITY 3: Try partial match on course name
  // PRIORITY 4: Try numeric ID if explicitly numeric
  // PRIORITY 5: Try direct database lookup by course_code
  const Course = require('../models/Course');
  const directMatch = await Course.findByCode(courseCodeFromExcel.toString().trim().toUpperCase());
  if (directMatch) {
    return { id: directMatch.id, name: directMatch.course_name, code: directMatch.course_code, matchedBy: 'direct_db_lookup' };
  }

  return null;
};
```

### Error Handling

If a course code does not exist:
```
Error: Course "TOUR1" not found in database. Available codes: MOTOR1, ELEC1, AUTO1, ...
```

The row is marked as failed and skipped. No fake course is created.

---

## Intake Resolution

### Intake Matching

The importer resolves intake values against actual intake records:

**Supported Intakes**:
- January 2026
- May 2026
- September 2026
- Or any intake defined in the `intakes` table

### Resolution Process

**File**: `backend/controllers/studentController.js` (Lines 933-930)

```javascript
const findIntakeId = (intakeNameFromExcel) => {
  const normalized = intakeNameFromExcel.toString().trim();
  const normalizedUpper = normalized.toUpperCase();

  // PRIORITY 1: Try case-insensitive exact match
  const byNameCaseInsensitive = allIntakes.find(i =>
    i.name && i.name.toUpperCase() === normalizedUpper
  );
  if (byNameCaseInsensitive) {
    return { id: byNameCaseInsensitive.id, name: byNameCaseInsensitive.name, year: byNameCaseInsensitive.year, matchedBy: 'name_case_insensitive' };
  }

  // PRIORITY 2: Try partial match
  const byPartial = allIntakes.find(i =>
    i.name && (i.name.toUpperCase().includes(normalizedUpper) || normalizedUpper.includes(i.name.toUpperCase()))
  );
  if (byPartial) {
    return { id: byPartial.id, name: byPartial.name, year: byPartial.year, matchedBy: 'partial' };
  }

  return null;
};
```

### Date Handling

If the spreadsheet contains a date like `2026-01-01`, it is normalized to match the corresponding intake record.

---

## Password Safety

### Password Preservation Rule

**Rule**: If the Excel file contains no password, preserve the existing authentication credentials.

**Implementation**:
```javascript
// Handle password: hash if provided, otherwise preserve existing password
if (password) {
  updateData.password = password;  // Pass plaintext, User.update will hash it
  updateData.must_change_password = true;
} else {
  console.log('[USER.UPSERT] No password provided, preserving existing password');
  // Do NOT update password field - preserve existing password
}
```

### Password Update

If the Excel file contains a password:
- The password is validated (minimum 6 characters)
- The password is hashed by `User.update()`
- `must_change_password` is set to `true`
- The user must change the password on next login

**Never store plaintext passwords**

---

## Import Preview

### Preview Summary

The preview now distinguishes between:

- **New students**: Students that will be created
- **Existing students to update**: Students that will be updated
- **Students unchanged**: Students that exist but no changes will be made
- **Errors**: Rows that failed validation

**File**: `backend/controllers/studentController.js` (Lines 1227-1253)

```javascript
return res.json({
  preview: true,
  batch_id: batch.id,
  worksheet: selectedSheetName,
  detected_headers: selectedHeaders,
  total_rows: finalData.length,
  valid_rows: processed.length,
  new_students: newStudents.length,
  existing_students: existingStudents.length,
  students_to_update: existingStudents.filter(s => s.field_changes && Object.keys(s.field_changes).length > 0).length,
  students_unchanged: existingStudents.filter(s => !s.field_changes || Object.keys(s.field_changes).length === 0).length,
  duplicate_spreadsheet_rows: errors.filter(e => e.field === 'spreadsheet_duplicate').length,
  skipped_unmatched_courses: unmatchedCourses.length,
  skipped_unmatched_intakes: unmatchedIntakes.length,
  failed: errors.length,
  course_matched: courseMatches.matched,
  course_unmatched: courseMatches.unmatched,
  intake_matched: intakeMatches.matched,
  intake_unmatched: intakeMatches.unmatched,
  gender: genderStats,
  sample_new: newStudents.slice(0, 5),
  sample_existing: existingStudents.slice(0, 5),
  sample_updates: existingStudents.filter(s => s.field_changes && Object.keys(s.field_changes).length > 0).slice(0, 5),
  sample_errors: errors.slice(0, 5),
  diagnostics: worksheetDiagnostics
});
```

### Field Change Tracking

The system tracks which fields will change for existing students:

**File**: `backend/controllers/studentController.js` (Lines 1117-1185)

```javascript
// Track field changes for existing students
let fieldChanges = null;
if (existingStudent) {
  fieldChanges = {};
  if (studentData.course_id && studentData.course_id !== existingStudent.course_id) {
    fieldChanges.course = {
      before: existingStudent.course_id,
      after: studentData.course_id,
      before_name: existingStudent.course_name,
      after_name: studentData.course_name
    };
  }
  if (studentData.intake && studentData.intake !== existingStudent.intake) {
    fieldChanges.intake = {
      before: existingStudent.intake,
      after: studentData.intake
    };
  }
  // ... track other field changes ...
}
```

---

## Import Results

### Response Format

After import, the system returns:

```json
{
  "message": "Import complete: 10 created, 600 updated, 14 unchanged",
  "batch_id": 123,
  "total_rows": 624,
  "created": 10,
  "updated": 600,
  "unchanged": 14,
  "skipped": 0,
  "failed": 0,
  "course_matched": 624,
  "course_unmatched": 0,
  "intake_matched": 624,
  "intake_unmatched": 0,
  "duplicate_spreadsheet_rows": 0,
  "created_students": [...],
  "updated_students": [...],
  "unchanged_students": [...],
  "skipped_unmatched_courses": [],
  "skipped_unmatched_intakes": [],
  "errors": []
}
```

### Action Types

The system now distinguishes three actions:

1. **created**: New student was created
2. **updated**: Existing student was updated (at least one field changed)
3. **unchanged**: Existing student exists but no fields were changed

**File**: `backend/models/User.js` (Lines 344-358)

```javascript
// If no fields to update, return unchanged
if (Object.keys(updateData).length === 0) {
  console.log('[USER.UPSERT] No fields to update, returning unchanged');
  return { ...existing, action: 'unchanged' };
}

// ... perform update ...

return { ...data, action: 'updated' };
```

---

## Duplicate Protection

### Spreadsheet Duplicates

If the same Student Number appears more than once in the Excel file:

**Detection**: Tracked during processing
**Action**: Marked as error with field `spreadsheet_duplicate`
**Result**: Duplicate rows are skipped

**File**: `backend/controllers/studentController.js` (Lines 1111-1123)

```javascript
// Check for duplicate within spreadsheet
if (processedStudentNumbers.has(studentData.student_number)) {
  errors.push({
    row: rowNum,
    student_number: studentData.student_number,
    full_name: studentData.full_name,
    field: 'spreadsheet_duplicate',
    error: 'Duplicate student number within spreadsheet'
  });
  continue;
}

processedStudentNumbers.add(studentData.student_number);
```

### Database Duplicates

The UPSERT operation uses `student_number` as the unique key:

```javascript
// Check if student exists
const existing = await this.findByStudentNumber(student_number);

if (existing) {
  // Update existing student
  // ...
} else {
  // Create new student
  // ...
}
```

This ensures no database duplicates are created.

---

## Files Modified (2)

1. **backend/controllers/studentController.js**
   - Added field change tracking for existing students
   - Added provided fields tracking
   - Updated preview to distinguish created/updated/unchanged
   - Updated response to include unchanged students
   - Added sample_updates to preview

2. **backend/models/User.js**
   - Enhanced UPSERT to preserve password when not provided
   - Added unchanged action type
   - Only updates fields that are provided and non-null
   - Pass plaintext password to User.update() for consistent hashing

---

## Acceptance Criteria Verification

| Requirement | Status | Implementation |
|-------------|--------|----------------|
| New Student Number → creates student | ✅ YES | `User.upsertByStudentNumber()` creates if not exists |
| Existing Student Number → updates student | ✅ YES | `User.upsertByStudentNumber()` updates if exists |
| Existing student is NEVER duplicated | ✅ YES | Uses student_number as unique key |
| Existing student's missing Course can be populated | ✅ YES | Course code resolution with direct DB lookup |
| Existing Course can be changed from Excel | ✅ YES | Partial update support |
| Course codes such as TOUR1 resolve correctly | ✅ YES | Multi-priority resolution with direct DB lookup |
| Intake values resolve correctly | ✅ YES | Case-insensitive and partial matching |
| Empty Excel cells do NOT erase existing database values | ✅ YES | Only updates provided fields |
| Existing passwords are preserved when Excel password is empty | ✅ YES | Conditional password update |
| Student count does not increase when existing student is updated | ✅ YES | UPSERT creates or updates, never duplicates |
| Duplicate Student Numbers inside Excel are detected | ✅ YES | Tracked via processedStudentNumbers Set |
| Import uses Supabase as the authoritative database | ✅ YES | All operations use Supabase client |
| No SQLite | ✅ YES | Supabase only |
| No mock data | ✅ YES | Real database operations only |
| No delete-and-recreate strategy | ✅ YES | UPSERT preserves existing data |
| Import results clearly distinguish CREATED/UPDATED/UNCHANGED/FAILED | ✅ YES | Response includes all four categories |

---

## Testing Scenarios

### Test 1: New Student Creation

**Input**: Excel with new student number
**Expected**: Student created with all provided fields
**Result**: ✅ Implemented

### Test 2: Existing Student Course Update

**Input**:
```
Before: STU2026006, Course: NULL
Excel: STU2026006, Course ID: TOUR1
```
**Expected**: Course updated to TOUR1's ID, other fields preserved
**Result**: ✅ Implemented

### Test 3: Course Change

**Input**:
```
Before: STU2026006, Course: TOUR1
Excel: STU2026006, Course ID: MOTOR1
```
**Expected**: Course changed to MOTOR1, no duplicate student
**Result**: ✅ Implemented

### Test 4: Partial Update

**Input**: Excel contains only Student Number and Course ID
**Expected**: Course updated, gender/intake/phone/email/guardian/address preserved
**Result**: ✅ Implemented

### Test 5: Password Preservation

**Input**: Excel has no password column
**Expected**: Existing password preserved
**Result**: ✅ Implemented

### Test 6: Course Code Resolution

**Input**: Excel contains TOUR1, MOTOR1, ELEC1
**Expected**: Resolved to actual course IDs
**Result**: ✅ Implemented with direct DB lookup fallback

---

## Summary

**UPSERT Functionality**: ✅ FULLY IMPLEMENTED

- Student Number is the primary match key
- New students are created
- Existing students are updated
- Empty cells preserve existing data
- Course codes resolve correctly
- Intake values resolve correctly
- Passwords are preserved when not provided
- No duplicates are created
- Import preview shows what will change
- Results distinguish CREATED/UPDATED/UNCHANGED/FAILED

**Status**: ✅ Code fixed, syntax verified, requires deployment and testing
