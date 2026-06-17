import type { HaritaContext } from "./vertexService";
import { getComplianceThresholds } from "../tools/complianceTools";
import { getProjectCreditCatalog, type ProjectCreditCatalogItem } from "./supabaseService";

export type HaritaPreparedAttachment = {
  fileName: string;
  mimeType: string;
  fileSize: number;
  parsedText: string;
  summary: string;
  evidenceType: string;
  hasComplianceSignals: boolean;
  extractedAt: string;
};

export type HaritaActionButton = {
  id: string;
  label: string;
  kind: "evaluate_credit" | "explore_matches" | "refer_reviewer" | "map_document_directly";
  targetId?: string;
  creditCode?: string;
  confidence?: number;
};

export type HaritaDocumentMatch = {
  targetId: string;
  creditCode: string;
  creditName: string;
  confidence: number;
  rationale: string;
};

export type HaritaAuditResult = {
  targetId: string;
  creditCode: string;
  creditName: string;
  confidence: number;
  band: "high_risk" | "medium_risk" | "low_risk";
  rationale: string;
  missingEvidence: string[];
};

export type HaritaResponseMeta = {
  kind: "document_analysis";
  mode: "discovery" | "audit" | "irrelevant";
  attachment: HaritaPreparedAttachment;
  matches?: HaritaDocumentMatch[];
  audit?: HaritaAuditResult;
  actions?: HaritaActionButton[];
};

export type AttachmentAnalysisResult = {
  markdown: string;
  meta: HaritaResponseMeta;
};

type ComplianceThresholdResult = Awaited<ReturnType<typeof getComplianceThresholds>>;

const STOP_WORDS = new Set([
  "a", "an", "and", "are", "as", "at", "be", "by", "for", "from", "has", "have", "in", "is",
  "it", "its", "of", "on", "or", "that", "the", "this", "to", "was", "with",
]);

const EVIDENCE_HINTS: Record<string, string[]> = {
  CERTIFICATE_DECLARATION: ["certificate", "declaration", "iso", "signed", "manufacturer"],
  TECH_SPECS: ["technical", "datasheet", "specification", "model", "product data", "cut sheet"],
  CALCULATIONS_TABLES: ["calculation", "table", "excel", "sheet", "load", "watt", "flow rate"],
  DRAWINGS: ["drawing", "plan", "layout", "cad", "section", "elevation"],
  PIC_VIDEO: ["photo", "image", "video", "site photo", "snapshot"],
  NARRATIVE: ["narrative", "methodology", "approach", "statement", "description"],
  INVOICES: ["invoice", "bill", "purchase order", "po", "receipt"],
};

function normalize(value: string) {
  return value.trim().toLowerCase();
}

function tokenize(value: string) {
  return normalize(value)
    .split(/[^a-z0-9.+/%-]+/i)
    .map((entry) => entry.trim())
    .filter((entry) => entry.length >= 3 && !STOP_WORDS.has(entry));
}

function unique<T>(values: T[]) {
  return Array.from(new Set(values));
}

function compact(value: string, limit = 240) {
  const singleLine = value.replace(/\s+/g, " ").trim();
  if (singleLine.length <= limit) return singleLine;
  return `${singleLine.slice(0, limit - 3).trim()}...`;
}

function normalizeDocType(value: string | null | undefined) {
  return normalize(String(value || "")).replace(/[^a-z0-9]+/g, "_").replace(/^_+|_+$/g, "");
}

function buildCreditCorpus(credit: ProjectCreditCatalogItem) {
  const requiredDocs = (credit.documents_required || [])
    .filter((entry) => entry.required)
    .map((entry) => String(entry.type || ""))
    .filter(Boolean);

  return [
    credit.credit_code || "",
    credit.credit_name || "",
    credit.category || "",
    credit.category_name || "",
    credit.responsible_role || "",
    credit.what_to_submit || "",
    ...requiredDocs,
  ].join(" ");
}

function scoreAttachmentAgainstCredit(attachment: HaritaPreparedAttachment, credit: ProjectCreditCatalogItem) {
  const corpus = buildCreditCorpus(credit);
  const corpusTokens = unique(tokenize(corpus));
  const textTokens = unique(tokenize(`${attachment.summary} ${attachment.parsedText}`));
  const textSet = new Set(textTokens);
  const overlap = corpusTokens.filter((token) => textSet.has(token));
  const overlapRatio = corpusTokens.length ? overlap.length / corpusTokens.length : 0;

  const requiredDocs = (credit.documents_required || [])
    .filter((entry) => entry.required)
    .map((entry) => String(entry.type || ""))
    .filter(Boolean);
  const normalizedEvidenceType = normalizeDocType(attachment.evidenceType);
  const normalizedRequiredDocs = requiredDocs.map((entry) => normalizeDocType(entry));
  const requirementMatch = normalizedRequiredDocs.includes(normalizedEvidenceType);

  const hintTokens = unique(
    requiredDocs.flatMap((entry) => EVIDENCE_HINTS[normalizeDocType(entry).toUpperCase()] || tokenize(entry)),
  );
  const hintMatches = hintTokens.filter((token) => textSet.has(normalize(token)));

  const hasNumbers = /\b\d+(?:\.\d+)?\b/.test(attachment.parsedText);
  const hasTechnicalUnits = /\b(kwh|kw|w\/m2|w\/sqm|lpd|voc|co2|cfm|ltr|lpm|gpm|mm|sqm|sqft|ahri|leed|igbc)\b/i.test(attachment.parsedText);
  const hasReadableText = attachment.parsedText.trim().length >= 80;

  let score = 20;
  score += overlapRatio * 38;
  score += Math.min(hintMatches.length * 6, 18);
  if (requirementMatch) score += 20;
  if (attachment.hasComplianceSignals) score += 8;
  if (hasNumbers) score += 4;
  if (hasTechnicalUnits) score += 6;
  if (!hasReadableText) score -= 12;
  if (attachment.evidenceType === "UNKNOWN") score -= 8;

  const confidence = Math.max(0, Math.min(99, Math.round(score)));
  const rationaleParts = [
    overlap.length ? `keyword overlap on ${overlap.slice(0, 6).join(", ")}` : "limited direct keyword overlap",
    requirementMatch ? `attachment type aligns with required document type (${attachment.evidenceType})` : "attachment type does not exactly match a required document type",
    hasTechnicalUnits ? "technical metrics detected" : "few technical metrics detected",
  ];

  return {
    confidence,
    overlap,
    rationale: compact(rationaleParts.join("; ")),
  };
}

function buildDiscoveryMarkdown(projectName: string, matches: HaritaDocumentMatch[]) {
  const lines = [
    `I analyzed the attached document for **${projectName}** and found the strongest compliance matches below.`,
    "",
    "Please choose the credit you want Harita to evaluate against next:",
    "",
    ...matches.map((match) => `- **${match.creditCode} - ${match.creditName}** [Match Confidence: ${match.confidence}%]`),
  ];

  return lines.join("\n");
}

function buildIrrelevantMarkdown() {
  return "This document contains no applicable compliance parameters. No tracker modifications are permitted.";
}

function detectExplicitCreditTarget(message: string, credits: ProjectCreditCatalogItem[], attachmentTargetId?: string | null) {
  if (attachmentTargetId) {
    const [projectCreditId] = attachmentTargetId.split("::");
    return credits.find((credit) => credit.id === projectCreditId) || null;
  }

  const normalizedMessage = normalize(message);
  return credits.find((credit) => {
    const code = normalize(credit.credit_code || "");
    const codeTight = code.replace(/\s+/g, "");
    const name = normalize(credit.credit_name || "");
    return Boolean(
      (code && (normalizedMessage.includes(code) || normalizedMessage.includes(codeTight))) ||
      (name && normalizedMessage.includes(name)),
    );
  }) || null;
}

function buildMissingEvidence(credit: ProjectCreditCatalogItem, thresholdResult: ComplianceThresholdResult | null, requirementMatched: boolean) {
  const missing = new Set<string>();
  const requiredDocs = (credit.documents_required || [])
    .filter((entry) => entry.required)
    .map((entry) => String(entry.type || ""))
    .filter(Boolean);

  if (!requirementMatched && requiredDocs.length) {
    missing.add(`Required evidence types still expected: ${requiredDocs.join(", ")}`);
  }

  if (credit.what_to_submit?.trim()) {
    missing.add(`Submission baseline: ${compact(credit.what_to_submit.trim(), 180)}`);
  }

  const thresholdNote = thresholdResult?.credit_specific_thresholds;
  if (thresholdNote && typeof thresholdNote === "object" && Array.isArray((thresholdNote as { required_document_types?: unknown }).required_document_types)) {
    const exactRequired = ((thresholdNote as { required_document_types?: unknown }).required_document_types as unknown[])
      .map((entry) => String(entry || "").trim())
      .filter(Boolean);
    if (exactRequired.length) {
      missing.add(`Exact credit baseline expects: ${exactRequired.join(", ")}`);
    }
  }

  return Array.from(missing);
}

function buildAuditMarkdown(credit: ProjectCreditCatalogItem, confidence: number, bandLabel: string, missingEvidence: string[]) {
  const lines = [
    `**${credit.credit_code || "Credit"} - ${credit.credit_name || "Untitled credit"}**`,
    "",
    `Confidence: **${confidence}%**`,
    `Decision band: **${bandLabel}**`,
  ];

  if (missingEvidence.length) {
    lines.push("", "Gaps still detected:", ...missingEvidence.map((item) => `- ${item}`));
  }

  return lines.join("\n");
}

export async function analyzeAttachmentForProject(
  message: string,
  context: HaritaContext | undefined,
  attachment: HaritaPreparedAttachment,
  attachmentTargetId?: string | null,
): Promise<AttachmentAnalysisResult> {
  const catalog = await getProjectCreditCatalog({
    projectId: context?.projectId,
    title: context?.title,
    currentItem: context?.currentItem,
  });

  if (!catalog.matchFound || !catalog.project) {
    throw new Error(catalog.reason || "No active project could be resolved for attachment analysis.");
  }

  if (!attachment.hasComplianceSignals && !attachment.parsedText.trim()) {
    return {
      markdown: buildIrrelevantMarkdown(),
      meta: {
        kind: "document_analysis",
        mode: "irrelevant",
        attachment,
        actions: [],
      },
    };
  }

  const targetCredit = detectExplicitCreditTarget(message, catalog.credits, attachmentTargetId);
  if (!targetCredit) {
    const matches = catalog.credits
      .filter((credit) => (credit.completion_pct || 0) < 100)
      .map((credit) => {
        const scored = scoreAttachmentAgainstCredit(attachment, credit);
        return {
          targetId: `${credit.id}::${normalizeDocType((credit.documents_required || []).find((entry) => entry.required)?.type) || normalizedFallbackDocType(attachment)}`,
          creditCode: credit.credit_code || "UNMAPPED",
          creditName: credit.credit_name || "Untitled credit",
          confidence: scored.confidence,
          rationale: scored.rationale,
        } satisfies HaritaDocumentMatch;
      })
      .filter((entry) => entry.confidence >= 25)
      .sort((a, b) => b.confidence - a.confidence)
      .slice(0, 4);

    if (!matches.length) {
      return {
        markdown: buildIrrelevantMarkdown(),
        meta: {
          kind: "document_analysis",
          mode: "irrelevant",
          attachment,
          actions: [],
        },
      };
    }

    return {
      markdown: buildDiscoveryMarkdown(catalog.project.name, matches),
      meta: {
        kind: "document_analysis",
        mode: "discovery",
        attachment,
        matches,
        actions: [
          ...matches.map((match) => ({
            id: `evaluate-${match.targetId}`,
            label: `Evaluate for ${match.creditCode}`,
            kind: "evaluate_credit" as const,
            targetId: match.targetId,
            creditCode: match.creditCode,
            confidence: match.confidence,
          })),
          {
            id: "explore-matches",
            label: "Explore Other Credits",
            kind: "explore_matches" as const,
          },
        ],
      },
    };
  }

  const scored = scoreAttachmentAgainstCredit(attachment, targetCredit);
  const primaryRequired = normalizeDocType((targetCredit.documents_required || []).find((entry) => entry.required)?.type);
  const requirementMatched = Boolean(primaryRequired && primaryRequired === normalizeDocType(attachment.evidenceType));
  const thresholdResult = await getComplianceThresholds(
    {
      projectId: catalog.project.id,
      projectCreditId: targetCredit.id,
      creditCode: targetCredit.credit_code,
      title: catalog.project.name,
      currentItem: context?.currentItem,
    },
    context,
  ) as ComplianceThresholdResult;

  const band = scored.confidence <= 64 ? "high_risk" : scored.confidence <= 85 ? "medium_risk" : "low_risk";
  const missingEvidence = buildMissingEvidence(targetCredit, thresholdResult, requirementMatched);
  const targetId = `${targetCredit.id}::${primaryRequired || normalizedFallbackDocType(attachment)}`;

  const actions: HaritaActionButton[] = band === "low_risk"
    ? [{
        id: `map-${targetId}`,
        label: "Map Document Directly",
        kind: "map_document_directly",
        targetId,
        creditCode: targetCredit.credit_code || undefined,
        confidence: scored.confidence,
      }]
    : band === "medium_risk"
      ? [{
          id: `review-${targetId}`,
          label: "Refer to Line Reviewer",
          kind: "refer_reviewer",
          targetId,
          creditCode: targetCredit.credit_code || undefined,
          confidence: scored.confidence,
        }]
      : [];

  return {
    markdown: buildAuditMarkdown(
      targetCredit,
      scored.confidence,
      band === "low_risk" ? "Direct pathway" : band === "medium_risk" ? "Reviewer escalation" : "Hard block",
      missingEvidence,
    ),
    meta: {
      kind: "document_analysis",
      mode: "audit",
      attachment,
      audit: {
        targetId,
        creditCode: targetCredit.credit_code || "UNMAPPED",
        creditName: targetCredit.credit_name || "Untitled credit",
        confidence: scored.confidence,
        band,
        rationale: scored.rationale,
        missingEvidence,
      },
      actions,
    },
  };
}

function normalizedFallbackDocType(attachment: HaritaPreparedAttachment) {
  const normalized = normalizeDocType(attachment.evidenceType);
  return normalized || "narrative";
}
