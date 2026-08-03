const supabase = require('../config/supabase');

class PaymentHistory {
  static async create(paymentData) {
    const {
      fee_id, user_id, amount_paid, payment_reference, payment_method,
      receipt_number, payment_date, recorded_by, notes
    } = paymentData;

    const insertData = {
      fee_id, user_id, amount_paid, payment_reference, payment_method,
      receipt_number, payment_date, recorded_by, notes
    };

    // Remove undefined values and convert empty strings to null
    Object.keys(insertData).forEach(key => {
      if (insertData[key] === undefined || insertData[key] === '') {
        delete insertData[key];
      }
    });

    const { data, error } = await supabase
      .from('payment_history')
      .insert(insertData)
      .select()
      .single();

    if (error) throw error;
    return data;
  }

  static async findByFeeId(feeId) {
    const { data, error } = await supabase
      .from('payment_history')
      .select('*')
      .eq('fee_id', feeId)
      .order('payment_date', { ascending: false });

    if (error) throw error;
    return data;
  }

  static async findByUserId(userId) {
    const { data, error } = await supabase
      .from('payment_history')
      .select('*')
      .eq('user_id', userId)
      .order('payment_date', { ascending: false });

    if (error) throw error;
    return data;
  }

  static async getTotalPaidByFeeId(feeId) {
    const { data, error } = await supabase
      .from('payment_history')
      .select('amount_paid')
      .eq('fee_id', feeId);

    if (error) throw error;

    const total = data.reduce((sum, payment) => sum + (payment.amount_paid || 0), 0);
    return total;
  }

  static async getTotalPaidByUserId(userId) {
    const { data, error } = await supabase
      .from('payment_history')
      .select('amount_paid')
      .eq('user_id', userId);

    if (error) throw error;

    const total = data.reduce((sum, payment) => sum + (payment.amount_paid || 0), 0);
    return total;
  }
}

module.exports = PaymentHistory;
