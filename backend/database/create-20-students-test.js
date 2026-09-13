const XLSX = require('xlsx');

// Create a test Excel file with 20 students using distinct real course IDs
const testData = [];

const courseIds = [1, 2, 3, 4, 5, 6, 7, 8]; // Real course IDs
const genders = ['Male', 'Female'];

for (let i = 1; i <= 20; i++) {
  const courseId = courseIds[i % courseIds.length];
  const gender = genders[i % genders.length];

  testData.push({
    'Full Name': `TEST STUDENT ${i}`,
    'Student Number': `STU2026${String(i).padStart(3, '0')}`,
    'Email': `teststudent${i}@example.com`,
    'Password': `Temp@${String(i).padStart(5, '0')}`,
    'Phone': `+26377123${String(i).padStart(4, '0')}`,
    'Gender': gender,
    'National ID': `A${String(i).padStart(9, '0')}`,
    'Date of Birth': '2000-01-01',
    'Address': `${i} Test Street`,
    'Guardian Name': `GUARDIAN ${i}`,
    'Guardian Phone': `+26377123${String(i).padStart(4, '0')}`,
    'Intake Year': 2026,
    'Course ID': courseId
  });
}

const workbook = XLSX.utils.book_new();
const worksheet = XLSX.utils.json_to_sheet(testData);
XLSX.utils.book_append_sheet(workbook, worksheet, 'Students');

const buffer = XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' });

const fs = require('fs');
fs.writeFileSync('C:\\Users\\PC\\CascadeProjects\\vocational-portal\\backend\\database\\test_20_students.xlsx', buffer);

console.log('Test Excel file created: test_20_students.xlsx');
console.log('Contains 20 students with:');
console.log('  - Course IDs: 1-8 (real courses)');
console.log('  - Alternating genders');
console.log('  - Unique student numbers');
console.log('  - Temporary passwords');
