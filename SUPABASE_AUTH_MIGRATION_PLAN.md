# Supabase Auth Migration Plan

## Overview

Migrate from custom JWT authentication to Supabase Auth to enable built-in email verification without requiring SMTP credentials.

## Architecture Change

### Current Architecture
```
Frontend → Custom API → Custom JWT → Custom users table (Supabase DB)
```

### Target Architecture
```
Frontend → Supabase Auth SDK → Supabase Auth → auth.users table
                                    ↓
                            Custom users table (profile data)
```

## Strategy: Hybrid Approach

**Keep custom users table** for profile data (role, course_id, student_number, etc.)
**Use Supabase Auth** for authentication (email, password, verification)

### Data Flow

```
Registration:
1. Supabase Auth creates user (email, password)
2. Supabase sends verification email automatically
3. Custom users table entry created with profile data
4. Link via email or user metadata

Login:
1. Supabase Auth authenticates user
2. Supabase returns session token
3. Backend verifies token with Supabase
4. Fetch profile data from custom users table

Profile Data:
- role (student, lecturer, admin)
- student_number
- course_id
- full_name
- phone
- gender
- national_id
- date_of_birth
- address
- guardian_name
- guardian_phone
- intake_year
- status
```

## Migration Steps

### Phase 1: Preparation

1. **Backup existing users data**
   - Export all users from custom users table
   - Save to JSON file for rollback

2. **Install Supabase Auth client**
   - Already installed: @supabase/supabase-js
   - May need: @supabase/auth-helpers-next or similar

3. **Configure Supabase Auth**
   - Enable email confirmation in Supabase dashboard
   - Set redirect URLs for production
   - Configure email templates (optional)

### Phase 2: Backend Changes

4. **Create Supabase Auth client for backend**
   - Use service role key for admin operations
   - Create separate client for auth operations

5. **Update student registration**
   - Use Supabase Auth signUp()
   - Create custom users table entry
   - Link via email in user metadata

6. **Update lecturer creation (admin)**
   - Use Supabase Auth admin API
   - Create custom users table entry
   - Link via email

7. **Update student login**
   - Use Supabase Auth signInWithPassword()
   - Return Supabase session token
   - Fetch profile data from custom users table

8. **Update lecturer login**
   - Use Supabase Auth signInWithPassword()
   - Return Supabase session token
   - Fetch profile data from custom users table

9. **Update admin login**
   - Use Supabase Auth signInWithPassword()
   - Return Supabase session token

10. **Update auth middleware**
    - Verify Supabase JWT tokens instead of custom JWT
    - Use Supabase getUser() to validate
    - Fetch profile data from custom users table

11. **Update password reset**
    - Use Supabase Auth resetPasswordForEmail()
    - Remove custom password reset logic

12. **Update email verification**
    - Use Supabase Auth built-in verification
    - Remove custom verification logic
    - Remove nodemailer dependency

### Phase 3: Frontend Changes

13. **Install Supabase Auth SDK for frontend**
    - npm install @supabase/supabase-js (already installed)
    - Create Supabase client instance

14. **Update student registration**
    - Use Supabase Auth signUp()
    - Handle email confirmation requirement
    - Update UI for verification status

15. **Update lecturer login**
    - Use Supabase Auth signInWithPassword()
    - Handle session management
    - Update UI for verification status

16. **Update student login**
    - Use Supabase Auth signInWithPassword()
    - Handle session management
    - Update UI for verification status

17. **Update admin login**
    - Use Supabase Auth signInWithPassword()
    - Handle session management

18. **Update password reset**
    - Use Supabase Auth resetPasswordForEmail()
    - Update UI for reset flow

19. **Update API calls**
    - Include Supabase session token in headers
    - Remove custom JWT from localStorage

### Phase 4: Data Migration

20. **Migrate existing users to Supabase Auth**
    - For each user in custom users table:
      - Create Supabase Auth user with admin API
      - Set email as verified (existing users)
      - Link to custom users table via email
    - Preserve passwords (hash comparison)

21. **Verify migration**
    - Test login with migrated users
    - Verify profile data integrity
    - Check role-based access

### Phase 5: Cleanup

22. **Remove custom JWT code**
    - Remove JWT generation from auth middleware
    - Remove JWT verification from auth middleware
    - Remove bcrypt password hashing
    - Remove nodemailer email sending
    - Remove custom verification token logic

23. **Update environment variables**
    - Remove EMAIL_* variables (no longer needed)
    - Keep SUPABASE_URL and SUPABASE_ANON_KEY
    - Add SUPABASE_SERVICE_ROLE_KEY (for admin operations)

24. **Update documentation**
    - Update .env.example
    - Update authentication documentation
    - Create migration guide

## Supabase Configuration Required

### In Supabase Dashboard

1. **Authentication Settings**
   - Enable email confirmation
   - Set site URL: https://my-mushagashe.onrender.com
   - Set redirect URLs:
     - https://my-mushagashe.onrender.com/student-login.html
     - https://my-mushagashe.onrender.com/lecturer-login.html
     - https://my-mushagashe.onrender.com/admin-login.html

2. **Email Templates** (optional)
   - Customize confirmation email template
   - Customize reset password email template

### Environment Variables

```bash
# Supabase Configuration
SUPABASE_URL=your-supabase-project-url
SUPABASE_ANON_KEY=your-supabase-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-supabase-service-role-key  # NEW - for admin operations

# Server Configuration
PORT=5000
NODE_ENV=development
```

## Risk Assessment

### High Risk
- **Data loss during migration** - Mitigation: Full backup before migration
- **Authentication downtime** - Mitigation: Rollback plan ready
- **Existing users unable to login** - Mitigation: Test migration thoroughly

### Medium Risk
- **Frontend session management issues** - Mitigation: Test all login flows
- **Role-based access broken** - Mitigation: Verify role preservation

### Low Risk
- **Email template customization** - Mitigation: Use default templates initially

## Rollback Plan

If migration fails:
1. Restore custom users table from backup
2. Revert backend code to custom JWT
3. Revert frontend code to custom JWT
4. Restore environment variables
5. Restart services

## Testing Plan

### Pre-Migration Testing
- Backup users data
- Test backup restoration
- Verify current authentication works

### Post-Migration Testing
- Test student registration with email verification
- Test lecturer creation (admin)
- Test student login
- Test lecturer login
- Test admin login
- Test password reset
- Test email verification
- Test role-based access
- Test profile data access
- Test existing user login

## Estimated Timeline

- Phase 1 (Preparation): 2 hours
- Phase 2 (Backend): 4 hours
- Phase 3 (Frontend): 3 hours
- Phase 4 (Migration): 2 hours
- Phase 5 (Cleanup): 1 hour
- Testing: 2 hours

**Total: ~14 hours**

## Dependencies

### Required Packages
- @supabase/supabase-js (already installed)

### Optional Packages
- @supabase/auth-helpers-next (for Next.js - not needed here)

## Notes

- Supabase Auth handles email verification automatically
- No SMTP credentials needed
- Email templates can be customized in Supabase dashboard
- Supabase Auth tokens are JWTs verified by Supabase
- Service role key allows admin operations (create users without email confirmation)
