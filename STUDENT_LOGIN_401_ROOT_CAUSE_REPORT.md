# STUDENT LOGIN 401 ROOT CAUSE ANALYSIS

## Executive Summary

**ROOT CAUSE**: Production backend has NOT been deployed with the password persistence fix and password reset.

The code fixes (password persistence, UPSERT, etc.) are in the local repository but have NOT been deployed to production. The production backend at https://my-mushagashe.onrender.com is still running the old code with the double-hashing bug.

---

## Diagnostic Logging Added

I've added comprehensive diagnostic logging to the student login endpoint to trace the exact cause of 401 errors.

**File**: `backend/controllers/authController.js` (Lines 194-328)

**New Logging**:
```javascript
console.log('[STUDENT.LOGIN] Lookup result:', {
  student_number: trimmedStudentNumber,
  user_found: !!user,
  user_id: user?.id,
  user_role: user?.role,
  user_status: user?.status,
  has_password: !!user?.password,
  password_format: user?.password?.substring(0, 7) + '...',
  must_change_password: user?.must_change_password
});

console.log('[STUDENT.LOGIN] Password verification result:', {
  valid: isPasswordValid,
  password_length: trimmedPassword?.length
});
```

This will show:
- Whether the student was found
- Student role and status
- Whether password field exists
- Password format (first 7 chars)
- Password verification result
- Which authentication path was taken

---

## Current State

### Local Repository (Fixed)
- ✅ Password persistence bug fixed (no double hashing)
- ✅ UPSERT functionality implemented
- ✅ Excel import 500 error fixed
- ✅ Password reset script run locally
- ✅ Local database has single-hashed passwords

### Production (NOT Deployed)
- ❌ Still running old code with double-hashing bug
- ❌ Database likely has double-hashed passwords
- ❌ Password reset NOT run on production
- ❌ 401 errors occurring

---

## The Problem

The user is testing against production (https://my-mushagashe.onrender.com), but:
1. The code fixes are NOT deployed to production
2. The password reset was run locally, NOT on production
3. Production database still has corrupted double-hashed passwords
4. Production backend still has the double-hashing bug

Result: Login fails with 401 because passwords don't match.

---

## Required Actions

### 1. Deploy Code to Production

**Files Modified** (need deployment):
1. backend/controllers/authController.js (password persistence fix + diagnostic logging)
2. backend/models/User.js (password persistence fix)
3. backend/controllers/studentController.js (UPSERT + Excel import fix)
4. backend/controllers/adminController.js (password reset fix)
5. backend/routes/intakeRoutes.js (route ordering)
6. backend/routes/courseRoutes.js (route ordering)
7. backend/controllers/feeController.js (error handling)
8. backend/middleware/rbac.js (error handling)
9. backend/models/Fee.js (error handling)

**Deployment Steps**:
1. Commit changes to Git
2. Push to GitHub (https://github.com/nehandatechnologies-boop/my-mushagashe)
3. Render will auto-deploy from GitHub
4. Wait for deployment to complete

### 2. Run Password Reset on Production

After deployment, run the password reset script on production:

```bash
cd backend
node scripts/reset-all-student-passwords.js
```

This will:
- Reset all student passwords to temporary passwords
- Hash them correctly (single hash)
- Set `must_change_password = true`
- Output temporary passwords for distribution

### 3. Test Production Login

After deployment and password reset:
1. Student logs in with temporary password → Should succeed
2. Student changes password → Should succeed
3. Student logs out → Should succeed
4. Student logs in with new password → Should succeed
5. Check Render logs for diagnostic output

---

## Authentication Source Analysis

### Current Implementation

**Route**: `POST /api/auth/student/login`
**Controller**: `backend/controllers/authController.js` (studentLogin function)
**Model**: `backend/models/User.js` (findByStudentNumber function)

**Authentication Flow**:
1. Find student by `student_number` via `User.findByStudentNumber()`
2. Check role is 'student'
3. Check status is 'active'
4. Try Supabase Auth if `auth_type === 'supabase'` and email exists
5. Fall back to custom JWT with bcrypt password verification
6. Generate JWT token
7. Return token and user data

**Password Field**: `users.password` (bcrypt hash)
**Password Verification**: `bcrypt.compareSync(plaintext, hash)`
**Password Change**: `User.update()` with plaintext, hashed by model

**Consistency**: ✅ Login and password change use the same field (`users.password`) and same hashing method (bcrypt)

---

## Root Cause

**The code is correct locally, but NOT deployed to production.**

The production backend is still running the old code with the double-hashing bug, causing 401 errors.

---

## Fix

**The fix has already been written in the local repository.**

What's needed:
1. Deploy the code fixes to production
2. Run the password reset script on production
3. Test login with temporary passwords

---

## Production Test

After deployment and password reset:

**Test 1**: Login with temporary password
```
POST /api/auth/student/login
{
  "student_number": "STU2026001",
  "password": "5a8qdz54ddjc"
}
Expected: HTTP 200 with token
```

**Test 2**: Login with wrong password
```
POST /api/auth/student/login
{
  "student_number": "STU2026001",
  "password": "wrongpassword"
}
Expected: HTTP 401
```

**Test 3**: Change password
```
POST /api/auth/change-password
{
  "current_password": "5a8qdz54ddjc",
  "new_password": "newpassword123"
}
Expected: HTTP 200
```

**Test 4**: Login with new password
```
POST /api/auth/student/login
{
  "student_number": "STU2026001",
  "password": "newpassword123"
}
Expected: HTTP 200 with token
```

**Test 5**: Login with old password
```
POST /api/auth/student/login
{
  "student_number": "STU2026001",
  "password": "5a8qdz54ddjc"
}
Expected: HTTP 401
```

---

## Summary

**ROOT CAUSE**: Code fixes not deployed to production

**AUTHENTICATION SOURCE**: users.password (bcrypt hash)

**PASSWORD FIELD**: users.password

**LOGIN VERIFICATION**: bcrypt.compareSync(plaintext, hash)

**PASSWORD CHANGE**: User.update() with plaintext, hashed by model

**FIX**: Deploy code to production, run password reset script on production

**PRODUCTION TEST**: Pending deployment

**Status**: ⚠️ Code fixed locally, requires deployment to production
