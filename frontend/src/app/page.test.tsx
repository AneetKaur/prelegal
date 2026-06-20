import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import Home from "./page";
import { setUser } from "@/lib/auth";

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn(), replace: vi.fn() }),
}));

// Route fetch by URL: the catalog list and a document's template markdown.
function stubFetch() {
  const fetchMock = vi.fn((url: string) => {
    if (url === "/api/catalog") {
      return Promise.resolve({
        ok: true,
        json: async () => [
          { id: "Mutual-NDA", name: "Mutual NDA", description: "An NDA." },
        ],
      });
    }
    if (url === "/api/documents/Mutual-NDA") {
      return Promise.resolve({
        ok: true,
        json: async () => ({
          id: "Mutual-NDA",
          name: "Mutual NDA",
          markdown: "# Standard Terms\n\nConfidential.",
        }),
      });
    }
    throw new Error(`unexpected fetch: ${url}`);
  });
  vi.stubGlobal("fetch", fetchMock);
}

describe("Document creator page", () => {
  // The page is gated behind the fake login, so seed a session first.
  beforeEach(() => {
    setUser({ email: "test@example.com", name: "Tester" });
    stubFetch();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("shows the catalog picker with documents to choose from", async () => {
    render(<Home />);
    expect(
      screen.getByRole("heading", { name: "Choose a document" }),
    ).toBeInTheDocument();
    expect(
      await screen.findByRole("button", { name: /Mutual NDA/i }),
    ).toBeInTheDocument();
  });

  it("opens the workspace and renders the template after selecting a document", async () => {
    const { container } = render(<Home />);

    fireEvent.click(await screen.findByRole("button", { name: /Mutual NDA/i }));

    await waitFor(() => {
      const preview = container.querySelector(".document-preview");
      expect(preview?.textContent).toContain("Standard Terms");
    });
    expect(
      screen.getByRole("button", { name: /Download PDF/i }),
    ).toBeInTheDocument();
  });
});
