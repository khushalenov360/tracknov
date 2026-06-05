import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

export class StatePersistence {
  public static async saveAgentState(projectId: string, sessionId: string, stateBlob: any) {
    const client = createAdminClient();
    const { error } = await client.from('harita_memory_state').upsert({
      project_id: projectId,
      session_id: sessionId,
      agent_state: stateBlob,
      updated_at: new Date().toISOString()
    }, { onConflict: 'project_id, session_id' });
    
    if (error) {
      console.error("Failed to save Harita memory state:", error);
      throw error;
    }
  }
  
  public static async loadAgentState(projectId: string, sessionId: string) {
    const client = createAdminClient();
    const { data, error } = await client
      .from('harita_memory_state')
      .select('agent_state')
      .eq('project_id', projectId)
      .eq('session_id', sessionId)
      .single();
      
    if (error && error.code !== 'PGRST116') {
      console.error("Failed to load Harita memory state:", error);
    }
    return data?.agent_state || null;
  }
}
