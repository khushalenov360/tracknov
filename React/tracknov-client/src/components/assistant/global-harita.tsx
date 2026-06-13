import { useState, useRef, memo, useEffect } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { Bot, Send, Loader2 } from "lucide-react";
import { sendHaritaMessage } from "../../services/api";

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
            if (isBlock) return <code className="block bg-[var(--color-surface-2)] text-xs px-3 py-2 rounded-md my-2 overflow-x-auto font-mono whitespace-pre">{children}</code>;
            return <code className="bg-[var(--color-surface-2)] text-xs px-1 py-0.5 rounded font-mono">{children}</code>;
          },
        }}
      >
        {content}
      </ReactMarkdown>
    </div>
  );
});

export function GlobalHarita() {
  const [input, setInput] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const bottomRef = useRef<HTMLDivElement | null>(null);

  const [messages, setMessages] = useState([
    { id: "1", role: "assistant", content: "I'm Harita, your AI assistant. How can I help you today?" }
  ]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isTyping]);

  const handleSend = async () => {
    if (!input.trim()) return;

    const userMessage = { id: Date.now().toString(), role: "user", content: input.trim() };
    setMessages(prev => [...prev, userMessage]);
    setInput("");
    setIsTyping(true);

    try {
      const response = await sendHaritaMessage(userMessage.content);
      const botMessage = { id: (Date.now() + 1).toString(), role: "assistant", content: response.reply || response.message };
      setMessages(prev => [...prev, botMessage]);
    } catch (error) {
      console.error(error);
      const errorMessage = { id: (Date.now() + 1).toString(), role: "assistant", content: "**Error:** I was unable to connect to my backend brain right now." };
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsTyping(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <div className="flex flex-col h-full bg-[var(--color-surface)] w-full">
      <div className="flex items-center justify-between px-4 py-3 border-b border-[var(--color-border)] shrink-0 bg-[var(--color-surface-2)]">
        <div className="flex items-center gap-2">
          <div className="h-7 w-7 rounded-md bg-[var(--color-green)]/10 flex items-center justify-center">
            <Bot className="h-4 w-4 text-[var(--color-green)]" />
          </div>
          <div>
            <div className="font-bold text-[13px] text-[var(--color-text-primary)] flex items-center gap-1.5">
              Harita <span className="text-[10px] bg-slate-200 text-slate-600 px-1.5 py-0.5 rounded-sm font-bold uppercase tracking-wider">Gemini Ready</span>
            </div>
            <div className="text-[11px] text-[var(--color-text-tertiary)] flex items-center gap-1">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-500"></span>
              Auto Mode
            </div>
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.map((m) => (
          <div key={m.id} className={`flex gap-3 ${m.role === "user" ? "flex-row-reverse" : "flex-row"}`}>
            <div className={`shrink-0 h-7 w-7 rounded-md flex items-center justify-center ${m.role === "user" ? "bg-indigo-100" : "bg-[var(--color-green)]/10"}`}>
              {m.role === "user" ? <span className="text-xs font-bold text-indigo-700">U</span> : <Bot className="h-4 w-4 text-[var(--color-green)]" />}
            </div>
            <div className={`max-w-[85%] rounded-lg p-3 text-sm ${m.role === "user" ? "bg-indigo-600 text-white" : "bg-[var(--color-surface-2)] border border-[var(--color-border)] text-[var(--color-text-primary)]"}`}>
              <MemoizedMarkdown content={m.content} />
            </div>
          </div>
        ))}
        {isTyping && (
          <div className="flex gap-3 flex-row">
            <div className="shrink-0 h-7 w-7 rounded-md flex items-center justify-center bg-[var(--color-green)]/10">
              <Loader2 className="h-4 w-4 text-[var(--color-green)] animate-spin" />
            </div>
            <div className="max-w-[85%] rounded-lg p-3 text-sm bg-[var(--color-surface-2)] border border-[var(--color-border)] text-[var(--color-text-primary)]">
              <span className="animate-pulse">Thinking...</span>
            </div>
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      <div className="p-3 bg-[var(--color-surface)] border-t border-[var(--color-border)] shrink-0">
        <div className="relative flex items-end gap-2 bg-[var(--color-surface-2)] border border-[var(--color-border)] rounded-xl p-2 focus-within:border-[var(--color-green)] transition-colors">
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Ask Harita to analyze this project..."
            className="w-full bg-transparent border-none focus:ring-0 resize-none max-h-32 min-h-[40px] text-sm text-[var(--color-text-primary)] placeholder-[var(--color-text-tertiary)] outline-none"
            rows={1}
            disabled={isTyping}
          />
          <button 
            onClick={handleSend}
            disabled={isTyping || !input.trim()}
            className="h-8 w-8 shrink-0 bg-[var(--color-green)] hover:bg-[var(--color-green-dim)] text-white rounded-lg flex items-center justify-center transition-colors disabled:opacity-50"
          >
            <Send className="h-4 w-4" />
          </button>
        </div>
      </div>
    </div>
  );
}
