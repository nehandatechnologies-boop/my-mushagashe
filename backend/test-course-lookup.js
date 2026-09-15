require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.SUPABASE_URL || 'https://krenyvbcwtbwcsrpiryf.supabase.co';
const supabaseKey = process.env.SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImtyZW55dmJjd3Rid2NzcnBpcnlmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODU2NDYxMDgsImV4cCI6MjEwMTIyMjEwOH0.ePaoY-bRwmRFo2Rd2eA_XY_EllShPtC178eyUXnUl-I';

const supabase = createClient(supabaseUrl, supabaseKey);

async function testCourseLookup() {
  console.log('=== TESTING COURSE LOOKUP FLOW ===\n');

  try {
    // Load all courses from production
    const { data: allCourses, error } = await supabase
      .from('courses')
      .select('id, course_code, course_name')
      .order('id');

    if (error) {
      console.error('Error fetching courses:', error);
      process.exit(1);
    }

    console.log('Loaded courses from production:', allCourses.length);

    // Simulate Excel value: TOUR1
    const excelValue = 'TOUR1';
    console.log(`\nExcel value: "${excelValue}"`);

    // PRIORITY 1: Try exact match on course code (normalized)
    const normalizedCode = excelValue.toString().trim().toUpperCase();
    console.log(`Normalized code: "${normalizedCode}"`);

    const byCode = allCourses.find(c =>
      c.course_code && c.course_code.toUpperCase() === normalizedCode
    );

    if (byCode) {
      console.log(`\n✓ MATCHED by course code:`);
      console.log(`  Excel: "${excelValue}"`);
      console.log(`  → courses.course_code = "${byCode.course_code}"`);
      console.log(`  → courses.id = ${byCode.id}`);
      console.log(`  → courses.course_name = "${byCode.course_name}"`);
      console.log(`\nExpected result: users.course_id = ${byCode.id}`);

      // Verify the lookup would work
      console.log(`\n=== VERIFICATION ===`);
      console.log(`The importer should assign: users.course_id = ${byCode.id}`);
      console.log(`This references: courses.course_code = "${byCode.course_code}"`);
      console.log(`Course name: "${byCode.course_name}"`);

      return true;
    } else {
      console.log(`\n✗ NO MATCH found for: "${excelValue}"`);
      console.log(`Available course codes:`, allCourses.map(c => c.course_code).filter(c => c).join(', '));
      return false;
    }

  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
}

testCourseLookup();
