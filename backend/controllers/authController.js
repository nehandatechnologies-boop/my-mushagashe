const bcrypt = require('bcryptjs');
const User = require('../models/User');
const { generateToken } = require('../middleware/auth');
const { generateToken: generateEmailToken, sendVerificationEmail, sendPasswordResetEmail } = require('../config/email');

// Admin login
const adminLogin = async (req, res) => {
  try {
    const { email, password } = req.body;

    // Validation
    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required' });
    }

    // Find admin by email
    const user = await User.findByEmail(email);
    
    if (!user) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    if (user.role !== 'admin' && user.role !== 'super_admin') {
      return res.status(403).json({ error: 'Admin access required' });
    }

    if (user.status !== 'active') {
      return res.status(403).json({ error: 'Account is not active' });
    }

    // Verify password
    const isPasswordValid = bcrypt.compareSync(password, user.password);
    
    if (!isPasswordValid) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    // Generate token
    const token = generateToken(user);

    // Return user data without password
    const { password: _, ...userWithoutPassword } = user;

    res.json({
      token,
      user: userWithoutPassword
    });
  } catch (error) {
    console.error('Admin login error:', error);
    res.status(500).json({ error: 'Login failed' });
  }
};

// Lecturer login
const lecturerLogin = async (req, res) => {
  try {
    const { email, password } = req.body;

    // Trim whitespace from inputs
    const trimmedEmail = email?.trim();
    const trimmedPassword = password?.trim();

    // Validation
    if (!trimmedEmail || !trimmedPassword) {
      return res.status(400).json({ error: 'Email and password are required' });
    }

    // Find lecturer by email
    const user = await User.findByEmail(trimmedEmail);
    
    if (!user) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    if (user.role !== 'lecturer' && user.role !== 'instructor') {
      return res.status(403).json({ error: 'Lecturer access required' });
    }

    if (user.status !== 'active') {
      return res.status(403).json({ error: 'Account is not active' });
    }

    // Verify password
    const isPasswordValid = bcrypt.compareSync(trimmedPassword, user.password);
    
    if (!isPasswordValid) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    // Generate token
    const token = generateToken(user);

    // Return user data without password
    const { password: _, ...userWithoutPassword } = user;

    res.json({
      token,
      user: userWithoutPassword
    });
  } catch (error) {
    console.error('Lecturer login error:', error);
    res.status(500).json({ error: 'Login failed' });
  }
};

// Student login
const studentLogin = async (req, res) => {
  try {
    const { student_number, password } = req.body;

    // Trim whitespace from inputs
    const trimmedStudentNumber = student_number?.trim();
    const trimmedPassword = password?.trim();

    // Validation
    if (!trimmedStudentNumber || !trimmedPassword) {
      return res.status(400).json({ error: 'Student number and password are required' });
    }

    // Find student by student number
    const user = await User.findByStudentNumber(trimmedStudentNumber);
    
    if (!user) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    if (user.role !== 'student') {
      return res.status(403).json({ error: 'Student access required' });
    }

    if (user.status !== 'active') {
      return res.status(403).json({ error: 'Account is not active' });
    }

    // Check email verification if email exists
    if (user.email && !user.email_verified) {
      return res.status(403).json({ 
        error: 'Your email address has not been verified yet. Please check your email and click the verification link.',
        requires_verification: true,
        email: user.email
      });
    }

    // Verify password
    const isPasswordValid = bcrypt.compareSync(trimmedPassword, user.password);
    
    if (!isPasswordValid) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    // Generate token
    const token = generateToken(user);

    // Return user data without password
    const { password: _, ...userWithoutPassword } = user;

    res.json({
      token,
      user: userWithoutPassword
    });
  } catch (error) {
    console.error('Student login error:', error);
    res.status(500).json({ error: 'Login failed' });
  }
};

// Get current user profile
const getProfile = async (req, res) => {
  try {
    const user = await User.findById(req.user.id);
    
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    const { password: _, ...userWithoutPassword } = user;

    res.json(userWithoutPassword);
  } catch (error) {
    console.error('Get profile error:', error);
    res.status(500).json({ error: 'Failed to fetch profile' });
  }
};

// Get current user's profile picture URL
const getProfilePicture = async (req, res) => {
  try {
    const user = await User.findById(req.user.id);
    
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Return profile picture URL or null if not set
    res.json({ 
      profile_picture_url: user.profile_picture_url || null 
    });
  } catch (error) {
    console.error('Get profile picture error:', error);
    res.status(500).json({ error: 'Failed to fetch profile picture' });
  }
};

// Update profile
const updateProfile = async (req, res) => {
  try {
    const userId = req.user.id;
    const {
      full_name, phone, gender, national_id, date_of_birth,
      address, guardian_name, guardian_phone
    } = req.body;

    const updateData = {
      full_name, phone, gender, national_id, date_of_birth,
      address, guardian_name, guardian_phone
    };

    // Remove undefined values
    Object.keys(updateData).forEach(key => {
      if (updateData[key] === undefined) {
        delete updateData[key];
      }
    });

    await User.update(userId, updateData);

    const updatedUser = await User.findById(userId);
    const { password: _, ...userWithoutPassword } = updatedUser;

    res.json(userWithoutPassword);
  } catch (error) {
    console.error('Update profile error:', error);
    res.status(500).json({ error: 'Failed to update profile' });
  }
};

// Change password
const changePassword = async (req, res) => {
  try {
    console.log('[CHANGE-PASSWORD] Change password request - User ID:', req.user?.id, 'Role:', req.user?.role);
    const userId = req.user.id;
    const { current_password, new_password } = req.body;

    console.log('[CHANGE-PASSWORD] Passwords provided:', { current_password: !!current_password, new_password: !!new_password });

    if (!current_password || !new_password) {
      return res.status(400).json({ error: 'Current password and new password are required' });
    }

    if (new_password.length < 6) {
      return res.status(400).json({ error: 'New password must be at least 6 characters' });
    }

    // Get current user
    console.log('[CHANGE-PASSWORD] Fetching user from database...');
    const user = await User.findById(userId);
    console.log('[CHANGE-PASSWORD] User found:', user ? 'yes' : 'no');
    
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    console.log('[CHANGE-PASSWORD] User ID from DB:', user.id);
    console.log('[CHANGE-PASSWORD] User has password field:', !!user.password);

    // Verify current password
    console.log('[CHANGE-PASSWORD] Verifying current password...');
    const isPasswordValid = bcrypt.compareSync(current_password, user.password);
    console.log('[CHANGE-PASSWORD] Password valid:', isPasswordValid);
    
    if (!isPasswordValid) {
      return res.status(401).json({ error: 'Current password is incorrect' });
    }

    // Hash new password
    console.log('[CHANGE-PASSWORD] Hashing new password...');
    const hashedPassword = bcrypt.hashSync(new_password, 10);

    // Update password
    console.log('[CHANGE-PASSWORD] Updating password in database...');
    await User.update(userId, { password: hashedPassword });
    console.log('[CHANGE-PASSWORD] Password updated successfully');

    res.json({ message: 'Password changed successfully' });
  } catch (error) {
    console.error('[CHANGE-PASSWORD] Change password error:', error);
    console.error('[CHANGE-PASSWORD] Error message:', error.message);
    console.error('[CHANGE-PASSWORD] Error code:', error.code);
    console.error('[CHANGE-PASSWORD] Error stack:', error.stack);
    res.status(500).json({ error: 'Failed to change password' });
  }
};

// Request password reset (student)
const requestStudentPasswordReset = async (req, res) => {
  try {
    const { student_number } = req.body;

    if (!student_number) {
      return res.status(400).json({ error: 'Student number is required' });
    }

    const trimmedStudentNumber = student_number.trim();

    // Find student by student number
    const user = await User.findByStudentNumber(trimmedStudentNumber);
    
    if (!user) {
      return res.status(404).json({ error: 'Student not found' });
    }

    if (user.role !== 'student') {
      return res.status(400).json({ error: 'User is not a student' });
    }

    if (user.status !== 'active') {
      return res.status(403).json({ error: 'Account is not active. Please contact administration.' });
    }

    // Generate temporary password
    const temporaryPassword = Math.random().toString(36).slice(-8) + Math.random().toString(36).slice(-4);
    
    // Hash temporary password
    const hashedPassword = bcrypt.hashSync(temporaryPassword, 10);

    // Update password
    await User.update(user.id, { password: hashedPassword });

    // NOTE: In production with email infrastructure, send this temporary password via email
    // For now, return it in the response (not ideal but functional without email)
    res.json({
      message: 'Password reset successful',
      temporary_password: temporaryPassword,
      note: 'Please change your password after logging in. In production, this would be sent via email.'
    });
  } catch (error) {
    console.error('Student password reset error:', error);
    res.status(500).json({ error: 'Failed to reset password' });
  }
};

// Request password reset (lecturer)
const requestLecturerPasswordReset = async (req, res) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({ error: 'Email is required' });
    }

    const trimmedEmail = email.trim();

    // Find lecturer by email
    const user = await User.findByEmail(trimmedEmail);
    
    if (!user) {
      return res.status(404).json({ error: 'Lecturer not found' });
    }

    if (user.role !== 'lecturer' && user.role !== 'instructor') {
      return res.status(400).json({ error: 'User is not a lecturer' });
    }

    if (user.status !== 'active') {
      return res.status(403).json({ error: 'Account is not active. Please contact administration.' });
    }

    // Generate temporary password
    const temporaryPassword = Math.random().toString(36).slice(-8) + Math.random().toString(36).slice(-4);
    
    // Hash temporary password
    const hashedPassword = bcrypt.hashSync(temporaryPassword, 10);

    // Update password
    await User.update(user.id, { password: hashedPassword });

    // NOTE: In production with email infrastructure, send this temporary password via email
    // For now, return it in the response (not ideal but functional without email)
    res.json({
      message: 'Password reset successful',
      temporary_password: temporaryPassword,
      note: 'Please change your password after logging in. In production, this would be sent via email.'
    });
  } catch (error) {
    console.error('Lecturer password reset error:', error);
    res.status(500).json({ error: 'Failed to reset password' });
  }
};

// Verify email
const verifyEmail = async (req, res) => {
  try {
    const { token } = req.query;

    if (!token) {
      return res.status(400).json({ error: 'Verification token is required' });
    }

    // Find user by verification token
    const { data: users } = await require('../config/supabase')
      .from('users')
      .select('*')
      .eq('verification_token', token)
      .single();

    if (!users) {
      return res.status(400).json({ error: 'Invalid verification token' });
    }

    // Check if token is expired
    if (users.verification_token_expires && new Date(users.verification_token_expires) < new Date()) {
      return res.status(400).json({ error: 'Verification token has expired' });
    }

    // Mark email as verified and clear token
    await require('../config/supabase')
      .from('users')
      .update({ 
        email_verified: true,
        verification_token: null,
        verification_token_expires: null
      })
      .eq('id', users.id);

    res.json({ message: 'Email verified successfully. You can now log in.' });
  } catch (error) {
    console.error('Verify email error:', error);
    res.status(500).json({ error: 'Failed to verify email' });
  }
};

// Resend verification email
const resendVerificationEmail = async (req, res) => {
  try {
    const user = await User.findById(req.user.id);
    
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    if (!user.email) {
      return res.status(400).json({ error: 'No email address associated with this account' });
    }

    if (user.email_verified) {
      return res.status(400).json({ error: 'Email is already verified' });
    }

    // Generate new verification token
    const verificationToken = generateEmailToken();
    const verificationTokenExpires = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours

    // Update user with new token
    await User.update(user.id, {
      verification_token: verificationToken,
      verification_token_expires: verificationTokenExpires
    });

    // Send verification email
    const emailSent = await sendVerificationEmail(user.email, verificationToken);

    if (emailSent) {
      res.json({ message: 'Verification email sent successfully' });
    } else {
      res.status(500).json({ error: 'Failed to send verification email' });
    }
  } catch (error) {
    console.error('Resend verification email error:', error);
    res.status(500).json({ error: 'Failed to resend verification email' });
  }
};

// Request password reset (generic)
const requestPasswordReset = async (req, res) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({ error: 'Email is required' });
    }

    const trimmedEmail = email.trim();

    // Find user by email (don't reveal if email exists or not)
    const user = await User.findByEmail(trimmedEmail);
    
    if (!user) {
      // Return generic message for security
      return res.json({ message: 'If an account exists for that email address, a password reset link has been sent.' });
    }

    if (user.status !== 'active') {
      return res.json({ message: 'If an account exists for that email address, a password reset link has been sent.' });
    }

    // Generate reset token
    const resetToken = generateEmailToken();
    const resetTokenExpires = new Date(Date.now() + 60 * 60 * 1000); // 1 hour

    // Update user with reset token
    await User.update(user.id, {
      reset_password_token: resetToken,
      reset_password_expires: resetTokenExpires
    });

    // Send password reset email
    await sendPasswordResetEmail(trimmedEmail, resetToken);

    // Always return generic message for security
    res.json({ message: 'If an account exists for that email address, a password reset link has been sent.' });
  } catch (error) {
    console.error('Request password reset error:', error);
    // Still return generic message for security
    res.json({ message: 'If an account exists for that email address, a password reset link has been sent.' });
  }
};

// Reset password with token
const resetPassword = async (req, res) => {
  try {
    const { token, new_password, confirm_password } = req.body;

    if (!token || !new_password || !confirm_password) {
      return res.status(400).json({ error: 'Token, new password, and confirm password are required' });
    }

    if (new_password !== confirm_password) {
      return res.status(400).json({ error: 'Passwords do not match' });
    }

    if (new_password.length < 6) {
      return res.status(400).json({ error: 'Password must be at least 6 characters' });
    }

    // Find user by reset token
    const { data: users } = await require('../config/supabase')
      .from('users')
      .select('*')
      .eq('reset_password_token', token)
      .single();

    if (!users) {
      return res.status(400).json({ error: 'Invalid or expired reset token' });
    }

    // Check if token is expired
    if (users.reset_password_expires && new Date(users.reset_password_expires) < new Date()) {
      return res.status(400).json({ error: 'Reset token has expired' });
    }

    // Hash new password
    const hashedPassword = bcrypt.hashSync(new_password, 10);

    // Update password and clear reset token
    await require('../config/supabase')
      .from('users')
      .update({ 
        password: hashedPassword,
        reset_password_token: null,
        reset_password_expires: null
      })
      .eq('id', users.id);

    res.json({ message: 'Password reset successfully. You can now log in with your new password.' });
  } catch (error) {
    console.error('Reset password error:', error);
    res.status(500).json({ error: 'Failed to reset password' });
  }
};

module.exports = {
  adminLogin,
  lecturerLogin,
  studentLogin,
  getProfile,
  getProfilePicture,
  updateProfile,
  changePassword,
  requestStudentPasswordReset,
  requestLecturerPasswordReset,
  verifyEmail,
  resendVerificationEmail,
  requestPasswordReset,
  resetPassword
};
