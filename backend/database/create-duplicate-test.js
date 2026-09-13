const XLSX = require('xlsx');

// Create a test Excel file with duplicate student numbers
const testData = [
  {
    'Full Name': 'FIRST DUP',
    'Student Number': 'STU999998',
    'Email': 'first.dup@example.com',
    'Password': 'Temp@12345',
    'Phone': '+263771234888',
    'Gender': 'Male',
    'National ID': 'A888888888',
    'Date of Birth': '2000-01-01',
    'Address': '888 Test St',
    'Guardian Name': 'GUARDIAN 888',
    'Guardian Phone': '+263771234888',
    'Intake Year': 2026,
    'Course ID': 1
  },
  {
    'Full Name': 'SECOND DUP',
    'Student Number': 'STU999998',  // DUPLICATE!
    'Email': 'second.dup@example.com',
    'Password': 'Temp@67890',
    'Phone': '+263771234889',
    'Gender': 'Female',
    'National ID': 'A889888888',
    'Date of Birth': '2000-02-01',
    'Address': '889 Test St',
    'Guardian Name': 'GUARDIAN 889',
    'Guardian Phone': '+263771234889',
    'Intake Year': 2026,
    'Course ID': 2
  }
];

const workbook = XLSX.utils.book_new();
const worksheet = XLSX.utils.json_to_sheet(testData);
XLSX.utils.book_append_sheet(workbook, worksheet, 'Students');

const buffer = XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' });

const fs = require('fs');
fs.writeFileSync('C:\\Users\\PC\\CascadeProjects\\vocational-portal\\backend\\database\\test_duplicate_students.xlsx', buffer);

console.log('Test Excel file created: test_duplicate_students.xlsx');
console.log('Contains 2 students with DUPLICATE student number STU999998');
