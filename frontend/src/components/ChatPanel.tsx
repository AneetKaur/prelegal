"use client";

import { useEffect, useRef, useState } from "react";
import {
  postChat,
  type ChatMessage,
  type ChatResponse,
} from "@/lib/documents";
import Button from "@/components/Button";

interface ChatPanelProps {
  /** Chosen document, or null while the user is still picking one. */
  documentId: string | null;
  /** Current document markdown (fill mode); sent back each turn so edits accrue. */
  documentMarkdown: string;
  /** First assistant message shown in the thread (display-only, not sent). */
  greeting: string;
  /** Called after each successful turn with the backend's response. */
  onResult: (res: ChatResponse) => void;
}

/**
 * Conversational front-end shared by both stages: picking a document (selection
 * mode, documentId null) and filling it in (fill mode). The parent owns the
 * document state and reacts to each turn via `onResult`.
 */
export default function ChatPanel({
  documentId,
  documentMarkdown,
  greeting,
  onResult,
}: ChatPanelProps) {
  // `messages` holds only the real exchange. The greeting is display-only UI
  // text the assistant never produced, so it's rendered separately and never
  // sent to the backend as history.
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    endRef.current?.scrollIntoView?.({ block: "end" });
  }, [messages, loading]);

  const send = async () => {
    const text = input.trim();
    if (!text || loading) return;

    const next: ChatMessage[] = [...messages, { role: "user", content: text }];
    setMessages(next);
    setInput("");
    setLoading(true);
    try {
      const res = await postChat(next, documentId, documentMarkdown);
      setMessages([...next, { role: "assistant", content: res.reply }]);
      onResult(res);
    } catch {
      setMessages([
        ...next,
        {
          role: "assistant",
          content: "Sorry, I couldn't reach the AI just now. Please try again.",
        },
      ]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <section className="flex h-[28rem] flex-col rounded-lg border border-slate-200 bg-white">
      <div className="border-b border-slate-200 px-5 py-3">
        <h2 className="text-base font-semibold text-brand-navy">AI Assistant</h2>
        <p className="text-xs text-slate-500">
          {documentId
            ? "Answer my questions and I'll fill in your document."
            : "Tell me what kind of document you need."}
        </p>
      </div>

      <div className="flex-1 space-y-3 overflow-y-auto px-5 py-4">
        <div className="flex justify-start">
          <span
            className="max-w-[85%] whitespace-pre-wrap rounded-lg px-3 py-2 text-sm"
            style={{ backgroundColor: "#f1f5f9", color: "#1e293b" }}
          >
            {greeting}
          </span>
        </div>
        {messages.map((m, i) => (
          <div
            key={i}
            className={m.role === "user" ? "flex justify-end" : "flex justify-start"}
          >
            <span
              className="max-w-[85%] whitespace-pre-wrap rounded-lg px-3 py-2 text-sm"
              style={
                m.role === "user"
                  ? { backgroundColor: "#209dd7", color: "white" }
                  : { backgroundColor: "#f1f5f9", color: "#1e293b" }
              }
            >
              {m.content}
            </span>
          </div>
        ))}
        {loading && (
          <div className="flex justify-start">
            <span className="rounded-lg bg-slate-100 px-3 py-2 text-sm text-slate-400">
              Thinking…
            </span>
          </div>
        )}
        <div ref={endRef} />
      </div>

      <form
        className="flex items-center gap-2 border-t border-slate-200 px-3 py-3"
        onSubmit={(e) => {
          e.preventDefault();
          send();
        }}
      >
        <label htmlFor="chat-input" className="sr-only">
          Message
        </label>
        <input
          id="chat-input"
          className="flex-1 rounded-md border border-slate-300 px-3 py-2 text-sm text-slate-900 outline-none focus:border-slate-500 focus:ring-2 focus:ring-slate-200"
          placeholder="Type your message…"
          value={input}
          disabled={loading}
          onChange={(e) => setInput(e.target.value)}
        />
        <Button type="submit" disabled={loading || !input.trim()}>
          Send
        </Button>
      </form>
    </section>
  );
}
