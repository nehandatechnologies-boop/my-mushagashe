# Brevo SMTP Configuration for Supabase Auth - Implementation Report

**Date:** September 5, 2026  
**Project:** Mushagashe Vocational Training Centre Portal  
**Objective:** Configure Brevo SMTP for Supabase Auth transactional emails

---

## ROOT CAUSE

The email verification and password reset systems were failing because:

1. **Hybrid Email System**: The application was using a custom Nodemailer-based email system for verification tokens instead of Supabase Auth's built-in email confirmation
2. **No SMTP Configuration**: Supabase Auth was using its default email provider instead of Brevo SMTP
3. **Disconnect**: Supabase Auth users were created but email confirmation was handled by a separate custom system, creating a disconnect where Supabase didn't know about custom verification tokens
4. **Missing Redirect URLs**: Supabase Auth redirect URLs were not configured for the production environment
5. **Hardcoded API Base**: Lecturer login had hardcoded production URL instead of environment detection
6. **DOM Error**: Duplicate event listener in student registration form causing JavaScript errors

---

## FILES CHANGED

### Backend Files

1. **backend/controllers/studentControllerSupabase.js**
   - Updated `registerStudentSupabase` to use Supabase Auth's built-in email confirmation
   - Added `emailRedirectTo` option to Supabase signUp call
   - Updated response to dynamically determine if verification is required based on Supabase's email confirmation status
   - Added logging for email confirmation status

2. **backend/controllers/authController.js**
   - Updated `requestStudentPasswordReset` to use Supabase Auth's `resetPasswordForEmail` for Supabase Auth users
   - Updated `requestLecturerPasswordReset` to use Supabase Auth's `resetPasswordForEmail` for Supabase Auth users
   - Added security: don't reveal if user exists (account enumeration prevention)
   - Maintained legacy password reset for custom auth users (backward compatibility)

3. **.env**
   - Removed exposed Supabase keys (replaced with placeholders)
   - Updated `FRONTEND_URL` to production URL: `https://my-mushagashe.onrender.com`
   - Updated `NODE_ENV` to `production`
   - Added security warnings about not committing real secrets

### Frontend Files

4. **frontend/pages/student-register.html**
   - Removed duplicate event listener that was causing DOM errors
   - Fixed `setLoading()` function null reference issue

5. **frontend/assets/js/lecturer-login.js**
   - Replaced hardcoded API_BASE with environment detection
   - Added support for Render, ngrok, fly.io, and localhost environments

6. **frontend/pages/forgot-password.html** (NEW)
   - Created new forgot password page for students
   - Uses student number to initiate password reset
   - Implements security: doesn't reveal if student exists
   - Environment-aware API configuration

7. **frontend/pages/reset-password.html**
   - Updated to handle both Supabase Auth tokens (`access_token`) and legacy tokens
   - Added Supabase Auth client import for direct password reset
   - Environment-aware API configuration
   - Maintains backward compatibility with legacy token system

---

## SUPABASE CHANGES (MANUAL STEPS REQUIRED)

### 1. Configure Custom SMTP in Supabase

**Location:** Supabase Dashboard → Authentication → Providers → Email

**Steps:**
1. Go to your Supabase project dashboard
2. Navigate to Authentication → Providers
3. Select "Email" provider
4. Click "Custom SMTP" tab
5. Enter the following Brevo SMTP configuration:

```
SMTP Host: smtp-relay.brevo.com
SMTP Port: 587
SMTP User: [Your Brevo SMTP Username]
SMTP Password: [Your Brevo SMTP Password]
Sender Email: [Your verified Brevo sender email]
Sender Name: Mushagashe Vocational Training Centre
```

**Important Notes:**
- Use the Brevo SMTP credentials from your Brevo account
- The sender email must be verified in your Brevo account
- Do not use `@mushagashe.local` or fake emails
- Enable "Confirm email" option
- Enable "Secure email change" option

### 2. Configure Redirect URLs

**Location:** Supabase Dashboard → Authentication → URL Configuration

**Site URL:**
```
https://my-mushagashe.onrender.com
```

**Redirect URLs (add these):**
```
https://my-mushagashe.onrender.com/**
http://localhost:5500/**
http://localhost:3000/**
```

**Email Confirmation URL:**
```
https://my-mushagashe.onrender.com/student-login.html
```

**Password Reset URL:**
```
https://my-mushagashe.onrender.com/reset-password.html
```

### 3. Update Email Templates

**Location:** Supabase Dashboard → Authentication → Email Templates

**Confirm Signup Template:**
- Subject: Verify Your Email - Mushagashe Vocational Training Centre
- Ensure the confirmation link redirects to the correct production URL
- Include Mushagashe branding
- Keep the `{{ .ConfirmationURL }}` placeholder for the confirmation link

**Reset Password Template:**
- Subject: Reset Your Password - Mushagashe Vocational Training Centre
- Ensure the reset link redirects to the correct production URL
- Include Mushagashe branding
- Keep the `{{ .ConfirmationURL }}` placeholder for the reset link

### 4. Enable Email Confirmation

**Location:** Supabase Dashboard → Authentication → Providers → Email

**Settings:**
- Enable "Confirm email"
- Enable "Secure email change"
- Set "Email confirmation grace period" to appropriate value (e.g., 24 hours)

---

## BREVO CHANGES (MANUAL STEPS REQUIRED)

### 1. Verify Sender Domain

**Steps:**
1. Log in to your Brevo account
2. Navigate to Senders → SMTP & API
3. Verify your sender domain (e.g., `mushagashe.edu.zw` or your institutional domain)
4. Add SPF, DKIM, and DMARC records to your DNS as instructed by Brevo
5. Wait for DNS verification to complete

### 2. Generate SMTP Credentials

**Steps:**
1. In Brevo, navigate to Senders → SMTP & API
2. Generate SMTP keys/credentials
3. Note down:
   - SMTP Host: `smtp-relay.brevo.com`
   - SMTP Port: `587`
   - SMTP Username: [Your generated username]
   - SMTP Password: [Your generated password]

### 3. Configure Sender Email

**Steps:**
1. In Brevo, navigate to Senders → Senders
2. Add your sender email address
3. Verify the sender email (Brevo will send a verification email)
4. Use this verified email in Supabase SMTP configuration

---

## RENDER CHANGES

### Environment Variables

Add these environment variables in Render dashboard:

```
SUPABASE_URL=https://krenyvbcwtbwcsrpiryf.supabase.co
SUPABASE_ANON_KEY=[Your actual Supabase anon key]
SUPABASE_SERVICE_ROLE_KEY=[Your actual Supabase service role key]
JWT_SECRET=[Your secure JWT secret]
FRONTEND_URL=https://my-mushagashe.onrender.com
PORT=5000
NODE_ENV=production
```

**Important:**
- Do not commit real secrets to Git
- Use Render's environment variable dashboard
- Regenerate any exposed keys immediately

---

## EMAIL FLOW

### Student Registration Flow

**New Flow (Supabase Auth + Brevo):**
1. Student fills registration form on `student-register.html`
2. Frontend sends POST to `/api/auth/student/register-supabase`
3. Backend creates Supabase Auth user with email confirmation enabled
4. Supabase Auth sends confirmation email via Brevo SMTP
5. Student receives email with Supabase confirmation link
6. Student clicks link → redirects to production URL
7. Supabase confirms the email
8. Student can now log in with email and password

**Backend Response:**
- If email provided: `requires_verification: true`
- If no email: `requires_verification: false`
- Message indicates whether email verification is needed

### Lecturer Registration Flow

**Current Flow (Admin-created):**
1. Admin creates lecturer via admin dashboard
2. Backend uses Supabase Admin API with `email_confirm: true`
3. Lecturer account is auto-confirmed (no email verification needed)
4. Lecturer can log in immediately

**Note:** Lecturer registration is admin-only and auto-confirmed by design.

---

## PASSWORD RESET FLOW

### Student Password Reset Flow

**New Flow (Supabase Auth + Brevo):**
1. Student goes to `forgot-password.html`
2. Enters student number
3. Frontend sends POST to `/api/auth/student/reset-password`
4. Backend finds student by student number
5. If student has email and uses Supabase Auth:
   - Backend calls `supabase.auth.resetPasswordForEmail()`
   - Supabase sends reset email via Brevo SMTP
   - Email contains Supabase reset link with `access_token` and `refresh_token`
6. Student clicks link → redirects to `reset-password.html`
7. Frontend extracts Supabase tokens from URL
8. Frontend uses Supabase client to update password
9. Password reset successful
10. Student redirected to login

**Security Features:**
- Doesn't reveal if student exists
- Uses Supabase's secure token system
- Tokens expire automatically
- Account enumeration prevention

### Lecturer Password Reset Flow

**New Flow (Supabase Auth + Brevo):**
1. Lecturer uses "Forgot Password" link from login page
2. Enters email address
3. Frontend sends POST to `/api/auth/lecturer/reset-password`
4. Backend finds lecturer by email
5. If lecturer uses Supabase Auth:
   - Backend calls `supabase.auth.resetPasswordForEmail()`
   - Supabase sends reset email via Brevo SMTP
6. Lecturer clicks link → redirects to `reset-password.html`
7. Frontend uses Supabase client to update password
8. Password reset successful

**Note:** Lecturer login currently shows alert to contact IT support. This should be updated to use the forgot-password flow.

---

## BACKWARD COMPATIBILITY

The implementation maintains full backward compatibility:

1. **Custom Auth Users**: Users with `auth_type: 'custom'` continue using the legacy Nodemailer system
2. **Legacy Password Reset**: Custom auth users still use token-based password reset
3. **Existing Data**: No database schema changes required
4. **Gradual Migration**: New registrations use Supabase Auth, existing users unaffected

---

## SECURITY IMPROVEMENTS

1. **Removed Exposed Secrets**: Replaced actual Supabase keys with placeholders in `.env`
2. **Account Enumeration Prevention**: Password reset doesn't reveal if user exists
3. **Supabase Auth Security**: Using Supabase's built-in secure token system
4. **Environment Detection**: Frontend properly detects production vs development
5. **No Hardcoded URLs**: Removed hardcoded production URLs from frontend code

---

## TEST RESULTS

### Pending Manual Configuration

**Cannot test until Brevo SMTP is configured in Supabase:**
- Student registration with email verification
- Lecturer registration with email verification
- Resend verification email
- Student password reset
- Lecturer password reset
- Production testing

### Code Changes Verified

**Completed:**
- ✅ Student registration updated to use Supabase email confirmation
- ✅ Password reset updated to use Supabase Auth
- ✅ Forgot password page created
- ✅ Reset password page updated for Supabase tokens
- ✅ DOM error fixed in student registration
- ✅ Hardcoded API_BASE fixed in lecturer login
- ✅ Security review completed
- ✅ Environment variables cleaned up

---

## MANUAL STEPS REQUIRED

### Before Testing

1. **Configure Brevo SMTP in Supabase**
   - Go to Supabase Dashboard → Authentication → Providers → Email
   - Select "Custom SMTP"
   - Enter Brevo credentials
   - Save configuration

2. **Configure Supabase Redirect URLs**
   - Go to Supabase Dashboard → Authentication → URL Configuration
   - Set Site URL to `https://my-mushagashe.onrender.com`
   - Add redirect URLs for production and localhost
   - Set email confirmation and password reset URLs

3. **Update Render Environment Variables**
   - Add `SUPABASE_ANON_KEY` (actual key)
   - Add `SUPABASE_SERVICE_ROLE_KEY` (actual key)
   - Add `JWT_SECRET` (secure secret)
   - Set `FRONTEND_URL` to `https://my-mushagashe.onrender.com`
   - Set `NODE_ENV` to `production`

4. **Verify Brevo Sender Domain**
   - Verify your sender domain in Brevo
   - Add DNS records (SPF, DKIM, DMARC)
   - Wait for DNS verification

### After Configuration

5. **Test Student Registration**
   - Register a new student with email
   - Check if confirmation email arrives via Brevo
   - Click confirmation link
   - Verify email is confirmed in Supabase
   - Try logging in

6. **Test Student Password Reset**
   - Go to forgot-password page
   - Enter student number
   - Check if reset email arrives via Brevo
   - Click reset link
   - Reset password
   - Try logging in with new password

7. **Test Production**
   - Deploy to Render
   - Test all flows on `https://my-mushagashe.onrender.com`
   - Verify emails are sent via Brevo
   - Verify redirect URLs work correctly

---

## ARCHITECTURE SUMMARY

### Final Architecture

```
MUSHAGASHE PORTAL
↓
SUPABASE AUTH (Authentication)
↓
CUSTOM SMTP (Brevo)
↓
BREVO SMTP (Email Delivery)
↓
STUDENT / LECTURER EMAIL
```

### Key Points

- **Supabase Auth remains the authentication system**
- **Brevo is only the email delivery provider**
- **No custom verification tokens for new users**
- **Backward compatible with existing custom auth users**
- **Secure token management by Supabase**
- **Production-ready redirect URLs**

---

## FILES NOT CHANGED

The following files were intentionally not changed to maintain stability:

- `backend/models/User.js` - No schema changes needed
- `backend/middleware/auth.js` - Hybrid auth already works correctly
- `backend/middleware/authHybrid.js` - Already handles both auth types
- `backend/config/supabaseAuth.js` - Already configured correctly
- `backend/config/email.js` - Kept for backward compatibility with custom auth users
- Student dashboard, lecturer dashboard, admin dashboard - No changes needed

---

## NEXT STEPS

1. **Configure Brevo SMTP in Supabase** (Manual - see above)
2. **Configure Supabase Redirect URLs** (Manual - see above)
3. **Update Render Environment Variables** (Manual - see above)
4. **Test all email flows** (After configuration)
5. **Deploy to production** (After testing)
6. **Monitor email delivery** (After deployment)

---

## SUPPORT

For issues with:
- **Brevo SMTP**: Check Brevo dashboard and DNS records
- **Supabase Auth**: Check Supabase dashboard logs
- **Redirect URLs**: Verify URL configuration in Supabase
- **Email Templates**: Verify templates in Supabase dashboard

---

**Implementation Status:** ✅ Code Complete - Awaiting Manual Supabase/Brevo Configuration

**Cannot claim success until Brevo SMTP is configured and tested.**
