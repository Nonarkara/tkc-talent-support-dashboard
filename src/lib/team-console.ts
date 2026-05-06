import {
  createCommandCharacters,
  getDepartment,
  getDivision,
  type CommandCharacter,
  type TKCProject,
} from "./command-center-data";
import { csvToCharacters, type CSVEmployee } from "./csv-import";
import { TKC_REAL_PROJECTS } from "./tkc-org";

export type ConsoleScreen = "square" | "formation" | "cards" | "table" | "list" | "console" | "overview" | "heatmap" | "history";
export type SelectorMode = "director" | "hr";
export type FormationKey = "442" | "3511";
export type RosterSource = "mock" | "workbook";
export type ImportFileType = "csv" | "workbook";

export interface ConsoleCharacter extends CommandCharacter {
  fullName: string;
  fullNameTh?: string;
  fullNameEn?: string;
  email?: string;
  employeeId?: string;
  salaryThb: number;
  source: RosterSource;
  departmentName: string;
  divisionName: string;
  tags: string[];
  summary: string;
}

export interface ProjectDraftState {
  coachId: string | null;
  playerIds: string[];
  formation: FormationKey;
  selectorMode: SelectorMode;
  sandboxCards: SandboxCardState[];
}

export interface SandboxCardState {
  playerId: string;
  x: number;
  y: number;
}

export interface FormationLane {
  id: string;
  label: string;
  shortLabel: string;
  hint: string;
  slotCount: number;
  emphasis: "primary" | "secondary" | "support";
  members: ConsoleCharacter[];
}

export interface FormationBoard {
  key: FormationKey;
  label: string;
  description: string;
  lanes: FormationLane[];
  bench: ConsoleCharacter[];
}

export interface CharacterImportance {
  score: number;
  tier: "anchor" | "core" | "support";
  label: string;
}

export interface ConsoleImportSnapshot {
  id: string;
  fileName: string;
  fileType: ImportFileType;
  employeeCount: number;
  canonicalCount: number;
  importedAt: string;
  sheetNames: string[];
}

export interface ConsoleRosterCollection {
  version: number;
  employees: CSVEmployee[];
  snapshots: ConsoleImportSnapshot[];
  updatedAt: string | null;
}

const COACH_ROLES = new Set<CommandCharacter["role"]>(["director", "deputy_md", "md"]);
const STORAGE_KEY = "tkc-command-center-roster-v2";
const ROSTER_COLLECTION_VERSION = 1;
const ROLE_ORDER: Record<CSVEmployee["role"], number> = {
  md: 0,
  deputy_md: 1,
  director: 2,
  manager: 3,
  senior: 4,
  staff: 5,
};

export { STORAGE_KEY as TEAM_CONSOLE_STORAGE_KEY };

function buildConsoleCharacter(
  character: CommandCharacter,
  source: RosterSource,
  employee?: CSVEmployee,
): ConsoleCharacter {
  const department = getDepartment(character.deptCode);
  const division = getDivision(character.divisionCode);
  const departmentName = department?.nameEn ?? character.deptCode;
  const divisionName = division?.nameEn ?? character.divisionCode;
  const fullName = employee?.fullNameEn || employee?.fullNameTh || character.nickname;
  const salaryThb = employee?.salary ?? character.capacityCost * 1000;

  return {
    ...character,
    fullName,
    fullNameTh: employee?.fullNameTh,
    fullNameEn: employee?.fullNameEn,
    email: employee?.email,
    employeeId: employee?.employeeId,
    salaryThb,
    source,
    departmentName,
    divisionName,
    tags: [character.deptCode, character.roleEn, divisionName],
    summary: `${character.roleEn} · ${departmentName} · Lv.${character.level}`,
  };
}

export function createConsoleCharacters(): ConsoleCharacter[] {
  return createCommandCharacters().map((character) => buildConsoleCharacter(character, "mock"));
}

export function createImportedConsoleCharacters(employees: CSVEmployee[]): ConsoleCharacter[] {
  return csvToCharacters(employees).map((character, index) =>
    buildConsoleCharacter(character, "workbook", employees[index])
  );
}

export function isCoachEligible(character: CommandCharacter): boolean {
  return COACH_ROLES.has(character.role);
}

export function getCoachCandidates(
  characters: ConsoleCharacter[],
  project: TKCProject,
): ConsoleCharacter[] {
  return [...characters]
    .filter((character) => isCoachEligible(character))
    .sort((left, right) => {
      const leftFit = getProjectFitScore(left, project);
      const rightFit = getProjectFitScore(right, project);
      return rightFit - leftFit || right.level - left.level;
    });
}

export function getFieldSizeForProject(project: TKCProject): number {
  return Math.max(5, Math.min(7, project.teamSize ?? 6));
}

export function defaultFormationForProject(project: TKCProject): FormationKey {
  return getFieldSizeForProject(project) >= 7 || project.priority === "critical" ? "3511" : "442";
}

function rolePriority(role: CommandCharacter["role"]): number {
  if (role === "director") return 5;
  if (role === "deputy_md") return 4;
  if (role === "md") return 3;
  if (role === "manager") return 2;
  if (role === "senior") return 1;
  return 0;
}

export function getProjectFitScore(character: CommandCharacter, project: TKCProject): number {
  let score = character.level * 2 + character.ica.overall * 0.45 + character.form * 5 + character.demandCount * 2;

  if (character.deptCode === project.deptCode) score += 18;
  if (character.divisionCode === project.divisionCode) score += 10;
  if (project.requiredSkills?.includes(character.deptCode)) score += 14;
  if (project.requiredSkills?.includes(character.divisionCode)) score += 8;
  if (character.role === "manager") score += 7;
  if (character.role === "senior") score += 4;
  if (isCoachEligible(character)) score += 6 + rolePriority(character.role) * 2;

  return Math.round(score);
}

export function getMissingProjectSkills(
  members: CommandCharacter[],
  project: TKCProject,
): string[] {
  const skills = new Set<string>();

  for (const member of members) {
    skills.add(member.deptCode);
    skills.add(member.divisionCode);
  }

  return (project.requiredSkills ?? []).filter((skill) => !skills.has(skill));
}

export function getCharacterImportance(
  character: ConsoleCharacter,
  project: TKCProject,
  teamMembers: ConsoleCharacter[],
  coachId: string | null,
): CharacterImportance {
  const missingSkills = getMissingProjectSkills(teamMembers, project);
  const missingManager = !teamMembers.some((member) => member.role === "manager");
  const currentIds = new Set(teamMembers.map((member) => member.id));
  const alreadySelected = currentIds.has(character.id);

  let score = getProjectFitScore(character, project);

  if (!coachId && isCoachEligible(character)) score += 18;
  if (missingManager && character.role === "manager") score += 16;
  if (missingSkills.includes(character.deptCode)) score += 14;
  if (missingSkills.includes(character.divisionCode)) score += 8;
  if (alreadySelected) score += 10;

  if (score >= 92) return { score, tier: "anchor", label: "Anchor" };
  if (score >= 70) return { score, tier: "core", label: "Core" };
  return { score, tier: "support", label: "Support" };
}

function fieldCandidates(characters: ConsoleCharacter[], coachId: string | null): ConsoleCharacter[] {
  return characters.filter((character) => character.id !== coachId && !isCoachEligible(character));
}

function identityKey(employee: CSVEmployee): string {
  const employeeId = employee.employeeId?.trim().toLowerCase();
  if (employeeId) return `id:${employeeId}`;

  const email = employee.email?.trim().toLowerCase();
  if (email) return `email:${email}`;

  const fullName = employee.fullNameEn?.trim().toLowerCase() || employee.fullNameTh?.trim().toLowerCase();
  if (fullName) return `name:${fullName}|${employee.department}|${employee.role}`;

  return `nick:${employee.nickname.trim().toLowerCase()}|${employee.department}|${employee.role}`;
}

function pickText(nextValue?: string, currentValue?: string): string | undefined {
  return nextValue?.trim() || currentValue?.trim() || undefined;
}

function pickNumber(nextValue?: number, currentValue?: number): number | undefined {
  return Number.isFinite(nextValue) ? nextValue : currentValue;
}

function mergeEmployeeRecord(existing: CSVEmployee | undefined, incoming: CSVEmployee): CSVEmployee {
  if (!existing) return incoming;

  return {
    nickname: pickText(incoming.nickname, existing.nickname) ?? existing.nickname,
    department: pickText(incoming.department, existing.department) ?? existing.department,
    role: incoming.role ?? existing.role,
    fullNameTh: pickText(incoming.fullNameTh, existing.fullNameTh),
    fullNameEn: pickText(incoming.fullNameEn, existing.fullNameEn),
    level: pickNumber(incoming.level, existing.level),
    tenure: pickNumber(incoming.tenure, existing.tenure),
    salary: pickNumber(incoming.salary, existing.salary),
    division: pickText(incoming.division, existing.division),
    email: pickText(incoming.email, existing.email),
    employeeId: pickText(incoming.employeeId, existing.employeeId),
  };
}

export function createEmptyRosterCollection(): ConsoleRosterCollection {
  return {
    version: ROSTER_COLLECTION_VERSION,
    employees: [],
    snapshots: [],
    updatedAt: null,
  };
}

export function parseStoredRosterCollection(
  rawValue: string | null | undefined,
): ConsoleRosterCollection {
  if (!rawValue) return createEmptyRosterCollection();

  try {
    const parsed = JSON.parse(rawValue) as Partial<ConsoleRosterCollection>;

    return {
      version: ROSTER_COLLECTION_VERSION,
      employees: Array.isArray(parsed.employees) ? parsed.employees : [],
      snapshots: Array.isArray(parsed.snapshots) ? parsed.snapshots : [],
      updatedAt: typeof parsed.updatedAt === "string" ? parsed.updatedAt : null,
    };
  } catch {
    return createEmptyRosterCollection();
  }
}

export function mergeRosterEmployees(
  existing: CSVEmployee[],
  incoming: CSVEmployee[],
): CSVEmployee[] {
  const merged = new Map<string, CSVEmployee>();

  for (const employee of existing) {
    merged.set(identityKey(employee), employee);
  }

  for (const employee of incoming) {
    const key = identityKey(employee);
    merged.set(key, mergeEmployeeRecord(merged.get(key), employee));
  }

  return [...merged.values()].sort((left, right) => {
    const roleDelta = ROLE_ORDER[left.role] - ROLE_ORDER[right.role];
    if (roleDelta !== 0) return roleDelta;

    const departmentDelta = left.department.localeCompare(right.department);
    if (departmentDelta !== 0) return departmentDelta;

    return left.nickname.localeCompare(right.nickname);
  });
}

export function applyImportToRosterCollection(
  collection: ConsoleRosterCollection,
  payload: {
    employees: CSVEmployee[];
    fileName: string;
    fileType: ImportFileType;
    sheetNames?: string[];
    importedAt?: string;
  },
): ConsoleRosterCollection {
  const importedAt = payload.importedAt ?? new Date().toISOString();
  const employees = mergeRosterEmployees(collection.employees, payload.employees);
  const snapshot: ConsoleImportSnapshot = {
    id: `import-${Date.now()}`,
    fileName: payload.fileName,
    fileType: payload.fileType,
    employeeCount: payload.employees.length,
    canonicalCount: employees.length,
    importedAt,
    sheetNames: payload.sheetNames ?? [],
  };

  return {
    version: ROSTER_COLLECTION_VERSION,
    employees,
    snapshots: [snapshot, ...collection.snapshots].slice(0, 24),
    updatedAt: importedAt,
  };
}

export function buildInitialProjectDrafts(
  characters: ConsoleCharacter[],
  projects: TKCProject[] = TKC_REAL_PROJECTS,
): Record<string, ProjectDraftState> {
  const drafts: Record<string, ProjectDraftState> = {};

  for (const project of projects) {
    const coach = getCoachCandidates(characters, project)[0] ?? null;
    const playerIds = fieldCandidates(characters, coach?.id ?? null)
      .sort((left, right) => getProjectFitScore(right, project) - getProjectFitScore(left, project))
      .slice(0, getFieldSizeForProject(project))
      .map((character) => character.id);

    drafts[project.id] = {
      coachId: coach?.id ?? null,
      playerIds,
      formation: defaultFormationForProject(project),
      selectorMode: "director",
      sandboxCards: [],
    };
  }

  return drafts;
}

export function reconcileProjectDrafts(
  drafts: Record<string, ProjectDraftState> | null | undefined,
  characters: ConsoleCharacter[],
  projects: TKCProject[] = TKC_REAL_PROJECTS,
): Record<string, ProjectDraftState> {
  const defaults = buildInitialProjectDrafts(characters, projects);
  const validIds = new Set(characters.map((character) => character.id));
  const coachIds = new Set(
    characters
      .filter((character) => isCoachEligible(character))
      .map((character) => character.id)
  );
  const nextDrafts: Record<string, ProjectDraftState> = {};

  for (const project of projects) {
    const fallback = defaults[project.id];
    const incoming = drafts?.[project.id];
    const fieldSize = getFieldSizeForProject(project);
    const preferredCoachId = incoming?.coachId &&
      validIds.has(incoming.coachId) &&
      coachIds.has(incoming.coachId)
      ? incoming.coachId
      : fallback.coachId;

    const seen = new Set<string>();
    const playerIds = (incoming?.playerIds ?? [])
      .filter((playerId) => {
        if (!validIds.has(playerId)) return false;
        if (coachIds.has(playerId)) return false;
        if (playerId === preferredCoachId) return false;
        if (seen.has(playerId)) return false;
        seen.add(playerId);
        return true;
      })
      .slice(0, fieldSize);

    const rankedFill = fieldCandidates(characters, preferredCoachId)
      .sort(
        (left, right) =>
          getProjectFitScore(right, project) - getProjectFitScore(left, project) ||
          right.level - left.level
      );

    for (const candidate of rankedFill) {
      if (playerIds.length >= fieldSize) break;
      if (seen.has(candidate.id)) continue;
      playerIds.push(candidate.id);
      seen.add(candidate.id);
    }

    nextDrafts[project.id] = {
      coachId: preferredCoachId,
      playerIds,
      formation:
        incoming?.formation === "3511" || incoming?.formation === "442"
          ? incoming.formation
          : fallback.formation,
      selectorMode:
        incoming?.selectorMode === "hr" || incoming?.selectorMode === "director"
          ? incoming.selectorMode
          : fallback.selectorMode,
      sandboxCards: (incoming?.sandboxCards ?? [])
        .filter((card) => validIds.has(card.playerId))
        .filter((card) => card.playerId !== preferredCoachId)
        .filter((card) => !playerIds.includes(card.playerId))
        .filter((card, index, cards) => cards.findIndex((item) => item.playerId === card.playerId) === index)
        .map((card) => ({
          playerId: card.playerId,
          x: Math.max(6, Math.min(94, card.x)),
          y: Math.max(8, Math.min(88, card.y)),
        })),
    };
  }

  return nextDrafts;
}

function resolveSlots(formation: FormationKey, fieldSize: number): Omit<FormationLane, "members">[] {
  if (formation === "3511") {
    return [
      {
        id: "striker",
        label: "Striker",
        shortLabel: "ST",
        hint: "Finishes the move and owns the top line.",
        slotCount: 1,
        emphasis: "primary",
      },
      {
        id: "shadow",
        label: "Link Player",
        shortLabel: "SS",
        hint: "Connects coach intent to execution.",
        slotCount: 1,
        emphasis: "secondary",
      },
      {
        id: "midfield",
        label: "Midfield",
        shortLabel: "MID",
        hint: "Controls tempo, handoffs, and cross-team flow.",
        slotCount: fieldSize >= 7 ? 3 : 2,
        emphasis: "primary",
      },
      {
        id: "defense",
        label: "Back Line",
        shortLabel: "DEF",
        hint: "Protects delivery quality and keeps risk low.",
        slotCount: fieldSize >= 6 ? 2 : 1,
        emphasis: "support",
      },
    ];
  }

  return [
    {
      id: "striker",
      label: "Front Line",
      shortLabel: "FWD",
      hint: "Owns client-facing delivery and the final punch.",
      slotCount: fieldSize >= 7 ? 2 : 1,
      emphasis: "primary",
    },
    {
      id: "midfield",
      label: "Midfield",
      shortLabel: "MID",
      hint: "Turns plans into operating rhythm.",
      slotCount: fieldSize >= 6 ? 3 : 2,
      emphasis: "primary",
    },
    {
      id: "defense",
      label: "Back Line",
      shortLabel: "DEF",
      hint: "Stabilizes execution, QA, and handoff risk.",
      slotCount: 2,
      emphasis: "secondary",
    },
  ];
}

function laneWeight(member: ConsoleCharacter, laneId: string): number {
  if (laneId === "striker") {
    return member.ica.impact + member.form * 8 + member.level * 2 + (member.positionType === "FWD" ? 14 : 0);
  }

  if (laneId === "shadow") {
    return member.ica.collaboration + member.ica.advancement * 0.5 + member.form * 5 +
      (member.role === "manager" ? 16 : member.role === "senior" ? 8 : 0);
  }

  if (laneId === "midfield") {
    return member.ica.collaboration + member.ica.advancement + member.level * 2 +
      (member.role === "manager" ? 12 : member.role === "senior" ? 8 : 0);
  }

  return member.attributes.con * 4 + member.attributes.wis * 3 + member.ocean.conscientiousness * 0.25 +
    member.level * 2 + (member.role === "manager" ? 7 : member.role === "senior" ? 10 : 0);
}

export function buildFormationBoard(
  members: ConsoleCharacter[],
  formation: FormationKey,
  fieldSize: number,
): FormationBoard {
  const available = [...members];
  const lanes = resolveSlots(formation, fieldSize).map((lane) => {
    const ranked = [...available]
      .sort((left, right) => laneWeight(right, lane.id) - laneWeight(left, lane.id) || right.level - left.level);

    const assigned = ranked.slice(0, lane.slotCount);
    const assignedIds = new Set(assigned.map((member) => member.id));

    for (let index = available.length - 1; index >= 0; index -= 1) {
      if (assignedIds.has(available[index].id)) available.splice(index, 1);
    }

    return {
      ...lane,
      members: assigned,
    };
  });

  return {
    key: formation,
    label: formation === "3511" ? "3-5-1-1" : "4-4-2",
    description:
      formation === "3511"
        ? "One finisher, one link, heavy midfield control."
        : "Two clear lines with balanced attack and defense.",
    lanes,
    bench: available,
  };
}
