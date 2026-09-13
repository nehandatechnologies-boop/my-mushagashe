const XLSX = require('xlsx');

// Create a test Excel file with proper Course IDs and passwords
const testData = [
  {
    'Full Name': 'JOHN DOE',
    'Student Number': 'STU2026001',
    'Email': 'john.doe@example.com',
    'Password': 'Temp@12345',
    'Phone': '+263771234567',
    'Gender': 'Male',
    'National ID': 'A123456789',
    'Date of Birth': '2000-01-15',
    'Address': '123 Main St',
    'Guardian Name': 'JANE DOE',
    'Guardian Phone': '+263771234568',
    'Intake Year': 2026,
    'Course ID': 4
  },
  {
    'Full Name': 'JANE SMITH',
    'Student Number': 'STU2026002',
    'Email': 'jane.smith@example.com',
    'Password': 'Temp@67890',
    'Phone': '+263771234569',
    'Gender': 'Female',
    'National ID': 'A123456790',
    'Date of Birth': '2000-02-20',
    'Address': '456 Oak Ave',
    'Guardian Name': 'JOHN SMITH',
    'Guardian Phone': '+263771234569',
    'Intake Year': 2026,
    'Course ID': 5
  },
  {
    'Full Name': 'BOB JOHNSON',
    'Student Number': 'STU2026003',
    'Email': 'bob.johnson@example.com',
    'Password': 'Temp@13579',
    'Phone': '+263771234570',
    'Gender': 'Male',
    'National ID': 'A1234567891',
    'Date of Birth': '2000-03-25',
    'Address': '789 Pine Rd',
    'Guardian Name': 'MARY JOHNSON',
    'Guardian Phone': '+263771234571',
    'Intake Year': 2026,
    'Course ID': 6
  }
];

const workbook = XLSX.utils.book_new();
const worksheet = XLSX.utils.json_to_sheet(testData);
XLSX.utils.book_append_sheet(workbook, worksheet, 'Students');

const buffer = XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' });

const fs = require('fs');
fs.writeFileSync('C:\\Users\\PC\\CascadeProjects\\vocational-portal\\backend\\database\\test_students_with_passwords.xlsx', buffer);

console.log('Test Excel file created: test_students_with_passwords.xlsx');
console.log('Contains 3 students with:');
console.log('  - Course ID 4 (Agriculture)');
console.log('  - Course ID 5 (Nursing)');
console.log('  - Course ID 6 (Electrical Engineering)');
console.log('  - Temporary passwords for first-login testing');
