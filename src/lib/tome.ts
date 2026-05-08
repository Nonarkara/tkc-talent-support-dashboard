/**
 * The Tome — print-ready institutional record per employee.
 *
 * Re-engineers the white envelope. Bundles every chronicle paragraph,
 * every formation played, every recognition stamped, every ascension,
 * every memo signed, into a single classical-book layout that prints
 * to a hardcover. Given to the leaving employee on the day of departure.
 *
 * Pure data layer. No I/O, no React. The HTML rendering lives in
 * `src/app/tome/[employee_id]/page.tsx`. The HTTP entry point lives in
 * `src/app/api/tome/[employee_id]/print/route.ts`.
 *
 * Data sources: employees, employee_attributes, employee_profile_facets,
 * skill_assessments, check_ins, project_allocations, projects, support_actions,
 * vocation_changes, events, evaluations.
 *
 * Defensive: every query wrapped, every section gracefully empty. A new
 * hire with no chronicles still gets a beautiful book — every section
 * renders "no entries yet — the next one is the first."
 *
 * Tome registry number is stable and human-readable: `TKC-{YYYY}-{employee_code or short id}`.
 */

import { isDbConfigured, query } from "./db";
import { ARCHETYPE_LABEL, getArchetype, type Archetype } from "./token-economy";
// Per-archetype banner phrase. Inlined after the v9.0 delete pass
// removed src/lib/lore.ts. Only the Tome cover uses this.
const ARCHETYPE_BANNER: Record<string, string> = {
  captain: "Bearer of the Banner",
  ops:     "Steward of Operations",
  tech:    "Reader of the Runes",
  scout:   "Eyes of the House",
  sales:   "Voice of the Charter",
  fighter: "Hand of the Strike",
  goofoff: "Wildcard of the House",
};

// ─── Shapes ─────────────────────────────────────────────────────────────

export interface TomeIdentity {
  id: string;
  employee_code: string | null;
  full_name_th: string;
  full_name_en: string | null;
  nickname: string | null;
  email: string | null;
  title_en: string | null;
  title_th: string | null;
  role_level: string;
  dept_code: string | null;
  dept_name_en: string | null;
  div_code: string | null;
  div_name_en: string | null;
  tenure_years: number | null;
  joined_at: string | null;
  is_active: boolean;
  rpg_class: string | null;
  archetype: Archetype;
  archetype_label: string;
  banner: string;
  // May 2026 additions:
  date_of_birth: string | null;
  age: number | null;
  gender: "m" | "f" | null;
  education_level: string | null;
  education_school: string | null;
  education_faculty: string | null;
  education_major: string | null;
  section_th: string | null;
  resign_date: string | null;
  resign_status: "presumed_departed" | "confirmed" | "none" | null;
}

export interface TomeAttributes {
  str: number | null;
  int: number | null;
  wis: number | null;
  cha: number | null;
  dex: number | null;
  con: number | null;
  level: number | null;
  total_xp: number | null;
}

export interface TomeChronicle {
  id: string;
  cycle: string;
  manager_name: string | null;
  manager_id: string | null;
  narrative: string;
  status: string;
  created_at: string;
  approved_at: string | null;
  approved_deltas: Record<string, number> | null;
}

export interface TomeQuestPlayed {
  project_code: string;
  project_name: string;
  slot_dimension: string;
  fte: number;
  overall_pct: number | null;
  chemistry: number | null;
  status: string | null;
  started_at: string;
  ended_at: string | null;
}

export interface TomeRecognition {
  id: string;
  cycle: string;
  action_type: string;
  title: string;
  note: string | null;
  owner_name: string | null;
  created_at: string;
}

export interface TomeAscension {
  id: string;
  changed_at: string;
  from_label: string;
  to_label: string;
  level_before: number | null;
  reason: string | null;
}

export interface TomeMemo {
  id: string;
  verb: string;
  payload: Record<string, unknown> | null;
  source: string | null;
  created_at: string;
}

export interface TomeEvaluationCycle {
  cycle: string;
  dimensions: Array<{ dimension_key: string; score: number; notes: string | null }>;
}

export interface Tome {
  registry_number: string;
  generated_at: string;
  identity: TomeIdentity;
  attributes: TomeAttributes;
  skills: string[];
  languages: string[];
  certifications: string[];
  soft_skills: string[];
  chronicles: TomeChronicle[];
  quests_played: TomeQuestPlayed[];
  recognitions: TomeRecognition[];
  ascensions: TomeAscension[];
  memos: TomeMemo[];
  evaluations: TomeEvaluationCycle[];
}

// ─── Helpers ─────────────────────────────────────────────────────────────

function shortId(id: string): string {
  return id.split("-")[0]?.toUpperCase() ?? id.slice(0, 8).toUpperCase();
}

function tomeRegistryNumber(emp: { id: string; employee_code: string | null; joined_at: string | null }): string {
  const year = emp.joined_at ? new Date(emp.joined_at).getFullYear() : new Date().getFullYear();
  const code = emp.employee_code?.toUpperCase() ?? shortId(emp.id);
  return `TKC-${year}-${code}`;
}

interface IdentityRow {
  id: string;
  employee_code: string | null;
  full_name_th: string;
  full_name_en: string | null;
  nickname: string | null;
  email: string | null;
  title_en: string | null;
  title_th: string | null;
  role_level: string;
  rpg_class: string | null;
  tenure_years: number | null;
  joined_at: string | null;
  is_active: boolean;
  dept_code: string | null;
  dept_name_en: string | null;
  div_code: string | null;
  div_name_en: string | null;
}

// ─── Loader ─────────────────────────────────────────────────────────────

export async function loadTome(employeeId: string): Promise<Tome | null> {
  if (!isDbConfigured()) return null;

  // Identity (required — null return if not found). `rpg_class` was a
  // late-pivot column that doesn't exist in this DB; we infer the class
  // from getArchetype() instead.
  const idRows = await query<
    Omit<IdentityRow, "rpg_class"> & {
      rpg_class?: string | null;
      date_of_birth: string | null;
      gender: "m" | "f" | null;
      education_level: string | null;
      education_school: string | null;
      education_faculty: string | null;
      education_major: string | null;
      section_th: string | null;
      resign_date: string | null;
      resign_status: "presumed_departed" | "confirmed" | "none" | null;
    }
  >(
    `SELECT e.id, e.employee_code, e.full_name_th, e.full_name_en, e.nickname,
            e.email, e.title_en, e.title_th, e.role_level,
            e.tenure_years, e.joined_at::text AS joined_at, e.is_active,
            e.date_of_birth::text AS date_of_birth,
            e.gender, e.education_level, e.education_school,
            e.education_faculty, e.education_major, e.section_th,
            e.resign_date::text AS resign_date, e.resign_status,
            d.code AS dept_code, d.name_en AS dept_name_en,
            div.code AS div_code, div.name_en AS div_name_en
       FROM employees e
       LEFT JOIN departments d ON d.id = e.department_id
       LEFT JOIN divisions div ON div.id = e.division_id
       WHERE e.id = $1
       LIMIT 1`,
    [employeeId],
  );
  if (idRows.length === 0) return null;
  const id = { ...idRows[0], rpg_class: idRows[0].rpg_class ?? null };

  // Attributes (best-effort)
  const attrRows = await query<{
    str: number | null; int: number | null; wis: number | null;
    cha: number | null; dex: number | null; con: number | null;
    level: number | null; total_xp: number | null;
  }>(
    `SELECT str, int, wis, cha, dex, con,
            (SELECT level FROM employees WHERE id = $1) AS level,
            (SELECT total_points FROM employees WHERE id = $1) AS total_xp
       FROM employee_attributes WHERE employee_id = $1 LIMIT 1`,
    [employeeId],
  );
  const attrs: TomeAttributes = attrRows[0] ?? {
    str: null, int: null, wis: null, cha: null, dex: null, con: null,
    level: null, total_xp: null,
  };

  // Profile facets
  const facetRows = await query<{
    languages: string[] | null;
    certifications: string[] | null;
    soft_skills: string[] | null;
  }>(
    `SELECT languages, certifications, soft_skills
       FROM employee_profile_facets WHERE employee_id = $1 LIMIT 1`,
    [employeeId],
  );
  const facet = facetRows[0] ?? { languages: null, certifications: null, soft_skills: null };

  // Skills array
  const skillRows = await query<{ skills: string[] | null }>(
    `SELECT skills FROM employees WHERE id = $1 LIMIT 1`,
    [employeeId],
  );
  const skills = skillRows[0]?.skills ?? [];

  // Chronicles — every check_in
  const chronicleRows = await query<{
    id: string; cycle: string; manager_id: string | null; manager_name: string | null;
    narrative: string; status: string; approved: Record<string, number> | null;
    created_at: string; approved_at: string | null;
  }>(
    `SELECT ci.id::text, ci.cycle, ci.manager_id::text,
            COALESCE(mgr.nickname, mgr.full_name_en, mgr.full_name_th) AS manager_name,
            ci.narrative, ci.status, ci.approved, ci.created_at::text, ci.approved_at::text
       FROM check_ins ci
       LEFT JOIN employees mgr ON mgr.id = ci.manager_id
       WHERE ci.employee_id = $1
       ORDER BY ci.created_at`,
    [employeeId],
  );
  const chronicles: TomeChronicle[] = chronicleRows.map((r) => ({
    id: r.id, cycle: r.cycle, manager_id: r.manager_id, manager_name: r.manager_name,
    narrative: r.narrative, status: r.status,
    created_at: r.created_at, approved_at: r.approved_at,
    approved_deltas: r.approved,
  }));

  // Quests played — every project_allocation
  const questRows = await query<{
    project_code: string; project_name: string; slot_dimension: string;
    fte: string; overall_pct: number | null; chemistry: number | null;
    status: string | null; created_at: string; updated_at: string;
  }>(
    `SELECT p.code AS project_code, p.name AS project_name,
            pa.slot_dimension, pa.fte::text, pa.overall_pct, pa.chemistry,
            p.status, pa.created_at::text, pa.updated_at::text
       FROM project_allocations pa
       JOIN projects p ON p.id = pa.project_id
       WHERE pa.employee_id = $1
       ORDER BY pa.created_at DESC`,
    [employeeId],
  );
  const quests: TomeQuestPlayed[] = questRows.map((r) => ({
    project_code: r.project_code, project_name: r.project_name,
    slot_dimension: r.slot_dimension, fte: Number(r.fte ?? 0),
    overall_pct: r.overall_pct, chemistry: r.chemistry, status: r.status,
    started_at: r.created_at,
    ended_at: r.status === "completed" || r.status === "done" ? r.updated_at : null,
  }));

  // Recognitions — support_actions of recognition type
  const recogRows = await query<{
    id: string; cycle: string; action_type: string; title: string; note: string | null;
    owner_name: string | null; created_at: string;
  }>(
    `SELECT sa.id::text, sa.cycle, sa.action_type, sa.title, sa.note,
            COALESCE(owner.nickname, owner.full_name_en, owner.full_name_th) AS owner_name,
            sa.created_at::text
       FROM support_actions sa
       LEFT JOIN employees owner ON owner.id = sa.owner_employee_id
       WHERE sa.employee_id = $1
       ORDER BY sa.created_at`,
    [employeeId],
  );
  const recognitions: TomeRecognition[] = recogRows;

  // Ascensions — vocation_changes
  const ascRows = await query<{
    id: string; changed_at: string; from_archetype: string; to_archetype: string;
    level_before: number | null; reason: string | null;
  }>(
    `SELECT id::text, changed_at::text, from_archetype, to_archetype, level_before, reason
       FROM vocation_changes WHERE employee_id = $1 ORDER BY changed_at`,
    [employeeId],
  );
  const ascensions: TomeAscension[] = ascRows.map((r) => ({
    id: r.id, changed_at: r.changed_at,
    from_label: ARCHETYPE_LABEL[(r.from_archetype as Archetype) ?? "ops"] ?? r.from_archetype,
    to_label: ARCHETYPE_LABEL[(r.to_archetype as Archetype) ?? "ops"] ?? r.to_archetype,
    level_before: r.level_before, reason: r.reason,
  }));

  // Memos — events table
  const memoRows = await query<{
    id: string; verb: string; payload: Record<string, unknown> | null;
    source: string | null; created_at: string;
  }>(
    `SELECT id::text, verb, payload, source, created_at::text
       FROM events
       WHERE subject_id = $1
       ORDER BY created_at`,
    [employeeId],
  );
  const memos: TomeMemo[] = memoRows;

  // Evaluations grouped by cycle
  const evalRows = await query<{
    cycle: string; dimension_key: string; score: string; notes: string | null;
  }>(
    `SELECT cycle, dimension_key, score::text, notes
       FROM evaluations WHERE employee_id = $1
       ORDER BY cycle DESC, dimension_key`,
    [employeeId],
  );
  const cyclesMap = new Map<string, TomeEvaluationCycle>();
  for (const r of evalRows) {
    if (!cyclesMap.has(r.cycle)) cyclesMap.set(r.cycle, { cycle: r.cycle, dimensions: [] });
    cyclesMap.get(r.cycle)!.dimensions.push({
      dimension_key: r.dimension_key,
      score: Number(r.score),
      notes: r.notes,
    });
  }
  const evaluations: TomeEvaluationCycle[] = Array.from(cyclesMap.values());

  // Identity decoration: archetype + banner
  const archetype = getArchetype({
    role_level: id.role_level,
    dept_code: id.dept_code,
    rpg_class: id.rpg_class,
    attr_str: attrs.str,
    attr_int: attrs.int,
    attr_wis: attrs.wis,
    attr_cha: attrs.cha,
    attr_dex: attrs.dex,
    attr_con: attrs.con,
  });
  const archetypeLabel = ARCHETYPE_LABEL[archetype] ?? archetype;
  const banner = ARCHETYPE_BANNER[archetype] ?? "Of the House";

  // Compute age from DOB
  const age = id.date_of_birth
    ? Math.floor(
        (Date.now() - new Date(id.date_of_birth).getTime()) /
          (1000 * 60 * 60 * 24 * 365.25),
      )
    : null;

  return {
    registry_number: tomeRegistryNumber(id),
    generated_at: new Date().toISOString(),
    identity: {
      ...id,
      archetype,
      archetype_label: archetypeLabel,
      banner,
      age,
    },
    attributes: attrs,
    skills,
    languages: facet.languages ?? [],
    certifications: facet.certifications ?? [],
    soft_skills: facet.soft_skills ?? [],
    chronicles,
    quests_played: quests,
    recognitions,
    ascensions,
    memos,
    evaluations,
  };
}
