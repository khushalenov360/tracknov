"use client";
import React, { useTransition } from "react";
import { updateCreditDocumentRequirementsAction } from "@/app/actions";
import { useRouter } from "next/navigation";

interface MatrixRequirementDropdownProps {
  projectId: string;
  creditId: string;
  docType: string;
  isRequired: boolean;
  allRequiredDocTypes: string[];
  isDisabled?: boolean;
}

export const MatrixRequirementDropdown: React.FC<MatrixRequirementDropdownProps> = ({
  projectId,
  creditId,
  docType,
  isRequired,
  allRequiredDocTypes,
  isDisabled = false,
}) => {
  const [localRequired, setLocalRequired] = React.useState(isRequired);

  // Sync local state if props change from server
  React.useEffect(() => {
    setLocalRequired(isRequired);
  }, [isRequired]);

  const handleChange = async (e: React.ChangeEvent<HTMLSelectElement>) => {
    const newlyRequired = e.target.value === "true";
    if (newlyRequired === localRequired) return;

    // Optimistic update
    setLocalRequired(newlyRequired);

    const formData = new FormData();
    formData.append("project_id", projectId);
    formData.append("credit_id", creditId);
    formData.append("doc_type", docType);
    formData.append("is_required", newlyRequired ? "true" : "false");

    try {
      await updateCreditDocumentRequirementsAction(formData);
    } catch (error) {
      console.error("Requirement update failed:", error);
      // Revert on failure
      setLocalRequired(isRequired);
    }
  };

  return (
    <select
      value={localRequired ? "true" : "false"}
      onChange={handleChange}
      disabled={isDisabled}
      className={`h-6 rounded-md border text-[10px] uppercase font-bold focus:outline-none disabled:opacity-50 px-1 cursor-pointer w-28 transition-colors ${
        localRequired 
          ? "border-[var(--color-red)] bg-[var(--color-red-soft)] text-[var(--color-red)]" 
          : "border-[var(--color-border)] bg-[var(--color-surface)] text-[var(--color-text-secondary)]"
      }`}
    >
      <option value="true">Required</option>
      <option value="false">Not Required</option>
    </select>
  );
};
