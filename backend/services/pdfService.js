const PDFDocument = require('pdfkit');
const { PDFDocument: PDFLibDocument, rgb, StandardFonts } = require('pdf-lib');
const fs = require('fs');
const path = require('path');

/**
 * Generate PDF using Zimbabwe Ministry template format
 * @param {Object} studentData - Student information
 * @param {Object} resultData - Result information
 * @param {Object} courseData - Course information
 * @param {Buffer} templateBuffer - Template PDF buffer
 * @returns {Promise<Buffer>} - Filled PDF buffer
 */
async function generateZimbabweResultPDF(studentData, resultData, courseData, templateBuffer) {
  try {
    console.log('Loading Zimbabwe template...');
    let pdfDoc = await PDFLibDocument.load(templateBuffer);
    const pages = pdfDoc.getPages();
    const page = pages[0];
    const { width, height } = page.getSize();
    console.log('Template loaded. Page size:', width, 'x', height);
    
    const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
    const boldFont = await pdfDoc.embedFont(StandardFonts.HelveticaBold);

    // Parse student name into surname and first name
    const nameParts = (studentData.full_name || '').split(' ');
    const surname = nameParts.length > 0 ? nameParts[nameParts.length - 1].toUpperCase() : '';
    const firstName = nameParts.length > 1 ? nameParts.slice(0, -1).join(' ').toUpperCase() : nameParts[0]?.toUpperCase() || '';

    // Get subject results
    const subjectResults = resultData.subject_results || [];
    console.log('Subject results:', subjectResults.length);
    
    // Calculate overall decision based on grades
    const overallDecision = calculateOverallDecision(subjectResults);

    // Format session (e.g., "MARCH – APRIL 2026")
    const session = formatSession(resultData.semester, resultData.academic_year);

  // Fill in the template fields with conservative coordinates
  console.log('Filling template fields...');
  
  // Course Name - center area
  console.log('Course Name:', courseData.course_name);
  page.drawText(courseData.course_name?.toUpperCase() || 'N/A', {
    x: 100,
    y: height - 157,
    size: 12,
    font: boldFont,
    color: rgb(0, 0, 0),
  });

  // Surname
  console.log('Surname:', surname);
  page.drawText(surname, {
    x: 100,
    y: height - 187,
    size: 12,
    font: boldFont,
    color: rgb(0, 0, 0),
  });

  // First Name
  console.log('First Name:', firstName);
  page.drawText(firstName, {
    x: 100,
    y: height - 217,
    size: 12,
    font: boldFont,
    color: rgb(0, 0, 0),
  });

  // Result (Overall Decision)
  console.log('Overall Decision:', overallDecision);
  page.drawText(overallDecision, {
    x: 100,
    y: height - 247,
    size: 12,
    font: boldFont,
    color: rgb(0, 0, 0),
  });

  // Course Level
  page.drawText('NATIONAL CERTIFICATE', {
    x: 100,
    y: height - 277,
    size: 12,
    font: boldFont,
    color: rgb(0, 0, 0),
  });

  // Session
  console.log('Session:', session);
  page.drawText(session, {
    x: 100,
    y: height - 307,
    size: 12,
    font: boldFont,
    color: rgb(0, 0, 0),
  });

  // Institution
  page.drawText('MUSHAGASHE VTC', {
    x: 100,
    y: height - 337,
    size: 12,
    font: boldFont,
    color: rgb(0, 0, 0),
  });

  // Fill subject grades table
  let subjectY = height - 387;
  console.log('Filling subject grades...');
  subjectResults.forEach((sr, index) => {
    console.log(`Subject ${index + 1}: ${sr.subject_name} - ${sr.grade}`);
    // Subject Title
    page.drawText((sr.subject_name || '').toUpperCase(), {
      x: 50,
      y: subjectY,
      size: 12,
      font,
      color: rgb(0, 0, 0),
    });

    // Grade
    page.drawText(sr.grade || 'N/A', {
      x: 400,
      y: subjectY,
      size: 12,
      font: boldFont,
      color: rgb(0, 0, 0),
    });

    subjectY -= 25;
  });

  // Overall Decision
  page.drawText(overallDecision, {
    x: 100,
    y: height - 507,
    size: 12,
    font: boldFont,
    color: rgb(0, 0, 0),
  });

  // Date
  const currentDate = new Date();
  const dateStr = `${currentDate.getDate()}/${currentDate.getMonth() + 1}/${currentDate.getFullYear()}`;
  console.log('Date:', dateStr);
  page.drawText(dateStr, {
    x: 400,
    y: height - 607,
    size: 12,
    font,
    color: rgb(0, 0, 0),
  });

  console.log('Applying security features...');
  // Apply security features
  pdfDoc = await applyPDFSecurity(pdfDoc);

  console.log('Saving PDF...');
  const pdfBytes = await pdfDoc.save();
  console.log('PDF saved, size:', pdfBytes.length);
  return Buffer.from(pdfBytes);
  } catch (error) {
    console.error('Error in generateZimbabweResultPDF:', error);
    throw error;
  }
}

/**
 * Calculate overall decision based on subject grades
 * @param {Array} subjectResults - Array of subject results
 * @returns {String} - Overall decision (AWARD, FAIL, etc.)
 */
function calculateOverallDecision(subjectResults) {
  if (!subjectResults || subjectResults.length === 0) {
    return 'N/A';
  }

  const failCount = subjectResults.filter(sr => sr.grade === 'F').length;
  const passCount = subjectResults.filter(sr => ['D', 'M', 'C', 'P'].includes(sr.grade)).length;

  if (failCount > 0) {
    return 'FAIL';
  }
  if (passCount === subjectResults.length) {
    return 'AWARD';
  }
  return 'SUPPLEMENTARY';
}

/**
 * Format session string based on semester and year
 * @param {Number} semester - Semester number (1, 2, or 3)
 * @param {Number} academicYear - Academic year
 * @returns {String} - Formatted session string
 */
function formatSession(semester, academicYear) {
  const months = {
    1: 'JANUARY – FEBRUARY',
    2: 'MARCH – APRIL',
    3: 'MAY – JUNE',
    4: 'JULY – AUGUST',
    5: 'SEPTEMBER – OCTOBER',
    6: 'NOVEMBER – DECEMBER'
  };
  
  const monthRange = months[semester] || 'MARCH – APRIL';
  return `${monthRange} ${academicYear}`;
}

/**
 * Generate a secure PDF result report with letterhead template
 * @param {Object} studentData - Student information
 * @param {Object} resultData - Result information
 * @param {Object} courseData - Course information
 * @param {Buffer} templateBuffer - Optional custom template PDF buffer
 * @returns {Promise<Buffer>} - Secure PDF buffer
 */
async function generateResultPDF(studentData, resultData, courseData, templateBuffer = null) {
  try {
    let pdfDoc;

    // Check if custom template is provided or exists in templates directory
    if (!templateBuffer) {
      const templatePath = path.join(__dirname, '../templates/student results.pdf');
      console.log('=== PDF Template Debug ===');
      console.log('Looking for template at:', templatePath);
      console.log('Template exists:', fs.existsSync(templatePath));
      
      if (fs.existsSync(templatePath)) {
        try {
          templateBuffer = fs.readFileSync(templatePath);
          console.log('Template loaded successfully, size:', templateBuffer.length);
        } catch (readError) {
          console.error('Error reading template file:', readError);
        }
      } else {
        console.log('Template file not found at path');
      }
    }

    if (templateBuffer) {
      // Load custom template and fill with Zimbabwe format
      console.log('=== Using Zimbabwe Template ===');
      console.log('Template buffer size:', templateBuffer.length);
      return await generateZimbabweResultPDF(studentData, resultData, courseData, templateBuffer);
    } else {
      console.log('=== No template found - ERROR ===');
      throw new Error('PDF template not found. Please upload the template file to the templates directory.');
    }
  } catch (error) {
    console.error('Error generating PDF:', error);
    throw new Error('Failed to generate PDF');
  }
}

/**
 * Apply security features to PDF to prevent editing and conversion
 * @param {PDFDocument} pdfDoc - The PDF document to secure
 * @returns {Promise<PDFDocument>} - Secured PDF document
 */
async function applyPDFSecurity(pdfDoc) {
  // Note: pdf-lib has limited encryption support in the free version
  // For full security, we would need a commercial library like hummusjs
  
  // Add metadata to indicate this is an official document
  pdfDoc.setTitle('Official Result Report - Mushagashe Vocational Training Center');
  pdfDoc.setAuthor('Mushagashe Vocational Training Center');
  pdfDoc.setSubject('Student Academic Result');
  pdfDoc.setKeywords(['result', 'official', 'academic']);
  pdfDoc.setProducer('Mushagashe VTC System');
  pdfDoc.setCreator('Mushagashe VTC System');

  // Note: For production use with full security, consider:
  // 1. Using a commercial PDF library with AES-256 encryption
  // 2. Adding digital signatures
  // 3. Using DRM solutions
  
  return pdfDoc;
}

module.exports = {
  generateResultPDF,
  applyPDFSecurity
};
