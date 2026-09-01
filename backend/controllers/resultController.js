const Result = require('../models/Result');
const PDFDocument = require('pdfkit');
const User = require('../models/User');
const Fee = require('../models/Fee');
const { generateResultPDF } = require('../services/pdfService');
const Course = require('../models/Course');
const SubjectResult = require('../models/SubjectResult');
const Subject = require('../models/Subject');

console.log('=== resultController.js loaded with PDF template support ===');

// Create new result
const createResult = async (req, res) => {
  try {
    const {
      user_id, course_id, semester, academic_year, assessment_mark,
      exam_mark, final_mark, grade, credits, lecturer, remarks, subject_marks
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
    let calculatedFinalMark = final_mark;
    
    // If subject marks are provided, calculate average
    if (subject_marks && Array.isArray(subject_marks) && subject_marks.length > 0) {
      const totalMarks = subject_marks.reduce((sum, sm) => sum + (parseFloat(sm.mark) || 0), 0);
      calculatedFinalMark = totalMarks / subject_marks.length;
    } else if (assessment_mark !== undefined || exam_mark !== undefined) {
      calculatedFinalMark = final_mark || ((assessment_mark || 0) + (exam_mark || 0)) / 2;
    }
    
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

    console.log('=== CREATE RESULT DEBUG ===');
    console.log('Result data:', resultData);
    console.log('Subject marks received:', subject_marks);
    console.log('Subject marks type:', typeof subject_marks);
    console.log('Subject marks is array:', Array.isArray(subject_marks));

    const result = await Result.create(resultData);

    // Create subject results if provided
    if (subject_marks && Array.isArray(subject_marks) && subject_marks.length > 0) {
      console.log('Creating subject results...');
      for (const sm of subject_marks) {
        console.log('Processing subject mark:', sm);
        if (sm.subject_id && sm.mark !== undefined) {
          const subjectResultData = {
            result_id: result.id,
            subject_id: parseInt(sm.subject_id),
            mark: parseFloat(sm.mark),
            grade: SubjectResult.calculateGrade(parseFloat(sm.mark)),
            remarks: sm.remarks || null
          };
          console.log('Creating subject result:', subjectResultData);
          await SubjectResult.create(subjectResultData);
        }
      }
    } else {
      console.log('No subject marks provided to create');
    }

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
      final_mark, grade, credits, lecturer, remarks, subject_marks
    } = req.body;

    console.log('Update result request:', { id, body: req.body, user: req.user });

    // Get current result
    const currentResult = await Result.findById(id);
    if (!currentResult) {
      return res.status(404).json({ error: 'Result not found' });
    }

    // Lecturer can only update results for their assigned course
    if (req.user.role === 'lecturer') {
      if (!req.user.course_id) {
        return res.status(403).json({ error: 'Access denied: You must be assigned to a course to update results' });
      }
      if (currentResult.course_id !== req.user.course_id) {
        return res.status(403).json({ error: 'Access denied: You can only update results for your assigned course' });
      }
    }


    const updateData = {
      course_id, semester, academic_year, assessment_mark, exam_mark,
      final_mark, grade, credits, lecturer, remarks
    };

    // Remove undefined values and convert empty strings to null
    Object.keys(updateData).forEach(key => {
      if (updateData[key] === undefined) {
        delete updateData[key];
      } else if (updateData[key] === '') {
        updateData[key] = null;
      }
    });

    const updatedResult = await Result.update(id, updateData);

    res.json(updatedResult);
  } catch (error) {
    console.error('Update result error:', error);
    res.status(500).json({ error: 'Failed to update result' });
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
    if (req.user.role === 'lecturer') {
      if (!req.user.course_id) {
        return res.status(403).json({ error: 'Access denied: You must be assigned to a course to delete results' });
      }
      if (result.course_id !== req.user.course_id) {
        return res.status(403).json({ error: 'Access denied: You can only delete results for your assigned course' });
      }
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

// Generate secure PDF for a single result
const downloadResultPDF = async (req, res) => {
  console.log('=== DOWNLOAD RESULT PDF CALLED ===');
  console.log('Request params:', req.params);
  console.log('Request user:', req.user);
  try {
    console.log('PDF download requested for result ID:', req.params.id);
    const { id } = req.params;

    // Get result with student and course info
    const result = await Result.findById(id);
    if (!result) {
      console.log('Result not found for ID:', id);
      return res.status(404).json({ error: 'Result not found' });
    }
    console.log('Result found:', result.id);
    console.log('Result data keys:', Object.keys(result));
    console.log('Has subject_results?', !!result.subject_results);
    if (result.subject_results) {
      console.log('Subject results count:', result.subject_results.length);
    }

    // Get student details
    const student = await User.findById(result.user_id);
    if (!student) {
      console.log('Student not found for ID:', result.user_id);
      return res.status(404).json({ error: 'Student not found' });
    }
    console.log('Student found:', student.full_name);

    // Get course details
    const course = await Course.findById(result.course_id);
    if (!course) {
      console.log('Course not found for ID:', result.course_id);
      return res.status(404).json({ error: 'Course not found' });
    }
    console.log('Course found:', course.course_name);

    // Check fee status for students - block PDF download if outstanding balance > 0
    if (req.user.role === 'student') {
      const outstandingBalance = await Fee.getOutstandingBalance(student.id);
      console.log('Student outstanding balance:', outstandingBalance);
      
      if (outstandingBalance > 0) {
        console.log('Blocking PDF download due to outstanding fees:', outstandingBalance);
        return res.status(403).json({ 
          error: 'Result Slip Download Unavailable',
          message: `Your official result slip cannot be downloaded because you have an outstanding fee balance of $${outstandingBalance.toFixed(2)}. Please clear your outstanding fees and try again.`,
          outstanding_balance: outstandingBalance
        });
      }
    }

    console.log('Starting PDF generation...');
    // Generate PDF
    const pdfBuffer = await generateResultPDF(student, result, course);
    console.log('PDF generated, size:', pdfBuffer.length);

    // Set response headers
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="result_${student.student_number}_${result.semester}_${result.academic_year}.pdf"`);
    res.setHeader('Content-Length', pdfBuffer.length);

    // Send PDF
    res.send(pdfBuffer);
  } catch (error) {
    console.error('Download result PDF error:', error);
    res.status(500).json({ error: 'Failed to generate PDF', details: error.message });
  }
};

// Download all results as PDF (bulk)
const downloadResultsPDF = async (req, res) => {
  console.log('=== DOWNLOAD RESULTS PDF (BULK) CALLED ===');
  try {
    const { semester, academic_year } = req.query;
    const userId = req.user.id;

    // Get student information
    const student = await User.findById(userId);
    if (!student) {
      return res.status(404).json({ error: 'Student not found' });
    }

    // Check fee status - block PDF download if outstanding balance > 0
    const outstandingBalance = await Fee.getOutstandingBalance(userId);
    console.log('Student outstanding balance:', outstandingBalance);
    
    if (outstandingBalance > 0) {
      console.log('Blocking bulk PDF download due to outstanding fees:', outstandingBalance);
      return res.status(403).json({ 
        error: 'Result Slip Download Unavailable',
        message: `Your official result slip cannot be downloaded because you have an outstanding fee balance of $${outstandingBalance.toFixed(2)}. Please clear your outstanding fees and try again.`,
        outstanding_balance: outstandingBalance
      });
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

    console.log('Found', results.length, 'results for bulk download');

    // For now, use the first result to generate a single PDF with the template
    // In the future, we could generate multiple pages or combine them
    if (results.length > 0) {
      const firstResult = results[0];
      const course = await Course.findById(firstResult.course_id);
      
      console.log('Generating PDF for result:', firstResult.id);
      const pdfBuffer = await generateResultPDF(student, firstResult, course);
      
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', `attachment; filename=results_${student.student_number}_${semester}_${academic_year}.pdf`);
      res.send(pdfBuffer);
      return;
    }

    // Fallback to default PDFKit if no results
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
    doc.text(`Course: ${student.course_name || 'N/A'}`);
    doc.text(`Semester: ${semester || 'All'}`);
    doc.text(`Academic Year: ${academic_year || 'All'}`);
    doc.moveDown();

    // Results Table
    doc.fontSize(14).font('Helvetica-Bold').text('Academic Results');
    doc.moveDown();

    // Table Header
    const tableTop = doc.y;
    const tableLeft = 50;
    const colWidths = [80, 80, 80, 60, 60, 60];
    const headers = ['Semester', 'Year', 'Assessment', 'Exam', 'Final', 'Grade'];

    doc.fontSize(10).font('Helvetica-Bold');
    headers.forEach((header, i) => {
      doc.text(header, tableLeft + colWidths.slice(0, i).reduce((a, b) => a + b, 0), tableTop);
    });

    doc.moveDown();
    let rowY = doc.y;

    // Results Rows
    doc.fontSize(10).font('Helvetica');
    results.forEach(result => {
      const rowData = [
        result.semester || 'N/A',
        result.academic_year || 'N/A',
        result.assessment_mark || 'N/A',
        result.exam_mark || 'N/A',
        result.final_mark || 'N/A',
        result.grade || 'N/A'
      ];

      rowData.forEach((data, i) => {
        doc.text(data, tableLeft + colWidths.slice(0, i).reduce((a, b) => a + b, 0), rowY);
      });

      rowY += 20;
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
  downloadResultPDF,
  downloadResultsPDF
};
