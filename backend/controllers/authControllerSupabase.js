const { supabase, supabaseAdmin } = require('../config/supabaseAuth');
const User = require('../models/User');

// Student login with Supabase Auth
const studentLoginSupabase = async (req, res) => {
  try {
    const { student_number, password } = req.body;

    // Validation
    if (!student_number || !password) {
      return res.status(400).json({ error: 'Student number and password are required' });
    }

    // Find student by student number in custom users table
    const user = await User.findByStudentNumber(student_number);
    
    if (!user) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    if (user.role !== 'student') {
      return res.status(403).json({ error: 'Student access required' });
    }

    if (user.status !== 'active') {
      return res.status(403).json({ error: 'Account is not active' });
    }

    if (!user.email) {
      return res.status(400).json({ error: 'Email address required for login' });
    }

    // Sign in with Supabase Auth
    const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
      email: user.email,
      password: password
    });

    if (authError) {
      console.error('Supabase auth error:', authError);
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    // Check email confirmation
    if (!authData.user.email_confirmed_at) {
      return res.status(403). json({ 
        error: 'Your email address has not been verified yet. Please check your email and click the verification link.',
        requires_verification: true,
        email: user.email
      });
    }

    // Get profile data from custom users table
    const profile = await User.findById(user.id);
    
    const { password: _, ...userWithoutPassword } = profile;

    res.json({
      token: authData.session.access_token,
      refresh_token: authData.session.refresh_token,
      user: userWithoutPassword
    });
  } catch (error) {
    console.error('Student login error:', error);
    res.status(500).json({ error: 'Login failed' });
  }
};

// Lecturer login with Supabase Auth
const lecturerLoginSupabase = async (req, res) => {
  try {
    const { email, password } = req.body;

    // Validation
    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required' });
    }

    // Find lecturer by email in custom users table
    const user = await User.findByEmail(email);
    
    if (!user) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    if (user.role !== 'lecturer' && user.role !== 'instructor') {
      return res.status(403).json({ error: 'Lecturer access required' });
    }

    if (user.status !== 'active') {
      return res.status(403).json({ error: 'Account is not active' });
    }

    // Sign in with Supabase Auth
    const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
      email: email,
      password: password
    });

    if (authError) {
      console.error('Supabase auth error:', authError);
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    // Check email confirmation
    if (!authData.user.email_confirmed_at) {
      return res.status(403).json({ 
        error: 'Your email address has not been verified yet. Please check your email and click the verification link.',
        requires_verification: true,
        email: email
      });
    }

    // Get profile data from custom users table
    const profile = await User.findById(user.id);
    
    const { password: _, ...userWithoutPassword } = profile;

    res.json({
      token: authData.session.access_token,
      refresh_token: authData.session.refresh_token,
      user: userWithoutPassword
    });
  } catch (error) {
    console.error('Lecturer login error:', error);
    res.status(500).json({ error: 'Login failed' });
  }
};

// Admin login with Supabase Auth
const adminLoginSupabase = async (req, res) => {
  try {
    const { email, password } = req.body;

    // Validation
    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required' });
    }

    // Find admin by email in custom users table
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

    // Sign in with Supabase Auth
    const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
      email: email,
      password: password
    });

    if (authError) {
      console.error('Supabase auth error:', authError);
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    // Get profile data from custom users table
    const profile = await User.findById(user.id);
    
    const { password: _, ...userWithoutPassword } = profile;

    res.json({
      token: authData.session.access_token,
      refresh_token: authData.session.refresh_token,
      user: userWithoutPassword
    });
  } catch (error) {
    console.error('Admin login error:', error);
    res.status(500).json({ error: 'Login failed' });
  }
};

// Verify Supabase token in middleware
const verifySupabaseToken = async (token) => {
  try {
    const { data: { user }, error } = await supabase.auth.getUser(token);
    
    if (error) {
      console.error('Token verification error:', error);
      return null;
    }
    
    return user;
  } catch (error) {
    console.error('Token verification error:', error);
    return null;
  }
};

module.exports = {
  studentLoginSupabase,
  lecturerLoginSupabase,
  adminLoginSupabase,
  verifySupabaseToken
};
