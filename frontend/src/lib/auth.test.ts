import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { register, login, logout, getUser, getToken, setUser } from "@/lib/auth";

beforeEach(() => {
  window.localStorage.clear();
});

afterEach(() => {
  vi.unstubAllGlobals();
});

function stubFetch(body: unknown, ok = true) {
  const fetchMock = vi.fn().mockResolvedValue({ ok, json: async () => body });
  vi.stubGlobal("fetch", fetchMock);
  return fetchMock;
}

describe("auth client", () => {
  it("register stores the returned token and user", async () => {
    stubFetch({ token: "t1", user: { email: "a@example.com", name: "Ann" } });
    const session = await register("a@example.com", "password123", "Ann");
    expect(session.token).toBe("t1");
    expect(getToken()).toBe("t1");
    expect(getUser()?.email).toBe("a@example.com");
  });

  it("login stores the session", async () => {
    stubFetch({ token: "t2", user: { email: "b@example.com" } });
    await login("b@example.com", "password123");
    expect(getToken()).toBe("t2");
  });

  it("surfaces the server's error detail on failure", async () => {
    stubFetch({ detail: "Invalid email or password." }, false);
    await expect(login("b@example.com", "x")).rejects.toThrow(
      /invalid email or password/i,
    );
  });

  it("logout clears the local session and calls the endpoint", async () => {
    setUser({ token: "t3", email: "c@example.com" });
    const fetchMock = stubFetch({ ok: true });
    await logout();
    expect(getUser()).toBeNull();
    expect(fetchMock).toHaveBeenCalledWith(
      "/api/logout",
      expect.objectContaining({ method: "POST" }),
    );
  });
});
