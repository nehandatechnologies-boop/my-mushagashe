const bcrypt = require('bcryptjs');
const User = require('../models/User');
const Fee = require('../models/Fee');
const XLSX = require('xlsx');

// Public student registration
const registerStudent = (req, res) => {
  try {
    const {
      full_name, email, student_number, password, phone, gender,
      national_id, date_of_birth, address, guardian_name, guardian_phone,
      intake_year
    } = req.body;

    // Validation
    if (!full_name || !student_number || !password) {
      return res.status(400).json({ error: 'Full name, student number, and password are required' });
    }

    if (password.length < 6) {
      return res.status(400).json({ error: 'Password must be at least 6 characters' });
    }

    // Check if student number or email already exists
    const existingStudent = User.findByStudentNumber(student_number);
    if (existingStudent) {
      return res.status(400).json({ error: 'Student number already exists' });
    }

    if (email) {
      const existingEmail = User.findByEmail(email);
      if (existingEmail) {
        return res.status(400).json({ error: 'Email already exists' });
      }
    }

    // Hash password
    const hashedPassword = bcrypt.hashSync(password, 10);

    const studentData = {
      full_name, email, student_number, password: hashedPassword, role: 'student',
      phone, gender, national_id, date_of_birth, address, guardian_name,
      guardian_phone, intake_year, status: 'active'
    };

    const result = User.create(studentData);

    res.status(201).json({
      message: 'Student registered successfully',
      id: result.lastInsertRowid
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
const createStudent = (req, res) => {
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
      guardian_phone, intake_year, course_id
    };

    const result = User.create(studentData);

    res.status(201).json({
      message: 'Student created successfully',
      id: result.lastInsertRowid
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
const getAllStudents = (req, res) => {
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

    const students = User.findAll(filters);

    res.json(students);
  } catch (error) {
    console.error('Get students error:', error);
    res.status(500).json({ error: 'Failed to fetch students' });
  }
};

// Get student by ID
const getStudentById = (req, res) => {
  try {
    const { id } = req.params;
    const student = User.findById(id);

    if (!student) {
      return res.status(404).json({ error: 'Student not found' });
    }

    if (student.role !== 'student') {
      return res.status(400).json({ error: 'User is not a student' });
    }

    // Lecturer can only view students in their assigned course
    if (req.user.role === 'lecturer' && student.course_id !== req.user.course_id) {
      return res.status(403).json({ error: 'Access denied: You can only view students in your assigned course' });
    }

    const { password: _, ...studentWithoutPassword } = student;

    res.json(studentWithoutPassword);
  } catch (error) {
    console.error('Get student error:', error);
    res.status(500).json({ error: 'Failed to fetch student' });
  }
};

// Update student
const updateStudent = (req, res) => {
  try {
    const { id } = req.params;
    const {
      full_name, email, student_number, phone, gender, national_id,
      date_of_birth, address, guardian_name, guardian_phone,
      intake_year, status, course_id
    } = req.body;

    // Get existing student to check course
    const existingStudent = User.findById(id);
    if (!existingStudent) {
      return res.status(404).json({ error: 'Student not found' });
    }

    // Lecturer can only update students in their assigned course
    if (req.user.role === 'lecturer' && existingStudent.course_id !== req.user.course_id) {
      return res.status(403).json({ error: 'Access denied: You can only update students in your assigned course' });
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

    User.update(id, updateData);

    const updatedStudent = User.findById(id);
    const { password: _, ...studentWithoutPassword } = updatedStudent;

    res.json(studentWithoutPassword);
  } catch (error) {
    console.error('Update student error:', error);
    if (error.message.includes('UNIQUE')) {
      return res.status(400).json({ error: 'Student number or email already exists' });
    }
    res.status(500).json({ error: 'Failed to update student' });
  }
};

// Delete student
const deleteStudent = (req, res) => {
  try {
    const { id } = req.params;

    const student = User.findById(id);
    if (!student) {
      return res.status(404).json({ error: 'Student not found' });
    }

    if (student.role !== 'student') {
      return res.status(400).json({ error: 'User is not a student' });
    }

    User.delete(id);

    res.json({ message: 'Student deleted successfully' });
  } catch (error) {
    console.error('Delete student error:', error);
    res.status(500).json({ error: 'Failed to delete student' });
  }
};

// Suspend student
const suspendStudent = (req, res) => {
  try {
    const { id } = req.params;

    User.update(id, { status: 'suspended' });

    res.json({ message: 'Student suspended successfully' });
  } catch (error) {
    console.error('Suspend student error:', error);
    res.status(500).json({ error: 'Failed to suspend student' });
  }
};

// Activate student
const activateStudent = (req, res) => {
  try {
    const { id } = req.params;

    User.update(id, { status: 'active' });

    res.json({ message: 'Student activated successfully' });
  } catch (error) {
    console.error('Activate student error:', error);
    res.status(500).json({ error: 'Failed to activate student' });
  }
};

// Reset student password
const resetPassword = (req, res) => {
  try {
    const { id } = req.params;
    const { new_password } = req.body;

    if (!new_password || new_password.length < 6) {
      return res.status(400).json({ error: 'New password must be at least 6 characters' });
    }

    const hashedPassword = bcrypt.hashSync(new_password, 10);

    User.updatePassword(id, hashedPassword);

    res.json({ message: 'Password reset successfully' });
  } catch (error) {
    console.error('Reset password error:', error);
    res.status(500).json({ error: 'Failed to reset password' });
  }
};

// Assign course to student
const assignCourse = (req, res) => {
  try {
    const { id } = req.params;
    const { course_id } = req.body;

    if (!course_id) {
      return res.status(400).json({ error: 'Course ID is required' });
    }

    User.update(id, { course_id });

    res.json({ message: 'Course assigned successfully' });
  } catch (error) {
    console.error('Assign course error:', error);
    res.status(500).json({ error: 'Failed to assign course' });
  }
};

// Get student statistics
const getStudentStatistics = (req, res) => {
  try {
    const stats = User.getStatistics();
    res.json(stats);
  } catch (error) {
    console.error('Get student statistics error:', error);
    res.status(500).json({ error: 'Failed to fetch student statistics' });
  }
};

// Create lecturer (admin only)
const createLecturer = (req, res) => {
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
    const existingEmail = User.findByEmail(email);
    if (existingEmail) {
      return res.status(400).json({ error: 'Email already exists' });
    }

    // Hash password
    const hashedPassword = bcrypt.hashSync(password, 10);

    const lecturerData = {
      full_name, email, password: hashedPassword, role: 'lecturer',
      phone, gender, course_id, status: 'active'
    };

    const result = User.create(lecturerData);

    res.status(201).json({
      message: 'Lecturer created successfully',
      id: result.lastInsertRowid
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
const getAllLecturers = (req, res) => {
  try {
    const filters = {
      role: 'lecturer',
      limit: 100
    };

    const lecturers = User.findAll(filters);

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

// Update lecturer (admin only)
const updateLecturer = (req, res) => {
  try {
    const { id } = req.params;
    const {
      full_name, email, phone, gender, course_id, status
    } = req.body;

    // Get existing lecturer
    const existingLecturer = User.findById(id);
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

    User.update(id, updateData);

    const updatedLecturer = User.findById(id);
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
const deleteLecturer = (req, res) => {
  try {
    const { id } = req.params;

    const lecturer = User.findById(id);
    if (!lecturer) {
      return res.status(404).json({ error: 'Lecturer not found' });
    }

    if (lecturer.role !== 'lecturer') {
      return res.status(400).json({ error: 'User is not a lecturer' });
    }

    User.delete(id);

    res.json({ message: 'Lecturer deleted successfully' });
  } catch (error) {
    console.error('Delete lecturer error:', error);
    res.status(500).json({ error: 'Failed to delete lecturer' });
  }
};

// Import students from Excel (admin only)
const importStudentsFromExcel = (req, res) => {
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
        const existingStudent = User.findByStudentNumber(studentData.student_number);
        if (existingStudent) {
          errors.push({ row, error: 'Student number already exists' });
          continue;
        }

        // Hash password
        const hashedPassword = bcrypt.hashSync(studentData.password, 10);
        studentData.password = hashedPassword;

        // Create student
        const result = User.create(studentData);
        importedStudents.push({
          id: result.lastInsertRowid,
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
  updateLecturer,
  deleteLecturer,
  importStudentsFromExcel
};
