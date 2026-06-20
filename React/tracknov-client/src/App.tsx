import { useEffect, useMemo, useState } from "react";
import { Link, Navigate, Outlet, Route, Routes, useLocation, useNavigate, useOutletContext, useParams } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { AlertCircle, AlertTriangle, CheckCircle2, Clock3, Lock, RefreshCcw, Unlock } from "lucide-react";
import { Shell } from "./components/shell";
import { HaritaContextProvider, PersistentHaritaSidebar } from "./components/assistant/harita-context";
import { ProjectTabs } from "./components/project/ProjectTabs";
import { Badge } from "./components/ui-lib/ui/badge";
import { LoginPage } from "./pages/LoginPage";
import { fetchReviewQueue, fetchWorkspaceOpsSummary, transitionReviewQueueItem, type ReviewQueueItem } from "./services/api";
import {
  getCreditPoints,
  getCreditStats,
  getCreditStatus,
  getDashboardProjects,
  getProjectWorkspace,
  type ProjectWorkspace,
  type WorkspaceCredit,
  type WorkspaceMember,
} from "./lib/liveData";
import { canReview, isProjectAdminRole } from "./lib/roles";
import { supabase } from "./lib/supabaseClient";

function mandatoryCode(creditCode: string, mandatory: boolean) {
  if (!mandatory || creditCode.includes("MR")) {
    return creditCode;
  }
  const parts = creditCode.split(" ");
  return `${parts[0]} MR ${parts.slice(1).join(" ")}`.trim();
}

function statusClass(status: string) {
  if (status === "approved") return "state-approved";
  if (status === "blocked") return "state-critical";
  return "state-pending";
}

function LoadingScreen() {
  return (
    <div className="flex items-center justify-center min-h-screen bg-[var(--color-bg)]">
      <div className="w-8 h-8 border-4 border-[var(--color-green)] border-t-transparent rounded-full animate-spin"></div>
    </div>
  );
}

function WorkspaceSkeleton() {
  return (
    <div className="flex min-h-screen bg-[var(--color-bg)] overflow-hidden">
      <div className="hidden md:flex w-24 border-r border-[var(--color-border)] bg-[var(--color-surface)]" />
      <div className="flex-1 flex">
        <div className="flex-1 flex flex-col">
          <div className="h-20 border-b border-[var(--color-border)] bg-[var(--color-surface)]/80" />
          <div className="px-10 py-8 space-y-6">
            <div className="space-y-3">
              <div className="h-8 w-64 rounded-xl bg-[var(--color-surface-2)] animate-pulse" />
              <div className="h-4 w-96 max-w-full rounded-lg bg-[var(--color-surface-2)] animate-pulse" />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
              {Array.from({ length: 6 }).map((_, index) => (
                <div key={index} className="h-44 rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] animate-pulse" />
              ))}
            </div>
          </div>
        </div>
        <div className="hidden xl:block w-[420px] border-l border-[var(--color-border)] bg-[var(--color-surface)]" />
      </div>
    </div>
  );
}

type QueueBoardItem = {
  id: string;
  title: string;
  description: string;
  tone: "neutral" | "warning" | "danger" | "success";
  href?: string;
};

function isReviewerRole(role: string) {
  return canReview(role);
}

function humanizeAction(action: string) {
  switch (action) {
    case "approve":
      return "Approve";
    case "reject":
      return "Reject";
    case "request_clarification":
      return "Request Clarification";
    case "start_owner_review":
      return "Start Owner Review";
    case "start_admin_review":
      return "Start Admin Review";
    case "submit":
      return "Submit";
    case "resubmit":
      return "Resubmit";
    default:
      return action.replace(/_/g, " ");
  }
}

function queueToneClass(tone: QueueBoardItem["tone"]) {
  if (tone === "danger") return "border-[var(--color-red)]/40 bg-[var(--color-red-soft)]";
  if (tone === "warning") return "border-amber-400/30 bg-amber-400/10";
  if (tone === "success") return "border-emerald-400/30 bg-emerald-400/10";
  return "border-[var(--color-border)] bg-[var(--color-surface-2)]";
}

function buildQueueBoard(workspace: ProjectWorkspace, reviewQueue: ReviewQueueItem[]) {
  const mandatoryBlockers: QueueBoardItem[] = workspace.credits
    .filter((credit) => Boolean(credit.is_mandatory) && getCreditStatus(credit) !== "approved")
    .slice(0, 6)
    .map((credit) => ({
      id: `mandatory-${credit.id}`,
      title: `${mandatoryCode(credit.credit_code, true)} needs closure`,
      description: `${credit.credit_name} is still ${getCreditStatus(credit)} and requires evidence progression.`,
      tone: getCreditStatus(credit) === "blocked" ? "danger" : "warning",
      href: `/projects/${workspace.project.id}/credits`,
    }));

  const clarificationItems: QueueBoardItem[] = workspace.documents
    .filter((document) => {
      const state = String(document.workflow_state || document.status || "").toUpperCase();
      return state.includes("CLARIFICATION") || state.includes("REJECT");
    })
    .slice(0, 6)
    .map((document) => ({
      id: `clarification-${document.id}`,
      title: document.file_name,
      description: document.notes || document.intelligence?.summary || "Clarification follow-up is pending on this evidence item.",
      tone: "warning",
      href: `/projects/${workspace.project.id}/clarifications`,
    }));

  const aiGuidance = workspace.documents
    .flatMap((document) => [...(document.intelligence?.next_steps ?? []), ...(document.intelligence?.risks ?? [])])
    .filter(Boolean)
    .slice(0, 5)
    .map((entry, index) => ({
      id: `guidance-${index}`,
      title: "Harita guidance",
      description: entry,
      tone: "neutral" as const,
      href: `/projects/${workspace.project.id}/documents`,
    }));

  const myPriorityTasks: QueueBoardItem[] =
    reviewQueue.length > 0
      ? reviewQueue.slice(0, 6).map((item) => ({
          id: `review-${item.id}`,
          title: `${item.creditCode} · ${item.fileName}`,
          description: `${item.workflowLabel} for ${item.uploadedByName}. Available actions: ${item.allowedActions.map(humanizeAction).join(", ") || "None"}.`,
          tone: item.isMandatory ? "danger" : "warning",
          href: `/projects/${workspace.project.id}/reviews`,
        }))
      : workspace.credits
          .filter((credit) => getCreditStatus(credit) !== "approved")
          .slice(0, 6)
          .map((credit) => ({
            id: `credit-${credit.id}`,
            title: `${credit.credit_code} · ${credit.credit_name}`,
            description: `${String(credit.responsible_role || "Unassigned").replace(/_/g, " ")} owns the next movement for this credit.`,
            tone: getCreditStatus(credit) === "blocked" ? "danger" : "neutral",
            href: `/projects/${workspace.project.id}/credits`,
          }));

  return {
    myPriorityTasks,
    mandatoryBlockers,
    pendingReviews: reviewQueue.slice(0, 8),
    clarificationItems,
    aiGuidance,
  };
}

function ProjectCards({
  projectId,
  credits,
}: {
  projectId: string;
  credits: WorkspaceCredit[];
}) {
  const [category, setCategory] = useState<string | null>(null);
  const stats = useMemo(() => getCreditStats(credits), [credits]);

  const filteredCredits = useMemo(() => {
    return credits.filter((credit) => (category ? credit.category === category : true));
  }, [category, credits]);

  return (
    <div className="space-y-4 text-left animate-page-enter">
      <div className="flex flex-wrap gap-2 items-center justify-between">
        <div className="flex gap-2 overflow-x-auto pb-2">
          <button
            onClick={() => setCategory(null)}
            className={`whitespace-nowrap px-3 py-1 text-xs font-bold rounded-lg border ${
              !category
                ? "bg-[var(--color-surface)] border-[var(--color-border-strong)] text-[var(--color-text-primary)]"
                : "bg-[var(--color-surface-2)] border-[var(--color-border)] text-[var(--color-text-secondary)]"
            }`}
          >
            All Credits
          </button>
          {stats.categories.map((entry) => (
            <button
              key={entry.key}
              onClick={() => setCategory(entry.key)}
              className={`whitespace-nowrap px-3 py-1 text-xs font-bold rounded-lg border ${
                category === entry.key
                  ? "bg-[var(--color-surface)] border-[var(--color-border-strong)] text-[var(--color-text-primary)]"
                  : "bg-[var(--color-surface-2)] border-[var(--color-border)] text-[var(--color-text-secondary)]"
              }`}
            >
              {entry.key}
            </button>
          ))}
        </div>
        <Badge className="bg-[var(--color-surface-2)] border border-[var(--color-border)] text-[var(--color-text-secondary)] font-bold text-xs shrink-0 mb-2">
          {filteredCredits.length} Credits Filtered
        </Badge>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredCredits.map((credit) => {
          const status = getCreditStatus(credit);
          const note = credit.remarks?.[0]?.body;
          const displayedResponsibility =
            credit.responsible_role ||
            credit.assignments?.[0]?.full_name ||
            credit.assignments?.[0]?.role ||
            "UNASSIGNED";

          return (
            <div key={credit.id} className="surface-card p-5 flex flex-col space-y-4 hover:border-[var(--color-green)] transition-all">
              <div className="flex justify-between items-start gap-3">
                <div className="space-y-1">
                  <span className="font-mono font-black text-[var(--color-green)] text-xs block">
                    {mandatoryCode(credit.credit_code, Boolean(credit.is_mandatory))}
                  </span>
                  <h3 className="font-bold text-[var(--color-text-primary)] leading-snug">
                    {credit.credit_name}
                  </h3>
                </div>
                <Badge className={`shrink-0 ${statusClass(status)}`}>{status.toUpperCase()}</Badge>
              </div>

              <div className="space-y-2 flex-1">
                <div className="flex justify-between items-center text-xs text-[var(--color-text-secondary)]">
                  <span>Points</span>
                  <strong className="text-[var(--color-text-primary)]">{getCreditPoints(credit).toFixed(1)}</strong>
                </div>
                <div className="flex justify-between items-center text-xs text-[var(--color-text-secondary)]">
                  <span>Responsibility</span>
                  <strong className="text-[var(--color-text-primary)] uppercase">
                    {String(displayedResponsibility).replace(/_/g, " ")}
                  </strong>
                </div>
                {note ? (
                  <div className="bg-[var(--color-surface-2)] p-2.5 rounded-lg border border-[var(--color-border)] mt-2">
                    {status === "blocked" ? (
                      <span className="text-[var(--color-red)] font-bold flex items-center gap-1.5 text-xs">
                        <AlertTriangle className="h-3.5 w-3.5 shrink-0" />
                        <span className="truncate">{note}</span>
                      </span>
                    ) : (
                      <span className="text-[var(--color-text-tertiary)] font-medium text-xs line-clamp-2">
                        {note}
                      </span>
                    )}
                  </div>
                ) : null}
              </div>

              <div className="pt-2 border-t border-[var(--color-border)]">
                <Link
                  to={`/projects/${projectId}/documents?credit=${credit.id}`}
                  className="w-full flex items-center justify-center py-2 px-4 bg-[var(--color-surface-2)] hover:bg-[var(--color-green-soft)] text-[var(--color-text-primary)] hover:text-[var(--color-green)] text-xs font-bold rounded-lg border border-[var(--color-border)] hover:border-[var(--color-green-light)] transition-colors"
                >
                  Open Workspace
                </Link>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function AssignmentsPage({ workspace }: { workspace: ProjectWorkspace }) {
  const isAllowed = ["L3", "L5", "project_admin", "super_admin", "super_user"].includes(workspace.userRole);
  const [credits, setCredits] = useState<WorkspaceCredit[]>(workspace.credits);
  const [assignmentsLocked, setAssignmentsLocked] = useState(Boolean(workspace.project.assignments_locked));
  const [isSavingLock, setIsSavingLock] = useState(false);

  useEffect(() => {
    setCredits(workspace.credits);
    setAssignmentsLocked(Boolean(workspace.project.assignments_locked));
  }, [workspace]);

  if (!isAllowed) {
    return <Navigate to={`/projects/${workspace.project.id}/overview`} replace />;
  }

  const creditsWithDocuments = useMemo(() => {
    const activeCredits = credits.filter((credit) => (credit.documents_required ?? []).length > 0);
    const categoryOrder = ["EDA", "WC", "EE", "IM", "IE", "IID"];

    return [...activeCredits].sort((a, b) => {
      const prefixA = a.credit_code ? a.credit_code.split(" ")[0] : "";
      const prefixB = b.credit_code ? b.credit_code.split(" ")[0] : "";
      const idxA = categoryOrder.indexOf(prefixA);
      const idxB = categoryOrder.indexOf(prefixB);

      if (idxA !== idxB) {
        if (idxA === -1) return 1;
        if (idxB === -1) return -1;
        return idxA - idxB;
      }

      const isMRA = Boolean(a.is_mandatory) || a.credit_code.includes("MR");
      const isMRB = Boolean(b.is_mandatory) || b.credit_code.includes("MR");
      if (isMRA && !isMRB) return -1;
      if (!isMRA && isMRB) return 1;

      const numA = parseFloat(a.credit_code.match(/\d+(\.\d+)?/)?.[0] || "0");
      const numB = parseFloat(b.credit_code.match(/\d+(\.\d+)?/)?.[0] || "0");
      return numA - numB;
    });
  }, [credits]);

  const canManage = !assignmentsLocked;

  const toggleAssignmentsLock = async () => {
    setIsSavingLock(true);
    const nextValue = !assignmentsLocked;
    const { error } = await supabase
      .from("projects")
      .update({ assignments_locked: nextValue })
      .eq("id", workspace.project.id);

    if (!error) {
      setAssignmentsLocked(nextValue);
    }
    setIsSavingLock(false);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4 border-b border-[var(--color-border)] pb-4">
        <div className="flex flex-col gap-1">
          <h2 className="text-[16px] font-bold text-[var(--color-text-primary)]">Project Assignment Matrix</h2>
          <p className="text-[13px] text-[var(--color-text-secondary)]">
            Rapidly assign responsible team members to individual credit documents without navigating through each workspace.
          </p>
        </div>
        <button
          onClick={toggleAssignmentsLock}
          disabled={isSavingLock}
          className={`flex items-center gap-2 px-3 py-1.5 rounded-md text-[11px] font-bold transition-all shadow-sm border shrink-0 ${
            assignmentsLocked
              ? "bg-rose-50 border-rose-200 text-rose-600 hover:bg-rose-100"
              : "bg-emerald-50 border-emerald-200 text-emerald-600 hover:bg-emerald-100"
          } ${isSavingLock ? "opacity-60 cursor-not-allowed" : ""}`}
        >
          {assignmentsLocked ? (
            <>
              <Lock className="w-3 h-3" />
              Unlock Assignments
            </>
          ) : (
            <>
              <Unlock className="w-3 h-3" />
              Lock Assignments
            </>
          )}
        </button>
      </div>

      {assignmentsLocked ? (
        <div className="flex items-center gap-2 p-3 bg-amber-50 border border-amber-200 text-amber-800 rounded-md text-xs">
          <AlertCircle className="w-4 h-4 text-amber-600 shrink-0" />
          <span>Assignments are locked for this project. Contributor assignments are read-only.</span>
        </div>
      ) : null}

      <div className="surface-card rounded-md overflow-hidden border border-[var(--color-border)]">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-[12px]">
            <thead>
              <tr className="bg-[var(--color-surface-2)] border-b border-[var(--color-border)]">
                <th className="px-4 py-3 font-semibold text-[var(--color-text-secondary)] w-1/3">Credit</th>
                <th className="px-4 py-3 font-semibold text-[var(--color-text-secondary)] w-1/3">Document Status</th>
                <th className="px-4 py-3 font-semibold text-[var(--color-text-secondary)] w-1/3">Assigned Contributor</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--color-border)]">
              {creditsWithDocuments.map((credit) => (
                credit.documents_required?.map((requirement: any, index: number) => (
                  <tr
                    key={`${credit.id}-${requirement.type || requirement.label || index}`}
                    className="hover:bg-[var(--color-surface-2)]/50 transition-colors"
                  >
                    <td className="px-4 py-3 border-r border-[var(--color-border)]/50 align-top">
                      {index === 0 ? (
                        <div>
                          <p className="font-bold text-[var(--color-text-primary)]">{credit.credit_code}</p>
                          <p className="text-[11px] text-[var(--color-text-secondary)] mt-0.5">{credit.credit_name}</p>
                        </div>
                      ) : null}
                    </td>
                    <AssignmentMatrixRowControls
                      projectId={workspace.project.id}
                      credit={credit}
                      docType={String(requirement.type || requirement.label || "")}
                      label={String(requirement.label || requirement.type || "Required document")}
                      initialIsRequired={Boolean(requirement.required)}
                      initialAssigneeId={
                        credit.assignments?.find(
                          (assignment: any) =>
                            assignment.document_type === requirement.type || assignment.document_type === requirement.label,
                        )?.user_id
                      }
                      members={workspace.members}
                      isDisabled={!canManage}
                      onCreditChange={(nextCredit) => {
                        setCredits((current) => current.map((entry) => (entry.id === nextCredit.id ? nextCredit : entry)));
                      }}
                    />
                  </tr>
                )) ?? []
              ))}
              {creditsWithDocuments.length === 0 ? (
                <tr>
                  <td colSpan={3} className="px-4 py-8 text-center text-[var(--color-text-secondary)] text-[13px]">
                    No active credits with required documents found.
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

function AssignmentMatrixRowControls({
  projectId,
  credit,
  docType,
  label,
  initialIsRequired,
  initialAssigneeId,
  members,
  isDisabled,
  onCreditChange,
}: {
  projectId: string;
  credit: WorkspaceCredit;
  docType: string;
  label: string;
  initialIsRequired: boolean;
  initialAssigneeId?: string;
  members: WorkspaceMember[];
  isDisabled: boolean;
  onCreditChange: (credit: WorkspaceCredit) => void;
}) {
  const [localRequired, setLocalRequired] = useState(initialIsRequired);
  const [localAssigneeId, setLocalAssigneeId] = useState(initialAssigneeId);

  useEffect(() => {
    setLocalRequired(initialIsRequired);
  }, [initialIsRequired]);

  useEffect(() => {
    setLocalAssigneeId(initialAssigneeId);
  }, [initialAssigneeId]);

  const coordinators = members.filter((member) => ["owner", "project_admin", "consultant"].includes(member.role));
  const contributors = members.filter((member) => ["architect", "mep", "contractor"].includes(member.role));

  const displayMember = (member: WorkspaceMember) => {
    const name = member.full_name?.trim();
    if (name) {
      return name;
    }

    return member.email?.trim() || String(member.role).replace(/_/g, " ") || "Assigned User";
  };

  const handleRequirementChange = async (value: boolean) => {
    if (value === localRequired) return;

    const previousRequirements = credit.documents_required ?? [];
    const previousAssignments = credit.assignments ?? [];
    const nextRequirements = previousRequirements.map((item: any) =>
      item.type === docType
        ? {
            ...item,
            required: value,
            requirement: value ? "Required" : "NA",
          }
        : item,
    );
    const nextAssignments = value
      ? previousAssignments
      : previousAssignments.filter((assignment: any) => assignment.document_type !== docType);

    setLocalRequired(value);
    if (!value) {
      setLocalAssigneeId(undefined);
    }

    onCreditChange({
      ...credit,
      documents_required: nextRequirements,
      assignments: nextAssignments,
    });

    const { error: updateError } = await supabase
      .from("project_credits")
      .update({ documents_required: nextRequirements })
      .eq("id", credit.id);

    if (!updateError && !value) {
      const { error: clearAssignmentError } = await supabase
        .from("assignments")
        .update({ is_active: false })
        .eq("project_credit_id", credit.id)
        .eq("document_type", docType)
        .eq("is_active", true);

      if (clearAssignmentError) {
        onCreditChange({
          ...credit,
          documents_required: previousRequirements,
          assignments: previousAssignments,
        });
        setLocalRequired(initialIsRequired);
        setLocalAssigneeId(initialAssigneeId);
        return;
      }
    }

    if (updateError) {
      onCreditChange({
        ...credit,
        documents_required: previousRequirements,
        assignments: previousAssignments,
      });
      setLocalRequired(initialIsRequired);
      setLocalAssigneeId(initialAssigneeId);
    }
  };

  const handleAssignmentChange = async (userId: string) => {
    const nextUserId = userId || undefined;
    if (nextUserId === localAssigneeId) return;

    const previousAssignments = credit.assignments ?? [];
    const selectedMember = members.find((member) => member.user_id === nextUserId);
    const remainingAssignments = previousAssignments.filter((assignment: any) => assignment.document_type !== docType);
    const optimisticAssignments = nextUserId
      ? [
          ...remainingAssignments,
          {
            id: `temp-${credit.id}-${docType}`,
            project_credit_id: credit.id,
            document_type: docType,
            user_id: nextUserId,
            role: selectedMember?.role ?? null,
            full_name: selectedMember?.full_name ?? null,
            email: selectedMember?.email ?? null,
            is_active: true,
          },
        ]
      : remainingAssignments;

    setLocalAssigneeId(nextUserId);
    onCreditChange({
      ...credit,
      assignments: optimisticAssignments,
    });

    const { error: deactivateError } = await supabase
      .from("assignments")
      .update({ is_active: false })
      .eq("project_credit_id", credit.id)
      .eq("document_type", docType)
      .eq("is_active", true);

    if (deactivateError) {
      onCreditChange({ ...credit, assignments: previousAssignments });
      setLocalAssigneeId(initialAssigneeId);
      return;
    }

    if (!nextUserId || !selectedMember) {
      return;
    }

    const { data: insertedAssignment, error: insertError } = await supabase
      .from("assignments")
      .insert({
        project_id: projectId,
        project_credit_id: credit.id,
        document_type: docType,
        user_id: nextUserId,
        role: selectedMember.role,
        is_active: true,
      })
      .select("id, project_credit_id, document_type, user_id, role, is_active")
      .single();

    if (insertError) {
      onCreditChange({ ...credit, assignments: previousAssignments });
      setLocalAssigneeId(initialAssigneeId);
      return;
    }

    onCreditChange({
      ...credit,
      assignments: [
        ...remainingAssignments,
        {
          ...insertedAssignment,
          full_name: selectedMember.full_name,
          email: selectedMember.email,
        },
      ],
    });
  };

  return (
    <>
      <td className="px-4 py-3 border-r border-[var(--color-border)]/50">
        <div className="flex items-center justify-between gap-3">
          <span className="font-medium text-[var(--color-text-primary)]">{label}</span>
          <select
            value={localRequired ? "true" : "false"}
            onChange={(event) => handleRequirementChange(event.target.value === "true")}
            disabled={isDisabled}
            className={`h-7 rounded-md border text-[10px] uppercase font-bold focus:outline-none disabled:opacity-50 px-2 cursor-pointer min-w-[110px] transition-colors ${
              localRequired
                ? "border-[var(--color-border)] bg-[var(--color-surface)] text-[var(--color-text-secondary)]"
                : "border-[var(--color-red)] bg-[var(--color-red-soft)] text-[var(--color-red)]"
            }`}
          >
            <option value="true">Required</option>
            <option value="false">Not Required</option>
          </select>
        </div>
      </td>
      <td className="px-4 py-2">
        <select
          value={localAssigneeId || ""}
          onChange={(event) => handleAssignmentChange(event.target.value)}
          disabled={isDisabled || !localRequired}
          className={`h-8 w-full rounded-md border border-[var(--color-border)] bg-[var(--color-surface)] px-2 text-xs text-[var(--color-text-secondary)] focus:border-[var(--color-green)] focus:outline-none disabled:opacity-50 transition-colors ${
            localAssigneeId ? "border-[var(--color-green)] text-[var(--color-green)]" : ""
          }`}
        >
          <option value="">Unassigned</option>
          {coordinators.length > 0 ? (
            <optgroup label="Coordinators">
              {coordinators.map((member) => (
                <option key={member.user_id} value={member.user_id}>
                  {displayMember(member)}
                </option>
              ))}
            </optgroup>
          ) : null}
          {contributors.length > 0 ? (
            <optgroup label="Contributors">
              {contributors.map((member) => (
                <option key={member.user_id} value={member.user_id}>
                  {displayMember(member)}
                </option>
              ))}
            </optgroup>
          ) : null}
        </select>
      </td>
    </>
  );
}

function DocumentsPage({ workspace }: { workspace: ProjectWorkspace }) {
  const documents = workspace.documents;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between border-b border-[var(--color-border)] pb-4">
        <div>
          <h2 className="text-[16px] font-bold text-[var(--color-text-primary)]">Document Intelligence</h2>
          <p className="text-[13px] text-[var(--color-text-secondary)]">
            Live uploads, workflow states, and Harita evidence analysis from Bhavarkua.
          </p>
        </div>
        <Badge className="bg-[var(--color-surface-2)] border border-[var(--color-border)] text-[var(--color-text-secondary)]">
          {documents.length} Uploads
        </Badge>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
        {documents.map((document) => (
          <div key={document.id} className="surface-card p-5 space-y-4">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="font-bold text-[var(--color-text-primary)]">{document.file_name}</p>
                <p className="text-[12px] text-[var(--color-text-secondary)]">
                  {document.doc_category || "Uncategorised"} / {document.workflow_state || document.status || "Unknown state"}
                </p>
              </div>
              <Badge className="bg-[var(--color-surface-2)] border border-[var(--color-border)] text-[var(--color-text-secondary)]">
                {document.intelligence?.evidence_type || "UNCLASSIFIED"}
              </Badge>
            </div>

            <div className="space-y-2 text-[12px]">
              <p className="text-[var(--color-text-secondary)]">
                {document.intelligence?.summary || document.notes || "No intelligence summary available yet."}
              </p>
              {typeof document.intelligence?.relevance_score === "number" ? (
                <p className="text-[var(--color-text-secondary)]">
                  Relevance score: <span className="font-bold text-[var(--color-text-primary)]">{document.intelligence.relevance_score}</span>
                </p>
              ) : null}
              {document.intelligence?.risks?.length ? (
                <div className="bg-[var(--color-surface-2)] rounded-lg border border-[var(--color-border)] p-3">
                  <p className="font-bold text-[var(--color-text-primary)] mb-1">Risks</p>
                  <ul className="space-y-1 text-[var(--color-text-secondary)]">
                    {document.intelligence.risks.map((risk, index) => (
                      <li key={index}>- {risk}</li>
                    ))}
                  </ul>
                </div>
              ) : null}
              {document.intelligence?.next_steps?.length ? (
                <div className="bg-[var(--color-surface-2)] rounded-lg border border-[var(--color-border)] p-3">
                  <p className="font-bold text-[var(--color-text-primary)] mb-1">Next steps</p>
                  <ul className="space-y-1 text-[var(--color-text-secondary)]">
                    {document.intelligence.next_steps.map((step, index) => (
                      <li key={index}>- {step}</li>
                    ))}
                  </ul>
                </div>
              ) : null}
            </div>
          </div>
        ))}
        {documents.length === 0 ? (
          <div className="surface-card p-8 text-center text-[var(--color-text-secondary)]">
            No project documents found yet.
          </div>
        ) : null}
      </div>
    </div>
  );
}

function ClarificationsPage({ workspace }: { workspace: ProjectWorkspace }) {
  const clarificationItems = workspace.documents.filter((document) => {
    const state = String(document.workflow_state || document.status || "").toUpperCase();
    return state.includes("CLARIFICATION") || (document.intelligence?.risks?.length ?? 0) > 0;
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between border-b border-[var(--color-border)] pb-4">
        <div>
          <h2 className="text-[16px] font-bold text-[var(--color-text-primary)]">Clarification Queue</h2>
          <p className="text-[13px] text-[var(--color-text-secondary)]">
            Documents needing follow-up, clarification, or risk resolution.
          </p>
        </div>
        <Badge className="bg-[var(--color-surface-2)] border border-[var(--color-border)] text-[var(--color-text-secondary)]">
          {clarificationItems.length} Open
        </Badge>
      </div>

      <div className="space-y-4">
        {clarificationItems.map((document) => (
          <div key={document.id} className="surface-card p-5 space-y-3">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="font-bold text-[var(--color-text-primary)]">{document.file_name}</p>
                <p className="text-[12px] text-[var(--color-text-secondary)]">
                  {document.doc_category || "Uncategorised"} / {document.workflow_state || document.status || "Unknown state"}
                </p>
              </div>
              <Badge className="state-pending">FOLLOW-UP</Badge>
            </div>
            <p className="text-[12px] text-[var(--color-text-secondary)]">
              {document.intelligence?.summary || document.notes || "Clarification required but no summary is available yet."}
            </p>
            {document.intelligence?.risks?.length ? (
              <div className="text-[12px] text-[var(--color-red)] space-y-1">
                {document.intelligence.risks.map((risk, index) => (
                  <p key={index}>{risk}</p>
                ))}
              </div>
            ) : null}
          </div>
        ))}
        {clarificationItems.length === 0 ? (
          <div className="surface-card p-8 text-center text-[var(--color-text-secondary)]">
            No clarification items are open right now.
          </div>
        ) : null}
      </div>
    </div>
  );
}

function TeamPage({ workspace }: { workspace: ProjectWorkspace }) {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between border-b border-[var(--color-border)] pb-4">
        <div>
          <h2 className="text-[16px] font-bold text-[var(--color-text-primary)]">Project Team</h2>
          <p className="text-[13px] text-[var(--color-text-secondary)]">
            Live member list from the current workspace.
          </p>
        </div>
        <Badge className="bg-[var(--color-surface-2)] border border-[var(--color-border)] text-[var(--color-text-secondary)]">
          {workspace.members.length} Members
        </Badge>
      </div>

      <div className="surface-card rounded-md overflow-hidden border border-[var(--color-border)]">
        <table className="w-full text-left border-collapse text-[12px]">
          <thead>
            <tr className="bg-[var(--color-surface-2)] border-b border-[var(--color-border)]">
              <th className="px-4 py-3 font-semibold text-[var(--color-text-secondary)]">Name</th>
              <th className="px-4 py-3 font-semibold text-[var(--color-text-secondary)]">Email</th>
              <th className="px-4 py-3 font-semibold text-[var(--color-text-secondary)]">Role</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[var(--color-border)]">
            {workspace.members.map((member) => (
              <tr key={member.user_id}>
                <td className="px-4 py-3 text-[var(--color-text-primary)]">{member.full_name}</td>
                <td className="px-4 py-3 text-[var(--color-text-secondary)]">{member.email || "-"}</td>
                <td className="px-4 py-3 text-[var(--color-text-primary)] uppercase">{member.role}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function SettingsPage({ workspace }: { workspace: ProjectWorkspace }) {
  const activeAssignments = workspace.assignments.length;
  const docsInReview = workspace.documents.filter((document) =>
    String(document.workflow_state || document.status || "").toUpperCase().includes("REVIEW"),
  ).length;

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      <div className="surface-card p-5 space-y-2">
        <h3 className="font-bold text-[var(--color-text-primary)]">Workspace Profile</h3>
        <p className="text-[12px] text-[var(--color-text-secondary)]">Client: {workspace.project.client || "Unknown"}</p>
        <p className="text-[12px] text-[var(--color-text-secondary)]">Location: {workspace.project.location || "Unknown"}</p>
        <p className="text-[12px] text-[var(--color-text-secondary)]">Status: {workspace.project.status || "Unknown"}</p>
      </div>
      <div className="surface-card p-5 space-y-2">
        <h3 className="font-bold text-[var(--color-text-primary)]">Operational Snapshot</h3>
        <p className="text-[12px] text-[var(--color-text-secondary)]">Active assignments: {activeAssignments}</p>
        <p className="text-[12px] text-[var(--color-text-secondary)]">Documents in review: {docsInReview}</p>
        <p className="text-[12px] text-[var(--color-text-secondary)]">Notifications: {workspace.notifications.length}</p>
      </div>
    </div>
  );
}

function DashboardPage({ workspace }: { workspace: ProjectWorkspace }) {
  const isProjectAdmin = isProjectAdminRole(workspace.userRole);
  const creditStats = useMemo(() => {
    const total = workspace.credits.length;
    const approved = workspace.credits.filter((credit) => getCreditStatus(credit) === "approved").length;
    const blocked = workspace.credits.filter((credit) => getCreditStatus(credit) === "blocked").length;
    const pending = total - approved - blocked;
    const totalPoints = workspace.credits.reduce((sum, credit) => sum + getCreditPoints(credit), 0);

    return { total, approved, blocked, pending, totalPoints };
  }, [workspace.credits]);

  const topBlockers = useMemo(
    () =>
      workspace.credits
        .filter((credit) => getCreditStatus(credit) !== "approved")
        .sort((a, b) => getCreditPoints(b) - getCreditPoints(a))
        .slice(0, 5),
    [workspace.credits],
  );

  const recentDocuments = useMemo(() => workspace.documents.slice(0, 5), [workspace.documents]);
  const opsSummaryQuery = useQuery({
    queryKey: ["workspace-ops-summary", workspace.project.id],
    queryFn: () => fetchWorkspaceOpsSummary(workspace.project.id),
    enabled: isProjectAdmin,
    staleTime: 10_000,
    refetchInterval: 15_000,
  });
  const adminReviewQueueQuery = useQuery({
    queryKey: ["review-queue", workspace.project.id, "dashboard"],
    queryFn: () => fetchReviewQueue(workspace.project.id),
    enabled: isProjectAdmin,
    staleTime: 10_000,
    refetchInterval: 15_000,
  });

  if (isProjectAdmin) {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
          <div className="surface-card p-5 space-y-1">
            <p className="text-[11px] uppercase tracking-[0.18em] text-[var(--color-text-tertiary)]">Stage Readiness</p>
            <p className="text-2xl font-bold text-[var(--color-text-primary)]">{opsSummaryQuery.data?.readinessPercent ?? 0}%</p>
            <p className="text-[12px] text-[var(--color-text-secondary)]">Evidence approved against current project flow</p>
          </div>
          <div className="surface-card p-5 space-y-1">
            <p className="text-[11px] uppercase tracking-[0.18em] text-[var(--color-text-tertiary)]">Pending Reviews</p>
            <p className="text-2xl font-bold text-[var(--color-text-primary)]">{opsSummaryQuery.data?.pendingReviewCount ?? 0}</p>
            <p className="text-[12px] text-[var(--color-text-secondary)]">Submittals still waiting on review action</p>
          </div>
          <div className="surface-card p-5 space-y-1">
            <p className="text-[11px] uppercase tracking-[0.18em] text-[var(--color-text-tertiary)]">Clarification Loops</p>
            <p className="text-2xl font-bold text-[var(--color-text-primary)]">{opsSummaryQuery.data?.clarificationCount ?? 0}</p>
            <p className="text-[12px] text-[var(--color-text-secondary)]">Evidence currently sent back for correction</p>
          </div>
          <div className="surface-card p-5 space-y-1">
            <p className="text-[11px] uppercase tracking-[0.18em] text-[var(--color-text-tertiary)]">Mandatory Credits</p>
            <p className="text-2xl font-bold text-[var(--color-text-primary)]">{opsSummaryQuery.data?.mandatoryCreditsCount ?? 0}</p>
            <p className="text-[12px] text-[var(--color-text-secondary)]">Governed credits visible in this workspace</p>
          </div>
        </div>

        <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
            <QueueSection
            title="Validation Queues"
            description="Current reviewer-facing evidence queues requiring workflow movement."
            items={(adminReviewQueueQuery.data ?? [])
              .slice(0, 6)
              .map((item) => ({
                id: `validation-${item.id}`,
                title: item.fileName,
                description: `${item.docCategory || "Document"} is waiting in ${item.workflowLabel}.`,
                tone: "warning" as const,
                href: `/projects/${workspace.project.id}/reviews`,
              }))}
            emptyLabel="No validation queue items are active."
          />
          <QueueSection
            title="Workflow Actions"
            description="Operational surfaces available to the Project Admin role."
            items={[
              {
                id: "workflow-reviews",
                title: "Open Reviews Workspace",
                description: "Move through governed review actions using backend-provided allowed actions.",
                tone: "neutral",
                href: `/projects/${workspace.project.id}/reviews`,
              },
              {
                id: "workflow-approvals",
                title: "Open Approvals Surface",
                description: "Review items currently carrying approval authority.",
                tone: "success",
                href: `/projects/${workspace.project.id}/approvals`,
              },
              {
                id: "workflow-clarifications",
                title: "Inspect Clarification Queue",
                description: "Follow evidence items that are blocked on contributor correction.",
                tone: "warning",
                href: `/projects/${workspace.project.id}/clarifications`,
              },
              {
                id: "workflow-assignments",
                title: "Manage Assignment Matrix",
                description: "Reassign governed contributor ownership where required.",
                tone: "neutral",
                href: `/projects/${workspace.project.id}/assignments`,
              },
            ]}
            emptyLabel="No workflow surfaces are configured."
          />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
        <div className="surface-card p-5 space-y-1">
          <p className="text-[11px] uppercase tracking-[0.18em] text-[var(--color-text-tertiary)]">Credits</p>
          <p className="text-2xl font-bold text-[var(--color-text-primary)]">{creditStats.total}</p>
          <p className="text-[12px] text-[var(--color-text-secondary)]">{creditStats.approved} approved</p>
        </div>
        <div className="surface-card p-5 space-y-1">
          <p className="text-[11px] uppercase tracking-[0.18em] text-[var(--color-text-tertiary)]">Points</p>
          <p className="text-2xl font-bold text-[var(--color-text-primary)]">{creditStats.totalPoints.toFixed(1)}</p>
          <p className="text-[12px] text-[var(--color-text-secondary)]">Live max-point visibility</p>
        </div>
        <div className="surface-card p-5 space-y-1">
          <p className="text-[11px] uppercase tracking-[0.18em] text-[var(--color-text-tertiary)]">Open Risks</p>
          <p className="text-2xl font-bold text-[var(--color-text-primary)]">{creditStats.blocked}</p>
          <p className="text-[12px] text-[var(--color-text-secondary)]">Blocked or critical credits</p>
        </div>
        <div className="surface-card p-5 space-y-1">
          <p className="text-[11px] uppercase tracking-[0.18em] text-[var(--color-text-tertiary)]">Uploads</p>
          <p className="text-2xl font-bold text-[var(--color-text-primary)]">{workspace.documents.length}</p>
          <p className="text-[12px] text-[var(--color-text-secondary)]">{workspace.notifications.length} live notifications</p>
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-[1.35fr_0.95fr] gap-4">
        <div className="surface-card p-5 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-[16px] font-bold text-[var(--color-text-primary)]">Priority Credits</h2>
              <p className="text-[13px] text-[var(--color-text-secondary)]">
                Highest-value active credits that still need evidence or progress.
              </p>
            </div>
            <Badge className="bg-[var(--color-surface-2)] border border-[var(--color-border)] text-[var(--color-text-secondary)]">
              {creditStats.pending} active
            </Badge>
          </div>

          <div className="space-y-3">
            {topBlockers.map((credit) => (
              <div key={credit.id} className="rounded-xl border border-[var(--color-border)] bg-[var(--color-surface-2)] px-4 py-3">
                <div className="flex items-start justify-between gap-3">
                  <div className="space-y-1">
                    <p className="font-mono text-[11px] font-black text-[var(--color-green)]">
                      {mandatoryCode(credit.credit_code, Boolean(credit.is_mandatory))}
                    </p>
                    <p className="font-semibold text-[var(--color-text-primary)]">{credit.credit_name}</p>
                    <p className="text-[12px] text-[var(--color-text-secondary)]">
                      {credit.responsible_role ? String(credit.responsible_role).replace(/_/g, " ") : "Unassigned"}
                    </p>
                  </div>
                  <Badge className={statusClass(getCreditStatus(credit))}>{getCreditStatus(credit).toUpperCase()}</Badge>
                </div>
              </div>
            ))}
            {topBlockers.length === 0 ? (
              <div className="text-[13px] text-[var(--color-text-secondary)]">No active blockers found.</div>
            ) : null}
          </div>
        </div>

        <div className="surface-card p-5 space-y-4">
          <div>
            <h2 className="text-[16px] font-bold text-[var(--color-text-primary)]">Recent Evidence Flow</h2>
            <p className="text-[13px] text-[var(--color-text-secondary)]">
              Latest uploads reaching this workspace.
            </p>
          </div>

          <div className="space-y-3">
            {recentDocuments.map((document) => (
              <div key={document.id} className="rounded-xl border border-[var(--color-border)] bg-[var(--color-surface-2)] px-4 py-3">
                <p className="font-semibold text-[var(--color-text-primary)]">{document.file_name}</p>
                <p className="text-[12px] text-[var(--color-text-secondary)]">
                  {document.doc_category || "Uncategorised"} / {document.workflow_state || document.status || "Unknown state"}
                </p>
              </div>
            ))}
            {recentDocuments.length === 0 ? (
              <div className="text-[13px] text-[var(--color-text-secondary)]">No project uploads found yet.</div>
            ) : null}
          </div>
        </div>
      </div>
    </div>
  );
}

function QueueSection({
  title,
  description,
  items,
  emptyLabel,
}: {
  title: string;
  description: string;
  items: QueueBoardItem[];
  emptyLabel: string;
}) {
  return (
    <div className="surface-card p-5 space-y-4">
      <div>
        <h2 className="text-[16px] font-bold text-[var(--color-text-primary)]">{title}</h2>
        <p className="text-[13px] text-[var(--color-text-secondary)]">{description}</p>
      </div>
      <div className="space-y-3">
        {items.map((item) => (
          <Link
            key={item.id}
            to={item.href || "#"}
            className={`block rounded-xl border px-4 py-3 transition-colors hover:border-[var(--color-border-strong)] ${queueToneClass(item.tone)}`}
          >
            <p className="font-semibold text-[var(--color-text-primary)]">{item.title}</p>
            <p className="mt-1 text-[12px] text-[var(--color-text-secondary)]">{item.description}</p>
          </Link>
        ))}
        {items.length === 0 ? (
          <div className="rounded-xl border border-dashed border-[var(--color-border)] px-4 py-6 text-[13px] text-[var(--color-text-secondary)]">
            {emptyLabel}
          </div>
        ) : null}
      </div>
    </div>
  );
}

function MyQueuePage({ workspace }: { workspace: ProjectWorkspace }) {
  const reviewQuery = useQuery({
    queryKey: ["review-queue", workspace.project.id],
    queryFn: () => fetchReviewQueue(workspace.project.id),
    enabled: isReviewerRole(workspace.userRole),
    staleTime: 10_000,
    refetchInterval: 15_000,
  });

  const queueBoard = useMemo(
    () => buildQueueBoard(workspace, reviewQuery.data ?? []),
    [reviewQuery.data, workspace],
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between border-b border-[var(--color-border)] pb-4">
        <div>
          <h2 className="text-[16px] font-bold text-[var(--color-text-primary)]">My Queue</h2>
          <p className="text-[13px] text-[var(--color-text-secondary)]">
            Queue-first operational view of the current project. Priorities, blockers, reviews, clarifications, and Harita guidance stay in one surface.
          </p>
        </div>
        <Badge className="bg-[var(--color-surface-2)] border border-[var(--color-border)] text-[var(--color-text-secondary)]">
          {queueBoard.myPriorityTasks.length} Priority Items
        </Badge>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
        <QueueSection
          title="My Priority Tasks"
          description="What needs movement first in this workspace."
          items={queueBoard.myPriorityTasks}
          emptyLabel="No priority tasks are active right now."
        />
        <QueueSection
          title="Mandatory Blockers"
          description="Mandatory credits and high-risk blockers requiring resolution."
          items={queueBoard.mandatoryBlockers}
          emptyLabel="No mandatory blockers are open."
        />
        <QueueSection
          title="Pending Reviews"
          description="Current review queue items waiting on owner or admin action."
          items={(queueBoard.pendingReviews ?? []).map((item) => ({
            id: item.id,
            title: `${item.creditCode} · ${item.fileName}`,
            description: `${item.workflowLabel} for ${item.uploadedByName}.`,
            tone: item.isMandatory ? "danger" : "warning",
            href: `/projects/${workspace.project.id}/reviews`,
          }))}
          emptyLabel="No review items are waiting right now."
        />
        <QueueSection
          title="Clarifications"
          description="Evidence items sent back with follow-up or clarification requirements."
          items={queueBoard.clarificationItems}
          emptyLabel="No clarification loops are active."
        />
      </div>

      <QueueSection
        title="AI Guidance"
        description="Latest guidance extracted from evidence intelligence and current project context."
        items={queueBoard.aiGuidance}
        emptyLabel="Harita has not generated additional guidance for this workspace yet."
      />
    </div>
  );
}

function CreditsLedgerPage({ workspace }: { workspace: ProjectWorkspace }) {
  const ledgerCredits = useMemo(
    () =>
      [...workspace.credits].sort((a, b) => {
        if (a.category !== b.category) {
          return String(a.category || "").localeCompare(String(b.category || ""));
        }
        return String(a.credit_code || "").localeCompare(String(b.credit_code || ""));
      }),
    [workspace.credits],
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between border-b border-[var(--color-border)] pb-4">
        <div>
          <h2 className="text-[16px] font-bold text-[var(--color-text-primary)]">Credits Ledger</h2>
          <p className="text-[13px] text-[var(--color-text-secondary)]">
            Structured ledger of all project credits, responsibilities, points, and current status.
          </p>
        </div>
        <Badge className="bg-[var(--color-surface-2)] border border-[var(--color-border)] text-[var(--color-text-secondary)]">
          {ledgerCredits.length} Credits
        </Badge>
      </div>

      <div className="surface-card rounded-md overflow-hidden border border-[var(--color-border)]">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-[12px]">
            <thead>
              <tr className="bg-[var(--color-surface-2)] border-b border-[var(--color-border)]">
                <th className="px-4 py-3 font-semibold text-[var(--color-text-secondary)]">Credit</th>
                <th className="px-4 py-3 font-semibold text-[var(--color-text-secondary)]">Category</th>
                <th className="px-4 py-3 font-semibold text-[var(--color-text-secondary)]">Points</th>
                <th className="px-4 py-3 font-semibold text-[var(--color-text-secondary)]">Responsibility</th>
                <th className="px-4 py-3 font-semibold text-[var(--color-text-secondary)]">Required Docs</th>
                <th className="px-4 py-3 font-semibold text-[var(--color-text-secondary)]">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--color-border)]">
              {ledgerCredits.map((credit) => {
                const requiredDocs = (credit.documents_required ?? []).filter((entry: any) => entry.required);
                return (
                  <tr key={credit.id} className="hover:bg-[var(--color-surface-2)]/40">
                    <td className="px-4 py-3 align-top">
                      <div>
                        <p className="font-bold text-[var(--color-text-primary)]">{mandatoryCode(credit.credit_code, Boolean(credit.is_mandatory))}</p>
                        <p className="text-[11px] text-[var(--color-text-secondary)] mt-0.5">{credit.credit_name}</p>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-[var(--color-text-secondary)]">{credit.category || credit.category_name || "OTHER"}</td>
                    <td className="px-4 py-3 text-[var(--color-text-primary)] font-semibold">{getCreditPoints(credit).toFixed(1)}</td>
                    <td className="px-4 py-3 text-[var(--color-text-secondary)] uppercase">{String(credit.responsible_role || "unassigned").replace(/_/g, " ")}</td>
                    <td className="px-4 py-3 text-[var(--color-text-secondary)]">{requiredDocs.length ? requiredDocs.map((entry: any) => entry.label || entry.type).filter(Boolean).join(", ") : "None"}</td>
                    <td className="px-4 py-3"><Badge className={statusClass(getCreditStatus(credit))}>{getCreditStatus(credit).toUpperCase()}</Badge></td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

function UploadsPage({ workspace }: { workspace: ProjectWorkspace }) {
  const documents = workspace.documents;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between border-b border-[var(--color-border)] pb-4">
        <div>
          <h2 className="text-[16px] font-bold text-[var(--color-text-primary)]">Uploads</h2>
          <p className="text-[13px] text-[var(--color-text-secondary)]">
            Latest evidence uploads entering this project workspace, with state and intelligence summaries.
          </p>
        </div>
        <Badge className="bg-[var(--color-surface-2)] border border-[var(--color-border)] text-[var(--color-text-secondary)]">
          {documents.length} Files
        </Badge>
      </div>

      <div className="space-y-3">
        {documents.map((document) => (
          <div key={document.id} className="surface-card px-4 py-4 flex flex-col gap-2 lg:flex-row lg:items-start lg:justify-between">
            <div className="space-y-1">
              <p className="font-semibold text-[var(--color-text-primary)]">{document.file_name}</p>
              <p className="text-[12px] text-[var(--color-text-secondary)]">
                {document.doc_category || "Uncategorised"} · {document.workflow_state || document.status || "Unknown state"}
              </p>
              <p className="text-[12px] text-[var(--color-text-secondary)]">
                {document.intelligence?.summary || document.notes || "No document note is available yet."}
              </p>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <Badge className="bg-[var(--color-surface-2)] border border-[var(--color-border)] text-[var(--color-text-secondary)]">
                {document.intelligence?.evidence_type || "UNCLASSIFIED"}
              </Badge>
              <Badge className={statusClass(normalizeStatus(document.workflow_state || document.status))}>
                {String(document.workflow_state || document.status || "pending").toUpperCase()}
              </Badge>
            </div>
          </div>
        ))}
        {documents.length === 0 ? (
          <div className="surface-card p-8 text-center text-[var(--color-text-secondary)]">No uploads are available in this workspace.</div>
        ) : null}
      </div>
    </div>
  );
}

function TablesPage({ workspace }: { workspace: ProjectWorkspace }) {
  const categorySummary = useMemo(() => {
    const grouped = new Map<string, { count: number; points: number; approved: number; blocked: number }>();
    for (const credit of workspace.credits) {
      const key = credit.category || credit.category_name || "OTHER";
      const current = grouped.get(key) ?? { count: 0, points: 0, approved: 0, blocked: 0 };
      current.count += 1;
      current.points += getCreditPoints(credit);
      const status = getCreditStatus(credit);
      if (status === "approved") current.approved += 1;
      if (status === "blocked") current.blocked += 1;
      grouped.set(key, current);
    }
    return Array.from(grouped.entries()).map(([category, data]) => ({ category, ...data }));
  }, [workspace.credits]);

  const evidenceTypeSummary = useMemo(() => {
    const grouped = new Map<string, number>();
    for (const document of workspace.documents) {
      const key = document.intelligence?.evidence_type || document.doc_category || "UNCLASSIFIED";
      grouped.set(key, (grouped.get(key) || 0) + 1);
    }
    return Array.from(grouped.entries()).map(([type, count]) => ({ type, count }));
  }, [workspace.documents]);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between border-b border-[var(--color-border)] pb-4">
        <div>
          <h2 className="text-[16px] font-bold text-[var(--color-text-primary)]">Tables</h2>
          <p className="text-[13px] text-[var(--color-text-secondary)]">
            Aggregated project tables for category performance and evidence distribution.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
        <div className="surface-card rounded-md overflow-hidden border border-[var(--color-border)]">
          <div className="px-4 py-3 border-b border-[var(--color-border)]">
            <h3 className="font-bold text-[var(--color-text-primary)]">Category Performance</h3>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-[12px]">
              <thead>
                <tr className="bg-[var(--color-surface-2)] border-b border-[var(--color-border)]">
                  <th className="px-4 py-3 font-semibold text-[var(--color-text-secondary)]">Category</th>
                  <th className="px-4 py-3 font-semibold text-[var(--color-text-secondary)]">Credits</th>
                  <th className="px-4 py-3 font-semibold text-[var(--color-text-secondary)]">Points</th>
                  <th className="px-4 py-3 font-semibold text-[var(--color-text-secondary)]">Approved</th>
                  <th className="px-4 py-3 font-semibold text-[var(--color-text-secondary)]">Blocked</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--color-border)]">
                {categorySummary.map((row) => (
                  <tr key={row.category}>
                    <td className="px-4 py-3 text-[var(--color-text-primary)] font-semibold">{row.category}</td>
                    <td className="px-4 py-3 text-[var(--color-text-secondary)]">{row.count}</td>
                    <td className="px-4 py-3 text-[var(--color-text-secondary)]">{row.points.toFixed(1)}</td>
                    <td className="px-4 py-3 text-[var(--color-text-secondary)]">{row.approved}</td>
                    <td className="px-4 py-3 text-[var(--color-text-secondary)]">{row.blocked}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <div className="surface-card rounded-md overflow-hidden border border-[var(--color-border)]">
          <div className="px-4 py-3 border-b border-[var(--color-border)]">
            <h3 className="font-bold text-[var(--color-text-primary)]">Evidence Type Distribution</h3>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-[12px]">
              <thead>
                <tr className="bg-[var(--color-surface-2)] border-b border-[var(--color-border)]">
                  <th className="px-4 py-3 font-semibold text-[var(--color-text-secondary)]">Evidence Type</th>
                  <th className="px-4 py-3 font-semibold text-[var(--color-text-secondary)]">Documents</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--color-border)]">
                {evidenceTypeSummary.map((row) => (
                  <tr key={row.type}>
                    <td className="px-4 py-3 text-[var(--color-text-primary)] font-semibold">{row.type}</td>
                    <td className="px-4 py-3 text-[var(--color-text-secondary)]">{row.count}</td>
                  </tr>
                ))}
                {evidenceTypeSummary.length === 0 ? (
                  <tr>
                    <td colSpan={2} className="px-4 py-8 text-center text-[var(--color-text-secondary)]">No document intelligence rows found.</td>
                  </tr>
                ) : null}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}

function ExportsPage({ workspace }: { workspace: ProjectWorkspace }) {
  const exportRows = useMemo(
    () =>
      workspace.credits.map((credit) => ({
        id: credit.id,
        code: mandatoryCode(credit.credit_code, Boolean(credit.is_mandatory)),
        name: credit.credit_name,
        status: getCreditStatus(credit),
        points: getCreditPoints(credit).toFixed(1),
        docs: credit.documents?.length ?? 0,
        exportedState:
          (credit.documents?.length ?? 0) > 0
            ? getCreditStatus(credit) === "approved"
              ? "Ready for export"
              : "Needs review"
            : "Missing evidence",
      })),
    [workspace.credits],
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between border-b border-[var(--color-border)] pb-4">
        <div>
          <h2 className="text-[16px] font-bold text-[var(--color-text-primary)]">Exports</h2>
          <p className="text-[13px] text-[var(--color-text-secondary)]">
            Export-readiness view for credits, evidence presence, and current approval state.
          </p>
        </div>
        <Badge className="bg-[var(--color-surface-2)] border border-[var(--color-border)] text-[var(--color-text-secondary)]">
          {exportRows.length} Credit Rows
        </Badge>
      </div>

      <div className="surface-card rounded-md overflow-hidden border border-[var(--color-border)]">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-[12px]">
            <thead>
              <tr className="bg-[var(--color-surface-2)] border-b border-[var(--color-border)]">
                <th className="px-4 py-3 font-semibold text-[var(--color-text-secondary)]">Credit</th>
                <th className="px-4 py-3 font-semibold text-[var(--color-text-secondary)]">Points</th>
                <th className="px-4 py-3 font-semibold text-[var(--color-text-secondary)]">Documents</th>
                <th className="px-4 py-3 font-semibold text-[var(--color-text-secondary)]">Status</th>
                <th className="px-4 py-3 font-semibold text-[var(--color-text-secondary)]">Export Readiness</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--color-border)]">
              {exportRows.map((row) => (
                <tr key={row.id}>
                  <td className="px-4 py-3">
                    <div>
                      <p className="font-bold text-[var(--color-text-primary)]">{row.code}</p>
                      <p className="text-[11px] text-[var(--color-text-secondary)] mt-0.5">{row.name}</p>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-[var(--color-text-secondary)]">{row.points}</td>
                  <td className="px-4 py-3 text-[var(--color-text-secondary)]">{row.docs}</td>
                  <td className="px-4 py-3"><Badge className={statusClass(row.status)}>{row.status.toUpperCase()}</Badge></td>
                  <td className="px-4 py-3 text-[var(--color-text-secondary)]">{row.exportedState}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

function ReviewsPage({ workspace, approvalsOnly = false }: { workspace: ProjectWorkspace; approvalsOnly?: boolean }) {
  const canUseReviewSurface = canReview(workspace.userRole);
  if (!canUseReviewSurface) {
    return <Navigate to={`/projects/${workspace.project.id}/my-queue`} replace />;
  }

  const queueQuery = useQuery({
    queryKey: ["review-queue", workspace.project.id],
    queryFn: () => fetchReviewQueue(workspace.project.id),
    staleTime: 10_000,
    refetchInterval: 15_000,
  });
  const queryClient = useQueryClient();
  const [selectedGroupId, setSelectedGroupId] = useState<string | null>(null);
  const [selectedDocumentId, setSelectedDocumentId] = useState<string | null>(null);
  const [remarks, setRemarks] = useState("");
  const [actionError, setActionError] = useState<string | null>(null);
  const [actionConflict, setActionConflict] = useState<{ message: string; workflowState?: string; allowedActions?: string[] } | null>(null);
  const [isActioning, setIsActioning] = useState(false);

  const reviewItems = approvalsOnly
    ? (queueQuery.data ?? []).filter((item) => item.allowedActions.includes("approve"))
    : (queueQuery.data ?? []);

  const groupedItems = useMemo(() => {
    const groups = new Map<string, { id: string; label: string; items: ReviewQueueItem[]; isMandatory: boolean }>();
    for (const item of reviewItems) {
      const key = item.submittalId || item.projectCreditId || item.id;
      const existing = groups.get(key) ?? {
        id: key,
        label: item.submittalId ? `Submittal ${item.submittalId.slice(0, 8)}` : `${item.creditCode} · ${item.creditName}`,
        items: [],
        isMandatory: false,
      };
      existing.items.push(item);
      existing.isMandatory = existing.isMandatory || item.isMandatory;
      groups.set(key, existing);
    }
    return Array.from(groups.values()).sort((a, b) => Number(b.isMandatory) - Number(a.isMandatory));
  }, [reviewItems]);

  useEffect(() => {
    const nextGroup = groupedItems.find((group) => group.id === selectedGroupId) ?? groupedItems[0] ?? null;
    setSelectedGroupId(nextGroup?.id ?? null);
    const nextDocument = nextGroup?.items.find((item) => item.id === selectedDocumentId) ?? nextGroup?.items[0] ?? null;
    setSelectedDocumentId(nextDocument?.id ?? null);
  }, [groupedItems, selectedDocumentId, selectedGroupId]);

  const activeGroup = groupedItems.find((group) => group.id === selectedGroupId) ?? null;
  const activeItem = activeGroup?.items.find((item) => item.id === selectedDocumentId) ?? activeGroup?.items[0] ?? null;

  if (queueQuery.isLoading) {
    return <WorkspaceSkeleton />;
  }

  if (queueQuery.error) {
    return <div className="p-8 text-red-500">{queueQuery.error instanceof Error ? queueQuery.error.message : "Failed to load review queue."}</div>;
  }

  const executeAction = async (action: string) => {
    if (!activeItem) return;

    setIsActioning(true);
    setActionError(null);
    setActionConflict(null);
    try {
      await transitionReviewQueueItem(workspace.project.id, activeItem.id, action, remarks.trim() || null);
      setRemarks("");
      await Promise.all([
        queueQuery.refetch(),
        queryClient.invalidateQueries({ queryKey: ["workspace", workspace.project.id] }),
        queryClient.invalidateQueries({ queryKey: ["workspace-ops-summary", workspace.project.id] }),
      ]);
    } catch (error) {
      if (error && typeof error === "object" && "code" in error && (error as any).code === "workflow_conflict") {
        setActionConflict({
          message: error instanceof Error ? error.message : "Workflow state changed.",
          workflowState: (error as any).workflowState,
          allowedActions: Array.isArray((error as any).allowedActions) ? (error as any).allowedActions : [],
        });
      } else {
        setActionError(error instanceof Error ? error.message : "Review action failed.");
      }
    } finally {
      setIsActioning(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between border-b border-[var(--color-border)] pb-4">
        <div>
          <h2 className="text-[16px] font-bold text-[var(--color-text-primary)]">{approvalsOnly ? "Approvals" : "Reviews"}</h2>
          <p className="text-[13px] text-[var(--color-text-secondary)]">
            Submittal-first reviewer workspace with backend-provided allowed actions, lock states, and live queue refresh.
          </p>
        </div>
        <Badge className="bg-[var(--color-surface-2)] border border-[var(--color-border)] text-[var(--color-text-secondary)]">
          {reviewItems.length} Active Items
        </Badge>
      </div>

      {actionError ? (
        <div className="flex items-center gap-2 rounded-xl border border-[var(--color-red)]/40 bg-[var(--color-red-soft)] px-4 py-3 text-[13px] text-[var(--color-red)]">
          <AlertTriangle className="h-4 w-4 shrink-0" />
          <span>{actionError}</span>
        </div>
      ) : null}
      {actionConflict ? (
        <div className="flex items-start gap-2 rounded-xl border border-amber-400/40 bg-amber-400/10 px-4 py-3 text-[13px] text-amber-200">
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
          <div className="space-y-1">
            <p>{actionConflict.message}</p>
            {actionConflict.workflowState ? (
              <p className="text-[12px] text-amber-100/80">Current state: {actionConflict.workflowState}</p>
            ) : null}
            {actionConflict.allowedActions?.length ? (
              <p className="text-[12px] text-amber-100/80">
                Available actions now: {actionConflict.allowedActions.map(humanizeAction).join(", ")}
              </p>
            ) : null}
          </div>
        </div>
      ) : null}

      <div className="grid grid-cols-1 xl:grid-cols-[0.9fr_1.25fr_0.85fr] gap-4">
        <div className="surface-card p-4 space-y-3">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-[11px] uppercase tracking-[0.18em] text-[var(--color-text-tertiary)]">Queue</p>
              <h3 className="font-bold text-[var(--color-text-primary)]">Submittals</h3>
            </div>
            <button
              onClick={() => void queueQuery.refetch()}
              className="inline-flex items-center gap-1 rounded-lg border border-[var(--color-border)] px-2 py-1 text-[11px] text-[var(--color-text-secondary)]"
            >
              <RefreshCcw className="h-3.5 w-3.5" />
              Refresh
            </button>
          </div>
          <div className="space-y-2">
            {groupedItems.map((group) => (
              <button
                key={group.id}
                onClick={() => setSelectedGroupId(group.id)}
                className={`w-full rounded-xl border px-3 py-3 text-left transition-colors ${
                  selectedGroupId === group.id
                    ? "border-[var(--color-green)] bg-[var(--color-green-soft)]/30"
                    : "border-[var(--color-border)] bg-[var(--color-surface-2)]"
                }`}
              >
                <div className="flex items-center justify-between gap-2">
                  <p className="font-semibold text-[var(--color-text-primary)]">{group.label}</p>
                  {group.isMandatory ? <Badge className="state-critical">MANDATORY</Badge> : null}
                </div>
                <p className="mt-1 text-[12px] text-[var(--color-text-secondary)]">{group.items.length} evidence item(s)</p>
              </button>
            ))}
            {groupedItems.length === 0 ? (
              <div className="rounded-xl border border-dashed border-[var(--color-border)] px-4 py-6 text-[13px] text-[var(--color-text-secondary)]">
                No review items are active for this project.
              </div>
            ) : null}
          </div>
        </div>

        <div className="surface-card p-5 space-y-4">
          {activeItem ? (
            <>
              <div className="flex items-start justify-between gap-3 border-b border-[var(--color-border)] pb-4">
                <div className="space-y-1">
                  <p className="text-[11px] uppercase tracking-[0.18em] text-[var(--color-text-tertiary)]">Current evidence</p>
                  <h3 className="font-bold text-[var(--color-text-primary)]">{activeItem.fileName}</h3>
                  <p className="text-[13px] text-[var(--color-text-secondary)]">
                    {activeItem.creditCode} · {activeItem.creditName}
                  </p>
                </div>
                <Badge className={activeItem.isMandatory ? "state-critical" : "state-pending"}>
                  {activeItem.workflowLabel.toUpperCase()}
                </Badge>
              </div>

              <div className="space-y-3 text-[13px]">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-surface-2)] px-4 py-3">
                    <p className="text-[11px] uppercase tracking-[0.18em] text-[var(--color-text-tertiary)]">Contributor</p>
                    <p className="mt-1 font-medium text-[var(--color-text-primary)]">{activeItem.uploadedByName}</p>
                  </div>
                  <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-surface-2)] px-4 py-3">
                    <p className="text-[11px] uppercase tracking-[0.18em] text-[var(--color-text-tertiary)]">Document Type</p>
                    <p className="mt-1 font-medium text-[var(--color-text-primary)]">{activeItem.docCategory}</p>
                  </div>
                </div>

                <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-surface-2)] px-4 py-3">
                  <p className="text-[11px] uppercase tracking-[0.18em] text-[var(--color-text-tertiary)]">Reviewer Notes</p>
                  <textarea
                    value={remarks}
                    onChange={(event) => setRemarks(event.target.value)}
                    placeholder="Add review remarks or clarification detail..."
                    className="mt-2 min-h-[96px] w-full resize-none rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] px-3 py-2 text-[13px] text-[var(--color-text-primary)] outline-none focus:border-[var(--color-green)]"
                  />
                </div>

                <div className="flex flex-wrap gap-2">
                  {activeItem.allowedActions.map((action) => (
                    <button
                      key={action}
                      disabled={isActioning}
                      onClick={() => void executeAction(action)}
                      className="rounded-lg border border-[var(--color-border)] bg-[var(--color-surface-2)] px-3 py-2 text-[12px] font-semibold text-[var(--color-text-primary)] transition-colors hover:border-[var(--color-green)] hover:text-[var(--color-green)] disabled:opacity-50"
                    >
                      {humanizeAction(action)}
                    </button>
                  ))}
                  {activeItem.allowedActions.length === 0 ? (
                    <div className="rounded-lg border border-dashed border-[var(--color-border)] px-3 py-2 text-[12px] text-[var(--color-text-secondary)]">
                      No backend actions are available in this state.
                    </div>
                  ) : null}
                </div>
              </div>
            </>
          ) : (
            <div className="text-[13px] text-[var(--color-text-secondary)]">Select a queue item to review.</div>
          )}
        </div>

        <div className="surface-card p-5 space-y-4">
          <div>
            <p className="text-[11px] uppercase tracking-[0.18em] text-[var(--color-text-tertiary)]">Validation Warnings</p>
            <h3 className="mt-1 font-bold text-[var(--color-text-primary)]">Workflow Context</h3>
          </div>
          {activeItem ? (
            <>
              <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-surface-2)] px-4 py-3 space-y-2">
                <div className="flex items-center gap-2 text-[13px] text-[var(--color-text-primary)]">
                  <Clock3 className="h-4 w-4 text-[var(--color-text-secondary)]" />
                  <span>{activeItem.uploadedAt ? new Date(activeItem.uploadedAt).toLocaleString() : "Upload time unavailable"}</span>
                </div>
                <div className="flex items-center gap-2 text-[13px] text-[var(--color-text-primary)]">
                  <CheckCircle2 className="h-4 w-4 text-[var(--color-green)]" />
                  <span>{activeItem.workflowLabel}</span>
                </div>
              </div>

              <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-surface-2)] px-4 py-3">
                <p className="font-semibold text-[var(--color-text-primary)]">Lock State</p>
                <p className="mt-1 text-[12px] text-[var(--color-text-secondary)]">
                  {activeItem.lockState.reason || "No explicit lock reason was returned."}
                </p>
              </div>

              <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-surface-2)] px-4 py-3">
                <p className="font-semibold text-[var(--color-text-primary)]">Workflow History</p>
                <div className="mt-2 space-y-2">
                  {(activeGroup?.items ?? []).map((item) => (
                    <div key={item.id} className="rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] px-3 py-2">
                      <p className="text-[12px] font-medium text-[var(--color-text-primary)]">{item.fileName}</p>
                      <p className="text-[11px] text-[var(--color-text-secondary)]">
                        {item.workflowLabel} · {item.uploadedByName}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            </>
          ) : (
            <div className="text-[13px] text-[var(--color-text-secondary)]">No active review context is available.</div>
          )}
        </div>
      </div>
    </div>
  );
}

function ApprovalsPage({ workspace }: { workspace: ProjectWorkspace }) {
  return <ReviewsPage workspace={workspace} approvalsOnly />;
}

function WorkspaceScreen({
  workspace,
  tab,
}: {
  workspace: ProjectWorkspace;
  tab: string;
}) {
  const isProjectAdmin = isProjectAdminRole(workspace.userRole);
  const projectAdminAllowedTabs = new Set(["my-queue", "dashboard", "reviews", "reviewer", "approvals", "clarifications", "assignments", "settings"]);

  if (isProjectAdmin && !projectAdminAllowedTabs.has(tab)) {
    return <Navigate to={`/projects/${workspace.project.id}/my-queue`} replace />;
  }

  const renderTab = () => {
    if (tab === "dashboard") return <DashboardPage workspace={workspace} />;
    if (tab === "my-queue") return <MyQueuePage workspace={workspace} />;
    if (tab === "credits") return <CreditsLedgerPage workspace={workspace} />;
    if (tab === "reviews" || tab === "reviewer") return <ReviewsPage workspace={workspace} />;
    if (tab === "approvals") return <ApprovalsPage workspace={workspace} />;
    if (tab === "uploads") return <UploadsPage workspace={workspace} />;
    if (tab === "assignments") return <AssignmentsPage workspace={workspace} />;
    if (tab === "documents") return <DocumentsPage workspace={workspace} />;
    if (tab === "clarifications") return <ClarificationsPage workspace={workspace} />;
    if (tab === "team") return <TeamPage workspace={workspace} />;
    if (tab === "tables") return <TablesPage workspace={workspace} />;
    if (tab === "exports") return <ExportsPage workspace={workspace} />;
    if (tab === "settings") return <SettingsPage workspace={workspace} />;
    if (["overview"].includes(tab)) {
      return <ProjectCards projectId={workspace.project.id} credits={workspace.credits} />;
    }
    return <Navigate to={`/projects/${workspace.project.id}/my-queue`} replace />;
  };

  return (
    <Shell
      title={
        <span className="flex items-center gap-3">
          {workspace.project.name}
          {workspace.project.health_status ? (
            <Badge className="border border-[var(--color-border)] bg-[var(--color-surface-2)] text-[var(--color-text-secondary)]">
              {workspace.project.health_status}
            </Badge>
          ) : null}
        </span>
      }
      description={`${workspace.project.certification_type ?? "IGBC Green Interiors"} / Target ${workspace.project.target_rating ?? "Unknown"}`}
      harita={<PersistentHaritaSidebar />}
      email={workspace.user.email}
      notificationCount={workspace.notifications.length}
      workspaceLabel={workspace.project.client || workspace.project.name}
    >
      <ProjectTabs projectId={workspace.project.id} userRole={workspace.userRole} />
      {renderTab()}
    </Shell>
  );
}

function WorkspaceRouteContent({ tab }: { tab: string }) {
  const { workspace } = useOutletContext<{ workspace: ProjectWorkspace }>();
  return <WorkspaceScreen workspace={workspace} tab={tab} />;
}

function WorkspaceRouteLayout() {
  const params = useParams<{ projectId: string }>();
  const projectId = params.projectId ?? "";
  const queryClient = useQueryClient();
  const workspaceQuery = useQuery({
    queryKey: ["workspace", projectId],
    queryFn: () => getProjectWorkspace(projectId),
    enabled: Boolean(projectId),
    staleTime: 15_000,
    refetchInterval: 15_000,
  });

  useEffect(() => {
    if (!projectId || typeof (supabase as any).channel !== "function") {
      return;
    }

    const invalidateWorkspace = () => {
      void queryClient.invalidateQueries({ queryKey: ["workspace", projectId] });
      void queryClient.invalidateQueries({ queryKey: ["review-queue", projectId] });
    };

    const channel = (supabase as any)
      .channel(`tracknov-react-workspace-${projectId}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "project_document", filter: `project_id=eq.${projectId}` }, invalidateWorkspace)
      .on("postgres_changes", { event: "*", schema: "public", table: "document_reviews", filter: `project_id=eq.${projectId}` }, invalidateWorkspace)
      .on("postgres_changes", { event: "*", schema: "public", table: "assignments", filter: `project_id=eq.${projectId}` }, invalidateWorkspace)
      .on("postgres_changes", { event: "*", schema: "public", table: "project_credits", filter: `project_id=eq.${projectId}` }, invalidateWorkspace)
      .on("postgres_changes", { event: "*", schema: "public", table: "notifications", filter: `project_id=eq.${projectId}` }, invalidateWorkspace);

    channel.subscribe();

    return () => {
      if (typeof (supabase as any).removeChannel === "function") {
        void (supabase as any).removeChannel(channel);
      } else if (typeof channel.unsubscribe === "function") {
        void channel.unsubscribe();
      }
    };
  }, [projectId, queryClient]);

  useEffect(() => {
    const nextRole = queryClient.getQueryData<ProjectWorkspace>(["workspace", projectId])?.userRole;
    if (typeof window !== "undefined" && nextRole) {
      window.sessionStorage.setItem("tracknov_workspace_role", String(nextRole || "").toLowerCase());
    }
  }, [projectId, queryClient, workspaceQuery.data?.userRole]);

  if (workspaceQuery.isLoading) return <WorkspaceSkeleton />;
  if (workspaceQuery.error) {
    return <div className="p-8 text-red-500">{workspaceQuery.error instanceof Error ? workspaceQuery.error.message : "Failed to load workspace."}</div>;
  }
  if (!workspaceQuery.data) {
    return <div className="p-8 text-[var(--color-text-secondary)]">Project not found or access denied.</div>;
  }

  const workspace = workspaceQuery.data;
  const haritaValue = {
    projectId: workspace.project.id,
    title: workspace.project.name,
    description: `${workspace.project.certification_type ?? "IGBC"} / Target ${workspace.project.target_rating ?? "Unknown"}`,
  };

  return (
    <HaritaContextProvider value={haritaValue}>
      <Outlet context={{ workspace }} />
    </HaritaContextProvider>
  );
}

function DefaultRoute() {
  const projectsQuery = useQuery({
    queryKey: ["dashboard-projects"],
    queryFn: getDashboardProjects,
    staleTime: 30_000,
  });

  if (projectsQuery.isLoading) return <LoadingScreen />;
  if (!projectsQuery.data?.length) {
    return <div className="p-8 text-[var(--color-text-secondary)]">No projects available for this user.</div>;
  }

  return <Navigate to={`/projects/${projectsQuery.data[0].id}/my-queue`} replace />;
}

export default function App() {
  const navigate = useNavigate();
  const location = useLocation();
  const [session, setSession] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }: { data: { session: any } }) => {
      setSession(session);
      setLoading(false);
      if (!session && location.pathname !== "/login") {
        navigate("/login");
      }
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event: string, nextSession: any) => {
      setSession(nextSession);
      if (!nextSession && location.pathname !== "/login") {
        navigate("/login");
      } else if (nextSession && location.pathname === "/login") {
        navigate("/");
      }
    });

    return () => subscription.unsubscribe();
  }, [navigate, location.pathname]);

  if (loading) {
    return <LoadingScreen />;
  }

  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route path="/" element={session ? <DefaultRoute /> : null} />
      <Route path="/projects/:projectId" element={session ? <WorkspaceRouteLayout /> : null}>
        <Route index element={<Navigate to="my-queue" replace />} />
        <Route path="dashboard" element={<WorkspaceRouteContent tab="dashboard" />} />
        <Route path="my-queue" element={<WorkspaceRouteContent tab="my-queue" />} />
        <Route path="overview" element={<WorkspaceRouteContent tab="overview" />} />
        <Route path="credits" element={<WorkspaceRouteContent tab="credits" />} />
        <Route path="reviews" element={<WorkspaceRouteContent tab="reviews" />} />
        <Route path="reviewer" element={<WorkspaceRouteContent tab="reviewer" />} />
        <Route path="approvals" element={<WorkspaceRouteContent tab="approvals" />} />
        <Route path="uploads" element={<WorkspaceRouteContent tab="uploads" />} />
        <Route path="documents" element={<WorkspaceRouteContent tab="documents" />} />
        <Route path="clarifications" element={<WorkspaceRouteContent tab="clarifications" />} />
        <Route path="assignments" element={<WorkspaceRouteContent tab="assignments" />} />
        <Route path="team" element={<WorkspaceRouteContent tab="team" />} />
        <Route path="tables" element={<WorkspaceRouteContent tab="tables" />} />
        <Route path="exports" element={<WorkspaceRouteContent tab="exports" />} />
        <Route path="settings" element={<WorkspaceRouteContent tab="settings" />} />
        <Route path="*" element={<Navigate to="my-queue" replace />} />
      </Route>
      <Route path="*" element={session ? <DefaultRoute /> : null} />
    </Routes>
  );
}
