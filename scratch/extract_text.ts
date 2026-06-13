import { DocumentParser } from "../lib/harita-engine/document-intelligence/DocumentParser";
import fs from "fs";
import path from "path";

async function run() {
  const pdfPath = path.join(process.cwd(), "scratch/IGBC_Green_Interiors_Reference_Guide_2021_(with_Addendum).pdf");
  const buffer = fs.readFileSync(pdfPath);
  
  const parser = new DocumentParser();
  const parsed = await parser.parse(buffer, "IGBC_Green_Interiors.pdf");
  
  fs.writeFileSync("scratch/pdf_text.txt", parsed.text);
  console.log("Wrote text to scratch/pdf_text.txt");
}

run().catch(console.error);
