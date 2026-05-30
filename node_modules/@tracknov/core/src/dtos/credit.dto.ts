import type { MemberRole } from '../types';

export type CreditStatus = "pending" | "in_progress" | "blocked" | "complete";

export type DocumentRequirement = {
  type: string;
  label: string;
  requirement: "Required" | "NA";
  required: boolean;
  assigned_user_id?: string | null;
  assigned_role?: MemberRole | null;
  assigned_email?: string | null;
  assigned_name?: string | null;
};

export type CatalogCreditDTO = {
  category: string;
  credit_label: string;
  credit_code: string;
  credit_name: string;
  is_mandatory: boolean;
  na: boolean;
  documentation_summary: string;
  documents_required: DocumentRequirement[];
};

export type CreditWorkspaceResponse = {
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
  // Note: documents and remarks will be typed as any or imported from their respective DTOs.
  documents: any[];
  remarks: any[];
  available_points?: number;
};
