const bcrypt = require('bcryptjs');
const User = require('../models/User');
const Fee = require('../models/Fee');
const XLSX = require('xlsx');

// Public student registration
const registerStudent = async (req, res) => {
  try {
    const {
      full_name, email, student_number, password, phone, gender,
      national_id, date_of_birth, address, guardian_name, guardian_phone,
      intake_year
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

    const studentData = {
      full_name, email: trimmedEmail, student_number: trimmedStudentNumber, 
      password: hashedPassword, role: 'student',
      phone, gender, national_id, date_of_birth, address, guardian_name,
      guardian_phone, intake_year, status: 'active'
    };

    const result = await User.create(studentData);

    console.log('Student registered successfully:', { id: result.id, student_number: trimmedStudentNumber });

    res.status(201).json({
      message: 'Student registered successfully',
      id: result.id,
      student_number: trimmedStudentNumber
    });
  } catch (error) {
    console.error('Register student error:', error);
    if (error.message.includes('UNIQUE')) {
      return res.status(400).json({ error: 'Student number or email already exists' });
    }
    res.status(500).json({ error: 'Failed to register student' });
  }
};

// Create new student
const createStudent = async (req, res) => {
  try {
    const {
      full_name, email, student_number, password, phone, gender,
      national_id, date_of_birth, address, guardian_name, guardian_phone,
      intake_year, course_id
    } = req.body;

    // Validation
    if (!full_name || !student_number || !password) {
      return res.status(400).json({ error: 'Full name, student number, and password are required' });
    }

    if (password.length < 6) {
      return res.status(400).json({ error: 'Password must be at least 6 characters' });
    }

    // Hash password
    const hashedPassword = bcrypt.hashSync(password, 10);

    const studentData = {
      full_name, email, student_number, password: hashedPassword, role: 'student',
      phone, gender, national_id, date_of_birth, address, guardian_name,
      guardian_phone, intake_year, course_id, status: 'active'
    };

    const result = await User.create(studentData);

    res.status(201).json({
      message: 'Student created successfully',
      id: result.id
    });
  } catch (error) {
    console.error('Create student error:', error);
    if (error.message.includes('UNIQUE')) {
      return res.status(400).json({ error: 'Student number or email already exists' });
    }
    res.status(500).json({ error: 'Failed to create student' });
  }
};

// Get all students with filters
const getAllStudents = async (req, res) => {
  try {
    const {
      role, status, course_id, search, limit = 50, offset = 0
    } = req.query;

    const filters = {
      role: role || 'student',
      status,
      course_id,
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
      intake_year, status, course_id
    } = req.body;

    // Get current student data
    const currentStudent = await User.findById(id);
    if (!currentStudent) {
      return res.status(404).json({ error: 'Student not found' });
    }

    const updateData = {
      full_name, email, student_number, phone, gender, national_id,
      date_of_birth, address, guardian_name, guardian_phone,
      intake_year, status, course_id
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

    if (!new_password || new_password.length < 6) {
      return res.status(400).json({ error: 'New password must be at least 6 characters' });
    }

    const hashedPassword = bcrypt.hashSync(new_password, 10);

    await User.updatePassword(id, hashedPassword);

    res.json({ message: 'Password reset successfully' });
  } catch (error) {
    console.error('Reset password error:', error);
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
    const sheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[sheetName];
    const data = XLSX.utils.sheet_to_json(worksheet);

    if (!data || data.length === 0) {
      return res.status(400).json({ error: 'No data found in Excel file' });
    }

    const importedStudents = [];
    const errors = [];

    for (const row of data) {
      try {
        // Map Excel columns to database fields
        const studentData = {
          full_name: row['Full Name'] || row['full_name'] || row['Name'],
          student_number: row['Student Number'] || row['student_number'],
          email: row['Email'] || row['email'],
          password: row['Password'] || row['password'] || 'password123',
          phone: row['Phone'] || row['phone'],
          gender: row['Gender'] || row['gender'],
          national_id: row['National ID'] || row['national_id'],
          date_of_birth: row['Date of Birth'] || row['date_of_birth'],
          address: row['Address'] || row['address'],
          guardian_name: row['Guardian Name'] || row['guardian_name'],
          guardian_phone: row['Guardian Phone'] || row['guardian_phone'],
          intake_year: row['Intake Year'] || row['intake_year'],
          course_id: row['Course ID'] || row['course_id'],
          role: 'student',
          status: 'active'
        };

        // Validation
        if (!studentData.full_name || !studentData.student_number) {
          errors.push({ row, error: 'Missing required fields (Full Name, Student Number)' });
          continue;
        }

        // Check if student number already exists
        const existingStudent = await User.findByStudentNumber(studentData.student_number);
        if (existingStudent) {
          errors.push({ row, error: 'Student number already exists' });
          continue;
        }

        // Hash password
        const hashedPassword = bcrypt.hashSync(studentData.password, 10);
        studentData.password = hashedPassword;

        // Create student
        const result = await User.create(studentData);
        importedStudents.push({
          id: result.id,
          student_number: studentData.student_number,
          full_name: studentData.full_name
        });
      } catch (error) {
        errors.push({ row, error: error.message });
      }
    }

    res.status(201).json({
      message: `Imported ${importedStudents.length} students successfully`,
      imported: importedStudents,
      errors: errors
    });
  } catch (error) {
    console.error('Import students error:', error);
    res.status(500).json({ error: 'Failed to import students' });
  }
};

// Upload profile picture (admin only)
const uploadProfilePicture = async (req, res) => {
  try {
    const { id } = req.params;

    console.log('Profile picture upload request:', { id, file: req.file ? req.file.originalname : 'No file' });

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
      return res.status(404).json({ error: 'Student not found' });
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

// Delete profile picture (admin only)
const deleteProfilePicture = async (req, res) => {
  try {
    const { id } = req.params;
    const supabase = require('../config/supabase');

    // Get current user data to find the profile picture URL
    const user = await User.findById(id);
    if (!user) {
      return res.status(404).json({ error: 'Student not found' });
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
  registerStudent,
  createStudent,
  getAllStudents,
  getStudentById,
  updateStudent,
  deleteStudent,
  suspendStudent,
  activateStudent,
  resetPassword,
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
