export type QuestionType = "EXECUTIVE_PRIORITY" | "RESOURCE_ALLOCATION" | "WEEKLY_ACTIONS";

export interface ExecutivePriorityOutput {
  action: string;
  expectedImpact: number;
  readinessGain: number;
  certificationGain: number;
  owner: string;
  rationale: string;
}

export interface ResourceAllocationOutput {
  contributor: string;
  recommendedWork: string;
  impact: number;
  effort: number;
}

export interface WeeklyActionOutput {
  rank: number;
  action: string;
  impact: number;
  dependenciesCleared: string[];
}

export class ExecutiveDecisionEngine {
  static determineQuestionType(question: string): QuestionType {
    const q = question.toLowerCase();
    if (q.includes("resource") || q.includes("allocate") || q.includes("who should")) {
      return "RESOURCE_ALLOCATION";
    }
    if (q.includes("week") || q.includes("top 5")) {
      return "WEEKLY_ACTIONS";
    }
    return "EXECUTIVE_PRIORITY";
  }

  static getExecutivePriority(projectState: any): ExecutivePriorityOutput {
    return {
      action: "Upload core compliance documents for Energy Performance",
      expectedImpact: 85,
      readinessGain: 20,
      certificationGain: 15,
      owner: "Energy Modeler",
      rationale: "Energy modeling results block 3 other credits and account for 15% of the total certification score."
    };
  }

  static getResourceAllocation(projectState: any): ResourceAllocationOutput[] {
    return [
      {
        contributor: "Sustainability Consultant",
        recommendedWork: "Review pending Water Efficiency documents",
        impact: 70,
        effort: 2,
      },
      {
        contributor: "MEP Engineer",
        recommendedWork: "Upload HVAC commissioning reports",
        impact: 90,
        effort: 4,
      }
    ];
  }

  static getWeeklyActions(projectState: any): WeeklyActionOutput[] {
    return [
      {
        rank: 1,
        action: "Finalize Energy Model",
        impact: 95,
        dependenciesCleared: ["EA C1", "EA C2", "EA C3"]
      },
      {
        rank: 2,
        action: "Submit Water Calculations",
        impact: 80,
        dependenciesCleared: ["WE C1"]
      }
    ];
  }

  static answerExecutiveQuestion(question: string, projectState: any): any {
    const type = this.determineQuestionType(question);
    switch (type) {
      case "EXECUTIVE_PRIORITY":
        return this.getExecutivePriority(projectState);
      case "RESOURCE_ALLOCATION":
        return this.getResourceAllocation(projectState);
      case "WEEKLY_ACTIONS":
        return this.getWeeklyActions(projectState);
    }
  }
}
