export type MemberRole =
  | "super_user"
  | "owner"
  | "client"
  | "consultant"
  | "architect"
  | "mep"
  | "contractor"
  | "project_admin"
  | "super_admin";
export type CreditStatus = "pending" | "in_progress" | "blocked" | "complete";
export type DocumentStatus = "uploaded" | "owner_approved" | "approved" | "rejected";
export type ProjectStatus = "active" | "on_hold" | "completed" | "archived";
export type ProjectType = "residential" | "commercial" | "industrial" | "infrastructure" | "mixed_use";
export type IgbcVariant = "new" | "existing";

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
  status: DocumentStatus;
  uploaded_at: string;
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
  project_id: string;
  credit_code: string;
  category: string;
  credit_name: string;
  is_mandatory: boolean;
  documents_required: DocumentRequirement[];
  status: CreditStatus;
  blocked_by?: string | null;
  completion_pct: number;
  documentation_summary?: string | null;
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
  status: ProjectStatus;
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
    status: ProjectStatus;
    green_certification: string;
    igbc_variant: IgbcVariant;
    certification_type: string;
    target_rating: string;
    created_at: string;
    created_by?: string | null;
  };
  userRole: MemberRole;
  credits: CreditWorkspace[];
  members: ProjectMemberRecord[];
  invites: ProjectInviteRecord[];
  notifications: {
    id: string;
    body: string;
    created_at: string;
    read_at?: string | null;
  }[];
};

export type DocumentLibraryRecord = DocumentRecord & {
  project_name: string;
  credit_code?: string | null;
  credit_name?: string | null;
  uploaded_by_name?: string | null;
  project_role?: MemberRole;
  can_edit_metadata?: boolean;
  can_edit_status?: boolean;
  can_reject?: boolean;
  can_delete?: boolean;
};

export type TeamMemberRecord = {
  id: string;
  user_id: string;
  email: string;
  full_name: string;
  company?: string | null;
  role: MemberRole;
  project_names: string[];
  created_at: string;
};

export type CurrentUser = {
  id: string;
  email: string;
  role: MemberRole;
};
