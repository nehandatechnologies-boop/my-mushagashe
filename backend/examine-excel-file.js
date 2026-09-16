/**
 * Examine the actual Excel file structure and test import
 */

const XLSX = require('xlsx');
const fs = require('fs');
const path = require('path');

async function examineExcelFile() {
  console.log('=== EXAMINING EXCEL FILE ===\n');

  const excelPath = path.join(__dirname, 'test_students.xlsx');
  if (!fs.existsSync(excelPath)) {
    console.log('Excel file not found:', excelPath);
    return;
  }

  console.log('Loading Excel file:', excelPath);
  const workbook = XLSX.readFile(excelPath);
  console.log('Worksheets:', workbook.SheetNames);

  for (const sheetName of workbook.SheetNames) {
    console.log(`\n=== WORKSHEET: ${sheetName} ===`);
    const worksheet = workbook.Sheets[sheetName];
    const data = XLSX.utils.sheet_to_json(worksheet);

    console.log(`Total rows: ${data.length}`);

    if (data.length > 0) {
      console.log(`Headers: ${Object.keys(data[0]).join(', ')}`);

      console.log('\nSample rows:');
      data.slice(0, 3).forEach((row, index) => {
        console.log(`\nRow ${index + 1}:`);
        Object.entries(row).forEach(([key, value]) => {
          console.log(`  ${key}: "${value}"`);
        });
      });

      // Check for specific columns
      const headers = Object.keys(data[0]);
      const hasGender = headers.some(h => h.toLowerCase().includes('gender') || h.toLowerCase().includes('sex'));
      const hasIntake = headers.some(h => h.toLowerCase().includes('intake'));
      const hasCourse = headers.some(h => h.toLowerCase().includes('course'));

      console.log('\nColumn detection:');
      console.log(`  Has GENDER column: ${hasGender}`);
      console.log(`  Has INTAKE column: ${hasIntake}`);
      console.log(`  Has COURSE column: ${hasCourse}`);

      if (hasGender) {
        const genderKey = headers.find(h => h.toLowerCase().includes('gender') || h.toLowerCase().includes('sex'));
        console.log(`  Gender column name: "${genderKey}"`);
        const genderValues = data.slice(0, 5).map(row => row[genderKey]);
        console.log(`  Sample gender values:`, genderValues);
      }

      if (hasIntake) {
        const intakeKey = headers.find(h => h.toLowerCase().includes('intake'));
        console.log(`  Intake column name: "${intakeKey}"`);
        const intakeValues = data.slice(0, 5).map(row => row[intakeKey]);
        console.log(`  Sample intake values:`, intakeValues);
      }

      if (hasCourse) {
        const courseKey = headers.find(h => h.toLowerCase().includes('course'));
        console.log(`  Course column name: "${courseKey}"`);
        const courseValues = data.slice(0, 5).map(row => row[courseKey]);
        console.log(`  Sample course values:`, courseValues);
      }
    }
  }
}

examineExcelFile().catch(console.error);
