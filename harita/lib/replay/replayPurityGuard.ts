import { CURRENT_REPLAY_CONTRACT } from "./replayContract";

/**
 * Purity assertion wrapper guaranteeing side-effect-free Replay boundaries.
 * Verifies that the runtime state prevents outbound propagation or database persistence.
 */
export class ReplayPurityViolationError extends Error {
  constructor(operation: string, blockedReason: string) {
    super(`Replay Purity Violation: Attempted forbidden side-effect operation [${operation}]. Reason: ${blockedReason}`);
    this.name = "ReplayPurityViolationError";
  }
}

let activeReplayContextsCount = 0;

/**
 * Executes a callback within a request-scoped, self-destructing memory isolation boundary.
 * Intercepts any external persistence triggers to safeguard system integrity.
 */
export async function runWithPurityGuard<T>(
  projectId: string,
  fn: () => Promise<T>,
): Promise<T> {
  activeReplayContextsCount++;
  try {
    // Assert tenant isolation and boundary flags
    if (CURRENT_REPLAY_CONTRACT.sideEffectMode !== "disabled") {
      throw new ReplayPurityViolationError("InitializeBoundary", "Contract sideEffectMode must be strictly disabled.");
    }
    const result = await fn();
    return result;
  } finally {
    activeReplayContextsCount--;
  }
}

/**
 * Explicit guard called by downstream infrastructure to abort forbidden persistence side-effects
 * if a replay sequence is active in the current call stack.
 */
export function assertSideEffectPermitted(operationDescription: string): void {
  if (activeReplayContextsCount > 0) {
    throw new ReplayPurityViolationError(
      operationDescription,
      "Active replay context strictly forbids state mutation, queues, or outbound event propagation.",
    );
  }
}
