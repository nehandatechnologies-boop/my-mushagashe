const supabase = require('../config/supabase');

class Subject {
  static async create(subjectData) {
    const { subject_code, subject_name, course_id, credits, lecturer } = subjectData;

    const insertData = {
      subject_code, subject_name, course_id, credits, lecturer
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
      .from('subjects')
      .insert(insertData)
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
    const { subject_code, subject_name, course_id, credits, lecturer } = updateData;

    const data = {
      subject_code, subject_name, course_id, credits, lecturer
    };

    // Remove undefined values and convert empty strings to null
    Object.keys(data).forEach(key => {
      if (data[key] === undefined) {
        delete data[key];
      } else if (data[key] === '') {
        data[key] = null;
      }
    });

    const { data: result, error } = await supabase
      .from('subjects')
      .update(data)
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    return result;
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
