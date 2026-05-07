/**
 * Project trajectory — the live financial projection per project.
 *
 * Pure, deterministic, no API. Given a project plus its current
 * allocations and the employee roster, returns the four numbers the
 * Cockpit and Formation strips want:
 *
 *   - weekly_burn_thb        Σ(employee_salary / 4.33) × Σ(fte)
 *   - weeks_to_deadline      based on due_date if present, else fallback
 *   - projected_total_cost   weekly_burn × weeks + 12% buffer
 *   - margin_pct             (budget − projected_cost) / budget
 *
 * Status rules:
 *   - "healthy"   — projected_cost ≤ budget × 0.85
 *   - "tight"     — 0.85 < projected_cost / budget ≤ 1.0
 *   - "over"      — projected_cost > budget
 *   - "no_budget" — budget unset
 *   - "no_team"   — no allocations
 */

export interface TrajectoryInput {
  project: {
    code: string;
    budget_thb: number | null;
    monthly_ceiling: number | null;
    due_date?: string | null;       // ISO; falls back to 12 weeks if absent
    progress_pct?: number | null;   // 0-100
    team_size?: number | null;
  };
  allocations: Array<{
    employee_id: string;
    fte: number;
  }>;
  employees: Array<{
    id: string;
    salary_thb: number | string | null;
  }>;
}

export interface Trajectory {
  weekly_burn_thb: number;
  weeks_to_deadline: number;
  projected_total_cost: number;
  margin_pct: number;             // null if budget unset
  status: "healthy" | "tight" | "over" | "no_budget" | "no_team";
  // For sparkline display: pairs of (week_index, cumulative_cost)
  spark: Array<{ week: number; cost: number; budget_at_week: number }>;
}

const BUFFER_PCT = 0.12;            // 12% safety buffer in projected total
const DEFAULT_HORIZON_WEEKS = 12;
const WEEKS_PER_MONTH = 4.33;

function asNumber(v: number | string | null | undefined): number {
  if (v == null) return 0;
  if (typeof v === "number") return Number.isFinite(v) ? v : 0;
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
}

export function computeTrajectory(input: TrajectoryInput): Trajectory {
  const { project, allocations, employees } = input;
  const budget = asNumber(project.budget_thb);
  const empById = new Map(employees.map((e) => [e.id, e]));

  // Weekly burn = Σ(salary / weeks_per_month × fte)
  let weeklyBurn = 0;
  let totalFte = 0;
  for (const a of allocations) {
    const emp = empById.get(a.employee_id);
    if (!emp) continue;
    const monthly = asNumber(emp.salary_thb);
    if (monthly <= 0) continue;
    const fte = Number.isFinite(a.fte) ? Math.max(0, a.fte) : 0;
    weeklyBurn += (monthly / WEEKS_PER_MONTH) * fte;
    totalFte += fte;
  }

  // Weeks to deadline
  const weeksLeft = (() => {
    if (!project.due_date) return DEFAULT_HORIZON_WEEKS;
    const due = new Date(project.due_date);
    if (Number.isNaN(due.getTime())) return DEFAULT_HORIZON_WEEKS;
    const ms = due.getTime() - Date.now();
    if (ms <= 0) return 0;
    return Math.max(0, ms / (1000 * 60 * 60 * 24 * 7));
  })();

  // Projected total cost = burn × weeks × (1 + buffer)
  const projected = weeklyBurn * weeksLeft * (1 + BUFFER_PCT);

  // Margin
  const margin = budget > 0 ? ((budget - projected) / budget) * 100 : 0;

  // Status
  let status: Trajectory["status"];
  if (totalFte === 0) status = "no_team";
  else if (budget <= 0) status = "no_budget";
  else if (projected > budget) status = "over";
  else if (projected > budget * 0.85) status = "tight";
  else status = "healthy";

  // Sparkline: 12 weeks of cumulative cost vs cumulative budget straight-line
  const horizon = Math.max(8, Math.min(20, Math.ceil(weeksLeft) || DEFAULT_HORIZON_WEEKS));
  const spark: Trajectory["spark"] = [];
  for (let w = 0; w <= horizon; w++) {
    spark.push({
      week: w,
      cost: weeklyBurn * w * (1 + BUFFER_PCT),
      budget_at_week: budget > 0 ? (budget / horizon) * w : 0,
    });
  }

  return {
    weekly_burn_thb: Math.round(weeklyBurn),
    weeks_to_deadline: Math.round(weeksLeft * 10) / 10,
    projected_total_cost: Math.round(projected),
    margin_pct: Math.round(margin * 10) / 10,
    status,
    spark,
  };
}

/** Compact human label for THB amounts. */
export function formatThb(n: number): string {
  if (n >= 1_000_000) return `฿${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `฿${(n / 1_000).toFixed(0)}K`;
  return `฿${Math.round(n)}`;
}
