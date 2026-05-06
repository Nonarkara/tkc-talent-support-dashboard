/**
 * Game Balance — runtime-tunable constants for the engine.
 *
 * Reads the `game_balance` table once per request, falls back to the
 * baked-in defaults if a key is missing or the DB is unavailable. The
 * defaults match the original hard-coded values in token-economy.ts and
 * lore.ts, so the engine behaves identically until Dr Non actually edits.
 *
 * Usage:
 *   const cfg = await getGameBalance();
 *   const cost = cfg.token_cost_md; // = 5 by default, whatever the DB says
 *
 * The `getGameBalance()` call is cheap — single SELECT, ~5ms on Neon —
 * but caching at the request level (per `dash` payload) is recommended.
 *
 * Knobs are typed as `number` everywhere this turn. v8.4 may extend to
 * objects (per-archetype slot weights, per-dept attribute biases).
 */

import { isDbConfigured, query } from "./db";

// ─── Defaults (mirror src/lib/token-economy.ts and src/lib/lore.ts) ──────

export const GAME_BALANCE_DEFAULTS = {
  token_cost_md: 5,
  token_cost_director: 4,
  token_cost_manager: 3,
  token_cost_senior: 2,
  token_cost_staff: 1,
  token_cost_attr_bump: 14,
  archetype_fighter_str: 16,
  archetype_fighter_dex: 14,
  archetype_scout_int: 15,
  archetype_scout_wis: 14,
  archetype_tech_int: 15,
  archetype_sales_cha: 14,
  hp_base: 40,
  hp_per_con: 4,
  mp_base: 20,
  mp_per_int: 3,
  // v8.5 — budget-bar conversion. THB cost per token-month. Adjust to
  // match real internal pricing once Dr Non commits to a number.
  cost_per_token_thb: 50_000,
} as const;

export type GameBalanceKey = keyof typeof GAME_BALANCE_DEFAULTS;
export type GameBalance = Record<GameBalanceKey, number>;

const ALL_KEYS = Object.keys(GAME_BALANCE_DEFAULTS) as GameBalanceKey[];

/**
 * Read all balance constants from the DB, merge with defaults.
 *
 * Returns the defaults unchanged if DB is not configured or the table
 * is missing — never throws. Callers can rely on the shape.
 */
export async function getGameBalance(): Promise<GameBalance> {
  const cfg: Record<string, number> = { ...GAME_BALANCE_DEFAULTS };
  if (!isDbConfigured()) return cfg as GameBalance;

  try {
    const rows = await query<{ key: string; value: unknown }>(
      `SELECT key, value FROM game_balance`,
      [],
    );
    for (const row of rows) {
      if (!ALL_KEYS.includes(row.key as GameBalanceKey)) continue;
      const n = typeof row.value === "number" ? row.value : Number(row.value);
      if (Number.isFinite(n)) cfg[row.key] = n;
    }
  } catch {
    // Table missing or query failed — use defaults silently.
  }
  return cfg as GameBalance;
}

/**
 * Update one or more balance keys. Returns the count of rows changed.
 * Only accepts keys in the canonical set; ignores unknowns.
 */
export async function setGameBalance(updates: Partial<GameBalance>): Promise<number> {
  if (!isDbConfigured()) return 0;
  let n = 0;
  for (const [key, value] of Object.entries(updates)) {
    if (!ALL_KEYS.includes(key as GameBalanceKey)) continue;
    const num = Number(value);
    if (!Number.isFinite(num)) continue;
    await query(
      `INSERT INTO game_balance (key, value)
       VALUES ($1, $2::jsonb)
       ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value, updated_at = now()`,
      [key, JSON.stringify(num)],
    );
    n++;
  }
  return n;
}

/**
 * Reset all keys to their default values. Returns count of rows touched.
 */
export async function resetGameBalance(): Promise<number> {
  if (!isDbConfigured()) return 0;
  let n = 0;
  for (const [key, value] of Object.entries(GAME_BALANCE_DEFAULTS)) {
    await query(
      `INSERT INTO game_balance (key, value)
       VALUES ($1, $2::jsonb)
       ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value, updated_at = now()`,
      [key, JSON.stringify(value)],
    );
    n++;
  }
  return n;
}

// ─── Tuned helpers (replace the hard-coded calls in token-economy.ts
//     incrementally — out of scope this turn beyond exposing the API). ──

/**
 * Token cost using runtime-tuned constants. Mirrors getTokenCost in
 * `src/lib/token-economy.ts` but reads from the runtime config.
 *
 * Not yet swapped in everywhere — the engine still uses the baked-in
 * version. v8.4 migrates the call sites once Dr Non has a feel for which
 * knobs actually matter.
 */
export function tokenCostFromBalance(
  cfg: GameBalance,
  emp: {
    role_level: string;
    attr_str?: number | null;
    attr_int?: number | null;
    attr_wis?: number | null;
    attr_cha?: number | null;
    attr_dex?: number | null;
    attr_con?: number | null;
  },
): number {
  const base: Record<string, number> = {
    md: cfg.token_cost_md,
    deputy_md: cfg.token_cost_md,
    director: cfg.token_cost_director,
    manager: cfg.token_cost_manager,
    senior: cfg.token_cost_senior,
    staff: cfg.token_cost_staff,
  };
  const attrs = [
    emp.attr_str, emp.attr_int, emp.attr_wis,
    emp.attr_cha, emp.attr_dex, emp.attr_con,
  ].map((v) => v ?? 10);
  const avg = attrs.reduce((a, b) => a + b, 0) / 6;
  const bump = avg >= cfg.token_cost_attr_bump ? 1 : 0;
  return Math.min(5, (base[emp.role_level] ?? 2) + bump);
}
