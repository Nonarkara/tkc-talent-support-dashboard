/**
 * COE Readiness — per-CoE/Mission readiness scoring.
 *
 * Adapted from squad-readiness.ts but scoped to a functional division
 * or CoE/Mission staffing model.
 *
 * Evaluates: "Does this group of people have the skills needed for this CoE?"
 * Metric: harmonic mean of coverage × bench_depth, so gaps tank the score.
 */

import { SKILLS, type Skill } from './skills-vocab';
import type { Employee } from '@/app/command-center/_shared/types';

export interface CoeReadinessReport {
  coe_name: string;
  overall_pct: number;          // 0-100
  per_skill: Record<Skill, {
    required: boolean;
    coverage: number;            // count of people with this skill
    bench_depth: 'missing' | 'single-point' | 'healthy';
  }>;
  gaps: Skill[];                 // required but coverage === 0
  single_points: Skill[];        // required but coverage === 1
  chemistry: number;             // team cohesion 0-100
  headcount: number;
}

/**
 * Calculate readiness for a CoE given its allocated staff.
 *
 * @param members — employees allocated to this CoE
 * @param required — skills this CoE needs (e.g. all 10, or a subset)
 * @param coeName — for the report label
 */
export function coeReadiness(
  members: Employee[],
  required: Skill[] = [...SKILLS],
  coeName: string = 'Unknown CoE'
): CoeReadinessReport {
  const requiredSet = new Set(required);

  // Per-skill coverage
  const per_skill = Object.fromEntries(
    SKILLS.map((skill) => [
      skill,
      { required: false, coverage: 0, bench_depth: 'missing' as const },
    ]),
  ) as CoeReadinessReport['per_skill'];
  for (const skill of SKILLS) {
    const count = members.filter((emp) => {
      const empSkills = new Set(emp.skills ?? []);
      return empSkills.has(skill);
    }).length;

    const bench_depth =
      count === 0 ? 'missing' : count === 1 ? 'single-point' : 'healthy';

    per_skill[skill] = {
      required: requiredSet.has(skill),
      coverage: count,
      bench_depth,
    };
  }

  // Gaps & single-points
  const gaps = required.filter((s) => per_skill[s].coverage === 0);
  const single_points = required.filter((s) => per_skill[s].coverage === 1);

  // Harmonic scoring
  // For each required skill, score = coverage_rate × redundancy_factor
  // coverage_rate = (actual count / needed count). Assume "needed" = 1 minimum.
  // redundancy_factor = 1.0 if ≥2 people, 0.5 if exactly 1, 0 if missing
  const scores: number[] = [];
  for (const skill of required) {
    const { coverage } = per_skill[skill];
    let score: number;
    if (coverage === 0) {
      score = 0;
    } else if (coverage === 1) {
      score = 0.5; // Single point of failure
    } else {
      score = 1.0; // Healthy depth
    }
    scores.push(score);
  }

  // Harmonic mean (avoid averaging away the impact of gaps)
  const overall_pct =
    scores.length === 0
      ? 100
      : (scores.length / scores.reduce((sum, score) => sum + (1 / score), 0)) * 100;

  // Chemistry: use team size as proxy (0-100). Longer refactor would reuse calculateChemistry.
  const chemistry = Math.min(100, members.length * 20); // 1 person = 20%, max 100%

  return {
    coe_name: coeName,
    overall_pct: Math.round(overall_pct),
    per_skill,
    gaps,
    single_points,
    chemistry: Math.round(chemistry),
    headcount: members.length,
  };
}

/**
 * Utilization report for a function/division.
 * Answers: "Is this function over-allocated, under-allocated, or healthy?"
 */
export interface FunctionUtilizationReport {
  function_code: string;
  total_headcount: number;
  allocated_headcount: number;
  utilization_pct: number;      // allocated / total × 100
  idle_headcount: number;
  warning: 'under-allocated' | 'over-allocated' | 'healthy' | null;
}

export function functionUtilization(
  functionCode: string,
  totalHeadcount: number,
  allocatedHeadcount: number
): FunctionUtilizationReport {
  const utilization_pct = (allocatedHeadcount / totalHeadcount) * 100;
  const idle_headcount = totalHeadcount - allocatedHeadcount;

  let warning: FunctionUtilizationReport['warning'] = null;
  if (allocatedHeadcount > totalHeadcount) {
    warning = 'over-allocated';
  } else if (utilization_pct < 50) {
    warning = 'under-allocated';
  }

  return {
    function_code: functionCode,
    total_headcount: totalHeadcount,
    allocated_headcount: allocatedHeadcount,
    utilization_pct: Math.round(utilization_pct),
    idle_headcount: Math.max(0, idle_headcount),
    warning,
  };
}
