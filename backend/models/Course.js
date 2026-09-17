const supabase = require('../config/supabase');

class Course {
  static async create(courseData) {
    const { course_code, course_name, department, duration, description } = courseData;

    const insertData = {
      course_code, course_name, department, duration, description
    };

    console.log('[COURSE.CREATE] Input data:', JSON.stringify(courseData, null, 2));
    console.log('[COURSE.CREATE] Insert data:', JSON.stringify(insertData, null, 2));

    // Remove undefined values and convert empty strings to null
    Object.keys(insertData).forEach(key => {
      if (insertData[key] === undefined) {
        delete insertData[key];
      } else if (insertData[key] === '') {
        insertData[key] = null;
      }
    });

    console.log('[COURSE.CREATE] Final insert data:', JSON.stringify(insertData, null, 2));

    const { data, error } = await supabase
      .from('courses')
      .insert(insertData)
      .select()
      .single();

    if (error) {
      console.error('[COURSE.CREATE] Supabase error:', error);
      console.error('[COURSE.CREATE] Error code:', error.code);
      console.error('[COURSE.CREATE] Error message:', error.message);
      console.error('[COURSE.CREATE] Error details:', error.details);
      throw error;
    }

    console.log('[COURSE.CREATE] Success:', JSON.stringify(data, null, 2));
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

  static async findAll() {
    const { data, error } = await supabase
      .from('courses')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) throw error;
    return data;
  }

  static async getAllWithStudentCount() {
    const { data, error } = await supabase
      .from('courses')
      .select(`
        *,
        users (id, role)
      `)
      .order('created_at', { ascending: false });

    if (error) throw error;

    // Calculate student count for each course
    return data.map(course => ({
      ...course,
      student_count: course.users ? course.users.filter(u => u.role === 'student').length : 0
    }));
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
    console.log('[COURSE.DELETE] Attempting to delete course ID:', id);
    const { error } = await supabase
      .from('courses')
      .delete()
      .eq('id', id);

    if (error) throw error;

    console.log('[COURSE.DELETE] Delete successful for ID:', id);
    return true;
  }
}

module.exports = Course;
