"use client";

import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import rehypeRaw from "rehype-raw";

/**
 * Renders a document's markdown as the live preview and print target. Templates
 * use GitHub-flavored markdown (tables, "- [ ]" checkboxes) plus a little inline
 * HTML, so we enable remark-gfm and rehype-raw. The `document-preview` class is
 * the print isolation target (see globals.css).
 */
export default function DocumentPreview({ markdown }: { markdown: string }) {
  return (
    <article className="document-preview rounded-lg border border-slate-200 bg-white p-8 text-sm leading-relaxed text-slate-800 shadow-sm">
      <ReactMarkdown remarkPlugins={[remarkGfm]} rehypePlugins={[rehypeRaw]}>
        {markdown}
      </ReactMarkdown>
    </article>
  );
}
