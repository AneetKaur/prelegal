import { describe, it, expect, vi, afterEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import ChatPanel from "./ChatPanel";
import { defaultNdaForm } from "@/lib/nda";

afterEach(() => {
  vi.unstubAllGlobals();
});

function renderPanel() {
  const onChange = vi.fn();
  render(<ChatPanel data={defaultNdaForm()} onChange={onChange} />);
  return onChange;
}

describe("ChatPanel", () => {
  it("shows the assistant greeting on mount", () => {
    renderPanel();
    expect(screen.getByText(/help you put together a Mutual NDA/i)).toBeInTheDocument();
  });

  it("posts the message, renders the reply, and pushes returned fields up", async () => {
    const updated = { ...defaultNdaForm(), governingLaw: "Delaware" };
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ reply: "Using Delaware law.", fields: updated }),
    });
    vi.stubGlobal("fetch", fetchMock);

    const onChange = renderPanel();
    fireEvent.change(screen.getByLabelText(/message/i), {
      target: { value: "Delaware" },
    });
    fireEvent.click(screen.getByRole("button", { name: /send/i }));

    expect(await screen.findByText("Using Delaware law.")).toBeInTheDocument();
    expect(fetchMock).toHaveBeenCalledWith(
      "/api/chat",
      expect.objectContaining({ method: "POST" }),
    );
    await waitFor(() => expect(onChange).toHaveBeenCalledWith(updated));
  });

  it("shows an error message when the request fails", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ ok: false, status: 502 }));

    renderPanel();
    fireEvent.change(screen.getByLabelText(/message/i), {
      target: { value: "hi" },
    });
    fireEvent.click(screen.getByRole("button", { name: /send/i }));

    expect(await screen.findByText(/couldn't reach the AI/i)).toBeInTheDocument();
  });
});
