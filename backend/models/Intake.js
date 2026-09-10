const supabase = require('../config/supabase');

class Intake {
  static async create(intakeData) {
    const { name, year, status, description, start_date, end_date } = intakeData;

    const { data, error } = await supabase
      .from('intakes')
      .insert({
        name,
        year,
        status: status || 'active',
        description,
        start_date,
        end_date
      })
      .select()
      .single();

    if (error) throw error;
    return data;
  }

  static async findById(id) {
    const { data, error } = await supabase
      .from('intakes')
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
      .from('intakes')
      .select('*');

    if (filters.status) {
      query = query.eq('status', filters.status);
    }

    if (filters.year) {
      query = query.eq('year', filters.year);
    }

    if (filters.search) {
      query = query.or(`name.ilike.%${filters.search}%,description.ilike.%${filters.search}%`);
    }

    query = query.order('year', { ascending: false }).order('name', { ascending: true });

    if (filters.limit) {
      query = query.limit(filters.limit);
    }

    if (filters.offset) {
      query = query.range(filters.offset, filters.offset + (filters.limit || 50) - 1);
    }

    const { data, error } = await query;

    if (error) throw error;
    return data;
  }

  static async update(id, intakeData) {
    const { name, year, status, description, start_date, end_date } = intakeData;

    const updateData = { name, year, status, description, start_date, end_date };

    // Remove undefined values
    Object.keys(updateData).forEach(key => {
      if (updateData[key] === undefined) {
        delete updateData[key];
      }
    });

    const { data, error } = await supabase
      .from('intakes')
      .update(updateData)
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    return data;
  }

  static async delete(id) {
    const { error } = await supabase
      .from('intakes')
      .delete()
      .eq('id', id);

    if (error) throw error;
    return true;
  }

  static async getStudentCount(intakeId) {
    const { data, error } = await supabase
      .from('users')
      .select('id')
      .eq('intake', intakeId);

    if (error) throw error;
    return data.length;
  }

  static async getActiveIntake() {
    const { data, error } = await supabase
      .from('intakes')
      .select('*')
      .eq('status', 'active')
      .order('year', { ascending: false })
      .limit(1)
      .single();

    if (error) {
      if (error.code === 'PGRST116') return null; // Not found
      throw error;
    }
    return data;
  }

  static async getAllYears() {
    const { data, error } = await supabase
      .from('intakes')
      .select('year')
      .order('year', { ascending: false });

    if (error) throw error;

    // Get unique years
    const years = [...new Set(data.map(i => i.year))];
    return years;
  }
}

module.exports = Intake;
