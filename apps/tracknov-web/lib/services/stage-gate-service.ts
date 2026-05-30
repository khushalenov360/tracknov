import { createAdminClient } from "@/lib/supabase/admin";

export type MilestoneStatus = "LOCKED" | "IN_PROGRESS" | "COMPLETED";

export interface StageGateMilestone {
  id: string;
  name: string;
  status: MilestoneStatus;
  criteria: string[];
}

export class StageGateService {
  private get admin() {
    return createAdminClient();
  }

  async getMilestones(projectId: string): Promise<StageGateMilestone[]> {
    // In a production app, these milestones might be stored in the DB.
    // For now, we derive them from the project state and the knowledge engine.
    
    const { data: documents } = await this.admin
      .from("project_document")
      .select("doc_category, state")
      .eq("project_id", projectId);

    const docs = documents || [];

    const milestones: StageGateMilestone[] = [
      {
        id: "foundation",
        name: "Foundation",
        status: this.deriveStatus(docs, ["Soil Erosion Control", "Excavation Safety"]),
        criteria: [
          "Soil erosion control measures documented",
          "Excavation safety compliance verified"
        ]
      },
      {
        id: "structure",
        name: "Structure",
        status: this.deriveStatus(docs, ["RMC Invoices", "Steel Recycled Content"]),
        criteria: [
          "RMC sourcing distance verified (< 160km)",
          "Steel recycled content > 15%"
        ]
      },
      {
        id: "finishing",
        name: "Finishing",
        status: this.deriveStatus(docs, ["VOC Content", "FSC Wood"]),
        criteria: [
          "VOC content labels scanned & matched",
          "FSC wood certification verified"
        ]
      }
    ];

    return milestones;
  }

  private deriveStatus(docs: any[], requiredCategories: string[]): MilestoneStatus {
    const matchingDocs = docs.filter(d => requiredCategories.includes(d.doc_category));
    
    if (matchingDocs.length === 0) return "LOCKED";
    
    const allApproved = matchingDocs.length >= requiredCategories.length && 
                        matchingDocs.every(d => d.state === "APPROVED" || d.state === "complete");
    
    return allApproved ? "COMPLETED" : "IN_PROGRESS";
  }
}

export const stageGateService = new StageGateService();
