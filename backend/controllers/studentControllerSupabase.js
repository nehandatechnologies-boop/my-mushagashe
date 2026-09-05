const { supabase, supabaseAdmin } = require('../config/supabaseAuth');
const User = require('../models/User');
const { isValidIntake, extractYearFromIntake } = require('../config/intakeConfig');

// Student registration with Supabase Auth
const registerStudentSupabase = async (req, res) => {
  try {
    console.log('[Student Registration] Request received');
    
    const {
      full_name, student_number, email, password, phone, gender,
      national_id, date_of_birth, address, guardian_name, guardian_phone,
      intake, course_id
    } = req.body;

    console.log('[Student Registration] Email:', email ? 'provided' : 'not provided');
    console.log('[Student Registration] Student number:', student_number);
    console.log('[Student Registration] Intake:', intake || 'not provided');

    // Validation
    if (!full_name || !student_number || !password) {
      console.log('[Student Registration] Validation failed: missing required fields');
      return res.status(400).json({ error: 'Full name, student number, and password are required' });
    }

    if (password.length < 6) {
      console.log('[Student Registration] Validation failed: password too short');
      return res.status(400).json({ error: 'Password must be at least 6 characters' });
    }

    // Validate intake format if provided
    if (intake && !isValidIntake(intake)) {
      console.log('[Student Registration] Validation failed: invalid intake format');
      return res.status(400).json({ error: 'Invalid intake format. Please select a valid intake.' });
    }

    // Check if student number already exists in custom users table
    console.log('[Student Registration] Checking existing student number');
    const existingStudent = await User.findByStudentNumber(student_number);
    if (existingStudent) {
      console.log('[Student Registration] Student number already exists');
      return res.status(400).json({ error: 'Student number already exists' });
    }

    // Check if email already exists in custom users table
    if (email) {
      console.log('[Student Registration] Checking existing email');
      const existingEmail = await User.findByEmail(email);
      if (existingEmail) {
        console.log('[Student Registration] Email already exists');
        return res.status(400).json({ error: 'Email already exists' });
      }
    }

    // Create Supabase Auth user
    console.log('[Student Registration] Creating Supabase Auth user');
    const { data: authData, error: authError } = await supabase.auth.signUp({
      email: email || `${student_number}@mushagashe.local`,
      password: password,
      options: {
        data: {
          full_name: full_name,
          student_number: student_number,
          role: 'student'
        }
      }
    });

    if (authError) {
      console.error('[Student Registration] Supabase auth error:', authError);
      return res.status(400).json({ error: authError.message });
    }

    console.log('[Student Registration] Supabase Auth user created successfully, ID:', authData.user.id);

    // Create custom users table entry with profile data
    const userData = {
      full_name,
      student_number,
      email: email || null,
      password: null, // Password managed by Supabase Auth
      role: 'student',
      phone,
      gender,
      national_id,
      date_of_birth,
      address,
      guardian_name,
      guardian_phone,
      intake: intake || null,
      intake_year: intake ? extractYearFromIntake(intake) : null, // Keep for backward compatibility
      course_id,
      status: 'active'
    };

    // Conditionally add auth_type fields only if they exist in the database
    // This prevents 500 errors when the migration hasn't been run
    console.log('[Student Registration] Checking if auth_type column exists');
    try {
      // Try to query a user to see if auth_type column exists
      const { data: testUser, error: columnError } = await supabase
        .from('users')
        .select('auth_type')
        .limit(1);
      
      if (!columnError) {
        // Column exists, include it
        userData.auth_type = 'supabase';
        userData.supabase_user_id = authData.user.id;
        console.log('[Student Registration] auth_type column exists, including in insert');
      } else {
        console.log('[Student Registration] auth_type column does not exist, skipping');
      }
    } catch (e) {
      console.log('[Student Registration] Could not check auth_type column, skipping:', e.message);
    }

    console.log('[Student Registration] Creating user profile in database');
    const profile = await User.create(userData);
    console.log('[Student Registration] User profile created successfully, ID:', profile.id);

    res.status(201).json({
      message: 'Registration successful. Please check your email to verify your account.',
      requires_verification: true,
      email: email || null,
      user_id: profile.id
    });
  } catch (error) {
    console.error('[Student Registration] Error:', error);
    console.error('[Student Registration] Error message:', error.message);
    console.error('[Student Registration] Error stack:', error.stack);
    
    // Check for specific database errors
    if (error.message && error.message.includes('column')) {
      return res.status(500).json({ error: 'Database schema error. Please contact administrator.' });
    }
    
    if (error.message && error.message.includes('auth_type')) {
      return res.status(500).json({ error: 'Database missing auth_type column. Please run migration.' });
    }
    
    res.status(500).json({ error: 'Registration failed. Please try again.' });
  }
};

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
      status: 'active',
      auth_type: 'supabase',
      supabase_user_id: authData.user.id,
      email_verified: true // Admin-created users are auto-verified
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
  registerStudentSupabase,
  createLecturerSupabase
};
