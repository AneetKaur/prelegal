// Client-side session for the platform. Registering or signing in returns an
// opaque bearer token that we keep in localStorage alongside the user's basic
// details; protected API calls send it as `Authorization: Bearer <token>`.

import { useSyncExternalStore } from "react";

const STORAGE_KEY = "prelegal.session";

export interface SessionUser {
  token: string;
  email: string;
  name?: string | null;
}

export function getUser(): SessionUser | null {
  if (typeof window === "undefined") return null;
  const raw = window.localStorage.getItem(STORAGE_KEY);
  return raw ? (JSON.parse(raw) as SessionUser) : null;
}

export function getToken(): string | null {
  return getUser()?.token ?? null;
}

export function setUser(user: SessionUser): void {
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(user));
}

export function clearUser(): void {
  window.localStorage.removeItem(STORAGE_KEY);
}

// --- Auth API ----------------------------------------------------------------

interface AuthResponse {
  token: string;
  user: { email: string; name?: string | null };
}

async function authRequest(
  path: string,
  body: Record<string, unknown>,
): Promise<SessionUser> {
  const res = await fetch(path, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const detail = await res
      .json()
      .then((b) => b.detail)
      .catch(() => null);
    throw new Error(detail || "Something went wrong. Please try again.");
  }
  const data = (await res.json()) as AuthResponse;
  const session: SessionUser = {
    token: data.token,
    email: data.user.email,
    name: data.user.name,
  };
  setUser(session);
  return session;
}

export function register(
  email: string,
  password: string,
  name: string | null,
): Promise<SessionUser> {
  return authRequest("/api/register", { email, password, name });
}

export function login(email: string, password: string): Promise<SessionUser> {
  return authRequest("/api/login", { email, password });
}

/** Invalidate the session server-side (best effort) and clear it locally. */
export async function logout(): Promise<void> {
  const token = getToken();
  if (token) {
    await fetch("/api/logout", {
      method: "POST",
      headers: { Authorization: `Bearer ${token}` },
    }).catch(() => {});
  }
  clearUser();
}

// --- useSessionUser ----------------------------------------------------------
// Read the session in a component without tripping hydration: useSyncExternalStore
// renders the server snapshot (null) first, then the client snapshot after mount.
// The snapshot is cached by raw string so its identity is stable across renders.

let cachedRaw: string | null = null;
let cachedUser: SessionUser | null = null;

function getSnapshot(): SessionUser | null {
  const raw = window.localStorage.getItem(STORAGE_KEY);
  if (raw !== cachedRaw) {
    cachedRaw = raw;
    cachedUser = raw ? (JSON.parse(raw) as SessionUser) : null;
  }
  return cachedUser;
}

// The session only changes via login/logout, which both navigate and remount the
// reading component, so there is nothing to subscribe to within a mounted view.
function subscribe(): () => void {
  return () => {};
}

export function useSessionUser(): SessionUser | null {
  return useSyncExternalStore(subscribe, getSnapshot, () => null);
}
