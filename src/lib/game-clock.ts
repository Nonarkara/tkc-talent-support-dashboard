/**
 * Game Clock — The Real-Time World State Engine
 *
 * Like Animal Crossing: the world keeps ticking even when you're not playing.
 * When you log in, the game computes "what should have happened" since last time.
 *
 * Responsibilities:
 * 1. Compute project lifecycle states from dates + allocations
 * 2. Compute employee availability (who's deployed, who's free)
 * 3. Detect state transitions (project started, project ended)
 * 4. Generate the "while you were away" event feed
 */

import { query } from "./db";
import { CURRENT_CYCLE } from "@/lib/cycle";

// ─── TYPES ─────────────────────────────────────────────────

export type ProjectGameStatus =
  | "open"        // No team assigned, accepting proposals
  | "drafting"    // Director is forming a team
  | "pending"     // Team locked, awaiting CEO approval
  | "active"      // Approved, running, employees deployed
  | "completed"   // Finished, awaiting outcome recording
  | "resolved"    // Outcomes recorded, fully done
  | "cancelled";  // Killed before completion

export type EmployeeAvailability =
  | "available"   // Free to draft
  | "deployed"    // On active project
  | "recovering"  // Just finished, resting
  | "overloaded"; // >100% FTE across assignments

export interface GameEvent {
  id: string;
  type: GameEventType;
  projectId?: string;
  projectName?: string;
  employeeId?: string;
  employeeName?: string;
  directorId?: string;
  directorName?: string;
  description: string;
  descriptionTh: string;
  createdAt: Date;
  read: boolean;
}

export type GameEventType =
  | "project_started"
  | "project_completed"
  | "team_locked"
  | "team_approved"
  | "outcome_recorded"
  | "employee_deployed"
  | "employee_returned"
  | "stat_changed"
  | "random_event"
  | "quarter_end";

export interface ProjectState {
  projectId: string;
  code: string;
  name: string;
  client: string;
  gameStatus: ProjectGameStatus;
  directorId: string | null;
  directorName: string | null;
  teamSize: number;
  teamCostCp: number;
  predictedScore: number | null;
  progressPct: number; // computed from dates
  startDate: Date | null;
  endDate: Date | null;
  daysUntilStart: number | null;
  daysUntilDeadline: number | null;
  daysOverdue: number | null;
  budgetThb: number | null;
  marginPct: number | null;
  outcomeRecorded: boolean;
}

export interface EmployeeState {
  employeeId: string;
  name: string;
  nickname: string;
  availability: EmployeeAvailability;
  totalFte: number; // sum of active allocations
  activeProjects: { projectId: string; projectName: string; fte: number; role: string }[];
  currentHp: number;
  currentMp: number;
  currentForm: number;
  recoveryDaysLeft: number;
}

export interface WorldState {
  computedAt: Date;
  cycle: string; // e.g. "2026-Q2"
  daysIntoCycle: number;
  projects: ProjectState[];
  employees: EmployeeState[];
  events: GameEvent[];
  pendingReviews: ProjectState[]; // completed but no outcome yet
  openFixtures: ProjectState[];   // open or drafting
  activeMatches: ProjectState[];  // active projects
  resolvedMatches: ProjectState[]; // resolved with outcomes
  notifications: GameEvent[];     // unread events
}

// ─── CONFIG ────────────────────────────────────────────────

const RECOVERY_DAYS_AFTER_PROJECT = 3; // days before employee is "available" again
const DEFAULT_CYCLE = CURRENT_CYCLE;

// ─── HELPERS ───────────────────────────────────────────────

function daysBetween(a: Date, b: Date): number {
  const ms = b.getTime() - a.getTime();
  return Math.floor(ms / (1000 * 60 * 60 * 24));
}

function computeProgress(start: Date, end: Date, now: Date): number {
  if (now < start) return 0;
  if (now > end) return 100;
  const total = end.getTime() - start.getTime();
  const elapsed = now.getTime() - start.getTime();
  return Math.min(100, Math.max(0, Math.round((elapsed / total) * 100)));
}

function getCycle(now: Date): string {
  const y = now.getFullYear();
  const m = now.getMonth() + 1;
  const q = m <= 3 ? "Q1" : m <= 6 ? "Q2" : m <= 9 ? "Q3" : "Q4";
  return `${y}-${q}`;
}

function daysIntoQuarter(now: Date): number {
  const y = now.getFullYear();
  const m = now.getMonth();
  const qStart = new Date(y, m <= 2 ? 0 : m <= 5 ? 3 : m <= 8 ? 6 : 9, 1);
  return daysBetween(qStart, now);
}

// ─── WORLD STATE COMPUTATION ───────────────────────────────

interface RawProject {
  id: string;
  code: string;
  name: string;
  client_name: string | null;
  status: string; // DB status: planning, active, completed, on_hold
  priority: string;
  budget_thb: number | null;
  monthly_ceiling: number | null;
  gross_margin_pct: number | null;
  team_size: number | null;
  progress_pct: number;
  start_date: string | null;
  end_date: string | null;
  created_at: string;
  director_id: string | null;
  director_name: string | null;
}

interface RawAllocation {
  project_id: string;
  employee_id: string;
  employee_name: string;
  employee_nickname: string;
  fte: number;
  planned_or_actual: string;
  status: string;
  start_date: string | null;
  end_date: string | null;
  assignment_label: string;
}

interface RawOutcome {
  project_id: string;
}

interface RawAttribute {
  employee_id: string;
  str: number;
  int: number;
  wis: number;
  cha: number;
  dex: number;
  con: number;
  rpg_class: string | null;
}

/**
 * Compute the complete world state at a given moment.
 * This is the "lazy evaluation" heart of the real-time engine:
 * no background jobs needed — we just compute what the world
 * should look like right now.
 */
export async function computeWorldState(now = new Date()): Promise<WorldState> {
  const [projects, allocations, outcomes, attributes] = await Promise.all([
    fetchProjects(),
    fetchActiveAllocations(now),
    fetchOutcomes(),
    fetchAttributes(),
  ]);

  const outcomeProjectIds = new Set(outcomes.map((o) => o.project_id));

  // Build project states
  const projectStates: ProjectState[] = projects.map((p) => {
    const start = p.start_date ? new Date(p.start_date) : null;
    const end = p.end_date ? new Date(p.end_date) : null;

    const projAllocs = allocations.filter((a) => a.project_id === p.id);
    const hasLockedTeam = projAllocs.some((a) => a.planned_or_actual === "actual" || a.status === "active");
    const isDrafting = projAllocs.some((a) => a.planned_or_actual === "planned" && a.status === "planned");

    let gameStatus: ProjectGameStatus;
    if (outcomeProjectIds.has(p.id)) {
      gameStatus = "resolved";
    } else if (p.status === "completed" || (end && now > end)) {
      gameStatus = "completed";
    } else if (p.status === "on_hold") {
      gameStatus = "cancelled";
    } else if (p.status === "active" || (start && now >= start && end && now <= end)) {
      gameStatus = "active";
    } else if (hasLockedTeam) {
      gameStatus = "pending";
    } else if (isDrafting) {
      gameStatus = "drafting";
    } else {
      gameStatus = "open";
    }

    const progress = start && end ? computeProgress(start, end, now) : p.progress_pct;

    return {
      projectId: p.id,
      code: p.code,
      name: p.name,
      client: p.client_name ?? "",
      gameStatus,
      directorId: p.director_id,
      directorName: p.director_name,
      teamSize: projAllocs.length,
      teamCostCp: 0, // computed below if needed
      predictedScore: null, // loaded from team_snapshots if needed
      progressPct: progress,
      startDate: start,
      endDate: end,
      daysUntilStart: start && now < start ? daysBetween(now, start) : null,
      daysUntilDeadline: end && now < end ? daysBetween(now, end) : null,
      daysOverdue: end && now > end ? daysBetween(end, now) : null,
      budgetThb: p.budget_thb ? Number(p.budget_thb) : null,
      marginPct: p.gross_margin_pct ? Number(p.gross_margin_pct) : null,
      outcomeRecorded: outcomeProjectIds.has(p.id),
    };
  });

  // Build employee states
  const employeeMap = new Map<string, EmployeeState>();

  for (const a of allocations) {
    if (!employeeMap.has(a.employee_id)) {
      const attr = attributes.find((at) => at.employee_id === a.employee_id);
      employeeMap.set(a.employee_id, {
        employeeId: a.employee_id,
        name: a.employee_name,
        nickname: a.employee_nickname,
        availability: "available",
        totalFte: 0,
        activeProjects: [],
        currentHp: computeHpFromAttributes(attr),
        currentMp: computeMpFromAttributes(attr),
        currentForm: 5, // baseline, evolved by match-engine
        recoveryDaysLeft: 0,
      });
    }

    const emp = employeeMap.get(a.employee_id)!;

    // Only count "active" or "actual" allocations as real deployment
    const isActive = a.status === "active" || a.planned_or_actual === "actual";
    if (isActive) {
      emp.totalFte += Number(a.fte);
      emp.activeProjects.push({
        projectId: a.project_id,
        projectName: projects.find((p) => p.id === a.project_id)?.name ?? "",
        fte: Number(a.fte),
        role: a.assignment_label || "member",
      });
    }
  }

  // Determine availability
  for (const emp of employeeMap.values()) {
    if (emp.totalFte >= 1.0) {
      emp.availability = "deployed";
    } else if (emp.totalFte > 0) {
      emp.availability = "available"; // partial allocation is still available
    }
    if (emp.totalFte > 1.0) {
      emp.availability = "overloaded";
    }
  }

  // Load predicted scores from latest team_snapshot
  const snapshots = await fetchLatestSnapshots(projectStates.map((p) => p.projectId));
  for (const s of snapshots) {
    const proj = projectStates.find((p) => p.projectId === s.project_id);
    if (proj) {
      proj.predictedScore = s.overall_score ?? null;
    }
  }

  // Categorize
  const pendingReviews = projectStates.filter((p) => p.gameStatus === "completed");
  const openFixtures = projectStates.filter((p) => p.gameStatus === "open" || p.gameStatus === "drafting");
  const activeMatches = projectStates.filter((p) => p.gameStatus === "active" || p.gameStatus === "pending");
  const resolvedMatches = projectStates.filter((p) => p.gameStatus === "resolved");

  // Generate events
  const events = generateEvents(projectStates, allocations, now);

  return {
    computedAt: now,
    cycle: getCycle(now),
    daysIntoCycle: daysIntoQuarter(now),
    projects: projectStates,
    employees: Array.from(employeeMap.values()),
    events,
    pendingReviews,
    openFixtures,
    activeMatches,
    resolvedMatches,
    notifications: events.filter((e) => !e.read),
  };
}

// ─── DB FETCHERS ───────────────────────────────────────────

async function fetchProjects(): Promise<RawProject[]> {
  const rows = await query<RawProject>(`
    SELECT
      p.id, p.code, p.name, p.client_name, p.status, p.priority,
      p.budget_thb, p.monthly_ceiling, p.gross_margin_pct,
      p.team_size, p.progress_pct, p.start_date, p.end_date, p.created_at,
      e.id AS director_id,
      e.nickname AS director_name
    FROM projects p
    LEFT JOIN employees e ON e.id = p.director_id
    WHERE p.status != 'on_hold'
    ORDER BY p.priority DESC, p.created_at DESC
  `);
  return rows;
}

async function fetchActiveAllocations(now: Date): Promise<RawAllocation[]> {
  const nowStr = now.toISOString().split("T")[0];
  const rows = await query<RawAllocation>(`
    SELECT
      ea.project_id,
      ea.employee_id,
      e.full_name_en AS employee_name,
      e.nickname AS employee_nickname,
      ea.fte,
      ea.planned_or_actual,
      ea.status,
      ea.start_date,
      ea.end_date,
      ea.assignment_label
    FROM employee_allocations ea
    JOIN employees e ON e.id = ea.employee_id
    WHERE ea.status IN ('planned', 'active')
      AND (ea.end_date IS NULL OR ea.end_date >= $1::date)
    ORDER BY ea.created_at DESC
  `, [nowStr]);
  return rows;
}

async function fetchOutcomes(): Promise<RawOutcome[]> {
  return query<RawOutcome>(`SELECT project_id FROM project_outcomes`);
}

async function fetchAttributes(): Promise<RawAttribute[]> {
  return query<RawAttribute>(`
    SELECT employee_id, str, int, wis, cha, dex, con, rpg_class
    FROM employee_attributes
  `);
}

async function fetchLatestSnapshots(projectIds: string[]): Promise<{ project_id: string; overall_score: number | null }[]> {
  if (projectIds.length === 0) return [];
  // Get the most recent snapshot per project
  const rows = await query<{ project_id: string; overall_score: number | null }>(`
    SELECT DISTINCT ON (project_id)
      project_id, overall_score
    FROM team_snapshots
    WHERE project_id = ANY($1)
    ORDER BY project_id, snapshot_at DESC
  `, [projectIds]);
  return rows;
}

// ─── ATTRIBUTE COMPUTATION ─────────────────────────────────

function computeHpFromAttributes(attr: RawAttribute | undefined): number {
  if (!attr) return 50;
  // CON-based HP: baseline 30 + CON * 4
  return Math.min(100, Math.round(30 + attr.con * 4));
}

function computeMpFromAttributes(attr: RawAttribute | undefined): number {
  if (!attr) return 50;
  // WIS-based MP: baseline 30 + WIS * 4
  return Math.min(100, Math.round(30 + attr.wis * 4));
}

// ─── EVENT GENERATION ──────────────────────────────────────

function generateEvents(
  projects: ProjectState[],
  allocations: RawAllocation[],
  now: Date,
): GameEvent[] {
  const events: GameEvent[] = [];

  for (const p of projects) {
    if (p.gameStatus === "active" && p.startDate && daysBetween(p.startDate, now) <= 1) {
      events.push({
        id: `proj-start-${p.projectId}`,
        type: "project_started",
        projectId: p.projectId,
        projectName: p.name,
        directorId: p.directorId ?? undefined,
        directorName: p.directorName ?? undefined,
        description: `Project "${p.name}" has kicked off.`,
        descriptionTh: `โครงการ "${p.name}" เริ่มต้นแล้ว`,
        createdAt: p.startDate,
        read: false,
      });
    }

    if (p.gameStatus === "completed" && p.endDate && daysBetween(p.endDate, now) <= 3) {
      events.push({
        id: `proj-end-${p.projectId}`,
        type: "project_completed",
        projectId: p.projectId,
        projectName: p.name,
        directorId: p.directorId ?? undefined,
        directorName: p.directorName ?? undefined,
        description: `Project "${p.name}" has finished. Awaiting match report.`,
        descriptionTh: `โครงการ "${p.name}" เสร็จสิ้นแล้ว รอรายงานผล`,
        createdAt: p.endDate,
        read: false,
      });
    }
  }

  return events.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
}

// ─── SINGLE-QUERY SHORTCUTS ────────────────────────────────

/**
 * Quick check: is this employee available for a new project right now?
 */
export async function isEmployeeAvailable(employeeId: string, now = new Date()): Promise<boolean> {
  const nowStr = now.toISOString().split("T")[0];
  const rows = await query<{ total_fte: number }>(`
    SELECT COALESCE(SUM(fte), 0) as total_fte
    FROM employee_allocations
    WHERE employee_id = $1
      AND status = 'active'
      AND (end_date IS NULL OR end_date >= $2::date)
  `, [employeeId, nowStr]);
  const total = rows[0]?.total_fte ?? 0;
  return Number(total) < 1.0;
}

/**
 * Get all projects that a director is currently managing.
 */
export async function getDirectorProjects(directorId: string): Promise<ProjectState[]> {
  const world = await computeWorldState();
  return world.projects.filter((p) => p.directorId === directorId);
}
