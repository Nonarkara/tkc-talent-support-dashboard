/**
 * Process-level cache for the runtime Game Balance.
 *
 * Why this exists:
 *   `getTokenCost()` and `getArchetype()` are called from many sync
 *   render paths (PlayerCard, FormationCanvas, useMemo deps). Making
 *   them async would cascade. Instead, we keep them sync and let them
 *   read from this in-memory cache. The cache is refreshed in the
 *   background every 30 s, and explicitly invalidated when the
 *   /api/game-balance PUT handler runs.
 *
 *   First call on a cold module returns the baked-in defaults until the
 *   first DB read resolves. That window is ~50 ms; nothing breaks if
 *   the engine momentarily uses defaults instead of tuned values.
 *
 *   In dev with Turbopack, the module identity may reset on hot reload —
 *   that's fine. The defaults are correct, and the next request kicks
 *   off a fresh fetch.
 *
 * Public API:
 *   getCachedBalance() → GameBalance         (sync)
 *   invalidateBalanceCache(): void           (call after PUT)
 *   primeBalanceCache(): Promise<void>       (await on cold start if you need fresh)
 */

import { GAME_BALANCE_DEFAULTS, getGameBalance, type GameBalance } from "./game-balance";

const TTL_MS = 30_000;

let snapshot: GameBalance = { ...GAME_BALANCE_DEFAULTS };
let lastFetchedAt = 0;
let inflight: Promise<GameBalance> | null = null;
let lastUsedAt = 0;

async function refresh(): Promise<GameBalance> {
  if (inflight) return inflight;
  inflight = getGameBalance().then(
    (next) => {
      snapshot = next;
      lastFetchedAt = Date.now();
      inflight = null;
      return next;
    },
    (err) => {
      // Stay on the previous snapshot. Defaults if this is the first load.
      // eslint-disable-next-line no-console
      console.warn("[balance-cache] refresh failed, keeping previous:", err);
      lastFetchedAt = Date.now(); // back off so we don't hammer
      inflight = null;
      return snapshot;
    },
  );
  return inflight;
}

/**
 * Sync read. Returns whatever's currently cached.
 *
 * If the cache is older than TTL_MS, fires a background refresh — does
 * not block. The next call will see the new values.
 */
export function getCachedBalance(): GameBalance {
  lastUsedAt = Date.now();
  const stale = Date.now() - lastFetchedAt > TTL_MS;
  if (stale && !inflight) {
    void refresh();
  }
  return snapshot;
}

/**
 * Call after the /api/game-balance PUT handler so the next read picks
 * up the new values within the same request.
 */
export function invalidateBalanceCache(): void {
  lastFetchedAt = 0;
  void refresh();
}

/**
 * Awaitable refresh — call from server-side code paths that genuinely
 * need fresh values (e.g. the four-pillars house score recomputation).
 */
export async function primeBalanceCache(): Promise<GameBalance> {
  if (inflight) return inflight;
  if (Date.now() - lastFetchedAt < TTL_MS) return snapshot;
  return refresh();
}

/**
 * Diagnostics — used by the Cockpit "engine refreshed Xs ago" footer.
 */
export function getCacheStatus() {
  return {
    last_fetched_at: lastFetchedAt > 0 ? new Date(lastFetchedAt).toISOString() : null,
    last_used_at: lastUsedAt > 0 ? new Date(lastUsedAt).toISOString() : null,
    age_ms: lastFetchedAt > 0 ? Date.now() - lastFetchedAt : null,
    fresh: Date.now() - lastFetchedAt < TTL_MS,
  };
}
