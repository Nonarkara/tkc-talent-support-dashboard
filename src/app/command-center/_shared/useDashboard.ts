/**
 * Data hook for the command-center MVP.
 *
 * One fetch, parallel with KPIs. The chassis calls this once; each tab
 * reads from the returned payload. No tab makes its own fetch — the boss
 * flipping tabs does not re-hit the DB.
 *
 * Error handling is intentionally simple: empty arrays + a one-line error
 * message the chassis can surface. The Chronicle ritual and Sheets mirror
 * are totally unrelated to this path.
 */

"use client";

import { useCallback, useEffect, useState } from "react";
import { createCommandCharacters } from "@/lib/command-center-data";
import { firstName } from "@/lib/redact-name";
import {
  TKC_REAL_DEPARTMENTS,
  TKC_REAL_PROJECTS,
} from "@/lib/tkc-org";
import { DEFAULT_COMPETENCY_STANDARDS } from "@/lib/matrix-workshop-defaults";
import { CURRENT_CYCLE } from "@/lib/cycle";
import type {
  CompetencyStandard,
  DashboardPayload,
  DeptKpi,
  Employee,
  EmployeeAvailability,
  EmployeeProfileFacet,
  EmployeeSentiment,
  IntegrationStatus,
  Project,
  ProjectOutcome,
  ProjectVariance,
  WorldEvent,
  SupportActionRecord,
  TeamComposition,
} from "./types";

const FALLBACK_DIAGNOSTIC =
  "Using seeded TKC game data because the live dashboard API returned no playable roster/projects in this environment.";

const DEPT_SKILLS: Record<string, string[]> = {
  EXEC: ["customer_success", "delivery_ops", "data_analysis"],
  SALES: ["sales", "customer_success", "marketing"],
  BIZ_DEV: ["sales", "marketing", "survey", "customer_success"],
  PMO: ["delivery_ops", "technical", "data_analysis"],
  IMPL: ["technical", "delivery_ops", "survey"],
  ENG: ["technical", "data_analysis", "outsourcing_mgmt"],
  AI_COE: ["technical", "data_analysis", "survey"],
  DIGITAL: ["technical", "delivery_ops", "data_analysis"],
  DIG_PROD: ["technical", "marketing", "customer_success"],
  FINANCE: ["finance_paperwork", "data_analysis", "delivery_ops"],
  ACCT: ["finance_paperwork", "procurement", "data_analysis"],
  HR_GA: ["customer_success", "survey", "delivery_ops"],
  ORG_MGMT: ["delivery_ops", "survey", "data_analysis"],
  PROCURE: ["procurement", "outsourcing_mgmt", "finance_paperwork"],
  IT: ["technical", "delivery_ops", "procurement"],
};

function roleSkill(role: string) {
  if (["md", "deputy_md", "director"].includes(role)) return ["delivery_ops", "customer_success"];
  if (role === "manager") return ["delivery_ops"];
  return [];
}

function uniqueStrings(values: string[]) {
  return Array.from(new Set(values));
}

function seededEmployees(): Employee[] {
  return createCommandCharacters().map((character): Employee => {
    const skills = uniqueStrings([
      ...(DEPT_SKILLS[character.deptCode] ?? ["delivery_ops"]),
      ...roleSkill(character.role),
    ]);
    return {
      id: character.id,
      employee_code: character.id.toUpperCase(),
      display_name: character.nickname,
      full_name_th: character.nickname,
      full_name_en: character.nickname,
      nickname: character.nickname,
      email: `${character.id}@tkc.local`,
      role_level: character.role,
      title: character.roleEn,
      title_en: character.roleEn,
      level: character.level,
      tenure_years: character.tenure,
      salary_thb: character.capacityCost * 10_000,
      is_active: true,
      dept_code: character.deptCode,
      dept_name_en:
        TKC_REAL_DEPARTMENTS.find((dept) => dept.code === character.deptCode)?.nameEn ??
        character.deptCode,
      div_code: character.divisionCode,
      div_name_en: character.divisionCode,
      attr_str: character.attributes.str,
      attr_int: character.attributes.int,
      attr_wis: character.attributes.wis,
      attr_cha: character.attributes.cha,
      attr_dex: character.attributes.dex,
      attr_con: character.attributes.con,
      rpg_class: character.rpgClass,
      stat_locked: false,
      stat_source: "seeded fallback",
      skills,
      languages: ["Thai", "English"],
      certifications: character.role === "staff" ? [] : ["TKC Ops"],
      soft_skills: ["Ownership", "Collaboration"],
      competency_summary: skills.map((skill, index) => ({
        skill_key: skill,
        display_name:
          DEFAULT_COMPETENCY_STANDARDS.find((standard) => standard.skill_key === skill)
            ?.display_name ?? skill,
        actual_level: character.role === "staff" ? 3 : index === 0 ? 4 : 3,
        source: "seeded fallback",
        freshness: "fresh",
      })),
      active_allocations: [],
      active_project_count: 0,
      active_project_codes: [],
      evidence_freshness: "fresh",
      availability_fte: 0,
      xp: character.totalXp,
      traits: character.dailyGoals?.slice(0, 2) ?? [],
      perks: character.isCaptain ? ["Captain"] : [],
    };
  });
}

function seededProjects(): Project[] {
  return TKC_REAL_PROJECTS.map((project, index): Project => ({
    id: project.id,
    code: project.id.toUpperCase(),
    name: project.name,
    client_name: project.client,
    description: `${project.client} transformation quest`,
    status: "active",
    priority: project.priority,
    budget_thb: project.budgetThb ?? null,
    monthly_ceiling: project.monthlyCeiling ?? null,
    gross_margin_pct: project.grossMarginPct ?? null,
    required_skills: project.requiredSkills ?? [],
    team_size: project.teamSize ?? 4,
    progress_pct: project.progressPct,
    project_slots: null,
    complexity_score: Math.min(100, 62 + index * 4),
    urgency_score: project.priority === "critical" ? 92 : project.priority === "high" ? 78 : 58,
    strategic_value_score: project.priority === "critical" ? 90 : 72,
    delivery_risk_score: (project.grossMarginPct ?? 24) <= 18 ? 56 : 72,
    ai_leverage_score: project.deptCode === "DIGITAL" ? 86 : 64,
    config_locked: false,
    config_source: "seeded fallback",
    div_code: project.divisionCode,
    dept_code: project.deptCode,
    suggested_team_size: project.teamSize ?? 4,
    inferred_scale: (project.teamSize ?? 4) >= 6 ? "L" : (project.teamSize ?? 4) >= 4 ? "M" : "S",
    planned_fte: 0,
    actual_fte: null,
    planned_cost_thb: 0,
    actual_cost_thb: null,
    variance_pct: null,
    margin_risk: (project.grossMarginPct ?? 24) <= 18 ? "watch" : "stable",
  }));
}

function seededKpis(): DeptKpi[] {
  return TKC_REAL_DEPARTMENTS.slice(0, 8).map((dept, index) => ({
    id: `seed-kpi-${dept.code}`,
    code: dept.code,
    name: `${dept.nameEn} quest health`,
    target_value: 100,
    actual_value: 62 + index * 4,
    status: index % 3 === 0 ? "watch" : "on_track",
    cycle: CURRENT_CYCLE,
  }));
}

function seededProfileFacets(employees: Employee[]): EmployeeProfileFacet[] {
  return employees.map((employee) => ({
    employee_id: employee.id,
    languages: employee.languages ?? [],
    certifications: employee.certifications ?? [],
    soft_skills: employee.soft_skills ?? [],
    external_refs: {},
    updated_at: null,
  }));
}

function seededAvailability(employees: Employee[]): EmployeeAvailability[] {
  return employees.map((employee) => ({
    employee_id: employee.id,
    active_allocations: [],
    total_planned_fte: 0,
    total_actual_fte: 0,
    current_fte: 0,
    at_capacity: false,
    over_capacity: false,
    next_available_at: null,
  }));
}

function seededDashboard(diagnostics: string[] = []) {
  const employees = seededEmployees();
  return {
    employees,
    projects: seededProjects(),
    teams: [],
    support_actions: [],
    kpis: seededKpis(),
    competency_standards: DEFAULT_COMPETENCY_STANDARDS,
    outcomes: [],
    world_events: [],
    sentiment: [],
    employee_availability: seededAvailability(employees),
    employee_profile_facets: seededProfileFacets(employees),
    project_variance: [],
    integration_status: [
      {
        key: "seeded-playtest",
        label: "Seeded playtest data",
        status: "ready_for_import" as const,
        source: "local",
        note: "Local fallback is active for game QA.",
      },
    ],
    live: false,
    diagnostics: uniqueStrings([FALLBACK_DIAGNOSTIC, ...diagnostics]),
  };
}

function needsSeededFallback(dash: Record<string, unknown>) {
  return (
    !Array.isArray(dash.employees) ||
    !Array.isArray(dash.projects) ||
    dash.employees.length === 0 ||
    dash.projects.length === 0
  );
}

function normalizeEmployee(raw: Partial<Employee>): Employee {
  // PDPA: redact family names at the data boundary so every downstream
  // component sees first-name-only without each one having to remember.
  const givenName =
    firstName(raw.display_name) ||
    firstName(raw.nickname) ||
    firstName(raw.full_name_en) ||
    firstName(raw.full_name_th) ||
    raw.employee_code ||
    "Unknown Hero";
  return {
    id: raw.id ?? "unknown-hero",
    title: raw.title ?? raw.title_en ?? null,
    role_level: raw.role_level ?? "staff",
    dept_code: raw.dept_code ?? null,
    ...raw,
    // PDPA — these MUST land after the spread so they win over the raw
    // payload. Every name field that ships to the client is first-name only.
    display_name: givenName,
    nickname: raw.nickname ? firstName(raw.nickname) : raw.nickname,
    full_name_en: raw.full_name_en ? firstName(raw.full_name_en) : raw.full_name_en,
    full_name_th: raw.full_name_th ? firstName(raw.full_name_th) : raw.full_name_th,
  };
}

function normalizeProject(raw: Partial<Project>): Project {
  return {
    id: raw.id ?? raw.code ?? "unnamed-project",
    code: raw.code ?? "UNNAMED",
    name: raw.name ?? raw.code ?? "Untitled Project",
    required_skills: Array.isArray(raw.required_skills) ? raw.required_skills : [],
    ...raw,
  };
}

export function useDashboard(): DashboardPayload {
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [teams, setTeams] = useState<TeamComposition[]>([]);
  const [supportActions, setSupportActions] = useState<SupportActionRecord[]>(
    [],
  );
  const [kpis, setKpis] = useState<DeptKpi[]>([]);
  const [competencyStandards, setCompetencyStandards] = useState<CompetencyStandard[]>([]);
  const [employeeAvailability, setEmployeeAvailability] = useState<EmployeeAvailability[]>([]);
  const [employeeProfileFacets, setEmployeeProfileFacets] = useState<EmployeeProfileFacet[]>([]);
  const [sentiment, setSentiment] = useState<EmployeeSentiment[]>([]);
  const [projectVariance, setProjectVariance] = useState<ProjectVariance[]>([]);
  const [outcomes, setOutcomes] = useState<ProjectOutcome[]>([]);
  const [worldEvents, setWorldEvents] = useState<WorldEvent[]>([]);
  const [integrationStatus, setIntegrationStatus] = useState<IntegrationStatus[]>([]);
  const [live, setLive] = useState(false);
  const [diagnostics, setDiagnostics] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const dashRes = await fetch("/api/db/dashboard", {
        credentials: "same-origin",
        headers: { Accept: "application/json" },
      });

      // If the middleware bounced us to /login (HTML, not JSON), don't
      // fall back to mock data — redirect the user to authenticate.
      const contentType = dashRes.headers.get("content-type") ?? "";
      if (!contentType.includes("application/json")) {
        if (typeof window !== "undefined") {
          window.location.href = `/login?next=${encodeURIComponent(window.location.pathname + window.location.search)}`;
        }
        return;
      }

      const dash = await dashRes.json();
      if (!dashRes.ok) {
        throw new Error(dash.error ?? `HTTP ${dashRes.status}`);
      }

      // Always use what the API returned. No seeded fallback —
      // mock people overwriting real people is worse than empty arrays.
      // If the DB is empty, it's empty. The UI shows that honestly.
      setEmployees(
        Array.isArray(dash.employees)
          ? dash.employees.map((employee: Partial<Employee>) => normalizeEmployee(employee))
          : [],
      );
      setProjects(
        Array.isArray(dash.projects)
          ? dash.projects.map((project: Partial<Project>) => normalizeProject(project))
          : [],
      );
      setTeams(Array.isArray(dash.teams) ? dash.teams : []);
      setSupportActions(Array.isArray(dash.support_actions) ? dash.support_actions : []);
      setCompetencyStandards(
        Array.isArray(dash.competency_standards) ? dash.competency_standards : [],
      );
      setEmployeeAvailability(
        Array.isArray(dash.employee_availability) ? dash.employee_availability : [],
      );
      setEmployeeProfileFacets(
        Array.isArray(dash.employee_profile_facets) ? dash.employee_profile_facets : [],
      );
      setSentiment(Array.isArray(dash.sentiment) ? dash.sentiment : []);
      setProjectVariance(Array.isArray(dash.project_variance) ? dash.project_variance : []);
      setOutcomes(Array.isArray(dash.outcomes) ? dash.outcomes : []);
      setWorldEvents(Array.isArray(dash.world_events) ? dash.world_events : []);
      setIntegrationStatus(Array.isArray(dash.integration_status) ? dash.integration_status : []);
      setKpis(Array.isArray(dash.kpis) ? dash.kpis : []);
      setLive(Boolean(dash.live));
      setDiagnostics(Array.isArray(dash.diagnostics) ? dash.diagnostics : []);
    } catch (err) {
      // No mock-data fallback. Show empty + error so the user knows
      // the load failed instead of getting fake names.
      setEmployees([]);
      setProjects([]);
      setTeams([]);
      setSupportActions([]);
      setCompetencyStandards([]);
      setEmployeeAvailability([]);
      setEmployeeProfileFacets([]);
      setSentiment([]);
      setProjectVariance([]);
      setOutcomes([]);
      setWorldEvents([]);
      setIntegrationStatus([]);
      setKpis([]);
      setLive(false);
      setError(err instanceof Error ? err.message : "Dashboard fetch failed.");
      setDiagnostics([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  return {
    employees,
    projects,
    teams,
    support_actions: supportActions,
    kpis,
    competency_standards: competencyStandards,
    employee_availability: employeeAvailability,
    employee_profile_facets: employeeProfileFacets,
    sentiment,
    project_variance: projectVariance,
    outcomes,
    world_events: worldEvents,
    integration_status: integrationStatus,
    live,
    diagnostics,
    loading,
    error,
    refresh,
    updateCompetencyStandards: setCompetencyStandards,
  };
}
