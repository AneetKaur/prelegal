"use client";

import { useState } from "react";
import NdaForm from "@/components/NdaForm";
import NdaDocument from "@/components/NdaDocument";
import { defaultNdaForm } from "@/lib/nda";

export default function Home() {
  const [data, setData] = useState(defaultNdaForm);

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

  return (
    <main className="min-h-screen bg-slate-100">
      <header className="no-print border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-4 px-6 py-4">
          <div>
            <h1 className="text-lg font-semibold text-slate-900">
              Mutual NDA Creator
            </h1>
            <p className="text-sm text-slate-500">
              Fill in the details, preview your agreement, then download a PDF.
            </p>
          </div>
          <button
            type="button"
            onClick={handleDownload}
            className="rounded-md bg-slate-900 px-4 py-2 text-sm font-medium text-white shadow-sm transition hover:bg-slate-700 focus:outline-none focus:ring-2 focus:ring-slate-400"
          >
            Download PDF
          </button>
        </div>
      </header>

      <div className="mx-auto grid max-w-7xl grid-cols-1 gap-8 px-6 py-8 lg:grid-cols-[minmax(0,420px)_minmax(0,1fr)]">
        <div className="no-print">
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
