import type { MemberRole } from '@/lib/types';

export type ProjectStatus = "active" | "on_hold" | "completed" | "archived";
export type ProjectType = "residential" | "commercial" | "industrial" | "infrastructure" | "mixed_use";
export type IgbcVariant = "new" | "existing";

export type ProjectRatingSystem = {
  id: string;
  name: string;
  version: string;
  description?: string | null;
};

export type ProjectSummaryDTO = {
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
  health_status?: string | null;
  projectCode: string;
  ratingSystemId?: string | null;
  projectState?: string;
  submissionFlag?: boolean;
  lockFlag?: boolean;
  projectCodeActual?: string;
};

export type ProjectInviteResponse = {
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

export type ProjectMemberResponse = {
  id: string;
  project_id: string;
  user_id: string;
  member_email?: string | null;
  full_name?: string | null;
  role: MemberRole;
  created_at: string;
};
