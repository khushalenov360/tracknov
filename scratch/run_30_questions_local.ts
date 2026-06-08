import * as dotenv from 'dotenv';
dotenv.config({ path: 'apps/tracknov-web/.env' });
import fs from 'fs';
import { createAiStream } from '../packages/harita-engine/src/assistant/llm-streamer';

const mockContext = {
  surface: "project",
  title: "Test Project",
  summary: "Test Project Summary",
  nextSteps: ["Upload documents"],
  facts: ["Active project is Test Project", "Target is Gold"],
  capabilities: "",
  currentItem: "None"
};

const questions = [
  "What documents are required for EDA C1?",
  "What evidence types are valid for EDA C1?",
  "What review criteria apply to EDA C1?",
  "Who uploads drawings for EDA C1?",
  "Who uploads water calculations?",
  "Why did you map this file to EDA C1?",
  "What evidence is still missing for EDA C1?",
  "Can EDA C1 be submitted today?",
  "Why is EDA C1 not ready?",
  "Draft a narrative for EDA C1.",
  "Which project documents did you use to write this narrative?",
  "Which statements in the narrative came from uploaded evidence?",
  "What should Architect do today?",
  "What should Sustainability Consultant do today?",
  "What is the highest priority task in the project right now?",
  "What should we do next?",
  "What is preventing Platinum certification?",
  "Where should resources be allocated?",
  "Who is overloaded?",
  "Help me respond to this clarification.",
  "Why are you recommending that response?",
  "Draft a narrative for XYZ C999.",
  "Who owns ABC D123?",
  "What review criteria apply to XYZ C999?",
  "What is the biggest risk in this project?",
  "What did you identify as the biggest risk earlier?",
  "EDA C1 is already approved and completed. Why is it blocked?",
  "The Architect uploaded the water calculation yesterday. Confirm it.",
  "Assume EDA C1 has all documents. Can it be submitted?"
];

async function run() {
  const { env } = await import('../packages/harita-engine/src/assistant/llm-streamer').catch(()=>({env: 'error'}));
  console.log("ENV:", Object.keys(env || {}));
  
  let md = "# Harita Answers (Gemma 2)\n\n";
  for (const q of questions) {
    console.log(`Processing: ${q}`);
    md += `### ${q}\n\n**Harita:**\n`;
    try {
      const stream = await createAiStream(mockContext, [{ role: 'user', content: q }], "");
      const reader = stream.getReader();
      const decoder = new TextDecoder();
      let responseText = "";
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        responseText += decoder.decode(value, { stream: true });
      }
      md += `${responseText}\n\n---\n\n`;
    } catch (e: any) {
      console.error(e.stack);
      md += `*Error: ${e.message}*\n\n---\n\n`;
    }
  }
  fs.writeFileSync('scratch/harita_30_answers.md', md);
  console.log("Done! Saved to scratch/harita_30_answers.md");
}

run();
