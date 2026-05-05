import type { ProjectWorkspace } from "@/lib/types";

export type ReviewerCheckStatus = "pass" | "warning" | "fail";

export type ReviewerFinding = {
  creditId: string;
  creditCode: string;
  creditName: string;
  severity: ReviewerCheckStatus;
  message: string;
};

export type ReviewerSimulationResult = {
  status: ReviewerCheckStatus;
  summary: {
    creditsChecked: number;
    findings: number;
    failed: number;
    warnings: number;
  };
  findings: ReviewerFinding[];
};

function normalizeState(value: unknown): string {
  return String(value ?? "").trim().toUpperCase();
}

function isApprovedState(state: string): boolean {
  return state === "APPROVED";
}

export function runReviewerSimulation(workspace: ProjectWorkspace): ReviewerSimulationResult {
  const findings: ReviewerFinding[] = [];

  for (const credit of workspace.credits ?? []) {
    const requirements = (credit.documents_required ?? []).filter((item) => item.required);
    const latestDocs = (credit.documents ?? []).filter((doc: any) => doc.is_latest !== false);

    // Completeness check: required slots must have at least one latest document.
    const missingRequired = requirements.filter(
      (required) => !latestDocs.some((doc) => doc.doc_category === required.type),
    );
    if (missingRequired.length > 0) {
      findings.push({
        creditId: credit.id,
        creditCode: credit.credit_code,
        creditName: credit.credit_name,
        severity: "fail",
        message: `Missing required evidence: ${missingRequired.map((item) => item.label || item.type).join(", ")}.`,
      });
    }

    // Consistency check: latest docs should not have duplicate categories.
    const counts = new Map<string, number>();
    for (const doc of latestDocs) {
      const key = String(doc.doc_category ?? "").trim();
      if (!key) continue;
      counts.set(key, (counts.get(key) ?? 0) + 1);
    }
    const duplicated = Array.from(counts.entries()).filter(([, count]) => count > 1);
    if (duplicated.length > 0) {
      findings.push({
        creditId: credit.id,
        creditCode: credit.credit_code,
        creditName: credit.credit_name,
        severity: "warning",
        message: `Multiple latest documents detected for: ${duplicated.map(([key]) => key).join(", ")}.`,
      });
    }

    // Compliance check: mandatory credits should have approved latest docs in required slots.
    if (credit.is_mandatory) {
      const nonApprovedRequired = requirements.filter((required) => {
        const candidates = latestDocs.filter((doc) => doc.doc_category === required.type);
        if (candidates.length === 0) return true;
        return !candidates.some((doc) => isApprovedState(normalizeState((doc as any).state ?? doc.status)));
      });
      if (nonApprovedRequired.length > 0) {
        findings.push({
          creditId: credit.id,
          creditCode: credit.credit_code,
          creditName: credit.credit_name,
          severity: "fail",
          message: `Mandatory credit has pending/non-approved required evidence: ${nonApprovedRequired
            .map((item) => item.label || item.type)
            .join(", ")}.`,
        });
      }
    }
  }

  const failed = findings.filter((item) => item.severity === "fail").length;
  const warnings = findings.filter((item) => item.severity === "warning").length;
  const status: ReviewerCheckStatus = failed > 0 ? "fail" : warnings > 0 ? "warning" : "pass";

  return {
    status,
    summary: {
      creditsChecked: workspace.credits.length,
      findings: findings.length,
      failed,
      warnings,
    },
    findings,
  };
}

