const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseAnonKey = process.env.SUPABASE_ANON_KEY;
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

// Regular Supabase client for database operations (uses anon key)
let supabase = null;

if (supabaseUrl && supabaseAnonKey) {
  supabase = createClient(supabaseUrl, supabaseAnonKey, {
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

  console.log('[Supabase] Client initialized with URL:', supabaseUrl);
  console.log('[Supabase] Anon key present:', !!supabaseAnonKey);
} else {
  console.warn('[Supabase] SUPABASE_URL or SUPABASE_ANON_KEY not configured. Using local database only.');
}

// Supabase Auth client with service role key for admin operations
// This allows bypassing email confirmation and creating users programmatically
let supabaseAdmin = null;

if (supabaseUrl && supabaseServiceRoleKey) {
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
  console.log('[Supabase] Admin client initialized with service role key');
} else {
  console.warn('[Supabase] SUPABASE_SERVICE_ROLE_KEY not configured. Admin operations will not be available.');
}

module.exports = {
  supabase,
  supabaseAdmin,
  hasAdminAccess: !!supabaseAdmin,
  isConfigured: !!supabase
};
