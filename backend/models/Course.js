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

class Course {
  static async create(courseData) {
    const database = getDb();
    const { course_code, course_name, department, duration, description } = courseData;

    const insertData = {
      course_code, course_name, department, duration, description
    };

    // Remove undefined values and convert empty strings to null
    Object.keys(insertData).forEach(key => {
      if (insertData[key] === undefined) {
        delete insertData[key];
      } else if (insertData[key] === '') {
        insertData[key] = null;
      }
    });

    const columns = Object.keys(insertData).join(', ');
    const placeholders = Object.keys(insertData).map(() => '?').join(', ');
    const values = Object.values(insertData);

    const stmt = database.prepare(`INSERT INTO courses (${columns}) VALUES (${placeholders})`);
    const result = stmt.run(...values);

    // Return the created record
    const created = database.prepare('SELECT * FROM courses WHERE id = ?').get(result.lastInsertRowid);
    return created;
  }

  static async findById(id) {
    const database = getDb();
    const course = database.prepare('SELECT * FROM courses WHERE id = ?').get(id);
    return course || null;
  }

  static async findByCode(courseCode) {
    const database = getDb();
    const course = database.prepare('SELECT * FROM courses WHERE course_code = ?').get(courseCode);
    return course || null;
  }

  static async findAll(filters = {}) {
    const database = getDb();
    let query = 'SELECT * FROM courses WHERE 1=1';
    const params = [];

    if (filters.department) {
      query += ' AND department = ?';
      params.push(filters.department);
    }

    if (filters.search) {
      query += ' AND (course_name LIKE ? OR course_code LIKE ?)';
      const searchPattern = `%${filters.search}%`;
      params.push(searchPattern, searchPattern);
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

    const courses = database.prepare(query).all(...params);
    return courses;
  }

  static async update(id, courseData) {
    const database = getDb();
    const { course_code, course_name, department, duration, description } = courseData;

    const updateData = {
      course_code, course_name, department, duration, description
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

    const stmt = database.prepare(`UPDATE courses SET ${setClause} WHERE id = ?`);
    stmt.run(...values);

    // Return the updated record
    const updated = database.prepare('SELECT * FROM courses WHERE id = ?').get(id);
    return updated;
  }

  static async delete(id) {
    const database = getDb();
    const stmt = database.prepare('DELETE FROM courses WHERE id = ?');
    const result = stmt.run(id);
    return result.changes > 0;
  }

  static async getStudentCount(courseId) {
    const database = getDb();
    const result = database.prepare('SELECT COUNT(*) as count FROM users WHERE course_id = ? AND role = ?').get(courseId, 'student');
    return result.count;
  }

  static async getAllWithStudentCount() {
    const database = getDb();
    const courses = database.prepare('SELECT * FROM courses ORDER BY created_at DESC').all();

    // Get student count for each course
    const coursesWithCount = courses.map(course => {
      const studentCount = this.getStudentCount(course.id);
      return { ...course, student_count: studentCount };
    });

    return coursesWithCount;
  }
}

module.exports = Course;
