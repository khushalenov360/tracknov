"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, UploadCloud } from "lucide-react";
import { createClient } from "@/lib/supabase/browser";
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
  const maxFileSizeBytes = 50 * 1024 * 1024;
  const maxFileSizeLabel = "50 MB";
  const accept = useMemo(() => ".pdf,.png,.jpg,.jpeg,.webp,.xlsx,.xls,.dwg,.mp4,.mov", []);

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

    if (file.size > maxFileSizeBytes) {
      setError(`File is too large. The limit is ${maxFileSizeLabel}.`);
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
        credit_id: creditId,
        project_id: projectId,
        file_name: file.name,
        file_path: filePath,
        file_type: extension,
        doc_category: docType,
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
    <form onSubmit={onUpload} className="space-y-3 rounded-2xl border border-dashed border-[var(--color-border)] bg-[var(--color-surface)] p-4">
      <div className="text-center">
        <div className="mx-auto flex h-9 w-9 items-center justify-center rounded-full bg-[var(--color-green-light)] text-[var(--color-green)]">
          <UploadCloud className="h-4 w-4" />
        </div>
        <p className="mt-3 text-[11px] font-medium text-[var(--color-text-primary)]">Add a supporting file</p>
        <p className="mt-1 text-[10px] leading-5 text-[var(--color-text-tertiary)]">
          Choose the file type, upload one file, and it will appear in the project checklist. Max size: {maxFileSizeLabel}.
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
