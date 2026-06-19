import { createClient } from "@supabase/supabase-js";
import type { HaritaContext } from "./vertexService";

export type ProjectRow = {
  id: string;
  name: string;
  client: string | null;
  location: string | null;
  certification_type: string | null;
  target_rating: string | null;
  status: string | null;
  health_status: string | null;
  manual_version_id?: string | null;
};

type CreditRow = {
  id: string;
  project_id: string;
  credit_id?: string | null;
  credit_code: string | null;
  credit_name: string | null;
  status: string | null;
  completion_pct: number | null;
  max_points: number | null;
  points_awarded: number | null;
  category: string | null;
  category_name: string | null;
  responsible_role: string | null;
  is_mandatory?: boolean | null;
  blocked_by?: string | null;
  documentation_summary?: string | null;
  documents_required: Array<{ type?: string; required?: boolean }> | null;
  what_to_submit: string | null;
};

export type ProjectCreditCatalogItem = {
  id: string;
  project_id: string;
  credit_id?: string | null;
  credit_code: string | null;
  credit_name: string | null;
  status: string | null;
  completion_pct: number | null;
  max_points: number | null;
  points_awarded: number | null;
  category: string | null;
  category_name: string | null;
  responsible_role: string | null;
  is_mandatory?: boolean | null;
  blocked_by?: string | null;
  documentation_summary?: string | null;
  documents_required: Array<{ type?: string; required?: boolean }> | null;
  what_to_submit: string | null;
};

type AssignmentRow = {
  project_credit_id: string;
  document_type: string | null;
  role: string | null;
  is_active: boolean | null;
};

type RemarkRow = {
  credit_id: string | null;
  body: string | null;
  role: string | null;
  created_at: string | null;
};

type ProjectUserRow = {
  role: string | null;
};

type ProjectDocumentRow = {
  id?: string;
  credit_id: string | null;
  project_credit_id: string | null;
  doc_category: string | null;
  file_name: string | null;
  status: string | null;
  workflow_state: string | null;
  lifecycle_state: string | null;
};

type CreditScoreRow = {
  project_credit_id: string;
  earned_points: number | null;
  max_points: number | null;
  is_mandatory: boolean | null;
  updated_at: string | null;
};

type MandatoryRequirementRow = {
  id: string;
  project_credit_id: string | null;
  credit_id: string | null;
  requirement_key: string;
  requirement_value: Record<string, unknown> | null;
};

type RuleRow = {
  id: string;
  rule_code: string;
  title: string;
  severity: string | null;
  rule_logic: Record<string, unknown> | null;
};

type RuleDependencyRow = {
  rule_id: string;
  depends_on_rule_id: string;
};

type RecommendationRow = {
  recommendation_type: string | null;
  recommendation_details: Record<string, unknown> | null;
  impact_score: number | null;
  confidence: number | null;
  created_at?: string | null;
};

type EvidenceExtractionRow = {
  extraction_type: string | null;
  extracted_data: Record<string, unknown> | null;
  confidence: number | null;
  document_id: string | null;
  updated_at?: string | null;
};

type EvidenceGraphRow = {
  strength: number | null;
  is_missing: boolean | null;
  document_id: string | null;
};

type ProjectionRow = {
  expected_rating: string | null;
  expected_points: number | null;
  risk_adjusted_points: number | null;
  readiness_score: number | null;
  confidence_score: number | null;
  created_at: string | null;
};

type ClarificationIntelligenceRow = {
  id: string;
  document_id: string | null;
  parsed_intent: Record<string, unknown> | null;
  resolution_plan: Record<string, unknown> | null;
  status: string | null;
  created_at: string | null;
  updated_at: string | null;
};

type ClarificationLifecycleMetricRow = {
  submittal_id: string | null;
  round_number: number | null;
  issue_to_response_ms: number | null;
  response_to_review_ms: number | null;
  status: string | null;
  created_at: string | null;
};

export type ProjectLookupInput = {
  projectId?: string;
  title?: string;
  currentItem?: string;
};

export type ProjectSnapshot = {
  matchFound: boolean;
  requestedProject: string | null;
  reason?: string;
  project?: {
    id: string;
    name: string;
    client: string | null;
    location: string | null;
    certification_type: string | null;
    target_rating: string | null;
    status: string | null;
    health_status: string | null;
    manual_version_id?: string | null;
  };
  summary?: Record<string, unknown>;
  documents?: Record<string, unknown>;
  missing_evidence_leaders?: Array<Record<string, unknown>>;
  credit_preview?: Array<Record<string, unknown>>;
  assignment_preview?: Array<Record<string, unknown>>;
};

export type DocumentPipelineSnapshot = {
  matchFound: boolean;
  requestedProject: string | null;
  projectId?: string;
  creditId?: string | null;
  reason?: string;
  credit?: {
    id: string;
    code: string | null;
    name: string | null;
    status: string | null;
    completion_pct: number | null;
    responsible_role: string | null;
  };
  pipeline: {
    total_documents: number;
    uploaded_document_types: string[];
    assigned_document_types: string[];
    status_breakdown: Record<string, number>;
    required_document_types: string[];
    missing_uploaded_document_types: string[];
    missing_assigned_document_types: string[];
    recent_remarks: Array<{ role: string | null; body: string | null; created_at: string | null }>;
  };
};

export type CreditApplicabilitySnapshot = {
  matchFound: boolean;
  requestedProject: string | null;
  projectId?: string;
  creditId?: string | null;
  reason?: string;
  project?: {
    id: string;
    name: string;
    target_rating: string | null;
    certification_type: string | null;
    manual_version_id?: string | null;
  };
  credit?: {
    id: string;
    code: string | null;
    name: string | null;
    status: string | null;
    completion_pct: number | null;
    max_points: number | null;
    points_awarded: number | null;
    responsible_role: string | null;
    is_mandatory: boolean;
    blocked_by: string | null;
    documentation_summary: string | null;
  };
  applicability: {
    rule_mapping_status: "explicit_rule_mapping" | "no_explicit_rule_mapping";
    mandatory_requirements: Array<{
      key: string;
      value: Record<string, unknown> | null;
      scope: "project_credit" | "credit";
    }>;
    prerequisite_dependencies: Array<{
      rule_code: string;
      title: string;
      severity: string | null;
      depends_on_rule_code: string;
      depends_on_title: string;
    }>;
    blocked_by_runtime: string | null;
    required_document_types: string[];
    what_to_submit: string | null;
  };
};

export type EvidenceIntelligenceSnapshot = {
  matchFound: boolean;
  requestedProject: string | null;
  projectId?: string;
  creditId?: string | null;
  reason?: string;
  evidence: {
    required_document_types: string[];
    uploaded_document_types: string[];
    missing_document_types: string[];
    status_breakdown: Record<string, number>;
    ai_recommendations: Array<{
      type: string | null;
      impact_score: number | null;
      confidence: number | null;
      details: Record<string, unknown> | null;
    }>;
    evidence_extractions: Array<{
      type: string | null;
      confidence: number | null;
      document_id: string | null;
      extracted_data: Record<string, unknown> | null;
    }>;
    evidence_graph: {
      linked_documents: number;
      missing_links: number;
      average_strength: number | null;
    };
  };
};

export type ScoreModelSnapshot = {
  matchFound: boolean;
  requestedProject: string | null;
  projectId?: string;
  reason?: string;
  score_model: {
    certification_summary: Record<string, unknown> | null;
    credit_score_totals: {
      earned_points: number;
      max_points: number;
      mandatory_credits: number;
      updated_at: string | null;
    };
    projection: ProjectionRow | null;
    risk_layer: {
      missing_evidence_leaders: Array<Record<string, unknown>>;
      blocked_credits: number;
      low_completion_credits: number;
    };
  };
};

export type ClarificationIntelligenceSnapshot = {
  matchFound: boolean;
  requestedProject: string | null;
  projectId?: string;
  creditId?: string | null;
  reason?: string;
  clarification: {
    open_credit_remarks: number;
    latest_remarks: Array<{ role: string | null; body: string | null; created_at: string | null }>;
    intelligence_items: Array<{
      id: string;
      status: string | null;
      parsed_intent: Record<string, unknown> | null;
      resolution_plan: Record<string, unknown> | null;
      document_id: string | null;
      updated_at: string | null;
    }>;
    lifecycle: {
      total_rounds: number;
      stale_rounds: number;
      converged_rounds: number;
      avg_issue_to_response_ms: number | null;
      avg_response_to_review_ms: number | null;
    };
  };
};

export type ComplianceTaskRequest = {
  projectId?: string;
  title?: string;
  currentItem?: string;
  creditId?: string;
  details: string;
  role: string;
  due?: string | null;
  confirm?: boolean;
  taskType?: string;
  priority?: "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";
};

export type ComplianceTaskResult = {
  executed: boolean;
  requires_confirmation: boolean;
  reason: string;
  resolved_project_id?: string;
  resolved_credit_id?: string | null;
  resolved_assignee?: {
    user_id: string;
    role: string;
    full_name: string | null;
    member_email: string | null;
  };
  pending_task?: {
    title: string;
    details: string;
    role: string;
    due: string | null;
    task_type: string;
    priority: string;
  };
  task?: {
    id: string;
    project_id: string;
    assigned_to: string;
    task_type: string;
    due_date: string | null;
  };
};

type ProfileRow = {
  user_id: string;
  email: string | null;
  full_name: string | null;
};

const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || "";
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || "";

const admin = supabaseUrl && supabaseServiceRoleKey
  ? createClient(supabaseUrl, supabaseServiceRoleKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    })
  : null;

function normalize(value: string) {
  return value.trim().toLowerCase();
}

function normalizeCreditCode(value: string | null | undefined) {
  return normalize(String(value || "")).replace(/\s+/g, "");
}

function normalizeRole(value: string) {
  return normalize(value).replace(/[\s-]+/g, "_");
}

function average(values: Array<number | null | undefined>) {
  const valid = values.filter((value): value is number => typeof value === "number" && Number.isFinite(value));
  if (!valid.length) return null;
  return Number((valid.reduce((sum, value) => sum + value, 0) / valid.length).toFixed(2));
}

function latestTimestamp(values: Array<string | null | undefined>) {
  return values
    .filter((value): value is string => Boolean(value))
    .sort((a, b) => new Date(b).getTime() - new Date(a).getTime())[0] || null;
}

function extractProjectId(lookup?: ProjectLookupInput) {
  if (lookup?.projectId) {
    return lookup.projectId;
  }

  const currentItem = lookup?.currentItem || "";
  const match = currentItem.match(/\/projects\/([^/]+)/i);
  return match?.[1] || null;
}

function toLookupInput(context?: HaritaContext): ProjectLookupInput {
  return {
    projectId: context?.projectId,
    title: context?.title,
    currentItem: context?.currentItem,
  };
}

function summarizeCredits(credits: CreditRow[]) {
  const totalCredits = credits.length;
  const totalMaxPoints = credits.reduce((sum, credit) => sum + (credit.max_points || 0), 0);
  const totalPointsAwarded = credits.reduce((sum, credit) => sum + (credit.points_awarded || 0), 0);

  const byStatus = credits.reduce<Record<string, number>>((acc, credit) => {
    const key = credit.status || "UNKNOWN";
    acc[key] = (acc[key] || 0) + 1;
    return acc;
  }, {});

  const byCategory = credits.reduce<Record<string, { count: number; points: number }>>((acc, credit) => {
    const key = credit.category || "UNMAPPED";
    if (!acc[key]) {
      acc[key] = { count: 0, points: 0 };
    }
    acc[key].count += 1;
    acc[key].points += credit.max_points || 0;
    return acc;
  }, {});

  const blockers = credits
    .filter((credit) => (credit.completion_pct || 0) < 100)
    .sort((a, b) => (a.completion_pct || 0) - (b.completion_pct || 0))
    .slice(0, 8)
    .map((credit) => ({
      code: credit.credit_code,
      name: credit.credit_name,
      status: credit.status,
      completion_pct: credit.completion_pct,
      max_points: credit.max_points,
      required_document_types: (credit.documents_required || [])
        .filter((entry) => entry.required)
        .map((entry) => entry.type)
        .filter(Boolean),
    }));

  return {
    totalCredits,
    totalMaxPoints,
    totalPointsAwarded,
    byStatus,
    byCategory,
    blockers,
  };
}

function summarizeDocuments(documents: ProjectDocumentRow[]) {
  const byStatus = documents.reduce<Record<string, number>>((acc, document) => {
    const key = document.status || document.lifecycle_state || "UNKNOWN";
    acc[key] = (acc[key] || 0) + 1;
    return acc;
  }, {});

  const byCategory = documents.reduce<Record<string, number>>((acc, document) => {
    const key = document.doc_category || "UNMAPPED";
    acc[key] = (acc[key] || 0) + 1;
    return acc;
  }, {});

  return {
    totalDocuments: documents.length,
    byStatus,
    byCategory,
    preview: documents.slice(0, 12).map((document) => ({
      file_name: document.file_name,
      doc_category: document.doc_category,
      status: document.status,
      workflow_state: document.workflow_state,
      lifecycle_state: document.lifecycle_state,
    })),
  };
}

export async function resolveProjectRecord(lookup?: ProjectLookupInput): Promise<ProjectRow | null> {
  if (!admin) {
    return null;
  }

  const projectId = extractProjectId(lookup);
  let project: ProjectRow | null = null;

  if (projectId) {
    const { data } = await admin
      .from("projects")
      .select("id,name,client,location,certification_type,target_rating,status,health_status,manual_version_id")
      .eq("id", projectId)
      .maybeSingle<ProjectRow>();
    project = data;
  }

  if (!project && lookup?.title?.trim()) {
    const { data } = await admin
      .from("projects")
      .select("id,name,client,location,certification_type,target_rating,status,health_status,manual_version_id")
      .ilike("name", lookup.title.trim())
      .limit(1)
      .maybeSingle<ProjectRow>();
    project = data;
  }

  if (!project && lookup?.title?.trim()) {
    const normalizedTitle = normalize(lookup.title);
    const { data } = await admin
      .from("projects")
      .select("id,name,client,location,certification_type,target_rating,status,health_status,manual_version_id");
    project = (data || []).find((row) => normalize(row.name || "") === normalizedTitle) || null;
  }

  return project;
}

async function resolveProjectMemberByRole(projectId: string, requestedRole: string) {
  if (!admin) {
    return null;
  }

  const normalizedRequestedRole = normalizeRole(requestedRole);
  const { data: memberships } = await admin
    .from("project_users")
    .select("user_id, role, created_at")
    .eq("project_id", projectId)
    .order("created_at", { ascending: true });

  const rows = (memberships || []) as Array<{ user_id: string | null; role: string | null; created_at: string | null }>;
  const membership = rows.find((row) => row.user_id && row.role && normalizeRole(row.role) === normalizedRequestedRole);

  if (!membership?.user_id) {
    return null;
  }

  const { data: profile } = await admin
    .from("profiles")
    .select("user_id, email, full_name")
    .eq("user_id", membership.user_id)
    .maybeSingle<ProfileRow>();

  return {
    user_id: membership.user_id,
    role: membership.role || requestedRole,
    full_name: profile?.full_name ?? null,
    member_email: profile?.email ?? null,
  };
}

export async function getProjectSnapshot(lookup?: ProjectLookupInput): Promise<ProjectSnapshot> {
  if (!admin) {
    return {
      matchFound: false,
      requestedProject: lookup?.title || null,
      reason: "Supabase grounding unavailable: SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY is missing.",
    };
  }

  const project = await resolveProjectRecord(lookup);

  if (!project) {
    return {
      matchFound: false,
      requestedProject: lookup?.title || null,
      reason: "No matching project row was found in Supabase.",
    };
  }

  const [{ data: credits }, { data: documents }, { data: assignments }, { data: members }, { data: remarks }] = await Promise.all([
    admin
      .from("project_credits")
      .select("id,project_id,credit_id,credit_code,credit_name,status,completion_pct,max_points,points_awarded,category,category_name,responsible_role,is_mandatory,blocked_by,documentation_summary,documents_required,what_to_submit")
      .eq("project_id", project.id)
      .order("credit_code"),
    admin
      .from("project_document")
      .select("id,credit_id,project_credit_id,doc_category,file_name,status,workflow_state,lifecycle_state")
      .eq("project_id", project.id),
    admin
      .from("assignments")
      .select("project_credit_id,document_type,role,is_active")
      .eq("project_id", project.id)
      .eq("is_active", true),
    admin.from("project_users").select("role").eq("project_id", project.id),
    admin.from("remarks").select("credit_id,body,role,created_at"),
  ]);

  const creditRows = (credits || []) as CreditRow[];
  const documentRows = (documents || []) as ProjectDocumentRow[];
  const assignmentRows = (assignments || []) as AssignmentRow[];
  const memberRows = (members || []) as ProjectUserRow[];
  const allRemarks = (remarks || []) as RemarkRow[];
  const creditIdSet = new Set(creditRows.map((credit) => credit.id));
  const creditRemarks = allRemarks.filter((remark) => remark.credit_id && creditIdSet.has(remark.credit_id));

  const creditSummary = summarizeCredits(creditRows);
  const documentSummary = summarizeDocuments(documentRows);
  const documentsByCredit = documentRows.reduce<Record<string, number>>((acc, document) => {
    const key = document.project_credit_id || document.credit_id;
    if (!key) return acc;
    acc[key] = (acc[key] || 0) + 1;
    return acc;
  }, {});
  const assignmentByCredit = assignmentRows.reduce<Record<string, Array<{ document_type: string | null; role: string | null }>>>((acc, assignment) => {
    if (!assignment.project_credit_id) return acc;
    if (!acc[assignment.project_credit_id]) {
      acc[assignment.project_credit_id] = [];
    }
    acc[assignment.project_credit_id].push({
      document_type: assignment.document_type,
      role: assignment.role,
    });
    return acc;
  }, {});
  const remarksByCredit = creditRemarks.reduce<Record<string, RemarkRow[]>>((acc, remark) => {
    if (!remark.credit_id) return acc;
    if (!acc[remark.credit_id]) {
      acc[remark.credit_id] = [];
    }
    acc[remark.credit_id].push(remark);
    return acc;
  }, {});

  const assignmentPreview = assignmentRows.slice(0, 12).map((assignment) => ({
    project_credit_id: assignment.project_credit_id,
    document_type: assignment.document_type,
    role: assignment.role,
  }));

  const activeRoles = Array.from(
    new Set(memberRows.map((member) => member.role).filter((value): value is string => Boolean(value))),
  ).sort();

  const topCredits = creditRows.slice(0, 12).map((credit) => {
    const requiredDocumentTypes = (credit.documents_required || [])
      .filter((entry) => entry.required)
      .map((entry) => entry.type)
      .filter((value): value is string => Boolean(value));
    const assignedDocumentTypes = new Set(
      (assignmentByCredit[credit.id] || []).map((entry) => entry.document_type).filter((value): value is string => Boolean(value)),
    );
    const missingAssignments = requiredDocumentTypes.filter((requiredType) => !assignedDocumentTypes.has(requiredType));
    const recentRemarks = (remarksByCredit[credit.id] || [])
      .slice(0, 3)
      .map((remark) => ({ role: remark.role, body: remark.body, created_at: remark.created_at }));

    return {
      id: credit.id,
      code: credit.credit_code,
      name: credit.credit_name,
      category: credit.category,
      status: credit.status,
      completion_pct: credit.completion_pct,
      max_points: credit.max_points,
      points_awarded: credit.points_awarded,
      responsible_role: credit.responsible_role,
      linked_documents: documentsByCredit[credit.id] || 0,
      required_document_types: requiredDocumentTypes,
      missing_assignment_document_types: missingAssignments,
      active_assignments: assignmentByCredit[credit.id] || [],
      recent_remarks: recentRemarks,
    };
  });

  const missingEvidenceLeaders = creditRows
    .map((credit) => {
      const requiredDocumentTypes = (credit.documents_required || [])
        .filter((entry) => entry.required)
        .map((entry) => entry.type)
        .filter((value): value is string => Boolean(value));
      const assignedDocumentTypes = new Set(
        (assignmentByCredit[credit.id] || []).map((entry) => entry.document_type).filter((value): value is string => Boolean(value)),
      );
      const missingAssignmentDocumentTypes = requiredDocumentTypes.filter((requiredType) => !assignedDocumentTypes.has(requiredType));

      return {
        code: credit.credit_code,
        name: credit.credit_name,
        status: credit.status,
        completion_pct: credit.completion_pct,
        linked_documents: documentsByCredit[credit.id] || 0,
        missing_assignment_document_types: missingAssignmentDocumentTypes,
        repeated_remarks: (remarksByCredit[credit.id] || []).length,
      };
    })
    .sort((a, b) => {
      const aScore = (a.missing_assignment_document_types.length * 10) + (a.repeated_remarks * 3) + (a.linked_documents === 0 ? 5 : 0) - (a.completion_pct || 0);
      const bScore = (b.missing_assignment_document_types.length * 10) + (b.repeated_remarks * 3) + (b.linked_documents === 0 ? 5 : 0) - (b.completion_pct || 0);
      return bScore - aScore;
    })
    .slice(0, 10);

  return {
    matchFound: true,
    requestedProject: lookup?.title || project.name,
    project: {
      id: project.id,
      name: project.name,
      client: project.client,
      location: project.location,
      certification_type: project.certification_type,
      target_rating: project.target_rating,
      status: project.status,
      health_status: project.health_status,
      manual_version_id: project.manual_version_id ?? null,
    },
    summary: {
      total_documents: documentRows.length,
      total_active_assignments: assignmentRows.length,
      total_credit_remarks: creditRemarks.length,
      active_roles: activeRoles,
      ...creditSummary,
    },
    documents: documentSummary,
    missing_evidence_leaders: missingEvidenceLeaders,
    credit_preview: topCredits,
    assignment_preview: assignmentPreview,
  };
}

export async function checkDocumentPipeline(input: ProjectLookupInput & { creditId?: string }): Promise<DocumentPipelineSnapshot> {
  if (!admin) {
    return {
      matchFound: false,
      requestedProject: input.title || null,
      creditId: input.creditId || null,
      reason: "Supabase grounding unavailable: SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY is missing.",
      pipeline: {
        total_documents: 0,
        uploaded_document_types: [],
        assigned_document_types: [],
        status_breakdown: {},
        required_document_types: [],
        missing_uploaded_document_types: [],
        missing_assigned_document_types: [],
        recent_remarks: [],
      },
    };
  }

  const project = await resolveProjectRecord(input);

  if (!project) {
    return {
      matchFound: false,
      requestedProject: input.title || null,
      creditId: input.creditId || null,
      reason: "No matching project row was found in Supabase.",
      pipeline: {
        total_documents: 0,
        uploaded_document_types: [],
        assigned_document_types: [],
        status_breakdown: {},
        required_document_types: [],
        missing_uploaded_document_types: [],
        missing_assigned_document_types: [],
        recent_remarks: [],
      },
    };
  }

  const creditId = input.creditId?.trim() || null;
  const creditQuery = creditId
      ? admin
        .from("project_credits")
        .select("id,credit_id,credit_code,credit_name,status,completion_pct,max_points,points_awarded,responsible_role,is_mandatory,blocked_by,documentation_summary,documents_required,what_to_submit")
        .eq("project_id", project.id)
        .eq("id", creditId)
        .maybeSingle<Pick<CreditRow, "id" | "credit_id" | "credit_code" | "credit_name" | "status" | "completion_pct" | "max_points" | "points_awarded" | "responsible_role" | "is_mandatory" | "blocked_by" | "documentation_summary" | "documents_required" | "what_to_submit">>()
    : Promise.resolve({ data: null });

  const documentsQuery = admin
    .from("project_document")
    .select("id,credit_id,project_credit_id,doc_category,file_name,status,workflow_state,lifecycle_state")
    .eq("project_id", project.id);

  const assignmentsQuery = admin
    .from("assignments")
    .select("project_credit_id,document_type,role,is_active")
    .eq("project_id", project.id)
    .eq("is_active", true);

  const remarksQuery = admin
    .from("remarks")
    .select("credit_id,body,role,created_at");

  if (creditId) {
    documentsQuery.eq("project_credit_id", creditId);
    assignmentsQuery.eq("project_credit_id", creditId);
    remarksQuery.eq("credit_id", creditId);
  }

  const [{ data: credit }, { data: documents }, { data: assignments }, { data: remarks }] = await Promise.all([
    creditQuery,
    documentsQuery,
    assignmentsQuery,
    remarksQuery,
  ]);

  const documentRows = (documents || []) as ProjectDocumentRow[];
  const assignmentRows = (assignments || []) as AssignmentRow[];
  const remarkRows = (remarks || []) as RemarkRow[];
  const requiredDocumentTypes = ((credit?.documents_required || []) as Array<{ type?: string; required?: boolean }>)
    .filter((entry) => entry.required)
    .map((entry) => entry.type)
    .filter((value): value is string => Boolean(value));
  const uploadedDocumentTypes = Array.from(
    new Set(documentRows.map((document) => document.doc_category).filter((value): value is string => Boolean(value))),
  ).sort();
  const assignedDocumentTypes = Array.from(
    new Set(assignmentRows.map((assignment) => assignment.document_type).filter((value): value is string => Boolean(value))),
  ).sort();
  const statusBreakdown = documentRows.reduce<Record<string, number>>((acc, document) => {
    const key = document.status || document.lifecycle_state || "UNKNOWN";
    acc[key] = (acc[key] || 0) + 1;
    return acc;
  }, {});
  const missingUploadedDocumentTypes = requiredDocumentTypes.filter((requiredType) => !uploadedDocumentTypes.includes(requiredType));
  const missingAssignedDocumentTypes = requiredDocumentTypes.filter((requiredType) => !assignedDocumentTypes.includes(requiredType));

  return {
    matchFound: true,
    requestedProject: input.title || project.name,
    projectId: project.id,
    creditId,
    credit: credit
      ? {
          id: credit.id,
          code: credit.credit_code,
          name: credit.credit_name,
          status: credit.status,
          completion_pct: credit.completion_pct,
          responsible_role: credit.responsible_role,
        }
      : undefined,
    pipeline: {
      total_documents: documentRows.length,
      uploaded_document_types: uploadedDocumentTypes,
      assigned_document_types: assignedDocumentTypes,
      status_breakdown: statusBreakdown,
      required_document_types: requiredDocumentTypes,
      missing_uploaded_document_types: missingUploadedDocumentTypes,
      missing_assigned_document_types: missingAssignedDocumentTypes,
      recent_remarks: remarkRows.slice(0, 5).map((remark) => ({
        role: remark.role,
        body: remark.body,
        created_at: remark.created_at,
      })),
    },
  };
}

async function resolveProjectCreditRecord(
  projectId: string,
  creditId?: string | null,
  creditCode?: string | null,
): Promise<ProjectCreditCatalogItem | null> {
  if (!admin) return null;

  if (creditId?.trim()) {
    const { data } = await admin
      .from("project_credits")
      .select("id,project_id,credit_id,credit_code,credit_name,status,completion_pct,max_points,points_awarded,category,category_name,responsible_role,is_mandatory,blocked_by,documentation_summary,documents_required,what_to_submit")
      .eq("project_id", projectId)
      .eq("id", creditId.trim())
      .maybeSingle<ProjectCreditCatalogItem>();
    if (data) return data;
  }

  if (creditCode?.trim()) {
    const normalizedCode = normalizeCreditCode(creditCode);
    const { data } = await admin
      .from("project_credits")
      .select("id,project_id,credit_id,credit_code,credit_name,status,completion_pct,max_points,points_awarded,category,category_name,responsible_role,is_mandatory,blocked_by,documentation_summary,documents_required,what_to_submit")
      .eq("project_id", projectId)
      .order("credit_code");
    return ((data || []) as ProjectCreditCatalogItem[])
      .find((credit) => normalizeCreditCode(credit.credit_code) === normalizedCode) || null;
  }

  return null;
}

export async function getCreditApplicability(
  input: ProjectLookupInput & { creditId?: string; creditCode?: string },
): Promise<CreditApplicabilitySnapshot> {
  if (!admin) {
    return {
      matchFound: false,
      requestedProject: input.title || null,
      creditId: input.creditId || null,
      reason: "Supabase grounding unavailable: SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY is missing.",
      applicability: {
        rule_mapping_status: "no_explicit_rule_mapping",
        mandatory_requirements: [],
        prerequisite_dependencies: [],
        blocked_by_runtime: null,
        required_document_types: [],
        what_to_submit: null,
      },
    };
  }

  const project = await resolveProjectRecord(input);
  if (!project) {
    return {
      matchFound: false,
      requestedProject: input.title || null,
      creditId: input.creditId || null,
      reason: "No matching project row was found in Supabase.",
      applicability: {
        rule_mapping_status: "no_explicit_rule_mapping",
        mandatory_requirements: [],
        prerequisite_dependencies: [],
        blocked_by_runtime: null,
        required_document_types: [],
        what_to_submit: null,
      },
    };
  }

  const credit = await resolveProjectCreditRecord(project.id, input.creditId, input.creditCode);
  if (!credit) {
    return {
      matchFound: false,
      requestedProject: input.title || project.name,
      projectId: project.id,
      creditId: input.creditId || null,
      reason: "No matching project credit row was found for the requested credit reference.",
      applicability: {
        rule_mapping_status: "no_explicit_rule_mapping",
        mandatory_requirements: [],
        prerequisite_dependencies: [],
        blocked_by_runtime: null,
        required_document_types: [],
        what_to_submit: null,
      },
    };
  }

  const [{ data: requirementRows }, { data: ruleSets }] = await Promise.all([
    admin
      .from("mandatory_requirements")
      .select("id,project_credit_id,credit_id,requirement_key,requirement_value")
      .or(`project_credit_id.eq.${credit.id},credit_id.eq.${credit.credit_id || "00000000-0000-0000-0000-000000000000"}`),
    project.manual_version_id
      ? admin
          .from("rule_sets")
          .select("id")
          .eq("manual_version_id", project.manual_version_id)
      : Promise.resolve({ data: [] }),
  ]);

  const ruleSetIds = ((ruleSets || []) as Array<{ id: string }>).map((row) => row.id);
  const [{ data: rules }, { data: dependencyRows }] = ruleSetIds.length
    ? await Promise.all([
        admin
          .from("rules")
          .select("id,rule_code,title,severity,rule_logic")
          .in("rule_set_id", ruleSetIds),
        admin
          .from("rule_dependencies")
          .select("rule_id,depends_on_rule_id"),
      ])
    : [{ data: [] }, { data: [] }];

  const allRules = (rules || []) as RuleRow[];
  const dependencyRowsTyped = (dependencyRows || []) as RuleDependencyRow[];
  const targetCreditCode = normalizeCreditCode(credit.credit_code);
  const matchingRules = allRules.filter((rule) => {
    const logic = rule.rule_logic || {};
    const ruleProjectCreditId = typeof logic.project_credit_id === "string" ? logic.project_credit_id : null;
    const ruleCreditId = typeof logic.credit_id === "string" ? logic.credit_id : null;
    const ruleCreditCode = typeof logic.credit_code === "string" ? normalizeCreditCode(logic.credit_code) : "";
    return ruleProjectCreditId === credit.id || ruleCreditId === (credit.credit_id || null) || (ruleCreditCode && ruleCreditCode === targetCreditCode);
  });
  const matchingRuleIds = new Set(matchingRules.map((rule) => rule.id));
  const ruleById = new Map(allRules.map((rule) => [rule.id, rule]));
  const prerequisiteDependencies = dependencyRowsTyped
    .filter((row) => matchingRuleIds.has(row.rule_id))
    .map((row) => {
      const sourceRule = ruleById.get(row.rule_id);
      const dependsOnRule = ruleById.get(row.depends_on_rule_id);
      if (!sourceRule || !dependsOnRule) return null;
      return {
        rule_code: sourceRule.rule_code,
        title: sourceRule.title,
        severity: sourceRule.severity,
        depends_on_rule_code: dependsOnRule.rule_code,
        depends_on_title: dependsOnRule.title,
      };
    })
    .filter((value): value is NonNullable<typeof value> => Boolean(value));

  const mandatoryRequirements = ((requirementRows || []) as MandatoryRequirementRow[]).map((row) => ({
    key: row.requirement_key,
    value: row.requirement_value || null,
    scope: row.project_credit_id === credit.id ? "project_credit" as const : "credit" as const,
  }));

  return {
    matchFound: true,
    requestedProject: input.title || project.name,
    projectId: project.id,
    creditId: credit.id,
    project: {
      id: project.id,
      name: project.name,
      target_rating: project.target_rating,
      certification_type: project.certification_type,
      manual_version_id: project.manual_version_id ?? null,
    },
    credit: {
      id: credit.id,
      code: credit.credit_code,
      name: credit.credit_name,
      status: credit.status,
      completion_pct: credit.completion_pct,
      max_points: credit.max_points,
      points_awarded: credit.points_awarded,
      responsible_role: credit.responsible_role,
      is_mandatory: Boolean(credit.is_mandatory),
      blocked_by: credit.blocked_by ?? null,
      documentation_summary: credit.documentation_summary ?? null,
    },
    applicability: {
      rule_mapping_status: matchingRules.length ? "explicit_rule_mapping" : "no_explicit_rule_mapping",
      mandatory_requirements: mandatoryRequirements,
      prerequisite_dependencies: prerequisiteDependencies,
      blocked_by_runtime: credit.blocked_by ?? null,
      required_document_types: (credit.documents_required || [])
        .filter((entry) => entry.required)
        .map((entry) => entry.type)
        .filter((value): value is string => Boolean(value)),
      what_to_submit: credit.what_to_submit,
    },
  };
}

export async function getEvidenceIntelligence(
  input: ProjectLookupInput & { creditId?: string; creditCode?: string },
): Promise<EvidenceIntelligenceSnapshot> {
  if (!admin) {
    return {
      matchFound: false,
      requestedProject: input.title || null,
      creditId: input.creditId || null,
      reason: "Supabase grounding unavailable: SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY is missing.",
      evidence: {
        required_document_types: [],
        uploaded_document_types: [],
        missing_document_types: [],
        status_breakdown: {},
        ai_recommendations: [],
        evidence_extractions: [],
        evidence_graph: { linked_documents: 0, missing_links: 0, average_strength: null },
      },
    };
  }

  const project = await resolveProjectRecord(input);
  if (!project) {
    return {
      matchFound: false,
      requestedProject: input.title || null,
      creditId: input.creditId || null,
      reason: "No matching project row was found in Supabase.",
      evidence: {
        required_document_types: [],
        uploaded_document_types: [],
        missing_document_types: [],
        status_breakdown: {},
        ai_recommendations: [],
        evidence_extractions: [],
        evidence_graph: { linked_documents: 0, missing_links: 0, average_strength: null },
      },
    };
  }

  const credit = await resolveProjectCreditRecord(project.id, input.creditId, input.creditCode);
  const pipeline = await checkDocumentPipeline({
    projectId: project.id,
    title: project.name,
    currentItem: input.currentItem,
    creditId: credit?.id,
  });

  const recommendationQuery = admin
    .from("ai_recommendations")
    .select("recommendation_type,recommendation_details,impact_score,confidence,created_at")
    .eq("project_id", project.id)
    .eq("is_active", true)
    .order("updated_at", { ascending: false })
    .limit(8);
  if (credit?.id) {
    recommendationQuery.eq("credit_id", credit.id);
  }

  const documentQuery = admin
    .from("project_document")
    .select("id,project_credit_id")
    .eq("project_id", project.id);
  if (credit?.id) {
    documentQuery.eq("project_credit_id", credit.id);
  }
  const { data: documentIds } = await documentQuery;
  const scopedDocumentIds = ((documentIds || []) as Array<{ id?: string | null }>).map((row) => row.id).filter((value): value is string => Boolean(value));

  const [recommendationsResult, extractionsResult, evidenceGraphResult] = await Promise.all([
    recommendationQuery,
    scopedDocumentIds.length
      ? admin
          .from("evidence_extractions")
          .select("extraction_type,extracted_data,confidence,document_id,updated_at")
          .in("document_id", scopedDocumentIds)
          .order("updated_at", { ascending: false })
          .limit(12)
      : Promise.resolve({ data: [] }),
    credit?.id
      ? admin
          .from("evidence_graph")
          .select("strength,is_missing,document_id")
          .eq("project_id", project.id)
          .eq("credit_id", credit.id)
      : Promise.resolve({ data: [] }),
  ]);

  const evidenceGraphRows = (evidenceGraphResult.data || []) as EvidenceGraphRow[];

  return {
    matchFound: true,
    requestedProject: input.title || project.name,
    projectId: project.id,
    creditId: credit?.id || null,
    evidence: {
      required_document_types: pipeline.pipeline.required_document_types,
      uploaded_document_types: pipeline.pipeline.uploaded_document_types,
      missing_document_types: pipeline.pipeline.missing_uploaded_document_types,
      status_breakdown: pipeline.pipeline.status_breakdown,
      ai_recommendations: ((recommendationsResult.data || []) as RecommendationRow[]).map((row) => ({
        type: row.recommendation_type,
        impact_score: row.impact_score,
        confidence: row.confidence,
        details: row.recommendation_details || null,
      })),
      evidence_extractions: ((extractionsResult.data || []) as EvidenceExtractionRow[]).map((row) => ({
        type: row.extraction_type,
        confidence: row.confidence,
        document_id: row.document_id,
        extracted_data: row.extracted_data || null,
      })),
      evidence_graph: {
        linked_documents: evidenceGraphRows.filter((row) => Boolean(row.document_id)).length,
        missing_links: evidenceGraphRows.filter((row) => Boolean(row.is_missing)).length,
        average_strength: average(evidenceGraphRows.map((row) => row.strength)),
      },
    },
  };
}

export async function getScoreModel(
  input: ProjectLookupInput,
): Promise<ScoreModelSnapshot> {
  if (!admin) {
    return {
      matchFound: false,
      requestedProject: input.title || null,
      reason: "Supabase grounding unavailable: SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY is missing.",
      score_model: {
        certification_summary: null,
        credit_score_totals: { earned_points: 0, max_points: 0, mandatory_credits: 0, updated_at: null },
        projection: null,
        risk_layer: { missing_evidence_leaders: [], blocked_credits: 0, low_completion_credits: 0 },
      },
    };
  }

  const project = await resolveProjectRecord(input);
  if (!project) {
    return {
      matchFound: false,
      requestedProject: input.title || null,
      reason: "No matching project row was found in Supabase.",
      score_model: {
        certification_summary: null,
        credit_score_totals: { earned_points: 0, max_points: 0, mandatory_credits: 0, updated_at: null },
        projection: null,
        risk_layer: { missing_evidence_leaders: [], blocked_credits: 0, low_completion_credits: 0 },
      },
    };
  }

  const [snapshot, scoreRowsResult, projectionResult, certificationSummaryResult] = await Promise.all([
    getProjectSnapshot({ projectId: project.id, title: project.name, currentItem: input.currentItem }),
    admin
      .from("credit_scores")
      .select("project_credit_id,earned_points,max_points,is_mandatory,updated_at")
      .eq("project_id", project.id),
    admin
      .from("certification_projections")
      .select("expected_rating,expected_points,risk_adjusted_points,readiness_score,confidence_score,created_at")
      .eq("project_id", project.id)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle<ProjectionRow>(),
    admin.rpc("get_project_certification_summary", { p_project_id: project.id }),
  ]);

  const scoreRows = (scoreRowsResult.data || []) as CreditScoreRow[];
  const earnedPoints = scoreRows.reduce((sum, row) => sum + (row.earned_points || 0), 0);
  const maxPoints = scoreRows.reduce((sum, row) => sum + (row.max_points || 0), 0);
  const mandatoryCredits = scoreRows.filter((row) => row.is_mandatory).length;
  const missingEvidenceLeaders = snapshot.matchFound ? (snapshot.missing_evidence_leaders || []) : [];
  const creditPreview = snapshot.matchFound ? (snapshot.credit_preview || []) : [];

  return {
    matchFound: true,
    requestedProject: input.title || project.name,
    projectId: project.id,
    score_model: {
      certification_summary: (certificationSummaryResult.data as Record<string, unknown> | null) || null,
      credit_score_totals: {
        earned_points: Number(earnedPoints.toFixed(2)),
        max_points: Number(maxPoints.toFixed(2)),
        mandatory_credits: mandatoryCredits,
        updated_at: latestTimestamp(scoreRows.map((row) => row.updated_at)),
      },
      projection: projectionResult.data || null,
      risk_layer: {
        missing_evidence_leaders: missingEvidenceLeaders,
        blocked_credits: creditPreview.filter((credit) => String((credit as Record<string, unknown>).status || "").toUpperCase() === "BLOCKED").length,
        low_completion_credits: creditPreview.filter((credit) => Number((credit as Record<string, unknown>).completion_pct || 0) < 50).length,
      },
    },
  };
}

export async function getClarificationIntelligence(
  input: ProjectLookupInput & { creditId?: string; creditCode?: string },
): Promise<ClarificationIntelligenceSnapshot> {
  if (!admin) {
    return {
      matchFound: false,
      requestedProject: input.title || null,
      creditId: input.creditId || null,
      reason: "Supabase grounding unavailable: SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY is missing.",
      clarification: {
        open_credit_remarks: 0,
        latest_remarks: [],
        intelligence_items: [],
        lifecycle: {
          total_rounds: 0,
          stale_rounds: 0,
          converged_rounds: 0,
          avg_issue_to_response_ms: null,
          avg_response_to_review_ms: null,
        },
      },
    };
  }

  const project = await resolveProjectRecord(input);
  if (!project) {
    return {
      matchFound: false,
      requestedProject: input.title || null,
      creditId: input.creditId || null,
      reason: "No matching project row was found in Supabase.",
      clarification: {
        open_credit_remarks: 0,
        latest_remarks: [],
        intelligence_items: [],
        lifecycle: {
          total_rounds: 0,
          stale_rounds: 0,
          converged_rounds: 0,
          avg_issue_to_response_ms: null,
          avg_response_to_review_ms: null,
        },
      },
    };
  }

  const credit = await resolveProjectCreditRecord(project.id, input.creditId, input.creditCode);

  const remarksQuery = admin
    .from("remarks")
    .select("credit_id,body,role,created_at")
    .order("created_at", { ascending: false });
  if (credit?.id) {
    remarksQuery.eq("credit_id", credit.id);
  }

  const documentsQuery = admin
    .from("project_document")
    .select("id,project_credit_id")
    .eq("project_id", project.id);
  if (credit?.id) {
    documentsQuery.eq("project_credit_id", credit.id);
  }

  const [remarksResult, documentsResult] = await Promise.all([remarksQuery, documentsQuery]);
  const documentIds = ((documentsResult.data || []) as Array<{ id?: string | null }>).map((row) => row.id).filter((value): value is string => Boolean(value));

  const submittalsQuery = admin
    .from("submittals")
    .select("id")
    .eq("project_id", project.id);
  if (credit?.id) {
    submittalsQuery.eq("project_credit_id", credit.id);
  }

  const [intelligenceResult, submittalsResult] = await Promise.all([
    documentIds.length
      ? admin
          .from("clarification_intelligence")
          .select("id,document_id,parsed_intent,resolution_plan,status,created_at,updated_at")
          .eq("project_id", project.id)
          .in("document_id", documentIds)
          .order("updated_at", { ascending: false })
      : Promise.resolve({ data: [] }),
    submittalsQuery,
  ]);
  const submittalIds = ((submittalsResult.data || []) as Array<{ id?: string | null }>).map((row) => row.id).filter((value): value is string => Boolean(value));
  const lifecycleResult = submittalIds.length
    ? await admin
        .from("clarification_lifecycle_metrics")
        .select("submittal_id,round_number,issue_to_response_ms,response_to_review_ms,status,created_at")
        .in("submittal_id", submittalIds)
        .order("created_at", { ascending: false })
        .limit(24)
    : { data: [] };
  const scopedLifecycleRows = (lifecycleResult.data || []) as ClarificationLifecycleMetricRow[];

  return {
    matchFound: true,
    requestedProject: input.title || project.name,
    projectId: project.id,
    creditId: credit?.id || null,
    clarification: {
      open_credit_remarks: ((remarksResult.data || []) as RemarkRow[]).length,
      latest_remarks: ((remarksResult.data || []) as RemarkRow[]).slice(0, 6).map((remark) => ({
        role: remark.role,
        body: remark.body,
        created_at: remark.created_at,
      })),
      intelligence_items: ((intelligenceResult.data || []) as ClarificationIntelligenceRow[]).slice(0, 8).map((row) => ({
        id: row.id,
        status: row.status,
        parsed_intent: row.parsed_intent || null,
        resolution_plan: row.resolution_plan || null,
        document_id: row.document_id,
        updated_at: row.updated_at,
      })),
      lifecycle: {
        total_rounds: scopedLifecycleRows.length,
        stale_rounds: scopedLifecycleRows.filter((row) => String(row.status || "").toUpperCase() === "STALE").length,
        converged_rounds: scopedLifecycleRows.filter((row) => String(row.status || "").toUpperCase() === "CONVERGED").length,
        avg_issue_to_response_ms: average(scopedLifecycleRows.map((row) => row.issue_to_response_ms)),
        avg_response_to_review_ms: average(scopedLifecycleRows.map((row) => row.response_to_review_ms)),
      },
    },
  };
}

export async function buildProjectGrounding(context?: HaritaContext): Promise<string> {
  const snapshot = await getProjectSnapshot(toLookupInput(context));
  return JSON.stringify(snapshot, null, 2);
}

export async function getProjectCreditCatalog(lookup?: ProjectLookupInput): Promise<{
  matchFound: boolean;
  requestedProject: string | null;
  project?: ProjectRow;
  credits: ProjectCreditCatalogItem[];
  reason?: string;
}> {
  if (!admin) {
    return {
      matchFound: false,
      requestedProject: lookup?.title || null,
      credits: [],
      reason: "Supabase grounding unavailable: SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY is missing.",
    };
  }

  const project = await resolveProjectRecord(lookup);
  if (!project) {
    return {
      matchFound: false,
      requestedProject: lookup?.title || null,
      credits: [],
      reason: "No matching project row was found in Supabase.",
    };
  }

  const { data } = await admin
    .from("project_credits")
    .select("id,project_id,credit_id,credit_code,credit_name,status,completion_pct,max_points,points_awarded,category,category_name,responsible_role,is_mandatory,blocked_by,documentation_summary,documents_required,what_to_submit")
    .eq("project_id", project.id)
    .order("credit_code");

  return {
    matchFound: true,
    requestedProject: lookup?.title || project.name,
    project,
    credits: (data || []) as ProjectCreditCatalogItem[],
  };
}

export async function assignComplianceTask(input: ComplianceTaskRequest): Promise<ComplianceTaskResult> {
  if (!admin) {
    return {
      executed: false,
      requires_confirmation: false,
      reason: "Supabase write-back unavailable: SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY is missing.",
    };
  }

  const project = await resolveProjectRecord({
    projectId: input.projectId,
    title: input.title,
    currentItem: input.currentItem,
  });

  if (!project) {
    return {
      executed: false,
      requires_confirmation: false,
      reason: "No matching project row was found in Supabase.",
    };
  }

  const assignee = await resolveProjectMemberByRole(project.id, input.role);
  if (!assignee) {
    return {
      executed: false,
      requires_confirmation: false,
      resolved_project_id: project.id,
      resolved_credit_id: input.creditId || null,
      reason: `No active project member with role '${input.role}' was found for ${project.name}.`,
    };
  }

  const dueDate = input.due?.trim() || null;
  const taskType = input.taskType?.trim() || "compliance_followup";
  const priority = input.priority || "HIGH";
  const pendingTask = {
    title: input.details.slice(0, 120),
    details: input.details,
    role: assignee.role,
    due: dueDate,
    task_type: taskType,
    priority,
  };

  if (!input.confirm) {
    return {
      executed: false,
      requires_confirmation: true,
      resolved_project_id: project.id,
      resolved_credit_id: input.creditId || null,
      resolved_assignee: assignee,
      reason: "Confirmation required before creating a Tracknov task.",
      pending_task: pendingTask,
    };
  }

  const { data: createdTask, error: createError } = await admin
    .from("tasks")
    .insert({
      project_id: project.id,
      project_credit_id: input.creditId || null,
      task_type: taskType,
      assigned_by: assignee.user_id,
      assigned_to: assignee.user_id,
      accountable_user_id: assignee.user_id,
      priority,
      due_date: dueDate,
      task_status: "ASSIGNED",
      workflow_state: "DRAFT",
      active_flag: true,
    })
    .select("id, project_id, assigned_to, task_type, due_date")
    .single();

  if (createError) {
    throw createError;
  }

  await admin.from("task_history").insert({
    task_id: createdTask.id,
    action_type: "created_by_harita",
    performed_by: assignee.user_id,
    new_state: "ASSIGNED",
    new_assignee: assignee.user_id,
    notes: input.details,
  });

  return {
    executed: true,
    requires_confirmation: false,
    resolved_project_id: project.id,
    resolved_credit_id: input.creditId || null,
    resolved_assignee: assignee,
    reason: "Compliance task created successfully.",
    task: {
      id: createdTask.id,
      project_id: createdTask.project_id,
      assigned_to: createdTask.assigned_to,
      task_type: createdTask.task_type,
      due_date: createdTask.due_date,
    },
  };
}
