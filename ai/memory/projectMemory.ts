import { MemoryStore } from './memoryStore';

export class ProjectMemory {
  constructor(private store: MemoryStore) {}

  async logEvent(projectId: string, eventData: any) {
    return this.store.storeMemory(projectId, 'project', projectId, eventData);
  }

  async getHistory(projectId: string) {
    return this.store.getMemory(projectId, 'project');
  }
}
