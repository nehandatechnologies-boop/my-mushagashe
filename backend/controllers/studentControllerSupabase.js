const { supabase, supabaseAdmin } = require('../config/supabaseAuth');
const User = require('../models/User');

// Student registration with Supabase Auth - REMOVED - Admin only
// const registerStudentSupabase = async (req, res) => { ... };

// Lecturer creation with Supabase Auth (admin only)
const createLecturerSupabase = async (req, res) => {
  try {
    const {
      full_name, email, password, phone, gender, course_id
    } = req.body;

    // Validation
    if (!full_name || !email || !password || !course_id) {
      return res.status(400).json({ error: 'Full name, email, password, and course ID are required' });
    }

    if (password.length < 6) {
      return res.status(400).json({ error: 'Password must be at least 6 characters' });
    }

    // Check if email already exists in custom users table
    const existingEmail = await User.findByEmail(email);
    if (existingEmail) {
      return res.status(400).json({ error: 'Email already exists' });
    }

    // Create Supabase Auth user using admin API (bypasses email confirmation)
    if (!supabaseAdmin) {
      return res.status(500).json({ error: 'Admin operations not available. Service role key not configured.' });
    }

    const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
      email: email,
      password: password,
      email_confirm: true, // Auto-confirm for admin-created users
      user_metadata: {
        full_name: full_name,
        role: 'lecturer'
      }
    });

    if (authError) {
      console.error('Supabase admin auth error:', authError);
      return res.status(400).json({ error: authError.message });
    }

    // Create custom users table entry with profile data
    const userData = {
      full_name,
      email,
      password: null, // Password managed by Supabase Auth
      role: 'lecturer',
      phone,
      gender,
      course_id,
      status: 'active', // Admin-created accounts are active
      auth_type: 'supabase',
      supabase_user_id: authData.user.id
    };

    const profile = await User.create(userData);

    res.status(201).json({
      message: 'Lecturer created successfully',
      id: profile.id
    });
  } catch (error) {
    console.error('Create lecturer error:', error);
    if (error.message.includes('UNIQUE')) {
      return res.status(400).json({ error: 'Email already exists' });
    }
    res.status(500).json({ error: 'Failed to create lecturer' });
  }
};

module.exports = {
  createLecturerSupabase
};

