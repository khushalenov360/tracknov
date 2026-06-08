export class AssignmentExplainer {
  public static explain(facts: any): string {
    if (!facts || !facts.owner || !facts.credit) {
      return "Assignment explanation unavailable due to incomplete facts.";
    }
    
    // Default mock response per the spec
    if (facts.credit === "EDA C1" && facts.owner === "Architect") {
      return "The Architect is assigned because EDA C1 requires architectural drawings demonstrating circulation layouts and passage widths. These drawings are mandatory evidence for validating circulation efficiency.";
    }

    return `The ${facts.owner} is assigned because ${facts.credit} requires specialized documentation related to their domain. This evidence is mandatory for validating IGBC compliance.`;
  }
}
