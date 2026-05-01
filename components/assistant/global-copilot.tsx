"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { usePathname } from "next/navigation";
import { Bot, ChevronLeft, ChevronRight, Send, Sparkles, Settings } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import type { AssistantContext, AssistantMessage, AssistantSurface } from "@/lib/assistant";
import type { MemberRole } from "@/lib/types";

type AssistantTone = "Auto" | "Executive" | "Guided" | "Fast";

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
    return `${greeting} I am always available in this tab. Ask for next steps, blockers, or validation guidance for ${title}.`;
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
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "Copilot request failed.");
      setMessages((current) => current.slice(0, -1));
    } finally {
      setLoading(false);
    }
  }

  function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    void sendPrompt(input);
  }

  const quickPrompts = [
    "What is the next best action in this tab?",
    "What blockers should I clear first?",
    "Give me a short review checklist for this page.",
  ];

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
          <div className="flex flex-wrap gap-2">
            {quickPrompts.map((prompt) => (
              <button
                key={prompt}
                type="button"
                onClick={() => void sendPrompt(prompt)}
                disabled={loading}
                className="rounded-full border border-[var(--color-border)] bg-[var(--color-surface-2)] px-2.5 py-1 text-[10px] text-[var(--color-text-secondary)] hover:bg-[var(--color-surface)]"
              >
                {prompt}
              </button>
            ))}
          </div>
          <form onSubmit={onSubmit} className="space-y-2">
            <Textarea
              value={input}
              onChange={(event) => setInput(event.target.value)}
              placeholder="Ask Copilot..."
              className="min-h-[84px] resize-none"
            />
            {error ? <p className="text-[11px] text-[var(--color-red)]">{error}</p> : null}
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
