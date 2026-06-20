import { describe, it, expect } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import Home from "./page";

function getDocument(container: HTMLElement): HTMLElement {
  const doc = container.querySelector(".nda-document");
  if (!doc) throw new Error("NDA document preview not found");
  return doc as HTMLElement;
}

describe("Mutual NDA creator page", () => {
  it("renders both the form heading and the document preview", () => {
    render(<Home />);
    expect(
      screen.getByRole("heading", { name: "Mutual NDA Creator" })
    ).toBeInTheDocument();
    expect(
      screen.getByRole("heading", { name: "Mutual Non-Disclosure Agreement" })
    ).toBeInTheDocument();
  });

  it("flows a typed governing law into the rendered Standard Terms", () => {
    const { container } = render(<Home />);
    const doc = getDocument(container);

    // Before input, the Standard Terms show the bracketed placeholder.
    expect(doc.textContent).toContain("[Governing Law]");

    fireEvent.change(screen.getByLabelText("Governing Law (State)"), {
      target: { value: "Delaware" },
    });

    expect(doc.textContent).not.toContain("[Governing Law]");
    expect(doc.textContent).toContain("laws of the State of Delaware");
  });

  it("shows a placeholder for the effective date until one is chosen", () => {
    const { container } = render(<Home />);
    expect(getDocument(container).textContent).toContain("[Effective Date]");
  });

  it("renders the correct §5 wording when the MNDA continues until terminated", () => {
    const { container } = render(<Home />);
    const doc = getDocument(container);

    fireEvent.click(
      screen.getByRole("radio", { name: /continues until terminated/i })
    );

    // The grammatically broken "expires at the end of until terminated" must
    // never appear; the clause should read as a coherent sentence instead.
    expect(doc.textContent).not.toContain("expires at the end of until");
    expect(doc.textContent).toContain(
      "and continues until terminated in accordance with the terms of this MNDA"
    );
  });
});
