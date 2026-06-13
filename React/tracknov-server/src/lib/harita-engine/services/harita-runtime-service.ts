import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { env } from "@/lib/env";
import type { AssistantMessage, AssistantContext } from "@/lib/harita-engine/assistant";

export type HaritaSession = {
  id: string;
  project_id: string;
  user_id: string;
  active_attachment_id?: string | null;
  active_credit_id?: string | null;
  session_summary?: string | null;
};

export type SemanticMemoryType = 'analysis' | 'preference' | 'fact';

export class HaritaRuntimeService {
  private get client() { return createClient(); }
  private get admin() { return env.supabaseServiceRoleKey ? createAdminClient() : this.client; }

  /**
   * Resolve or initialize a conversation session for the current context.
   */
  async getOrCreateSession(userId: string, projectId: string): Promise<HaritaSession> {
    const { data: existing } = await this.admin
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

    const { data: created, error } = await this.admin
      .from("conversation_sessions")
      .insert({
        user_id: userId,
        project_id: projectId
      })
      .select("*")
      .single();

    if (error) throw error;
    return created;
  }

  /**
   * Load recent message history for context continuity.
   */
  async getRecentMessages(sessionId: string, limit = 10): Promise<AssistantMessage[]> {
    const { data } = await this.admin
      .from("conversation_messages")
      .select("role, message")
      .eq("session_id", sessionId)
      .order("created_at", { ascending: true })
      .limit(limit);

    return (data ?? []).map(row => ({
      role: row.role as "user" | "assistant",
      content: row.message
    }));
  }

  /**
   * Persist a new message to the conversation history.
   */
  async storeMessage(sessionId: string, role: string, content: string, structuredContext?: any) {
    const { error } = await this.admin
      .from("conversation_messages")
      .insert({
        session_id: sessionId,
        role,
        message: content,
        structured_context: structuredContext
      });

    if (error) throw error;

    // Update session timestamp
    await this.admin
      .from("conversation_sessions")
      .update({ updated_at: new Date().toISOString() })
      .eq("id", sessionId);
  }

  /**
   * Store or update a semantic memory fact.
   */
  async storeSemanticMemory(sessionId: string, type: SemanticMemoryType, key: string, value: any) {
    const { data: existing } = await this.admin
      .from("semantic_memory")
      .select("id")
      .eq("session_id", sessionId)
      .eq("memory_type", type)
      .eq("memory_key", key)
      .maybeSingle();

    if (existing) {
      const { error } = await this.admin
        .from("semantic_memory")
        .update({ memory_value: value, created_at: new Date().toISOString() })
        .eq("id", existing.id);
      if (error) throw error;
    } else {
      const { error } = await this.admin
        .from("semantic_memory")
        .insert({
          session_id: sessionId,
          memory_type: type,
          memory_key: key,
          memory_value: value
        });
      if (error) throw error;
    }
  }

  /**
   * Retrieve all relevant semantic memory for building context.
   */
  async getSessionMemory(sessionId: string): Promise<string[]> {
    const { data } = await this.admin
      .from("semantic_memory")
      .select("memory_type, memory_key, memory_value")
      .eq("session_id", sessionId);

    return (data ?? []).map(row => {
      if (row.memory_type === 'analysis') {
        return `Previously analyzed file (${row.memory_key}): ${JSON.stringify(row.memory_value)}`;
      }
      return `Known ${row.memory_type} (${row.memory_key}): ${JSON.stringify(row.memory_value)}`;
    });
  }

  /**
   * Retrieve all raw semantic memory rows.
   */
  async getSessionMemoryRaw(sessionId: string): Promise<any[]> {
    const { data } = await this.admin
      .from("semantic_memory")
      .select("memory_type, memory_key, memory_value")
      .eq("session_id", sessionId);

    return data ?? [];
  }

  /**
   * Build the augmented context for the AI prompt.
   */
  async buildAugmentedContext(
    userId: string,
    projectId: string,
    baseContext: AssistantContext
  ): Promise<AssistantContext> {
    const session = await this.getOrCreateSession(userId, projectId);
    const memories = await this.getSessionMemory(session.id);

    const facts = [...(baseContext.facts || []), ...memories];
    if (session.session_summary) {
      facts.push(`High-level summary of resolved tasks in the previous session: ${session.session_summary}`);
    }

    return {
      ...baseContext,
      facts
    };
  }

  /**
   * Summarizes conversation history using Gemini with a Groq fallback.
   */
  async generateSummaryText(conversationText: string): Promise<string> {
    const prompt = `You are a summarization assistant. Summarize the following green building certification workspace chat conversation in a single concise sentence. Focus specifically on any resolved tasks, files discussed, or decisions made. If nothing was resolved, output a blank string. Do not include introductory text, headers, or bullet points.\n\nCONVERSATION:\n${conversationText}\n\nSUMMARY:`;

    let lastError: any = null;

    // Try Gemini
    const geminiKey = process.env.GEMINI_API_KEY || env.geminiApiKeys?.[0];
    if (geminiKey) {
      try {
        const res = await fetch(
          "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent",
          {
            method: "POST",
            headers: { "Content-Type": "application/json", "x-goog-api-key": geminiKey },
            body: JSON.stringify({
              contents: [{ parts: [{ text: prompt }] }]
            }),
            signal: AbortSignal.timeout(4000),
          }
        );
        if (res.ok) {
          const data = await res.json();
          const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
          if (text !== undefined) return text.trim();
        } else {
          const errText = await res.text();
          throw new Error(`Gemini status ${res.status}: ${errText}`);
        }
      } catch (e) {
        console.warn("Summary: Gemini failed", e);
        lastError = e;
      }
    }

    // Try Groq
    const groqKey = process.env.GROQ_API_KEY || env.groqApiKeys?.[0];
    if (groqKey) {
      try {
        const res = await fetch("https://api.groq.com/openai/v1/chat/completions", {
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
          const data = await res.json();
          const text = data.choices?.[0]?.message?.content;
          if (text !== undefined) return text.trim();
        } else {
          const errText = await res.text();
          throw new Error(`Groq status ${res.status}: ${errText}`);
        }
      } catch (e) {
        console.warn("Summary: Groq failed", e);
        lastError = e;
      }
    }

    if (lastError) {
      throw lastError;
    }

    throw new Error("Unable to summarize conversation due to API rate limit/timeout.");
  }

  /**
   * Wipes session conversation history and semantic memory, saving a summarized version first.
   */
  async resetSession(userId: string, projectId: string, force = false): Promise<void> {
    const session = await this.getOrCreateSession(userId, projectId);

    // 1. Get messages to summarize
    const messages = await this.getRecentMessages(session.id, 50);
    let summary = "";
    if (messages.length > 0 && !force) {
      const conversationText = messages.map(m => `${m.role === 'user' ? 'User' : 'Assistant'}: ${m.content}`).join("\n");
      try {
        summary = await this.generateSummaryText(conversationText);
      } catch (err: any) {
        console.error("[ResetSession] Summarization failed during reset:", err);
        throw new Error("Wipe Blocked: We couldn't summarize your active session (Rate Limit Expired or API Timeout). To prevent losing your chat context, the history has not been cleared.");
      }
    }

    // 2. Wipe messages and semantic memory
    const { error: errorMessages } = await this.admin.from("conversation_messages").delete().eq("session_id", session.id);
    if (errorMessages) throw errorMessages;
    
    const { error: errorMemory } = await this.admin.from("semantic_memory").delete().eq("session_id", session.id);
    if (errorMemory) throw errorMemory;

    // 3. Update session with new timestamp and summary
    const { error: errorSession } = await this.admin
      .from("conversation_sessions")
      .update({ 
        updated_at: new Date().toISOString(),
        session_summary: force ? session.session_summary : (summary || session.session_summary)
      })
      .eq("id", session.id);
    if (errorSession) throw errorSession;
  }
}

export const haritaRuntimeService = new HaritaRuntimeService();
