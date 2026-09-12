const Database = require('better-sqlite3');
const path = require('path');

const dbPath = process.env.DB_PATH || path.join(__dirname, '../database/mushagashe.db');
const db = new Database(dbPath);

async function addUniqueIndex() {
  try {
    console.log('Adding unique index on student_number...');

    // Check if index already exists
    const existingIndex = db.prepare("SELECT name FROM sqlite_master WHERE type='index' AND name='idx_users_student_number'").get();

    if (existingIndex) {
      console.log('Unique index on student_number already exists');
      db.close();
      return;
    }

    // Create unique index
    db.exec('CREATE UNIQUE INDEX idx_users_student_number ON users(student_number)');

    console.log('✓ Unique index on student_number created successfully');

    db.close();
  } catch (error) {
    console.error('Error:', error);
    db.close();
  }
}

addUniqueIndex();
