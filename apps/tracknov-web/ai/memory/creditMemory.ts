import { MemoryStore } from './memoryStore';

export class CreditMemory {
  constructor(private store: MemoryStore) {}

  async logEvent(projectId: string, creditId: string, eventData: any) {
    return this.store.storeMemory(projectId, 'credit', creditId, eventData);
  }

  async getHistory(projectId: string, creditId: string) {
    return this.store.getMemory(projectId, 'credit', creditId);
  }
}
