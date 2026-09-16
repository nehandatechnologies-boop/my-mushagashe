/**
 * Simulate the exact import controller logic to trace where values are lost
 */

const XLSX = require('xlsx');
const fs = require('fs');
const path = require('path');
const Course = require('./models/Course');
const Intake = require('./models/Intake');
const User = require('./models/User');

async function simulateImport() {
  console.log('=== SIMULATING EXACT IMPORT CONTROLLER LOGIC ===\n');

  // Load Excel file (exactly as controller does)
  const excelPath = path.join(__dirname, 'test_students.xlsx');
  const workbook = XLSX.readFile(excelPath);
  console.log('[IMPORT] Available worksheets:', workbook.SheetNames.join(', '));

  // Header aliases (exactly as controller)
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

  const normalizeGender = (gender) => {
    if (!gender) return null;
    const normalized = gender.toString().trim().toLowerCase();
    if (normalized === 'male' || normalized === 'm') return 'male';
    if (normalized === 'female' || normalized === 'f') return 'female';
    return null;
  };

  // Load courses and intakes (exactly as controller)
  const allCourses = await Course.findAll({});
  const allIntakes = await Intake.findAll({});
  console.log(`[IMPORT] Loaded ${allCourses.length} courses and ${allIntakes.length} intakes`);

  // Course resolution (exactly as controller)
  const findCourseId = (courseCodeFromExcel, courseNameFromExcel) => {
    console.log(`[IMPORT] Course lookup - Code: "${courseCodeFromExcel}", Name: "${courseNameFromExcel}"`);

    if (courseCodeFromExcel) {
      const normalizedCode = courseCodeFromExcel.toString().trim().toUpperCase();
      console.log(`[IMPORT]   Trying course code match: "${normalizedCode}"`);

      const byCode = allCourses.find(c =>
        c.course_code && c.course_code.toUpperCase() === normalizedCode
      );
      if (byCode) {
        console.log(`[IMPORT]   ✓ Matched by course code: "${byCode.course_code}" (id=${byCode.id})`);
        return { id: byCode.id, code: byCode.course_code, name: byCode.course_name, matchedBy: 'code' };
      }
    }

    if (courseNameFromExcel) {
      const normalizedName = courseNameFromExcel.toString().trim().toUpperCase();
      console.log(`[IMPORT]   Trying course name match: "${normalizedName}"`);

      const byName = allCourses.find(c =>
        c.course_name && c.course_name.toUpperCase() === normalizedName
      );
      if (byName) {
        console.log(`[IMPORT]   ✓ Matched by course name: "${byName.course_name}" (id=${byName.id})`);
        return { id: byName.id, code: byName.course_code, name: byName.course_name, matchedBy: 'name' };
      }
    }

    console.log(`[IMPORT]   ✗ NO MATCH found`);
    return null;
  };

  // Intake resolution (exactly as controller)
  const findIntakeId = (value) => {
    if (!value) return null;
    const normalized = value.toString().trim();
    const normalizedUpper = normalized.toUpperCase();

    console.log(`[IMPORT] Intake lookup - Value: "${normalized}"`);

    // PRIORITY 1: Exact match (case-insensitive)
    const byCaseInsensitive = allIntakes.find(i => i.name && i.name.toUpperCase() === normalizedUpper);
    if (byCaseInsensitive) {
      console.log(`[IMPORT]   ✓ Matched by case-insensitive: "${byCaseInsensitive.name}" (id=${byCaseInsensitive.id})`);
      return { id: byCaseInsensitive.id, name: byCaseInsensitive.name, year: byCaseInsensitive.year, matchedBy: 'case_insensitive' };
    }

    // PRIORITY 2: Try partial match
    const byPartial = allIntakes.find(i =>
      i.name && (i.name.toUpperCase().includes(normalizedUpper) || normalizedUpper.includes(i.name.toUpperCase()))
    );
    if (byPartial) {
      console.log(`[IMPORT]   ✓ Matched by partial: "${byPartial.name}" (id=${byPartial.id})`);
      return { id: byPartial.id, name: byPartial.name, year: byPartial.year, matchedBy: 'partial' };
    }

    console.log(`[IMPORT]   ✗ NO MATCH found for intake: "${normalized}"`);
    console.log(`[IMPORT]   Available intakes:`, allIntakes.map(i => `${i.name} (id=${i.id})`).join(', '));
    return null;
  };

  // Process the worksheet (exactly as controller)
  const worksheet = workbook.Sheets[workbook.SheetNames[0]];
  const data = XLSX.utils.sheet_to_json(worksheet);

  console.log(`[IMPORT] Processing ${data.length} rows`);

  for (let i = 0; i < data.length; i++) {
    const row = data[i];
    const rowNum = i + 2;

    console.log(`\n[IMPORT] === PROCESSING ROW ${rowNum} ===`);

    // Normalize headers (exactly as controller)
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

    const rawCourseCode = normalizeHeader(row, 'COURSE CODE')?.toString().trim();
    const rawCourseName = normalizeHeader(row, 'COURSE CODE')?.toString().trim();
    const courseMatch = findCourseId(rawCourseCode, rawCourseName);

    const rawIntakeName = normalizeHeader(row, 'INTAKE')?.toString().trim();
    const intakeMatch = findIntakeId(rawIntakeName);

    const rawGender = normalizeHeader(row, 'GENDER')?.toString().trim();
    const normalizedGender = normalizeGender(rawGender);

    console.log(`[IMPORT] ROW ${rowNum} - Gender: raw="${rawGender}" → normalized="${normalizedGender}"`);
    console.log(`[IMPORT] ROW ${rowNum} - Intake: raw="${rawIntakeName}" → matched=${intakeMatch ? `${intakeMatch.name} (id=${intakeMatch.id})` : 'null'}`);

    // Build student data object (exactly as controller)
    const studentData = {
      full_name: normalizeHeader(row, 'FULL NAME')?.toString().trim() || null,
      student_number: normalizeHeader(row, 'STUDENT NUMBER')?.toString().trim() || null,
      course_id: courseMatch ? courseMatch.id : null,
      course_name: courseMatch ? courseMatch.name : (rawCourseName?.toString().trim() || null),
      intake: intakeMatch ? intakeMatch.id : null,
      intake_year: intakeMatch ? intakeMatch.year : null,
      gender: normalizedGender,
      email: normalizeHeader(row, 'EMAIL')?.toString().trim() || null,
      password: normalizeHeader(row, 'PASSWORD')?.toString().trim() || null,
      phone: normalizeHeader(row, 'PHONE NUMBER')?.toString().trim() || null,
      national_id: normalizeHeader(row, 'NATIONAL ID')?.toString().trim() || null,
      date_of_birth: normalizeHeader(row, 'DATE OF BIRTH')?.toString().trim() || null,
      address: normalizeHeader(row, 'ADDRESS')?.toString().trim() || null,
      guardian_name: normalizeHeader(row, 'GUARDIAN NAME')?.toString().trim() || null,
      guardian_phone: normalizeHeader(row, 'GUARDIAN PHONE')?.toString().trim() || null,
      role: 'student',
      status: 'active'
    };

    console.log(`[IMPORT] ROW ${rowNum} - Student data object:`, JSON.stringify({
      student_number: studentData.student_number,
      full_name: studentData.full_name,
      gender: studentData.gender,
      intake: studentData.intake,
      intake_year: studentData.intake_year,
      course_id: studentData.course_id
    }));

    // Check if student exists (exactly as controller)
    const existingStudent = await User.findByStudentNumber(studentData.student_number);
    console.log(`[IMPORT] ROW ${rowNum} - Existing student: ${existingStudent ? 'YES' : 'NO'}`);
    if (existingStudent) {
      console.log(`[IMPORT] ROW ${rowNum} - Current values:`, JSON.stringify({
        id: existingStudent.id,
        gender: existingStudent.gender,
        intake: existingStudent.intake,
        intake_year: existingStudent.intake_year,
        course_id: existingStudent.course_id
      }));
    }

    // Try the upsert (exactly as controller)
    console.log(`[IMPORT] ROW ${rowNum} - Calling User.upsertByStudentNumber`);
    try {
      const result = await User.upsertByStudentNumber(studentData);
      console.log(`[IMPORT] ROW ${rowNum} - Upsert result:`, JSON.stringify({
        action: result.action,
        id: result.id,
        gender: result.gender,
        intake: result.intake,
        intake_year: result.intake_year,
        course_id: result.course_id
      }));
    } catch (error) {
      console.error(`[IMPORT] ROW ${rowNum} - Upsert failed:`, error.message);
    }
  }

  console.log('\n=== SIMULATION COMPLETE ===');
}

simulateImport().catch(console.error);
