/**
 * Test Excel import with production spreadsheet structure
 * This simulates the actual STUDS.xlsx structure with 624 students
 */

const XLSX = require('xlsx');
const User = require('./models/User');
const Intake = require('./models/Intake');
const Course = require('./models/Course');

async function testProductionSpreadsheetStructure() {
  console.log('=== TESTING PRODUCTION SPREADSHEET STRUCTURE ===\n');

  try {
    // Create a test Excel file with production structure
    const testData = [
      {
        'Full Name': 'GRACE MURINDI',
        'Student Number': '2026-015',
        'Email': 'grace.murindi@example.com',
        'Phone': '+263 771 234 567',
        'Gender': 'FEMALE',
        'National ID': '63-123456-A-12',
        'Date of Birth': '2000-05-15',
        'Address': '123 Main Street, Harare',
        'Guardian Name': 'JOHN MURINDI',
        'Guardian Phone': '+263 771 987 654',
        'Intake Year': new Date('2025-01-01'),
        'Course ID': 'CLOTH1'
      },
      {
        'Full Name': 'JOHN MUSHAGASHE',
        'Student Number': '2026-016',
        'Email': 'john.mushagashe@example.com',
        'Phone': '+263 772 345 678',
        'Gender': 'MALE',
        'National ID': '63-234567-B-12',
        'Date of Birth': '2001-03-20',
        'Address': '456 Central Ave, Harare',
        'Guardian Name': 'MARY MUSHAGASHE',
        'Guardian Phone': '+263 772 876 543',
        'Intake Year': new Date('2026-05-01'),
        'Course ID': 'TOUR1'
      },
      {
        'Full Name': 'SARAH CHIKOWORE',
        'Student Number': '2026-017',
        'Email': 'sarah.chikowore@example.com',
        'Phone': '+263 773 456 789',
        'Gender': 'FEMALE',
        'National ID': '63-345678-C-12',
        'Date of Birth': '2000-08-10',
        'Address': '789 Highfield, Harare',
        'Guardian Name': 'PETER CHIKOWORE',
        'Guardian Phone': '+263 773 987 654',
        'Intake Year': new Date('2026-09-01'),
        'Course ID': 'ELECT1'
      }
    ];

    // Add duplicate header row
    const duplicateHeader = { ...testData[0] };
    const finalTestData = [testData[0], duplicateHeader, testData[1], testData[2]];

    // Create workbook
    const worksheet = XLSX.utils.json_to_sheet(finalTestData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Students');
    XLSX.writeFile(workbook, 'test-production-students.xlsx');

    console.log('1. CREATED TEST SPREADSHEET:');
    console.log('File: test-production-students.xlsx');
    console.log('Worksheet: Students');
    console.log('Total rows (including duplicate header):', finalTestData.length);
    console.log('Real student rows:', testData.length);
    console.log('Headers:', Object.keys(testData[0]));

    // Test import with the production structure
    console.log('\n2. SIMULATING IMPORT PROCESS:');

    // Load production data
    const allIntakes = await Intake.findAll({});
    const allCourses = await Course.findAll({});
    console.log('Available intakes:', allIntakes.map(i => `${i.name} (id=${i.id}, year=${i.year})`));
    console.log('Available courses:', allCourses.map(c => `${c.course_code} (id=${c.id})`));

    // Simulate header normalization
    const headerAliases = {
      'FULL NAME': ['FULL NAME', 'STUDENT NAME', 'NAME', 'FULLNAME', 'STUDENT FULL NAME', 'Full Name'],
      'STUDENT NUMBER': ['STUDENT NUMBER', 'STUDENT NO', 'STUDENT ID', 'STUDENT NUMBER/ID', 'REGISTRATION NUMBER', 'REG NO', 'Student Number'],
      'COURSE CODE': ['COURSE CODE', 'COURSE', 'PROGRAMME CODE', 'PROGRAM CODE', 'COURSE ID', 'Course ID', 'Course Code'],
      'GENDER': ['GENDER', 'SEX', 'Gender'],
      'INTAKE': ['INTAKE', 'INTAKE NAME', 'INTAKE DATE', 'INTAKE YEAR', 'Intake Year', 'Intake'],
      'EMAIL': ['EMAIL', 'E-MAIL', 'EMAIL ADDRESS', 'Email'],
      'PHONE': ['PHONE', 'PHONE NUMBER', 'TEL', 'TELEPHONE', 'Mobile', 'Contact Number'],
      'PASSWORD': ['PASSWORD', 'Password'],
      'NATIONAL ID': ['NATIONAL ID', 'ID NUMBER', 'NATIONAL ID NUMBER', 'National ID'],
      'DATE OF BIRTH': ['DATE OF BIRTH', 'DOB', 'BIRTH DATE', 'Date of Birth'],
      'ADDRESS': ['ADDRESS', 'PHYSICAL ADDRESS', 'RESIDENTIAL ADDRESS', 'Address'],
      'GUARDIAN NAME': ['GUARDIAN NAME', 'PARENT NAME', 'GUARDIAN', 'Guardian Name'],
      'GUARDIAN PHONE': ['GUARDIAN PHONE', 'GUARDIAN CONTACT', 'PARENT PHONE', 'Guardian Phone']
    };

    const normalizeHeaderName = (header) => {
      if (!header) return '';
      return String(header).toUpperCase().trim().replace(/\s+/g, ' ');
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

    // Process rows
    console.log('\n3. PROCESSING ROWS (skipping duplicate header):');
    const processed = [];
    const errors = [];

    // Skip first row (it's the duplicate header)
    const dataToProcess = finalTestData.slice(1);

    for (let i = 0; i < dataToProcess.length; i++) {
      const row = dataToProcess[i];
      const rowNum = i + 2; // +2 because of header and duplicate header

      console.log('Processing row ' + rowNum + ':', JSON.stringify({
        'Full Name': row['Full Name'],
        'Student Number': row['Student Number'],
        'Gender': row['Gender'],
        'Course ID': row['Course ID'],
        'Intake Year': row['Intake Year']
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

        const rawGender = normalizeHeader(row, 'GENDER')?.toString().trim();
        const normalizedGender = normalizeGender(rawGender);

        // Course resolution (COURSE ID contains course codes)
        const rawCourseCode = normalizeHeader(row, 'COURSE CODE')?.toString().trim();
        const courseMatch = allCourses.find(c =>
          c.course_code && c.course_code.toUpperCase() === rawCourseCode.toUpperCase()
        );

        // Intake resolution from date
        const rawIntakeYear = normalizeHeader(row, 'INTAKE YEAR')?.toString().trim();
        let intakeMatch = null;

        if (rawIntakeYear) {
          let intakeYear = null;
          let intakeMonth = null;

          if (rawIntakeYear instanceof Date) {
            intakeYear = rawIntakeYear.getFullYear();
            intakeMonth = rawIntakeYear.getMonth(); // 0-11
          } else if (!isNaN(Date.parse(rawIntakeYear))) {
            const parsedDate = new Date(rawIntakeYear);
            intakeYear = parsedDate.getFullYear();
            intakeMonth = parsedDate.getMonth();
          } else if (!isNaN(parseInt(rawIntakeYear))) {
            intakeYear = parseInt(rawIntakeYear);
          }

          console.log('  Extracted intake year:', intakeYear, 'month:', intakeMonth);

          // Find intake by year and month
          if (intakeYear) {
            // First try to match by year and month
            if (intakeMonth !== null) {
              const monthNames = ['January', 'February', 'March', 'April', 'May', 'June',
                                  'July', 'August', 'September', 'October', 'November', 'December'];
              const monthName = monthNames[intakeMonth];

              intakeMatch = allIntakes.find(i =>
                i.year === intakeYear &&
                i.name && i.name.toUpperCase().includes(monthName.toUpperCase())
              );

              if (intakeMatch) {
                console.log('  Matched intake by year and month:', intakeMatch.name);
              } else {
                console.log('  No exact month match, falling back to year match');
              }
            }

            // Fallback to year-only match if no month match
            if (!intakeMatch) {
              intakeMatch = allIntakes.find(i => i.year === intakeYear);
              console.log('  Matched intake by year only:', intakeMatch ? intakeMatch.name : 'no match');
            }
          }
        }

        const studentData = {
          full_name: normalizeHeader(row, 'FULL NAME')?.toString().trim() || null,
          student_number: normalizeHeader(row, 'STUDENT NUMBER')?.toString().trim() || null,
          gender: normalizedGender,
          course_id: courseMatch ? courseMatch.id : null,
          intake: intakeMatch ? intakeMatch.id : null,
          intake_year: intakeMatch ? intakeMatch.year : null,
          email: normalizeHeader(row, 'EMAIL')?.toString().trim() || null,
          phone: normalizeHeader(row, 'PHONE')?.toString().trim() || null,
          national_id: normalizeHeader(row, 'NATIONAL ID')?.toString().trim() || null,
          date_of_birth: normalizeHeader(row, 'DATE OF BIRTH')?.toString().trim() || null,
          address: normalizeHeader(row, 'ADDRESS')?.toString().trim() || null,
          guardian_name: normalizeHeader(row, 'GUARDIAN NAME')?.toString().trim() || null,
          guardian_phone: normalizeHeader(row, 'GUARDIAN PHONE')?.toString().trim() || null,
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
          student_number: row['Student Number'],
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

    console.log('\n=== PRODUCTION STRUCTURE TEST COMPLETE ===');

  } catch (error) {
    console.error('Test error:', error.message);
    console.error('Test error stack:', error.stack);
  }
}

testProductionSpreadsheetStructure().catch(console.error);
