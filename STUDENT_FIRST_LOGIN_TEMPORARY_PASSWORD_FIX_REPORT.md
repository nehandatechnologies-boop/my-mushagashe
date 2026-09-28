# STUDENT FIRST-LOGIN / TEMPORARY-PASSWORD BUG FIX REPORT

## Executive Summary

**ROOT CAUSE**: The `User.update()` function was destructuring `password` but NOT including it in the `updateData` object. This meant password changes were never persisted to the database, so the new password was never saved and the temporary password remained the only valid credential.

---

## The Bug

### Location

**File**: `backend/models/User.js` (Lines 204-252)

### The Problem

**Before Fix**:
```javascript
static async update(id, userData) {
  const {
    full_name, email, student_number, password, phone, gender,
    national_id, date_of_birth, address, guardian_name, guardian_phone,
    intake, intake_year, course_id, status, must_change_password
  } = userData;

  const updateData = {
    full_name, email, student_number, phone, gender,  // ← password NOT included
    national_id, date_of_birth, address, guardian_name, guardian_phone,
    intake_year, course_id, status, must_change_password
  };

  // Handle password: hash if provided (but don't double-hash)
  if (updateData.password) {  // ← This condition NEVER true because password not in updateData
    const bcrypt = require('bcryptjs');
    if (!updateData.password.startsWith('$2')) {
      updateData.password = bcrypt.hashSync(updateData.password, 10);
    }
  }

  // Update Supabase
  const { data, error } = await supabase
    .from('users')
    .update(updateData)  // ← password NOT in updateData, so not updated
    .eq('id', id)
    .select()
    .single();
}
```

### The Impact

1. **Password Change API returns success** - Because the Supabase update doesn't fail (it just doesn't update the password field)
2. **`must_change_password` is set to 0** - This flag IS updated because it's in `updateData`
3. **Password is NOT updated** - Because `password` is not in `updateData`
4. **Student logout** - Session ends
5. **Student login with new password** - Fails with 401 because the new password was never saved
6. **Student login with old temporary password** - Still works because it was never changed

---

## The Fix

### Changed User.update() to Include Password

**File**: `backend/models/User.js` (Lines 204-256)

**After Fix**:
```javascript
static async update(id, userData) {
  const {
    full_name, email, student_number, password, phone, gender,
    national_id, date_of_birth, address, guardian_name, guardian_phone,
    intake, intake_year, course_id, status, must_change_password
  } = userData;

  const updateData = {
    full_name, email, student_number, password, phone, gender,  // ← password NOW included
    national_id, date_of_birth, address, guardian_name, guardian_phone,
    intake_year, course_id, status, must_change_password
  };

  // Remove undefined values and convert empty strings to null
  Object.keys(updateData).forEach(key => {
    if (updateData[key] === undefined) {
      delete updateData[key];
    } else if (updateData[key] === '') {
      updateData[key] = null;
    }
  });

  console.log('[USER.UPDATE] Update data before Supabase:', JSON.stringify({
    gender: updateData.gender,
    intake: updateData.intake,
    intake_year: updateData.intake_year,
    has_password: !!updateData.password,
    must_change_password: updateData.must_change_password
  }));

  // Handle password: hash if provided (but don't double-hash)
  if (updateData.password) {
    const bcrypt = require('bcryptjs');
    // Only hash if it doesn't look like a bcrypt hash (starts with $2a$ or $2b$)
    // This prevents double-hashing if the password is already hashed
    if (!updateData.password.startsWith('$2')) {
      updateData.password = bcrypt.hashSync(updateData.password, 10);
      console.log('[USER.UPDATE] Password hashed successfully');
    } else {
      console.log('[USER.UPDATE] Password appears to be already hashed, skipping hash operation');
    }
  }

  // Convert must_change_password to boolean for Supabase
  if (updateData.must_change_password !== undefined) {
    updateData.must_change_password = updateData.must_change_password === true || updateData.must_change_password === 1;
  }

  const { data, error } = await supabase
    .from('users')
    .update(updateData)  // ← password NOW in updateData, so it IS updated
    .eq('id', id)
    .select()
    .single();
}
```

---

## Authentication Source Analysis

### Password Field
- **Field**: `users.password`
- **Format**: bcrypt hash (starts with `$2a$` or `$2b$`)
- **Location**: Supabase database

### Password Change Endpoint
- **Route**: `POST /api/auth/change-password`
- **Controller**: `backend/controllers/authController.js` (changePassword function)
- **Model**: `backend/models/User.js` (User.update function)
- **Logic**:
  1. Verify current password with `bcrypt.compareSync(current_password, user.password)`
  2. Call `User.update(userId, { password: new_password, must_change_password: 0 })`
  3. User.update hashes the password (single hash)
  4. User.update updates both `password` and `must_change_password` in Supabase
  5. If `auth_type === 'supabase'`, also update Supabase Auth password

### Student Login Endpoint
- **Route**: `POST /api/auth/student/login`
- **Controller**: `backend/controllers/authController.js` (studentLogin function)
- **Model**: `backend/models/User.js` (User.findByStudentNumber function)
- **Logic**:
  1. Find student by `student_number`
  2. Check role is 'student'
  3. Check status is 'active'
  4. Try Supabase Auth if `auth_type === 'supabase'`
  5. Fall back to custom JWT with `bcrypt.compareSync(password, user.password)`
  6. Generate JWT token
  7. Return token and user data

### Consistency
✅ **NOW CONSISTENT**: Both password change and login use the same field (`users.password`) and same hashing method (bcrypt)

❌ **BEFORE INCONSISTENT**: Password change didn't update `users.password`, so login continued using the old password

---

## must_change_password Behavior

### Before Fix
- Password change sets `must_change_password = 0` ✅
- Password change does NOT update `password` ❌
- Result: Flag cleared but password unchanged

### After Fix
- Password change sets `must_change_password = 0` ✅
- Password change updates `password` ✅
- Result: Both flag and password correctly updated

---

## Temporary Password Flow

### Correct Flow (After Fix)

1. **Admin creates/imports student**
   - Temporary password generated
   - Password hashed and stored in `users.password`
   - `must_change_password = true`

2. **Student logs in with temporary password**
   - Login verifies password against `users.password`
   - ✅ Login succeeds
   - Frontend checks `must_change_password = true`
   - Frontend redirects to password change page

3. **Student changes password**
   - Password change API receives `current_password` and `new_password`
   - Verifies `current_password` against `users.password`
   - ✅ Verification succeeds
   - Calls `User.update(userId, { password: new_password, must_change_password: 0 })`
   - ✅ Password is hashed and updated in `users.password`
   - ✅ `must_change_password` is set to `0`
   - ✅ Returns success

4. **Student logs out**
   - Session ends
   - Token removed from localStorage

5. **Student logs in with new password**
   - Login verifies password against `users.password`
   - ✅ Verification succeeds (new password is now in database)
   - ✅ Login succeeds
   - Frontend checks `must_change_password = false`
   - Frontend shows normal student dashboard

6. **Student tries old temporary password**
   - Login verifies password against `users.password`
   - ❌ Verification fails (old password no longer in database)
   - ❌ Login fails with 401

---

## No Separate Temporary Password Field

✅ **Confirmed**: There is NO separate `temporary_password` field in the database.

The system uses a single `users.password` field for both temporary and permanent passwords. The `must_change_password` flag distinguishes between the two states.

---

## Files Modified (1)

**backend/models/User.js**
- Added `password` to the `updateData` object
- Added diagnostic logging to show when password is present/updated
- Added logging to confirm password hashing

---

## Verification

### Syntax Verification

✅ `node -c models/User.js` passes

---

## Production Test Required

After deployment, test with a real student:

**TEST A**: Temporary password login
```
POST /api/auth/student/login
{
  "student_number": "STU2026001",
  "password": "ejfdty0fd5v7"
}
Expected: HTTP 200 with token, must_change_password: true
```

**TEST B**: Change password
```
POST /api/auth/change-password
{
  "current_password": "ejfdty0fd5v7",
  "new_password": "newpassword123"
}
Expected: HTTP 200
```

**TEST C**: Logout
```
POST /api/auth/logout
Expected: HTTP 200
```

**TEST D**: Login with new password
```
POST /api/auth/student/login
{
  "student_number": "STU2026001",
  "password": "newpassword123"
}
Expected: HTTP 200 with token, must_change_password: false
```

**TEST E**: Login with old temporary password
```
POST /api/auth/student/login
{
  "student_number": "STU2026001",
  "password": "ejfdty0fd5v7"
}
Expected: HTTP 401
```

**TEST F**: Refresh and login again with new password
```
POST /api/auth/student/login
{
  "student_number": "STU2026001",
  "password": "newpassword123"
}
Expected: HTTP 200 with token
```

---

## Summary

**ROOT CAUSE**: `User.update()` destructured `password` but did not include it in `updateData`, so password changes were never persisted to the database

**TEMPORARY PASSWORD FIELD/LOGIC**: Single `users.password` field, no separate temporary password field

**PERMANENT PASSWORD FIELD/LOGIC**: Same `users.password` field, distinguished by `must_change_password` flag

**must_change_password**:
- Before: Set to 0 but password not updated
- After: Set to 0 AND password updated

**PASSWORD CHANGE ENDPOINT**: `POST /api/auth/change-password` → `authController.changePassword()` → `User.update()`

**STUDENT LOGIN**: `POST /api/auth/student/login` → `authController.studentLogin()` → `User.findByStudentNumber()` → `bcrypt.compareSync(password, user.password)`

**FIX**: Added `password` to `updateData` object in `User.update()`

**PRODUCTION TEST**: Pending deployment

**Status**: ✅ Code fixed, syntax verified, requires deployment and production testing

**DO NOT claim the task is complete until production verification is done.**
