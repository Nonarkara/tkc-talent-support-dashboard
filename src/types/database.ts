/**
 * Database types matching Supabase schema (migrations 001-018)
 * These will eventually be auto-generated via `supabase gen types`
 */

// ─── ENUMS ───────────────────────────────────────────────

export type RoleLevel = "md" | "deputy_md" | "director" | "manager" | "senior" | "staff";
export type ContributionStatus = "pending" | "verified" | "rejected";
export type PointsType = "contribution" | "badge_bonus" | "manager_award" | "streak_bonus" | "level_up_bonus" | "adjustment";
export type BadgeTier = "bronze" | "silver" | "gold" | "platinum";
export type BadgeCriteriaType = "count" | "points" | "streak" | "custom";
export type CategoryCode = "cause" | "career" | "compensation" | "community";
export type PillarCode = "belonging" | "purpose" | "transcendence" | "story";
export type Mood = "energized" | "focused" | "neutral" | "tired" | "stressed";

// ─── CORE TABLES (migrations 001-011) ────────────────────

export interface Division {
  id: string;
  code: string;
  name_th: string;
  name_en: string;
  head_title_th: string | null;
  head_title_en: string | null;
  color: string;
  sort_order: number;
  created_at: string;
}

export interface Department {
  id: string;
  name_th: string;
  name_en: string;
  code: string;
  head_user_id: string | null;
  division_id: string | null;
  color: string;
  sort_order: number;
  created_at: string;
}

export interface User {
  id: string;
  employee_id: string | null;
  full_name_th: string;
  full_name_en: string | null;
  nickname: string | null;
  email: string;
  avatar_url: string | null;
  department_id: string | null;
  division_id: string | null;
  role: "employee" | "manager" | "admin";
  role_level: RoleLevel;
  tenure_years: number;
  title_th: string | null;
  title_en: string | null;
  skills: string[];
  level: number;
  total_points: number;
  streak_days: number;
  joined_at: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface ContributionCategory {
  id: string;
  code: CategoryCode;
  name_th: string;
  name_en: string;
  description_th: string | null;
  description_en: string | null;
  icon: string | null;
  color: string | null;
  sort_order: number;
}

export interface ContributionType {
  id: string;
  category_id: string;
  code: string;
  name_th: string;
  name_en: string;
  description_th: string | null;
  description_en: string | null;
  base_points: number;
  is_active: boolean;
}

export interface Contribution {
  id: string;
  user_id: string;
  type_id: string;
  title: string;
  description: string | null;
  evidence_url: string | null;
  status: ContributionStatus;
  verified_by: string | null;
  verified_at: string | null;
  rejection_note: string | null;
  points_awarded: number | null;
  submitted_at: string;
  created_at: string;
}

export interface PointsTransaction {
  id: string;
  user_id: string;
  amount: number;
  type: PointsType;
  reference_id: string | null;
  description_th: string | null;
  description_en: string | null;
  created_at: string;
}

export interface BadgeDefinition {
  id: string;
  code: string;
  name_th: string;
  name_en: string;
  description_th: string;
  description_en: string;
  icon_url: string | null;
  category_id: string | null;
  tier: BadgeTier;
  criteria_type: BadgeCriteriaType;
  criteria_value: number | null;
  criteria_json: Record<string, unknown> | null;
  bonus_points: number;
  is_active: boolean;
  created_at: string;
}

export interface BadgeAward {
  id: string;
  user_id: string;
  badge_id: string;
  awarded_at: string;
}

export interface ActivityLog {
  id: string;
  user_id: string | null;
  action: string;
  entity_type: string | null;
  entity_id: string | null;
  metadata: Record<string, unknown>;
  created_at: string;
}

export interface Project {
  id: string;
  code: string;
  name_th: string;
  name_en: string | null;
  client_name: string | null;
  description: string | null;
  status: "planning" | "active" | "completed" | "on_hold";
  priority: "low" | "medium" | "high" | "critical";
  team_id: string | null;
  budget_thb: number | null;
  start_date: string | null;
  end_date: string | null;
  progress_pct: number;
  created_at: string;
  updated_at: string;
}

export interface EmployeeAttributes {
  id: string;
  user_id: string;
  str: number;
  int: number;
  wis: number;
  cha: number;
  dex: number;
  con: number;
  rpg_class: string | null;
  notes: string | null;
  updated_at: string;
  updated_by: string | null;
}

export interface CredoScore {
  id: string;
  user_id: string;
  team_id: string | null;
  period_start: string;
  period_end: string;
  belonging: number | null;
  purpose: number | null;
  transcendence: number | null;
  story: number | null;
  overall: number | null;
  from_attributes: Record<string, unknown> | null;
  from_pulse: Record<string, unknown> | null;
  created_at: string;
}

export interface CredoPulse {
  id: string;
  user_id: string;
  pillar: PillarCode;
  score: number;
  question_th: string | null;
  note: string | null;
  submitted_at: string;
}

// ─── CONSULTANT DATA (migration 013) ────────────────────

export interface Observation {
  id: string;
  observer_id: string;
  subject_user_id: string | null;
  subject_team_id: string | null;
  observation_type: "interview" | "shadow" | "meeting" | "informal" | "workshop" | "town_hall";
  content: string;
  tags: string[];
  sentiment: "positive" | "neutral" | "negative" | "mixed" | null;
  credo_signals: Record<string, unknown>;
  is_confidential: boolean;
  observed_at: string;
  created_at: string;
}

export interface InterviewRecord {
  id: string;
  interviewer_id: string;
  interviewee_id: string | null;
  interviewee_name: string | null;
  interview_type: "one_on_one" | "group" | "exit" | "onboarding" | "stakeholder" | "client";
  key_findings: string[];
  pain_points: string[];
  opportunities: string[];
  quotes: string[];
  credo_signals: Record<string, unknown>;
  four_c_signals: Record<string, unknown>;
  duration_minutes: number | null;
  is_recorded: boolean;
  transcript_url: string | null;
  conducted_at: string;
  created_at: string;
}

export interface ProcessMap {
  id: string;
  department_id: string | null;
  division_id: string | null;
  process_name_th: string;
  process_name_en: string | null;
  current_state: string | null;
  pain_points: string[];
  improvement_ideas: string[];
  stakeholders: string[];
  complexity: "simple" | "moderate" | "complex" | "chaotic" | null;
  ai_potential: "none" | "low" | "medium" | "high" | "transformative" | null;
  mapped_by: string | null;
  mapped_at: string;
  created_at: string;
}

// ─── DAILY GOALS (migration 014) ─────────────────────────

export interface DailyGoal {
  id: string;
  user_id: string;
  date: string;
  morning_input: string | null;
  goals: { text: string; category?: string; estimated_hours?: number }[];
  check_in_at: string | null;
  evening_input: string | null;
  completion_status: { goal_index: number; completed: boolean; notes?: string }[];
  overall_completion_pct: number | null;
  check_out_at: string | null;
  mood: Mood | null;
  blocker: string | null;
  points_earned: number;
  created_at: string;
}

// ─── KNOWLEDGE MANAGEMENT (migration 015) ────────────────

export type KnowledgeEntryType = "share" | "interview_note" | "retrospective" | "observation" | "idea" | "lesson" | "template" | "how_to" | "case_study";
export type KnowledgeVisibility = "public" | "team" | "private" | "consultant_only";

export interface KnowledgeEntry {
  id: string;
  author_id: string;
  entry_type: KnowledgeEntryType;
  title_th: string;
  title_en: string | null;
  content: string;
  summary: string | null;
  tags: string[];
  related_project_id: string | null;
  related_department_id: string | null;
  related_division_id: string | null;
  visibility: KnowledgeVisibility;
  view_count: number;
  helpful_count: number;
  points_awarded: number;
  created_at: string;
  updated_at: string;
}

export interface KnowledgeLink {
  id: string;
  source_id: string;
  target_id: string;
  link_type: "relates_to" | "builds_on" | "contradicts" | "supersedes" | "inspired_by";
  created_by: string | null;
  created_at: string;
}

export interface KnowledgeReaction {
  id: string;
  entry_id: string;
  user_id: string;
  reaction: "helpful" | "bookmark" | "applied";
  created_at: string;
}

// ─── PEER RECOGNITION (migration 016) ────────────────────

export interface Recognition {
  id: string;
  from_user_id: string;
  to_user_id: string;
  category_code: CategoryCode;
  message: string;
  message_th: string | null;
  points_awarded: number;
  is_public: boolean;
  created_at: string;
}

// ─── FINANCIAL SNAPSHOTS (migration 017) ──────────────────

export interface FinancialSnapshot {
  id: string;
  period: string;
  period_type: "quarterly" | "annual";
  fiscal_year: number;
  revenue_thb: number | null;
  cost_of_sales_thb: number | null;
  gross_profit_thb: number | null;
  gross_margin_pct: number | null;
  operating_expenses_thb: number | null;
  net_profit_thb: number | null;
  net_margin_pct: number | null;
  eps_thb: number | null;
  revenue_project_thb: number | null;
  revenue_services_thb: number | null;
  revenue_sales_thb: number | null;
  revenue_other_thb: number | null;
  total_assets_thb: number | null;
  total_liabilities_thb: number | null;
  total_equity_thb: number | null;
  cash_thb: number | null;
  total_debt_thb: number | null;
  operating_cf_thb: number | null;
  investing_cf_thb: number | null;
  financing_cf_thb: number | null;
  stock_price_thb: number | null;
  pe_ratio: number | null;
  pb_ratio: number | null;
  market_cap_thb: number | null;
  dividend_yield_pct: number | null;
  roe_pct: number | null;
  roa_pct: number | null;
  debt_to_equity: number | null;
  current_ratio: number | null;
  employee_count: number | null;
  revenue_per_employee: number | null;
  employee_cost_thb: number | null;
  notes: string | null;
  source: string;
  created_at: string;
}

// ─── CAPABILITY HEATMAP (migration 018) ──────────────────

export interface SkillAssessment {
  id: string;
  user_id: string;
  skill_name: string;
  skill_category: "technical" | "leadership" | "domain" | "tool" | "soft_skill" | "certification";
  proficiency: number; // 1-5
  source: "self" | "peer" | "manager" | "certification" | "project" | "assessment";
  validated_by: string | null;
  evidence_url: string | null;
  notes: string | null;
  assessed_at: string;
  expires_at: string | null;
}

export interface SkillAdjacency {
  id: string;
  skill_a: string;
  skill_b: string;
  transition_ease: number; // 0.0-1.0
  notes: string | null;
}

// ─── JOINED / VIEW TYPES ─────────────────────────────────

export interface ContributionWithDetails extends Contribution {
  user?: User;
  contribution_type?: ContributionType & {
    contribution_category?: ContributionCategory;
  };
  verifier?: User;
}

export interface BadgeWithAward extends BadgeDefinition {
  awarded?: boolean;
  awarded_at?: string | null;
}

export interface LeaderboardEntry {
  user_id: string;
  full_name_th: string;
  full_name_en: string | null;
  nickname: string | null;
  avatar_url: string | null;
  department_code: string;
  department_name_th: string;
  level: number;
  total_points: number;
  period_points: number;
  rank: number;
}

export interface DailyGoalWithUser extends DailyGoal {
  user?: { nickname: string; department_id: string };
}

export interface ObservationWithContext extends Observation {
  observer?: { nickname: string };
  subject_user?: { nickname: string } | null;
}

export interface FinancialTrend {
  snapshots: FinancialSnapshot[];
  latest: FinancialSnapshot;
  revenue_trend: { period: string; value: number }[];
  margin_trend: { period: string; value: number }[];
}
