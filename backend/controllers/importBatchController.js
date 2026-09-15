const { ImportBatch, ImportBatchDetail } = require('../models/ImportBatch');
const User = require('../models/User');
const { authenticate } = require('../middleware/auth');
const { requirePermission } = require('../middleware/rbac');

// Get all import batches
const getAllBatches = async (req, res) => {
  try {
    const batches = await ImportBatch.findAll({
      uploaded_by: req.user.id
    });

    // Remove sensitive information
    const safeBatches = batches.map(batch => ({
      ...batch,
      // Don't expose internal fields
    }));

    res.json(safeBatches);
  } catch (error) {
    console.error('Get all batches error:', error);
    res.status(500).json({ error: 'Failed to fetch import batches' });
  }
};

// Get current active batch
const getCurrentBatch = async (req, res) => {
  try {
    const currentBatch = await ImportBatch.getCurrent();

    if (!currentBatch) {
      return res.status(404).json({ error: 'No current import batch found' });
    }

    // Get batch details
    const details = await ImportBatchDetail.findByBatchId(currentBatch.id);

    res.json({
      ...currentBatch,
      details: details
    });
  } catch (error) {
    console.error('Get current batch error:', error);
    res.status(500).json({ error: 'Failed to fetch current batch' });
  }
};

// Replace current student dataset (destructive operation)
const replaceCurrentDataset = async (req, res) => {
  try {
    const { batch_id, confirm } = req.body;

    if (!confirm) {
      return res.status(400).json({ error: 'Confirmation required for destructive operation' });
    }

    if (!batch_id) {
      return res.status(400).json({ error: 'Batch ID is required' });
    }

    // Get the batch to be made current
    const batch = await ImportBatch.findById(batch_id);
    if (!batch) {
      return res.status(404).json({ error: 'Batch not found' });
    }

    console.log(`[REPLACE] Replacing current dataset with batch ${batch_id}`);

    // Get current batch
    const currentBatch = await ImportBatch.getCurrent();

    if (currentBatch) {
      console.log(`[REPLACE] Removing students from current batch ${currentBatch.id}`);

      // Get students from current batch
      const currentDetails = await ImportBatchDetail.findByBatchId(currentBatch.id);
      const currentStudentIds = currentDetails
        .filter(d => d.student_id)
        .map(d => d.student_id);

      // Delete students from current batch (only if they are students)
      for (const studentId of currentStudentIds) {
        const student = await User.findById(studentId);
        if (student && student.role === 'student') {
          console.log(`[REPLACE] Deleting student ${student.student_number} (id=${studentId})`);
          await User.delete(studentId);
        }
      }

      // Delete current batch details
      await ImportBatchDetail.deleteByBatchId(currentBatch.id);

      // Delete current batch
      await ImportBatch.delete(currentBatch.id);

      console.log(`[REPLACE] Removed current batch ${currentBatch.id}`);
    }

    // Set new batch as current
    await ImportBatch.setCurrent(batch_id);

    console.log(`[REPLACE] Set batch ${batch_id} as current`);

    res.json({
      message: 'Student dataset replaced successfully',
      new_batch_id: batch_id,
      students_removed: currentBatch ? currentBatch.successful_rows : 0
    });
  } catch (error) {
    console.error('Replace dataset error:', error);
    res.status(500).json({ error: 'Failed to replace student dataset' });
  }
};

// Delete a batch
const deleteBatch = async (req, res) => {
  try {
    const { id } = req.params;

    const batch = await ImportBatch.findById(id);
    if (!batch) {
      return res.status(404).json({ error: 'Batch not found' });
    }

    // Cannot delete current batch
    if (batch.is_current) {
      return res.status(400).json({ error: 'Cannot delete current active batch' });
    }

    console.log(`[BATCH DELETE] Deleting batch ${id}`);

    // Delete batch details
    await ImportBatchDetail.deleteByBatchId(id);

    // Delete batch
    await ImportBatch.delete(id);

    res.json({ message: 'Batch deleted successfully' });
  } catch (error) {
    console.error('Delete batch error:', error);
    res.status(500).json({ error: 'Failed to delete batch' });
  }
};

module.exports = {
  getAllBatches,
  getCurrentBatch,
  replaceCurrentDataset,
  deleteBatch
};
