"use client";

import React, { useState } from "react";
import { UploadCloud, CheckCircle, Database } from "lucide-react";
import { toast } from "sonner";

export default function FrameworkUploadPage() {
  const [file, setFile] = useState<File | null>(null);
  const [isParsing, setIsParsing] = useState(false);
  const [isCommitting, setIsCommitting] = useState(false);
  const [parsedCredits, setParsedCredits] = useState<any[] | null>(null);

  const handleParse = async () => {
    if (!file) return;
    setIsParsing(true);
    setParsedCredits(null);
    try {
      const formData = new FormData();
      formData.append("file", file);

      const res = await fetch("/api/admin/parse-guidebook", {
        method: "POST",
        body: formData,
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to parse guidebook");

      setParsedCredits(data.credits);
      toast.success(`Successfully extracted ${data.credits?.length} credits`);
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setIsParsing(false);
    }
  };

  const handleCommit = async () => {
    if (!parsedCredits?.length) return;
    setIsCommitting(true);
    try {
      const res = await fetch("/api/admin/commit-framework", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          rating_system_name: "IGBC Green Interiors",
          credits: parsedCredits,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to commit");

      toast.success(`Committed ${data.count} credits to the database!`);
      setParsedCredits(null);
      setFile(null);
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setIsCommitting(false);
    }
  };

  return (
    <div className="p-8 max-w-6xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-[var(--color-text-primary)]">Framework Ingestion Pipeline</h1>
        <p className="text-sm text-[var(--color-text-secondary)] mt-1">
          Upload an official IGBC Green Interiors PDF Guidebook. Our LLM will parse all credit codes, max points, and requirements to automatically build the project database.
        </p>
      </div>

      <div className="surface-card p-6 rounded-xl border border-[var(--color-border)]">
        <label className="block text-sm font-semibold text-[var(--color-text-primary)] mb-2">Upload Guidebook (PDF)</label>
        <div className="flex items-center gap-4">
          <input
            type="file"
            accept=".pdf"
            onChange={(e) => setFile(e.target.files?.[0] || null)}
            className="block w-full text-sm text-[var(--color-text-secondary)]
              file:mr-4 file:py-2 file:px-4
              file:rounded-md file:border-0
              file:text-sm file:font-semibold
              file:bg-[var(--color-surface-2)] file:text-[var(--color-text-primary)]
              hover:file:bg-[var(--color-surface-3)] cursor-pointer
              border border-[var(--color-border)] rounded-md"
          />
          <button
            onClick={handleParse}
            disabled={!file || isParsing}
            className="flex items-center gap-2 px-4 py-2 bg-[var(--color-brand)] text-white text-sm font-semibold rounded-md shadow disabled:opacity-50"
          >
            {isParsing ? "Parsing (may take 2-3 mins)..." : "Parse PDF"}
            {!isParsing && <UploadCloud className="w-4 h-4" />}
          </button>
        </div>
      </div>

      {parsedCredits && (
        <div className="surface-card rounded-xl border border-[var(--color-border)] overflow-hidden">
          <div className="flex items-center justify-between p-4 border-b border-[var(--color-border)] bg-[var(--color-surface-2)]">
            <h2 className="font-semibold text-[var(--color-text-primary)]">Parsed Review ({parsedCredits.length} Credits found)</h2>
            <button
              onClick={handleCommit}
              disabled={isCommitting}
              className="flex items-center gap-2 px-4 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-semibold rounded-md shadow disabled:opacity-50"
            >
              <Database className="w-4 h-4" />
              {isCommitting ? "Committing..." : "Commit to Database"}
            </button>
          </div>
          <div className="max-h-[600px] overflow-y-auto">
            <table className="w-full text-left text-sm border-collapse">
              <thead className="sticky top-0 bg-[var(--color-surface)] border-b border-[var(--color-border)] shadow-sm">
                <tr>
                  <th className="px-4 py-3 text-[var(--color-text-secondary)] font-medium">Category</th>
                  <th className="px-4 py-3 text-[var(--color-text-secondary)] font-medium">Code</th>
                  <th className="px-4 py-3 text-[var(--color-text-secondary)] font-medium">Name</th>
                  <th className="px-4 py-3 text-[var(--color-text-secondary)] font-medium">Type</th>
                  <th className="px-4 py-3 text-[var(--color-text-secondary)] font-medium">Pts</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--color-border)]">
                {parsedCredits.map((c, i) => (
                  <tr key={i} className="hover:bg-[var(--color-surface-2)]/50">
                    <td className="px-4 py-2 text-[var(--color-text-secondary)] truncate max-w-[150px]">{c.category}</td>
                    <td className="px-4 py-2 font-mono text-[var(--color-brand)]">{c.credit_code}</td>
                    <td className="px-4 py-2 text-[var(--color-text-primary)] font-medium">{c.credit_name}</td>
                    <td className="px-4 py-2">
                      {c.is_mandatory ? (
                        <span className="text-xs bg-rose-500/10 text-rose-500 px-2 py-0.5 rounded-full font-bold">Mandatory</span>
                      ) : (
                        <span className="text-xs bg-blue-500/10 text-blue-500 px-2 py-0.5 rounded-full font-bold">Credit</span>
                      )}
                    </td>
                    <td className="px-4 py-2 font-mono text-[var(--color-text-primary)]">
                      {c.is_mandatory ? "0" : c.max_points}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
