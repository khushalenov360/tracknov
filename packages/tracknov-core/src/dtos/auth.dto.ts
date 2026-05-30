import type { MemberRole } from '../types';

export type CurrentUserDTO = {
  id: string;
  email: string;
  role: MemberRole;
};

export type TeamMemberResponse = {
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

export type SystemActivityResponse = {
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
