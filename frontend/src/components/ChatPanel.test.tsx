import { describe, it, expect, vi, afterEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import ChatPanel from "./ChatPanel";

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("ChatPanel", () => {
  it("shows the greeting on mount", () => {
    render(
      <ChatPanel
        documentId={null}
        documentMarkdown=""
        greeting="Pick a document to begin."
        onResult={vi.fn()}
      />,
    );
    expect(screen.getByText("Pick a document to begin.")).toBeInTheDocument();
  });

  it("posts the message, renders the reply, and reports the result", async () => {
    const response = {
      reply: "Sounds like a CSA.",
      documentId: "CSA",
      documentMarkdown: "",
    };
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => response,
    });
    vi.stubGlobal("fetch", fetchMock);

    const onResult = vi.fn();
    render(
      <ChatPanel
        documentId={null}
        documentMarkdown=""
        greeting="Hi"
        onResult={onResult}
      />,
    );
    fireEvent.change(screen.getByLabelText(/message/i), {
      target: { value: "cloud service agreement" },
    });
    fireEvent.click(screen.getByRole("button", { name: /send/i }));

    expect(await screen.findByText("Sounds like a CSA.")).toBeInTheDocument();
    expect(fetchMock).toHaveBeenCalledWith(
      "/api/chat",
      expect.objectContaining({ method: "POST" }),
    );
    await waitFor(() => expect(onResult).toHaveBeenCalledWith(response));
  });

  it("never sends the display-only greeting in the history", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ reply: "ok", documentId: "CSA", documentMarkdown: "# x" }),
    });
    vi.stubGlobal("fetch", fetchMock);

    render(
      <ChatPanel
        documentId="CSA"
        documentMarkdown="# Doc"
        greeting="GREETING TEXT"
        onResult={vi.fn()}
      />,
    );
    fireEvent.change(screen.getByLabelText(/message/i), {
      target: { value: "hello" },
    });
    fireEvent.click(screen.getByRole("button", { name: /send/i }));

    await waitFor(() => expect(fetchMock).toHaveBeenCalled());
    const sent = JSON.parse(fetchMock.mock.calls[0][1].body);
    expect(sent.messages).toEqual([{ role: "user", content: "hello" }]);
  });

  it("shows an error message when the request fails", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ ok: false, status: 502 }));

    render(
      <ChatPanel
        documentId="CSA"
        documentMarkdown="# Doc"
        greeting="Hi"
        onResult={vi.fn()}
      />,
    );
    fireEvent.change(screen.getByLabelText(/message/i), {
      target: { value: "hi" },
    });
    fireEvent.click(screen.getByRole("button", { name: /send/i }));

    expect(await screen.findByText(/couldn't reach the AI/i)).toBeInTheDocument();
  });
});
