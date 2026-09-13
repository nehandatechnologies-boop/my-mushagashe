const Database = require('better-sqlite3');
const path = require('path');

const dbPath = process.env.DB_PATH || path.join(__dirname, '../database/mushagashe.db');
const db = new Database(dbPath);

async function addMustChangePassword() {
  try {
    console.log('=== ADDING must_change_password FIELD ===');

    // Check if column already exists
    const tableInfo = db.prepare('PRAGMA table_info(users)').all();
    const existingColumn = tableInfo.find(col => col.name === 'must_change_password');

    if (existingColumn) {
      console.log('must_change_password column already exists');
      db.close();
      return;
    }

    // SQLite doesn't support ALTER COLUMN directly, so we need to recreate the table
    const existingData = db.prepare('SELECT * FROM users').all();

    console.log(`Existing records: ${existingData.length}`);

    // Drop the old table
    db.exec('DROP TABLE IF EXISTS users');

    // Create the new table with must_change_password and nullable password
    db.exec(`
      CREATE TABLE users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        full_name TEXT NOT NULL,
        email TEXT UNIQUE,
        student_number TEXT UNIQUE,
        password TEXT,
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
        must_change_password INTEGER DEFAULT 0,
        profile_picture TEXT,
        course_id INTEGER,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (course_id) REFERENCES courses(id)
      )
    `);

    // Recreate the unique index on student_number
    db.exec('CREATE UNIQUE INDEX IF NOT EXISTS idx_users_student_number ON users(student_number)');

    // Restore the data
    if (existingData.length > 0) {
      const insert = db.prepare(`
        INSERT INTO users (id, full_name, email, student_number, password, role, phone, gender, national_id, date_of_birth, address, guardian_name, guardian_phone, intake_year, status, profile_picture, course_id, created_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `);

      existingData.forEach(row => {
        insert.run(
          row.id, row.full_name, row.email, row.student_number, row.password,
          row.role, row.phone, row.gender, row.national_id, row.date_of_birth,
          row.address, row.guardian_name, row.guardian_phone, row.intake_year,
          row.status, row.profile_picture, row.course_id, row.created_at
        );
      });
    }

    console.log('✓ must_change_password field added');
    console.log('✓ password field remains nullable (for Excel import without passwords)');
    console.log(`✓ Restored ${existingData.length} existing records`);

    db.close();
  } catch (error) {
    console.error('Error:', error);
    db.close();
  }
}

addMustChangePassword();
