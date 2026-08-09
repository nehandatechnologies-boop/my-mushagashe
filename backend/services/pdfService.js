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
    course_name: { x: 300, y: 600 },
    surname: { x: 300, y: 570 },
    first_name: { x: 300, y: 540 },
    result: { x: 300, y: 510 },
    course_level: { x: 300, y: 480 },
    session: { x: 300, y: 450 },
    overall_decision: { x: 400, y: 100 },
    date: { x: 500, y: 0 }
  },
  // Subject table coordinates - 2 columns: SUBJECT TITLES | GRADE
  // Based on actual template measurements (converted to bottom-left origin)
  // PDF page height = 841.8 pt
  subjectTable: {
    startX: 72.4,           // Table left edge
    gradeX: 248.5,          // Column divider / Grade column start (moved 50 left total)
    tableRight: 523.4,      // Table right edge
    subjectWidth: 176.1,    // Subject column width (adjusted)
    gradeWidth: 274.9,      // Grade column width (adjusted)
    rows: [
      { startY: 390.3, height: 30.8 },   // Row 1 (moved up 20)
      { startY: 359.3, height: 30.6 },   // Row 2 (moved up 20)
      { startY: 326.5, height: 32.4 },   // Row 3 (moved up 20)
      { startY: 293.7, height: 32.4 }    // Row 4 (moved up 20)
    ]
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
    console.log('=== SUBJECT RESULTS DEBUG ===');
    console.log('Subject results count:', subjectResults.length);
    console.log('Subject results data:', JSON.stringify(subjectResults, null, 2));
    console.log('Result data keys:', Object.keys(resultData));
    console.log('Has subject_results?', !!resultData.subject_results);
    console.log('Result ID:', resultData.id);

    // If no subject results from resultData, try fetching directly
    if (subjectResults.length === 0) {
      console.log('No subject results in resultData, trying direct fetch...');
      try {
        const SubjectResult = require('../models/SubjectResult');
        const directSubjectResults = await SubjectResult.findByResultId(resultData.id);
        console.log('Direct fetch subject results:', directSubjectResults);
        console.log('Direct fetch count:', directSubjectResults.length);
        if (directSubjectResults.length > 0) {
          subjectResults.push(...directSubjectResults);
        }
      } catch (error) {
        console.error('Error fetching subject results directly:', error);
      }
    }

    console.log('Final subject results count:', subjectResults.length);
    
    // Calculate overall decision based on grades
    const overallDecision = calculateOverallDecision(subjectResults);

    // Format session (e.g., "MARCH – APRIL 2026")
    const session = formatSession(resultData.semester, resultData.academic_year);

    // Draw debug boxes if debug mode is enabled
    if (DEBUG_MODE) {
      await drawDebugBoxes(page, TEMPLATE_COORDS, subjectResults);
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

    // Session - use actual term
    drawField(page, session, TEMPLATE_COORDS.fields.session, boldFont);

    // Institution - removed from new template
    // drawField(page, 'MUSHAGASHE VTC', TEMPLATE_COORDS.fields.institution, boldFont);

    // Fill subject grades table - 3 columns
    console.log('Filling subject grades...');
    console.log('Subject results array:', subjectResults);
    console.log('Subject results length:', subjectResults.length);

    // Render subject results using exact table cell coordinates
    subjectResults.forEach((sr, index) => {
      console.log(`Subject ${index + 1}: ${sr.subject_name} - ${sr.mark} (${sr.grade})`);

      // Get the row coordinates (limit to 4 rows available in template)
      if (index >= TEMPLATE_COORDS.subjectTable.rows.length) {
        console.log(`Skipping subject ${index + 1} - exceeds available rows`);
        return;
      }

      const row = TEMPLATE_COORDS.subjectTable.rows[index];
      
      // Check if subject failed (mark < 50)
      const mark = parseFloat(sr.mark) || 0;
      const isFailed = mark < 50;
      const failColor = rgb(1, 0, 0); // Red for failed subjects
      const normalColor = rgb(0, 0, 0); // Black for passed subjects

      // Subject Title - aligned left with padding, vertically centered in box
      page.drawText((sr.subject_name || '').toUpperCase(), {
        x: TEMPLATE_COORDS.subjectTable.startX + 5, // 5pt padding
        y: row.startY + (row.height / 2), // Vertically centered
        size: TEMPLATE_COORDS.fontSize,
        font: font,
        color: normalColor,
      });

      // Grade - centered in grade box, vertically centered
      const gradeText = sr.grade || 'N/A';
      const gradeWidth = boldFont.widthOfTextAtSize(gradeText, TEMPLATE_COORDS.fontSize);
      page.drawText(gradeText, {
        x: TEMPLATE_COORDS.subjectTable.gradeX + (TEMPLATE_COORDS.subjectTable.gradeWidth / 2) - (gradeWidth / 2), // Centered horizontally
        y: row.startY + (row.height / 2), // Vertically centered
        size: TEMPLATE_COORDS.fontSize,
        font: boldFont,
        color: isFailed ? failColor : normalColor,
      });
    });

    // Overall Decision - removed from new template
    // drawField(page, overallDecision, TEMPLATE_COORDS.fields.overall_decision, boldFont);

    // Date - removed from new template
    // const currentDate = new Date();
    // const dateStr = `${currentDate.getDate()}/${currentDate.getMonth() + 1}/${currentDate.getFullYear()}`;
    // console.log('Date:', dateStr);
    // drawField(page, dateStr, TEMPLATE_COORDS.fields.date, font);

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
 * @param {Array} subjectResults - Array of subject results to draw cell boxes
 */
async function drawDebugBoxes(page, coords, subjectResults = []) {
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
  
  // Draw individual blue boxes for each subject result element
  // Each box must match the exact cell dimensions of the table
  // Based on actual template measurements
  
  // Draw boxes for each of the 4 available subject rows
  coords.subjectTable.rows.forEach((row, index) => {
    // SUBJECT BOX - matches Subject column cell
    page.drawRectangle({
      x: coords.subjectTable.startX,
      y: row.startY,
      width: coords.subjectTable.subjectWidth,
      height: row.height,
      borderColor: rgb(0, 0, 1),
      borderWidth: 1,
      strokeOpacity: 0.5,
    });
    page.drawText(`SUBJECT ${index + 1}`, {
      x: coords.subjectTable.startX,
      y: row.startY + row.height + 5,
      size: 8,
      color: rgb(0, 0, 1),
    });
    
    // GRADE BOX - matches Grade column cell
    page.drawRectangle({
      x: coords.subjectTable.gradeX,
      y: row.startY,
      width: coords.subjectTable.gradeWidth,
      height: row.height,
      borderColor: rgb(0, 0, 1),
      borderWidth: 1,
      strokeOpacity: 0.5,
    });
    page.drawText(`GRADE ${index + 1}`, {
      x: coords.subjectTable.gradeX,
      y: row.startY + row.height + 5,
      size: 8,
      color: rgb(0, 0, 1),
    });
  });
}

/**
 * Calculate overall decision based on subject marks
 * @param {Array} subjectResults - Array of subject results
 * @returns {String} - Overall decision (PASS, FAIL)
 */
function calculateOverallDecision(subjectResults) {
  if (!subjectResults || subjectResults.length === 0) {
    return 'FAIL';
  }

  // Check if all subjects have marks >= 50%
  const allPassed = subjectResults.every(sr => {
    const mark = parseFloat(sr.mark) || 0;
    return mark >= 50;
  });

  return allPassed ? 'PASS' : 'FAIL';
}

/**
 * Format session string based on semester
 * @param {Number} semester - Semester number (1, 2, or 3)
 * @param {Number} academicYear - Academic year
 * @returns {String} - Formatted session string (Term 1, Term 2, etc.)
 */
function formatSession(semester, academicYear) {
  return `TERM ${semester}`;
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
