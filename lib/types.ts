export type MemberRole =
  | "super_user"
  | "l4_reserved"
  | "owner"
  | "client"
  | "consultant"
  | "architect"
  | "mep"
  | "contractor"
  | "project_admin"
  | "super_admin";
export type CreditStatus = "pending" | "in_progress" | "blocked" | "complete";
export type DocumentStatus =
  | "uploaded"
  | "owner_approved"
  | "approved"
  | "rejected"
  | "DRAFT"
  | "READY"
  | "SUBMITTED"
  | "UNDER_REVIEW"
  | "CLARIFICATION"
  | "RESUBMITTED"
  | "APPROVED"
  | "REJECTED"
  | "ELIMINATED";
export type ProjectStatus = "active" | "on_hold" | "completed" | "archived";
export type ProjectType = "residential" | "commercial" | "industrial" | "infrastructure" | "mixed_use";
export type IgbcVariant = "new" | "existing";

export type ProjectRatingSystem = {
  id: string;
  name: string;
  version: string;
  description?: string | null;
};

export type DocumentRequirement = {
  type: string;
  label: string;
  requirement: "Required" | "NA";
  required: boolean;
};

export type CatalogCredit = {
  category: string;
  credit_label: string;
  credit_code: string;
  credit_name: string;
  is_mandatory: boolean;
  na: boolean;
  documentation_summary: string;
  documents_required: DocumentRequirement[];
};

export type DocumentRecord = {
  id: string;
  credit_id?: string | null;
  project_credit_id?: string | null;
  project_id: string;
  uploaded_by?: string | null;
  file_name: string;
  file_path: string;
  file_type: string;
  doc_category: string;
  notes?: string | null;
  rejection_reason?: string | null;
  owner_reviewed_by?: string | null;
  owner_reviewed_at?: string | null;
  reviewed_by?: string | null;
  reviewed_at?: string | null;
  state: DocumentStatus;
  status?: DocumentStatus;
  workflow_state?: string | null;
  version?: number;
  is_latest?: boolean;
  parent_document_id?: string | null;
  uploaded_at: string;
};

export type DocumentActivityAction = "uploaded" | "metadata_updated" | "status_updated" | "deleted";

export type DocumentActivityLog = {
  id: string;
  document_id: string;
  project_id: string;
  action: DocumentActivityAction;
  actor_id?: string | null;
  actor_role?: string | null;
  actor_name?: string | null;
  summary: string;
  details: Record<string, unknown>;
  created_at: string;
};

export type SystemActivityLog = {
  id: string;
  project_id?: string | null;
  entity_type: "project" | "credit" | "document" | "team" | "billing" | "auth";
  entity_id?: string | null;
  action: string;
  actor_id?: string | null;
  actor_role?: string | null;
  summary: string;
  details: Record<string, unknown>;
  created_at: string;
};

export type RemarkRecord = {
  id: string;
  credit_id: string;
  document_id?: string | null;
  author_id?: string | null;
  role: MemberRole;
  body: string;
  created_at: string;
};

export type CreditWorkspace = {
  id: string;
  project_credit_id?: string | null;
  project_id: string;
  assigned_user_id?: string | null;
  credit_code: string;
  category: string;
  credit_name: string;
  responsible_role?: MemberRole | null;
  is_mandatory: boolean;
  documents_required: DocumentRequirement[];
  state: CreditStatus;
  status?: CreditStatus;
  blocked_by?: string | null;
  completion_pct: number;
  documentation_summary?: string | null;
  what_to_submit?: string | null;
  sample_document_url?: string | null;
  effort_level?: "easy" | "moderate" | "hard" | null;
  effort_guidance?: string | null;
  na: boolean;
  documents: DocumentRecord[];
  remarks: RemarkRecord[];
};

export type ProjectSummary = {
  id: string;
  name: string;
  client: string;
  location: string;
  project_type: ProjectType;
  state: ProjectStatus;
  status?: ProjectStatus;
  green_certification: string;
  igbc_variant: IgbcVariant;
  certification_type: string;
  target_rating: string;
  created_at: string;
  role: MemberRole;
  overallCompletion: number;
  totalCredits: number;
  uploadedDocs: number;
  mandatoryCreditsMet: number;
  openRemarks: number;
  membersCount: number;
  planCode?: string;
  planName?: string;
  monthlyPriceInr?: number;
  documentCreditLimit?: number;
  consultantCreditLimit?: number;
  documentCreditsUsed?: number;
  consultantCreditsUsed?: number;
  documentCreditsRemaining?: number;
  consultantCreditsRemaining?: number;
  pendingReviewsCount?: number;
  rejectedCount?: number;
  statusFlag?: "green" | "amber" | "red";
  projectCode: string;
  ratingSystemId?: string | null;
  projectState?: string;
  submissionFlag?: boolean;
  lockFlag?: boolean;
};

export type ProjectInviteRecord = {
  id: string;
  project_id: string;
  email: string;
  role: Exclude<MemberRole, "owner">;
  token: string;
  created_by?: string | null;
  accepted_by?: string | null;
  accepted_at?: string | null;
  created_at: string;
};

export type ProjectMemberRecord = {
  id: string;
  project_id: string;
  user_id: string;
  member_email?: string | null;
  role: MemberRole;
  created_at: string;
};

export type ProjectWorkspace = {
  project: {
    id: string;
    name: string;
    client: string;
    location: string;
    project_type: ProjectType;
    state: ProjectStatus;
    green_certification: string;
    igbc_variant: IgbcVariant;
    certification_type: string;
    target_rating: string;
    created_at: string;
    created_by?: string | null;
    rating_system_id?: string | null;
    submission_flag?: boolean;
    lock_flag?: boolean;
    project_code?: string;
  };
  userRole: MemberRole;
  credits: CreditWorkspace[];
  members: ProjectMemberRecord[];
  invites: ProjectInviteRecord[];
  notifications: {
    id: string;
    body: string;
    action_url?: string | null;
    created_at: string;
    read_at?: string | null;
  }[];
  activityLogs?: SystemActivityLog[];
  guidebooks?: {
    id: string;
    title: string;
    file_name: string;
    file_path: string;
    signed_url?: string | null;
    uploaded_by?: string | null;
    created_at: string;
  }[];
  validationRules?: {
    id: string;
    project_credit_id?: string | null;
    credit_id?: string | null;
    doc_category?: string | null;
    rule_name: string;
    required_keywords?: string[];
    severity: "error" | "warning";
    is_active: boolean;
    created_at: string;
  }[];
};

export type DocumentLibraryRecord = DocumentRecord & {
  project_name: string;
  credit_code?: string | null;
  credit_name?: string | null;
  credit_what_to_submit?: string | null;
  credit_sample_document_url?: string | null;
  uploaded_by_name?: string | null;
  project_role?: MemberRole;
  can_edit_metadata?: boolean;
  can_edit_status?: boolean;
  can_reject?: boolean;
  can_delete?: boolean;
  can_view_logs?: boolean;
  activity_logs?: DocumentActivityLog[];
};

export type TeamMemberRecord = {
  id: string;
  user_id: string;
  email: string;
  full_name: string;
  company?: string | null;
  role: MemberRole;
  project_names: string[];
  project_ids?: string[];
  created_at: string;
  token_balance?: number;
  disabled_at?: string | null;
  disabled_reason?: string | null;
};

export type OnboardingChecklist = {
  profile_completed: boolean;
  project_scope_confirmed: boolean;
  first_document_uploaded: boolean;
  first_review_completed: boolean;
};

export type CurrentUser = {
  id: string;
  email: string;
  role: MemberRole;
};

export type AuditTimelineRecord = {
  id: string;
  project_id: string | null;
  project_name: string;
  entity_type: string;
  action: string;
  summary: string;
  actor_id: string | null;
  actor_role: string | null;
  actor_name: string | null;
  created_at: string;
};
