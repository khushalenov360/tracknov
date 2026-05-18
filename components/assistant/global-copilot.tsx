"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { Bot, ChevronLeft, ChevronRight, Plus, Send, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import type { AssistantContext, AssistantMessage, AssistantSurface } from "@/lib/assistant";
import type { MemberRole } from "@/lib/types";
import { sessionMemory } from "@/lib/services/session-memory-service";

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

// Operational AI skills surfaced as quick-fire chips in the Copilot
const OPERATIONAL_SKILLS = [
  {
    id: "blockers",
    label: "⚠️ Show Blockers",
    command: "Show blockers",
    prompt: "Show me all high-risk blockers and stalled items across all active projects. Summarise what needs immediate attention and who is responsible.",
  },
  {
    id: "readiness",
    label: "📊 Readiness Preflight",
    command: "Generate readiness summary",
    prompt: "Generate a submission readiness preflight report. Include overall confidence, hotspots, and the top 3 actions needed to unblock submission.",
  },
  {
    id: "queue",
    label: "📥 My Action Queue",
    command: "Show my action queue",
    prompt: "What are the most urgent items in my action queue right now? List them by priority and tell me which to tackle first.",
  },
  {
    id: "reset",
    label: "🔄 Reset Filters",
    command: "reset",
    prompt: "", // special: no AI message, just resets queue
  },
] as const;

type GlobalCopilotProps = {
  enabled: boolean;
  role?: MemberRole;
  title: string;
  description: string;
  persistent?: boolean;
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

export function GlobalCopilot({ enabled, role, title, description, persistent }: GlobalCopilotProps) {
  const pathname = usePathname();
  const router = useRouter();
  const surface = mapSurface(pathname);
  const storageKey = "tracknov-harita:history";
  const collapseKey = "tracknov-harita-collapsed";
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
        // SECTION 9: Inject session memory facts for context continuity
        ...sessionMemory.buildContextFacts(),
      ],
      nextSteps: [
        "Answer the user's exact question first.",
        "Use the attached file before generic guidance.",
        "Suggest one concrete workflow action.",
      ],
    }),
    [description, pathname, role, surface, title],
  );

  const [collapsed, setCollapsed] = useState(false);
  const [userName, setUserName] = useState<string>("");
  const [messages, setMessages] = useState<AssistantMessage[]>([]);
  const [historyLoaded, setHistoryLoaded] = useState(false);
  const [input, setInput] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [selectedTone, setSelectedTone] = useState<AssistantTone>("Auto");
  const [showAttachMenu, setShowAttachMenu] = useState(false);
  const [attachment, setAttachment] = useState<CopilotAttachment | null>(null);
  const [attachmentFile, setAttachmentFile] = useState<File | null>(null);
  const [fillingForm, setFillingForm] = useState(false);
  const [availableCredits, setAvailableCredits] = useState<CopilotCreditOption[]>([]);
  const [uploadMode, setUploadMode] = useState<"document" | "guidebook" | "tracker">("document");
  const [pickedIntent, setPickedIntent] = useState<"analysis" | "workflow" | null>(null);

  const canManageGuidebookTracker = ["super_user", "project_admin"].includes(role ?? "");
  const docCategories = ["Narrative", "Tech Spec", "Certificate/Declaration", "Drawing", "Calculation & Tables", "Invoice", "Pic/Video"];

  function isAnalysisPrompt(text: string) {
    const lower = text.toLowerCase();
    return (
      lower.includes("analy") ||
      lower.includes("analyse") ||
      lower.includes("explain the file") ||
      lower.includes("explain this file") ||
      lower.includes("what is this file") ||
      lower.includes("tell me about this file") ||
      lower.includes("read this file")
    );
  }

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

  function shouldAttemptProjectUpload(text: string) {
    const lower = text.toLowerCase().trim();
    const hasMapIntent =
      lower.includes("map this to") ||
      lower.includes("map to ") ||
      lower.includes("upload to workflow") ||
      lower.includes("submit this file");
    const hasExplicitConfirm =
      lower.includes("confirm") ||
      lower.includes("and upload") ||
      lower.includes("yes upload") ||
      lower.includes("proceed upload");
    return hasMapIntent && hasExplicitConfirm && !isAnalysisPrompt(text);
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

  // SECTION 9: Auto-detect active project from URL and store in session memory
  useEffect(() => {
    const match = pathname.match(/^\/projects\/([^/?#]+)/);
    if (match?.[1]) {
      // Extract project name from page title if available
      sessionMemory.setActiveProject(match[1], title || match[1]);
    }
  }, [pathname, title]);

  const personalizedGreeting = useMemo(() => {
    const greeting = userName ? `Hi ${userName}` : "Hi there";
    return `${greeting}. How can I help you today?`;
  }, [userName]);

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
    setHistoryLoaded(true);
  }, [personalizedGreeting, storageKey]);

  useEffect(() => {
    if (!historyLoaded || typeof window === "undefined") {
      return;
    }
    window.localStorage.setItem(storageKey, JSON.stringify(messages));
  }, [messages, storageKey, historyLoaded]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [messages, loading]);

  useEffect(() => {
    function handleClickOutside() {
      setShowAttachMenu(false);
    }
    if (showAttachMenu) {
      window.addEventListener("click", handleClickOutside);
    }
    return () => {
      window.removeEventListener("click", handleClickOutside);
    };
  }, [showAttachMenu]);

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

    if (attachmentFile && shouldAttemptProjectUpload(text)) {
      const uploaded = await uploadAttachmentToProject(text);
      if (uploaded) {
        setInput("");
      }
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
      const requestMessages = [...nextMessages.slice(0, -1)];
      if (attachmentFile && isAnalysisPrompt(text)) {
        requestMessages[requestMessages.length - 1] = {
          role: "user",
          content: [
            "Please analyze the attached file and answer naturally.",
            "Respond with: document type detected, key data points, and likely credit matches with confidence.",
            "Then ask one short follow-up question to confirm mapping and upload.",
            "",
            `User request: ${text}`,
          ].join("\n"),
        };
      }

      const response = await fetch("/api/assistant", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          context,
          messages: requestMessages,
          tone: selectedTone !== "Auto" ? selectedTone : undefined,
          attachments: attachment ? [attachment] : [],
          idempotencyKey: crypto.randomUUID(),
        }),
      });

      if (!response.ok) {
        const payload = (await response.json().catch(() => ({}))) as { error?: string };
        throw new Error(payload.error ?? "Harita request failed.");
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

      const sanitized = assistantText.replace(/\s+/g, " ").toLowerCase();
      const refusalLike =
        sanitized.includes("i can't") ||
        sanitized.includes("i cannot") ||
        sanitized.includes("i do not have the ability") ||
        sanitized.includes("as an ai assistant");

      if (refusalLike && attachmentFile) {
        setMessages((current) => {
          const copy = [...current];
          copy[copy.length - 1] = {
            role: "assistant",
            content:
              "Got it — I can handle this here in chat. Tell me which credit and document type you want, and I’ll upload it to workflow.",
          };
          return copy;
        });
      }

      const navigateTo = response.headers.get("X-Copilot-Navigate");
      if (navigateTo) {
        router.push(navigateTo);
      }
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "Harita request failed.");
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
    const codeFenceMatch = text.match(/```(?:json)?\s*([\s\S]*?)\s*```/i);
    const candidate = codeFenceMatch?.[1] ?? text;
    const start = candidate.indexOf("{");
    const end = candidate.lastIndexOf("}");
    if (start === -1 || end === -1 || end <= start) {
      return null;
    }
    try {
      const parsed = JSON.parse(candidate.slice(start, end + 1)) as Record<string, unknown>;
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

  function parseKeyValueSuggestions(text: string, fields: FormFieldMeta[]): Record<string, string> | null {
    const lines = text
      .split(/\r?\n/)
      .map((line) => line.trim())
      .filter(Boolean);
    if (!lines.length) return null;

    const fieldMap = new Map<string, string>();
    for (const field of fields) {
      fieldMap.set(field.key.toLowerCase(), field.key);
      fieldMap.set(field.label.toLowerCase(), field.key);
    }

    const out: Record<string, string> = {};
    for (const rawLine of lines) {
      const line = rawLine.replace(/^[-*]\s*/, "");
      const sep = line.includes(":") ? ":" : line.includes("=") ? "=" : null;
      if (!sep) continue;
      const [left, ...rest] = line.split(sep);
      const right = rest.join(sep).trim();
      const lookup = left.trim().toLowerCase();
      const key = fieldMap.get(lookup);
      if (key && right) out[key] = right.replace(/^["'`]|["'`]$/g, "").trim();
    }
    return Object.keys(out).length ? out : null;
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
        throw new Error("Harita could not generate form suggestions.");
      }
      const raw = await response.text();
      const parsed = parseJsonObject(raw) ?? parseKeyValueSuggestions(raw, fields);
      if (!parsed || Object.keys(parsed).length === 0) {
        throw new Error("Harita could not map suggestions to visible fields. Please provide one-line mapping like: field_name: value.");
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

      // Phase 3: Only trigger analysis if intent is 'analysis' or 'ambiguous' (null)
      if (pickedIntent === "workflow") {
        setMessages((current) => [...current, { 
          role: "assistant", 
          content: `I've attached "${file.name}" for workflow upload. Tell me which credit it belongs to and the document type (e.g. Drawing, Narrative), then say "Confirm upload".` 
        }]);
        return;
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
          messages: [...messages, { role: "user", content: analysisPrompt }],
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
          setMessages((current) => [...current, { role: "assistant", content: trimmed }]);
          // SECTION 9 & Phase 3: Store analysis summary in session memory
          sessionMemory.setLastAnalyzedFile(file.name, trimmed);
        }
      }
    } catch {
      setError("Could not read the selected file.");
    } finally {
      event.target.value = "";
    }
  }

  function clearHistory() {
    setMessages([{ role: "assistant", content: personalizedGreeting }]);
    setAttachment(null);
    setAttachmentFile(null);
    setInput("");
    setError("");
    // SECTION 9 & Phase 3: Clear session memory on "New Chat"
    sessionMemory.clear();
    // Also clear localStorage history
    if (typeof window !== "undefined") {
      window.localStorage.removeItem(storageKey);
    }
  }

  async function uploadAttachmentToProject(intentSource: string) {
    if (!attachmentFile) {
      setError("Attach a file first.");
      return false;
    }
    const match = pathname.match(/^\/projects\/([^/]+)/);
    const projectId = match?.[1];
    if (!projectId) {
      setError("Open a project workspace to upload this file to project context.");
      return false;
    }
    const intent = parseUploadIntentFromChat(intentSource);
    const effectiveMode = uploadMode === "document" ? intent.mode : uploadMode;

    if (effectiveMode === "document" && !intent.creditId) {
      setMessages((current) => [
        ...current,
        {
          role: "assistant",
          content:
            "Sure — which credit should I map this file to? Also tell me the document type (for example: Drawing, Narrative, Invoice, Certificate), then confirm with 'Confirm upload'.",
        },
      ]);
      return false;
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
      return true;
    } catch (uploadError) {
      setError(uploadError instanceof Error ? uploadError.message : "Upload failed.");
      return false;
    } finally {
      setLoading(false);
    }
  }

  // Enabled for all users as requested.

  if (persistent) {
    return (
      <div className="flex flex-col h-full w-full bg-[var(--color-surface)]">
        <div className="flex items-center justify-between border-b border-[var(--color-border)] bg-[var(--color-surface-2)] px-3 py-2.5 shrink-0">
          <div className="flex min-w-0 items-center gap-2">
            <span className="flex h-7 w-7 items-center justify-center rounded-full bg-[var(--color-green-light)] text-[var(--color-green)]">
              <Sparkles className="h-3.5 w-3.5" />
            </span>
            <div className="min-w-0">
              <p className="truncate text-[12px] font-medium text-[var(--color-text-primary)] inline-flex items-center gap-1.5">
                <span
                  className={`inline-block h-2 w-2 rounded-full ${enabled ? "bg-emerald-500" : "bg-red-500"}`}
                  aria-label={enabled ? "AI online" : "AI offline"}
                  title={enabled ? "AI online" : "AI offline"}
                />
              Harita
              </p>
              <p className="truncate text-[10px] text-[var(--color-text-tertiary)]">{enabled ? `Harita ready • ${selectedTone}` : "Fallback guidance mode"}</p>
            </div>
          </div>
          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={clearHistory}
              className="rounded-md p-1 text-[var(--color-text-tertiary)] hover:bg-[var(--color-surface)] hover:text-[var(--color-text-primary)]"
              title="New Chat"
              aria-label="New Chat"
            >
              <Plus className="h-4 w-4" />
            </button>
          </div>
        </div>

        {/* Operational AI Skill Chips */}
        <div className="flex flex-wrap gap-1.5 px-3 py-2 border-b border-[var(--color-border)] bg-[var(--color-surface-2)] shrink-0">
          <span className="w-full text-[9px] font-black uppercase tracking-widest text-[var(--color-text-tertiary)] mb-0.5">Operational Skills</span>
          {OPERATIONAL_SKILLS.map((skill) => (
            <button
              key={skill.id}
              type="button"
              onClick={() => {
                // Dispatch event to CommandCenter queue filter
                window.dispatchEvent(
                  new CustomEvent("copilot:operational-command", { detail: { command: skill.command } })
                );
                // If there's a Copilot prompt, inject it as a user message
                if (skill.prompt) {
                  void sendPrompt(skill.prompt);
                }
              }}
              className="inline-flex items-center gap-1 px-2 py-1 rounded-lg text-[10px] font-semibold border border-[var(--color-border)] bg-[var(--color-surface)] text-[var(--color-text-secondary)] hover:bg-[var(--color-surface-3)] hover:text-[var(--color-text-primary)] hover:border-[var(--color-border-strong)] transition-all"
            >
              {skill.label}
            </button>
          ))}
        </div>

        <div className="flex-1 space-y-3 overflow-y-auto px-3 py-3 min-h-0">
          {messages.map((message, index) => (
            <div
              key={`${message.role}-${index}`}
              className={`max-w-[94%] rounded-xl border px-3 py-2 text-[12px] leading-relaxed ${
                message.role === "user"
                  ? "ml-auto border-[var(--color-blue-light)] bg-[var(--color-blue-light)] text-[var(--color-blue)]"
                  : "border-[var(--color-border)] bg-[var(--color-surface-2)] text-[var(--color-text-primary)]"
              }`}
            >
              <p className="whitespace-pre-wrap">{message.content}</p>
            </div>
          ))}
          {loading ? (
            <p className="text-[11px] text-[var(--color-text-tertiary)] italic">Harita is thinking...</p>
          ) : null}
          <div ref={bottomRef} />
        </div>

        <div className="space-y-2 border-t border-[var(--color-border)] px-3 py-3 bg-[var(--color-surface)] shrink-0">
          <form onSubmit={onSubmit} className="space-y-2">
            <div className="space-y-2 relative">
              <input ref={uploadInputRef} type="file" onChange={onFilePicked} className="hidden" />

              {attachment ? (
                <div className="rounded-lg border border-[var(--color-border)] bg-[var(--color-surface-2)] px-2 py-1.5 text-[10px] text-[var(--color-text-tertiary)]">
                  Attached: {attachment.name} ({Math.max(1, Math.round(attachment.size / 1024))} KB)
                </div>
              ) : null}

              <div className="flex items-end gap-2">
                <button
                  type="button"
                  onClick={(event) => {
                    event.stopPropagation();
                    setShowAttachMenu((current) => !current);
                  }}
                  className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-[var(--color-border)] bg-[var(--color-surface-2)] text-[var(--color-text-secondary)] hover:bg-[var(--color-surface-3)]"
                  aria-label="Open attachment menu"
                >
                  <Plus className="h-4 w-4" />
                </button>
                {showAttachMenu ? (
                  <div
                    className="absolute bottom-12 left-0 z-10 min-w-[220px] rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] p-2 shadow-[0_10px_30px_rgba(0,0,0,0.18)]"
                    onClick={(event) => event.stopPropagation()}
                  >
                    <button
                      type="button"
                      className="w-full rounded-lg px-3 py-2 text-left text-[12px] text-[var(--color-text-primary)] hover:bg-[var(--color-surface-2)] flex items-center gap-2"
                      onClick={() => {
                        setShowAttachMenu(false);
                        setPickedIntent("analysis");
                        uploadInputRef.current?.click();
                      }}
                    >
                      <Bot className="h-3.5 w-3.5 text-[var(--color-green)]" />
                      Add for Analysis (Chat)
                    </button>
                    <button
                      type="button"
                      className="w-full rounded-lg px-3 py-2 text-left text-[12px] text-[var(--color-text-primary)] hover:bg-[var(--color-surface-2)] flex items-center gap-2"
                      onClick={() => {
                        setShowAttachMenu(false);
                        setPickedIntent("workflow");
                        uploadInputRef.current?.click();
                      }}
                    >
                      <Send className="h-3.5 w-3.5 text-[var(--color-blue)]" />
                      Add for Workflow Upload
                    </button>
                  </div>
                ) : null}

                <Textarea
                  value={input}
                  onChange={(event) => setInput(event.target.value)}
                  onKeyDown={(event) => {
                    if (event.key === "Enter" && !event.shiftKey) {
                      event.preventDefault();
                      void sendPrompt(input);
                    }
                  }}
                  placeholder="Ask Copilot..."
                  className="min-h-[80px] resize-none text-[12px]"
                />
                <Button type="submit" className="h-10 rounded-full px-4" disabled={!input.trim() || loading}>
                  <Send className="h-3.5 w-3.5" />
                </Button>
              </div>
            </div>
            {error ? <p className="text-[11px] text-[var(--color-red)]">{error}</p> : null}
          </form>
        </div>
      </div>
    );
  }

  if (collapsed && !persistent) {
    return (
        <button
              type="button"
              onClick={() =>
                setCollapsed(false)
              }
              className="fixed bottom-4 right-4 z-50 inline-flex items-center gap-2 rounded-full border border-[var(--color-border)] bg-[var(--color-surface)] px-3 py-2 text-[12px] shadow-[0_12px_30px_rgba(0,0,0,0.16)] hover:bg-[var(--color-surface-2)]"
            >
              <Bot className="h-4 w-4 text-[var(--color-green)]" />
              Harita
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
            <p className="truncate text-[12px] font-medium text-[var(--color-text-primary)] inline-flex items-center gap-1.5">
              <span
                className={`inline-block h-2 w-2 rounded-full ${enabled ? "bg-emerald-500" : "bg-red-500"}`}
                aria-label={enabled ? "AI online" : "AI offline"}
                title={enabled ? "AI online" : "AI offline"}
              />
              Harita
            </p>
            <p className="truncate text-[10px] text-[var(--color-text-tertiary)]">{enabled ? `Gemini ready • ${selectedTone}` : "Fallback guidance mode"}</p>
          </div>
        </div>
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={clearHistory}
            className="rounded-md p-1 text-[var(--color-text-tertiary)] hover:bg-[var(--color-surface)] hover:text-[var(--color-text-primary)]"
            title="New Chat"
            aria-label="New Chat"
          >
            <Plus className="h-4 w-4" />
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
            <p className="text-[11px] text-[var(--color-text-tertiary)]">Harita is thinking...</p>
          ) : null}
          <div ref={bottomRef} />
        </div>

        <div className="space-y-2 border-t border-[var(--color-border)] px-3 py-3">
          <form onSubmit={onSubmit} className="space-y-2">
            <div className="space-y-2 relative">
              <input ref={uploadInputRef} type="file" onChange={onFilePicked} className="hidden" />

              {attachment ? (
                <div className="rounded-lg border border-[var(--color-border)] bg-[var(--color-surface-2)] px-2 py-1.5 text-[10px] text-[var(--color-text-tertiary)]">
                  Attached: {attachment.name} ({Math.max(1, Math.round(attachment.size / 1024))} KB)
                </div>
              ) : null}

              <div className="flex items-end gap-2">
                <button
                  type="button"
                  onClick={(event) => {
                    event.stopPropagation();
                    setShowAttachMenu((current) => !current);
                  }}
                  className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-[var(--color-border)] bg-[var(--color-surface-2)] text-[var(--color-text-secondary)] hover:bg-[var(--color-surface-3)]"
                  aria-label="Open attachment menu"
                >
                  <Plus className="h-4 w-4" />
                </button>
                {showAttachMenu ? (
                  <div
                    className="absolute bottom-12 left-0 z-10 min-w-[220px] rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] p-2 shadow-[0_10px_30px_rgba(0,0,0,0.18)]"
                    onClick={(event) => event.stopPropagation()}
                  >
                    <button
                      type="button"
                      className="w-full rounded-lg px-3 py-2 text-left text-[12px] text-[var(--color-text-primary)] hover:bg-[var(--color-surface-2)] flex items-center gap-2"
                      onClick={() => {
                        setShowAttachMenu(false);
                        setPickedIntent("analysis");
                        uploadInputRef.current?.click();
                      }}
                    >
                      <Bot className="h-3.5 w-3.5 text-[var(--color-green)]" />
                      Add for Analysis (Chat)
                    </button>
                    <button
                      type="button"
                      className="w-full rounded-lg px-3 py-2 text-left text-[12px] text-[var(--color-text-primary)] hover:bg-[var(--color-surface-2)] flex items-center gap-2"
                      onClick={() => {
                        setShowAttachMenu(false);
                        setPickedIntent("workflow");
                        uploadInputRef.current?.click();
                      }}
                    >
                      <Send className="h-3.5 w-3.5 text-[var(--color-blue)]" />
                      Add for Workflow Upload
                    </button>
                  </div>
                ) : null}

                <Textarea
                  value={input}
                  onChange={(event) => setInput(event.target.value)}
                  onKeyDown={(event) => {
                    if (event.key === "Enter" && !event.shiftKey) {
                      event.preventDefault();
                      void sendPrompt(input);
                    }
                  }}
                  placeholder="Ask Copilot..."
                  className="min-h-[84px] resize-none"
                />
                <Button type="submit" className="h-10 rounded-full px-4" disabled={!input.trim() || loading}>
                  <Send className="h-3.5 w-3.5" />
                </Button>
              </div>
              <p className="text-[10px] text-[var(--color-text-secondary)]">
                Ask Harita to upload after analysis, for example: &quot;Map this to EDA C1 as Drawing and upload.&quot;
                {canManageGuidebookTracker ? " Project Admin/Super User can also ask to upload as guidebook or import as tracker." : ""}
              </p>
            </div>
            {error ? <p className="text-[11px] text-[var(--color-red)]">{error}</p> : null}
          </form>
        </div>
      </div>
    </aside>
  );
}
