const supabase = require('../config/supabase');

async function checkDuplicateStudents() {
  console.log('=== CHECKING FOR DUPLICATE STUDENTS ===\n');

  // Get all students
  const { data: students, error } = await supabase
    .from('users')
    .select('id, student_number, full_name, gender, course_id, status')
    .eq('role', 'student')
    .order('student_number');

  if (error) {
    console.error('Error fetching students:', error);
    return;
  }

  console.log(`Total students: ${students.length}\n`);

  // Find duplicates by student_number
  const studentNumberMap = new Map();
  const duplicates = [];

  students.forEach(student => {
    const num = student.student_number;
    if (!num) return;

    if (studentNumberMap.has(num)) {
      studentNumberMap.get(num).push(student);
    } else {
      studentNumberMap.set(num, [student]);
    }
  });

  // Report duplicates
  studentNumberMap.forEach((records, studentNumber) => {
    if (records.length > 1) {
      console.log(`\nDuplicate student number: ${studentNumber}`);
      console.log(`  Records: ${records.length}`);
      records.forEach(r => {
        console.log(`    ID: ${r.id}, Name: ${r.full_name}, Gender: ${r.gender}, Course ID: ${r.course_id}, Status: ${r.status}`);
      });
      duplicates.push({ studentNumber, records });
    }
  });

  if (duplicates.length === 0) {
    console.log('\n✓ No duplicate student numbers found');
  } else {
    console.log(`\n✓ Found ${duplicates.length} duplicate student numbers`);
  }

  return { students, duplicates };
}

checkDuplicateStudents();
