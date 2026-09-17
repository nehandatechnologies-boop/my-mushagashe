/**
 * Analyze Excel file structure
 */

const XLSX = require('xlsx');
const fs = require('fs');

async function analyzeExcelFile() {
  console.log('=== EXCEL FILE ANALYSIS ===\n');

  try {
    const workbook = XLSX.readFile('test_students.xlsx');
    const sheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[sheetName];
    const data = XLSX.utils.sheet_to_json(worksheet);

    console.log('Total rows:', data.length);
    console.log('\nHeaders:', Object.keys(data[0]));

    console.log('\nFirst 3 rows:');
    data.slice(0, 3).forEach((row, i) => {
      console.log('Row ' + (i + 1) + ':', JSON.stringify({
        'FULL NAME': row['FULL NAME'],
        'STUDENT NUMBER': row['STUDENT NUMBER'],
        'GENDER': row['GENDER'],
        'COURSE CODE': row['COURSE CODE'],
        'INTAKE YEAR': row['INTAKE YEAR']
      }, null, 2));
    });

    // Count gender values
    const genderCounts = { male: 0, female: 0, null: 0, other: 0 };
    data.forEach(row => {
      const gender = row['GENDER'];
      if (!gender) genderCounts.null++;
      else if (gender.toString().toUpperCase() === 'MALE' || gender.toString().toUpperCase() === 'M') genderCounts.male++;
      else if (gender.toString().toUpperCase() === 'FEMALE' || gender.toString().toUpperCase() === 'F') genderCounts.female++;
      else genderCounts.other++;
    });

    console.log('\nGender distribution:');
    console.log('  Male:', genderCounts.male);
    console.log('  Female:', genderCounts.female);
    console.log('  Null:', genderCounts.null);
    console.log('  Other:', genderCounts.other);

    // Count intake year values
    const intakeYearCounts = { populated: 0, null: 0 };
    data.forEach(row => {
      const intakeYear = row['INTAKE YEAR'];
      if (intakeYear) intakeYearCounts.populated++;
      else intakeYearCounts.null++;
    });

    console.log('\nIntake Year distribution:');
    console.log('  Populated:', intakeYearCounts.populated);
    console.log('  Null:', intakeYearCounts.null);

    // Check intake year format
    console.log('\nSample intake year values:');
    data.slice(0, 5).forEach((row, i) => {
      console.log('  Row ' + (i + 1) + ':', row['INTAKE YEAR'], typeof row['INTAKE YEAR']);
    });

  } catch (error) {
    console.error('Error reading Excel file:', error.message);
    console.log('Looking for Excel files...');
    const files = fs.readdirSync('.').filter(f => f.endsWith('.xlsx'));
    console.log('Found files:', files);
  }
}

analyzeExcelFile().catch(console.error);
