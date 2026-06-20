"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import ChatPanel from "@/components/ChatPanel";
import CatalogPicker from "@/components/CatalogPicker";
import DocumentPreview from "@/components/DocumentPreview";
import { fetchTemplate } from "@/lib/documents";
import { clearUser, useSessionUser } from "@/lib/auth";

export default function Home() {
  const router = useRouter();
  const user = useSessionUser();

  // Document workflow state. documentId null => the catalog picker is shown;
  // once a document is chosen we load its template markdown and show the
  // workspace (chat + live preview).
  const [documentId, setDocumentId] = useState<string | null>(null);
  const [markdown, setMarkdown] = useState("");
  const [loadError, setLoadError] = useState<string | null>(null);

  // Gate the platform behind the fake login: redirect to /login if there is no
  // session. user is null on the server and until mount, so we render nothing
  // until a session is confirmed (see useSessionUser).
  useEffect(() => {
    if (!user) router.replace("/login");
  }, [user, router]);

  const selectDocument = async (id: string) => {
    try {
      const template = await fetchTemplate(id);
      setMarkdown(template);
      setDocumentId(id);
    } catch {
      setLoadError("Couldn't load that document. Please try again.");
    }
  };

  const back = () => {
    setDocumentId(null);
    setMarkdown("");
  };

  const handleLogout = () => {
    clearUser();
    router.replace("/login");
  };

  // Generate the PDF via the browser's print pipeline ("Save as PDF"). The
  // print stylesheet (globals.css) isolates the document. The document title
  // seeds the suggested filename and must be restored only after the dialog is
  // dismissed (via afterprint).
  const handleDownload = () => {
    const previousTitle = document.title;
    const restore = () => {
      document.title = previousTitle;
      window.removeEventListener("afterprint", restore);
    };
    window.addEventListener("afterprint", restore);
    document.title = documentId ?? "document";
    window.print();
  };

  if (!user) return null;

  return (
    <main className="min-h-screen bg-slate-100">
      <header className="no-print border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-4 px-6 py-4">
          <div>
            <h1 className="text-lg font-semibold text-slate-900">
              Prelegal Document Creator
            </h1>
            <p className="text-sm text-slate-500">
              Chat with the assistant to draft your legal document, then download a PDF.
            </p>
          </div>
          <div className="flex items-center gap-3">
            {documentId && (
              <>
                <button
                  type="button"
                  onClick={back}
                  className="rounded-md border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-slate-300"
                >
                  Change document
                </button>
                <button
                  type="button"
                  onClick={handleDownload}
                  className="rounded-md bg-slate-900 px-4 py-2 text-sm font-medium text-white shadow-sm transition hover:bg-slate-700 focus:outline-none focus:ring-2 focus:ring-slate-400"
                >
                  Download PDF
                </button>
              </>
            )}
            <button
              type="button"
              onClick={handleLogout}
              className="rounded-md border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-slate-300"
            >
              Log out
            </button>
          </div>
        </div>
      </header>

      <div className="mx-auto max-w-7xl px-6 py-8">
        {loadError && (
          <p className="mb-4 rounded-md bg-red-50 px-4 py-2 text-sm text-red-700">
            {loadError}
          </p>
        )}
        {!documentId ? (
          <CatalogPicker onSelect={selectDocument} />
        ) : (
          <div className="grid grid-cols-1 gap-8 lg:grid-cols-[minmax(0,420px)_minmax(0,1fr)]">
            <div className="no-print space-y-5">
              <ChatPanel
                documentId={documentId}
                documentMarkdown={markdown}
                greeting="Let's fill in your document. What details should we start with?"
                onResult={(res) => setMarkdown(res.documentMarkdown)}
              />
              <details className="rounded-lg border border-slate-200 bg-white p-4">
                <summary className="cursor-pointer text-sm font-medium text-slate-700">
                  Edit raw markdown
                </summary>
                <textarea
                  aria-label="Document markdown"
                  className="mt-3 h-64 w-full rounded-md border border-slate-300 p-3 font-mono text-xs text-slate-900 outline-none focus:border-slate-500 focus:ring-2 focus:ring-slate-200"
                  value={markdown}
                  onChange={(e) => setMarkdown(e.target.value)}
                />
              </details>
            </div>

            <div>
              <p className="no-print mb-3 text-xs font-medium uppercase tracking-wide text-slate-400">
                Live preview
              </p>
              <DocumentPreview markdown={markdown} />
            </div>
          </div>
        )}
      </div>
    </main>
  );
}
