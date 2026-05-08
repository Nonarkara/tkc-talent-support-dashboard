/**
 * Company pulse — the synthetic metrics that make the command-center
 * feel like a trading terminal.
 *
 * Everything here is a pure derivation from data already in the
 * dashboard payload. No new tables, no new cron jobs, no persistence.
 * Two consequences:
 *   1. These numbers shift every time something else in the system
 *      shifts. That's the point — the boss sees real movement.
 *   2. There is no historical series. If we later want a chart we'll
 *      snapshot into a `company_pulse_snapshots` table nightly.
 *
 * The ticker price is a deliberately toy calculation — not a forecast
 * of anything real. It's a visual analogue that turns aggregate team
 * chemistry + project-priority-weighted count into a Reuters stripe.
 * Read it like a barometer, not a Bloomberg quote.
 */

import type {
  DeptKpi,
  Project,
  SupportActionRecord,
  TeamComposition,
} from "@/app/command-center/_shared/types";

// ─── Anchor predicate — single source of truth ─────────────────────────
//
// Three call sites used to compute "anchors" with two different rules,
// producing 32 vs 48 on the same dashboard. The honest definition is
// the looser one: an anchor is institutional memory + relational glue,
// and EITHER high CON (resilience under pressure) OR high CHA (the
// person teammates seek out) qualifies.
//
// Applies uniformly to:
//   - /api/pulse `hiring_summary` (the PulseBanner anchor count)
//   - command-center page-level routeMetrics (header pills)
//   - SignalsTab "Anchor Bench" section
//
// 10 years AND (CON ≥ 14 OR CHA ≥ 14).

export function isAnchor(employee: {
  tenure_years?: number | null;
  attr_con?: number | null;
  attr_cha?: number | null;
}): boolean {
  const tenure = typeof employee.tenure_years === "number" ? employee.tenure_years : 0;
  const con = typeof employee.attr_con === "number" ? employee.attr_con : 0;
  const cha = typeof employee.attr_cha === "number" ? employee.attr_cha : 0;
  return tenure >= 10 && (con >= 14 || cha >= 14);
}

/** Human-readable rule for UI captions (sub-label under the count). */
export const ANCHOR_RULE_LABEL = "≥10yr · CON or CHA ≥14";

// ─── Company snapshot (representative placeholder data) ─────────────────
//
// All figures are fictional and for demonstration purposes only.
// Update once per reporting period (quarterly). All currency in THB.

export const TKC_ANNUAL = {
  // Income statement — representative 9-month figures
  revenue_9m_m: 1340.0,        // Million THB
  net_profit_9m_m: 98.0,       // Million THB
  // Per-share metrics (representative)
  eps_thb: 0.38,               // THB per share
  // Valuation (representative)
  market_cap_b: 2.8,           // Billion THB
  pe_ratio: 15.2,
  // Dividends (representative)
  dividend_thb: 0.18,          // THB per share (annual)
  dividend_yield_pct: 2.1,     // %
  // Business
  ticker: "TKC",
  exchange: "DEMO",
  currency: "THB",
  as_of: "Representative",
} as const;

// ─── TKC ticker ───────────────────────────────────────────────────────────

export interface TickerInput {
  teams: Pick<TeamComposition, "chemistry_score">[];
  projects: Pick<Project, "priority" | "progress_pct">[];
}

export interface TickerOutput {
  price: number;
  delta_pct: number;
}

const BASE_PRICE = 100.0;

/**
 * Synthetic "stock" for TKC. Anchored at 100.00.
 * Drifts with aggregate chemistry (how well teams are formed) and a
 * priority-weighted progress index (how much work is shipping).
 */
export function tkcTicker(input: TickerInput): TickerOutput {
  const chemScores = input.teams
    .map((t) => t.chemistry_score)
    .filter((x): x is number => typeof x === "number");
  const chemAvg =
    chemScores.length > 0
      ? chemScores.reduce((a, b) => a + b, 0) / chemScores.length
      : 50;
  // Chemistry 0..100 → -10..+10 adjustment around base.
  const chemComponent = (chemAvg - 50) * 0.2;

  const progIndex =
    input.projects.length === 0
      ? 0
      : input.projects.reduce((sum, p) => {
          const weight =
            p.priority === "critical"
              ? 2.0
              : p.priority === "high"
                ? 1.5
                : p.priority === "medium"
                  ? 1.0
                  : 0.5;
          const prog = typeof p.progress_pct === "number" ? p.progress_pct : 0;
          return sum + (prog / 100) * weight;
        }, 0) / input.projects.length;
  // Progress index ~0..2 → 0..+16 adjustment (upside-weighted).
  const progComponent = progIndex * 8;

  const price = BASE_PRICE + chemComponent + progComponent;
  // Delta is relative to the base, rendered as the day's movement.
  const delta_pct = ((price - BASE_PRICE) / BASE_PRICE) * 100;

  return { price, delta_pct };
}

// ─── Quarterly burn ───────────────────────────────────────────────────────

export interface BurnInput {
  projects: Pick<Project, "budget_thb" | "monthly_ceiling" | "status">[];
}

export interface BurnOutput {
  budget_total: number;
  monthly_run_rate: number;
  quarterly_projected: number;
}

export function quarterlyBurn(input: BurnInput): BurnOutput {
  const active = input.projects.filter((p) => p.status !== "done" && p.status !== "completed");
  const budget_total = active.reduce(
    (sum, p) => sum + Number(p.budget_thb ?? 0),
    0,
  );
  const monthly_run_rate = active.reduce(
    (sum, p) => sum + Number(p.monthly_ceiling ?? 0),
    0,
  );
  return {
    budget_total,
    monthly_run_rate,
    quarterly_projected: monthly_run_rate * 3,
  };
}

// ─── Margin watch ─────────────────────────────────────────────────────────

export interface MarginOutput {
  avg_margin_pct: number;
  status: "high" | "watch" | "stable";
  healthy_count: number;
  thin_count: number;
}

/**
 * Average gross margin across active portfolio.
 */
export function marginWatch(projects: Project[]): MarginOutput {
  const active = projects.filter((p) => p.status !== "done" && p.status !== "completed");
  if (active.length === 0) {
    return { avg_margin_pct: 0, status: "stable", healthy_count: 0, thin_count: 0 };
  }

  const validMargins = active
    .map((p) => Number(p.gross_margin_pct))
    .filter((m) => !isNaN(m));

  if (validMargins.length === 0) {
    return { avg_margin_pct: 0, status: "stable", healthy_count: 0, thin_count: 0 };
  }

  const healthy_count = validMargins.filter((m) => m >= 20).length;
  const thin_count = validMargins.length - healthy_count;

  const sum = validMargins.reduce((a, b) => a + b, 0);
  const avg = sum / validMargins.length;

  let status: MarginOutput["status"] = "stable";
  if (avg < 15) status = "high";
  else if (avg < 20) status = "watch";

  return { avg_margin_pct: avg, status, healthy_count, thin_count };
}

// ─── Last quarter recap ───────────────────────────────────────────────────
//
// Summarises what's happening in support / KPI coverage. Purely sums the
// dashboard payload — does not hit the events table here (that's the full
// version we can add later if we want a verb-by-verb count).

export interface RecapInput {
  supportActions: SupportActionRecord[];
  kpis: DeptKpi[];
}

export interface RecapOutput {
  open_support_actions: number;
  closed_this_cycle: number;
  kpis_on_track: number;
  kpis_off_track: number;
}

export function lastQuarterRecap(input: RecapInput): RecapOutput {
  const open = input.supportActions.filter(
    (a) => a.status === "open" || a.status === "in_progress",
  ).length;
  const closed = input.supportActions.filter(
    (a) => a.status === "done" || a.status === "closed",
  ).length;
  const onTrack = input.kpis.filter((k) => k.status === "on_track").length;
  const offTrack = input.kpis.filter(
    (k) => k.status && k.status !== "on_track",
  ).length;
  return {
    open_support_actions: open,
    closed_this_cycle: closed,
    kpis_on_track: onTrack,
    kpis_off_track: offTrack,
  };
}
