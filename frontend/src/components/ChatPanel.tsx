"use client";

import { useEffect, useRef, useState } from "react";
import type { NdaFormData } from "@/lib/nda";
import { postChat, type ChatMessage } from "@/lib/chat";

interface ChatPanelProps {
  data: NdaFormData;
  onChange: (data: NdaFormData) => void;
}

const GREETING: ChatMessage = {
  role: "assistant",
  content:
    "Hi! I'll help you put together a Mutual NDA. To start, what's the purpose " +
    "of the agreement — what will the two parties be sharing or evaluating?",
};

/**
 * Conversational front-end for the NDA. The assistant asks about the document
 * and the answers populate `data` (the live preview), which the user can still
 * fine-tune in the form below.
 */
export default function ChatPanel({ data, onChange }: ChatPanelProps) {
  const [messages, setMessages] = useState<ChatMessage[]>([GREETING]);
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
      // The greeting is display-only UI text the assistant never produced, so
      // don't send it as part of the conversation history.
      const history = next.filter((m) => m !== GREETING);
      const { reply, fields } = await postChat(history, data);
      setMessages([...next, { role: "assistant", content: reply }]);
      onChange(fields);
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
        <h2 className="text-base font-semibold" style={{ color: "#032147" }}>
          AI Assistant
        </h2>
        <p className="text-xs text-slate-500">
          Describe your NDA and I&apos;ll fill in the details below.
        </p>
      </div>

      <div className="flex-1 space-y-3 overflow-y-auto px-5 py-4">
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
          placeholder="Type your answer…"
          value={input}
          disabled={loading}
          onChange={(e) => setInput(e.target.value)}
        />
        <button
          type="submit"
          disabled={loading || !input.trim()}
          className="rounded-md px-4 py-2 text-sm font-medium text-white transition disabled:opacity-50"
          style={{ backgroundColor: "#753991" }}
        >
          Send
        </button>
      </form>
    </section>
  );
}
