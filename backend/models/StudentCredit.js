const supabase = require('../config/supabase');

class StudentCredit {
  static async create(creditData) {
    const {
      user_id, amount, original_payment_id, allocated_to_fee_id,
      allocation_amount, status, notes
    } = creditData;

    const insertData = {
      user_id, amount, original_payment_id, allocated_to_fee_id,
      allocation_amount, status: status || 'available', notes
    };

    // Remove undefined values and convert empty strings to null
    Object.keys(insertData).forEach(key => {
      if (insertData[key] === undefined || insertData[key] === '') {
        delete insertData[key];
      }
    });

    const { data, error } = await supabase
      .from('student_credits')
      .insert(insertData)
      .select()
      .single();

    if (error) throw error;
    return data;
  }

  static async findByUserId(userId) {
    const { data, error } = await supabase
      .from('student_credits')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    if (error) throw error;
    return data;
  }

  static async getAvailableCredit(userId) {
    const { data, error } = await supabase
      .from('student_credits')
      .select('amount, allocation_amount')
      .eq('user_id', userId)
      .in('status', ['available', 'partially_allocated']);

    if (error) throw error;

    // Calculate available credit (amount - allocation_amount)
    const availableCredit = data.reduce((sum, credit) => {
      const allocated = credit.allocation_amount || 0;
      const remaining = credit.amount - allocated;
      return sum + Math.max(remaining, 0);
    }, 0);

    return availableCredit;
  }

  static async allocateCredit(creditId, feeId, amount) {
    const credit = await this.findById(creditId);
    if (!credit) throw new Error('Credit not found');

    if (credit.status === 'allocated') {
      throw new Error('Credit is already fully allocated');
    }

    const currentAllocated = credit.allocation_amount || 0;
    const remainingCredit = credit.amount - currentAllocated;

    if (amount > remainingCredit) {
      throw new Error(`Cannot allocate $${amount}. Only $${remainingCredit} available.`);
    }

    const newAllocationAmount = currentAllocated + amount;
    const newStatus = newAllocationAmount >= credit.amount ? 'allocated' : 'partially_allocated';

    const { data, error } = await supabase
      .from('student_credits')
      .update({
        allocated_to_fee_id: feeId,
        allocation_amount: newAllocationAmount,
        status: newStatus,
        updated_at: new Date().toISOString()
      })
      .eq('id', creditId)
      .select()
      .single();

    if (error) throw error;
    return data;
  }

  static async findById(id) {
    const { data, error } = await supabase
      .from('student_credits')
      .select('*')
      .eq('id', id)
      .single();

    if (error) {
      if (error.code === 'PGRST116') return null;
      throw error;
    }

    return data;
  }

  static async getTotalAvailableCredit() {
    const { data, error } = await supabase
      .from('student_credits')
      .select('amount, allocation_amount')
      .in('status', ['available', 'partially_allocated']);

    if (error) throw error;

    const totalAvailable = data.reduce((sum, credit) => {
      const allocated = credit.allocation_amount || 0;
      const remaining = credit.amount - allocated;
      return sum + Math.max(remaining, 0);
    }, 0);

    return totalAvailable;
  }
}

module.exports = StudentCredit;
