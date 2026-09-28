const bcrypt = require('bcryptjs');
const User = require('../models/User');
const supabase = require('../config/supabase');

/**
 * Bulk Password Reset Script
 * 
 * This script resets all student passwords to temporary passwords
 * to fix the double-hashing bug issue.
 * 
 * Run: node scripts/reset-all-student-passwords.js
 */

async function resetAllStudentPasswords() {
  try {
    console.log('[PASSWORD RESET] Starting bulk student password reset...');
    
    // Get all students
    const { data: students, error } = await supabase
      .from('users')
      .select('id, student_number, full_name, email')
      .eq('role', 'student')
      .eq('status', 'active');
    
    if (error) {
      console.error('[PASSWORD RESET] Error fetching students:', error);
      process.exit(1);
    }
    
    console.log(`[PASSWORD RESET] Found ${students.length} active students`);
    
    let successCount = 0;
    let errorCount = 0;
    const errors = [];
    
    for (const student of students) {
      try {
        // Generate temporary password
        const tempPassword = Math.random().toString(36).slice(-8) + Math.random().toString(36).slice(-4);
        
        // Hash the temporary password (single hash - correct method)
        const hashedPassword = bcrypt.hashSync(tempPassword, 10);
        
        // Update student with new password and set must_change_password
        const { error: updateError } = await supabase
          .from('users')
          .update({
            password: hashedPassword,
            must_change_password: true
          })
          .eq('id', student.id);
        
        if (updateError) {
          throw updateError;
        }
        
        console.log(`[PASSWORD RESET] ✓ Reset password for ${student.student_number} - ${student.full_name} (Temp: ${tempPassword})`);
        successCount++;
        
        // Store the temporary password for reporting
        student.temp_password = tempPassword;
      } catch (error) {
        console.error(`[PASSWORD RESET] ✗ Failed to reset password for ${student.student_number}:`, error.message);
        errorCount++;
        errors.push({
          student_number: student.student_number,
          full_name: student.full_name,
          error: error.message
        });
      }
    }
    
    console.log('\n[PASSWORD RESET] ========================================');
    console.log(`[PASSWORD RESET] Total students: ${students.length}`);
    console.log(`[PASSWORD RESET] Successfully reset: ${successCount}`);
    console.log(`[PASSWORD RESET] Failed: ${errorCount}`);
    console.log('[PASSWORD RESET] ========================================');
    
    if (errors.length > 0) {
      console.log('\n[PASSWORD RESET] Errors:');
      errors.forEach(err => {
        console.log(`  - ${err.student_number} (${err.full_name}): ${err.error}`);
      });
    }
    
    console.log('\n[PASSWORD RESET] Temporary passwords for students:');
    students.forEach(student => {
      if (student.temp_password) {
        console.log(`  ${student.student_number} - ${student.full_name}: ${student.temp_password}`);
      }
    });
    
    console.log('\n[PASSWORD RESET] IMPORTANT:');
    console.log('[PASSWORD RESET] - Students must change their password on first login');
    console.log('[PASSWORD RESET] - Email or distribute these temporary passwords to students');
    console.log('[PASSWORD RESET] - After password change, login will work correctly');
    
  } catch (error) {
    console.error('[PASSWORD RESET] Critical error:', error);
    process.exit(1);
  }
}

// Run the reset
resetAllStudentPasswords();
