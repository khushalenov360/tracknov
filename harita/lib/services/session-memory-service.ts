/**
 * TRACKNOV — Session Memory Service
 * Section 9: Required Session Memory System (ENOVAIT Modeled Harita Handoff)
 *
 * Tracks the active conversational session state so Harita can maintain
 * contextual continuity across multi-turn conversations without re-fetching.
 *
 * Storage: sessionStorage (tab-scoped, never persisted to server)
 * Privacy: No PII other than what the user explicitly shares in chat.
 */

const SESSION_KEY = "tracknov:harita:session";

export type HaritaSession = {
  /** The project currently in focus */
  activeProjectId: string | null;
  activeProjectName: string | null;
  /** The credit currently in focus */
  activeCreditId: string | null;
  activeCreditCode: string | null;
  activeCreditName: string | null;
  /** The last document analyzed in chat (conversational attachment — NOT workflow upload) */
  lastAnalyzedFileName: string | null;
  lastAnalyzedFileSummary: string | null;
  /** Workflow context */
  currentWorkflowStage: string | null;
  /** The most recent user objective inferred from their last message */
  lastUserObjective: string | null;
  /** ISO timestamp of last session activity */
  lastActivityAt: string;
};

const EMPTY_SESSION: HaritaSession = {
  activeProjectId: null,
  activeProjectName: null,
  activeCreditId: null,
  activeCreditCode: null,
  activeCreditName: null,
  lastAnalyzedFileName: null,
  lastAnalyzedFileSummary: null,
  currentWorkflowStage: null,
  lastUserObjective: null,
  lastActivityAt: new Date().toISOString(),
};

function readSession(): HaritaSession {
  if (typeof window === "undefined") return { ...EMPTY_SESSION };
  try {
    const raw = window.sessionStorage.getItem(SESSION_KEY);
    if (!raw) return { ...EMPTY_SESSION };
    return { ...EMPTY_SESSION, ...(JSON.parse(raw) as Partial<HaritaSession>) };
  } catch {
    return { ...EMPTY_SESSION };
  }
}

function writeSession(session: HaritaSession): void {
  if (typeof window === "undefined") return;
  try {
    window.sessionStorage.setItem(SESSION_KEY, JSON.stringify(session));
  } catch {
    // sessionStorage unavailable — degrade gracefully
  }
}

export const sessionMemory = {
  get(): HaritaSession {
    return readSession();
  },

  setActiveProject(id: string, name: string): void {
    const session = readSession();
    writeSession({
      ...session,
      activeProjectId: id,
      activeProjectName: name,
      lastActivityAt: new Date().toISOString(),
    });
  },

  setActiveCredit(id: string, code: string, name: string): void {
    const session = readSession();
    writeSession({
      ...session,
      activeCreditId: id,
      activeCreditCode: code,
      activeCreditName: name,
      lastActivityAt: new Date().toISOString(),
    });
  },

  setLastAnalyzedFile(fileName: string, summary: string): void {
    const session = readSession();
    writeSession({
      ...session,
      lastAnalyzedFileName: fileName,
      lastAnalyzedFileSummary: summary,
      lastActivityAt: new Date().toISOString(),
    });
  },

  setWorkflowStage(stage: string): void {
    const session = readSession();
    writeSession({
      ...session,
      currentWorkflowStage: stage,
      lastActivityAt: new Date().toISOString(),
    });
  },

  setLastObjective(objective: string): void {
    const session = readSession();
    writeSession({
      ...session,
      lastUserObjective: objective,
      lastActivityAt: new Date().toISOString(),
    });
  },

  /**
   * Build a compact facts array for injection into AssistantContext.facts[]
   * Only includes non-null values to keep the context tight.
   */
  buildContextFacts(): string[] {
    const s = readSession();
    const facts: string[] = [];
    if (s.activeProjectId) facts.push(`Session active project: ${s.activeProjectName ?? s.activeProjectId}`);
    if (s.activeCreditCode) facts.push(`Session active credit: ${s.activeCreditCode} — ${s.activeCreditName ?? ""}`);
    if (s.lastAnalyzedFileName) facts.push(`Last analyzed file: ${s.lastAnalyzedFileName}`);
    if (s.lastAnalyzedFileSummary) facts.push(`Prior file analysis summary: ${s.lastAnalyzedFileSummary}`);
    if (s.currentWorkflowStage) facts.push(`Current workflow stage: ${s.currentWorkflowStage}`);
    if (s.lastUserObjective) facts.push(`User's last known objective: ${s.lastUserObjective}`);
    return facts;
  },

  /** Reset on "New Chat" */
  clear(): void {
    if (typeof window === "undefined") return;
    window.sessionStorage.removeItem(SESSION_KEY);
  },
};
