"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Button from "@/components/Button";
import ChatPanel from "@/components/ChatPanel";
import CatalogPicker from "@/components/CatalogPicker";
import DocumentPreview from "@/components/DocumentPreview";
import { fetchTemplate, fetchMyDocument, saveDocument } from "@/lib/documents";
import { logout, useSessionUser } from "@/lib/auth";

type SaveState = "idle" | "saving" | "saved" | "error";

/** A readable title for the saved document: the first heading, else the type. */
function deriveTitle(markdown: string, fallback: string): string {
  const heading = markdown.split("\n").find((line) => line.startsWith("# "));
  return heading ? heading.replace(/^#\s+/, "").trim().slice(0, 120) : fallback;
}

export default function Home() {
  const router = useRouter();
  const user = useSessionUser();

  // Document workflow state. documentId null => the catalog picker is shown;
  // once a document is chosen we load its markdown and show the workspace.
  // savedId tracks the saved-document row so re-saving updates it in place.
  const [documentId, setDocumentId] = useState<string | null>(null);
  const [markdown, setMarkdown] = useState("");
  const [savedId, setSavedId] = useState<number | null>(null);
  const [saveState, setSaveState] = useState<SaveState>("idle");
  const [loadError, setLoadError] = useState<string | null>(null);

  // Gate the platform behind the session: redirect to /login if there is none.
  // user is null on the server and until mount, so render nothing until confirmed.
  useEffect(() => {
    if (!user) router.replace("/login");
  }, [user, router]);

  // Editing the document means it differs from what was saved; surface "Save" again.
  const updateMarkdown = (value: string) => {
    setMarkdown(value);
    setSaveState("idle");
  };

  const selectDocument = async (id: string) => {
    try {
      const template = await fetchTemplate(id);
      setMarkdown(template);
      setDocumentId(id);
      setSavedId(null);
      setSaveState("idle");
    } catch {
      setLoadError("Couldn't load that document. Please try again.");
    }
  };

  const openSaved = async (id: number) => {
    try {
      const doc = await fetchMyDocument(id);
      setMarkdown(doc.markdown);
      setDocumentId(doc.documentId);
      setSavedId(doc.id);
      setSaveState("saved");
    } catch {
      setLoadError("Couldn't open that saved document. Please try again.");
    }
  };

  const back = () => {
    setDocumentId(null);
    setMarkdown("");
    setSavedId(null);
    setLoadError(null);
  };

  const handleLogout = async () => {
    await logout();
    router.replace("/login");
  };

  /** Persist the current document; returns the saved row id (or null on failure). */
  const persist = async (): Promise<number | null> => {
    if (!documentId) return null;
    setSaveState("saving");
    try {
      const title = deriveTitle(markdown, documentId);
      const saved = await saveDocument(
        documentId,
        title,
        markdown,
        savedId ?? undefined,
      );
      setSavedId(saved.id);
      setSaveState("saved");
      return saved.id;
    } catch {
      // A stale savedId (e.g. the throwaway DB was reset) would make every retry
      // fail the UPDATE path; clear it so the next attempt inserts a fresh row.
      setSaveState("error");
      setSavedId(null);
      return null;
    }
  };

  // Generate the PDF via the browser's print pipeline ("Save as PDF"), and also
  // persist the document so finished drafts land in the user's history. The print
  // stylesheet (globals.css) isolates the document; the title seeds the filename
  // and is restored only after the dialog closes (afterprint).
  const handleDownload = async () => {
    await persist();
    const previousTitle = document.title;
    const restore = () => {
      document.title = previousTitle;
      window.removeEventListener("afterprint", restore);
    };
    window.addEventListener("afterprint", restore);
    document.title = documentId ?? "document";
    window.print();
  };

  const saveLabel =
    saveState === "saving"
      ? "Saving…"
      : saveState === "saved"
        ? "Saved ✓"
        : saveState === "error"
          ? "Save failed — retry"
          : "Save to my documents";

  if (!user) return null;

  return (
    <main className="min-h-screen bg-slate-100">
      <header className="no-print border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-4 px-6 py-4">
          <div className="flex items-center gap-3">
            <span className="rounded-md bg-brand-navy px-2 py-1 text-xs font-bold uppercase tracking-wide text-white">
              Prelegal
            </span>
            <div>
              <h1 className="text-lg font-semibold text-brand-navy">
                Document Creator
              </h1>
              <p className="text-sm text-slate-500">
                Chat with the assistant to draft your legal document, then save or
                download it.
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            {documentId && (
              <>
                <Button variant="secondary" onClick={back}>
                  Change document
                </Button>
                <Button
                  variant="secondary"
                  onClick={persist}
                  disabled={saveState === "saving"}
                >
                  {saveLabel}
                </Button>
                <Button onClick={handleDownload}>Download PDF</Button>
              </>
            )}
            <span className="hidden text-sm text-slate-500 sm:inline">
              {user.name || user.email}
            </span>
            <Button variant="secondary" onClick={handleLogout}>
              Log out
            </Button>
          </div>
        </div>
      </header>

      <div className="no-print bg-brand-yellow/15 border-b border-brand-yellow/40">
        <p className="mx-auto max-w-7xl px-6 py-2 text-xs text-[#5b4a13]">
          <strong>Draft, not legal advice.</strong> Documents created here are AI-generated
          drafts and must be reviewed by a qualified attorney before use.
        </p>
      </div>

      <div className="mx-auto max-w-7xl px-6 py-8">
        {loadError && (
          <p className="mb-4 rounded-md bg-red-50 px-4 py-2 text-sm text-red-700">
            {loadError}
          </p>
        )}
        {!documentId ? (
          <CatalogPicker onSelect={selectDocument} onOpen={openSaved} />
        ) : (
          <div className="grid grid-cols-1 gap-8 lg:grid-cols-[minmax(0,420px)_minmax(0,1fr)]">
            <div className="no-print space-y-5">
              <ChatPanel
                documentId={documentId}
                documentMarkdown={markdown}
                greeting="Let's fill in your document. What details should we start with?"
                onResult={(res) => updateMarkdown(res.documentMarkdown)}
              />
              <details className="rounded-lg border border-slate-200 bg-white p-4">
                <summary className="cursor-pointer text-sm font-medium text-slate-700">
                  Edit raw markdown
                </summary>
                <textarea
                  aria-label="Document markdown"
                  className="mt-3 h-64 w-full rounded-md border border-slate-300 p-3 font-mono text-xs text-slate-900 outline-none focus:border-slate-500 focus:ring-2 focus:ring-slate-200"
                  value={markdown}
                  onChange={(e) => updateMarkdown(e.target.value)}
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
