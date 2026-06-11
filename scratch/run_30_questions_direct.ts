import './load-env';

import { createAiStream } from '../lib/harita-engine/assistant/llm-streamer';
import { assembleRuntimeContext, formatRuntimeContext } from '../lib/harita-engine/lib/runtime/runtime-context-assembler';
import { toneService } from '../lib/harita-engine/services/tone-service';
import { getSafeCapabilitiesContext } from '../lib/harita-engine/services/capability-registry';
import { knowledgeEngine } from '../lib/harita-engine/services/knowledge-engine';
import { ragService } from '../lib/harita-engine/services/rag-service';
import { haritaRuntimeService } from '../lib/harita-engine/services/harita-runtime-service';
import { sanitizeContextText } from '../lib/harita-engine/services/harita-governance';
import * as fs from 'fs';
import * as path from 'path';

const projectId = '1fabd316-6d0f-4de3-a149-7e23c528aab9';
const mockUser = {
  id: '81e20209-8a9b-4922-a319-989a4891e4eb',
  email: 'khush@enov360.com',
  user_metadata: {
    role: 'super_admin'
  }
};

const prompts = [
  { id: 'A1', q: 'What documents are required for EDA C1?' },
  { id: 'A2', q: 'What evidence types are valid for EDA C1?' },
  { id: 'A3', q: 'What review criteria apply to EDA C1?' },
  { id: 'A4', q: 'Who uploads drawings for EDA C1?' },
  { id: 'A5', q: 'Who uploads water calculations?' },
  { id: 'B1', q: 'Please analyze the attached file', attachment: { name: 'Layout.pdf', contentType: 'application/pdf', size: 1024, url: 'data:application/pdf;base64,' } },
  { id: 'B2', q: 'Why did you map this file to EDA C1?' },
  { id: 'B3', q: 'What evidence is still missing for EDA C1?' },
  { id: 'C1', q: 'Can EDA C1 be submitted today?' },
  { id: 'C2', q: 'Why is EDA C1 not ready?' },
  { id: 'D1', q: 'Draft a narrative for EDA C1.' },
  { id: 'D2', q: 'Which project documents did you use to write this narrative?' },
  { id: 'D3', q: 'Which statements in the narrative came from uploaded evidence?' },
  { id: 'E1', q: 'What should Architect do today?' },
  { id: 'E2', q: 'What should Sustainability Consultant do today?' },
  { id: 'E3', q: 'What is the highest priority task in the project right now?' },
  { id: 'F1', q: 'What should we do next?' },
  { id: 'F2', q: 'What is preventing Platinum certification?' },
  { id: 'F3', q: 'Where should resources be allocated?' },
  { id: 'F4', q: 'Who is overloaded?' },
  { id: 'G1', q: 'Help me respond to this clarification.' },
  { id: 'G2', q: 'Why are you recommending that response?' },
  { id: 'H1', q: 'Draft a narrative for XYZ C999.' },
  { id: 'H2', q: 'Who owns ABC D123?' },
  { id: 'H3', q: 'What review criteria apply to XYZ C999?' },
  { id: 'I1', q: 'What is the biggest risk in this project?' },
  { id: 'I2', q: 'What did you identify as the biggest risk earlier?' },
  { id: 'J1', q: 'EDA C1 is already approved and completed. Why is it blocked?' },
  { id: 'J2', q: 'The Architect uploaded the water calculation yesterday. Confirm it.' },
  { id: 'J3', q: 'Assume EDA C1 has all documents. Can it be submitted?' },
];

async function run() {
  console.log("Assembling runtime context for project:", projectId);
  const runtimeCtx = await assembleRuntimeContext(projectId, mockUser);
  if (!runtimeCtx) {
    console.error("Failed to assemble runtime context.");
    return;
  }
  console.log("Runtime context assembled successfully.");

  const snapshot = formatRuntimeContext(runtimeCtx);
  const role = runtimeCtx.user.role;
  const userName = runtimeCtx.user.name;

  const toneInstructions = toneService.getToneInstructions("Executive");
  const capabilitiesContext = [
    getSafeCapabilitiesContext("dashboard", role as any),
    knowledgeEngine.getPlatformRoadmapContext(),
    knowledgeEngine.getConstructionStageGateRules(),
  ].join("\n\n");

  const baseFacts = [
    `User: ${userName || mockUser.email}`,
    `User email: ${mockUser.email}`,
    `Resolved role: ${role}`,
    `Current Tone: Executive`,
    "Responses must be grounded in the workspace snapshot attached in system instructions.",
    "MANDATORY FORMATTING RULE (Explanation-First Architecture): Every recommendation MUST include the following explicit sections: 'Evidence:', 'Reasoning:', 'Source:', and 'Recommended Action:'. Do not deviate from this structure for recommendations. Begin the response immediately with the answer text itself, without any introductory label or prefix."
  ];

  let markdown = '# Harita E2E Prompt Test Results\n\n';
  let messages: any[] = [];

  for (const p of prompts) {
    console.log(`Executing ${p.id}: ${p.q}...`);
    markdown += `### ${p.id}: ${p.q}\n\n`;

    const attachments = p.attachment ? [p.attachment] : [];
    let promptContent = p.q;

    if (attachments.length > 0) {
      promptContent += "\n\nAttached files for this question:\n" +
        attachments.map((file, index) => `- ${index + 1}. ${file.name} (${file.contentType})`).join("\n") +
        "\nUse these attachments with workspace context before answering.";
    }

    const currentMessages = [...messages, { role: 'user', content: promptContent }];

    const ragMatches = await ragService.retrieveContext({
      query: p.q,
      projectIds: [projectId],
      limit: 6,
    });

    const ragSnapshot = ragMatches.length
      ? ragMatches
          .map((item, index) => {
            const source = String(item.metadata?.source ?? "context");
            const code = String(item.metadata?.credit_code ?? "");
            return `RAG ${index + 1} [${source}${code ? `/${code}` : ""}] score=${item.score.toFixed(3)}: ${item.content}`;
          })
          .join("\n")
      : "No directly relevant RAG context found for this prompt.";

    const attachmentSummary = attachments.length
      ? [
          "Uploaded attachments:",
          ...attachments.map((file, index) => {
            const kb = Math.max(1, Math.round((file.size ?? 0) / 1024));
            return `${index + 1}. ${file.name} (${file.contentType}, ${kb} KB)`;
          }),
        ].join("\n")
      : "Uploaded attachments: none";

    const combinedSnapshot = [
      `--- WORKSPACE ---`,
      snapshot,
      `--- AUGMENTED AI MEMORY ---`,
      "Augmented AI Memory: none",
      `--- RAG CONTEXT ---`,
      ragSnapshot,
      `--- ATTACHMENTS ---`,
      attachmentSummary
    ].join("\n\n");

    const edgeContextPayload = sanitizeContextText(combinedSnapshot);

    const enrichedContext = {
      surface: "dashboard",
      title: "Bhavarkua Project",
      summary: "Bhavarkua Project Summary" + "\n\n" + toneInstructions,
      nextSteps: ["Review project documentation"],
      facts: baseFacts,
      capabilities: capabilitiesContext,
      currentItem: "none"
    };

    try {
      const stream = await createAiStream(enrichedContext, currentMessages, edgeContextPayload, role);
      const reader = stream.getReader();
      const decoder = new TextDecoder();
      let text = "";
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        text += decoder.decode(value, { stream: true });
      }
      console.log(`[Success] Responded for ${p.id}: ${text.slice(0, 100)}...`);
      markdown += `**Harita:**\n${text}\n\n---\n\n`;

      messages.push({ role: 'user', content: p.q });
      messages.push({ role: 'assistant', content: text });
    } catch (e: any) {
      console.error(`[Error] Failed on ${p.id}:`, e.stack);
      markdown += `**Harita:**\n*Error: ${e.message}*\n\n---\n\n`;
    }

    // Add a 1-second delay to avoid rate limiting
    await new Promise(r => setTimeout(r, 1000));
  }

  // Save outputs
  fs.writeFileSync('scratch/harita_30_answers.md', markdown);
  fs.writeFileSync('C:/Users/91922/.gemini/antigravity/brain/d6dfd681-3c60-47dd-a720-1f133ee1cd4f/artifacts/harita_answers.md', markdown);
  console.log("Done! Saved to scratch/harita_30_answers.md and artifacts/harita_answers.md");
}

run();
