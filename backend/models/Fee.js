const db = require('../database/init');

class Fee {
  static create(feeData) {
    const {
      user_id, fee_category, amount, amount_paid, balance,
      payment_reference, payment_method, receipt_number, payment_date, due_date, status
    } = feeData;

    const sql = `
      INSERT INTO fees (
        user_id, fee_category, amount, amount_paid, balance,
        payment_reference, payment_method, receipt_number, payment_date, due_date, status
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `;

    const params = [
      user_id, fee_category, amount, amount_paid || 0, balance || amount,
      payment_reference, payment_method, receipt_number, payment_date, due_date, status || 'unpaid'
    ];

    const stmt = db.prepare(sql);
    return stmt.run(...params);
  }

  static findById(id) {
    const sql = `
      SELECT f.*, u.full_name, u.student_number, u.email 
      FROM fees f 
      JOIN users u ON f.user_id = u.id 
      WHERE f.id = ?
    `;
    const stmt = db.prepare(sql);
    return stmt.get(id);
  }

  static findByUserId(userId) {
    const sql = `
      SELECT f.*, c.course_name 
      FROM fees f 
      JOIN users u ON f.user_id = u.id 
      LEFT JOIN courses c ON u.course_id = c.id 
      WHERE f.user_id = ? 
      ORDER BY f.created_at DESC
    `;
    const stmt = db.prepare(sql);
    return stmt.all(userId);
  }

  static findAll(filters = {}) {
    let sql = `
      SELECT f.*, u.full_name, u.student_number, u.email, c.course_name 
      FROM fees f 
      JOIN users u ON f.user_id = u.id 
      LEFT JOIN courses c ON u.course_id = c.id 
      WHERE 1=1
    `;
    const params = [];

    if (filters.user_id) {
      sql += ' AND f.user_id = ?';
      params.push(filters.user_id);
    }

    if (filters.fee_category) {
      sql += ' AND f.fee_category = ?';
      params.push(filters.fee_category);
    }

    if (filters.status) {
      sql += ' AND f.status = ?';
      params.push(filters.status);
    }

    if (filters.search) {
      sql += ' AND (u.full_name LIKE ? OR u.student_number LIKE ?)';
      const searchTerm = `%${filters.search}%`;
      params.push(searchTerm, searchTerm);
    }

    sql += ' ORDER BY f.created_at DESC';

    if (filters.limit) {
      sql += ' LIMIT ?';
      params.push(filters.limit);
    }

    if (filters.offset) {
      sql += ' OFFSET ?';
      params.push(filters.offset);
    }

    const stmt = db.prepare(sql);
    return stmt.all(...params);
  }

  static update(id, feeData) {
    const {
      amount, amount_paid, balance, payment_reference, payment_method,
      receipt_number, payment_date, due_date, status
    } = feeData;

    const sql = `
      UPDATE fees SET
        amount = ?, amount_paid = ?, balance = ?, payment_reference = ?,
        payment_method = ?, receipt_number = ?, payment_date = ?, due_date = ?, status = ?
      WHERE id = ?
    `;

    const params = [
      amount, amount_paid, balance, payment_reference, payment_method,
      receipt_number, payment_date, due_date, status, id
    ];

    const stmt = db.prepare(sql);
    return stmt.run(...params);
  }

  static recordPayment(id, paymentData) {
    const { amount_paid, payment_reference, payment_method, receipt_number, payment_date } = paymentData;

    // First get current fee details
    const fee = this.findById(id);
    if (!fee) throw new Error('Fee not found');

    const newAmountPaid = (fee.amount_paid || 0) + amount_paid;
    const newBalance = fee.amount - newAmountPaid;
    const newStatus = newBalance <= 0 ? 'paid' : 'partial';

    return this.update(id, {
      amount: fee.amount,
      amount_paid: newAmountPaid,
      balance: newBalance,
      payment_reference,
      payment_method,
      receipt_number,
      payment_date,
      status: newStatus
    });
  }

  static delete(id) {
    const stmt = db.prepare('DELETE FROM fees WHERE id = ?');
    return stmt.run(id);
  }

  static getStatistics() {
    const sql = `
      SELECT 
        COUNT(*) as total_fees,
        SUM(CASE WHEN status = 'unpaid' THEN 1 ELSE 0 END) as unpaid_count,
        SUM(CASE WHEN status = 'partial' THEN 1 ELSE 0 END) as partial_count,
        SUM(CASE WHEN status = 'paid' THEN 1 ELSE 0 END) as paid_count,
        SUM(amount) as total_amount,
        SUM(amount_paid) as total_collected,
        SUM(balance) as total_outstanding
      FROM fees
    `;
    const stmt = db.prepare(sql);
    return stmt.get();
  }

  static getOutstandingByUser(userId) {
    const sql = `
      SELECT COALESCE(SUM(balance), 0) as total_outstanding
      FROM fees 
      WHERE user_id = ? AND status != 'paid'
    `;
    const stmt = db.prepare(sql);
    const result = stmt.get(userId);
    return result ? result.total_outstanding : 0;
  }

  static generateReceiptNumber() {
    const date = new Date();
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    
    // Get count of receipts today
    const sql = `
      SELECT COUNT(*) as count 
      FROM fees 
      WHERE payment_date >= date('now', 'start of day')
    `;
    const stmt = db.prepare(sql);
    const result = stmt.get();
    const count = (result ? result.count : 0) + 1;
    
    return `RCPT${year}${month}${day}${String(count).padStart(4, '0')}`;
  }
}

module.exports = Fee;
