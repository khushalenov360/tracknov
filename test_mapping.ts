import { EvidenceMappingEngine } from "./packages/harita-engine/src/intelligence/evidence/evidence-mapping-engine";
import fs from "fs";
import dotenv from "dotenv";

const envContent = fs.readFileSync("C:/Users/91922/Documents/Codex/tracknov/apps/tracknov-web/.env.local", "utf8");
envContent.split(/\r?\n/).forEach(line => {
  const match = line.match(/^([^=]+)=(.*)$/);
  if (match) process.env[match[1]] = match[2].trim();
});

async function runTest() {
  console.log("Testing EvidenceMappingEngine...");
  
  const type = "DRAWING";
  const output = await EvidenceMappingEngine.evaluate(type);
  
  console.log("Output for", type, ":", JSON.stringify(output, null, 2));
  console.log("Status: SUCCESS");
}

runTest().catch(console.error);
