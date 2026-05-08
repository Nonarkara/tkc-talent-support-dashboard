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
 * Gauge is computed by matching the role label tokens against existing
 * employee.title_en, full_name_en, and skills. Cheap, deterministic,
 * good enough to drive a "do we still need this person?" indicator.
 */

import { readFileSync } from "node:fs";
import { join } from "node:path";
import { isDbConfigured, query } from "@/lib/db";

export const dynamic = "force-dynamic";
export const revalidate = 60;

interface ManifestEntry {
  filename: string;
  category: string;
  label: string;
  is_numeric_only: boolean;
}

interface JobOpening {
  filename: string;
  category: string;
  label: string;
  cleanLabel: string;
  matched_count: number;
  match_examples: string[];
  gauge: "HOT" | "WARM" | "COVERED" | "DEEP" | "UNKNOWN";
  banner_url: string;
}

const STOPWORDS = new Set([
  "and", "or", "of", "the", "a", "an", "in", "on", "for", "to",
  "sr", "senior", "jr", "junior", "manager", "engineer", "officer",
  "position", "hiring", "consultant", "developer", "dev",
]);

function extractKeywords(label: string): string[] {
  // Strip numeric-only labels (1.10, 11, etc.)
  if (/^[\d.\s]+$/.test(label)) return [];
  const tokens = label
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .split(/\s+/)
    .filter((t) => t.length >= 2 && !STOPWORDS.has(t));
  return Array.from(new Set(tokens));
}

function gaugeFor(matched: number): JobOpening["gauge"] {
  if (matched === 0) return "HOT";
  if (matched <= 2) return "HOT";
  if (matched <= 5) return "WARM";
  if (matched <= 15) return "COVERED";
  return "DEEP";
}

export async function GET() {
  let manifest: ManifestEntry[] = [];
  try {
    const path = join(process.cwd(), "public/jobboard/manifest.json");
    manifest = JSON.parse(readFileSync(path, "utf-8")) as ManifestEntry[];
  } catch {
    return Response.json({ ok: false, error: "Manifest not found", openings: [] });
  }

  // Filter out generic numeric-only banners — they have no role text to match
  const real = manifest.filter((m) => !m.is_numeric_only && m.label !== "Position");

  if (!isDbConfigured()) {
    return Response.json({
      ok: true,
      live: false,
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

  // Pull active hero pool once for matching
  const heroes = await query<{
    display_name: string;
    title_en: string | null;
    skills: string[] | null;
  }>(
    `SELECT
       COALESCE(NULLIF(e.full_name_en,''), NULLIF(e.nickname,''), e.full_name_th) AS display_name,
       e.title_en, e.skills
     FROM employees e
     WHERE e.is_active = true`,
    [],
  );

  const openings: JobOpening[] = real.map((m) => {
    const keywords = extractKeywords(m.label);
    if (keywords.length === 0) {
      return {
        filename: m.filename,
        category: m.category,
        label: m.label,
        cleanLabel: m.label,
        matched_count: 0,
        match_examples: [],
        gauge: "UNKNOWN",
        banner_url: `/jobboard/${m.filename}`,
      };
    }

    let matched = 0;
    const examples: string[] = [];
    for (const h of heroes) {
      const hay = `${h.title_en ?? ""} ${(h.skills ?? []).join(" ")}`.toLowerCase();
      // Match if AT LEAST ONE meaningful keyword appears
      const hits = keywords.filter((k) => hay.includes(k)).length;
      if (hits > 0) {
        matched++;
        if (examples.length < 3) examples.push(h.display_name);
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

  // Sort by need: HOT first, then WARM, COVERED, DEEP, UNKNOWN
  const order = { HOT: 0, WARM: 1, COVERED: 2, DEEP: 3, UNKNOWN: 4 };
  openings.sort((a, b) => order[a.gauge] - order[b.gauge]);

  return Response.json({
    ok: true,
    live: true,
    total_openings: openings.length,
    by_gauge: {
      HOT: openings.filter((o) => o.gauge === "HOT").length,
      WARM: openings.filter((o) => o.gauge === "WARM").length,
      COVERED: openings.filter((o) => o.gauge === "COVERED").length,
      DEEP: openings.filter((o) => o.gauge === "DEEP").length,
    },
    openings,
  });
}
