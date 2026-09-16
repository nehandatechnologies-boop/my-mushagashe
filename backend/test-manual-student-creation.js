/**
 * Test manual student creation with intake resolution
 */

const User = require('./models/User');
const Intake = require('./models/Intake');
const Course = require('./models/Course');
const bcrypt = require('bcryptjs');

async function testManualStudentCreation() {
  console.log('=== TESTING MANUAL STUDENT CREATION WITH INTAKE ===\n');

  // Test data
  const testStudent = {
    full_name: 'TEST STUDENT MANUAL',
    student_number: 'TEST-001',
    email: 'test@example.com',
    password: 'password123',
    role: 'student',
    phone: '0771234567',
    gender: 'male',
    intake: 'JANUARY 2025', // Text intake from frontend
    course_id: 15 // CLOTHING
  };

  console.log('1. INPUT DATA FROM FRONTEND:');
  console.log(JSON.stringify(testStudent, null, 2));

  // Resolve intake (exactly as controller does)
  console.log('\n2. RESOLVING INTAKE...');
  const allIntakes = await Intake.findAll({});
  console.log('Available intakes:', allIntakes.map(i => `${i.name} (id=${i.id})`));

  const normalizedIntake = testStudent.intake.toString().trim().toUpperCase();
  const matchedIntake = allIntakes.find(i =>
    i.name && i.name.toUpperCase() === normalizedIntake
  );

  let resolvedIntakeId = null;
  let resolvedIntakeYear = null;

  if (matchedIntake) {
    resolvedIntakeId = matchedIntake.id;
    resolvedIntakeYear = matchedIntake.year;
    console.log('Resolved intake:', { text: testStudent.intake, id: resolvedIntakeId, year: resolvedIntakeYear });
  } else {
    console.log('Could not resolve intake:', testStudent.intake);
  }

  // Prepare student data for User.create (exactly as controller does)
  const studentData = {
    full_name: testStudent.full_name,
    email: testStudent.email,
    student_number: testStudent.student_number,
    password: bcrypt.hashSync(testStudent.password, 10),
    role: testStudent.role,
    phone: testStudent.phone,
    gender: testStudent.gender,
    intake: resolvedIntakeId, // Store the intake ID
    intake_year: resolvedIntakeYear, // Store the intake year
    course_id: testStudent.course_id,
    status: 'active'
  };

  console.log('\n3. STUDENT DATA BEFORE USER.CREATE:');
  console.log(JSON.stringify({
    student_number: studentData.student_number,
    full_name: studentData.full_name,
    gender: studentData.gender,
    intake: studentData.intake,
    intake_year: studentData.intake_year,
    course_id: studentData.course_id
  }, null, 2));

  // Create student
  console.log('\n4. CALLING USER.CREATE...');
  try {
    const result = await User.create(studentData);
    console.log('Create result:', JSON.stringify({
      id: result.id,
      student_number: result.student_number,
      full_name: result.full_name,
      gender: result.gender,
      intake: result.intake,
      intake_year: result.intake_year,
      course_id: result.course_id
    }, null, 2));

    // Verify in database
    console.log('\n5. VERIFYING IN DATABASE...');
    const { data: dbStudent, error: dbError } = await require('./config/supabase')
      .from('users')
      .select('id, student_number, full_name, gender, intake, intake_year, course_id')
      .eq('student_number', 'TEST-001')
      .single();

    if (dbError) {
      console.error('Database query error:', dbError);
    } else {
      console.log('Database record:', JSON.stringify(dbStudent, null, 2));
    }

    // Test API response
    console.log('\n6. TESTING API RESPONSE...');
    const apiStudent = await User.findById(result.id);
    console.log('API response:', JSON.stringify({
      student_number: apiStudent.student_number,
      full_name: apiStudent.full_name,
      gender: apiStudent.gender,
      intake: apiStudent.intake,
      intake_name: apiStudent.intake_name,
      intake_year: apiStudent.intake_year,
      course_id: apiStudent.course_id,
      course_name: apiStudent.course_name
    }, null, 2));

    // Clean up
    console.log('\n7. CLEANING UP TEST STUDENT...');
    await require('./config/supabase')
      .from('users')
      .delete()
      .eq('student_number', 'TEST-001');
    console.log('Test student deleted');

  } catch (error) {
    console.error('Error:', error.message);
    console.error('Stack:', error.stack);
  }

  console.log('\n=== TEST COMPLETE ===');
}

testManualStudentCreation().catch(console.error);
