/**
 * Inspect Current Supabase Database Structure
 * Analyze existing fee/payment tables to design student-level credit system
 */

const supabase = require('../config/supabase');

async function inspectDatabaseStructure() {
  console.log('=================================================');
  console.log('DATABASE STRUCTURE INSPECTION');
  console.log('=================================================\n');

  try {
    // Get all tables
    const { data: tables, error: tablesError } = await supabase
      .from('information_schema.tables')
      .select('table_name')
      .eq('table_schema', 'public')
      .order('table_name');

    if (tablesError) {
      console.error('Error fetching tables:', tablesError);
      return;
    }

    console.log('Available Tables:');
    tables.forEach(t => console.log(`  - ${t.table_name}`));
    console.log('');

    // Inspect fees table structure
    console.log('FEES TABLE STRUCTURE:');
    const { data: feeColumns, error: feeError } = await supabase
      .from('information_schema.columns')
      .select('column_name, data_type, is_nullable, column_default')
      .eq('table_name', 'fees')
      .order('ordinal_position');

    if (feeError) {
      console.error('Error fetching fee columns:', feeError);
    } else {
      feeColumns.forEach(col => {
        console.log(`  ${col.column_name}: ${col.data_type} (nullable: ${col.is_nullable})`);
      });
    }
    console.log('');

    // Inspect payment_history table structure
    console.log('PAYMENT_HISTORY TABLE STRUCTURE:');
    const { data: paymentColumns, error: paymentError } = await supabase
      .from('information_schema.columns')
      .select('column_name, data_type, is_nullable, column_default')
      .eq('table_name', 'payment_history')
      .order('ordinal_position');

    if (paymentError) {
      console.error('Error fetching payment_history columns:', paymentError);
    } else {
      paymentColumns.forEach(col => {
        console.log(`  ${col.column_name}: ${col.data_type} (nullable: ${col.is_nullable})`);
      });
    }
    console.log('');

    // Inspect users table structure
    console.log('USERS TABLE STRUCTURE:');
    const { data: userColumns, error: userError } = await supabase
      .from('information_schema.columns')
      .select('column_name, data_type, is_nullable, column_default')
      .eq('table_name', 'users')
      .order('ordinal_position');

    if (userError) {
      console.error('Error fetching user columns:', userError);
    } else {
      userColumns.forEach(col => {
        console.log(`  ${col.column_name}: ${col.data_type} (nullable: ${col.is_nullable})`);
      });
    }
    console.log('');

    // Check for existing student credit table
    console.log('CHECKING FOR EXISTING CREDIT TABLES:');
    const creditTables = tables.filter(t =>
      t.table_name.includes('credit') ||
      t.table_name.includes('balance') ||
      t.table_name.includes('prepayment')
    );

    if (creditTables.length > 0) {
      console.log('Found credit-related tables:');
      creditTables.forEach(t => console.log(`  - ${t.table_name}`));
    } else {
      console.log('No existing credit tables found - will need to create student_credit table');
    }
    console.log('');

    // Sample fee data
    console.log('SAMPLE FEE DATA (first 3 records):');
    const { data: sampleFees, error: sampleError } = await supabase
      .from('fees')
      .select('*')
      .limit(3);

    if (sampleError) {
      console.error('Error fetching sample fees:', sampleError);
    } else {
      sampleFees.forEach(fee => {
        console.log(`  Fee ID ${fee.id}: User ${fee.user_id}, Amount $${fee.amount}, Paid $${fee.amount_paid || 0}, Balance $${fee.balance || 0}`);
      });
    }
    console.log('');

    // Sample payment history data
    console.log('SAMPLE PAYMENT HISTORY (first 3 records):');
    const { data: samplePayments, error: samplePaymentError } = await supabase
      .from('payment_history')
      .select('*')
      .limit(3);

    if (samplePaymentError) {
      console.error('Error fetching sample payments:', samplePaymentError);
    } else {
      samplePayments.forEach(payment => {
        console.log(`  Payment ID ${payment.id}: Fee ${payment.fee_id}, User ${payment.user_id}, Amount $${payment.amount_paid}`);
      });
    }

    console.log('\n=================================================');
    console.log('INSPECTION COMPLETE');
    console.log('=================================================');

  } catch (error) {
    console.error('Inspection error:', error);
  }
}

inspectDatabaseStructure();
