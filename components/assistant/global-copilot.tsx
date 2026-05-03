"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { usePathname } from "next/navigation";
import { Bot, ChevronLeft, ChevronRight, Send, Sparkles, Settings } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import type { AssistantContext, AssistantMessage, AssistantSurface } from "@/lib/assistant";
import type { MemberRole } from "@/lib/types";

type AssistantTone = "Auto" | "Executive" | "Guided" | "Fast";
type CopilotAttachment = {
  name: string;
  mimeType: string;
  size: number;
  base64: string;
};
type CopilotCreditOption = { id: string; code: string; name: string };
type FormFieldMeta = {
  key: string;
  label: string;
  type: string;
  placeholder?: string;
};

type GlobalCopilotProps = {
  enabled: boolean;
  role?: MemberRole;
  title: string;
  description: string;
};

function mapSurface(pathname: string): AssistantSurface {
  if (pathname.startsWith("/projects/") && pathname !== "/projects") {
    return "project";
  }
  if (pathname.startsWith("/projects")) {
    return "projects";
  }
  if (pathname.startsWith("/documents")) {
    return "documents";
  }
  if (pathname.startsWith("/credits")) {
    return "credits";
  }
  if (pathname.startsWith("/team")) {
    return "team";
  }
  return "dashboard";
}

function loadMessages(storageKey: string, fallback: AssistantMessage[]) {
  if (typeof window === "undefined") {
    return fallback;
  }

  try {
    const raw = window.localStorage.getItem(storageKey);
    if (!raw) {
      return fallback;
    }
    const parsed = JSON.parse(raw) as AssistantMessage[];
    if (!Array.isArray(parsed) || !parsed.length) {
      return fallback;
    }
    return parsed.filter(
      (item): item is AssistantMessage =>
        Boolean(item && (item.role === "user" || item.role === "assistant") && typeof item.content === "string"),
    );
  } catch {
    return fallback;
  }
}

export function GlobalCopilot({ enabled, role, title, description }: GlobalCopilotProps) {
  const pathname = usePathname();
  const surface = mapSurface(pathname);
  const storageKey = "tracknov-global-copilot:history";
  const collapseKey = "tracknov-global-copilot-collapsed";
  const bottomRef = useRef<HTMLDivElement | null>(null);
  const uploadInputRef = useRef<HTMLInputElement | null>(null);

  const context = useMemo<AssistantContext>(
    () => ({
      surface,
      title,
      summary: description,
      currentItem: pathname,
      facts: [
        `Current tab: ${surface}`,
        `Role: ${role ?? "unknown"}`,
        `Page title: ${title}`,
      ],
      nextSteps: [
        "Identify the highest-impact action for the current page.",
        "Call out blockers and missing documentation.",
        "Recommend the exact next update in Tracknov.",
      ],
    }),
    [description, pathname, role, surface, title],
  );

  const [collapsed, setCollapsed] = useState(false);
  const [userName, setUserName] = useState<string>("");
  const [messages, setMessages] = useState<AssistantMessage[]>([]);
  const [input, setInput] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [selectedTone, setSelectedTone] = useState<AssistantTone>("Auto");
  const [showSettings, setShowSettings] = useState(false);
  const [attachment, setAttachment] = useState<CopilotAttachment | null>(null);
  const [attachmentFile, setAttachmentFile] = useState<File | null>(null);
  const [fillingForm, setFillingForm] = useState(false);
  const [analysisSummary, setAnalysisSummary] = useState("");
  const [availableCredits, setAvailableCredits] = useState<CopilotCreditOption[]>([]);
  const [uploadMode, setUploadMode] = useState<"document" | "guidebook" | "tracker">("document");

  const canManageGuidebookTracker = ["super_user", "project_admin"].includes(role ?? "");
  const docCategories = ["Narrative", "Tech Spec", "Certificate/Declaration", "Drawing", "Calculation & Tables", "Invoice", "Pic/Video"];

  function parseUploadIntentFromChat(text: string) {
    const lower = text.toLowerCase();
    const mode: "document" | "guidebook" | "tracker" =
      lower.includes("guidebook") && canManageGuidebookTracker
        ? "guidebook"
        : lower.includes("tracker") && canManageGuidebookTracker
          ? "tracker"
          : "document";

    const pickedDocCategory =
      docCategories.find((category) => lower.includes(category.toLowerCase())) ?? "Narrative";

    const credit =
      availableCredits.find((candidate) => lower.includes(candidate.code.toLowerCase())) ??
      availableCredits.find((candidate) => lower.includes(candidate.name.toLowerCase()));

    return {
      mode,
      creditId: credit?.id ?? "",
      docCategory: pickedDocCategory,
    };
  }

  useEffect(() => {
    async function fetchProfile() {
      try {
        const response = await fetch("/api/me");
        if (response.ok) {
          const data = await response.json();
          setUserName(data.name);
        }
      } catch (err) {
        console.error("Failed to fetch user profile", err);
      }
    }
    fetchProfile();
  }, []);

  const personalizedGreeting = useMemo(() => {
    const greeting = userName ? `Hi ${userName} 👋` : "Hi there 👋";
    return `${greeting}. I can help you work through ${title} step by step.`;
  }, [userName, title]);

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }
    setCollapsed(window.localStorage.getItem(collapseKey) === "1");
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }
    window.localStorage.setItem(collapseKey, collapsed ? "1" : "0");
  }, [collapsed]);

  useEffect(() => {
    const history = loadMessages(storageKey, []);
    if (history.length === 0) {
      setMessages([{ role: "assistant", content: personalizedGreeting }]);
    } else {
      setMessages(history);
    }
  }, [personalizedGreeting, storageKey]);

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }
    window.localStorage.setItem(storageKey, JSON.stringify(messages));
  }, [messages, storageKey]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [messages, loading]);

  async function readStream(response: Response, onChunk: (chunk: string) => void) {
    if (!response.body) {
      onChunk(await response.text());
      return;
    }

    const reader = response.body.getReader();
    const decoder = new TextDecoder();

    while (true) {
      const { done, value } = await reader.read();
      if (done) {
        break;
      }
      const text = decoder.decode(value, { stream: true });
      if (text) {
        onChunk(text);
      }
    }

    const tail = decoder.decode();
    if (tail) {
      onChunk(tail);
    }
  }

  async function sendPrompt(prompt: string) {
    const text = prompt.trim();
    if (!text || loading) {
      return;
    }

    setError("");
    setLoading(true);

    // Track interaction
    void fetch("/api/assistant/track", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        type: "query",
        metadata: { query: text, surface, title },
      }),
    }).catch(() => {});

    const nextMessages: AssistantMessage[] = [
      ...messages,
      { role: "user", content: text },
      { role: "assistant", content: "" },
    ];
    setMessages(nextMessages);
    setInput("");

    try {
      const response = await fetch("/api/assistant", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          context,
          messages: nextMessages.slice(0, -1),
          tone: selectedTone !== "Auto" ? selectedTone : undefined,
          attachments: attachment ? [attachment] : [],
        }),
      });

      if (!response.ok) {
        const payload = (await response.json().catch(() => ({}))) as { error?: string };
        throw new Error(payload.error ?? "Copilot request failed.");
      }

      let assistantText = "";
      await readStream(response, (chunk) => {
        assistantText += chunk;
        setMessages((current) => {
          const copy = [...current];
          copy[copy.length - 1] = { role: "assistant", content: assistantText };
          return copy;
        });
      });
      setAttachment(null);
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "Copilot request failed.");
      setMessages((current) => current.slice(0, -1));
    } finally {
      setLoading(false);
    }
  }

  function collectVisibleFormFields(): FormFieldMeta[] {
    const controls = Array.from(document.querySelectorAll("input, textarea, select")) as Array<
      HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement
    >;
    const fields: FormFieldMeta[] = [];

    for (const control of controls) {
      if (control.disabled) {
        continue;
      }
      const rect = control.getBoundingClientRect();
      if (rect.width === 0 || rect.height === 0) {
        continue;
      }
      const type = control instanceof HTMLSelectElement ? "select" : control.type || control.tagName.toLowerCase();
      if (type === "hidden" || type === "password" || type === "file") {
        continue;
      }
      const idKey = control.getAttribute("name") || control.getAttribute("id") || control.getAttribute("aria-label");
      if (!idKey) {
        continue;
      }
      const linkedLabel =
        (control.getAttribute("id") && document.querySelector(`label[for="${control.getAttribute("id")}"]`)?.textContent) ||
        control.closest("label")?.textContent ||
        control.getAttribute("aria-label") ||
        control.getAttribute("placeholder") ||
        idKey;
      fields.push({
        key: idKey.trim(),
        label: linkedLabel.trim(),
        type,
        placeholder: "placeholder" in control ? control.placeholder : undefined,
      });
    }

    return fields.slice(0, 40);
  }

  function parseJsonObject(text: string): Record<string, string> | null {
    const start = text.indexOf("{");
    const end = text.lastIndexOf("}");
    if (start === -1 || end === -1 || end <= start) {
      return null;
    }
    try {
      const parsed = JSON.parse(text.slice(start, end + 1)) as Record<string, unknown>;
      const values: Record<string, string> = {};
      for (const [key, value] of Object.entries(parsed)) {
        if (typeof value === "string" && value.trim()) {
          values[key] = value.trim();
        }
      }
      return values;
    } catch {
      return null;
    }
  }

  function applyFormValues(values: Record<string, string>) {
    let applied = 0;
    for (const [fieldKey, value] of Object.entries(values)) {
      const selector = `[name="${fieldKey}"], #${CSS.escape(fieldKey)}, [aria-label="${fieldKey}"]`;
      const target = document.querySelector(selector) as HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement | null;
      if (!target || target.disabled) {
        continue;
      }
      if (target instanceof HTMLSelectElement) {
        const option = Array.from(target.options).find((opt) => opt.value === value || opt.text.trim().toLowerCase() === value.toLowerCase());
        if (option) {
          target.value = option.value;
          target.dispatchEvent(new Event("change", { bubbles: true }));
          applied += 1;
        }
        continue;
      }
      target.value = value;
      target.dispatchEvent(new Event("input", { bubbles: true }));
      target.dispatchEvent(new Event("change", { bubbles: true }));
      applied += 1;
    }
    return applied;
  }

  async function assistFormFill() {
    if (loading || fillingForm) {
      return;
    }
    const fields = collectVisibleFormFields();
    if (!fields.length) {
      setError("No editable form fields found on this page.");
      return;
    }
    const userGoal = input.trim() || "Fill this form with sensible values based on current page context.";
    setFillingForm(true);
    setError("");
    try {
      const assistPrompt = `${userGoal}

You are helping fill a web form.
Return ONLY a JSON object mapping field keys to values.
Do not include markdown or explanation.
Only include fields you are confident about.

Form fields:
${fields.map((field) => `- key="${field.key}" label="${field.label}" type="${field.type}" placeholder="${field.placeholder ?? ""}"`).join("\n")}`;

      const response = await fetch("/api/assistant", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          context,
          messages: [{ role: "user", content: assistPrompt }],
          tone: "Guided",
        }),
      });
      if (!response.ok) {
        throw new Error("Copilot could not generate form suggestions.");
      }
      const raw = await response.text();
      const parsed = parseJsonObject(raw);
      if (!parsed || Object.keys(parsed).length === 0) {
        throw new Error("Copilot returned no usable form suggestions.");
      }
      const count = applyFormValues(parsed);
      if (count === 0) {
        throw new Error("No matching form fields were updated.");
      }
      setMessages((current) => [
        ...current,
        { role: "assistant", content: `I filled ${count} form fields for you. Please review before submitting.` },
      ]);
    } catch (formError) {
      setError(formError instanceof Error ? formError.message : "Could not assist with form filling.");
    } finally {
      setFillingForm(false);
    }
  }

  function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    void sendPrompt(input);
  }

  async function onFilePicked(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) {
      return;
    }
    try {
      const bytes = await file.arrayBuffer();
      let binary = "";
      const view = new Uint8Array(bytes);
      for (let i = 0; i < view.length; i += 1) {
        binary += String.fromCharCode(view[i]);
      }
      setAttachment({
        name: file.name,
        mimeType: file.type || "application/octet-stream",
        size: file.size,
        base64: btoa(binary),
      });
      setAttachmentFile(file);
      setError("");

      const match = pathname.match(/^\/projects\/([^/]+)/);
      const projectId = match?.[1];
      if (projectId) {
        const creditsResponse = await fetch(`/api/assistant/project-upload?project_id=${encodeURIComponent(projectId)}`);
        if (creditsResponse.ok) {
          const creditsPayload = (await creditsResponse.json()) as { credits?: CopilotCreditOption[] };
          setAvailableCredits(creditsPayload.credits ?? []);
        }
      }

      const extension = file.name.split(".").pop()?.toLowerCase() ?? "";
      if (extension === "xlsx" || extension === "xls") {
        setUploadMode("tracker");
      } else if (extension === "pdf" && canManageGuidebookTracker) {
        setUploadMode("guidebook");
      } else {
        setUploadMode("document");
      }

      const analysisPrompt = `You are helping a user after they attached a file in Tracknov.
Write a natural, human response (not a rigid template) with:
- detected document type
- most important data points found
- likely credit matches (with confidence wording)

Important:
- be explicit this is analysis of the attached chat file.
- do not claim this file is already uploaded to project workflow.
- end with one clear follow-up question asking where the user wants to map this file.`;
      const response = await fetch("/api/assistant", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          context,
          messages: [{ role: "user", content: analysisPrompt }],
          tone: "Guided",
          attachments: [{
            name: file.name,
            mimeType: file.type || "application/octet-stream",
            size: file.size,
            base64: btoa(binary),
          }],
        }),
      });
      if (response.ok) {
        const summary = await response.text();
        const trimmed = summary.trim();
        if (trimmed) {
          setAnalysisSummary(trimmed);
          setMessages((current) => [...current, { role: "assistant", content: trimmed }]);
        }
      }
    } catch {
      setError("Could not read the selected file.");
    } finally {
      event.target.value = "";
    }
  }

  async function uploadAttachmentToProject() {
    if (!attachmentFile) {
      setError("Attach a file first.");
      return;
    }
    const match = pathname.match(/^\/projects\/([^/]+)/);
    const projectId = match?.[1];
    if (!projectId) {
      setError("Open a project workspace to upload this file to project context.");
      return;
    }

    const intentSource =
      input.trim() ||
      [...messages].reverse().find((message) => message.role === "user")?.content ||
      "";
    const intent = parseUploadIntentFromChat(intentSource);
    const effectiveMode = uploadMode === "document" ? intent.mode : uploadMode;

    if (effectiveMode === "document" && !intent.creditId) {
      setError("Tell Copilot where to map this file, e.g. 'Map to EDA C1 as Drawing and upload'.");
      return;
    }

    setLoading(true);
    setError("");
    try {
      const formData = new FormData();
      formData.append("project_id", projectId);
      formData.append("file", attachmentFile);
      formData.append("title", attachmentFile.name.replace(/\.[^.]+$/, ""));
      formData.append("mode", effectiveMode);
      if (effectiveMode === "document") {
        formData.append("credit_id", intent.creditId);
        formData.append("doc_category", intent.docCategory);
      }

      const response = await fetch("/api/assistant/project-upload", {
        method: "POST",
        body: formData,
      });
      const payload = (await response.json().catch(() => ({}))) as { ok?: boolean; error?: string; mode?: string };
      if (!response.ok || !payload.ok) {
        throw new Error(payload.error ?? "Upload failed.");
      }

      setMessages((current) => [
        ...current,
        {
          role: "assistant",
          content:
            payload.mode === "guidebook"
              ? "Guidebook uploaded successfully. Workspace instantiation has been triggered."
              : payload.mode === "tracker"
                ? "Tracker baseline uploaded successfully and mapped to project credits."
                : "Document uploaded and mapped from your chat instruction. It has entered the workflow review queue.",
        },
      ]);
      setAttachment(null);
      setAttachmentFile(null);
      setAnalysisSummary("");
    } catch (uploadError) {
      setError(uploadError instanceof Error ? uploadError.message : "Upload failed.");
    } finally {
      setLoading(false);
    }
  }

  if (collapsed) {
    return (
      <button
        type="button"
        onClick={() => setCollapsed(false)}
        className="fixed bottom-4 right-4 z-50 inline-flex items-center gap-2 rounded-full border border-[var(--color-border)] bg-[var(--color-surface)] px-3 py-2 text-[12px] shadow-[0_12px_30px_rgba(0,0,0,0.16)] hover:bg-[var(--color-surface-2)]"
      >
        <Bot className="h-4 w-4 text-[var(--color-green)]" />
        Copilot
        <ChevronLeft className="h-4 w-4 text-[var(--color-text-tertiary)]" />
      </button>
    );
  }

  return (
    <aside className="fixed bottom-4 right-4 top-[72px] z-50 w-[min(420px,calc(100vw-1.5rem))] overflow-hidden rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] shadow-[0_20px_50px_rgba(0,0,0,0.24)]">
      <div className="flex items-center justify-between border-b border-[var(--color-border)] bg-[var(--color-surface-2)] px-3 py-2.5">
        <div className="flex min-w-0 items-center gap-2">
          <span className="flex h-7 w-7 items-center justify-center rounded-full bg-[var(--color-green-light)] text-[var(--color-green)]">
            <Sparkles className="h-3.5 w-3.5" />
          </span>
          <div className="min-w-0">
            <p className="truncate text-[12px] font-medium text-[var(--color-text-primary)]">Tracknov Copilot</p>
            <p className="truncate text-[10px] text-[var(--color-text-tertiary)]">{enabled ? `Gemini ready • ${selectedTone}` : "Fallback guidance mode"}</p>
          </div>
        </div>
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={() => setShowSettings(!showSettings)}
            className={`rounded-md p-1 hover:bg-[var(--color-surface)] ${showSettings ? "text-[var(--color-blue)]" : "text-[var(--color-text-tertiary)]"}`}
            title="Copilot Settings"
          >
            <Settings className="h-4 w-4" />
          </button>
          <button
            type="button"
            onClick={() => setCollapsed(true)}
            className="rounded-md p-1 text-[var(--color-text-tertiary)] hover:bg-[var(--color-surface)] hover:text-[var(--color-text-primary)]"
            aria-label="Collapse Copilot"
          >
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>
      </div>

      {showSettings && (
        <div className="border-b border-[var(--color-border)] bg-[var(--color-surface)] px-3 py-2 animate-in fade-in slide-in-from-top-1">
          <p className="mb-2 text-[10px] font-medium text-[var(--color-text-secondary)] uppercase tracking-wider">Response Tone</p>
          <div className="flex gap-1">
            {(["Auto", "Executive", "Guided", "Fast"] as AssistantTone[]).map((t) => (
              <button
                key={t}
                onClick={() => {
                  setSelectedTone(t);
                  setShowSettings(false);
                }}
                className={`flex-1 rounded px-2 py-1 text-[10px] font-medium transition-colors ${
                  selectedTone === t 
                    ? "bg-[var(--color-blue-light)] text-[var(--color-blue)]" 
                    : "bg-[var(--color-surface-2)] text-[var(--color-text-secondary)] hover:bg-[var(--color-surface-3)]"
                }`}
              >
                {t}
              </button>
            ))}
          </div>
        </div>
      )}

      <div className="flex h-[calc(100%-49px)] flex-col">
        <div className="flex-1 space-y-3 overflow-y-auto px-3 py-3">
          {messages.map((message, index) => (
            <div
              key={`${message.role}-${index}`}
              className={`max-w-[94%] rounded-xl border px-3 py-2 text-[12px] leading-6 ${
                message.role === "user"
                  ? "ml-auto border-[var(--color-blue-light)] bg-[var(--color-blue-light)] text-[var(--color-blue)]"
                  : "border-[var(--color-border)] bg-[var(--color-surface-2)] text-[var(--color-text-primary)]"
              }`}
            >
              <p className="whitespace-pre-wrap">{message.content}</p>
            </div>
          ))}
          {loading ? (
            <p className="text-[11px] text-[var(--color-text-tertiary)]">Copilot is thinking...</p>
          ) : null}
          <div ref={bottomRef} />
        </div>

        <div className="space-y-2 border-t border-[var(--color-border)] px-3 py-3">
          <form onSubmit={onSubmit} className="space-y-2">
            <div className="space-y-2">
              <input ref={uploadInputRef} type="file" onChange={onFilePicked} className="hidden" />
              <div className="grid grid-cols-2 gap-2">
                <Button
                  type="button"
                  variant="secondary"
                  className="h-8 rounded-md"
                  onClick={() => uploadInputRef.current?.click()}
                >
                  Attach File
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  className="h-8 rounded-md"
                  onClick={() => void uploadAttachmentToProject()}
                >
                  Upload To Project
                </Button>
              </div>
            {attachment ? (
                <p className="text-[10px] text-[var(--color-text-tertiary)]">
                  Attached to Copilot: {attachment.name} ({Math.max(1, Math.round(attachment.size / 1024))} KB)
                </p>
              ) : null}
              {analysisSummary ? (
                <div className="rounded-md border border-[var(--color-border)] bg-[var(--color-surface-2)] p-2 text-[10px] text-[var(--color-text-secondary)] max-h-28 overflow-y-auto">
                  {analysisSummary}
                </div>
              ) : null}
              <p className="text-[10px] text-[var(--color-text-secondary)]">
                Confirm mapping in chat and Copilot will upload to the workflow.
                {canManageGuidebookTracker ? " Project Admin/Super User can also ask to upload as guidebook or import as tracker." : ""}
              </p>
            </div>
            <Textarea
              value={input}
              onChange={(event) => setInput(event.target.value)}
              placeholder="Ask Copilot..."
              className="min-h-[84px] resize-none"
            />
            {error ? <p className="text-[11px] text-[var(--color-red)]">{error}</p> : null}
            <Button type="button" variant="secondary" className="h-8 w-full rounded-md" disabled={loading || fillingForm} onClick={() => void assistFormFill()}>
              {fillingForm ? "Filling form..." : "Fill Form With Copilot"}
            </Button>
            <Button type="submit" className="h-8 w-full rounded-md" disabled={!input.trim() || loading}>
              <Send className="mr-2 h-3.5 w-3.5" />
              Ask Copilot
            </Button>
          </form>
        </div>
      </div>
    </aside>
  );
}
