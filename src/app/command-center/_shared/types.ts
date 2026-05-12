/**
 * Shared types for the command-center MVP.
 *
 * Only what the four tabs + the chassis need. Deeper internal shapes live
 * inside each tab's own file. Keep this file tight — when a tab needs a new
 * field, add it here, not in five places.
 *
 * These shapes mirror the `/api/db/dashboard` response contract (see
 * `src/app/api/db/dashboard/route.ts`). When the route adds a column, this
 * file is the first place to update.
 */

import type { EmployeeLike } from "@/components/PlayerCard";
import type { SentimentRuleModifiers, SentimentSignal } from "@/lib/sentiment-engine";

export type RouteScreen =
  | "cockpit"
  | "fixture"
  | "formation"
  | "ninja"
  | "matrix"
  | "roster"
  | "signals"
  | "lobby"
  | "ledger"
  | "insights";

export type Screen = "home" | RouteScreen;

export type CompetencyFreshness = "fresh" | "aging" | "stale" | "unknown";

export interface CompetencyStandard {
  id?: string;
  skill_key: string;
  display_name: string;
  framework_source: string;
  framework_id?: string | null;
  category?: string | null;
  descriptors?: Record<string, string> | null;
  weight?: number | null;
  recency_window_days?: number | null;
  expected_level?: number | null;
  evidence_policy?: string | null;
  linked_dimensions?: string[] | null;
  active?: boolean;
  external_refs?: Record<string, unknown> | null;
  sort_order?: number | null;
  updated_at?: string | null;
}

export interface CompetencySignal {
  skill_key: string;
  display_name: string;
  framework_source?: string | null;
  framework_id?: string | null;
  expected_level?: number | null;
  actual_level?: number | null;
  source?: string | null;
  assessed_at?: string | null;
  freshness_days?: number | null;
  freshness: CompetencyFreshness;
  gap?: number | null;
  weight?: number | null;
  linked_dimensions?: string[] | null;
}

export interface ActiveAllocation {
  id: string;
  employee_id: string;
  project_id?: string | null;
  project_code?: string | null;
  project_name?: string | null;
  quest_id?: string | null;
  quest_code?: string | null;
  quest_title?: string | null;
  coe_name?: string | null;
  slot_key?: string | null;
  assignment_label?: string | null;
  fte: number;
  planned_or_actual: "planned" | "actual";
  status: string;
  start_date?: string | null;
  end_date?: string | null;
  source?: string | null;
  external_id?: string | null;
  metadata?: Record<string, unknown> | null;
}

export interface EmployeeAvailability {
  employee_id: string;
  active_allocations: ActiveAllocation[];
  total_planned_fte: number;
  total_actual_fte: number;
  current_fte: number;
  at_capacity: boolean;
  over_capacity: boolean;
  next_available_at?: string | null;
}

export interface EmployeeProfileFacet {
  employee_id: string;
  languages: string[];
  certifications: string[];
  soft_skills: string[];
  external_refs?: Record<string, unknown> | null;
  updated_at?: string | null;
}

export interface EmployeeSentiment extends SentimentSignal {
  employee_id: string;
  sample_count: number;
  source_mix: string[];
  rules: SentimentRuleModifiers;
}

export interface ProjectVariance {
  project_id: string;
  project_code: string;
  project_name: string;
  planned_fte: number;
  actual_fte: number | null;
  planned_cost_thb: number;
  actual_cost_thb: number | null;
  variance_pct: number | null;
  margin_risk: "stable" | "watch" | "high";
  source_label?: string | null;
}

export interface IntegrationStatus {
  key: string;
  label: string;
  status: "connected" | "ready_for_import" | "planned";
  source: string;
  note: string;
}

export interface Employee extends EmployeeLike {
  employee_code?: string | null;
  full_name_th?: string;
  full_name_en?: string | null;
  nickname?: string | null;
  email?: string | null;
  title?: string | null;
  title_en?: string | null;
  level?: number | null;
  tenure_years?: number | null;
  salary_thb?: number | null;
  is_active?: boolean;
  dept_name_en?: string | null;
  div_code?: string | null;
  div_name_en?: string | null;
  rpg_class?: string | null;
  stat_locked?: boolean | null;
  stat_lock_reason?: string | null;
  stat_source?: string | null;
  stat_criteria?: Record<string, unknown> | null;
  /** Ninja-squad skill tokens. Seeded by migration 013; overlaid by
   *  Phase-2 interview-ai rows from `skill_assessments`. */
  skills?: string[] | null;
  languages?: string[] | null;
  certifications?: string[] | null;
  soft_skills?: string[] | null;
  competency_summary?: CompetencySignal[] | null;
  active_allocations?: ActiveAllocation[] | null;
  active_project_count?: number | null;
  active_project_codes?: string[] | null;
  next_available_at?: string | null;
  evidence_freshness?: CompetencyFreshness | null;
  availability_fte?: number | null;
  sentiment?: EmployeeSentiment | null;
  xp?: number | null;
  traits?: string[] | null;
  perks?: string[] | null;
  // ─── May 2026 dossier fields ─────────────────────────────────────────
  title_prefix?: string | null;          // นาย / นาง / นางสาว
  gender?: "m" | "f" | null;
  gender_override?: string | null;
  date_of_birth?: string | null;         // ISO YYYY-MM-DD
  education_level?: string | null;       // ปริญญาตรี / โท / เอก
  education_school?: string | null;
  education_faculty?: string | null;
  education_major?: string | null;
  section_th?: string | null;
  resign_date?: string | null;
  resign_status?: "presumed_departed" | "confirmed" | "none" | null;
  joined_at?: string | null;
}

export interface Project {
  id: string;
  code: string;
  name: string;
  client_name?: string | null;
  description?: string | null;
  status?: string | null;
  priority?: string | null;
  budget_thb?: number | null;
  monthly_ceiling?: number | null;
  gross_margin_pct?: number | null;
  required_skills?: string[] | null;
  team_size?: number | null;
  progress_pct?: number | null;
  project_slots?: Record<string, number> | null;
  priority_weights?: Record<string, number> | null;
  complexity_score?: number | null;
  urgency_score?: number | null;
  strategic_value_score?: number | null;
  delivery_risk_score?: number | null;
  ai_leverage_score?: number | null;
  config_locked?: boolean | null;
  config_lock_reason?: string | null;
  config_source?: string | null;
  config_criteria?: Record<string, unknown> | null;
  div_code?: string | null;
  dept_code?: string | null;
  suggested_team_size?: number | null;
  inferred_scale?: "S" | "M" | "L" | "XL" | null;
  planned_fte?: number | null;
  actual_fte?: number | null;
  planned_cost_thb?: number | null;
  actual_cost_thb?: number | null;
  variance_pct?: number | null;
  margin_risk?: "stable" | "watch" | "high" | null;
}

export interface TeamComposition {
  id: string;
  project_id: string;
  project_code: string;
  coach_id?: string | null;
  coach_code?: string | null;
  player_ids?: string[] | null;
  formation?: string | null;
  chemistry_score?: number | null;
  overall_score?: number | null;
  allocation_pcts?: Record<string, number> | null;
  insights?: unknown;
}

export interface SupportActionRecord {
  id: string;
  employee_id: string;
  cycle: string;
  action_type: string;
  title: string;
  note?: string | null;
  status: string;
  owner_employee_id?: string | null;
  owner_nickname?: string | null;
  owner_full_name_en?: string | null;
  owner_full_name_th?: string | null;
  created_at: string;
  updated_at: string;
}

export interface DeptKpi {
  id?: string;
  code: string;
  name?: string | null;
  target_value?: number | null;
  actual_value?: number | null;
  status?: string | null;
  cycle?: string | null;
}

export interface ProjectOutcome {
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

export interface WorldEvent {
  id: string;
  event_date: string;
  code: string;
  name: string;
  description: string | null;
  modifier_type: string;
  impact_json: Record<string, unknown> | null;
}

export interface DashboardPayload {
  employees: Employee[];
  projects: Project[];
  teams: TeamComposition[];
  support_actions: SupportActionRecord[];
  kpis: DeptKpi[];
  competency_standards: CompetencyStandard[];
  outcomes: ProjectOutcome[];
  world_events: WorldEvent[];
  sentiment: EmployeeSentiment[];
  employee_availability: EmployeeAvailability[];
  employee_profile_facets: EmployeeProfileFacet[];
  project_variance: ProjectVariance[];
  integration_status: IntegrationStatus[];
  live: boolean;
  diagnostics: string[];
  loading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
  updateCompetencyStandards: (standards: CompetencyStandard[]) => void;
}
