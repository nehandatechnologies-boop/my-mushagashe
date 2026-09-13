const Database = require('better-sqlite3');
const path = require('path');

const dbPath = process.env.DB_PATH || path.join(__dirname, 'mushagashe.db');
const db = new Database(dbPath);

try {
  // Check if the unique constraint exists
  const tables = db.prepare("SELECT name FROM sqlite_master WHERE type='index' AND name='idx_student_number_unique'").all();
  console.log('Unique constraint index exists:', tables.length > 0);

  if (tables.length > 0) {
    console.log('Index details:', tables[0]);
  }

  // Check the schema
  const schema = db.prepare("SELECT sql FROM sqlite_master WHERE type='table' AND name='users'").get();
  console.log('Users table schema:');
  console.log(schema.sql);

  db.close();
} catch (error) {
  console.error('Error:', error);
  db.close();
}
