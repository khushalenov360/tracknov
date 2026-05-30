import { AsyncLocalStorage } from "node:async_hooks";

export interface GovernanceContext {
  projectId: string;
  actorId?: string;
  replayMode: boolean;
  frameworkVersion?: string;
  traceId?: string;
  parentTraceId?: string;
  causalityChainId?: string;
}

/**
 * Enterprise-grade AsyncLocalStorage for governing runtime side-effects.
 * Ensures strict tenant isolation and replay purity across async boundaries.
 * Extracted to a standalone module to prevent circular dependencies between 
 * interceptors, observability, and proof collectors.
 */
export const governanceLocalStorage = new AsyncLocalStorage<GovernanceContext>();
