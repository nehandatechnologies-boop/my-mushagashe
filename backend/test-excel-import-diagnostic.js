/**
 * Test Excel import with actual spreadsheet structure and diagnostic logging
 */

const XLSX = require('xlsx');
const User = require('./models/User');
const Intake = require('./models/Intake');
const Course = require('./models/Course');

async function testExcelImport() {
  console.log('=== TESTING EXCEL IMPORT WITH ACTUAL STRUCTURE ===\n');

  try {
    // Simulate the actual spreadsheet structure
    const workbook = XLSX.readFile('test_students.xlsx');
    const sheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[sheetName];
    const data = XLSX.utils.sheet_to_json(worksheet);

    console.log('1. SPREADSHEET ANALYSIS:');
    console.log('Worksheet:', sheetName);
    console.log('Total rows:', data.length);
    console.log('Headers:', Object.keys(data[0]));

    // Load production data
    console.log('\n2. LOADING PRODUCTION DATA:');
    const allIntakes = await Intake.findAll({});
    const allCourses = await Course.findAll({});
    console.log('Available intakes:', allIntakes.map(i => `${i.name} (id=${i.id}, year=${i.year})`));
    console.log('Available courses:', allCourses.map(c => `${c.course_code} (id=${c.id})`));

    // Process rows
    console.log('\n3. PROCESSING ROWS:');
    const processed = [];
    const errors = [];

    for (let i = 0; i < data.length; i++) {
      const row = data[i];
      const rowNum = i + 1;

      console.log('Processing row ' + rowNum + ':', JSON.stringify({
        'FULL NAME': row['FULL NAME'],
        'STUDENT NUMBER': row['STUDENT NUMBER'],
        'GENDER': row['GENDER'],
        'COURSE CODE': row['COURSE CODE'],
        'INTAKE': row['INTAKE']
      }, null, 2));

      try {
        // Normalize gender
        const normalizeGender = (gender) => {
          if (!gender) return null;
          const normalized = gender.toString().trim().toLowerCase();
          if (normalized === 'male' || normalized === 'm') return 'male';
          if (normalized === 'female' || normalized === 'f') return 'female';
          return normalized;
        };

        const rawGender = row['GENDER']?.toString().trim();
        const normalizedGender = normalizeGender(rawGender);

        // Course resolution
        const rawCourseCode = row['COURSE CODE']?.toString().trim();
        const courseMatch = allCourses.find(c =>
          c.course_code && c.course_code.toUpperCase() === rawCourseCode.toUpperCase()
        );

        // Intake resolution
        const rawIntakeName = row['INTAKE']?.toString().trim();
        const intakeMatch = allIntakes.find(i =>
          i.name && i.name.toUpperCase() === rawIntakeName.toUpperCase()
        );

        const studentData = {
          full_name: row['FULL NAME']?.toString().trim(),
          student_number: row['STUDENT NUMBER']?.toString().trim(),
          gender: normalizedGender,
          course_id: courseMatch ? courseMatch.id : null,
          intake: intakeMatch ? intakeMatch.id : null,
          intake_year: intakeMatch ? intakeMatch.year : null,
          role: 'student',
          status: 'active'
        };

        console.log('  Student data:', JSON.stringify({
          student_number: studentData.student_number,
          gender: studentData.gender,
          course_id: studentData.course_id,
          intake: studentData.intake,
          intake_year: studentData.intake_year
        }, null, 2));

        // Test upsert
        console.log('  Calling upsertByStudentNumber...');
        const result = await User.upsertByStudentNumber(studentData);
        console.log('  Upsert result:', JSON.stringify({
          action: result.action,
          id: result.id
        }, null, 2));

        processed.push({
          row: rowNum,
          student_number: studentData.student_number,
          action: result.action
        });

      } catch (error) {
        console.error('  ERROR processing row ' + rowNum + ':', error.message);
        console.error('  ERROR stack:', error.stack);
        errors.push({
          row: rowNum,
          student_number: row['STUDENT NUMBER'],
          error: error.message
        });
      }
    }

    console.log('\n4. RESULTS:');
    console.log('Processed:', processed.length);
    console.log('Errors:', errors.length);
    console.log('Success rate:', ((processed.length - errors.length) / processed.length * 100).toFixed(2) + '%');

    if (errors.length > 0) {
      console.log('\n5. ERRORS:');
      errors.forEach(err => {
        console.log('  Row ' + err.row + ' (' + err.student_number + '):', err.error);
      });
    }

    // Clean up test data
    console.log('\n6. CLEANING UP TEST DATA...');
    for (const proc of processed) {
      await require('./config/supabase')
        .from('users')
        .delete()
        .eq('student_number', proc.student_number);
    }
    console.log('Test data cleaned up');

    console.log('\n=== EXCEL IMPORT TEST COMPLETE ===');

  } catch (error) {
    console.error('Test error:', error.message);
    console.error('Test error stack:', error.stack);
  }
}

testExcelImport().catch(console.error);
