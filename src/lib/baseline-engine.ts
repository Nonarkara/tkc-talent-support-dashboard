/**
 * Baseline Engine
 *
 * Criteria-weighted stat generation for heroes and projects. The output
 * is deterministic for the same entity + seed, so "random" values feel
 * differentiated without turning future audits into archaeology.
 */

import { deriveProjectSlots } from "./project-planning";
import { normalizeSlots, slotTotal, type ProjectSlots } from "./project-slots";

export type AttrKey = "str" | "int" | "wis" | "cha" | "dex" | "con";

export interface EmployeeCriteriaInput {
  id: string;
  employee_code?: string | null;
  role_level?: string | null;
  level?: number | null;
  tenure_years?: number | null;
  salary_thb?: number | string | null;
  dept_code?: string | null;
  div_code?: string | null;
  skills?: string[] | null;
}

export interface EmployeeBaseline {
  attributes: Record<AttrKey, number>;
  seed: number;
  criteria: Record<string, unknown>;
}

export interface ProjectCriteriaInput {
  id: string;
  code: string;
  priority?: string | null;
  status?: string | null;
  budget_thb?: number | string | null;
  monthly_ceiling?: number | string | null;
  gross_margin_pct?: number | string | null;
  required_skills?: string[] | null;
  team_size?: number | string | null;
  progress_pct?: number | string | null;
  project_slots?: unknown;
}

export interface ProjectBaseline {
  complexity_score: number;
  urgency_score: number;
  strategic_value_score: number;
  delivery_risk_score: number;
  ai_leverage_score: number;
  suggested_slots: ProjectSlots;
  seed: number;
  criteria: Record<string, unknown>;
}

const ATTR_KEYS: AttrKey[] = ["str", "int", "wis", "cha", "dex", "con"];

const ROLE_BASE: Record<string, number> = {
  md: 15,
  deputy_md: 14,
  director: 13,
  manager: 12,
  senior: 10,
  staff: 8,
};

const DEPT_BIAS: Record<string, Partial<Record<AttrKey, number>>> = {
  EXEC: { wis: 2, cha: 2, con: 1 },
  CORP_ADM: { wis: 2, con: 1, int: 1 },
  NET_DEL: { str: 2, con: 2, dex: 1 },
  TECH: { int: 2, dex: 1, wis: 1 },
  SOFTWARE: { int: 2, dex: 2 },
  CYBER: { int: 2, wis: 2, con: 1 },
  SALES: { cha: 3, wis: 1 },
  BIZ_DEV: { cha: 2, dex: 1, wis: 1 },
  HR: { cha: 2, wis: 2 },
  FIN: { wis: 2, int: 1, con: 1 },
  PROCUREMENT: { wis: 2, cha: 1, con: 1 },
};

const SKILL_BIAS: Array<{ match: string[]; bias: Partial<Record<AttrKey, number>> }> = [
  { match: ["technical", "cloud", "data", "cyber", "software", "network"], bias: { int: 2, dex: 1 } },
  { match: ["sales", "customer", "marketing", "presentation"], bias: { cha: 2, wis: 1 } },
  { match: ["delivery", "ops", "survey", "field"], bias: { str: 1, con: 2 } },
  { match: ["procurement", "vendor", "outsourcing"], bias: { wis: 1, cha: 1, con: 1 } },
  { match: ["finance", "paperwork", "controls"], bias: { wis: 2, int: 1 } },
  { match: ["leadership", "mentor", "coach"], bias: { cha: 1, wis: 2 } },
];

function hashString(value: string) {
  let hash = 2166136261;
  for (let i = 0; i < value.length; i += 1) {
    hash ^= value.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

function rng(seed: number) {
  let state = seed || 1;
  return () => {
    state = Math.imul(1664525, state) + 1013904223;
    return ((state >>> 0) / 4294967296);
  };
}

function clampInt(value: number, min: number, max: number) {
  return Math.max(min, Math.min(max, Math.round(value)));
}

function asNumber(value: number | string | null | undefined) {
  const n = Number(value ?? 0);
  return Number.isFinite(n) ? n : 0;
}

function addBias(target: Record<AttrKey, number>, bias: Partial<Record<AttrKey, number>>) {
  for (const key of ATTR_KEYS) target[key] += bias[key] ?? 0;
}

function salaryBand(salary: number) {
  if (salary >= 180_000) return 3;
  if (salary >= 120_000) return 2;
  if (salary >= 75_000) return 1;
  return 0;
}

function skillCriteria(skills: string[] | null | undefined) {
  return (skills ?? []).map((skill) => skill.toLowerCase());
}

export function employeeBaseline(input: EmployeeCriteriaInput, seedSalt = "v1"): EmployeeBaseline {
  const seed = hashString(`employee:${seedSalt}:${input.id}:${input.employee_code ?? ""}`) % 2_147_483_647;
  const random = rng(seed);
  const role = input.role_level ?? "staff";
  const tenure = asNumber(input.tenure_years);
  const level = asNumber(input.level);
  const salary = asNumber(input.salary_thb);
  const dept = input.dept_code ?? "";
  const skills = skillCriteria(input.skills);
  const base = ROLE_BASE[role] ?? 8;
  const tenureBonus = Math.min(3, Math.floor(tenure / 5));
  const levelBonus = Math.min(2, Math.floor(Math.max(0, level - 1) / 7));
  const salaryBonus = salaryBand(salary);

  const attrs: Record<AttrKey, number> = {
    str: base,
    int: base,
    wis: base,
    cha: base,
    dex: base,
    con: base,
  };

  attrs.wis += tenureBonus;
  attrs.con += Math.min(2, Math.floor(tenure / 8));
  attrs.cha += role === "manager" || role === "director" || role === "deputy_md" || role === "md" ? 1 : 0;
  attrs.int += levelBonus;
  attrs.wis += levelBonus;
  attrs.con += salaryBonus >= 2 ? 1 : 0;

  const deptBias = DEPT_BIAS[dept] ?? DEPT_BIAS[dept.split("_")[0] ?? ""] ?? {};
  addBias(attrs, deptBias);

  for (const rule of SKILL_BIAS) {
    if (skills.some((skill) => rule.match.some((needle) => skill.includes(needle)))) {
      addBias(attrs, rule.bias);
    }
  }

  for (const key of ATTR_KEYS) {
    const jitter = Math.floor(random() * 5) - 2;
    attrs[key] = clampInt(attrs[key] + jitter, 4, 20);
  }

  return {
    attributes: attrs,
    seed,
    criteria: {
      role,
      tenure_years: tenure,
      level,
      salary_band: salaryBand(salary),
      dept_code: dept || null,
      div_code: input.div_code ?? null,
      skills_considered: skills.slice(0, 12),
      note: "No date-of-birth field exists yet, so career stage uses role, level, tenure, salary band, department, and skills.",
    },
  };
}

function priorityWeight(priority: string | null | undefined) {
  if (priority === "critical") return 95;
  if (priority === "high") return 78;
  if (priority === "medium") return 58;
  return 38;
}

function budgetScale(budget: number) {
  if (budget >= 250_000_000) return 90;
  if (budget >= 100_000_000) return 75;
  if (budget >= 35_000_000) return 58;
  if (budget > 0) return 42;
  return 35;
}

export function projectBaseline(input: ProjectCriteriaInput, seedSalt = "v1"): ProjectBaseline {
  const seed = hashString(`project:${seedSalt}:${input.id}:${input.code}`) % 2_147_483_647;
  const random = rng(seed);
  const budget = asNumber(input.budget_thb);
  const monthly = asNumber(input.monthly_ceiling);
  const margin = asNumber(input.gross_margin_pct);
  const teamSize = asNumber(input.team_size);
  const skillCount = (input.required_skills ?? []).length;
  const explicitSlots = normalizeSlots(input.project_slots);
  const suggestedSlots = slotTotal(explicitSlots) > 0
    ? explicitSlots
    : deriveProjectSlots({
        budget_thb: budget,
        monthly_ceiling: monthly,
        team_size: teamSize || null,
        required_skills: input.required_skills ?? [],
        priority: input.priority ?? "medium",
      });
  const slots = slotTotal(suggestedSlots);
  const budgetScore = budgetScale(budget);
  const priorityScore = priorityWeight(input.priority);
  const marginPenalty = margin > 0 ? clampInt(65 - margin * 2, 0, 55) : 20;
  const volatility = skillCount * 4 + slots * 3;

  const jitter = (span: number) => Math.round((random() - 0.5) * span);
  const complexity = clampInt(budgetScore * 0.35 + volatility + teamSize * 1.8 + jitter(10), 10, 100);
  const urgency = clampInt(priorityScore * 0.65 + asNumber(input.progress_pct) * 0.15 + jitter(12), 5, 100);
  const strategic = clampInt(priorityScore * 0.45 + budgetScore * 0.45 + skillCount * 2 + jitter(10), 10, 100);
  const risk = clampInt(complexity * 0.45 + urgency * 0.25 + marginPenalty + jitter(12), 5, 100);
  const aiLeverage = clampInt(30 + skillCount * 5 + (input.required_skills ?? []).filter((skill) => {
    const s = skill.toLowerCase();
    return s.includes("data") || s.includes("ai") || s.includes("cloud") || s.includes("technical");
  }).length * 8 + jitter(14), 5, 100);

  return {
    complexity_score: complexity,
    urgency_score: urgency,
    strategic_value_score: strategic,
    delivery_risk_score: risk,
    ai_leverage_score: aiLeverage,
    suggested_slots: suggestedSlots,
    seed,
    criteria: {
      priority: input.priority ?? null,
      status: input.status ?? null,
      budget_thb: budget || null,
      monthly_ceiling: monthly || null,
      gross_margin_pct: margin || null,
      required_skill_count: skillCount,
      team_size: teamSize || null,
      slot_total: slots,
    },
  };
}

export { ATTR_KEYS };
