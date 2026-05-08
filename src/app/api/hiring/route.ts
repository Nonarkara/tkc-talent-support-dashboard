/**
 * GET /api/hiring
 *
 * Returns the current job openings (from public/jobboard/manifest.json)
 * each augmented with a "need gauge":
 *   - HOT       — fewer than 2 existing heroes match the keywords
 *   - WARM      — 2-5 existing heroes match
 *   - COVERED   — 6-15 match
 *   - DEEP      — 15+ match (overstaffed; lowest priority)
 *
 * The keyword-match + gauge logic lives in `src/lib/hiring-gauge.ts`
 * and is shared with `/api/pulse` so the Boss Room banner and the
 * detailed Hiring Now panel always agree on the totals.
 */

import { isDbConfigured, query } from "@/lib/db";
import {
  computeOpenings,
  summarizeOpenings,
  readJobboardManifest,
  realPositions,
  type HiringHero,
  type HiringOpening,
} from "@/lib/hiring-gauge";

export const dynamic = "force-dynamic";
export const revalidate = 60;

export async function GET() {
  const manifest = readJobboardManifest();
  if (manifest.length === 0) {
    return Response.json({ ok: false, error: "Manifest not found", openings: [] });
  }

  if (!isDbConfigured()) {
    // No DB — every opening is UNKNOWN, but we still return the list so
    // the Boss Room can render placeholders.
    const real = realPositions(manifest);
    return Response.json({
      ok: true,
      live: false,
      total_openings: real.length,
      by_gauge: { HOT: 0, WARM: 0, COVERED: 0, DEEP: 0, UNKNOWN: real.length },
      openings: real.map((m) => ({
        filename: m.filename,
        category: m.category,
        label: m.label,
        cleanLabel: m.label,
        matched_count: 0,
        match_examples: [],
        gauge: "UNKNOWN" as const,
        banner_url: `/jobboard/${m.filename}`,
      })),
    });
  }

  const heroes = await query<HiringHero>(
    `SELECT
       COALESCE(NULLIF(e.full_name_en,''), NULLIF(e.nickname,''), e.full_name_th) AS display_name,
       e.title_en, e.skills
     FROM employees e
     WHERE e.is_active = true`,
    [],
  );

  const openings: HiringOpening[] = computeOpenings(manifest, heroes);

  // Sort by need: HOT first, then WARM, COVERED, DEEP, UNKNOWN
  const order = { HOT: 0, WARM: 1, COVERED: 2, DEEP: 3, UNKNOWN: 4 };
  openings.sort((a, b) => order[a.gauge] - order[b.gauge]);

  const summary = summarizeOpenings(openings);

  return Response.json({
    ok: true,
    live: true,
    total_openings: summary.total_openings,
    by_gauge: summary.by_gauge,
    openings,
  });
}
