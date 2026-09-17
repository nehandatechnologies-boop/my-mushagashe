/**
 * Test Excel import with actual test file
 */

const XLSX = require('xlsx');
const User = require('./models/User');
const Intake = require('./models/Intake');
const Course = require('./models/Course');

async function testExcelImport() {
  console.log('=== TESTING EXCEL IMPORT WITH ACTUAL FILE ===\n');

  try {
    const workbook = XLSX.readFile('test_students.xlsx');
    const sheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[sheetName];
    const data = XLSX.utils.sheet_to_json(worksheet);

    console.log('1. EXCEL FILE ANALYSIS:');
    console.log('Total rows:', data.length);
    console.log('Headers:', Object.keys(data[0]));

    // Load production data
    const allIntakes = await Intake.findAll({});
    const allCourses = await Course.findAll({});

    console.log('\n2. PRODUCTION DATA:');
    console.log('Available intakes:', allIntakes.map(i => `${i.name} (id=${i.id}, year=${i.year})`));
    console.log('Available courses:', allCourses.map(c => `${c.course_code} (id=${c.id})`));

    // Process first row as test
    const firstRow = data[0];
    console.log('\n3. FIRST ROW DATA:');
    console.log(JSON.stringify(firstRow, null, 2));

    // Normalize data (as importer does)
    const normalizeGender = (gender) => {
      if (!gender) return null;
      const normalized = gender.toString().trim().toLowerCase();
      if (normalized === 'male' || normalized === 'm') return 'male';
      if (normalized === 'female' || normalized === 'f') return 'female';
      return normalized;
    };

    const rawGender = firstRow['GENDER']?.toString().trim();
    const normalizedGender = normalizeGender(rawGender);

    const rawCourseCode = firstRow['COURSE CODE']?.toString().trim();
    const courseMatch = allCourses.find(c =>
      c.course_code && c.course_code.toUpperCase() === rawCourseCode.toUpperCase()
    );

    // Handle INTAKE column
    const rawIntakeName = firstRow['INTAKE']?.toString().trim();
    const rawIntakeYear = firstRow['INTAKE YEAR']?.toString().trim();

    console.log('\n4. INTAKE DATA PROCESSING:');
    console.log('rawIntakeName:', rawIntakeName);
    console.log('rawIntakeYear:', rawIntakeYear, typeof rawIntakeYear);

    let intakeMatch = null;

    if (rawIntakeName) {
      intakeMatch = allIntakes.find(i =>
        i.name && i.name.toUpperCase() === rawIntakeName.toUpperCase()
      );
    console.log('Matched by name:', intakeMatch ? intakeMatch.name : 'no match');
    } else if (rawIntakeYear) {
      let intakeYear = null;
      if (rawIntakeYear instanceof Date) {
        intakeYear = rawIntakeYear.getFullYear();
      } else if (!isNaN(Date.parse(rawIntakeYear))) {
        intakeYear = new Date(rawIntakeYear).getFullYear();
      } else if (!isNaN(parseInt(rawIntakeYear))) {
        intakeYear = parseInt(rawIntakeYear);
      }

      console.log('Extracted intake year:', intakeYear);

      if (intakeYear) {
        intakeMatch = allIntakes.find(i => i.year === intakeYear);
      console.log('Matched by year:', intakeMatch ? intakeMatch.name : 'no match');
      }
    }

    const studentData = {
      full_name: firstRow['FULL NAME']?.toString().trim(),
      student_number: firstRow['STUDENT NUMBER']?.toString().trim(),
      gender: normalizedGender,
      course_id: courseMatch ? courseMatch.id : null,
      intake: intakeMatch ? intakeMatch.id : null,
      intake_year: intakeMatch ? intakeMatch.year : null,
      role: 'student',
      status: 'active'
    };

    console.log('\n5. STUDENT DATA BEFORE UPSERT:');
    console.log(JSON.stringify({
      student_number: studentData.student_number,
      full_name: studentData.full_name,
      gender: studentData.gender,
      intake: studentData.intake,
      intake_year: studentData.intake_year,
      course_id: studentData.course_id
    }, null, 2));

    // Import using upsert
    console.log('\n6. CALLING USER.UPSERTBYSTUDENTNUMBER:');
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
    console.log('\n7. SUPABASE VERIFICATION:');
    const { data: dbStudent, error: dbError } = await require('./config/supabase')
      .from('users')
      .select('id, student_number, full_name, gender, intake, intake_year, course_id')
      .eq('student_number', studentData.student_number)
      .single();

    if (dbError) {
      console.error('Database query error:', dbError);
    } else {
      console.log('Database record:', JSON.stringify(dbStudent, null, 2));
    }

    // Test API response
    console.log('\n8. API RESPONSE TEST:');
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
    console.log('\n9. CLEANING UP TEST STUDENT...');
    await require('./config/supabase')
      .from('users')
      .delete()
      .eq('student_number', studentData.student_number);
    console.log('Test student deleted');

    console.log('\n=== EXCEL IMPORT TEST COMPLETE ===');

  } catch (error) {
    console.error('Error:', error.message);
    console.error('Stack:', error.stack);
  }
}

testExcelImport().catch(console.error);
