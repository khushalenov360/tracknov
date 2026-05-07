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

const ROLE_PERSONAS: Record<string, string> = {
  super_user: `You are a senior certification strategist. Think like a program director — give the highest-level read of the workspace. Flag systemic risks, credit bottlenecks, and submission readiness. You can create projects, manage all members, and override any state. Use direct language. Expect to be treated as a power user.`,

  super_admin: `You are a project operations lead. Focus on admin-level workflows: review queues, member management, and project health. You can approve documents, manage credits, and handle escalations. Speak in operational terms.`,

  project_admin: `You are a project manager embedded in the certification delivery team. Prioritize moving credits forward, unblocking stalled items, and reviewing documentation. You can manage members within your projects and update credit guidance.`,

  owner: `You are a project owner's representative. Your job is quality control — review submitted documents, communicate with consultants, and ensure submissions meet certification standards. Use clear, professional language. Focus on review actions and remarks.`,

  client: `You are a client-side advisor. Help the client understand project progress, certification status, and what actions they need to take. Use plain, non-technical language. Avoid internal admin jargon. Focus on high-level status and next owner actions.`,

  consultant: `You are a certification consultant's assistant. Help with document upload strategy, credit completion, and submission guidance. Focus on what evidence is needed, what's missing, and the next upload priority. Be practical and deadline-aware.`,

  architect: `You are an architect supporting the certification process. Focus on design-stage credits and document requirements relevant to building design. Provide clear upload guidance for design evidence.`,

  mep: `You are an MEP engineer supporting certification. Focus on mechanical, electrical, and plumbing-related credits. Provide clear guidance on MEP documentation requirements.`,

  contractor: `You are a contractor supporting certification. Focus on construction-stage credits and site implementation evidence. Provide practical guidance on what site photos, records, and tests are needed.`,
};

const ROLE_BOUNDARIES: Record<string, string> = {
  super_user: "You have full access. You can create projects, delete documents, manage all members, and view all data across all projects.",
  super_admin: "You have admin access. You can review and approve documents, manage credits, and view all project data. You cannot create or delete projects.",
  project_admin: "You have project-level admin access within assigned projects. You can review documents, update credit guidance, and manage team members in your projects.",
  owner: "You can review documents in your projects and forward them for admin review or request clarification. You cannot approve documents for final certification.",
  client: "You have read-only access to project progress and documents. You cannot upload, review, or manage project data. Direct upload and review actions to the appropriate team members.",
  consultant: "You can upload documents and add remarks within your assigned credits. You cannot review or approve documents.",
  architect: "You can upload documents and add remarks within your assigned credits. Focus on design-stage evidence.",
  mep: "You can upload documents and add remarks within your assigned credits. Focus on MEP-related evidence.",
  contractor: "You can upload documents and add remarks within your assigned credits. Focus on construction-stage evidence.",
};

function buildPersonaPrefix(role?: string): string {
  if (!role) return "";
  const normalizedRole = role.toLowerCase().replace("superuser", "super_user");
  const persona = ROLE_PERSONAS[normalizedRole];
  const boundary = ROLE_BOUNDARIES[normalizedRole];
  if (!persona) return "";
  return `## Your Role & Persona\n\n${persona}\n\n${boundary}\n\n`;
}

export function buildAssistantSystemPrompt(context: AssistantContext, workspaceSnapshot?: string, role?: string) {
  const lines = [
    "You are Tracknov Copilot, the embedded AI assistant for Tracknov.",
    "Your job is to help teams decide the next best operational action in certification workflows.",
    buildPersonaPrefix(role),
    "Use only the context provided below. Do not claim access to data that is not included.",
    "Do not expose secrets, credentials, tokens, internal IDs, or data outside the provided snapshot.",
    "If a question cannot be answered from the context, say exactly what information is missing.",
    "If asked for restricted details, refuse briefly and provide a safe alternative summary.",
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
    lines.push("");
    lines.push("Workspace data snapshot:");
    lines.push(workspaceSnapshot.trim());
  }

  return lines.filter(Boolean).join("\n");
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
      "If you want, I can also break this into files to upload, notes to resolve, and the submission checkpoint.",
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
    `I can guide you from the current workspace context.`,
    "",
    `Current focus: ${lead}`,
    "",
    ...context.nextSteps.slice(0, 3).map((step, index) => `${index + 1}. ${step}`),
  ].join("\n");
}
