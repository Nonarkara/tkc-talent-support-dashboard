"use client";

/**
 * useCassetteSave — the "never lose a change" save hook.
 *
 * Dragon Quest III cartridges shipped a battery-backed save chip; the
 * player never thought about saving — they just kept playing and the
 * world remembered. This hook is TKC's version: wrap any async save
 * endpoint and the caller gets a state machine that survives network
 * drops, window closes, and page reloads.
 *
 *   const { state, lastSavedAt, error, save, queueSize, undo, redo,
 *           canUndo, canRedo }
 *     = useCassetteSave({
 *         save: async (value) => { await fetch(...); },
 *         debounceMs: 800,
 *         historyLimit: 20,
 *         storageKey: "formation/project-42",
 *       });
 *
 * Contract:
 *   - Every call to `save(v)` pushes `v` onto the debounce queue,
 *     marks `state="dirty"`, and after `debounceMs` flushes the most
 *     recent value through `opts.save`.
 *   - Success → `state="saved"`, `lastSavedAt=Date.now()`.
 *   - Failure or `!navigator.onLine` → the value is serialised to
 *     `localStorage` under `cassette:queue:<storageKey>` and
 *     `state="queued"`; a `window` `online` listener flushes the
 *     queue on reconnect.
 *   - `undo()` / `redo()` walk an in-memory history stack of the
 *     last N values and call `save()` for each step. The stack does
 *     NOT persist across reloads (by design: keyboard undo is a
 *     session affordance, not long-term state).
 */

import { useCallback, useEffect, useMemo, useRef, useState } from "react";

export type SaveState = "idle" | "dirty" | "saving" | "saved" | "error" | "queued";

export interface UseCassetteSaveOptions<T> {
  /** Persist `value` to the server. Must throw on failure. */
  save: (value: T) => Promise<void>;
  /** Idle time before autosave fires. Default 800 ms. */
  debounceMs?: number;
  /** Max depth of the undo/redo stack. Default 20. */
  historyLimit?: number;
  /** localStorage namespace for the offline queue. */
  storageKey: string;
}

export interface UseCassetteSaveResult<T> {
  state: SaveState;
  lastSavedAt: number | null;
  error: Error | null;
  /** Mark the next value dirty; autosave fires after debounce. */
  save: (value: T) => void;
  /** Flush pending debounce immediately (e.g. on explicit Save button). */
  flush: () => Promise<void>;
  queueSize: number;
  undo: () => void;
  redo: () => void;
  canUndo: boolean;
  canRedo: boolean;
}

export function useCassetteSave<T>(
  opts: UseCassetteSaveOptions<T>,
): UseCassetteSaveResult<T> {
  const { save: persist, debounceMs = 800, historyLimit = 20, storageKey } = opts;

  const [state, setState] = useState<SaveState>("idle");
  const [lastSavedAt, setLastSavedAt] = useState<number | null>(null);
  const [error, setError] = useState<Error | null>(null);
  const [queueSize, setQueueSize] = useState<number>(() => readQueue<T>(storageKey).length);

  const historyRef = useRef<T[]>([]);
  const cursorRef = useRef<number>(-1);
  const pendingRef = useRef<T | null>(null);
  const debounceTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const persistRef = useRef(persist);
  persistRef.current = persist;

  const flushOnce = useCallback(async () => {
    if (pendingRef.current == null) return;
    const value = pendingRef.current;
    pendingRef.current = null;
    setState("saving");
    try {
      if (typeof navigator !== "undefined" && !navigator.onLine) {
        throw new Error("offline");
      }
      await persistRef.current(value);
      setState("saved");
      setLastSavedAt(Date.now());
      setError(null);
    } catch (e) {
      const err = e instanceof Error ? e : new Error(String(e));
      // Network / offline → queue for later. Anything else → error.
      if (err.message === "offline" || /fail|network/i.test(err.message)) {
        enqueue(storageKey, value);
        setQueueSize((n) => n + 1);
        setState("queued");
      } else {
        setError(err);
        setState("error");
      }
    }
  }, [storageKey]);

  const save = useCallback(
    (value: T) => {
      // Push onto history at the cursor. Truncates any "redo" tail.
      const hist = historyRef.current.slice(0, cursorRef.current + 1);
      hist.push(value);
      if (hist.length > historyLimit) hist.shift();
      historyRef.current = hist;
      cursorRef.current = hist.length - 1;

      pendingRef.current = value;
      setState("dirty");
      setError(null);

      if (debounceTimer.current) clearTimeout(debounceTimer.current);
      debounceTimer.current = setTimeout(() => {
        void flushOnce();
      }, debounceMs);
    },
    [debounceMs, historyLimit, flushOnce],
  );

  const flush = useCallback(async () => {
    if (debounceTimer.current) {
      clearTimeout(debounceTimer.current);
      debounceTimer.current = null;
    }
    await flushOnce();
  }, [flushOnce]);

  const undo = useCallback(() => {
    if (cursorRef.current <= 0) return;
    cursorRef.current -= 1;
    const value = historyRef.current[cursorRef.current];
    pendingRef.current = value;
    void flush();
  }, [flush]);

  const redo = useCallback(() => {
    if (cursorRef.current >= historyRef.current.length - 1) return;
    cursorRef.current += 1;
    const value = historyRef.current[cursorRef.current];
    pendingRef.current = value;
    void flush();
  }, [flush]);

  // Flush the offline queue on reconnect.
  useEffect(() => {
    if (typeof window === "undefined") return;
    const onOnline = async () => {
      const queued = readQueue<T>(storageKey);
      if (queued.length === 0) return;
      setState("saving");
      try {
        for (const v of queued) {
          await persistRef.current(v);
        }
        clearQueue(storageKey);
        setQueueSize(0);
        setState("saved");
        setLastSavedAt(Date.now());
      } catch (e) {
        setError(e instanceof Error ? e : new Error(String(e)));
        setState("error");
      }
    };
    window.addEventListener("online", onOnline);
    return () => window.removeEventListener("online", onOnline);
  }, [storageKey]);

  return useMemo(
    () => ({
      state,
      lastSavedAt,
      error,
      save,
      flush,
      queueSize,
      undo,
      redo,
      canUndo: cursorRef.current > 0,
      canRedo: cursorRef.current < historyRef.current.length - 1,
    }),
    [state, lastSavedAt, error, save, flush, queueSize, undo, redo],
  );
}

// --- localStorage queue helpers -----------------------------------------

const PREFIX = "cassette:queue:";

function readQueue<T>(key: string): T[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(PREFIX + key);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? (parsed as T[]) : [];
  } catch {
    return [];
  }
}

function enqueue<T>(key: string, value: T): void {
  if (typeof window === "undefined") return;
  try {
    const q = readQueue<T>(key);
    q.push(value);
    window.localStorage.setItem(PREFIX + key, JSON.stringify(q));
  } catch {
    // Quota or serialization failure — swallow; state stays "queued"
    // but the payload is lost. Better than crashing the UI.
  }
}

function clearQueue(key: string): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.removeItem(PREFIX + key);
  } catch {
    /* ignore */
  }
}
