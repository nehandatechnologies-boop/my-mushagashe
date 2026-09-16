/**
 * Test Excel import path with gender and intake
 */

const User = require('./models/User');
const Intake = require('./models/Intake');
const Course = require('./models/Course');

async function testExcelImportPath() {
  console.log('=== TESTING EXCEL IMPORT PATH ===\n');

  // Simulate Excel row data
  const excelRow = {
    'FULL NAME': 'TEST EXCEL IMPORT STUDENT',
    'STUDENT NUMBER': 'TEST-EXCEL-001',
    'GENDER': 'FEMALE',
    'COURSE CODE': 'CLOTH1',
    'INTAKE': 'JANUARY 2025'
  };

  console.log('1. EXCEL ROW DATA:');
  console.log(JSON.stringify(excelRow, null, 2));

  // Load production data
  console.log('\n2. LOADING PRODUCTION DATA...');
  const allIntakes = await Intake.findAll({});
  const allCourses = await Course.findAll({});

  console.log('Available intakes:', allIntakes.map(i => `${i.name} (id=${i.id})`));
  console.log('Available courses:', allCourses.map(c => `${c.course_code} (id=${c.id})`));

  // Course resolution (as importer does)
  console.log('\n3. COURSE RESOLUTION:');
  const courseCode = excelRow['COURSE CODE']?.toString().trim();
  const courseMatch = allCourses.find(c =>
    c.course_code && c.course_code.toUpperCase() === courseCode.toUpperCase()
  );
  console.log('Course code:', courseCode);
  console.log('Matched course:', courseMatch ? `${courseMatch.course_name} (id=${courseMatch.id})` : 'NOT FOUND');

  // Intake resolution (as importer does)
  console.log('\n4. INTAKE RESOLUTION:');
  const intakeName = excelRow['INTAKE']?.toString().trim();
  const normalizedIntake = intakeName?.toString().trim().toUpperCase();
  const intakeMatch = allIntakes.find(i =>
    i.name && i.name.toUpperCase() === normalizedIntake
  );
  console.log('Intake name:', intakeName);
  console.log('Matched intake:', intakeMatch ? `${intakeMatch.name} (id=${intakeMatch.id})` : 'NOT FOUND');

  // Gender normalization (as importer does)
  console.log('\n5. GENDER NORMALIZATION:');
  const rawGender = excelRow['GENDER']?.toString().trim();
  const normalizedGender = rawGender?.toString().trim().toLowerCase();
  console.log('Raw gender:', rawGender);
  console.log('Normalized gender:', normalizedGender);

  // Prepare student data (as importer does)
  const studentData = {
    full_name: excelRow['FULL NAME']?.toString().trim(),
    student_number: excelRow['STUDENT NUMBER']?.toString().trim(),
    course_id: courseMatch ? courseMatch.id : null,
    intake: intakeMatch ? intakeMatch.id : null,
    intake_year: intakeMatch ? intakeMatch.year : null,
    gender: normalizedGender,
    role: 'student',
    status: 'active'
  };

  console.log('\n6. STUDENT DATA BEFORE USER.UPSERT:');
  console.log(JSON.stringify({
    student_number: studentData.student_number,
    full_name: studentData.full_name,
    gender: studentData.gender,
    intake: studentData.intake,
    intake_year: studentData.intake_year,
    course_id: studentData.course_id
  }, null, 2));

  // Call upsertByStudentNumber
  console.log('\n7. CALLING USER.UPSERTBYSTUDENTNUMBER...');
  try {
    const result = await User.upsertByStudentNumber(studentData);
    console.log('Upsert result:', JSON.stringify({
      action: result.action,
      id: result.id,
      student_number: result.student_number,
      full_name: result.full_name,
      gender: result.gender,
      intake: result.intake,
      intake_year: result.intake_year,
      course_id: result.course_id
    }, null, 2));

    // Verify in Supabase
    console.log('\n8. VERIFYING SUPABASE UPSERT:');
    const { data: dbStudent, error: dbError } = await require('./config/supabase')
      .from('users')
      .select('id, student_number, full_name, gender, intake, intake_year, course_id')
      .eq('student_number', 'TEST-EXCEL-001')
      .single();

    if (dbError) {
      console.error('Database query error:', dbError);
    } else {
      console.log('Supabase record:', JSON.stringify(dbStudent, null, 2));
    }

    // Test API response
    console.log('\n9. TESTING API RESPONSE:');
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
    console.log('\n10. CLEANING UP TEST STUDENT...');
    await require('./config/supabase')
      .from('users')
      .delete()
      .eq('student_number', 'TEST-EXCEL-001');
    console.log('Test student deleted');

  } catch (error) {
    console.error('Error:', error.message);
    console.error('Stack:', error.stack);
  }

  console.log('\n=== TEST COMPLETE ===');
}

testExcelImportPath().catch(console.error);
