# PASSWORD PERSISTENCE BUG FIX REPORT

## Executive Summary

**CRITICAL BUG FIXED**: Password was being hashed TWICE during password change, making the new password unusable for login after logout/refresh.

---

## Root Cause Identified

### Double Hashing Bug

**Location 1**: `backend/controllers/authController.js` (Lines 421-427)
```javascript
// Hash new password
const hashedPassword = bcrypt.hashSync(new_password, 10);  // ← FIRST HASH

// Update password
await User.update(userId, { password: hashedPassword, must_change_password: 0 });
```

**Location 2**: `backend/models/User.js` (Lines 237-241)
```javascript
// Handle password: hash if provided
if (updateData.password) {
  const bcrypt = require('bcryptjs');
  updateData.password = bcrypt.hashSync(updateData.password, 10);  // ← SECOND HASH
}
```

### The Problem

1. User changes password from "oldpass" to "newpass"
2. `authController.changePassword()` hashes "newpass" → `hash1`
3. `User.update()` receives `{ password: hash1 }`
4. `User.update()` hashes `hash1` → `hash2`
5. Database stores `hash2` (which is `hash(hash1)`)
6. User tries to login with "newpass"
7. Login checks: `bcrypt.compareSync("newpass", hash2)`
8. This fails because `hash2` is `hash(hash("newpass"))`, not `hash("newpass")`

### Why It Appeared to Work Temporarily

The password change returns success, and the user is still logged in with their OLD token/session. So they can continue using the system until they logout or the session expires.

Once they logout or refresh:
- They must login again
- Login attempts to verify the password
- Verification fails because the stored password is double-hashed
- User cannot login with the new password

---

## Fixes Applied

### Fix 1: Remove Double Hashing in authController.js

**File**: `backend/controllers/authController.js` (Lines 412-436)

**Before**:
```javascript
// Hash new password
const hashedPassword = bcrypt.hashSync(new_password, 10);

// Update password and clear must_change_password flag
await User.update(userId, { password: hashedPassword, must_change_password: 0 });
```

**After**:
```javascript
// Update password and clear must_change_password flag
// NOTE: User.update() will hash the password, so we pass plaintext
await User.update(userId, { password: new_password, must_change_password: 0 });

// If user uses Supabase Auth, also update Supabase password
if (user.auth_type === 'supabase' && user.email && supabaseConfigured) {
  try {
    await supabase.auth.admin.updateUserById(user.supabase_auth_id, {
      password: new_password
    });
  } catch (supabaseError) {
    console.error('Failed to update Supabase Auth password:', supabaseError);
    // Don't fail the entire operation if Supabase update fails
  }
}
```

### Fix 2: Add Defensive Check in User.js

**File**: `backend/models/User.js` (Lines 237-247)

**Before**:
```javascript
// Handle password: hash if provided
if (updateData.password) {
  const bcrypt = require('bcryptjs');
  updateData.password = bcrypt.hashSync(updateData.password, 10);
}
```

**After**:
```javascript
// Handle password: hash if provided (but don't double-hash)
if (updateData.password) {
  const bcrypt = require('bcryptjs');
  // Only hash if it doesn't look like a bcrypt hash (starts with $2a$ or $2b$)
  // This prevents double-hashing if the password is already hashed
  if (!updateData.password.startsWith('$2')) {
    updateData.password = bcrypt.hashSync(updateData.password, 10);
  } else {
    console.log('[USER.UPDATE] Password appears to be already hashed, skipping hash operation');
  }
}
```

### Fix 3: Update Student Password Reset

**File**: `backend/controllers/studentController.js` (Lines 368-398)

**Before**:
```javascript
const hashedPassword = bcrypt.hashSync(passwordToSet, 10);
await User.updatePassword(id, hashedPassword);
```

**After**:
```javascript
// Update password using User.update which will hash it
// This ensures consistency with the password change flow
await User.update(id, { password: passwordToSet, must_change_password: 1 });
```

### Fix 4: Update Lecturer Password Reset

**File**: `backend/controllers/studentController.js` (Lines 413-425)

**Before**:
```javascript
const hashedPassword = bcrypt.hashSync(passwordToSet, 10);
await User.updatePassword(id, hashedPassword);
```

**After**:
```javascript
// Update password using User.update which will hash it
// This ensures consistency with the password change flow
await User.update(id, { password: passwordToSet, must_change_password: 1 });
```

### Fix 5: Update Admin Password Reset

**File**: `backend/controllers/adminController.js` (Lines 379-399)

**Before**:
```javascript
let hashedPassword;
let temporaryPassword;

if (new_password !== null && new_password !== undefined) {
  if (new_password.length < 6) {
    return res.status(400).json({ error: 'New password must be at least 6 characters' });
  }
  hashedPassword = bcrypt.hashSync(new_password, 10);
  temporaryPassword = new_password;
} else {
  const crypto = require('crypto');
  temporaryPassword = crypto.randomBytes(16).toString('base64').substring(0, 12);
  hashedPassword = bcrypt.hashSync(temporaryPassword, 10);
}

await User.update(id, {
  password: hashedPassword,
  must_change_password: true
});
```

**After**:
```javascript
let temporaryPassword;

if (new_password !== null && new_password !== undefined) {
  if (new_password.length < 6) {
    return res.status(400).json({ error: 'New password must be at least 6 characters' });
  }
  temporaryPassword = new_password;
} else {
  const crypto = require('crypto');
  temporaryPassword = crypto.randomBytes(16).toString('base64').substring(0, 12);
}

// Update password using User.update which will hash it
// This ensures consistency with the password change flow
await User.update(id, {
  password: temporaryPassword,
  must_change_password: true
});
```

---

## Additional Fix: Supabase Auth Password Update

For users with `auth_type === 'supabase'`, the password change now also updates the Supabase Auth password to ensure consistency between authentication sources.

**File**: `backend/controllers/authController.js` (Lines 427-437)

```javascript
// If user uses Supabase Auth, also update Supabase password
if (user.auth_type === 'supabase' && user.email && supabaseConfigured) {
  try {
    console.log('[CHANGE-PASSWORD] Updating Supabase Auth password...');
    await supabase.auth.admin.updateUserById(user.supabase_auth_id, {
      password: new_password
    });
    console.log('[CHANGE-PASSWORD] Supabase Auth password updated successfully');
  } catch (supabaseError) {
    console.error('[CHANGE-PASSWORD] Failed to update Supabase Auth password:', supabaseError);
    // Don't fail the entire operation if Supabase update fails
    // This allows the local password to still work as a fallback
  }
}
```

---

## Files Modified (5)

1. **backend/controllers/authController.js**
   - Removed double hashing in `changePassword()`
   - Added Supabase Auth password update for users with `auth_type === 'supabase'`

2. **backend/models/User.js**
   - Added defensive check to prevent double hashing
   - Only hashes if password doesn't start with `$2` (bcrypt hash prefix)

3. **backend/controllers/studentController.js**
   - Updated `resetPassword()` to use `User.update()` instead of `User.updatePassword()`
   - Updated `resetLecturerPassword()` to use `User.update()` instead of `User.updatePassword()`

4. **backend/controllers/adminController.js**
   - Updated `resetAdminPassword()` to use `User.update()` instead of manual hashing

---

## Verification

### Syntax Verification

All modified files pass `node -c`:
- ✅ authController.js
- ✅ User.js
- ✅ studentController.js
- ✅ adminController.js

---

## Testing Plan

### Test 1: Password Change Persistence

1. Login with current password
2. Change password to new password
3. Verify API returns success
4. Logout
5. Login with new password → Should succeed
6. Try login with old password → Should fail
7. Refresh browser
8. Login with new password → Should succeed

### Test 2: Temporary Password Flow

1. Admin creates student with temporary password
2. Student logs in with temporary password
3. Student changes password
4. Logout
5. Login with new password → Should succeed
6. Login with temporary password → Should fail

### Test 3: Supabase Auth Password Update

1. Create test lecturer with `auth_type === 'supabase'`
2. Login with Supabase Auth
3. Change password
4. Logout
5. Login with new password via Supabase Auth → Should succeed
6. Verify Supabase Auth password was updated

### Test 4: Admin Password Reset

1. Admin resets another admin's password
2. The admin logs in with new temporary password
3. The admin changes password
4. Logout
5. Login with new password → Should succeed

---

## Production Verification Checklist

After deployment:

- [ ] Password change API returns success
- [ ] New password works immediately after change
- [ ] New password works after logout
- [ ] New password works after browser refresh
- [ ] New password works after returning to login page
- [ ] Old password no longer works
- [ ] Password is stored as single bcrypt hash (not double hash)
- [ ] Login and password change use same authentication source
- [ ] Student password change works
- [ ] Lecturer password change works
- [ ] Admin password change works
- [ ] Student password reset works
- [ ] Lecturer password reset works
- [ ] Admin password reset works
- [ ] Temporary password flow works correctly
- [ ] Supabase Auth users can change password
- [ ] Authentication session survives normal browser refresh
- [ ] Genuine logout still invalidates/ends the session

---

## Summary

**Root Cause**: Password was being hashed twice during password change (once in authController, once in User.update)

**Fix**: Removed hashing from authController, let User.update handle hashing consistently, added defensive check to prevent double hashing

**Additional Fix**: Added Supabase Auth password update for users with `auth_type === 'supabase'`

**Impact**: All password change and reset flows now use consistent hashing through User.update()

**Status**: ✅ Code fixed, syntax verified, requires deployment and testing
