"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { Bot, ChevronLeft, ChevronRight, MessageSquare, Plus, Send, Sparkles } from "lucide-react";
import { Button } from "@tracknov/ui/ui/button";
import { Textarea } from "@tracknov/ui/ui/textarea";
import type { AssistantContext, AssistantMessage, AssistantSurface } from "@tracknov/harita-engine/assistant";
import type { MemberRole } from "@/lib/types";
import { sessionMemory } from "@tracknov/harita-engine/services/session-memory-service";

type AssistantTone = "Auto" | "Executive" | "Guided" | "Fast";
type HaritaAttachment = {
  name: string;
  mimeType: string;
  size: number;
  base64: string;
};
type HaritaCreditOption = { id: string; code: string; name: string };
type FormFieldMeta = {
  key: string;
  label: string;
  type: string;
  placeholder?: string;
};

// Operational AI skills surfaced as quick-fire chips in Harita
const OPERATIONAL_SKILLS = [
  {
    id: "draft_clarification",
    label: "✍️ Draft Clarification",
    command: "Draft a clarification",
    prompt: "Draft a professional response to the latest reviewer clarification on this credit.",
  },
  {
    id: "find_evidence",
    label: "🔍 Find Evidence",
    command: "Find evidence for this",
    prompt: "Scan the project documents and find the specific evidence that proves compliance for this requirement.",
  },
  {
    id: "explain_rejection",
    label: "🧐 Explain Rejection",
    command: "Explain reviewer rejection",
    prompt: "Explain exactly why the reviewer rejected this credit in plain English, and list the exact steps to fix it.",
  },
  {
    id: "locate_precedent",
    label: "📚 Locate Precedent",
    command: "Locate precedent",
    prompt: "Find a similar project in our portfolio where this credit was approved, and summarize how they achieved it.",
  },
  {
    id: "recommend_next",
    label: "💡 Recommend Next Step",
    command: "Recommend next step",
    prompt: "Based on the current state of this project, what is the most high-value next action I should take right now?",
  },
] as const;

type GlobalHaritaProps = {
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

export function GlobalHarita({ enabled, role, title, description, persistent }: GlobalHaritaProps) {
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

  const [isMobileOpen, setIsMobileOpen] = useState(false);
  const [mobileMode, setMobileMode] = useState<"actions" | "chat">("actions");
  
  useEffect(() => {
    const handleToggle = () => {
      setIsMobileOpen(true);
      setMobileMode("actions");
    };
    window.addEventListener("toggle-mobile-harita", handleToggle as EventListener);
    return () => window.removeEventListener("toggle-mobile-harita", handleToggle as EventListener);
  }, []);

  const [collapsed, setCollapsed] = useState(false);
  const [userName, setUserName] = useState<string>("");
  const [messages, setMessages] = useState<AssistantMessage[]>([]);
  const [historyLoaded, setHistoryLoaded] = useState(false);
  const [input, setInput] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [selectedTone, setSelectedTone] = useState<AssistantTone>("Auto");
  const [showAttachMenu, setShowAttachMenu] = useState(false);
  const [attachment, setAttachment] = useState<HaritaAttachment | null>(null);
  const [attachmentFile, setAttachmentFile] = useState<File | null>(null);
  const [fillingForm, setFillingForm] = useState(false);
  const [availableCredits, setAvailableCredits] = useState<HaritaCreditOption[]>([]);
  const [uploadMode, setUploadMode] = useState<"document" | "guidebook" | "tracker">("document");
  const [pickedIntent, setPickedIntent] = useState<"analysis" | "workflow" | null>(null);

  const canManageGuidebookTracker = ["super_user", "super_admin", "project_admin", "L3", "L5", "consultant"].includes(role ?? "");
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
        console.warn("Failed to fetch user profile", err);
      }
    }
    fetchProfile();
  }, []);

  // SECTION 9: Auto-detect active project from URL and store in session memory
  const lastProactiveProject = useRef<string | null>(null);

  useEffect(() => {
    const match = pathname.match(/^\/projects\/([^/?#]+)/);
    if (match?.[1]) {
      const projectId = match[1];
      sessionMemory.setActiveProject(projectId, title || projectId);
      
      if (lastProactiveProject.current !== projectId && historyLoaded) {
        lastProactiveProject.current = projectId;
        // Proactive Consultant Mode removed per user request
      }
    }
  }, [pathname, title, historyLoaded]);

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

      const navigateTo = response.headers.get("X-Harita-Navigate");
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
          const creditsPayload = (await creditsResponse.json()) as { credits?: HaritaCreditOption[] };
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
              <p className="truncate text-xs text-[var(--color-text-tertiary)]">{enabled ? `Harita ready • ${selectedTone}` : "Fallback guidance mode"}</p>
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

        {/* Harita Intelligence Sections */}
        <div className="flex flex-wrap gap-1.5 px-3 py-2 border-b border-[var(--color-border)] bg-[var(--color-surface-2)] shrink-0">
          <span className="w-full text-[9px] font-black uppercase tracking-widest text-[var(--color-text-tertiary)] mb-0.5">Intelligence Panel</span>
          
          <div className="w-full flex gap-2 overflow-x-auto pb-1 scrollbar-hide">
            <button className="whitespace-nowrap px-2.5 py-1 rounded border border-[var(--color-border)] bg-[var(--color-surface)] text-[10px] font-bold text-[var(--color-text-primary)] hover:bg-indigo-50 hover:text-indigo-600 transition-colors">
              Project Health
            </button>
            <button className="whitespace-nowrap px-2.5 py-1 rounded border border-[var(--color-border)] bg-[var(--color-surface)] text-[10px] font-bold text-[var(--color-text-primary)] hover:bg-indigo-50 hover:text-indigo-600 transition-colors">
              Active Credit
            </button>
            <button className="whitespace-nowrap px-2.5 py-1 rounded border border-[var(--color-border)] bg-[var(--color-surface)] text-[10px] font-bold text-[var(--color-text-primary)] hover:bg-indigo-50 hover:text-indigo-600 transition-colors">
              Clarifications
            </button>
            <button className="whitespace-nowrap px-2.5 py-1 rounded border border-[var(--color-border)] bg-[var(--color-surface)] text-[10px] font-bold text-[var(--color-text-primary)] hover:bg-indigo-50 hover:text-indigo-600 transition-colors">
              Recommendations
            </button>
            <button className="whitespace-nowrap px-2.5 py-1 rounded border border-indigo-200 bg-indigo-50 text-[10px] font-bold text-indigo-700">
              Copilot Chat
            </button>
          </div>
        </div>

        {/* Operational AI Skill Chips */}
        <div className="flex flex-wrap gap-1.5 px-3 py-2 border-b border-[var(--color-border)] bg-[var(--color-surface)] shrink-0">
          <span className="w-full text-[9px] font-black uppercase tracking-widest text-[var(--color-text-tertiary)] mb-0.5">Quick Actions</span>
          {OPERATIONAL_SKILLS.map((skill) => (
            <button
              key={skill.id}
              type="button"
              onClick={() => {
                window.dispatchEvent(
                  new CustomEvent("harita:operational-command", { detail: { command: skill.command } })
                );
                if (skill.prompt) {
                  void sendPrompt(skill.prompt);
                }
              }}
              className="inline-flex items-center gap-1 px-2 py-1 rounded-lg text-xs font-semibold border border-[var(--color-border)] bg-[var(--color-surface-2)] text-[var(--color-text-secondary)] hover:bg-[var(--color-surface-3)] hover:text-[var(--color-text-primary)] hover:border-[var(--color-border-strong)] transition-all"
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
            <p className="text-xs text-[var(--color-text-tertiary)] italic">Harita is thinking...</p>
          ) : null}
          <div ref={bottomRef} />
        </div>

        <div className="space-y-2 border-t border-[var(--color-border)] px-3 py-3 bg-[var(--color-surface)] shrink-0">
          <form onSubmit={onSubmit} className="space-y-2">
            <div className="space-y-2 relative">
              <input ref={uploadInputRef} type="file" onChange={onFilePicked} className="hidden" />

              {attachment ? (
                <div className="rounded-lg border border-[var(--color-border)] bg-[var(--color-surface-2)] px-2 py-1.5 text-xs text-[var(--color-text-tertiary)]">
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
                  placeholder="Ask Harita..."
                  className="min-h-[80px] resize-none text-[12px]"
                />
                <Button type="submit" className="h-10 rounded-full px-4" disabled={!input.trim() || loading}>
                  <Send className="h-3.5 w-3.5" />
                </Button>
              </div>
            </div>
            {error ? <p className="text-xs text-[var(--color-red)]">{error}</p> : null}
          </form>
        </div>
      </div>
    );
  }

  return (
    <>
      {/* HARITA PANEL - Persistent flex column on desktop, Full-screen modal on mobile */}
      <aside 
        className={`
          flex flex-col bg-[var(--color-surface)] transition-transform duration-300
          lg:relative lg:inset-auto lg:h-full lg:w-full lg:border-none lg:shadow-none lg:rounded-none lg:z-auto lg:translate-y-0 lg:flex
          ${isMobileOpen 
            ? 'fixed inset-0 z-[100] h-[100dvh] w-full translate-y-0' 
            : 'fixed inset-0 z-[100] h-[100dvh] w-full translate-y-[120%] lg:translate-y-0'}
        `}
      >
        {/* DESKTOP HEADER */}
        <div className="hidden lg:flex items-center justify-between border-b border-[var(--color-border)] bg-[var(--color-surface-2)] px-3 py-2.5 shrink-0">
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
              <p className="truncate text-xs text-[var(--color-text-tertiary)]">{enabled ? `Gemini ready • ${selectedTone}` : "Fallback guidance mode"}</p>
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

        {/* MOBILE HEADER */}
        <div className="lg:hidden flex items-center justify-between border-b border-[var(--color-border)] bg-[var(--color-surface)] px-4 py-3 shrink-0 shadow-sm z-10">
          <div className="flex min-w-0 items-center gap-2">
            <button
              type="button"
              onClick={() => {
                if (mobileMode === "chat") {
                  setMobileMode("actions");
                } else {
                  setIsMobileOpen(false);
                }
              }}
              className="mr-1 rounded-full p-1.5 text-[var(--color-text-secondary)] hover:bg-[var(--color-surface-2)]"
            >
              <ChevronLeft className="h-5 w-5" />
            </button>
            <span className="flex h-7 w-7 items-center justify-center rounded-full bg-[var(--color-green-light)] text-[var(--color-green)]">
              <Bot className="h-4 w-4" />
            </span>
            <span className="text-[14px] font-bold text-[var(--color-text-primary)]">Harita Assistant</span>
          </div>
          <button
            type="button"
            onClick={() => setIsMobileOpen(false)}
            className="text-[13px] font-medium text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)]"
          >
            Close
          </button>
        </div>

        <div className="flex flex-1 flex-col overflow-hidden relative">
          
          {/* MOBILE SUGGESTED ACTIONS VIEW */}
          <div className={`absolute inset-0 z-20 bg-[var(--color-surface-2)] flex flex-col p-4 overflow-y-auto lg:hidden transition-opacity duration-300 ${mobileMode === "actions" ? "opacity-100 pointer-events-auto" : "opacity-0 pointer-events-none"}`}>
            <h2 className="text-xl font-bold text-[var(--color-text-primary)] mt-4 mb-1">
              {personalizedGreeting}
            </h2>
            <p className="text-sm text-[var(--color-text-secondary)] mb-6">
              I can help you review your queue, check certification readiness, or analyze evidence documents.
            </p>
            
            <h3 className="text-xs font-black uppercase tracking-widest text-[var(--color-text-tertiary)] mb-3">Suggested Actions</h3>
            <div className="grid grid-cols-1 gap-2 mb-6">
              <button 
                onClick={() => { setMobileMode("chat"); void sendPrompt("Show my pending queue."); }}
                className="flex items-center gap-3 p-3 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] text-left hover:border-[var(--color-green)] transition-colors"
              >
                <div className="h-8 w-8 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 shrink-0">📋</div>
                <div>
                  <div className="text-sm font-bold text-[var(--color-text-primary)]">Review My Queue</div>
                  <div className="text-xs text-[var(--color-text-secondary)]">See tasks awaiting your action</div>
                </div>
              </button>
              
              <button 
                onClick={() => { setMobileMode("chat"); void sendPrompt("Show pending clarifications."); }}
                className="flex items-center gap-3 p-3 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] text-left hover:border-[var(--color-green)] transition-colors"
              >
                <div className="h-8 w-8 rounded-full bg-amber-100 flex items-center justify-center text-amber-600 shrink-0">❓</div>
                <div>
                  <div className="text-sm font-bold text-[var(--color-text-primary)]">Pending Clarifications</div>
                  <div className="text-xs text-[var(--color-text-secondary)]">Resolve open queries</div>
                </div>
              </button>
              
              <button 
                onClick={() => { setMobileMode("chat"); void sendPrompt("Check certification readiness for the current project."); }}
                className="flex items-center gap-3 p-3 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] text-left hover:border-[var(--color-green)] transition-colors"
              >
                <div className="h-8 w-8 rounded-full bg-emerald-100 flex items-center justify-center text-emerald-600 shrink-0">✅</div>
                <div>
                  <div className="text-sm font-bold text-[var(--color-text-primary)]">Project Readiness</div>
                  <div className="text-xs text-[var(--color-text-secondary)]">Check overall status</div>
                </div>
              </button>
              
              <button 
                onClick={() => { 
                  setMobileMode("chat"); 
                  setPickedIntent("workflow");
                  setTimeout(() => uploadInputRef.current?.click(), 300);
                }}
                className="flex items-center gap-3 p-3 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] text-left hover:border-[var(--color-green)] transition-colors"
              >
                <div className="h-8 w-8 rounded-full bg-purple-100 flex items-center justify-center text-purple-600 shrink-0">📄</div>
                <div>
                  <div className="text-sm font-bold text-[var(--color-text-primary)]">Upload Evidence</div>
                  <div className="text-xs text-[var(--color-text-secondary)]">Attach and map a document</div>
                </div>
              </button>
            </div>
            
            <div className="mt-auto pt-4">
              <Button 
                onClick={() => setMobileMode("chat")}
                className="w-full h-12 rounded-xl text-sm font-bold bg-[var(--color-green)] text-white shadow-md active:scale-[0.98] transition-transform"
              >
                <MessageSquare className="h-4 w-4 mr-2" />
                Open Copilot Chat
              </Button>
            </div>
          </div>

          {/* CHAT VIEW (Desktop default, Mobile when mobileMode === "chat") */}
          <div className={`flex-1 flex flex-col overflow-hidden transition-opacity duration-300 lg:opacity-100 lg:pointer-events-auto ${mobileMode === "chat" ? "opacity-100 pointer-events-auto" : "opacity-0 pointer-events-none lg:opacity-100 lg:pointer-events-auto"}`}>
            <div className="flex-1 space-y-4 overflow-y-auto px-4 py-4 scroll-smooth pb-12">
            {messages.map((message, index) => (
              <div
                key={`${message.role}-${index}`}
                className={`max-w-[92%] rounded-2xl px-4 py-3 text-[13px] leading-relaxed shadow-sm ${
                  message.role === "user"
                    ? "ml-auto bg-[var(--color-green)] text-white rounded-br-none"
                    : "border border-[var(--color-border)] bg-[var(--color-surface)] text-[var(--color-text-primary)] rounded-bl-none"
                }`}
              >
                <p className="whitespace-pre-wrap">{message.content}</p>
              </div>
            ))}
            {loading ? (
              <p className="text-xs text-[var(--color-text-tertiary)] ml-2 italic animate-pulse">Harita is thinking...</p>
            ) : null}
            <div ref={bottomRef} className="h-2" />
          </div>

        <div className="space-y-2 border-t border-[var(--color-border)] px-3 py-3">
          <form onSubmit={onSubmit} className="space-y-2">
            <div className="space-y-2 relative">
              <input ref={uploadInputRef} type="file" onChange={onFilePicked} className="hidden" />

              {attachment ? (
                <div className="rounded-lg border border-[var(--color-border)] bg-[var(--color-surface-2)] px-2 py-1.5 text-xs text-[var(--color-text-tertiary)]">
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
                  placeholder="Ask Harita..."
                  className="min-h-[84px] resize-none"
                />
                <Button type="submit" className="h-10 rounded-full px-4" disabled={!input.trim() || loading}>
                  <Send className="h-3.5 w-3.5" />
                </Button>
              </div>
              <p className="text-xs text-[var(--color-text-secondary)]">
                Ask Harita to upload after analysis, for example: &quot;Map this to EDA C1 as Drawing and upload.&quot;
                {canManageGuidebookTracker ? " Project Admin/Super User can also ask to upload as guidebook or import as tracker." : ""}
              </p>
            </div>
            {error ? <p className="text-xs text-[var(--color-red)]">{error}</p> : null}
          </form>
        </div>
      </div>
    </div>
    </aside>
    </>
  );
}
