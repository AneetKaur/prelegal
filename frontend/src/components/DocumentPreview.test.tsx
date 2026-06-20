import { describe, it, expect } from "vitest";
import { render } from "@testing-library/react";
import DocumentPreview from "./DocumentPreview";

describe("DocumentPreview", () => {
  it("renders markdown headings, tables and inline html", () => {
    const markdown = [
      "# Title",
      "",
      "Some **bold** text.",
      "",
      "| A | B |",
      "| - | - |",
      "| 1 | 2 |",
      "",
      '<span class="coverpage_link">Purpose</span>',
    ].join("\n");

    const { container } = render(<DocumentPreview markdown={markdown} />);

    expect(container.querySelector("h1")?.textContent).toBe("Title");
    expect(container.querySelector("table")).toBeTruthy();
    expect(container.querySelector("span.coverpage_link")?.textContent).toBe(
      "Purpose",
    );
  });
});
