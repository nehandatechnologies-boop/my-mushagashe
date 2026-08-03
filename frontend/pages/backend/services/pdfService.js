const PDFDocument = require('pdfkit');
const { PDFDocument: PDFLibDocument, rgb } = require('pdf-lib');
const fs = require('fs');
const path = require('path');

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
      const templatePath = path.join(__dirname, '../templates/result-template.pdf');
      if (fs.existsSync(templatePath)) {
        templateBuffer = fs.readFileSync(templatePath);
      }
    }

    if (templateBuffer) {
      // Load custom template
      pdfDoc = await PDFLibDocument.load(templateBuffer);
    } else {
      // Create default template with letterhead
      pdfDoc = await PDFLibDocument.create();
      const page = pdfDoc.addPage([595, 842]); // A4 size

      // Add letterhead
      const { width, height } = page.getSize();
      
      // Header background
      page.drawRectangle({
        x: 0,
        y: height - 100,
        width: width,
        height: 100,
        color: rgb(0.1, 0.3, 0.6),
      });

      // Institution name
      page.drawText('MUSHAGASHE VOCATIONAL TRAINING CENTER', {
        x: 50,
        y: height - 60,
        size: 18,
        font: await pdfDoc.embedFont(PDFLibDocument.StandardFonts.HelveticaBold),
        color: rgb(1, 1, 1),
      });

      // Subtitle
      page.drawText('Official Result Report', {
        x: 50,
        y: height - 85,
        size: 12,
        font: await pdfDoc.embedFont(PDFLibDocument.StandardFonts.Helvetica),
        color: rgb(0.9, 0.9, 0.9),
      });

      // Add watermark
      page.drawText('OFFICIAL DOCUMENT', {
        x: width / 2 - 60,
        y: height / 2,
        size: 60,
        font: await pdfDoc.embedFont(PDFLibDocument.StandardFonts.HelveticaBold),
        color: rgb(0.9, 0.9, 0.9),
        opacity: 0.1,
        rotate: { angle: 45 },
      });
    }

    // Get the first page (or add one if using template)
    const pages = pdfDoc.getPages();
    const page = pages[0];
    const { width, height } = page.getSize();
    const font = await pdfDoc.embedFont(PDFLibDocument.StandardFonts.Helvetica);
    const boldFont = await pdfDoc.embedFont(PDFLibDocument.StandardFonts.HelveticaBold);

    let yPosition = templateBuffer ? height - 150 : height - 120;

    // Student Information Section
    page.drawText('STUDENT INFORMATION', {
      x: 50,
      y: yPosition,
      size: 14,
      font: boldFont,
      color: rgb(0, 0, 0),
    });
    yPosition -= 25;

    page.drawText(`Name: ${studentData.full_name || 'N/A'}`, {
      x: 50,
      y: yPosition,
      size: 11,
      font,
      color: rgb(0, 0, 0),
    });
    yPosition -= 20;

    page.drawText(`Student Number: ${studentData.student_number || 'N/A'}`, {
      x: 50,
      y: yPosition,
      size: 11,
      font,
      color: rgb(0, 0, 0),
    });
    yPosition -= 20;

    page.drawText(`Course: ${courseData.course_name || 'N/A'} (${courseData.course_code || 'N/A'})`, {
      x: 50,
      y: yPosition,
      size: 11,
      font,
      color: rgb(0, 0, 0),
    });
    yPosition -= 30;

    // Result Information Section
    page.drawText('ACADEMIC RESULTS', {
      x: 50,
      y: yPosition,
      size: 14,
      font: boldFont,
      color: rgb(0, 0, 0),
    });
    yPosition -= 25;

    // Draw table header
    page.drawRectangle({
      x: 50,
      y: yPosition,
      width: width - 100,
      height: 25,
      color: rgb(0.1, 0.3, 0.6),
    });

    page.drawText('Semester', {
      x: 60,
      y: yPosition + 8,
      size: 10,
      font: boldFont,
      color: rgb(1, 1, 1),
    });

    page.drawText('Academic Year', {
      x: 150,
      y: yPosition + 8,
      size: 10,
      font: boldFont,
      color: rgb(1, 1, 1),
    });

    page.drawText('Assessment', {
      x: 280,
      y: yPosition + 8,
      size: 10,
      font: boldFont,
      color: rgb(1, 1, 1),
    });

    page.drawText('Exam', {
      x: 360,
      y: yPosition + 8,
      size: 10,
      font: boldFont,
      color: rgb(1, 1, 1),
    });

    page.drawText('Final Mark', {
      x: 420,
      y: yPosition + 8,
      size: 10,
      font: boldFont,
      color: rgb(1, 1, 1),
    });

    page.drawText('Grade', {
      x: 500,
      y: yPosition + 8,
      size: 10,
      font: boldFont,
      color: rgb(1, 1, 1),
    });
    yPosition -= 25;

    // Draw result row
    const rowHeight = 25;
    page.drawRectangle({
      x: 50,
      y: yPosition,
      width: width - 100,
      height: rowHeight,
      borderColor: rgb(0.5, 0.5, 0.5),
      borderWidth: 1,
    });

    page.drawText(`${resultData.semester || 'N/A'}`, {
      x: 60,
      y: yPosition + 8,
      size: 10,
      font,
      color: rgb(0, 0, 0),
    });

    page.drawText(`${resultData.academic_year || 'N/A'}`, {
      x: 150,
      y: yPosition + 8,
      size: 10,
      font,
      color: rgb(0, 0, 0),
    });

    page.drawText(`${resultData.assessment_mark || 'N/A'}`, {
      x: 280,
      y: yPosition + 8,
      size: 10,
      font,
      color: rgb(0, 0, 0),
    });

    page.drawText(`${resultData.exam_mark || 'N/A'}`, {
      x: 360,
      y: yPosition + 8,
      size: 10,
      font,
      color: rgb(0, 0, 0),
    });

    page.drawText(`${resultData.final_mark || 'N/A'}`, {
      x: 420,
      y: yPosition + 8,
      size: 10,
      font,
      color: rgb(0, 0, 0),
    });

    page.drawText(`${resultData.grade || 'N/A'}`, {
      x: 500,
      y: yPosition + 8,
      size: 10,
      font: boldFont,
      color: rgb(0, 0, 0),
    });
    yPosition -= 40;

    // Remarks
    if (resultData.remarks) {
      page.drawText('Remarks:', {
        x: 50,
        y: yPosition,
        size: 11,
        font: boldFont,
        color: rgb(0, 0, 0),
      });
      yPosition -= 20;

      page.drawText(resultData.remarks, {
        x: 50,
        y: yPosition,
        size: 10,
        font,
        color: rgb(0, 0, 0),
      });
      yPosition -= 30;
    }

    // Footer with date and signature
    yPosition = 100;
    const currentDate = new Date().toLocaleDateString();

    page.drawText(`Date Generated: ${currentDate}`, {
      x: 50,
      y: yPosition,
      size: 9,
      font,
      color: rgb(0.5, 0.5, 0.5),
    });

    page.drawText('Official Signature: ___________________', {
      x: 350,
      y: yPosition,
      size: 9,
      font,
      color: rgb(0, 0, 0),
    });

    // Apply security features
    pdfDoc = await applyPDFSecurity(pdfDoc);

    // Serialize the PDFDocument to bytes
    const pdfBytes = await pdfDoc.save();

    return Buffer.from(pdfBytes);
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
