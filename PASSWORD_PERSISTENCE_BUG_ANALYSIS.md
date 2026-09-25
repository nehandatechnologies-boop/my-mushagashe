# PASSWORD PERSISTENCE BUG ROOT CAUSE ANALYSIS

## Executive Summary

**CRITICAL BUG FOUND**: Password is being hashed TWICE during password change, making the new password unusable for login.

---

## Root Cause: Double Hashing

### Bug Location 1: authController.js (Lines 421-427)

```javascript
// Change password
const changePassword = async (req, res) => {
  // ...
  // Hash new password
  console.log('[CHANGE-PASSWORD] Hashing new password...');
  const hashedPassword = bcrypt.hashSync(new_password, 10);  // ← FIRST HASH

  // Update password and clear must_change_password flag
  console.log('[CHANGE-PASSWORD] Updating password in database...');
  await User.update(userId, { password: hashedPassword, must_change_password: 0 });  // ← PASS HASHED PASSWORD
  // ...
}
```

### Bug Location 2: User.js (Lines 237-241)

```javascript
static async update(id, userData) {
  // ...
  // Handle password: hash if provided
  if (updateData.password) {
    const bcrypt = require('bcryptjs');
    updateData.password = bcrypt.hashSync(updateData.password, 10);  // ← SECOND HASH
  }
  // ...
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

---

## Why It Appears to Work Temporarily

The password change returns success, and the user is still logged in with their OLD token/session. So they can continue using the system until they logout or the session expires.

Once they logout or refresh:
- They must login again
- Login attempts to verify the password
- Verification fails because the stored password is double-hashed
- User cannot login with the new password

---

## Authentication Sources Analysis

### Admin Login (authController.js Lines 59-65)

```javascript
// Verify password
const isPasswordValid = bcrypt.compareSync(password, user.password);
```

- **Source**: `users.password` (bcrypt hash)
- **Method**: bcrypt.compareSync
- **Hashing**: bcrypt with salt rounds 10

### Lecturer Login (authController.js Lines 143-175)

```javascript
// Try Supabase Auth first if auth_type is 'supabase'
if (user.auth_type === 'supabase' && supabaseConfigured) {
  const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
    email: trimmedEmail,
    password: trimmedPassword
  });
  // ...
}

// Fall back to custom JWT
const isPasswordValid = bcrypt.compareSync(trimmedPassword, user.password);
```

- **Source**: Supabase Auth (if `auth_type === 'supabase'`) OR `users.password` (bcrypt hash)
- **Method**: Supabase Auth OR bcrypt.compareSync
- **Hashing**: Supabase handles hashing OR bcrypt with salt rounds 10

### Student Login (authController.js Lines 242-274)

```javascript
// Try Supabase Auth first if user has email and auth_type is 'supabase'
if (user.email && user.auth_type === 'supabase' && supabaseConfigured) {
  const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
    email: user.email,
    password: trimmedPassword
  });
  // ...
}

// Fall back to custom JWT
const isPasswordValid = bcrypt.compareSync(trimmedPassword, user.password);
```

- **Source**: Supabase Auth (if `auth_type === 'supabase'`) OR `users.password` (bcrypt hash)
- **Method**: Supabase Auth OR bcrypt.compareSync
- **Hashing**: Supabase handles hashing OR bcrypt with salt rounds 10

### Password Change (authController.js Lines 421-427)

```javascript
// Hash new password
const hashedPassword = bcrypt.hashSync(new_password, 10);

// Update password and clear must_change_password flag
await User.update(userId, { password: hashedPassword, must_change_password: 0 });
```

- **Source**: `users.password` (bcrypt hash)
- **Method**: bcrypt.hashSync (TWICE - BUG)
- **Hashing**: bcrypt with salt rounds 10 (then hashed again)

---

## Additional Bug: Password Change Doesn't Update Supabase Auth

For users with `auth_type === 'supabase'`:
- Login uses Supabase Auth
- Password change only updates `users.password` (local database)
- Supabase Auth password is NOT updated
- This creates a mismatch between authentication sources

---

## Required Fixes

### Fix 1: Remove Double Hashing

**Option A**: Don't hash in authController, let User.update handle it
```javascript
// authController.js
// Remove this line:
// const hashedPassword = bcrypt.hashSync(new_password, 10);

// Pass plaintext password:
await User.update(userId, { password: new_password, must_change_password: 0 });
```

**Option B**: Don't hash in User.update if already hashed
```javascript
// User.js
// Check if password is already a bcrypt hash
if (updateData.password) {
  const bcrypt = require('bcryptjs');
  // Only hash if it doesn't look like a bcrypt hash (starts with $2a$ or $2b$)
  if (!updateData.password.startsWith('$2')) {
    updateData.password = bcrypt.hashSync(updateData.password, 10);
  }
}
```

**Recommendation**: Option A is cleaner and less error-prone.

### Fix 2: Update Supabase Auth Password

For users with `auth_type === 'supabase'`, also update the Supabase Auth password:

```javascript
// authController.js
const changePassword = async (req, res) => {
  // ...

  // Hash new password for local database
  const hashedPassword = bcrypt.hashSync(new_password, 10);

  // Update local database
  await User.update(userId, { password: hashedPassword, must_change_password: 0 });

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

  res.json({ message: 'Password changed successfully' });
};
```

---

## Testing Plan

### Test 1: Double Hashing Fix

1. Create test student with temporary password
2. Login with temporary password
3. Change password to new password
4. Logout
5. Login with new password → Should succeed
6. Try login with old password → Should fail
7. Refresh browser
8. Login with new password → Should succeed

### Test 2: Supabase Auth Password Update

1. Create test lecturer with `auth_type === 'supabase'`
2. Login with Supabase Auth
3. Change password
4. Logout
5. Login with new password via Supabase Auth → Should succeed
6. Verify Supabase Auth password was updated

### Test 3: Temporary Password Flow

1. Admin creates student with temporary password
2. Student logs in with temporary password
3. Student changes password
4. Logout
5. Login with new password → Should succeed
6. Login with temporary password → Should fail

---

## Files to Fix

1. **backend/controllers/authController.js**
   - Remove double hashing in `changePassword()`
   - Add Supabase Auth password update for users with `auth_type === 'supabase'`

2. **backend/models/User.js**
   - Optionally add check to prevent double hashing (defensive)

---

## Verification Checklist

After deployment:

- [ ] Password change API returns success
- [ ] New password works immediately after change
- [ ] New password works after logout
- [ ] New password works after browser refresh
- [ ] Old password no longer works
- [ ] Temporary password flow works correctly
- [ ] Supabase Auth users can change password
- [ ] Local auth users can change password
- [ ] Password is stored as single bcrypt hash (not double hash)
- [ ] Login and password change use same authentication source
