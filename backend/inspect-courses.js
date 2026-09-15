require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.SUPABASE_URL || 'https://krenyvbcwtbwcsrpiryf.supabase.co';
const supabaseKey = process.env.SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImtyZW55dmJjd3Rid2NzcnBpcnlmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODU2NDYxMDgsImV4cCI6MjEwMTIyMjEwOH0.ePaoY-bRwmRFo2Rd2eA_XY_EllShPtC178eyUXnUl-I';

const supabase = createClient(supabaseUrl, supabaseKey);

async function inspectCourses() {
  console.log('=== PRODUCTION COURSES TABLE ===\n');

  try {
    const { data: courses, error } = await supabase
      .from('courses')
      .select('id, course_code, course_name')
      .order('id');

    if (error) {
      console.error('Error fetching courses:', error);
      process.exit(1);
    }

    console.log('ID | COURSE_CODE | COURSE_NAME');
    console.log('---|-------------|' + '-'.repeat(50));

    courses.forEach(course => {
      const id = String(course.id).padEnd(2);
      const code = (course.course_code || 'NULL').padEnd(12);
      const name = course.course_name || 'NULL';
      console.log(`${id} | ${code} | ${name}`);
    });

    console.log(`\nTotal courses: ${courses.length}`);

    // Test TOUR1 lookup
    console.log('\n=== TESTING TOUR1 LOOKUP ===\n');

    const TOUR1Course = courses.find(c => c.course_code === 'TOUR1');

    if (TOUR1Course) {
      console.log('✓ TOUR1 found in courses table:');
      console.log(`  ID: ${TOUR1Course.id}`);
      console.log(`  COURSE_CODE: ${TOUR1Course.course_code}`);
      console.log(`  COURSE_NAME: ${TOUR1Course.course_name}`);
      console.log(`\nExpected flow: Excel "TOUR1" → courses.course_code = "TOUR1" → courses.id = ${TOUR1Course.id} → users.course_id = ${TOUR1Course.id}`);
    } else {
      console.log('✗ TOUR1 NOT found in courses table');
      console.log('Available course codes:', courses.map(c => c.course_code).filter(c => c).join(', '));
    }

  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
}

inspectCourses();
