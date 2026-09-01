const supabase = require('../config/supabase');

class Course {
  static async create(courseData) {
    const { course_code, course_name, department, duration, description } = courseData;

    const insertData = {
      course_code, course_name, department, duration, description
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
      .from('courses')
      .insert(insertData)
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

    query = query.order('created_at', { ascending: false });

    if (filters.limit) {
      query = query.limit(filters.limit);
    }

    if (filters.offset) {
      query = query.range(filters.offset, filters.offset + (filters.limit || 10) - 1);
    }

    const { data, error } = await query;

    if (error) throw error;
    return data;
  }

  static async update(id, courseData) {
    const { course_code, course_name, department, duration, description } = courseData;

    const updateData = {
      course_code, course_name, department, duration, description
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
      .from('courses')
      .update(updateData)
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
    const { data, error } = await supabase
      .from('users')
      .select('id')
      .eq('course_id', courseId);

    if (error) throw error;
    return data.length;
  }

  static async getAllWithStudentCount() {
    const { data: courses, error } = await supabase
      .from('courses')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) throw error;

    // Get student count for each course
    const coursesWithCount = await Promise.all(
      courses.map(async (course) => {
        const studentCount = await this.getStudentCount(course.id);
        return { ...course, student_count: studentCount };
      })
    );

    return coursesWithCount;
  }
}

module.exports = Course;
