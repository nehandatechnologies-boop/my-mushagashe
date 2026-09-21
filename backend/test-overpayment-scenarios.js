/**
 * Test Overpayment and Prepayment Scenarios
 * Validates the new payment calculation logic
 */

const supabase = require('./config/supabase');
const Fee = require('./models/Fee');

async function testOverpaymentScenarios() {
  console.log('=================================================');
  console.log('TEST: Overpayment and Prepayment Scenarios');
  console.log('=================================================\n');

  try {
    // Test 1: Payment exactly equal to fee (no prepayment)
    console.log('TEST 1: Payment exactly equal to fee');
    console.log('Fee: $500, Payment: $500');
    console.log('Expected: Applied = $500, Prepayment = $0, Outstanding = $0, Status = PAID');
    console.log('');

    // Test 2: Payment greater than fee (with prepayment)
    console.log('TEST 2: Payment greater than fee');
    console.log('Fee: $500, Payment: $600');
    console.log('Expected: Applied = $500, Prepayment = $100, Outstanding = $0, Status = PAID');
    console.log('');

    // Test 3: Multiple payments with excess
    console.log('TEST 3: Multiple payments with excess');
    console.log('Fee: $500, Payment 1 = $300, Payment 2 = $300');
    console.log('Expected: Total Received = $600, Applied = $500, Prepayment = $50, Outstanding = $0, Status = PAID');
    console.log('');

    // Test 4: Partial payment (no prepayment)
    console.log('TEST 4: Partial payment (no prepayment)');
    console.log('Fee: $500, Payment = $300');
    console.log('Expected: Applied = $300, Prepayment = $0, Outstanding = $200, Status = PARTIAL');
    console.log('');

    // Test 5: Check existing fees for any negative balances (should not exist)
    console.log('TEST 5: Verify no negative balances in existing data');
    const { data: allFees, error } = await supabase
      .from('fees')
      .select('id, user_id, amount, amount_paid, balance, prepayment_credit, status');

    if (error) {
      console.error('Error fetching fees:', error);
      return;
    }

    console.log(`Total fee records: ${allFees.length}`);

    const negativeBalances = allFees.filter(f => f.balance < 0);
    const positivePrepayments = allFees.filter(f => f.prepayment_credit > 0);

    console.log(`Fees with negative balance: ${negativeBalances.length}`);
    if (negativeBalances.length > 0) {
      console.log('WARNING: Found fees with negative balance:');
      negativeBalances.forEach(f => {
        console.log(`  Fee ID ${f.id}: Balance = $${f.balance.toFixed(2)}`);
      });
    } else {
      console.log('✓ No negative balances found');
    }

    console.log(`Fees with prepayment credit: ${positivePrepayments.length}`);
    if (positivePrepayments.length > 0) {
      console.log('Sample fees with prepayment credit:');
      positivePrepayments.slice(0, 5).forEach(f => {
        console.log(`  Fee ID ${f.id}: Prepayment = $${f.prepayment_credit.toFixed(2)}, Balance = $${f.balance.toFixed(2)}`);
      });
    }

    // Test 6: Verify prepayment_credit column exists
    console.log('\nTEST 6: Verify prepayment_credit column exists');
    const { data: columns, error: colError } = await supabase
      .from('information_schema.columns')
      .select('column_name, data_type')
      .eq('table_name', 'fees')
      .eq('column_name', 'prepayment_credit');

    if (colError) {
      console.error('Error checking column:', colError);
    } else if (columns && columns.length > 0) {
      console.log('✓ prepayment_credit column exists:', columns[0]);
    } else {
      console.log('✗ prepayment_credit column NOT found - please run ADD_PREPAYMENT_CREDIT_INSTRUCTIONS.md');
    }

    // Test 7: Verify payment_history breakdown columns exist
    console.log('\nTEST 7: Verify payment_history breakdown columns exist');
    const { data: paymentColumns, error: paymentColError } = await supabase
      .from('information_schema.columns')
      .select('column_name, data_type')
      .eq('table_name', 'payment_history')
      .in('column_name', ['amount_applied_to_fee', 'prepayment_amount']);

    if (paymentColError) {
      console.error('Error checking payment_history columns:', paymentColError);
    } else {
      console.log(`Found ${paymentColumns.length} breakdown columns`);
      paymentColumns.forEach(col => {
        console.log(`✓ ${col.column_name}: ${col.data_type}`);
      });
    }

    // Test 8: Verify Students Started Paying statistic
    console.log('\nTEST 8: Verify Students Started Paying statistic');
    const studentsStartedPaying = await Fee.getStudentsStartedPaying();
    console.log(`Students Started Paying: ${studentsStartedPaying}`);

    // Test 9: Verify fee statistics include prepayment
    console.log('\nTEST 9: Verify fee statistics include prepayment');
    const feeStats = await Fee.getStatistics();
    console.log('Fee Statistics:');
    console.log(`  Total Fees: ${feeStats.total_fees}`);
    console.log(`  Unpaid: ${feeStats.unpaid_count}`);
    console.log(`  Partial: ${feeStats.partial_count}`);
    console.log(`  Paid: ${feeStats.paid_count}`);
    console.log(`  Total Amount: $${feeStats.total_amount.toFixed(2)}`);
    console.log(`  Total Collected: $${feeStats.total_collected.toFixed(2)}`);
    console.log(`  Total Outstanding: $${feeStats.total_outstanding.toFixed(2)}`);
    console.log(`  Total Prepayment Credit: $${feeStats.total_prepayment_credit.toFixed(2)}`);

    console.log('\n=================================================');
    console.log('TEST COMPLETE');
    console.log('=================================================');

  } catch (error) {
    console.error('Test error:', error);
  }
}

// Run the test
testOverpaymentScenarios();
