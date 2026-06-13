"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.haritaRuntimeService = exports.HaritaRuntimeService = void 0;
const admin_1 = require("@/lib/supabase/admin");
const server_1 = require("@/lib/supabase/server");
const env_1 = require("@/lib/env");
class HaritaRuntimeService {
    get client() { return (0, server_1.createClient)(); }
    get admin() { return env_1.env.supabaseServiceRoleKey ? (0, admin_1.createAdminClient)() : this.client; }
    /**
     * Resolve or initialize a conversation session for the current context.
     */
    getOrCreateSession(userId, projectId) {
        return __awaiter(this, void 0, void 0, function* () {
            const { data: existing } = yield this.admin
                .from("conversation_sessions")
                .select("*")
                .eq("user_id", userId)
                .eq("project_id", projectId)
                .order("updated_at", { ascending: false })
                .limit(1)
                .maybeSingle();
            if (existing) {
                return existing;
            }
            const { data: created, error } = yield this.admin
                .from("conversation_sessions")
                .insert({
                user_id: userId,
                project_id: projectId
            })
                .select("*")
                .single();
            if (error)
                throw error;
            return created;
        });
    }
    /**
     * Load recent message history for context continuity.
     */
    getRecentMessages(sessionId_1) {
        return __awaiter(this, arguments, void 0, function* (sessionId, limit = 10) {
            const { data } = yield this.admin
                .from("conversation_messages")
                .select("role, message")
                .eq("session_id", sessionId)
                .order("created_at", { ascending: true })
                .limit(limit);
            return (data !== null && data !== void 0 ? data : []).map(row => ({
                role: row.role,
                content: row.message
            }));
        });
    }
    /**
     * Persist a new message to the conversation history.
     */
    storeMessage(sessionId, role, content, structuredContext) {
        return __awaiter(this, void 0, void 0, function* () {
            const { error } = yield this.admin
                .from("conversation_messages")
                .insert({
                session_id: sessionId,
                role,
                message: content,
                structured_context: structuredContext
            });
            if (error)
                throw error;
            // Update session timestamp
            yield this.admin
                .from("conversation_sessions")
                .update({ updated_at: new Date().toISOString() })
                .eq("id", sessionId);
        });
    }
    /**
     * Store or update a semantic memory fact.
     */
    storeSemanticMemory(sessionId, type, key, value) {
        return __awaiter(this, void 0, void 0, function* () {
            const { data: existing } = yield this.admin
                .from("semantic_memory")
                .select("id")
                .eq("session_id", sessionId)
                .eq("memory_type", type)
                .eq("memory_key", key)
                .maybeSingle();
            if (existing) {
                const { error } = yield this.admin
                    .from("semantic_memory")
                    .update({ memory_value: value, created_at: new Date().toISOString() })
                    .eq("id", existing.id);
                if (error)
                    throw error;
            }
            else {
                const { error } = yield this.admin
                    .from("semantic_memory")
                    .insert({
                    session_id: sessionId,
                    memory_type: type,
                    memory_key: key,
                    memory_value: value
                });
                if (error)
                    throw error;
            }
        });
    }
    /**
     * Retrieve all relevant semantic memory for building context.
     */
    getSessionMemory(sessionId) {
        return __awaiter(this, void 0, void 0, function* () {
            const { data } = yield this.admin
                .from("semantic_memory")
                .select("memory_type, memory_key, memory_value")
                .eq("session_id", sessionId);
            return (data !== null && data !== void 0 ? data : []).map(row => {
                if (row.memory_type === 'analysis') {
                    return `Previously analyzed file (${row.memory_key}): ${JSON.stringify(row.memory_value)}`;
                }
                return `Known ${row.memory_type} (${row.memory_key}): ${JSON.stringify(row.memory_value)}`;
            });
        });
    }
    /**
     * Retrieve all raw semantic memory rows.
     */
    getSessionMemoryRaw(sessionId) {
        return __awaiter(this, void 0, void 0, function* () {
            const { data } = yield this.admin
                .from("semantic_memory")
                .select("memory_type, memory_key, memory_value")
                .eq("session_id", sessionId);
            return data !== null && data !== void 0 ? data : [];
        });
    }
    /**
     * Build the augmented context for the AI prompt.
     */
    buildAugmentedContext(userId, projectId, baseContext) {
        return __awaiter(this, void 0, void 0, function* () {
            const session = yield this.getOrCreateSession(userId, projectId);
            const memories = yield this.getSessionMemory(session.id);
            const facts = [...(baseContext.facts || []), ...memories];
            if (session.session_summary) {
                facts.push(`High-level summary of resolved tasks in the previous session: ${session.session_summary}`);
            }
            return Object.assign(Object.assign({}, baseContext), { facts });
        });
    }
    /**
     * Summarizes conversation history using Gemini with a Groq fallback.
     */
    generateSummaryText(conversationText) {
        return __awaiter(this, void 0, void 0, function* () {
            var _a, _b, _c, _d, _e, _f, _g, _h, _j, _k;
            const prompt = `You are a summarization assistant. Summarize the following green building certification workspace chat conversation in a single concise sentence. Focus specifically on any resolved tasks, files discussed, or decisions made. If nothing was resolved, output a blank string. Do not include introductory text, headers, or bullet points.\n\nCONVERSATION:\n${conversationText}\n\nSUMMARY:`;
            let lastError = null;
            // Try Gemini
            const geminiKey = process.env.GEMINI_API_KEY || ((_a = env_1.env.geminiApiKeys) === null || _a === void 0 ? void 0 : _a[0]);
            if (geminiKey) {
                try {
                    const res = yield fetch("https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent", {
                        method: "POST",
                        headers: { "Content-Type": "application/json", "x-goog-api-key": geminiKey },
                        body: JSON.stringify({
                            contents: [{ parts: [{ text: prompt }] }]
                        }),
                        signal: AbortSignal.timeout(4000),
                    });
                    if (res.ok) {
                        const data = yield res.json();
                        const text = (_f = (_e = (_d = (_c = (_b = data.candidates) === null || _b === void 0 ? void 0 : _b[0]) === null || _c === void 0 ? void 0 : _c.content) === null || _d === void 0 ? void 0 : _d.parts) === null || _e === void 0 ? void 0 : _e[0]) === null || _f === void 0 ? void 0 : _f.text;
                        if (text !== undefined)
                            return text.trim();
                    }
                    else {
                        const errText = yield res.text();
                        throw new Error(`Gemini status ${res.status}: ${errText}`);
                    }
                }
                catch (e) {
                    console.warn("Summary: Gemini failed", e);
                    lastError = e;
                }
            }
            // Try Groq
            const groqKey = process.env.GROQ_API_KEY || ((_g = env_1.env.groqApiKeys) === null || _g === void 0 ? void 0 : _g[0]);
            if (groqKey) {
                try {
                    const res = yield fetch("https://api.groq.com/openai/v1/chat/completions", {
                        method: "POST",
                        headers: {
                            "Content-Type": "application/json",
                            Authorization: `Bearer ${groqKey}`,
                        },
                        body: JSON.stringify({
                            model: "llama-3.3-70b-versatile",
                            messages: [{ role: "user", content: prompt }],
                            temperature: 0.2,
                            max_tokens: 100,
                        }),
                        signal: AbortSignal.timeout(4000),
                    });
                    if (res.ok) {
                        const data = yield res.json();
                        const text = (_k = (_j = (_h = data.choices) === null || _h === void 0 ? void 0 : _h[0]) === null || _j === void 0 ? void 0 : _j.message) === null || _k === void 0 ? void 0 : _k.content;
                        if (text !== undefined)
                            return text.trim();
                    }
                    else {
                        const errText = yield res.text();
                        throw new Error(`Groq status ${res.status}: ${errText}`);
                    }
                }
                catch (e) {
                    console.warn("Summary: Groq failed", e);
                    lastError = e;
                }
            }
            if (lastError) {
                throw lastError;
            }
            throw new Error("Unable to summarize conversation due to API rate limit/timeout.");
        });
    }
    /**
     * Wipes session conversation history and semantic memory, saving a summarized version first.
     */
    resetSession(userId_1, projectId_1) {
        return __awaiter(this, arguments, void 0, function* (userId, projectId, force = false) {
            const session = yield this.getOrCreateSession(userId, projectId);
            // 1. Get messages to summarize
            const messages = yield this.getRecentMessages(session.id, 50);
            let summary = "";
            if (messages.length > 0 && !force) {
                const conversationText = messages.map(m => `${m.role === 'user' ? 'User' : 'Assistant'}: ${m.content}`).join("\n");
                try {
                    summary = yield this.generateSummaryText(conversationText);
                }
                catch (err) {
                    console.error("[ResetSession] Summarization failed during reset:", err);
                    throw new Error("Wipe Blocked: We couldn't summarize your active session (Rate Limit Expired or API Timeout). To prevent losing your chat context, the history has not been cleared.");
                }
            }
            // 2. Wipe messages and semantic memory
            const { error: errorMessages } = yield this.admin.from("conversation_messages").delete().eq("session_id", session.id);
            if (errorMessages)
                throw errorMessages;
            const { error: errorMemory } = yield this.admin.from("semantic_memory").delete().eq("session_id", session.id);
            if (errorMemory)
                throw errorMemory;
            // 3. Update session with new timestamp and summary
            const { error: errorSession } = yield this.admin
                .from("conversation_sessions")
                .update({
                updated_at: new Date().toISOString(),
                session_summary: force ? session.session_summary : (summary || session.session_summary)
            })
                .eq("id", session.id);
            if (errorSession)
                throw errorSession;
        });
    }
}
exports.HaritaRuntimeService = HaritaRuntimeService;
exports.haritaRuntimeService = new HaritaRuntimeService();
