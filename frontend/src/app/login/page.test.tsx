import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import LoginPage from "./page";
import { getUser } from "@/lib/auth";

const replace = vi.fn();

vi.mock("next/navigation", () => ({
  useRouter: () => ({ replace, push: vi.fn() }),
}));

describe("Login page", () => {
  beforeEach(() => {
    replace.mockReset();
    window.localStorage.clear();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("renders email + password fields and a sign-in button", () => {
    render(<LoginPage />);
    expect(screen.getByLabelText(/Email/)).toBeInTheDocument();
    expect(screen.getByLabelText(/Password/)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /^sign in$/i })).toBeInTheDocument();
  });

  it("signs in: posts to /api/login, stores the session, routes home", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ token: "tok-123", user: { email: "a@example.com", name: "Ann" } }),
    });
    vi.stubGlobal("fetch", fetchMock);

    render(<LoginPage />);
    fireEvent.change(screen.getByLabelText(/Email/), {
      target: { value: "a@example.com" },
    });
    fireEvent.change(screen.getByLabelText(/Password/), {
      target: { value: "password123" },
    });
    fireEvent.click(screen.getByRole("button", { name: /^sign in$/i }));

    await waitFor(() => expect(replace).toHaveBeenCalledWith("/"));
    expect(fetchMock).toHaveBeenCalledWith(
      "/api/login",
      expect.objectContaining({ method: "POST" }),
    );
    expect(getUser()?.token).toBe("tok-123");
    expect(getUser()?.email).toBe("a@example.com");
  });

  it("switches to register mode and posts to /api/register", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ token: "tok-9", user: { email: "new@example.com" } }),
    });
    vi.stubGlobal("fetch", fetchMock);

    render(<LoginPage />);
    fireEvent.click(screen.getByRole("button", { name: /create an account/i }));
    fireEvent.change(screen.getByLabelText(/Email/), {
      target: { value: "new@example.com" },
    });
    fireEvent.change(screen.getByLabelText(/Password/), {
      target: { value: "password123" },
    });
    fireEvent.click(screen.getByRole("button", { name: /create account/i }));

    await waitFor(() => expect(replace).toHaveBeenCalledWith("/"));
    expect(fetchMock).toHaveBeenCalledWith(
      "/api/register",
      expect.objectContaining({ method: "POST" }),
    );
  });

  it("shows the server's error message and does not route on failure", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: false,
        json: async () => ({ detail: "Invalid email or password." }),
      }),
    );

    render(<LoginPage />);
    fireEvent.change(screen.getByLabelText(/Email/), {
      target: { value: "a@example.com" },
    });
    fireEvent.change(screen.getByLabelText(/Password/), {
      target: { value: "nope12345" },
    });
    fireEvent.click(screen.getByRole("button", { name: /^sign in$/i }));

    expect(await screen.findByText(/invalid email or password/i)).toBeInTheDocument();
    expect(replace).not.toHaveBeenCalled();
  });
});
