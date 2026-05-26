"use client";
import React, { useTransition } from "react";
import { updateCreditDocumentRequirementsAction } from "@/app/actions";

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
  const [isPending, startTransition] = useTransition();

  const handleChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const newlyRequired = e.target.value === "true";
    if (newlyRequired === isRequired) return;

    let newSelectedTypes = [...allRequiredDocTypes];
    
    if (newlyRequired) {
      if (!newSelectedTypes.includes(docType)) {
        newSelectedTypes.push(docType);
      }
    } else {
      newSelectedTypes = newSelectedTypes.filter(t => t !== docType);
    }

    const formData = new FormData();
    formData.append("project_id", projectId);
    formData.append("credit_id", creditId);
    newSelectedTypes.forEach(t => formData.append("required_doc_types", t));

    // If newSelectedTypes is empty, append a dummy to satisfy FormData if needed, but the action handles empty getAll() as []
    // wait, if getAll("required_doc_types") returns [], it maps to []. That's fine.

    startTransition(async () => {
      try {
        await updateCreditDocumentRequirementsAction(formData);
      } catch (error) {
        console.error("Requirement update failed:", error);
      }
    });
  };

  return (
    <select
      value={isRequired ? "true" : "false"}
      onChange={handleChange}
      disabled={isDisabled || isPending}
      className={`h-6 rounded-md border text-[10px] uppercase font-bold focus:outline-none disabled:opacity-50 px-1 cursor-pointer w-28 ${
        isRequired 
          ? "border-[var(--color-red)] bg-[var(--color-red-soft)] text-[var(--color-red)]" 
          : "border-[var(--color-border)] bg-[var(--color-surface)] text-[var(--color-text-secondary)]"
      }`}
    >
      <option value="true">Required</option>
      <option value="false">Not Required</option>
    </select>
  );
};
