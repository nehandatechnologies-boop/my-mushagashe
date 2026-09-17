const bcrypt = require('bcryptjs');
const crypto = require('crypto');
const User = require('../models/User');
const XLSX = require('xlsx');
const { generateToken, sendVerificationEmail } = require('../config/email');

// Public student registration - REMOVED - Admin only
// const registerStudent = async (req, res) => { ... };

// Create new student (admin only)
const createStudent = async (req, res) => {
  try {
    const {
      full_name, email, student_number, password, phone, gender,
      national_id, date_of_birth, address, guardian_name, guardian_phone,
      intake, intake_year, course_id
    } = req.body;

    // Trim whitespace from inputs
    const trimmedStudentNumber = student_number?.trim();
    const trimmedEmail = email?.trim();
    const trimmedPassword = password?.trim();

    console.log('[STUDENT.CREATE] Request data:', {
      full_name,
      student_number: trimmedStudentNumber,
      intake, // Raw intake text from frontend
      intake_year,
      course_id
    });

    // Validation
    if (!full_name || !trimmedStudentNumber || !trimmedPassword) {
      return res.status(400).json({ error: 'Full name, student number, and password are required' });
    }

    if (trimmedPassword.length < 6) {
      return res.status(400).json({ error: 'Password must be at least 6 characters' });
    }

    // Check if student number or email already exists
    const existingStudent = await User.findByStudentNumber(trimmedStudentNumber);
    if (existingStudent) {
      return res.status(400).json({ error: 'Student number already exists' });
    }

    if (trimmedEmail) {
      const existingEmail = await User.findByEmail(trimmedEmail);
      if (existingEmail) {
        return res.status(400).json({ error: 'Email already exists' });
      }
    }

    // Resolve intake text to intake ID
    let resolvedIntakeId = null;
    let resolvedIntakeYear = null;

    if (intake) {
      const Intake = require('../models/Intake');
      const allIntakes = await Intake.findAll({});

      // Try to match intake text against production intakes
      const normalizedIntake = intake.toString().trim().toUpperCase();
      const matchedIntake = allIntakes.find(i =>
        i.name && i.name.toUpperCase() === normalizedIntake
      );

      if (matchedIntake) {
        resolvedIntakeId = matchedIntake.id;
        resolvedIntakeYear = matchedIntake.year;
        console.log('[STUDENT.CREATE] Resolved intake:', { text: intake, id: resolvedIntakeId, year: resolvedIntakeYear });
      } else {
        console.log('[STUDENT.CREATE] Could not resolve intake:', intake);
        console.log('[STUDENT.CREATE] Available intakes:', allIntakes.map(i => i.name).join(', '));
      }
    }

    // Hash password
    const hashedPassword = bcrypt.hashSync(trimmedPassword, 10);

    // Create student
    const studentData = {
      full_name,
      email: trimmedEmail,
      student_number: trimmedStudentNumber,
      password: hashedPassword,
      role: 'student',
      phone,
      gender,
      national_id,
      date_of_birth,
      address,
      guardian_name,
      guardian_phone,
      intake: resolvedIntakeId, // Store the intake ID
      intake_year: resolvedIntakeYear, // Store the intake year
      course_id,
      status: 'active'
    };

    console.log('[STUDENT.CREATE] Student data before User.create:', {
      intake: studentData.intake,
      intake_year: studentData.intake_year
    });

    const result = await User.create(studentData);

    console.log('Student created successfully:', { id: result.id, student_number: trimmedStudentNumber, intake: result.intake, intake_year: result.intake_year });

    res.status(201).json({
      message: 'Student created successfully',
      id: result.id
    });
  } catch (error) {
    console.error('Create student error:', error);

    if (error.message.includes('UNIQUE') || error.code === 'SQLITE_CONSTRAINT') {
      return res.status(400).json({ error: 'Student number or email already exists' });
    }
    res.status(500).json({ error: 'Failed to create student' });
  }
};

// Get all students with filters
const getAllStudents = async (req, res) => {
  try {
    const {
      role, status, course_id, intake, search, limit = 50, offset = 0
    } = req.query;

    const filters = {
      role: role || 'student',
      status,
      course_id,
      intake,
      search,
      limit: parseInt(limit),
      offset: parseInt(offset)
    };

    // If lecturer, only show students in their assigned course
    if (req.user.role === 'lecturer') {
      filters.course_id = req.user.course_id;
    }

    const students = await User.findAll(filters);

    // Remove sensitive fields from response
    const safeStudents = students.map(student => {
      const { 
        password, 
        mfa_secret, 
        password_history, 
        last_login_ip, 
        failed_login_attempts, 
        account_locked_until,
        ...safeStudent 
      } = student;
      return safeStudent;
    });

    res.json(safeStudents);
  } catch (error) {
    console.error('Get students error:', error);
    res.status(500).json({ error: 'Failed to fetch students' });
  }
};

// Search students (for fee entry and other lookups)
const searchStudents = async (req, res) => {
  try {
    const { q, limit = 20 } = req.query;

    if (!q || q.trim() === '') {
      return res.status(400).json({ error: 'Search query is required' });
    }

    const trimmedQuery = q.trim();
    const limitNum = parseInt(limit);

    // Search by full name, partial name, or student number
    const students = await User.search(trimmedQuery, limitNum);

    // Return only necessary fields for selection
    const searchResults = students.map(student => ({
      id: student.id,
      full_name: student.full_name,
      student_number: student.student_number,
      course_name: student.course_name || 'N/A',
      course_code: student.course_code || 'N/A',
      intake_name: student.intake_name || 'N/A',
      intake_year: student.intake_year || 'N/A'
    }));

    res.json(searchResults);
  } catch (error) {
    console.error('Search students error:', error);
    res.status(500).json({ error: 'Failed to search students: ' + error.message });
  }
};

// Get student by ID
const getStudentById = async (req, res) => {
  try {
    const { id } = req.params;
    const student = await User.findById(id);

    if (!student) {
      return res.status(404).json({ error: 'Student not found' });
    }

    if (student.role !== 'student') {
      return res.status(400).json({ error: 'User is not a student' });
    }

    const { password: _, ...studentWithoutPassword } = student;

    res.json(studentWithoutPassword);
  } catch (error) {
    console.error('Get student error:', error);
    res.status(500).json({ error: 'Failed to fetch student' });
  }
};

// Update student
const updateStudent = async (req, res) => {
  try {
    const { id } = req.params;
    const {
      full_name, email, student_number, phone, gender, national_id,
      date_of_birth, address, guardian_name, guardian_phone,
      intake, intake_year, status, course_id
    } = req.body;

    console.log('[STUDENT.UPDATE] Request data:', {
      id,
      intake, // Raw intake text from frontend
      intake_year,
      course_id
    });

    // Get current student data
    const currentStudent = await User.findById(id);
    if (!currentStudent) {
      return res.status(404).json({ error: 'Student not found' });
    }

    // Resolve intake text to intake ID if provided
    let resolvedIntakeId = null;
    let resolvedIntakeYear = null;

    if (intake) {
      const Intake = require('../models/Intake');
      const allIntakes = await Intake.findAll({});

      // Try to match intake text against production intakes
      const normalizedIntake = intake.toString().trim().toUpperCase();
      const matchedIntake = allIntakes.find(i =>
        i.name && i.name.toUpperCase() === normalizedIntake
      );

      if (matchedIntake) {
        resolvedIntakeId = matchedIntake.id;
        resolvedIntakeYear = matchedIntake.year;
        console.log('[STUDENT.UPDATE] Resolved intake:', { text: intake, id: resolvedIntakeId, year: resolvedIntakeYear });
      } else {
        console.log('[STUDENT.UPDATE] Could not resolve intake:', intake);
        console.log('[STUDENT.UPDATE] Available intakes:', allIntakes.map(i => i.name).join(', '));
      }
    }

    const updateData = {
      full_name, email, student_number, phone, gender, national_id,
      date_of_birth, address, guardian_name, guardian_phone,
      intake: resolvedIntakeId, // Store the intake ID
      intake_year: resolvedIntakeYear, // Store the intake year
      status, course_id
    };

    // Remove undefined values
    Object.keys(updateData).forEach(key => {
      if (updateData[key] === undefined) {
        delete updateData[key];
      }
    });

    console.log('[STUDENT.UPDATE] Update data:', {
      intake: updateData.intake,
      intake_year: updateData.intake_year
    });

    const updatedStudent = await User.update(id, updateData);

    console.log('[STUDENT.UPDATE] Updated student:', {
      id: updatedStudent.id,
      intake: updatedStudent.intake,
      intake_year: updatedStudent.intake_year
    });

    const { password: _, ...studentWithoutPassword } = updatedStudent;

    res.json(studentWithoutPassword);
  } catch (error) {
    console.error('Update student error:', error);
    res.status(500).json({ error: 'Failed to update student' });
  }
};

// Delete student
const deleteStudent = async (req, res) => {
  try {
    const { id } = req.params;

    const student = await User.findById(id);
    if (!student) {
      return res.status(404).json({ error: 'Student not found' });
    }

    if (student.role !== 'student') {
      return res.status(400).json({ error: 'User is not a student' });
    }

    // Delete dependent records first
    await User.deleteDependentRecords(id);

    await User.delete(id);

    res.json({ message: 'Student deleted successfully' });
  } catch (error) {
    console.error('Delete student error:', error);
    res.status(500).json({ error: 'Failed to delete student', details: error.message });
  }
};

// Suspend student
const suspendStudent = async (req, res) => {
  try {
    const { id } = req.params;

    await User.update(id, { status: 'suspended' });

    res.json({ message: 'Student suspended successfully' });
  } catch (error) {
    console.error('Suspend student error:', error);
    res.status(500).json({ error: 'Failed to suspend student' });
  }
};

// Activate student
const activateStudent = async (req, res) => {
  try {
    const { id } = req.params;

    await User.update(id, { status: 'active' });

    res.json({ message: 'Student activated successfully' });
  } catch (error) {
    console.error('Activate student error:', error);
    res.status(500).json({ error: 'Failed to activate student' });
  }
};

// Reset student password
const resetPassword = async (req, res) => {
  try {
    const { id } = req.params;
    const { new_password } = req.body;

    // If no password provided, generate a temporary one
    const passwordToSet = new_password || Math.random().toString(36).slice(-8) + Math.random().toString(36).slice(-4);

    if (passwordToSet.length < 6) {
      return res.status(400).json({ error: 'Password must be at least 6 characters' });
    }

    const hashedPassword = bcrypt.hashSync(passwordToSet, 10);

    await User.updatePassword(id, hashedPassword);

    // If we generated a temporary password, return it
    if (!new_password) {
      res.json({
        message: 'Password reset successfully',
        temporary_password: passwordToSet
      });
    } else {
      res.json({ message: 'Password reset successfully' });
    }
  } catch (error) {
    console.error('Reset password error:', error);
    res.status(500).json({ error: 'Failed to reset password' });
  }
};

// Reset lecturer password
const resetLecturerPassword = async (req, res) => {
  try {
    const { id } = req.params;
    const { new_password } = req.body;

    // If no password provided, generate a temporary one
    const passwordToSet = new_password || Math.random().toString(36).slice(-8) + Math.random().toString(36).slice(-4);

    if (passwordToSet.length < 6) {
      return res.status(400).json({ error: 'Password must be at least 6 characters' });
    }

    const hashedPassword = bcrypt.hashSync(passwordToSet, 10);

    await User.updatePassword(id, hashedPassword);

    // If we generated a temporary password, return it
    if (!new_password) {
      res.json({ 
        message: 'Password reset successfully',
        temporary_password: passwordToSet
      });
    } else {
      res.json({ message: 'Password reset successfully' });
    }
  } catch (error) {
    console.error('Reset lecturer password error:', error);
    res.status(500).json({ error: 'Failed to reset password' });
  }
};

// Assign course to student
const assignCourse = async (req, res) => {
  try {
    const { id } = req.params;
    const { course_id } = req.body;

    if (!course_id) {
      return res.status(400).json({ error: 'Course ID is required' });
    }

    await User.update(id, { course_id });

    res.json({ message: 'Course assigned successfully' });
  } catch (error) {
    console.error('Assign course error:', error);
    res.status(500).json({ error: 'Failed to assign course' });
  }
};

// Get student statistics
const getStudentStatistics = async (req, res) => {
  try {
    const stats = await User.getStatistics();
    res.json(stats);
  } catch (error) {
    console.error('Get student statistics error:', error);
    res.status(500).json({ error: 'Failed to fetch student statistics' });
  }
};

// Create lecturer (admin only)
const createLecturer = async (req, res) => {
  try {
    const {
      full_name, email, password, phone, gender, course_id
    } = req.body;

    // Validation
    if (!full_name || !email || !password || !course_id) {
      return res.status(400).json({ error: 'Full name, email, password, and course ID are required' });
    }

    if (password.length < 6) {
      return res.status(400).json({ error: 'Password must be at least 6 characters' });
    }

    // Check if email already exists
    const existingEmail = await User.findByEmail(email);
    if (existingEmail) {
      return res.status(400).json({ error: 'Email already exists' });
    }

    // Hash password
    const hashedPassword = bcrypt.hashSync(password, 10);

    const lecturerData = {
      full_name, email, password: hashedPassword, role: 'lecturer',
      phone, gender, course_id, status: 'active'
    };

    const result = await User.create(lecturerData);

    res.status(201).json({
      message: 'Lecturer created successfully',
      id: result.id
    });
  } catch (error) {
    console.error('Create lecturer error:', error);
    if (error.message.includes('UNIQUE') || error.code === 'SQLITE_CONSTRAINT') {
      return res.status(400).json({ error: 'Email already exists' });
    }
    res.status(500).json({ error: 'Failed to create lecturer' });
  }
};

// Get all lecturers (admin only)
const getAllLecturers = async (req, res) => {
  try {
    const filters = {
      role: 'lecturer',
      limit: 100
    };

    const lecturers = await User.findAll(filters);

    // Remove passwords from response
    const lecturersWithoutPasswords = lecturers.map(lecturer => {
      const { password, ...lecturerWithoutPassword } = lecturer;
      return lecturerWithoutPassword;
    });

    res.json(lecturersWithoutPasswords);
  } catch (error) {
    console.error('Get lecturers error:', error);
    res.status(500).json({ error: 'Failed to fetch lecturers' });
  }
};

// Get lecturer by ID (admin only)
const getLecturerById = async (req, res) => {
  try {
    const { id } = req.params;

    const lecturer = await User.findById(id);
    if (!lecturer) {
      return res.status(404).json({ error: 'Lecturer not found' });
    }

    if (lecturer.role !== 'lecturer') {
      return res.status(400).json({ error: 'User is not a lecturer' });
    }

    const { password, ...lecturerWithoutPassword } = lecturer;
    res.json(lecturerWithoutPassword);
  } catch (error) {
    console.error('Get lecturer error:', error);
    res.status(500).json({ error: 'Failed to fetch lecturer' });
  }
};

// Update lecturer (admin only)
const updateLecturer = async (req, res) => {
  try {
    const { id } = req.params;
    const {
      full_name, email, phone, gender, course_id, status
    } = req.body;

    // Get existing lecturer
    const existingLecturer = await User.findById(id);
    if (!existingLecturer) {
      return res.status(404).json({ error: 'Lecturer not found' });
    }

    if (existingLecturer.role !== 'lecturer') {
      return res.status(400).json({ error: 'User is not a lecturer' });
    }

    const updateData = {
      full_name, email, phone, gender, course_id, status
    };

    // Remove undefined values
    Object.keys(updateData).forEach(key => {
      if (updateData[key] === undefined) {
        delete updateData[key];
      }
    });

    await User.update(id, updateData);

    const updatedLecturer = await User.findById(id);
    const { password, ...lecturerWithoutPassword } = updatedLecturer;

    res.json(lecturerWithoutPassword);
  } catch (error) {
    console.error('Update lecturer error:', error);
    if (error.message.includes('UNIQUE') || error.code === 'SQLITE_CONSTRAINT') {
      return res.status(400).json({ error: 'Email already exists' });
    }
    res.status(500).json({ error: 'Failed to update lecturer' });
  }
};

// Delete lecturer (admin only)
const deleteLecturer = async (req, res) => {
  try {
    const { id } = req.params;

    const lecturer = await User.findById(id);
    if (!lecturer) {
      return res.status(404).json({ error: 'Lecturer not found' });
    }

    if (lecturer.role !== 'lecturer') {
      return res.status(400).json({ error: 'User is not a lecturer' });
    }

    await User.delete(id);

    res.json({ message: 'Lecturer deleted successfully' });
  } catch (error) {
    console.error('Delete lecturer error:', error);
    res.status(500).json({ error: 'Failed to delete lecturer' });
  }
};

// Import students from Excel (admin only)
const importStudentsFromExcel = async (req, res) => {
  try {
    console.log('[IMPORT] Starting import process');
    console.log('[IMPORT] Request body keys:', Object.keys(req.body));
    console.log('[IMPORT] File present:', !!req.file);
    console.log('[IMPORT] File details:', req.file ? {
      originalname: req.file.originalname,
      mimetype: req.file.mimetype,
      size: req.file.size
    } : 'No file');

    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }

    const { ImportBatch, ImportBatchDetail } = require('../models/ImportBatch');

    // Parse Excel file
    console.log('[IMPORT] Parsing Excel file...');
    const workbook = XLSX.read(req.file.buffer, { type: 'buffer' });
    console.log('[IMPORT] Excel parsed successfully');

    // Detect the correct worksheet with student import headers
    console.log(`[IMPORT] Available worksheets: ${workbook.SheetNames.join(', ')}`);

    // Header aliases for flexible matching
    const headerAliases = {
      'FULL NAME': ['FULL NAME', 'STUDENT NAME', 'NAME', 'FULLNAME', 'STUDENT FULL NAME'],
      'STUDENT NUMBER': ['STUDENT NUMBER', 'STUDENT NO', 'STUDENT ID', 'STUDENT NUMBER/ID', 'REGISTRATION NUMBER', 'REG NO'],
      'COURSE CODE': ['COURSE CODE', 'COURSE', 'PROGRAMME CODE', 'PROGRAM CODE', 'COURSE ID'],
      'GENDER': ['GENDER', 'SEX'],
      'INTAKE': ['INTAKE', 'INTAKE NAME', 'INTAKE DATE']
    };

    // Normalize header name
    const normalizeHeaderName = (header) => {
      if (!header) return '';
      return String(header).toUpperCase().trim().replace(/\s+/g, ' ');
    };

    // Check if a header matches any alias
    const headerMatchesAlias = (header, aliasKey) => {
      const normalized = normalizeHeaderName(header);
      const aliases = headerAliases[aliasKey] || [aliasKey];
      return aliases.some(alias => normalizeHeaderName(alias) === normalized);
    };

    let selectedSheetName = null;
    let selectedWorksheet = null;
    let selectedHeaders = [];
    const worksheetDiagnostics = [];

    for (const sheetName of workbook.SheetNames) {
      const worksheet = workbook.Sheets[sheetName];
      const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1 });

      if (!jsonData || jsonData.length === 0) {
        worksheetDiagnostics.push({
          sheet: sheetName,
          headers: [],
          reason: 'Empty worksheet'
        });
        continue;
      }

      // Get the first row as potential headers
      const firstRow = jsonData[0];
      if (!firstRow) {
        worksheetDiagnostics.push({
          sheet: sheetName,
          headers: [],
          reason: 'No headers found'
        });
        continue;
      }

      const normalizedHeaders = firstRow.map(h => normalizeHeaderName(h));
      console.log(`[IMPORT] Worksheet "${sheetName}" headers: ${normalizedHeaders.join(', ')}`);

      // Check for minimum required headers (FULL NAME + STUDENT NUMBER)
      const hasFullName = normalizedHeaders.some(h => headerMatchesAlias(h, 'FULL NAME'));
      const hasStudentNumber = normalizedHeaders.some(h => headerMatchesAlias(h, 'STUDENT NUMBER'));

      worksheetDiagnostics.push({
        sheet: sheetName,
        headers: normalizedHeaders,
        hasFullName,
        hasStudentNumber,
        reason: hasFullName && hasStudentNumber ? 'Valid student worksheet' : 'Missing required headers'
      });

      if (hasFullName && hasStudentNumber) {
        selectedSheetName = sheetName;
        selectedWorksheet = worksheet;
        selectedHeaders = normalizedHeaders;
        console.log(`[IMPORT] Selected worksheet: ${sheetName}`);
        console.log(`[IMPORT] Detected headers: ${normalizedHeaders.join(', ')}`);
        break;
      }
    }

    if (!selectedWorksheet) {
      console.log(`[IMPORT] No valid worksheet found. Diagnostics:`, JSON.stringify(worksheetDiagnostics, null, 2));
      return res.status(400).json({
        error: 'No valid student import worksheet found',
        diagnostics: worksheetDiagnostics,
        message: 'Please ensure your Excel file contains headers for FULL NAME and STUDENT NUMBER (minimum). Optional headers: COURSE CODE, GENDER, INTAKE.'
      });
    }

    // Parse the selected worksheet
    const data = XLSX.utils.sheet_to_json(selectedWorksheet);

    if (!data || data.length === 0) {
      return res.status(400).json({ error: 'No data found in selected worksheet' });
    }

    console.log(`[IMPORT] Processing ${data.length} rows from worksheet: ${selectedSheetName}`);

    const preview = req.body.preview === 'true';
    console.log(`[IMPORT] Preview mode: ${preview}`);

    // Load all courses for matching
    const Course = require('../models/Course');
    const allCourses = await Course.findAll({});

    // Load all intakes for matching
    const Intake = require('../models/Intake');
    const allIntakes = await Intake.findAll({});

    console.log(`[IMPORT] Loaded ${allCourses.length} courses and ${allIntakes.length} intakes for matching`);
    console.log('[IMPORT] Sample courses:', allCourses.slice(0, 3).map(c => `${c.course_code} (id=${c.id})`));
    console.log('[IMPORT] Sample intakes:', allIntakes.map(i => `${i.name} (id=${i.id})`));

    // Process rows for preview or actual import
    const processed = [];
    const errors = [];
    const processedStudentNumbers = new Set();
    const courseMatches = { matched: 0, unmatched: 0 };
    const intakeMatches = { matched: 0, unmatched: 0 };
    const genderStats = { male: 0, female: 0, null: 0, other: 0 };

    for (let i = 0; i < data.length; i++) {
      const row = data[i];
      const rowNum = i + 2;

      try {
        // Skip completely empty rows
        const hasAnyData = Object.values(row).some(val => val !== null && val !== undefined && val !== '');
        if (!hasAnyData) {
          continue;
        }

        // Normalize headers using aliases
        const normalizeHeader = (row, aliasKey) => {
          const aliases = headerAliases[aliasKey] || [aliasKey];
          for (const alias of aliases) {
            // Try exact match first
            if (row[alias] !== undefined && row[alias] !== null && row[alias] !== '') {
              return row[alias];
            }
            // Try case-insensitive match
            const key = Object.keys(row).find(k => normalizeHeaderName(k) === normalizeHeaderName(alias));
            if (key && row[key] !== undefined && row[key] !== null && row[key] !== '') {
              return row[key];
            }
          }
          return null;
        };

        // Normalize gender
        const normalizeGender = (gender) => {
          if (!gender) return null;
          const normalized = gender.toString().trim().toLowerCase();
          if (normalized === 'male' || normalized === 'm') return 'male';
          if (normalized === 'female' || normalized === 'f') return 'female';
          return null;
        };

        // Find course by code (from Excel Course Code column) or by name
        const findCourseId = (courseCodeFromExcel, courseNameFromExcel) => {
          console.log(`[IMPORT] Course lookup - Code: "${courseCodeFromExcel}", Name: "${courseNameFromExcel}"`);

          // PRIORITY 1: Try exact match on course code (normalized)
          if (courseCodeFromExcel) {
            const normalizedCode = courseCodeFromExcel.toString().trim().toUpperCase();
            console.log(`[IMPORT]   Trying course code match: "${normalizedCode}"`);

            const byCode = allCourses.find(c =>
              c.course_code && c.course_code.toUpperCase() === normalizedCode
            );
            if (byCode) {
              console.log(`[IMPORT]   ✓ Matched by code: ${byCode.course_code} → ${byCode.course_name} (id=${byCode.id})`);
              return { id: byCode.id, name: byCode.course_name, code: byCode.course_code, matchedBy: 'code' };
            }
            console.log(`[IMPORT]   ✗ No course code match for: "${normalizedCode}"`);
          }

          // PRIORITY 2: Try exact match on course name (normalized)
          if (courseNameFromExcel) {
            const normalized = courseNameFromExcel.toString().trim().toUpperCase();
            console.log(`[IMPORT]   Trying course name match: "${normalized}"`);

            const byName = allCourses.find(c =>
              c.course_name && c.course_name.toUpperCase() === normalized
            );
            if (byName) {
              console.log(`[IMPORT]   ✓ Matched by name: ${byName.course_name} (id=${byName.id})`);
              return { id: byName.id, name: byName.course_name, code: byName.course_code, matchedBy: 'name' };
            }
            console.log(`[IMPORT]   ✗ No course name match for: "${normalized}"`);
          }

          // PRIORITY 3: Try partial match on course name
          if (courseNameFromExcel) {
            const normalized = courseNameFromExcel.toString().trim().toUpperCase();
            console.log(`[IMPORT]   Trying partial course name match: "${normalized}"`);

            const byPartial = allCourses.find(c =>
              c.course_name && (c.course_name.toUpperCase().includes(normalized) || normalized.includes(c.course_name.toUpperCase()))
            );
            if (byPartial) {
              console.log(`[IMPORT]   ✓ Matched by partial: ${byPartial.course_name} (id=${byPartial.id})`);
              return { id: byPartial.id, name: byPartial.course_name, code: byPartial.course_code, matchedBy: 'partial' };
            }
            console.log(`[IMPORT]   ✗ No partial match for: "${normalized}"`);
          }

          // PRIORITY 4: Only use numeric ID if the Excel value is explicitly numeric
          if (courseCodeFromExcel) {
            const courseIdNum = parseInt(courseCodeFromExcel);
            if (!isNaN(courseIdNum)) {
              console.log(`[IMPORT]   Trying numeric ID match: ${courseIdNum}`);
              const byId = allCourses.find(c => c.id === courseIdNum);
              if (byId) {
                console.log(`[IMPORT]   ✓ Matched by ID: ${byId.course_name} (id=${byId.id})`);
                return { id: byId.id, name: byId.course_name, code: byId.course_code, matchedBy: 'id' };
              }
              console.log(`[IMPORT]   ✗ No ID match for: ${courseIdNum}`);
            }
          }

          console.log(`[IMPORT]   ✗ NO MATCH found for course`);
          console.log(`[IMPORT]   Input - Code: "${courseCodeFromExcel}", Name: "${courseNameFromExcel}"`);
          console.log(`[IMPORT]   Available course codes:`, allCourses.map(c => c.course_code).filter(c => c).join(', '));
          console.log(`[IMPORT]   Available course names:`, allCourses.map(c => c.course_name).join(', '));
          return null;
        };

        // Find intake by name (intake lookup matches by exact name)
        const findIntakeId = (intakeNameFromExcel) => {
          if (!intakeNameFromExcel) return null;
          const normalized = intakeNameFromExcel.toString().trim();
          const normalizedUpper = normalized.toUpperCase();

          console.log(`[IMPORT] Looking for intake: "${normalized}"`);

          // PRIORITY 1: Try case-insensitive exact match (most common issue)
          const byNameCaseInsensitive = allIntakes.find(i =>
            i.name && i.name.toUpperCase() === normalizedUpper
          );
          if (byNameCaseInsensitive) {
            console.log(`[IMPORT]   ✓ Matched by case-insensitive: "${byNameCaseInsensitive.name}" (id=${byNameCaseInsensitive.id})`);
            return { id: byNameCaseInsensitive.id, name: byNameCaseInsensitive.name, year: byNameCaseInsensitive.year, matchedBy: 'name_case_insensitive' };
          }

          // PRIORITY 2: Try partial match (intake name contains the Excel value or vice versa)
          const byPartial = allIntakes.find(i =>
            i.name && (i.name.toUpperCase().includes(normalizedUpper) || normalizedUpper.includes(i.name.toUpperCase()))
          );
          if (byPartial) {
            console.log(`[IMPORT]   ✓ Matched by partial: "${byPartial.name}" (id=${byPartial.id})`);
            return { id: byPartial.id, name: byPartial.name, year: byPartial.year, matchedBy: 'partial' };
          }

          console.log(`[IMPORT]   ✗ NO MATCH found for intake: "${normalized}"`);
          console.log(`[IMPORT]   Available intakes:`, allIntakes.map(i => `${i.name} (id=${i.id})`).join(', '));
          return null;
        };

        const rawCourseCode = normalizeHeader(row, 'COURSE CODE')?.toString().trim();
        const rawCourseName = normalizeHeader(row, 'COURSE CODE')?.toString().trim(); // Same as code for now
        const courseMatch = findCourseId(rawCourseCode, rawCourseName);

        const rawGender = normalizeHeader(row, 'GENDER')?.toString().trim();
        const normalizedGender = normalizeGender(rawGender);

        // Handle both INTAKE (text) and INTAKE YEAR (date) columns
        const rawIntakeName = normalizeHeader(row, 'INTAKE')?.toString().trim();
        const rawIntakeYear = normalizeHeader(row, 'INTAKE YEAR')?.toString().trim();

        console.log('[IMPORT] ROW ' + rowNum + ' - Intake data:');
        console.log('[IMPORT]   rawIntakeName:', rawIntakeName);
        console.log('[IMPORT]   rawIntakeYear:', rawIntakeYear, typeof rawIntakeYear);

        let intakeMatch = null;

        // Priority 1: Use INTAKE column if available (text-based intake name)
        if (rawIntakeName) {
          intakeMatch = findIntakeId(rawIntakeName);
          console.log('[IMPORT]   Used INTAKE column:', intakeMatch ? intakeMatch.name : 'no match');
        }
        // Priority 2: Use INTAKE YEAR column if available (date-based intake year)
        else if (rawIntakeYear) {
          // Parse Excel date to get year
          let intakeYear = null;
          if (rawIntakeYear instanceof Date) {
            intakeYear = rawIntakeYear.getFullYear();
          } else if (!isNaN(Date.parse(rawIntakeYear))) {
            intakeYear = new Date(rawIntakeYear).getFullYear();
          } else if (!isNaN(parseInt(rawIntakeYear))) {
            intakeYear = parseInt(rawIntakeYear);
          }

          console.log('[IMPORT]   Extracted intake year:', intakeYear);

          // Find intake by year
          if (intakeYear) {
            intakeMatch = allIntakes.find(i => i.year === intakeYear);
            console.log('[IMPORT]   Matched intake by year:', intakeMatch ? intakeMatch.name : 'no match');
          }
        }

        console.log('[IMPORT] ROW ' + rowNum + ' - Gender: raw="' + rawGender + '" → normalized="' + normalizedGender + '"');
        console.log('[IMPORT] ROW ' + rowNum + ' - Intake: matched=' + (intakeMatch ? intakeMatch.name + ' (id=' + intakeMatch.id + ')' : 'null'));

        const studentData = {
          full_name: normalizeHeader(row, 'FULL NAME')?.toString().trim() || null,
          student_number: normalizeHeader(row, 'STUDENT NUMBER')?.toString().trim() || null,
          course_id: courseMatch ? courseMatch.id : null,
          course_name: courseMatch ? courseMatch.name : (rawCourseName?.toString().trim() || null),
          intake: intakeMatch ? intakeMatch.id : null,
          intake_year: intakeMatch ? intakeMatch.year : null,
          gender: normalizedGender,
          email: normalizeHeader(row, 'EMAIL')?.toString().trim() || null,
          password: normalizeHeader(row, 'PASSWORD')?.toString().trim() || null,
          phone: normalizeHeader(row, 'PHONE NUMBER')?.toString().trim() || null,
          national_id: normalizeHeader(row, 'NATIONAL ID')?.toString().trim() || null,
          date_of_birth: normalizeHeader(row, 'DATE OF BIRTH')?.toString().trim() || null,
          address: normalizeHeader(row, 'ADDRESS')?.toString().trim() || null,
          guardian_name: normalizeHeader(row, 'GUARDIAN NAME')?.toString().trim() || null,
          guardian_phone: normalizeHeader(row, 'GUARDIAN PHONE')?.toString().trim() || null,
          role: 'student',
          status: 'active'
        };

        console.log(`[IMPORT] ROW ${rowNum} - Student data object:`, JSON.stringify({
          student_number: studentData.student_number,
          full_name: studentData.full_name,
          gender: studentData.gender,
          intake: studentData.intake,
          intake_year: studentData.intake_year,
          course_id: studentData.course_id
        }));

        // Log data mapping for this student
        console.log(`[IMPORT] Student: ${studentData.full_name} (${studentData.student_number})`);
        console.log(`[IMPORT]   Raw gender: "${rawGender}" → Normalized: "${normalizedGender}"`);
        console.log(`[IMPORT]   Raw course: "${rawCourseCode}" → Matched: ${courseMatch ? `${courseMatch.code} (id=${courseMatch.id})` : 'NOT FOUND'}`);
        console.log(`[IMPORT]   Raw intake: "${rawIntakeName}" → Matched: ${intakeMatch ? `${intakeMatch.name} (id=${intakeMatch.id})` : 'NOT FOUND'}`);

        // Validation
        if (!studentData.full_name || !studentData.student_number) {
          errors.push({
            row: rowNum,
            student_number: studentData.student_number,
            full_name: studentData.full_name,
            field: 'required_fields',
            error: 'Missing required fields (Full Name, Student Number)'
          });
          continue;
        }

        // Check for duplicate within spreadsheet
        if (processedStudentNumbers.has(studentData.student_number)) {
          errors.push({
            row: rowNum,
            student_number: studentData.student_number,
            full_name: studentData.full_name,
            field: 'spreadsheet_duplicate',
            error: 'Duplicate student number within spreadsheet'
          });
          continue;
        }

        processedStudentNumbers.add(studentData.student_number);

        // Track match statistics
        if (courseMatch) courseMatches.matched++;
        else if (rawCourseCode) courseMatches.unmatched++;

        if (intakeMatch) intakeMatches.matched++;
        else if (rawIntakeName) intakeMatches.unmatched++;

        // Track gender statistics
        if (studentData.gender === 'male') genderStats.male++;
        else if (studentData.gender === 'female') genderStats.female++;
        else if (studentData.gender === null || studentData.gender === undefined) genderStats.null++;
        else genderStats.other++;

        // Check if student exists
        const existingStudent = await User.findByStudentNumber(studentData.student_number);

        processed.push({
          row: rowNum,
          student_number: studentData.student_number,
          full_name: studentData.full_name,
          course_id: studentData.course_id,
          course_name: studentData.course_name,
          intake: studentData.intake,
          intake_year: studentData.intake_year,
          gender: studentData.gender,
          email: studentData.email,
          phone: studentData.phone,
          password: studentData.password,
          raw_course_code: rawCourseCode,
          raw_course_name: rawCourseName,
          raw_intake: rawIntakeName,
          existing: !!existingStudent,
          course_matched: !!courseMatch,
          intake_matched: !!intakeMatch
        });
      } catch (error) {
        errors.push({
          row: rowNum,
          student_number: row['STUDENT NUMBER'] || row['Student Number'] || 'unknown',
          full_name: row['FULL NAME'] || row['Full Name'] || 'unknown',
          field: 'processing',
          error: error.message
        });
      }
    }

    // If preview mode, return preview data and create batch record
    if (preview) {
      const newStudents = processed.filter(p => !p.existing);
      const existingStudents = processed.filter(p => p.existing);
      const unmatchedCourses = processed.filter(p => !p.course_matched && p.raw_course_code);
      const unmatchedIntakes = processed.filter(p => !p.intake_matched && p.raw_intake);

      // Log unmatched courses and intakes
      if (unmatchedCourses.length > 0) {
        console.log(`[IMPORT] ${unmatchedCourses.length} students with unmatched courses:`);
        unmatchedCourses.slice(0, 5).forEach(p => {
          console.log(`[IMPORT]   ${p.student_number} - "${p.raw_course_code}"`);
        });
      }
      if (unmatchedIntakes.length > 0) {
        console.log(`[IMPORT] ${unmatchedIntakes.length} students with unmatched intakes:`);
        unmatchedIntakes.slice(0, 5).forEach(p => {
          console.log(`[IMPORT]   ${p.student_number} - "${p.raw_intake}"`);
        });
      }

      // Create import batch record for tracking
      const batch = await ImportBatch.create({
        filename: req.file.originalname,
        uploaded_by: req.user.id,
        total_rows: processed.length,
        notes: `Preview mode - ${newStudents.length} new, ${existingStudents.length} existing students`
      });

      console.log(`[IMPORT] Created batch ${batch.id} for preview`);

      return res.json({
        preview: true,
        batch_id: batch.id,
        worksheet: selectedSheetName,
        detected_headers: selectedHeaders,
        total_rows: processed.length,
        valid_rows: processed.length,
        new_students: newStudents.length,
        existing_students: existingStudents.length,
        duplicate_spreadsheet_rows: errors.filter(e => e.field === 'spreadsheet_duplicate').length,
        skipped_unmatched_courses: unmatchedCourses.length,
        skipped_unmatched_intakes: unmatchedIntakes.length,
        failed: errors.length,
        course_matched: courseMatches.matched,
        course_unmatched: courseMatches.unmatched,
        intake_matched: intakeMatches.matched,
        intake_unmatched: intakeMatches.unmatched,
        gender: genderStats,
        sample_new: newStudents.slice(0, 5),
        sample_existing: existingStudents.slice(0, 5),
        sample_errors: errors.slice(0, 5),
        diagnostics: worksheetDiagnostics
      });
    }

    // Actual import - perform UPSERT
    const batchId = req.body.batch_id; // Get batch_id from request if provided
    let batch = null;

    if (batchId) {
      batch = await ImportBatch.findById(batchId);
      if (batch) {
        await ImportBatch.update(batchId, { status: 'processing' });
      }
    } else {
      // Create new batch for actual import
      batch = await ImportBatch.create({
        filename: req.file.originalname,
        uploaded_by: req.user.id,
        total_rows: processed.length,
        notes: 'Actual import operation'
      });
    }

    console.log(`[IMPORT] Using batch ${batch.id} for actual import`);

    const created = [];
    const updated = [];
    const skippedUnmatchedCourses = [];
    const skippedUnmatchedIntakes = [];

    for (const student of processed) {
      try {
        // Reject unmatched courses (when course code/name is provided and doesn't match)
        if (!student.course_matched && (student.raw_course_code || student.raw_course_name)) {
          const receivedValue = student.raw_course_code || student.raw_course_name;
          errors.push({
            row: student.row,
            student_number: student.student_number,
            full_name: student.full_name,
            field: 'course',
            error: `Course "${receivedValue}" not found in database. Available codes: ${allCourses.map(c => c.course_code).filter(c => c).join(', ')}`
          });
          continue;
        }

        // Reject unmatched intakes
        if (!student.intake_matched && student.raw_intake) {
          skippedUnmatchedIntakes.push({
            row: student.row,
            student_number: student.student_number,
            full_name: student.full_name,
            field: 'intake',
            error: `Intake "${student.raw_intake}" not found in database`
          });
          continue;
        }

        // Prepare student data
        const studentData = {
          full_name: student.full_name,
          student_number: student.student_number,
          course_id: student.course_id,
          intake: student.intake,
          intake_year: student.intake_year,
          email: student.email,
          phone: student.phone,
          gender: student.gender,
          national_id: student.national_id,
          date_of_birth: student.date_of_birth,
          address: student.address,
          guardian_name: student.guardian_name,
          guardian_phone: student.guardian_phone,
          role: 'student',
          status: 'active'
        };

        console.log(`[IMPORT] ACTUAL IMPORT ROW ${student.row} - Student data before User.upsert:`, JSON.stringify({
          student_number: studentData.student_number,
          full_name: studentData.full_name,
          gender: studentData.gender,
          intake: studentData.intake,
          intake_year: studentData.intake_year,
          course_id: studentData.course_id
        }));

        // Handle password from Excel - pass the plaintext password, User model will hash it
        if (student.password && student.password.trim() !== '') {
          // Validate password
          if (student.password.length < 6) {
            errors.push({
              row: student.row,
              student_number: student.student_number,
              full_name: student.full_name,
              field: 'password',
              error: 'Password must be at least 6 characters'
            });
            continue;
          }
          // Pass the plaintext password - User model will hash it and set must_change_password
          studentData.password = student.password.trim();
          console.log(`[IMPORT] Student ${student.student_number}: Password provided from Excel`);
        } else {
          console.log(`[IMPORT] Student ${student.student_number}: No password provided, will generate random password`);
        }
        // If no password provided, the User model will generate a secure random password
        // and set must_change_password = true automatically

        // UPSERT using student number
        console.log(`[IMPORT] Calling upsertByStudentNumber for ${student.student_number}`);
        console.log(`[IMPORT]   studentData:`, JSON.stringify({
          full_name: studentData.full_name,
          student_number: studentData.student_number,
          gender: studentData.gender,
          course_id: studentData.course_id,
          intake: studentData.intake,
          intake_year: studentData.intake_year
        }));
        const result = await User.upsertByStudentNumber(studentData);
        console.log(`[IMPORT]   upsert result:`, JSON.stringify({
          action: result.action,
          id: result.id,
          gender: result.gender,
          course_id: result.course_id,
          intake: result.intake,
          intake_year: result.intake_year
        }));

        // Create batch detail record
        await ImportBatchDetail.create({
          batch_id: batch.id,
          student_id: result.id,
          student_number: student.student_number,
          action: result.action,
          row_number: student.row
        });

        if (result.action === 'created') {
          created.push({
            id: result.id,
            student_number: student.student_number,
            full_name: student.full_name,
            course_id: student.course_id
          });
        } else {
          updated.push({
            id: result.id,
            student_number: student.student_number,
            full_name: student.full_name,
            course_id: student.course_id
          });
        }
      } catch (error) {
        errors.push({
          row: student.row,
          student_number: student.student_number,
          full_name: student.full_name,
          field: 'database',
          error: error.message
        });
      }
    }

    console.log(`[IMPORT] Complete: ${created.length} created, ${updated.length} updated, ${skippedUnmatchedCourses.length} unmatched courses, ${skippedUnmatchedIntakes.length} unmatched intakes, ${errors.length} errors`);

    // Update batch status to completed
    if (batch) {
      await ImportBatch.update(batch.id, {
        status: 'completed',
        successful_rows: created.length + updated.length,
        failed_rows: errors.length,
        completed_at: new Date().toISOString()
      });

      // Set this batch as current
      await ImportBatch.setCurrent(batch.id);
    }

    res.status(201).json({
      message: `Import complete: ${created.length} created, ${updated.length} updated`,
      batch_id: batch ? batch.id : null,
      total_rows: processed.length,
      created: created.length,
      updated: updated.length,
      unchanged: 0,
      skipped: skippedUnmatchedCourses.length + skippedUnmatchedIntakes.length,
      failed: errors.length,
      course_matched: processed.filter(p => p.course_matched).length,
      course_unmatched: processed.filter(p => !p.course_matched && p.raw_course_code).length,
      intake_matched: processed.filter(p => p.intake_matched).length,
      intake_unmatched: processed.filter(p => !p.intake_matched && p.raw_intake).length,
      duplicate_spreadsheet_rows: errors.filter(e => e.field === 'spreadsheet_duplicate').length,
      created_students: created,
      updated_students: updated,
      skipped_unmatched_courses: skippedUnmatchedCourses.length,
      skipped_unmatched_intakes: skippedUnmatchedIntakes.length,
      errors: [...errors, ...skippedUnmatchedCourses, ...skippedUnmatchedIntakes]
    });
  } catch (error) {
    console.error('Import students error:', error);
    console.error('Import students error stack:', error.stack);
    console.error('Import students error details:', {
      message: error.message,
      code: error.code,
      details: error.details,
      hint: error.hint
    });
    res.status(500).json({ error: 'Failed to import students', details: error.message });
  }
};

// Upload profile picture (admin or self)
const uploadProfilePicture = async (req, res) => {
  try {
    // For self-upload, use authenticated user's ID
    const id = req.params.id || req.user.id;

    console.log('Profile picture upload request:', { id, userId: req.user.id, role: req.user.role, file: req.file ? req.file.originalname : 'No file' });

    // Security check: non-admin users can only upload their own picture
    if (req.user.role !== 'admin' && req.user.id !== parseInt(id)) {
      return res.status(403).json({ error: 'You can only upload your own profile picture' });
    }

    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }

    const supabase = require('../config/supabase');

    // Get file from memory storage
    const fileBuffer = req.file.buffer;
    const fileName = `profile_${id}_${Date.now()}${req.file.originalname.substring(req.file.originalname.lastIndexOf('.'))}`;

    console.log('Uploading to Supabase Storage:', { fileName, size: fileBuffer.length, mimetype: req.file.mimetype });

    // Upload to Supabase Storage
    const { data: uploadData, error: uploadError } = await supabase.storage
      .from('profile-pictures')
      .upload(fileName, fileBuffer, {
        contentType: req.file.mimetype,
        upsert: true
      });

    if (uploadError) {
      console.error('Supabase upload error details:', uploadError);
      return res.status(500).json({ error: 'Failed to upload to storage', details: uploadError.message });
    }

    console.log('Upload successful:', uploadData);

    // Get public URL
    const { data: { publicUrl } } = supabase.storage
      .from('profile-pictures')
      .getPublicUrl(fileName);

    console.log('Public URL:', publicUrl);

    // Update user with profile picture URL
    const result = await User.update(id, { profile_picture_url: publicUrl });

    if (!result) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.json({
      message: 'Profile picture uploaded successfully',
      profile_picture_url: publicUrl
    });
  } catch (error) {
    console.error('Upload profile picture error:', error);
    res.status(500).json({ error: 'Failed to upload profile picture', details: error.message });
  }
};

// Delete profile picture (admin or self)
const deleteProfilePicture = async (req, res) => {
  try {
    // For self-delete, use authenticated user's ID
    const id = req.params.id || req.user.id;

    // Security check: non-admin users can only delete their own picture
    if (req.user.role !== 'admin' && req.user.id !== parseInt(id)) {
      return res.status(403).json({ error: 'You can only delete your own profile picture' });
    }

    const supabase = require('../config/supabase');

    // Get current user data to find the profile picture URL
    const user = await User.findById(id);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Delete the file from Supabase Storage if it exists
    if (user.profile_picture_url) {
      const fileName = user.profile_picture_url.split('/').pop();
      const { error: deleteError } = await supabase.storage
        .from('profile-pictures')
        .remove([fileName]);

      if (deleteError) {
        console.error('Supabase delete error:', deleteError);
      }
    }

    // Update user to remove profile picture URL
    const result = await User.update(id, { profile_picture_url: null });

    res.json({
      message: 'Profile picture deleted successfully'
    });
  } catch (error) {
    console.error('Delete profile picture error:', error);
    res.status(500).json({ error: 'Failed to delete profile picture' });
  }
};

// Export students to Excel (admin only)
const exportStudentsToExcel = async (req, res) => {
  try {
    const students = await User.findAll({ role: 'student' });

    if (!students || students.length === 0) {
      return res.status(404).json({ error: 'No students to export' });
    }

    // Prepare export data with safe fields only - NO PASSWORDS
    const exportData = students.map(student => ({
      'Full Name': student.full_name || '',
      'Student Number': student.student_number || '',
      'Email': student.email || '',
      'Phone': student.phone || '',
      'Gender': student.gender || '',
      'National ID': student.national_id || '',
      'Date of Birth': student.date_of_birth || '',
      'Address': student.address || '',
      'Guardian Name': student.guardian_name || '',
      'Guardian Phone': student.guardian_phone || '',
      'Intake Year': student.intake_year || '',
      'Course ID': student.course_id || ''
    }));

    // Create Excel workbook
    const workbook = XLSX.utils.book_new();
    const worksheet = XLSX.utils.json_to_sheet(exportData);
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Students');

    // Generate buffer
    const excelBuffer = XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' });

    // Set headers for download
    const filename = `students_export_${new Date().toISOString().split('T')[0]}.xlsx`;
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);

    res.send(excelBuffer);
  } catch (error) {
    console.error('Export students error:', error);
    res.status(500).json({ error: 'Failed to export students' });
  }
};

module.exports = {
  // registerStudent - REMOVED - Admin only
  createStudent,
  getAllStudents,
  getStudentById,
  updateStudent,
  deleteStudent,
  suspendStudent,
  activateStudent,
  resetPassword,
  resetLecturerPassword,
  assignCourse,
  getStudentStatistics,
  createLecturer,
  getAllLecturers,
  getLecturerById,
  updateLecturer,
  deleteLecturer,
  importStudentsFromExcel,
  uploadProfilePicture,
  deleteProfilePicture,
  exportStudentsToExcel,
  searchStudents
};
