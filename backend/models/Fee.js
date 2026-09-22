const supabase = require('../config/supabase');
const PaymentHistory = require('./PaymentHistory');
const StudentCredit = require('./StudentCredit');

class Fee {
  static async create(feeData) {
    const {
      user_id, fee_category, amount, amount_paid, balance, prepayment_credit,
      payment_reference, payment_method, receipt_number, payment_date, due_date, status
    } = feeData;

    const insertData = {
      user_id, fee_category, amount, amount_paid, balance, prepayment_credit,
      payment_reference, payment_method, receipt_number, payment_date, due_date, status
    };

    // Remove undefined values and convert empty strings to null
    Object.keys(insertData).forEach(key => {
      if (insertData[key] === undefined) {
        delete insertData[key];
      } else if (insertData[key] === '') {
        insertData[key] = null;
      }
    });

    const { data, error } = await supabase
      .from('fees')
      .insert(insertData)
      .select()
      .single();

    if (error) throw error;
    return data;
  }

  static async findById(id) {
    const { data, error } = await supabase
      .from('fees')
      .select(`
        *,
        users:user_id (
          full_name,
          student_number,
          email
        )
      `)
      .eq('id', id)
      .single();

    if (error) {
      if (error.code === 'PGRST116') return null; // Not found
      throw error;
    }

    // Flatten the nested data
    if (data && data.users) {
      data.full_name = data.users.full_name;
      data.student_number = data.users.student_number;
      data.email = data.users.email;
      delete data.users;
    }

    return data;
  }

  static async findByUserId(userId) {
    const { data, error } = await supabase
      .from('fees')
      .select(`
        *,
        users:user_id (
          course_id
        )
      `)
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    if (error) throw error;
    return data;
  }

  static async findAll(filters = {}) {
    let query = supabase
      .from('fees')
      .select(`
        *,
        users:user_id (
          full_name,
          student_number,
          email,
          course_id
        )
      `);

    if (filters.user_id) {
      query = query.eq('user_id', filters.user_id);
    }

    if (filters.fee_category) {
      query = query.eq('fee_category', filters.fee_category);
    }

    if (filters.status) {
      query = query.eq('status', filters.status);
    }

    query = query.order('created_at', { ascending: false });

    if (filters.limit) {
      query = query.limit(filters.limit);
    }

    if (filters.offset) {
      query = query.range(filters.offset, filters.offset + (filters.limit || 10) - 1);
    }

    const { data, error } = await query;

    if (error) throw error;

    // Flatten the nested data
    return data.map(fee => {
      if (fee.users) {
        fee.full_name = fee.users.full_name;
        fee.student_number = fee.users.student_number;
        fee.email = fee.users.email;
        fee.course_id = fee.users.course_id;
        delete fee.users;
      }
      return fee;
    });
  }

  static async update(id, feeData) {
    const {
      amount, amount_paid, balance, prepayment_credit, payment_reference, payment_method,
      receipt_number, payment_date, due_date, status
    } = feeData;

    const updateData = {
      amount, amount_paid, balance, prepayment_credit, payment_reference, payment_method,
      receipt_number, payment_date, due_date, status
    };

    // Remove undefined values and convert empty strings to null
    Object.keys(updateData).forEach(key => {
      if (updateData[key] === undefined) {
        delete updateData[key];
      } else if (updateData[key] === '') {
        updateData[key] = null;
      }
    });

    const { data, error } = await supabase
      .from('fees')
      .update(updateData)
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    return data;
  }

  static async recordPayment(id, paymentData) {
    const { amount_paid, payment_reference, payment_method, receipt_number, payment_date, recorded_by } = paymentData;

    // First get current fee details
    const fee = await this.findById(id);
    if (!fee) throw new Error('Fee not found');

    // Convert amount_paid to number to prevent string concatenation
    const paymentAmount = parseFloat(amount_paid);
    if (isNaN(paymentAmount) || paymentAmount <= 0) {
      throw new Error('Invalid payment amount');
    }

    // Calculate new payment totals
    const currentAmountPaid = fee.amount_paid || 0;
    const currentPrepayment = fee.prepayment_credit || 0;
    const newAmountPaid = currentAmountPaid + paymentAmount;

    // Calculate how much applies to the fee vs becomes prepayment
    const amountAppliedToFee = Math.min(newAmountPaid, fee.amount);
    const newPrepaymentCredit = Math.max(newAmountPaid - fee.amount, 0);

    // Balance should never be negative - capped at 0
    const newBalance = Math.max(fee.amount - amountAppliedToFee, 0);

    // Status determination
    let newStatus;
    if (newBalance === 0 && newPrepaymentCredit > 0) {
      newStatus = 'paid'; // Fully paid with prepayment
    } else if (newBalance === 0) {
      newStatus = 'paid'; // Exactly paid
    } else if (amountAppliedToFee > 0) {
      newStatus = 'partial'; // Partial payment
    } else {
      newStatus = 'unpaid'; // No payment applied to fee
    }

    // Create payment history record with actual payment amount
    await PaymentHistory.create({
      fee_id: id,
      user_id: fee.user_id,
      amount_paid: paymentAmount,
      amount_applied_to_fee: Math.min(paymentAmount, fee.amount - currentAmountPaid),
      prepayment_amount: Math.max(paymentAmount - (fee.amount - currentAmountPaid), 0),
      payment_reference,
      payment_method,
      receipt_number,
      payment_date: payment_date || new Date().toISOString(),
      recorded_by
    });

    // Update the fee record with both fee-level prepayment and track in student_credits table
    const updatedFee = await this.update(id, {
      amount: fee.amount,
      amount_paid: amountAppliedToFee,
      balance: newBalance,
      prepayment_credit: newPrepaymentCredit,
      payment_reference,
      payment_method,
      receipt_number,
      payment_date,
      status: newStatus
    });

    // Also create/update student_credits record for transferable credit
    if (newPrepaymentCredit > 0) {
      try {
        const StudentCredit = require('./StudentCredit');
        // Check if student already has a credit record
        const existingCredits = await StudentCredit.findByUserId(fee.user_id);
        const availableCredit = await StudentCredit.getAvailableCredit(fee.user_id);

        // Add the new prepayment to student's available credit
        if (existingCredits.length > 0) {
          // Update existing credit record
          const totalCredit = availableCredit + newPrepaymentCredit;
          await StudentCredit.create({
            user_id: fee.user_id,
            amount: newPrepaymentCredit,
            original_payment_id: null, // Fee-level tracking is primary
            status: 'available',
            notes: `Prepayment from fee ${id}`
          });
        } else {
          // Create new credit record
          await StudentCredit.create({
            user_id: fee.user_id,
            amount: newPrepaymentCredit,
            original_payment_id: null,
            status: 'available',
            notes: `Prepayment from fee ${id}`
          });
        }
      } catch (error) {
        // If student_credits table doesn't exist yet, log warning but don't fail payment
        if (error.code === '42P01' || error.message.includes('does not exist')) {
          console.warn('student_credits table does not exist yet. Prepayment tracked in fee.prepayment_credit.');
        } else {
          console.error('Error creating student credit:', error);
        }
      }
    }

    return updatedFee;
  }

  static async delete(id) {
    const { error } = await supabase
      .from('fees')
      .delete()
      .eq('id', id);

    if (error) throw error;
    return true;
  }

  static async getStatistics() {
    const { data, error } = await supabase
      .from('fees')
      .select('amount, amount_paid, balance, status, prepayment_credit');

    if (error) throw error;

    const stats = {
      total_fees: data.length,
      unpaid_count: data.filter(f => f.status === 'unpaid').length,
      partial_count: data.filter(f => f.status === 'partial').length,
      paid_count: data.filter(f => f.status === 'paid').length,
      total_amount: data.reduce((sum, f) => sum + (f.amount || 0), 0),
      total_collected: data.reduce((sum, f) => sum + (f.amount_paid || 0), 0),
      total_outstanding: data.reduce((sum, f) => sum + (f.balance || 0), 0),
      total_prepayment_credit: data.reduce((sum, f) => sum + (f.prepayment_credit || 0), 0)
    };

    return stats;
  }

  static async getStudentsStartedPaying() {
    // Get unique students who have made at least one payment (amount_paid > 0)
    const { data, error } = await supabase
      .from('fees')
      .select('user_id')
      .gt('amount_paid', 0);

    if (error) throw error;

    // Count unique user_ids
    const uniqueStudents = new Set(data.map(f => f.user_id));
    return uniqueStudents.size;
  }

  static async getOutstandingByUser(userId) {
    const { data, error } = await supabase
      .from('fees')
      .select('*')
      .eq('user_id', userId)
      .in('status', ['unpaid', 'partial'])
      .order('due_date', { ascending: true });

    if (error) throw error;
    return data;
  }

  static async generateReceiptNumber() {
    const { data, error } = await supabase
      .from('fees')
      .select('receipt_number')
      .not('receipt_number', 'is', null)
      .order('created_at', { ascending: false })
      .limit(1);

    if (error) throw error;

    if (data.length === 0) {
      return 'REC-001';
    }

    const lastReceipt = data[0].receipt_number;
    const lastNumber = parseInt(lastReceipt.split('-')[1]);
    const newNumber = lastNumber + 1;
    return `REC-${String(newNumber).padStart(3, '0')}`;
  }

  static async checkOutstandingBalance(userId) {
    const { data, error } = await supabase
      .from('fees')
      .select('balance')
      .eq('user_id', userId)
      .in('status', ['unpaid', 'partial']);

    if (error) throw error;

    const totalOutstanding = data.reduce((sum, f) => sum + (f.balance || 0), 0);
    return totalOutstanding;
  }

  static async getStudentSummary(userId) {
    try {
      // Get all fees for the student
      const { data: fees, error } = await supabase
        .from('fees')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('[FEE.SUMMARY] Supabase error:', error);
        throw error;
      }

      if (!fees || fees.length === 0) {
        return {
          has_fees: false,
          total_fees: 0,
          total_charged: 0,
          total_paid: 0,
          outstanding_balance: 0,
          status: 'no_fees',
          available_credit: 0
        };
      }

      const totalCharged = fees.reduce((sum, f) => sum + (f.amount || 0), 0);
      const totalPaid = fees.reduce((sum, f) => sum + (f.amount_paid || 0), 0);
      const outstandingBalance = fees.reduce((sum, f) => sum + (f.balance || 0), 0);

      // Calculate available credit from fee-level prepayment_credit
      const feeLevelCredit = fees.reduce((sum, f) => sum + (f.prepayment_credit || 0), 0);

      // Also check student_credits table for transferable credit
      let studentCredits = 0;
      try {
        const StudentCredit = require('./StudentCredit');
        studentCredits = await StudentCredit.getAvailableCredit(userId);
      } catch (error) {
        // If student_credits table doesn't exist, use fee-level credit only
        if (error.code !== '42P01' && !error.message.includes('does not exist')) {
          console.error('[FEE.SUMMARY] Error getting student credits:', error);
        }
      }

      // Total available credit is the sum of fee-level and student-level credit
      const availableCredit = feeLevelCredit + studentCredits;

      // Determine overall status
      let status = 'paid';
      if (outstandingBalance > 0) {
        status = 'partial';
      }
      if (fees.some(f => f.status === 'unpaid')) {
        status = 'unpaid';
      }

      return {
        has_fees: true,
        total_fees: fees.length,
        total_charged: totalCharged,
        total_paid: totalPaid,
        outstanding_balance: outstandingBalance,
        available_credit: availableCredit,
        status: status
      };
    } catch (error) {
      console.error('[FEE.SUMMARY] GetStudentSummary error:', error);
      throw error;
    }
  }
}

module.exports = Fee;
