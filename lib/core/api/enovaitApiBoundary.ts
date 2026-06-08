import { ApiTier } from './catalog';

export class EnovAitBoundary {
  /**
   * Evaluates if a request payload attempts a restricted state transition.
   * AI is prohibited from directly changing entities to 'APPROVED', 'REJECTED', 'SUBMITTED', etc.
   */
  static isStateChangeRestricted(payload: any): boolean {
    if (!payload || typeof payload !== 'object') return false;
    
    // Check for explicit state properties often used in mutations
    const restrictedStates = ['APPROVED', 'REJECTED', 'SUBMITTED', 'owner_approved', 'approved', 'rejected'];
    
    const stateVal = payload.state || payload.status || payload.workflow_state;
    if (stateVal && restrictedStates.includes(stateVal)) {
      return true;
    }

    // Check for explicit action verbs in workflow payloads
    const actionVal = payload.action;
    if (actionVal && restrictedStates.includes(actionVal)) {
      return true;
    }

    return false;
  }

  /**
   * Enforces the governance boundary on EnovAIT origin requests.
   * Throws an error if the AI attempts a prohibited action.
   */
  static validateIntelligenceRequest(path: string, method: string, payload: any): void {
    // 1. AI cannot hit pure internal workflow transition endpoints
    if (path.includes('/api/workflow') && method === 'POST') {
      throw new Error("[GOVERNANCE] EnovAIT cannot invoke manual workflow transitions.");
    }

    // 2. AI cannot issue state-change mutations on primary entities
    if (['POST', 'PATCH', 'PUT'].includes(method)) {
      if (this.isStateChangeRestricted(payload)) {
        throw new Error("[GOVERNANCE] EnovAIT is prohibited from authorizing or rejecting entity states.");
      }
    }
  }
}
