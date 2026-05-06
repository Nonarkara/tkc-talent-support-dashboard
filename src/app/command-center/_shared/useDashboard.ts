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

function normalizeEmployee(raw: Partial<Employee>): Employee {
  return {
    id: raw.id ?? "unknown-hero",
    display_name:
      raw.display_name ??
      raw.nickname ??
      raw.full_name_en ??
      raw.full_name_th ??
      raw.employee_code ??
      "Unknown Hero",
    title: raw.title ?? raw.title_en ?? null,
    role_level: raw.role_level ?? "staff",
    dept_code: raw.dept_code ?? null,
    ...raw,
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
      const dashRes = await fetch("/api/db/dashboard");
      const dash = await dashRes.json();
      if (!dashRes.ok) {
        throw new Error(dash.error ?? `HTTP ${dashRes.status}`);
      }
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
      setError(err instanceof Error ? err.message : "Failed to load");
      setLive(false);
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
