export class BlockerExplainer {
  public static explain(facts: any): string {
    if (facts?.missing && facts.missing.length > 0) {
      const missingStr = facts.missing.join(" and ").toLowerCase();
      return `The credit cannot proceed to submission because mandatory supporting evidence remains incomplete. Missing artifacts such as ${missingStr} are required to demonstrate IGBC compliance.`;
    }
    
    if (facts?.explicitBlockers && facts.explicitBlockers.length > 0) {
      return `The credit is currently blocked from submission due to critical process gates or manual holds. These blockers must be cleared before IGBC compliance can be verified.`;
    }

    return "The credit is blocked from progressing further in the certification pipeline until all outstanding holds are resolved.";
  }
}
