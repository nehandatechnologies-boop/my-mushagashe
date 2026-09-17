/**
 * Test import UPSERT behavior - ensure no duplicates
 */

const User = require('./models/User');
const Intake = require('./models/Intake');
const Course = require('./models/Course');

async function testImportUpsert() {
  console.log('=== TESTING IMPORT UPSERT BEHAVIOR ===\n');

  // Simulate first import
  const firstImport = {
    full_name: 'UPSERT TEST STUDENT',
    student_number: 'UPSERT-001',
    gender: 'male',
    course_code: 'TOUR1',
    intake_name: 'JANUARY 2025'
  };

  console.log('1. FIRST IMPORT:');
  console.log(JSON.stringify(firstImport, null, 2));

  // Resolve data
  const allIntakes = await Intake.findAll({});
  const allCourses = await Course.findAll({});

  const courseMatch = allCourses.find(c =>
    c.course_code && c.course_code.toUpperCase() === firstImport.course_code.toUpperCase()
  );

  const intakeMatch = allIntakes.find(i =>
    i.name && i.name.toUpperCase() === firstImport.intake_name.toUpperCase()
  );

  const studentData = {
    full_name: firstImport.full_name,
    student_number: firstImport.student_number,
    gender: firstImport.gender,
    course_id: courseMatch ? courseMatch.id : null,
    intake: intakeMatch ? intakeMatch.id : null,
    intake_year: intakeMatch ? intakeMatch.year : null,
    role: 'student',
    status: 'active'
  };

  console.log('\n2. FIRST UPSERT CALL:');
  try {
    const firstResult = await User.upsertByStudentNumber(studentData);
    console.log('First result action:', firstResult.action);
    console.log('First result id:', firstResult.id);
    console.log('First result student_number:', firstResult.student_number);

    // Verify in database
    const { data: firstDbStudent } = await require('./config/supabase')
      .from('users')
      .select('id, student_number, full_name')
      .eq('student_number', 'UPSERT-001')
      .single();
    console.log('Database after first import:', JSON.stringify(firstDbStudent, null, 2));

    // Simulate second import (same student number, different data)
    const secondImport = {
      full_name: 'UPSERT TEST STUDENT UPDATED',
      student_number: 'UPSERT-001', // Same student number
      gender: 'female', // Changed gender
      course_code: 'TOUR1',
      intake_name: 'MAY 2026' // Changed intake
    };

    console.log('\n3. SECOND IMPORT (same student number, different data):');
    console.log(JSON.stringify(secondImport, null, 2));

    const secondIntakeMatch = allIntakes.find(i =>
      i.name && i.name.toUpperCase() === secondImport.intake_name.toUpperCase()
    );

    const secondStudentData = {
      full_name: secondImport.full_name,
      student_number: secondImport.student_number,
      gender: secondImport.gender,
      course_id: courseMatch ? courseMatch.id : null,
      intake: secondIntakeMatch ? secondIntakeMatch.id : null,
      intake_year: secondIntakeMatch ? secondIntakeMatch.year : null,
      role: 'student',
      status: 'active'
    };

    console.log('\n4. SECOND UPSERT CALL:');
    const secondResult = await User.upsertByStudentNumber(secondStudentData);
    console.log('Second result action:', secondResult.action);
    console.log('Second result id:', secondResult.id);
    console.log('Second result student_number:', secondResult.student_number);
    console.log('Second result full_name:', secondResult.full_name);
    console.log('Second result gender:', secondResult.gender);
    console.log('Second result intake:', secondResult.intake);
    console.log('Second result intake_year:', secondResult.intake_year);

    // Verify in database
    const { data: secondDbStudent } = await require('./config/supabase')
      .from('users')
      .select('id, student_number, full_name, gender, intake, intake_year')
      .eq('student_number', 'UPSERT-001')
      .single();
    console.log('Database after second import:', JSON.stringify(secondDbStudent, null, 2));

    // Check for duplicates
    console.log('\n5. CHECKING FOR DUPLICATES:');
    const { data: allUpsertStudents } = await require('./config/supabase')
      .from('users')
      .select('id, student_number')
      .eq('student_number', 'UPSERT-001');
    console.log('Students with student_number UPSERT-001:', allUpsertStudents.length);
    console.log('Student IDs:', allUpsertStudents.map(s => s.id));

    // Verification
    console.log('Verification:');
    console.log('First import action:', firstResult.action, '(expected: created)');
    console.log('Second import action:', secondResult.action, '(expected: updated)');
    console.log('No duplicates created:', allUpsertStudents.length === 1);
    console.log('Same student ID:', firstResult.id === secondResult.id);
    console.log('Data updated:', secondDbStudent.full_name === secondImport.full_name);
    console.log('Gender updated:', secondDbStudent.gender === secondImport.gender);
    console.log('Intake updated:', secondDbStudent.intake === secondIntakeMatch.id.toString());

    // Clean up
    console.log('\n7. CLEANING UP TEST STUDENT...');
    await require('./config/supabase')
      .from('users')
      .delete()
      .eq('student_number', 'UPSERT-001');
    console.log('Test student deleted');

    console.log('\n=== UPSERT TEST COMPLETE ===');

  } catch (error) {
    console.error('Error:', error.message);
    console.error('Stack:', error.stack);
  }
}

testImportUpsert().catch(console.error);
