const supabase = require('../config/supabase');

class Fee {
  static async create(feeData) {
    const {
      user_id, fee_category, amount, amount_paid, balance,
      payment_reference, payment_method, receipt_number, payment_date, due_date, status
    } = feeData;

    const insertData = {
      user_id, fee_category, amount, amount_paid, balance,
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
      amount, amount_paid, balance, payment_reference, payment_method,
      receipt_number, payment_date, due_date, status
    } = feeData;

    const updateData = {
      amount, amount_paid, balance, payment_reference, payment_method,
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

    const newAmountPaid = (fee.amount_paid || 0) + paymentAmount;
    const newBalance = fee.amount - newAmountPaid;
    const newStatus = newBalance <= 0 ? 'paid' : 'partial';

    // Update the fee record
    const updatedFee = await this.update(id, {
      amount: fee.amount,
      amount_paid: newAmountPaid,
      balance: newBalance,
      payment_reference,
      payment_method,
      receipt_number,
      payment_date,
      status: newStatus
    });

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
      .select('amount, amount_paid, balance, status');

    if (error) throw error;

    const stats = {
      total_fees: data.length,
      unpaid_count: data.filter(f => f.status === 'unpaid').length,
      partial_count: data.filter(f => f.status === 'partial').length,
      paid_count: data.filter(f => f.status === 'paid').length,
      total_amount: data.reduce((sum, f) => sum + (f.amount || 0), 0),
      total_collected: data.reduce((sum, f) => sum + (f.amount_paid || 0), 0),
      total_outstanding: data.reduce((sum, f) => sum + (f.balance || 0), 0)
    };

    return stats;
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
}

module.exports = Fee;
