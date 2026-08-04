const supabase = require('../config/supabase');

class Subject {
  static async create(subjectData) {
    const { data, error } = await supabase
      .from('subjects')
      .insert(subjectData)
      .select()
      .single();

    if (error) throw error;
    return data;
  }

  static async findById(id) {
    const { data, error } = await supabase
      .from('subjects')
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

  static async findAll(filters = {}) {
    let query = supabase
      .from('subjects')
      .select(`
        *,
        courses:course_id (
          course_name,
          course_code
        )
      `);

    if (filters.course_id) {
      query = query.eq('course_id', filters.course_id);
    }

    if (filters.search) {
      query = query.or(`subject_name.ilike.%${filters.search}%,subject_code.ilike.%${filters.search}%`);
    }

    query = query.order('subject_name', { ascending: true });

    if (filters.limit) {
      query = query.limit(filters.limit);
    }

    const { data, error } = await query;

    if (error) throw error;

    // Flatten the nested data
    return data.map(subject => {
      if (subject.courses) {
        subject.course_name = subject.courses.course_name;
        subject.course_code = subject.courses.course_code;
        delete subject.courses;
      }
      return subject;
    });
  }

  static async update(id, updateData) {
    // Convert empty strings to null
    Object.keys(updateData).forEach(key => {
      if (updateData[key] === '') {
        updateData[key] = null;
      }
    });

    const { data, error } = await supabase
      .from('subjects')
      .update(updateData)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      if (error.code === 'PGRST116') return null; // Not found
      throw error;
    }

    return data;
  }

  static async delete(id) {
    const { error } = await supabase
      .from('subjects')
      .delete()
      .eq('id', id);

    if (error) throw error;
    return true;
  }

  static async findByCourseId(courseId) {
    const { data, error } = await supabase
      .from('subjects')
      .select('*')
      .eq('course_id', courseId)
      .order('subject_name', { ascending: true });

    if (error) throw error;
    return data;
  }
}

module.exports = Subject;
