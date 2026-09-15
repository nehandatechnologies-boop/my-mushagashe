require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.SUPABASE_URL || 'https://krenyvbcwtbwcsrpiryf.supabase.co';
const supabaseKey = process.env.SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImtyZW55dmJjd3Rid2NzcnBpcnlmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODU2NDYxMDgsImV4cCI6MjEwMTIyMjEwOH0.ePaoY-bRwmRFo2Rd2eA_XY_EllShPtC178eyUXnUl-I';

const supabase = createClient(supabaseUrl, supabaseKey);

async function inspectIntakes() {
  console.log('=== PRODUCTION INTAKES TABLE ===\n');

  try {
    const { data: intakes, error } = await supabase
      .from('intakes')
      .select('*')
      .order('id');

    if (error) {
      console.error('Error fetching intakes:', error);
      process.exit(1);
    }

    console.log('ID | NAME               | YEAR');
    console.log('---|--------------------|-----');

    intakes.forEach(intake => {
      const id = String(intake.id).padEnd(2);
      const name = (intake.name || 'NULL').padEnd(18);
      const year = intake.year || 'NULL';
      console.log(`${id} | ${name} | ${year}`);
    });

    console.log(`\nTotal intakes: ${intakes.length}`);

    // Test January 2026 lookup
    console.log('\n=== TESTING JANUARY 2026 LOOKUP ===\n');

    const testValue = 'January 2026';
    const januaryIntake = intakes.find(i => i.name === testValue);

    if (januaryIntake) {
      console.log('✓ January 2026 found in intakes table:');
      console.log(`  ID: ${januaryIntake.id}`);
      console.log(`  NAME: ${januaryIntake.name}`);
      console.log(`  YEAR: ${januaryIntake.year}`);
      console.log(`\nExpected flow: Excel "January 2026" → intakes.name = "January 2026" → intakes.id = ${januaryIntake.id} → users.intake = ${januaryIntake.id}`);
    } else {
      console.log('✗ January 2026 NOT found in intakes table');
      console.log('Available intake names:', intakes.map(i => i.name).join(', '));
    }

    // Check actual student with intake
    console.log('\n=== CHECKING STUDENT WITH INTAKE ===\n');

    const { data: students, error: studentError } = await supabase
      .from('users')
      .select('id, student_number, full_name, intake, intake_year')
      .eq('role', 'student')
      .not('intake', 'is', null)
      .limit(1);

    if (studentError) {
      console.error('Error fetching students:', studentError);
    } else if (students && students.length > 0) {
      const student = students[0];
      console.log('Sample student with intake:');
      console.log(`  ID: ${student.id}`);
      console.log(`  Student Number: ${student.student_number}`);
      console.log(`  Full Name: ${student.full_name}`);
      console.log(`  Intake (ID): ${student.intake}`);
      console.log(`  Intake Year: ${student.intake_year}`);

      // Verify intake exists
      if (student.intake) {
        const { data: intakeData, error: intakeError } = await supabase
          .from('intakes')
          .select('*')
          .eq('id', student.intake)
          .single();

        if (intakeError) {
          console.log(`  ✗ Intake ID ${student.intake} not found in intakes table`);
        } else {
          console.log(`  ✓ Intake verified: ${intakeData.name} (${intakeData.year})`);
        }
      }
    } else {
      console.log('No students with intake found');
    }

  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
}

inspectIntakes();
