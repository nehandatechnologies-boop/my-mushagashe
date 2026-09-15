const supabase = require('../config/supabase');

class ImportBatch {
  static async create(batchData) {
    const {
      filename,
      uploaded_by,
      total_rows,
      notes
    } = batchData;

    const insertData = {
      filename,
      uploaded_by,
      total_rows: total_rows || 0,
      successful_rows: 0,
      failed_rows: 0,
      status: 'preview',
      is_current: false,
      notes
    };

    const { data, error } = await supabase
      .from('import_batches')
      .insert(insertData)
      .select()
      .single();

    if (error) throw error;
    return data;
  }

  static async findById(id) {
    const { data, error } = await supabase
      .from('import_batches')
      .select('*')
      .eq('id', id)
      .single();

    if (error) {
      if (error.code === 'PGRST116') return null; // Not found
      throw error;
    }
    return data;
  }

  static async findAll(filters = {}) {
    let query = supabase
      .from('import_batches')
      .select('*');

    if (filters.uploaded_by) {
      query = query.eq('uploaded_by', filters.uploaded_by);
    }

    if (filters.status) {
      query = query.eq('status', filters.status);
    }

    if (filters.is_current !== undefined) {
      query = query.eq('is_current', filters.is_current);
    }

    query = query.order('uploaded_at', { ascending: false });

    const { data, error } = await query;

    if (error) throw error;
    return data;
  }

  static async getCurrent() {
    const { data, error } = await supabase
      .from('import_batches')
      .select('*')
      .eq('is_current', true)
      .order('uploaded_at', { ascending: false })
      .limit(1)
      .single();

    if (error) {
      if (error.code === 'PGRST116') return null; // Not found
      throw error;
    }
    return data;
  }

  static async update(id, updateData) {
    const { data, error } = await supabase
      .from('import_batches')
      .update(updateData)
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    return data;
  }

  static async setCurrent(batchId) {
    // First, set all batches to not current
    await supabase
      .from('import_batches')
      .update({ is_current: false })
      .neq('id', 0); // Update all rows

    // Then set the specified batch as current
    const { data, error } = await supabase
      .from('import_batches')
      .update({ is_current: true })
      .eq('id', batchId)
      .select()
      .single();

    if (error) throw error;
    return data;
  }

  static async delete(id) {
    const { error } = await supabase
      .from('import_batches')
      .delete()
      .eq('id', id);

    if (error) throw error;
    return true;
  }
}

class ImportBatchDetail {
  static async create(detailData) {
    const {
      batch_id,
      student_id,
      student_number,
      action,
      row_number,
      error_message
    } = detailData;

    const insertData = {
      batch_id,
      student_id,
      student_number,
      action,
      row_number,
      error_message
    };

    const { data, error } = await supabase
      .from('import_batch_details')
      .insert(insertData)
      .select()
      .single();

    if (error) throw error;
    return data;
  }

  static async findByBatchId(batchId) {
    const { data, error } = await supabase
      .from('import_batch_details')
      .select('*')
      .eq('batch_id', batchId)
      .order('row_number');

    if (error) throw error;
    return data;
  }

  static async findByStudentId(studentId) {
    const { data, error } = await supabase
      .from('import_batch_details')
      .select('*')
      .eq('student_id', studentId)
      .order('created_at', { ascending: false });

    if (error) throw error;
    return data;
  }

  static async deleteByBatchId(batchId) {
    const { error } = await supabase
      .from('import_batch_details')
      .delete()
      .eq('batch_id', batchId);

    if (error) throw error;
    return true;
  }
}

module.exports = { ImportBatch, ImportBatchDetail };
