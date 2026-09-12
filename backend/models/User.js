const Database = require('better-sqlite3');
const path = require('path');

let db;
function getDb() {
  if (!db) {
    const dbPath = process.env.DB_PATH || path.join(__dirname, '../database/mushagashe.db');
    db = new Database(dbPath);
  }
  return db;
}

class User {
  static async create(userData) {
    const database = getDb();
    const {
      full_name, email, student_number, password, role, phone, gender,
      national_id, date_of_birth, address, guardian_name, guardian_phone,
      intake, intake_year, course_id, status
    } = userData;

    const insertData = {
      full_name, email, student_number, password, role, phone, gender,
      national_id, date_of_birth, address, guardian_name, guardian_phone,
      intake, intake_year, course_id, status
    };

    // Remove undefined values and convert empty strings to null
    Object.keys(insertData).forEach(key => {
      if (insertData[key] === undefined) {
        delete insertData[key];
      } else if (insertData[key] === '') {
        insertData[key] = null;
      }
    });

    // If password is not provided, generate a secure random password
    if (!insertData.password) {
      const crypto = require('crypto');
      const bcrypt = require('bcryptjs');
      const randomPassword = crypto.randomBytes(16).toString('base64').substring(0, 12);
      insertData.password = bcrypt.hashSync(randomPassword, 10);
    }

    const columns = Object.keys(insertData).join(', ');
    const placeholders = Object.keys(insertData).map(() => '?').join(', ');
    const values = Object.values(insertData);

    const stmt = database.prepare(`INSERT INTO users (${columns}) VALUES (${placeholders})`);
    const result = stmt.run(...values);

    // Return the created record
    const created = database.prepare('SELECT * FROM users WHERE id = ?').get(result.lastInsertRowid);
    return created;
  }

  static async findById(id) {
    const database = getDb();
    const user = database.prepare('SELECT * FROM users WHERE id = ?').get(id);

    if (!user) return null;

    // Join with courses table to get course details
    if (user.course_id) {
      const course = database.prepare('SELECT course_name, course_code FROM courses WHERE id = ?').get(user.course_id);
      if (course) {
        user.course_name = course.course_name;
        user.course_code = course.course_code;
      }
    }

    return user;
  }

  static async findByEmail(email) {
    const database = getDb();
    const user = database.prepare('SELECT * FROM users WHERE email = ?').get(email);
    return user || null;
  }

  static async findByStudentNumber(studentNumber) {
    const database = getDb();
    const user = database.prepare('SELECT * FROM users WHERE student_number = ?').get(studentNumber);
    return user || null;
  }

  static async findAll(filters = {}) {
    const database = getDb();
    let query = 'SELECT * FROM users WHERE 1=1';
    const params = [];

    if (filters.role) {
      query += ' AND role = ?';
      params.push(filters.role);
    }

    if (filters.status) {
      query += ' AND status = ?';
      params.push(filters.status);
    }

    if (filters.course_id) {
      query += ' AND course_id = ?';
      params.push(filters.course_id);
    }

    if (filters.intake) {
      query += ' AND intake = ?';
      params.push(filters.intake);
    }

    if (filters.search) {
      query += ' AND (full_name LIKE ? OR email LIKE ? OR student_number LIKE ?)';
      const searchPattern = `%${filters.search}%`;
      params.push(searchPattern, searchPattern, searchPattern);
    }

    query += ' ORDER BY created_at DESC';

    if (filters.limit) {
      query += ' LIMIT ?';
      params.push(filters.limit);
    }

    if (filters.offset) {
      query += ' OFFSET ?';
      params.push(filters.offset);
    }

    const users = database.prepare(query).all(...params);

    // Join with courses table for each user
    return users.map(user => {
      if (user.course_id) {
        const course = database.prepare('SELECT course_name, course_code FROM courses WHERE id = ?').get(user.course_id);
        if (course) {
          user.course_name = course.course_name;
          user.course_code = course.course_code;
        }
      }
      return user;
    });
  }

  static async update(id, userData) {
    const database = getDb();
    const {
      full_name, email, student_number, password, phone, gender,
      national_id, date_of_birth, address, guardian_name, guardian_phone,
      intake_year, course_id, status
    } = userData;

    const updateData = {
      full_name, email, student_number, password, phone, gender,
      national_id, date_of_birth, address, guardian_name, guardian_phone,
      intake_year, course_id, status
    };

    // Remove undefined values and convert empty strings to null
    Object.keys(updateData).forEach(key => {
      if (updateData[key] === undefined) {
        delete updateData[key];
      } else if (updateData[key] === '') {
        updateData[key] = null;
      }
    });

    const setClause = Object.keys(updateData).map(key => `${key} = ?`).join(', ');
    const values = Object.values(updateData);
    values.push(id);

    const stmt = database.prepare(`UPDATE users SET ${setClause} WHERE id = ?`);
    stmt.run(...values);

    // Return the updated record
    const updated = database.prepare('SELECT * FROM users WHERE id = ?').get(id);
    return updated;
  }

  static async upsertByStudentNumber(userData) {
    const database = getDb();
    const {
      full_name, email, student_number, password, role, phone, gender,
      national_id, date_of_birth, address, guardian_name, guardian_phone,
      intake, intake_year, course_id, status
    } = userData;

    if (!student_number) {
      throw new Error('Student number is required for upsert');
    }

    // Check if student exists
    const existing = await this.findByStudentNumber(student_number);

    if (existing) {
      // Update existing student
      const updateData = {
        full_name, email, phone, gender,
        national_id, date_of_birth, address, guardian_name, guardian_phone,
        intake, intake_year, course_id, status
      };

      // Only update password if provided
      if (password) {
        updateData.password = password;
      }

      // Remove undefined values and convert empty strings to null
      Object.keys(updateData).forEach(key => {
        if (updateData[key] === undefined) {
          delete updateData[key];
        } else if (updateData[key] === '') {
          updateData[key] = null;
        }
      });

      const setClause = Object.keys(updateData).map(key => `${key} = ?`).join(', ');
      const values = Object.values(updateData);
      values.push(existing.id);

      const stmt = database.prepare(`UPDATE users SET ${setClause} WHERE id = ?`);
      stmt.run(...values);

      const updated = database.prepare('SELECT * FROM users WHERE id = ?').get(existing.id);
      return { ...updated, action: 'updated' };
    } else {
      // Create new student - password will be generated in create() if not provided
      const result = await this.create(userData);
      return { ...result, action: 'created' };
    }
  }

  static async updatePassword(id, newPassword) {
    const database = getDb();
    const stmt = database.prepare('UPDATE users SET password = ? WHERE id = ?');
    stmt.run(newPassword, id);

    const updated = database.prepare('SELECT * FROM users WHERE id = ?').get(id);
    return updated;
  }

  static async deleteDependentRecords(id) {
    const database = getDb();
    // Delete fees
    database.prepare('DELETE FROM fees WHERE user_id = ?').run(id);

    // Delete results
    database.prepare('DELETE FROM results WHERE user_id = ?').run(id);

    // Delete announcements
    database.prepare('DELETE FROM announcements WHERE created_by = ?').run(id);

    // Delete audit logs
    database.prepare('DELETE FROM audit_logs WHERE user_id = ?').run(id);
  }

  static async delete(id) {
    const database = getDb();
    console.log('[USER.DELETE] Attempting to delete user ID:', id);
    const stmt = database.prepare('DELETE FROM users WHERE id = ?');
    const result = stmt.run(id);

    console.log('[USER.DELETE] Delete successful for ID:', id);
    return result.changes > 0;
  }

  static async getStatistics() {
    const database = getDb();
    const users = database.prepare('SELECT role, status, gender FROM users').all();
    const students = users.filter(u => u.role === 'student');

    // Normalize gender for counting (case-insensitive)
    const normalizeGender = (gender) => {
      if (!gender) return null;
      return gender.toString().trim().toLowerCase();
    };

    const stats = {
      total: students.length,
      male_count: students.filter(u => normalizeGender(u.gender) === 'male').length,
      female_count: students.filter(u => normalizeGender(u.gender) === 'female').length,
      active_count: students.filter(u => u.status === 'active').length,
      suspended_count: students.filter(u => u.status === 'suspended').length,
      // Keep legacy fields for backward compatibility
      total_users: users.length,
      total_students: students.length,
      total_lecturers: users.filter(u => u.role === 'lecturer').length,
      total_admins: users.filter(u => u.role === 'admin').length,
      active_users: users.filter(u => u.status === 'active').length,
      suspended_users: users.filter(u => u.status === 'suspended').length
    };

    return stats;
  }
}

module.exports = User;
