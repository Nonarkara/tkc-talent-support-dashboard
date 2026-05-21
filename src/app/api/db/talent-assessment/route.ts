import { NextResponse } from "next/server";
import { sql as sqlMaybe } from "@/lib/db";

/**
 * GET /api/db/talent-assessment
 *
 * Returns the full Talent Management Program (Phase 1) snapshot:
 *   - 9-Box buckets with nominee lists
 *   - Per-department distribution
 *   - Top-20 ranking (Final Cut survivors, ordered by avg_score desc)
 *   - Funnel metrics (active workforce → nominees → talent pool)
 *
 * Source: data imported from Khun Jun's CSV via
 *   scripts/import-talent-assessment.mjs, written to
 *   `employees.box_id` + `talent_assessments` (cycle = 2026-H1).
 *
 * Audience: HR + Directors + the cassette UI. PDPA-respecting — only
 * surfaces the columns the Talent program is allowed to share.
 */

export const dynamic = "force-dynamic";
export const revalidate = 0;

const BOX_DEFINITIONS: Array<{
  id: number;
  label_en: string;
  label_th: string;
  group: "low" | "mid" | "high";
}> = [
  { id: 1, label_en: "Risk",            label_th: "ความเสี่ยง",          group: "low"  },
  { id: 2, label_en: "Average Player",  label_th: "ผู้เล่นทั่วไป",        group: "low"  },
  { id: 3, label_en: "Solid Performer", label_th: "ผู้ปฏิบัติงานมั่นคง",   group: "low"  },
  { id: 4, label_en: "Average Player",  label_th: "ผู้เล่นทั่วไป",        group: "mid"  },
  { id: 5, label_en: "Core Player",     label_th: "ผู้เล่นแกน",            group: "mid"  },
  { id: 6, label_en: "High Performer",  label_th: "ผู้ปฏิบัติงานสูง",     group: "mid"  },
  { id: 7, label_en: "Potential Gem",   label_th: "เพชรเม็ดงาม",          group: "high" },
  { id: 8, label_en: "High Potential",  label_th: "ศักยภาพสูง",           group: "high" },
  { id: 9, label_en: "Star",            label_th: "ดาวเด่น",              group: "high" },
];

interface NomineeRow {
  employee_id: string;
  employee_code: string | null;
  display_name: string;
  full_name_en: string | null;
  full_name_th: string | null;
  department: string | null;
  position: string | null;
  job_grade: string | null;
  grade_prev: string | null;
  grade_curr: string | null;
  performance_score: number | null;
  potential_score: number | null;
  avg_score: number | null;
  performance_band: number | null;
  potential_band: number | null;
  box_id: number | null;
  box_label: string | null;
  talent_referrence: string | null;
  talent_remark: string | null;
  in_talent_pool: boolean;
}

export async function GET() {
  try {
    const sql = sqlMaybe;
    if (!sql) {
      return NextResponse.json(
        { error: "DATABASE_URL is not configured" },
        { status: 503 },
      );
    }
    const rows = (await sql`
      SELECT
        e.id::text                                          AS employee_id,
        e.employee_code,
        COALESCE(e.full_name_en, e.full_name_th, e.nickname) AS display_name,
        e.full_name_en,
        e.full_name_th,
        COALESCE(d.name_en, d.name_th)                       AS department,
        COALESCE(e.title_en, e.title_th)                     AS position,
        e.job_grade,
        e.grade_prev,
        e.grade_curr,
        e.performance_score,
        e.potential_score,
        e.avg_score,
        e.performance_band,
        e.potential_band,
        e.box_id,
        e.box_label,
        e.talent_referrence,
        e.talent_remark,
        e.in_talent_pool
      FROM employees e
      LEFT JOIN departments d ON d.id = e.department_id
      WHERE e.box_id IS NOT NULL
      ORDER BY e.avg_score DESC NULLS LAST, e.box_id DESC
    `) as unknown as NomineeRow[];

    const totalActiveQuery = (await sql`
      SELECT COUNT(*)::int AS n FROM employees WHERE is_active = true
    `) as Array<{ n: number }>;
    const totalActive = totalActiveQuery[0]?.n ?? 0;

    // ── 9-Box grid (with empty boxes returned so the UI can render the
    //    grid unconditionally) ──
    const boxes = BOX_DEFINITIONS.map((b) => {
      const list = rows.filter((r) => r.box_id === b.id);
      return {
        ...b,
        nominees: list.map((r) => ({
          employee_code: r.employee_code,
          display_name: r.display_name,
          department: r.department,
          position: r.position,
          avg_score: r.avg_score,
          in_talent_pool: r.in_talent_pool,
        })),
        headcount: list.length,
        final_cut: list.filter((r) => r.in_talent_pool).length,
      };
    });

    // ── Department roll-up ──
    const byDept = new Map<
      string,
      { nominees: number; pipeline: number; sum_avg: number; count_avg: number }
    >();
    for (const r of rows) {
      const k = r.department ?? "—";
      const entry =
        byDept.get(k) ?? { nominees: 0, pipeline: 0, sum_avg: 0, count_avg: 0 };
      entry.nominees++;
      if (r.in_talent_pool) entry.pipeline++;
      if (r.avg_score !== null) {
        entry.sum_avg += Number(r.avg_score);
        entry.count_avg++;
      }
      byDept.set(k, entry);
    }
    const departments = [...byDept.entries()]
      .map(([department, v]) => ({
        department,
        nominees: v.nominees,
        pipeline: v.pipeline,
        avg_score: v.count_avg > 0 ? Number((v.sum_avg / v.count_avg).toFixed(2)) : null,
      }))
      .sort((a, b) => b.pipeline - a.pipeline || b.nominees - a.nominees);

    // ── Funnel ──
    const funnel = {
      active_workforce: totalActive,
      nominees: rows.length,
      talent_pool: rows.filter((r) => r.in_talent_pool).length,
      target: 20, // from TKC's 7% selection logic
    };

    // ── Final Cut ranking (all Talent Pool members, ordered by avg desc) ──
    const rankRow = (r: NomineeRow, rank: number) => ({
      rank,
      employee_id: r.employee_id,
      employee_code: r.employee_code,
      display_name: r.display_name,
      department: r.department,
      position: r.position,
      job_grade: r.job_grade,
      grade_prev: r.grade_prev,
      grade_curr: r.grade_curr,
      performance_score: r.performance_score,
      potential_score: r.potential_score,
      avg_score: r.avg_score,
      performance_band: r.performance_band,
      potential_band: r.potential_band,
      box_id: r.box_id,
      box_label: r.box_label,
      referrence: r.talent_referrence,
      remark: r.talent_remark,
      in_talent_pool: r.in_talent_pool,
    });

    const ranking = rows
      .filter((r) => r.in_talent_pool)
      .sort((a, b) => (b.avg_score ?? 0) - (a.avg_score ?? 0))
      .map((r, i) => rankRow(r, i + 1));

    // ── Emerging Group · framework §11 (Box 4 + 5 nominees not in pool) ──
    //    "Improving Trend + Competency Gap" cohort — the bench that needs
    //    development to qualify for the Final Cut next cycle.
    const emerging = rows
      .filter((r) => !r.in_talent_pool && (r.box_id === 4 || r.box_id === 5))
      .sort((a, b) => (b.avg_score ?? 0) - (a.avg_score ?? 0))
      .map((r, i) => rankRow(r, i + 1));

    return NextResponse.json({
      cycle: "2026-H1",
      generated_at: new Date().toISOString(),
      funnel,
      boxes,
      departments,
      ranking,
      emerging,
      total_nominees: rows.length,
      total_pool: funnel.talent_pool,
    });
  } catch (err) {
    console.error("[talent-assessment]", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "unknown_error" },
      { status: 500 },
    );
  }
}
