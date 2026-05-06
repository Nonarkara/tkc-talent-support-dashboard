import {
  defaultProjectSlots,
  normalizeSlots,
  slotTotal,
  type ProjectSlots,
} from "./project-slots";

export type ProjectScale = "S" | "M" | "L" | "XL";

export interface ProjectPlanningInput {
  budget_thb?: number | null;
  monthly_ceiling?: number | null;
  team_size?: number | null;
  required_skills?: string[] | null;
  project_slots?: unknown;
  priority?: string | null;
}

const SCALE_MIN_TEAM: Record<ProjectScale, number> = {
  S: 3,
  M: 5,
  L: 8,
  XL: 12,
};

const SCALE_MAX_TEAM: Record<ProjectScale, number> = {
  S: 6,
  M: 10,
  L: 16,
  XL: 24,
};

export function inferProjectScale(input: ProjectPlanningInput): ProjectScale {
  const budgetMillion = Number(input.budget_thb ?? 0) / 1_000_000;
  const slotDemand = slotTotal(normalizeSlots(input.project_slots));
  const skillCount = (input.required_skills ?? []).length;

  if (budgetMillion >= 250 || slotDemand >= 12 || skillCount >= 10) return "XL";
  if (budgetMillion >= 100 || slotDemand >= 8 || skillCount >= 7) return "L";
  if (budgetMillion >= 35 || slotDemand >= 5 || skillCount >= 4) return "M";
  return "S";
}

export function calculateSuggestedTeamSize(input: ProjectPlanningInput): number {
  if (input.team_size != null && Number.isFinite(input.team_size)) {
    return clampTeamSize(input.team_size);
  }

  const scale = inferProjectScale(input);
  const monthlyCap =
    Number(input.monthly_ceiling ?? 0) > 0
      ? Number(input.monthly_ceiling)
      : Number(input.budget_thb ?? 0) > 0
        ? Number(input.budget_thb) / 10
        : 0;
  const budgetSeats =
    monthlyCap > 0 ? Math.max(0, Math.round(monthlyCap / 85_000)) : 0;
  const slotDemand = slotTotal(normalizeSlots(input.project_slots));
  const skillComplexity = Math.ceil((input.required_skills ?? []).length / 2);
  const priorityBoost =
    input.priority === "critical" ? 2 :
    input.priority === "high" ? 1 : 0;

  const floor = SCALE_MIN_TEAM[scale];
  const ceiling = SCALE_MAX_TEAM[scale];
  const demandDriven = Math.max(slotDemand, floor + skillComplexity + priorityBoost);
  const suggested =
    budgetSeats > 0
      ? Math.max(floor, Math.min(Math.max(demandDriven, budgetSeats), ceiling))
      : Math.max(floor, Math.min(demandDriven, ceiling));

  return clampTeamSize(suggested);
}

export function deriveProjectSlots(input: ProjectPlanningInput): ProjectSlots {
  const explicit = normalizeSlots(input.project_slots);
  if (slotTotal(explicit) > 0) return explicit;

  const scale = inferProjectScale(input);
  const teamSize = calculateSuggestedTeamSize(input);
  const slots = defaultProjectSlots();

  slots.technical =
    scale === "XL" ? Math.max(4, Math.round(teamSize * 0.42)) :
    scale === "L" ? Math.max(3, Math.round(teamSize * 0.4)) :
    Math.max(2, Math.round(teamSize * 0.38));
  slots.sales = Math.max(1, Math.round(teamSize * 0.18));
  slots.marketing = teamSize >= 6 ? 1 : 0;
  slots.outsourcing = teamSize >= 7 ? 1 : 0;
  slots.paperwork = teamSize >= 5 ? 1 : 0;

  for (const rawSkill of input.required_skills ?? []) {
    const skill = rawSkill.trim().toUpperCase();
    if (skill === "SALES" || skill === "BIZ_DEV" || skill === "ACCOUNT") {
      slots.sales += 1;
      continue;
    }
    if (skill === "MARKETING" || skill === "BRAND") {
      slots.marketing += 1;
      continue;
    }
    if (skill === "PM" || skill === "PROCUREMENT" || skill === "VENDOR") {
      slots.outsourcing += 1;
      slots.paperwork += 1;
      continue;
    }
    slots.technical += 1;
  }

  rebalanceSlots(slots, teamSize);
  return slots;
}

export function calculateFilledPct(required: ProjectSlots, filledFte: number, fallbackTeamSize?: number | null) {
  const requiredTotal = slotTotal(required);
  const target = requiredTotal > 0 ? requiredTotal : clampTeamSize(fallbackTeamSize ?? 0);
  if (target <= 0) return 0;
  return Math.max(0, Math.min(100, Math.round((filledFte / target) * 100)));
}

function rebalanceSlots(slots: ProjectSlots, targetSize: number) {
  const total = slotTotal(slots);
  if (total === targetSize) return;

  if (total < targetSize) {
    slots.technical += targetSize - total;
    return;
  }

  const reducible = ["marketing", "paperwork", "outsourcing", "sales", "technical"] as const;
  let overflow = total - targetSize;
  for (const key of reducible) {
    const minimum = key === "technical" ? 1 : 0;
    while (overflow > 0 && slots[key] > minimum) {
      slots[key] -= 1;
      overflow -= 1;
    }
  }
}

function clampTeamSize(value: number) {
  return Math.max(2, Math.min(40, Math.round(value)));
}
