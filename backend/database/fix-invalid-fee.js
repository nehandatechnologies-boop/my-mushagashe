const supabase = require('../config/supabase');

async function fixInvalidFee() {
  console.log('Checking for invalid fee records...');

  // Find fee with negative balance
  const { data: invalidFees, error } = await supabase
    .from('fees')
    .select('*')
    .lt('balance', 0);

  if (error) {
    console.error('Error fetching invalid fees:', error);
    return;
  }

  if (invalidFees && invalidFees.length > 0) {
    console.log(`Found ${invalidFees.length} fees with negative balance:`);
    invalidFees.forEach(fee => {
      console.log(`  ID: ${fee.id}, Amount: ${fee.amount}, Paid: ${fee.amount_paid}, Balance: ${fee.balance}`);
    });

    // Fix fee id 10 specifically
    const fee10 = invalidFees.find(f => f.id === 10);
    if (fee10) {
      console.log('\nFixing fee ID 10...');
      console.log(`  Current: amount=${fee10.amount}, amount_paid=${fee10.amount_paid}, balance=${fee10.balance}`);

      // Correct the amount_paid to match the amount
      const correctedAmountPaid = fee10.amount;
      const correctedBalance = 0;

      const { error: updateError } = await supabase
        .from('fees')
        .update({
          amount_paid: correctedAmountPaid,
          balance: correctedBalance,
          status: 'paid'
        })
        .eq('id', 10);

      if (updateError) {
        console.error('Error updating fee:', updateError);
      } else {
        console.log('✓ Fee ID 10 corrected');
        console.log(`  New: amount=${fee10.amount}, amount_paid=${correctedAmountPaid}, balance=${correctedBalance}`);
      }
    }
  } else {
    console.log('No fees with negative balance found.');
  }
}

fixInvalidFee();
