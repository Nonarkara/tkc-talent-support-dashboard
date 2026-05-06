/**
 * Fit matrix — archetype × slot-dimension.
 *
 * Every project has a slot BOM (how many technical / sales / marketing /
 * outsourcing / paperwork seats it needs, via `project-slots.ts`). Every
 * hero has an archetype (captain / tech / sales / ops / scout, via
 * `token-economy.ts getArchetype`). This file is the cross-product: for a
 * given (hero, slot), how good is that fit?
 *
 * The table is opinionated but defensible:
 *   • 1.0  — this archetype is native to this slot.
 *   • 0.7  — acceptable; no friction.
 *   • 0.4–0.6 — stretch; works but doesn't shine.
 *   • ≤0.3 — miscast.
 *
 * Captain is the universal leader (good-but-not-best everywhere).
 * Scout is the generalist (never great, never terrible).
 * Tech / Sales / Ops are the specialists.
 *
 * Two derived helpers:
 *   slotFit(archetype, dimension)         — single-hero × single-slot fit.
 *   teamFit(assignments, slots)           — overall fit for the whole team
 *                                           (0..100). Considers coverage
 *                                           (empty slots hurt) and match
 *                                           quality.
 */

import type { Archetype } from "./token-economy";
import type { ProjectSlots, SlotDimension } from "./project-slots";
import { slotTotal } from "./project-slots";

// Row = archetype, column = slot dimension.
const MATRIX: Record<Archetype, Record<SlotDimension, number>> = {
  captain: {
    technical: 0.7,
    sales: 0.9,
    marketing: 0.8,
    outsourcing: 0.8,
    paperwork: 0.7,
  },
  tech: {
    technical: 1.0,
    sales: 0.4,
    marketing: 0.5,
    outsourcing: 0.6,
    paperwork: 0.5,
  },
  sales: {
    technical: 0.4,
    sales: 1.0,
    marketing: 0.9,
    outsourcing: 0.6,
    paperwork: 0.5,
  },
  ops: {
    technical: 0.6,
    sales: 0.5,
    marketing: 0.4,
    outsourcing: 0.9,
    paperwork: 1.0,
  },
  scout: {
    technical: 0.7,
    sales: 0.7,
    marketing: 0.7,
    outsourcing: 0.6,
    paperwork: 0.6,
  },
  fighter: {
    technical: 1.0,
    sales: 0.7,
    marketing: 0.4,
    outsourcing: 0.6,
    paperwork: 0.3,
  },
  goofoff: {
    technical: 0.3,
    sales: 0.4,
    marketing: 0.5,
    outsourcing: 0.2,
    paperwork: 0.2,
  },
};

export function slotFit(
  archetype: Archetype,
  dimension: SlotDimension,
): number {
  return MATRIX[archetype]?.[dimension] ?? 0.5;
}

/**
 * DQ3 party order. 1 = front (takes hits), 2 = mid (default),
 * 3 = back (protected). Not used by `teamFit` — the field rides along
 * for the formation chemistry bonus and the Sheets mirror.
 */
export type PartyOrder = 1 | 2 | 3;

/**
 * One hero dropped into one slot on one project.
 */
export interface Assignment {
  employee_id: string;
  archetype: Archetype;
  dimension: SlotDimension;
  /** DQ3 party row. Defaults to 2 (mid) at read time. */
  party_order?: PartyOrder;
}

export interface TeamFitReport {
  /** Overall 0..100. Coverage × fit-quality. */
  overall_pct: number;
  /** 0..100. How much of the slot BOM is filled. */
  coverage_pct: number;
  /** 0..100. Mean slotFit across all assignments (weighted). */
  quality_pct: number;
  /**
   * 0..100. DQ3 EXP-split: how diluted per-head contribution is.
   * 100 = every staffed slot is at-or-below its required headcount
   * (nobody's effort is wasted). <100 means at least one slot is
   * over-stuffed and the extras are diluting the rest of the party's
   * EXP gain. Feeds the Formation readiness score so hoarding a slot
   * costs visibly.
   */
  party_split_pct: number;
  /** Per-dimension fill breakdown. */
  by_dimension: Record<
    SlotDimension,
    { needed: number; filled: number; quality: number }
  >;
}

const EMPTY_DIM: Record<SlotDimension, { needed: number; filled: number; quality: number }> = {
  technical: { needed: 0, filled: 0, quality: 0 },
  sales: { needed: 0, filled: 0, quality: 0 },
  marketing: { needed: 0, filled: 0, quality: 0 },
  outsourcing: { needed: 0, filled: 0, quality: 0 },
  paperwork: { needed: 0, filled: 0, quality: 0 },
};

/**
 * Team fit for an entire project staffing. Coverage counts how many
 * seats are filled vs needed; quality averages slotFit across
 * assignments. Overall = harmonic mean of the two so neither dominates.
 */
export function teamFit(
  assignments: Assignment[],
  slots: ProjectSlots,
): TeamFitReport {
  const byDim: TeamFitReport["by_dimension"] = {
    technical: { needed: slots.technical, filled: 0, quality: 0 },
    sales: { needed: slots.sales, filled: 0, quality: 0 },
    marketing: { needed: slots.marketing, filled: 0, quality: 0 },
    outsourcing: { needed: slots.outsourcing, filled: 0, quality: 0 },
    paperwork: { needed: slots.paperwork, filled: 0, quality: 0 },
  };

  for (const a of assignments) {
    const cell = byDim[a.dimension];
    if (!cell) continue;
    const fit = slotFit(a.archetype, a.dimension);
    cell.filled += 1;
    cell.quality += fit;
  }

  const totalNeeded = slotTotal(slots);
  let totalFilled = 0;
  let totalQuality = 0;

  // DQ3 EXP-split accumulator: one entry per slot that has at least one
  // hero on it. A perfectly- or under-staffed slot contributes 1.0. An
  // over-stuffed slot contributes needed/filled (the diluted share each
  // hero actually gets). Mean across staffed slots = party_split_pct.
  const splitRatios: number[] = [];

  (Object.keys(byDim) as SlotDimension[]).forEach((k) => {
    const cell = byDim[k];
    // Cap filled at needed so over-stuffing one slot can't inflate coverage.
    const useful = Math.min(cell.filled, cell.needed);
    totalFilled += useful;
    // Quality averaged only over *useful* heroes (the ones that fit a seat).
    if (cell.filled > 0) {
      const avgCellQuality = cell.quality / cell.filled;
      cell.quality = avgCellQuality; // store avg per-dimension for display
      totalQuality += avgCellQuality * useful;

      // Party-split: if filled ≤ needed, share is 1.0 (no dilution). If
      // over-stuffed, share = needed/filled. Slots with needed=0 but a
      // hero on them are pure waste → ratio 0.
      const share =
        cell.needed === 0 ? 0 : Math.min(1, cell.needed / cell.filled);
      splitRatios.push(share);
    }
  });

  const coverage_pct =
    totalNeeded > 0 ? (totalFilled / totalNeeded) * 100 : 0;
  const quality_pct =
    totalFilled > 0 ? (totalQuality / totalFilled) * 100 : 0;
  const party_split_pct =
    splitRatios.length > 0
      ? (splitRatios.reduce((acc, r) => acc + r, 0) / splitRatios.length) * 100
      : 100;

  // Overall = harmonic mean. If coverage is 100% but quality is 40%, we
  // don't brag. If quality is 100% but we filled 1 of 10 seats, we don't
  // brag either.
  const overall_pct =
    coverage_pct + quality_pct > 0
      ? (2 * coverage_pct * quality_pct) / (coverage_pct + quality_pct)
      : 0;

  return {
    overall_pct,
    coverage_pct,
    quality_pct,
    party_split_pct,
    by_dimension: byDim,
  };
}

export function emptyReport(): TeamFitReport {
  return {
    overall_pct: 0,
    coverage_pct: 0,
    quality_pct: 0,
    party_split_pct: 100,
    by_dimension: { ...EMPTY_DIM },
  };
}
