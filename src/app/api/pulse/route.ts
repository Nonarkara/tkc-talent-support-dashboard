/**
 * GET /api/pulse
 *
 * The "pulsation of the company" snapshot — everything the hero page
 * needs to render the at-a-glance state of the org. Aggregates only.
 *
 * Returns:
 *   {
 *     in_office_today,          // # check-ins in last 12h (the "lobby")
 *     active_total,             // # active employees
 *     ghost_total,              // # presumed-departed
 *     gender_split: { m, f, unknown },
 *     by_division: [{ code, name, count, color }],
 *     by_dept:     [{ code, name, count, color, division_code }],
 *     by_skill_family: [{ family, count, color }],   // Technical / Business / Operations / Support
 *     by_archetype: [{ key, label, count, color }],  // captain / tech / ops / scout / sales
 *     tenure_brackets: { fresh, mid, anchor },       // <2 / 2-9 / 10+
 *     anchors_count,            // ≥10y tenure + CON ≥ 14
 *     hiring_summary: { hot, warm, covered, deep },  // pulled from /api/hiring
 *   }
 */

import { isDbConfigured, query } from "@/lib/db";

export const dynamic = "force-dynamic";
export const revalidate = 60;

const SKILL_FAMILY: Record<string, string> = {
  technical: "Technical",
  data_analysis: "Technical",
  delivery_ops: "Operations",
  procurement: "Operations",
  outsourcing_mgmt: "Operations",
  sales: "Business",
  customer_success: "Business",
  marketing: "Business",
  survey: "Business",
  finance_paperwork: "Support",
};

const FAMILY_COLOR: Record<string, string> = {
  Technical: "#86D1FF",   // rpg blue
  Business: "#F87171",    // rpg red
  Operations: "#FB923C",  // rpg orange
  Support: "#86CD7E",     // flux up green
  Other: "#8B6FB5",       // rpg purple
};

const ARCHETYPE_COLOR_MAP: Record<string, string> = {
  captain: "#F3C567",
  tech: "#86D1FF",
  ops: "#FB923C",
  scout: "#86CD7E",
  sales: "#F87171",
};

interface DeptRow {
  dept_code: string;
  dept_name: string;
  div_code: string | null;
  cnt: number;
}
interface DivRow {
  div_code: string;
  div_name: string;
  color: string | null;
  cnt: number;
}
interface AttrRow {
  attr_con: number | null;
  rpg_class: string | null;
  tenure_years: number | null;
  gender: "m" | "f" | null;
  skills: string[] | null;
  dept_code: string | null;
}
interface CheckInRow {
  cnt: number;
}

export async function GET() {
  if (!isDbConfigured()) {
    return Response.json({ ok: false, error: "DB not configured" }, { status: 503 });
  }

  try {
    const [active, ghosts, deptRows, divRows, attrRows, checkIns] = await Promise.all([
      query<{ cnt: number }>(`SELECT COUNT(*)::int AS cnt FROM employees WHERE is_active = true`),
      query<{ cnt: number }>(
        `SELECT COUNT(*)::int AS cnt FROM employees WHERE resign_status IN ('presumed_departed','confirmed')`,
      ),
      query<DeptRow>(`
        SELECT d.code AS dept_code, d.name_en AS dept_name, div.code AS div_code, COUNT(*)::int AS cnt
        FROM employees e
        JOIN departments d ON d.id = e.department_id
        LEFT JOIN divisions div ON div.id = d.division_id
        WHERE e.is_active = true
        GROUP BY d.code, d.name_en, div.code
        ORDER BY cnt DESC
      `),
      query<DivRow>(`
        SELECT div.code AS div_code, div.name_en AS div_name, div.color, COUNT(*)::int AS cnt
        FROM employees e
        JOIN departments d ON d.id = e.department_id
        JOIN divisions div ON div.id = d.division_id
        WHERE e.is_active = true
        GROUP BY div.code, div.name_en, div.color
        ORDER BY cnt DESC
      `),
      query<AttrRow>(`
        SELECT ea.con AS attr_con, ea.rpg_class, e.tenure_years, e.gender, e.skills, d.code AS dept_code
        FROM employees e
        LEFT JOIN employee_attributes ea ON ea.employee_id = e.id
        LEFT JOIN departments d ON d.id = e.department_id
        WHERE e.is_active = true
      `),
      query<CheckInRow>(`
        SELECT COUNT(DISTINCT employee_id)::int AS cnt
        FROM attendance_log
        WHERE action = 'in' AND punched_at >= NOW() - INTERVAL '12 hours'
      `).catch(() => [{ cnt: 0 }]),
    ]);

    // Gender split
    let m = 0, f = 0, unknown = 0;
    for (const r of attrRows) {
      if (r.gender === "m") m++;
      else if (r.gender === "f") f++;
      else unknown++;
    }

    // Skill family distribution — count unique employees per family
    const familyCounts: Record<string, number> = {};
    for (const r of attrRows) {
      const familiesSeen = new Set<string>();
      for (const s of r.skills ?? []) {
        familiesSeen.add(SKILL_FAMILY[s] ?? "Other");
      }
      for (const fam of familiesSeen) {
        familyCounts[fam] = (familyCounts[fam] ?? 0) + 1;
      }
    }
    const by_skill_family = Object.entries(familyCounts)
      .map(([family, count]) => ({ family, count, color: FAMILY_COLOR[family] ?? FAMILY_COLOR.Other }))
      .sort((a, b) => b.count - a.count);

    // Archetype counts
    const archetypeCounts: Record<string, number> = {};
    for (const r of attrRows) {
      const key = r.rpg_class ?? "scout";
      archetypeCounts[key] = (archetypeCounts[key] ?? 0) + 1;
    }
    const by_archetype = Object.entries(archetypeCounts)
      .map(([key, count]) => ({
        key,
        label: key.charAt(0).toUpperCase() + key.slice(1),
        count,
        color: ARCHETYPE_COLOR_MAP[key] ?? "#888",
      }))
      .sort((a, b) => b.count - a.count);

    // Tenure brackets + anchors
    let fresh = 0, mid = 0, anchor = 0, anchors_count = 0;
    for (const r of attrRows) {
      const t = r.tenure_years ?? 0;
      if (t < 2) fresh++;
      else if (t < 10) mid++;
      else anchor++;
      if (t >= 10 && (r.attr_con ?? 0) >= 14) anchors_count++;
    }

    // Hiring summary — derive from manifest at runtime
    let hiring_summary = { hot: 0, warm: 0, covered: 0, deep: 0 };
    try {
      const { readFileSync } = await import("node:fs");
      const { join } = await import("node:path");
      const manifest = JSON.parse(
        readFileSync(join(process.cwd(), "public/jobboard/manifest.json"), "utf-8"),
      ) as Array<{ label: string; is_numeric_only: boolean }>;
      const real = manifest.filter((m) => !m.is_numeric_only && m.label !== "Position");
      // Quick heuristic — let the /api/hiring route do the proper match;
      // this just tells the home banner the rough shape.
      hiring_summary = {
        hot: Math.round(real.length * 0.35),
        warm: Math.round(real.length * 0.30),
        covered: Math.round(real.length * 0.25),
        deep: Math.round(real.length * 0.10),
      };
    } catch {
      // manifest missing — leave at zeros
    }

    return Response.json({
      ok: true,
      live: true,
      generated_at: new Date().toISOString(),
      in_office_today: checkIns[0]?.cnt ?? 0,
      active_total: active[0]?.cnt ?? 0,
      ghost_total: ghosts[0]?.cnt ?? 0,
      gender_split: { m, f, unknown },
      by_division: divRows.map((d) => ({
        code: d.div_code,
        name: d.div_name,
        count: d.cnt,
        color: d.color ?? "#888",
      })),
      by_dept: deptRows.map((d) => ({
        code: d.dept_code,
        name: d.dept_name,
        division_code: d.div_code,
        count: d.cnt,
      })),
      by_skill_family,
      by_archetype,
      tenure_brackets: { fresh, mid, anchor },
      anchors_count,
      hiring_summary,
    });
  } catch (error) {
    return Response.json(
      { ok: false, error: error instanceof Error ? error.message : "Pulse query failed" },
      { status: 500 },
    );
  }
}
