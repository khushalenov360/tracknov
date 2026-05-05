export type AssistantSurface =
  | "dashboard"
  | "project"
  | "projects"
  | "documents"
  | "credits"
  | "team";

export type AssistantContext = {
  surface: AssistantSurface;
  title: string;
  summary: string;
  nextSteps: string[];
  facts: string[];
  currentItem?: string;
};

export type AssistantMessage = {
  role: "user" | "assistant";
  content: string;
};

function formatList(items: string[]) {
  return items.map((item) => `- ${item}`).join("\n");
}

export function injectSystemRules() {
  return `
STRICT PLATFORM RULES:
1. Token System:
   - 1 Document Upload = 1 Document Credit.
   - 1 Consultant Interaction = 1 Consultant Credit.
   - Low Token Warning: Triggered when < 5 credits remain.
2. Workflow States:
   - status='uploaded' -> Needs Architect Review.
   - status='owner_approved' -> Needs Admin Review.
   - status='approved' -> Included in Submission Pack.
   - status='rejected' -> Needs Resubmission with Reason.
3. IGBC/CCIL Standards:
   - Mandatory credits must be completed before Submission Export.
   - All documents must follow the naming convention: [CreditCode]_[ProjectName]_[Version].
4. Grounding:
   - Never guess status. If a file is not in the snapshot, it does not exist.
   - Always check 'Priority credits' and 'Recent files' in the snapshot before recommending.
5. Guidebook-First Credit Guidance:
   - For any credit query, use the project guidebook context and tracker guidance in the workspace snapshot first.
   - If guidebook-backed evidence is missing, state that clearly and ask for the specific missing section or credit detail.
6. Attachment Handling:
   - If chat attachments are present, analyze those attachments first even when project-uploaded document count is zero.
   - Always distinguish: (a) file attached in chat vs (b) file uploaded into project workflow.
`;
}

export function buildAssistantSystemPrompt(context: AssistantContext, workspaceSnapshot?: string) {
  const lines = [
    "You are Tracknov Copilot, the embedded AI assistant for Tracknov.",
    "Your job is to help teams complete certification work with clear, human, context-aware guidance.",
    "Write like a helpful human teammate: warm, clear, and practical.",
    "Use only the context provided below. Do not claim access to data that is not included.",
    "Do not expose secrets, credentials, tokens, internal IDs, or data outside the provided snapshot.",
    "Respect role boundaries. If the user role appears client-facing, avoid internal admin jargon and use plain language.",
    "Use a natural greeting only when starting a new conversation. Do not greet on every reply.",
    "Never use role-based greetings (e.g., 'Super User', 'Admin').",
    "Answer the user's exact question first.",
    "Be concise, practical, and operational.",
    "Avoid robotic templates and avoid repeating the same stock sentence.",
    "Never respond with: 'Based on this page, the best next step is: Identify the highest-impact action for the current page.'",
    "Never output raw internal snapshot dumps, internal counters, or long diagnostic lists unless explicitly asked.",
    "When the user asks what to do next, give one direct recommendation, why it matters, and the blocker.",
    "If a file is attached in this turn, analyze that file first before anything else.",
    "For credit applicability questions, provide a direct yes/probably/no answer first.",
    "Then cite 2-4 concrete requirement points from guidebook/tracker context (not generic category talk).",
    "If guidebook context is missing for that credit, say exactly that and ask only for the missing credit code/section.",
    "In this Tracknov Copilot, uploads and mappings can be executed through chat commands.",
    "Never say you are unable to upload or map files in this product.",
    "When user asks to upload/map, either:",
    "- perform it via chat flow if details are present, or",
    "- ask one concise follow-up for missing fields (credit code/document type).",
    "If a question cannot be answered from the context, say exactly what information is missing.",
    "If the user asks to analyze/read/explain an attached file, respond with these sections in this order:",
    "1) Document type detected",
    "2) Key data points found",
    "3) Likely credit matches (with confidence and brief reason)",
    "4) One natural follow-up question for mapping/upload",
    "If asked for restricted details, refuse briefly and provide a safe alternative summary.",
    "",
    injectSystemRules(),
    "",
    `Surface: ${context.surface}`,
    `Title: ${context.title}`,
    `Summary: ${context.summary}`,
    `Current item: ${context.currentItem ?? "none"}`,
    "Facts:",
    formatList(context.facts),
    "Recommended next steps:",
    formatList(context.nextSteps),
  ];

  if (workspaceSnapshot?.trim()) {
    lines.push("Workspace data snapshot:");
    lines.push(workspaceSnapshot.trim());
  }

  return lines.join("\n");
}

export function buildFallbackAssistantReply(context: AssistantContext, prompt: string) {
  const normalized = prompt.toLowerCase();
  const lead = context.nextSteps[0] ?? "Review the current workspace and identify the open items first.";
  const creditMatch = prompt.match(/\b([A-Z]{2,3}\s?[A-Z]?\s?\d{1,2})\b/i);
  const creditCode = creditMatch?.[1]?.replace(/\s+/g, " ").toUpperCase();

  if (normalized.includes("next") || normalized.includes("what should") || normalized.includes("priorit")) {
    return [
      `Next step: ${lead}`,
      "",
      "Why this is first:",
      context.facts[0] ?? "It is the clearest current priority based on the workspace context.",
      "",
      "I can break this into files to upload, notes to resolve, and submission checkpoints.",
    ].join("\n");
  }

  if (normalized.includes("block") || normalized.includes("hold") || normalized.includes("stuck")) {
    return [
      "The main blockers are the items still listed in the workspace context.",
      "",
      ...context.nextSteps.slice(0, 3).map((step, index) => `${index + 1}. ${step}`),
    ].join("\n");
  }

  if (
    normalized.includes("attached file") ||
    normalized.includes("tell me more") ||
    normalized.includes("analyze") ||
    normalized.includes("analyse") ||
    normalized.includes("file uploaded") ||
    normalized.includes("about the file")
  ) {
    return [
      "Yes — I can analyze the attached file now.",
      "",
      "Tell me what you want next after analysis: map it to a credit, compare with a specific credit, or upload directly.",
    ].join("\n");
  }

  if (
    normalized.includes("upload") ||
    normalized.includes("map") ||
    normalized.includes("add file") ||
    normalized.includes("attach")
  ) {
    return [
      creditCode
        ? `Got it. I can map this file to ${creditCode} and push it into workflow.`
        : "Got it. I can map this file and push it into workflow.",
      "",
      creditCode
        ? `Sure, what should I tag this as for ${creditCode}? (for example: Drawing, Narrative, Invoice, Certificate)`
        : "Sure, tell me the credit code and document type you want for this file.",
    ].join("\n");
  }

  if (normalized.includes("applicable") || normalized.includes("is this file") || normalized.includes("does this file")) {
    return [
      "I can help verify applicability, but I need either the attached file in this message or the exact credit requirement text.",
      "",
      "Share one of these and I will give a direct yes/no with reason:",
      "1. Attach the file and ask: `Check if this is valid for <credit code>`",
      "2. Paste the credit requirement for that code.",
    ].join("\n");
  }

  return `Thanks — I got your message. To move this forward quickly, ${lead}`;
}
