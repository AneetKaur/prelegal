// Client for the document catalog, the AI chat endpoint, and saved documents.

import { getToken } from "@/lib/auth";

export interface DocumentSummary {
  id: string;
  name: string;
  description: string;
}

/** A document the user has saved (list view — no markdown body). */
export interface SavedDocumentSummary {
  id: number;
  documentId: string;
  title: string;
  createdAt: string;
  updatedAt: string;
}

export interface SavedDocument extends SavedDocumentSummary {
  markdown: string;
}

function authHeaders(): Record<string, string> {
  const token = getToken();
  return token ? { Authorization: `Bearer ${token}` } : {};
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

// --- Saved documents ---------------------------------------------------------

/** The current user's saved documents, most recently updated first. */
export async function fetchMyDocuments(): Promise<SavedDocumentSummary[]> {
  const res = await fetch("/api/my-documents", { headers: authHeaders() });
  if (!res.ok) throw new Error(`Saved documents request failed (${res.status})`);
  return res.json();
}

/** Load one saved document (including its markdown) to reopen it. */
export async function fetchMyDocument(id: number): Promise<SavedDocument> {
  const res = await fetch(`/api/my-documents/${id}`, { headers: authHeaders() });
  if (!res.ok) throw new Error(`Saved document request failed (${res.status})`);
  return res.json();
}

/**
 * Save the current document. Pass an `id` to update a previously saved document
 * in place; omit it to create a new one. Returns the saved summary.
 */
export async function saveDocument(
  documentId: string,
  title: string,
  markdown: string,
  id?: number,
): Promise<SavedDocumentSummary> {
  const res = await fetch("/api/my-documents", {
    method: "POST",
    headers: { "Content-Type": "application/json", ...authHeaders() },
    body: JSON.stringify({ id, documentId, title, markdown }),
  });
  if (!res.ok) throw new Error(`Save request failed (${res.status})`);
  return res.json();
}
