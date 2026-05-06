"use client";

/**
 * usePasswordGate — the Boss PIN.
 *
 * Any row already mirrored to Google Sheets is "locked": the UI shows
 * it read-only with an [Unlock] chip. Clicking the chip opens
 * <PasswordDialog/>. A correct PIN (`NEXT_PUBLIC_EDIT_PIN`, default
 * "696969") unlocks edits for the current tab session (10 min idle
 * timeout or explicit relock).
 *
 * The gate is a deliberate friction: the data feeds dependent
 * variables (fit scores, allocation feasibility, readiness) so a
 * slip-of-the-finger edit can cascade silently. Dr Non wanted "a
 * sense of security" — not cryptographic security, ceremony. One
 * PIN across the org is fine.
 *
 * Scope is per tab session because (a) HR edits are deliberate, not
 * bulk; (b) auto-forgetting after 10 min means you re-confirm if you
 * come back to your desk later.
 */

import { useCallback, useEffect, useRef, useState } from "react";

const IDLE_MS = 10 * 60 * 1000; // 10 minutes
const DEFAULT_PIN = "696969";

export interface UsePasswordGateResult {
  unlocked: boolean;
  /** Attempt to unlock. Returns true on success, false on wrong pin. */
  tryUnlock: (pin: string) => boolean;
  /** Explicit relock (e.g. after user saves and wants to re-secure). */
  relock: () => void;
  /** Treat as locked — shorthand for passing to locked UI. */
  locked: boolean;
}

/**
 * @param scope - identifier for the gate. Multiple gates can coexist
 *                per page (e.g. "standards", "slots", "missions") —
 *                each remembers its own unlocked state.
 */
export function usePasswordGate(scope = "default"): UsePasswordGateResult {
  const [unlocked, setUnlocked] = useState(false);
  const idleTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const resetIdle = useCallback(() => {
    if (idleTimer.current) clearTimeout(idleTimer.current);
    idleTimer.current = setTimeout(() => setUnlocked(false), IDLE_MS);
  }, []);

  const tryUnlock = useCallback(
    (pin: string) => {
      const expected =
        (typeof process !== "undefined" && process.env?.NEXT_PUBLIC_EDIT_PIN) ||
        DEFAULT_PIN;
      if (pin.trim() === expected) {
        setUnlocked(true);
        resetIdle();
        return true;
      }
      return false;
    },
    [resetIdle],
  );

  const relock = useCallback(() => {
    setUnlocked(false);
    if (idleTimer.current) clearTimeout(idleTimer.current);
  }, []);

  useEffect(() => {
    return () => {
      if (idleTimer.current) clearTimeout(idleTimer.current);
    };
  }, []);

  // `scope` is accepted so call-sites can pass semantic labels even
  // though the current implementation holds one state per hook
  // invocation. If we ever need cross-component sharing, swap to a
  // React context keyed by scope.
  void scope;

  return { unlocked, tryUnlock, relock, locked: !unlocked };
}
