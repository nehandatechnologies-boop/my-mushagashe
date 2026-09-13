const XLSX = require('xlsx');

// Read the Excel file
const filePath = 'C:\\Users\\PC\\CascadeProjects\\vocational-portal\\backend\\database\\test_students_with_passwords.xlsx';
const workbook = XLSX.readFile(filePath);
const worksheet = workbook.Sheets[workbook.SheetNames[0]];
const data = XLSX.utils.sheet_to_json(worksheet);

// Simulate the normalizeHeader function
const normalizeHeader = (row, possibleHeaders) => {
  for (const header of possibleHeaders) {
    if (row[header] !== undefined && row[header] !== null && row[header] !== '') {
      return row[header];
    }
  }
  return null;
};

// Test the first row
const row = data[0];
console.log('Row keys:', Object.keys(row));
console.log('Full row:', JSON.stringify(row, null, 2));

// Test each field extraction
const fullName = normalizeHeader(row, ['FULL NAME', 'Full Name', 'full_name', 'Full_Name', 'Name', 'NAME']);
const studentNumber = normalizeHeader(row, ['STUDENT NUMBER', 'Student Number', 'student_number', 'Student_Number', 'StudentNo', 'Student No.', 'STUDENT NO']);
const password = normalizeHeader(row, ['PASSWORD', 'Password', 'password']);
const courseId = normalizeHeader(row, ['COURSE ID', 'Course ID', 'course_id', 'Course_ID']);

console.log('Extracted full_name:', fullName);
console.log('Extracted student_number:', studentNumber);
console.log('Extracted password:', password);
console.log('Extracted course_id:', courseId);
