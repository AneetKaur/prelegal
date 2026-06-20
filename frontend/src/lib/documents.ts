// Client for the document catalog and the AI chat endpoint.

export interface DocumentSummary {
  id: string;
  name: string;
  description: string;
}

export interface ChatMessage {
  role: "user" | "assistant";
  content: string;
}

export interface ChatResponse {
  reply: string;
  documentId: string | null;
  documentMarkdown: string;
}

/** The catalog of documents the user can create. */
export async function fetchCatalog(): Promise<DocumentSummary[]> {
  const res = await fetch("/api/catalog");
  if (!res.ok) throw new Error(`Catalog request failed (${res.status})`);
  return res.json();
}

/** A document's pristine template markdown, used as the blank starting point. */
export async function fetchTemplate(id: string): Promise<string> {
  const res = await fetch(`/api/documents/${id}`);
  if (!res.ok) throw new Error(`Template request failed (${res.status})`);
  const body = await res.json();
  return body.markdown;
}

/**
 * Send the conversation to the backend. With no documentId the assistant helps
 * pick a document (and may return one in `documentId`); with a documentId it
 * fills the template and returns the updated `documentMarkdown`.
 */
export async function postChat(
  messages: ChatMessage[],
  documentId: string | null,
  documentMarkdown: string,
): Promise<ChatResponse> {
  const res = await fetch("/api/chat", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ messages, documentId, documentMarkdown }),
  });
  if (!res.ok) throw new Error(`Chat request failed (${res.status})`);
  return res.json();
}
