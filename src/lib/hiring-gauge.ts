/**
 * Hiring gauge — single source of truth for the open-position counts.
 *
 * Three places used to surface different totals on the same Boss Room
 * card before this lib existed:
 *   - HiringNow header   ("21 open positions")
 *   - HiringNow chip row (HOT 9 / WARM 2 / COVERED 2 / DEEP 6 = 19)
 *   - PulseBanner gauge  (HOT 7 / WARM 6 / COVERED 5 / DEEP 2 = 20)
 *
 * The headline (21) was right (count of all manifest positions). The
 * chip row excluded the UNKNOWN bucket (no parseable role text) which
 * is why it summed to 19. The gauge band was a heuristic — 35/30/25/10
 * fixed shares — and didn't reflect reality at all. This module is the
 * fix: every caller now does the same keyword-match against the active
 * roster and gets the same answer.
 *
 * Pure-ish: file I/O is bounded to reading the manifest at module load
 * (server runtime). Roster pass is in memory. No side effects.
 */

import { readFileSync } from "node:fs";
import { join } from "node:path";

export type Gauge = "HOT" | "WARM" | "COVERED" | "DEEP" | "UNKNOWN";

export interface ManifestEntry {
  filename: string;
  category: string;
  label: string;
  is_numeric_only: boolean;
}

export interface HiringHero {
  display_name?: string | null;
  title_en?: string | null;
  skills?: string[] | null;
}

export interface HiringOpening {
  filename: string;
  category: string;
  label: string;
  cleanLabel: string;
  matched_count: number;
  match_examples: string[];
  gauge: Gauge;
  banner_url: string;
}

export interface HiringSummary {
  total_openings: number;
  by_gauge: Record<Gauge, number>;
}

const STOPWORDS = new Set([
  "and", "or", "of", "the", "a", "an", "in", "on", "for", "to",
  "sr", "senior", "jr", "junior", "manager", "engineer", "officer",
  "position", "hiring", "consultant", "developer", "dev",
]);

export function extractKeywords(label: string): string[] {
  if (/^[\d.\s]+$/.test(label)) return [];
  const tokens = label
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .split(/\s+/)
    .filter((t) => t.length >= 2 && !STOPWORDS.has(t));
  return Array.from(new Set(tokens));
}

export function gaugeFor(matched: number): Gauge {
  if (matched <= 2) return "HOT";
  if (matched <= 5) return "WARM";
  if (matched <= 15) return "COVERED";
  return "DEEP";
}

/** Read the public manifest file. Returns [] if missing. */
export function readJobboardManifest(): ManifestEntry[] {
  try {
    const path = join(process.cwd(), "public/jobboard/manifest.json");
    return JSON.parse(readFileSync(path, "utf-8")) as ManifestEntry[];
  } catch {
    return [];
  }
}

/** Filter to actually-postable roles (excludes numeric-only and "Position"). */
export function realPositions(manifest: ManifestEntry[]): ManifestEntry[] {
  return manifest.filter((m) => !m.is_numeric_only && m.label !== "Position");
}

/**
 * The whole pipeline: manifest → openings list with gauge per role.
 * If `heroes` is empty, every gauge is UNKNOWN (live=false case).
 */
export function computeOpenings(
  manifest: ManifestEntry[],
  heroes: HiringHero[],
): HiringOpening[] {
  const real = realPositions(manifest);

  return real.map((m): HiringOpening => {
    const keywords = extractKeywords(m.label);
    if (keywords.length === 0 || heroes.length === 0) {
      return {
        filename: m.filename,
        category: m.category,
        label: m.label,
        cleanLabel: m.label,
        matched_count: 0,
        match_examples: [],
        gauge: heroes.length === 0 ? "UNKNOWN" : "UNKNOWN",
        banner_url: `/jobboard/${m.filename}`,
      };
    }

    let matched = 0;
    const examples: string[] = [];
    for (const h of heroes) {
      const hay = `${h.title_en ?? ""} ${(h.skills ?? []).join(" ")}`.toLowerCase();
      const hits = keywords.filter((k) => hay.includes(k)).length;
      if (hits > 0) {
        matched++;
        if (examples.length < 3 && h.display_name) examples.push(h.display_name);
      }
    }

    return {
      filename: m.filename,
      category: m.category,
      label: m.label,
      cleanLabel: m.label,
      matched_count: matched,
      match_examples: examples,
      gauge: gaugeFor(matched),
      banner_url: `/jobboard/${m.filename}`,
    };
  });
}

/** The four-bucket summary used by both /api/hiring and /api/pulse. */
export function summarizeOpenings(openings: HiringOpening[]): HiringSummary {
  const by_gauge: Record<Gauge, number> = {
    HOT: 0,
    WARM: 0,
    COVERED: 0,
    DEEP: 0,
    UNKNOWN: 0,
  };
  for (const o of openings) by_gauge[o.gauge]++;
  return {
    total_openings: openings.length,
    by_gauge,
  };
}
