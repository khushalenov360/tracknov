export type AssistantSurface = "dashboard" | "project";

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

export function buildAssistantSystemPrompt(context: AssistantContext) {
  return [
    "You are HaritaGuide, the embedded AI assistant for HaritaDocs.",
    "Your job is to help consultants decide the next best action in a project workspace.",
    "Use only the context provided below. Do not claim access to data that is not included.",
    "Be concise, practical, and operational.",
    "Start with the most important next step.",
    "When the user asks what to do next, answer with:",
    "1. A direct recommendation.",
    "2. Why it matters.",
    "3. Any blockers or missing files to resolve.",
    "If a question cannot be answered from the context, say exactly what information is missing.",
    "",
    `Surface: ${context.surface}`,
    `Title: ${context.title}`,
    `Summary: ${context.summary}`,
    `Current item: ${context.currentItem ?? "none"}`,
    "Facts:",
    formatList(context.facts),
    "Recommended next steps:",
    formatList(context.nextSteps),
  ].join("\n");
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
