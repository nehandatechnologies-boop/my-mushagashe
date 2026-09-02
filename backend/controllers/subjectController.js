const Subject = require('../models/Subject');

// Create new subject
const createSubject = async (req, res) => {
  try {
    const { subject_code, subject_name, course_id, credits } = req.body;

    // Validation
    if (!subject_code || !subject_name || !course_id) {
      return res.status(400).json({ error: 'Subject code, name, and course ID are required' });
    }

    // Lecturers can only create subjects for their assigned course
    if (req.user.role === 'lecturer') {
      if (!req.user.course_id) {
        return res.status(403).json({ error: 'Access denied: You must be assigned to a course to create subjects' });
      }
      if (parseInt(course_id) !== req.user.course_id) {
        return res.status(403).json({ error: 'Access denied: You can only create subjects for your assigned course' });
      }
    }

    const subjectData = {
      subject_code,
      subject_name,
      course_id: parseInt(course_id),
      credits: credits ? parseInt(credits) : 1
    };

    const subject = await Subject.create(subjectData);

    res.status(201).json({
      message: 'Subject created successfully',
      subject
    });
  } catch (error) {
    console.error('Create subject error:', error);
    if (error.code === '23505') {
      return res.status(400).json({ error: 'Subject code already exists' });
    }
    if (error.code === '23503') {
      return res.status(400).json({ error: 'Course not found' });
    }
    res.status(500).json({ error: 'Failed to create subject', details: error.message });
  }
};

// Get all subjects
const getAllSubjects = async (req, res) => {
  try {
    const { course_id, search, limit = 100 } = req.query;

    const filters = {
      course_id,
      search,
      limit: parseInt(limit)
    };

    const subjects = await Subject.findAll(filters);

    res.json(subjects);
  } catch (error) {
    console.error('Get subjects error:', error);
    res.status(500).json({ error: 'Failed to fetch subjects' });
  }
};

// Get subject by ID
const getSubjectById = async (req, res) => {
  try {
    const { id } = req.params;

    const subject = await Subject.findById(id);

    if (!subject) {
      return res.status(404).json({ error: 'Subject not found' });
    }

    res.json(subject);
  } catch (error) {
    console.error('Get subject error:', error);
    res.status(500).json({ error: 'Failed to fetch subject' });
  }
};

// Get subjects by course ID
const getSubjectsByCourseId = async (req, res) => {
  try {
    const { course_id } = req.params;

    const subjects = await Subject.findByCourseId(parseInt(course_id));

    res.json(subjects);
  } catch (error) {
    console.error('Get subjects by course error:', error);
    res.status(500).json({ error: 'Failed to fetch subjects for course' });
  }
};

// Update subject
const updateSubject = async (req, res) => {
  console.log('[BACKEND] Update subject - Request received');
  console.log('[BACKEND] Params:', req.params);
  console.log('[BACKEND] Request body:', req.body);
  console.log('[BACKEND] User role:', req.user?.role);
  try {
    const { id } = req.params;
    const { subject_code, subject_name, course_id, credits } = req.body;

    console.log('[BACKEND] Parsed update fields:', { subject_code, subject_name, course_id, credits });

    // Get existing subject to check course
    console.log('[BACKEND] Fetching existing subject');
    const existingSubject = await Subject.findById(id);
    if (!existingSubject) {
      console.log('[BACKEND] Subject not found');
      return res.status(404).json({ error: 'Subject not found' });
    }
    console.log('[BACKEND] Existing subject found');

    // Lecturers can only update subjects for their assigned course
    if (req.user.role === 'lecturer') {
      console.log('[BACKEND] Lecturer authorization check');
      if (!req.user.course_id) {
        return res.status(403).json({ error: 'Access denied: You must be assigned to a course to update subjects' });
      }
      if (existingSubject.course_id !== req.user.course_id) {
        return res.status(403).json({ error: 'Access denied: You can only update subjects for your assigned course' });
      }
      // Lecturers cannot change the course_id
      if (course_id !== undefined && parseInt(course_id) !== req.user.course_id) {
        return res.status(403).json({ error: 'Access denied: You cannot change the course' });
      }
    }

    const updateData = {};
    if (subject_code !== undefined) updateData.subject_code = subject_code;
    if (subject_name !== undefined) updateData.subject_name = subject_name;
    if (course_id !== undefined && req.user.role === 'admin') updateData.course_id = parseInt(course_id);
    if (credits !== undefined) updateData.credits = parseInt(credits);

    console.log('[BACKEND] Calling Subject.update with data:', updateData);
    const subject = await Subject.update(id, updateData);
    console.log('[BACKEND] Subject.update succeeded');

    if (!subject) {
      return res.status(404).json({ error: 'Subject not found' });
    }

    res.json({
      message: 'Subject updated successfully',
      subject
    });
  } catch (error) {
    console.error('[BACKEND] Update subject error:', error);
    console.error('[BACKEND] Error details:', error.message, error.code);
    if (error.code === '23505') {
      return res.status(400).json({ error: 'Subject code already exists' });
    }
    res.status(500).json({ error: 'Failed to update subject' });
  }
};

// Delete subject
const deleteSubject = async (req, res) => {
  try {
    const { id } = req.params;

    await Subject.delete(id);

    res.json({ message: 'Subject deleted successfully' });
  } catch (error) {
    console.error('Delete subject error:', error);
    res.status(500).json({ error: 'Failed to delete subject' });
  }
};

module.exports = {
  createSubject,
  getAllSubjects,
  getSubjectById,
  getSubjectsByCourseId,
  updateSubject,
  deleteSubject
};
