const fs = require('fs');
const PDFDocument = require('pdfkit');
const JSZip = require('jszip');
const ExcelJS = require('exceljs');

async function createPDF() {
  const doc = new PDFDocument();
  doc.pipe(fs.createWriteStream('Layout.pdf'));
  doc.fontSize(25).text('Architectural Layout - EDA C1', 100, 100);
  doc.fontSize(12).text('The design documents indicate preservation of existing site features as required by EDA C1.', 100, 150);
  doc.end();
}

async function createDocx() {
  const zip = new JSZip();
  // DocumentParser looks for word/document.xml and extracts text from <w:t> tags
  const xml = `
    <?xml version="1.0" encoding="UTF-8" standalone="yes"?>
    <w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">
      <w:body>
        <w:p><w:r><w:t>Narrative for Site Preservation</w:t></w:r></w:p>
        <w:p><w:r><w:t>This narrative explains the preservation strategy for the site, protecting existing vegetation.</w:t></w:r></w:p>
      </w:body>
    </w:document>
  `;
  zip.file("word/document.xml", xml);
  const content = await zip.generateAsync({ type: "nodebuffer" });
  fs.writeFileSync('Narrative.docx', content);
}

async function createXlsx() {
  const workbook = new ExcelJS.Workbook();
  const sheet = workbook.addWorksheet('Water Calculations');
  sheet.addRow(['Fixture', 'Flow Rate', 'Quantity']);
  sheet.addRow(['WC', '3.0 LPF', 10]);
  sheet.addRow(['Urinal', '1.0 LPF', 5]);
  sheet.addRow(['Faucets', '2.0 LPM', 20]);
  sheet.addRow(['Result', '35% Reduction achieved', '']);
  await workbook.xlsx.writeFile('WaterCalculation.xlsx');
}

function createImage() {
  // A tiny valid 1x1 GIF to be safe, or just random buffer if parser doesn't check
  // But let's just use a string because parseImage doesn't read the buffer
  fs.writeFileSync('SitePhoto.jpg', 'fake image data');
}

async function run() {
  createPDF();
  await createDocx();
  await createXlsx();
  createImage();
  console.log("Files generated: Layout.pdf, Narrative.docx, WaterCalculation.xlsx, SitePhoto.jpg");
}

run().catch(console.error);
