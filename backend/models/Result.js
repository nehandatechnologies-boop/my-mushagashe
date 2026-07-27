const db = require('../database/init');

class Result {
  static create(resultData) {
    const {
      user_id, course_id, semester, academic_year, assessment_mark,
      exam_mark, final_mark, grade, credits, lecturer, remarks
    } = resultData;

    const sql = `
      INSERT INTO results (
        user_id, course_id, semester, academic_year, assessment_mark,
        exam_mark, final_mark, grade, credits, lecturer, remarks
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `;

    const stmt = db.prepare(sql);
    return stmt.run(
      user_id, course_id, semester, academic_year, assessment_mark,
      exam_mark, final_mark, grade, credits, lecturer, remarks
    );
  }

  static findById(id) {
    const sql = `
      SELECT r.*, u.full_name, u.student_number, c.course_name, c.course_code 
      FROM results r 
      JOIN users u ON r.user_id = u.id 
      LEFT JOIN courses c ON r.course_id = c.id 
      WHERE r.id = ?
    `;
    const stmt = db.prepare(sql);
    return stmt.get(id);
  }

  static findByUserId(userId) {
    const sql = `
      SELECT r.*, c.course_name, c.course_code 
      FROM results r 
      JOIN users u ON r.user_id = u.id 
      LEFT JOIN courses c ON r.course_id = c.id 
      WHERE r.user_id = ? 
      ORDER BY r.academic_year DESC, r.semester DESC
    `;
    const stmt = db.prepare(sql);
    return stmt.all(userId);
  }

  static findAll(filters = {}) {
    let sql = `
      SELECT r.*, u.full_name, u.student_number, c.course_name, c.course_code 
      FROM results r 
      JOIN users u ON r.user_id = u.id 
      LEFT JOIN courses c ON r.course_id = c.id 
      WHERE 1=1
    `;
    const params = [];

    if (filters.user_id) {
      sql += ' AND r.user_id = ?';
      params.push(filters.user_id);
    }

    if (filters.course_id) {
      sql += ' AND r.course_id = ?';
      params.push(filters.course_id);
    }

    if (filters.semester) {
      sql += ' AND r.semester = ?';
      params.push(filters.semester);
    }

    if (filters.academic_year) {
      sql += ' AND r.academic_year = ?';
      params.push(filters.academic_year);
    }

    if (filters.grade) {
      sql += ' AND r.grade = ?';
      params.push(filters.grade);
    }

    if (filters.search) {
      sql += ' AND (u.full_name LIKE ? OR u.student_number LIKE ? OR c.course_name LIKE ?)';
      const searchTerm = `%${filters.search}%`;
      params.push(searchTerm, searchTerm, searchTerm);
    }

    sql += ' ORDER BY r.academic_year DESC, r.semester DESC';

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

  static update(id, resultData) {
    const {
      course_id, semester, academic_year, assessment_mark, exam_mark,
      final_mark, grade, credits, lecturer, remarks
    } = resultData;

    const sql = `
      UPDATE results SET
        course_id = ?, semester = ?, academic_year = ?, assessment_mark = ?,
        exam_mark = ?, final_mark = ?, grade = ?, credits = ?, lecturer = ?, remarks = ?
      WHERE id = ?
    `;

    const stmt = db.prepare(sql);
    return stmt.run(
      course_id, semester, academic_year, assessment_mark, exam_mark,
      final_mark, grade, credits, lecturer, remarks, id
    );
  }

  static delete(id) {
    const stmt = db.prepare('DELETE FROM results WHERE id = ?');
    return stmt.run(id);
  }

  static calculateGrade(finalMark) {
    if (finalMark >= 80) return 'A';
    if (finalMark >= 70) return 'B';
    if (finalMark >= 60) return 'C';
    if (finalMark >= 50) return 'D';
    if (finalMark >= 40) return 'E';
    return 'F';
  }

  static getStatistics() {
    const sql = `
      SELECT 
        COUNT(*) as total_results,
        SUM(CASE WHEN grade = 'A' THEN 1 ELSE 0 END) as grade_a,
        SUM(CASE WHEN grade = 'B' THEN 1 ELSE 0 END) as grade_b,
        SUM(CASE WHEN grade = 'C' THEN 1 ELSE 0 END) as grade_c,
        SUM(CASE WHEN grade = 'D' THEN 1 ELSE 0 END) as grade_d,
        SUM(CASE WHEN grade = 'E' THEN 1 ELSE 0 END) as grade_e,
        SUM(CASE WHEN grade = 'F' THEN 1 ELSE 0 END) as grade_f,
        AVG(final_mark) as average_mark
      FROM results
    `;
    const stmt = db.prepare(sql);
    return stmt.get();
  }

  static getStudentGPA(userId) {
    const sql = `
      SELECT 
        AVG(
          CASE grade
            WHEN 'A' THEN 4.0
            WHEN 'B' THEN 3.0
            WHEN 'C' THEN 2.0
            WHEN 'D' THEN 1.0
            WHEN 'E' THEN 0.5
            ELSE 0
          END
        ) as gpa,
        COUNT(*) as total_courses
      FROM results 
      WHERE user_id = ?
    `;
    const stmt = db.prepare(sql);
    const result = stmt.get(userId);
    return result ? { gpa: result.gpa || 0, total_courses: result.total_courses || 0 } : { gpa: 0, total_courses: 0 };
  }
}

module.exports = Result;
