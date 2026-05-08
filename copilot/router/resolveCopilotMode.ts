import type { CopilotMode } from '../types';

/**
 * Resolve the copilot execution mode based on the detected intent.
 *
 * Intent strings that correspond to workflow actions are routed to the
 * "workflow" mode; all other intents default to the "conversation" mode.
 */
export function resolveCopilotMode(intent: string): CopilotMode {
  const workflowIntents = [
    'upload',
    'assign',
    'approve',
    'validate',
    'map_document',
  ];

  return workflowIntents.includes(intent) ? 'workflow' : 'conversation';
}

// Export type for clarity
export type { CopilotMode } from '../types';
