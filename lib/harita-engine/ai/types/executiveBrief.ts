export interface ExecutiveBrief {
  summary: string;
  primaryAction: {
    title: string;
    owner?: string;
    dueDate?: string;
    priority: "critical" | "high" | "medium";
  };
  businessImpact: string[];
  risks: string[];
  recommendations: string[];
  confidence: number;
  evidence: unknown[];
}
