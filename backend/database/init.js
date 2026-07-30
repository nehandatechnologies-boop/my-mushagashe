const Database = require('better-sqlite3');
const path = require('path');
const fs = require('fs');
const bcrypt = require('bcryptjs');

// Use environment variable for database path, fallback to local
const dbPath = process.env.DB_PATH || path.join(__dirname, '../database/mushagashe.db');

// Ensure database directory exists
const dbDir = path.dirname(dbPath);
if (!fs.existsSync(dbDir)) {
  fs.mkdirSync(dbDir, { recursive: true });
}

// Create database connection
const db = new Database(dbPath);
console.log('Connected to SQLite database at:', dbPath);

// Initialize database tables
function initializeDatabase() {
  // Drop old students table and related objects if they exist (migration)
  db.exec(`DROP TABLE IF EXISTS students`);
  db.exec(`DROP VIEW IF EXISTS students_view`);
  db.exec(`DROP VIEW IF EXISTS students_with_courses`);
  db.exec(`DROP TRIGGER IF EXISTS students_trigger`);
  db.exec(`DROP TRIGGER IF EXISTS student_trigger`);
  db.exec(`DROP INDEX IF EXISTS students_index`);
  
  // Users table with expanded fields
  db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      full_name TEXT NOT NULL,
      email TEXT UNIQUE,
      student_number TEXT UNIQUE,
      password TEXT NOT NULL,
      role TEXT NOT NULL DEFAULT 'student',
      phone TEXT,
      gender TEXT,
      national_id TEXT,
      date_of_birth TEXT,
      address TEXT,
      guardian_name TEXT,
      guardian_phone TEXT,
      intake_year INTEGER,
      status TEXT DEFAULT 'active',
      profile_picture TEXT,
      course_id INTEGER,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (course_id) REFERENCES courses(id)
    )
  `);

  // Courses table
  db.exec(`
    CREATE TABLE IF NOT EXISTS courses (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      course_code TEXT UNIQUE NOT NULL,
      course_name TEXT NOT NULL,
      department TEXT,
      duration INTEGER,
      description TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // Fees table with expanded fields
  db.exec(`
    CREATE TABLE IF NOT EXISTS fees (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      fee_category TEXT NOT NULL,
      amount REAL NOT NULL,
      amount_paid REAL DEFAULT 0,
      balance REAL,
      payment_reference TEXT,
      payment_method TEXT,
      receipt_number TEXT,
      payment_date DATETIME,
      due_date DATETIME,
      status TEXT DEFAULT 'unpaid',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id)
    )
  `);

  // Results table with expanded fields
  db.exec(`
    CREATE TABLE IF NOT EXISTS results (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      course_id INTEGER,
      semester TEXT,
      academic_year INTEGER,
      assessment_mark REAL,
      exam_mark REAL,
      final_mark REAL,
      grade TEXT,
      credits INTEGER,
      lecturer TEXT,
      remarks TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id),
      FOREIGN KEY (course_id) REFERENCES courses(id)
    )
  `);

  // Announcements table with priority
  db.exec(`
    CREATE TABLE IF NOT EXISTS announcements (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      title TEXT NOT NULL,
      message TEXT NOT NULL,
      priority TEXT DEFAULT 'normal',
      created_by INTEGER,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (created_by) REFERENCES users(id)
    )
  `);

  // Audit log for tracking changes
  db.exec(`
    CREATE TABLE IF NOT EXISTS audit_logs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER,
      action TEXT NOT NULL,
      entity_type TEXT,
      entity_id INTEGER,
      details TEXT,
      ip_address TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id)
    )
  `);

  // Create default admin if not exists
  createDefaultAdmin();
  
  // Create sample courses if none exist
  createSampleCourses();
  
  // Create sample lecturer if not exists
  createSampleLecturer();
  
  // Create sample student if not exists
  createSampleStudent();
}

function createDefaultAdmin() {
  const adminEmail = process.env.ADMIN_EMAIL || 'admin@mushagashe.edu';
  const adminPassword = process.env.ADMIN_PASSWORD || 'admin123';
  
  const row = db.prepare('SELECT id FROM users WHERE email = ? AND role = ?').get(adminEmail, 'admin');
  if (!row)    {
    const hashedPassword = bcrypt.hashSync(adminPassword, 10);
    const stmt = db.prepare('INSERT INTO users (email, password, full_name, role) VALUES (?, ?, ?, ?)');
    stmt.run(adminEmail, hashedPassword, 'System Administrator', 'admin');
    console.log('Default admin account created');
  } else {
    console.log('Admin account already exists');
  }
}

function createSampleCourses() {
  const sampleCourses = [
    { code: 'CIV001', name: 'Civil Engineering', department: 'Engineering', duration: 3 },
    { code: 'ELE001', name: 'Electrical Engineering', department: 'Engineering', duration: 3 },
    { code: 'MEC001', name: 'Mechanical Engineering', department: 'Engineering', duration: 3 },
    { code: 'BUS001', name: 'Business Management', department: 'Business', duration: 2 },
    { code: 'ACC001', name: 'Accounting', department: 'Business', duration: 2 },
    { code: 'NUR001', name: 'Nursing', department: 'Health', duration: 3 },
    { code: 'HOS001', name: 'Hospitality Management', department: 'Service', duration: 2 },
    { code: 'AGR001', name: 'Agriculture', department: 'Agriculture', duration: 2 }
  ];

  const row = db.prepare('SELECT COUNT(*) as count FROM courses').get();
  if (row.count === 0) {
    const stmt = db.prepare('INSERT INTO courses (course_code, course_name, department, duration) VALUES (?, ?, ?, ?)');
    sampleCourses.forEach(course => {
      stmt.run(course.code, course.name, course.department, course.duration);
    });
    console.log('Sample courses created');
  }
}

function createSampleLecturer() {
  const lecturerEmail = 'lecturer@mushagashe.edu';
  
  const row = db.prepare('SELECT id FROM users WHERE email = ? AND role = ?').get(lecturerEmail, 'lecturer');
  if (!row) {
    const hashedPassword = bcrypt.hashSync('lecturer123', 10);
    
    // Get first course ID to assign
    const courseRow = db.prepare('SELECT id FROM courses LIMIT 1').get();
    const courseId = courseRow ? courseRow.id : null;
    
    const stmt = db.prepare('INSERT INTO users (email, password, full_name, role, course_id, status) VALUES (?, ?, ?, ?, ?, ?)');
    stmt.run(lecturerEmail, hashedPassword, 'Sample Lecturer', 'lecturer', courseId, 'active');
    console.log('Sample lecturer account created (lecturer@mushagashe.edu / lecturer123)');
  } else {
    console.log('Sample lecturer account already exists');
  }
}

function createSampleStudent() {
  const studentNumber = 'STU2024001';
  
  const row = db.prepare('SELECT id FROM users WHERE student_number = ? AND role = ?').get(studentNumber, 'student');
  if (!row) {
    const hashedPassword = bcrypt.hashSync('student123', 10);
    
    // First get a course ID to assign
    const courseRow = db.prepare('SELECT id FROM courses LIMIT 1').get();
    const courseId = courseRow ? courseRow.id : null;
    
    const stmt = db.prepare('INSERT INTO users (student_number, password, full_name, role, phone, gender, intake_year, course_id) VALUES (?, ?, ?, ?, ?, ?, ?, ?)');
    stmt.run(studentNumber, hashedPassword, 'John Doe', 'student', '+263771234567', 'Male', 2024, courseId);
    console.log('Sample student account created (STU2024001 / student123)');
  } else {
    console.log('Sample student account already exists');
  }
}

// Initialize database
initializeDatabase();

module.exports = db;
