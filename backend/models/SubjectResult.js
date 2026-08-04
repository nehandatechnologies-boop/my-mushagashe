const supabase = require('../config/supabase');

class SubjectResult {
  static async create(subjectResultData) {
    const { data, error } = await supabase
      .from('subject_results')
      .insert(subjectResultData)
      .select(`
        *,
        subjects:subject_id (
          subject_code,
          subject_name
        )
      `)
      .single();

    if (error) throw error;

    // Flatten the nested data
    if (data && data.subjects) {
      data.subject_code = data.subjects.subject_code;
      data.subject_name = data.subjects.subject_name;
      delete data.subjects;
    }

    return data;
  }

  static async findById(id) {
    const { data, error } = await supabase
      .from('subject_results')
      .select(`
        *,
        subjects:subject_id (
          subject_code,
          subject_name
        )
      `)
      .eq('id', id)
      .single();

    if (error) {
      if (error.code === 'PGRST116') return null; // Not found
      throw error;
    }

    // Flatten the nested data
    if (data && data.subjects) {
      data.subject_code = data.subjects.subject_code;
      data.subject_name = data.subjects.subject_name;
      delete data.subjects;
    }

    return data;
  }

  static async findByResultId(resultId) {
    const { data, error } = await supabase
      .from('subject_results')
      .select(`
        *,
        subjects:subject_id (
          subject_code,
          subject_name,
          credits
        )
      `)
      .eq('result_id', resultId)
      .order('subjects.subject_name', { ascending: true });

    if (error) throw error;

    // Flatten the nested data
    return data.map(sr => {
      if (sr.subjects) {
        sr.subject_code = sr.subjects.subject_code;
        sr.subject_name = sr.subjects.subject_name;
        sr.subject_credits = sr.subjects.credits;
        delete sr.subjects;
      }
      return sr;
    });
  }

  static async findAll(filters = {}) {
    let query = supabase
      .from('subject_results')
      .select(`
        *,
        subjects:subject_id (
          subject_code,
          subject_name
        )
      `);

    if (filters.result_id) {
      query = query.eq('result_id', filters.result_id);
    }

    if (filters.subject_id) {
      query = query.eq('subject_id', filters.subject_id);
    }

    query = query.order('created_at', { ascending: false });

    if (filters.limit) {
      query = query.limit(filters.limit);
    }

    const { data, error } = await query;

    if (error) throw error;

    // Flatten the nested data
    return data.map(sr => {
      if (sr.subjects) {
        sr.subject_code = sr.subjects.subject_code;
        sr.subject_name = sr.subjects.subject_name;
        delete sr.subjects;
      }
      return sr;
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
      .from('subject_results')
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
      .from('subject_results')
      .delete()
      .eq('id', id);

    if (error) throw error;
    return true;
  }

  static async deleteByResultId(resultId) {
    const { error } = await supabase
      .from('subject_results')
      .delete()
      .eq('result_id', resultId);

    if (error) throw error;
    return true;
  }

  static calculateGrade(mark) {
    if (mark >= 80) return 'A';
    if (mark >= 70) return 'B';
    if (mark >= 60) return 'C';
    if (mark >= 50) return 'D';
    if (mark >= 40) return 'E';
    return 'F';
  }
}

module.exports = SubjectResult;
