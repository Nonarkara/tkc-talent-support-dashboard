import { apiJson, logApiError } from "@/lib/api";
import { isDbConfigured, query } from "@/lib/db";
import {
  DEFAULT_COMPETENCY_STANDARDS,
  inferProfileFacets,
} from "@/lib/matrix-workshop-defaults";
import {
  calculateSuggestedTeamSize,
  inferProjectScale,
} from "@/lib/project-planning";
import {
  combineSentimentSignals,
  normalizeSentimentSignal,
  sentimentRuleModifiers,
  type SentimentSignal,
} from "@/lib/sentiment-engine";
import { sheetsEnabled } from "@/lib/sheets-sync";

interface EmployeeRow {
  id: string;
  employee_code: string | null;
  nickname: string | null;
  full_name_th: string;
  full_name_en: string | null;
  display_name: string;
  email: string | null;
  role_level: string;
  title_th: string | null;
  title_en: string | null;
  title: string | null;
  level: number | null;
  tenure_years: number | null;
  salary_thb: number | null;
  is_active: boolean;
  skills: string[] | null;
  dept_code: string | null;
  dept_name_en: string | null;
  div_code: string | null;
  div_name_en: string | null;
  attr_str: number | null;
  attr_int: number | null;
  attr_wis: number | null;
  attr_cha: number | null;
  attr_dex: number | null;
  attr_con: number | null;
  rpg_class: string | null;
  stat_locked: boolean | null;
  stat_lock_reason: string | null;
  stat_source: string | null;
  stat_criteria: Record<string, unknown> | null;
  xp: number | null;
  traits: string[] | null;
  perks: string[] | null;
  title_prefix: string | null;
  gender: "m" | "f" | null;
  gender_override: string | null;
  date_of_birth: string | null;
  education_level: string | null;
  education_school: string | null;
  education_faculty: string | null;
  education_major: string | null;
  section_th: string | null;
  resign_date: string | null;
  resign_status: "presumed_departed" | "confirmed" | "none" | null;
  joined_at: string | null;
}

interface ProjectRow {
  id: string;
  code: string;
  name: string;
  client_name: string | null;
  description: string | null;
  status: string | null;
  priority: string | null;
  budget_thb: number | null;
  monthly_ceiling: number | null;
  gross_margin_pct: number | null;
  required_skills: string[] | null;
  team_size: number | null;
  progress_pct: number | null;
  project_slots: Record<string, number> | null;
  priority_weights: Record<string, number> | null;
  complexity_score: number | null;
  urgency_score: number | null;
  strategic_value_score: number | null;
  delivery_risk_score: number | null;
  ai_leverage_score: number | null;
  config_locked: boolean | null;
  config_lock_reason: string | null;
  config_source: string | null;
  config_criteria: Record<string, unknown> | null;
  div_code: string | null;
  dept_code: string | null;
}

interface TeamRow {
  id: string;
  project_id: string;
  project_code: string;
  coach_id: string | null;
  coach_code: string | null;
  player_ids: string[] | null;
  formation: string | null;
  chemistry_score: number | null;
  overall_score: number | null;
  allocation_pcts: Record<string, number> | null;
  insights: unknown;
}

interface SupportActionRow {
  id: string;
  employee_id: string;
  cycle: string;
  action_type: string;
  title: string;
  note: string | null;
  status: string;
  owner_employee_id: string | null;
  owner_nickname: string | null;
  owner_full_name_en: string | null;
  owner_full_name_th: string | null;
  created_at: string;
  updated_at: string;
}

interface KpiRow {
  id: string;
  dept_code: string;
  cycle: string;
  kpi_name_en: string;
  kpi_name_th: string | null;
  weight_pct: number;
  target_value: number | null;
  target_unit: string | null;
  actual_value: number | null;
  status: string;
  notes: string;
  updated_at: string;
}

interface StandardRow {
  id?: string;
  skill_key: string;
  display_name: string;
  framework_source: string;
  framework_id: string | null;
  category: string | null;
  descriptors: Record<string, string> | null;
  weight: number | null;
  recency_window_days: number | null;
  expected_level: number | null;
  evidence_policy: string | null;
  linked_dimensions: string[] | null;
  active: boolean;
  external_refs: Record<string, unknown> | null;
  sort_order: number | null;
  updated_at?: string | null;
}

interface ProfileFacetRow {
  employee_id: string;
  languages: string[] | null;
  certifications: string[] | null;
  soft_skills: string[] | null;
  external_refs: Record<string, unknown> | null;
  updated_at: string | null;
}

interface SkillEvidenceRow {
  employee_id: string;
  skill_name: string;
  proficiency: number;
  source: string;
  assessed_at: string | null;
  framework_id: string | null;
}

interface AllocationRow {
  id: string;
  employee_id: string;
  project_id: string | null;
  project_code: string | null;
  project_name: string | null;
  quest_id: string | null;
  quest_code: string | null;
  quest_title: string | null;
  coe_name: string | null;
  slot_key: string | null;
  assignment_label: string | null;
  fte: number;
  planned_or_actual: "planned" | "actual";
  status: string;
  start_date: string | null;
  end_date: string | null;
  source: string | null;
  external_id: string | null;
  metadata: Record<string, unknown> | null;
}

interface OutcomeRow {
  id: string;
  project_id: string;
  project_code: string;
  project_name: string;
  budget_actual_thb: number | null;
  timeline_status: "early" | "on_time" | "late" | "failed";
  quality_score: number | null;
  client_satisfaction: number | null;
  predicted_fit: number | null;
  predicted_chemistry: number | null;
  predicted_overall: number | null;
  team_cost_cp: number | null;
  team_size: number | null;
  notes: string | null;
  lessons: string[] | null;
  recorded_at: string;
}

interface RawSentimentRow {
  employee_id: string | null;
  created_at: string | null;
  sentiment: unknown;
  text: string | null;
  source: string;
}

async function safeQuery<T = Record<string, unknown>>(
  scope: string,
  text: string,
  params: unknown[] = [],
): Promise<T[]> {
  try {
    return await query<T>(text, params);
  } catch (error) {
    logApiError(scope, error);
    return [];
  }
}

async function loadSupportActions() {
  return safeQuery<SupportActionRow>(
    "api/db/dashboard support actions unavailable",
    `
      SELECT
        sa.id,
        sa.employee_id,
        sa.cycle,
        sa.action_type,
        sa.title,
        sa.note,
        sa.status,
        sa.owner_employee_id,
        owner.nickname AS owner_nickname,
        owner.full_name_en AS owner_full_name_en,
        owner.full_name_th AS owner_full_name_th,
        sa.created_at,
        sa.updated_at
      FROM support_actions sa
      LEFT JOIN employees owner ON owner.id = sa.owner_employee_id
      WHERE sa.cycle = '2026-Q2'
      ORDER BY sa.updated_at DESC
    `,
  );
}

async function loadCompetencyStandards() {
  return safeQuery<StandardRow>(
    "api/db/dashboard competency standards unavailable",
    `
      SELECT
        id, skill_key, display_name, framework_source, framework_id, category,
        descriptors, weight, recency_window_days, expected_level,
        evidence_policy, linked_dimensions, active, external_refs,
        sort_order, updated_at
      FROM competency_standards
      WHERE active = true
      ORDER BY sort_order, display_name
    `,
  );
}

async function loadProfileFacets() {
  return safeQuery<ProfileFacetRow>(
    "api/db/dashboard profile facets unavailable",
    `
      SELECT employee_id, languages, certifications, soft_skills, external_refs, updated_at
      FROM employee_profile_facets
    `,
  );
}

async function loadLatestSkillEvidence() {
  return safeQuery<SkillEvidenceRow>(
    "api/db/dashboard skill evidence unavailable",
    `
      WITH ranked AS (
        SELECT
          sa.employee_id,
          sa.skill_name,
          sa.proficiency,
          sa.source,
          sa.assessed_at,
          sa.framework_id,
          ROW_NUMBER() OVER (
            PARTITION BY sa.employee_id, sa.skill_name
            ORDER BY sa.assessed_at DESC,
              CASE sa.source
                WHEN 'manager' THEN 0
                WHEN 'assessment' THEN 1
                WHEN 'interview_ai' THEN 2
                WHEN 'peer' THEN 3
                WHEN 'self' THEN 4
                ELSE 5
              END
          ) AS rn
        FROM skill_assessments sa
      )
      SELECT employee_id, skill_name, proficiency, source, assessed_at, framework_id
      FROM ranked
      WHERE rn = 1
    `,
  );
}

async function loadAllocations() {
  return safeQuery<AllocationRow>(
    "api/db/dashboard allocations unavailable",
    `
      SELECT
        ea.id,
        ea.employee_id,
        ea.project_id,
        p.code AS project_code,
        p.name AS project_name,
        ea.quest_id,
        q.code AS quest_code,
        q.title AS quest_title,
        ea.coe_name,
        ea.slot_key,
        ea.assignment_label,
        ea.fte,
        ea.planned_or_actual,
        ea.status,
        ea.start_date,
        ea.end_date,
        ea.source,
        ea.external_id,
        ea.metadata
      FROM employee_allocations ea
      LEFT JOIN projects p ON p.id = ea.project_id
      LEFT JOIN quests q ON q.id = ea.quest_id
      ORDER BY ea.updated_at DESC
    `,
  );
}

async function loadOutcomes() {
  return safeQuery<OutcomeRow>(
    "api/db/dashboard outcomes unavailable",
    `
      SELECT
        po.*, p.code AS project_code, p.name AS project_name
      FROM project_outcomes po
      JOIN projects p ON p.id = po.project_id
      ORDER BY po.recorded_at DESC
    `,
  );
}

async function loadWorldEvents() {
  return safeQuery(
    "api/db/dashboard world events unavailable",
    `
      SELECT * FROM world_events
      WHERE event_date >= CURRENT_DATE - INTERVAL '1 day'
      AND event_date <= CURRENT_DATE + INTERVAL '7 days'
      ORDER BY event_date ASC
    `,
  );
}

async function loadCheckInSentiment() {
  return safeQuery<RawSentimentRow>(
    "api/db/dashboard check-in sentiment unavailable",
    `
      SELECT
        employee_id::text,
        created_at::text,
        COALESCE(approved->'sentiment', llm_proposal->'sentiment') AS sentiment,
        narrative AS text,
        'check_in'::text AS source
      FROM check_ins
      WHERE status IN ('proposed', 'approved')
        AND created_at >= NOW() - INTERVAL '120 days'
      ORDER BY created_at DESC
      LIMIT 1000
    `,
  );
}

async function loadObservationSentiment() {
  const [tables] = await safeQuery<{ ready: boolean }>(
    "api/db/dashboard observation sentiment table check unavailable",
    `
      SELECT (
        to_regclass('public.observations') IS NOT NULL
        AND to_regclass('public.users') IS NOT NULL
      ) AS ready
    `,
  );
  if (!tables?.ready) return [];

  return safeQuery<RawSentimentRow>(
    "api/db/dashboard observation sentiment unavailable",
    `
      SELECT
        e.id::text AS employee_id,
        o.observed_at::text AS created_at,
        o.sentiment,
        o.content AS text,
        'observation'::text AS source
      FROM observations o
      JOIN users u ON u.id = o.subject_user_id
      JOIN employees e
        ON e.employee_code = u.employee_id
        OR (e.email IS NOT NULL AND u.email IS NOT NULL AND lower(e.email) = lower(u.email))
      WHERE o.subject_user_id IS NOT NULL
        AND o.is_confidential = false
        AND o.observed_at >= NOW() - INTERVAL '120 days'
      ORDER BY o.observed_at DESC
      LIMIT 1000
    `,
  );
}

function todayIso() {
  return new Date().toISOString().slice(0, 10);
}

function diffDays(fromIso: string | null | undefined) {
  if (!fromIso) return null;
  const now = Date.now();
  const then = new Date(fromIso).getTime();
  if (!Number.isFinite(then)) return null;
  return Math.max(0, Math.round((now - then) / 86_400_000));
}

function freshness(days: number | null, windowDays: number) {
  if (days == null) return "unknown" as const;
  if (days <= Math.round(windowDays * 0.6)) return "fresh" as const;
  if (days <= windowDays) return "aging" as const;
  return "stale" as const;
}

function aggregateFreshness(values: string[]) {
  if (values.includes("stale")) return "stale";
  if (values.includes("aging")) return "aging";
  if (values.includes("fresh")) return "fresh";
  return "unknown";
}

function buildAvailability(allocations: AllocationRow[]) {
  const activeStatuses = new Set(["planned", "active", "paused"]);
  const today = todayIso();
  const byEmployee = new Map<string, AllocationRow[]>();

  for (const row of allocations) {
    if (!activeStatuses.has(row.status)) continue;
    if (row.end_date && row.end_date < today) continue;
    const list = byEmployee.get(row.employee_id) ?? [];
    list.push(row);
    byEmployee.set(row.employee_id, list);
  }

  const out = new Map<
    string,
    {
      employee_id: string;
      active_allocations: AllocationRow[];
      total_planned_fte: number;
      total_actual_fte: number;
      current_fte: number;
      at_capacity: boolean;
      over_capacity: boolean;
      next_available_at: string | null;
    }
  >();

  for (const [employeeId, rows] of byEmployee.entries()) {
    const byScope = new Map<string, AllocationRow[]>();
    for (const row of rows) {
      const scopeKey =
        row.project_id != null
          ? `project:${row.project_id}`
          : row.quest_id != null
            ? `quest:${row.quest_id}`
            : `coe:${row.coe_name ?? row.id}`;
      const list = byScope.get(scopeKey) ?? [];
      list.push(row);
      byScope.set(scopeKey, list);
    }

    const activeAllocations: AllocationRow[] = [];
    for (const list of byScope.values()) {
      const actual = list.filter((row) => row.planned_or_actual === "actual");
      if (actual.length > 0) {
        activeAllocations.push(...actual);
      } else {
        activeAllocations.push(...list);
      }
    }

    const totalPlannedFte = rows
      .filter((row) => row.planned_or_actual === "planned")
      .reduce((sum, row) => sum + Number(row.fte ?? 0), 0);
    const totalActualFte = rows
      .filter((row) => row.planned_or_actual === "actual")
      .reduce((sum, row) => sum + Number(row.fte ?? 0), 0);
    const currentFte = activeAllocations.reduce(
      (sum, row) => sum + Number(row.fte ?? 0),
      0,
    );
    const nextAvailableAt =
      currentFte >= 0.95
        ? activeAllocations
            .map((row) => row.end_date)
            .filter((value): value is string => Boolean(value))
            .sort()[0] ?? null
        : null;

    out.set(employeeId, {
      employee_id: employeeId,
      active_allocations: activeAllocations,
      total_planned_fte: Math.round(totalPlannedFte * 100) / 100,
      total_actual_fte: Math.round(totalActualFte * 100) / 100,
      current_fte: Math.round(currentFte * 100) / 100,
      at_capacity: currentFte >= 0.95,
      over_capacity: currentFte > 1.05,
      next_available_at: nextAvailableAt,
    });
  }

  return out;
}

function buildCompetencySignals(args: {
  employees: EmployeeRow[];
  standards: StandardRow[];
  evidence: SkillEvidenceRow[];
}) {
  const standardsByKey = new Map(args.standards.map((row) => [row.skill_key, row]));
  const evidenceByEmployee = new Map<string, Map<string, SkillEvidenceRow>>();

  for (const row of args.evidence) {
    const bucket = evidenceByEmployee.get(row.employee_id) ?? new Map<string, SkillEvidenceRow>();
    bucket.set(row.skill_name, row);
    evidenceByEmployee.set(row.employee_id, bucket);
  }

  const out = new Map<
    string,
    {
      competency_summary: Array<Record<string, unknown>>;
      evidence_freshness: "fresh" | "aging" | "stale" | "unknown";
    }
  >();

  for (const employee of args.employees) {
    const seen = new Set<string>(employee.skills ?? []);
    const evidenceMap = evidenceByEmployee.get(employee.id);
    if (evidenceMap) {
      for (const skill of evidenceMap.keys()) seen.add(skill);
    }

    const competencySummary = Array.from(seen)
      .map((skillKey) => {
        const standard = standardsByKey.get(skillKey);
        const evidence = evidenceMap?.get(skillKey);
        const actualLevel = evidence?.proficiency ?? ((employee.skills ?? []).includes(skillKey) ? 3 : 0);
        const recencyWindowDays = standard?.recency_window_days ?? 540;
        const freshnessDays = diffDays(evidence?.assessed_at);
        const evidenceFreshness = freshness(freshnessDays, recencyWindowDays);

        return {
          skill_key: skillKey,
          display_name: standard?.display_name ?? skillKey,
          framework_source: standard?.framework_source ?? "Derived",
          framework_id: evidence?.framework_id ?? standard?.framework_id ?? null,
          expected_level: standard?.expected_level ?? 3,
          actual_level: actualLevel,
          source: evidence?.source ?? ((employee.skills ?? []).includes(skillKey) ? "system" : null),
          assessed_at: evidence?.assessed_at ?? null,
          freshness_days: freshnessDays,
          freshness: evidenceFreshness,
          gap: Math.max((standard?.expected_level ?? 3) - actualLevel, 0),
          weight: standard?.weight ?? 1,
          linked_dimensions: standard?.linked_dimensions ?? [],
        };
      })
      .sort((left, right) =>
        String(left.display_name).localeCompare(String(right.display_name)),
      );

    out.set(employee.id, {
      competency_summary: competencySummary,
      evidence_freshness: aggregateFreshness(
        competencySummary.map((item) => String(item.freshness)),
      ) as "fresh" | "aging" | "stale" | "unknown",
    });
  }

  return out;
}

function buildProjectVariance(args: {
  projects: ProjectRow[];
  teams: TeamRow[];
  employees: EmployeeRow[];
  allocations: AllocationRow[];
  outcomes: OutcomeRow[];
}) {
  const salaryByEmployee = new Map(
    args.employees.map((employee) => [employee.id, Number(employee.salary_thb ?? 0)]),
  );
  const outcomeByProject = new Map(args.outcomes.map((row) => [row.project_id, row]));
  const teamByProject = new Map(args.teams.map((row) => [row.project_id, row]));
  const plannedByProject = new Map<string, AllocationRow[]>();
  const actualByProject = new Map<string, AllocationRow[]>();

  for (const allocation of args.allocations) {
    if (!allocation.project_id) continue;
    const target =
      allocation.planned_or_actual === "actual" ? actualByProject : plannedByProject;
    const list = target.get(allocation.project_id) ?? [];
    list.push(allocation);
    target.set(allocation.project_id, list);
  }

  return args.projects.map((project) => {
    const plannedRows = plannedByProject.get(project.id) ?? [];
    const actualRows = actualByProject.get(project.id) ?? [];
    const team = teamByProject.get(project.id);
    const outcome = outcomeByProject.get(project.id);

    let plannedFte = plannedRows.reduce((sum, row) => sum + Number(row.fte ?? 0), 0);
    let plannedCostThb = plannedRows.reduce(
      (sum, row) => sum + Number(row.fte ?? 0) * (salaryByEmployee.get(row.employee_id) ?? 0),
      0,
    );

    if (plannedRows.length === 0 && team) {
      const rosterIds = [
        ...(team.coach_id ? [team.coach_id] : []),
        ...((team.player_ids ?? []).filter(Boolean) as string[]),
      ];
      plannedFte = rosterIds.reduce((sum, id) => {
        const pct = Number(team.allocation_pcts?.[id] ?? 100);
        return sum + pct / 100;
      }, 0);
      plannedCostThb = rosterIds.reduce((sum, id) => {
        const pct = Number(team.allocation_pcts?.[id] ?? 100);
        return sum + (pct / 100) * (salaryByEmployee.get(id) ?? 0);
      }, 0);
    }

    const actualFte =
      actualRows.length > 0
        ? actualRows.reduce((sum, row) => sum + Number(row.fte ?? 0), 0)
        : outcome?.team_size ?? null;
    const actualCostThb =
      actualRows.length > 0
        ? actualRows.reduce(
            (sum, row) => sum + Number(row.fte ?? 0) * (salaryByEmployee.get(row.employee_id) ?? 0),
            0,
          )
        : outcome?.team_cost_cp != null
          ? Number(outcome.team_cost_cp) * 1000
          : null;

    const variancePct =
      plannedCostThb > 0 && actualCostThb != null
        ? Math.round(((actualCostThb - plannedCostThb) / plannedCostThb) * 100)
        : plannedFte > 0 && actualFte != null
          ? Math.round(((actualFte - plannedFte) / plannedFte) * 100)
          : null;

    const grossMargin = Number(project.gross_margin_pct ?? 100);
    const marginRisk =
      variancePct != null && (variancePct > 15 || grossMargin <= 12)
        ? "high"
        : variancePct != null && (variancePct > 5 || grossMargin <= 18)
          ? "watch"
          : grossMargin <= 15
            ? "watch"
            : "stable";

    return {
      project_id: project.id,
      project_code: project.code,
      project_name: project.name,
      planned_fte: Math.round(plannedFte * 100) / 100,
      actual_fte: actualFte == null ? null : Math.round(actualFte * 100) / 100,
      planned_cost_thb: Math.round(plannedCostThb),
      actual_cost_thb: actualCostThb == null ? null : Math.round(actualCostThb),
      variance_pct: variancePct,
      margin_risk: marginRisk as "stable" | "watch" | "high",
      source_label:
        actualRows.length > 0
          ? "Actual allocations"
          : outcome != null
            ? "Project outcomes"
            : "Planned only",
    };
  });
}

function buildEmployeeSentiment(rows: RawSentimentRow[]) {
  const buckets = new Map<string, SentimentSignal[]>();

  for (const row of rows) {
    if (!row.employee_id) continue;
    const signal = normalizeSentimentSignal(row.sentiment, row.text ?? "", {
      source: row.source,
      created_at: row.created_at ?? undefined,
    });
    const list = buckets.get(row.employee_id) ?? [];
    list.push(signal);
    buckets.set(row.employee_id, list);
  }

  const out = new Map<
    string,
    SentimentSignal & {
      employee_id: string;
      sample_count: number;
      source_mix: string[];
      rules: ReturnType<typeof sentimentRuleModifiers>;
    }
  >();

  for (const [employeeId, signals] of buckets.entries()) {
    const combined = combineSentimentSignals(signals, { source: "employee_pulse" });
    out.set(employeeId, {
      ...combined,
      employee_id: employeeId,
      sample_count: signals.length,
      source_mix: Array.from(new Set(signals.map((signal) => signal.source))).sort(),
      rules: sentimentRuleModifiers(combined),
    });
  }

  return out;
}

/**
 * GET /api/db/dashboard
 * Aggregated payload for command center initialization.
 * Returns employees, projects, teams, and workshop overlays in one request.
 */
export async function GET() {
  if (!isDbConfigured()) {
    return apiJson(
      { error: "Database not configured", live: false },
      { status: 503 },
    );
  }

  try {
    const [
      employees,
      projects,
      teams,
      divisions,
      departments,
      kpis,
      supportActions,
      rawCompetencyStandards,
      profileFacets,
      skillEvidence,
      allocations,
      outcomes,
      worldEvents,
      checkInSentiment,
      observationSentiment,
    ] = await Promise.all([
      safeQuery<EmployeeRow>(
        "api/db/dashboard employees unavailable",
        `
          SELECT
            e.id, e.employee_code, e.nickname, e.full_name_th, e.full_name_en,
            COALESCE(NULLIF(e.full_name_en, ''), NULLIF(e.nickname, ''), e.full_name_th) AS display_name,
            e.email, e.role_level, e.title_th, e.title_en, e.level, e.tenure_years,
            COALESCE(NULLIF(e.title_en, ''), NULLIF(e.title_th, ''), e.role_level) AS title,
            e.salary_thb, e.is_active, e.skills,
            d.code AS dept_code, d.name_en AS dept_name_en,
            div.code AS div_code, div.name_en AS div_name_en,
            ea.str AS attr_str, ea.int AS attr_int, ea.wis AS attr_wis,
            ea.cha AS attr_cha, ea.dex AS attr_dex, ea.con AS attr_con,
            ea.rpg_class,
            COALESCE(ea.stat_locked, false) AS stat_locked,
            ea.stat_lock_reason,
            ea.stat_source,
            ea.stat_criteria,
            e.xp, e.traits, e.perks,
            e.title_prefix, e.gender, e.gender_override,
            e.date_of_birth, e.education_level, e.education_school,
            e.education_faculty, e.education_major, e.section_th,
            e.resign_date, e.resign_status, e.joined_at
          FROM employees e
          LEFT JOIN departments d ON d.id = e.department_id
          LEFT JOIN divisions div ON div.id = e.division_id
          LEFT JOIN employee_attributes ea ON ea.employee_id = e.id
          ORDER BY
            CASE WHEN e.is_active THEN 0 ELSE 1 END,
            e.level DESC NULLS LAST,
            e.tenure_years DESC NULLS LAST
        `,
      ),
      safeQuery<ProjectRow>(
        "api/db/dashboard projects unavailable",
        `
          SELECT
            p.id, p.code, p.name, p.client_name, p.description, p.status, p.priority,
            p.budget_thb, p.monthly_ceiling, p.gross_margin_pct,
            p.required_skills, p.team_size, p.progress_pct,
            p.project_slots,
            p.priority_weights,
            p.complexity_score,
            p.urgency_score,
            p.strategic_value_score,
            p.delivery_risk_score,
            p.ai_leverage_score,
            COALESCE(p.config_locked, false) AS config_locked,
            p.config_lock_reason,
            p.config_source,
            p.config_criteria,
            div.code AS div_code, d.code AS dept_code
          FROM projects p
          LEFT JOIN divisions div ON div.id = p.division_id
          LEFT JOIN departments d ON d.id = p.department_id
          ORDER BY
            CASE p.priority WHEN 'critical' THEN 0 WHEN 'high' THEN 1 WHEN 'medium' THEN 2 ELSE 3 END
        `,
      ),
      safeQuery<TeamRow>(
        "api/db/dashboard teams unavailable",
        `
          -- Teams pivoted from project_allocations (the source of truth
          -- written by Formation save).
          -- One row per project that has at least one allocation.
          WITH team_rows AS (
            SELECT
              p.id::text AS id,
              p.id::text AS project_id,
              p.code AS project_code,
              array_agg(pa.employee_id::text ORDER BY pa.updated_at) AS player_ids,
              -- coach = highest-FTE allocation (ties broken by oldest)
              (array_agg(pa.employee_id::text
                         ORDER BY pa.fte DESC NULLS LAST, pa.created_at)
                 FILTER (WHERE pa.fte > 0))[1] AS coach_id,
              'boss_board_v2'::text AS formation,
              -- chemistry / overall: average of stored snapshots (skip nulls)
              ROUND(AVG(NULLIF(pa.chemistry, 0)))::int AS chemistry_score,
              ROUND(AVG(NULLIF(pa.overall_pct, 0)))::int AS overall_score,
              jsonb_object_agg(
                pa.employee_id::text,
                ROUND((pa.fte * 100)::numeric)
              ) AS allocation_pcts,
              'BOARD::ASSIGN:' || string_agg(
                pa.employee_id::text || '@' || pa.slot_dimension || '@' || pa.party_order,
                '|' ORDER BY pa.created_at
              ) AS formation_string
            FROM projects p
            JOIN project_allocations pa ON pa.project_id = p.id
            GROUP BY p.id, p.code
          )
          SELECT tr.id, tr.project_id, tr.project_code, tr.player_ids, tr.coach_id,
            tr.formation, tr.chemistry_score, tr.overall_score, tr.allocation_pcts,
            CASE
              WHEN tc.insights IS NOT NULL THEN (tc.insights || tr.formation_string)
              ELSE ARRAY[tr.formation_string]
            END AS insights,
            (SELECT employee_code FROM employees WHERE id::text = tr.coach_id) AS coach_code
          FROM team_rows tr
          LEFT JOIN team_compositions tc ON tc.project_id::text = tr.project_id
        `,
      ),
      safeQuery("api/db/dashboard divisions unavailable", `SELECT * FROM divisions ORDER BY sort_order`),
      safeQuery("api/db/dashboard departments unavailable", `SELECT * FROM departments ORDER BY sort_order`),
      safeQuery<KpiRow>(
        "api/db/dashboard kpis unavailable",
        `
          -- Pick whichever cycle has the most recent KPIs so the
          -- Cockpit stops going blank every time we roll to a new
          -- quarter. Falls back to the lexicographic max cycle, or
          -- nothing at all if the table is empty.
          WITH latest AS (
            SELECT cycle
            FROM department_kpis
            GROUP BY cycle
            ORDER BY MAX(COALESCE(updated_at, created_at, NOW())) DESC NULLS LAST
            LIMIT 1
          )
          SELECT dk.*
          FROM department_kpis dk
          JOIN latest l ON l.cycle = dk.cycle
          ORDER BY dk.dept_code, dk.weight_pct DESC NULLS LAST
        `,
      ),
      loadSupportActions(),
      loadCompetencyStandards(),
      loadProfileFacets(),
      loadLatestSkillEvidence(),
      loadAllocations(),
      loadOutcomes(),
      loadWorldEvents(),
      loadCheckInSentiment(),
      loadObservationSentiment(),
    ]);

    const competencyStandards =
      rawCompetencyStandards.length > 0
        ? rawCompetencyStandards
        : [...DEFAULT_COMPETENCY_STANDARDS];
    const availabilityByEmployee = buildAvailability(allocations);
    const competencyByEmployee = buildCompetencySignals({
      employees,
      standards: competencyStandards,
      evidence: skillEvidence,
    });
    const profileFacetsByEmployee = new Map(
      profileFacets.map((row) => [row.employee_id, row]),
    );
    const projectVariance = buildProjectVariance({
      projects,
      teams,
      employees,
      allocations,
      outcomes,
    });
    const varianceByProjectId = new Map(projectVariance.map((item) => [item.project_id, item]));
    const sentimentByEmployee = buildEmployeeSentiment([
      ...checkInSentiment,
      ...observationSentiment,
    ]);

    const mergedEmployees = employees.map((employee) => {
      const availability = availabilityByEmployee.get(employee.id);
      const competency = competencyByEmployee.get(employee.id);
      const facets = profileFacetsByEmployee.get(employee.id);
      const fallbackFacets = inferProfileFacets(employee);
      const activeProjectCodes = Array.from(
        new Set(
          (availability?.active_allocations ?? [])
            .map((allocation) => allocation.project_code)
            .filter((value): value is string => Boolean(value)),
        ),
      );
      return {
        ...employee,
        languages:
          facets?.languages && facets.languages.length > 0
            ? facets.languages
            : fallbackFacets.languages,
        certifications:
          facets?.certifications && facets.certifications.length > 0
            ? facets.certifications
            : fallbackFacets.certifications,
        soft_skills:
          facets?.soft_skills && facets.soft_skills.length > 0
            ? facets.soft_skills
            : fallbackFacets.soft_skills,
        competency_summary: competency?.competency_summary ?? [],
        active_allocations: availability?.active_allocations ?? [],
        active_project_count: activeProjectCodes.length,
        active_project_codes: activeProjectCodes,
        next_available_at: availability?.next_available_at ?? null,
        evidence_freshness: competency?.evidence_freshness ?? "unknown",
        availability_fte: availability?.current_fte ?? 0,
        sentiment: sentimentByEmployee.get(employee.id) ?? null,
      };
    });

    const mergedProjects = projects.map((project) => {
      const variance = varianceByProjectId.get(project.id);
      return {
        ...project,
        suggested_team_size: calculateSuggestedTeamSize(project),
        inferred_scale: inferProjectScale(project),
        planned_fte: variance?.planned_fte ?? 0,
        actual_fte: variance?.actual_fte ?? null,
        planned_cost_thb: variance?.planned_cost_thb ?? 0,
        actual_cost_thb: variance?.actual_cost_thb ?? null,
        variance_pct: variance?.variance_pct ?? null,
        margin_risk: variance?.margin_risk ?? null,
      };
    });

    const employeeAvailability = Array.from(availabilityByEmployee.values());
    const employeeProfileFacets = employees.map((employee) => {
      const facets = profileFacetsByEmployee.get(employee.id);
      const fallbackFacets = inferProfileFacets(employee);
      return {
        employee_id: employee.id,
        languages:
          facets?.languages && facets.languages.length > 0
            ? facets.languages
            : fallbackFacets.languages,
        certifications:
          facets?.certifications && facets.certifications.length > 0
            ? facets.certifications
            : fallbackFacets.certifications,
        soft_skills:
          facets?.soft_skills && facets.soft_skills.length > 0
            ? facets.soft_skills
            : fallbackFacets.soft_skills,
        external_refs: facets?.external_refs ?? {},
        updated_at: facets?.updated_at ?? null,
      };
    });

    const diagnostics: string[] = [];
    const hasCoreData =
      employees.length > 0 ||
      projects.length > 0 ||
      teams.length > 0 ||
      kpis.length > 0 ||
      supportActions.length > 0;

    if (!hasCoreData) {
      diagnostics.push(
        "Live command data is unavailable right now. The console is running in degraded mode until Neon responds again.",
      );
    }
    if (!sheetsEnabled()) {
      diagnostics.push(
        "Google Sheets mirror is not configured in this environment. DB writes still work, but sheet mirroring is offline.",
      );
    }
    if (rawCompetencyStandards.length === 0) {
      diagnostics.push(
        "Competency standards fell back to seeded workshop defaults because no live standards were returned.",
      );
    }

    const sheetsConfigured = sheetsEnabled();

    return apiJson({
      employees: mergedEmployees,
      projects: mergedProjects,
      teams,
      support_actions: supportActions,
      kpis: kpis.map((row) => ({
        id: row.id,
        code: row.dept_code,
        name: row.kpi_name_en,
        target_value: row.target_value,
        actual_value: row.actual_value,
        status: row.status,
        cycle: row.cycle,
      })),
      divisions,
      departments,
      competency_standards: competencyStandards,
      outcomes,
      world_events: worldEvents,
      sentiment: Array.from(sentimentByEmployee.values()),
      employee_availability: employeeAvailability,
      employee_profile_facets: employeeProfileFacets,
      project_variance: projectVariance,
      integration_status: [
        {
          key: "mango",
          label: "Mango PM History",
          status: sheetsConfigured ? "ready_for_import" : "planned",
          source: sheetsConfigured ? "Google Sheets + Apps Script" : "Google Sheets not configured",
          note: sheetsConfigured
            ? "Schema path is live; waiting for PMO export binding."
            : "Set GOOGLE_SHEETS_ID and GOOGLE_SERVICE_ACCOUNT_KEY to turn on the mirror.",
        },
        {
          key: "erp",
          label: "ERP Sync",
          status: "ready_for_import",
          source: "ERP employee / cost feeds",
          note: "External IDs can be attached without reshaping the model.",
        },
        {
          key: "thai_voice",
          label: "Thai Voice Capture",
          status: "planned",
          source: "Thai STT -> structured workshop notes",
          note: "Input lane is reserved; workshop UI can receive transcript-derived updates next.",
        },
      ],
      live: hasCoreData,
      diagnostics,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    logApiError("api/db/dashboard GET error", error);
    return apiJson(
      { error: "Dashboard fetch failed", live: false },
      { status: 500 },
    );
  }
}
