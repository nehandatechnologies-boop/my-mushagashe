const supabase = require('../config/supabase');

async function checkStudent() {
  const { data, error } = await supabase
    .from('users')
    .select('*')
    .eq('student_number', 'TEST001')
    .single();

  if (error) {
    console.error('Error:', error);
  } else {
    console.log('Student found:', data);
  }
}

checkStudent();
