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
  mode: "document_answer" | "discovery" | "audit" | "irrelevant";
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

type ScoredDocumentMatch = HaritaDocumentMatch & {
  requirementMatch: boolean;
  matchedStrongDomains: string[];
  identityOverlapCount: number;
};

const STOP_WORDS = new Set([
  "a", "an", "and", "are", "as", "at", "be", "by", "for", "from", "has", "have", "in", "is",
  "it", "its", "of", "on", "or", "that", "the", "this", "to", "was", "with",
  "project", "projects", "credit", "credits", "green", "interiors", "igbc", "document", "documents",
  "required", "requirement", "requirements", "submission", "submit", "target", "certified", "compliance",
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

const DOMAIN_SIGNAL_GROUPS = [
  {
    name: "water",
    attachmentKeywords: ["plumbing", "sanitary", "fixture", "faucet", "urinal", "flow", "flush", "lpm", "gpm", "water"],
    creditPatterns: [/\bwater\b/i, /\bwc\b/i, /\bwe\b/i, /fixture/i, /plumb/i, /sanitary/i, /flow/i, /irrigation/i],
    positiveBoost: 20,
    mismatchPenalty: 10,
  },
  {
    name: "energy",
    attachmentKeywords: ["energy", "lighting", "lpd", "watt", "kw", "kwh", "meter", "hvac", "chiller", "cooling"],
    creditPatterns: [/\bee\b/i, /energy/i, /lighting/i, /hvac/i, /meter/i, /cooling/i, /power/i],
    positiveBoost: 18,
    mismatchPenalty: 9,
  },
  {
    name: "materials",
    attachmentKeywords: ["material", "recycled", "salvaged", "wood", "fsc", "cement", "steel", "embodied", "procurement"],
    creditPatterns: [/\bmr\b/i, /\bim\b/i, /material/i, /recycled/i, /salvaged/i, /fsc/i, /wood/i],
    positiveBoost: 16,
    mismatchPenalty: 8,
  },
  {
    name: "indoor_environment",
    attachmentKeywords: ["indoor", "iaq", "voc", "co2", "ventilation", "daylight", "thermal", "comfort", "views", "acoustic"],
    creditPatterns: [/\bie\b/i, /indoor/i, /iaq/i, /voc/i, /ventilation/i, /thermal/i, /daylight/i, /comfort/i],
    positiveBoost: 16,
    mismatchPenalty: 8,
  },
  {
    name: "site_landscape",
    attachmentKeywords: ["site", "landscape", "greenery", "soil", "biodiversity", "heat island", "erosion", "parking", "transport"],
    creditPatterns: [/\bss\b/i, /site/i, /landscape/i, /green/i, /transport/i, /parking/i, /biodiversity/i],
    positiveBoost: 16,
    mismatchPenalty: 8,
  },
  {
    name: "waste",
    attachmentKeywords: ["waste", "segregation", "recycling", "diversion", "debris", "compost", "landfill"],
    creditPatterns: [/\bmr\b/i, /\bim\b/i, /waste/i, /segregation/i, /recycling/i, /debris/i],
    positiveBoost: 15,
    mismatchPenalty: 7,
  },
  {
    name: "space_planning",
    attachmentKeywords: ["area", "layout", "circulation", "occupancy", "space", "floor plan", "zoning"],
    creditPatterns: [/\beda\b/i, /area/i, /layout/i, /circulation/i, /occupancy/i, /space/i, /plan/i],
    positiveBoost: 14,
    mismatchPenalty: 7,
  },
];

const CREDIT_CODE_DOMAIN_PREFIXES: Array<{ pattern: RegExp; domains: string[] }> = [
  { pattern: /^\s*wc\b/i, domains: ["water"] },
  { pattern: /^\s*we\b/i, domains: ["water"] },
  { pattern: /^\s*ee\b/i, domains: ["energy"] },
  { pattern: /^\s*ie\b/i, domains: ["indoor_environment"] },
  { pattern: /^\s*ss\b/i, domains: ["site_landscape"] },
  { pattern: /^\s*eda\b/i, domains: ["space_planning"] },
  { pattern: /^\s*mr\b/i, domains: ["materials", "waste"] },
  { pattern: /^\s*im\b/i, domains: ["materials", "waste"] },
];

const EVIDENCE_TYPE_DOMAIN_MAP: Record<string, string[]> = {
  WATER_CALCULATION: ["water"],
  ENERGY_MODEL: ["energy"],
  AREA_STATEMENT: ["space_planning"],
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

function getCreditDomains(credit: ProjectCreditCatalogItem) {
  const fromCode = CREDIT_CODE_DOMAIN_PREFIXES
    .filter((entry) => entry.pattern.test(credit.credit_code || ""))
    .flatMap((entry) => entry.domains);

  const corpus = buildCreditCorpus(credit);
  const normalizedCorpus = normalize(corpus);
  const fromKeywords = DOMAIN_SIGNAL_GROUPS
    .filter((group) => group.creditPatterns.some((pattern) => pattern.test(normalizedCorpus)))
    .map((group) => group.name);

  return unique([...fromCode, ...fromKeywords]);
}

function getAttachmentDomainSignals(attachment: HaritaPreparedAttachment) {
  const sourceText = `${attachment.fileName} ${attachment.summary} ${attachment.parsedText}`.toLowerCase();
  const signalCounts = new Map<string, number>();

  for (const [evidenceType, domains] of Object.entries(EVIDENCE_TYPE_DOMAIN_MAP)) {
    if (attachment.evidenceType === evidenceType) {
      for (const domain of domains) {
        signalCounts.set(domain, (signalCounts.get(domain) || 0) + 4);
      }
    }
  }

  for (const group of DOMAIN_SIGNAL_GROUPS) {
    const count = group.attachmentKeywords.reduce((total, keyword) => {
      return total + (sourceText.includes(normalize(keyword)) ? 1 : 0);
    }, 0);

    if (count > 0) {
      signalCounts.set(group.name, (signalCounts.get(group.name) || 0) + count);
    }
  }

  const ranked = Array.from(signalCounts.entries())
    .sort((a, b) => b[1] - a[1]);

  return {
    ranked,
    strongDomains: ranked.filter(([, score]) => score >= 3).map(([domain]) => domain),
  };
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

function buildCreditIdentityTokens(credit: ProjectCreditCatalogItem) {
  return unique(
    tokenize([
      credit.credit_code || "",
      credit.credit_name || "",
      credit.category || "",
      credit.category_name || "",
    ].join(" ")),
  );
}

function scoreAttachmentAgainstCredit(attachment: HaritaPreparedAttachment, credit: ProjectCreditCatalogItem) {
  const corpus = buildCreditCorpus(credit);
  const corpusTokens = unique(tokenize(corpus));
  const identityTokens = buildCreditIdentityTokens(credit);
  const sourceText = `${attachment.fileName} ${attachment.summary} ${attachment.parsedText}`;
  const textTokens = unique(tokenize(sourceText));
  const textSet = new Set(textTokens);
  const overlap = corpusTokens.filter((token) => textSet.has(token));
  const identityOverlap = identityTokens.filter((token) => textSet.has(token));
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
  const attachmentDomainSignals = getAttachmentDomainSignals(attachment);
  const attachmentDomainMatches = attachmentDomainSignals.ranked.map(([domainName]) =>
    DOMAIN_SIGNAL_GROUPS.find((group) => group.name === domainName),
  ).filter((group): group is (typeof DOMAIN_SIGNAL_GROUPS)[number] => Boolean(group));
  const creditDomains = getCreditDomains(credit);
  const creditDomainSet = new Set(creditDomains);
  const strongAttachmentDomainSet = new Set(attachmentDomainSignals.strongDomains);
  const matchedStrongDomains = attachmentDomainSignals.strongDomains.filter((domain) => creditDomainSet.has(domain));
  const mismatchedStrongDomains = attachmentDomainSignals.strongDomains.filter((domain) => !creditDomainSet.has(domain));
  const [dominantDomain, dominantSignalStrength = 0] = attachmentDomainSignals.ranked[0] || [];
  const domainBoost = attachmentDomainSignals.ranked.reduce((total, [domainName, signalStrength]) => {
    const group = DOMAIN_SIGNAL_GROUPS.find((entry) => entry.name === domainName);
    if (!group) return total;
    const creditMatched = creditDomainSet.has(domainName);
    if (creditMatched) {
      return total + group.positiveBoost + Math.min(signalStrength * 2, 10);
    }
    return total - (group.mismatchPenalty + Math.min(signalStrength * 2, 12));
  }, 0);

  let score = 10;
  score += overlapRatio * 18;
  score += Math.min(identityOverlap.length * 14, 28);
  score += Math.min(hintMatches.length * 6, 18);
  score += domainBoost;
  if (requirementMatch) score += 20;
  if (attachment.hasComplianceSignals) score += 8;
  if (hasNumbers) score += 4;
  if (hasTechnicalUnits) score += 6;
  if (!hasReadableText) score -= 12;
  if (attachment.evidenceType === "UNKNOWN") score -= 8;
  if (strongAttachmentDomainSet.size > 0 && matchedStrongDomains.length === 0) score -= 18;
  if (matchedStrongDomains.length > 0) score += 10;
  if (dominantDomain && dominantSignalStrength >= 4 && !creditDomainSet.has(dominantDomain)) score -= 20;
  if (!matchedStrongDomains.length && !requirementMatch && !identityOverlap.length) score -= 12;

  let confidence = Math.max(0, Math.min(99, Math.round(score)));
  if (strongAttachmentDomainSet.size > 0 && matchedStrongDomains.length === 0) {
    confidence = Math.min(confidence, identityOverlap.length > 0 ? 22 : 14);
  }
  if (dominantDomain && dominantSignalStrength >= 4 && !creditDomainSet.has(dominantDomain)) {
    confidence = Math.min(confidence, identityOverlap.length > 0 ? 18 : 10);
  }

  const rationaleParts = [
    overlap.length ? `keyword overlap on ${overlap.slice(0, 6).join(", ")}` : "limited direct keyword overlap",
    identityOverlap.length ? `credit identity overlap on ${identityOverlap.slice(0, 4).join(", ")}` : "no strong credit-name overlap",
    requirementMatch ? `attachment type aligns with required document type (${attachment.evidenceType})` : "attachment type does not exactly match a required document type",
    hasTechnicalUnits ? "technical metrics detected" : "few technical metrics detected",
  ];
  if (attachmentDomainMatches.length) {
    rationaleParts.push(`detected topic signals: ${attachmentDomainMatches.map((group) => group.name.replace(/_/g, " ")).join(", ")}`);
  }
  if (matchedStrongDomains.length) {
    rationaleParts.push(`domain alignment with ${matchedStrongDomains.join(", ").replace(/_/g, " ")}`);
  }
  if (mismatchedStrongDomains.length) {
    rationaleParts.push(`domain mismatch against ${mismatchedStrongDomains.join(", ").replace(/_/g, " ")}`);
  }

  return {
    confidence,
    overlap,
    identityOverlap,
    requirementMatch,
    matchedStrongDomains,
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

function isDocumentQuestion(message: string) {
  const normalizedMessage = normalize(message).replace(/[^a-z0-9]+/g, " ").trim();
  const mentionsDocument = /\b(document|file|attachment|attached)\b/.test(normalizedMessage);
  const asksForSummary = /\b(about|summary|summarize|summarise|explain|details|describe)\b/.test(normalizedMessage);
  const asksForCreditRouting = /\b(credit|credits|match|closest match|map|evaluate|compliance credit|which credit|where does this apply)\b/.test(normalizedMessage);

  if (asksForCreditRouting) {
    return false;
  }

  if (/\barea statement\b/.test(normalizedMessage)) {
    return true;
  }

  if (/\bwhat\s+is\s*(?:the\s+)?(?:attached\s+)?(?:document|file)\s+about\b/.test(normalizedMessage)) {
    return true;
  }

  if (/\btell\s+me\s+more\s+about\b.*\b(?:attached\s+)?(?:document|file)\b/.test(normalizedMessage)) {
    return true;
  }

  if (/\b(?:summarize|summarise|explain|describe)\b.*\b(?:attached\s+)?(?:document|file)\b/.test(normalizedMessage)) {
    return true;
  }

  if (mentionsDocument && asksForSummary) {
    return true;
  }

  return false;
}

function findRelevantLine(text: string, patterns: RegExp[]) {
  return text
    .split(/\r?\n/)
    .map((line) => line.trim())
    .find((line) => line && patterns.some((pattern) => pattern.test(line))) || null;
}

function extractAreaStatement(text: string) {
  const line = findRelevantLine(text, [
    /\barea\b/i,
    /\bsite area\b/i,
    /\bbuilt[\s-]?up area\b/i,
    /\bcarpet area\b/i,
    /\bplot area\b/i,
    /\busable area\b/i,
  ]);

  if (!line) {
    return null;
  }

  return compact(line, 220);
}

function extractDocumentHighlights(attachment: HaritaPreparedAttachment) {
  const text = attachment.parsedText || "";
  const areaStatement = extractAreaStatement(text);
  const titleLine = text
    .split(/\r?\n/)
    .map((line) => line.trim())
    .find((line) => line.length >= 8) || null;

  const likelyPurpose = findRelevantLine(text, [
    /\blayout\b/i,
    /\bfloor plan\b/i,
    /\bindoor area\b/i,
    /\bchart\b/i,
    /\bdrawing\b/i,
    /\bstatement\b/i,
  ]);

  return {
    titleLine: titleLine ? compact(titleLine, 180) : null,
    areaStatement,
    likelyPurpose: likelyPurpose ? compact(likelyPurpose, 180) : null,
  };
}

function buildDocumentAnswerMarkdown(attachment: HaritaPreparedAttachment, message: string, matches: HaritaDocumentMatch[]) {
  const highlights = extractDocumentHighlights(attachment);
  const normalizedMessage = normalize(message);
  const lines = [];

  if (normalizedMessage.includes("area statement")) {
    lines.push("Area statement from the attached file:");
    lines.push("");
    lines.push(highlights.areaStatement ? `- ${highlights.areaStatement}` : "- No clear area statement was found in the extracted text.");
    return lines.join("\n");
  }

  lines.push("Attached document summary:");
  lines.push("");
  if (highlights.titleLine) {
    lines.push(`- Title / heading detected: ${highlights.titleLine}`);
  }
  lines.push(`- Detected evidence type: ${attachment.evidenceType}`);
  if (highlights.likelyPurpose) {
    lines.push(`- Likely purpose: ${highlights.likelyPurpose}`);
  }
  if (highlights.areaStatement) {
    lines.push(`- Area statement found: ${highlights.areaStatement}`);
  }
  lines.push(`- Readable text extracted: ${attachment.parsedText.trim().length} characters`);
  if (matches.length) {
    lines.push("", "Closest compliance matches from the extracted content:");
    lines.push(...matches.slice(0, 3).map((match) => `- ${match.creditCode} - ${match.creditName} (${match.confidence}%)`));
  }

  return lines.join("\n");
}

function buildDocumentAnswerActions(matches: HaritaDocumentMatch[]): HaritaActionButton[] {
  if (!matches.length) return [];
  return [
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
  ];
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

  const scoredMatches: ScoredDocumentMatch[] = catalog.credits
    .filter((credit) => (credit.completion_pct || 0) < 100)
    .map((credit) => {
      const scored = scoreAttachmentAgainstCredit(attachment, credit);
      return {
        targetId: `${credit.id}::${normalizeDocType((credit.documents_required || []).find((entry) => entry.required)?.type) || normalizedFallbackDocType(attachment)}`,
        creditCode: credit.credit_code || "UNMAPPED",
        creditName: credit.credit_name || "Untitled credit",
        confidence: scored.confidence,
        rationale: scored.rationale,
        requirementMatch: scored.requirementMatch,
        matchedStrongDomains: scored.matchedStrongDomains,
        identityOverlapCount: scored.identityOverlap.length,
      };
    })
    .filter((entry) =>
      entry.confidence >= 25 &&
      (
        entry.requirementMatch ||
        entry.matchedStrongDomains.length > 0 ||
        entry.identityOverlapCount > 0
      ),
    )
    .sort((a, b) => b.confidence - a.confidence)
    .slice(0, 4);

  const topMatches = scoredMatches.map(({ requirementMatch: _requirementMatch, matchedStrongDomains: _matchedStrongDomains, identityOverlapCount: _identityOverlapCount, ...match }) => match);

  if (isDocumentQuestion(message)) {
    return {
      markdown: buildDocumentAnswerMarkdown(attachment, message, topMatches),
      meta: {
        kind: "document_analysis",
        mode: "document_answer",
        attachment,
        matches: topMatches,
        actions: buildDocumentAnswerActions(topMatches),
      },
    };
  }

  const targetCredit = detectExplicitCreditTarget(message, catalog.credits, attachmentTargetId);
  if (!targetCredit) {
    const matches = topMatches;

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
