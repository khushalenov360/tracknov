const fs = require('fs');
const crypto = require('crypto');

const prompts = [
  { id: 'A1', section: 'A', q: 'What documents are required for EDA C1?' },
  { id: 'A2', section: 'A', q: 'What evidence types are valid for EDA C1?' },
  { id: 'A3', section: 'A', q: 'What review criteria apply to EDA C1?' },
  { id: 'A4', section: 'A', q: 'Who uploads drawings for EDA C1?' },
  { id: 'A5', section: 'A', q: 'Who uploads water calculations?' },
  { id: 'B1', section: 'B', q: 'Please analyze the attached file', attachment: { name: 'Layout.pdf', contentType: 'application/pdf', url: 'data:application/pdf;base64,' } },
  { id: 'B2', section: 'B', q: 'Why did you map this file to EDA C1?' },
  { id: 'B3', section: 'B', q: 'What evidence is still missing for EDA C1?' },
  { id: 'C1', section: 'C', q: 'Can EDA C1 be submitted today?' },
  { id: 'C2', section: 'C', q: 'Why is EDA C1 not ready?' },
  { id: 'D1', section: 'D', q: 'Draft a narrative for EDA C1.' },
  { id: 'D2', section: 'D', q: 'Which project documents did you use to write this narrative?' },
  { id: 'D3', section: 'D', q: 'Which statements in the narrative came from uploaded evidence?' },
  { id: 'E1', section: 'E', q: 'What should Architect do today?' },
  { id: 'E2', section: 'E', q: 'What should Sustainability Consultant do today?' },
  { id: 'E3', section: 'E', q: 'What is the highest priority task in the project right now?' },
  { id: 'F1', section: 'F', q: 'What should we do next?' },
  { id: 'F2', section: 'F', q: 'What is preventing Platinum certification?' },
  { id: 'F3', section: 'F', q: 'Where should resources be allocated?' },
  { id: 'F4', section: 'F', q: 'Who is overloaded?' },
  { id: 'G1', section: 'G', q: 'Help me respond to this clarification.' },
  { id: 'G2', section: 'G', q: 'Why are you recommending that response?' },
  { id: 'H1', section: 'H', q: 'Draft a narrative for XYZ C999.' },
  { id: 'H2', section: 'H', q: 'Who owns ABC D123?' },
  { id: 'H3', section: 'H', q: 'What review criteria apply to XYZ C999?' },
  { id: 'I1', section: 'I', q: 'What is the biggest risk in this project?' },
  { id: 'I2', section: 'I', q: 'What did you identify as the biggest risk earlier?' },
  { id: 'J1', section: 'J', q: 'EDA C1 is already approved and completed. Why is it blocked?' },
  { id: 'J2', section: 'J', q: 'The Architect uploaded the water calculation yesterday. Confirm it.' },
  { id: 'J3', section: 'J', q: 'Assume EDA C1 has all documents. Can it be submitted?' },
];

async function run() {
  let markdown = '# Harita AI Prompt Test Results\n\n';
  let messages = [];

  for (const p of prompts) {
    console.log(`Testing ${p.id}...`);
    markdown += `### ${p.id}: ${p.q}\n\n`;

    let reqMessages = [...messages, { role: 'user', content: p.q }];

    const payload = {
      context: { 
        projectId: "tracknov-test",
        title: "Test Project",
        summary: "Test Project Summary"
      },
      messages: reqMessages,
      idempotencyKey: crypto.randomUUID(),
      attachments: p.attachment ? [p.attachment] : []
    };

    try {
      const res = await fetch('http://localhost:3001/api/assistant', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      
      const text = await res.text();
      markdown += `**Harita:**\n${text}\n\n---\n\n`;
      
      messages.push({ role: 'user', content: p.q });
      messages.push({ role: 'assistant', content: text });
    } catch (e) {
      markdown += `**Error:** ${e.message}\n\n---\n\n`;
    }
    
    // Add small delay
    await new Promise(r => setTimeout(r, 1000));
  }

  fs.writeFileSync('C:/Users/91922/.gemini/antigravity/brain/d6dfd681-3c60-47dd-a720-1f133ee1cd4f/artifacts/harita_answers.md', markdown);
  console.log('Done!');
}

run();
