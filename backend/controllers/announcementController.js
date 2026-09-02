const Announcement = require('../models/Announcement');

// Create new announcement
const createAnnouncement = async (req, res) => {
  try {
    const { title, message, priority } = req.body;

    // Validation
    if (!title || !message) {
      return res.status(400).json({ error: 'Title and message are required' });
    }

    const validPriorities = ['low', 'normal', 'important', 'urgent'];
    if (priority && !validPriorities.includes(priority)) {
      return res.status(400).json({ error: 'Invalid priority. Must be: low, normal, important, or urgent' });
    }

    const announcementData = {
      title,
      message,
      priority: priority || 'normal',
      created_by: req.user.id
    };

    const result = await Announcement.create(announcementData);

    res.status(201).json({
      message: 'Announcement created successfully',
      id: result.id
    });
  } catch (error) {
    console.error('Create announcement error:', error);
    res.status(500).json({ error: 'Failed to create announcement' });
  }
};

// Get all announcements with filters
const getAllAnnouncements = async (req, res) => {
  try {
    const { priority, search, limit = 50, offset = 0 } = req.query;

    const filters = {
      priority,
      search,
      limit: parseInt(limit),
      offset: parseInt(offset)
    };

    const announcements = await Announcement.findAll(filters);

    res.json(announcements);
  } catch (error) {
    console.error('Get announcements error:', error);
    res.status(500).json({ error: 'Failed to fetch announcements' });
  }
};

// Get latest announcements
const getLatestAnnouncements = async (req, res) => {
  try {
    const { limit = 5 } = req.query;
    const announcements = await Announcement.getLatest(parseInt(limit));
    res.json(announcements);
  } catch (error) {
    console.error('Get latest announcements error:', error);
    res.status(500).json({ error: 'Failed to fetch latest announcements' });
  }
};

// Get urgent announcements
const getUrgentAnnouncements = async (req, res) => {
  try {
    const announcements = await Announcement.getUrgent();
    res.json(announcements);
  } catch (error) {
    console.error('Get urgent announcements error:', error);
    res.status(500).json({ error: 'Failed to fetch urgent announcements' });
  }
};

// Get announcement by ID
const getAnnouncementById = async (req, res) => {
  try {
    const { id } = req.params;
    const announcement = await Announcement.findById(id);

    if (!announcement) {
      return res.status(404).json({ error: 'Announcement not found' });
    }

    res.json(announcement);
  } catch (error) {
    console.error('Get announcement error:', error);
    res.status(500).json({ error: 'Failed to fetch announcement' });
  }
};

// Update announcement
const updateAnnouncement = async (req, res) => {
  console.log('[BACKEND] Update announcement - Request received');
  console.log('[BACKEND] Params:', req.params);
  console.log('[BACKEND] Request body:', req.body);
  try {
    const { id } = req.params;
    const { title, message, priority } = req.body;

    console.log('[BACKEND] Parsed update fields:', { title, message, priority });

    const validPriorities = ['low', 'normal', 'important', 'urgent'];
    if (priority && !validPriorities.includes(priority)) {
      console.log('[BACKEND] Validation failed: invalid priority');
      return res.status(400).json({ error: 'Invalid priority. Must be: low, normal, important, or urgent' });
    }

    const updateData = { 
      title, 
      message, 
      priority
    };

    // Remove undefined values
    Object.keys(updateData).forEach(key => {
      if (updateData[key] === undefined) {
        delete updateData[key];
      }
    });

    console.log('[BACKEND] Calling Announcement.update with data:', updateData);
    const result = await Announcement.update(id, updateData);
    console.log('[BACKEND] Announcement.update succeeded');

    if (!result) {
      return res.status(404).json({ error: 'Announcement not found' });
    }

    res.json({
      message: 'Announcement updated successfully'
    });
  } catch (error) {
    console.error('[BACKEND] Update announcement error:', error);
    console.error('[BACKEND] Error details:', error.message, error.code);
    res.status(500).json({ error: 'Failed to update announcement' });
  }
};

// Delete announcement
const deleteAnnouncement = async (req, res) => {
  try {
    const { id } = req.params;

    const announcement = await Announcement.findById(id);
    if (!announcement) {
      return res.status(404).json({ error: 'Announcement not found' });
    }

    await Announcement.delete(id);

    res.json({ message: 'Announcement deleted successfully' });
  } catch (error) {
    console.error('Delete announcement error:', error);
    res.status(500).json({ error: 'Failed to delete announcement' });
  }
};

// Get announcement statistics
const getAnnouncementStatistics = async (req, res) => {
  try {
    const stats = await Announcement.getStatistics();
    res.json(stats);
  } catch (error) {
    console.error('Get announcement statistics error:', error);
    res.status(500).json({ error: 'Failed to fetch announcement statistics' });
  }
};

module.exports = {
  createAnnouncement,
  getAllAnnouncements,
  getLatestAnnouncements,
  getUrgentAnnouncements,
  getAnnouncementById,
  updateAnnouncement,
  deleteAnnouncement,
  getAnnouncementStatistics
};
