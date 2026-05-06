/**
 * GET /api/four-pillars
 *
 * The Four Pillars score:
 *   Compensation × Purpose × Career × Community
 *
 * Returns the House aggregate plus the per-employee breakdown so the UI
 * can drill into a department or sort the roster by any pillar.
 *
 * Computed live on each request (no cache) — the formulas read from
 * fresh DB state, and the cost is a few aggregate queries. v8.5 may
 * persist the daily snapshot for trend lines.
 *
 * Auth: protected by site middleware.
 */

import { NextResponse } from "next/server";
import { computeHouseScore } from "@/lib/four-pillars";
import { logApiError } from "@/lib/api";

export async function GET() {
  try {
    const result = await computeHouseScore();
    return NextResponse.json({ ok: true, ...result });
  } catch (err) {
    logApiError("api/four-pillars", err);
    return NextResponse.json(
      { ok: false, error: err instanceof Error ? err.message : "Failed" },
      { status: 500 },
    );
  }
}
