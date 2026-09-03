const bcrypt = require('bcryptjs');
const User = require('../models/User');
const { generateToken } = require('../middleware/auth');

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

    if (new_password.length < 6) {
      return res.status(400).json({ error: 'New password must be at least 6 characters' });
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

    // Hash new password
    const hashedPassword = bcrypt.hashSync(new_password, 10);

    // Update password
    await User.update(userId, { password: hashedPassword });

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
