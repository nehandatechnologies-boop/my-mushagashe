require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.SUPABASE_URL || 'https://krenyvbcwtbwcsrpiryf.supabase.co';
const supabaseKey = process.env.SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImtyZW55dmJjd3Rid2NzcnBpcnlmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODU2NDYxMDgsImV4cCI6MjEwMTIyMjEwOH0.ePaoY-bRwmRFo2Rd2eA_XY_EllShPtC178eyUXnUl-I';

const supabase = createClient(supabaseUrl, supabaseKey);

async function inspectGender() {
  console.log('=== PRODUCTION STUDENT GENDER DISTRIBUTION ===\n');

  try {
    const { data: students, error } = await supabase
      .from('users')
      .select('id, student_number, full_name, gender')
      .eq('role', 'student');

    if (error) {
      console.error('Error fetching students:', error);
      process.exit(1);
    }

    console.log(`Total students: ${students.length}`);

    const genderCounts = {
      male: 0,
      female: 0,
      null: 0,
      other: 0
    };

    const sampleStudents = {
      male: null,
      female: null,
      null: null,
      other: null
    };

    students.forEach(student => {
      const gender = student.gender;
      if (gender === 'male' || gender === 'Male' || gender === 'MALE' || gender === 'm' || gender === 'M') {
        genderCounts.male++;
        if (!sampleStudents.male) sampleStudents.male = student;
      } else if (gender === 'female' || gender === 'Female' || gender === 'FEMALE' || gender === 'f' || gender === 'F') {
        genderCounts.female++;
        if (!sampleStudents.female) sampleStudents.female = student;
      } else if (gender === null || gender === undefined || gender === '') {
        genderCounts.null++;
        if (!sampleStudents.null) sampleStudents.null = student;
      } else {
        genderCounts.other++;
        if (!sampleStudents.other) sampleStudents.other = student;
      }
    });

    console.log('\nGender Distribution:');
    console.log(`  Male: ${genderCounts.male}`);
    console.log(`  Female: ${genderCounts.female}`);
    console.log(`  NULL: ${genderCounts.null}`);
    console.log(`  Other: ${genderCounts.other}`);

    console.log('\nSample Students:');
    if (sampleStudents.male) {
      console.log(`  Male: ${sampleStudents.male.student_number} - ${sampleStudents.male.full_name} (gender="${sampleStudents.male.gender}")`);
    }
    if (sampleStudents.female) {
      console.log(`  Female: ${sampleStudents.female.student_number} - ${sampleStudents.female.full_name} (gender="${sampleStudents.female.gender}")`);
    }
    if (sampleStudents.null) {
      console.log(`  NULL: ${sampleStudents.null.student_number} - ${sampleStudents.null.full_name} (gender=${sampleStudents.null.gender})`);
    }
    if (sampleStudents.other) {
      console.log(`  Other: ${sampleStudents.other.student_number} - ${sampleStudents.other.full_name} (gender="${sampleStudents.other.gender}")`);
    }

    // Test gender normalization
    console.log('\n=== TESTING GENDER NORMALIZATION ===\n');

    const testValues = ['MALE', 'M', 'Male', 'male', 'FEMALE', 'F', 'Female', 'female', 'FEM', 'MAL'];

    testValues.forEach(value => {
      const normalized = value.toString().trim().toLowerCase();
      let result = null;
      if (normalized === 'male' || normalized === 'm') result = 'male';
      else if (normalized === 'female' || normalized === 'f') result = 'female';

      console.log(`"${value}" → "${normalized}" → ${result || 'NULL'}`);
    });

  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
}

inspectGender();
