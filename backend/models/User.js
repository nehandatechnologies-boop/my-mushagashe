const supabase = require('../config/supabase');

class User {
  static async create(userData) {
    const {
      full_name, email, student_number, password, role, phone, gender,
      national_id, date_of_birth, address, guardian_name, guardian_phone,
      intake_year, course_id
    } = userData;

    const { data, error } = await supabase
      .from('users')
      .insert({
        full_name, email, student_number, password, role, phone, gender,
        national_id, date_of_birth, address, guardian_name, guardian_phone,
        intake_year, course_id
      })
      .select()
      .single();

    if (error) throw error;
    return data;
  }

  static async findById(id) {
    const { data, error } = await supabase
      .from('users')
      .select('*')
      .eq('id', id)
      .single();

    if (error) {
      if (error.code === 'PGRST116') return null; // Not found
      throw error;
    }

    // If user has a course, fetch course details
    if (data && data.course_id) {
      const { data: courseData, error: courseError } = await supabase
        .from('courses')
        .select('course_name, course_code')
        .eq('id', data.course_id)
        .single();

      if (!courseError && courseData) {
        data.course_name = courseData.course_name;
        data.course_code = courseData.course_code;
      }
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
      .select(`
        *,
        courses:course_id (
          course_name,
          course_code
        )
      `)
      .eq('student_number', studentNumber)
      .single();

    if (error) {
      if (error.code === 'PGRST116') return null; // Not found
      throw error;
    }

    // Flatten the nested course data
    if (data && data.courses) {
      data.course_name = data.courses.course_name;
      data.course_code = data.courses.course_code;
      delete data.courses;
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
      query = query.or(`full_name.ilike.%${filters.search}%,student_number.ilike.%${filters.search}%,email.ilike.%${filters.search}%`);
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

    // Flatten the nested course data
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
      full_name, email, student_number, phone, gender, national_id,
      date_of_birth, address, guardian_name, guardian_phone,
      intake_year, status, course_id, profile_picture
    } = userData;

    const { data, error } = await supabase
      .from('users')
      .update({
        full_name, email, student_number, phone, gender, national_id,
        date_of_birth, address, guardian_name, guardian_phone,
        intake_year, status, course_id, profile_picture
      })
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    return data;
  }

  static async updatePassword(id, hashedPassword) {
    const { data, error } = await supabase
      .from('users')
      .update({ password: hashedPassword })
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    return data;
  }

  static async delete(id) {
    const { error } = await supabase
      .from('users')
      .delete()
      .eq('id', id);

    if (error) throw error;
    return true;
  }

  static async getStatistics() {
    const { data, error } = await supabase
      .from('users')
      .select(`
        gender,
        status
      `)
      .eq('role', 'student');

    if (error) throw error;

    const stats = {
      total: data.length,
      male_count: data.filter(u => u.gender === 'male').length,
      female_count: data.filter(u => u.gender === 'female').length,
      active_count: data.filter(u => u.status === 'active').length,
      suspended_count: data.filter(u => u.status === 'suspended').length
    };

    return stats;
  }
}

module.exports = User;
