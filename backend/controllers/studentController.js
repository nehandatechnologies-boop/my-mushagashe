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
      intake_year, course_id
    } = req.body;

    // Trim whitespace from inputs
    const trimmedStudentNumber = student_number?.trim();
    const trimmedEmail = email?.trim();
    const trimmedPassword = password?.trim();

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
      intake_year,
      course_id,
      status: 'active'
    };

    const result = await User.create(studentData);

    console.log('Student created successfully:', { id: result.id, student_number: trimmedStudentNumber });

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

    // Get current student data
    const currentStudent = await User.findById(id);
    if (!currentStudent) {
      return res.status(404).json({ error: 'Student not found' });
    }

    const updateData = {
      full_name, email, student_number, phone, gender, national_id,
      date_of_birth, address, guardian_name, guardian_phone,
      intake, intake_year, status, course_id
    };

    // Remove undefined values
    Object.keys(updateData).forEach(key => {
      if (updateData[key] === undefined) {
        delete updateData[key];
      }
    });

    const updatedStudent = await User.update(id, updateData);

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
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }

    // Parse Excel file
    const workbook = XLSX.read(req.file.buffer, { type: 'buffer' });

    // Detect the correct worksheet with student import headers
    console.log(`[IMPORT] Available worksheets: ${workbook.SheetNames.join(', ')}`);

    const keyHeaders = ['FULL NAME', 'STUDENT NUMBER', 'COURSE'];
    let selectedSheetName = null;
    let selectedWorksheet = null;

    for (const sheetName of workbook.SheetNames) {
      const worksheet = workbook.Sheets[sheetName];
      const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1 });

      if (!jsonData || jsonData.length === 0) continue;

      // Get the first row as potential headers
      const firstRow = jsonData[0];
      if (!firstRow) continue;

      // Check if this row contains our key headers (case-insensitive)
      const firstRowUpper = firstRow.map(h => String(h || '').toUpperCase().trim());
      const hasKeyHeaders = keyHeaders.every(kh => firstRowUpper.includes(kh.toUpperCase()));

      if (hasKeyHeaders) {
        selectedSheetName = sheetName;
        selectedWorksheet = worksheet;
        console.log(`[IMPORT] Selected worksheet: ${sheetName}`);
        console.log(`[IMPORT] Detected headers: ${firstRow.join(', ')}`);
        break;
      }
    }

    if (!selectedWorksheet) {
      return res.status(400).json({ error: 'No valid student import worksheet found. Please ensure your Excel file contains headers: FULL NAME, STUDENT NUMBER, COURSE' });
    }

    // Parse the selected worksheet
    const data = XLSX.utils.sheet_to_json(selectedWorksheet);

    if (!data || data.length === 0) {
      return res.status(400).json({ error: 'No data found in selected worksheet' });
    }

    console.log(`[IMPORT] Processing ${data.length} rows from worksheet: ${selectedSheetName}`);

    const preview = req.body.preview === 'true';

    // Load all courses for matching
    const Course = require('../models/Course');
    const allCourses = await Course.findAll({});

    // Process rows for preview or actual import
    const processed = [];
    const errors = [];
    const processedStudentNumbers = new Set();

    for (let i = 0; i < data.length; i++) {
      const row = data[i];
      const rowNum = i + 2;

      try {
        // Skip completely empty rows
        const hasAnyData = Object.values(row).some(val => val !== null && val !== undefined && val !== '');
        if (!hasAnyData) {
          continue;
        }

        // Normalize headers
        const normalizeHeader = (row, possibleHeaders) => {
          for (const header of possibleHeaders) {
            if (row[header] !== undefined && row[header] !== null && row[header] !== '') {
              return row[header];
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

        // Find course
        const findCourseId = (courseName) => {
          if (!courseName) return null;
          const normalized = courseName.toString().trim().toLowerCase();

          const byCode = allCourses.find(c => 
            c.course_code && c.course_code.toLowerCase() === normalized
          );
          if (byCode) return { id: byCode.id, name: byCode.course_name, matchedBy: 'code' };

          const byName = allCourses.find(c => 
            c.course_name && c.course_name.toLowerCase() === normalized
          );
          if (byName) return { id: byName.id, name: byName.course_name, matchedBy: 'name' };

          const byPartial = allCourses.find(c => 
            c.course_name && c.course_name.toLowerCase().includes(normalized) ||
            normalized.includes(c.course_name.toLowerCase())
          );
          if (byPartial) return { id: byPartial.id, name: byPartial.course_name, matchedBy: 'partial' };

          return null;
        };

        const rawCourse = normalizeHeader(row, ['COURSE', 'Course', 'course', 'PROGRAMME', 'Programme', 'programme'])?.trim();
        const courseMatch = findCourseId(rawCourse);

        const studentData = {
          full_name: normalizeHeader(row, ['FULL NAME', 'Full Name', 'full_name', 'Full_Name', 'Name', 'NAME'])?.trim(),
          student_number: normalizeHeader(row, ['STUDENT NUMBER', 'Student Number', 'student_number', 'Student_Number', 'StudentNo', 'Student No.', 'STUDENT NO'])?.trim(),
          course_id: courseMatch ? courseMatch.id : null,
          course_name: courseMatch ? courseMatch.name : rawCourse,
          email: normalizeHeader(row, ['EMAIL', 'Email', 'email'])?.trim(),
          password: normalizeHeader(row, ['PASSWORD', 'Password', 'password'])?.trim(),
          phone: normalizeHeader(row, ['PHONE NUMBER', 'Phone Number', 'phone', 'Phone'])?.trim(),
          gender: normalizeGender(normalizeHeader(row, ['GENDER', 'Gender', 'gender', 'SEX', 'Sex', 'sex'])),
          national_id: normalizeHeader(row, ['NATIONAL ID', 'National ID', 'national_id'])?.trim(),
          date_of_birth: normalizeHeader(row, ['DATE OF BIRTH', 'Date of Birth', 'date_of_birth'])?.trim(),
          address: normalizeHeader(row, ['ADDRESS', 'Address', 'address'])?.trim(),
          guardian_name: normalizeHeader(row, ['GUARDIAN NAME', 'Guardian Name', 'guardian_name'])?.trim(),
          guardian_phone: normalizeHeader(row, ['GUARDIAN PHONE', 'Guardian Phone', 'guardian_phone'])?.trim(),
          intake_year: normalizeHeader(row, ['INTAKE YEAR', 'Intake Year', 'intake_year'])?.trim(),
          role: 'student',
          status: 'active'
        };

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

        // Check if student exists
        const existingStudent = await User.findByStudentNumber(studentData.student_number);

        processed.push({
          row: rowNum,
          student_number: studentData.student_number,
          full_name: studentData.full_name,
          course_id: studentData.course_id,
          course_name: studentData.course_name,
          gender: studentData.gender,
          email: studentData.email,
          phone: studentData.phone,
          existing: !!existingStudent,
          course_matched: !!courseMatch,
          raw_course: rawCourse
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

    // If preview mode, return preview data
    if (preview) {
      const newStudents = processed.filter(p => !p.existing);
      const existingStudents = processed.filter(p => p.existing);
      const unmatchedCourses = processed.filter(p => !p.course_matched && p.raw_course);

      return res.json({
        preview: true,
        total_rows: processed.length,
        new_students: newStudents.length,
        existing_students: existingStudents.length,
        unmatched_courses: unmatchedCourses.length,
        errors: errors.length,
        sample_new: newStudents.slice(0, 5),
        sample_existing: existingStudents.slice(0, 5),
        sample_unmatched: unmatchedCourses.slice(0, 5),
        sample_errors: errors.slice(0, 5)
      });
    }

    // Actual import - perform UPSERT
    const created = [];
    const updated = [];
    const skippedUnmatchedCourses = [];

    for (const student of processed) {
      try {
        // Skip unmatched courses
        if (!student.course_matched && student.raw_course) {
          skippedUnmatchedCourses.push({
            row: student.row,
            student_number: student.student_number,
            full_name: student.full_name,
            field: 'course',
            error: `Course "${student.raw_course}" not found in database`
          });
          continue;
        }

        // Prepare student data - password will be generated automatically for new students
        const studentData = {
          full_name: student.full_name,
          student_number: student.student_number,
          course_id: student.course_id,
          email: student.email,
          phone: student.phone,
          gender: student.gender,
          national_id: student.national_id,
          date_of_birth: student.date_of_birth,
          address: student.address,
          guardian_name: student.guardian_name,
          guardian_phone: student.guardian_phone,
          intake_year: student.intake_year,
          role: 'student',
          status: 'active'
        };

        // Only include password if it's provided in the Excel
        // Otherwise, the User model will generate a secure random password for new students
        if (student.password) {
          studentData.password = bcrypt.hashSync(student.password, 10);
        }

        // UPSERT using student number
        const result = await User.upsertByStudentNumber(studentData);

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

    console.log(`[IMPORT] Complete: ${created.length} created, ${updated.length} updated, ${skippedUnmatchedCourses.length} unmatched courses, ${errors.length} errors`);

    res.status(201).json({
      message: `Import complete: ${created.length} created, ${updated.length} updated`,
      created: created,
      updated: updated,
      skipped_unmatched_courses: skippedUnmatchedCourses.length,
      errors: [...errors, ...skippedUnmatchedCourses]
    });
  } catch (error) {
    console.error('Import students error:', error);
    res.status(500).json({ error: 'Failed to import students' });
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

    // Prepare export data with safe fields only
    const exportData = students.map(student => ({
      'Student Number': student.student_number || '',
      'Full Name': student.full_name || '',
      'Email': student.email || '',
      'Phone': student.phone || '',
      'Gender': student.gender || '',
      'National ID': student.national_id || '',
      'Date of Birth': student.date_of_birth || '',
      'Address': student.address || '',
      'Guardian Name': student.guardian_name || '',
      'Guardian Phone': student.guardian_phone || '',
      'Intake Year': student.intake_year || '',
      'Course': student.course_name || '',
      'Course Code': student.course_code || '',
      'Status': student.status || ''
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
  exportStudentsToExcel
};
