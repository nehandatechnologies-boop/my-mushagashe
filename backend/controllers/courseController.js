const Course = require('../models/Course');

// Create new course
const createCourse = (req, res) => {
  try {
    const { course_code, course_name, department, duration, description } = req.body;

    // Validation
    if (!course_code || !course_name) {
      return res.status(400).json({ error: 'Course code and course name are required' });
    }

    const courseData = {
      course_code, course_name, department, duration, description
    };

    const result = Course.create(courseData);

    res.status(201).json({
      message: 'Course created successfully',
      id: result.lastInsertRowid
    });
  } catch (error) {
    console.error('Create course error:', error);
    if (error.message.includes('UNIQUE')) {
      return res.status(400).json({ error: 'Course code already exists' });
    }
    res.status(500).json({ error: 'Failed to create course' });
  }
};

// Get all courses with filters
const getAllCourses = (req, res) => {
  try {
    const { department, search, limit = 50 } = req.query;

    const filters = {
      department,
      search,
      limit: parseInt(limit)
    };

    const courses = Course.findAll(filters);

    res.json(courses);
  } catch (error) {
    console.error('Get courses error:', error);
    res.status(500).json({ error: 'Failed to fetch courses' });
  }
};

// Get course by ID
const getCourseById = (req, res) => {
  try {
    const { id } = req.params;
    const course = Course.findById(id);

    if (!course) {
      return res.status(404).json({ error: 'Course not found' });
    }

    res.json(course);
  } catch (error) {
    console.error('Get course error:', error);
    res.status(500).json({ error: 'Failed to fetch course: ' + error.message });
  }
};

// Update course
const updateCourse = (req, res) => {
  try {
    const { id } = req.params;
    const { course_code, course_name, department, duration, description } = req.body;

    const updateData = {
      course_code, course_name, department, duration, description
    };

    // Remove undefined values
    Object.keys(updateData).forEach(key => {
      if (updateData[key] === undefined) {
        delete updateData[key];
      }
    });

    Course.update(id, updateData);

    const updatedCourse = Course.findById(id);

    res.json(updatedCourse);
  } catch (error) {
    console.error('Update course error:', error);
    if (error.message.includes('UNIQUE')) {
      return res.status(400).json({ error: 'Course code already exists' });
    }
    res.status(500).json({ error: 'Failed to update course' });
  }
};

// Delete course
const deleteCourse = (req, res) => {
  try {
    const { id } = req.params;

    const course = Course.findById(id);
    if (!course) {
      return res.status(404).json({ error: 'Course not found' });
    }

    // Check for related records before attempting deletion
    const db = require('../database/init');
    
    // Check for students
    const studentCount = db.prepare('SELECT COUNT(*) as count FROM users WHERE course_id = ? AND role = "student"').get(id);
    if (studentCount.count > 0) {
      return res.status(400).json({ 
        error: 'Cannot delete course with enrolled students',
        student_count: studentCount.count
      });
    }
    
    // Check for results
    const resultCount = db.prepare('SELECT COUNT(*) as count FROM results WHERE course_id = ?').get(id);
    if (resultCount.count > 0) {
      return res.status(400).json({ 
        error: 'Cannot delete course with associated results',
        result_count: resultCount.count
      });
    }

    const result = Course.delete(id);
    
    if (result.changes === 0) {
      return res.status(404).json({ error: 'Course not found or already deleted' });
    }

    res.json({ message: 'Course deleted successfully' });
  } catch (error) {
    console.error('Delete course error:', error);
    res.status(500).json({ error: 'Failed to delete course: ' + error.message });
  }
};

// Get all courses with student count
const getCoursesWithStudentCount = (req, res) => {
  try {
    const courses = Course.getAllWithStudentCount();
    res.json(courses);
  } catch (error) {
    console.error('Get courses with student count error:', error);
    res.status(500).json({ error: 'Failed to fetch courses' });
  }
};

module.exports = {
  createCourse,
  getAllCourses,
  getCourseById,
  updateCourse,
  deleteCourse,
  getCoursesWithStudentCount
};
