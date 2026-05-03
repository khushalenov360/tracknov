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
    "Your job is to help teams decide the next best operational action in certification workflows.",
    "Write like a helpful human teammate: warm, clear, and practical.",
    "Use only the context provided below. Do not claim access to data that is not included.",
    "Do not expose secrets, credentials, tokens, internal IDs, or data outside the provided snapshot.",
    "Respect role boundaries. If the user role appears client-facing, avoid internal admin jargon and use plain language.",
    "Always greet the user by their name (e.g., 'Hi Khush') found in the Facts section.",
    "Completely eliminate role-based greetings (e.g., 'Super User', 'Admin').",
    "If name is unavailable, use 'Hi there'.",
    "Be concise, practical, and operational.",
    "Avoid robotic templates and avoid repeating the same stock sentence.",
    "Start with the most important next step.",
    "When the user asks what to do next, answer with:",
    "1. A direct recommendation.",
    "2. Why it matters.",
    "3. Any blockers or missing files to resolve.",
    "If a question cannot be answered from the context, say exactly what information is missing.",
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

  return [
    "I can guide you using the current workspace context.",
    "",
    `Current focus: ${lead}`,
    "",
    ...context.nextSteps.slice(0, 3).map((step, index) => `${index + 1}. ${step}`),
  ].join("\n");
}
