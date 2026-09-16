/**
 * Test script to trace gender and intake data flow
 * This will test one student through the entire pipeline
 */

const supabase = require('./config/supabase');
const Course = require('./models/Course');
const Intake = require('./models/Intake');
const User = require('./models/User');

async function testGenderIntakeFlow() {
  console.log('=== TESTING GENDER/INTAKE DATA FLOW ===\n');

  // Test data from Excel
  const testStudent = {
    full_name: 'GRACE MURINDI',
    student_number: '2026-015',
    gender: 'FEMALE',
    course_code: 'CLOTH1',
    intake: 'JANUARY 2025'
  };

  console.log('1. EXCEL INPUT:');
  console.log(JSON.stringify(testStudent, null, 2));

  // Normalize gender
  const normalizeGender = (value) => {
    if (!value) return null;
    const normalized = value.toString().trim().toUpperCase();
    if (['MALE', 'M'].includes(normalized)) return 'male';
    if (['FEMALE', 'F'].includes(normalized)) return 'female';
    return null;
  };

  const normalizedGender = normalizeGender(testStudent.gender);
  console.log('\n2. NORMALIZED GENDER:');
  console.log(`   Raw: "${testStudent.gender}" → Normalized: "${normalizedGender}"`);

  // Load courses and intakes
  console.log('\n3. LOADING COURSES AND INTAKES...');
  const allCourses = await Course.findAll({});
  const allIntakes = await Intake.findAll({});
  console.log(`   Loaded ${allCourses.length} courses and ${allIntakes.length} intakes`);

  // Match course
  const courseMatch = allCourses.find(c => c.course_code === testStudent.course_code);
  console.log('\n4. COURSE MATCH:');
  console.log(`   Excel: "${testStudent.course_code}"`);
  console.log(`   Matched: ${courseMatch ? `${courseMatch.course_name} (id=${courseMatch.id})` : 'NOT FOUND'}`);

  // Match intake
  const normalizeIntake = (value) => {
    if (!value) return null;
    return value.toString().trim();
  };

  const normalizedIntake = normalizeIntake(testStudent.intake);
  console.log('\n5. NORMALIZED INTAKE:');
  console.log(`   Raw: "${testStudent.intake}" → Normalized: "${normalizedIntake}"`);

  const intakeMatch = allIntakes.find(i => i.name === normalizedIntake);
  console.log('\n6. INTAKE MATCH:');
  console.log(`   Excel: "${normalizedIntake}"`);
  console.log(`   Matched: ${intakeMatch ? `${intakeMatch.name} (id=${intakeMatch.id}, year=${intakeMatch.year})` : 'NOT FOUND'}`);

  // Build student data object
  const studentData = {
    full_name: testStudent.full_name,
    student_number: testStudent.student_number,
    gender: normalizedGender,
    course_id: courseMatch ? courseMatch.id : null,
    intake: intakeMatch ? intakeMatch.id : null,
    intake_year: intakeMatch ? intakeMatch.year : null,
    role: 'student',
    status: 'active'
  };

  console.log('\n7. STUDENT DATA OBJECT (Before Supabase):');
  console.log(JSON.stringify(studentData, null, 2));

  // Check existing student
  console.log('\n8. CHECKING EXISTING STUDENT...');
  const existingStudent = await User.findByStudentNumber(testStudent.student_number);
  console.log(`   Found: ${existingStudent ? 'YES' : 'NO'}`);
  if (existingStudent) {
    console.log('   Current values:', JSON.stringify({
      id: existingStudent.id,
      gender: existingStudent.gender,
      intake: existingStudent.intake,
      intake_year: existingStudent.intake_year,
      course_id: existingStudent.course_id
    }, null, 2));
  }

  // Perform upsert
  console.log('\n9. PERFORMING UPSERT...');
  try {
    const result = await User.upsertByStudentNumber(studentData);
    console.log('   Upsert result:', JSON.stringify({
      action: result.action,
      id: result.id,
      gender: result.gender,
      intake: result.intake,
      intake_year: result.intake_year,
      course_id: result.course_id
    }, null, 2));
  } catch (error) {
    console.error('   Upsert failed:', error.message);
  }

  // Verify database state
  console.log('\n10. VERIFYING DATABASE STATE...');
  const { data: finalRecord, error: finalError } = await supabase
    .from('users')
    .select('id, student_number, full_name, gender, intake, intake_year, course_id')
    .eq('student_number', testStudent.student_number)
    .single();

  if (finalError) {
    console.error('   Database query error:', finalError);
  } else {
    console.log('   Final database record:', JSON.stringify(finalRecord, null, 2));
  }

  console.log('\n=== TEST COMPLETE ===');
}

testGenderIntakeFlow().catch(console.error);
