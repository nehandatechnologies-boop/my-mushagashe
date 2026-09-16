/**
 * Test the actual import process with the test Excel file
 * This will simulate a real import through the controller
 */

const fs = require('fs');
const path = require('path');
const XLSX = require('xlsx');

async function testActualImport() {
  console.log('=== TESTING ACTUAL IMPORT PROCESS ===\n');

  // Load the test Excel file
  const testExcelPath = path.join(__dirname, 'test_students.xlsx');
  if (!fs.existsSync(testExcelPath)) {
    console.log('Test Excel file not found');
    return;
  }

  console.log('Loading test Excel file...');
  const workbook = XLSX.readFile(testExcelPath);
  const worksheet = workbook.Sheets[workbook.SheetNames[0]];
  const data = XLSX.utils.sheet_to_json(worksheet);

  console.log(`Total rows: ${data.length}`);
  console.log(`Headers: ${Object.keys(data[0]).join(', ')}`);

  // Simulate the header normalization
  const headerAliases = {
    'FULL NAME': ['FULL NAME', 'STUDENT NAME', 'NAME', 'FULLNAME', 'STUDENT FULL NAME'],
    'STUDENT NUMBER': ['STUDENT NUMBER', 'STUDENT NO', 'STUDENT ID', 'STUDENT NUMBER/ID', 'REGISTRATION NUMBER', 'REG NO'],
    'COURSE CODE': ['COURSE CODE', 'COURSE', 'PROGRAMME CODE', 'PROGRAM CODE', 'COURSE ID'],
    'GENDER': ['GENDER', 'SEX'],
    'INTAKE': ['INTAKE', 'INTAKE NAME', 'INTAKE DATE'],
    'EMAIL': ['EMAIL', 'EMAIL ADDRESS'],
    'PHONE': ['PHONE', 'PHONE NUMBER', 'MOBILE', 'CONTACT']
  };

  const normalizeHeaderName = (header) => {
    if (!header) return '';
    return header.toString().trim().toUpperCase().replace(/\s+/g, ' ');
  };

  const headerMatchesAlias = (header, aliasKey) => {
    const normalizedHeader = normalizeHeaderName(header);
    const aliases = headerAliases[aliasKey] || [aliasKey];
    return aliases.some(alias => normalizeHeaderName(alias) === normalizedHeader);
  };

  const normalizeHeader = (row, aliasKey) => {
    const aliases = headerAliases[aliasKey] || [aliasKey];
    for (const alias of aliases) {
      if (row[alias] !== undefined && row[alias] !== null && row[alias] !== '') {
        return row[alias];
      }
      const key = Object.keys(row).find(k => normalizeHeaderName(k) === normalizeHeaderName(alias));
      if (key && row[key] !== undefined && row[key] !== null && row[key] !== '') {
        return row[key];
      }
    }
    return null;
  };

  const normalizeGender = (value) => {
    if (!value) return null;
    const normalized = value.toString().trim().toUpperCase();
    if (['MALE', 'M'].includes(normalized)) return 'male';
    if (['FEMALE', 'F'].includes(normalized)) return 'female';
    return null;
  };

  // Load courses and intakes
  const Course = require('./models/Course');
  const Intake = require('./models/Intake');
  const allCourses = await Course.findAll({});
  const allIntakes = await Intake.findAll({});

  console.log(`Loaded ${allCourses.length} courses and ${allIntakes.length} intakes`);

  // Process first row
  const row = data[0];
  console.log('\n=== PROCESSING FIRST ROW ===');
  console.log('Raw row:', row);

  const rawGender = normalizeHeader(row, 'GENDER')?.toString().trim();
  const normalizedGender = normalizeGender(rawGender);
  console.log(`Gender: "${rawGender}" → "${normalizedGender}"`);

  const rawIntake = normalizeHeader(row, 'INTAKE')?.toString().trim();
  console.log(`Intake: "${rawIntake}"`);

  const rawCourseCode = normalizeHeader(row, 'COURSE CODE')?.toString().trim();
  console.log(`Course: "${rawCourseCode}"`);

  // Match intake
  const findIntakeId = (value) => {
    if (!value) return null;
    const normalized = value.toString().trim();
    const normalizedUpper = normalized.toUpperCase();

    // PRIORITY 1: Exact match (case-insensitive)
    const byCaseInsensitive = allIntakes.find(i => i.name && i.name.toUpperCase() === normalizedUpper);
    if (byCaseInsensitive) {
      console.log(`   Matched intake by case-insensitive: "${byCaseInsensitive.name}" (id=${byCaseInsensitive.id})`);
      return { id: byCaseInsensitive.id, name: byCaseInsensitive.name, year: byCaseInsensitive.year, matchedBy: 'case_insensitive' };
    }

    console.log(`   No intake match found for: "${normalized}"`);
    console.log(`   Available intakes:`, allIntakes.map(i => `${i.name} (id=${i.id})`).join(', '));
    return null;
  };

  const intakeMatch = findIntakeId(rawIntake);
  console.log(`Intake match result:`, intakeMatch);

  // Build student data object
  const studentData = {
    full_name: normalizeHeader(row, 'FULL NAME')?.toString().trim() || null,
    student_number: normalizeHeader(row, 'STUDENT NUMBER')?.toString().trim() || null,
    gender: normalizedGender,
    intake: intakeMatch ? intakeMatch.id : null,
    intake_year: intakeMatch ? intakeMatch.year : null,
    role: 'student',
    status: 'active'
  };

  console.log('\n=== STUDENT DATA OBJECT ===');
  console.log(JSON.stringify(studentData, null, 2));

  // Check what would be sent to processed array
  const processedStudent = {
    row: 1,
    student_number: studentData.student_number,
    full_name: studentData.full_name,
    intake: studentData.intake,
    intake_year: studentData.intake_year,
    gender: studentData.gender,
    raw_intake: rawIntake,
    intake_matched: !!intakeMatch
  };

  console.log('\n=== PROCESSED STUDENT OBJECT ===');
  console.log(JSON.stringify(processedStudent, null, 2));

  // Check if this would be rejected
  if (!processedStudent.intake_matched && processedStudent.raw_intake) {
    console.log('\n❌ WOULD BE REJECTED: Intake not matched');
  } else {
    console.log('\n✅ WOULD BE ACCEPTED: Intake matched or not provided');
  }

  console.log('\n=== TEST COMPLETE ===');
}

testActualImport().catch(console.error);
