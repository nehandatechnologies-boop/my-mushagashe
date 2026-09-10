const Intake = require('../models/Intake');
const { auditActions } = require('../services/auditService');

/**
 * Get all intakes
 */
const getAllIntakes = async (req, res) => {
  try {
    const { status, year, search, limit, offset } = req.query;
    
    const filters = {};
    if (status) filters.status = status;
    if (year) filters.year = parseInt(year);
    if (search) filters.search = search;
    if (limit) filters.limit = parseInt(limit);
    if (offset) filters.offset = parseInt(offset);

    const intakes = await Intake.findAll(filters);
    res.json(intakes);
  } catch (error) {
    console.error('Get all intakes error:', error);
    res.status(500).json({ error: 'Failed to fetch intakes' });
  }
};

/**
 * Get intake by ID
 */
const getIntakeById = async (req, res) => {
  try {
    const { id } = req.params;
    const intake = await Intake.findById(id);

    if (!intake) {
      return res.status(404).json({ error: 'Intake not found' });
    }

    // Get student count for this intake
    const studentCount = await Intake.getStudentCount(id);
    intake.student_count = studentCount;

    res.json(intake);
  } catch (error) {
    console.error('Get intake by ID error:', error);
    res.status(500).json({ error: 'Failed to fetch intake' });
  }
};

/**
 * Create new intake
 */
const createIntake = async (req, res) => {
  try {
    const { name, year, status, description, start_date, end_date } = req.body;

    // Validation
    if (!name || !year) {
      return res.status(400).json({ error: 'Name and year are required' });
    }

    // Create intake
    const newIntake = await Intake.create({
      name,
      year: parseInt(year),
      status: status || 'active',
      description,
      start_date,
      end_date
    });

    // Log the action
    await auditActions.intakeCreate(req, newIntake.id, `Created intake: ${name} (${year})`);

    res.status(201).json(newIntake);
  } catch (error) {
    console.error('Create intake error:', error);
    res.status(500).json({ error: 'Failed to create intake' });
  }
};

/**
 * Update intake
 */
const updateIntake = async (req, res) => {
  try {
    const { id } = req.params;
    const { name, year, status, description, start_date, end_date } = req.body;

    // Check if intake exists
    const existingIntake = await Intake.findById(id);
    if (!existingIntake) {
      return res.status(404).json({ error: 'Intake not found' });
    }

    // Update intake
    const updateData = { name, year, status, description, start_date, end_date };
    if (year) updateData.year = parseInt(year);

    const updatedIntake = await Intake.update(id, updateData);

    // Log the action
    await auditActions.intakeUpdate(req, id, `Updated intake: ${name || existingIntake.name}`);

    res.json(updatedIntake);
  } catch (error) {
    console.error('Update intake error:', error);
    res.status(500).json({ error: 'Failed to update intake' });
  }
};

/**
 * Delete intake
 */
const deleteIntake = async (req, res) => {
  try {
    const { id } = req.params;

    // Check if intake exists
    const existingIntake = await Intake.findById(id);
    if (!existingIntake) {
      return res.status(404).json({ error: 'Intake not found' });
    }

    // Check if intake has students
    const studentCount = await Intake.getStudentCount(id);
    if (studentCount > 0) {
      return res.status(400).json({ 
        error: `Cannot delete intake with ${studentCount} enrolled students. Please reassign or remove students first.` 
      });
    }

    // Delete intake
    await Intake.delete(id);

    // Log the action
    await auditActions.intakeDelete(req, id, `Deleted intake: ${existingIntake.name}`);

    res.json({ message: 'Intake deleted successfully' });
  } catch (error) {
    console.error('Delete intake error:', error);
    res.status(500).json({ error: 'Failed to delete intake' });
  }
};

/**
 * Get active intake
 */
const getActiveIntake = async (req, res) => {
  try {
    const activeIntake = await Intake.getActiveIntake();
    
    if (!activeIntake) {
      return res.status(404).json({ error: 'No active intake found' });
    }

    res.json(activeIntake);
  } catch (error) {
    console.error('Get active intake error:', error);
    res.status(500).json({ error: 'Failed to fetch active intake' });
  }
};

/**
 * Get all intake years
 */
const getIntakeYears = async (req, res) => {
  try {
    const years = await Intake.getAllYears();
    res.json(years);
  } catch (error) {
    console.error('Get intake years error:', error);
    res.status(500).json({ error: 'Failed to fetch intake years' });
  }
};

module.exports = {
  getAllIntakes,
  getIntakeById,
  createIntake,
  updateIntake,
  deleteIntake,
  getActiveIntake,
  getIntakeYears
};
