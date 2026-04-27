import creditCatalog from "@/data/igbc-green-interiors-v2.json";
import type { CatalogCredit } from "@/lib/types";

export const igbcCreditCatalog = creditCatalog as CatalogCredit[];

export function buildSeedCredits(projectId: string) {
  return igbcCreditCatalog.map((credit) => ({
    project_id: projectId,
    credit_code: credit.credit_code,
    category: credit.credit_code.split(" ")[0],
    credit_name: credit.credit_name,
    is_mandatory: credit.is_mandatory,
    documents_required: credit.documents_required,
    completion_pct: 0,
    status: credit.na ? "complete" : "pending",
    blocked_by: null,
    na: credit.na,
    documentation_summary: credit.documentation_summary,
  }));
}
