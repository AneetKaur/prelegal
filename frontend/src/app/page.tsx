"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import ChatPanel from "@/components/ChatPanel";
import NdaForm from "@/components/NdaForm";
import NdaDocument from "@/components/NdaDocument";
import { defaultNdaForm } from "@/lib/nda";
import { clearUser, useSessionUser } from "@/lib/auth";

export default function Home() {
  const router = useRouter();
  const [data, setData] = useState(defaultNdaForm);
  const user = useSessionUser();

  // Gate the platform behind the fake login: redirect to /login if there is no
  // session. user is null on the server and until mount, so we render nothing
  // until a session is confirmed (see useSessionUser).
  useEffect(() => {
    if (!user) router.replace("/login");
  }, [user, router]);

  const handleLogout = () => {
    clearUser();
    router.replace("/login");
  };

  // Generate the PDF via the browser's print pipeline ("Save as PDF"). The
  // print stylesheet (globals.css) isolates the document, so the form and
  // page chrome are excluded and the output keeps crisp, selectable text.
  //
  // The document title seeds the suggested PDF filename. It must be restored
  // only after the print dialog is dismissed (via the `afterprint` event) —
  // restoring it synchronously would revert the title before the user saves.
  const handleDownload = () => {
    const previousTitle = document.title;
    const restore = () => {
      document.title = previousTitle;
      window.removeEventListener("afterprint", restore);
    };
    window.addEventListener("afterprint", restore);
    document.title = "Mutual-NDA";
    window.print();
  };

  if (!user) return null;

  return (
    <main className="min-h-screen bg-slate-100">
      <header className="no-print border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-4 px-6 py-4">
          <div>
            <h1 className="text-lg font-semibold text-slate-900">
              Mutual NDA Creator
            </h1>
            <p className="text-sm text-slate-500">
              Chat with the assistant to fill in your agreement, then download a PDF.
            </p>
          </div>
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={handleDownload}
              className="rounded-md bg-slate-900 px-4 py-2 text-sm font-medium text-white shadow-sm transition hover:bg-slate-700 focus:outline-none focus:ring-2 focus:ring-slate-400"
            >
              Download PDF
            </button>
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

      <div className="mx-auto grid max-w-7xl grid-cols-1 gap-8 px-6 py-8 lg:grid-cols-[minmax(0,420px)_minmax(0,1fr)]">
        <div className="no-print space-y-5">
          <ChatPanel data={data} onChange={setData} />
          <NdaForm data={data} onChange={setData} />
        </div>

        <div className="print-area">
          <p className="no-print mb-3 text-xs font-medium uppercase tracking-wide text-slate-400">
            Live preview
          </p>
          <NdaDocument data={data} />
        </div>
      </div>
    </main>
  );
}
