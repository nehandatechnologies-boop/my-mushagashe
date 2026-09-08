# Supabase Auth Failure Diagnostic Report

**Date:** September 6, 2026  
**Project:** Mushagashe Vocational Training Centre Portal  
**Issue:** `AuthRetryableFetchError` during student registration in production

---

## ROOT CAUSE

The `AuthRetryableFetchError` was caused by **missing Supabase environment variables in Render**, which caused the application to fall back to a **hardcoded, expired Supabase anon key** in `backend/config/supabaseAuth.js`.

### Specific Issue

**File:** `backend/config/supabaseAuth.js` (line 4)

**Original Code:**
```javascript
const supabaseAnonKey = process.env.SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...';
```

**Problem:**
- The code had a fallback to a hardcoded Supabase anon key
- When `SUPABASE_ANON_KEY` environment variable was not set in Render, it used the hardcoded key
- The hardcoded key was expired/invalid, causing Supabase Auth to reject the request
- This resulted in `AuthRetryableFetchError` with status 500

**Why This Happened:**
- The `.env` file was updated to remove real keys (security improvement)
- However, the corresponding Render environment variables were not set
- The fallback mechanism in `supabaseAuth.js` used an old hardcoded key
- Supabase Auth rejected requests with the invalid key

---

## FILES CHANGED

### 1. backend/config/supabaseAuth.js

**Changes:**
- Removed hardcoded Supabase URL fallback
- Removed hardcoded Supabase anon key fallback
- Added validation to throw error if required environment variables are missing
- Added diagnostic logging to confirm client initialization
- Made environment variables mandatory (no fallbacks)

**Before:**
```javascript
const supabaseUrl = process.env.SUPABASE_URL || 'https://krenyvbcwtbwcsrpiryf.supabase.co';
const supabaseAnonKey = process.env.SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...';
```

**After:**
```javascript
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseAnonKey = process.env.SUPABASE_ANON_KEY;

// Validate required environment variables
if (!supabaseUrl) {
  throw new Error('SUPABASE_URL environment variable is required');
}

if (!supabaseAnonKey) {
  throw new Error('SUPABASE_ANON_KEY environment variable is required');
}
```

### 2. backend/controllers/studentControllerSupabase.js

**Changes:**
- Added diagnostic logging before Supabase Auth signUp call
- Added detailed error logging including error type, message, and status
- Added specific handling for `AuthRetryableFetchError`
- Improved error messages for frontend

**Added Logging:**
```javascript
console.log('[Student Registration] Email provided:', !!email);
console.log('[Student Registration] Email redirect to:', process.env.FRONTEND_URL || 'https://my-mushagashe.onrender.com');

if (authError) {
  console.error('[Student Registration] Supabase auth error type:', authError.name);
  console.error('[Student Registration] Supabase auth error message:', authError.message);
  console.error('[Student Registration] Supabase auth error status:', authError.status);
  if (authError.name === 'AuthRetryableFetchError') {
    console.error('[Student Registration] AuthRetryableFetchError - likely network or credential issue');
  }
}
```

---

## RENDER ENVIRONMENT VARIABLES (REQUIRED)

The following environment variables MUST be set in Render dashboard:

### Required Variables

```
SUPABASE_URL=https://krenyvbcwtbwcsrpiryf.supabase.co
SUPABASE_ANON_KEY=[Your actual Supabase anon key]
SUPABASE_SERVICE_ROLE_KEY=[Your actual Supabase service role key]
JWT_SECRET=[Your secure JWT secret]
FRONTEND_URL=https://my-mushagashe.onrender.com
PORT=5000
NODE_ENV=production
```

### How to Add in Render

1. Go to your Render dashboard
2. Select your Mushagashe portal service
3. Navigate to "Environment" tab
4. Click "Add Environment Variable"
5. Add each variable above with its actual value
6. Click "Save Changes"
7. Redeploy the service

### Where to Get Values

**SUPABASE_URL:**
- From your Supabase project dashboard
- Settings → API → Project URL

**SUPABASE_ANON_KEY:**
- From your Supabase project dashboard
- Settings → API → anon public key

**SUPABASE_SERVICE_ROLE_KEY:**
- From your Supabase project dashboard
- Settings → API → service_role secret key
- **IMPORTANT:** Keep this secret, never expose in frontend

**JWT_SECRET:**
- Generate a secure random string
- Use: `openssl rand -base64 32` or similar
- **IMPORTANT:** Keep this secret, never expose

---

## SUPABASE SMTP/BREVO INVOLVEMENT

### Status: NOT INVOLVED

The Brevo SMTP configuration was **not** the cause of the `AuthRetryableFetchError`.

**Evidence:**
- The error occurred at the Supabase Auth `signUp()` call
- The error was `AuthRetryableFetchError` (network/credential issue)
- The error happened BEFORE any email was sent
- Brevo SMTP is only used for email delivery AFTER Supabase Auth succeeds

### Brevo SMTP Configuration

**Still Required:**
Even though Brevo was not the cause of this error, the Brevo SMTP configuration in Supabase is still required for email delivery to work once registration succeeds.

**Configuration Steps:**
1. Go to Supabase Dashboard → Authentication → Providers → Email
2. Select "Custom SMTP"
3. Enter Brevo credentials:
   - SMTP Host: `smtp-relay.brevo.com`
   - SMTP Port: `587`
   - SMTP User: [Your Brevo SMTP username]
   - SMTP Password: [Your Brevo SMTP password]
   - Sender Email: [Your verified Brevo sender]

---

## SUPABASE AUTH LOGS

### Expected Logs After Fix

Once the environment variables are set correctly, you should see:

**Successful Registration:**
```
[Supabase] Client initialized with URL: https://krenyvbcwtbwcsrpiryf.supabase.co
[Supabase] Anon key present: true
[Student Registration] Request received
[Student Registration] Email provided: true
[Student Registration] Email redirect to: https://my-mushagashe.onrender.com
[Student Registration] Creating Supabase Auth user with email confirmation
[Student Registration] Supabase Auth user created successfully, ID: [user-id]
[Student Registration] Email confirmation status: requires confirmation
```

**Failed Registration (Missing Environment Variables):**
```
Error: SUPABASE_ANON_KEY environment variable is required
```

---

## WHAT WAS CHANGED

### Summary

1. **Removed hardcoded Supabase credentials** from `supabaseAuth.js`
2. **Made environment variables mandatory** (no fallbacks)
3. **Added validation** to fail fast if environment variables are missing
4. **Added diagnostic logging** to track Supabase client initialization
5. **Enhanced error logging** in student registration to identify Auth errors
6. **Improved error messages** for better debugging

### Why These Changes

- **Security:** Removed hardcoded credentials that were exposed in source code
- **Reliability:** Made environment variables mandatory to prevent silent failures
- **Debugging:** Added logging to quickly identify configuration issues
- **Error Handling:** Better error messages help diagnose issues faster

---

## PRODUCTION TEST RESULTS

### Status: PENDING - Awaiting Environment Variable Configuration

**Cannot test until:**
1. Render environment variables are set with actual Supabase credentials
2. Service is redeployed with new environment variables
3. Brevo SMTP is configured in Supabase (for email delivery)

### Test Plan (After Configuration)

**Test 1: Student Registration with Email**
- Register new student with valid email
- Verify Supabase Auth user is created
- Verify confirmation email is sent via Brevo
- Verify email contains correct production URL
- Click confirmation link
- Verify email is confirmed in Supabase
- Try logging in

**Test 2: Student Registration without Email**
- Register student without email (uses `@mushagashe.local`)
- Verify account is created without email confirmation
- Verify login works with student number

**Test 3: Duplicate Student Number**
- Try registering with existing student number
- Verify appropriate error message

**Test 4: Duplicate Email**
- Try registering with existing email
- Verify appropriate error message

**Test 5: Password Reset**
- Request password reset with student number
- Verify reset email is sent via Brevo
- Click reset link
- Reset password
- Verify login with new password

**Test 6: Intake Preservation**
- Register student with intake "May 2026"
- Verify intake is stored correctly in database
- Verify intake is displayed in profile

---

## ARCHITECTURE PRESERVED

### What Was NOT Changed

- **Database schema:** No changes to users table
- **Student CRUD:** No changes to student operations
- **Student API:** No changes to student endpoints
- **Intake implementation:** No changes to intake system
- **Authentication roles:** No changes to role system
- **JWT behavior:** No changes to JWT handling
- **Hybrid architecture:** No changes to hybrid auth system
- **Existing users:** No impact on existing user data

### What Was Fixed

- **Environment variable handling:** Made mandatory instead of optional
- **Credential security:** Removed hardcoded credentials
- **Error diagnostics:** Added detailed logging
- **Error messages:** Improved for better debugging

---

## NEXT STEPS

### Immediate Actions Required

1. **Add Environment Variables to Render**
   - Log in to Render dashboard
   - Navigate to your Mushagashe portal service
   - Add all required environment variables
   - Save and redeploy

2. **Configure Brevo SMTP in Supabase**
   - Go to Supabase Dashboard → Authentication → Providers → Email
   - Configure custom SMTP with Brevo credentials
   - Verify sender email is verified in Brevo

3. **Configure Supabase Redirect URLs**
   - Site URL: `https://my-mushagashe.onrender.com`
   - Add redirect URLs for production
   - Set email confirmation URL
   - Set password reset URL

4. **Test Registration in Production**
   - Register a new student with email
   - Verify confirmation email arrives
   - Complete email verification
   - Test login

### Verification Checklist

After configuration, verify:

- [ ] Render environment variables are set
- [ ] Service redeployed successfully
- [ ] Supabase client initializes without errors
- [ ] Student registration creates Supabase Auth user
- [ ] Confirmation email is sent via Brevo
- [ ] Confirmation link redirects to production URL
- [ ] Email verification completes successfully
- [ ] Student can log in after verification
- [ ] Intake is preserved correctly
- [ ] Password reset works via Brevo

---

## SECURITY NOTES

### Credentials Management

**DO NOT:**
- Commit real Supabase keys to Git
- Hardcode credentials in source code
- Use fallback credentials in production
- Expose service-role keys in frontend

**DO:**
- Use Render environment variables for all secrets
- Rotate any exposed keys immediately
- Use different keys for development and production
- Monitor Supabase dashboard for suspicious activity

### Current Status

- ✅ Hardcoded credentials removed from source code
- ✅ Environment variables made mandatory
- ⚠️ Render environment variables need to be set
- ⚠️ Brevo SMTP needs to be configured in Supabase

---

## SUPPORT

### If Issues Persist

**Check Render Logs:**
- Look for "SUPABASE_URL environment variable is required"
- Look for "SUPABASE_ANON_KEY environment variable is required"
- Verify environment variables are actually set in Render

**Check Supabase Dashboard:**
- Verify project is active
- Verify email provider is enabled
- Check Auth logs for signup attempts
- Verify custom SMTP configuration

**Check Brevo Dashboard:**
- Verify sender domain is verified
- Verify SMTP credentials are valid
- Check email delivery logs

---

## SUMMARY

**Root Cause:** Missing Render environment variables caused fallback to expired hardcoded Supabase anon key.

**Fix:** Removed hardcoded credentials, made environment variables mandatory, added validation and logging.

**Required Action:** Add actual Supabase credentials to Render environment variables and redeploy.

**Status:** Code fixed, awaiting environment variable configuration in Render.

**Cannot claim success until:** Render environment variables are set and production registration is tested successfully.
