// ============================================================
// ContributorCopilotEngine
// ============================================================
// Gives a specific contributor a personalised task brief:
//   - What they are responsible for uploading
//   - What they have already uploaded
//   - What is overdue or rejected
//   - Their single highest-priority action
//
// Trigger queries:
//   "What should the Architect do next?"
//   "Show me the Architect's pending items"
//   "MEP Consultant's status"
//   "What does the contractor need to upload?"
// ============================================================

import { createAdminClient } from "@/lib/supabase/admin";
import { ReasoningOutput } from "../reasoning/reasoning-engine";

const KNOWN_ROLES = [
  "Architect",
  "MEP Consultant",
  "Contractor",
  "PMC",
  "Client",
  "Sustainability Consultant",
  "Structural Consultant",
  "Landscape Architect",
];

export class ContributorCopilotEngine {
  public static async brief(query: string, projectId: string, runtimeContext: any): Promise<ReasoningOutput> {
    const supabase = createAdminClient();

    // ── 1. Identify the role from the query ──────────────────────────────
    const q = query.toLowerCase();
    const detectedRole = KNOWN_ROLES.find(r => q.includes(r.toLowerCase())) ?? null;

    if (!detectedRole) {
      return {
        directAnswer: `I couldn't identify a contributor role in your query. Try specifying one of: ${KNOWN_ROLES.join(", ")}.`,
        evidence: "No role detected.",
        igbcInterpretation: "Contributor copilot requires a specific role to generate a task brief.",
        risks: "None",
        recommendations: `Try: 'What should the Architect do next?' or 'Show the MEP Consultant's pending items.'`
      };
    }

    // ── 2. Find responsibilities for this role from the workflow ontology ─
    const { data: roleRow } = await supabase
      .from("workflow_role")
      .select("id, name")
      .eq("name", detectedRole)
      .maybeSingle();

    let responsibilities: string[] = [];
    if (roleRow) {
      const { data: respData } = await supabase
        .from("workflow_document_responsibility")
        .select("knowledge_evidence_type(name), action")
        .eq("role_id", roleRow.id);

      responsibilities = Array.from(
        new Set(respData?.map((r: any) => r.knowledge_evidence_type?.name).filter(Boolean) || [])
      ) as string[];
    }

    // ── 3. Check project documents: uploaded, pending, rejected ──────────
    let uploaded: string[] = [];
    let rejected: string[] = [];
    let pending: string[] = [];

    if (projectId && projectId !== "unknown") {
      const { data: docs } = await supabase
        .from("project_documents")
        .select("file_name, doc_category, state, created_at")
        .eq("project_id", projectId)
        .order("created_at", { ascending: false });

      if (docs) {
        uploaded = docs.filter((d: any) => d.state === "APPROVED").map((d: any) => d.file_name || d.doc_category);
        rejected = docs.filter((d: any) => d.state === "REJECTED").map((d: any) => d.file_name || d.doc_category);
        pending = docs.filter((d: any) => ["UPLOADED", "UNDER_REVIEW", "CLARIFICATION"].includes(d.state)).map((d: any) => d.file_name || d.doc_category);
      }
    }

    // ── 4. Compute highest-priority action ────────────────────────────────
    // Priority: rejected first (needs resubmission), then missing (from responsibilities)
    let priorityAction = "No immediate action required.";

    if (rejected.length > 0) {
      priorityAction = `Resubmit rejected document: ${rejected[0]}`;
    } else if (responsibilities.length > 0) {
      const notUploaded = responsibilities.filter(
        r => !uploaded.some(u => u.toUpperCase().includes(r))
      );
      if (notUploaded.length > 0) {
        priorityAction = `Upload missing: ${notUploaded[0]}`;
      }
    } else if (pending.length > 0) {
      priorityAction = `Follow up on pending review: ${pending[0]}`;
    }

    // ── 5. Build response ─────────────────────────────────────────────────
    const responsibilityList = responsibilities.length
      ? responsibilities.map(r => `  • ${r}`).join("\n")
      : "  (No responsibilities mapped for this role in the workflow ontology)";

    const uploadedList = uploaded.length ? uploaded.slice(0, 5).map(u => `  ✓ ${u}`).join("\n") : "  (none)";
    const rejectedList = rejected.length ? rejected.slice(0, 5).map(r => `  ✗ ${r}`).join("\n") : "  (none)";
    const pendingList = pending.length ? pending.slice(0, 5).map(p => `  ⏳ ${p}`).join("\n") : "  (none)";

    const directAnswer = [
      `**Contributor Copilot — ${detectedRole}**`,
      ``,
      `Responsibilities:`,
      responsibilityList,
      ``,
      `Already Uploaded (Approved):`,
      uploadedList,
      ``,
      `Pending Review:`,
      pendingList,
      ``,
      `Rejected (Needs Resubmission):`,
      rejectedList,
      ``,
      `▶ Priority Action:`,
      `  ${priorityAction}`,
    ].join("\n");

    return {
      directAnswer,
      evidence: JSON.stringify({
        role: detectedRole,
        responsibilities,
        uploaded: uploaded.length,
        pending: pending.length,
        rejected: rejected.length,
        priorityAction,
      }),
      igbcInterpretation: `Contributor brief for ${detectedRole} sourced from workflow ontology and live project document state.`,
      risks: rejected.length > 0
        ? `${rejected.length} rejected document(s) require resubmission.`
        : "No critical blockers detected.",
      recommendations: priorityAction,
    };
  }
}
