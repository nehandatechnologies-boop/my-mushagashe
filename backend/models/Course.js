const db = require('../database/init');

class Course {
  static create(courseData) {
    const { course_code, course_name, department, duration, description } = courseData;
    const sql = `
      INSERT INTO courses (course_code, course_name, department, duration, description)
      VALUES (?, ?, ?, ?, ?)
    `;
    const stmt = db.prepare(sql);
    return stmt.run(course_code, course_name, department, duration, description);
  }

  static findById(id) {
    const stmt = db.prepare('SELECT * FROM courses WHERE id = ?');
    return stmt.get(id);
  }

  static findByCode(courseCode) {
    const stmt = db.prepare('SELECT * FROM courses WHERE course_code = ?');
    return stmt.get(courseCode);
  }

  static findAll(filters = {}) {
    let sql = 'SELECT * FROM courses WHERE 1=1';
    const params = [];

    if (filters.department) {
      sql += ' AND department = ?';
      params.push(filters.department);
    }

    if (filters.search) {
      sql += ' AND (course_name LIKE ? OR course_code LIKE ?)';
      const searchTerm = `%${filters.search}%`;
      params.push(searchTerm, searchTerm);
    }

    sql += ' ORDER BY course_name';

    if (filters.limit) {
      sql += ' LIMIT ?';
      params.push(filters.limit);
    }

    const stmt = db.prepare(sql);
    return stmt.all(...params);
  }

  static update(id, courseData) {
    const { course_code, course_name, department, duration, description } = courseData;
    const sql = `
      UPDATE courses SET
        course_code = ?, course_name = ?, department = ?, duration = ?, description = ?
      WHERE id = ?
    `;
    const stmt = db.prepare(sql);
    return stmt.run(course_code, course_name, department, duration, description, id);
  }

  static delete(id) {
    const stmt = db.prepare('DELETE FROM courses WHERE id = ?');
    return stmt.run(id);
  }

  static getStudentCount(courseId) {
    const sql = 'SELECT COUNT(*) as count FROM users WHERE course_id = ? AND role = "student"';
    const stmt = db.prepare(sql);
    const result = stmt.get(courseId);
    return result ? result.count : 0;
  }

  static getAllWithStudentCount() {
    const sql = `
      SELECT c.*, 
             (SELECT COUNT(*) FROM users WHERE course_id = c.id AND role = 'student') as student_count
      FROM courses c
      ORDER BY c.course_name
    `;
    const stmt = db.prepare(sql);
    return stmt.all();
  }
}

module.exports = Course;
