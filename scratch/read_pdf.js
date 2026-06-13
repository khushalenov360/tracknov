const fs = require('fs');
const pdf = require('pdf-parse');

let dataBuffer = fs.readFileSync('scratch/user_uploaded_guidebook.pdf');

pdf(dataBuffer).then(function(data) {
  // number of pages
  console.log(data.numpages);
  // number of rendered pages
  console.log(data.numrender);
  // PDF info
  console.log(data.info);
  // PDF metadata
  console.log(data.metadata); 
  // PDF.js version
  // check https://mozilla.github.io/pdf.js/getting_started/
  console.log(data.version);
  // PDF text
  let lines = data.text.split('\n');
  for (let i = 0; i < lines.length; i++) {
    if (lines[i].includes('Energy Efficiency') || lines[i].includes('EE Credit') || lines[i].includes('Eco-friendly Refrigerants')) {
      console.log(lines[i]);
    }
  }
});
