"use client";
import React, { useState } from "react";
import { assignCreditContributorAction } from "@/app/actions";
import { cleanRoleLabel } from "@/lib/utils";
import { ProjectMemberRecord } from "@/lib/types";
import { roleLabels } from "@/lib/constants";

interface MatrixAssignmentDropdownProps {
  projectId: string;
  creditId: string;
  docType: string;
  currentAssigneeId?: string;
  members: ProjectMemberRecord[];
  isDisabled?: boolean;
}

export const MatrixAssignmentDropdown: React.FC<MatrixAssignmentDropdownProps> = ({
  projectId,
  creditId,
  docType,
  currentAssigneeId,
  members,
  isDisabled = false,
}) => {
  const [isPending, setIsPending] = useState(false);

  const handleChange = async (e: React.ChangeEvent<HTMLSelectElement>) => {
    const assignedTo = e.target.value;
    if (!assignedTo) return;

    setIsPending(true);
    const formData = new FormData();
    formData.append("project_id", projectId);
    formData.append("credit_id", creditId);
    formData.append("assigned_to", assignedTo);
    formData.append("doc_type", docType);

    try {
      await assignCreditContributorAction(formData);
    } catch (error) {
      console.error("Assignment failed:", error);
    } finally {
      setIsPending(false);
    }
  };

  const coordinators = members.filter((m) =>
    ["owner", "project_admin", "consultant"].includes(m.role)
  );
  const contributors = members.filter((m) =>
    ["architect", "mep", "contractor"].includes(m.role)
  );

  return (
    <select
      value={currentAssigneeId || ""}
      onChange={handleChange}
      disabled={isDisabled || isPending}
      className={`h-7 w-full rounded-md border border-[var(--color-border)] bg-[var(--color-surface)] px-1 text-xs text-[var(--color-text-secondary)] focus:border-[var(--color-green)] focus:outline-none disabled:opacity-50 ${
        currentAssigneeId ? "border-[var(--color-green)] text-[var(--color-green)]" : ""
      }`}
    >
      <option value="">Unassigned</option>
      {coordinators.length > 0 && (
        <optgroup label="Coordinators">
          {coordinators.map((m) => (
            <option key={m.user_id} value={m.user_id}>
              {m.full_name ? `${m.full_name} (${roleLabels[m.role]})` : cleanRoleLabel(m.member_email || "Unknown")}
            </option>
          ))}
        </optgroup>
      )}
      {contributors.length > 0 && (
        <optgroup label="Contributors">
          {contributors.map((m) => (
            <option key={m.user_id} value={m.user_id}>
              {m.full_name ? `${m.full_name} (${roleLabels[m.role]})` : cleanRoleLabel(m.member_email || "Unknown")}
            </option>
          ))}
        </optgroup>
      )}
    </select>
  );
};
