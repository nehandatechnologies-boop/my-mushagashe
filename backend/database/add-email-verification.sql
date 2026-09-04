-- Add email verification columns to users table
-- Run this in Supabase SQL Editor

-- Add email_verified column (default false for new registrations)
ALTER TABLE users ADD COLUMN IF NOT EXISTS email_verified BOOLEAN DEFAULT false;

-- Add verification_token column for email verification
ALTER TABLE users ADD COLUMN IF NOT EXISTS verification_token TEXT;

-- Add verification_token_expires column for token expiration
ALTER TABLE users ADD COLUMN IF NOT EXISTS verification_token_expires TIMESTAMP WITH TIME ZONE;

-- Add reset_password_token column for password reset
ALTER TABLE users ADD COLUMN IF NOT EXISTS reset_password_token TEXT;

-- Add reset_password_expires column for reset token expiration
ALTER TABLE users ADD COLUMN IF NOT EXISTS reset_password_expires TIMESTAMP WITH TIME ZONE;

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_users_verification_token ON users(verification_token);
CREATE INDEX IF NOT EXISTS idx_users_reset_password_token ON users(reset_password_token);
