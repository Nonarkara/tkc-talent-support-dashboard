/**
 * Single source of truth for the active planning cycle.
 *
 * When Q3 starts: change "2026-Q2" → "2026-Q3" here. Nowhere else.
 * Every API default, every frontend fetch, every Zod schema reads from this.
 */
export const CURRENT_CYCLE = "2026-Q2";
