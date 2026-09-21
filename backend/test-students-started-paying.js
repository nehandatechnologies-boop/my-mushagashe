/**
 * Test Students Started Paying Statistic
 * Validates the calculation of unique students who have made at least one payment
 */

const supabase = require('./config/supabase');

async function testStudentsStartedPaying() {
  console.log('=================================================');
  console.log('TEST: Students Started Paying Statistic');
  console.log('=================================================\n');

  try {
    // Step 1: Get all fees with amount_paid > 0
    console.log('Step 1: Fetching fees with amount_paid > 0...');
    const { data: fees, error } = await supabase
      .from('fees')
      .select('id, user_id, amount, amount_paid, balance, status')
      .gt('amount_paid', 0);

    if (error) {
      console.error('Error fetching fees:', error);
      return;
    }

    console.log(`Found ${fees.length} fee records with payments\n`);

    // Step 2: Count unique user_ids
    console.log('Step 2: Counting unique students...');
    const uniqueStudents = new Set(fees.map(f => f.user_id));
    const uniqueCount = uniqueStudents.size;
    console.log(`Unique students who have paid: ${uniqueCount}\n`);

    // Step 3: Verify against backend method
    console.log('Step 3: Verifying against backend method...');
    const Fee = require('./models/Fee');
    const backendCount = await Fee.getStudentsStartedPaying();
    console.log(`Backend count: ${backendCount}\n`);

    // Step 4: Show sample data
    console.log('Step 4: Sample payment data:');
    console.log('Student ID | Amount | Amount Paid | Balance | Status');
    console.log('-----------|--------|-------------|---------|--------');
    fees.slice(0, 10).forEach(fee => {
      console.log(`${fee.user_id} | $${fee.amount.toFixed(2)} | $${fee.amount_paid.toFixed(2)} | $${fee.balance.toFixed(2)} | ${fee.status}`);
    });

    if (fees.length > 10) {
      console.log(`... and ${fees.length - 10} more records\n`);
    }

    // Step 5: Validation
    console.log('Step 5: Validation Results:');
    console.log(`✓ Frontend calculation: ${uniqueCount}`);
    console.log(`✓ Backend calculation: ${backendCount}`);
    console.log(`✓ Match: ${uniqueCount === backendCount ? 'YES' : 'NO'}\n`);

    // Step 6: Breakdown by payment status
    console.log('Step 6: Breakdown by payment status:');
    const statusBreakdown = {
      partial: new Set(),
      paid: new Set()
    };

    fees.forEach(fee => {
      if (fee.status === 'partial') {
        statusBreakdown.partial.add(fee.user_id);
      } else if (fee.status === 'paid') {
        statusBreakdown.paid.add(fee.user_id);
      }
    });

    console.log(`Partial payments: ${statusBreakdown.partial.size} unique students`);
    console.log(`Fully paid: ${statusBreakdown.paid.size} unique students`);
    console.log(`Total unique: ${uniqueCount} (partial + fully paid)\n`);

    // Step 7: Check for students with multiple payment records
    console.log('Step 7: Checking for students with multiple payment records...');
    const studentPaymentCounts = {};
    fees.forEach(fee => {
      studentPaymentCounts[fee.user_id] = (studentPaymentCounts[fee.user_id] || 0) + 1;
    });

    const studentsWithMultiplePayments = Object.entries(studentPaymentCounts)
      .filter(([_, count]) => count > 1)
      .map(([userId, count]) => ({ userId, count }));

    console.log(`Students with multiple payment records: ${studentsWithMultiplePayments.length}`);
    if (studentsWithMultiplePayments.length > 0) {
      console.log('Sample:');
      studentsWithMultiplePayments.slice(0, 5).forEach(({ userId, count }) => {
        console.log(`  Student ${userId}: ${count} payment records`);
      });
    }
    console.log(`✓ Each counts as ONE student in the statistic\n`);

    console.log('=================================================');
    console.log('TEST COMPLETE');
    console.log('=================================================');
    console.log(`\nFINAL RESULT: ${uniqueCount} unique students have started paying fees`);

  } catch (error) {
    console.error('Test error:', error);
  }
}

// Run the test
testStudentsStartedPaying();
