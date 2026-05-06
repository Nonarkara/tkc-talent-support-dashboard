/**
 * Token economy for team formation.
 *
 * Hides salary from the UI. Every employee has a 1–5 ⚡ cost derived from
 * role_level + attribute tier. Every project has a 10 ⚡ budget split across
 * 5 archetypes by director priority. A 50% allocation halves the cost but
 * also halves the player's contribution (they're on two fixtures).
 *
 * v8.5 — getTokenCost() and getArchetype() now read from the runtime
 * Game Balance cache (`balance-cache.ts`). The cache hydrates from the
 * `game_balance` DB table on first server-side use; on the client, the
 * call falls through to GAME_BALANCE_DEFAULTS until the page hydrates
 * with server props that already encode the tuned values. Net effect:
 * Ledger sliders move the engine within ~30 s in production.
 */

import { GAME_BALANCE_DEFAULTS, type GameBalance } from "./game-balance";

/**
 * Sync read of the current Game Balance snapshot. Server-side this
 * reads from the process cache; client-side it reads from the same
 * cache module which falls back to defaults if no fetch has happened
 * yet (the dashboard loads via SSR, so server values already apply).
 *
 * Importing balance-cache directly here is safe in both runtimes —
 * its only dependency is game-balance.ts which contains the defaults.
 *
 * Lazy require to dodge the circular import: game-balance imports
 * from db.ts; balance-cache imports from game-balance; token-economy
 * is imported by many UI surfaces. Resolving at call time keeps the
 * load order safe.
 */
function getBalance(): GameBalance {
  // Delayed require avoids a top-level circular import; the cache
  // module is small and resolved exactly once.
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const cache = require("./balance-cache") as typeof import("./balance-cache");
    return cache.getCachedBalance();
  } catch {
    return { ...GAME_BALANCE_DEFAULTS };
  }
}

export type Archetype = "captain" | "tech" | "sales" | "ops" | "scout" | "fighter" | "goofoff";

export const ARCHETYPES: Archetype[] = ["captain", "tech", "sales", "ops", "scout", "fighter", "goofoff"];

/**
 * Archetype colour triad.
 *
 *   tone   — the identity hex, used by sprite/glyph/label. Stays stable.
 *   glow   — a lighter, more saturated sibling, used at 8–15% alpha on
 *            card surfaces, row tints, section halos. Gives the UI a live
 *            colour pulse without stealing focus from the tone.
 *   spark  — the brightest, most saturated sibling, reserved for momentary
 *            state changes (XP gain, stat delta, level-up flash). Used at
 *            100% briefly, never as a surface.
 *
 * Keep the sequence tone → glow → spark monotonically brighter — that's
 * what lets the colour layers read as a family rather than clashing.
 */

export const ARCHETYPE_COLOR: Record<Archetype, string> = {
  captain: "#D4A843",  // gold — leadership
  tech:    "#5B89B5",  // blue — engineering
  sales:   "#C44D3F",  // red — revenue
  ops:     "#5B8C4A",  // green — delivery
  scout:   "#8B6FB5",  // purple — analysis
  fighter: "#E69138",  // orange-amber — intense execution
  goofoff: "#D5A6BD",  // pink — wildcards
};

/** Lighter sibling of each tone — card-surface tint, row wash. */
export const ARCHETYPE_GLOW: Record<Archetype, string> = {
  captain: "#F5B94E",  // warm gold
  tech:    "#7AB8E8",  // cyan-blue
  sales:   "#E86A55",  // coral
  ops:     "#7DB865",  // fresh grass
  scout:   "#A98FD8",  // lilac
  fighter: "#F6B26B",  // light amber
  goofoff: "#EAD1DC",  // soft pink
};

/** Brightest sibling — reserved for momentary flashes only. */
export const ARCHETYPE_SPARK: Record<Archetype, string> = {
  captain: "#FFDD88",  // bright amber
  tech:    "#BFE4FF",  // ice
  sales:   "#FFB0A0",  // salmon
  ops:     "#B8E4A0",  // mint
  scout:   "#D8BFFF",  // periwinkle
  fighter: "#FFD966",  // fire
  goofoff: "#F4CCCC",  // blush
};

// Labels track DQ3 Famicom (1988) vocation names, not later remakes.
// "Wizard" not Mage, "Soldier" not Warrior, "Pilgrim" not Priest — these
// are the canonical class-change board entries at Alltrades Abbey.
export const ARCHETYPE_LABEL: Record<Archetype, string> = {
  captain: "Hero",
  tech:    "Wizard",
  sales:   "Merchant",
  ops:     "Soldier",
  scout:   "Pilgrim",
  fighter: "Fighter",
  goofoff: "Goof-Off",
};

export const ARCHETYPE_BLURB: Record<Archetype, string> = {
  captain: "Leads the party, decides the quest",
  tech:    "Commands spells of data and systems",
  sales:   "Trades, deals, and reads the room",
  ops:     "Holds the line, delivers the mission",
  scout:   "Heals the team, reads what others miss",
  fighter: "Fierce hands-on execution and high agility",
  goofoff: "Wildcard energy, high morale, unpredictable output",
};

export type PriorityWeights = Record<Archetype, number>;

// Minimum shape each helper needs — keeps the functions decoupled from the
// full Employee interface so lib/ doesn't depend on app/ types.
export interface EmpStatsInput {
  role_level: string;
  dept_code?: string | null;
  attr_str?: number | null;
  attr_int?: number | null;
  attr_wis?: number | null;
  attr_cha?: number | null;
  attr_dex?: number | null;
  attr_con?: number | null;
  rpg_class?: string | null;
  xp?: number | null;
  level?: number | null;
}

const TECH_DEPTS = new Set(["DIGITAL", "IT", "NET_DEL", "ENTERPRISE", "PUB_SAFETY"]);
const SALES_DEPTS = new Set(["SALES", "BIZ_DEV"]);
const SCOUT_DEPTS = new Set(["FINANCE", "ACCT"]);
const OPS_DEPTS = new Set(["PROCURE", "HR_ADMIN", "CORP_ADM"]);

function deptArchetype(deptCode: string | null | undefined): Archetype {
  if (!deptCode) return "ops";
  const code = deptCode.toUpperCase();
  if (SALES_DEPTS.has(code)) return "sales";
  if (TECH_DEPTS.has(code)) return "tech";
  if (SCOUT_DEPTS.has(code)) return "scout";
  if (OPS_DEPTS.has(code)) return "ops";
  return "ops";
}

/**
 * Classify an employee into one of 5 archetypes.
 *
 * Primary signals are role_level (leadership vs IC) and dept_code (functional
 * lane). Attributes refine the edge cases when present (a charismatic analyst
 * in Finance can override to sales; a senior engineer with high int/wis stays
 * tech even in a back-office dept). Works with NULL attributes — rosters
 * don't have to be D&D-seeded for the pentagon to tell the truth.
 */
export function getArchetype(emp: EmpStatsInput): Archetype {
  if (emp.rpg_class && ARCHETYPES.includes(emp.rpg_class as Archetype)) {
    return emp.rpg_class as Archetype;
  }
  const role = emp.role_level;
  const base = deptArchetype(emp.dept_code);

  // MD / deputy MD / director are captains of the company regardless of dept.
  if (role === "md" || role === "deputy_md" || role === "director") {
    return "captain";
  }

  // Attribute-based refinement only kicks in when we have real data.
  const hasAttrs =
    (emp.attr_int ?? null) !== null ||
    (emp.attr_cha ?? null) !== null ||
    (emp.attr_wis ?? null) !== null;

  if (hasAttrs) {
    // v8.5: thresholds come from the runtime Game Balance cache so the
    // Ledger sliders actually move the engine. Defaults match the
    // baked-in values pre-v8.5 — zero behavior change unless tuned.
    const cfg = getBalance();
    const str = emp.attr_str ?? 10;
    const dex = emp.attr_dex ?? 10;
    const cha = emp.attr_cha ?? 10;
    const wis = emp.attr_wis ?? 10;
    const int = emp.attr_int ?? 10;

    // A department manager with captain-level presence gets promoted to captain.
    if (role === "manager" && cha >= 14 && wis >= 13) return "captain";
    if (str >= cfg.archetype_fighter_str && dex >= cfg.archetype_fighter_dex) return "fighter";
    if (int >= cfg.archetype_scout_int && wis >= cfg.archetype_scout_wis) return "scout";
    if (int >= cfg.archetype_tech_int && base !== "sales" && base !== "captain") return "tech";
    if (cha >= cfg.archetype_sales_cha && base !== "captain") return "sales";
  }

  return base;
}

/**
 * Calculates a Hero's level from their Role (the floor) + XP (the growth).
 * Total Level = Role_Base_Level + Floor(sqrt(XP / 100))
 */
export function getHeroLevel(emp: EmpStatsInput): number {
  const roleBase: Record<string, number> = {
    staff: 1,
    senior: 5,
    manager: 10,
    director: 15,
    deputy_md: 20,
    md: 25,
  };
  const base = roleBase[emp.role_level] ?? 1;
  const growth = Math.floor(Math.sqrt((emp.xp ?? 0) / 100));
  return base + growth;
}

/**
 * Token cost on a 1–5 scale. Seniority is the dominant factor;
 * a high-attribute specialist gets +1 regardless of role.
 *
 * Never references salary_thb — salary stays confidential in the DB only.
 */
export function getTokenCost(emp: EmpStatsInput): number {
  // v8.5: read from runtime Game Balance cache. Defaults match the
  // pre-v8.5 baked values exactly so behaviour is identical until tuned.
  const cfg = getBalance();
  const base: Record<string, number> = {
    staff: cfg.token_cost_staff,
    senior: cfg.token_cost_senior,
    manager: cfg.token_cost_manager,
    director: cfg.token_cost_director,
    deputy_md: cfg.token_cost_md,
    md: cfg.token_cost_md,
  };
  const attrs = [
    emp.attr_str,
    emp.attr_int,
    emp.attr_wis,
    emp.attr_cha,
    emp.attr_dex,
    emp.attr_con,
  ].map((v) => v ?? 10);
  const avg = attrs.reduce((a, b) => a + b, 0) / 6;
  const bump = avg >= cfg.token_cost_attr_bump ? 1 : 0;
  return Math.min(10, (base[emp.role_level] ?? 2) + bump);
}

/** Default priority weights: even 2/2/2/2/2 split (sums to 10). */
export function defaultPriorityWeights(): PriorityWeights {
  return { captain: 2, tech: 2, sales: 2, ops: 2, scout: 2, fighter: 0, goofoff: 0 };
}

export function normalizeWeights(raw: unknown): PriorityWeights {
  const out = defaultPriorityWeights();
  if (!raw || typeof raw !== "object") return out;
  const obj = raw as Record<string, unknown>;
  for (const key of ARCHETYPES) {
    const v = obj[key];
    if (typeof v === "number" && Number.isFinite(v) && v >= 0) {
      out[key] = Math.round(v);
    }
  }
  return out;
}

/** Effective token cost after partial allocation (50% player = half cost). */
export function effectiveCost(tokenCost: number, allocationPct: number): number {
  return Math.round(tokenCost * (allocationPct / 100) * 10) / 10;
}

/** Sum of player effective costs grouped by archetype. */
export function spendByArchetype(
  players: (EmpStatsInput & { id: string })[],
  pcts: Record<string, number>,
): Record<Archetype, number> {
  const out: Record<Archetype, number> = { 
    captain: 0, tech: 0, sales: 0, ops: 0, scout: 0, fighter: 0, goofoff: 0 
  };
  for (const p of players) {
    const archetype = getArchetype(p);
    const pct = pcts[p.id] ?? 100;
    out[archetype] += effectiveCost(getTokenCost(p), pct);
  }
  // Round to 1 decimal for display.
  for (const key of ARCHETYPES) out[key] = Math.round(out[key] * 10) / 10;
  return out;
}

/**
 * Rebalance weights when the director bumps one archetype up/down.
 * Keeps the sum pinned to 10 by spreading the delta across the others.
 */
export function rebalanceWeights(
  current: PriorityWeights,
  changed: Archetype,
  nextValue: number,
): PriorityWeights {
  const clamped = Math.max(0, Math.min(10, Math.round(nextValue)));
  const next: PriorityWeights = { ...current, [changed]: clamped };
  const others = ARCHETYPES.filter((a) => a !== changed);
  const otherSum = others.reduce((s, a) => s + next[a], 0);
  const target = 10 - clamped;

  if (otherSum === 0) {
    // Distribute target evenly when every other bucket is 0.
    const each = Math.floor(target / others.length);
    let remainder = target - each * others.length;
    for (const a of others) {
      next[a] = each + (remainder > 0 ? 1 : 0);
      if (remainder > 0) remainder--;
    }
    return next;
  }

  // Scale proportionally, then nudge by rounding error.
  let distributed = 0;
  for (const a of others) {
    const scaled = Math.round((next[a] / otherSum) * target);
    next[a] = Math.max(0, scaled);
    distributed += next[a];
  }
  // Correct drift so the total is exactly 10.
  let drift = target - distributed;
  const cycle = [...others];
  while (drift !== 0 && cycle.length > 0) {
    for (const a of cycle) {
      if (drift === 0) break;
      if (drift > 0) {
        next[a] += 1;
        drift--;
      } else if (next[a] > 0) {
        next[a] -= 1;
        drift++;
      }
    }
  }
  return next;
}
