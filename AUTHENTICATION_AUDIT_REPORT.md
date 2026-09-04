# Authentication System Audit Report

## Executive Summary

**CRITICAL FINDING**: Email verification is NOT working because email service credentials are not configured.

The application uses a **custom JWT-based authentication system** with Supabase as the database only. Email verification requires SMTP credentials to be configured as environment variables. Without these credentials, no verification emails are actually sent.

---

## Authentication System Detected

### System Type: Custom JWT Authentication

The project does **NOT** use Supabase Auth. It uses:

- **Custom JWT tokens** generated in `backend/middleware/auth.js`
- **Custom `users` table** in Supabase (database only, not Supabase Auth)
- **bcrypt** for password hashing
- **nodemailer** for email sending
- **Custom email verification flow** using database columns

### Architecture

```
Frontend Registration
        ↓
Custom API: POST /api/students/register
        ↓
backend/controllers/studentController.js
        ↓
User.create() → Supabase users table
        ↓
Generate verification token
        ↓
backend/config/email.js → nodemailer
        ↓
SMTP Email Provider (Gmail, etc.)
        ↓
User receives email
```

---

## Current Email Verification Implementation

### Database Schema

The custom `users` table includes:
- `email_verified` (boolean)
- `verification_token` (string)
- `verification_token_expires` (timestamp)
- `reset_password_token` (string)
- `reset_password_expires` (timestamp)

### Login Verification Check

**Student Login** (`backend/controllers/authController.js` lines 135-142):
```javascript
if (user.email && !user.email_verified) {
  return res.status(403).json({ 
    error: 'Your email address has not been verified yet...',
    requires_verification: true,
    email: user.email
  });
}
```

**Lecturer Login** (`backend/controllers/authController.js` lines 83-90):
```javascript
if (user.email && !user.email_verified) {
  return res.status(403).json({ 
    error: 'Your email address has not been verified yet...',
    requires_verification: true,
    email: user.email
  });
}
```

### Registration Email Sending

**Student Registration** (`backend/controllers/studentController.js` lines 46-94):
- Generates verification token
- Sets `email_verified: false`
- Calls `sendVerificationEmail()`
- Returns success message

**Lecturer Creation** (`backend/controllers/studentController.js` lines 478-521):
- Generates verification token
- Sets `email_verified: false`
- Calls `sendVerificationEmail()`
- Returns success message

---

## ROOT CAUSE: Why Email Verification Does Not Work

### Problem: Email Service Not Configured

The email service in `backend/config/email.js` requires:

```javascript
EMAIL_USER = process.env.EMAIL_USER
EMAIL_PASS = process.env.EMAIL_PASS
```

### Current Behavior

When these are not set:

```javascript
const createTransporter = () => {
  if (!EMAIL_USER || !EMAIL_PASS) {
    console.warn('Email credentials not configured. Email functionality will be disabled.');
    return null;  // ← Returns null
  }
  // ... create transporter
}
```

When `sendVerificationEmail()` is called:

```javascript
const sendVerificationEmail = async (email, token) => {
  const transporter = createTransporter();
  if (!transporter) {
    console.log('Email service not configured. Verification link:', `${effectiveFrontendUrl}/verify-email?token=${token}`);
    return false;  // ← Returns false, no email sent
  }
  // ... send email
}
```

### Result

- Registration succeeds
- Verification token generated
- User record created with `email_verified: false`
- **Email is NOT sent** (returns false)
- Verification link only logged to console
- User cannot log in (blocked by verification check)

---

## Environment Configuration Status

### Missing Configuration

**No `.env` file exists** in the project root.

### Required Environment Variables

For email verification to work, the following MUST be set:

```bash
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_USER=your-email@example.com
EMAIL_PASS=your-email-app-password
EMAIL_FROM=Mushagashe VTC <your-email@example.com>
```

### Current Defaults

Without configuration:
- `EMAIL_USER` = undefined
- `EMAIL_PASS` = undefined
- Email service disabled
- Verification links logged to console only

---

## Production URL Configuration

### Fixed in Recent Changes

Updated `backend/config/email.js` to automatically use production URL:

```javascript
const isProduction = process.env.NODE_ENV === 'production' || process.env.RENDER === 'true';
const PRODUCTION_URL = 'https://my-mushagashe.onrender.com';
const effectiveFrontendUrl = isProduction ? PRODUCTION_URL : FRONTEND_URL;
```

This ensures verification links use the correct production URL when deployed to Render.

---

## Options to Fix Email Verification

### Option 1: Configure SMTP Email Service (Recommended)

**Pros:**
- Minimal code changes
- Uses existing custom authentication
- Full control over email content
- Works with any SMTP provider

**Cons:**
- Requires SMTP credentials
- Need to manage email provider account

**Steps:**
1. Create `.env` file in project root
2. Add SMTP credentials (Gmail App Password recommended)
3. Set environment variables in Render dashboard
4. Test email sending

**Example for Gmail:**
```bash
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_USER=mushagashe.vtc@gmail.com
EMAIL_PASS=abcd-efgh-ijkl-mnop  # App Password from Google Account
EMAIL_FROM=Mushagashe VTC <mushagashe.vtc@gmail.com>
```

### Option 2: Use Supabase Auth (Major Rewrite)

**Pros:**
- Built-in email verification
- No SMTP credentials needed
- Supabase handles email delivery
- More secure (managed auth)

**Cons:**
- Requires complete authentication rewrite
- Migrate existing users to Supabase Auth
- Change all login/registration flows
- Update JWT generation
- Potential data loss during migration
- Significant development time

**Impact:**
- Replace custom JWT with Supabase Auth
- Remove custom `users` table authentication
- Use Supabase `auth.users` table
- Update all controllers to use Supabase Auth client
- Migrate existing user data
- Test entire authentication flow

**Estimated Effort:** 2-3 days of development

### Option 3: Use Email Service API (SendGrid, Mailgun, etc.)

**Pros:**
- Reliable email delivery
- Better deliverability
- Analytics and tracking
- No SMTP credentials exposed

**Cons:**
- Requires API key
- May have costs
- Need to integrate new service

**Steps:**
1. Sign up for email service (SendGrid, Mailgun, etc.)
2. Get API key
3. Replace nodemailer with service SDK
4. Update email sending logic

---

## Current Password Reset Implementation

### Student Password Reset

**Route:** `POST /api/auth/student/reset-password`

**Flow:**
1. User provides student number
2. System generates temporary password
3. Updates password in database
4. Returns temporary password in response

**Issue:** Temporary password returned in response (not secure for production)

### Lecturer Password Reset

**Route:** `POST /api/auth/lecturer/reset-password`

**Flow:**
1. User provides email
2. System generates temporary password
3. Updates password in database
4. Returns temporary password in response

**Issue:** Temporary password returned in response (not secure for production)

### Generic Password Reset

**Route:** `POST /api/auth/forgot-password`

**Flow:**
1. User provides email
2. System generates reset token
3. Sends password reset email via nodemailer
4. User clicks link to reset password

**Issue:** Email not sent (same SMTP configuration issue)

---

## Verification Status in Frontend

### Student Login

**File:** `frontend/pages/student-login.html`

**Lines 573-618:**
- Handles `requires_verification` response
- Shows verification error message
- Provides "Resend Verification" button
- Calls `/api/auth/resend-verification`

### Lecturer Login

**File:** `frontend/pages/lecturer-login.html`

**Status:** No verification UI present
- Lecturer login does not check verification status
- No resend verification button
- Needs to be added

---

## Files Changed in Previous Session

### Backend
1. `backend/controllers/authController.js` - Added email verification check to lecturer login
2. `backend/controllers/studentController.js` - Added email sending to lecturer creation
3. `backend/config/email.js` - Fixed production URL
4. `.env.example` - Updated with clear requirements

### Frontend
- No changes to lecturer login verification UI

---

## Recommendations

### Immediate Action Required

**To make email verification work, you MUST configure SMTP credentials:**

1. **For Local Development:**
   ```bash
   # Create .env file in project root
   EMAIL_HOST=smtp.gmail.com
   EMAIL_PORT=587
   EMAIL_USER=your-email@gmail.com
   EMAIL_PASS=your-app-password
   EMAIL_FROM=Mushagashe VTC <your-email@gmail.com>
   FRONTEND_URL=http://localhost:5500
   ```

2. **For Production (Render):**
   - Add environment variables in Render dashboard
   - Set `NODE_ENV=production`
   - Add SMTP credentials
   - `FRONTEND_URL` will auto-detect as `https://my-mushagashe.onrender.com`

### Alternative: Use Supabase Auth

If you want to avoid SMTP configuration entirely, consider migrating to Supabase Auth. This would be a significant rewrite but would provide built-in email verification without needing SMTP credentials.

### Security Improvements

1. **Password Reset:** Stop returning temporary passwords in response
2. **Rate Limiting:** Add rate limiting to resend verification
3. **Token Expiration:** Ensure tokens expire properly
4. **Email Validation:** Validate email format before sending

---

## Testing Status

### Local Testing
- ✅ Backend server runs
- ✅ Registration creates user with `email_verified: false`
- ✅ Login blocks unverified users
- ❌ Email not sent (SMTP not configured)
- ❌ Verification link only in console logs

### Production Testing
- ⏳ Pending SMTP configuration
- ⏳ Pending deployment with environment variables

---

## Conclusion

**Email verification is implemented but not functional because SMTP credentials are not configured.**

The authentication system is custom JWT-based, not Supabase Auth. To make email verification work, you must either:

1. **Configure SMTP credentials** (quick fix, recommended)
2. **Migrate to Supabase Auth** (major rewrite, long-term solution)

Without SMTP configuration, users can register but cannot log in because they are blocked by the email verification check, and they never receive the verification email.

---

## Next Steps

1. **Choose email solution:**
   - Configure SMTP (Gmail App Password recommended)
   - OR migrate to Supabase Auth

2. **If using SMTP:**
   - Create `.env` file with credentials
   - Add environment variables to Render
   - Test email sending
   - Test complete registration flow

3. **If migrating to Supabase Auth:**
   - Plan migration strategy
   - Backup existing users
   - Implement Supabase Auth integration
   - Migrate user data
   - Test complete authentication flow

4. **Update lecturer login UI:**
   - Add verification error message display
   - Add resend verification button
   - Match student login behavior

5. **Improve password reset:**
   - Remove temporary password from response
   - Use email-based reset only
   - Test password reset flow
