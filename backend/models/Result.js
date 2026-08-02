const supabase = require('../config/supabase');

class Result {
  static async create(resultData) {
    const {
      user_id, course_id, semester, academic_year, assessment_mark,
      exam_mark, final_mark, grade, credits, lecturer, remarks
    } = resultData;

    const insertData = {
      user_id, course_id, semester, academic_year, assessment_mark,
      exam_mark, final_mark, grade, credits, lecturer, remarks
    };

    // Remove undefined values and convert empty strings to null
    Object.keys(insertData).forEach(key => {
      if (insertData[key] === undefined || insertData[key] === '') {
        delete insertData[key];
      }
    });

    const { data, error } = await supabase
      .from('results')
      .insert(insertData)
      .select()
      .single();

    if (error) throw error;
    return data;
  }

  static async findById(id) {
    const { data, error } = await supabase
      .from('results')
      .select(`
        *,
        users:user_id (
          full_name,
          student_number
        ),
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
    if (data) {
      if (data.users) {
        data.full_name = data.users.full_name;
        data.student_number = data.users.student_number;
        delete data.users;
      }
      if (data.courses) {
        data.course_name = data.courses.course_name;
        data.course_code = data.courses.course_code;
        delete data.courses;
      }
    }

    return data;
  }

  static async findByUserId(userId) {
    const { data, error } = await supabase
      .from('results')
      .select(`
        *,
        courses:course_id (
          course_name,
          course_code
        )
      `)
      .eq('user_id', userId)
      .order('academic_year', { ascending: false })
      .order('semester', { ascending: false });

    if (error) throw error;

    // Flatten the nested data
    return data.map(result => {
      if (result.courses) {
        result.course_name = result.courses.course_name;
        result.course_code = result.courses.course_code;
        delete result.courses;
      }
      return result;
    });
  }

  static async findAll(filters = {}) {
    let query = supabase
      .from('results')
      .select(`
        *,
        users:user_id (
          full_name,
          student_number
        ),
        courses:course_id (
          course_name,
          course_code
        )
      `);

    if (filters.user_id) {
      query = query.eq('user_id', filters.user_id);
    }

    if (filters.course_id) {
      query = query.eq('course_id', filters.course_id);
    }

    if (filters.semester) {
      query = query.eq('semester', filters.semester);
    }

    if (filters.academic_year) {
      query = query.eq('academic_year', filters.academic_year);
    }

    if (filters.grade) {
      query = query.eq('grade', filters.grade);
    }

    if (filters.search) {
      query = query.or(`users.full_name.ilike.%${filters.search}%,users.student_number.ilike.%${filters.search}%,courses.course_name.ilike.%${filters.search}%`);
    }

    query = query.order('academic_year', { ascending: false }).order('semester', { ascending: false });

    if (filters.limit) {
      query = query.limit(filters.limit);
    }

    if (filters.offset) {
      query = query.range(filters.offset, filters.offset + (filters.limit || 10) - 1);
    }

    const { data, error } = await query;

    if (error) throw error;

    // Flatten the nested data
    return data.map(result => {
      if (result.users) {
        result.full_name = result.users.full_name;
        result.student_number = result.users.student_number;
        delete result.users;
      }
      if (result.courses) {
        result.course_name = result.courses.course_name;
        result.course_code = result.courses.course_code;
        delete result.courses;
      }
      return result;
    });
  }

  static async update(id, resultData) {
    const {
      course_id, semester, academic_year, assessment_mark, exam_mark,
      final_mark, grade, credits, lecturer, remarks
    } = resultData;

    const updateData = {
      course_id, semester, academic_year, assessment_mark, exam_mark,
      final_mark, grade, credits, lecturer, remarks
    };

    // Remove undefined values and convert empty strings to null
    Object.keys(updateData).forEach(key => {
      if (updateData[key] === undefined || updateData[key] === '') {
        delete updateData[key];
      }
    });

    const { data, error } = await supabase
      .from('results')
      .update(updateData)
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    return data;
  }

  static async delete(id) {
    const { error } = await supabase
      .from('results')
      .delete()
      .eq('id', id);

    if (error) throw error;
    return true;
  }

  static calculateGrade(finalMark) {
    if (finalMark >= 80) return 'A';
    if (finalMark >= 70) return 'B';
    if (finalMark >= 60) return 'C';
    if (finalMark >= 50) return 'D';
    if (finalMark >= 40) return 'E';
    return 'F';
  }

  static async getStatistics() {
    const { data, error } = await supabase
      .from('results')
      .select('grade, final_mark');

    if (error) throw error;

    const stats = {
      total_results: data.length,
      grade_a: data.filter(r => r.grade === 'A').length,
      grade_b: data.filter(r => r.grade === 'B').length,
      grade_c: data.filter(r => r.grade === 'C').length,
      grade_d: data.filter(r => r.grade === 'D').length,
      grade_e: data.filter(r => r.grade === 'E').length,
      grade_f: data.filter(r => r.grade === 'F').length,
      average_mark: data.reduce((sum, r) => sum + (r.final_mark || 0), 0) / (data.length || 1)
    };

    return stats;
  }

  static async getStudentGPA(userId) {
    const { data, error } = await supabase
      .from('results')
      .select('grade')
      .eq('user_id', userId);

    if (error) throw error;

    const gradePoints = {
      'A': 4.0,
      'B': 3.0,
      'C': 2.0,
      'D': 1.0,
      'E': 0.5,
      'F': 0
    };

    const totalPoints = data.reduce((sum, r) => sum + (gradePoints[r.grade] || 0), 0);
    const gpa = data.length > 0 ? totalPoints / data.length : 0;

    return { gpa, total_courses: data.length };
  }
}

module.exports = Result;
