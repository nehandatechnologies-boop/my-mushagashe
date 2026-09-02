const Course = require('../models/Course');

// Create new course
const createCourse = async (req, res) => {
  console.log('[BACKEND] Create course - Request received');
  console.log('[BACKEND] Request body:', req.body);
  try {
    const { course_code, course_name, department, duration, description } = req.body;

    console.log('[BACKEND] Parsed fields:', { course_code, course_name, department, duration });

    // Validation
    if (!course_code || !course_name) {
      console.log('[BACKEND] Validation failed: missing required fields');
      return res.status(400).json({ error: 'Course code and course name are required' });
    }

    const courseData = {
      course_code, course_name, department, duration, description
    };

    console.log('[BACKEND] Calling Course.create with data:', courseData);
    const result = await Course.create(courseData);
    console.log('[BACKEND] Course.create succeeded, result:', result);

    if (!result) {
      console.error('Course.create returned null');
      return res.status(500).json({ error: 'Failed to create course - no result returned' });
    }

    res.status(201).json({
      message: 'Course created successfully',
      id: result.id
    });
  } catch (error) {
    console.error('[BACKEND] Create course error:', error);
    console.error('[BACKEND] Error details:', error.message, error.code);
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
  console.log('[BACKEND] Update course - Request received');
  console.log('[BACKEND] Params:', req.params);
  console.log('[BACKEND] Request body:', req.body);
  try {
    const { id } = req.params;
    const { course_code, course_name, department, duration, description } = req.body;

    console.log('[BACKEND] Parsed update fields:', { course_code, course_name, department, duration });

    const updateData = {
      course_code, course_name, department, duration, description
    };

    // Remove undefined values
    Object.keys(updateData).forEach(key => {
      if (updateData[key] === undefined) {
        delete updateData[key];
      }
    });

    console.log('[BACKEND] Calling Course.update with data:', updateData);
    await Course.update(id, updateData);
    console.log('[BACKEND] Course.update succeeded');

    const updatedCourse = await Course.findById(id);
    console.log('[BACKEND] Updated course fetched:', updatedCourse);

    res.json(updatedCourse);
  } catch (error) {
    console.error('[BACKEND] Update course error:', error);
    console.error('[BACKEND] Error details:', error.message, error.code);
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
