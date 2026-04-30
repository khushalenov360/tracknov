"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { CheckCircle2, Loader2, UploadCloud } from "lucide-react";
import { uploadDocumentAction } from "@/app/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";

type UploadProject = {
  id: string;
  name: string;
  credits: {
    id: string;
    project_credit_id: string;
    status: string;
    credit_code: string;
    credit_name: string;
    doc_types: string[];
    what_to_submit: string;
    requirements: {
      type: string;
      label: string;
      required: boolean;
    }[];
    prior_examples_by_type?: Record<string, string[]>;
  }[];
};

type PendingFile = {
  projectId: string;
  projectName: string;
  creditId: string;
  projectCreditId: string;
  creditName: string;
  docType: string;
  requirementSlot: string;
  notes: string;
  file: File;
};

export function GeneralUploadDocumentForm({
  projects,
}: {
  projects: UploadProject[];
}) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [successMessage, setSuccessMessage] = useState("");
  const [projectId, setProjectId] = useState(projects[0]?.id ?? "");
  const [countdown, setCountdown] = useState(0);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const [pendingQueue, setPendingQueue] = useState<PendingFile[] | null>(null);
  const [requirementSlot, setRequirementSlot] = useState("");
  const [lastUploadedFileName, setLastUploadedFileName] = useState("");
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [dragActive, setDragActive] = useState(false);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const cameraInputRef = useRef<HTMLInputElement | null>(null);

  const currentProject = useMemo(
    () => projects.find((project) => project.id === projectId) ?? projects[0],
    [projectId, projects],
  );
  const [creditId, setCreditId] = useState(currentProject?.credits[0]?.id ?? "");
  const currentCredit = useMemo(
    () => currentProject?.credits.find((credit) => credit.id === creditId) ?? currentProject?.credits[0],
    [creditId, currentProject],
  );
  const [docType, setDocType] = useState(currentCredit?.doc_types[0] ?? "");
  const maxFileSizeBytes = 10 * 1024 * 1024;
  const maxFileSizeLabel = "10 MB";
  const allowedExtensions = useMemo(() => [".pdf", ".docx", ".png", ".jpg", ".jpeg"], []);
  const accept = useMemo(() => allowedExtensions.join(","), [allowedExtensions]);
  const docTypeOptions = useMemo(() => {
    if (!currentCredit?.requirements.length) {
      return currentCredit?.doc_types ?? [];
    }
    return currentCredit.requirements.map((requirement) => requirement.type);
  }, [currentCredit]);
  const matchingRequirement = useMemo(
    () => currentCredit?.requirements.find((requirement) => requirement.type === docType) ?? null,
    [currentCredit, docType],
  );
  const priorExamples = useMemo(
    () => (currentCredit?.prior_examples_by_type?.[docType] ?? []).slice(0, 3),
    [currentCredit, docType],
  );

  useEffect(() => {
    const nextCreditId = currentProject?.credits[0]?.id ?? "";
    setCreditId((existing) =>
      currentProject?.credits.some((credit) => credit.id === existing) ? existing : nextCreditId,
    );
  }, [currentProject]);

  useEffect(() => {
    const nextDocType = docTypeOptions[0] ?? "";
    setDocType((existing) => (docTypeOptions.includes(existing) ? existing : nextDocType));
  }, [docTypeOptions]);

  useEffect(() => {
    const slot = matchingRequirement?.label || docType;
    setRequirementSlot(slot);
  }, [matchingRequirement, docType]);

  const normalizeFiles = useCallback((incomingFiles: File[]) => {
    const deduped = new Map<string, File>();
    for (const file of incomingFiles) {
      deduped.set(`${file.name}-${file.size}-${file.lastModified}`, file);
    }
    return Array.from(deduped.values());
  }, []);

  const appendFiles = useCallback(
    (incomingFiles: File[]) => {
      setSelectedFiles((existing) => normalizeFiles([...existing, ...incomingFiles]));
    },
    [normalizeFiles],
  );

  const submitPendingQueue = useCallback(
    async (pendingItems: PendingFile[]) => {
      if (loading) {
        return;
      }

      setLoading(true);
      setError("");
      setSuccessMessage("");
      try {
        for (const pending of pendingItems) {
          const formData = new FormData();
          formData.set("project_id", pending.projectId);
          formData.set("credit_id", pending.creditId);
          formData.set("project_credit_id", pending.projectCreditId);
          formData.set("doc_category", pending.docType);
          formData.set("requirement_slot", pending.requirementSlot);
          formData.set("notes", pending.notes);
          formData.set("file", pending.file);
          const result = await uploadDocumentAction(formData);
          if (!result.ok) {
            throw new Error(result.error ?? `Upload failed for ${pending.file.name}`);
          }
          setLastUploadedFileName(pending.file.name);
        }

        setSuccessMessage(
          pendingItems.length > 1
            ? `${pendingItems.length} files uploaded and mapped successfully.`
            : "Upload complete and mapped to the selected credit.",
        );
        setSelectedFiles([]);
        if (fileInputRef.current) {
          fileInputRef.current.value = "";
        }
        if (cameraInputRef.current) {
          cameraInputRef.current.value = "";
        }
        setPendingQueue(null);
        router.refresh();
      } catch (uploadError) {
        setError(uploadError instanceof Error ? uploadError.message : "Upload failed");
      } finally {
        setLoading(false);
      }
    },
    [loading, router],
  );

  useEffect(() => {
    if (!pendingQueue) {
      return;
    }
    setCountdown(5);
    timerRef.current = setInterval(() => {
      setCountdown((value) => {
        if (value <= 1) {
          if (timerRef.current) {
            clearInterval(timerRef.current);
            timerRef.current = null;
          }
          void submitPendingQueue(pendingQueue);
          return 0;
        }
        return value - 1;
      });
    }, 1000);

    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
    };
  }, [pendingQueue, submitPendingQueue]);

  async function onUpload(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    const formData = new FormData(form);
    const files = selectedFiles.filter((entry) => entry.size > 0);

    if (!files.length || !projectId || !creditId || !docType || !currentCredit?.project_credit_id) {
      setError("Step 3 needs at least one file selected after credit and document type are set.");
      return;
    }
    if (!requirementSlot.trim()) {
      setError("Select the exact required document slot before upload.");
      return;
    }

    const suspiciousProjectName = (currentProject?.name ?? "").toLowerCase();
    const hasCrossProjectFilename = files.some((file) => {
      const name = file.name.toLowerCase();
      return name.includes("kfc_") && suspiciousProjectName && !name.includes(suspiciousProjectName.replace(/\s+/g, "_"));
    });
    if (hasCrossProjectFilename) {
      setError("Filename appears to belong to a different project. Verify project selection before upload.");
      return;
    }

    for (const file of files) {
      const fileNameLower = file.name.toLowerCase();
      const hasAllowedExtension = allowedExtensions.some((extension) => fileNameLower.endsWith(extension));
      if (!hasAllowedExtension) {
        setError("Unsupported file type. Upload PDF, DOCX, PNG, or JPG files only.");
        return;
      }
      if (file.size > maxFileSizeBytes) {
      setError(`File ${file.name} is too large. The limit is ${maxFileSizeLabel}.`);
        return;
      }
    }

    setError("");
    setSuccessMessage("");
    const notes = String(formData.get("notes") ?? "").trim();
    const pendingItems: PendingFile[] = files.map((file) => ({
      projectId,
      projectName: currentProject?.name ?? "Selected project",
      creditId,
      projectCreditId: currentCredit?.project_credit_id ?? "",
      creditName: `${currentCredit?.credit_code ?? ""} - ${currentCredit?.credit_name ?? ""}`.trim(),
      docType,
      requirementSlot,
      notes,
      file,
    }));
    setPendingQueue(pendingItems);
  }

  return (
    <form onSubmit={onUpload} className="surface-card grid gap-3 p-4">
      <div className="grid gap-2 rounded-md border border-[var(--color-border)] bg-[var(--color-surface-2)] p-3 text-[11px] text-[var(--color-text-secondary)] md:grid-cols-3">
        <p>
          <strong>Step 1:</strong> pick project and credit
        </p>
        <p>
          <strong>Step 2:</strong> confirm document slot/type
        </p>
        <p>
          <strong>Step 3:</strong> select one or more files and upload
        </p>
      </div>

      <div className="grid gap-3 lg:grid-cols-[220px_minmax(0,1fr)]">
        <select
          value={projectId}
          onChange={(event) => setProjectId(event.target.value)}
          className="h-[36px] rounded-md border border-[var(--color-border)] bg-[var(--color-surface)] px-3 text-[12px] text-[var(--color-text-primary)] outline-none focus:border-[var(--color-border-strong)]"
        >
          {projects.map((project) => (
            <option key={project.id} value={project.id}>
              {project.name}
            </option>
          ))}
        </select>
        <select
          value={creditId}
          onChange={(event) => setCreditId(event.target.value)}
          className="h-[36px] rounded-md border border-[var(--color-border)] bg-[var(--color-surface)] px-3 text-[12px] text-[var(--color-text-primary)] outline-none focus:border-[var(--color-border-strong)]"
          disabled={!currentProject?.credits.length}
        >
          {currentProject?.credits.length ? (
            currentProject.credits.map((credit) => (
              <option key={credit.id} value={credit.id}>
                {credit.credit_code} - {credit.credit_name}
              </option>
            ))
          ) : (
            <option value="">No credit catalog available</option>
          )}
        </select>
      </div>

      <div className="grid gap-3 lg:grid-cols-[220px_220px_minmax(0,1fr)]">
        <select
          value={docType}
          onChange={(event) => setDocType(event.target.value)}
          className="h-[36px] rounded-md border border-[var(--color-border)] bg-[var(--color-surface)] px-3 text-[12px] text-[var(--color-text-primary)] outline-none focus:border-[var(--color-border-strong)]"
          disabled={!docTypeOptions.length}
        >
          {docTypeOptions.length ? (
            docTypeOptions.map((item) => (
              <option key={item} value={item}>
                {item}
              </option>
            ))
          ) : (
            <option value="">No required document types</option>
          )}
        </select>
        <select
          value={requirementSlot}
          onChange={(event) => setRequirementSlot(event.target.value)}
          className="h-[36px] rounded-md border border-[var(--color-border)] bg-[var(--color-surface)] px-3 text-[12px] text-[var(--color-text-primary)] outline-none focus:border-[var(--color-border-strong)]"
        >
          {(currentCredit?.requirements.length ? currentCredit.requirements : [{ type: docType, label: docType, required: true }]).map((requirement) => (
            <option key={`${requirement.type}-${requirement.label}`} value={requirement.label}>
              {requirement.required ? "Required" : "Optional"}: {requirement.label}
            </option>
          ))}
        </select>
        <div
          onDragEnter={(event) => {
            event.preventDefault();
            setDragActive(true);
          }}
          onDragOver={(event) => {
            event.preventDefault();
            setDragActive(true);
          }}
          onDragLeave={(event) => {
            event.preventDefault();
            if (event.currentTarget === event.target) {
              setDragActive(false);
            }
          }}
          onDrop={(event) => {
            event.preventDefault();
            setDragActive(false);
            const dropped = Array.from(event.dataTransfer.files ?? []);
            if (dropped.length) {
              appendFiles(dropped);
            }
          }}
          className={`rounded-md border px-3 py-2 text-[12px] ${
            dragActive
              ? "border-[var(--color-blue)] bg-[var(--color-blue-soft)]"
              : "border-[var(--color-border)] bg-[var(--color-surface)]"
          }`}
        >
          <p className="text-[11px] text-[var(--color-text-secondary)]">
            Drag and drop files here, or use the pickers below.
          </p>
          <div className="mt-2 flex flex-wrap gap-2">
            <Input
              ref={fileInputRef}
              name="file"
              type="file"
              multiple
              accept={accept}
              onChange={(event) => {
                const picked = Array.from(event.target.files ?? []);
                if (picked.length) {
                  appendFiles(picked);
                }
              }}
            />
            <input
              ref={cameraInputRef}
              type="file"
              accept="image/*"
              capture="environment"
              onChange={(event) => {
                const picked = Array.from(event.target.files ?? []);
                if (picked.length) {
                  appendFiles(picked);
                }
              }}
              className="hidden"
            />
            <Button
              type="button"
              variant="secondary"
              className="h-[36px] rounded-md px-3 text-[11px]"
              onClick={() => cameraInputRef.current?.click()}
            >
              Capture photo
            </Button>
          </div>
        </div>
      </div>

      <div className="grid gap-3 lg:grid-cols-[minmax(0,1fr)_160px]">
        <Textarea name="notes" placeholder="Context for reviewer (what changed, vendor, location, etc.)" className="min-h-[36px] py-2" />
        <Button
          type="submit"
          className="h-[36px] rounded-md"
          disabled={
            loading ||
            Boolean(pendingQueue) ||
            projects.length === 0 ||
            !currentProject?.credits.length ||
            !docTypeOptions.length ||
            selectedFiles.length === 0
          }
        >
          {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <UploadCloud className="mr-2 h-4 w-4" />}
          Upload
        </Button>
      </div>

      {error ? <p className="text-[11px] text-[var(--color-red)]">{error}</p> : null}
      {selectedFiles.length ? (
        <div className="rounded-md border border-[var(--color-border)] bg-[var(--color-surface-2)] p-2">
          <p className="text-[10px] uppercase tracking-[0.07em] text-[var(--color-text-tertiary)]">
            Selected files ({selectedFiles.length})
          </p>
          <ul className="mt-1 space-y-1">
            {selectedFiles.map((file) => (
              <li key={`${file.name}-${file.size}-${file.lastModified}`} className="truncate text-[11px] text-[var(--color-text-primary)]">
                {file.name}
              </li>
            ))}
          </ul>
          <div className="mt-2">
            <Button
              type="button"
              variant="secondary"
              className="h-[30px] rounded-md px-3 text-[11px]"
              onClick={() => {
                setSelectedFiles([]);
                if (fileInputRef.current) {
                  fileInputRef.current.value = "";
                }
                if (cameraInputRef.current) {
                  cameraInputRef.current.value = "";
                }
              }}
            >
              Clear selected files
            </Button>
          </div>
        </div>
      ) : null}
      {successMessage ? (
        <div className="rounded-md border border-[var(--color-green-light)] bg-[var(--color-green-light)] p-2 text-[11px] text-[var(--color-green)]">
          <p className="flex items-center gap-1.5">
            <CheckCircle2 className="h-3.5 w-3.5" />
            {successMessage}
          </p>
          {lastUploadedFileName ? <p className="mt-1">Last uploaded file: {lastUploadedFileName}</p> : null}
        </div>
      ) : null}

      <p className="text-[11px] text-[var(--color-text-tertiary)]">
        Upload limit: {maxFileSizeLabel}. For larger files, reduce PDF size or image resolution before upload.
      </p>
      <p className="text-[11px] text-[var(--color-text-tertiary)]">
        Each upload is mapped to a credit immediately and enters owner review before final Project Admin inclusion.
      </p>

      {pendingQueue ? (
        <div className="rounded-md border border-[var(--color-amber)] bg-[var(--color-amber-soft)] p-3 text-[11px] text-[var(--color-text-primary)]">
          <p>
            You are uploading <strong>{pendingQueue.length}</strong> file(s) to <strong>{pendingQueue[0]?.projectName}</strong> under{" "}
            <strong>{pendingQueue[0]?.creditName}</strong> / <strong>{pendingQueue[0]?.docType}</strong>.
          </p>
          <p className="mt-1">Upload starts in {countdown}s. Cancel now to avoid accidental token usage.</p>
          <ul className="mt-2 list-disc pl-5 text-[11px] text-[var(--color-text-secondary)]">
            {pendingQueue.map((item) => (
              <li key={item.file.name + item.file.size}>{item.file.name}</li>
            ))}
          </ul>
          <div className="mt-2">
            <Button
              type="button"
              variant="secondary"
              className="h-7 rounded-md px-3 text-[11px]"
              onClick={() => {
                if (timerRef.current) {
                  clearInterval(timerRef.current);
                  timerRef.current = null;
                }
                setPendingQueue(null);
                setCountdown(0);
                setSelectedFiles([]);
                if (fileInputRef.current) {
                  fileInputRef.current.value = "";
                }
                if (cameraInputRef.current) {
                  cameraInputRef.current.value = "";
                }
              }}
            >
              Cancel upload
            </Button>
          </div>
        </div>
      ) : null}

      {currentCredit ? (
        <div className="rounded-md border border-[var(--color-border)] bg-[var(--color-surface-2)] p-3">
          <p className="text-[10px] uppercase tracking-[0.07em] text-[var(--color-text-tertiary)]">
            Required evidence for {currentCredit.credit_code}
          </p>
          <p className="mt-1 text-[12px] text-[var(--color-text-primary)]">
            {currentCredit.what_to_submit || "Upload mapped evidence documents for this credit requirement."}
          </p>
          {currentCredit.requirements.length ? (
            <div className="mt-2 flex flex-wrap gap-2">
              {currentCredit.requirements.map((requirement) => (
                <span
                  key={`${currentCredit.id}-${requirement.type}`}
                  className={`rounded-md border px-2 py-1 text-[11px] ${
                    requirement.required
                      ? "border-[var(--color-blue)] bg-[var(--color-blue-soft)] text-[var(--color-blue)]"
                      : "border-[var(--color-border)] bg-[var(--color-surface)] text-[var(--color-text-tertiary)]"
                  }`}
                >
                  {requirement.label}
                </span>
              ))}
            </div>
          ) : null}
          <p className="mt-2 text-[11px] text-[var(--color-text-secondary)]">
            Tokens are charged only after storage upload + document save succeed.
          </p>
          {priorExamples.length ? (
            <div className="mt-2 rounded-md border border-[var(--color-border)] bg-[var(--color-surface)] p-2">
              <p className="text-[10px] uppercase tracking-[0.07em] text-[var(--color-text-tertiary)]">
                Reuse suggestion
              </p>
              <p className="mt-1 text-[11px] text-[var(--color-text-secondary)]">
                You previously uploaded approved files for this credit and document type:
              </p>
              <ul className="mt-1 list-disc pl-4 text-[11px] text-[var(--color-text-primary)]">
                {priorExamples.map((fileName) => (
                  <li key={fileName} className="truncate">
                    {fileName}
                  </li>
                ))}
              </ul>
            </div>
          ) : null}
        </div>
      ) : null}
    </form>
  );
}
