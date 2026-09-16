/**
 * Test GET /api/students response with intake mapping
 */

const User = require('./models/User');

async function testGetStudents() {
  console.log('=== TESTING GET /api/students RESPONSE ===\n');

  // Test the actual findAll method
  console.log('1. CALLING USER.FINDALL...');
  const students = await User.findAll({ role: 'student', limit: 5 });

  console.log('Number of students returned:', students.length);

  console.log('\n2. SAMPLE STUDENT DATA:');
  students.forEach((student, index) => {
    console.log(`\nStudent ${index + 1}:`);
    console.log('  student_number:', student.student_number);
    console.log('  full_name:', student.full_name);
    console.log('  gender:', student.gender);
    console.log('  intake:', student.intake);
    console.log('  intake_name:', student.intake_name);
    console.log('  intake_year:', student.intake_year);
    console.log('  course_id:', student.course_id);
    console.log('  course_name:', student.course_name);
    console.log('  course_code:', student.course_code);
  });

  console.log('\n3. CHECKING INTAKE MAPPING:');
  const studentsWithIntake = students.filter(s => s.intake);
  console.log('Students with intake:', studentsWithIntake.length);
  console.log('Students without intake:', students.length - studentsWithIntake.length);

  console.log('\n4. CHECKING GENDER MAPPING:');
  const studentsWithGender = students.filter(s => s.gender);
  console.log('Students with gender:', studentsWithGender.length);
  console.log('Students without gender:', students.length - studentsWithGender.length);

  console.log('\n=== TEST COMPLETE ===');
}

testGetStudents().catch(console.error);
