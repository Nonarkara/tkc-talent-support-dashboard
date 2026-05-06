/**
 * Project Budget — the visceral money-bar engine.
 *
 * Dr Non's customer-journey 2026-04-27:
 *   "you have to put in the cost of this project... how much are you
 *    willing to spend on this project? Every time you put in something,
 *    the money gets deducted from that money until it gets to zero."
 *
 * This module is the pure-function side. The visual `<BudgetBar>`
 * component reads `computeProjectBudget(...)` on every assignment
 * change and renders a green/yellow/red bar above each project's
 * slot grid.
 *
 * Cost model:
 *   committed = Σ over assignments of (fte * tokenCost(employee) * COST_PER_TOKEN_THB)
 *
 * The "1 FTE = 1 month" assumption is implicit — adjust later when
 * Dr Non commits to a project-duration model. For tonight, fte is
 * a load proxy and the bar is comparative (this person is heavier
 * than that one), not an exact bill.
 */

import { getTokenCost } from "./token-economy";
import type { GameBalance } from "./game-balance";

export interface BudgetEmployee {
  id: string;
  role_level: string;
  attr_str?: number | null;
  attr_int?: number | null;
  attr_wis?: number | null;
  attr_cha?: number | null;
  attr_dex?: number | null;
  attr_con?: number | null;
}

export interface BudgetAssignment {
  employee_id: string;
  fte?: number;
}

export type BudgetTone = "under" | "edge" | "over" | "untracked";

export interface ProjectBudget {
  total_thb: number | null;       // null = no budget set on the project
  committed_thb: number;
  pct: number;                     // 0..150+
  tone: BudgetTone;
  headroom_thb: number;            // total - committed; negative when over
  cost_per_token_thb: number;      // the multiplier in use
  assignment_count: number;
}

/**
 * Compute the budget snapshot for one project given its assignment list.
 * Pure function — no DB, no I/O.
 */
export function computeProjectBudget(
  budgetThb: number | null | undefined,
  assignments: BudgetAssignment[],
  employees: BudgetEmployee[],
  costPerTokenThb: number,
): ProjectBudget {
  const empById = new Map(employees.map((e) => [e.id, e]));
  let committed = 0;
  let count = 0;

  for (const a of assignments) {
    const emp = empById.get(a.employee_id);
    if (!emp) continue;
    const fte = Number(a.fte ?? 1);
    if (!Number.isFinite(fte) || fte <= 0) continue;
    const cost = fte * getTokenCost(emp) * costPerTokenThb;
    committed += cost;
    count++;
  }

  const total = budgetThb && budgetThb > 0 ? budgetThb : null;
  const headroom = total != null ? total - committed : 0;
  const pct = total != null && total > 0 ? (committed / total) * 100 : 0;

  let tone: BudgetTone;
  if (total == null) tone = "untracked";
  else if (pct > 100) tone = "over";
  else if (pct >= 80) tone = "edge";
  else tone = "under";

  return {
    total_thb: total,
    committed_thb: committed,
    pct,
    tone,
    headroom_thb: headroom,
    cost_per_token_thb: costPerTokenThb,
    assignment_count: count,
  };
}

/**
 * Convenience reader for the cost-per-token knob from a GameBalance
 * snapshot. Keeps callers from having to know the key name.
 */
export function costPerTokenThb(balance: Pick<GameBalance, "cost_per_token_thb">): number {
  const v = balance.cost_per_token_thb;
  if (typeof v === "number" && Number.isFinite(v) && v > 0) return v;
  return 50_000; // hard-coded fallback matching the seed default
}

/**
 * Format a THB amount as "฿2.3M" / "฿340k" / "฿0".
 * Mirrors the existing compactThb helper in FormationCanvas — duplicated
 * here so this module stays self-contained.
 */
export function formatCompactThb(value: number | null | undefined): string {
  if (value == null || !Number.isFinite(value)) return "—";
  const abs = Math.abs(value);
  const sign = value < 0 ? "-" : "";
  if (abs >= 1_000_000) return `${sign}฿${(abs / 1_000_000).toFixed(1)}M`;
  if (abs >= 1_000) return `${sign}฿${Math.round(abs / 1_000)}k`;
  return `${sign}฿${Math.round(abs)}`;
}
