const fs = require('fs');
const path = require('path');
const { Document, Packer, Paragraph, TextRun, Table, TableRow, TableCell, WidthType, AlignmentType } = require('docx');
const libre = require('libreoffice-convert');
const { PDFDocument, rgb } = require('pdf-lib');

/**
 * Fill Word template with student result data
 * @param {Object} studentData - Student information
 * @param {Object} resultData - Result information
 * @param {Object} courseData - Course information
 * @returns {Promise<Buffer>} - Filled Word document buffer
 */
async function fillWordTemplate(studentData, resultData, courseData) {
  try {
    console.log('Filling Word template with student data...');
    
    // Parse student name
    const nameParts = (studentData.full_name || '').split(' ');
    const surname = nameParts.length > 0 ? nameParts[nameParts.length - 1].toUpperCase() : '';
    const firstName = nameParts.length > 1 ? nameParts.slice(0, -1).join(' ').toUpperCase() : nameParts[0]?.toUpperCase() || '';

    // Get subject results
    const subjectResults = resultData.subject_results || [];
    
    // Calculate overall decision
    const overallDecision = calculateOverallDecision(subjectResults);

    // Format session
    const session = formatSession(resultData.semester, resultData.academic_year);

    // Create document with Zimbabwe Ministry format
    const doc = new Document({
      sections: [{
        properties: {},
        children: [
          // Header
          new Paragraph({
            text: 'ZIMBABWE',
            alignment: AlignmentType.CENTER,
            spacing: { after: 100 },
            children: [
              new TextRun({
                text: 'ZIMBABWE',
                bold: true,
                size: 28,
              })
            ]
          }),
          new Paragraph({
            text: 'MINISTRY OF YOUTH, EMPOWERMENT, DEVELOPMENT AND VOCATIONAL TRAINING',
            alignment: AlignmentType.CENTER,
            spacing: { after: 200 },
            children: [
              new TextRun({
                text: 'MINISTRY OF YOUTH, EMPOWERMENT, DEVELOPMENT AND VOCATIONAL TRAINING',
                bold: true,
                size: 24,
              })
            ]
          }),
          new Paragraph({
            text: 'CONFIRMATION OF RESULTS',
            alignment: AlignmentType.CENTER,
            spacing: { after: 400 },
            children: [
              new TextRun({
                text: 'CONFIRMATION OF RESULTS',
                bold: true,
                size: 32,
                underline: true,
              })
            ]
          }),

          // Student Information Table
          new Paragraph({
            text: 'COURSE NAME',
            spacing: { before: 200 },
            children: [new TextRun({ text: 'COURSE NAME', bold: true })]
          }),
          new Paragraph({
            text: courseData.course_name?.toUpperCase() || 'N/A',
            spacing: { after: 200 },
            tabStops: [{ type: 'right', position: 7000 }],
            children: [new TextRun({ text: courseData.course_name?.toUpperCase() || 'N/A', bold: true })]
          }),

          new Paragraph({
            text: 'SURNAME',
            children: [new TextRun({ text: 'SURNAME', bold: true })]
          }),
          new Paragraph({
            text: surname,
            spacing: { after: 200 },
            tabStops: [{ type: 'right', position: 7000 }],
            children: [new TextRun({ text: surname, bold: true })]
          }),

          new Paragraph({
            text: 'FIRST NAME',
            children: [new TextRun({ text: 'FIRST NAME', bold: true })]
          }),
          new Paragraph({
            text: firstName,
            spacing: { after: 200 },
            tabStops: [{ type: 'right', position: 7000 }],
            children: [new TextRun({ text: firstName, bold: true })]
          }),

          new Paragraph({
            text: 'RESULT',
            children: [new TextRun({ text: 'RESULT', bold: true })]
          }),
          new Paragraph({
            text: overallDecision,
            spacing: { after: 200 },
            tabStops: [{ type: 'right', position: 7000 }],
            children: [new TextRun({ text: overallDecision, bold: true })]
          }),

          new Paragraph({
            text: 'COURSE LEVEL',
            children: [new TextRun({ text: 'COURSE LEVEL', bold: true })]
          }),
          new Paragraph({
            text: 'NATIONAL CERTIFICATE',
            spacing: { after: 200 },
            tabStops: [{ type: 'right', position: 7000 }],
            children: [new TextRun({ text: 'NATIONAL CERTIFICATE', bold: true })]
          }),

          new Paragraph({
            text: 'SESSION',
            children: [new TextRun({ text: 'SESSION', bold: true })]
          }),
          new Paragraph({
            text: session,
            spacing: { after: 200 },
            tabStops: [{ type: 'right', position: 7000 }],
            children: [new TextRun({ text: session, bold: true })]
          }),

          new Paragraph({
            text: 'INSTITUTION',
            children: [new TextRun({ text: 'INSTITUTION', bold: true })]
          }),
          new Paragraph({
            text: 'MUSHAGASHE VTC',
            spacing: { after: 400 },
            tabStops: [{ type: 'right', position: 7000 }],
            children: [new TextRun({ text: 'MUSHAGASHE VTC', bold: true })]
          }),

          // Subject Grades Table
          new Paragraph({
            text: 'SUBJECT TITLES\tGRADE',
            spacing: { before: 200 },
            tabStops: [{ type: 'right', position: 7000 }],
            children: [
              new TextRun({ text: 'SUBJECT TITLES', bold: true }),
              new TextRun({ text: '\tGRADE', bold: true })
            ]
          }),

          ...subjectResults.map(sr => 
            new Paragraph({
              text: `${sr.subject_name?.toUpperCase() || 'N/A'}\t${sr.grade || 'N/A'}`,
              tabStops: [{ type: 'right', position: 7000 }],
              children: [
                new TextRun({ text: sr.subject_name?.toUpperCase() || 'N/A' }),
                new TextRun({ text: `\t${sr.grade || 'N/A'}`, bold: true })
              ]
            })
          ),

          // Overall Decision
          new Paragraph({
            text: 'OVERALL DECISION',
            spacing: { before: 400 },
            children: [new TextRun({ text: 'OVERALL DECISION', bold: true })]
          }),
          new Paragraph({
            text: overallDecision,
            spacing: { after: 400 },
            tabStops: [{ type: 'right', position: 7000 }],
            children: [new TextRun({ text: overallDecision, bold: true, size: 28 })]
          }),

          // Grading System
          new Paragraph({
            text: 'SUBJECT GRADING SYSTEM',
            spacing: { before: 400 },
            children: [new TextRun({ text: 'SUBJECT GRADING SYSTEM', bold: true })]
          }),
          new Paragraph({ text: '80%-100%\t\tDistinction ………………………….  D', tabStops: [{ type: 'right', position: 7000 }] }),
          new Paragraph({ text: '70%-79%\t\tMerit ………………………………….. M', tabStops: [{ type: 'right', position: 7000 }] }),
          new Paragraph({ text: '60%-69%\t\tCredit…………………………………… C', tabStops: [{ type: 'right', position: 7000 }] }),
          new Paragraph({ text: '50%- 59%\t\tPass ……………………………………… P', tabStops: [{ type: 'right', position: 7000 }] }),
          new Paragraph({ text: '49% and below\t\tFail………………………………………. F', tabStops: [{ type: 'right', position: 7000 }] }),
          new Paragraph({ text: '\t\tSupplementary……………………   S', tabStops: [{ type: 'right', position: 7000 }] }),
          new Paragraph({ text: '\t\tDisqualified…………………………   Dis', tabStops: [{ type: 'right', position: 7000 }], spacing: { after: 400 } }),

          // Signature
          new Paragraph({
            text: `Principal's Signature……………………………………………………\tDate………../…………../…………`,
            spacing: { before: 400 },
            tabStops: [{ type: 'right', position: 7000 }],
            children: [
              new TextRun({ text: "Principal's Signature……………………………………………………" }),
              new TextRun({ text: '\tDate………../…………./…………' })
            ]
          }),

          // Disclaimer
          new Paragraph({
            text: '**Please note that this transcript is not a certificate and is issued without any alteration.',
            spacing: { before: 400, after: 200 },
            italics: true,
            children: [new TextRun({ text: '**Please note that this transcript is not a certificate and is issued without any alteration.', italics: true })]
          }),
        ],
      }],
    });

    const buffer = await Packer.toBuffer(doc);
    console.log('Word document created, size:', buffer.length);
    return buffer;
  } catch (error) {
    console.error('Error filling Word template:', error);
    throw error;
  }
}

/**
 * Convert Word document to PDF with security
 * @param {Buffer} wordBuffer - Word document buffer
 * @returns {Promise<Buffer>} - Secured PDF buffer
 */
async function convertWordToPDF(wordBuffer) {
  return new Promise((resolve, reject) => {
    try {
      console.log('Converting Word to PDF...');
      const outputPath = path.join(__dirname, '../temp/output.pdf');
      const tempDir = path.join(__dirname, '../temp');
      
      // Create temp directory if it doesn't exist
      if (!fs.existsSync(tempDir)) {
        fs.mkdirSync(tempDir, { recursive: true });
      }

      libre.convert(wordBuffer, '.pdf', undefined, (err, done) => {
        if (err) {
          console.error('LibreOffice conversion error:', err);
          reject(err);
          return;
        }
        
        console.log('Word converted to PDF');
        const pdfBuffer = Buffer.from(done);
        
        // Clean up temp file
        if (fs.existsSync(outputPath)) {
          fs.unlinkSync(outputPath);
        }
        
        resolve(pdfBuffer);
      });
    } catch (error) {
      console.error('Error in convertWordToPDF:', error);
      reject(error);
    }
  });
}

/**
 * Calculate overall decision based on subject grades
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
 * Format session string
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

module.exports = {
  fillWordTemplate,
  convertWordToPDF
};
