/**
 * The Four Pillars — Dr Non's "house health" score.
 *
 * Quoting the source 2026-04-27:
 *   In a total score of the office, there'll be the things that we
 *   think about the value of the company:
 *   - Compensation: are people happy with that cost?
 *   - Purpose: are people happy with the reason why they're working
 *     for this company?
 *   - Career: are they seeing themselves moving to it for the
 *     betterment of their career?
 *   - Community: do they see community in this?
 *
 * Until self-report data lands (planned v8.5+), each pillar is computed
 * from objective signals already in the database. The formulas are
 * heuristic, normalised to 0–100, and **explicitly documented** so
 * future calibration can adjust them without spelunking.
 *
 * Aggregation: House score = mean of pillar means across all active heroes.
 * No leaderboard. No peer comparison. This is a *snapshot of presence*,
 * not a verdict on it.
 */

import { isDbConfigured, query } from "./db";

// ─── Types ───────────────────────────────────────────────────────────────

export interface FourPillarScore {
  compensation: number; // 0–100
  purpose: number;
  career: number;
  community: number;
  composite: number;    // unweighted mean of the four
}

export interface FourPillarHouseScore extends FourPillarScore {
  active_heroes: number;
  computed_at: string;
}

export interface CoverageStat {
  /** Heroes whose pillars came from a self-report row in the current cycle. */
  self_reported: number;
  /** Heroes whose pillars came from the heuristic. */
  heuristic_only: number;
  /** Current cycle the coverage applies to. */
  cycle: string;
}

export interface PillarFormula {
  pillar: keyof Omit<FourPillarScore, "composite">;
  signals: string[];
  notes: string;
}

/** Documentation of how each pillar is computed. Surfaced in the UI. */
export const PILLAR_FORMULAS: PillarFormula[] = [
  {
    pillar: "compensation",
    signals: [
      "employees.salary_thb relative to role-level median",
      "(future) benefits eligibility flag",
    ],
    notes:
      "Heuristic: 50 baseline. +30 if at role-median, +50 if above. Penalty if salary not set.",
  },
  {
    pillar: "purpose",
    signals: [
      "project_allocations.overall_pct (average)",
      "active_project_count > 0",
    ],
    notes:
      "Mean fit-score across active allocations. Heroes with no allocation default to 40 (no signal yet).",
  },
  {
    pillar: "career",
    signals: [
      "tenure_years (longer = more invested)",
      "total_points / tenure_years (XP velocity)",
      "vocation_changes count (ascensions = growth visible)",
    ],
    notes:
      "Combines tenure investment with XP velocity. New hires (<1 yr) default to 60; ascended heroes get +10 each up to +30.",
  },
  {
    pillar: "community",
    signals: [
      "DISTINCT project_id count from project_allocations",
      "interactions table count (cross-employee chats from Lobby)",
    ],
    notes:
      "Cross-team contact. Heroes only on one project / never interacting trend toward 40; heroes spanning ≥3 projects or with frequent interactions trend toward 80.",
  },
];

// ─── Compute pillars per employee ────────────────────────────────────────

interface EmpRow {
  id: string;
  role_level: string;
  salary_thb: number | null;
  tenure_years: number | null;
  total_points: number | null;
  is_active: boolean;
}

interface AllocAgg {
  employee_id: string;
  active_count: number;
  distinct_projects: number;
  avg_overall_pct: number | null;
}

interface InteractionCount {
  employee_id: string;
  interaction_count: number;
}

interface VocationCount {
  employee_id: string;
  ascension_count: number;
}

function clamp(n: number, lo = 0, hi = 100): number {
  if (!Number.isFinite(n)) return lo;
  return Math.max(lo, Math.min(hi, n));
}

function compensationScore(salary: number | null, roleMedian: number, hasSalary: boolean): number {
  if (!hasSalary) return 35; // unknown salary signals "data gap"
  if (roleMedian <= 0 || salary == null) return 50;
  const ratio = salary / roleMedian;
  // ratio 1.0 → 70; ratio 1.25 → 90; ratio 0.75 → 50
  return clamp(40 + ratio * 30);
}

function purposeScore(avgOverallPct: number | null, hasAllocation: boolean): number {
  if (!hasAllocation) return 40;
  if (avgOverallPct == null) return 50;
  // overall_pct already on 0–100; passthrough but floor at 30 to avoid harshness
  return clamp(Math.max(30, avgOverallPct));
}

function careerScore(tenureYears: number | null, totalPoints: number | null, ascensions: number): number {
  const tenure = tenureYears ?? 0;
  const xp = totalPoints ?? 0;
  if (tenure < 1) return 60; // grace period for new hires
  // base = 50 + tenure-investment cap at 25 (10 yrs)
  const tenureBonus = Math.min(25, tenure * 2.5);
  // velocity = xp / tenure, normalised to ~ 0–15 range
  const velocity = tenure > 0 ? clamp((xp / tenure) / 50, 0, 15) : 0;
  // ascensions += 10 each up to +20
  const ascBonus = Math.min(20, ascensions * 10);
  return clamp(50 + tenureBonus + velocity + ascBonus);
}

function communityScore(distinctProjects: number, interactionCount: number): number {
  // 1 project = 40, 2 = 55, 3+ = 70 base
  const projBase = distinctProjects >= 3 ? 70 : distinctProjects === 2 ? 55 : distinctProjects === 1 ? 40 : 30;
  // interactions: every 5 events adds 1 point, capped at 20
  const intBonus = Math.min(20, Math.floor(interactionCount / 5));
  return clamp(projBase + intBonus);
}

export function pillarsForEmployee(
  emp: EmpRow,
  alloc: AllocAgg | undefined,
  interactions: InteractionCount | undefined,
  vocations: VocationCount | undefined,
  roleMedians: Record<string, number>,
): FourPillarScore {
  const median = roleMedians[emp.role_level] ?? 0;
  const hasSalary = emp.salary_thb != null;

  const compensation = compensationScore(emp.salary_thb, median, hasSalary);
  const purpose = purposeScore(
    alloc?.avg_overall_pct ?? null,
    (alloc?.active_count ?? 0) > 0,
  );
  const career = careerScore(emp.tenure_years, emp.total_points, vocations?.ascension_count ?? 0);
  const community = communityScore(alloc?.distinct_projects ?? 0, interactions?.interaction_count ?? 0);

  const composite = (compensation + purpose + career + community) / 4;
  return { compensation, purpose, career, community, composite };
}

// ─── House score (aggregate) ─────────────────────────────────────────────

export interface PerEmployeeScore extends FourPillarScore {
  employee_id: string;
  employee_name: string;
  dept_code: string | null;
  /** Whether this employee's score came from a self-report (true) or
   *  was derived heuristically (false). Used by the UI to surface
   *  trust ("X of Y self-reported"). */
  self_reported: boolean;
}

export interface HouseScoreResult {
  house: FourPillarHouseScore;
  formulas: PillarFormula[];
  per_employee: PerEmployeeScore[];
  coverage: CoverageStat;
}

/** The cycle that self-report responses are read against. v8.6 will move
 *  this to per-cycle queries; tonight one current-cycle constant matches
 *  the rest of the system. */
const CURRENT_CYCLE = "2026-Q2";

export async function computeHouseScore(): Promise<HouseScoreResult> {
  const computed_at = new Date().toISOString();
  const fallback: HouseScoreResult = {
    house: {
      compensation: 0, purpose: 0, career: 0, community: 0, composite: 0,
      active_heroes: 0, computed_at,
    },
    formulas: PILLAR_FORMULAS,
    per_employee: [],
    coverage: { self_reported: 0, heuristic_only: 0, cycle: CURRENT_CYCLE },
  };
  if (!isDbConfigured()) return fallback;

  // Pull data in parallel
  const [emps, allocs, interactions, vocations, responses] = await Promise.all([
    safe<EmpRow & { employee_name: string; dept_code: string | null }>(
      `SELECT e.id::text, e.role_level, e.salary_thb,
              e.tenure_years, e.total_points, e.is_active,
              COALESCE(e.nickname, e.full_name_en, e.full_name_th) AS employee_name,
              d.code AS dept_code
         FROM employees e
         LEFT JOIN departments d ON d.id = e.department_id
         WHERE e.is_active = true`,
    ),
    safe<AllocAgg>(
      `SELECT employee_id::text,
              COUNT(*)::int AS active_count,
              COUNT(DISTINCT project_id)::int AS distinct_projects,
              AVG(NULLIF(overall_pct, 0))::float AS avg_overall_pct
         FROM project_allocations
         GROUP BY employee_id`,
    ),
    safe<InteractionCount>(
      `SELECT employee_id::text, COUNT(*)::int AS interaction_count
         FROM (
           SELECT initiator_id AS employee_id FROM interactions
           UNION ALL
           SELECT partner_id   AS employee_id FROM interactions
         ) e
         GROUP BY employee_id`,
    ),
    safe<VocationCount>(
      `SELECT employee_id::text, COUNT(*)::int AS ascension_count
         FROM vocation_changes GROUP BY employee_id`,
    ),
    safe<{
      employee_id: string; compensation: number; purpose: number;
      career: number; community: number;
    }>(
      `SELECT employee_id::text, compensation, purpose, career, community
         FROM four_pillar_responses
         WHERE cycle = $1`,
      [CURRENT_CYCLE],
    ),
  ]);

  // Role medians
  const roleMedians: Record<string, number> = {};
  for (const role of ["md", "deputy_md", "director", "manager", "senior", "staff"]) {
    const r = await safe<{ median: string }>(
      `SELECT percentile_cont(0.5) WITHIN GROUP (ORDER BY salary_thb)::text AS median
         FROM employees
         WHERE role_level = $1 AND salary_thb IS NOT NULL AND is_active = true`,
      [role],
    );
    roleMedians[role] = Number(r[0]?.median ?? 0);
  }

  const allocByEmp = new Map(allocs.map((a) => [a.employee_id, a]));
  const intByEmp = new Map(interactions.map((i) => [i.employee_id, i]));
  const vocByEmp = new Map(vocations.map((v) => [v.employee_id, v]));
  const respByEmp = new Map(responses.map((r) => [r.employee_id, r]));

  const perEmployee: PerEmployeeScore[] = emps.map((e) => {
    const heuristic = pillarsForEmployee(
      e, allocByEmp.get(e.id), intByEmp.get(e.id), vocByEmp.get(e.id), roleMedians,
    );
    // Survey response, if present for current cycle, replaces the heuristic.
    // No blending tonight — that's a v8.6 calibration decision.
    const reported = respByEmp.get(e.id);
    const score: FourPillarScore = reported
      ? {
          compensation: Number(reported.compensation),
          purpose: Number(reported.purpose),
          career: Number(reported.career),
          community: Number(reported.community),
          composite:
            (Number(reported.compensation) +
              Number(reported.purpose) +
              Number(reported.career) +
              Number(reported.community)) / 4,
        }
      : heuristic;

    return {
      ...score,
      employee_id: e.id,
      employee_name: e.employee_name,
      dept_code: e.dept_code,
      self_reported: Boolean(reported),
    };
  });

  // House aggregate = mean of each pillar across active employees
  const n = Math.max(1, perEmployee.length);
  const sum = perEmployee.reduce(
    (a, e) => ({
      compensation: a.compensation + e.compensation,
      purpose: a.purpose + e.purpose,
      career: a.career + e.career,
      community: a.community + e.community,
    }),
    { compensation: 0, purpose: 0, career: 0, community: 0 },
  );

  const house: FourPillarHouseScore = {
    compensation: Math.round(sum.compensation / n),
    purpose: Math.round(sum.purpose / n),
    career: Math.round(sum.career / n),
    community: Math.round(sum.community / n),
    composite: 0,
    active_heroes: perEmployee.length,
    computed_at,
  };
  house.composite = Math.round((house.compensation + house.purpose + house.career + house.community) / 4);

  const coverage: CoverageStat = {
    self_reported: perEmployee.filter((e) => e.self_reported).length,
    heuristic_only: perEmployee.filter((e) => !e.self_reported).length,
    cycle: CURRENT_CYCLE,
  };

  return { house, formulas: PILLAR_FORMULAS, per_employee: perEmployee, coverage };
}

// ─── helper ───────────────────────────────────────────────────────────────

async function safe<T>(text: string, params: unknown[] = []): Promise<T[]> {
  try {
    return await query<T>(text, params);
  } catch {
    return [];
  }
}

/** A single overload that takes raw query params for inline use. */
async function safeWith<T>(text: string, params: unknown[]): Promise<T[]> {
  return safe<T>(text, params);
}
// Suppress unused warning while keeping the helper available.
void safeWith;
