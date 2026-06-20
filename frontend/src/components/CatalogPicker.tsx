"use client";

import { useEffect, useState } from "react";
import { fetchCatalog, type DocumentSummary } from "@/lib/documents";
import ChatPanel from "@/components/ChatPanel";

const INTAKE_GREETING =
  "Hi! Tell me what kind of document you need and I'll find the right one. " +
  "If we don't have it, I'll suggest the closest match we can create.";

/**
 * Landing screen: a grid of catalog documents to pick from, plus an intake chat
 * for users who aren't sure or describe an unsupported document. Both routes
 * call `onSelect` with the chosen document id.
 */
export default function CatalogPicker({
  onSelect,
}: {
  onSelect: (id: string) => void;
}) {
  const [catalog, setCatalog] = useState<DocumentSummary[]>([]);
  const [error, setError] = useState(false);

  useEffect(() => {
    fetchCatalog().then(setCatalog).catch(() => setError(true));
  }, []);

  return (
    <div className="grid grid-cols-1 gap-8 lg:grid-cols-[minmax(0,1fr)_minmax(0,380px)]">
      <div>
        <h2 className="mb-4 text-base font-semibold" style={{ color: "#032147" }}>
          Choose a document
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
                className="h-full w-full rounded-lg border border-slate-200 bg-white p-4 text-left shadow-sm transition hover:border-slate-400 hover:shadow focus:outline-none focus:ring-2 focus:ring-slate-300"
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
      </div>

      <div>
        <h2 className="mb-4 text-base font-semibold" style={{ color: "#032147" }}>
          Not sure?
        </h2>
        <ChatPanel
          documentId={null}
          documentMarkdown=""
          greeting={INTAKE_GREETING}
          onResult={(res) => {
            if (res.documentId) onSelect(res.documentId);
          }}
        />
      </div>
    </div>
  );
}
