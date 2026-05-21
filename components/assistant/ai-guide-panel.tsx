"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import { Bot, Send, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import type { AssistantContext, AssistantMessage } from "@/lib/assistant";
import { cn } from "@/lib/utils";
type HaritaAttachment = {
  name: string;
  mimeType: string;
  size: number;
  base64: string;
};
type FormFieldMeta = {
  key: string;
  label: string;
  type: string;
  placeholder?: string;
};

type AssistantAction = {
  label: string;
  href: string;
  description: string;
};

type AiGuidePanelProps = {
  context: AssistantContext;
  enabled: boolean;
  storageKey: string;
  title?: string;
  description?: string;
  prompts?: string[];
  suggestedActions?: AssistantAction[];
};

const DEFAULT_WELCOME = (context: AssistantContext, description?: string) =>
  description ??
  `I can help you decide the next step for ${context.currentItem ?? context.title}. Ask me what to do next, what is blocked, or what should be uploaded first.`;

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
    if (!Array.isArray(parsed) || parsed.length === 0) {
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

export function AiGuidePanel({
  context,
  enabled,
  storageKey,
  title = "AI guide",
  description,
  suggestedActions = [],
}: AiGuidePanelProps) {
  const fallbackMessages = useMemo<AssistantMessage[]>(
    () => [
      {
        role: "assistant",
        content: DEFAULT_WELCOME(context, description),
      },
    ],
    [context, description],
  );

  const [messages, setMessages] = useState<AssistantMessage[]>(fallbackMessages);
  const [input, setInput] = useState("");
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [attachment, setAttachment] = useState<HaritaAttachment | null>(null);
  const [attachmentFile, setAttachmentFile] = useState<File | null>(null);
  const [fillingForm, setFillingForm] = useState(false);
  const bottomRef = useRef<HTMLDivElement | null>(null);
  const uploadInputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    setMessages(loadMessages(storageKey, fallbackMessages));
  }, [fallbackMessages, storageKey]);

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }
    window.localStorage.setItem(storageKey, JSON.stringify(messages));
  }, [messages, storageKey]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [messages, isLoading]);

  async function readStream(response: Response, onChunk: (chunk: string) => void) {
    if (!response.body) {
      const text = await response.text();
      onChunk(text);
      return;
    }

    const reader = response.body.getReader();
    const decoder = new TextDecoder();

    while (true) {
      const { value, done } = await reader.read();
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

  async function sendMessage(prompt: string) {
    const text = prompt.trim();
    if (!text || isLoading) {
      return;
    }

    setError("");
    setIsLoading(true);
    const nextMessages: AssistantMessage[] = [...messages, { role: "user", content: text }, { role: "assistant", content: "" }];
    setMessages(nextMessages);
    setInput("");

    try {
      const response = await fetch("/api/assistant", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          context,
          messages: nextMessages.slice(0, -1),
          attachments: attachment ? [attachment] : [],
        }),
      });
      if (!response.ok) {
        const payload = (await response.json().catch(() => ({}))) as { error?: string; text?: string };
        if (!payload.text) {
          throw new Error(payload.error ?? "Assistant request failed.");
        }
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

      if (!assistantText.trim()) {
        setMessages((current) => {
          const copy = [...current];
          copy[copy.length - 1] = { role: "assistant", content: "No response returned." };
          return copy;
        });
      }
      setAttachment(null);
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "Assistant request failed.");
      setMessages((current) => current.slice(0, -1));
    } finally {
      setIsLoading(false);
    }
  }

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    void sendMessage(input);
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
    if (isLoading || fillingForm) {
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
    const match = window.location.pathname.match(/^\/projects\/([^/]+)/);
    const projectId = match?.[1];
    if (!projectId) {
      setError("Open a project workspace to upload this file to project context.");
      return;
    }

    setIsLoading(true);
    setError("");
    try {
      const formData = new FormData();
      formData.append("project_id", projectId);
      formData.append("file", attachmentFile);
      formData.append("title", attachmentFile.name.replace(/\.[^.]+$/, ""));
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
              : "Tracker baseline uploaded successfully and mapped to project credits.",
        },
      ]);
      setAttachment(null);
      setAttachmentFile(null);
    } catch (uploadError) {
      setError(uploadError instanceof Error ? uploadError.message : "Upload failed.");
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <section className="surface-card overflow-hidden">
      <div className="border-b border-[var(--color-border)] bg-[var(--color-surface-2)]/70 px-4 py-4">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <span className="flex h-8 w-8 items-center justify-center rounded-full bg-[var(--color-green-light)] text-[var(--color-green)]">
              <Sparkles className="h-3.5 w-3.5" />
            </span>
            <div className="min-w-0">
              <h2 className="text-[13px] font-medium text-[var(--color-text-primary)]">{title}</h2>
              <p className="mt-1 text-xs text-[var(--color-text-tertiary)]">
                Uses the current page context to suggest the next best step.
              </p>
            </div>
          </div>
        </div>
        <div className="mt-3 flex flex-wrap items-center gap-2">
          <div className="rounded-full border border-[var(--color-border)] bg-[var(--color-surface)] px-2.5 py-1 text-xs text-[var(--color-text-tertiary)]">
            {enabled ? "Gemini ready" : "Connect Gemini in .env.local"}
          </div>
          <Bot className="h-3 w-3" />
          <span>{enabled ? "Context-aware guidance" : "Assistant unavailable"}</span>
        </div>
      </div>

      <div className="max-h-[360px] space-y-3 overflow-y-auto px-4 py-4">
        {messages.map((message, index) => (
          <div
            key={`${message.role}-${index}`}
            className={`max-w-[92%] rounded-2xl border px-3 py-2 text-[12px] leading-6 shadow-sm ${
              message.role === "user"
                ? "ml-auto border-[var(--color-blue-light)] bg-[var(--color-blue-light)] text-[var(--color-blue)]"
                : "border-[var(--color-border)] bg-[var(--color-surface-2)] text-[var(--color-text-primary)]"
            }`}
          >
            <p className="whitespace-pre-wrap">{message.content}</p>
          </div>
        ))}
        {isLoading ? (
          <div className="max-w-[92%] rounded-xl border border-[var(--color-border)] bg-[var(--color-surface-2)] px-3 py-2 text-[12px] text-[var(--color-text-tertiary)]">
            Thinking about the next step...
          </div>
        ) : null}
        <div ref={bottomRef} />
      </div>

      <div className="space-y-3 border-t border-[var(--color-border)] bg-[linear-gradient(180deg,rgba(255,255,255,0.04),transparent)] px-4 py-4">
        {suggestedActions.length > 0 ? (
          <div className="space-y-2">
            <p className="text-xs uppercase tracking-[0.08em] text-[var(--color-text-tertiary)]">Suggested actions</p>
            <div className="space-y-2">
              {suggestedActions.map((action) => (
                <Link
                  key={action.href}
                  href={action.href}
                  className={cn(
                    "block rounded-xl border border-[var(--color-border)] bg-[var(--color-surface-2)] px-3 py-2",
                    "hover:border-[var(--color-border-strong)] hover:bg-[var(--color-surface)]",
                  )}
                >
                  <div className="text-xs font-medium text-[var(--color-text-primary)]">{action.label}</div>
                  <div className="mt-1 text-xs text-[var(--color-text-tertiary)]">{action.description}</div>
                </Link>
              ))}
            </div>
          </div>
        ) : null}

        <form onSubmit={handleSubmit} className="space-y-2">
          <div className="space-y-1">
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
              <p className="text-xs text-[var(--color-text-tertiary)]">
                Attached to Harita: {attachment.name} ({Math.max(1, Math.round(attachment.size / 1024))} KB)
              </p>
            ) : null}
          </div>
          <Textarea
            value={input}
            onChange={(event) => setInput(event.target.value)}
            placeholder="Ask what to do next, what is blocked, or which files are missing..."
            className="min-h-[92px] resize-none"
          />
          {error ? <p className="text-xs text-[var(--color-red)]">{error}</p> : null}
          <Button type="button" variant="secondary" className="h-8 w-full rounded-md" disabled={isLoading || fillingForm} onClick={() => void assistFormFill()}>
            {fillingForm ? "Filling form..." : "Fill Form With Harita"}
          </Button>
          <Button type="submit" className="h-8 w-full rounded-md" disabled={isLoading || !input.trim() || !enabled}>
            <Send className="mr-2 h-3.5 w-3.5" />
            {enabled ? "Ask AI guide" : "Connect Gemini first"}
          </Button>
        </form>
      </div>
    </section>
  );
}
