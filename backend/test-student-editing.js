/**
 * Test student editing with intake change
 */

const User = require('./models/User');
const Intake = require('./models/Intake');
const bcrypt = require('bcryptjs');

async function testStudentEditing() {
  console.log('=== TESTING STUDENT EDITING WITH INTAKE CHANGE ===\n');

  // First create a test student
  console.log('1. CREATING TEST STUDENT...');
  const allIntakes = await Intake.findAll({});
  const firstIntake = allIntakes[0];

  const createData = {
    full_name: 'TEST EDIT STUDENT',
    student_number: 'TEST-EDIT-001',
    email: 'testedit@example.com',
    password: bcrypt.hashSync('password123', 10),
    role: 'student',
    gender: 'female',
    intake: firstIntake.id,
    intake_year: firstIntake.year,
    course_id: 15,
    status: 'active'
  };

  const createdStudent = await User.create(createData);
  console.log('Created student:', JSON.stringify({
    id: createdStudent.id,
    student_number: createdStudent.student_number,
    intake: createdStudent.intake,
    intake_year: createdStudent.intake_year
  }, null, 2));

  // Simulate frontend sending intake text for update
  console.log('\n2. SIMULATING FRONTEND UPDATE REQUEST...');
  const updateRequest = {
    full_name: 'TEST EDIT STUDENT UPDATED',
    intake: 'MAY 2026', // Frontend sends text
    course_id: 15
  };

  console.log('Frontend update data:', JSON.stringify(updateRequest, null, 2));

  // Resolve intake (exactly as controller does)
  console.log('\n3. RESOLVING INTAKE FOR UPDATE...');
  const normalizedIntake = updateRequest.intake.toString().trim().toUpperCase();
  const matchedIntake = allIntakes.find(i =>
    i.name && i.name.toUpperCase() === normalizedIntake
  );

  let resolvedIntakeId = null;
  let resolvedIntakeYear = null;

  if (matchedIntake) {
    resolvedIntakeId = matchedIntake.id;
    resolvedIntakeYear = matchedIntake.year;
    console.log('Resolved intake:', { text: updateRequest.intake, id: resolvedIntakeId, year: resolvedIntakeYear });
  } else {
    console.log('Could not resolve intake:', updateRequest.intake);
  }

  // Prepare update data (exactly as controller does)
  const updateData = {
    full_name: updateRequest.full_name,
    intake: resolvedIntakeId,
    intake_year: resolvedIntakeYear,
    course_id: updateRequest.course_id
  };

  console.log('\n4. UPDATE DATA BEFORE USER.UPDATE:');
  console.log(JSON.stringify({
    intake: updateData.intake,
    intake_year: updateData.intake_year
  }, null, 2));

  // Update student
  console.log('\n5. CALLING USER.UPDATE...');
  const updatedStudent = await User.update(createdStudent.id, updateData);
  console.log('Update result:', JSON.stringify({
    id: updatedStudent.id,
    student_number: updatedStudent.student_number,
    full_name: updatedStudent.full_name,
    intake: updatedStudent.intake,
    intake_year: updatedStudent.intake_year
  }, null, 2));

  // Verify in database
  console.log('\n6. VERIFYING IN DATABASE...');
  const { data: dbStudent, error: dbError } = await require('./config/supabase')
    .from('users')
    .select('id, student_number, full_name, gender, intake, intake_year, course_id')
    .eq('student_number', 'TEST-EDIT-001')
    .single();

  if (dbError) {
    console.error('Database query error:', dbError);
  } else {
    console.log('Database record:', JSON.stringify(dbStudent, null, 2));
  }

  // Test API response
  console.log('\n7. TESTING API RESPONSE...');
  const apiStudent = await User.findById(updatedStudent.id);
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
    .eq('student_number', 'TEST-EDIT-001');
  console.log('Test student deleted');

  console.log('\n=== TEST COMPLETE ===');
}

testStudentEditing().catch(console.error);
