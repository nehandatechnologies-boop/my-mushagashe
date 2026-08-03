const supabase = require('../config/supabase');

class Course {
  static async create(courseData) {
    const { course_code, course_name, department, duration, description } = courseData;

    const { data, error } = await supabase
      .from('courses')
      .insert({ course_code, course_name, department, duration, description })
      .select()
      .single();

    if (error) throw error;
    return data;
  }

  static async findById(id) {
    const { data, error } = await supabase
      .from('courses')
      .select('*')
      .eq('id', id)
      .single();

    if (error) {
      if (error.code === 'PGRST116') return null; // Not found
      throw error;
    }
    return data;
  }

  static async findByCode(courseCode) {
    const { data, error } = await supabase
      .from('courses')
      .select('*')
      .eq('course_code', courseCode)
      .single();

    if (error) {
      if (error.code === 'PGRST116') return null; // Not found
      throw error;
    }
    return data;
  }

  static async findAll(filters = {}) {
    let query = supabase.from('courses').select('*');

    if (filters.department) {
      query = query.eq('department', filters.department);
    }

    if (filters.search) {
      query = query.or(`course_name.ilike.%${filters.search}%,course_code.ilike.%${filters.search}%`);
    }

    query = query.order('course_name');

    if (filters.limit) {
      query = query.limit(filters.limit);
    }

    const { data, error } = await query;

    if (error) throw error;
    return data;
  }

  static async update(id, courseData) {
    const { course_code, course_name, department, duration, description } = courseData;

    const { data, error } = await supabase
      .from('courses')
      .update({ course_code, course_name, department, duration, description })
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    return data;
  }

  static async delete(id) {
    const { error } = await supabase
      .from('courses')
      .delete()
      .eq('id', id);

    if (error) throw error;
    return true;
  }

  static async getStudentCount(courseId) {
    const { count, error } = await supabase
      .from('users')
      .select('id', { count: 'exact', head: true })
      .eq('course_id', courseId)
      .eq('role', 'student');

    if (error) throw error;
    return count || 0;
  }

  static async getAllWithStudentCount() {
    const { data: courses, error } = await supabase
      .from('courses')
      .select('*')
      .order('course_name');

    if (error) throw error;

    // Get student counts for each course
    const coursesWithCounts = await Promise.all(
      courses.map(async (course) => {
        const studentCount = await this.getStudentCount(course.id);
        return { ...course, student_count: studentCount };
      })
    );

    return coursesWithCounts;
  }
}

module.exports = Course;
