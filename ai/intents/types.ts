export type AIIntent =
  | "assignContributor"
  | "uploadDocument"
  | "requestClarification"
  | "approveSubmittal"
  | "rejectSubmittal"
  | "generateSubmissionPack"
  | "escalateIssue"
  | "reassignReviewer"
  | "reopenSubmission"
  | "general";

export type IntentExecutionRequest = {
  userId: string;
  role: string;
  projectContext: {
    projectId?: string | null;
    projectName?: string | null;
  };
  intent: AIIntent;
  entities?: Record<string, unknown>;
  permissions?: string[];
  workflowContext?: Record<string, unknown>;
};

export type IntentExecutionResult = {
  ok: boolean;
  intent: AIIntent;
  message: string;
  actionId?: string;
  contract?: {
    action_id: string;
    action_name: string;
  } | null;
  nextSteps?: string[];
};
