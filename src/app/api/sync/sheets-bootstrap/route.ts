/**
 * POST /api/sync/sheets-bootstrap
 *
 * Idempotent: create any missing tabs in the Google Sheets ledger, write
 * header rows, freeze row 1. Safe to re-run after schema changes or a
 * blank spreadsheet.
 *
 * Also re-hydrates the `Players` and `Projects` tabs from the current DB
 * state so the ledger isn't empty on first run.
 *
 * Returns JSON describing what was created vs already existed. 200 on
 * success, 500 on Sheets failure, 503 if env vars missing.
 */

import { apiError, apiJson, logApiError } from "@/lib/api";
import { isDbConfigured, query } from "@/lib/db";
import { getArchetype, getTokenCost, ARCHETYPE_LABEL } from "@/lib/token-economy";
import {
  bootstrapTabs,
  replaceTab,
  sheetsEnabled,
  type Row,
} from "@/lib/sheets-sync";

interface PlayerRow {
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

interface ProjectRow {
  code: string;
  name: string;
  client_name: string | null;
  status: string;
  priority: string;
  budget_thb: number | null;
  internal_budget_thb: number | null;
  progress_pct: number | null;
  start_date: string | null;
  end_date: string | null;
  complexity_score: number | null;
  urgency_score: number | null;
  strategic_value_score: number | null;
  delivery_risk_score: number | null;
  ai_leverage_score: number | null;
  config_locked: boolean | null;
  config_source: string | null;
  config_lock_reason: string | null;
  project_slots: {
    technical?: number;
    sales?: number;
    marketing?: number;
    outsourcing?: number;
    paperwork?: number;
  } | null;
  team_size: number;
  updated_at: string;
}

interface GameAdjustmentRow {
  id: string;
  created_at: string;
  target_type: string;
  target_id: string;
  action: string;
  source: string;
  field: string;
  before_value: unknown;
  after_value: unknown;
  criteria_snapshot: unknown;
  reason: string;
}

// ─── Helpers ──────────────────────────────────────────────────────────────

function levelForRole(role: string): number {
  switch (role) {
    case "md":
    case "deputy_md": return 15;
    case "director":  return 12;
    case "manager":   return 8;
    case "senior":    return 4;
    case "staff":
    default:          return 1;
  }
}

function hpFor(con: number | null): number {
  const c = con ?? 10;
  return 40 + c * 4;
}
function mpFor(int: number | null): number {
  const i = int ?? 10;
  return 20 + i * 3;
}

async function hydratePlayers(): Promise<Row[]> {
  if (!isDbConfigured()) return [];
  const rows = await query<PlayerRow>(`
    SELECT e.id, e.nickname, e.full_name_en, e.full_name_th,
           e.role_level, d.code AS dept_code,
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
    WHERE e.is_active = true
    ORDER BY e.level DESC, e.tenure_years DESC
  `);

  return rows.map<Row>((r) => {
    const archetype = getArchetype({
      role_level: r.role_level,
      dept_code: r.dept_code,
      attr_str: r.attr_str,
      attr_int: r.attr_int,
      attr_wis: r.attr_wis,
      attr_cha: r.attr_cha,
      attr_dex: r.attr_dex,
      attr_con: r.attr_con,
    });
    return {
      id: r.id,
      name: r.nickname || r.full_name_en || r.full_name_th || "—",
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
      hp: hpFor(r.attr_con),
      mp: mpFor(r.attr_int),
      token_cost: getTokenCost({
        role_level: r.role_level,
        dept_code: r.dept_code,
        attr_str: r.attr_str,
        attr_int: r.attr_int,
        attr_wis: r.attr_wis,
        attr_cha: r.attr_cha,
        attr_dex: r.attr_dex,
        attr_con: r.attr_con,
      }),
      stat_locked: Boolean(r.stat_locked),
      stat_source: r.stat_source ?? "",
      stat_reason: r.stat_lock_reason ?? "",
      active_projects: r.active_projects,
      last_checkin: r.last_checkin ?? "",
      updated_at: r.updated_at,
    };
  });
}

async function hydrateProjects(): Promise<Row[]> {
  if (!isDbConfigured()) return [];
  const rows = await query<ProjectRow>(`
    SELECT code, name, client_name, status, priority,
           budget_thb, internal_budget_thb, progress_pct,
           start_date::text AS start_date, end_date::text AS end_date,
           complexity_score, urgency_score, strategic_value_score,
           delivery_risk_score, ai_leverage_score,
           COALESCE(config_locked, false) AS config_locked,
           config_source,
           config_lock_reason,
           project_slots, team_size,
           updated_at::text AS updated_at
    FROM projects
    ORDER BY priority DESC, code ASC
  `);

  return rows.map<Row>((p) => {
    const slots = p.project_slots ?? {};
    const total =
      (slots.technical ?? 0) +
      (slots.sales ?? 0) +
      (slots.marketing ?? 0) +
      (slots.outsourcing ?? 0) +
      (slots.paperwork ?? 0);
    const filledPct = total > 0 ? Math.round((p.team_size / total) * 100) : 0;
    return {
      code: p.code,
      name: p.name,
      client: p.client_name ?? "—",
      status: p.status,
      priority: p.priority,
      budget_thb: p.budget_thb ?? "",
      internal_budget_thb: p.internal_budget_thb ?? "",
      progress_pct: p.progress_pct ?? "",
      start_date: p.start_date ?? "",
      end_date: p.end_date ?? "",
      complexity_score: p.complexity_score ?? 50,
      urgency_score: p.urgency_score ?? 50,
      strategic_value_score: p.strategic_value_score ?? 50,
      delivery_risk_score: p.delivery_risk_score ?? 50,
      ai_leverage_score: p.ai_leverage_score ?? 50,
      config_locked: Boolean(p.config_locked),
      config_source: p.config_source ?? "",
      config_reason: p.config_lock_reason ?? "",
      slots_technical: slots.technical ?? 0,
      slots_sales: slots.sales ?? 0,
      slots_marketing: slots.marketing ?? 0,
      slots_outsourcing: slots.outsourcing ?? 0,
      slots_paperwork: slots.paperwork ?? 0,
      filled_pct: filledPct,
      team_size: p.team_size,
      league_points: 0,
      updated_at: p.updated_at,
    };
  });
}

async function hydrateGameAdjustments(): Promise<Row[]> {
  if (!isDbConfigured()) return [];
  const rows = await query<GameAdjustmentRow>(`
    SELECT id::text,
           created_at::text,
           target_type,
           target_id::text,
           action,
           source,
           field,
           before_value,
           after_value,
           criteria_snapshot,
           reason
    FROM game_adjustment_log
    ORDER BY created_at DESC
    LIMIT 1000
  `);

  return rows.map<Row>((row) => ({
    id: row.id,
    created_at: row.created_at,
    target_type: row.target_type,
    target_id: row.target_id,
    action: row.action,
    source: row.source,
    field: row.field,
    before_value: JSON.stringify(row.before_value ?? null),
    after_value: JSON.stringify(row.after_value ?? null),
    criteria_snapshot: JSON.stringify(row.criteria_snapshot ?? {}),
    reason: row.reason,
  }));
}

// ─── Handler ──────────────────────────────────────────────────────────────

export async function POST() {
  if (!sheetsEnabled()) {
    return apiError(
      "Sheets not configured: set GOOGLE_SHEETS_ID and GOOGLE_SERVICE_ACCOUNT_KEY",
      503,
    );
  }

  try {
    // 1. Create/repair tabs + headers + freeze row 1.
    const bootstrap = await bootstrapTabs();
    if (!bootstrap.ok) {
      return apiError(bootstrap.error ?? "Bootstrap failed", 500);
    }

    // 2. Hydrate live snapshots + the audit shadow from current DB state.
    const [players, projects, adjustments] = await Promise.all([
      hydratePlayers(),
      hydrateProjects(),
      hydrateGameAdjustments(),
    ]);

    await Promise.all([
      replaceTab("Players", players),
      replaceTab("Projects", projects),
      replaceTab("GameAdjustments", adjustments),
    ]);

    return apiJson({
      ok: true,
      tabs_created: bootstrap.created,
      tabs_already_existed: bootstrap.already,
      players_synced: players.length,
      projects_synced: projects.length,
      game_adjustments_synced: adjustments.length,
    });
  } catch (err) {
    logApiError("api/sync/sheets-bootstrap", err);
    return apiError("Bootstrap failed unexpectedly", 500);
  }
}

export async function GET() {
  return apiJson({
    configured: sheetsEnabled(),
    hint: sheetsEnabled()
      ? "POST to this endpoint to (re)create tabs and hydrate Players, Projects, and GameAdjustments"
      : "Set GOOGLE_SHEETS_ID and GOOGLE_SERVICE_ACCOUNT_KEY in .env.local",
  });
}
