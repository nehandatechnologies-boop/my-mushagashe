const XLSX = require('xlsx');

// Create a test Excel file with invalid Course ID
const testData = [
  {
    'Full Name': 'TEST INVALID',
    'Student Number': 'STU999999',
    'Email': 'test.invalid@example.com',
    'Password': 'Temp@12345',
    'Phone': '+263771234999',
    'Gender': 'Male',
    'National ID': 'A999999999',
    'Date of Birth': '2000-01-01',
    'Address': '999 Test St',
    'Guardian Name': 'TEST GUARDIAN',
    'Guardian Phone': '+263771234999',
    'Intake Year': 2026,
    'Course ID': 999999  // Invalid course ID
  }
];

const workbook = XLSX.utils.book_new();
const worksheet = XLSX.utils.json_to_sheet(testData);
XLSX.utils.book_append_sheet(workbook, worksheet, 'Students');

const buffer = XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' });

const fs = require('fs');
fs.writeFileSync('C:\\Users\\PC\\CascadeProjects\\vocational-portal\\backend\\database\\test_invalid_course.xlsx', buffer);

console.log('Test Excel file created: test_invalid_course.xlsx');
console.log('Contains 1 student with invalid Course ID 999999');
