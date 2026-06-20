import { describe, it, expect, beforeEach, vi } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import LoginPage from "./page";
import { getUser } from "@/lib/auth";

const replace = vi.fn();
const push = vi.fn();

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push, replace }),
}));

describe("Login page", () => {
  beforeEach(() => {
    push.mockReset();
    window.localStorage.clear();
  });

  it("renders the email field and sign-in button", () => {
    render(<LoginPage />);
    expect(screen.getByLabelText(/Email/)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /sign in/i })).toBeInTheDocument();
  });

  it("posts to /api/login, stores the user, and routes home on success", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ ok: true, user: { email: "a@example.com", name: "Ann" } }),
    });
    vi.stubGlobal("fetch", fetchMock);

    render(<LoginPage />);
    fireEvent.change(screen.getByLabelText(/Email/), {
      target: { value: "a@example.com" },
    });
    fireEvent.click(screen.getByRole("button", { name: /sign in/i }));

    await waitFor(() => expect(push).toHaveBeenCalledWith("/"));
    expect(fetchMock).toHaveBeenCalledWith(
      "/api/login",
      expect.objectContaining({ method: "POST" })
    );
    expect(getUser()?.email).toBe("a@example.com");

    vi.unstubAllGlobals();
  });

  it("shows an error and does not route when the request fails", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ ok: false }));

    render(<LoginPage />);
    fireEvent.change(screen.getByLabelText(/Email/), {
      target: { value: "a@example.com" },
    });
    fireEvent.click(screen.getByRole("button", { name: /sign in/i }));

    expect(await screen.findByText(/something went wrong/i)).toBeInTheDocument();
    expect(push).not.toHaveBeenCalled();

    vi.unstubAllGlobals();
  });
});
