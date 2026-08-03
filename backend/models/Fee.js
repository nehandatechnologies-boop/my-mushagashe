const supabase = require('../config/supabase');
const PaymentHistory = require('./PaymentHistory');

class Fee {
  static async create(feeData) {
    const {
      user_id, fee_category, amount, amount_paid, balance,
      payment_reference, payment_method, receipt_number, payment_date, due_date, status
    } = feeData;

    const insertData = {
      user_id, fee_category, amount,
      amount_paid: amount_paid || 0,
      balance: balance || amount,
      payment_reference, payment_method, receipt_number, payment_date, due_date,
      status: status || 'unpaid'
    };

    // Remove undefined values and convert empty strings to null
    Object.keys(insertData).forEach(key => {
      if (insertData[key] === undefined || insertData[key] === '') {
        delete insertData[key];
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

    // Flatten the nested user data
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
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    if (error) throw error;

    // Fetch user data
    const { data: userData, error: userError } = await supabase
      .from('users')
      .select('id, full_name, student_number, email, course_id')
      .eq('id', userId)
      .single();

    if (!userError && userData && userData.course_id) {
      // Fetch course data
      const { data: courseData, error: courseError } = await supabase
        .from('courses')
        .select('course_name')
        .eq('id', userData.course_id)
        .single();

      if (!courseError && courseData) {
        // Add course name to each fee
        return data.map(fee => ({
          ...fee,
          course_name: courseData.course_name
        }));
      }
    }

    return data;
  }

  static async findAll(filters = {}) {
    let query = supabase
      .from('fees')
      .select('*');

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

    if (error) {
      console.error('Fee.findAll query error:', error);
      throw error;
    }

    // If no fees, return empty array
    if (!data || data.length === 0) {
      return [];
    }

    // Fetch user data for each fee
    const userIds = [...new Set(data.map(f => f.user_id))];
    let usersData = [];
    
    if (userIds.length > 0) {
      const { data: userData, error: userError } = await supabase
        .from('users')
        .select('id, full_name, student_number, email, course_id')
        .in('id', userIds);
      
      if (userError) {
        console.error('Fee.findAll users query error:', userError);
        // Continue with empty users data
      } else {
        usersData = userData || [];
      }
    }

    const usersMap = {};
    usersData.forEach(user => {
      usersMap[user.id] = user;
    });

    // Fetch course data for users who have courses
    const courseIds = [...new Set(usersData.filter(u => u.course_id).map(u => u.course_id))];
    let coursesData = [];
    
    if (courseIds.length > 0) {
      const { data: courseData, error: courseError } = await supabase
        .from('courses')
        .select('id, course_name')
        .in('id', courseIds);
      
      if (courseError) {
        console.error('Fee.findAll courses query error:', courseError);
        // Continue with empty courses data
      } else {
        coursesData = courseData || [];
      }
    }

    const coursesMap = {};
    coursesData.forEach(course => {
      coursesMap[course.id] = course.course_name;
    });

    // Merge data
    return data.map(fee => {
      const user = usersMap[fee.user_id];
      if (user) {
        fee.full_name = user.full_name;
        fee.student_number = user.student_number;
        fee.email = user.email;
        if (user.course_id && coursesMap[user.course_id]) {
          fee.course_name = coursesMap[user.course_id];
        }
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
      if (updateData[key] === undefined || updateData[key] === '') {
        delete updateData[key];
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

    const newAmountPaid = (fee.amount_paid || 0) + amount_paid;
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

    // Create payment history entry
    await PaymentHistory.create({
      fee_id: id,
      user_id: fee.user_id,
      amount_paid,
      payment_reference,
      payment_method,
      receipt_number,
      payment_date,
      recorded_by,
      notes: `Payment recorded for ${fee.fee_category}`
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
      .select('balance')
      .eq('user_id', userId)
      .neq('status', 'paid');

    if (error) throw error;

    const totalOutstanding = data.reduce((sum, f) => sum + (f.balance || 0), 0);
    return totalOutstanding;
  }

  static async generateReceiptNumber() {
    const date = new Date();
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');

    // Get count of receipts today
    const startOfDay = new Date(date.setHours(0, 0, 0, 0)).toISOString();
    const { count, error } = await supabase
      .from('fees')
      .select('*', { count: 'exact', head: true })
      .gte('payment_date', startOfDay);

    if (error) throw error;

    const receiptCount = (count || 0) + 1;

    return `RCPT${year}${month}${day}${String(receiptCount).padStart(4, '0')}`;
  }

  static async hasOutstandingFees(userId) {
    const { data, error } = await supabase
      .from('fees')
      .select('balance, status')
      .eq('user_id', userId)
      .neq('status', 'paid');

    if (error) throw error;

    // Check if there are any fees with outstanding balance
    const hasUnpaid = data.some(fee => fee.balance > 0);
    return hasUnpaid;
  }

  static async getOutstandingBalance(userId) {
    const { data, error } = await supabase
      .from('fees')
      .select('balance')
      .eq('user_id', userId)
      .neq('status', 'paid');

    if (error) throw error;

    const totalOutstanding = data.reduce((sum, f) => sum + (f.balance || 0), 0);
    return totalOutstanding;
  }
}

module.exports = Fee;
