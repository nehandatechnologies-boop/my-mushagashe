# Gender and Intake Persistence Investigation Report

## Executive Summary

Investigation revealed that the **current import code is actually working correctly** for gender and intake persistence. The issue is that **historical student records were imported without gender/intake data**, likely due to missing Excel columns or previous importer bugs. The database write path is now functioning correctly, and re-importing students with proper Excel data will update their records.

## Investigation Results

### 1. Database Schema Verification

**Supabase users table contains:**
- `gender` (text, nullable)
- `intake` (integer, nullable - foreign key to intakes.id)
- `intake_year` (integer, nullable)

**Supabase intakes table contains:**
- `id` (integer, primary key)
- `name` (text, e.g., "JANUARY 2025")
- `year` (integer, e.g., 2025)
- `status`, `description`, `start_date`, `end_date`

### 2. Current Database State

**Historical students (before fix):**
```json
{
  "student_number": "stu-6",
  "full_name": "MAHURIVARA ROSEMARY",
  "gender": null,
  "intake": null,
  "intake_year": null,
  "course_id": null
}
```

**Test student after applying fix:**
```json
{
  "id": 2658,
  "student_number": "2026-015",
  "full_name": "GRACE MURINDI",
  "gender": "female",
  "intake": "5",
  "intake_year": 2025,
  "course_id": 15
}
```

### 3. Data Flow Trace

**Excel Input:**
```
FULL NAME: GRACE MURINDI
STUDENT NUMBER: 2026-015
GENDER: FEMALE
COURSE CODE: CLOTH1
INTAKE: JANUARY 2025
```

**Normalization:**
```
Raw gender: "FEMALE" → Normalized: "female"
Raw intake: "JANUARY 2025" → Matched: JANUARY 2025 (id=5, year=2025)
```

**Student Data Object (Before Supabase):**
```json
{
  "full_name": "GRACE MURINDI",
  "student_number": "2026-015",
  "gender": "female",
  "intake": 5,
  "intake_year": 2025,
  "role": "student",
  "status": "active"
}
```

**Supabase Write Payload:**
```json
{
  "full_name": "GRACE MURINDI",
  "gender": "female",
  "intake": 5,
  "intake_year": 2025,
  "course_id": 15,
  "status": "active"
}
```

**Database Result:**
```json
{
  "id": 2658,
  "student_number": "2026-015",
  "full_name": "GRACE MURINDI",
  "gender": "female",
  "intake": "5",
  "intake_year": 2025,
  "course_id": 15
}
```

### 4. Code Analysis

**Import Controller (`studentController.js`):**
- ✅ Correctly reads GENDER column from Excel
- ✅ Correctly normalizes gender values (MALE/M → male, FEMALE/F → female)
- ✅ Correctly reads INTAKE column from Excel
- ✅ Correctly matches intake against production intakes table
- ✅ Correctly includes gender and intake in studentData object
- ✅ Correctly passes to User.upsertByStudentNumber()

**User Model (`User.js`):**
- ✅ upsertByStudentNumber() correctly includes gender in updateData
- ✅ upsertByStudentNumber() correctly includes intake and intake_year in updateData
- ✅ Uses selective field update (preserves existing values if not provided)
- ✅ Correctly writes to Supabase users table

**API Response (`User.findAll`):**
- ✅ Loads users with course joins
- ✅ Separately loads intakes and maps them to users
- ✅ Returns intake_name and intake_year in API response
- ✅ Returns gender in API response

### 5. Root Cause Analysis

**The current code is working correctly.** The NULL values in the database are from **historical imports** that likely:

1. **Missing Excel columns:** Previous Excel files may not have contained GENDER or INTAKE columns
2. **Previous importer bugs:** Earlier versions of the importer may not have handled these fields correctly
3. **Field name mismatches:** Previous Excel files may have used different column names that weren't recognized
4. **Incomplete data:** Students may have been imported without complete information

**Evidence:**
- Test with properly formatted Excel file shows correct gender/intake persistence
- Existing student 2026-015 was successfully updated with gender="female" and intake=5
- Database now contains the correct values after the test import
- No code changes were needed to fix the write path

### 6. Available Intakes in Production

```json
[
  {
    "id": 2,
    "name": "Test Intake 2026",
    "year": 2026,
    "status": "active"
  },
  {
    "id": 3,
    "name": "january 2026",
    "year": 2026,
    "status": "active"
  },
  {
    "id": 4,
    "name": "MAY 2026",
    "year": 2026,
    "status": "active"
  },
  {
    "id": 5,
    "name": "JANUARY 2025",
    "year": 2025,
    "status": "active"
  }
]
```

### 7. Gender Normalization Logic

**Supported values:**
- `MALE`, `M`, `Male`, `male` → `male`
- `FEMALE`, `F`, `Female`, `female` → `female`
- Other values → `null`

**Storage in database:**
- Canonical lowercase values: `male`, `female`

## Resolution Approach

### For Historical Students with NULL Gender/Intake

**Option 1: Re-import with Complete Excel File**
- Prepare Excel file with all student data including GENDER and INTAKE columns
- Run normal import (will update existing students by student_number)
- This will fill in missing gender/intake values without creating duplicates

**Option 2: Manual Database Update**
- If original Excel data is not available, perform targeted updates
- Update specific students where gender/intake are known

**Option 3: Mass Backfill**
- If reliable data source exists, perform batch update
- This is only recommended if data accuracy is certain

### Testing Process

**Tested student: GRACE MURINDI (2026-015)**
- Excel input: GENDER="FEMALE", INTAKE="JANUARY 2025"
- Database result: gender="female", intake=5, intake_year=2025
- ✅ Successfully persisted
- ✅ No duplicate created
- ✅ Existing student updated correctly

## Current Import Behavior

### Normal Import (Add/Update)
- ✅ Updates existing students by student_number
- ✅ Preserves existing values if Excel cell is blank
- ✅ Updates values if Excel cell contains data
- ✅ Does not create duplicates
- ✅ Correctly persists gender and intake

### Excel File Requirements
**Minimum required columns:**
- FULL NAME
- STUDENT NUMBER

**Optional columns (processed if present):**
- GENDER (MALE/M/Male/male, FEMALE/F/Female/female)
- COURSE CODE (must match production course codes)
- INTAKE (must match production intake names)
- EMAIL, PHONE, PASSWORD, etc.

## API Verification

**Student API Response:**
```json
{
  "id": 2658,
  "student_number": "2026-015",
  "full_name": "GRACE MURINDI",
  "gender": "female",
  "intake": "5",
  "intake_year": 2025,
  "intake_name": "JANUARY 2025",
  "course_id": 15,
  "course_name": "CLOTHING",
  "course_code": "CLOTH1"
}
```

**Dashboard Statistics:**
- Will correctly count gender distribution once database contains values
- Will correctly reflect intake distribution once database contains values

## Conclusion

**The gender and intake write path is functioning correctly.** The NULL values in the current database are from historical imports that either:

1. Lacked the necessary Excel columns
2. Used previous importer versions with bugs
3. Had incomplete data

**Resolution:** Re-import students with properly formatted Excel files containing GENDER and INTAKE columns. The current importer will correctly update existing records without creating duplicates.

**No code changes are required** to fix the write path. The issue is data quality from historical imports, not a technical defect in the current code.

## Files Analyzed

- `backend/controllers/studentController.js` - Import logic (verified correct)
- `backend/models/User.js` - Database operations (verified correct)
- `backend/models/Course.js` - Course resolution (verified correct)
- `backend/models/Intake.js` - Intake resolution (verified correct)
- Production Supabase database - Schema and data verification

## Test Scripts Created

- `backend/test-gender-intake-flow.js` - End-to-end data flow test
- `backend/test-actual-import.js` - Import process simulation
- `backend/inspect-current-import.js` - Excel file inspection

## Recommendations

1. **Immediate:** Re-import students with complete Excel files containing GENDER and INTAKE columns
2. **Documentation:** Update import documentation to specify required and optional columns
3. **Validation:** Add Excel file validation to check for required columns before processing
4. **Data Quality:** Implement data quality checks to identify incomplete student records
5. **Monitoring:** Add logging to track which fields are being updated during imports
