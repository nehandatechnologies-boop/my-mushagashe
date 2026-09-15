require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.SUPABASE_URL || 'https://krenyvbcwtbwcsrpiryf.supabase.co';
const supabaseKey = process.env.SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImtyZW55dmJjd3Rid2NzcnBpcnlmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODU2NDYxMDgsImV4cCI6MjEwMTIyMjEwOH0.ePaoY-bRwmRFo2Rd2eA_XY_EllShPtC178eyUXnUl-I';

const supabase = createClient(supabaseUrl, supabaseKey);

async function inspectCoursesSchema() {
  console.log('=== PRODUCTION COURSES TABLE SCHEMA ===\n');
  
  try {
    // Get all columns from courses table
    const { data: columns, error } = await supabase
      .rpc('get_table_columns', { table_name: 'courses' });
    
    if (error) {
      console.log('RPC not available, trying direct query...');
      
      // Try direct select to see what columns exist
      const { data: courses, error: selectError } = await supabase
        .from('courses')
        .select('*')
        .limit(1);
      
      if (selectError) {
        console.error('Error fetching courses:', selectError);
        process.exit(1);
      }
      
      if (courses && courses.length > 0) {
        console.log('Columns found in courses table:');
        Object.keys(courses[0]).forEach(key => {
          console.log(`  - ${key}`);
        });
        
        console.log('\nSample course data:');
        console.log(JSON.stringify(courses[0], null, 2));
      } else {
        console.log('No courses found in table');
      }
      
      return;
    }
    
    console.log('Columns:', columns);
    
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
}

inspectCoursesSchema();
