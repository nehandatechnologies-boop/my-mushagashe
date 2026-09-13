const supabase = require('../config/supabase');

class User {
  static async create(userData) {
    const {
      full_name, email, student_number, password, role, phone, gender,
      national_id, date_of_birth, address, guardian_name, guardian_phone,
      intake, intake_year, course_id, status, must_change_password, auth_type
    } = userData;

    const insertData = {
      full_name, email, student_number, role, phone, gender,
      national_id, date_of_birth, address, guardian_name, guardian_phone,
      intake, intake_year, course_id, status, must_change_password, auth_type
    };

    // Remove undefined values and convert empty strings to null
    Object.keys(insertData).forEach(key => {
      if (insertData[key] === undefined) {
        delete insertData[key];
      } else if (insertData[key] === '') {
        insertData[key] = null;
      }
    });

    // Handle password: hash if provided, generate if not
    if (insertData.password) {
      const bcrypt = require('bcryptjs');
      console.log('[USER.CREATE] Hashing provided password for student:', insertData.student_number);
      insertData.password = bcrypt.hashSync(insertData.password, 10);
      // Set must_change_password to true for imported passwords
      insertData.must_change_password = true;
    } else {
      const crypto = require('crypto');
      const bcrypt = require('bcryptjs');
      const randomPassword = crypto.randomBytes(16).toString('base64').substring(0, 12);
      console.log('[USER.CREATE] Generating random password for student:', insertData.student_number);
      insertData.password = bcrypt.hashSync(randomPassword, 10);
      // Set must_change_password to true for auto-generated passwords
      insertData.must_change_password = true;
    }

    // Convert must_change_password to boolean for Supabase
    if (insertData.must_change_password !== undefined) {
      insertData.must_change_password = insertData.must_change_password === true || insertData.must_change_password === 1;
    }

    const { data, error } = await supabase
      .from('users')
      .insert(insertData)
      .select()
      .single();

    if (error) throw error;
    return data;
  }

  static async findById(id) {
    const { data, error } = await supabase
      .from('users')
      .select(`
        *,
        courses (course_name, course_code)
      `)
      .eq('id', id)
      .single();

    if (error) {
      if (error.code === 'PGRST116') return null; // Not found
      throw error;
    }

    // Flatten course data
    if (data && data.courses) {
      data.course_name = data.courses.course_name;
      data.course_code = data.courses.course_code;
      delete data.courses;
    }

    return data;
  }

  static async findByEmail(email) {
    const { data, error } = await supabase
      .from('users')
      .select('*')
      .eq('email', email)
      .single();

    if (error) {
      if (error.code === 'PGRST116') return null; // Not found
      throw error;
    }
    return data;
  }

  static async findByStudentNumber(studentNumber) {
    const { data, error } = await supabase
      .from('users')
      .select('*')
      .eq('student_number', studentNumber)
      .single();

    if (error) {
      if (error.code === 'PGRST116') return null; // Not found
      throw error;
    }
    return data;
  }

  static async findAll(filters = {}) {
    let query = supabase
      .from('users')
      .select(`
        *,
        courses (course_name, course_code)
      `);

    if (filters.role) {
      query = query.eq('role', filters.role);
    }

    if (filters.status) {
      query = query.eq('status', filters.status);
    }

    if (filters.course_id) {
      query = query.eq('course_id', filters.course_id);
    }

    if (filters.intake) {
      query = query.eq('intake', filters.intake);
    }

    if (filters.search) {
      query = query.or(`full_name.ilike.%${filters.search}%,email.ilike.%${filters.search}%,student_number.ilike.%${filters.search}%`);
    }

    query = query.order('created_at', { ascending: false });

    if (filters.limit) {
      query = query.limit(filters.limit);
    }

    if (filters.offset) {
      query = query.range(filters.offset, filters.offset + (filters.limit || 10) - 1);
    }

    const { data, error } = await query;

    if (error) throw error;

    // Flatten course data
    return data.map(user => {
      if (user.courses) {
        user.course_name = user.courses.course_name;
        user.course_code = user.courses.course_code;
        delete user.courses;
      }
      return user;
    });
  }

  static async update(id, userData) {
    const {
      full_name, email, student_number, password, phone, gender,
      national_id, date_of_birth, address, guardian_name, guardian_phone,
      intake_year, course_id, status, must_change_password
    } = userData;

    const updateData = {
      full_name, email, student_number, phone, gender,
      national_id, date_of_birth, address, guardian_name, guardian_phone,
      intake_year, course_id, status, must_change_password
    };

    // Remove undefined values and convert empty strings to null
    Object.keys(updateData).forEach(key => {
      if (updateData[key] === undefined) {
        delete updateData[key];
      } else if (updateData[key] === '') {
        updateData[key] = null;
      }
    });

    // Handle password: hash if provided
    if (updateData.password) {
      const bcrypt = require('bcryptjs');
      updateData.password = bcrypt.hashSync(updateData.password, 10);
    }

    // Convert must_change_password to boolean for Supabase
    if (updateData.must_change_password !== undefined) {
      updateData.must_change_password = updateData.must_change_password === true || updateData.must_change_password === 1;
    }

    const { data, error } = await supabase
      .from('users')
      .update(updateData)
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    return data;
  }

  static async upsertByStudentNumber(userData) {
    const {
      full_name, email, student_number, password, role, phone, gender,
      national_id, date_of_birth, address, guardian_name, guardian_phone,
      intake, intake_year, course_id, status, must_change_password
    } = userData;

    if (!student_number) {
      throw new Error('Student number is required for upsert');
    }

    // Check if student exists
    const existing = await this.findByStudentNumber(studentNumber);

    if (existing) {
      // Update existing student
      const updateData = {
        full_name, email, phone, gender,
        national_id, date_of_birth, address, guardian_name, guardian_phone,
        intake, intake_year, course_id, status
      };

      // Handle password: hash if provided
      if (password) {
        const bcrypt = require('bcryptjs');
        console.log('[USER.UPSERT] Hashing provided password for existing student:', student_number);
        updateData.password = bcrypt.hashSync(password, 10);
        // When password is updated via Excel import, set must_change_password = true
        updateData.must_change_password = true;
      }

      // Remove undefined values and convert empty strings to null
      Object.keys(updateData).forEach(key => {
        if (updateData[key] === undefined) {
          delete updateData[key];
        } else if (updateData[key] === '') {
          updateData[key] = null;
        }
      });

      // Convert must_change_password to boolean for Supabase
      if (updateData.must_change_password !== undefined) {
        updateData.must_change_password = updateData.must_change_password === true || updateData.must_change_password === 1;
      }

      const { data, error } = await supabase
        .from('users')
        .update(updateData)
        .eq('id', existing.id)
        .select()
        .single();

      if (error) throw error;
      return { ...data, action: 'updated' };
    } else {
      // Create new student - password will be generated in create() if not provided
      const result = await this.create(userData);
      return { ...result, action: 'created' };
    }
  }

  static async updatePassword(id, newPassword) {
    const { data, error } = await supabase
      .from('users')
      .update({ password: newPassword })
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    return data;
  }

  static async deleteDependentRecords(id) {
    // Delete fees
    await supabase.from('fees').delete().eq('user_id', id);

    // Delete results
    await supabase.from('results').delete().eq('user_id', id);

    // Delete announcements
    await supabase.from('announcements').delete().eq('created_by', id);

    // Delete audit logs
    await supabase.from('audit_logs').delete().eq('user_id', id);
  }

  static async delete(id) {
    console.log('[USER.DELETE] Attempting to delete user ID:', id);
    const { error } = await supabase
      .from('users')
      .delete()
      .eq('id', id);

    if (error) throw error;

    console.log('[USER.DELETE] Delete successful for ID:', id);
    return true;
  }

  static async getStatistics() {
    const { data: users, error } = await supabase
      .from('users')
      .select('role, status, gender');

    if (error) throw error;

    const students = users.filter(u => u.role === 'student');

    // Normalize gender for counting (case-insensitive)
    const normalizeGender = (gender) => {
      if (!gender) return null;
      return gender.toString().trim().toLowerCase();
    };

    const stats = {
      total: students.length,
      male_count: students.filter(u => normalizeGender(u.gender) === 'male').length,
      female_count: students.filter(u => normalizeGender(u.gender) === 'female').length,
      active_count: students.filter(u => u.status === 'active').length,
      suspended_count: students.filter(u => u.status === 'suspended').length,
      // Keep legacy fields for backward compatibility
      total_users: users.length,
      total_students: students.length,
      total_lecturers: users.filter(u => u.role === 'lecturer').length,
      total_admins: users.filter(u => u.role === 'admin').length,
      active_users: users.filter(u => u.status === 'active').length,
      suspended_users: users.filter(u => u.status === 'suspended').length
    };

    return stats;
  }
}

module.exports = User;
