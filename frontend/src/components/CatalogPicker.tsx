"use client";

import { useEffect, useState } from "react";
import {
  fetchCatalog,
  fetchMyDocuments,
  type DocumentSummary,
  type SavedDocumentSummary,
} from "@/lib/documents";
import ChatPanel from "@/components/ChatPanel";

const INTAKE_GREETING =
  "Hi! Tell me what kind of document you need and I'll find the right one. " +
  "If we don't have it, I'll suggest the closest match we can create.";

function formatDate(iso: string): string {
  // Backend timestamps are "YYYY-MM-DD HH:MM:SS"; show just the date.
  return iso.slice(0, 10);
}

/**
 * Landing screen: the user's previously saved documents (if any), a grid of
 * catalog documents to start a new one, and an intake chat for users who aren't
 * sure. `onSelect` starts a new document from a template; `onOpen` reopens a
 * saved one.
 */
export default function CatalogPicker({
  onSelect,
  onOpen,
}: {
  onSelect: (id: string) => void;
  onOpen: (id: number) => void;
}) {
  const [catalog, setCatalog] = useState<DocumentSummary[]>([]);
  const [saved, setSaved] = useState<SavedDocumentSummary[]>([]);
  const [error, setError] = useState(false);

  useEffect(() => {
    fetchCatalog().then(setCatalog).catch(() => setError(true));
    fetchMyDocuments().then(setSaved).catch(() => setSaved([]));
  }, []);

  return (
    <div className="space-y-10">
      {saved.length > 0 && (
        <section>
          <h2 className="mb-4 text-base font-semibold text-brand-navy">
            Your documents
          </h2>
          <ul className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {saved.map((doc) => (
              <li key={doc.id}>
                <button
                  type="button"
                  onClick={() => onOpen(doc.id)}
                  className="h-full w-full rounded-lg border border-slate-200 bg-white p-4 text-left shadow-sm transition hover:border-brand-blue hover:shadow focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-blue"
                >
                  <span className="block truncate text-sm font-semibold text-slate-900">
                    {doc.title}
                  </span>
                  <span className="mt-1 block text-xs text-brand-grey">
                    {doc.documentId} · saved {formatDate(doc.updatedAt)}
                  </span>
                </button>
              </li>
            ))}
          </ul>
        </section>
      )}

      <div className="grid grid-cols-1 gap-8 lg:grid-cols-[minmax(0,1fr)_minmax(0,380px)]">
        <section>
          <h2 className="mb-4 text-base font-semibold text-brand-navy">
            {saved.length > 0 ? "Start a new document" : "Choose a document"}
          </h2>
          {error && (
            <p className="mb-3 text-sm text-red-700">
              Couldn&apos;t load the document list. Please refresh.
            </p>
          )}
          <ul className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            {catalog.map((doc) => (
              <li key={doc.id}>
                <button
                  type="button"
                  onClick={() => onSelect(doc.id)}
                  className="h-full w-full rounded-lg border border-slate-200 bg-white p-4 text-left shadow-sm transition hover:border-brand-blue hover:shadow focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-blue"
                >
                  <span className="block text-sm font-semibold text-slate-900">
                    {doc.name}
                  </span>
                  <span className="mt-1 block text-xs text-slate-500">
                    {doc.description}
                  </span>
                </button>
              </li>
            ))}
          </ul>
        </section>

        <section>
          <h2 className="mb-4 text-base font-semibold text-brand-navy">Not sure?</h2>
          <ChatPanel
            documentId={null}
            documentMarkdown=""
            greeting={INTAKE_GREETING}
            onResult={(res) => {
              if (res.documentId) onSelect(res.documentId);
            }}
          />
        </section>
      </div>
    </div>
  );
}
