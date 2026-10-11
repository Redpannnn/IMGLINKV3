"use client";

import { useSyncExternalStore, useCallback, useEffect } from "react";

const STORAGE_KEY = "imghost_auth";
// Session expires after 30 minutes of inactivity (sliding window).
const SESSION_TIMEOUT_MS = 30 * 60 * 1000;
// Demo credentials (per user request)
const VALID_USERNAME = "memoraa";
const VALID_PASSWORD = "memoraa'";

interface SessionData {
  v: 1;
  loginAt: number;
  lastActivity: number;
}

// --- External store around localStorage so components subscribe to changes ---
const listeners = new Set<() => void>();

function subscribe(callback: () => void) {
  listeners.add(callback);
  // Cross-tab sync: localStorage changes in other tabs fire a "storage" event
  // only in the *other* tabs (not the one that wrote). We re-check on it so
  // logout/login/expiry in one tab is reflected immediately in every tab.
  const onStorage = (e: StorageEvent) => {
    if (e.key === STORAGE_KEY || e.key === null) callback();
  };
  window.addEventListener("storage", onStorage);
  return () => {
    listeners.delete(callback);
    window.removeEventListener("storage", onStorage);
  };
}

function readSession(): SessionData | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const data = JSON.parse(raw) as SessionData;
    if (data.v !== 1) return null;
    return data;
  } catch {
    return null;
  }
}

// Pure snapshot read — no side effects (required by useSyncExternalStore).
function getSnapshot(): boolean {
  const session = readSession();
  if (!session) return false;
  return Date.now() - session.lastActivity <= SESSION_TIMEOUT_MS;
}

function getServerSnapshot(): boolean {
  // During SSR / first hydration we treat the user as logged out.
  return false;
}

function emitChange() {
  listeners.forEach((l) => l());
}

function writeSession(data: SessionData) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
    emitChange();
  } catch {
    // ignore storage errors
  }
}

function clearSession() {
  try {
    localStorage.removeItem(STORAGE_KEY);
    emitChange();
  } catch {
    // ignore storage errors
  }
}

// Throttled activity bump: refreshes lastActivity while the user is active,
// extending the session (sliding window). Does NOT emit change because the
// authenticated boolean stays the same — avoids unnecessary re-renders.
let activityThrottle: ReturnType<typeof setTimeout> | null = null;
function bumpActivity() {
  const session = readSession();
  if (!session) return;
  // If already expired, do not refresh — let the expiry timer handle logout.
  if (Date.now() - session.lastActivity > SESSION_TIMEOUT_MS) return;
  const updated: SessionData = { ...session, lastActivity: Date.now() };
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
  } catch {
    // ignore
  }
}

function handleUserActivity() {
  if (activityThrottle) clearTimeout(activityThrottle);
  // Update at most once every 2 seconds to avoid excessive storage writes.
  activityThrottle = setTimeout(bumpActivity, 2000);
}

export function useAuth() {
  const isAuthenticated = useSyncExternalStore(
    subscribe,
    getSnapshot,
    getServerSnapshot
  );

  const login = useCallback(
    (username: string, password: string): boolean => {
      if (username.trim() === VALID_USERNAME && password === VALID_PASSWORD) {
        const now = Date.now();
        writeSession({ v: 1, loginAt: now, lastActivity: now });
        return true;
      }
      return false;
    },
    []
  );

  const logout = useCallback(() => {
    clearSession();
  }, []);

  // Track user activity and periodically check for session expiry (only while
  // authenticated). When the session expires, emit so the UI flips to the
  // login page.
  useEffect(() => {
    if (!isAuthenticated) return;

    const events: Array<keyof WindowEventMap> = [
      "mousedown",
      "keydown",
      "scroll",
      "touchstart",
    ];
    events.forEach((evt) =>
      window.addEventListener(evt, handleUserActivity, { passive: true })
    );

    // Poll for expiry every 15 seconds.
    const checkTimer = window.setInterval(() => {
      if (!getSnapshot()) {
        emitChange(); // triggers re-render → login page
      }
    }, 15000);

    // When the tab regains focus (user returns from another tab/app), re-check
    // immediately so a long-idle session logs out without waiting 15s.
    const onFocus = () => {
      if (!getSnapshot()) {
        emitChange();
      }
    };
    window.addEventListener("focus", onFocus);

    return () => {
      if (activityThrottle) clearTimeout(activityThrottle);
      events.forEach((evt) =>
        window.removeEventListener(evt, handleUserActivity)
      );
      window.clearInterval(checkTimer);
      window.removeEventListener("focus", onFocus);
    };
  }, [isAuthenticated]);

  return { isAuthenticated, isLoading: false, login, logout };
}