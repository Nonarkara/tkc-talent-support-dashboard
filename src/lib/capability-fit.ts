import type {
  CompetencyFreshness,
  CompetencySignal,
  CompetencyStandard,
  Employee,
} from "@/app/command-center/_shared/types";
import type { SlotDimension } from "@/lib/project-slots";
import { SKILL_LABEL, type Skill } from "@/lib/skills-vocab";

export interface CapabilityFit {
  score: number;
  matched: number;
  total: number;
  gap_keys: string[];
  strengths: string[];
  reasons: string[];
  availability_fte: number;
  availability_state: "open" | "shared" | "loaded" | "overloaded";
  freshness: CompetencyFreshness;
  weighted_level_score: number;
}

export const DIMENSION_SKILL_MAP: Record<SlotDimension, Skill[]> = {
  technical: ["technical", "data_analysis"],
  sales: ["sales", "customer_success"],
  marketing: ["marketing", "sales", "customer_success"],
  outsourcing: ["procurement", "outsourcing_mgmt", "delivery_ops"],
  paperwork: ["finance_paperwork", "delivery_ops", "procurement"],
};

export function standardsIndex(standards: CompetencyStandard[]) {
  return new Map(standards.map((item) => [item.skill_key, item]));
}

export function availabilityStateForFte(fte: number): CapabilityFit["availability_state"] {
  if (fte > 1.05) return "overloaded";
  if (fte >= 0.9) return "loaded";
  if (fte >= 0.45) return "shared";
  return "open";
}

export function skillsForDimension(dimension: SlotDimension) {
  return DIMENSION_SKILL_MAP[dimension];
}

export function capabilityFitForDimension(
  employee: Employee,
  dimension: SlotDimension,
  standards: CompetencyStandard[],
) {
  return capabilityFit(employee, skillsForDimension(dimension), standards);
}

export function capabilityFit(
  employee: Employee,
  requiredKeys: readonly string[],
  standards: CompetencyStandard[],
): CapabilityFit {
  const index = standardsIndex(standards);
  const summary = new Map(
    (employee.competency_summary ?? []).map((item) => [item.skill_key, item]),
  );

  if (requiredKeys.length === 0) {
    const availabilityFte = employee.availability_fte ?? 0;
    return {
      score: Math.max(20, 100 - Math.round(availabilityFte * 20)),
      matched: 0,
      total: 0,
      gap_keys: [],
      strengths: [],
      reasons: employee.active_allocations?.length
        ? [`Load ${availabilityFte.toFixed(1)} FTE across ${employee.active_allocations.length} active assignments.`]
        : ["No required capability selected yet."],
      availability_fte: availabilityFte,
      availability_state: availabilityStateForFte(availabilityFte),
      freshness: "unknown",
      weighted_level_score: 0,
    };
  }

  let matched = 0;
  let weightedEarned = 0;
  let weightedPossible = 0;
  const gapKeys: string[] = [];
  const strengths: string[] = [];
  const freshnesses: CompetencyFreshness[] = [];

  for (const key of requiredKeys) {
    const standard = index.get(key);
    const evidence = summary.get(key);
    const weight = Number(standard?.weight ?? 1);
    const expected = standard?.expected_level ?? 3;
    const actual = evidence?.actual_level ?? fallbackLevel(employee, key);
    const freshness = evidence?.freshness ?? (actual > 0 ? "unknown" : "stale");
    const freshnessFactor = freshnessWeight(freshness);

    freshnesses.push(freshness);
    weightedPossible += weight;

    if (actual > 0) {
      matched += 1;
      const levelRatio = Math.min(1.15, actual / Math.max(expected, 1));
      weightedEarned += weight * levelRatio * freshnessFactor;
      if (actual >= expected) {
        strengths.push(key);
      }
      if (actual < expected) {
        gapKeys.push(key);
      }
    } else {
      gapKeys.push(key);
    }
  }

  const weightedLevelScore =
    weightedPossible > 0 ? (weightedEarned / weightedPossible) * 100 : 0;

  const availabilityFte = employee.availability_fte ?? 0;
  const availabilityPenalty =
    availabilityFte > 1.05 ? 18 : availabilityFte >= 0.9 ? 12 : availabilityFte >= 0.45 ? 5 : 0;
  const score = clamp(Math.round(weightedLevelScore - availabilityPenalty), 0, 100);

  const reasons: string[] = [];
  if (gapKeys.length > 0) {
    reasons.push(`Gap: ${gapKeys.map(labelForKey).join(", ")}`);
  } else {
    reasons.push(`Covers ${requiredKeys.map(labelForKey).join(", ")}`);
  }
  const overallFreshness = aggregateFreshness(freshnesses);
  if (overallFreshness === "stale") {
    reasons.push("Evidence is stale for at least one required skill.");
  } else if (overallFreshness === "aging") {
    reasons.push("Evidence is aging; good enough for workshop use, but should be refreshed.");
  }
  if (availabilityFte > 0) {
    reasons.push(`Current load ${availabilityFte.toFixed(1)} FTE.`);
  }

  return {
    score,
    matched,
    total: requiredKeys.length,
    gap_keys: unique(gapKeys),
    strengths: unique(strengths),
    reasons,
    availability_fte: availabilityFte,
    availability_state: availabilityStateForFte(availabilityFte),
    freshness: overallFreshness,
    weighted_level_score: Math.round(weightedLevelScore),
  };
}

function fallbackLevel(employee: Employee, key: string) {
  const hasSkill = (employee.skills ?? []).includes(key);
  if (!hasSkill) return 0;
  return 3;
}

function freshnessWeight(freshness: CompetencyFreshness) {
  switch (freshness) {
    case "fresh":
      return 1;
    case "aging":
      return 0.9;
    case "stale":
      return 0.72;
    case "unknown":
    default:
      return 0.82;
  }
}

function aggregateFreshness(freshnesses: CompetencyFreshness[]): CompetencyFreshness {
  if (freshnesses.length === 0) return "unknown";
  if (freshnesses.includes("stale")) return "stale";
  if (freshnesses.includes("aging")) return "aging";
  if (freshnesses.includes("fresh")) return "fresh";
  return "unknown";
}

function labelForKey(key: string) {
  return (SKILL_LABEL as Record<string, string>)[key] ?? key;
}

function clamp(value: number, min: number, max: number) {
  return Math.max(min, Math.min(max, value));
}

function unique(values: string[]) {
  return Array.from(new Set(values));
}
