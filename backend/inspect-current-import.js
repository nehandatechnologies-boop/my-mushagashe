/**
 * Inspect the actual current import process
 * This will show what's happening during real Excel imports
 */

const XLSX = require('xlsx');
const fs = require('fs');
const path = require('path');

async function inspectCurrentImport() {
  console.log('=== INSPECTING CURRENT IMPORT PROCESS ===\n');

  // Check available Excel files
  const possiblePaths = [
    path.join(__dirname, '../../uploads/students'),
    path.join(__dirname, '../../uploads'),
    path.join(__dirname, '../uploads/students'),
    path.join(__dirname, '../uploads')
  ];

  let excelFile = null;
  let excelPath = null;

  for (const dir of possiblePaths) {
    try {
      if (fs.existsSync(dir)) {
        const files = fs.readdirSync(dir).filter(f => f.endsWith('.xlsx') || f.endsWith('.xls'));
        if (files.length > 0) {
          excelFile = files[0];
          excelPath = path.join(dir, excelFile);
          console.log(`Found Excel file: ${excelPath}`);
          break;
        }
      }
    } catch (err) {
      // Directory doesn't exist or can't read
    }
  }

  if (!excelFile) {
    console.log('No Excel files found in standard upload directories');
    console.log('Checking for template files...');

    const templatePath = path.join(__dirname, '../templates');
    if (fs.existsSync(templatePath)) {
      const templates = fs.readdirSync(templatePath).filter(f => f.endsWith('.xlsx') || f.endsWith('.xls'));
      if (templates.length > 0) {
        excelFile = templates[0];
        excelPath = path.join(templatePath, excelFile);
        console.log(`Found template file: ${excelPath}`);
      }
    }
  }

  if (!excelFile) {
    console.log('No Excel files found. Creating a test file...');
    createTestExcelFile();
    excelPath = path.join(__dirname, 'test_students.xlsx');
    excelFile = 'test_students.xlsx';
  }

  console.log(`\nLoading Excel file: ${excelFile}`);

  try {
    const workbook = XLSX.readFile(excelPath);
    console.log(`Worksheets: ${workbook.SheetNames.join(', ')}`);

    const sheet = workbook.Sheets[workbook.SheetNames[0]];
    const data = XLSX.utils.sheet_to_json(sheet);

    console.log(`\nTotal rows: ${data.length}`);
    console.log(`\nFirst row (headers):`, Object.keys(data[0] || {}));

    if (data.length > 0) {
      console.log(`\nSample data row:`, data[0]);

      // Check for gender and intake columns
      const headers = Object.keys(data[0] || {});
      const hasGender = headers.some(h => h.toLowerCase().includes('gender') || h.toLowerCase().includes('sex'));
      const hasIntake = headers.some(h => h.toLowerCase().includes('intake'));

      console.log(`\nHas GENDER column: ${hasGender}`);
      console.log(`Has INTAKE column: ${hasIntake}`);

      if (hasGender) {
        const genderValues = data.slice(0, 5).map(row => {
          const key = Object.keys(row).find(k => k.toLowerCase().includes('gender') || k.toLowerCase().includes('sex'));
          return key ? row[key] : null;
        });
        console.log(`Sample GENDER values:`, genderValues);
      }

      if (hasIntake) {
        const intakeValues = data.slice(0, 5).map(row => {
          const key = Object.keys(row).find(k => k.toLowerCase().includes('intake'));
          return key ? row[key] : null;
        });
        console.log(`Sample INTAKE values:`, intakeValues);
      }
    }
  } catch (error) {
    console.error('Error reading Excel file:', error.message);
  }
}

function createTestExcelFile() {
  const XLSX = require('xlsx');
  const testPath = path.join(__dirname, 'test_students.xlsx');

  const data = [
    {
      'FULL NAME': 'GRACE MURINDI',
      'STUDENT NUMBER': '2026-015',
      'GENDER': 'FEMALE',
      'COURSE CODE': 'CLOTH1',
      'INTAKE': 'JANUARY 2025',
      'EMAIL': 'grace@example.com',
      'PHONE': '0771234567'
    },
    {
      'FULL NAME': 'JOHN MUSHAGASHE',
      'STUDENT NUMBER': '2026-016',
      'GENDER': 'MALE',
      'COURSE CODE': 'TOUR1',
      'INTAKE': 'MAY 2026',
      'EMAIL': 'john@example.com',
      'PHONE': '0771234568'
    }
  ];

  const worksheet = XLSX.utils.json_to_sheet(data);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Students');
  XLSX.writeFile(workbook, testPath);

  console.log(`Created test Excel file: ${testPath}`);
}

inspectCurrentImport().catch(console.error);
