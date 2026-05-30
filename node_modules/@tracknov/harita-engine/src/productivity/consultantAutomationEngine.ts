export interface AutomationWorkflowRule {
  id: string;
  triggerType: "stale_upload" | "clarification_pending" | "supplier_expiry" | "reviewer_delay";
  thresholdHours: number;
  assignedAction: "SEND_EMAIL_PING" | "TRIGGER_IMMEDIATE_ESCALATION" | "RE_LINK_EVIDENCE";
  active: boolean;
}

export interface AutomationTelemetry {
  rulesExecutedCount: number;
  manualHoursSaved: number;
  escalationFrequency: number;
  activeBottlenecks: string[];
}

export class ConsultantAutomationEngine {
  private static telemetryStore: AutomationTelemetry = {
    rulesExecutedCount: 142,
    manualHoursSaved: 71.5,
    escalationFrequency: 3.2, // %
    activeBottlenecks: ["Supplier chemical reports", "structural mill tests"]
  };

  /**
   * Evaluates active rules and increments saved human operational hours
   */
  static triggerRuleCheck(rule: AutomationWorkflowRule): {
    triggered: boolean;
    hoursSaved: number;
    actionMessage: string;
  } {
    if (!rule.active) {
      return { triggered: false, hoursSaved: 0, actionMessage: "Rule is currently inactive." };
    }

    // Simulate rule triggers
    const triggered = Math.random() > 0.4;
    let hoursSaved = 0.5; // default 30 mins saved per notification automation
    let actionMessage = "";

    if (triggered) {
      this.telemetryStore.rulesExecutedCount += 1;
      
      switch (rule.triggerType) {
        case "stale_upload":
          hoursSaved = 0.8;
          actionMessage = `Warning: Upload for HVAC remains outstanding for ${rule.thresholdHours}h. Triggered supplier alert.`;
          break;
        case "clarification_pending":
          hoursSaved = 1.2;
          actionMessage = `Escalation: Clarification loop exceeds SLA threshold of ${rule.thresholdHours}h. Notifying Senior Auditor.`;
          this.telemetryStore.escalationFrequency += 0.1;
          break;
        case "supplier_expiry":
          hoursSaved = 0.5;
          actionMessage = `Notice: Certifications expire in less than 30 days. Pinging manufacturer.`;
          break;
        case "reviewer_delay":
          hoursSaved = 1.5;
          actionMessage = `Reminder: Reviewer queue delayed. Triggering auto-bump on control console.`;
          break;
      }

      this.telemetryStore.manualHoursSaved += hoursSaved;
    }

    return {
      triggered,
      hoursSaved,
      actionMessage
    };
  }

  /**
   * Retrieves active productivity metrics
   */
  static getTelemetry(): AutomationTelemetry {
    return this.telemetryStore;
  }
}
