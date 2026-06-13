"use strict";
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
Object.defineProperty(exports, "__esModule", { value: true });
exports.sessionMemory = void 0;
const SESSION_KEY = "tracknov:harita:session";
const EMPTY_SESSION = {
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
function readSession() {
    if (typeof window === "undefined")
        return Object.assign({}, EMPTY_SESSION);
    try {
        const raw = window.sessionStorage.getItem(SESSION_KEY);
        if (!raw)
            return Object.assign({}, EMPTY_SESSION);
        return Object.assign(Object.assign({}, EMPTY_SESSION), JSON.parse(raw));
    }
    catch (_a) {
        return Object.assign({}, EMPTY_SESSION);
    }
}
function writeSession(session) {
    if (typeof window === "undefined")
        return;
    try {
        window.sessionStorage.setItem(SESSION_KEY, JSON.stringify(session));
    }
    catch (_a) {
        // sessionStorage unavailable — degrade gracefully
    }
}
exports.sessionMemory = {
    get() {
        return readSession();
    },
    setActiveProject(id, name) {
        const session = readSession();
        writeSession(Object.assign(Object.assign({}, session), { activeProjectId: id, activeProjectName: name, lastActivityAt: new Date().toISOString() }));
    },
    setActiveCredit(id, code, name) {
        const session = readSession();
        writeSession(Object.assign(Object.assign({}, session), { activeCreditId: id, activeCreditCode: code, activeCreditName: name, lastActivityAt: new Date().toISOString() }));
    },
    setLastAnalyzedFile(fileName, summary) {
        const session = readSession();
        writeSession(Object.assign(Object.assign({}, session), { lastAnalyzedFileName: fileName, lastAnalyzedFileSummary: summary, lastActivityAt: new Date().toISOString() }));
    },
    setWorkflowStage(stage) {
        const session = readSession();
        writeSession(Object.assign(Object.assign({}, session), { currentWorkflowStage: stage, lastActivityAt: new Date().toISOString() }));
    },
    setLastObjective(objective) {
        const session = readSession();
        writeSession(Object.assign(Object.assign({}, session), { lastUserObjective: objective, lastActivityAt: new Date().toISOString() }));
    },
    /**
     * Build a compact facts array for injection into AssistantContext.facts[]
     * Only includes non-null values to keep the context tight.
     */
    buildContextFacts() {
        var _a, _b;
        const s = readSession();
        const facts = [];
        if (s.activeProjectId)
            facts.push(`Session active project: ${(_a = s.activeProjectName) !== null && _a !== void 0 ? _a : s.activeProjectId}`);
        if (s.activeCreditCode)
            facts.push(`Session active credit: ${s.activeCreditCode} — ${(_b = s.activeCreditName) !== null && _b !== void 0 ? _b : ""}`);
        if (s.lastAnalyzedFileName)
            facts.push(`Last analyzed file: ${s.lastAnalyzedFileName}`);
        if (s.lastAnalyzedFileSummary)
            facts.push(`Prior file analysis summary: ${s.lastAnalyzedFileSummary}`);
        if (s.currentWorkflowStage)
            facts.push(`Current workflow stage: ${s.currentWorkflowStage}`);
        if (s.lastUserObjective)
            facts.push(`User's last known objective: ${s.lastUserObjective}`);
        return facts;
    },
    /** Reset on "New Chat" */
    clear() {
        if (typeof window === "undefined")
            return;
        window.sessionStorage.removeItem(SESSION_KEY);
    },
};
