const supabase = require('../config/supabase');
const bcrypt = require('bcryptjs');

async function createTestAdmins() {
  const admins = [
    {
      email: 'academic@mushagashe.edu',
      full_name: 'Academic Administrator',
      role: 'ACADEMIC_ADMIN',
      password: 'academic123'
    },
    {
      email: 'finance@mushagashe.edu',
      full_name: 'Finance Administrator',
      role: 'FINANCE_ADMIN',
      password: 'finance123'
    },
    {
      email: 'admissions@mushagashe.edu',
      full_name: 'Admissions Administrator',
      role: 'ADMISSIONS_ADMIN',
      password: 'admissions123'
    },
    {
      email: 'lecturer@mushagashe.edu',
      full_name: 'Lecturer Administrator',
      role: 'LECTURER_ADMIN',
      password: 'lecturer123'
    }
  ];

  for (const admin of admins) {
    try {
      // Check if admin already exists
      const { data: existing } = await supabase
        .from('users')
        .select('id, email, role')
        .eq('email', admin.email)
        .single();

      if (existing) {
        console.log(`Admin ${admin.email} already exists as ${existing.role}. Updating role to ${admin.role}...`);

        // Update role and password
        const hashedPassword = await bcrypt.hash(admin.password, 10);
        const { error: updateError } = await supabase
          .from('users')
          .update({
            role: admin.role,
            password: hashedPassword,
            status: 'active'
          })
          .eq('email', admin.email);

        if (updateError) {
          console.error(`Error updating ${admin.email}:`, updateError);
        } else {
          console.log(`✓ Updated ${admin.email} to ${admin.role}`);
        }
      } else {
        // Create new admin
        const hashedPassword = await bcrypt.hash(admin.password, 10);
        const { data: newAdmin, error: createError } = await supabase
          .from('users')
          .insert({
            email: admin.email,
            full_name: admin.full_name,
            role: admin.role,
            password: hashedPassword,
            status: 'active'
          })
          .select()
          .single();

        if (createError) {
          console.error(`Error creating ${admin.email}:`, createError);
        } else {
          console.log(`✓ Created ${admin.email} as ${admin.role}`);
        }
      }
    } catch (error) {
      console.error(`Error processing ${admin.email}:`, error);
    }
  }

  console.log('\nTest admin accounts created/updated:');
  console.log('academic@mushagashe.edu   - academic123   (ACADEMIC_ADMIN)');
  console.log('finance@mushagashe.edu    - finance123    (FINANCE_ADMIN)');
  console.log('admissions@mushagashe.edu - admissions123 (ADMISSIONS_ADMIN)');
  console.log('lecturer@mushagashe.edu   - lecturer123   (LECTURER_ADMIN)');
}

createTestAdmins();
