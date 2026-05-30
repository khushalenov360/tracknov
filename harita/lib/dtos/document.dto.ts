import type { MemberRole } from '../types';

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

export type DocumentResponse = {
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
  file_size_bytes?: number | null;
  compressed_size_bytes?: number | null;
  upload_origin?: string | null;
  upload_rejection_reason?: string | null;
  compression_applied?: boolean | null;
  mime_type?: string | null;
  upload_duration_ms?: number | null;
};

export type DocumentActivityAction = "uploaded" | "metadata_updated" | "status_updated" | "deleted";

export type DocumentActivityResponse = {
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

export type DocumentLibraryResponse = DocumentResponse & {
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
  activity_logs?: DocumentActivityResponse[];
};
