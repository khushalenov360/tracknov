"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import { Bot, Send, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import type { AssistantContext, AssistantMessage } from "@/lib/assistant";
import { cn } from "@/lib/utils";

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
  prompts: string[];
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
  prompts,
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
  const bottomRef = useRef<HTMLDivElement | null>(null);

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
              <p className="mt-1 text-[11px] text-[var(--color-text-tertiary)]">
                Uses the current page context to suggest the next best step.
              </p>
            </div>
          </div>
        </div>
        <div className="mt-3 flex flex-wrap items-center gap-2">
          <div className="rounded-full border border-[var(--color-border)] bg-[var(--color-surface)] px-2.5 py-1 text-[10px] text-[var(--color-text-tertiary)]">
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
        <div className="flex flex-wrap gap-2">
          {prompts.map((prompt) => (
            <button
              key={prompt}
              type="button"
              onClick={() => void sendMessage(prompt)}
              disabled={isLoading}
              className="rounded-full border border-[var(--color-border)] bg-[var(--color-surface-2)] px-3 py-1.5 text-left text-[11px] text-[var(--color-text-secondary)] hover:border-[var(--color-border-strong)] hover:bg-[var(--color-surface)] hover:text-[var(--color-text-primary)]"
            >
              {prompt}
            </button>
          ))}
        </div>

        {suggestedActions.length > 0 ? (
          <div className="space-y-2">
            <p className="text-[10px] uppercase tracking-[0.08em] text-[var(--color-text-tertiary)]">Suggested actions</p>
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
                  <div className="text-[11px] font-medium text-[var(--color-text-primary)]">{action.label}</div>
                  <div className="mt-1 text-[10px] text-[var(--color-text-tertiary)]">{action.description}</div>
                </Link>
              ))}
            </div>
          </div>
        ) : null}

        <form onSubmit={handleSubmit} className="space-y-2">
          <Textarea
            value={input}
            onChange={(event) => setInput(event.target.value)}
            placeholder="Ask what to do next, what is blocked, or which files are missing..."
            className="min-h-[92px] resize-none"
          />
          {error ? <p className="text-[11px] text-[var(--color-red)]">{error}</p> : null}
          <Button type="submit" className="h-8 w-full rounded-md" disabled={isLoading || !input.trim() || !enabled}>
            <Send className="mr-2 h-3.5 w-3.5" />
            {enabled ? "Ask AI guide" : "Connect Gemini first"}
          </Button>
        </form>
      </div>
    </section>
  );
}
