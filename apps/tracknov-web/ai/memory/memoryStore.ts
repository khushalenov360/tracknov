import { createClient } from '@supabase/supabase-js';

export class MemoryStore {
  constructor(private supabaseAdmin: any) {}

  async storeMemory(projectId: string, entityType: string, entityId: string, contextData: any) {
    const { data, error } = await this.supabaseAdmin
      .from('ai_memory')
      .insert({
        project_id: projectId,
        entity_type: entityType,
        entity_id: entityId,
        context_data: contextData,
      })
      .select()
      .single();

    if (error) throw new Error(error.message);
    return data;
  }

  async getMemory(projectId: string, entityType: string, entityId?: string) {
    let query = this.supabaseAdmin
      .from('ai_memory')
      .select('*')
      .eq('project_id', projectId)
      .eq('entity_type', entityType);

    if (entityId) {
      query = query.eq('entity_id', entityId);
    }

    const { data, error } = await query;
    if (error) throw new Error(error.message);
    return data;
  }
}
