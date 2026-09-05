const supabase = require('../config/supabase');
const fs = require('fs');
const path = require('path');

async function runIntakeMigration() {
    console.log('[Migration] Starting intake column migration...');
    
    try {
        // Read the SQL migration file
        const sqlPath = path.join(__dirname, '../database/add-intake-column.sql');
        const sql = fs.readFileSync(sqlPath, 'utf8');
        
        console.log('[Migration] SQL file loaded:', sqlPath);
        
        // Split SQL into individual statements
        const statements = sql
            .split(';')
            .map(s => s.trim())
            .filter(s => s.length > 0 && !s.startsWith('--'));
        
        console.log('[Migration] Found', statements.length, 'SQL statements to execute');
        
        // Execute each statement
        for (let i = 0; i < statements.length; i++) {
            const statement = statements[i];
            console.log(`[Migration] Executing statement ${i + 1}/${statements.length}:`, statement.substring(0, 50) + '...');
            
            // Skip SELECT statements (they're for verification)
            if (statement.toUpperCase().startsWith('SELECT')) {
                console.log('[Migration] Skipping SELECT statement (verification only)');
                continue;
            }
            
            const { data, error } = await supabase.rpc('exec_sql', { sql: statement });
            
            if (error) {
                // Check if it's a "column already exists" error (which is OK)
                if (error.message.includes('already exists') || error.code === '42P07') {
                    console.log('[Migration] Column/index already exists, skipping...');
                    continue;
                }
                throw error;
            }
            
            console.log('[Migration] Statement executed successfully');
        }
        
        // Verify the migration
        console.log('[Migration] Verifying migration...');
        const { data: verifyData, error: verifyError } = await supabase
            .from('users')
            .select('intake_year, intake')
            .limit(5);
        
        if (verifyError) {
            console.error('[Migration] Verification failed:', verifyError);
        } else {
            console.log('[Migration] Verification successful. Sample data:', verifyData);
        }
        
        console.log('[Migration] ✅ Migration completed successfully!');
        console.log('[Migration] The intake column has been added to the users table.');
        console.log('[Migration] Existing intake_year values are preserved for backward compatibility.');
        
    } catch (error) {
        console.error('[Migration] ❌ Migration failed:', error);
        console.error('[Migration] Error details:', error.message);
        console.error('[Migration] You may need to run the migration manually in the Supabase SQL editor.');
        process.exit(1);
    }
}

// Alternative: Direct SQL execution via Supabase client
// Note: Supabase JS client doesn't support arbitrary SQL execution directly
// This script provides guidance for manual execution

async function main() {
    console.log('='.repeat(60));
    console.log('INTAKE COLUMN MIGRATION');
    console.log('='.repeat(60));
    console.log('');
    console.log('This script adds the "intake" column to the users table.');
    console.log('The new column will store intake values like "January 2026".');
    console.log('');
    console.log('⚠️  IMPORTANT: The Supabase JS client does not support arbitrary');
    console.log('   SQL execution directly. You have two options:');
    console.log('');
    console.log('   Option 1: Run the SQL manually in Supabase SQL Editor');
    console.log('   - Go to your Supabase project dashboard');
    console.log('   - Navigate to SQL Editor');
    console.log('   - Open and run: backend/database/add-intake-column.sql');
    console.log('');
    console.log('   Option 2: Use the Supabase CLI');
    console.log('   - Install Supabase CLI: npm install -g supabase');
    console.log('   - Run: supabase db execute backend/database/add-intake-column.sql');
    console.log('');
    console.log('='.repeat(60));
    console.log('');
    
    // Try to execute via direct query (may not work for DDL)
    try {
        console.log('[Migration] Attempting to add intake column via direct query...');
        
        // Try to add the column (this may fail due to Supabase restrictions)
        const { data, error } = await supabase
            .from('users')
            .select('intake')
            .limit(1);
        
        if (error && error.message.includes('column') && error.message.includes('does not exist')) {
            console.log('[Migration] Intake column does not exist yet.');
            console.log('[Migration] Please run the migration manually using Option 1 or 2 above.');
        } else if (!error) {
            console.log('[Migration] ✅ Intake column already exists!');
            console.log('[Migration] Sample data:', data);
        }
        
    } catch (e) {
        console.log('[Migration] Could not verify column status:', e.message);
    }
    
    console.log('');
    console.log('Migration script completed.');
}

main();
