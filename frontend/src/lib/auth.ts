// Client-side session state for the fake login. There is no real authentication
// yet (see KAN-4); we just remember in localStorage that the user has entered the
// platform so the app can gate the main page and offer a logout.

import { useSyncExternalStore } from "react";

const STORAGE_KEY = "prelegal.user";

export interface SessionUser {
  email: string;
  name?: string | null;
}

export function getUser(): SessionUser | null {
  if (typeof window === "undefined") return null;
  const raw = window.localStorage.getItem(STORAGE_KEY);
  return raw ? (JSON.parse(raw) as SessionUser) : null;
}

export function setUser(user: SessionUser): void {
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(user));
}

export function clearUser(): void {
  window.localStorage.removeItem(STORAGE_KEY);
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
