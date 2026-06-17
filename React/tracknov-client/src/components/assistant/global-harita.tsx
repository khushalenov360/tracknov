import { useEffect, useMemo, useRef, useState, memo } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import {
  AlertTriangle,
  Bot,
  FileText,
  Loader2,
  Paperclip,
  RefreshCcw,
  Send,
  Sparkles,
  User,
  X,
} from "lucide-react";
import {
  fetchHaritaStatus,
  prepareHaritaAttachment,
  streamHaritaMessage,
  type HaritaActionButton,
  type HaritaApiError,
  type HaritaMessageHistoryItem,
  type HaritaPreparedAttachment,
  type HaritaResponseMeta,
  type HaritaStatus,
  uploadCreditEvidence,
} from "../../services/api";

const MemoizedMarkdown = memo(function MemoizedMarkdown({ content }: { content: string }) {
  return (
    <div className="harita-prose text-inherit text-sm leading-relaxed">
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={{
          p: ({ children }) => <p className="mb-3 last:mb-0">{children}</p>,
          strong: ({ children }) => <strong className="font-semibold text-[var(--color-text-primary)]">{children}</strong>,
          code: ({ children, className }) => {
            const isBlock = className?.includes("language-");
            if (isBlock) {
              return (
                <code className="my-2 block overflow-x-auto rounded-md bg-[var(--color-surface-2)] px-3 py-2 font-mono text-xs whitespace-pre">
                  {children}
                </code>
              );
            }
            return <code className="rounded bg-[var(--color-surface-2)] px-1 py-0.5 font-mono text-xs">{children}</code>;
          },
        }}
      >
        {content}
      </ReactMarkdown>
    </div>
  );
});

type Message = {
  id: string;
  role: "assistant" | "user";
  content: string;
  meta?: HaritaResponseMeta;
};

const STARTER_PROMPTS = [
  "What should we prioritize next?",
  "Show the biggest project blockers",
  "Which credits need attention?",
];

const EVIDENCE_FILE_ACCEPT =
  ".pdf,.png,.jpg,.jpeg,.webp,.heic,.doc,.docx,.xls,.xlsx,.csv,.txt,application/pdf,image/*,text/plain,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document,application/vnd.ms-excel,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";

function buildDefaultAttachmentPrompt(projectLabel: string) {
  return `Analyze this document for ${projectLabel} and identify the most likely compliance credit match.`;
}

function buildEvaluatePrompt(creditCode: string) {
  return `Check if this attached document fits ${creditCode}.`;
}

export function GlobalHarita({
  projectId,
  title,
  description,
}: {
  projectId?: string;
  title?: string;
  description?: string;
}) {
  const [input, setInput] = useState("");
  const [messages, setMessages] = useState<Message[]>([]);
  const [isTyping, setIsTyping] = useState(false);
  const [pendingRetryMessage, setPendingRetryMessage] = useState<string | null>(null);
  const [systemError, setSystemError] = useState<{ title: string; detail?: string; retryable?: boolean } | null>(null);
  const [status, setStatus] = useState<HaritaStatus>({ cloud: false, local: false, active: "offline" });
  const [attachedFile, setAttachedFile] = useState<File | null>(null);
  const [preparedAttachment, setPreparedAttachment] = useState<HaritaPreparedAttachment | null>(null);
  const [attachmentTargetId, setAttachmentTargetId] = useState<string | null>(null);
  const [isPreparingAttachment, setIsPreparingAttachment] = useState(false);
  const [isCommittingEvidence, setIsCommittingEvidence] = useState(false);
  const bottomRef = useRef<HTMLDivElement | null>(null);
  const assetInputRef = useRef<HTMLInputElement | null>(null);

  const context = useMemo(
    () => ({
      projectId,
      title: title || "Tracknov Project",
      summary: description || "Project workspace context for Harita",
      currentItem:
        typeof window !== "undefined"
          ? `${window.location.pathname}${window.location.search}`
          : projectId
            ? `/projects/${projectId}/overview`
            : "/dashboard",
    }),
    [description, projectId, title],
  );
  const projectLabel = title?.trim() || "this project";

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isTyping]);

  useEffect(() => {
    let active = true;

    const loadStatus = async () => {
      try {
        const nextStatus = await fetchHaritaStatus();
        if (active) setStatus(nextStatus);
      } catch {
        if (active) setStatus({ cloud: false, local: false, active: "offline" });
      }
    };

    void loadStatus();
    const timer = window.setInterval(loadStatus, 15000);
    return () => {
      active = false;
      window.clearInterval(timer);
    };
  }, []);

  useEffect(() => {
    setInput("");
    setMessages([]);
    setSystemError(null);
    setPendingRetryMessage(null);
    setAttachedFile(null);
    setPreparedAttachment(null);
    setAttachmentTargetId(null);
    setIsPreparingAttachment(false);
    setIsCommittingEvidence(false);
  }, [projectId, title, description]);

  const showWelcomeState = messages.length === 0 && !systemError;

  const submitMessage = async (
    rawMessage: string,
    options?: {
      appendUserBubble?: boolean;
      attachment?: HaritaPreparedAttachment | null;
      targetId?: string | null;
      preserveInput?: boolean;
    },
  ) => {
    const attachment = options?.attachment ?? preparedAttachment;
    const messageText = rawMessage.trim() || (attachment ? buildDefaultAttachmentPrompt(projectLabel) : "");
    if (!messageText || isTyping) return;

    const userMessage = { id: `user-${Date.now()}`, role: "user" as const, content: rawMessage.trim() || "Attached a document for analysis." };
    const assistantMessage: Message = { id: `assistant-${Date.now()}`, role: "assistant", content: "" };
    const historySnapshot: HaritaMessageHistoryItem[] = messages.map(({ role, content }) => ({ role, content }));

    setMessages((prev) =>
      options?.appendUserBubble === false ? [...prev, assistantMessage] : [...prev, userMessage, assistantMessage],
    );

    if (!options?.preserveInput) {
      setInput("");
    }
    setIsTyping(true);
    setSystemError(null);
    setPendingRetryMessage(messageText);

    try {
      await streamHaritaMessage(
        messageText,
        context,
        historySnapshot,
        attachment,
        options?.targetId ?? attachmentTargetId,
        {
          onStatus: (nextStatus) => setStatus(nextStatus),
          onToken: (chunk) => {
            setMessages((prev) =>
              prev.map((message) =>
                message.id === assistantMessage.id ? { ...message, content: `${message.content}${chunk}` } : message,
              ),
            );
          },
          onMeta: (meta) => {
            setMessages((prev) =>
              prev.map((message) =>
                message.id === assistantMessage.id ? { ...message, meta } : message,
              ),
            );
          },
        },
      );
      setPendingRetryMessage(null);
    } catch (error) {
      setMessages((prev) => prev.filter((message) => message.id !== assistantMessage.id));
      const apiError = error as HaritaApiError;
      setSystemError({
        title: apiError.message || "Harita could not complete this request.",
        detail: apiError.detail,
        retryable: apiError.retryable ?? true,
      });
    } finally {
      setIsTyping(false);
    }
  };

  const retryLastAction = async () => {
    if (!pendingRetryMessage) return;
    await submitMessage(pendingRetryMessage, { appendUserBubble: false, preserveInput: true });
  };

  const handleSend = async () => {
    await submitMessage(input);
  };

  const handleKeyDown = (event: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault();
      void handleSend();
    }
  };

  const clearAttachment = () => {
    setAttachedFile(null);
    setPreparedAttachment(null);
    setAttachmentTargetId(null);
    if (assetInputRef.current) {
      assetInputRef.current.value = "";
    }
  };

  const onSelectFile = async (fileList: FileList | null) => {
    const file = fileList?.[0];
    if (!file || isPreparingAttachment || isTyping) return;
    if (!projectId) {
      setSystemError({
        title: "Open a project workspace before attaching a document.",
        retryable: false,
      });
      return;
    }

    setSystemError(null);
    setAttachedFile(file);
    setPreparedAttachment(null);
    setAttachmentTargetId(null);
    setIsPreparingAttachment(true);

    try {
      const prepared = await prepareHaritaAttachment(file);
      setPreparedAttachment(prepared);
    } catch (error) {
      clearAttachment();
      const apiError = error as HaritaApiError;
      setSystemError({
        title: apiError.message || "Document analysis intake failed.",
        detail: apiError.detail,
        retryable: apiError.retryable ?? true,
      });
    } finally {
      setIsPreparingAttachment(false);
    }
  };

  const appendAssistantMessage = (content: string) => {
    setMessages((prev) => [
      ...prev,
      {
        id: `assistant-inline-${Date.now()}`,
        role: "assistant",
        content,
      },
    ]);
  };

  const handleCommitAction = async (action: HaritaActionButton) => {
    if (!projectId || !attachedFile || !action.targetId || isCommittingEvidence) return;
    setIsCommittingEvidence(true);
    setSystemError(null);

    try {
      const response = await uploadCreditEvidence(projectId, action.targetId, attachedFile);
      appendAssistantMessage(
        action.kind === "map_document_directly"
          ? `✅ ${attachedFile.name} mapped to ${response.creditCode || "the selected credit"} and stored as project evidence.`
          : `✅ ${attachedFile.name} queued for reviewer validation under ${response.creditCode || "the selected credit"}.`,
      );
      const followupPrompt = action.kind === "map_document_directly"
        ? `Check document pipeline for ${response.creditCode || "this credit"} after the latest evidence upload. Confirm whether the target requirement is now satisfied and list any remaining gaps.`
        : `Check document pipeline for ${response.creditCode || "this credit"} after the latest evidence upload and reviewer escalation. Confirm the current evidence status and the next review action required.`;
      clearAttachment();
      await submitMessage(followupPrompt, { appendUserBubble: false, attachment: null, targetId: null });
    } catch (error) {
      const apiError = error as HaritaApiError;
      setSystemError({
        title: apiError.message || "Evidence confirmation failed.",
        detail: apiError.detail,
        retryable: apiError.retryable ?? true,
      });
    } finally {
      setIsCommittingEvidence(false);
    }
  };

  const handleMetaAction = async (action: HaritaActionButton) => {
    if (action.kind === "evaluate_credit") {
      setAttachmentTargetId(action.targetId || null);
      await submitMessage(buildEvaluatePrompt(action.creditCode || "this credit"), {
        targetId: action.targetId || null,
        attachment: preparedAttachment,
      });
      return;
    }

    if (action.kind === "explore_matches") {
      setAttachmentTargetId(null);
      await submitMessage(`Show all likely credit matches for this attached document in ${projectLabel}.`, {
        attachment: preparedAttachment,
      });
      return;
    }

    if (action.kind === "refer_reviewer" || action.kind === "map_document_directly") {
      await handleCommitAction(action);
    }
  };

  return (
    <div className="flex h-full w-full flex-col overflow-hidden bg-[radial-gradient(circle_at_top,#21283a_0%,#171c24_26%,#161B22_58%,#151922_100%)]">
      <div className="shrink-0 border-b border-[var(--color-border)]/80 bg-[linear-gradient(180deg,rgba(28,33,40,0.96)_0%,rgba(22,27,34,0.92)_100%)] px-5 py-4 backdrop-blur-xl">
        <div className="flex items-start gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-2xl border border-[var(--color-border-strong)]/70 bg-[linear-gradient(135deg,rgba(92,110,158,0.3)_0%,rgba(92,110,158,0.08)_100%)]">
            <Sparkles className="h-4 w-4 text-[var(--color-text-primary)]" />
          </div>
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <div className="text-[15px] font-semibold tracking-tight text-[var(--color-text-primary)]">Harita</div>
              <span
                className={`inline-block h-2.5 w-2.5 rounded-full ${
                  status.cloud ? "bg-emerald-400" : status.local ? "bg-red-400" : "bg-[var(--color-text-tertiary)]"
                }`}
                title={status.cloud ? "Cloud active" : status.local ? "Local fallback active" : "Assistant offline"}
              />
            </div>
            <p className="max-w-[18rem] text-[12px] leading-5 text-[var(--color-text-secondary)]">
              Project intelligence with audit-first responses and Tracknov context.
            </p>
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-4 py-4">
        <div className="mx-auto flex max-w-[760px] flex-col gap-4">
          {showWelcomeState ? (
            <div className="rounded-[32px] border border-[var(--color-border)]/80 bg-[linear-gradient(180deg,rgba(26,31,40,0.98)_0%,rgba(19,23,30,0.98)_100%)] px-6 py-7">
              <div className="flex items-center gap-2 text-[11px] font-medium uppercase tracking-[0.22em] text-[var(--color-text-tertiary)]">
                <span className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-[rgba(92,110,158,0.16)] text-[var(--color-text-primary)]">
                  <Sparkles className="h-3.5 w-3.5" />
                </span>
                Harita
              </div>
              <div className="mt-5 max-w-[34rem] text-[36px] font-semibold leading-[1.1] tracking-tight text-[var(--color-text-primary)]">
                How can I help with {projectLabel} today?
              </div>
              <p className="mt-4 max-w-[32rem] text-[14px] leading-7 text-[var(--color-text-secondary)]">
                Ask about blockers, credits, missing evidence, or attach a compliance document for analysis.
              </p>
              <div className="mt-6 flex flex-wrap gap-3">
                {STARTER_PROMPTS.map((prompt) => (
                  <button
                    key={prompt}
                    type="button"
                    onClick={() => void submitMessage(prompt)}
                    className="rounded-full border border-[var(--color-border)] bg-[rgba(28,33,40,0.92)] px-4 py-2.5 text-[13px] font-medium text-[var(--color-text-primary)] hover:border-[var(--color-border-strong)] hover:bg-[rgba(34,39,49,0.98)]"
                  >
                    {prompt}
                  </button>
                ))}
              </div>
            </div>
          ) : null}

          <div className="flex flex-col gap-5">
            {systemError ? (
              <div className="rounded-[26px] border border-[rgba(218,54,51,0.38)] bg-[linear-gradient(180deg,rgba(74,22,22,0.38)_0%,rgba(28,18,20,0.92)_100%)] px-4 py-4 text-[var(--color-text-primary)]">
                <div className="flex items-start gap-3">
                  <div className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-2xl bg-[rgba(218,54,51,0.14)] text-[var(--color-red)]">
                    <AlertTriangle className="h-4 w-4" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="text-sm font-semibold">{systemError.title}</div>
                    {systemError.detail ? (
                      <div className="mt-1 whitespace-pre-wrap text-xs leading-5 text-[var(--color-text-secondary)]">{systemError.detail}</div>
                    ) : null}
                    {systemError.retryable ? (
                      <button
                        type="button"
                        onClick={() => void retryLastAction()}
                        className="mt-3 inline-flex items-center gap-2 rounded-full border border-[var(--color-border-strong)] px-3 py-1.5 text-xs font-medium text-[var(--color-text-primary)]"
                      >
                        <RefreshCcw className="h-3.5 w-3.5" />
                        Retry Connection
                      </button>
                    ) : null}
                  </div>
                </div>
              </div>
            ) : null}

            {messages.map((message) => (
              <div key={message.id} className={`flex items-end gap-3 ${message.role === "user" ? "justify-end" : "justify-start"}`}>
                {message.role === "assistant" ? (
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-2xl border border-[var(--color-border)]/80 bg-[linear-gradient(180deg,rgba(92,110,158,0.18)_0%,rgba(22,27,34,0.95)_100%)]">
                    <Bot className="h-4 w-4 text-[var(--color-text-primary)]" />
                  </div>
                ) : null}

                <div className="max-w-[88%] overflow-hidden">
                  <div
                    className={
                      message.role === "user"
                        ? "rounded-[24px] rounded-br-[10px] border border-[rgba(92,110,158,0.55)] bg-[linear-gradient(135deg,#5C6E9E_0%,#4B5A80_100%)] px-4 py-3 text-white"
                        : "rounded-[26px] rounded-bl-[12px] border border-[var(--color-border)]/80 bg-[linear-gradient(180deg,rgba(31,37,46,0.96)_0%,rgba(24,29,38,0.98)_100%)] px-4 py-3.5 text-[var(--color-text-primary)]"
                    }
                  >
                    <MemoizedMarkdown content={message.content} />
                  </div>

                  {message.role === "assistant" && message.meta?.actions?.length ? (
                    <div className="mt-3 flex flex-wrap gap-2">
                      {message.meta.actions.map((action) => (
                        <button
                          key={action.id}
                          type="button"
                          onClick={() => void handleMetaAction(action)}
                          disabled={isTyping || isPreparingAttachment || isCommittingEvidence || ((action.kind === "refer_reviewer" || action.kind === "map_document_directly") && !attachedFile)}
                          className="rounded-full border border-[var(--color-border)] bg-[rgba(28,33,40,0.92)] px-4 py-2 text-[13px] font-medium text-[var(--color-text-primary)] transition-colors hover:border-[var(--color-border-strong)] hover:bg-[rgba(34,39,49,0.98)] disabled:cursor-not-allowed disabled:opacity-45"
                        >
                          {action.kind === "refer_reviewer" ? "Refer to Line Reviewer" : action.kind === "map_document_directly" ? "Map Document Directly" : action.label}
                        </button>
                      ))}
                    </div>
                  ) : null}
                </div>

                {message.role === "user" ? (
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-2xl border border-[rgba(92,110,158,0.4)] bg-[rgba(92,110,158,0.16)]">
                    <User className="h-4 w-4 text-[var(--color-text-primary)]" />
                  </div>
                ) : null}
              </div>
            ))}

            {isTyping ? (
              <div className="flex items-end gap-3">
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-2xl border border-[var(--color-border)]/80 bg-[linear-gradient(180deg,rgba(92,110,158,0.18)_0%,rgba(22,27,34,0.95)_100%)]">
                  <Loader2 className="h-4 w-4 animate-spin text-[var(--color-text-primary)]" />
                </div>
                <div className="rounded-[26px] rounded-bl-[12px] border border-[var(--color-border)]/80 bg-[linear-gradient(180deg,rgba(31,37,46,0.96)_0%,rgba(24,29,38,0.98)_100%)] px-4 py-3 text-sm text-[var(--color-text-secondary)]">
                  <span className="animate-pulse">Harita is analyzing the current project context...</span>
                </div>
              </div>
            ) : null}
          </div>
          <div ref={bottomRef} />
        </div>
      </div>

      <div className="shrink-0 border-t border-[var(--color-border)]/80 bg-[linear-gradient(180deg,rgba(22,27,34,0.7)_0%,rgba(15,17,23,0.92)_100%)] px-4 py-4 backdrop-blur-xl">
        <div className="mx-auto max-w-[760px]">
          <input
            ref={assetInputRef}
            type="file"
            accept={EVIDENCE_FILE_ACCEPT}
            className="hidden"
            onChange={(event) => void onSelectFile(event.target.files)}
          />

          {attachedFile ? (
            <div className="mb-3 flex items-center justify-between gap-3 rounded-[22px] border border-[var(--color-border)]/80 bg-[rgba(28,33,40,0.96)] px-4 py-3">
              <div className="flex min-w-0 items-center gap-3">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-[rgba(92,110,158,0.16)]">
                  {isPreparingAttachment ? <Loader2 className="h-4 w-4 animate-spin text-[var(--color-text-primary)]" /> : <FileText className="h-4 w-4 text-[var(--color-text-primary)]" />}
                </div>
                <div className="min-w-0">
                  <div className="truncate text-[13px] font-medium text-[var(--color-text-primary)]">{attachedFile.name}</div>
                  <div className="text-[11px] text-[var(--color-text-secondary)]">
                    {isPreparingAttachment
                      ? "Preparing document analysis..."
                      : preparedAttachment
                        ? `Ready for discovery or audit analysis • ${preparedAttachment.evidenceType}`
                        : "Waiting for analysis readiness"}
                  </div>
                </div>
              </div>
              <button
                type="button"
                onClick={clearAttachment}
                disabled={isPreparingAttachment || isTyping || isCommittingEvidence}
                className="flex h-9 w-9 items-center justify-center rounded-full text-[var(--color-text-secondary)] transition-colors hover:bg-[rgba(255,255,255,0.06)] hover:text-[var(--color-text-primary)] disabled:opacity-40"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          ) : null}

          <div className="relative flex items-end gap-3 rounded-[30px] border border-[var(--color-border-strong)]/80 bg-[rgba(28,33,40,0.98)] px-4 py-3 transition-colors focus-within:border-[var(--color-green)]">
            <button
              type="button"
              onClick={() => assetInputRef.current?.click()}
              disabled={isPreparingAttachment || isTyping || isCommittingEvidence}
              className="mb-1 flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border border-[var(--color-border)] bg-[rgba(255,255,255,0.03)] text-[var(--color-text-secondary)] transition-colors hover:border-[var(--color-border-strong)] hover:text-[var(--color-text-primary)] disabled:cursor-not-allowed disabled:opacity-45"
              title="Attach evidence"
            >
              <Paperclip className="h-4 w-4" />
            </button>
            <textarea
              value={input}
              onChange={(event) => setInput(event.target.value)}
              onKeyDown={handleKeyDown}
              placeholder={`Ask Harita about ${projectLabel}...`}
              className="min-h-[44px] max-h-32 w-full resize-none border-0 bg-transparent pr-1 pt-1 text-[14px] leading-6 text-[var(--color-text-primary)] outline-none shadow-none ring-0 placeholder:text-[var(--color-text-tertiary)] focus:border-0 focus:outline-none focus:ring-0 focus:shadow-none focus-visible:outline-none focus-visible:ring-0"
              rows={1}
              disabled={isTyping || isCommittingEvidence}
              style={{ outline: "none", boxShadow: "none" }}
            />
            <button
              onClick={() => void handleSend()}
              disabled={isTyping || isPreparingAttachment || isCommittingEvidence || (!input.trim() && !preparedAttachment)}
              className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-[linear-gradient(135deg,#5C6E9E_0%,#4B5A80_100%)] text-white transition-opacity disabled:cursor-not-allowed disabled:opacity-45"
            >
              {isCommittingEvidence ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
            </button>
          </div>
          <div className="mt-2 px-2 text-[11px] text-[var(--color-text-tertiary)]">Enter to send. Shift + Enter for a new line.</div>
        </div>
      </div>
    </div>
  );
}
