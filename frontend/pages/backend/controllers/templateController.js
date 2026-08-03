const fs = require('fs');
const path = require('path');

// Upload PDF template
const uploadTemplate = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }

    // Validate file type
    if (req.file.mimetype !== 'application/pdf') {
      return res.status(400).json({ error: 'Only PDF files are allowed' });
    }

    // Create templates directory if it doesn't exist
    const templatesDir = path.join(__dirname, '../templates');
    if (!fs.existsSync(templatesDir)) {
      fs.mkdirSync(templatesDir, { recursive: true });
    }

    // Save the template
    const templatePath = path.join(templatesDir, 'result-template.pdf');
    
    // Remove existing template if it exists
    if (fs.existsSync(templatePath)) {
      fs.unlinkSync(templatePath);
    }

    // Move uploaded file to templates directory
    fs.renameSync(req.file.path, templatePath);

    res.json({ 
      message: 'Template uploaded successfully',
      templatePath: '/templates/result-template.pdf'
    });
  } catch (error) {
    console.error('Upload template error:', error);
    res.status(500).json({ error: 'Failed to upload template' });
  }
};

// Get current template info
const getTemplateInfo = async (req, res) => {
  try {
    const templatePath = path.join(__dirname, '../templates/result-template.pdf');
    
    if (fs.existsSync(templatePath)) {
      const stats = fs.statSync(templatePath);
      res.json({ 
        hasTemplate: true,
        uploadedAt: stats.mtime,
        size: stats.size
      });
    } else {
      res.json({ hasTemplate: false });
    }
  } catch (error) {
    console.error('Get template info error:', error);
    res.status(500).json({ error: 'Failed to get template info' });
  }
};

// Delete template
const deleteTemplate = async (req, res) => {
  try {
    const templatePath = path.join(__dirname, '../templates/result-template.pdf');
    
    if (fs.existsSync(templatePath)) {
      fs.unlinkSync(templatePath);
      res.json({ message: 'Template deleted successfully' });
    } else {
      res.status(404).json({ error: 'No template found' });
    }
  } catch (error) {
    console.error('Delete template error:', error);
    res.status(500).json({ error: 'Failed to delete template' });
  }
};

module.exports = {
  uploadTemplate,
  getTemplateInfo,
  deleteTemplate
};
