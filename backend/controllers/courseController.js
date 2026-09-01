const Course = require('../models/Course');

// Create new course
const createCourse = async (req, res) => {
  try {
    const { course_code, course_name, department, duration, description } = req.body;

    // Validation
    if (!course_code || !course_name) {
      return res.status(400).json({ error: 'Course code and course name are required' });
    }

    const courseData = {
      course_code, course_name, department, duration, description
    };

    const result = await Course.create(courseData);

    if (!result) {
      console.error('Course.create returned null');
      return res.status(500).json({ error: 'Failed to create course - no result returned' });
    }

    res.status(201).json({
      message: 'Course created successfully',
      id: result.id
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
const getAllCourses = async (req, res) => {
  try {
    const { department, search, limit = 50 } = req.query;

    const filters = {
      department,
      search,
      limit: parseInt(limit)
    };

    const courses = await Course.findAll(filters);

    res.json(courses);
  } catch (error) {
    console.error('Get courses error:', error);
    res.status(500).json({ error: 'Failed to fetch courses' });
  }
};

// Get course by ID
const getCourseById = async (req, res) => {
  try {
    const { id } = req.params;
    const course = await Course.findById(id);

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
const updateCourse = async (req, res) => {
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

    await Course.update(id, updateData);

    const updatedCourse = await Course.findById(id);

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
const deleteCourse = async (req, res) => {
  try {
    const { id } = req.params;

    const course = await Course.findById(id);
    if (!course) {
      return res.status(404).json({ error: 'Course not found' });
    }

    // Cascade delete: remove all related records first using Supabase
    const User = require('../models/User');
    const Result = require('../models/Result');
    
    // Get all users assigned to this course and unassign them
    const users = await User.findAll({ course_id: id });
    for (const user of users) {
      await User.update(user.id, { course_id: null });
    }
    console.log(`Unassigned ${users.length} users from course`);
    
    // Remove results for this course
    const results = await Result.findAll({ course_id: id });
    for (const result of results) {
      await Result.delete(result.id);
    }
    console.log(`Deleted ${results.length} results for course`);

    // Now safe to delete the course
    await Course.delete(id);

    res.json({ 
      message: 'Course deleted successfully',
      users_unassigned: users.length,
      results_deleted: results.length
    });
  } catch (error) {
    console.error('Delete course error:', error);
    res.status(500).json({ error: 'Failed to delete course: ' + error.message });
  }
};

// Get all courses with student count
const getCoursesWithStudentCount = async (req, res) => {
  try {
    const courses = await Course.getAllWithStudentCount();
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
