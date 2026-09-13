const XLSX = require('xlsx');

// Read the Excel file to see what password is actually in there
const filePath = 'C:\\Users\\PC\\CascadeProjects\\vocational-portal\\backend\\database\\test_students_with_passwords.xlsx';
const workbook = XLSX.readFile(filePath);
const worksheet = workbook.Sheets[workbook.SheetNames[0]];
const data = XLSX.utils.sheet_to_json(worksheet);

console.log('Excel data:');
console.log(JSON.stringify(data, null, 2));
