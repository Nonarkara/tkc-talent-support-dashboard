/**
 * GET /api/db/project-health
 *
 * Returns one row per active project shaped exactly for the PMO's
 * Portfolio-Dashboard page-5 "Project Health" card. Built so the
 * cassette can hand the PMO a 1:1 parity view in tomorrow's meeting
 * (see docs/PMO_MEETING_PREP_20260514.md §5 step 6).
 *
 * Shape:
 *   {
 *     ok: true,
 *     projects: [
 *       {
 *         id, code, name, client,
 *         status, project_year, updated_at, days_since_update,
 *         pm_name,
 *
 *         overall_progress_pct,
 *
 *         start_date, end_date, days_until_deadline,
 *
 *         resource_plan_hrs, resource_actual_hrs, resource_actual_pct,
 *
 *         project_cost_thb, billed_thb, billed_pct,
 *         internal_budget_thb, expensed_thb, expensed_pct,
 *
 *         issues: { critical, high, medium, low, total },
 *         risks:  { critical, high, medium, low, total },
 *
 *         instalments: [
 *           { term, original_due, revised_due, amount_thb, billed_status }
 *         ]
 *       }
 *     ]
 *   }
 */

import { apiJson, apiError } from "@/lib/api";
import { isDbConfigured, query } from "@/lib/db";

interface ProjectRow {
  id: string;
  code: string;
  name: string;
  client_name: string | null;
  status: string;
  project_year: number | null;
  pm_id: string | null;
  pm_name: string | null;
  updated_at: string;
  progress_pct: number;
  start_date: string | null;
  end_date: string | null;
  budget_thb: number | null;
  /** For resolved projects we have a final actual cost from
   *  project_outcomes.budget_actual_thb. For in-flight projects it
   *  is null — the Expensed tile renders DATA PENDING until the
   *  ERP feed lands. */
  outcome_actual_cost_thb: number | null;
  internal_budget_thb: number | null;
}

interface SeverityBuckets {
  critical: number;
  high: number;
  medium: number;
  low: number;
  total: number;
}

interface InstalmentRow {
  project_id: string;
  term_no: number;
  original_due: string;
  revised_due: string | null;
  amount_thb: number;
  billed_status: "billed" | "pending" | "overdue" | "within_60";
}

export async function GET() {
  if (!isDbConfigured()) {
    return apiError("Database not configured", 503);
  }

  try {
    // 1. Projects + PM join + outcome-actuals (left join — most active
    //    projects have no outcome yet, so this column will be NULL and
    //    the Expensed tile renders DATA PENDING).
    const projects = await query<ProjectRow>(`
      SELECT
        p.id, p.code, p.name, p.client_name, p.status, p.project_year,
        p.pm_id,
        COALESCE(e.nickname, e.full_name_en, '—') AS pm_name,
        p.updated_at,
        p.progress_pct,
        p.start_date, p.end_date,
        p.budget_thb,
        po.budget_actual_thb AS outcome_actual_cost_thb,
        p.internal_budget_thb
      FROM projects p
      LEFT JOIN employees e ON e.id = p.pm_id
      LEFT JOIN project_outcomes po ON po.project_id = p.id
      WHERE p.status != 'archived'
      ORDER BY
        CASE p.status WHEN 'active' THEN 0 WHEN 'planning' THEN 1 WHEN 'completed' THEN 2 ELSE 3 END,
        p.code
    `);

    // 2. Aggregate billed amount per project from instalments
    const billedRows = await query<{ project_id: string; billed_thb: number }>(`
      SELECT project_id, COALESCE(SUM(amount_thb), 0)::NUMERIC AS billed_thb
      FROM project_instalments
      WHERE billed_status = 'billed'
      GROUP BY project_id
    `);
    const billedByProject = new Map<string, number>(
      billedRows.map((r) => [r.project_id, Number(r.billed_thb)]),
    );

    // 3. Issues counts per project, bucketed
    const issueRows = await query<{ project_id: string; severity: string; count: string }>(`
      SELECT project_id, severity, COUNT(*)::TEXT AS count
      FROM project_issues
      WHERE closed_at IS NULL
      GROUP BY project_id, severity
    `);
    const issuesByProject = new Map<string, SeverityBuckets>();
    for (const r of issueRows) {
      const b = issuesByProject.get(r.project_id) ?? { critical: 0, high: 0, medium: 0, low: 0, total: 0 };
      const c = parseInt(r.count, 10);
      (b as unknown as Record<string, number>)[r.severity] = c;
      b.total += c;
      issuesByProject.set(r.project_id, b);
    }

    // 4. Risks counts per project, bucketed
    const riskRows = await query<{ project_id: string; severity: string; count: string }>(`
      SELECT project_id, severity, COUNT(*)::TEXT AS count
      FROM project_risks
      WHERE closed_at IS NULL
      GROUP BY project_id, severity
    `);
    const risksByProject = new Map<string, SeverityBuckets>();
    for (const r of riskRows) {
      const b = risksByProject.get(r.project_id) ?? { critical: 0, high: 0, medium: 0, low: 0, total: 0 };
      const c = parseInt(r.count, 10);
      (b as unknown as Record<string, number>)[r.severity] = c;
      b.total += c;
      risksByProject.set(r.project_id, b);
    }

    // 5. Instalments per project, ordered by term
    const instalmentRows = await query<InstalmentRow>(`
      SELECT project_id, term_no, original_due, revised_due, amount_thb, billed_status
      FROM project_instalments
      ORDER BY project_id, term_no
    `);
    const instalmentsByProject = new Map<string, InstalmentRow[]>();
    for (const r of instalmentRows) {
      const arr = instalmentsByProject.get(r.project_id) ?? [];
      arr.push(r);
      instalmentsByProject.set(r.project_id, arr);
    }

    // 6. Resource utilization plan from allocations
    //    Plan hrs ≈ Σ (fte × 40hr/wk × weeks-active). For the demo we
    //    use a simplified estimate: fte × 40 × project_duration_weeks.
    //    Real actuals come from the Timesheet feed (GAP).
    const planRows = await query<{ project_id: string; total_fte: number }>(`
      SELECT project_id, COALESCE(SUM(fte), 0)::NUMERIC AS total_fte
      FROM project_allocations
      GROUP BY project_id
    `);
    const planByProject = new Map<string, number>(
      planRows.map((r) => [r.project_id, Number(r.total_fte)]),
    );

    // 7. Compose the response
    const now = Date.now();
    const cards = projects.map((p) => {
      const project_cost_thb = Number(p.budget_thb ?? 0);
      const budget_internal = Number(p.internal_budget_thb ?? 0);
      const expensedRaw = p.outcome_actual_cost_thb;
      const expensed = expensedRaw == null ? 0 : Number(expensedRaw);
      const expensed_data_pending = expensedRaw == null;
      const billed = billedByProject.get(p.id) ?? 0;

      const start = p.start_date ? new Date(p.start_date).getTime() : null;
      const end = p.end_date ? new Date(p.end_date).getTime() : null;
      const project_duration_weeks =
        start && end ? Math.max(1, Math.round((end - start) / (1000 * 60 * 60 * 24 * 7))) : 12;

      const totalFte = planByProject.get(p.id) ?? 0;
      const resource_plan_hrs = Math.round(totalFte * 40 * project_duration_weeks);
      // Actual hours: GAP — no Timesheet feed yet. Send null so the
      // card renders a clearly-labelled DATA PENDING band.
      const resource_actual_hrs: number | null = null;
      const resource_actual_pct: number | null = null;

      const updated_ms = new Date(p.updated_at).getTime();
      const days_since_update = Math.floor((now - updated_ms) / (1000 * 60 * 60 * 24));

      const days_until_deadline = end
        ? Math.ceil((end - now) / (1000 * 60 * 60 * 24))
        : null;

      return {
        id: p.id,
        code: p.code,
        name: p.name,
        client: p.client_name ?? "—",
        status: p.status,
        project_year: p.project_year,
        pm_name: p.pm_name,
        updated_at: p.updated_at,
        days_since_update,

        overall_progress_pct: Number(p.progress_pct) || 0,

        start_date: p.start_date,
        end_date: p.end_date,
        days_until_deadline,

        resource_plan_hrs,
        resource_actual_hrs,
        resource_actual_pct,
        resource_data_pending: true, // explicit flag for the UI

        project_cost_thb,
        billed_thb: billed,
        billed_pct: project_cost_thb > 0 ? Math.round((billed / project_cost_thb) * 100) : 0,
        internal_budget_thb: budget_internal,
        expensed_thb: expensed,
        expensed_pct: budget_internal > 0 ? Math.round((expensed / budget_internal) * 100) : 0,
        expensed_data_pending,

        issues: issuesByProject.get(p.id) ?? { critical: 0, high: 0, medium: 0, low: 0, total: 0 },
        risks: risksByProject.get(p.id) ?? { critical: 0, high: 0, medium: 0, low: 0, total: 0 },

        instalments: instalmentsByProject.get(p.id) ?? [],
      };
    });

    // ─── Portfolio rollup (PMO Control Tower data) ────────────
    // Computed from the same arrays the per-project cards use, so the
    // tower headline numbers and the per-project drilldowns are
    // guaranteed to agree. Three lenses the PMO PDF page 4 asks for:
    //   • Executive Summary tiles (4)
    //   • Project Health by status (5 buckets)
    //   • Instalment Payments Timeline by month (12 columns)

    const ANNUAL_VALUE_TARGET_THB = 4_000_000_000; // ฿4.0B Base Case from PMO roadmap p.2 (May 7 deck)

    let total_project_value = 0;
    let total_billed = 0;
    let total_internal_budget = 0;
    let total_expensed = 0;

    type StatusBucket = "not_start" | "on_track" | "at_risk" | "delayed" | "closed";
    const statusCounts: Record<StatusBucket, number> = {
      not_start: 0,
      on_track: 0,
      at_risk: 0,
      delayed: 0,
      closed: 0,
    };

    const monthlyInstalmentsTHB: number[] = Array(12).fill(0);
    const monthlyInstalmentsByStatus: { billed: number[]; pending: number[] } = {
      billed: Array(12).fill(0),
      pending: Array(12).fill(0),
    };

    for (const c of cards) {
      total_project_value += c.project_cost_thb || 0;
      total_billed += c.billed_thb || 0;
      total_internal_budget += c.internal_budget_thb || 0;
      total_expensed += c.expensed_thb || 0;

      // Status bucketing — see game_clock.ts vocabulary
      const s = (c.status ?? "").toLowerCase();
      if (s === "completed" || s === "closed" || s === "archived") statusCounts.closed++;
      else if (s === "planning") statusCounts.not_start++;
      else if (c.days_until_deadline !== null && c.days_until_deadline < 0) statusCounts.delayed++;
      else if ((c.issues?.critical ?? 0) > 0 || (c.issues?.high ?? 0) > 1) statusCounts.at_risk++;
      else statusCounts.on_track++;

      // Aggregate this project's instalments into the monthly timeline
      for (const inst of c.instalments) {
        const due = new Date(inst.original_due);
        const month = due.getMonth();
        const amount = Number(inst.amount_thb);
        monthlyInstalmentsTHB[month] += amount;
        if (inst.billed_status === "billed") monthlyInstalmentsByStatus.billed[month] += amount;
        else monthlyInstalmentsByStatus.pending[month] += amount;
      }
    }

    const portfolio = {
      // 4 headline tiles
      active_projects: cards.filter((c) => c.status !== "completed" && c.status !== "closed" && c.status !== "archived").length,
      total_projects: cards.length,
      project_value_thb: total_project_value,
      project_value_target_thb: ANNUAL_VALUE_TARGET_THB,
      project_value_pct: Math.round((total_project_value / ANNUAL_VALUE_TARGET_THB) * 100),
      billed_thb: total_billed,
      billed_target_thb: total_project_value,
      billed_pct: total_project_value > 0 ? Math.round((total_billed / total_project_value) * 100) : 0,
      expensed_thb: total_expensed,
      internal_budget_total_thb: total_internal_budget,
      burn_rate_pct: total_internal_budget > 0 ? Math.round((total_expensed / total_internal_budget) * 100) : 0,
      // 5-bucket status distribution
      status_counts: statusCounts,
      // 12-month timeline (Jan = index 0)
      monthly_instalments_thb: monthlyInstalmentsTHB,
      monthly_instalments_by_status: monthlyInstalmentsByStatus,
    };

    return apiJson({ ok: true, projects: cards, portfolio });
  } catch (err) {
    console.error("[/api/db/project-health] failed:", err);
    return apiError("Failed to compute project health", 500);
  }
}
