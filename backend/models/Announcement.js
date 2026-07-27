const db = require('../database/init');

class Announcement {
  static create(announcementData) {
    const { title, message, priority, created_by } = announcementData;

    const sql = `
      INSERT INTO announcements (title, message, priority, created_by)
      VALUES (?, ?, ?, ?)
    `;

    const stmt = db.prepare(sql);
    return stmt.run(title, message, priority || 'normal', created_by);
  }

  static findById(id) {
    const sql = `
      SELECT a.*, u.full_name as creator_name 
      FROM announcements a 
      LEFT JOIN users u ON a.created_by = u.id 
      WHERE a.id = ?
    `;
    const stmt = db.prepare(sql);
    return stmt.get(id);
  }

  static findAll(filters = {}) {
    let sql = `
      SELECT a.*, u.full_name as creator_name 
      FROM announcements a 
      LEFT JOIN users u ON a.created_by = u.id 
      WHERE 1=1
    `;
    const params = [];

    if (filters.priority) {
      sql += ' AND a.priority = ?';
      params.push(filters.priority);
    }

    if (filters.created_by) {
      sql += ' AND a.created_by = ?';
      params.push(filters.created_by);
    }

    if (filters.search) {
      sql += ' AND (a.title LIKE ? OR a.message LIKE ?)';
      const searchTerm = `%${filters.search}%`;
      params.push(searchTerm, searchTerm);
    }

    sql += ' ORDER BY a.created_at DESC';

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

  static getLatest(limit = 5) {
    const sql = `
      SELECT a.*, u.full_name as creator_name 
      FROM announcements a 
      LEFT JOIN users u ON a.created_by = u.id 
      ORDER BY a.created_at DESC 
      LIMIT ?
    `;
    const stmt = db.prepare(sql);
    return stmt.all(limit);
  }

  static getUrgent() {
    const sql = `
      SELECT a.*, u.full_name as creator_name 
      FROM announcements a 
      LEFT JOIN users u ON a.created_by = u.id 
      WHERE a.priority IN ('urgent', 'important')
      ORDER BY a.created_at DESC 
      LIMIT 10
    `;
    const stmt = db.prepare(sql);
    return stmt.all();
  }

  static update(id, announcementData) {
    const { title, message, priority } = announcementData;

    const sql = `
      UPDATE announcements SET
        title = ?, message = ?, priority = ?
      WHERE id = ?
    `;

    const stmt = db.prepare(sql);
    return stmt.run(title, message, priority, id);
  }

  static delete(id) {
    const stmt = db.prepare('DELETE FROM announcements WHERE id = ?');
    return stmt.run(id);
  }

  static getStatistics() {
    const sql = `
      SELECT 
        COUNT(*) as total,
        SUM(CASE WHEN priority = 'urgent' THEN 1 ELSE 0 END) as urgent_count,
        SUM(CASE WHEN priority = 'important' THEN 1 ELSE 0 END) as important_count,
        SUM(CASE WHEN priority = 'normal' THEN 1 ELSE 0 END) as normal_count,
        SUM(CASE WHEN priority = 'low' THEN 1 ELSE 0 END) as low_count
      FROM announcements
    `;
    const stmt = db.prepare(sql);
    return stmt.get();
  }
}

module.exports = Announcement;
