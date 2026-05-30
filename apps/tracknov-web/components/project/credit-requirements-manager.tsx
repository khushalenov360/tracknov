"use client";

import React, { useState, useTransition } from "react";
import { CheckCircle2, Circle, Pencil, Save, X } from "lucide-react";
import { Button } from "@tracknov/ui/ui/button";
import { updateCreditDocumentRequirementsAction } from "@/app/actions";
import { MatrixAssignmentDropdown } from "@/components/project/MatrixAssignmentDropdown";
import { ProjectMemberRecord } from "@/lib/types";

interface CreditRequirementsManagerProps {
  projectId: string;
  creditId: string;
  documentsRequired: Array<{ type: string; label: string; required: boolean; assigned_user_id?: string | null }>;
  documents: Array<{ id: string; doc_category: string; status: string }>;
  members: ProjectMemberRecord[];
  canManage: boolean;
}

export function CreditRequirementsManager({
  projectId,
  creditId,
  documentsRequired,
  documents,
  members,
  canManage,
}: CreditRequirementsManagerProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [selectedTypes, setSelectedTypes] = useState<Set<string>>(
    new Set(documentsRequired.filter((d) => d.required).map((d) => d.type))
  );

  const toggleType = (type: string) => {
    const next = new Set(selectedTypes);
    if (next.has(type)) {
      next.delete(type);
    } else {
      next.add(type);
    }
    setSelectedTypes(next);
  };

  const handleSave = () => {
    const formData = new FormData();
    formData.append("project_id", projectId);
    formData.append("credit_id", creditId);
    Array.from(selectedTypes).forEach((type) => {
      formData.append("required_doc_types", type);
    });

    startTransition(async () => {
      await updateCreditDocumentRequirementsAction(formData);
      setIsEditing(false);
    });
  };

  const handleCancel = () => {
    setSelectedTypes(new Set(documentsRequired.filter((d) => d.required).map((d) => d.type)));
    setIsEditing(false);
  };

  return (
    <div className="space-y-2">
      <div className="flex justify-between items-center mb-1">
        <span className="text-xs uppercase font-black text-slate-500">Requirements & Assignments</span>
        {canManage && !isEditing && (
          <Button
            variant="ghost"
            onClick={() => setIsEditing(true)}
            className="h-6 text-[10px] uppercase font-bold text-[var(--color-green)] hover:text-[var(--color-green-strong)] hover:bg-[var(--color-green-soft)] px-2"
          >
            <Pencil className="w-3 h-3 mr-1" /> Edit Validation
          </Button>
        )}
        {canManage && isEditing && (
          <div className="flex gap-1">
            <Button
              variant="ghost"
              onClick={handleCancel}
              disabled={isPending}
              className="h-6 text-[10px] uppercase font-bold text-slate-500 hover:text-slate-700 px-2"
            >
              <X className="w-3 h-3 mr-1" /> Cancel
            </Button>
            <Button
              onClick={handleSave}
              disabled={isPending}
              className="h-6 text-[10px] uppercase font-bold bg-[var(--color-green)] text-white hover:bg-[var(--color-green-dim)] px-2"
            >
              <Save className="w-3 h-3 mr-1" /> {isPending ? "Saving..." : "Save Validated Setup"}
            </Button>
          </div>
        )}
      </div>

      <div className="space-y-2">
        {documentsRequired.map((doc) => {
          const isRequired = isEditing ? selectedTypes.has(doc.type) : doc.required;
          const matchingDocs = documents.filter((f) => f.doc_category === doc.type);
          const isApproved = matchingDocs.some((f) => f.status === "approved" || f.status === "owner_approved");
          
          return (
            <div key={doc.type} className="flex flex-col gap-2 bg-[var(--color-surface-2)] p-2.5 rounded border border-[var(--color-border)]">
              <div className="flex justify-between items-center text-xs">
                <div className="flex items-center gap-2">
                  {isEditing && canManage ? (
                    <input
                      type="checkbox"
                      checked={isRequired}
                      onChange={() => toggleType(doc.type)}
                      className="rounded border-[var(--color-border)] text-[var(--color-green)] focus:ring-[var(--color-green)] h-4 w-4"
                    />
                  ) : null}
                  <div>
                    <p className={`font-bold ${!isRequired ? "text-slate-400" : "text-[var(--color-text-primary)]"}`}>
                      {doc.label}
                    </p>
                    <p className="text-[10px] uppercase tracking-wider text-[var(--color-text-tertiary)]">
                      {isRequired ? "Required" : "Optional"}
                    </p>
                  </div>
                </div>
                {!isEditing && (
                  isApproved ? (
                    <CheckCircle2 className="h-4 w-4 text-[var(--color-green)] shrink-0" />
                  ) : (
                    <Circle className="h-4 w-4 text-[var(--color-border-strong)] shrink-0" />
                  )
                )}
              </div>
              
              {!isEditing && isRequired && canManage && (
                <div className="pt-2 mt-1 border-t border-[var(--color-border)] border-dashed">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-[10px] uppercase font-bold text-slate-500 shrink-0">Assign Contributor:</span>
                    <div className="flex-1 max-w-[200px]">
                      <MatrixAssignmentDropdown
                        projectId={projectId}
                        creditId={creditId}
                        docType={doc.type}
                        currentAssigneeId={doc.assigned_user_id || undefined}
                        members={members}
                        isDisabled={true}
                      />
                    </div>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
