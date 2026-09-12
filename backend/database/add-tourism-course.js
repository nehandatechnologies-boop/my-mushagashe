const Database = require('better-sqlite3');
const path = require('path');

const dbPath = process.env.DB_PATH || path.join(__dirname, '../database/mushagashe.db');
const db = new Database(dbPath);

async function addTourismCourse() {
  try {
    // Add TOURISM course
    const tourismCourse = {
      course_code: 'TOU001',
      course_name: 'Tourism',
      department: 'Service',
      duration: 2,
      description: 'Tourism and Hospitality'
    };

    const stmt = db.prepare('INSERT INTO courses (course_code, course_name, department, duration, description) VALUES (?, ?, ?, ?, ?)');
    const result = stmt.run(tourismCourse.course_code, tourismCourse.course_name, tourismCourse.department, tourismCourse.duration, tourismCourse.description);

    console.log(`✓ Added TOURISM course with ID: ${result.lastInsertRowid}`);

    // Add other common courses that might be in the Excel
    const commonCourses = [
      { code: 'CUL001', name: 'Culinary Arts', dept: 'Service', duration: 2 },
      { code: 'IT001', name: 'Information Technology', dept: 'Technology', duration: 3 },
      { code: 'MAR001', name: 'Marketing', dept: 'Business', duration: 2 },
      { code: 'HUM001', name: 'Human Resources', dept: 'Business', duration: 2 },
      { code: 'COM001', name: 'Computer Science', dept: 'Technology', duration: 3 },
      { code: 'SOC001', name: 'Social Work', dept: 'Social', duration: 2 },
      { code: 'ECD001', name: 'Early Childhood Development', dept: 'Education', duration: 2 }
    ];

    commonCourses.forEach(course => {
      try {
        const result = db.prepare('INSERT INTO courses (course_code, course_name, department, duration) VALUES (?, ?, ?, ?)').run(course.code, course.name, course.dept, course.duration);
        console.log(`✓ Added ${course.name} course with ID: ${result.lastInsertRowid}`);
      } catch (error) {
        if (error.message.includes('UNIQUE')) {
          console.log(`- ${course.name} course already exists`);
        } else {
          console.error(`Error adding ${course.name}:`, error.message);
        }
      }
    });

    db.close();
  } catch (error) {
    console.error('Error:', error);
    db.close();
  }
}

addTourismCourse();
