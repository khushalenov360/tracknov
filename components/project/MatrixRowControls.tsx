"use client";

import React, { useState, useEffect } from "react";
import { updateCreditDocumentRequirementsAction, assignCreditContributorAction } from "@/app/actions";
import { cleanRoleLabel } from "@/lib/utils";
import { roleLabels } from "@/lib/constants";

interface Member {
  id: string;
  user_id: string;
  name?: string;
  email?: string;
  role: string;
  full_name?: string | null;
  member_email?: string | null;
}

interface MatrixRowControlsProps {
  projectId: string;
  creditId: string;
  docType: string;
  label: string;
  initialIsRequired: boolean;
  initialAssigneeId?: string;
  members: Member[];
  isDisabled?: boolean;
}

export const MatrixRowControls: React.FC<MatrixRowControlsProps> = ({
  projectId,
  creditId,
  docType,
  label,
  initialIsRequired,
  initialAssigneeId,
  members,
  isDisabled = false,
}) => {
  const [localRequired, setLocalRequired] = useState(initialIsRequired);
  const [localAssigneeId, setLocalAssigneeId] = useState(initialAssigneeId);

  // Sync with server state
  useEffect(() => {
    setLocalRequired(initialIsRequired);
  }, [initialIsRequired]);

  useEffect(() => {
    setLocalAssigneeId(initialAssigneeId);
  }, [initialAssigneeId]);

  const handleRequirementChange = async (e: React.ChangeEvent<HTMLSelectElement>) => {
    const newlyRequired = e.target.value === "true";
    if (newlyRequired === localRequired) return;

    // OPTIMISTIC UI: Instantly change the requirement and unlock the assignment dropdown!
    setLocalRequired(newlyRequired);
    
    // If we changed to "Not Required", optimistically clear the assignee
    if (!newlyRequired) {
      setLocalAssigneeId(undefined);
    }

    const formData = new FormData();
    formData.append("project_id", projectId);
    formData.append("credit_id", creditId);
    formData.append("doc_type", docType);
    formData.append("is_required", newlyRequired ? "true" : "false");

    try {
      await updateCreditDocumentRequirementsAction(formData);
    } catch (error) {
      console.error("Requirement update failed:", error);
      setLocalRequired(initialIsRequired);
    }
  };

  const handleAssignmentChange = async (e: React.ChangeEvent<HTMLSelectElement>) => {
    const newAssigneeId = e.target.value === "none" || e.target.value === "" ? undefined : e.target.value;
    if (newAssigneeId === localAssigneeId) return;

    // Optimistic UI
    setLocalAssigneeId(newAssigneeId);

    const formData = new FormData();
    formData.append("project_id", projectId);
    formData.append("credit_id", creditId);
    formData.append("doc_type", docType);
    if (newAssigneeId) {
      formData.append("assigned_to", newAssigneeId);
    }

    try {
      await assignCreditContributorAction(formData);
    } catch (error) {
      console.error("Assignment update failed:", error);
      setLocalAssigneeId(initialAssigneeId);
    }
  };

  const coordinators = members.filter((m) =>
    ["owner", "project_admin", "consultant"].includes(m.role)
  );
  const contributors = members.filter((m) =>
    ["architect", "mep", "contractor"].includes(m.role)
  );

  const getDisplayName = (m: Member) => {
    let roleLabel = (roleLabels as any)[m.role] || cleanRoleLabel(m.role);
    // Remove trailing (L0), (L1), etc.
    roleLabel = roleLabel.replace(/\s*\((L[0-3]|PM)\)$/, "");
  
    const primaryName = m.name?.trim() || m.full_name?.trim() || m.email?.trim() || m.member_email?.trim();
    if (primaryName && primaryName !== "Unknown") {
      return `${primaryName} - ${roleLabel}`;
    }
    return roleLabel;
  };

  return (
    <>
      <td className="px-4 py-3 border-r border-[var(--color-border)]/50">
        <div className="flex items-center justify-between">
          <span className="font-medium text-[var(--color-text-primary)]">{label}</span>
          <select
            value={localRequired ? "true" : "false"}
            onChange={handleRequirementChange}
            disabled={isDisabled}
            className={`h-6 rounded-md border text-[10px] uppercase font-bold focus:outline-none disabled:opacity-50 px-1 cursor-pointer w-28 transition-colors ${
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
          onChange={handleAssignmentChange}
          disabled={isDisabled || !localRequired}
          className={`h-7 w-full rounded-md border border-[var(--color-border)] bg-[var(--color-surface)] px-1 text-xs text-[var(--color-text-secondary)] focus:border-[var(--color-green)] focus:outline-none disabled:opacity-50 transition-colors ${
            localAssigneeId ? "border-[var(--color-green)] text-[var(--color-green)]" : ""
          }`}
        >
          <option value="">Unassigned</option>
          {coordinators.length > 0 && (
            <optgroup label="Coordinators">
              {coordinators.map((m) => (
                <option key={m.user_id} value={m.user_id}>
                  {getDisplayName(m)}
                </option>
              ))}
            </optgroup>
          )}
          {contributors.length > 0 && (
            <optgroup label="Contributors">
              {contributors.map((m) => (
                <option key={m.user_id} value={m.user_id}>
                  {getDisplayName(m)}
                </option>
              ))}
            </optgroup>
          )}
        </select>
      </td>
    </>
  );
};
