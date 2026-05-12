"use client";

import {
  startTransition,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { MenuWindow } from "@/components/MenuWindow";
import { PlayerCard } from "@/components/PlayerCard";
import { PixelSprite } from "@/components/PixelSprite";
import { BudgetBar } from "@/components/BudgetBar";
import { computeProjectBudget, costPerTokenThb } from "@/lib/project-budget";
import { getCachedBalance } from "@/lib/balance-cache";
import { capabilityFitForDimension } from "@/lib/capability-fit";
import { calculateChemistry } from "@/lib/team-chemistry";
import {
  ARCHETYPE_COLOR,
  ARCHETYPE_LABEL,
  getArchetype,
  getTokenCost,
} from "@/lib/token-economy";
import {
  SLOT_BLURB,
  SLOT_COLOR,
  SLOT_DIMENSIONS,
  SLOT_LABEL,
  defaultProjectSlots,
  normalizeSlots,
  slotTotal,
  type ProjectSlots,
  type SlotDimension,
} from "@/lib/project-slots";
import { emptyReport, slotFit, teamFit, type Assignment, type PartyOrder } from "@/lib/fit-matrix";
import { inferGender } from "@/lib/sprite-variation";
import {
  combineSentimentSignals,
  moraleLabel,
  scoreTextSentiment,
  type SentimentSignal,
} from "@/lib/sentiment-engine";
import { BossDossierDrawer } from "./BossDossierDrawer";
import { SlotAssignDrawer } from "./SlotAssignDrawer";
import {
  FormationFilters,
  EMPTY_FILTERS,
  applyFormationFilters,
  type FormationFilterState,
} from "./FormationFilters";
import type {
  DashboardPayload,
  Employee,
  Project,
  SupportActionRecord,
} from "../_shared/types";

const ASSIGN_PREFIX = "BOARD::ASSIGN:";
const START_PREFIX = "BOARD::START:";
const LOG_PREFIX = "BOARD::LOG:";

type AssignmentMap = Record<string, Assignment[]>;
type LogSource = "director" | "staff" | "hr";
type ProjectScoreKey =
  | "complexity_score"
  | "urgency_score"
  | "strategic_value_score"
  | "delivery_risk_score"
  | "ai_leverage_score";

interface DragPayload {
  employee_id: string;
  from_project_code: string | null;
  from_dimension: SlotDimension | null;
}

interface ProjectLog {
  id: string;
  source: LogSource;
  text: string;
  created_at: string;
}

interface ProjectBoardState {
  started_at: string | null;
  logs: ProjectLog[];
}

interface SaveStatus {
  tone: "ok" | "warn";
  text: string;
}

interface MoraleReadout {
  score: number;
  label: string;
  symptoms: string[];
}

interface GateCheck {
  label: string;
  ok: boolean;
  hint: string;
}

interface ProgressReadout {
  score: number;
  label: string;
  drivers: string[];
}

type SupportActionType =
  | "mentor_assigned"
  | "fit_conversation"
  | "load_review"
  | "class_change_discussion"
  | "skill_review"
  | "growth_assignment"
  | "succession_flag"
  | "recognition";

interface SupportRecommendation {
  key: string;
  employee: Employee | null;
  action_type: SupportActionType;
  title: string;
  note: string;
  reason: string;
}

const CURRENT_CYCLE = "2026-Q2";

const SOURCE_LABEL: Record<LogSource, string> = {
  director: "Director",
  staff: "Staff",
  hr: "HR",
};

const PROJECT_SCORE_CONTROLS: Array<{ key: ProjectScoreKey; label: string; tone: string }> = [
  { key: "complexity_score", label: "Complexity", tone: "var(--rpg-blue)" },
  { key: "urgency_score", label: "Urgency", tone: "var(--rpg-orange)" },
  { key: "strategic_value_score", label: "Strategic", tone: "var(--rpg-yellow)" },
  { key: "delivery_risk_score", label: "Risk", tone: "var(--accent-red)" },
  { key: "ai_leverage_score", label: "AI Leverage", tone: "var(--rpg-purple)" },
];

const ROLE_RANK: Record<string, number> = {
  md: 6,
  deputy_md: 5,
  director: 4,
  manager: 3,
  senior: 2,
  staff: 1,
};

const POOL_CARD_MIN_WIDTH = 250;
const POOL_CARD_HEIGHT = 212;
const POOL_CARD_GAP = 10;
const POOL_ROW_OVERSCAN = 2;

function slotCapabilityScore(
  employee: Employee,
  dimension: SlotDimension,
  competencyStandards: DashboardPayload["competency_standards"],
) {
  return capabilityFitForDimension(employee, dimension, competencyStandards).score / 100;
}

function numberOr(value: unknown, fallback: number) {
  const next = Number(value ?? fallback);
  return Number.isFinite(next) ? next : fallback;
}

function compactThb(value: unknown) {
  const next = numberOr(value, Number.NaN);
  if (!Number.isFinite(next)) return "--";
  if (Math.abs(next) >= 1_000_000) return `฿${(next / 1_000_000).toFixed(1)}M`;
  if (Math.abs(next) >= 1_000) return `฿${Math.round(next / 1_000)}k`;
  return `฿${Math.round(next)}`;
}

function parseInsights(insights: unknown): string[] {
  return Array.isArray(insights)
    ? insights.filter((item): item is string => typeof item === "string")
    : [];
}

function stripBoardInsights(insights: string[]) {
  return insights.filter(
    (item) =>
      !item.startsWith(ASSIGN_PREFIX) &&
      !item.startsWith(START_PREFIX) &&
      !item.startsWith(LOG_PREFIX),
  );
}

function serializeAssignments(list: Assignment[]) {
  return `${ASSIGN_PREFIX}${list
    .map((assignment) => `${assignment.employee_id}@${assignment.dimension}@${assignment.party_order ?? 2}`)
    .join("|")}`;
}

function parseAssignments(insights: string[], employees: Employee[]): Assignment[] {
  const raw = insights.find((item) => item.startsWith(ASSIGN_PREFIX));
  if (!raw) return [];

  return raw
    .slice(ASSIGN_PREFIX.length)
    .split("|")
    .filter(Boolean)
    .flatMap((entry) => {
      const parts = entry.split("@");
      const employee_id = parts[0];
      const dimension = parts[1];
      const party_order = parts[2] ? parseInt(parts[2], 10) : 2;

      if (!employee_id || !dimension) return [];
      if (!SLOT_DIMENSIONS.includes(dimension as SlotDimension)) return [];
      const employee = employees.find((candidate) => candidate.id === employee_id);
      if (!employee) return [];
      return [
        {
          employee_id,
          archetype: getArchetype(employee),
          dimension: dimension as SlotDimension,
          party_order: (party_order === 1 || party_order === 2 || party_order === 3 ? party_order : 2) as PartyOrder,
        },
      ];
    });
}

function serializeLog(log: ProjectLog) {
  return `${LOG_PREFIX}${log.id}::${log.source}::${log.created_at}::${encodeURIComponent(log.text)}`;
}

function parseLogs(insights: string[]): ProjectLog[] {
  return insights
    .filter((item) => item.startsWith(LOG_PREFIX))
    .map((item) => item.slice(LOG_PREFIX.length))
    .flatMap((entry) => {
      const [id, source, created_at, encodedText] = entry.split("::");
      if (!id || !source || !created_at || !encodedText) return [];
      if (source !== "director" && source !== "staff" && source !== "hr") return [];
      return [
        {
          id,
          source: source as LogSource,
          created_at,
          text: decodeURIComponent(encodedText),
        },
      ];
    })
    .sort((left, right) => right.created_at.localeCompare(left.created_at));
}

function parseStartedAt(insights: string[]): string | null {
  const raw = insights.find((item) => item.startsWith(START_PREFIX));
  return raw ? raw.slice(START_PREFIX.length) : null;
}

function deriveSlots(project: Project): ProjectSlots {
  const explicit = normalizeSlots(project.project_slots);
  if (slotTotal(explicit) > 0) return explicit;

  const n = Math.max(2, project.team_size ?? 6);
  const slots = defaultProjectSlots();
  slots.technical = Math.max(1, Math.round(n * 0.34));

  for (const skill of project.required_skills ?? []) {
    const code = skill.trim().toUpperCase();
    if (code === "SALES" || code === "BIZ_DEV") {
      slots.sales += 1;
      slots.marketing += 1;
    } else if (code === "PM") {
      slots.paperwork += 1;
      slots.outsourcing += 1;
    } else {
      slots.technical += 1;
    }
  }

  const dept = (project.dept_code ?? "").toUpperCase();
  if (dept === "BIZ_DEV" || dept === "SALES") {
    slots.sales += 1;
    slots.marketing += 1;
  }
  if (["DIGITAL", "IT", "NET_DEL", "ENTERPRISE", "PUB_SAFETY"].includes(dept)) {
    slots.technical += 1;
  }
  if ((project.gross_margin_pct ?? 100) <= 20) {
    slots.outsourcing += 1;
    slots.paperwork += 1;
  }
  if (project.client_name && project.client_name.toLowerCase() !== "internal") {
    slots.sales += 1;
  }

  const total = slotTotal(slots);
  if (total < n) {
    slots.technical += n - total;
  } else if (total > n) {
    const order: SlotDimension[] = ["marketing", "paperwork", "outsourcing", "sales", "technical"];
    let over = total - n;
    for (const dim of order) {
      while (over > 0 && slots[dim] > (dim === "technical" ? 1 : 0)) {
        slots[dim] -= 1;
        over -= 1;
      }
    }
  }

  return slots;
}

function hydrateFromRoster(
  playerIds: string[] | null | undefined,
  employees: Employee[],
  slots: ProjectSlots,
): Assignment[] {
  if (!playerIds || playerIds.length === 0) return [];

  const assignments: Assignment[] = [];
  const remaining = Object.fromEntries(
    SLOT_DIMENSIONS.map((dimension) => [dimension, slots[dimension]]),
  ) as Record<SlotDimension, number>;

  for (const playerId of playerIds) {
    const employee = employees.find((candidate) => candidate.id === playerId);
    if (!employee) continue;
    const archetype = getArchetype(employee);

    const bestDimension = [...SLOT_DIMENSIONS]
      .filter((dimension) => remaining[dimension] > 0)
      .sort((left, right) => slotFit(archetype, right) - slotFit(archetype, left))[0];

    const dimension = bestDimension ?? "technical";
    assignments.push({ employee_id: playerId, archetype, dimension });
    if (remaining[dimension] > 0) remaining[dimension] -= 1;
  }

  return assignments;
}

/**
 * DQ3 formation chemistry bonus. The classic "leader up front + healer
 * in back" shape earns +5 chemistry. We keep the base calculateChemistry
 * signature clean (RPG attrs only, shared with Ninja); the archetype-×-
 * order geometry is local to this board.
 */
function formationBonus(list: Assignment[]): number {
  const frontCaptain = list.some(
    (a) => (a.party_order ?? 2) === 1 && a.archetype === "captain",
  );
  const backScout = list.some(
    (a) => (a.party_order ?? 2) === 3 && a.archetype === "scout",
  );
  return frontCaptain && backScout ? 5 : 0;
}

function chemistryForAssignments(list: Assignment[], employees: Employee[]) {
  const members = list
    .map((assignment) => employees.find((employee) => employee.id === assignment.employee_id))
    .filter((employee): employee is Employee => Boolean(employee));
  if (members.length === 0) return 0;
  if (members.length === 1) return 62;
  return Math.round(
    calculateChemistry(
      members.map((member) => ({
        str: member.attr_str ?? 10,
        int: member.attr_int ?? 10,
        wis: member.attr_wis ?? 10,
        cha: member.attr_cha ?? 10,
        dex: member.attr_dex ?? 10,
        con: member.attr_con ?? 10,
      })),
    ).overall,
  );
}

function sentimentSignalsForAssignments(list: Assignment[], employees: Employee[]): SentimentSignal[] {
  const employeeById = new Map(employees.map((employee) => [employee.id, employee]));
  return list
    .map((assignment) => employeeById.get(assignment.employee_id)?.sentiment)
    .filter((signal): signal is NonNullable<Employee["sentiment"]> => Boolean(signal));
}

function analyzeMorale(
  logs: ProjectLog[],
  started: boolean,
  teamSignals: SentimentSignal[] = [],
): MoraleReadout {
  if (!started && teamSignals.length === 0) {
    return {
      score: 50,
      label: "Pre-start",
      symptoms: ["Project has not started yet"],
    };
  }

  if (logs.length === 0 && teamSignals.length === 0) {
    return {
      score: 62,
      label: "Waiting for field notes",
      symptoms: ["No morale notes have been logged yet"],
    };
  }

  const logSignals = logs.map((log) =>
    scoreTextSentiment(log.text, {
      source: log.source,
      created_at: log.created_at,
    }),
  );
  const combined = combineSentimentSignals([...teamSignals, ...logSignals], {
    source: "project_morale",
    halfLifeDays: 21,
  });
  const bounded = started
    ? combined.score
    : Math.round(50 * 0.55 + combined.score * 0.45);

  return {
    score: bounded,
    label: started ? moraleLabel(bounded) : `Pre-start ${combined.label}`,
    symptoms: combined.symptoms.length > 0
      ? combined.symptoms.slice(0, 3)
      : combined.drivers.length > 0
        ? combined.drivers.slice(0, 3)
        : ["No acute symptom cluster from recent notes"],
  };
}

function analyzeProgress({
  logs,
  started,
  baseProgress,
}: {
  logs: ProjectLog[];
  started: boolean;
  baseProgress: number | null | undefined;
}): ProgressReadout {
  const positive = ["done", "closed", "approved", "stable", "clear", "fast", "launch", "solved", "smooth", "delivered"];
  const negative = ["blocked", "delay", "late", "rework", "waiting", "unclear", "vendor", "paperwork", "scope", "stuck"];
  const driverMap: Array<{ word: string; label: string }> = [
    { word: "approved", label: "Approvals moving" },
    { word: "stable", label: "Execution stabilising" },
    { word: "blocked", label: "Blockers still open" },
    { word: "vendor", label: "Vendor dependency drag" },
    { word: "paperwork", label: "Document workflow drag" },
    { word: "scope", label: "Scope still shifting" },
    { word: "rework", label: "Rework detected" },
  ];

  let score = typeof baseProgress === "number" ? baseProgress : started ? 18 : 0;
  const drivers = new Set<string>();

  for (const log of logs) {
    const text = log.text.toLowerCase();
    const sourceWeight = log.source === "director" ? 1.15 : log.source === "staff" ? 1 : 0.9;
    for (const word of positive) {
      if (text.includes(word)) score += 5 * sourceWeight;
    }
    for (const word of negative) {
      if (text.includes(word)) score -= 4 * sourceWeight;
    }
    for (const entry of driverMap) {
      if (text.includes(entry.word)) drivers.add(entry.label);
    }
  }

  const bounded = Math.max(0, Math.min(100, Math.round(score)));
  return {
    score: bounded,
    label:
      bounded >= 80
        ? "On track"
        : bounded >= 60
          ? "Advancing"
          : bounded >= 35
            ? "Fragile"
            : started
              ? "Drifting"
              : "Not started",
    drivers:
      drivers.size > 0
        ? Array.from(drivers).slice(0, 3)
        : started
          ? ["No strong execution signal yet"]
          : ["Project has not launched"],
  };
}

/**
 * Readiness = weighted sum of five components, weights = 1.0:
 *   coverage     0.40   — are the seats filled at all
 *   quality      0.25   — are the right archetypes in them
 *   party_split  0.05   — DQ3 EXP-split: are over-stuffed slots diluting
 *                        per-head contribution (hoarding penalty)
 *   chemistry    0.15   — team dynamics
 *   morale       0.15   — how the unit feels
 *
 * v3.1 took 5 points from coverage and handed them to party_split. A
 * correctly-sized team lands on 100 for split and reads exactly the
 * same as the v3 formula; over-stuffed teams start visibly bleeding.
 */
function readinessScore({
  fit,
  chemistry,
  morale,
}: {
  fit: ReturnType<typeof teamFit>;
  chemistry: number;
  morale: number;
}) {
  return Math.round(
    fit.coverage_pct * 0.40 +
      fit.quality_pct * 0.25 +
      fit.party_split_pct * 0.05 +
      chemistry * 0.15 +
      morale * 0.15,
  );
}

function chooseCoach(list: Assignment[], employees: Employee[]) {
  const candidates = list
    .map((assignment) => employees.find((employee) => employee.id === assignment.employee_id))
    .filter((employee): employee is Employee => Boolean(employee));

  return candidates.sort((left, right) => {
    const leftCaptain = getArchetype(left) === "captain" ? 3 : 0;
    const rightCaptain = getArchetype(right) === "captain" ? 3 : 0;
    return (ROLE_RANK[right.role_level] ?? 0) + rightCaptain - ((ROLE_RANK[left.role_level] ?? 0) + leftCaptain);
  })[0] ?? null;
}

function employeesFromAssignments(list: Assignment[], employees: Employee[]) {
  return list
    .map((assignment) => employees.find((employee) => employee.id === assignment.employee_id))
    .filter((employee): employee is Employee => Boolean(employee));
}

function lowestFitEmployeeForDimension(
  list: Assignment[],
  employees: Employee[],
  dimension: SlotDimension,
) {
  return list
    .filter((assignment) => assignment.dimension === dimension)
    .map((assignment) => ({
      assignment,
      employee: employees.find((employee) => employee.id === assignment.employee_id) ?? null,
      fit: slotFit(assignment.archetype, dimension),
    }))
    .filter((entry): entry is { assignment: Assignment; employee: Employee; fit: number } => Boolean(entry.employee))
    .sort((left, right) => left.fit - right.fit)[0]?.employee ?? null;
}

function lowestConEmployee(list: Assignment[], employees: Employee[]) {
  return employeesFromAssignments(list, employees).sort(
    (left, right) => (left.attr_con ?? 10) - (right.attr_con ?? 10),
  )[0] ?? null;
}

function strongestOpsEmployee(
  list: Assignment[],
  employees: Employee[],
  dimensions: SlotDimension[],
) {
  const ranked = list
    .filter((assignment) => dimensions.includes(assignment.dimension))
    .map((assignment) => {
      const employee = employees.find((candidate) => candidate.id === assignment.employee_id) ?? null;
      return {
        employee,
        fit: slotFit(assignment.archetype, assignment.dimension),
      };
    })
    .filter((entry): entry is { employee: Employee; fit: number } => Boolean(entry.employee));

  return ranked.sort((left, right) => right.fit - left.fit)[0]?.employee ?? null;
}

function buildSupportRecommendations({
  project,
  list,
  employees,
  morale,
  progress,
  weakFits,
  activeSupportActions,
}: {
  project: Project;
  list: Assignment[];
  employees: Employee[];
  morale: MoraleReadout;
  progress: ProgressReadout;
  weakFits: SlotDimension[];
  activeSupportActions: SupportActionRecord[];
}): SupportRecommendation[] {
  const recs: SupportRecommendation[] = [];
  const activeKeys = new Set(
    activeSupportActions.map((action) => `${action.employee_id}:${action.action_type}`),
  );
  const captain = chooseCoach(list, employees);
  const fatigueTarget = lowestConEmployee(list, employees);
  const weakFitTarget = weakFits[0]
    ? lowestFitEmployeeForDimension(list, employees, weakFits[0])
    : null;
  const opsTarget = strongestOpsEmployee(list, employees, ["outsourcing", "paperwork"]);

  if (morale.symptoms.includes("Fatigue signal") || morale.symptoms.includes("Burnout signal")) {
    recs.push({
      key: "fatigue-load-review",
      employee: fatigueTarget,
      action_type: "load_review",
      title: `Load review for ${fatigueTarget?.display_name ?? "fatigued squad member"}`,
      note: `Project ${project.code} morale logs show fatigue pressure. Review workload split, recovery time, and sprint expectations this week.`,
      reason: "Recent notes point to fatigue or burnout risk.",
    });
  }

  if (
    morale.symptoms.includes("Vendor / procurement friction") ||
    morale.symptoms.includes("Document drag")
  ) {
    recs.push({
      key: "ops-unblock",
      employee: opsTarget,
      action_type: "fit_conversation",
      title: `Unblock vendor lane for ${opsTarget?.display_name ?? project.code}`,
      note: `Project ${project.code} notes mention procurement or paperwork drag. Run a quick unblock conversation on vendor path, document owners, and decision turnaround.`,
      reason: "Ops-heavy friction is slowing launch or delivery.",
    });
  }

  if (weakFitTarget) {
    recs.push({
      key: "weak-fit-skill-review",
      employee: weakFitTarget,
      action_type: "skill_review",
      title: `Skill review for ${weakFitTarget.display_name}`,
      note: `Project ${project.code} has at least one miscast seat. Review whether this hero needs coaching, a class swap, or a different assignment.`,
      reason: `${SLOT_LABEL[weakFits[0] ?? "technical"]} is staffed but still under-fit.`,
    });
  }

  if (progress.score < 45 && captain) {
    recs.push({
      key: "captain-fit-convo",
      employee: captain,
      action_type: "fit_conversation",
      title: `Captain alignment for ${captain.display_name}`,
      note: `Project ${project.code} is drifting. Run a short captain-level reset on scope, owners, timeline, and what must move this week.`,
      reason: "Execution progress is fragile and needs clearer command.",
    });
  }

  if (morale.score >= 74 && progress.score >= 72 && captain) {
    recs.push({
      key: "recognition",
      employee: captain,
      action_type: "recognition",
      title: `Recognition pulse for ${captain.display_name}`,
      note: `Project ${project.code} is healthy. Capture and amplify what this squad is doing right before momentum fades into invisibility.`,
      reason: "Strong progress and morale deserve visible reinforcement.",
    });
  }

  return recs
    .filter((rec) => rec.employee)
    .filter((rec) => !activeKeys.has(`${rec.employee?.id}:${rec.action_type}`))
    .slice(0, 3);
}

function buildInsights({
  baseInsights,
  assignments,
  boardState,
}: {
  baseInsights: string[];
  assignments: Assignment[];
  boardState: ProjectBoardState;
}) {
  const insights = [...baseInsights];
  if (assignments.length > 0) insights.push(serializeAssignments(assignments));
  if (boardState.started_at) insights.push(`${START_PREFIX}${boardState.started_at}`);
  for (const log of boardState.logs.slice(0, 8)) insights.push(serializeLog(log));
  return insights.slice(0, 20);
}

function hpPct(employee: Employee) {
  return Math.max(12, Math.min(100, Math.round(((employee.attr_con ?? 10) / 20) * 100)));
}

function mpPct(employee: Employee) {
  return Math.max(12, Math.min(100, Math.round(((employee.attr_int ?? 10) / 20) * 100)));
}

export function FormationCanvas({ dash }: { dash: DashboardPayload }) {
  const activeProjects = useMemo(
    () =>
      dash.projects.filter((project) => project.status !== "done").slice(0, 10),
    [dash.projects],
  );
  const [selectedProjectCode, setSelectedProjectCode] = useState<string | null>(
    null,
  );
  const employeeById = useMemo(
    () => new Map(dash.employees.map((employee) => [employee.id, employee])),
    [dash.employees],
  );

  const projectByCode = useMemo(
    () => new Map(activeProjects.map((project) => [project.code, project])),
    [activeProjects],
  );
  // Per-project slot-need overrides. The director taps +/- on the
  // Project DNA pills and the change is reflected in this map before
  // hitting /api/formation/update-slots for persistence. Treated as a
  // layer on top of `deriveSlots(project)` so we always have a fallback.
  const [slotOverrides, setSlotOverrides] = useState<Record<string, ProjectSlots>>({});
  const slotsByProject = useMemo(
    () =>
      new Map(
        activeProjects.map((project) => [
          project.code,
          slotOverrides[project.code] ?? deriveSlots(project),
        ]),
      ),
    [activeProjects, slotOverrides],
  );
  const teamByProject = useMemo(
    () => new Map(dash.teams.map((team) => [team.project_code, team])),
    [dash.teams],
  );

  const [assignments, setAssignments] = useState<AssignmentMap>({});
  const [projectStateByCode, setProjectStateByCode] = useState<Record<string, ProjectBoardState>>({});
  const [dragging, setDragging] = useState<DragPayload | null>(null);
  const [activeDropKey, setActiveDropKey] = useState<string | null>(null);
  const [lastDroppedId, setLastDroppedId] = useState<string | null>(null);
  const [saveStatusByProject, setSaveStatusByProject] = useState<Record<string, SaveStatus | null>>({});
  const [selectedEmployee, setSelectedEmployee] = useState<Employee | null>(null);
  const [logDrafts, setLogDrafts] = useState<Record<string, { source: LogSource; text: string }>>({});
  const [localSupportActions, setLocalSupportActions] = useState<SupportActionRecord[]>([]);
  const [creatingActionKey, setCreatingActionKey] = useState<string | null>(null);
  const [hydrated, setHydrated] = useState(false);
  const [openSlot, setOpenSlot] = useState<{ project_code: string; dimension: SlotDimension } | null>(null);
  const [poolOpen, setPoolOpen] = useState(true);
  const [filters, setFilters] = useState<FormationFilterState>(EMPTY_FILTERS);

  useEffect(() => {
    if (activeProjects.length === 0) {
      setSelectedProjectCode(null);
      return;
    }
    if (
      !selectedProjectCode ||
      !activeProjects.some((project) => project.code === selectedProjectCode)
    ) {
      setSelectedProjectCode(activeProjects[0].code);
    }
  }, [activeProjects, selectedProjectCode]);

  useEffect(() => {
    if (hydrated || activeProjects.length === 0) return;

    const nextAssignments: AssignmentMap = {};
    const nextBoardState: Record<string, ProjectBoardState> = {};

    for (const project of activeProjects) {
      const team = teamByProject.get(project.code);
      const insights = parseInsights(team?.insights);
      const slots = slotsByProject.get(project.code) ?? deriveSlots(project);
      const parsed = parseAssignments(insights, dash.employees);
      const fallback = parsed.length > 0 ? parsed : hydrateFromRoster(team?.player_ids, dash.employees, slots);

      if (fallback.length > 0) nextAssignments[project.code] = fallback;
      nextBoardState[project.code] = {
        started_at: parseStartedAt(insights),
        logs: parseLogs(insights),
      };
    }

    setAssignments(nextAssignments);
    setProjectStateByCode(nextBoardState);
    setHydrated(true);
  }, [activeProjects, dash.employees, hydrated, slotsByProject, teamByProject]);

  const assignedIds = useMemo(() => {
    const ids = new Set<string>();
    for (const projectAssignments of Object.values(assignments)) {
      for (const assignment of projectAssignments) ids.add(assignment.employee_id);
    }
    return ids;
  }, [assignments]);
  const draggingEmployee = useMemo(
    () => (dragging ? employeeById.get(dragging.employee_id) ?? null : null),
    [dragging, employeeById],
  );
  const availableEmployees = useMemo(
    () => dash.employees.filter((employee) => !assignedIds.has(employee.id)),
    [assignedIds, dash.employees],
  );

  const filteredAvailable = useMemo(
    () => applyFormationFilters(availableEmployees, filters),
    [availableEmployees, filters],
  );
  const availableSkills = useMemo(() => {
    const set = new Set<string>();
    for (const e of availableEmployees) for (const s of e.skills ?? []) set.add(s);
    return [...set].sort();
  }, [availableEmployees]);
  const availableDepartments = useMemo(() => {
    const set = new Set<string>();
    for (const e of availableEmployees) {
      const d = e.div_code ?? e.dept_name_en;
      if (d) set.add(d);
    }
    return [...set].sort();
  }, [availableEmployees]);
  const supportActions = useMemo(
    () => [...dash.support_actions, ...localSupportActions],
    [dash.support_actions, localSupportActions],
  );

  function setProjectNotice(projectCode: string, tone: "ok" | "warn", text: string) {
    setSaveStatusByProject((current) => ({ ...current, [projectCode]: { tone, text } }));
  }

  function handleDragStart(
    event: React.DragEvent,
    employee: Employee,
    fromProjectCode: string | null = null,
    fromDimension: SlotDimension | null = null,
  ) {
    const payload: DragPayload = {
      employee_id: employee.id,
      from_project_code: fromProjectCode,
      from_dimension: fromDimension,
    };
    setDragging(payload);
    event.dataTransfer.setData("text/plain", employee.id);
    event.dataTransfer.setData("application/x-tkc-employee", employee.id);
    event.dataTransfer.effectAllowed = "move";
  }

  function handleDragEnd() {
    setDragging(null);
    setActiveDropKey(null);
  }

  /**
   * Pure assignment. Both drag-drop and click-to-assign route through this.
   * Returns `true` if the seat was filled, `false` if the dimension was at
   * capacity (caller can surface the warn state). No DB writes — we just
   * mutate React state. Persistence happens on Commit.
   */
  function performAssignment(
    employee: Employee,
    projectCode: string,
    dimension: SlotDimension,
  ): boolean {
    const projectSlots = slotsByProject.get(projectCode);
    if (!projectSlots) return false;

    const currentAssignments = assignments[projectCode] ?? [];
    const countInTarget = currentAssignments.filter(
      (assignment) => assignment.dimension === dimension && assignment.employee_id !== employee.id,
    ).length;

    if (countInTarget >= projectSlots[dimension]) {
      setProjectNotice(projectCode, "warn", `${SLOT_LABEL[dimension]} seats are already full.`);
      return false;
    }

    const archetype = getArchetype(employee);
    startTransition(() => {
      setAssignments((current) => {
        const next: AssignmentMap = {};
        for (const [code, list] of Object.entries(current)) {
          next[code] = list.filter((assignment) => assignment.employee_id !== employee.id);
        }
        next[projectCode] = [
          ...(next[projectCode] ?? []),
          { employee_id: employee.id, archetype, dimension },
        ];
        return next;
      });
    });
    setProjectNotice(projectCode, "ok", `${employee.display_name} snapped into ${SLOT_LABEL[dimension]}.`);
    // Snap-flash: mark the dropped card for one animation cycle then clear
    setLastDroppedId(employee.id);
    setTimeout(() => setLastDroppedId(null), 400);
    return true;
  }

  function handleDropOnDimension(
    event: React.DragEvent,
    projectCode: string,
    dimension: SlotDimension,
  ) {
    event.preventDefault();
    event.stopPropagation();
    const employeeId =
      dragging?.employee_id ??
      (event.dataTransfer.getData("application/x-tkc-employee") ||
        event.dataTransfer.getData("text/plain"));
    if (!employeeId) return;
    const employee = dash.employees.find((candidate) => candidate.id === employeeId);
    if (employee) performAssignment(employee, projectCode, dimension);
    setDragging(null);
    setActiveDropKey(null);
  }

  function handleQuickAssign(projectCode: string, dimension: SlotDimension, employeeId: string) {
    const employee = dash.employees.find((candidate) => candidate.id === employeeId);
    if (!employee) return;
    performAssignment(employee, projectCode, dimension);
  }

  function handleAssignFromDrawer(employeeId: string) {
    if (!openSlot) return;
    const employee = dash.employees.find((candidate) => candidate.id === employeeId);
    if (!employee) return;
    const ok = performAssignment(employee, openSlot.project_code, openSlot.dimension);
    if (ok) setOpenSlot(null);
  }

  function handleDropOnRoster(event: React.DragEvent) {
    event.preventDefault();
    if (!dragging) return;
    startTransition(() => {
      setAssignments((current) => {
        const next: AssignmentMap = {};
        for (const [code, list] of Object.entries(current)) {
          next[code] = list.filter((assignment) => assignment.employee_id !== dragging.employee_id);
        }
        return next;
      });
    });
    setDragging(null);
    setActiveDropKey(null);
  }

  function handleSlotChange(
    projectCode: string,
    dimension: SlotDimension,
    delta: number,
  ) {
    const project = projectByCode.get(projectCode);
    if (!project) return;
    const current = slotOverrides[projectCode] ?? deriveSlots(project);
    const nextValue = Math.max(0, (current[dimension] ?? 0) + delta);
    const next: ProjectSlots = { ...current, [dimension]: nextValue };
    setSlotOverrides((prev) => ({ ...prev, [projectCode]: next }));
    setProjectNotice(
      projectCode,
      "ok",
      `${SLOT_LABEL[dimension]} need ${delta > 0 ? "raised" : "lowered"} to ${nextValue}.`,
    );
    // Fire-and-forget persistence. The override stays authoritative
    // locally until the next refresh pulls the new `project_slots`.
    void fetch("/api/formation/update-slots", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ project_code: projectCode, required_slots: next }),
    }).catch(() => {});
  }

  function handleCycleOrder(projectCode: string, employeeId: string) {
    startTransition(() => {
      setAssignments((current) => ({
        ...current,
        [projectCode]: (current[projectCode] ?? []).map((assignment) => {
          if (assignment.employee_id !== employeeId) return assignment;
          const current_order = (assignment.party_order ?? 2) as PartyOrder;
          const next_order = (current_order === 3 ? 1 : current_order + 1) as PartyOrder;
          return { ...assignment, party_order: next_order };
        }),
      }));
    });
  }

  function handleRemoveAssignment(
    projectCode: string,
    employeeId: string,
    dimension: SlotDimension,
  ) {
    const employee = dash.employees.find((candidate) => candidate.id === employeeId);
    startTransition(() => {
      setAssignments((current) => ({
        ...current,
        [projectCode]: (current[projectCode] ?? []).filter(
          (assignment) => assignment.employee_id !== employeeId,
        ),
      }));
    });
    setProjectNotice(
      projectCode,
      "ok",
      `${employee?.display_name ?? "Hero"} left ${SLOT_LABEL[dimension]}.`,
    );
  }

  function handleDragOver(event: React.DragEvent) {
    event.preventDefault();
    event.dataTransfer.dropEffect = "move";
  }

  async function persistProject(projectCode: string, successText: string) {
    const project = projectByCode.get(projectCode);
    if (!project) return;

    const list = assignments[projectCode] ?? [];
    const team = teamByProject.get(projectCode);
    const boardState = projectStateByCode[projectCode] ?? { started_at: null, logs: [] };
    const slots = slotsByProject.get(projectCode) ?? deriveSlots(project);
    const fit = list.length > 0 ? teamFit(list, slots) : emptyReport();
    const chemistry = chemistryForAssignments(list, dash.employees);
    const morale = analyzeMorale(
      boardState.logs,
      Boolean(boardState.started_at),
      sentimentSignalsForAssignments(list, dash.employees),
    );
    const coach = chooseCoach(list, dash.employees);

    const baseInsights = stripBoardInsights(parseInsights(team?.insights));
    const insights = buildInsights({
      baseInsights,
      assignments: list,
      boardState,
    });

    const playerIds = list
      .map((assignment) => assignment.employee_id)
      .filter((id) => id !== coach?.id);
    const allocation_pcts = Object.fromEntries(playerIds.map((id) => [id, 100 as const]));
    const chemBonus = formationBonus(list);
    const overall = readinessScore({
      fit,
      chemistry: Math.min(100, chemistry + chemBonus),
      morale: morale.score,
    });

    try {
      const response = await fetch("/api/db/teams", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          project_code: projectCode,
          coach_id: coach?.id ?? null,
          player_ids: playerIds,
          player_codes: [],
          formation: "boss_board_v2",
          selector_mode: "boss_board",
          fit_pct: Math.round(fit.overall_pct),
          chemistry_score: chemistry,
          overall_score: overall,
          insights,
          allocation_pcts,
        }),
      });

      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        setProjectNotice(projectCode, "warn", data.error ?? "Could not save this board state.");
        return;
      }

      setProjectNotice(projectCode, "ok", successText);
      void dash.refresh();

      // Clean-path mirror to `project_allocations` + Sheets Formation tabs.
      // Fire-and-forget; old /api/db/teams write above remains source for UI reload.
      void fetch("/api/formation/save-project", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          project_code: projectCode,
          project_name: project.name ?? projectCode,
          required_slots: slots,
          allocations: list.map((a) => ({
            employee_id: a.employee_id,
            slot_dimension: a.dimension,
            party_order: (a.party_order ?? 2) as PartyOrder,
          })),
          readiness: {
            coverage: Math.round(fit.overall_pct),
            quality: Math.round(fit.overall_pct),
            chemistry,
            morale: morale.score,
            overall,
          },
        }),
      }).catch(() => {});
    } catch {
      setProjectNotice(projectCode, "warn", "Could not save this board state.");
    }
  }

  async function handleCommit(projectCode: string) {
    await persistProject(projectCode, "Formation committed to the board ledger.");

    // ─── GAME LOOP: LOCK IN ──────────────────────────────
    // After saving the board state, also commit the team to the
    // real-time game loop so the project becomes "active".
    const project = projectByCode.get(projectCode);
    if (project?.id) {
      const list = assignments[projectCode] ?? [];
      const coach = chooseCoach(list, dash.employees);
      const staffIds = list
        .map((a) => a.employee_id)
        .filter((id) => id !== coach?.id);
      const team = staffIds.map((id) => {
        const a = list.find((x) => x.employee_id === id);
        return {
          employee_id: id,
          fte: 1.0,
          slot_key: a?.dimension ?? null,
          assignment_label: a?.dimension ?? "",
        };
      });
      if (coach) {
        team.unshift({
          employee_id: coach.id,
          fte: 1.0,
          slot_key: null,
          assignment_label: "director",
        });
      }

      const slots = slotsByProject.get(projectCode) ?? deriveSlots(project);
      const fit = list.length > 0 ? teamFit(list, slots) : emptyReport();
      const chemistry = chemistryForAssignments(list, dash.employees);
      const chemBonus = formationBonus(list);
      const overall = readinessScore({ fit, chemistry: Math.min(100, chemistry + chemBonus), morale: 50 });

      try {
        const res = await fetch("/api/game/lock-in", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            project_id: project.id,
            director_id: coach?.id ?? dash.employees[0]?.id ?? "",
            team,
            predicted_scores: {
              fit_pct: Math.round(fit.overall_pct),
              chemistry_score: Math.round(chemistry),
              overall_score: Math.round(overall),
            },
            estimated_points: Math.round(overall),
            budget_status: "optimal",
          }),
        });
        if (res.ok) {
          setProjectNotice(projectCode, "ok", "Team locked in. Project is now ACTIVE.");
          void dash.refresh();
        } else {
          const err = await res.json().catch(() => ({}));
          setProjectNotice(projectCode, "warn", err.error ?? "Lock-in failed.");
        }
      } catch {
        setProjectNotice(projectCode, "warn", "Lock-in network error.");
      }
    }
  }

  async function handleStart(projectCode: string) {
    const startedAt = new Date().toISOString();
    setProjectStateByCode((current) => ({
      ...current,
      [projectCode]: {
        started_at: startedAt,
        logs: current[projectCode]?.logs ?? [],
      },
    }));
    await persistProject(projectCode, "Project marked live. Morale tracking is now active.");
  }

  async function handleProjectValueAction(
    project: Project,
    action: "seed" | "lock" | "unlock" | "adjust",
    values?: { project?: Partial<Record<ProjectScoreKey, number>> },
    reasonDefault?: string,
  ) {
    const defaultReason =
      reasonDefault ??
      (action === "seed"
        ? `Criteria-based project reroll for ${project.code}`
        : action === "lock"
          ? `Locking project scoring for ${project.code}`
          : action === "unlock"
            ? `Unlocking project scoring for ${project.code}`
            : `Manual project score adjustment for ${project.code}`);
    const reason = window.prompt("Reason for audit log", defaultReason);
    if (!reason?.trim()) return;

    setProjectNotice(project.code, "ok", "Updating project values...");
    try {
      const response = await fetch("/api/game/values", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          target_type: "project",
          target_id: project.id,
          action,
          source: action === "seed" ? "seed" : "manual",
          values,
          reason: reason.trim(),
        }),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        setProjectNotice(project.code, "warn", data.error ?? "Could not update project values.");
        return;
      }
      setProjectNotice(
        project.code,
        data.skipped > 0 ? "warn" : "ok",
        data.skipped > 0
          ? "Project values are locked. Unlock before adjusting."
          : action === "seed"
            ? "Project values rerolled from criteria and logged."
            : action === "lock"
              ? "Project values locked and logged."
              : action === "unlock"
                ? "Project values unlocked and logged."
                : "Project value adjusted and logged.",
      );
      void dash.refresh();
    } catch {
      setProjectNotice(project.code, "warn", "Could not update project values.");
    }
  }

  function handleProjectScoreStep(project: Project, key: ProjectScoreKey, label: string, delta: -5 | 5) {
    if (project.config_locked) {
      setProjectNotice(project.code, "warn", "Unlock project values before manual adjustment.");
      return;
    }
    const current = Number(project[key] ?? 50);
    const next = Math.max(0, Math.min(100, current + delta));
    if (next === current) return;
    void handleProjectValueAction(
      project,
      "adjust",
      { project: { [key]: next } },
      `${label} ${current} -> ${next} after approved review`,
    );
  }

  async function handleAddLog(projectCode: string) {
    const draft = logDrafts[projectCode];
    if (!draft || draft.text.trim().length < 10) {
      setProjectNotice(projectCode, "warn", "Write a useful note before adding it to the project log.");
      return;
    }

    const nextLog: ProjectLog = {
      id: crypto.randomUUID(),
      source: draft.source,
      text: draft.text.trim(),
      created_at: new Date().toISOString(),
    };

    setProjectStateByCode((current) => ({
      ...current,
      [projectCode]: {
        started_at: current[projectCode]?.started_at ?? null,
        logs: [nextLog, ...(current[projectCode]?.logs ?? [])].slice(0, 8),
      },
    }));
    setLogDrafts((current) => ({
      ...current,
      [projectCode]: { source: draft.source, text: "" },
    }));

    await persistProject(projectCode, "Project note recorded.");
  }

  async function handleCreateSupportAction(
    projectCode: string,
    recommendation: SupportRecommendation,
  ) {
    if (!recommendation.employee || creatingActionKey === recommendation.key) return;
    setCreatingActionKey(recommendation.key);

    try {
      const response = await fetch("/api/db/support-actions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          employee_id: recommendation.employee.id,
          cycle: CURRENT_CYCLE,
          action_type: recommendation.action_type,
          title: recommendation.title,
          note: recommendation.note,
          status: "planned",
        }),
      });

      const data = await response.json().catch(() => ({}));
      if (!response.ok || !data.support_action) {
        setProjectNotice(projectCode, "warn", data.error ?? "Could not queue the support mission.");
        return;
      }

      setLocalSupportActions((current) => {
        const next = current.filter((action) => action.id !== data.support_action.id);
        next.unshift(data.support_action as SupportActionRecord);
        return next;
      });
      setProjectNotice(projectCode, "ok", `Support mission queued for ${recommendation.employee.display_name}.`);
    } catch {
      setProjectNotice(projectCode, "warn", "Could not queue the support mission.");
    } finally {
      setCreatingActionKey(null);
    }
  }

  const selectedProject =
    activeProjects.find((project) => project.code === selectedProjectCode) ??
    activeProjects[0] ??
    null;
  const selectedSlots = selectedProject
    ? slotsByProject.get(selectedProject.code) ?? deriveSlots(selectedProject)
    : null;
  const selectedList = selectedProject
    ? assignments[selectedProject.code] ?? []
    : [];
  const selectedBoardState = selectedProject
    ? projectStateByCode[selectedProject.code] ?? { started_at: null, logs: [] }
    : { started_at: null, logs: [] };

  const heroPoolPanel = (
    <MenuWindow title="Hero Pool">
      <div
        onDragOver={handleDragOver}
        onDrop={handleDropOnRoster}
        style={{ display: "grid", gap: 14 }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: 12,
            padding: "4px 2px",
          }}
        >
          <div style={{ fontSize: 12, color: "var(--ink-0)", lineHeight: 1.4 }}>
            <span style={{ fontWeight: 700 }}>
              {dash.employees.length - assignedIds.size}
            </span>
            <span style={{ color: "var(--ink-1)", marginLeft: 6 }}>
              unassigned
            </span>
          </div>
          <button
            type="button"
            onClick={() => setPoolOpen((current) => !current)}
            style={{
              background: poolOpen ? "var(--rpg-yellow)" : "transparent",
              color: poolOpen ? "var(--ink-4)" : "var(--ink-1)",
              border: `1px solid ${poolOpen ? "var(--rpg-yellow)" : "var(--ink-2)"}`,
              padding: "4px 12px",
              fontSize: 10,
              fontWeight: 700,
              letterSpacing: "0.1em",
              textTransform: "uppercase",
              cursor: "pointer",
              fontFamily: "inherit",
            }}
          >
            {poolOpen ? "Hide pool" : "Browse pool"}
          </button>
        </div>

        {poolOpen ? (
          <>
            <FormationFilters
              filters={filters}
              onChange={setFilters}
              availableSkills={availableSkills}
              availableDepartments={availableDepartments}
              matchCount={filteredAvailable.length}
              totalCount={availableEmployees.length}
            />
            <VirtualizedHeroPool
              employees={filteredAvailable}
              draggingEmployeeId={dragging?.employee_id ?? null}
              onDragStart={(event, employee) => handleDragStart(event, employee)}
              onDragEnd={handleDragEnd}
              onSelect={setSelectedEmployee}
            />
          </>
        ) : null}
      </div>
    </MenuWindow>
  );

  return (
    <>
      <div
        className="formation-two-pane"
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 320px), 1fr))",
          gap: 16,
          alignItems: "start",
        }}
      >
        <aside
          className="formation-rail"
          style={{
            display: "grid",
            gap: 12,
            maxHeight: "calc(100svh - 220px)",
            overflowY: "auto",
            paddingRight: 6,
          }}
        >
          {heroPoolPanel}
          <MenuWindow title="Active Quests">
            <div style={{ display: "grid", gap: 8 }}>
              {activeProjects.length === 0 ? (
                <div style={{ color: "var(--ink-1)", fontSize: 11, lineHeight: 1.5 }}>
                  No active quests are waiting for formation.
                </div>
              ) : (
                activeProjects.map((project) => (
                  <ProjectSummaryButton
                    key={project.code}
                    project={project}
                    selected={selectedProject?.code === project.code}
                    slots={slotsByProject.get(project.code) ?? deriveSlots(project)}
                    list={assignments[project.code] ?? []}
                    onSelect={() => {
                      startTransition(() => setSelectedProjectCode(project.code));
                    }}
                  />
                ))
              )}
            </div>
          </MenuWindow>
        </aside>

        <main
          className="formation-pool"
          style={{
            display: "grid",
            gap: 12,
            maxHeight: "calc(100svh - 220px)",
            overflowY: "auto",
            paddingRight: 6,
          }}
        >
          {selectedProject && selectedSlots ? (
            <ProjectBoard
              project={selectedProject}
              slots={selectedSlots}
              list={selectedList}
              employees={dash.employees}
              availableEmployees={availableEmployees}
              competencyStandards={dash.competency_standards}
              supportActions={supportActions}
              boardState={selectedBoardState}
              saveStatus={saveStatusByProject[selectedProject.code] ?? null}
              activeDropKey={activeDropKey}
              draggingEmployee={draggingEmployee}
              lastDroppedId={lastDroppedId}
              creatingActionKey={creatingActionKey}
              logDraft={logDrafts[selectedProject.code] ?? { source: "director", text: "" }}
              onDragOver={handleDragOver}
              onDropOnDimension={(dimension, event) =>
                handleDropOnDimension(event, selectedProject.code, dimension)
              }
              onDragStartFromSlot={(employee, dimension, event) =>
                handleDragStart(event, employee, selectedProject.code, dimension)
              }
              onDragEnd={handleDragEnd}
              onOpenEmployee={setSelectedEmployee}
              onOpenSlot={(dimension) =>
                setOpenSlot({ project_code: selectedProject.code, dimension })
              }
              onRemoveAssignment={(employeeId, dimension) =>
                handleRemoveAssignment(selectedProject.code, employeeId, dimension)
              }
              onCycleOrder={(employeeId) =>
                handleCycleOrder(selectedProject.code, employeeId)
              }
              onSlotChange={(dimension, delta) =>
                handleSlotChange(selectedProject.code, dimension, delta)
              }
              onQuickAssign={(dimension, employeeId) =>
                handleQuickAssign(selectedProject.code, dimension, employeeId)
              }
              onCommit={() => void handleCommit(selectedProject.code)}
              onStart={() => void handleStart(selectedProject.code)}
              onValueAction={(action) => void handleProjectValueAction(selectedProject, action)}
              onScoreAdjust={(key, label, delta) => handleProjectScoreStep(selectedProject, key, label, delta)}
              onDraftChange={(next) =>
                setLogDrafts((current) => ({
                  ...current,
                  [selectedProject.code]: next,
                }))
              }
              onAddLog={() => void handleAddLog(selectedProject.code)}
              onCreateSupportAction={(recommendation) =>
                void handleCreateSupportAction(selectedProject.code, recommendation)
              }
              onDropEnter={(dimension) =>
                setActiveDropKey(`${selectedProject.code}:${dimension}`)
              }
              onDropLeave={() =>
                setActiveDropKey((current) =>
                  current?.startsWith(`${selectedProject.code}:`) ? null : current,
                )
              }
            />
          ) : (
            <MenuWindow title="Formation Board">
              <div style={{ color: "var(--ink-1)", fontSize: 11, lineHeight: 1.6 }}>
                No active project selected.
              </div>
            </MenuWindow>
          )}

        </main>
      </div>

      {selectedEmployee ? (
        <BossDossierDrawer employee={selectedEmployee} onClose={() => setSelectedEmployee(null)} />
      ) : null}

      {openSlot ? (
        (() => {
          const project = projectByCode.get(openSlot.project_code);
          if (!project) return null;
          return (
            <SlotAssignDrawer
              project={project}
              dimension={openSlot.dimension}
              employees={dash.employees}
              competencyStandards={dash.competency_standards}
              allAssignments={assignments}
              onAssign={handleAssignFromDrawer}
              onDragStart={(event, employee) => handleDragStart(event, employee)}
              onClose={() => setOpenSlot(null)}
            />
          );
        })()
      ) : null}
    </>
  );
}

function ProjectSummaryButton({
  project,
  selected,
  slots,
  list,
  onSelect,
}: {
  project: Project;
  selected: boolean;
  slots: ProjectSlots;
  list: Assignment[];
  onSelect: () => void;
}) {
  const totalNeeded = Math.max(1, slotTotal(slots));
  const filled = Math.min(list.length, totalNeeded);
  const missing = SLOT_DIMENSIONS.filter(
    (dimension) =>
      list.filter((assignment) => assignment.dimension === dimension).length <
      slots[dimension],
  );
  const coverage = Math.round((filled / totalNeeded) * 100);
  const priorityTone =
    project.priority === "critical"
      ? "var(--rpg-red)"
      : project.priority === "high"
        ? "var(--rpg-orange)"
        : "var(--ink-1)";

  return (
    <button
      type="button"
      onClick={onSelect}
      aria-pressed={selected}
      style={{
        width: "100%",
        border: `1px solid ${selected ? "var(--rpg-yellow)" : "var(--border-subtle)"}`,
        background: selected ? "rgba(243,182,31,0.12)" : "rgba(0,0,0,0.12)",
        color: "var(--ink-0)",
        cursor: "pointer",
        display: "grid",
        gap: 8,
        padding: "10px 12px",
        textAlign: "left",
        fontFamily: "inherit",
      }}
    >
      <div style={{ display: "grid", gridTemplateColumns: "auto 1fr auto", gap: 8, alignItems: "center" }}>
        <span className="pixel" style={{ color: "var(--rpg-yellow)", fontSize: 9 }}>
          {project.code}
        </span>
        <strong
          style={{
            color: "var(--ink-0)",
            fontSize: 12,
            overflow: "hidden",
            textOverflow: "ellipsis",
            whiteSpace: "nowrap",
          }}
        >
          {project.name}
        </strong>
        <span
          style={{
            color: priorityTone,
            fontSize: 9,
            letterSpacing: "0.08em",
            textTransform: "uppercase",
          }}
        >
          {project.priority ?? "normal"}
        </span>
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr auto", gap: 8, alignItems: "center" }}>
        <div style={{ height: 5, background: "var(--border-subtle)", overflow: "hidden" }}>
          <div style={{ height: "100%", width: `${coverage}%`, background: selected ? "var(--rpg-yellow)" : "var(--accent-blue)" }} />
        </div>
        <span style={{ color: "var(--ink-1)", fontSize: 10 }}>
          {filled}/{totalNeeded}
        </span>
      </div>
      <div style={{ color: "var(--ink-1)", fontSize: 10, lineHeight: 1.4 }}>
        {missing.length === 0
          ? "All required seats filled."
          : `Missing ${missing.map((dimension) => SLOT_LABEL[dimension]).join(", ")}.`}
      </div>
    </button>
  );
}

function VirtualizedHeroPool({
  employees,
  draggingEmployeeId,
  onDragStart,
  onDragEnd,
  onSelect,
}: {
  employees: Employee[];
  draggingEmployeeId: string | null;
  onDragStart: (event: React.DragEvent, employee: Employee) => void;
  onDragEnd: () => void;
  onSelect: (employee: Employee) => void;
}) {
  const scrollRef = useRef<HTMLDivElement | null>(null);
  const [containerW, setContainerW] = useState(0);
  const [containerH, setContainerH] = useState(0);
  const [scrollTop, setScrollTop] = useState(0);

  useLayoutEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    const measure = () => {
      setContainerW(el.clientWidth);
      setContainerH(el.clientHeight);
    };
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const columns = Math.max(
    1,
    Math.floor((containerW + POOL_CARD_GAP) / (POOL_CARD_MIN_WIDTH + POOL_CARD_GAP)),
  );
  const rowStride = POOL_CARD_HEIGHT + POOL_CARD_GAP;
  const rowCount = Math.ceil(employees.length / columns);
  const totalHeight = rowCount * rowStride;
  const startRow = Math.max(0, Math.floor(scrollTop / rowStride) - POOL_ROW_OVERSCAN);
  const endRow = Math.min(
    rowCount,
    Math.ceil((scrollTop + containerH) / rowStride) + POOL_ROW_OVERSCAN,
  );
  const startIdx = startRow * columns;
  const endIdx = Math.min(employees.length, endRow * columns);
  const offsetY = startRow * rowStride;
  const visibleEmployees = employees.slice(startIdx, endIdx);

  if (employees.length === 0) {
    return (
      <div style={{ color: "var(--ink-1)", fontSize: 11, padding: "10px 0" }}>
        No idle heroes match the current filters.
      </div>
    );
  }

  return (
    <div
      ref={scrollRef}
      onScroll={(event) => {
        const top = (event.target as HTMLDivElement).scrollTop;
        requestAnimationFrame(() => setScrollTop(top));
      }}
      style={{
        height: "min(52svh, 520px)",
        minHeight: 260,
        overflowY: "auto",
        overflowX: "hidden",
        position: "relative",
      }}
    >
      <div style={{ position: "relative", height: totalHeight, width: "100%" }}>
        <div
          style={{
            position: "absolute",
            top: offsetY,
            left: 0,
            right: 0,
            display: "grid",
            gridTemplateColumns: `repeat(${columns}, minmax(0, 1fr))`,
            gap: POOL_CARD_GAP,
          }}
        >
          {visibleEmployees.map((employee) => (
            <div
              key={employee.id}
              draggable
              onDragStart={(event) => onDragStart(event, employee)}
              onDragEnd={onDragEnd}
              style={{
                cursor: "grab",
                height: POOL_CARD_HEIGHT,
                opacity: draggingEmployeeId === employee.id ? 0.3 : 1,
                transition: "opacity 80ms ease",
              }}
            >
              <PlayerCard
                employee={employee}
                variant="compact"
                onSelect={() => onSelect(employee)}
              />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function ProjectBoard({
  project,
  slots,
  list,
  employees,
  availableEmployees,
  competencyStandards,
  supportActions,
  boardState,
  saveStatus,
  activeDropKey,
  draggingEmployee,
  lastDroppedId,
  creatingActionKey,
  logDraft,
  onDragOver,
  onDropOnDimension,
  onDragStartFromSlot,
  onDragEnd,
  onOpenEmployee,
  onOpenSlot,
  onRemoveAssignment,
  onCycleOrder,
  onSlotChange,
  onQuickAssign,
  onCommit,
  onStart,
  onValueAction,
  onScoreAdjust,
  onDraftChange,
  onAddLog,
  onCreateSupportAction,
  onDropEnter,
  onDropLeave,
}: {
  project: Project;
  slots: ProjectSlots;
  list: Assignment[];
  employees: Employee[];
  availableEmployees: Employee[];
  competencyStandards: DashboardPayload["competency_standards"];
  supportActions: SupportActionRecord[];
  boardState: ProjectBoardState;
  saveStatus: SaveStatus | null;
  activeDropKey: string | null;
  draggingEmployee: Employee | null;
  lastDroppedId: string | null;
  creatingActionKey: string | null;
  logDraft: { source: LogSource; text: string };
  onDragOver: (event: React.DragEvent) => void;
  onDropOnDimension: (dimension: SlotDimension, event: React.DragEvent) => void;
  onDragStartFromSlot: (employee: Employee, dimension: SlotDimension, event: React.DragEvent) => void;
  onDragEnd: () => void;
  onOpenEmployee: (employee: Employee) => void;
  onOpenSlot: (dimension: SlotDimension) => void;
  onRemoveAssignment: (employeeId: string, dimension: SlotDimension) => void;
  onCycleOrder: (employeeId: string) => void;
  onSlotChange: (dimension: SlotDimension, delta: number) => void;
  onQuickAssign: (dimension: SlotDimension, employeeId: string) => void;
  onCommit: () => void;
  onStart: () => void;
  onValueAction: (action: "seed" | "lock" | "unlock") => void;
  onScoreAdjust: (key: ProjectScoreKey, label: string, delta: -5 | 5) => void;
  onDraftChange: (next: { source: LogSource; text: string }) => void;
  onAddLog: () => void;
  onCreateSupportAction: (recommendation: SupportRecommendation) => void;
  onDropEnter: (dimension: SlotDimension) => void;
  onDropLeave: () => void;
}) {
  const fit = useMemo(() => (list.length > 0 ? teamFit(list, slots) : emptyReport()), [list, slots]);
  const chemistry = useMemo(() => chemistryForAssignments(list, employees), [employees, list]);
  const morale = useMemo(
    () =>
      analyzeMorale(
        boardState.logs,
        Boolean(boardState.started_at),
        sentimentSignalsForAssignments(list, employees),
      ),
    [boardState.logs, boardState.started_at, employees, list],
  );
  const progress = useMemo(
    () =>
      analyzeProgress({
        logs: boardState.logs,
        started: Boolean(boardState.started_at),
        baseProgress: project.progress_pct,
      }),
    [boardState.logs, boardState.started_at, project.progress_pct],
  );
  const chemBonus = formationBonus(list);
  const readyScore = readinessScore({
    fit,
    chemistry: Math.min(100, chemistry + chemBonus),
    morale: morale.score,
  });
  const totalNeeded = slotTotal(slots);
  const isReady = SLOT_DIMENSIONS.every(
    (dimension) =>
      list.filter((assignment) => assignment.dimension === dimension).length >= slots[dimension],
  );
  const hasCaptain = list.some((assignment) => assignment.archetype === "captain");
  const qualityReady = fit.quality_pct >= 62;
  const leadershipReady = project.priority === "critical" ? hasCaptain : true;
  const canStart = isReady && readyScore >= 58 && qualityReady && leadershipReady;
  const missing = SLOT_DIMENSIONS.filter(
    (dimension) => list.filter((assignment) => assignment.dimension === dimension).length < slots[dimension],
  );
  const weakFits = SLOT_DIMENSIONS.filter((dimension) => {
    const slotInfo = fit.by_dimension[dimension];
    return slotInfo.needed > 0 && slotInfo.filled >= slotInfo.needed && slotInfo.quality > 0 && slotInfo.quality * 100 < 62;
  });
  const memberIds = useMemo(() => new Set(list.map((assignment) => assignment.employee_id)), [list]);

  const byDimension: Record<SlotDimension, Assignment[]> = {
    technical: [],
    sales: [],
    marketing: [],
    outsourcing: [],
    paperwork: [],
  };
  for (const assignment of list) byDimension[assignment.dimension].push(assignment);

  const bestAvailableByDimension = useMemo(() => {
    return Object.fromEntries(
      SLOT_DIMENSIONS.map((dimension) => {
        const best = [...availableEmployees]
          .sort((left, right) => {
            const fitDiff =
              slotCapabilityScore(right, dimension, competencyStandards) -
              slotCapabilityScore(left, dimension, competencyStandards);
            if (fitDiff !== 0) return fitDiff;
            return getTokenCost(left) - getTokenCost(right);
          })[0] ?? null;

        return [
          dimension,
          best
            ? {
                employee: best,
                fit: Math.round(slotCapabilityScore(best, dimension, competencyStandards) * 100),
              }
            : null,
        ];
      }),
    ) as Record<SlotDimension, { employee: Employee; fit: number } | null>;
  }, [availableEmployees, competencyStandards]);

  const gates: GateCheck[] = [
    {
      label: "Seats filled",
      ok: isReady,
      hint: isReady ? `${totalNeeded}/${totalNeeded} mandatory slots covered` : `${list.length}/${totalNeeded} seats covered`,
    },
    {
      label: "Squad quality",
      ok: qualityReady,
      hint: `${Math.round(fit.quality_pct)}% average fit across filled seats`,
    },
    {
      label: "Field command",
      ok: leadershipReady,
      hint: hasCaptain ? "Captain-class leadership present" : project.priority === "critical" ? "Critical projects need one captain" : "Captain recommended, not required",
    },
  ];

  const projectSupportActions = useMemo(
    () =>
      supportActions.filter(
        (action) =>
          memberIds.has(action.employee_id) &&
          action.status !== "done" &&
          action.status !== "dropped",
      ),
    [memberIds, supportActions],
  );
  const recommendedActions = useMemo(
    () =>
      buildSupportRecommendations({
        project,
        list,
        employees,
        morale,
        progress,
        weakFits,
        activeSupportActions: projectSupportActions,
      }),
    [employees, list, morale, progress, project, projectSupportActions, weakFits],
  );

  const slotZoneList = (
    <div style={{ display: "grid", gap: 8 }}>
      {SLOT_DIMENSIONS.map((dimension) => {
        if (slots[dimension] === 0) return null;
        return (
          <SlotZone
            key={dimension}
            dimension={dimension}
            needed={slots[dimension]}
            filled={byDimension[dimension]}
            employees={employees}
            active={activeDropKey === `${project.code}:${dimension}`}
            draggingEmployee={draggingEmployee}
            lastDroppedId={lastDroppedId}
            recommended={bestAvailableByDimension[dimension]}
            competencyStandards={competencyStandards}
            onDragOver={onDragOver}
            onDrop={(event) => onDropOnDimension(dimension, event)}
            onDragStartFromSlot={onDragStartFromSlot}
            onDragEnd={onDragEnd}
            onOpenEmployee={onOpenEmployee}
            onOpenSlot={() => onOpenSlot(dimension)}
            onRemoveAssignment={(employeeId) => onRemoveAssignment(employeeId, dimension)}
            onCycleOrder={onCycleOrder}
            onQuickAssign={(employeeId) => onQuickAssign(dimension, employeeId)}
            onDropEnter={() => onDropEnter(dimension)}
            onDropLeave={onDropLeave}
          />
        );
      })}
    </div>
  );

  const boardNarrative = missing.length > 0
    ? `Still blocked by ${missing
        .map((dimension) => SLOT_LABEL[dimension])
        .join(", ")}. Fill those seats before launch.`
    : weakFits.length > 0
      ? `${weakFits.map((dimension) => SLOT_LABEL[dimension]).join(", ")} seats are staffed but still miscast. Upgrade the fit before launch.`
      : boardState.started_at
        ? `${morale.label}. Keep feeding the field notes to monitor drift and fatigue.`
        : "Lineup is structurally sound. One commit locks the board, and Start will launch morale tracking.";

  return (
    <MenuWindow title={project.code}>
      <div style={{ display: "grid", gap: 14 }}>
        <div style={{ display: "flex", justifyContent: "space-between", gap: 12, alignItems: "flex-start" }}>
          <div style={{ minWidth: 0 }}>
            <div style={{ fontSize: 14, color: "var(--ink-0)", fontWeight: 700, lineHeight: 1.25 }}>
              {project.name}
            </div>
            <div style={{ fontSize: 10, color: "var(--ink-1)", letterSpacing: "0.08em", textTransform: "uppercase", marginTop: 4 }}>
              {project.priority ?? "—"} · {project.client_name ?? "—"}
            </div>
            <div style={{ fontSize: 11, color: "var(--ink-1)", lineHeight: 1.6, marginTop: 8 }}>
              {boardNarrative}
            </div>
          </div>

          <div style={{ minWidth: 112, textAlign: "right" }}>
            <div
              className="pixel"
              style={{
                fontSize: 8,
                color: "var(--rpg-yellow)",
                letterSpacing: "0.14em",
                textTransform: "uppercase",
              }}
            >
              Ready
            </div>
            <div
              style={{
                fontSize: 28,
                fontWeight: 700,
                color:
                  readyScore >= 76
                    ? "var(--flux-up)"
                    : readyScore >= 58
                      ? "var(--rpg-yellow)"
                      : "var(--rpg-red)",
                lineHeight: 1,
              }}
            >
              {readyScore}
            </div>
            <div style={{ fontSize: 9, color: "var(--ink-1)", marginTop: 4, letterSpacing: "0.06em" }}>
              fit {Math.round(fit.overall_pct)} · chem {chemistry}
            </div>
          </div>
        </div>

        <div style={{ display: "grid", gap: 6 }}>
          <div
            className="pixel"
            style={{
              fontSize: 8,
              color: "var(--accent-gold)",
              letterSpacing: "0.14em",
              textTransform: "uppercase",
            }}
          >
            Project DNA · tap ± to edit needs
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(110px, 1fr))", gap: 8 }}>
            {SLOT_DIMENSIONS.map((dimension) => (
              <DnaPill
                key={dimension}
                dimension={dimension}
                needed={slots[dimension]}
                filled={byDimension[dimension].length}
                onChange={(delta) => onSlotChange(dimension, delta)}
              />
            ))}
          </div>
        </div>

        {slotZoneList}

        {/* The visceral money bar — Dr Non's morning game loop. Recomputes
            on every assignment change. v8.5 P0; reads live tunable from
            the Game Balance cache as of v8.5 P1. */}
        <BudgetBar
          budget={computeProjectBudget(
            project.budget_thb,
            list.map((a) => ({ employee_id: a.employee_id, fte: 1 })),
            employees,
            costPerTokenThb(getCachedBalance()),
          )}
          projectName={project.name}
        />

        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(112px, 1fr))", gap: 8 }}>
          <MetricMini label="Coverage" value={`${Math.round(fit.coverage_pct)}%`} tone="var(--accent-blue)" />
          <MetricMini label="Quality" value={`${Math.round(fit.quality_pct)}%`} tone="var(--accent-gold)" />
          <MetricMini
            label="Party Split"
            value={`${Math.round(fit.party_split_pct)}%`}
            tone={fit.party_split_pct >= 95 ? "var(--accent-green)" : fit.party_split_pct >= 75 ? "var(--accent-gold)" : "var(--accent-red)"}
          />
          <MetricMini label="Progress" value={`${progress.score}`} tone={progress.score >= 65 ? "var(--accent-green)" : progress.score >= 40 ? "var(--accent-gold)" : "var(--accent-red)"} />
          <MetricMini label="Morale" value={`${morale.score}`} tone={morale.score >= 60 ? "var(--accent-green)" : "var(--accent-red)"} />
          <MetricMini label="Plan FTE" value={`${numberOr(project.planned_fte, 0).toFixed(1)}`} tone="var(--rpg-purple)" />
          <MetricMini label="Actual FTE" value={project.actual_fte == null ? "--" : numberOr(project.actual_fte, 0).toFixed(1)} tone="var(--rpg-orange)" />
          <MetricMini label="Plan Cost" value={compactThb(project.planned_cost_thb)} tone="var(--rpg-yellow)" />
          <MetricMini label="Actual Cost" value={compactThb(project.actual_cost_thb)} tone="var(--ink-0)" />
          <MetricMini
            label="Variance"
            value={project.variance_pct == null ? "--" : `${project.variance_pct > 0 ? "+" : ""}${project.variance_pct}%`}
            tone={
              project.margin_risk === "high"
                ? "var(--accent-red)"
                : project.margin_risk === "watch"
                  ? "var(--accent-gold)"
                  : "var(--accent-green)"
            }
          />
          <MetricMini label="Tokens" value={`${list.reduce((sum, assignment) => {
            const employee = employees.find((candidate) => candidate.id === assignment.employee_id);
            return sum + (employee ? getTokenCost(employee) : 0);
          }, 0)}`} tone="var(--text-primary)" />
        </div>

        <div style={{ border: "1px solid var(--border-subtle)", background: "rgba(0,0,0,0.08)", padding: "10px 12px", display: "grid", gap: 10 }}>
          <div style={{ display: "flex", justifyContent: "space-between", gap: 12, alignItems: "center" }}>
            <div>
              <div className="pixel" style={{ fontSize: 8, color: "var(--rpg-yellow)", letterSpacing: "0.14em", textTransform: "uppercase", marginBottom: 5 }}>
                Project Values
              </div>
              <div style={{ fontSize: 10, color: project.config_locked ? "var(--rpg-orange)" : "var(--flux-up)", lineHeight: 1.5 }}>
                {project.config_locked
                  ? `Locked${project.config_lock_reason ? ` · ${project.config_lock_reason}` : ""}`
                  : `Unlocked · ${project.config_source ?? "neutral seed"}`}
              </div>
            </div>
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap", justifyContent: "flex-end" }}>
              <button
                onClick={() => onValueAction(project.config_locked ? "unlock" : "lock")}
                style={buttonStyle(project.config_locked ? "var(--flux-up)" : "var(--rpg-orange)", "var(--ink-4)")}
              >
                {project.config_locked ? "Unlock" : "Lock"}
              </button>
              <button
                onClick={() => onValueAction("seed")}
                disabled={Boolean(project.config_locked)}
                style={buttonStyle(
                  project.config_locked ? "var(--ink-3)" : "var(--rpg-yellow)",
                  project.config_locked ? "var(--ink-2)" : "var(--ink-4)",
                  Boolean(project.config_locked),
                )}
              >
                Re-roll
              </button>
            </div>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(148px, 1fr))", gap: 8 }}>
            {PROJECT_SCORE_CONTROLS.map((control) => {
              const value = Number(project[control.key] ?? 50);
              const disabled = Boolean(project.config_locked);
              return (
                <div
                  key={control.key}
                  style={{
                    border: "1px solid var(--border-subtle)",
                    background: "rgba(0,0,0,0.08)",
                    padding: "8px 10px",
                    display: "grid",
                    gridTemplateColumns: "1fr auto auto",
                    gap: 8,
                    alignItems: "center",
                  }}
                >
                  <div>
                    <div className="pixel" style={{ fontSize: 7, color: "var(--ink-1)", letterSpacing: "0.12em", textTransform: "uppercase", marginBottom: 6 }}>
                      {control.label}
                    </div>
                    <div style={{ fontSize: 16, fontWeight: 700, color: control.key === "delivery_risk_score" && value < 70 ? "var(--accent-gold)" : control.tone, lineHeight: 1 }}>
                      {value}
                    </div>
                  </div>
                  <button
                    onClick={() => onScoreAdjust(control.key, control.label, -5)}
                    disabled={disabled || value <= 0}
                    title={project.config_locked ? "Unlock project values before manual adjustment." : `Decrease ${control.label}`}
                    style={scoreStepButtonStyle(disabled || value <= 0)}
                  >
                    -
                  </button>
                  <button
                    onClick={() => onScoreAdjust(control.key, control.label, 5)}
                    disabled={disabled || value >= 100}
                    title={project.config_locked ? "Unlock project values before manual adjustment." : `Increase ${control.label}`}
                    style={scoreStepButtonStyle(disabled || value >= 100)}
                  >
                    +
                  </button>
                </div>
              );
            })}
          </div>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 8 }}>
          {gates.map((gate) => (
            <GateCard key={gate.label} gate={gate} />
          ))}
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))", gap: 10 }}>
          <ProgressPanel progress={progress} />
          <SupportMissionsPanel
            actions={projectSupportActions}
            recommendations={recommendedActions}
            creatingActionKey={creatingActionKey}
            onCreateSupportAction={onCreateSupportAction}
          />
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "1fr auto auto", gap: 8, alignItems: "center" }}>
          <div style={{ fontSize: 10, color: "var(--ink-1)", lineHeight: 1.6 }}>
            {boardState.started_at
              ? `Live since ${new Date(boardState.started_at).toLocaleDateString()} · ${morale.label}`
              : "Not started yet. Fill every required seat, then lock the team and launch the quest."}
          </div>
          <button
            onClick={onCommit}
            style={buttonStyle("var(--rpg-orange)", "var(--ink-4)")}
          >
            Commit
          </button>
          <button
            onClick={onStart}
            disabled={!canStart || Boolean(boardState.started_at)}
            style={buttonStyle(
              canStart && !boardState.started_at ? "var(--flux-up)" : "var(--ink-3)",
              canStart && !boardState.started_at ? "var(--ink-4)" : "var(--ink-2)",
              !canStart || Boolean(boardState.started_at),
            )}
          >
            {boardState.started_at ? "Live" : "Start"}
          </button>
        </div>

        {saveStatus ? (
          <div
            style={{
              padding: "8px 10px",
              border: `1px solid ${saveStatus.tone === "ok" ? "rgba(125,184,101,0.35)" : "rgba(196,77,63,0.35)"}`,
              background: saveStatus.tone === "ok" ? "rgba(91,140,74,0.08)" : "rgba(196,77,63,0.08)",
              color: saveStatus.tone === "ok" ? "var(--flux-up)" : "var(--rpg-red)",
              fontSize: 10,
            }}
          >
            {saveStatus.text}
          </div>
        ) : null}

        {boardState.started_at ? (
          <div style={{ borderTop: "1px solid var(--border-subtle)", paddingTop: 14, display: "grid", gap: 12 }}>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))", gap: 10 }}>
              <MoralePanel morale={morale} />
              <div style={{ border: "1px solid var(--border-subtle)", background: "rgba(0,0,0,0.08)", padding: "10px 12px" }}>
                <div className="pixel" style={{ fontSize: 8, color: "var(--rpg-yellow)", letterSpacing: "0.14em", textTransform: "uppercase", marginBottom: 8 }}>
                  Field Notes
                </div>
                <select
                  value={logDraft.source}
                  onChange={(event) => onDraftChange({ ...logDraft, source: event.target.value as LogSource })}
                  style={inputStyle}
                >
                  <option value="director">Director</option>
                  <option value="staff">Staff</option>
                  <option value="hr">HR</option>
                </select>
                <textarea
                  value={logDraft.text}
                  onChange={(event) => onDraftChange({ ...logDraft, text: event.target.value })}
                  placeholder="Add a qualitative note. Mention blockers, energy, clarity, vendor problems, scope changes, or anything the board should feel."
                  style={{ ...inputStyle, minHeight: 88, resize: "vertical", marginTop: 8 }}
                />
                <button onClick={onAddLog} style={{ ...buttonStyle("var(--accent-blue)", "var(--text-primary)"), marginTop: 8 }}>
                  Add Note
                </button>
              </div>
            </div>

            <div style={{ display: "grid", gap: 8 }}>
              {boardState.logs.length > 0 ? (
                boardState.logs.map((log) => (
                  <div key={log.id} style={{ border: "1px solid var(--border-subtle)", background: "rgba(0,0,0,0.08)", padding: "10px 12px" }}>
                    <div style={{ display: "flex", justifyContent: "space-between", gap: 8, marginBottom: 6 }}>
                      <span style={{ fontSize: 10, color: "var(--accent-gold)", letterSpacing: "0.1em", textTransform: "uppercase" }}>
                        {SOURCE_LABEL[log.source]}
                      </span>
                      <span style={{ fontSize: 10, color: "var(--ink-1)" }}>
                        {new Date(log.created_at).toLocaleString()}
                      </span>
                    </div>
                    <div style={{ fontSize: 12, color: "var(--ink-0)", lineHeight: 1.6 }}>
                      {log.text}
                    </div>
                  </div>
                ))
              ) : (
                <div style={{ color: "var(--ink-1)", fontSize: 11 }}>
                  No project notes yet.
                </div>
              )}
            </div>
          </div>
        ) : null}
      </div>
    </MenuWindow>
  );
}

function SlotZone({
  dimension,
  needed,
  filled,
  employees,
  active,
  draggingEmployee,
  lastDroppedId,
  recommended,
  competencyStandards,
  onDragOver,
  onDrop,
  onDragStartFromSlot,
  onDragEnd,
  onOpenEmployee,
  onOpenSlot,
  onRemoveAssignment,
  onCycleOrder,
  onQuickAssign,
  onDropEnter,
  onDropLeave,
}: {
  dimension: SlotDimension;
  needed: number;
  filled: Assignment[];
  employees: Employee[];
  active: boolean;
  draggingEmployee: Employee | null;
  lastDroppedId: string | null;
  recommended: { employee: Employee; fit: number } | null;
  competencyStandards: DashboardPayload["competency_standards"];
  onDragOver: (event: React.DragEvent) => void;
  onDrop: (event: React.DragEvent) => void;
  onDragStartFromSlot: (employee: Employee, dimension: SlotDimension, event: React.DragEvent) => void;
  onDragEnd: () => void;
  onOpenEmployee: (employee: Employee) => void;
  onOpenSlot: () => void;
  onRemoveAssignment: (employeeId: string) => void;
  onCycleOrder: (employeeId: string) => void;
  onQuickAssign: (employeeId: string) => void;
  onDropEnter: () => void;
  onDropLeave: () => void;
}) {
  const totalSeats = Math.max(needed, filled.length);
  const cells = Array.from({ length: totalSeats }, (_, index) => filled[index] ?? null);
  const draggingFit = draggingEmployee ? Math.round(slotCapabilityScore(draggingEmployee, dimension, competencyStandards) * 100) : null;
  const slotAvgFit =
    filled.length > 0
      ? Math.round(
          filled.reduce((sum, assignment) => {
            const employee = employees.find((candidate) => candidate.id === assignment.employee_id);
            if (!employee) return sum;
            return sum + slotCapabilityScore(employee, dimension, competencyStandards) * 100;
          }, 0) / filled.length,
        )
      : null;
  const previewTone =
    draggingFit == null
      ? SLOT_COLOR[dimension]
      : draggingFit >= 80
        ? "var(--flux-up)"
        : draggingFit >= 60
          ? "var(--accent-gold)"
          : draggingFit >= 45
            ? "var(--accent-red)"
            : "var(--text-muted)";

  return (
    <div
      onDragOver={onDragOver}
      onDragEnter={onDropEnter}
      onDragLeave={onDropLeave}
      onDrop={onDrop}
      onClick={onOpenSlot}
      style={{
        border: `1px solid ${active ? `${previewTone}bb` : "var(--border-subtle)"}`,
        background:
          active && draggingFit != null
            ? `${previewTone}18`
            : active
              ? "rgba(255,255,255,0.03)"
              : "rgba(0,0,0,0.08)",
        padding: "10px 12px",
        display: "grid",
        gap: 8,
        transition: "border-color 120ms ease, background 120ms ease, transform 120ms ease, box-shadow 120ms ease",
        transform: active ? "translateY(-2px)" : "none",
        boxShadow: active ? `0 0 0 2px ${previewTone}44` : "none",
        cursor: "pointer",
      }}
    >
      <div style={{ display: "grid", gridTemplateColumns: "84px auto auto 1fr", gap: 10, alignItems: "center" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
          <span style={{ width: 10, height: 10, background: SLOT_COLOR[dimension], display: "inline-block" }} />
          <span style={{ fontSize: 10, color: "var(--ink-0)", letterSpacing: "0.08em", textTransform: "uppercase" }}>
            {SLOT_LABEL[dimension]}
          </span>
        </div>
        <div style={{ fontSize: 10, color: filled.length >= needed ? "var(--flux-up)" : "var(--ink-1)" }}>
          {filled.length}/{needed}
        </div>
        <div
          style={{
            fontSize: 10,
            color:
              slotAvgFit == null
                ? "var(--ink-1)"
                : slotAvgFit >= 75
                  ? "var(--flux-up)"
                  : slotAvgFit >= 60
                    ? "var(--accent-gold)"
                    : "var(--accent-red)",
          }}
        >
          {slotAvgFit == null ? "open" : `fit ${slotAvgFit}`}
        </div>
        <div style={{ fontSize: 10, color: "var(--ink-1)", lineHeight: 1.4 }}>
          {SLOT_BLURB[dimension]}
        </div>
      </div>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fill, minmax(min(100%, 150px), 1fr))",
          gap: 8,
        }}
      >
        {cells.map((assignment, index) => {
          if (!assignment) {
            return (
              <div
                key={`${dimension}-empty-${index}`}
                className={active && draggingEmployee ? "anim-glow-pulse" : undefined}
                style={{
                  minHeight: 66,
                  border: `1px dashed ${active ? `${previewTone}cc` : `${SLOT_COLOR[dimension]}88`}`,
                  background:
                    draggingFit != null
                      ? `${previewTone}14`
                      : "rgba(0,0,0,0.12)",
                  display: "grid",
                  gap: 4,
                  placeItems: "center",
                  alignContent: "center",
                  color: "var(--ink-1)",
                  fontSize: 10,
                  letterSpacing: "0.08em",
                  textTransform: "uppercase",
                  padding: "8px 10px",
                  textAlign: "center",
                }}
              >
                <span style={{ color: "var(--ink-0)" }}>
                  {draggingEmployee ? "Drop hero" : "Open slot"}
                </span>
                <span style={{ fontSize: 9, color: active && draggingFit != null ? previewTone : "var(--ink-1)" }}>
                  {draggingEmployee && draggingFit != null
                    ? `${draggingFit}% fit for ${draggingEmployee.display_name}`
                    : recommended
                      ? `Best next: ${recommended.employee.display_name} · ${recommended.fit}%`
                      : "Click or drag a hero here"}
                </span>
                {recommended ? (
                  <button
                    type="button"
                    onClick={(event) => {
                      event.stopPropagation();
                      onQuickAssign(recommended.employee.id);
                    }}
                    style={{
                      border: `1px solid ${SLOT_COLOR[dimension]}`,
                      background: `${SLOT_COLOR[dimension]}22`,
                      color: "var(--ink-0)",
                      cursor: "pointer",
                      fontFamily: "inherit",
                      fontSize: 9,
                      fontWeight: 800,
                      letterSpacing: "0.08em",
                      padding: "5px 8px",
                      textTransform: "uppercase",
                    }}
                  >
                    Assign best
                  </button>
                ) : null}
              </div>
            );
          }

          const employee = employees.find((candidate) => candidate.id === assignment.employee_id);
          if (!employee) return null;

          return (
            <AssignedHeroCard
              key={assignment.employee_id}
              assignment={assignment}
              employee={employee}
              dimension={dimension}
              competencyStandards={competencyStandards}
              isNewlyDropped={lastDroppedId === assignment.employee_id}
              isDragging={draggingEmployee?.id === assignment.employee_id}
              onDragStart={(event) => onDragStartFromSlot(employee, dimension, event)}
              onDragEnd={onDragEnd}
              onOpen={(event) => {
                // Don't also open the slot-assign drawer when opening a hero.
                event.stopPropagation();
                onOpenEmployee(employee);
              }}
              onRemove={(event) => {
                event.stopPropagation();
                onRemoveAssignment(employee.id);
              }}
              onCycleOrder={(event) => {
                event.stopPropagation();
                onCycleOrder(employee.id);
              }}
            />
          );
        })}
      </div>
    </div>
  );
}

function AssignedHeroCard({
  assignment,
  employee,
  dimension,
  competencyStandards,
  isNewlyDropped,
  isDragging,
  onDragStart,
  onDragEnd,
  onOpen,
  onRemove,
  onCycleOrder,
}: {
  assignment: Assignment;
  employee: Employee;
  dimension: SlotDimension;
  competencyStandards: DashboardPayload["competency_standards"];
  isNewlyDropped?: boolean;
  isDragging?: boolean;
  onDragStart: (event: React.DragEvent) => void;
  onDragEnd: () => void;
  onOpen: (event: React.MouseEvent) => void;
  onRemove: (event: React.MouseEvent) => void;
  onCycleOrder: (event: React.MouseEvent) => void;
}) {
  const party_order: PartyOrder = (assignment.party_order ?? 2) as PartyOrder;
  const order_label = party_order === 1 ? "FRONT" : party_order === 3 ? "BACK" : "MID";
  const order_tone =
    party_order === 1
      ? "var(--accent-red)"
      : party_order === 3
        ? "var(--flux-up)"
        : "var(--ink-1)";
  const order_title =
    party_order === 1
      ? "Front row — takes hits. Click to cycle to MID."
      : party_order === 3
        ? "Back row — protected. Click to cycle to FRONT."
        : "Mid row — default. Click to cycle to BACK.";
  const fit = capabilityFitForDimension(employee, assignment.dimension, competencyStandards).score;
  const tone = ARCHETYPE_COLOR[assignment.archetype];

  return (
    <div
      draggable
      onDragStart={onDragStart}
      onDragEnd={onDragEnd}
      onClick={onOpen}
      className={isNewlyDropped ? "anim-snap-bounce" : undefined}
      style={{
        minHeight: 66,
        border: `1px solid ${tone}55`,
        background: "rgba(0,0,0,0.12)",
        padding: "8px 10px",
        display: "grid",
        gap: 6,
        cursor: "grab",
        opacity: isDragging ? 0.3 : 1,
        transition: "border-color 120ms ease, opacity 80ms ease",
      }}
      title={`${employee.display_name} · ${ARCHETYPE_LABEL[assignment.archetype]} · ${fit}% fit in ${SLOT_LABEL[dimension]}`}
    >
      <div style={{ display: "grid", gridTemplateColumns: "34px minmax(0, 1fr) auto", alignItems: "center", gap: 8 }}>
        <div
          style={{
            width: 34,
            height: 34,
            display: "grid",
            placeItems: "center",
            background: "rgba(255,255,255,0.03)",
            border: `1px solid ${tone}33`,
          }}
        >
          <PixelSprite
            archetype={assignment.archetype}
            gender={inferGender(employee.id, employee.full_name_en ?? employee.full_name_th, employee.nickname, employee.title_en)}
            size={28}
            seed={employee.id}
          />
        </div>
        <div style={{ minWidth: 0, flex: 1 }}>
          <div style={{ fontSize: 11, color: "var(--ink-0)", fontWeight: 600, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
            {employee.display_name}
          </div>
          <div style={{ fontSize: 9, color: tone, letterSpacing: "0.08em", textTransform: "uppercase" }}>
            {ARCHETYPE_LABEL[assignment.archetype]} · {employee.dept_code ?? "—"}
          </div>
          <div style={{ fontSize: 8, color: "var(--ink-1)", marginTop: 2, lineHeight: 1.3 }}>
            load {Number(employee.availability_fte ?? 0).toFixed(1)} FTE
            {employee.next_available_at
              ? ` · free ${new Date(employee.next_available_at).toLocaleDateString(undefined, { month: "short", day: "numeric" })}`
              : ""}
          </div>
        </div>
        <div style={{ display: "grid", gap: 3, justifyItems: "end" }}>
          <div
            style={{
              fontSize: 9,
              color: fit >= 80 ? "var(--flux-up)" : fit >= 60 ? "var(--accent-gold)" : "var(--accent-red)",
              border: `1px solid ${fit >= 80 ? "var(--flux-up)" : fit >= 60 ? "var(--accent-gold)" : "var(--accent-red)"}`,
              padding: "2px 6px",
              letterSpacing: "0.08em",
            }}
          >
            FIT {fit}
          </div>
          <button
            type="button"
            onClick={onCycleOrder}
            title={order_title}
            aria-label={`Party row: ${order_label}. Click to cycle.`}
            style={{
              border: `1px solid ${order_tone}`,
              background: "transparent",
              color: order_tone,
              cursor: "pointer",
              fontFamily: "inherit",
              fontSize: 9,
              fontWeight: 700,
              letterSpacing: "0.12em",
              lineHeight: 1,
              padding: "3px 6px",
            }}
          >
            {order_label}
          </button>
          <button
            type="button"
            onClick={onRemove}
            title={`Remove ${employee.display_name} from ${SLOT_LABEL[dimension]}`}
            style={{
              border: "1px solid rgba(196,77,63,0.6)",
              background: "rgba(196,77,63,0.12)",
              color: "var(--rpg-red)",
              cursor: "pointer",
              fontFamily: "inherit",
              fontSize: 9,
              fontWeight: 700,
              letterSpacing: "0.08em",
              lineHeight: 1,
              padding: "3px 6px",
              textTransform: "uppercase",
            }}
          >
            Remove
          </button>
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
        <MiniBar label="HP" pct={hpPct(employee)} tone={tone} />
        <MiniBar label="MP" pct={mpPct(employee)} tone={tone} />
      </div>
    </div>
  );
}

function DnaPill({
  dimension,
  needed,
  filled,
  onChange,
}: {
  dimension: SlotDimension;
  needed: number;
  filled: number;
  /** If supplied, renders +/- controls. Delta is +1 or -1. */
  onChange?: (delta: number) => void;
}) {
  const tone = SLOT_COLOR[dimension];
  const pct = needed > 0 ? Math.min(100, Math.round((filled / needed) * 100)) : 0;
  const editable = typeof onChange === "function";
  const dim = needed === 0 && editable;

  return (
    <div
      style={{
        border: "1px solid var(--border-subtle)",
        background: dim ? "rgba(0,0,0,0.04)" : "rgba(0,0,0,0.08)",
        padding: "8px 10px",
        display: "grid",
        gap: 5,
        opacity: dim ? 0.72 : 1,
      }}
    >
      <div style={{ display: "flex", justifyContent: "space-between", gap: 8, alignItems: "center" }}>
        <span style={{ fontSize: 9, color: tone, letterSpacing: "0.1em", textTransform: "uppercase" }}>
          {SLOT_LABEL[dimension]}
        </span>
        <span style={{ fontSize: 10, color: "var(--ink-0)", fontWeight: 600 }}>
          {filled}/{needed}
        </span>
      </div>
      {editable ? (
        <div style={{ display: "grid", gridTemplateColumns: "1fr auto auto", gap: 4, alignItems: "center" }}>
          <div style={{ height: 5, background: "var(--border-subtle)", position: "relative", overflow: "hidden" }}>
            <div style={{ position: "absolute", inset: 0, width: `${pct}%`, background: tone }} />
          </div>
          <button
            type="button"
            onClick={() => onChange(-1)}
            disabled={needed <= 0}
            title={`Reduce ${SLOT_LABEL[dimension]} need`}
            style={{
              border: `1px solid ${tone}55`,
              background: "transparent",
              color: needed <= 0 ? "var(--ink-1)" : "var(--ink-0)",
              cursor: needed <= 0 ? "not-allowed" : "pointer",
              fontFamily: "inherit",
              fontSize: 11,
              fontWeight: 700,
              lineHeight: 1,
              padding: "2px 6px",
              minWidth: 20,
            }}
          >
            −
          </button>
          <button
            type="button"
            onClick={() => onChange(1)}
            title={`Add a ${SLOT_LABEL[dimension]} seat`}
            style={{
              border: `1px solid ${tone}`,
              background: `${tone}14`,
              color: tone,
              cursor: "pointer",
              fontFamily: "inherit",
              fontSize: 11,
              fontWeight: 700,
              lineHeight: 1,
              padding: "2px 6px",
              minWidth: 20,
            }}
          >
            +
          </button>
        </div>
      ) : (
        <div style={{ height: 5, background: "var(--border-subtle)", position: "relative", overflow: "hidden" }}>
          <div style={{ position: "absolute", inset: 0, width: `${pct}%`, background: tone }} />
        </div>
      )}
    </div>
  );
}

function GateCard({ gate }: { gate: GateCheck }) {
  return (
    <div
      style={{
        border: `1px solid ${gate.ok ? "rgba(125,184,101,0.35)" : "rgba(196,77,63,0.35)"}`,
        background: gate.ok ? "rgba(91,140,74,0.08)" : "rgba(196,77,63,0.08)",
        padding: "9px 10px",
        display: "grid",
        gap: 4,
      }}
    >
      <div style={{ display: "flex", justifyContent: "space-between", gap: 8, alignItems: "center" }}>
        <span style={{ fontSize: 10, color: "var(--ink-0)", fontWeight: 600 }}>{gate.label}</span>
        <span
          style={{
            fontSize: 9,
            letterSpacing: "0.1em",
            textTransform: "uppercase",
            color: gate.ok ? "var(--flux-up)" : "var(--rpg-red)",
          }}
        >
          {gate.ok ? "Ready" : "Blocked"}
        </span>
      </div>
      <div style={{ fontSize: 10, color: "var(--ink-1)", lineHeight: 1.5 }}>{gate.hint}</div>
    </div>
  );
}

function ProgressPanel({ progress }: { progress: ProgressReadout }) {
  return (
    <div style={{ border: "1px solid var(--border-subtle)", background: "rgba(0,0,0,0.08)", padding: "10px 12px" }}>
      <div className="pixel" style={{ fontSize: 8, color: "var(--rpg-yellow)", letterSpacing: "0.14em", textTransform: "uppercase", marginBottom: 8 }}>
        Progress
      </div>
      <div style={{ fontSize: 28, fontWeight: 700, color: progress.score >= 65 ? "var(--flux-up)" : progress.score >= 40 ? "var(--accent-gold)" : "var(--rpg-red)", lineHeight: 1 }}>
        {progress.score}
      </div>
      <div style={{ fontSize: 11, color: "var(--ink-1)", marginTop: 4 }}>{progress.label}</div>
      <div style={{ display: "grid", gap: 6, marginTop: 10 }}>
        {progress.drivers.map((driver) => (
          <div key={driver} style={{ fontSize: 11, color: "var(--ink-0)", lineHeight: 1.5 }}>
            • {driver}
          </div>
        ))}
      </div>
    </div>
  );
}

function SupportMissionsPanel({
  actions,
  recommendations,
  creatingActionKey,
  onCreateSupportAction,
}: {
  actions: SupportActionRecord[];
  recommendations: SupportRecommendation[];
  creatingActionKey: string | null;
  onCreateSupportAction: (recommendation: SupportRecommendation) => void;
}) {
  return (
    <div style={{ border: "1px solid var(--border-subtle)", background: "rgba(0,0,0,0.08)", padding: "10px 12px", display: "grid", gap: 10 }}>
      <div style={{ display: "flex", justifyContent: "space-between", gap: 8, alignItems: "center" }}>
        <div className="pixel" style={{ fontSize: 8, color: "var(--rpg-yellow)", letterSpacing: "0.14em", textTransform: "uppercase" }}>
          Support Missions
        </div>
        <div style={{ fontSize: 10, color: "var(--ink-1)", letterSpacing: "0.08em" }}>
          {actions.length} active
        </div>
      </div>

      {recommendations.length > 0 ? (
        <div style={{ display: "grid", gap: 8 }}>
          {recommendations.map((recommendation) => (
            <div
              key={recommendation.key}
              style={{
                border: "1px solid rgba(212,168,67,0.22)",
                background: "rgba(212,168,67,0.06)",
                padding: "9px 10px",
                display: "grid",
                gap: 6,
              }}
            >
              <div style={{ display: "flex", justifyContent: "space-between", gap: 8, alignItems: "center" }}>
                <div style={{ fontSize: 11, color: "var(--ink-0)", fontWeight: 600 }}>
                  {recommendation.title}
                </div>
                <button
                  onClick={() => onCreateSupportAction(recommendation)}
                  disabled={creatingActionKey === recommendation.key}
                  style={buttonStyle(
                    creatingActionKey === recommendation.key ? "var(--ink-3)" : "var(--accent-blue)",
                    creatingActionKey === recommendation.key ? "var(--ink-2)" : "var(--text-primary)",
                    creatingActionKey === recommendation.key,
                  )}
                >
                  {creatingActionKey === recommendation.key ? "Queueing" : "Queue"}
                </button>
              </div>
              <div style={{ fontSize: 10, color: "var(--ink-1)", lineHeight: 1.5 }}>
                {recommendation.reason}
              </div>
              <div style={{ fontSize: 10, color: "var(--text-secondary)", lineHeight: 1.5 }}>
                {recommendation.employee?.display_name}
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div style={{ fontSize: 11, color: "var(--ink-1)", lineHeight: 1.6 }}>
          No new missions suggested right now. The current squad has no fresh intervention pattern beyond the actions already active.
        </div>
      )}

      {actions.length > 0 ? (
        <div style={{ display: "grid", gap: 6 }}>
          {actions.slice(0, 3).map((action) => (
            <div
              key={action.id}
              style={{
                border: "1px solid var(--border-subtle)",
                padding: "7px 9px",
                background: "rgba(0,0,0,0.12)",
                display: "grid",
                gap: 3,
              }}
            >
              <div style={{ display: "flex", justifyContent: "space-between", gap: 8 }}>
                <span style={{ fontSize: 11, color: "var(--ink-0)" }}>{action.title}</span>
                <span style={{ fontSize: 9, color: "var(--accent-green)", letterSpacing: "0.08em", textTransform: "uppercase" }}>
                  {action.status.replace("_", " ")}
                </span>
              </div>
              <div style={{ fontSize: 10, color: "var(--ink-1)", lineHeight: 1.5 }}>
                {action.note ?? action.action_type}
              </div>
            </div>
          ))}
        </div>
      ) : null}
    </div>
  );
}

function MoralePanel({ morale }: { morale: MoraleReadout }) {
  return (
    <div style={{ border: "1px solid var(--border-subtle)", background: "rgba(0,0,0,0.08)", padding: "10px 12px" }}>
      <div className="pixel" style={{ fontSize: 8, color: "var(--rpg-yellow)", letterSpacing: "0.14em", textTransform: "uppercase", marginBottom: 8 }}>
        Morale
      </div>
      <div style={{ fontSize: 28, fontWeight: 700, color: morale.score >= 60 ? "var(--flux-up)" : "var(--rpg-red)", lineHeight: 1 }}>
        {morale.score}
      </div>
      <div style={{ fontSize: 11, color: "var(--ink-1)", marginTop: 4 }}>{morale.label}</div>
      <div style={{ display: "grid", gap: 6, marginTop: 10 }}>
        {morale.symptoms.map((symptom) => (
          <div key={symptom} style={{ fontSize: 11, color: "var(--ink-0)", lineHeight: 1.5 }}>
            • {symptom}
          </div>
        ))}
      </div>
    </div>
  );
}

function MetricMini({
  label,
  value,
  tone,
}: {
  label: string;
  value: string;
  tone: string;
}) {
  return (
    <div style={{ border: "1px solid var(--border-subtle)", background: "rgba(0,0,0,0.08)", padding: "8px 10px" }}>
      <div className="pixel" style={{ fontSize: 7, color: "var(--ink-1)", letterSpacing: "0.12em", textTransform: "uppercase", marginBottom: 6 }}>
        {label}
      </div>
      <div style={{ fontSize: 16, fontWeight: 700, color: tone, lineHeight: 1 }}>
        {value}
      </div>
    </div>
  );
}

function MiniBar({
  label,
  pct,
  tone,
}: {
  label: string;
  pct: number;
  tone: string;
}) {
  return (
    <div style={{ display: "grid", gap: 3 }}>
      <div style={{ display: "flex", justifyContent: "space-between", fontSize: 8, color: "var(--ink-1)", letterSpacing: "0.08em", textTransform: "uppercase" }}>
        <span>{label}</span>
        <span>{pct}%</span>
      </div>
      <div style={{ height: 4, background: "var(--border-subtle)", position: "relative", overflow: "hidden" }}>
        <div
          style={{
            position: "absolute",
            inset: 0,
            width: `${pct}%`,
            background: tone,
          }}
        />
      </div>
    </div>
  );
}

function buttonStyle(background: string, color: string, disabled = false): React.CSSProperties {
  return {
    padding: "7px 12px",
    border: "none",
    background,
    color,
    cursor: disabled ? "not-allowed" : "pointer",
    fontSize: 10,
    fontWeight: 700,
    letterSpacing: "0.12em",
    textTransform: "uppercase",
    fontFamily: "inherit",
    opacity: disabled ? 0.6 : 1,
  };
}

function scoreStepButtonStyle(disabled = false): React.CSSProperties {
  return {
    width: 28,
    height: 28,
    border: `1px solid ${disabled ? "var(--ink-2)" : "var(--rpg-yellow)"}`,
    background: disabled ? "var(--ink-3)" : "rgba(244, 193, 79, 0.14)",
    color: disabled ? "var(--ink-1)" : "var(--rpg-yellow)",
    cursor: disabled ? "not-allowed" : "pointer",
    fontFamily: "inherit",
    fontSize: 14,
    fontWeight: 900,
    lineHeight: 1,
  };
}

const inputStyle: React.CSSProperties = {
  width: "100%",
  background: "var(--ink-4)",
  border: "1px solid var(--border-subtle)",
  color: "var(--ink-0)",
  fontSize: 11,
  padding: "8px 10px",
  fontFamily: "inherit",
  outline: "none",
};
