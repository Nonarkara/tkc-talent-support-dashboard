/**
 * Squad readiness — does this handful of people cover the mission?
 *
 * The Formation canvas asks "is slot X filled with a good-fit archetype?"
 * The Ninja tab asks a different question: "for skills A B C D E, does
 * my squad of N people cover all of them? where are the single points
 * of failure?"
 *
 * This file answers that second question. It's deliberately skill-native
 * (not archetype-native) — matches the user's framing of "procurement,
 * survey, outsourcing, etc."
 *
 * Output is a ReadinessReport that the ReadinessStrip component renders
 * directly: per-skill bars, gap list, overall %. Chemistry is bolted on
 * via the existing calculateChemistry() so the boss sees the same team
 * dynamics the Formation canvas shows.
 */

import type { Employee } from "@/app/command-center/_shared/types";
import { parseSkills, SKILLS, type Skill } from "./skills-vocab";
import { calculateChemistry } from "./team-chemistry";
import type { RPGAttributes } from "./rpg-attributes";

export type BenchDepth = "missing" | "single-point" | "healthy";

export interface SkillReadiness {
  /** Was this skill toggled on in the Expedia panel? */
  required: boolean;
  /** Count of squad members whose employees.skills[] contains this skill. */
  coverage: number;
  /** 0 → missing, 1 → single-point-of-failure, 2+ → healthy. */
  bench_depth: BenchDepth;
}

export interface ReadinessReport {
  /**
   * 0–100 headline number. Harmonic mean of coverage rate × redundancy
   * rate over REQUIRED skills — so one gap tanks the score rather than
   * getting averaged away.
   */
  overall_pct: number;
  per_skill: Record<Skill, SkillReadiness>;
  /** Required skills with coverage === 0. Red bars. */
  gaps: Skill[];
  /** Required skills with coverage === 1. Amber bars. */
  single_points: Skill[];
  /** Reused team-chemistry overall (0–100). 0 if <2 members. */
  chemistry: number;
}

/**
 * Compute readiness for a squad.
 *
 * @param members - squad members (e.g. SquadTray contents). Length 0–8.
 * @param required - toggled skills from the Expedia panel.
 */
export function squadReadiness(
  members: Employee[],
  required: Skill[],
): ReadinessReport {
  const requiredSet = new Set<Skill>(required);

  // Per-skill coverage across the whole vocabulary. We compute all 10
  // so the UI can show "here's what you've got" even when the boss
  // hasn't toggled anything yet — useful for just browsing.
  const per_skill = {} as Record<Skill, SkillReadiness>;
  for (const skill of SKILLS) {
    const coverage = members.reduce((count, member) => {
      const has = parseSkills(member.skills).includes(skill);
      return count + (has ? 1 : 0);
    }, 0);
    per_skill[skill] = {
      required: requiredSet.has(skill),
      coverage,
      bench_depth: benchDepth(coverage),
    };
  }

  const gaps = required.filter((s) => per_skill[s].coverage === 0);
  const single_points = required.filter((s) => per_skill[s].coverage === 1);

  // Overall % — only considers required skills. If nothing is required,
  // return 0 (the UI should render "pick skills to see readiness").
  const overall_pct =
    required.length === 0 ? 0 : overallScore(required, per_skill);

  const chemistry = calculateChemistry(toRPGAttrs(members)).overall;

  return { overall_pct, per_skill, gaps, single_points, chemistry };
}

// ─── helpers ─────────────────────────────────────────────────────────────

function benchDepth(coverage: number): BenchDepth {
  if (coverage === 0) return "missing";
  if (coverage === 1) return "single-point";
  return "healthy";
}

/**
 * Harmonic mean of coverage-rate × redundancy-rate.
 *
 * coverage-rate   = (# required skills with ≥1 person) / (# required)
 * redundancy-rate = mean( min(coverage_i, 2) / 2 ) over required skills
 *
 * Coverage rate alone would reward "everything has 1 person"; adding
 * redundancy rewards bench depth. Harmonic mean means a zero in either
 * dimension drags the score toward zero, which is what the boss wants
 * to see visually — not a polite 50%.
 */
function overallScore(
  required: Skill[],
  per_skill: Record<Skill, SkillReadiness>,
): number {
  const covered = required.filter((s) => per_skill[s].coverage >= 1).length;
  const coverageRate = covered / required.length;

  const redundancyRate =
    required.reduce((acc, s) => {
      const c = Math.min(per_skill[s].coverage, 2);
      return acc + c / 2;
    }, 0) / required.length;

  if (coverageRate === 0 || redundancyRate === 0) return 0;
  const harmonic = (2 * coverageRate * redundancyRate) / (coverageRate + redundancyRate);
  return Math.round(harmonic * 100);
}

/**
 * Project Employee → RPGAttributes. Falls back to 10 (the RPG baseline)
 * for any missing stat so chemistry doesn't divide by zero or return
 * spurious gaps because a new hire lacks attribute rows yet.
 */
function toRPGAttrs(members: Employee[]): RPGAttributes[] {
  return members.map((m) => ({
    str: m.attr_str ?? 10,
    int: m.attr_int ?? 10,
    wis: m.attr_wis ?? 10,
    cha: m.attr_cha ?? 10,
    dex: m.attr_dex ?? 10,
    con: m.attr_con ?? 10,
  }));
}

