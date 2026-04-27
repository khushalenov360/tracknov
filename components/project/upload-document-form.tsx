"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, UploadCloud } from "lucide-react";
import { uploadDocumentAction } from "@/app/actions";
import { Button } from "@/components/ui/button";

export function UploadDocumentForm({
  projectId,
  creditId,
  docTypes,
  disabled,
}: {
  projectId: string;
  creditId: string;
  docTypes: string[];
  disabled?: boolean;
}) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [docType, setDocType] = useState(docTypes[0] ?? "Narrative");
  const maxFileSizeBytes = 10 * 1024 * 1024;
  const maxFileSizeLabel = "10 MB";
  const allowedExtensions = useMemo(() => [".pdf", ".docx", ".png", ".jpg", ".jpeg"], []);
  const accept = useMemo(() => allowedExtensions.join(","), [allowedExtensions]);

  async function onUpload(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (disabled) {
      return;
    }

    const form = event.currentTarget;
    const formData = new FormData(form);
    const file = formData.get("file");
    if (!(file instanceof File)) {
      setError("Choose a file to upload.");
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
      formData.set("project_id", projectId);
      formData.set("credit_id", creditId);
      formData.set("doc_category", docType);
      const result = await uploadDocumentAction(formData);
      if (!result.ok) {
        throw new Error(result.error ?? "Upload failed");
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
    <form onSubmit={onUpload} className="space-y-3 rounded-2xl border border-dashed border-[var(--color-border)] bg-[var(--color-surface)] p-4">
      <div className="text-center">
        <div className="mx-auto flex h-9 w-9 items-center justify-center rounded-full bg-[var(--color-green-light)] text-[var(--color-green)]">
          <UploadCloud className="h-4 w-4" />
        </div>
        <p className="mt-3 text-[11px] font-medium text-[var(--color-text-primary)]">Add a supporting file</p>
        <p className="mt-1 text-[10px] leading-5 text-[var(--color-text-tertiary)]">
          Choose the file type, upload one file, and it will appear in the project checklist. Max size: {maxFileSizeLabel}.
        </p>
        <p className="mt-1 text-[10px] leading-5 text-[var(--color-text-tertiary)]">
          For larger files, reduce PDF size or image resolution before upload.
        </p>
      </div>
      <select
        value={docType}
        onChange={(event) => setDocType(event.target.value)}
        className="h-8 w-full rounded-md border border-[var(--color-border)] bg-[var(--color-surface-2)] px-3 text-[12px] text-[var(--color-text-primary)] outline-none focus:border-[var(--color-border-strong)]"
      >
        {docTypes.map((type) => (
          <option key={type} value={type}>
            {type}
          </option>
        ))}
      </select>
      <input
        required
        name="file"
        type="file"
        accept={accept}
        className="block w-full text-[11px] text-[var(--color-text-secondary)] file:mr-3 file:rounded-full file:border file:border-[var(--color-border)] file:bg-[var(--color-surface-2)] file:px-3 file:py-1.5 file:text-[11px] file:font-medium file:text-[var(--color-text-primary)]"
      />
      {error ? <p className="text-[11px] text-[var(--color-red)]">{error}</p> : null}
      <Button type="submit" className="h-8 w-full rounded-full" disabled={loading || disabled}>
        {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
        Add file
      </Button>
    </form>
  );
}
