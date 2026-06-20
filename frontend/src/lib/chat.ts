// Client for the AI chat endpoint that fills in the NDA conversationally.

import type { NdaFormData } from "@/lib/nda";

export interface ChatMessage {
  role: "user" | "assistant";
  content: string;
}

export interface ChatResponse {
  reply: string;
  fields: NdaFormData;
}

/**
 * Send the conversation so far plus the document's current field values to the
 * backend, which asks the LLM for a reply and the updated fields.
 */
export async function postChat(
  messages: ChatMessage[],
  fields: NdaFormData,
): Promise<ChatResponse> {
  const res = await fetch("/api/chat", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ messages, fields }),
  });
  if (!res.ok) throw new Error(`Chat request failed (${res.status})`);
  return res.json();
}
