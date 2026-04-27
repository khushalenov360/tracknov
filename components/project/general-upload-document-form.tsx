"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, UploadCloud } from "lucide-react";
import { createClient } from "@/lib/supabase/browser";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";

type UploadProject = {
  id: string;
  name: string;
  credits: {
    id: string;
    credit_code: string;
    credit_name: string;
    doc_types: string[];
  }[];
};

export function GeneralUploadDocumentForm({
  projects,
}: {
  projects: UploadProject[];
}) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [projectId, setProjectId] = useState(projects[0]?.id ?? "");
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

  useEffect(() => {
    const nextCreditId = currentProject?.credits[0]?.id ?? "";
    setCreditId((existing) =>
      currentProject?.credits.some((credit) => credit.id === existing) ? existing : nextCreditId,
    );
  }, [currentProject]);

  useEffect(() => {
    const nextDocType = currentCredit?.doc_types[0] ?? "";
    setDocType((existing) =>
      currentCredit?.doc_types.includes(existing) ? existing : nextDocType,
    );
  }, [currentCredit]);

  async function onUpload(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    const formData = new FormData(form);
    const file = formData.get("file");
    if (!(file instanceof File) || !projectId || !creditId || !docType) {
      setError("Choose a project, mapped credit, document type, and file to upload.");
      return;
    }

    const fileNameLower = file.name.toLowerCase();
    const hasAllowedExtension = allowedExtensions.some((extension) => fileNameLower.endsWith(extension));
    if (!hasAllowedExtension) {
      setError("Unsupported file type. Upload PDF, DOCX, PNG, or JPG files only.");
      return;
    }

    if (file.size > maxFileSizeBytes) {
      setError(`File is too large. The limit is ${maxFileSizeLabel}. Compress the file and try again.`);
      return;
    }

    setLoading(true);
    setError("");
    try {
      const supabase = createClient();
      const extension = file.name.split(".").pop()?.toLowerCase() ?? "bin";
      const safeDocType = docType.replace(/[^a-z0-9]+/gi, "_").toLowerCase();
      const baseName = file.name.replace(/\.[^.]+$/, "");
      const safeBaseName = baseName.replace(/[^a-z0-9_-]+/gi, "_").replace(/_+/g, "_").slice(0, 80) || "file";
      const filePath = `${projectId}/${creditId}/${safeDocType}/${crypto.randomUUID()}-${safeBaseName}.${extension}`;

      const { error: storageError } = await supabase.storage
        .from("project-documents")
        .upload(filePath, file, { upsert: false });

      if (storageError) {
        throw storageError;
      }

      const { error: dbError } = await supabase.from("documents").insert({
        project_id: projectId,
        credit_id: creditId,
        file_name: file.name,
        file_path: filePath,
        file_type: extension,
        doc_category: docType,
        notes: String(formData.get("notes") ?? ""),
        status: "uploaded",
      });

      if (dbError) {
        throw dbError;
      }

      form.reset();
      router.refresh();
    } catch (uploadError) {
      setError(uploadError instanceof Error ? uploadError.message : "Upload failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={onUpload} className="surface-card grid gap-3 p-4 lg:grid-cols-[180px_minmax(0,1.2fr)_180px_minmax(0,1fr)_160px]">
      <select
        value={projectId}
        onChange={(event) => setProjectId(event.target.value)}
        className="h-[34px] rounded-md border border-[var(--color-border)] bg-[var(--color-surface)] px-3 text-[12px] text-[var(--color-text-primary)] outline-none focus:border-[var(--color-border-strong)]"
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
        className="h-[34px] rounded-md border border-[var(--color-border)] bg-[var(--color-surface)] px-3 text-[12px] text-[var(--color-text-primary)] outline-none focus:border-[var(--color-border-strong)]"
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
      <select
        value={docType}
        onChange={(event) => setDocType(event.target.value)}
        className="h-[34px] rounded-md border border-[var(--color-border)] bg-[var(--color-surface)] px-3 text-[12px] text-[var(--color-text-primary)] outline-none focus:border-[var(--color-border-strong)]"
        disabled={!currentCredit?.doc_types.length}
      >
        {currentCredit?.doc_types.length ? (
          currentCredit.doc_types.map((item) => (
            <option key={item} value={item}>
              {item}
            </option>
          ))
        ) : (
          <option value="">No required document types</option>
        )}
      </select>
      <div className="grid gap-2 sm:grid-cols-[minmax(0,1fr)_minmax(0,1fr)] lg:col-span-2">
        <Input name="file" type="file" accept={accept} required />
        <Textarea
          name="notes"
          placeholder="Revision notes or project context"
          className="min-h-[34px] py-2"
        />
      </div>
      <Button
        type="submit"
        className="h-[34px] rounded-md"
        disabled={loading || projects.length === 0 || !currentProject?.credits.length || !currentCredit?.doc_types.length}
      >
        {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <UploadCloud className="mr-2 h-4 w-4" />}
        Upload
      </Button>
      {error ? <p className="lg:col-span-5 text-[11px] text-[var(--color-red)]">{error}</p> : null}
      <p className="lg:col-span-5 text-[11px] text-[var(--color-text-tertiary)]">
        Upload limit: {maxFileSizeLabel}. For larger files, reduce PDF size or image resolution before upload.
      </p>
      <p className="lg:col-span-5 text-[11px] text-[var(--color-text-tertiary)]">
        Each upload is mapped to a credit immediately and enters review with the Project Owner before final Project Admin inclusion in the submission pack.
      </p>
    </form>
  );
}
