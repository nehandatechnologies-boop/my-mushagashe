-- Migration: Handle First Super Admin Initialization
-- Run this after rbac-schema.sql to handle existing admin accounts
-- This migration safely converts existing admin accounts to the new RBAC system

-- ============================================
-- STEP 1: Check if there are any existing admin accounts
-- ============================================
DO $$
DECLARE
    admin_count INTEGER;
BEGIN
    SELECT COUNT(*) INTO admin_count
    FROM users
    WHERE role IN ('admin', 'super_admin', 'SUPER_ADMIN');
    
    RAISE NOTICE 'Found % existing admin account(s)', admin_count;
END $$;

-- ============================================
-- STEP 2: Migrate existing 'admin' accounts to SUPER_ADMIN
-- ============================================
-- NOTE: This is a conservative migration. It only converts accounts that:
-- 1. Have role 'admin' (legacy role)
-- 2. Have status 'active'
-- 3. Have a valid email
-- 
-- For production, you should manually review which accounts should be SUPER_ADMIN
-- and run the UPDATE statement below with a specific email filter

-- EXAMPLE: Promote a specific admin to SUPER_ADMIN
-- UPDATE users 
-- SET role = 'SUPER_ADMIN', 
--     updated_at = NOW()
-- WHERE email = 'your-admin-email@example.com' 
-- AND role = 'admin';

-- ============================================
-- STEP 3: Create a temporary procedure for manual Super Admin promotion
-- ============================================
CREATE OR REPLACE FUNCTION promote_to_super_admin(target_email TEXT)
RETURNS TEXT AS $$
DECLARE
    user_record RECORD;
BEGIN
    -- Find the user
    SELECT * INTO user_record
    FROM users
    WHERE email = target_email;
    
    IF NOT FOUND THEN
        RETURN 'Error: No user found with email ' || target_email;
    END IF;
    
    -- Check if already SUPER_ADMIN
    IF user_record.role = 'SUPER_ADMIN' THEN
        RETURN 'User is already SUPER_ADMIN';
    END IF;
    
    -- Check if account is active
    IF user_record.status != 'active' THEN
        RETURN 'Error: Account is not active (status: ' || user_record.status || ')';
    END IF;
    
    -- Promote to SUPER_ADMIN
    UPDATE users
    SET role = 'SUPER_ADMIN',
        updated_at = NOW()
    WHERE email = target_email;
    
    RETURN 'Successfully promoted ' || target_email || ' to SUPER_ADMIN';
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- STEP 4: Verify the migration
-- ============================================
-- View all SUPER_ADMIN accounts
-- SELECT id, email, full_name, role, status, created_at
-- FROM users
-- WHERE role = 'SUPER_ADMIN'
-- ORDER BY created_at;

-- ============================================
-- STEP 5: Clean up procedure (run after migration is complete)
-- ============================================
-- DROP FUNCTION IF EXISTS promote_to_super_admin(TEXT);

-- ============================================
-- INSTRUCTIONS FOR FIRST SUPER ADMIN SETUP
-- ============================================
-- 1. Run this migration file to create the promotion function
-- 2. Identify the email of the existing admin who should be SUPER_ADMIN
-- 3. Run: SELECT promote_to_super_admin('admin-email@example.com');
-- 4. Verify the result shows "Successfully promoted..."
-- 5. Confirm the account appears in the SUPER_ADMIN query above
-- 6. Once verified, run the DROP FUNCTION statement above to clean up
-- 7. Delete this migration file or move it to a completed migrations folder

-- ============================================
-- SECURITY NOTES
-- ============================================
-- - Only run the promotion function on trusted admin accounts
-- - Never expose the promote_to_super_admin function in API routes
-- - Remove the function immediately after first Super Admin is established
-- - Keep the function in a secure, admin-only migration script
-- - Document who was promoted and when for audit purposes
