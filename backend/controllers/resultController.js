const Result = require('../models/Result');
const PDFDocument = require('pdfkit');
const User = require('../models/User');
const Fee = require('../models/Fee');

// Create new result
const createResult = async (req, res) => {
  try {
    const {
      user_id, course_id, semester, academic_year, assessment_mark,
      exam_mark, final_mark, grade, credits, lecturer, remarks
    } = req.body;

    // Validation
    if (!user_id || !course_id || !semester || !academic_year ||
        user_id === '' || course_id === '' || semester === '' || academic_year === '') {
      return res.status(400).json({ error: 'User ID, course ID, semester, and academic year are required' });
    }

    // Lecturer can only create results for their assigned course
    if (req.user.role === 'lecturer') {
      if (!req.user.course_id) {
        return res.status(403).json({ error: 'Access denied: You must be assigned to a course to create results' });
      }
      if (parseInt(course_id) !== req.user.course_id) {
        return res.status(403).json({ error: 'Access denied: You can only create results for your assigned course' });
      }
    }

    // Calculate final mark if not provided
    const calculatedFinalMark = final_mark || ((assessment_mark || 0) + (exam_mark || 0)) / 2;
    
    // Calculate grade if not provided
    const calculatedGrade = grade || Result.calculateGrade(calculatedFinalMark);

    const resultData = {
      user_id: parseInt(user_id),
      course_id: parseInt(course_id),
      semester: parseInt(semester),
      academic_year: parseInt(academic_year),
      assessment_mark: assessment_mark ? parseFloat(assessment_mark) : null,
      exam_mark: exam_mark ? parseFloat(exam_mark) : null,
      final_mark: parseFloat(calculatedFinalMark),
      grade: calculatedGrade,
      credits: credits ? parseInt(credits) : null,
      lecturer,
      remarks
    };

    const result = await Result.create(resultData);

    res.status(201).json({
      message: 'Result created successfully',
      id: result.id
    });
  } catch (error) {
    console.error('Create result error:', error);
    res.status(500).json({ error: 'Failed to create result', details: error.message });
  }
};

// Get all results with filters
const getAllResults = async (req, res) => {
  try {
    const {
      user_id, course_id, semester, academic_year, grade, search, limit = 50, offset = 0
    } = req.query;

    const filters = {
      user_id,
      course_id,
      semester,
      academic_year,
      grade,
      search,
      limit: parseInt(limit),
      offset: parseInt(offset)
    };

    // If student, only show their own results
    if (req.user.role === 'student') {
      filters.user_id = req.user.id;

      // Check if student has outstanding fees
      const hasOutstanding = await Fee.hasOutstandingFees(req.user.id);
      if (hasOutstanding) {
        const outstandingBalance = await Fee.getOutstandingBalance(req.user.id);
        return res.status(403).json({ 
          error: 'Outstanding fees must be paid before viewing results',
          outstanding_balance: outstandingBalance
        });
      }
    }

    // If lecturer, only show results for their assigned course
    if (req.user.role === 'lecturer') {
      filters.course_id = req.user.course_id;
    }

    const results = await Result.findAll(filters);

    res.json(results);
  } catch (error) {
    console.error('Get results error:', error);
    res.status(500).json({ error: 'Failed to fetch results' });
  }
};

// Get result by ID
const getResultById = async (req, res) => {
  try {
    const { id } = req.params;
    const result = await Result.findById(id);

    if (!result) {
      return res.status(404).json({ error: 'Result not found' });
    }

    // Check permission
    if (req.user.role === 'student' && result.user_id !== req.user.id) {
      return res.status(403).json({ error: 'Access denied' });
    }

    // If student, check if they have outstanding fees
    if (req.user.role === 'student') {
      const hasOutstanding = await Fee.hasOutstandingFees(req.user.id);
      if (hasOutstanding) {
        const outstandingBalance = await Fee.getOutstandingBalance(req.user.id);
        return res.status(403).json({ 
          error: 'Outstanding fees must be paid before viewing results',
          outstanding_balance: outstandingBalance
        });
      }
    }

    // Lecturer can only view results for their assigned course
    if (req.user.role === 'lecturer' && result.course_id !== req.user.course_id) {
      return res.status(403).json({ error: 'Access denied: You can only view results for your assigned course' });
    }

    res.json(result);
  } catch (error) {
    console.error('Get result error:', error);
    res.status(500).json({ error: 'Failed to fetch result' });
  }
};

// Update result
const updateResult = async (req, res) => {
  try {
    const { id } = req.params;
    const {
      course_id, semester, academic_year, assessment_mark, exam_mark,
      final_mark, grade, credits, lecturer, remarks
    } = req.body;

    console.log('Update result request:', { id, body: req.body, user: req.user });

    // Get existing result to check course
    const existingResult = await Result.findById(id);
    if (!existingResult) {
      return res.status(404).json({ error: 'Result not found' });
    }

    console.log('Existing result:', existingResult);

    // Lecturer can only update results for their assigned course
    if (req.user.role === 'lecturer') {
      if (!req.user.course_id) {
        return res.status(403).json({ error: 'Access denied: You must be assigned to a course to update results' });
      }
      if (existingResult.course_id !== req.user.course_id) {
        return res.status(403).json({ error: 'Access denied: You can only update results for your assigned course' });
      }
    }

    // Recalculate final mark and grade if marks changed
    let calculatedFinalMark = final_mark;
    let calculatedGrade = grade;

    if (assessment_mark !== undefined || exam_mark !== undefined) {
      const assessmentVal = assessment_mark !== undefined && assessment_mark !== '' ? parseFloat(assessment_mark) : 0;
      const examVal = exam_mark !== undefined && exam_mark !== '' ? parseFloat(exam_mark) : 0;
      calculatedFinalMark = final_mark || (assessmentVal + examVal) / 2;
      calculatedGrade = grade || Result.calculateGrade(calculatedFinalMark);
    }

    const updateData = {
      course_id: course_id !== undefined ? parseInt(course_id) : existingResult.course_id,
      semester: semester !== undefined ? parseInt(semester) : existingResult.semester,
      academic_year: academic_year !== undefined ? parseInt(academic_year) : existingResult.academic_year,
      assessment_mark: assessment_mark !== undefined ? (assessment_mark === '' ? null : parseFloat(assessment_mark)) : existingResult.assessment_mark,
      exam_mark: exam_mark !== undefined ? (exam_mark === '' ? null : parseFloat(exam_mark)) : existingResult.exam_mark,
      final_mark: calculatedFinalMark !== undefined ? parseFloat(calculatedFinalMark) : existingResult.final_mark,
      grade: calculatedGrade || existingResult.grade,
      credits: credits !== undefined ? (credits === '' ? null : parseInt(credits)) : existingResult.credits,
      lecturer,
      remarks
    };

    console.log('Update data:', updateData);

    // Remove undefined values
    Object.keys(updateData).forEach(key => {
      if (updateData[key] === undefined) {
        delete updateData[key];
      }
    });

    await Result.update(id, updateData);

    const updatedResult = await Result.findById(id);

    res.json(updatedResult);
  } catch (error) {
    console.error('Update result error:', error);
    res.status(500).json({ error: 'Failed to update result', details: error.message });
  }
};

// Delete result
const deleteResult = async (req, res) => {
  try {
    const { id } = req.params;

    const result = await Result.findById(id);
    if (!result) {
      return res.status(404).json({ error: 'Result not found' });
    }

    // Lecturer can only delete results for their assigned course
    if (req.user.role === 'lecturer' && result.course_id !== req.user.course_id) {
      return res.status(403).json({ error: 'Access denied: You can only delete results for your assigned course' });
    }

    await Result.delete(id);

    res.json({ message: 'Result deleted successfully' });
  } catch (error) {
    console.error('Delete result error:', error);
    res.status(500).json({ error: 'Failed to delete result' });
  }
};

// Get result statistics
const getResultStatistics = async (req, res) => {
  try {
    const stats = await Result.getStatistics();
    res.json(stats);
  } catch (error) {
    console.error('Get result statistics error:', error);
    res.status(500).json({ error: 'Failed to fetch result statistics' });
  }
};

// Get student GPA
const getStudentGPA = async (req, res) => {
  try {
    const userId = req.user.id;
    const gpaData = await Result.getStudentGPA(userId);
    res.json(gpaData);
  } catch (error) {
    console.error('Get student GPA error:', error);
    res.status(500).json({ error: 'Failed to fetch student GPA' });
  }
};

// Import multiple results (bulk upload)
const importResults = async (req, res) => {
  try {
    const { results } = req.body;

    if (!Array.isArray(results) || results.length === 0) {
      return res.status(400).json({ error: 'Results array is required' });
    }

    const createdResults = [];
    const errors = [];

    for (const resultData of results) {
      try {
        const {
          user_id, course_id, semester, academic_year, assessment_mark,
          exam_mark, final_mark, grade, credits, lecturer, remarks
        } = resultData;

        if (!user_id || !course_id || !semester || !academic_year ||
            user_id === '' || course_id === '' || semester === '' || academic_year === '') {
          errors.push({ data: resultData, error: 'Missing required fields' });
          continue;
        }

        const calculatedFinalMark = final_mark || ((assessment_mark || 0) + (exam_mark || 0)) / 2;
        const calculatedGrade = grade || Result.calculateGrade(calculatedFinalMark);

        const result = await Result.create({
          user_id, course_id, semester, academic_year, assessment_mark,
          exam_mark, final_mark: calculatedFinalMark, grade: calculatedGrade,
          credits, lecturer, remarks
        });

        createdResults.push({ id: result.id, ...resultData });
      } catch (error) {
        errors.push({ data: resultData, error: error.message });
      }
    }

    res.status(201).json({
      message: `Imported ${createdResults.length} results successfully`,
      created: createdResults,
      errors: errors
    });
  } catch (error) {
    console.error('Import results error:', error);
    res.status(500).json({ error: 'Failed to import results' });
  }
};

// Download results as PDF
const downloadResultsPDF = async (req, res) => {
  try {
    const { semester, academic_year } = req.query;
    const userId = req.user.id;

    // Get student information
    const student = await User.findById(userId);
    if (!student) {
      return res.status(404).json({ error: 'Student not found' });
    }

    // Get results for the specified term/year
    const filters = {
      user_id: userId,
      semester,
      academic_year
    };

    const results = await Result.findAll(filters);

    if (!results || results.length === 0) {
      return res.status(404).json({ error: 'No results found for the specified term' });
    }

    // Create PDF document
    const doc = new PDFDocument({ margin: 50 });
    
    // Set response headers
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename=results_${student.student_number}_${semester}_${academic_year}.pdf`);
    
    // Pipe PDF to response
    doc.pipe(res);

    // PDF Content
    doc.fontSize(20).font('Helvetica-Bold').text('Mushagashe Vocational Training Centre', { align: 'center' });
    doc.moveDown();
    doc.fontSize(16).font('Helvetica-Bold').text('Student Results Report', { align: 'center' });
    doc.moveDown();

    // Student Information
    doc.fontSize(12).font('Helvetica');
    doc.text(`Student Name: ${student.full_name}`);
    doc.text(`Student Number: ${student.student_number}`);
    doc.text(`Course: ${student.course_name || 'Not Assigned'}`);
    doc.text(`Term: ${semester}`);
    doc.text(`Academic Year: ${academic_year}`);
    doc.text(`Date Generated: ${new Date().toLocaleDateString()}`);
    doc.moveDown();

    // Results Table
    doc.fontSize(14).font('Helvetica-Bold').text('Academic Results');
    doc.moveDown();

    // Table Header
    const tableTop = doc.y;
    const tableLeft = 50;
    const colWidths = [150, 100, 60, 60, 60, 60];
    const headers = ['Course', 'Assessment', 'Exam', 'Final', 'Grade', 'Credits'];

    doc.fontSize(10).font('Helvetica-Bold');
    headers.forEach((header, i) => {
      doc.text(header, tableLeft + colWidths.slice(0, i).reduce((a, b) => a + b, 0), tableTop);
    });

    // Table Line
    doc.moveTo(tableLeft, tableTop + 15).lineTo(tableLeft + colWidths.reduce((a, b) => a + b, 0), tableTop + 15).stroke();

    // Table Rows
    doc.fontSize(10).font('Helvetica');
    results.forEach((result, index) => {
      const rowY = tableTop + 25 + (index * 20);
      const rowData = [
        result.course_name || 'N/A',
        result.assessment_mark || 'N/A',
        result.exam_mark || 'N/A',
        result.final_mark || 'N/A',
        result.grade || 'N/A',
        result.credits || 'N/A'
      ];

      rowData.forEach((data, i) => {
        doc.text(data, tableLeft + colWidths.slice(0, i).reduce((a, b) => a + b, 0), rowY);
      });
    });

    // Footer
    doc.moveDown(2);
    doc.fontSize(10).font('Helvetica-Oblique').text('This document is computer-generated and does not require a signature.', { align: 'center' });

    // Finalize PDF
    doc.end();
  } catch (error) {
    console.error('PDF generation error:', error);
    res.status(500).json({ error: 'Failed to generate PDF' });
  }
};

module.exports = {
  createResult,
  getAllResults,
  getResultById,
  updateResult,
  deleteResult,
  getResultStatistics,
  getStudentGPA,
  importResults,
  downloadResultsPDF
};
