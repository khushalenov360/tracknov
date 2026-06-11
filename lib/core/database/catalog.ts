import type { ProjectSummaryDTO as ProjectDto } from "../dtos/project.dto";
import type { TaskResponse as TaskDto } from "../dtos/task.dto";
import type { DocumentResponse as DocumentDto } from "../dtos/document.dto";
import type { CreditWorkspaceResponse as CreditDto } from "../dtos/credit.dto";
import type { MemberRole } from "../../types";

/**
 * 06_DATABASE_CATALOG
 * 
 * Strict boundary mapping between Supabase Database Tables and Tracknov DTOs.
 * Direct selection of rows should immediately be cast to these DTO signatures
 * to prevent leaking internal database IDs or metadata fields to the UI or EnovAIT layer.
 */
export interface DatabaseCatalog {
  Tables: {
    projects: {
      Row: ProjectDto;
      Insert: Omit<ProjectDto, 'id' | 'created_at'>;
      Update: Partial<Omit<ProjectDto, 'id' | 'created_at'>>;
    };
    tasks: {
      Row: TaskDto;
      Insert: Omit<TaskDto, 'id' | 'created_at' | 'updated_at'>;
      Update: Partial<Omit<TaskDto, 'id' | 'created_at' | 'updated_at'>>;
    };
    documents: {
      Row: DocumentDto;
      Insert: Omit<DocumentDto, 'id' | 'uploaded_at'>;
      Update: Partial<Omit<DocumentDto, 'id' | 'uploaded_at'>>;
    };
    project_credits: {
      Row: CreditDto;
      Insert: Omit<CreditDto, 'id'>;
      Update: Partial<Omit<CreditDto, 'id'>>;
    };
    project_members: {
      Row: { id: string; project_id: string; user_id: string; role: MemberRole };
      Insert: { project_id: string; user_id: string; role: MemberRole };
      Update: { role?: MemberRole };
    };
  };
  Functions: {
    // List critical RPCs acting as architectural boundaries
    get_workspace_snapshot: {
      Args: { p_user_id: string; p_project_id?: string };
      Returns: { snapshot: string; role: MemberRole };
    };
    enforce_rls_governance: {
      Args: { target_state: string; user_role: string };
      Returns: boolean;
    };
  };
}
