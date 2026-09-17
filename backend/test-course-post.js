/**
 * Test course POST functionality
 */

const Course = require('./models/Course');

async function testCoursePost() {
  console.log('=== TESTING COURSE POST ===\n');

  const testCourse = {
    course_code: 'TEST1',
    course_name: 'TEST COURSE',
    department: 'TEST DEPARTMENT',
    duration: 2,
    description: 'Test course for POST verification'
  };

  console.log('1. TEST COURSE DATA:');
  console.log(JSON.stringify(testCourse, null, 2));

  try {
    console.log('\n2. CALLING COURSE.CREATE...');
    const result = await Course.create(testCourse);
    console.log('Create result:', JSON.stringify(result, null, 2));

    // Verify in Supabase
    console.log('\n3. VERIFYING SUPABASE INSERT:');
    const { data: dbCourse, error: dbError } = await require('./config/supabase')
      .from('courses')
      .select('*')
      .eq('course_code', 'TEST1')
      .single();

    if (dbError) {
      console.error('Database query error:', dbError);
    } else {
      console.log('Database record:', JSON.stringify(dbCourse, null, 2));
    }

    // Test with-count endpoint
    console.log('\n4. TESTING GET /api/courses/with-count:');
    const coursesWithCount = await Course.getAllWithStudentCount();
    const testCourseInList = coursesWithCount.find(c => c.course_code === 'TEST1');
    console.log('Test course in with-count list:', testCourseInList ? 'YES' : 'NO');
    if (testCourseInList) {
      console.log('Test course data:', JSON.stringify(testCourseInList, null, 2));
    }

    // Clean up
    console.log('\n5. CLEANING UP TEST COURSE...');
    await require('./config/supabase')
      .from('courses')
      .delete()
      .eq('course_code', 'TEST1');
    console.log('Test course deleted');

    console.log('\n=== COURSE POST TEST COMPLETE ===');

  } catch (error) {
    console.error('Error:', error.message);
    console.error('Stack:', error.stack);
  }
}

testCoursePost().catch(console.error);
