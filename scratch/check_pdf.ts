import fs from "fs";
const pdfParse = require("pdf-parse");

async function run() {
  const dataBuffer = fs.readFileSync('scratch/user_uploaded_guidebook.pdf');
  const data = await pdfParse(dataBuffer);
  
  const lines = data.text.split('\n');
  for (let i=0; i<lines.length; i++) {
    if (lines[i].includes('Embodied Energy') || lines[i].includes('EE Credit')) {
      console.log(`Line ${i}: ${lines[i]}`);
    }
  }
}
run();
