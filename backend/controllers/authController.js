const bcrypt = require('bcryptjs');
const User = require('../models/User');
const { generateToken, validatePassword, isPasswordInHistory, isAccountLocked, incrementFailedAttempts, resetFailedAttempts } = require('../middleware/auth');

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

    // Check if account is locked
    if (isAccountLocked(user)) {
      return res.status(403).json({ 
        error: 'Account is temporarily locked due to multiple failed login attempts',
        locked_until: user.account_locked_until
      });
    }

    if (user.role !== 'admin' && user.role !== 'super_admin') {
      await incrementFailedAttempts(user.id);
      return res.status(403).json({ error: 'Admin access required' });
    }

    if (user.status !== 'active') {
      await incrementFailedAttempts(user.id);
      return res.status(403).json({ error: 'Account is not active' });
    }

    // Verify password
    const isPasswordValid = bcrypt.compareSync(password, user.password);
    
    if (!isPasswordValid) {
      await incrementFailedAttempts(user.id);
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    // Reset failed attempts on successful login
    await resetFailedAttempts(user.id);

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

    // Validation
    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required' });
    }

    // Find lecturer by email
    const user = await User.findByEmail(email);
    
    if (!user) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    // Check if account is locked
    if (isAccountLocked(user)) {
      return res.status(403).json({ 
        error: 'Account is temporarily locked due to multiple failed login attempts',
        locked_until: user.account_locked_until
      });
    }

    if (user.role !== 'lecturer' && user.role !== 'instructor') {
      await incrementFailedAttempts(user.id);
      return res.status(403).json({ error: 'Lecturer access required' });
    }

    if (user.status !== 'active') {
      await incrementFailedAttempts(user.id);
      return res.status(403).json({ error: 'Account is not active' });
    }

    // Verify password
    const isPasswordValid = bcrypt.compareSync(password, user.password);
    
    if (!isPasswordValid) {
      await incrementFailedAttempts(user.id);
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    // Reset failed attempts on successful login
    await resetFailedAttempts(user.id);

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

    console.log('Student login attempt:', { student_number: trimmedStudentNumber });

    // Find student by student number
    const user = await User.findByStudentNumber(trimmedStudentNumber);
    
    if (!user) {
      console.log('Student not found:', trimmedStudentNumber);
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    // Check if account is locked
    if (isAccountLocked(user)) {
      return res.status(403).json({ 
        error: 'Account is temporarily locked due to multiple failed login attempts',
        locked_until: user.account_locked_until
      });
    }

    console.log('Student found:', { id: user.id, role: user.role, status: user.status });

    if (user.role !== 'student') {
      await incrementFailedAttempts(user.id);
      return res.status(403).json({ error: 'Student access required' });
    }

    if (user.status !== 'active') {
      await incrementFailedAttempts(user.id);
      return res.status(403).json({ error: 'Account is not active' });
    }

    // Verify password
    const isPasswordValid = bcrypt.compareSync(trimmedPassword, user.password);
    
    if (!isPasswordValid) {
      console.log('Password mismatch for student:', trimmedStudentNumber);
      await incrementFailedAttempts(user.id);
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    // Reset failed attempts on successful login
    await resetFailedAttempts(user.id);

    // Generate token
    const token = generateToken(user);

    // Return user data without password
    const { password: _, ...userWithoutPassword } = user;

    console.log('Student login successful:', { id: user.id, student_number: trimmedStudentNumber });

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
    const userId = req.user.id;
    const { current_password, new_password } = req.body;

    if (!current_password || !new_password) {
      return res.status(400).json({ error: 'Current password and new password are required' });
    }

    // Validate new password complexity
    if (!validatePassword(new_password)) {
      return res.status(400).json({ 
        error: 'Password does not meet complexity requirements',
        requirements: {
          min_length: PASSWORD_MIN_LENGTH,
          require_uppercase: PASSWORD_REQUIRE_UPPERCASE,
          require_lowercase: PASSWORD_REQUIRE_LOWERCASE,
          require_numbers: PASSWORD_REQUIRE_NUMBERS,
          require_special_chars: PASSWORD_REQUIRE_SPECIAL_CHARS
        }
      });
    }

    // Get current user
    const user = await User.findById(userId);
    
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Verify current password
    const isPasswordValid = bcrypt.compareSync(current_password, user.password);
    
    if (!isPasswordValid) {
      return res.status(401).json({ error: 'Current password is incorrect' });
    }

    // Check if new password is in history (last 5 passwords)
    const isInHistory = await isPasswordInHistory(userId, new_password);
    if (isInHistory) {
      return res.status(400).json({ error: 'New password cannot be the same as any of your last 5 passwords' });
    }

    // Hash new password
    const hashedPassword = bcrypt.hashSync(new_password, 10);

    // Get current password history
    const currentHistory = user.password_history || [];
    const newPasswordHistory = [user.password, ...currentHistory].slice(0, 5); // Keep last 5 passwords

    // Update password and history
    await User.update(userId, { 
      password: hashedPassword,
      password_history: newPasswordHistory,
      last_password_change: new Date().toISOString(),
      must_change_password: false
    });

    res.json({ message: 'Password changed successfully' });
  } catch (error) {
    console.error('Change password error:', error);
    res.status(500).json({ error: 'Failed to change password' });
  }
};

module.exports = {
  adminLogin,
  lecturerLogin,
  studentLogin,
  getProfile,
  updateProfile,
  changePassword
};
