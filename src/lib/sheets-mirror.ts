/**
 * High-level Sheets mirror helpers.
 *
 * Thin wrappers over `sheets-sync.ts` primitives that know how to shape
 * a DB row into the exact column order each tab expects. Fire-and-forget
 * — every helper here swallows errors so a Sheets hiccup cannot break
 * a DB commit.
 *
 * Called from API routes after the DB write, typically via `void mirrorX(id)`.
 */

import { isDbConfigured, query } from "./db";
import { firstName } from "./redact-name";
import {
  calculateFilledPct,
  calculateSuggestedTeamSize,
  deriveProjectSlots,
} from "./project-planning";
import { normalizeSlots } from "./project-slots";
import { ARCHETYPE_LABEL, getArchetype, getTokenCost } from "./token-economy";
import { appendEvent, appendRows, readTab, replaceTab, upsertRow, type Row } from "./sheets-sync";
import { SKILLS, SKILL_BLURB, SKILL_LABEL, type Skill } from "./skills-vocab";

// ─── Players ─────────────────────────────────────────────────────────────

interface PlayerMirrorRow {
  id: string;
  nickname: string | null;
  full_name_en: string | null;
  full_name_th: string;
  role_level: string;
  dept_code: string | null;
  attr_str: number | null;
  attr_int: number | null;
  attr_wis: number | null;
  attr_cha: number | null;
  attr_dex: number | null;
  attr_con: number | null;
  stat_locked: boolean | null;
  stat_source: string | null;
  stat_lock_reason: string | null;
  active_projects: number;
  last_checkin: string | null;
  updated_at: string;
}

function levelForRole(role: string): number {
  if (role === "md" || role === "deputy_md") return 15;
  if (role === "director") return 12;
  if (role === "manager") return 8;
  if (role === "senior") return 4;
  return 1;
}

/**
 * Upsert one employee's current state into the Sheets `Players` tab.
 * Fire-and-forget: we swallow errors so callers never see Sheets failures.
 */
export async function mirrorPlayer(employeeId: string): Promise<void> {
  try {
    if (!isDbConfigured()) return;
    const rows = await query<PlayerMirrorRow>(
      `SELECT e.id, e.nickname, e.full_name_en, e.full_name_th, e.role_level,
              d.code AS dept_code,
              ea.str AS attr_str, ea.int AS attr_int, ea.wis AS attr_wis,
              ea.cha AS attr_cha, ea.dex AS attr_dex, ea.con AS attr_con,
              COALESCE(ea.stat_locked, false) AS stat_locked,
              ea.stat_source,
              ea.stat_lock_reason,
              COALESCE((
                SELECT COUNT(DISTINCT COALESCE(p.code, q.code, ea2.coe_name, ea2.assignment_label))
                FROM employee_allocations ea2
                LEFT JOIN projects p ON p.id = ea2.project_id
                LEFT JOIN quests q ON q.id = ea2.quest_id
                WHERE ea2.employee_id = e.id
                  AND ea2.status IN ('planned', 'active', 'paused')
                  AND (ea2.end_date IS NULL OR ea2.end_date >= CURRENT_DATE)
              ), 0)::int AS active_projects,
              (
                SELECT MAX(ci.created_at)::text
                FROM check_ins ci
                WHERE ci.employee_id = e.id
              ) AS last_checkin,
              GREATEST(e.updated_at, COALESCE(ea.updated_at, e.updated_at))::text AS updated_at
         FROM employees e
         LEFT JOIN departments d ON d.id = e.department_id
         LEFT JOIN employee_attributes ea ON ea.employee_id = e.id
        WHERE e.id = $1
        LIMIT 1`,
      [employeeId],
    );
    const r = rows[0];
    if (!r) return;

    const archetype = getArchetype(r);

    await upsertRow("Players", {
      id: r.id,
      // PDPA: Sheets shadow only sees the given name.
      name: firstName(r.nickname) || firstName(r.full_name_en) || firstName(r.full_name_th) || "—",
      dept: r.dept_code ?? "—",
      role: r.role_level,
      class: ARCHETYPE_LABEL[archetype],
      level: levelForRole(r.role_level),
      str: r.attr_str ?? 10,
      int: r.attr_int ?? 10,
      wis: r.attr_wis ?? 10,
      cha: r.attr_cha ?? 10,
      dex: r.attr_dex ?? 10,
      con: r.attr_con ?? 10,
      hp: 40 + (r.attr_con ?? 10) * 4,
      mp: 20 + (r.attr_int ?? 10) * 3,
      token_cost: getTokenCost(r),
      stat_locked: Boolean(r.stat_locked),
      stat_source: r.stat_source ?? "",
      stat_reason: r.stat_lock_reason ?? "",
      active_projects: r.active_projects,
      last_checkin: r.last_checkin ?? "",
      updated_at: r.updated_at,
    });
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error("[sheets-mirror] mirrorPlayer failed:", err);
  }
}

// ─── Projects ────────────────────────────────────────────────────────────

interface ProjectMirrorRow {
  id: string;
  code: string;
  name: string;
  client_name: string | null;
  status: string;
  priority: string;
  budget_thb: number | null;
  internal_budget_thb: number | null;
  monthly_ceiling: number | null;
  gross_margin_pct: number | null;
  required_skills: string[] | null;
  team_size: number | null;
  project_slots: Record<string, number> | null;
  progress_pct: number | null;
  start_date: string | null;
  end_date: string | null;
  overall_score: number | null;
  complexity_score: number | null;
  urgency_score: number | null;
  strategic_value_score: number | null;
  delivery_risk_score: number | null;
  ai_leverage_score: number | null;
  config_locked: boolean | null;
  config_source: string | null;
  config_lock_reason: string | null;
  filled_fte: number | null;
  updated_at: string;
}

export async function mirrorProject(projectCode: string): Promise<void> {
  try {
    if (!isDbConfigured()) return;
    const rows = await query<ProjectMirrorRow>(
      `SELECT
         p.id, p.code, p.name, p.client_name, p.status, p.priority,
         p.budget_thb, p.internal_budget_thb, p.monthly_ceiling, p.gross_margin_pct,
         p.required_skills, p.team_size, p.project_slots, p.progress_pct,
         p.start_date::text AS start_date, p.end_date::text AS end_date,
         p.complexity_score, p.urgency_score, p.strategic_value_score,
         p.delivery_risk_score, p.ai_leverage_score,
         COALESCE(p.config_locked, false) AS config_locked,
         p.config_source,
         p.config_lock_reason,
         tc.overall_score,
         (
           SELECT COALESCE(SUM(pa.fte), 0)::numeric
           FROM project_allocations pa
           WHERE pa.project_id = p.id
         ) AS filled_fte,
         p.updated_at::text AS updated_at
       FROM projects p
       LEFT JOIN team_compositions tc ON tc.project_id = p.id
       WHERE p.code = $1
       LIMIT 1`,
      [projectCode],
    );
    const project = rows[0];
    if (!project) return;

    const slots =
      Object.values(normalizeSlots(project.project_slots)).some((value) => value > 0)
        ? normalizeSlots(project.project_slots)
        : deriveProjectSlots(project);
    const teamSize = calculateSuggestedTeamSize(project);
    const filledPct = calculateFilledPct(
      slots,
      Number(project.filled_fte ?? 0),
      project.team_size ?? teamSize,
    );

    await upsertRow("Projects", {
      code: project.code,
      name: project.name,
      client: project.client_name ?? "",
      status: project.status,
      priority: project.priority,
      budget_thb: project.budget_thb ?? "",
      internal_budget_thb: project.internal_budget_thb ?? "",
      progress_pct: project.progress_pct ?? "",
      start_date: project.start_date ?? "",
      end_date: project.end_date ?? "",
      complexity_score: project.complexity_score ?? 50,
      urgency_score: project.urgency_score ?? 50,
      strategic_value_score: project.strategic_value_score ?? 50,
      delivery_risk_score: project.delivery_risk_score ?? 50,
      ai_leverage_score: project.ai_leverage_score ?? 50,
      config_locked: Boolean(project.config_locked),
      config_source: project.config_source ?? "",
      config_reason: project.config_lock_reason ?? "",
      slots_technical: slots.technical,
      slots_sales: slots.sales,
      slots_marketing: slots.marketing,
      slots_outsourcing: slots.outsourcing,
      slots_paperwork: slots.paperwork,
      filled_pct: filledPct,
      team_size: project.team_size ?? teamSize,
      league_points: project.overall_score ?? project.progress_pct ?? 0,
      updated_at: project.updated_at,
    });
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error("[sheets-mirror] mirrorProject failed:", err);
  }
}

// ─── AttrHistory ─────────────────────────────────────────────────────────

interface AttrHistoryInput {
  employee_id: string;
  employee_name: string;
  str: number;
  int: number;
  wis: number;
  cha: number;
  dex: number;
  con: number;
  level: number;
  class_label: string;
}

/**
 * Append one snapshot row to the `AttrHistory` tab. Fire-and-forget.
 * Caller is expected to have the latest attribute values already loaded.
 */
export async function appendAttrHistory(row: AttrHistoryInput): Promise<void> {
  try {
    await appendEvent("AttrHistory", {
      snapshot_at: new Date().toISOString(),
      employee_id: row.employee_id,
      employee_name: row.employee_name,
      str: row.str,
      int: row.int,
      wis: row.wis,
      cha: row.cha,
      dex: row.dex,
      con: row.con,
      level: row.level,
      class: row.class_label,
    });
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error("[sheets-mirror] appendAttrHistory failed:", err);
  }
}

export async function appendAttrHistoryRows(rows: AttrHistoryInput[]): Promise<void> {
  try {
    if (rows.length === 0) return;
    const snapshotAt = new Date().toISOString();
    await appendRows("AttrHistory", rows.map<Row>((row) => ({
      snapshot_at: snapshotAt,
      employee_id: row.employee_id,
      employee_name: row.employee_name,
      str: row.str,
      int: row.int,
      wis: row.wis,
      cha: row.cha,
      dex: row.dex,
      con: row.con,
      level: row.level,
      class: row.class_label,
    })));
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error("[sheets-mirror] appendAttrHistoryRows failed:", err);
  }
}

// ─── Game Adjustment Audit ───────────────────────────────────────────────

export interface GameAdjustmentMirrorInput {
  id?: string;
  created_at?: string;
  target_type: "employee" | "project";
  target_id: string;
  action: "seed" | "adjust" | "lock" | "unlock" | "ai_adjust";
  source: string;
  field: string;
  before_value: unknown;
  after_value: unknown;
  criteria_snapshot?: unknown;
  reason: string;
}

function jsonCell(value: unknown): string {
  if (value == null) return "";
  return typeof value === "string" ? value : JSON.stringify(value);
}

export async function appendGameAdjustments(rows: GameAdjustmentMirrorInput[]): Promise<void> {
  try {
    if (rows.length === 0) return;
    const createdAt = new Date().toISOString();
    const sheetRows = rows.map<Row>((row) => ({
      id: row.id ?? cryptoId(),
      created_at: row.created_at ?? createdAt,
      target_type: row.target_type,
      target_id: row.target_id,
      action: row.action,
      source: row.source,
      field: row.field,
      before_value: jsonCell(row.before_value),
      after_value: jsonCell(row.after_value),
      criteria_snapshot: jsonCell(row.criteria_snapshot ?? {}),
      reason: row.reason,
    }));
    await appendRows("GameAdjustments", sheetRows);
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error("[sheets-mirror] appendGameAdjustments failed:", err);
  }
}

export async function appendGameAdjustment(row: GameAdjustmentMirrorInput): Promise<void> {
  await appendGameAdjustments([row]);
}

// ─── Ninja Squads (Sheets-as-console) ────────────────────────────────────
//
// These three helpers are what turns the Ninja tab into a game the boss
// can read outside the dashboard. Every state change in the tab fires
// one of these; they all swallow errors so a Sheets hiccup never breaks
// the DB commit.

interface NinjaSquadMirrorRow {
  id: string;
  code: string;
  title: string;
  dept_code: string | null;
  status: string;
  role_slots: unknown;
  notes: string;
  member_count: number;
  created_at: string;
  updated_at: string;
}

/**
 * Upsert one row to the NinjaSquads tab after a quest POST / PATCH.
 *
 * Readiness_overall / readiness_gaps / chemistry are passed in rather
 * than recomputed server-side — the UI already knows them at save time,
 * and re-running squadReadiness() on the server would need us to ship
 * the client's skill vocabulary through an extra hop. Keep it simple.
 */
export async function mirrorNinjaSquad(
  questId: string,
  extras: {
    skills_required: Skill[];
    readiness_overall: number;
    readiness_gaps: Skill[];
    chemistry: number;
  },
): Promise<void> {
  try {
    if (!isDbConfigured()) return;
    const rows = await query<NinjaSquadMirrorRow>(
      `SELECT q.id, q.code, q.title, q.dept_code, q.status,
              q.role_slots, q.notes,
              (SELECT COUNT(*)::int FROM quest_members qm WHERE qm.quest_id = q.id) AS member_count,
              q.created_at::text AS created_at,
              q.updated_at::text AS updated_at
         FROM quests q
        WHERE q.id = $1
        LIMIT 1`,
      [questId],
    );
    const r = rows[0];
    if (!r) return;

    await upsertRow("NinjaSquads", {
      quest_id: r.id,
      code: r.code,
      title: r.title,
      dept: r.dept_code ?? "—",
      status: r.status,
      skills_required: extras.skills_required.join("|"),
      member_count: r.member_count,
      readiness_overall: extras.readiness_overall,
      readiness_gaps: extras.readiness_gaps.join("|"),
      chemistry: extras.chemistry,
      created_at: r.created_at,
      updated_at: r.updated_at,
    });
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error("[sheets-mirror] mirrorNinjaSquad failed:", err);
  }
}

/**
 * Append one squad event to the SquadEvents tab.
 *
 * The verb is a short string — see sheets-tabs.ts header comment for
 * the canonical list. Payload is stringified JSON so the boss can click
 * into a row in Sheets and read what actually happened.
 */
export async function mirrorSquadEvent(
  verb: string,
  options: {
    quest_id?: string | null;
    actor_id?: string | null;
    payload?: Record<string, unknown>;
  } = {},
): Promise<void> {
  try {
    await appendEvent("SquadEvents", {
      id: cryptoId(),
      created_at: new Date().toISOString(),
      verb,
      actor_id: options.actor_id ?? "",
      quest_id: options.quest_id ?? "",
      payload: JSON.stringify(options.payload ?? {}),
    });
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error("[sheets-mirror] mirrorSquadEvent failed:", err);
  }
}

interface SkillCountRow {
  skill: string;
  employee_count: number;
  dept_codes: string;
}

/**
 * Rewrite the SkillCatalog tab from scratch. Call this from the Ninja
 * bootstrap path or on a cron — not in a hot loop.
 */
export async function mirrorSkillCatalog(): Promise<void> {
  try {
    if (!isDbConfigured()) return;

    // Per-skill head-count + the dept codes where that skill is most
    // common. Uses unnest() on the TEXT[] skills column.
    const rows = await query<SkillCountRow>(
      `WITH skill_rows AS (
         SELECT DISTINCT unnest(e.skills) AS skill, d.code AS dept_code, e.id
           FROM employees e
           LEFT JOIN departments d ON d.id = e.department_id
          WHERE e.is_active = true
       )
       SELECT skill,
              COUNT(DISTINCT id)::int AS employee_count,
              string_agg(DISTINCT dept_code, '|') AS dept_codes
         FROM skill_rows
        GROUP BY skill`,
    );
    const byKey = new Map(rows.map((r) => [r.skill, r]));

    const catalog = SKILLS.map((key) => {
      const match = byKey.get(key);
      return {
        skill_key: key,
        label: SKILL_LABEL[key],
        blurb: SKILL_BLURB[key],
        employee_count: match?.employee_count ?? 0,
        dept_codes: match?.dept_codes ?? "",
      };
    });

    await replaceTab("SkillCatalog", catalog);
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error("[sheets-mirror] mirrorSkillCatalog failed:", err);
  }
}

/**
 * Mirror a matrix scenario save to Sheets MatrixScenarios tab.
 * Called after a scenario is saved via POST /api/matrix/scenarios.
 * Fire-and-forget: appendEvent handles its own errors silently.
 */
export async function mirrorMatrixScenario(scenarioData: {
  scenario_id: string;
  name: string;
  cycle: string;
  functions: string[];
  coes: string[];
  overall_readiness_pct: number;
  total_over_allocations: number;
}): Promise<void> {
  await appendEvent("MatrixScenarios", {
    scenario_id: scenarioData.scenario_id,
    name: scenarioData.name,
    cycle: scenarioData.cycle,
    functions: scenarioData.functions.join(" | "),
    coes: scenarioData.coes.join(" | "),
    overall_readiness_pct: scenarioData.overall_readiness_pct,
    total_over_allocations: scenarioData.total_over_allocations,
    created_at: new Date().toISOString(),
  });
}

/**
 * Stub: log a skill attribute change to SquadEvents.
 * Full SkillChangelog dedicated tab comes in Phase 4 when Sheets is wired up.
 * Fire-and-forget — never throws.
 */
export async function mirrorSkillUpdate(
  employeeId: string,
  skills: string[],
  proficiency: Record<string, number>,
): Promise<void> {
  void mirrorSquadEvent("skill.update", {
    actor_id: null,
    payload: { employee_id: employeeId, skills, proficiency },
  });
}

// ─── Formation (project staffing) ───────────────────────────────────────

export interface FormationMirrorPayload {
  project_code: string;
  project_name: string;
  required_slots: Record<string, number>;
  filled_slots: Record<string, number>;
  assigned: Array<{ employee_id: string; slot_dimension: string; party_order?: 1 | 2 | 3 }>;
  /** DQ3 party counts. Added in v3.3 Front Row. */
  front_count?: number;
  mid_count?: number;
  back_count?: number;
  coverage_pct: number;
  quality_pct: number;
  chemistry: number;
  morale: number;
  overall_readiness_pct: number;
}

/**
 * Upsert one project's current formation state into the Formation tab.
 * Fire-and-forget: callers should not await.
 */
export async function mirrorFormation(data: FormationMirrorPayload): Promise<void> {
  await upsertRow("Formation", {
    project_code: data.project_code,
    project_name: data.project_name,
    required_slots: JSON.stringify(data.required_slots),
    filled_slots: JSON.stringify(data.filled_slots),
    assigned_employees: data.assigned
      .map((a) => `${a.employee_id}@${a.slot_dimension}@${a.party_order ?? 2}`)
      .join(" | "),
    front_count: data.front_count ?? 0,
    mid_count: data.mid_count ?? 0,
    back_count: data.back_count ?? 0,
    coverage_pct: data.coverage_pct,
    quality_pct: data.quality_pct,
    chemistry: data.chemistry,
    morale: data.morale,
    overall_readiness_pct: data.overall_readiness_pct,
    last_saved_at: new Date().toISOString(),
  });
}

/**
 * Append a Formation ledger event. Verbs: assign, unassign, needs.update, save.
 * Fire-and-forget.
 */
export async function mirrorFormationEvent(
  verb: "assign" | "unassign" | "needs.update" | "save",
  payload: {
    actor_id?: string | null;
    project_code: string;
    employee_id?: string | null;
    slot_dimension?: string | null;
    extra?: Record<string, unknown>;
  },
): Promise<void> {
  await appendEvent("FormationEvents", {
    id: cryptoId(),
    created_at: new Date().toISOString(),
    verb,
    actor_id: payload.actor_id ?? "",
    project_code: payload.project_code,
    employee_id: payload.employee_id ?? "",
    slot_dimension: payload.slot_dimension ?? "",
    payload: JSON.stringify(payload.extra ?? {}),
  });
}

interface TeamAssignmentMirrorRow {
  [key: string]: string | number | null;
  key: string;
  project_code: string;
  project_name: string;
  player_id: string;
  player_name: string;
  player_class: string;
  slot_dimension: string;
  allocation_pct: number;
  fit_score: number | null;
  assigned_at: string;
}

/**
 * Rewrite the `Teams` tab from current project allocations.
 * Called after a formation save so the shadow ledger always matches the
 * latest board state, including removals.
 */
export async function mirrorTeamAssignments(): Promise<void> {
  try {
    if (!isDbConfigured()) return;
    const rows = await query<{
      project_code: string;
      project_name: string;
      employee_id: string;
      player_name: string;
      role_level: string;
      attr_str: number | null;
      attr_int: number | null;
      attr_wis: number | null;
      attr_cha: number | null;
      attr_dex: number | null;
      attr_con: number | null;
      slot_dimension: string;
      fte: number;
      fit_score: number | null;
      assigned_at: string;
    }>(
      `SELECT
         p.code AS project_code,
         p.name AS project_name,
         e.id AS employee_id,
         COALESCE(NULLIF(e.nickname, ''), NULLIF(e.full_name_en, ''), e.full_name_th) AS player_name,
         e.role_level,
         ea.str AS attr_str,
         ea.int AS attr_int,
         ea.wis AS attr_wis,
         ea.cha AS attr_cha,
         ea.dex AS attr_dex,
         ea.con AS attr_con,
         pa.slot_dimension,
         pa.fte,
         pa.overall_pct AS fit_score,
         pa.updated_at::text AS assigned_at
       FROM project_allocations pa
       JOIN projects p ON p.id = pa.project_id
       JOIN employees e ON e.id = pa.employee_id
       LEFT JOIN employee_attributes ea ON ea.employee_id = e.id
       ORDER BY p.code, pa.updated_at DESC`,
    );

    const sheetRows: TeamAssignmentMirrorRow[] = rows.map((row) => {
      const archetype = getArchetype({
        role_level: row.role_level,
        attr_str: row.attr_str,
        attr_int: row.attr_int,
        attr_wis: row.attr_wis,
        attr_cha: row.attr_cha,
        attr_dex: row.attr_dex,
        attr_con: row.attr_con,
      });

      return {
        key: `${row.project_code}:${row.employee_id}:${row.slot_dimension}`,
        project_code: row.project_code,
        project_name: row.project_name,
        player_id: row.employee_id,
        // PDPA: Teams sheet records given name only.
        player_name: firstName(row.player_name),
        player_class: ARCHETYPE_LABEL[archetype],
        slot_dimension: row.slot_dimension,
        allocation_pct: Math.round(Number(row.fte ?? 0) * 100),
        fit_score: row.fit_score,
        assigned_at: row.assigned_at,
      };
    });

    await replaceTab("Teams", sheetRows);
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error("[sheets-mirror] mirrorTeamAssignments failed:", err);
  }
}

// ─── Resources register ──────────────────────────────────────────────────

export interface ResourceMirrorPayload {
  code: string;
  label: string;
  category: string;
  capacity: number | null;
  unit: string | null;
  status: string;
  notes: string | null;
}

/**
 * Upsert one resource (datacentre / compute / licence / wishlist item)
 * into the Resources tab. Fire-and-forget.
 */
export async function mirrorResource(data: ResourceMirrorPayload): Promise<void> {
  await upsertRow("Resources", {
    code: data.code,
    label: data.label,
    category: data.category,
    capacity: data.capacity ?? "",
    unit: data.unit ?? "",
    status: data.status,
    notes: data.notes ?? "",
    updated_at: new Date().toISOString(),
  });
}

// ─── Alltrades Abbey — vocation changes (v3.2) ───────────────────────────

export interface VocationChangeMirrorPayload {
  id: string;
  changed_at: string;
  employee_id: string;
  employee_name: string;
  from_archetype: string;
  from_label: string;
  to_archetype: string;
  to_label: string;
  level_before: number | null;
  actor_id: string | null;
  reason: string | null;
  note: string | null;
}

/**
 * Append one reskilling event to the VocationChanges tab.
 * Fire-and-forget: Sheets hiccups never break the DB write.
 */
export async function mirrorVocationChange(
  data: VocationChangeMirrorPayload,
): Promise<void> {
  try {
    await appendEvent("VocationChanges", {
      id: data.id,
      changed_at: data.changed_at,
      employee_id: data.employee_id,
      employee_name: data.employee_name,
      from_archetype: data.from_archetype,
      from_label: data.from_label,
      to_archetype: data.to_archetype,
      to_label: data.to_label,
      level_before: data.level_before ?? "",
      actor_id: data.actor_id ?? "",
      reason: data.reason ?? "",
      note: data.note ?? "",
    });
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error("[sheets-mirror] mirrorVocationChange failed:", err);
  }
}

// ─── Lobby / attendance (v8.1 library layer — endpoints land v8.2) ──────
//
// Three append-only ledgers feeding the Lobby screen once Dr Non wires
// `/api/lobby/punch`, `/api/lobby/interaction`, `/api/memos` in v8.2.
// Shipping the mirror functions now means the pipe is complete at the
// library level — when the endpoints land, they just call these.

export interface AttendanceMirrorPayload {
  employee_code: string;
  employee_name: string;
  action: "in" | "out";
  source: string;
  ts?: string;
}

/**
 * Append one lobby punch to the `Attendance` tab. Fire-and-forget.
 */
export async function mirrorAttendance(
  data: AttendanceMirrorPayload,
): Promise<void> {
  try {
    await appendEvent("Attendance", {
      ts: data.ts ?? new Date().toISOString(),
      employee_code: data.employee_code,
      employee_name: data.employee_name,
      action: data.action,
      source: data.source,
    });
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error("[sheets-mirror] mirrorAttendance failed:", err);
  }
}

export interface InteractionMirrorPayload {
  a_code: string;
  b_code: string;
  duration_s: number;
  dept_a: string;
  dept_b: string;
  same_gender: boolean;
  ts?: string;
}

/**
 * Append one lobby chat/interaction event to the `Interactions` tab.
 * Fire-and-forget. Expected to be debounced at the endpoint layer.
 */
export async function mirrorInteraction(
  data: InteractionMirrorPayload,
): Promise<void> {
  try {
    await appendEvent("Interactions", {
      ts: data.ts ?? new Date().toISOString(),
      a_code: data.a_code,
      b_code: data.b_code,
      duration_s: data.duration_s,
      dept_a: data.dept_a,
      dept_b: data.dept_b,
      same_gender: data.same_gender ? "1" : "0",
    });
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error("[sheets-mirror] mirrorInteraction failed:", err);
  }
}

export interface MemoMirrorPayload {
  author_code: string;
  subject: string;
  body_markdown: string;
  related_entities: string[];
  source: "manual" | "auto";
  ts?: string;
}

/**
 * Append one memo to the `Memos` tab. Fire-and-forget.
 * `related_entities` is pipe-joined in the row so HR can sort / filter.
 */
export async function mirrorMemo(data: MemoMirrorPayload): Promise<void> {
  try {
    await appendEvent("Memos", {
      ts: data.ts ?? new Date().toISOString(),
      author_code: data.author_code,
      subject: data.subject,
      body_markdown: data.body_markdown,
      related_entities: data.related_entities.join("|"),
      source: data.source,
    });
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error("[sheets-mirror] mirrorMemo failed:", err);
  }
}

// ─── Restore (Sheets → DB) ───────────────────────────────────────────────
//
// Reverse direction of the mirror. Reads an authoritative-state tab from
// Google Sheets and UPSERTs the rows back into Postgres. Used when the DB
// has been wiped or seeded fresh and the operator wants to rehydrate from
// the Sheets ledger.
//
// Scope this turn: Players / Projects / Resources — the three tabs whose
// schema round-trips cleanly. Computed columns (hp, mp, token_cost,
// league_points, filled_pct) are IGNORED on restore — they recompute on
// next mirror. Lossy columns (financials, dates, tags) get DB defaults.
//
// Formation / NinjaSquads / Teams restore land in v8.3 once the score-
// recompute helpers (chemistry / morale / readiness / fit) are exported
// standalone.
//
// Every helper UPSERTS — never DELETES. Safe to re-run; safe to interrupt.

export interface RestoreResult {
  ok: boolean;
  scanned: number;
  inserted: number;
  updated: number;
  skipped: number;
  errors: string[];
}

function emptyResult(): RestoreResult {
  return { ok: true, scanned: 0, inserted: 0, updated: 0, skipped: 0, errors: [] };
}

/**
 * Restore Players tab → employees + employee_attributes.
 *
 * Sheets row carries current display state plus raw STR/INT/WIS/CHA/DEX/CON
 * and the stat lock/source columns.
 *
 * DB writes: UPSERT employees(id, full_name_th, nickname, role_level,
 *   department_id) + UPSERT employee_attributes(employee_id, stats, lock).
 *
 * Lossy: hp, mp, token_cost, active_projects, last_checkin (recomputed on
 * next mirrorPlayer). Missing in Sheets: full_name_en, email, salary_thb,
 * tenure_years — kept untouched on UPDATE; defaulted on INSERT (Manager
 * re-fills via Roster drawer post-restore).
 */
export async function restorePlayersFromSheet(): Promise<RestoreResult> {
  const result = emptyResult();
  if (!isDbConfigured()) {
    result.ok = false;
    result.errors.push("Database not configured");
    return result;
  }

  const rows = await readTab("Players");
  result.scanned = rows.length;
  if (rows.length === 0) {
    result.errors.push("Players tab is empty or unreadable");
    result.ok = false;
    return result;
  }

  for (const r of rows) {
    const id = r.id?.trim();
    const name = r.name?.trim() || "(unknown)";
    const dept = r.dept?.trim();
    const role = r.role?.trim() || "staff";
    const attr = (key: string): number => {
      const n = Number.parseInt(r[key] ?? "", 10);
      return Number.isFinite(n) ? Math.max(1, Math.min(20, n)) : 10;
    };
    const locked = ["true", "1", "yes", "locked"].includes((r.stat_locked ?? "").toLowerCase());

    if (!id) {
      result.skipped++;
      continue;
    }

    try {
      // Look up department by code (Sheets stores dept code, DB stores id)
      const deptRows = dept && dept !== "—"
        ? await query<{ id: string }>(`SELECT id FROM departments WHERE code = $1 LIMIT 1`, [dept])
        : [];
      const departmentId = deptRows[0]?.id ?? null;

      // UPSERT employees — preserve any existing values for fields not in Sheets.
      const empResult = await query<{ id: string; xmax: string }>(
        `INSERT INTO employees (id, full_name_th, nickname, role_level, department_id, is_active)
         VALUES ($1, $2, $2, $3, $4, true)
         ON CONFLICT (id) DO UPDATE SET
           nickname      = COALESCE(EXCLUDED.nickname, employees.nickname),
           role_level    = EXCLUDED.role_level,
           department_id = COALESCE(EXCLUDED.department_id, employees.department_id),
           updated_at    = now()
         RETURNING id, xmax::text AS xmax`,
        [id, name, role, departmentId],
      );
      // xmax='0' on INSERT, non-zero on UPDATE
      const wasInsert = empResult[0]?.xmax === "0";
      if (wasInsert) result.inserted++;
      else result.updated++;

      // Raw attributes and lock state now round-trip; HP/MP/token cost remain derived.
      await query(
        `INSERT INTO employee_attributes (
           employee_id, str, int, wis, cha, dex, con,
           stat_locked, stat_lock_reason, stat_source, updated_at
         )
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, NULLIF($10, ''), now())
         ON CONFLICT (employee_id) DO UPDATE SET
           str = EXCLUDED.str,
           int = EXCLUDED.int,
           wis = EXCLUDED.wis,
           cha = EXCLUDED.cha,
           dex = EXCLUDED.dex,
           con = EXCLUDED.con,
           stat_locked = EXCLUDED.stat_locked,
           stat_lock_reason = EXCLUDED.stat_lock_reason,
           stat_source = COALESCE(EXCLUDED.stat_source, employee_attributes.stat_source),
           updated_at = now()`,
        [
          id,
          attr("str"),
          attr("int"),
          attr("wis"),
          attr("cha"),
          attr("dex"),
          attr("con"),
          locked,
          locked ? r.stat_reason?.trim() || "Restored locked state from Sheets" : null,
          r.stat_source?.trim() ?? "",
        ],
      );
    } catch (err) {
      result.errors.push(`${id}: ${err instanceof Error ? err.message : String(err)}`);
      result.ok = false;
    }
  }

  return result;
}

/**
 * Restore Projects tab → projects.
 *
 * Sheets row carries current project state, game scores, lock/source columns,
 * and the slot BOM.
 *
 * DB writes: UPSERT projects(code, name, client_name, status, priority,
 *   budget_thb, internal_budget_thb, progress_pct, dates,
 *   game scores, lock/source, project_slots, team_size).
 *
 * Lossy: filled_pct (recomputed). Missing: description,
 * monthly_ceiling, gross_margin_pct, required_skills,
 * division/dept association — kept untouched on
 * UPDATE; defaulted on INSERT.
 */
export async function restoreProjectsFromSheet(): Promise<RestoreResult> {
  const result = emptyResult();
  if (!isDbConfigured()) {
    result.ok = false;
    result.errors.push("Database not configured");
    return result;
  }

  const rows = await readTab("Projects");
  result.scanned = rows.length;
  if (rows.length === 0) {
    result.errors.push("Projects tab is empty or unreadable");
    result.ok = false;
    return result;
  }

  const intOrZero = (v: string | undefined): number => {
    const n = Number.parseInt(v ?? "", 10);
    return Number.isFinite(n) ? n : 0;
  };
  const scoreOr = (v: string | undefined, fallback: number): number => {
    const n = Number.parseInt(v ?? "", 10);
    return Number.isFinite(n) ? Math.max(0, Math.min(100, n)) : fallback;
  };

  for (const r of rows) {
    const code = r.code?.trim();
    const name = r.name?.trim();
    if (!code || !name) {
      result.skipped++;
      continue;
    }

    try {
      const slots = {
        technical: intOrZero(r.slots_technical),
        sales: intOrZero(r.slots_sales),
        marketing: intOrZero(r.slots_marketing),
        outsourcing: intOrZero(r.slots_outsourcing),
        paperwork: intOrZero(r.slots_paperwork),
      };

      const status = ["planning", "active", "completed", "on_hold"].includes(r.status ?? "")
        ? r.status
        : "active";
      const priority = ["low", "medium", "high", "critical"].includes(r.priority ?? "")
        ? r.priority
        : "medium";
      const teamSize = intOrZero(r.team_size) || 5;
      const locked = ["true", "1", "yes", "locked"].includes((r.config_locked ?? "").toLowerCase());

      const out = await query<{ xmax: string }>(
        `INSERT INTO projects (
           code, name, client_name, status, priority,
           budget_thb, internal_budget_thb, progress_pct,
           start_date, end_date,
           complexity_score, urgency_score, strategic_value_score,
           delivery_risk_score, ai_leverage_score,
           overall_score,
           config_locked, config_lock_reason, config_source,
           project_slots, team_size
         )
         VALUES (
           $1, $2, $3, $4, $5,
           $6, $7, $8,
           $9, $10,
           $11, $12, $13, $14, $15,
           $16, $17, $18, NULLIF($19, ''),
           $20::jsonb, $21
         )
         ON CONFLICT (code) DO UPDATE SET
           name          = EXCLUDED.name,
           client_name   = COALESCE(EXCLUDED.client_name, projects.client_name),
           status        = EXCLUDED.status,
           priority      = EXCLUDED.priority,
           budget_thb    = EXCLUDED.budget_thb,
           internal_budget_thb = EXCLUDED.internal_budget_thb,
           progress_pct  = EXCLUDED.progress_pct,
           start_date    = EXCLUDED.start_date,
           end_date      = EXCLUDED.end_date,
           complexity_score = EXCLUDED.complexity_score,
           urgency_score = EXCLUDED.urgency_score,
           strategic_value_score = EXCLUDED.strategic_value_score,
           delivery_risk_score = EXCLUDED.delivery_risk_score,
           ai_leverage_score = EXCLUDED.ai_leverage_score,
           overall_score = EXCLUDED.overall_score,
           config_locked = EXCLUDED.config_locked,
           config_lock_reason = EXCLUDED.config_lock_reason,
           config_source = COALESCE(EXCLUDED.config_source, projects.config_source),
           project_slots = EXCLUDED.project_slots,
           team_size     = EXCLUDED.team_size,
           updated_at    = now()
         RETURNING xmax::text AS xmax`,
        [
          code,
          name,
          r.client?.trim() || null,
          status,
          priority,
          intOrZero(r.budget_thb),
          intOrZero(r.internal_budget_thb),
          intOrZero(r.progress_pct),
          r.start_date?.trim() || null,
          r.end_date?.trim() || null,
          scoreOr(r.complexity_score, 50),
          scoreOr(r.urgency_score, 50),
          scoreOr(r.strategic_value_score, 50),
          scoreOr(r.delivery_risk_score, 50),
          scoreOr(r.ai_leverage_score, 50),
          intOrZero(r.league_points),
          locked,
          locked ? r.config_reason?.trim() || "Restored locked state from Sheets" : null,
          r.config_source?.trim() ?? "",
          JSON.stringify(slots),
          teamSize,
        ],
      );
      if (out[0]?.xmax === "0") result.inserted++;
      else result.updated++;
    } catch (err) {
      result.errors.push(`${code}: ${err instanceof Error ? err.message : String(err)}`);
      result.ok = false;
    }
  }

  return result;
}

/**
 * Restore Resources tab → resources.
 *
 * Sheets row (8 cols): code, label, category, capacity, unit, status,
 *   notes, updated_at. Direct 1:1 mapping (resources is a thin table).
 */
export async function restoreResourcesFromSheet(): Promise<RestoreResult> {
  const result = emptyResult();
  if (!isDbConfigured()) {
    result.ok = false;
    result.errors.push("Database not configured");
    return result;
  }

  const rows = await readTab("Resources");
  result.scanned = rows.length;
  if (rows.length === 0) {
    result.errors.push("Resources tab is empty or unreadable");
    result.ok = false;
    return result;
  }

  const validCategories = new Set(["datacentre", "compute", "license", "headcount", "wishlist"]);
  const validStatuses = new Set(["owned", "wishlist", "co-location"]);

  for (const r of rows) {
    const code = r.code?.trim();
    const label = r.label?.trim();
    if (!code || !label) {
      result.skipped++;
      continue;
    }

    try {
      const category = validCategories.has(r.category ?? "") ? r.category : "wishlist";
      const status = validStatuses.has(r.status ?? "") ? r.status : "wishlist";
      const capacityNum = Number.parseFloat(r.capacity ?? "");
      const capacity = Number.isFinite(capacityNum) ? capacityNum : null;

      const out = await query<{ xmax: string }>(
        `INSERT INTO resources (code, label, category, capacity, unit, status, notes)
         VALUES ($1, $2, $3, $4, $5, $6, $7)
         ON CONFLICT (code) DO UPDATE SET
           label      = EXCLUDED.label,
           category   = EXCLUDED.category,
           capacity   = EXCLUDED.capacity,
           unit       = EXCLUDED.unit,
           status     = EXCLUDED.status,
           notes      = EXCLUDED.notes,
           updated_at = now()
         RETURNING xmax::text AS xmax`,
        [code, label, category, capacity, r.unit?.trim() || null, status, r.notes?.trim() || null],
      );
      if (out[0]?.xmax === "0") result.inserted++;
      else result.updated++;
    } catch (err) {
      result.errors.push(`${code}: ${err instanceof Error ? err.message : String(err)}`);
      result.ok = false;
    }
  }

  return result;
}

/**
 * Small helper — crypto.randomUUID in Node 20+ and in the browser.
 * Falls back to a Date-based token if somehow unavailable.
 */
function cryptoId(): string {
  try {
    // Node 20+ and Edge runtime both have global crypto.
    if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
      return crypto.randomUUID();
    }
  } catch {
    // fall through
  }
  return `ev-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
}

// ─── v4.7 · Talent Assessment (Ninja Team / Talent Management Program) ──
//
// Mirrors one nominee per cycle into the `TalentAssessment` Sheet tab.
// Upsert-keyed on (employee_id, cycle) — see sheets-tabs.ts. Fire-and-
// forget per §6 of CLAUDE.md.

export interface TalentAssessmentMirrorPayload {
  employee_id: string;
  cycle: string;
  employee_code: string | null;
  employee_name: string | null;
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
  in_talent_pool: boolean;
  referrence: string | null;
  remark: string | null;
  assessment_date: string;
}

export async function mirrorTalentAssessment(
  data: TalentAssessmentMirrorPayload,
): Promise<void> {
  try {
    // Composite key: employee_id|cycle. Sheets-sync's upsertRow keys on
    // the first header, so we pre-compose it.
    const composite = `${data.employee_id}|${data.cycle}`;
    await upsertRow("TalentAssessment", {
      employee_id: composite,
      cycle: data.cycle,
      employee_code: data.employee_code ?? "",
      employee_name: data.employee_name ?? "",
      department: data.department ?? "",
      position: data.position ?? "",
      job_grade: data.job_grade ?? "",
      grade_prev: data.grade_prev ?? "",
      grade_curr: data.grade_curr ?? "",
      performance_score: data.performance_score ?? "",
      potential_score: data.potential_score ?? "",
      avg_score: data.avg_score ?? "",
      performance_band: data.performance_band ?? "",
      potential_band: data.potential_band ?? "",
      box_id: data.box_id ?? "",
      box_label: data.box_label ?? "",
      in_talent_pool: data.in_talent_pool ? "Y" : "N",
      referrence: data.referrence ?? "",
      remark: data.remark ?? "",
      assessment_date: data.assessment_date,
      imported_at: new Date().toISOString(),
    });
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error("[sheets-mirror] mirrorTalentAssessment failed:", err);
  }
}
