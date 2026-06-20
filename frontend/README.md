# Mutual NDA Creator (KAN-3)

A small Next.js app that turns a short form into a completed **Mutual
Non-Disclosure Agreement** and lets the user download it as a PDF.

It is the prototype described in [KAN-3](https://aneetsachdeva.atlassian.net/browse/KAN-3):

1. The user fills in the deal-specific details (purpose, dates, term, governing
   law, and each party's information).
2. The agreement renders live, combining the **Cover Page** with the
   **Common Paper Mutual NDA Standard Terms (v1.0)** with the values woven in.
3. The user downloads the finished document as a PDF.

The legal text is reproduced from the templates in this repo's
[`templates/`](../templates) directory (`Mutual-NDA.md` and
`Mutual-NDA-coverpage.md`), which are sourced from
[Common Paper](https://commonpaper.com/standards/mutual-nda/) under CC BY 4.0.

## Stack

- Next.js (App Router) + TypeScript
- Tailwind CSS
- Fully client-side — no backend or database. The PDF is produced through the
  browser's print pipeline ("Save as PDF"), so the output keeps crisp,
  selectable text.

## Development

```bash
npm install
npm run dev      # http://localhost:3000
npm run build    # production build
npm run lint
```

## How the PDF download works

Clicking **Download PDF** calls `window.print()`. A print stylesheet in
`src/app/globals.css` hides the page chrome and the form, leaving only the
rendered agreement, which the browser saves as a PDF.

## Project layout

| Path | Purpose |
| --- | --- |
| `src/lib/nda.ts` | Form data model, defaults, and value formatting |
| `src/components/NdaForm.tsx` | The input form |
| `src/components/NdaDocument.tsx` | The rendered Cover Page + Standard Terms |
| `src/app/page.tsx` | Wires state together and triggers the PDF download |
