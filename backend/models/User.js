const db = require('../database/init');

class User {
  static create(userData) {
    const {
      full_name, email, student_number, password, role, phone, gender,
      national_id, date_of_birth, address, guardian_name, guardian_phone,
      intake_year, course_id
    } = userData;

    const sql = `
      INSERT INTO users (
        full_name, email, student_number, password, role, phone, gender,
        national_id, date_of_birth, address, guardian_name, guardian_phone,
        intake_year, course_id
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `;

    const params = [
      full_name, email, student_number, password, role, phone, gender,
      national_id, date_of_birth, address, guardian_name, guardian_phone,
      intake_year, course_id
    ];

    const stmt = db.prepare(sql);
    const result = stmt.run(params);
    return result;
  }

  static findById(id) {
    const sql = `
      SELECT u.*, c.course_name, c.course_code 
      FROM users u 
      LEFT JOIN courses c ON u.course_id = c.id 
      WHERE u.id = ?
    `;
    const stmt = db.prepare(sql);
    return stmt.get(id);
  }

  static findByEmail(email) {
    const stmt = db.prepare('SELECT * FROM users WHERE email = ?');
    return stmt.get(email);
  }

  static findByStudentNumber(studentNumber) {
    const sql = `
      SELECT u.*, c.course_name, c.course_code 
      FROM users u 
      LEFT JOIN courses c ON u.course_id = c.id 
      WHERE u.student_number = ?
    `;
    const stmt = db.prepare(sql);
    return stmt.get(studentNumber);
  }

  static findAll(filters = {}) {
    let sql = `
      SELECT u.*, c.course_name, c.course_code 
      FROM users u 
      LEFT JOIN courses c ON u.course_id = c.id 
      WHERE 1=1
    `;
    const params = [];

    if (filters.role) {
      sql += ' AND u.role = ?';
      params.push(filters.role);
    }

    if (filters.status) {
      sql += ' AND u.status = ?';
      params.push(filters.status);
    }

    if (filters.course_id) {
      sql += ' AND u.course_id = ?';
      params.push(filters.course_id);
    }

    if (filters.search) {
      sql += ' AND (u.full_name LIKE ? OR u.student_number LIKE ? OR u.email LIKE ?)';
      const searchTerm = `%${filters.search}%`;
      params.push(searchTerm, searchTerm, searchTerm);
    }

    sql += ' ORDER BY u.created_at DESC';

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

  static update(id, userData) {
    const {
      full_name, email, student_number, phone, gender, national_id,
      date_of_birth, address, guardian_name, guardian_phone,
      intake_year, status, course_id, profile_picture
    } = userData;

    const sql = `
      UPDATE users SET
        full_name = ?, email = ?, student_number = ?, phone = ?, gender = ?,
        national_id = ?, date_of_birth = ?, address = ?, guardian_name = ?,
        guardian_phone = ?, intake_year = ?, status = ?, course_id = ?, profile_picture = ?
      WHERE id = ?
    `;

    const params = [
      full_name, email, student_number, phone, gender, national_id,
      date_of_birth, address, guardian_name, guardian_phone,
      intake_year, status, course_id, profile_picture, id
    ];

    const stmt = db.prepare(sql);
    return stmt.run(params);
  }

  static updatePassword(id, hashedPassword) {
    const stmt = db.prepare('UPDATE users SET password = ? WHERE id = ?');
    return stmt.run(hashedPassword, id);
  }

  static delete(id) {
    const stmt = db.prepare('DELETE FROM users WHERE id = ?');
    return stmt.run(id);
  }

  static getStatistics() {
    const sql = `
      SELECT 
        COUNT(*) as total,
        SUM(CASE WHEN gender = 'male' THEN 1 ELSE 0 END) as male_count,
        SUM(CASE WHEN gender = 'female' THEN 1 ELSE 0 END) as female_count,
        SUM(CASE WHEN status = 'active' THEN 1 ELSE 0 END) as active_count,
        SUM(CASE WHEN status = 'suspended' THEN 1 ELSE 0 END) as suspended_count
      FROM users WHERE role = 'student'
    `;
    const stmt = db.prepare(sql);
    return stmt.get();
  }
}

module.exports = User;
