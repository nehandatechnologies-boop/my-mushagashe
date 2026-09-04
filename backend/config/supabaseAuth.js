const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.SUPABASE_URL || 'https://krenyvbcwtbwcsrpiryf.supabase.co';
const supabaseAnonKey = process.env.SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImtyZW55dmJjd3Rid2NzcnBpcnlmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODU2NDYxMDgsImV4cCI6MjEwMTIyMjEwOH0.ePaoY-bRwmRFo2Rd2eA_XY_EllShPtC178eyUXnUl-I';
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

// Regular Supabase client for database operations (uses anon key)
const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  db: {
    schema: 'public'
  },
  realtime: false,
  global: {
    headers: {
      'X-Client-Info': 'vocational-portal'
    }
  }
});

// Supabase Auth client with service role key for admin operations
// This allows bypassing email confirmation and creating users programmatically
let supabaseAdmin = null;

if (supabaseServiceRoleKey) {
  supabaseAdmin = createClient(supabaseUrl, supabaseServiceRoleKey, {
    db: {
      schema: 'public'
    },
    realtime: false,
    global: {
      headers: {
        'X-Client-Info': 'vocational-portal-admin'
      }
    }
  });
  console.log('Supabase Admin client initialized with service role key');
} else {
  console.warn('SUPABASE_SERVICE_ROLE_KEY not configured. Admin operations will not be available.');
}

module.exports = {
  supabase,
  supabaseAdmin,
  hasAdminAccess: !!supabaseAdmin
};
