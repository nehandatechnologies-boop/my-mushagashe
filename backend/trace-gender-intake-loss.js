/**
 * Trace gender/intake loss path with detailed logging at every stage
 */

const User = require('./models/User');
const Intake = require('./models/Intake');
const Course = require('./models/Course');
const bcrypt = require('bcryptjs');

async function traceGenderIntakeLoss() {
  console.log('=== TRACING GENDER/INTAKE LOSS PATH ===\n');

  // Simulate Excel/form input
  const input = {
    full_name: 'TRACE TEST STUDENT',
    student_number: 'TRACE-001',
    gender: 'FEMALE',
    intake_year_date: new Date('2025-01-01'), // Excel stores as date
    course_code: 'TOUR1'
  };

  console.log('1. INPUT (from Excel/form):');
  console.log(JSON.stringify(input, null, 2));

  // Stage 2: Normalization (as importer does)
  console.log('\n2. NORMALIZATION:');
  const normalizedGender = input.gender.toString().trim().toLowerCase();
  console.log('Normalized gender:', normalizedGender);

  // Excel date parsing
  const excelDate = input.intake_year_date;
  console.log('Excel intake date:', excelDate, typeof excelDate);
  const intakeYear = excelDate instanceof Date ? excelDate.getFullYear() : null;
  console.log('Extracted intake year:', intakeYear);

  // Course resolution
  console.log('\n3. COURSE RESOLUTION:');
  const allCourses = await Course.findAll({});
  const courseMatch = allCourses.find(c =>
    c.course_code && c.course_code.toUpperCase() === input.course_code.toUpperCase()
  );
  console.log('Course code:', input.course_code);
  console.log('Matched course:', courseMatch ? `${courseMatch.course_name} (id=${courseMatch.id})` : 'NOT FOUND');

  // Intake resolution
  console.log('\n4. INTAKE RESOLUTION:');
  const allIntakes = await Intake.findAll({});
  console.log('Available intakes:', allIntakes.map(i => `${i.name} (id=${i.id}, year=${i.year})`));

  // Try to match year to intake
  const matchedIntake = allIntakes.find(i => i.year === intakeYear);
  console.log('Matched intake by year:', matchedIntake ? `${matchedIntake.name} (id=${matchedIntake.id})` : 'NOT FOUND');

  const resolvedIntakeId = matchedIntake ? matchedIntake.id : null;
  const resolvedIntakeYear = matchedIntake ? matchedIntake.year : null;

  console.log('Resolved intake ID:', resolvedIntakeId);
  console.log('Resolved intake year:', resolvedIntakeYear);

  // Stage 5: Student data object (as importer does)
  const studentData = {
    full_name: input.full_name,
    student_number: input.student_number,
    gender: normalizedGender,
    intake: resolvedIntakeId,
    intake_year: resolvedIntakeYear,
    course_id: courseMatch ? courseMatch.id : null,
    role: 'student',
    status: 'active'
  };

  console.log('\n5. STUDENT DATA OBJECT (before User.upsert):');
  console.log(JSON.stringify({
    student_number: studentData.student_number,
    full_name: studentData.full_name,
    gender: studentData.gender,
    intake: studentData.intake,
    intake_year: studentData.intake_year,
    course_id: studentData.course_id
  }, null, 2));

  // Stage 6: User.upsertByStudentNumber
  console.log('\n6. CALLING USER.UPSERTBYSTUDENTNUMBER:');
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

    // Stage 7: Verify in Supabase
    console.log('\n7. SUPABASE DATABASE ROW:');
    const { data: dbStudent, error: dbError } = await require('./config/supabase')
      .from('users')
      .select('id, student_number, full_name, gender, intake, intake_year, course_id')
      .eq('student_number', 'TRACE-001')
      .single();

    if (dbError) {
      console.error('Database query error:', dbError);
    } else {
      console.log('Database record:', JSON.stringify(dbStudent, null, 2));
    }

    // Stage 8: API response
    console.log('\n8. API RESPONSE (GET /api/students simulation):');
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

    // Stage 9: Comparison
    console.log('\n9. VALUE COMPARISON:');
    console.log('Input gender:', input.gender);
    console.log('Database gender:', dbStudent.gender);
    console.log('Gender match:', input.gender.toLowerCase() === dbStudent.gender);
    console.log('');
    console.log('Input intake year:', intakeYear);
    console.log('Database intake year:', dbStudent.intake_year);
    console.log('Intake year match:', intakeYear === dbStudent.intake_year);
    console.log('');
    console.log('Input intake ID:', resolvedIntakeId);
    console.log('Database intake:', dbStudent.intake);
    console.log('Intake ID match:', resolvedIntakeId === parseInt(dbStudent.intake));

    // Clean up
    console.log('\n10. CLEANING UP TEST STUDENT...');
    await require('./config/supabase')
      .from('users')
      .delete()
      .eq('student_number', 'TRACE-001');
    console.log('Test student deleted');

  } catch (error) {
    console.error('Error:', error.message);
    console.error('Stack:', error.stack);
  }

  console.log('\n=== TRACE COMPLETE ===');
}

traceGenderIntakeLoss().catch(console.error);
