import { expect, test } from "@playwright/test";
import * as fs from "fs";
import * as path from "path";

// Define the prompts based on the user's handoff document
const prompts = [
  { id: 'A1', q: 'What documents are required for EDA C1?' },
  { id: 'A2', q: 'What evidence types are valid for EDA C1?' },
  { id: 'A3', q: 'What review criteria apply to EDA C1?' },
  { id: 'A4', q: 'Who uploads drawings for EDA C1?' },
  { id: 'A5', q: 'Who uploads water calculations?' },
  { id: 'B1', q: 'Why did you map this file to EDA C1?' },
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

test("Execute Harita Frontend Prompts", async ({ page }) => {
  test.setTimeout(300000); // Allow 5 minutes for this large suite

  const email = process.env.TEST_USER_EMAIL;
  const password = process.env.TEST_USER_PASSWORD;

  if (!email || !password) {
    console.log("TEST_USER_EMAIL and TEST_USER_PASSWORD environment variables not provided. Skipping test execution.");
    test.skip();
    return;
  }

  // 1. Login
  await page.goto("/login");
  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Password").fill(password);
  const loginResponsePromise = page.waitForResponse(res => res.url().includes('auth/v1/token') && res.status() === 200);
  await page.getByRole("button", { name: /^sign in$/i }).click();
  await loginResponsePromise;
  
  // Wait for the app to redirect and settle cookies
  await page.waitForURL('**/*');
  await page.waitForTimeout(3000);
  
  // Extract token from localStorage
  const storageState = await page.context().storageState();
  const origin = storageState.origins.find(o => o.origin.includes('localhost') || o.origin.includes('127.0.0.1'));
  const supabaseAuth = origin?.localStorage.find(l => l.name.startsWith('sb-') && l.name.endsWith('-auth-token'));
  let accessToken = "";
  if (supabaseAuth) {
    accessToken = JSON.parse(supabaseAuth.value).access_token;
  }
  
  // Fetch current page's URL in case we need project ID
  await page.goto("/projects");
  await page.waitForTimeout(3000);

  // 2. Execute Prompts via API using the authenticated browser context
  let markdown = '# Harita E2E Prompt Test Results\n\n';
  let messages: any[] = [];
  
  // We need a projectId for the context payload
  // We can grab it from the URL or just pass a dummy one if the backend handles it
  let projectId = "73295874-9bd2-4911-ad81-b5413df0d15b"; 
  const urlMatches = page.url().match(/projects\/([a-f0-9\-]+)/);
  if (urlMatches && urlMatches[1]) {
    projectId = urlMatches[1];
  }

  const testPrompts = prompts;
  for (const p of testPrompts) {
    console.log(`Executing: ${p.id}...`);
    markdown += `### ${p.id}: ${p.q}\n\n`;

    let reqMessages = [...messages, { role: 'user', content: p.q }];
    
    const payload = {
      context: { 
        projectId: projectId,
        title: "Test Project",
        summary: "Test Project Summary"
      },
      messages: reqMessages,
      idempotencyKey: p.id,
      attachments: p.attachment ? [p.attachment] : []
    };

    const headers: Record<string, string> = {};
    if (accessToken) {
      headers["Authorization"] = `Bearer ${accessToken}`;
    }

    const responseStr = await page.evaluate(async (data) => {
      const res = await fetch('/api/assistant', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(data)
      });
      return await res.text();
    }, payload);
    
    const text = responseStr;
    markdown += `**Harita:**\n${text}\n\n---\n\n`;
    
    messages.push({ role: 'user', content: p.q });
    messages.push({ role: 'assistant', content: text });
    
    // Save iteratively
    const resultsPath = 'C:/Users/91922/Documents/Codex/tracknov/scratch/harita_e2e_results.md';
    fs.writeFileSync(resultsPath, markdown);
    
    await page.waitForTimeout(1500);
  }

  const finalPath = 'C:/Users/91922/Documents/Codex/tracknov/scratch/harita_e2e_results.md';
  console.log(`Test completed. Results saved to ${finalPath}`);
});
