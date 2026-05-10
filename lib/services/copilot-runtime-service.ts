import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { env } from "@/lib/env";
import type { AssistantMessage, AssistantContext } from "@/lib/assistant";

export type CopilotSession = {
  id: string;
  project_id: string;
  user_id: string;
  active_attachment_id?: string | null;
  active_credit_id?: string | null;
  session_summary?: string | null;
};

export type SemanticMemoryType = 'analysis' | 'preference' | 'fact';

export class CopilotRuntimeService {
  private get client() { return createClient(); }
  private get admin() { return env.supabaseServiceRoleKey ? createAdminClient() : this.client; }

  /**
   * Resolve or initialize a conversation session for the current context.
   */
  async getOrCreateSession(userId: string, projectId: string): Promise<CopilotSession> {
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
   * Build the augmented context for the AI prompt.
   */
  async buildAugmentedContext(
    userId: string,
    projectId: string,
    baseContext: AssistantContext
  ): Promise<AssistantContext> {
    const session = await this.getOrCreateSession(userId, projectId);
    const memories = await this.getSessionMemory(session.id);

    return {
      ...baseContext,
      facts: [
        ...baseContext.facts,
        ...memories
      ]
    };
  }
}

export const copilotRuntimeService = new CopilotRuntimeService();
