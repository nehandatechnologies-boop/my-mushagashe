/**
 * Test C - Re-upload same file (verify no duplicates)
 */

const XLSX = require('xlsx');
const User = require('./models/User');
const Intake = require('./models/Intake');
const Course = require('./models/Course');

async function testReuploadSameFile() {
  console.log('=== TEST C - RE-UPLOAD SAME FILE ===\n');

  try {
    const workbook = XLSX.readFile('test_students.xlsx');
    const sheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[sheetName];
    const data = XLSX.utils.sheet_to_json(worksheet);

    const firstRow = data[0];
    const studentNumber = firstRow['STUDENT NUMBER']?.toString().trim();

    console.log('1. INITIAL STUDENT DATA:');
    console.log('Student number:', studentNumber);
    console.log('Student name:', firstRow['FULL NAME']);

    // Load production data
    const allIntakes = await Intake.findAll({});
    const allCourses = await Course.findAll({});

    // First import
    console.log('\n2. FIRST IMPORT:');
    const courseMatch = allCourses.find(c =>
      c.course_code && c.course_code.toUpperCase() === firstRow['COURSE CODE'].toUpperCase()
    );

    const intakeMatch = allIntakes.find(i =>
      i.name && i.name.toUpperCase() === firstRow['INTAKE'].toUpperCase()
    );

    const studentData = {
      full_name: firstRow['FULL NAME']?.toString().trim(),
      student_number: studentNumber,
      gender: firstRow['GENDER']?.toString().trim().toLowerCase(),
      course_id: courseMatch ? courseMatch.id : null,
      intake: intakeMatch ? intakeMatch.id : null,
      intake_year: intakeMatch ? intakeMatch.year : null,
      role: 'student',
      status: 'active'
    };

    const firstResult = await User.upsertByStudentNumber(studentData);
    console.log('First import result:', firstResult.action, 'id:', firstResult.id);

    // Count students before second import
    const { data: studentsBeforeSecond } = await require('./config/supabase')
      .from('users')
      .select('id, student_number')
      .eq('student_number', studentNumber);
    console.log('Students with this number before second import:', studentsBeforeSecond.length);

    // Second import (same data)
    console.log('\n3. SECOND IMPORT (same data):');
    const secondResult = await User.upsertByStudentNumber(studentData);
    console.log('Second import result:', secondResult.action, 'id:', secondResult.id);

    // Count students after second import
    const { data: studentsAfterSecond } = await require('./config/supabase')
      .from('users')
      .select('id, student_number')
      .eq('student_number', studentNumber);
    console.log('Students with this number after second import:', studentsAfterSecond.length);

    // Verify no duplicates
    console.log('\n4. DUPLICATE CHECK:');
    console.log('Same student ID:', firstResult.id === secondResult.id);
    console.log('No duplicates created:', studentsAfterSecond.length === 1);
    console.log('Student IDs:', studentsAfterSecond.map(s => s.id));

    // Verify database state
    const { data: finalStudent } = await require('./config/supabase')
      .from('users')
      .select('id, student_number, full_name, gender, intake, intake_year')
      .eq('student_number', studentNumber)
      .single();
    console.log('Final database state:', JSON.stringify(finalStudent, null, 2));

    // Clean up
    console.log('\n5. CLEANING UP TEST STUDENT...');
    await require('./config/supabase')
      .from('users')
      .delete()
      .eq('student_number', studentNumber);
    console.log('Test student deleted');

    console.log('\n=== TEST C COMPLETE ===');

  } catch (error) {
    console.error('Error:', error.message);
    console.error('Stack:', error.stack);
  }
}

testReuploadSameFile().catch(console.error);
