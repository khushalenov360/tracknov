export type MemberRole =
  | "L0"
  | "L1"
  | "L2"
  | "L3"
  | "L4"
  | "L5"
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
export type CreditStatus = import('./core/dtos').CreditStatus;
export type DocumentStatus = import('./core/dtos').DocumentStatus;
export type ProjectStatus = import('./core/dtos').ProjectStatus;
export type ProjectType = import('./core/dtos').ProjectType;
export type IgbcVariant = import('./core/dtos').IgbcVariant;

export type ProjectRatingSystem = import('./core/dtos').ProjectRatingSystem;

export type TaskPriority = import('./core/dtos').TaskPriority;
export type TaskState = import('./core/dtos').TaskState;
export type TaskRecord = import('./core/dtos').TaskResponse;
export type TaskHistoryRecord = import('./core/dtos').TaskHistoryResponse;

export type DocumentRequirement = import('./core/dtos').DocumentRequirement;
export type CatalogCredit = import('./core/dtos').CatalogCreditDTO;
export type DocumentRecord = import('./core/dtos').DocumentResponse;
export type DocumentActivityAction = import('./core/dtos').DocumentActivityAction;
export type DocumentActivityLog = import('./core/dtos').DocumentActivityResponse;
export type SystemActivityLog = import('./core/dtos').SystemActivityResponse;

export type CreditWorkspace = import('./core/dtos').CreditWorkspaceResponse;
export type ProjectSummary = import('./core/dtos').ProjectSummaryDTO;
export type ProjectInviteRecord = import('./core/dtos').ProjectInviteResponse;
export type ProjectMemberRecord = import('./core/dtos').ProjectMemberResponse;

export type DocumentLibraryRecord = import('./core/dtos').DocumentLibraryResponse;
export type TeamMemberRecord = import('./core/dtos').TeamMemberResponse;
export type CurrentUser = import('./core/dtos').CurrentUserDTO;

export type RemarkRecord = {
  id: string;
  credit_id: string;
  document_id?: string | null;
  author_id?: string | null;
  role: MemberRole;
  body: string;
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
    assignments_locked?: boolean;
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
  tasks?: (TaskRecord & { history: TaskHistoryRecord[] })[];
  guidebooks?: {
    id: string;
    title: string;
    file_name: string;
    file_path: string;
    signed_url?: string | null;
    uploaded_by?: string | null;
    created_at: string;
  }[];
  data_tables?: {
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

export type OnboardingChecklist = {
  profile_completed: boolean;
  project_scope_confirmed: boolean;
  first_document_uploaded: boolean;
  first_review_completed: boolean;
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

export type ExtractionMethod = "EMBEDDED_TEXT" | "OCR" | "HYBRID";
export type SemanticType = "HVAC" | "LIGHTING" | "MATERIAL" | "ENERGY" | "UNKNOWN";

export type PositionMap = {
  page: number;
  text: string;
  x: number;
  y: number;
  w: number;
  h: number;
};

export type NormalizedDocument = {
  documentId: string;
  extractedText: string;
  confidenceScore: number;
  extractionMethod: ExtractionMethod;
  pageCount: number;
  language: string;
  positionalMap: PositionMap[];
};

export type ExtractedTable = {
  tableId: string;
  headers: string[];
  rows: string[][];
  pageReferences: number[];
  confidenceScore: number;
  semanticType: SemanticType;
};

export type EvidenceRelationship = {
  sourceDocumentId: string;
  targetEntityId: string;
  relationshipType: string;
  confidenceScore: number;
  frameworkVersion: string;
};
