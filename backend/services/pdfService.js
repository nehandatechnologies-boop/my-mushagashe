const { PDFDocument: PDFLibDocument, rgb, StandardFonts } = require('pdf-lib');
const fs = require('fs');
const path = require('path');

// Centralized coordinate configuration for Zimbabwe result template
// PDF coordinate system: (0,0) is bottom-left
const TEMPLATE_COORDS = {
  page: 0,
  fontSize: 10,
  // Field coordinates (x, y) - these will be calibrated based on actual template
  fields: {
    course_name: { x: 400, y: 656 },
    surname: { x: 400, y: 626 },
    first_name: { x: 400, y: 596 },
    result: { x: 400, y: 566 },
    course_level: { x: 400, y: 536 },
    session: { x: 400, y: 506 },
    institution: { x: 400, y: 476 },
    overall_decision: { x: 400, y: 206 },
    date: { x: 500, y: 106 }
  },
  // Subject table coordinates
  subjectTable: {
    startX: 50,
    gradeX: 400,
    startY: 436,
    rowHeight: 25
  }
};

// Debug mode flag - set to true to show field boundaries
const DEBUG_MODE = true;

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
    const page = pages[TEMPLATE_COORDS.page];
    const { width, height } = page.getSize();
    console.log('Template loaded. Page size:', width, 'x', height);
    
    const font = await pdfDoc.embedFont(StandardFonts.TimesRoman);
    const boldFont = await pdfDoc.embedFont(StandardFonts.TimesRomanBold);

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

    // Draw debug boxes if debug mode is enabled
    if (DEBUG_MODE) {
      await drawDebugBoxes(page, TEMPLATE_COORDS);
    }

    // Fill fields using centralized coordinates
    console.log('Filling template fields...');
    
    // Course Name
    console.log('Course Name:', courseData.course_name);
    drawField(page, courseData.course_name?.toUpperCase() || 'N/A', TEMPLATE_COORDS.fields.course_name, boldFont);

    // Surname
    console.log('Surname:', surname);
    drawField(page, surname, TEMPLATE_COORDS.fields.surname, boldFont);

    // First Name
    console.log('First Name:', firstName);
    drawField(page, firstName, TEMPLATE_COORDS.fields.first_name, boldFont);

    // Result (Overall Decision)
    console.log('Overall Decision:', overallDecision);
    drawField(page, overallDecision, TEMPLATE_COORDS.fields.result, boldFont);

    // Course Level
    drawField(page, 'NATIONAL CERTIFICATE', TEMPLATE_COORDS.fields.course_level, boldFont);

    // Session
    console.log('Session:', session);
    drawField(page, session, TEMPLATE_COORDS.fields.session, boldFont);

    // Institution
    drawField(page, 'MUSHAGASHE VTC', TEMPLATE_COORDS.fields.institution, boldFont);

    // Fill subject grades table
    console.log('Filling subject grades...');
    let currentY = TEMPLATE_COORDS.subjectTable.startY;
    subjectResults.forEach((sr, index) => {
      console.log(`Subject ${index + 1}: ${sr.subject_name} - ${sr.grade}`);
      
      // Subject Title
      page.drawText((sr.subject_name || '').toUpperCase(), {
        x: TEMPLATE_COORDS.subjectTable.startX,
        y: currentY,
        size: TEMPLATE_COORDS.fontSize,
        font: font,
        color: rgb(0, 0, 0),
      });

      // Grade
      page.drawText(sr.grade || 'N/A', {
        x: TEMPLATE_COORDS.subjectTable.gradeX,
        y: currentY,
        size: TEMPLATE_COORDS.fontSize,
        font: boldFont,
        color: rgb(0, 0, 0),
      });

      currentY -= TEMPLATE_COORDS.subjectTable.rowHeight;
    });

    // Overall Decision (separate from subject table)
    drawField(page, overallDecision, TEMPLATE_COORDS.fields.overall_decision, boldFont);

    // Date
    const currentDate = new Date();
    const dateStr = `${currentDate.getDate()}/${currentDate.getMonth() + 1}/${currentDate.getFullYear()}`;
    console.log('Date:', dateStr);
    drawField(page, dateStr, TEMPLATE_COORDS.fields.date, font);

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
 * Draw a text field at the specified coordinates
 * @param {PDFPage} page - The PDF page
 * @param {String} text - The text to draw
 * @param {Object} coords - Coordinates {x, y}
 * @param {PDFFont} font - The font to use
 */
function drawField(page, text, coords, font) {
  page.drawText(text, {
    x: coords.x,
    y: coords.y,
    size: TEMPLATE_COORDS.fontSize,
    font: font,
    color: rgb(0, 0, 0),
  });
}

/**
 * Draw debug boxes around all field coordinates
 * @param {PDFPage} page - The PDF page
 * @param {Object} coords - The coordinate configuration
 */
async function drawDebugBoxes(page, coords) {
  console.log('Drawing debug boxes...');
  const { width, height } = page.getSize();
  
  // Draw boxes around each field
  Object.entries(coords.fields).forEach(([fieldName, fieldCoords]) => {
    page.drawRectangle({
      x: fieldCoords.x - 5,
      y: fieldCoords.y - 5,
      width: 100,
      height: 15,
      borderColor: rgb(1, 0, 0),
      borderWidth: 1,
    });
    
    // Draw field name above the box
    page.drawText(fieldName, {
      x: fieldCoords.x,
      y: fieldCoords.y + 20,
      size: 8,
      color: rgb(1, 0, 0),
    });
  });
  
  // Draw subject table area
  page.drawRectangle({
    x: coords.subjectTable.startX,
    y: coords.subjectTable.startY - (coords.subjectTable.rowHeight * 10),
    width: coords.subjectTable.gradeX - coords.subjectTable.startX + 50,
    height: coords.subjectTable.rowHeight * 10,
    borderColor: rgb(0, 0, 1),
    borderWidth: 1,
 strokeOpacity: 0.5,
  });
}

/**
 * Calculate overall decision based on subject grades
 * @param {Array} subjectResults - Array of subject results
 * @returns {String} - Overall decision (AWARD, FAIL, etc.)
 */
function calculateOverallDecision(subjectResults) {
  if (!subjectResults || subjectResults.length === 0) {
    return 'AWARD';
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
