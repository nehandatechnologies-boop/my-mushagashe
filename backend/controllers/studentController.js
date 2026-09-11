const bcrypt = require('bcryptjs');
const User = require('../models/User');
const Fee = require('../models/Fee');
const XLSX = require('xlsx');
const { generateToken, sendVerificationEmail } = require('../config/email');
const { supabaseAdmin } = require('../config/supabaseAuth');

// Public student registration - REMOVED - Admin only
// const registerStudent = async (req, res) => { ... };

// Create new student (admin only) - Modified to use Supabase Admin API
const createStudent = async (req, res) => {
  let createdSupabaseUserId = null;

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

    // Check if Supabase Admin is available
    if (!supabaseAdmin) {
      return res.status(500).json({ error: 'Admin operations not available. Service role key not configured.' });
    }

    // Create Supabase Auth user using admin API (bypasses email confirmation)
    const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
      email: trimmedEmail || `${trimmedStudentNumber}@mushagashe.local`,
      password: trimmedPassword,
      email_confirm: true, // Auto-confirm for admin-created users
      user_metadata: {
        full_name: full_name,
        student_number: trimmedStudentNumber,
        role: 'student'
      }
    });

    if (authError) {
      console.error('Supabase admin auth error:', authError);
      return res.status(400).json({ error: authError.message || 'Failed to create authentication account' });
    }

    createdSupabaseUserId = authData.user.id;
    console.log('Supabase Auth user created successfully, ID:', createdSupabaseUserId);

    // Create custom users table entry with profile data
    const studentData = {
      full_name,
      email: trimmedEmail,
      student_number: trimmedStudentNumber,
      password: null, // Password managed by Supabase Auth
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
      status: 'active', // Admin-created accounts are active
      auth_type: 'supabase',
      supabase_user_id: createdSupabaseUserId
    };

    const result = await User.create(studentData);

    console.log('Student created successfully:', { id: result.id, student_number: trimmedStudentNumber });

    res.status(201).json({
      message: 'Student created successfully',
      id: result.id
    });
  } catch (error) {
    console.error('Create student error:', error);
    
    // ROLLBACK: Delete Supabase Auth user if database profile creation failed
    if (createdSupabaseUserId && supabaseAdmin) {
      try {
        console.log('Rolling back: Deleting Supabase Auth user:', createdSupabaseUserId);
        await supabaseAdmin.auth.admin.deleteUser(createdSupabaseUserId);
        console.log('Rollback successful: Supabase Auth user deleted');
      } catch (rollbackError) {
        console.error('Rollback failed: Could not delete Supabase Auth user:', rollbackError);
      }
    }

    if (error.message.includes('UNIQUE') || error.code === '23505') {
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
    
    // Delete dependent records first to avoid foreign key constraint violations
    const supabase = require('../config/supabase');
    
    // Delete fees associated with this student
    const { error: feesError } = await supabase
      .from('fees')
      .delete()
      .eq('user_id', id);
    
    if (feesError) {
      console.error('Error deleting fees:', feesError);
    }
    
    // Delete results associated with this student
    const { error: resultsError } = await supabase
      .from('results')
      .delete()
      .eq('user_id', id);
    
    if (resultsError) {
      console.error('Error deleting results:', resultsError);
    }
    
    // Delete announcements created by this student (if any)
    const { error: announcementsError } = await supabase
      .from('announcements')
      .delete()
      .eq('created_by', id);
    
    if (announcementsError) {
      console.error('Error deleting announcements:', announcementsError);
    }
    
    // Delete audit logs for this student
    const { error: auditLogsError } = await supabase
      .from('audit_logs')
      .delete()
      .eq('user_id', id);
    
    if (auditLogsError) {
      console.error('Error deleting audit logs:', auditLogsError);
    }

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
      phone, gender, course_id, status: 'active', email_verified: false
    };

    // Generate verification token if email provided
    if (email) {
      const { generateToken: generateEmailToken, sendVerificationEmail } = require('../config/email');
      const verificationToken = generateEmailToken();
      const verificationTokenExpires = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours
      
      lecturerData.verification_token = verificationToken;
      lecturerData.verification_token_expires = verificationTokenExpires;

      const result = await User.create(lecturerData);

      // Send verification email
      try {
        await sendVerificationEmail(email, verificationToken);
      } catch (emailError) {
        console.error('Failed to send verification email:', emailError);
        // Continue with creation even if email fails
      }

      res.status(201).json({
        message: 'Lecturer created successfully. A verification email has been sent to the provided email address.',
        id: result.id
      });
    } else {
      const result = await User.create(lecturerData);

      res.status(201).json({
        message: 'Lecturer created successfully',
        id: result.id
      });
    }
  } catch (error) {
    console.error('Create lecturer error:', error);
    if (error.message.includes('UNIQUE')) {
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
    if (error.message.includes('UNIQUE')) {
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

    const importedStudents = [];
    const errors = [];
    const skippedExisting = [];
    const skippedDuplicates = [];
    const processedStudentNumbers = new Set();

    for (let i = 0; i < data.length; i++) {
      const row = data[i];
      const rowNum = i + 2; // Excel rows are 1-indexed, plus header row

      try {
        // Skip completely empty rows
        const hasAnyData = Object.values(row).some(val => val !== null && val !== undefined && val !== '');
        if (!hasAnyData) {
          continue;
        }

        // Normalize headers: map various cases to consistent field names
        const normalizeHeader = (row, possibleHeaders) => {
          for (const header of possibleHeaders) {
            if (row[header] !== undefined && row[header] !== null && row[header] !== '') {
              return row[header];
            }
          }
          return null;
        };

        // Map Excel columns to database fields with case-insensitive matching
        const studentData = {
          full_name: normalizeHeader(row, ['FULL NAME', 'Full Name', 'full_name', 'Full_Name', 'Name', 'NAME'])?.trim(),
          student_number: normalizeHeader(row, ['STUDENT NUMBER', 'Student Number', 'student_number', 'Student_Number', 'StudentNo', 'Student No.', 'STUDENT NO'])?.trim(),
          course: normalizeHeader(row, ['COURSE', 'Course', 'course'])?.trim(),
          email: normalizeHeader(row, ['EMAIL', 'Email', 'email'])?.trim(),
          password: normalizeHeader(row, ['PASSWORD', 'Password', 'password'])?.trim(),
          phone: normalizeHeader(row, ['PHONE NUMBER', 'Phone Number', 'phone', 'Phone'])?.trim(),
          gender: normalizeHeader(row, ['GENDER', 'Gender', 'gender'])?.trim(),
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

        // Check for duplicate within this spreadsheet
        if (processedStudentNumbers.has(studentData.student_number)) {
          skippedDuplicates.push({
            row: rowNum,
            student_number: studentData.student_number,
            full_name: studentData.full_name,
            field: 'spreadsheet_duplicate',
            error: 'Duplicate student number within spreadsheet'
          });
          continue;
        }

        // Mark this student number as processed
        processedStudentNumbers.add(studentData.student_number);

        // Check if student number already exists in database
        const existingStudent = await User.findByStudentNumber(studentData.student_number);
        if (existingStudent) {
          skippedExisting.push({
            row: rowNum,
            student_number: studentData.student_number,
            full_name: studentData.full_name,
            field: 'existing_record',
            error: 'Student number already exists in database'
          });
          continue;
        }

        // Check if email already exists (if provided)
        if (studentData.email) {
          const existingEmail = await User.findByEmail(studentData.email);
          if (existingEmail) {
            errors.push({
              row: rowNum,
              student_number: studentData.student_number,
              full_name: studentData.full_name,
              field: 'email',
              error: 'Email already exists'
            });
            continue;
          }
        }

        // Hash password
        const hashedPassword = bcrypt.hashSync(studentData.password || 'password123', 10);
        studentData.password = hashedPassword;

        // Create student
        const result = await User.create(studentData);
        importedStudents.push({
          id: result.id,
          student_number: studentData.student_number,
          full_name: studentData.full_name
        });
      } catch (error) {
        // Extract student info from raw row for error reporting
        const normalizeHeader = (row, possibleHeaders) => {
          for (const header of possibleHeaders) {
            if (row[header] !== undefined && row[header] !== null && row[header] !== '') {
              return row[header];
            }
          }
          return null;
        };

        const errorStudentNumber = normalizeHeader(row, ['STUDENT NUMBER', 'Student Number', 'student_number', 'Student_Number', 'StudentNo', 'Student No.', 'STUDENT NO'])?.trim();
        const errorFullName = normalizeHeader(row, ['FULL NAME', 'Full Name', 'full_name', 'Full_Name', 'Name', 'NAME'])?.trim();

        errors.push({
          row: rowNum,
          student_number: errorStudentNumber,
          full_name: errorFullName,
          field: 'database',
          error: error.message
        });
      }
    }

    console.log(`[IMPORT] Complete: ${importedStudents.length} imported, ${skippedExisting.length} existing, ${skippedDuplicates.length} spreadsheet duplicates, ${errors.length} errors`);

    res.status(201).json({
      message: `Imported ${importedStudents.length} students successfully`,
      imported: importedStudents,
      skipped_existing: skippedExisting.length,
      skipped_duplicates: skippedDuplicates.length,
      errors: errors
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
  deleteProfilePicture
};
