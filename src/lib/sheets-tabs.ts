/**
 * TABS registry — the canonical schema for the Google Sheets ledger.
 *
 * One entry per tab. Each entry declares its headers (column order) and
 * write strategy. `sheets-sync.ts` is a dumb dispatcher on top of this
 * config — adding a new mirrored aggregate means appending a single entry
 * here, nothing else.
 *
 * Write strategies
 * ────────────────
 *   upsert   — match by stable ID (first header, treated as the key),
 *              update if found else append. Used for live state (players,
 *              projects, teams). Rows stay deduplicated forever.
 *   append   — no dedupe, append-only. Used for event logs (CheckIns,
 *              Events, AttrHistory). The audit trail grows, never mutates.
 *   replace  — wipe the tab, rewrite the whole thing. Used for snapshot
 *              tabs (League, DeptHeat) where we recompute from scratch on
 *              a cadence and don't care about per-row history inside the
 *              tab (history lives in DB).
 *
 * Naming
 * ──────
 * Tab names use PascalCase and stay stable once shipped — changing a name
 * orphans the data. Headers are human-readable sentence case because the
 * audience is HR, not engineers.
 */

export type WriteStrategy = "upsert" | "append" | "replace";

export interface TabConfig {
  /** Sheet tab name, must match the Google Sheet exactly. */
  name: string;
  /** Column headers in display order. First column is the stable ID for upsert tabs. */
  headers: readonly string[];
  /** How new writes combine with existing rows. */
  strategy: WriteStrategy;
  /** One-line human description (shown in /api/sync/sheets-bootstrap output). */
  description: string;
}

export const TABS: readonly TabConfig[] = [
  {
    name: "Players",
    strategy: "upsert",
    description: "One row per employee — current game state.",
    headers: [
      "id",
      "name",
      "dept",
      "role",
      "class",
      "level",
      "str",
      "int",
      "wis",
      "cha",
      "dex",
      "con",
      "hp",
      "mp",
      "token_cost",
      "stat_locked",
      "stat_source",
      "stat_reason",
      "active_projects",
      "last_checkin",
      "updated_at",
    ],
  },
  {
    name: "Projects",
    strategy: "upsert",
    description: "One row per project — slot BOM, fill state, league points.",
    headers: [
      "code",
      "name",
      "client",
      "status",
      "priority",
      "budget_thb",
      "internal_budget_thb",
      "progress_pct",
      "start_date",
      "end_date",
      "complexity_score",
      "urgency_score",
      "strategic_value_score",
      "delivery_risk_score",
      "ai_leverage_score",
      "config_locked",
      "config_source",
      "config_reason",
      "slots_technical",
      "slots_sales",
      "slots_marketing",
      "slots_outsourcing",
      "slots_paperwork",
      "filled_pct",
      "team_size",
      "league_points",
      "updated_at",
    ],
  },
  {
    name: "GameAdjustments",
    strategy: "append",
    description: "Append-only: every stat/score seed, adjustment, lock, unlock, or AI move.",
    headers: [
      "id",
      "created_at",
      "target_type",
      "target_id",
      "action",
      "source",
      "field",
      "before_value",
      "after_value",
      "criteria_snapshot",
      "reason",
    ],
  },
  {
    name: "Teams",
    strategy: "upsert",
    description: "One row per (project × player) assignment.",
    headers: [
      "key", // `${project_code}:${employee_id}`
      "project_code",
      "project_name",
      "player_id",
      "player_name",
      "player_class",
      "slot_dimension",
      "allocation_pct",
      "fit_score",
      "assigned_at",
    ],
  },
  {
    name: "CheckIns",
    strategy: "append",
    description: "Append-only: manager narrative + approved stat deltas.",
    headers: [
      "id",
      "created_at",
      "cycle",
      "employee_id",
      "employee_name",
      "manager_id",
      "manager_name",
      "status",
      "narrative",
      "deltas",
      "rationale",
    ],
  },
  {
    name: "Events",
    strategy: "append",
    description: "Append-only: every stat delta, XP gain, level-up, allocation.",
    headers: [
      "id",
      "created_at",
      "verb",
      "subject_id",
      "subject_name",
      "actor_id",
      "actor_name",
      "payload",
      "source",
    ],
  },
  {
    name: "League",
    strategy: "replace",
    description: "Weekly snapshot: team standings, W/L, points, fit, chemistry.",
    headers: [
      "week",
      "position",
      "project_code",
      "project_name",
      "wins",
      "losses",
      "points",
      "fit_pct",
      "chemistry",
      "margin_pct",
      "form_last_5",
    ],
  },
  {
    name: "DeptHeat",
    strategy: "replace",
    description: "Nightly snapshot: department strain and risk count.",
    headers: [
      "snapshot_at",
      "dept_code",
      "dept_name",
      "members",
      "risks",
      "strain",
      "archetype_mix",
    ],
  },
  {
    name: "AttrHistory",
    strategy: "append",
    description: "Monthly snapshot: each player's full attribute sheet.",
    headers: [
      "snapshot_at",
      "employee_id",
      "employee_name",
      "str",
      "int",
      "wis",
      "cha",
      "dex",
      "con",
      "level",
      "class",
    ],
  },
  // ─── Ninja-Squads-as-Console (Dr Non's hunch) ───────────────────────
  // The dashboard is the input device; Sheets is the narrative layer.
  // Every state-changing click in the Ninja tab emits a row here so HR
  // can sort / pivot / chart in a tool they already know.
  {
    name: "NinjaSquads",
    strategy: "upsert",
    description: "One row per ninja quest — current readiness snapshot.",
    headers: [
      "quest_id",
      "code",
      "title",
      "dept",
      "status",
      "skills_required",  // pipe-joined list
      "member_count",
      "readiness_overall",
      "readiness_gaps",    // pipe-joined list
      "chemistry",
      "created_at",
      "updated_at",
    ],
  },
  {
    name: "SquadEvents",
    strategy: "append",
    description: "Game log. Every skill toggle, member add/remove, squad save.",
    headers: [
      "id",
      "created_at",
      "verb",              // toggle.on / toggle.off / member.add / member.remove / squad.save / gap.flag
      "actor_id",          // HR or boss (TODO: wire when auth lands)
      "quest_id",          // null for pre-save events
      "payload",           // JSON: skill, employee_id, readiness_pct, etc.
    ],
  },
  {
    name: "SkillCatalog",
    strategy: "replace",
    description: "The 10-skill vocabulary — labels, blurbs, live head-counts.",
    headers: [
      "skill_key",
      "label",
      "blurb",
      "employee_count",
      "dept_codes",        // pipe-joined list of depts where this skill is common
    ],
  },
  {
    name: "InterviewLog",
    strategy: "append",
    description: "Phase-2 stub. Gen-AI extracted skill evidence from interviews.",
    headers: [
      "id",
      "assessed_at",
      "employee_id",
      "employee_name",
      "skill_name",
      "proficiency",       // 1-5
      "evidence_url",      // transcript link
      "notes",
    ],
  },
  {
    name: "MatrixScenarios",
    strategy: "append",
    description: "PoC scenario history. Each save logs a staffing model test.",
    headers: [
      "scenario_id",
      "name",
      "cycle",
      "functions",         // pipe-joined list
      "coes",              // pipe-joined list
      "overall_readiness_pct",
      "total_over_allocations",
      "created_at",
    ],
  },
  {
    name: "Formation",
    strategy: "upsert",
    description: "Current state per project: needs, fills, readiness scores. One row per project.",
    headers: [
      "project_code",
      "project_name",
      "required_slots",      // JSON dump of per-dimension need counts
      "filled_slots",        // JSON dump of per-dimension assigned counts
      "assigned_employees",  // pipe-joined employee_id@dimension@order list (v3.3)
      "front_count",         // v3.3 Front Row — DQ3 party order counts
      "mid_count",
      "back_count",
      "coverage_pct",
      "quality_pct",
      "chemistry",
      "morale",
      "overall_readiness_pct",
      "last_saved_at",
    ],
  },
  {
    name: "FormationEvents",
    strategy: "append",
    description: "Formation ledger. Every assign/unassign/needs-update/save is appended.",
    headers: [
      "id",
      "created_at",
      "verb",                // assign | unassign | needs.update | save
      "actor_id",
      "project_code",
      "employee_id",
      "slot_dimension",
      "payload",             // JSON — extra context per verb
    ],
  },
  {
    name: "Resources",
    strategy: "upsert",
    description: "Non-human resources register: data centres, compute, licences, wishlist.",
    headers: [
      "code",
      "label",
      "category",            // datacentre | compute | license | headcount | wishlist
      "capacity",
      "unit",
      "status",              // owned | wishlist | co-location
      "notes",
      "updated_at",
    ],
  },
  // v8.1 · Lobby pipe. Three append-only ledgers that light up once the
  // v8.2 endpoints (/api/lobby/punch, /api/lobby/interaction, /api/memos)
  // land. Shipping the schema now means bootstrap creates the tabs on
  // first run and LedgerTab reports coverage honestly.
  {
    name: "Attendance",
    strategy: "append",
    description: "Append-only: every lobby check-in / check-out punch.",
    headers: [
      "ts",
      "employee_code",
      "employee_name",
      "action",          // in | out
      "source",          // manual | badge | auto
    ],
  },
  {
    name: "Interactions",
    strategy: "append",
    description: "Append-only: lobby chat / proximity events between two employees.",
    headers: [
      "ts",
      "a_code",
      "b_code",
      "duration_s",
      "dept_a",
      "dept_b",
      "same_gender",     // 1 | 0
    ],
  },
  {
    name: "Memos",
    strategy: "append",
    description: "Append-only: manual memos + auto memos emitted on formation / ninja save.",
    headers: [
      "ts",
      "author_code",
      "subject",
      "body_markdown",
      "related_entities",  // pipe-joined list of employee/project/quest ids
      "source",            // manual | auto
    ],
  },
  // v3.2 · Alltrades Abbey. Append-only ledger of vocation changes —
  // one row per reskill event. Directors read this to see where
  // institutional memory is migrating between functions.
  {
    name: "VocationChanges",
    strategy: "append",
    description: "Alltrades Abbey ledger — every vocation/archetype change per employee.",
    headers: [
      "id",
      "changed_at",
      "employee_id",
      "employee_name",
      "from_archetype",
      "from_label",
      "to_archetype",
      "to_label",
      "level_before",
      "actor_id",
      "reason",
      "note",
    ],
  },

  // v4.7 · Ninja. The Talent Management Program (Phase 1) snapshot —
  // one row per nominee per cycle. Keyed on `employee_id + cycle` so a
  // 2026-H1 row and a 2026-H2 row for the same person coexist; the UI
  // reads `cycle` to pick the current view. Aligned with the
  // Performance/Potential framework in `TKC Talent rev.4` (Apr 2026).
  {
    name: "TalentAssessment",
    strategy: "upsert",
    description: "Talent Management Program — per-nominee Performance/Potential, 9-Box, Final Cut.",
    headers: [
      "employee_id",
      "cycle",
      "employee_code",
      "employee_name",
      "department",
      "position",
      "job_grade",
      "grade_prev",
      "grade_curr",
      "performance_score",
      "potential_score",
      "avg_score",
      "performance_band",
      "potential_band",
      "box_id",
      "box_label",
      "in_talent_pool",
      "referrence",
      "remark",
      "assessment_date",
      "imported_at",
    ],
  },

  // v4.8 · Crystal. Four C Framework — self-reported Community, Career,
  // Cause (Purpose), and Compensation scores per employee per cycle.
  {
    name: "FourPillarResponses",
    strategy: "upsert",
    description: "Four C Framework — per-employee self-reported scores per cycle.",
    headers: [
      "employee_id",
      "cycle",
      "employee_name",
      "compensation",
      "purpose",
      "career",
      "community",
      "source",
      "created_at",
    ],
  },
  {
    name: "CredoScores",
    strategy: "upsert",
    description: "Credo Framework — Belonging, Purpose, Transcendence, Story per employee per cycle.",
    headers: [
      "employee_id",
      "cycle",
      "employee_name",
      "belonging",
      "purpose",
      "transcendence",
      "story",
      "overall",
      "pulse_source",
      "created_at",
    ],
  },
  {
    name: "HouseScoreHistory",
    strategy: "append",
    description: "Four C House Score snapshots — nightly or on-demand composite scores.",
    headers: [
      "snapshot_at",
      "cycle",
      "active_heroes",
      "compensation",
      "purpose",
      "career",
      "community",
      "composite",
      "self_reported_count",
      "heuristic_count",
      "source",
    ],
  },
  {
    name: "SupportActions",
    strategy: "upsert",
    description: "HR support interventions — linked to Four C / Credo pillars.",
    headers: [
      "id",
      "created_at",
      "employee_id",
      "employee_name",
      "cycle",
      "action_type",
      "target_pillar",
      "title",
      "note",
      "status",
      "owner_id",
      "owner_name",
    ],
  },
  {
    name: "Missions",
    strategy: "upsert",
    description: "One-month prototype sprint missions — each team's commitment (deadline 2026-06-27).",
    headers: [
      "id",
      "team_name",
      "department",
      "brief",
      "owner_name",
      "deadline",
      "demo_url",
      "tech_stack",
      "status",
      "notes",
      "created_at",
      "updated_at",
    ],
  },
] as const;

/** Lookup a tab by name. Throws if missing — fail loud on typos. */
export function getTab(name: string): TabConfig {
  const tab = TABS.find((t) => t.name === name);
  if (!tab) throw new Error(`[sheets] unknown tab: ${name}`);
  return tab;
}

/** Tab name type-guard (for exhaustive switches in sync hooks). */
export type TabName = (typeof TABS)[number]["name"];
