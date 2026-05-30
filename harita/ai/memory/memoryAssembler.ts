import { MemoryStore } from './memoryStore';

export class MemoryAssembler {
  constructor(private store: MemoryStore) {}

  async assembleProjectContext(projectId: string) {
    const projectMemories = await this.store.getMemory(projectId, 'project');
    const creditMemories = await this.store.getMemory(projectId, 'credit');
    const clarificationMemories = await this.store.getMemory(projectId, 'clarification');

    return {
      project: projectMemories,
      credits: creditMemories,
      clarifications: clarificationMemories,
    };
  }
}
