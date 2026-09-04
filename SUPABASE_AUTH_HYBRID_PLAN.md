# Supabase Auth Hybrid Implementation Plan

## Revised Strategy: Hybrid Authentication System

**Problem with Full Migration:**
- Existing users have bcrypt-hashed passwords that cannot be used with Supabase Auth
- Migrating 9 existing users would require password resets
- Risk of breaking existing authentication
- Complex migration with potential data loss

## Solution: Dual Authentication System

### New Users (Supabase Auth)
- Registration creates Supabase Auth user
- Email verification handled by Supabase automatically
- Profile data stored in custom users table
- Linked via email

### Existing Users (Custom JWT)
- Continue using existing custom JWT authentication
- No changes required
- No migration needed
- Continue working as before

### Detection Logic
- Check if user has Supabase Auth account
- Use appropriate authentication method
- Transparent to user

## Implementation Plan

### Phase 1: Backend - New Registration

1. **Student Registration with Supabase Auth**
   - Use Supabase Auth signUp()
   - Supabase sends verification email automatically
   - Create custom users table entry with profile data
   - Mark user as "supabase_auth" in metadata

2. **Lecturer Creation (Admin) with Supabase Auth**
   - Use Supabase Auth admin API (service role)
   - Create custom users table entry
   - Mark user as "supabase_auth" in metadata

### Phase 2: Backend - Login Support

3. **Hybrid Login Logic**
   - Try Supabase Auth first
   - If fails, try custom JWT
   - Return appropriate token type

4. **Hybrid Auth Middleware**
   - Detect token type (Supabase vs custom JWT)
   - Verify with appropriate method
   - Fetch profile data from custom users table

### Phase 3: Frontend - Registration

5. **Student Registration UI**
   - Use Supabase Auth SDK for registration
   - Handle email confirmation requirement
   - Show verification status

6. **Lecturer Creation UI (Admin)**
   - Use backend API (uses Supabase Auth admin)
   - Handle creation response

### Phase 4: Frontend - Login

7. **Login UI Updates**
   - Try Supabase Auth login first
   - Fallback to custom JWT if needed
   - Handle both token types
   - Store token type in localStorage

### Phase 5: Password Reset

8. **Password Reset with Supabase**
   - Use Supabase Auth resetPasswordForEmail()
   - Works for Supabase Auth users only
   - Custom users use existing reset flow

## Data Model Changes

### Custom users table - Add field:
```sql
ALTER TABLE users ADD COLUMN auth_type VARCHAR(20) DEFAULT 'custom';
-- Values: 'custom' or 'supabase'
```

### User metadata in Supabase Auth:
```javascript
{
  custom_user_id: 123,  // Link to custom users table
  role: 'student',
  student_number: 'STU001'
}
```

## Authentication Flow

### New User Registration
```
Frontend → Supabase Auth signUp()
          ↓
    Supabase sends verification email
          ↓
User clicks verification link
          ↓
Backend creates custom users table entry
          ↓
User can login with Supabase Auth
```

### Existing User Login
```
Frontend → Custom API login
          ↓
Backend verifies custom JWT
          ↓
User logged in (no change)
```

### New User Login
```
Frontend → Supabase Auth signInWithPassword()
          ↓
Backend verifies Supabase token
          ↓
Fetch profile from custom users table
          ↓
User logged in
```

## Files to Create

1. `backend/config/supabaseAuth.js` - Supabase Auth client (DONE)
2. `backend/controllers/authControllerSupabase.js` - Supabase Auth login methods (DONE)
3. `backend/controllers/studentControllerSupabase.js` - Supabase Auth registration
4. `backend/middleware/authHybrid.js` - Hybrid auth middleware
5. `frontend/assets/js/supabase-auth.js` - Frontend Supabase Auth SDK

## Files to Modify

1. `backend/routes/authRoutes.js` - Add Supabase Auth routes
2. `backend/models/User.js` - Add auth_type field support
3. `frontend/pages/student-register.html` - Use Supabase Auth SDK
4. `frontend/pages/student-login.html` - Support both auth types
5. `frontend/pages/lecturer-login.html` - Support both auth types

## Database Changes

### Add auth_type column:
```sql
ALTER TABLE users ADD COLUMN auth_type VARCHAR(20) DEFAULT 'custom';
```

### Update existing users:
```sql
UPDATE users SET auth_type = 'custom' WHERE auth_type IS NULL;
```

## Supabase Configuration Required

### In Supabase Dashboard

1. **Authentication Settings**
   - Enable email confirmation
   - Set site URL: https://my-mushagashe.onrender.com
   - Set redirect URLs:
     - https://my-mushagashe.onrender.com/student-login.html
     - https://my-mushagashe.onrender.com/lecturer-login.html
     - https://my-mushagashe.onrender.com/admin-login.html

2. **Get Service Role Key**
   - Project Settings > API
   - Copy service_role key
   - Add to environment variables

### Environment Variables

```bash
SUPABASE_URL=your-supabase-project-url
SUPABASE_ANON_KEY=your-supabase-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-supabase-service-role-key
```

## Advantages of Hybrid Approach

1. **No Risk to Existing Users**
   - Existing users continue working
   - No password migration needed
   - No downtime

2. **Gradual Migration**
   - New users get Supabase Auth
   - Existing users can migrate later if desired
   - Can test with new users only

3. **Email Verification for New Users**
   - Supabase handles email sending
   - No SMTP credentials needed
   - Automatic verification flow

4. **Fallback Safety**
   - If Supabase Auth fails, custom auth still works
   - Can disable Supabase Auth if needed
   - Rollback is easier

## Testing Plan

### Test New User Registration
1. Register new student with email
2. Verify email arrives (Supabase)
3. Click verification link
4. Login with Supabase Auth
5. Verify profile data created

### Test Existing User Login
1. Login with existing student
2. Verify custom JWT still works
3. Verify profile data loads
4. Verify dashboard access

### Test Hybrid Detection
1. Try login with new user (Supabase)
2. Try login with existing user (custom)
3. Verify both work correctly

## Timeline

- Phase 1 (Backend Registration): 2 hours
- Phase 2 (Backend Login): 2 hours
- Phase 3 (Frontend Registration): 2 hours
- Phase 4 (Frontend Login): 2 hours
- Phase 5 (Password Reset): 1 hour
- Database Changes: 30 minutes
- Testing: 2 hours

**Total: ~11.5 hours**

## Rollback Plan

If issues occur:
1. Disable Supabase Auth registration
2. Keep custom auth as default
3. Existing users unaffected
4. New users can use custom auth temporarily

## Notes

- This approach prioritizes safety over complete migration
- Existing users are never at risk
- Email verification works for new users immediately
- Can fully migrate later if desired
- Service role key required for admin operations
