import { MemoryStore } from './memoryStore';

export class ClarificationMemory {
  constructor(private store: MemoryStore) {}

  async logEvent(projectId: string, clarificationId: string, eventData: any) {
    return this.store.storeMemory(projectId, 'clarification', clarificationId, eventData);
  }

  async getHistory(projectId: string, clarificationId: string) {
    return this.store.getMemory(projectId, 'clarification', clarificationId);
  }
}
