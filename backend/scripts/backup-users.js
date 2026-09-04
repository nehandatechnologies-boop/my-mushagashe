require('dotenv').config();
const supabase = require('../config/supabase');
const fs = require('fs');
const path = require('path');

async function backupUsers() {
  console.log('Starting users backup...');
  
  try {
    // Fetch all users from custom users table
    const { data: users, error } = await supabase
      .from('users')
      .select('*');
    
    if (error) {
      console.error('Error fetching users:', error);
      process.exit(1);
    }
    
    console.log(`Found ${users.length} users to backup`);
    
    // Create backup directory if it doesn't exist
    const backupDir = path.join(__dirname, '../../backups');
    if (!fs.existsSync(backupDir)) {
      fs.mkdirSync(backupDir, { recursive: true });
    }
    
    // Create backup file with timestamp
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const backupFile = path.join(backupDir, `users-backup-${timestamp}.json`);
    
    // Write backup file
    fs.writeFileSync(backupFile, JSON.stringify(users, null, 2));
    
    console.log(`Backup saved to: ${backupFile}`);
    console.log(`Total users backed up: ${users.length}`);
    
    // Display user summary
    const summary = {
      total: users.length,
      students: users.filter(u => u.role === 'student').length,
      lecturers: users.filter(u => u.role === 'lecturer').length,
      admins: users.filter(u => u.role === 'admin').length,
      with_email: users.filter(u => u.email).length,
      verified: users.filter(u => u.email_verified).length
    };
    
    console.log('\nBackup Summary:');
    console.log(JSON.stringify(summary, null, 2));
    
    process.exit(0);
  } catch (error) {
    console.error('Backup failed:', error);
    process.exit(1);
  }
}

backupUsers();
