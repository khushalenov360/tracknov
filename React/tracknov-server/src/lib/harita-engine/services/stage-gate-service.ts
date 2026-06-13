export type MilestoneStatus = "LOCKED" | "IN_PROGRESS" | "COMPLETED";

export interface StageGateMilestone {
  id: string;
  name: string;
  status: MilestoneStatus;
  criteria: string[];
}

const MILESTONE_DEFINITIONS = [
  {
    id: "foundation",
    name: "Foundation",
    categories: ["Soil Erosion Control", "Excavation Safety"],
    criteria: [
      "Soil erosion control measures documented",
      "Excavation safety compliance verified",
    ],
  },
  {
    id: "structure",
    name: "Structure",
    categories: ["RMC Invoices", "Steel Recycled Content"],
    criteria: [
      "RMC sourcing distance verified (< 160km)",
      "Steel recycled content > 15%",
    ],
  },
  {
    id: "finishing",
    name: "Finishing",
    categories: ["VOC Content", "FSC Wood"],
    criteria: [
      "VOC content labels scanned & matched",
      "FSC wood certification verified",
    ],
  },
];

function deriveStatus(
  docs: Array<{ doc_category?: string | null; state?: string | null }>,
  requiredCategories: string[]
): MilestoneStatus {
  const matchingDocs = docs.filter((d) =>
    requiredCategories.includes(d.doc_category ?? "")
  );
  if (matchingDocs.length === 0) return "LOCKED";
  const allApproved =
    matchingDocs.length >= requiredCategories.length &&
    matchingDocs.every(
      (d) => d.state === "APPROVED" || d.state === "complete"
    );
  return allApproved ? "COMPLETED" : "IN_PROGRESS";
}

export class StageGateService {
  /**
   * Pure in-memory version — pass docs already loaded from getProjectWorkspace.
   * Use this on the Overview page to avoid a redundant DB round-trip.
   */
  getMilestonesFromDocs(
    docs: Array<{ doc_category?: string | null; state?: string | null }>
  ): StageGateMilestone[] {
    return MILESTONE_DEFINITIONS.map((def) => ({
      id: def.id,
      name: def.name,
      status: deriveStatus(docs, def.categories),
      criteria: def.criteria,
    }));
  }

  /**
   * DB version — kept for contexts where workspace docs are unavailable.
   * Prefer getMilestonesFromDocs when you already have the workspace.
   */
  async getMilestones(projectId: string): Promise<StageGateMilestone[]> {
    const { createAdminClient } = await import("@/lib/supabase/admin");
    const admin = createAdminClient();
    const { data: documents } = await admin
      .from("project_document")
      .select("doc_category, state")
      .eq("project_id", projectId);
    return this.getMilestonesFromDocs(documents ?? []);
  }
}

export const stageGateService = new StageGateService();
