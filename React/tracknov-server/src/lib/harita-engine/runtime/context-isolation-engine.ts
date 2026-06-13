import { haritaRuntimeService } from "../services/harita-runtime-service";

export enum ArtifactState {
  ACTIVE = "ACTIVE",
  DISCARDED = "DISCARDED",
  MAPPED = "MAPPED",
  UNMAPPED = "UNMAPPED",
  ARCHIVED = "ARCHIVED"
}

export interface RuntimeArtifact {
  id?: string;
  name: string;
  type?: string;
  status: ArtifactState | string;
  [key: string]: any;
}

export class ContextIsolationEngine {
  public async setArtifactState(userId: string, projectId: string, artifactId: string, state: ArtifactState) {
    const session = await haritaRuntimeService.getOrCreateSession(userId, projectId);
    await haritaRuntimeService.storeSemanticMemory(session.id, 'artifact_state' as any, artifactId, { status: state });
  }

  public async getDiscardedArtifactIds(userId: string, projectId: string): Promise<Set<string>> {
    const session = await haritaRuntimeService.getOrCreateSession(userId, projectId);
    const memories = await haritaRuntimeService.getSessionMemoryRaw(session.id);
    const discarded = new Set<string>();
    for (const mem of memories) {
      if (mem.memory_type === 'artifact_state' && mem.memory_value?.status === ArtifactState.DISCARDED) {
        discarded.add(mem.memory_key);
      }
    }
    return discarded;
  }

  public filterActiveEvidence(evidence: RuntimeArtifact[], discardedIds: Set<string>): RuntimeArtifact[] {
    return evidence.filter(e => {
      if (e.id && discardedIds.has(e.id)) {
        return false;
      }
      if (e.status === ArtifactState.DISCARDED || e.status === "DISCARDED" || e.status === "DELETED") {
        return false;
      }
      // Only permit known active states
      return e.status === ArtifactState.ACTIVE || e.status === "READY" || e.status === "uploaded" || e.status === "MAPPED";
    });
  }
}

export const contextIsolationEngine = new ContextIsolationEngine();
