import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import Home from "./page";
import { setUser } from "@/lib/auth";

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn(), replace: vi.fn() }),
}));

const TEMPLATE = "# Standard Terms\n\nConfidential.";

// Route fetch by URL: catalog, a template, the user's saved documents, and a
// single saved document. `saved` lets a test seed the history list.
function stubFetch(saved: unknown[] = []) {
  const fetchMock = vi.fn((url: string) => {
    if (url === "/api/catalog") {
      return Promise.resolve({
        ok: true,
        json: async () => [
          { id: "Mutual-NDA", name: "Mutual NDA", description: "An NDA." },
        ],
      });
    }
    if (url === "/api/my-documents") {
      return Promise.resolve({ ok: true, json: async () => saved });
    }
    if (url === "/api/documents/Mutual-NDA") {
      return Promise.resolve({
        ok: true,
        json: async () => ({ id: "Mutual-NDA", name: "Mutual NDA", markdown: TEMPLATE }),
      });
    }
    if (url === "/api/my-documents/7") {
      return Promise.resolve({
        ok: true,
        json: async () => ({
          id: 7,
          documentId: "Mutual-NDA",
          title: "Saved NDA",
          markdown: "# Reopened\n\nFrom history.",
        }),
      });
    }
    throw new Error(`unexpected fetch: ${url}`);
  });
  vi.stubGlobal("fetch", fetchMock);
}

describe("Document creator page", () => {
  // The page is gated behind the session, so seed one (now including a token).
  beforeEach(() => {
    setUser({ token: "tok", email: "test@example.com", name: "Tester" });
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

  it("shows the legal disclaimer banner", () => {
    render(<Home />);
    expect(screen.getByText(/not legal advice/i)).toBeInTheDocument();
  });

  it("opens the workspace and renders the template after selecting a document", async () => {
    const { container } = render(<Home />);

    fireEvent.click(await screen.findByRole("button", { name: /Mutual NDA/i }));

    await waitFor(() => {
      const preview = container.querySelector(".document-preview");
      expect(preview?.textContent).toContain("Standard Terms");
    });
    expect(screen.getByRole("button", { name: /Download PDF/i })).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: /save to my documents/i }),
    ).toBeInTheDocument();
  });

  it("lists saved documents and reopens one from history", async () => {
    stubFetch([
      {
        id: 7,
        documentId: "Mutual-NDA",
        title: "Saved NDA",
        createdAt: "2026-06-20 10:00:00",
        updatedAt: "2026-06-20 11:00:00",
      },
    ]);
    const { container } = render(<Home />);

    fireEvent.click(await screen.findByRole("button", { name: /Saved NDA/i }));

    await waitFor(() => {
      const preview = container.querySelector(".document-preview");
      expect(preview?.textContent).toContain("Reopened");
    });
  });
});
