/**
 * Trace manual student creation end-to-end with detailed logging
 */

const User = require('./models/User');
const Intake = require('./models/Intake');
const bcrypt = require('bcryptjs');

async function traceManualStudentCreation() {
  console.log('=== TRACING MANUAL STUDENT CREATION END-TO-END ===\n');

  // Simulate frontend request
  const frontendRequest = {
    full_name: 'Intake Gender Test',
    student_number: 'TEST-TRACE-001',
    email: 'testtrace@example.com',
    password: 'password123',
    phone: '0771234567',
    gender: 'Female',
    intake: 'JANUARY 2025', // Text from frontend dropdown
    course_id: 15
  };

  console.log('1. FRONTEND PAYLOAD (simulated):');
  console.log(JSON.stringify(frontendRequest, null, 2));

  // Simulate backend controller reception
  console.log('\n2. BACKEND CONTROLLER RECEPTION:');
  console.log('Extracted values:', {
    intake: frontendRequest.intake,
    gender: frontendRequest.gender,
    course_id: frontendRequest.course_id
  });

  // Resolve intake (as controller does)
  console.log('\n3. INTAKE RESOLUTION IN CONTROLLER:');
  const allIntakes = await Intake.findAll({});
  console.log('Available intakes:', allIntakes.map(i => `${i.name} (id=${i.id})`));

  const normalizedIntake = frontendRequest.intake.toString().trim().toUpperCase();
  const matchedIntake = allIntakes.find(i =>
    i.name && i.name.toUpperCase() === normalizedIntake
  );

  let resolvedIntakeId = null;
  let resolvedIntakeYear = null;

  if (matchedIntake) {
    resolvedIntakeId = matchedIntake.id;
    resolvedIntakeYear = matchedIntake.year;
    console.log('Resolved intake:', { text: frontendRequest.intake, id: resolvedIntakeId, year: resolvedIntakeYear });
  } else {
    console.log('❌ Could not resolve intake:', frontendRequest.intake);
  }

  // Prepare student data for User.create
  const studentData = {
    full_name: frontendRequest.full_name,
    email: frontendRequest.email,
    student_number: frontendRequest.student_number,
    password: bcrypt.hashSync(frontendRequest.password, 10),
    role: 'student',
    phone: frontendRequest.phone,
    gender: frontendRequest.gender,
    intake: resolvedIntakeId,
    intake_year: resolvedIntakeYear,
    course_id: frontendRequest.course_id,
    status: 'active'
  };

  console.log('\n4. STUDENT DATA SENT TO USER.CREATE:');
  console.log(JSON.stringify({
    student_number: studentData.student_number,
    full_name: studentData.full_name,
    gender: studentData.gender,
    intake: studentData.intake,
    intake_year: studentData.intake_year,
    course_id: studentData.course_id
  }, null, 2));

  // Call User.create
  console.log('\n5. CALLING USER.CREATE...');
  try {
    const result = await User.create(studentData);
    console.log('User.create result:', JSON.stringify({
      id: result.id,
      student_number: result.student_number,
      full_name: result.full_name,
      gender: result.gender,
      intake: result.intake,
      intake_year: result.intake_year,
      course_id: result.course_id
    }, null, 2));

    // Verify in Supabase
    console.log('\n6. VERIFYING SUPABASE INSERT:');
    const { data: dbStudent, error: dbError } = await require('./config/supabase')
      .from('users')
      .select('id, student_number, full_name, gender, intake, intake_year, course_id')
      .eq('student_number', 'TEST-TRACE-001')
      .single();

    if (dbError) {
      console.error('Database query error:', dbError);
    } else {
      console.log('Supabase record:', JSON.stringify(dbStudent, null, 2));
    }

    // Test API response
    console.log('\n7. TESTING API RESPONSE:');
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
    console.log('\n8. CLEANING UP TEST STUDENT...');
    await require('./config/supabase')
      .from('users')
      .delete()
      .eq('student_number', 'TEST-TRACE-001');
    console.log('Test student deleted');

  } catch (error) {
    console.error('Error:', error.message);
    console.error('Stack:', error.stack);
  }

  console.log('\n=== TRACE COMPLETE ===');
}

traceManualStudentCreation().catch(console.error);
