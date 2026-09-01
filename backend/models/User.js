const supabase = require('../config/supabase');

class User {
  static async create(userData) {
    const {
      full_name, email, student_number, password, role, phone, gender,
      national_id, date_of_birth, address, guardian_name, guardian_phone,
      intake_year, course_id, status
    } = userData;

    const insertData = {
      full_name, email, student_number, password, role, phone, gender,
      national_id, date_of_birth, address, guardian_name, guardian_phone,
      intake_year, course_id, status
    };

    // Remove undefined values and convert empty strings to null
    Object.keys(insertData).forEach(key => {
      if (insertData[key] === undefined) {
        delete insertData[key];
      } else if (insertData[key] === '') {
        insertData[key] = null;
      }
    });

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
        courses:course_id (
          course_name,
          course_code
        )
      `)
      .eq('id', id)
      .single();

    if (error) {
      if (error.code === 'PGRST116') return null; // Not found
      throw error;
    }

    // Flatten the nested data
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
        courses:course_id (
          course_name,
          course_code
        )
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

    // Flatten the nested data
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
      intake_year, course_id, status
    } = userData;

    const updateData = {
      full_name, email, student_number, password, phone, gender,
      national_id, date_of_birth, address, guardian_name, guardian_phone,
      intake_year, course_id, status
    };

    // Remove undefined values and convert empty strings to null
    Object.keys(updateData).forEach(key => {
      if (updateData[key] === undefined) {
        delete updateData[key];
      } else if (updateData[key] === '') {
        updateData[key] = null;
      }
    });

    const { data, error } = await supabase
      .from('users')
      .update(updateData)
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    return data;
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

  static async delete(id) {
    console.log('[USER.DELETE] Attempting to delete user ID:', id);
    const { error } = await supabase
      .from('users')
      .delete()
      .eq('id', id);

    if (error) {
      console.error('[USER.DELETE] SUPABASE ERROR:', error);
      console.error('[USER.DELETE] ERROR CODE:', error.code);
      console.error('[USER.DELETE] ERROR MESSAGE:', error.message);
      console.error('[USER.DELETE] ERROR DETAILS:', error.details);
      console.error('[USER.DELETE] ERROR HINT:', error.hint);
      throw error;
    }
    console.log('[USER.DELETE] Delete successful for ID:', id);
    return true;
  }

  static async getStatistics() {
    const { data, error } = await supabase
      .from('users')
      .select('role, status, gender');

    if (error) throw error;

    const students = data.filter(u => u.role === 'student');
    
    const stats = {
      total: students.length,
      male_count: students.filter(u => u.gender === 'male').length,
      female_count: students.filter(u => u.gender === 'female').length,
      active_count: students.filter(u => u.status === 'active').length,
      suspended_count: students.filter(u => u.status === 'suspended').length,
      // Keep legacy fields for backward compatibility
      total_users: data.length,
      total_students: students.length,
      total_lecturers: data.filter(u => u.role === 'lecturer').length,
      total_admins: data.filter(u => u.role === 'admin').length,
      active_users: data.filter(u => u.status === 'active').length,
      suspended_users: data.filter(u => u.status === 'suspended').length
    };

    return stats;
  }
}

module.exports = User;
