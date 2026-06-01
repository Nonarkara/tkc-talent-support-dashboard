/**
 * Matrix Scenarios — the core scenario logic.
 *
 * A scenario is a staffing model:
 * - 4 functions + 4 CoEs
 * - Allocation map: { employee_id → { coe_name → % }, ... }
 * - Computed readiness/utilization metrics
 *
 * This library handles:
 * 1. Load/save scenario
 * 2. Update allocations (real-time, no DB write)
 * 3. Recompute metrics
 * 4. Serialize for Sheets export
 */

import type { Employee } from '@/app/command-center/_shared/types';
import { coeReadiness, functionUtilization, type CoeReadinessReport, type FunctionUtilizationReport } from './coe-readiness';
import { SKILLS, type Skill } from './skills-vocab';
import { CURRENT_CYCLE } from './cycle';

export const DEFAULT_FUNCTIONS = ['SALES', 'ENTERPRISE', 'FINANCE', 'HR_ADMIN'];
export const DEFAULT_COES = [
  'Solution Design & Architecture',
  'Model Development & Deployment',
  'Project & Pre-sales Support',
  'AI Use Case & Innovation',
];

export interface MatrixScenario {
  id?: string;
  name: string;
  description?: string;
  cycle: string;

  function_codes: string[];
  coe_names: string[];

  // { employee_id → { coe_name → allocation_% }, ... }
  allocations: Record<string, Record<string, number>>;

  // Computed metrics
  metrics?: MatrixMetrics;

  created_at?: string;
  updated_at?: string;
}

export interface MatrixMetrics {
  coe_readiness: Record<string, CoeReadinessReport>;
  function_utilization: Record<string, FunctionUtilizationReport>;
  skill_scarcity: Record<Skill, { total_coverage: number; coes_with_gap: string[] }>;
  total_over_allocation_count: number;
}

/**
 * Create a blank scenario with the default TOM structure.
 */
export function createBlankScenario(name: string, cycle: string = CURRENT_CYCLE): MatrixScenario {
  return {
    name,
    cycle,
    function_codes: [...DEFAULT_FUNCTIONS],
    coe_names: [...DEFAULT_COES],
    allocations: {},
  };
}

/**
 * Set an employee's allocation to a CoE.
 * - Clamps % to 0-100
 * - Auto-removes if %=0
 * - Ensures total per employee doesn't exceed 100% (warning, not error)
 */
export function setAllocation(
  scenario: MatrixScenario,
  employeeId: string,
  coeName: string,
  pct: number
): MatrixScenario {
  const clamped = Math.max(0, Math.min(100, pct));
  const currentEmployeeAllocations = scenario.allocations[employeeId] ?? {};
  const nextEmployeeAllocations = { ...currentEmployeeAllocations };
  const nextAllocations = { ...scenario.allocations };

  if (clamped === 0) {
    delete nextEmployeeAllocations[coeName];
    if (Object.keys(nextEmployeeAllocations).length === 0) {
      delete nextAllocations[employeeId];
    } else {
      nextAllocations[employeeId] = nextEmployeeAllocations;
    }
  } else {
    nextEmployeeAllocations[coeName] = clamped;
    nextAllocations[employeeId] = nextEmployeeAllocations;
  }

  return {
    ...scenario,
    allocations: nextAllocations,
  };
}

/**
 * Check if an employee is over-allocated (total > 100%).
 */
export function isOverAllocated(
  scenario: MatrixScenario,
  employeeId: string
): { overAllocated: boolean; total: number } {
  const allocations = scenario.allocations[employeeId];
  if (!allocations) return { overAllocated: false, total: 0 };

  const total = Object.values(allocations).reduce((a, b) => a + b, 0);
  return { overAllocated: total > 100, total };
}

/**
 * Recompute all metrics for a scenario.
 * Returns a new scenario with metrics filled in.
 */
export function recomputeMetrics(
  scenario: MatrixScenario,
  allEmployees: Employee[]
): MatrixScenario {
  const employeeMap = new Map(allEmployees.map((e) => [e.id, e]));

  // Map employees to functions for utilization
  const employeesByFunction = new Map<string, Employee[]>();
  for (const func of scenario.function_codes) {
    const empsByFunc = allEmployees.filter((e) => e.dept_code === func);
    employeesByFunction.set(func, empsByFunc);
  }

  // Map employees to CoEs for readiness
  const employeesByCoe = new Map<string, Employee[]>();
  for (const coe of scenario.coe_names) {
    const empsByCoe: Employee[] = [];
    for (const [empId, allocMap] of Object.entries(scenario.allocations)) {
      if (allocMap[coe] && allocMap[coe] > 0) {
        const emp = employeeMap.get(empId);
        if (emp) empsByCoe.push(emp);
      }
    }
    employeesByCoe.set(coe, empsByCoe);
  }

  // Compute CoE readiness
  const coe_readiness: Record<string, CoeReadinessReport> = {};
  for (const coe of scenario.coe_names) {
    coe_readiness[coe] = coeReadiness(employeesByCoe.get(coe) || [], undefined, coe);
  }

  // Compute function utilization
  const function_utilization: Record<string, FunctionUtilizationReport> = {};
  for (const func of scenario.function_codes) {
    const total = employeesByFunction.get(func)?.length || 0;
    const allocated = Object.entries(scenario.allocations).reduce((sum, [employeeId, allocMap]) => {
      const employee = employeeMap.get(employeeId);
      if (employee?.dept_code !== func) return sum;
      const allocatedPct = Object.values(allocMap).reduce((a, b) => a + b, 0);
      return sum + allocatedPct / 100;
    }, 0);
    function_utilization[func] = functionUtilization(func, total, allocated);
  }

  // Compute skill scarcity
  const skill_scarcity = Object.fromEntries(
    SKILLS.map((skill) => [skill, { total_coverage: 0, coes_with_gap: [] as string[] }]),
  ) as MatrixMetrics['skill_scarcity'];
  for (const skill of SKILLS) {
    let total_coverage = 0;
    const coes_with_gap: string[] = [];
    for (const [coe, report] of Object.entries(coe_readiness)) {
      if (report.per_skill[skill]) {
        total_coverage += report.per_skill[skill].coverage;
        if (report.per_skill[skill].coverage === 0) {
          coes_with_gap.push(coe);
        }
      }
    }
    skill_scarcity[skill] = { total_coverage, coes_with_gap };
  }

  // Count over-allocations
  let total_over_allocation_count = 0;
  for (const allocMap of Object.values(scenario.allocations)) {
    const total = Object.values(allocMap).reduce((a, b) => a + b, 0);
    if (total > 100) total_over_allocation_count++;
  }

  return {
    ...scenario,
    metrics: {
      coe_readiness,
      function_utilization,
      skill_scarcity,
      total_over_allocation_count,
    },
  };
}

/**
 * Serialize a scenario for Sheets export.
 */
export function scenarioToSheets(scenario: MatrixScenario): Record<string, unknown> {
  return {
    name: scenario.name,
    description: scenario.description || '',
    cycle: scenario.cycle,
    functions: scenario.function_codes.join(' | '),
    coes: scenario.coe_names.join(' | '),
    overall_readiness_pct: scenario.metrics?.coe_readiness
      ? Math.round(
          Object.values(scenario.metrics.coe_readiness).reduce((a, r) => a + r.overall_pct, 0) /
            scenario.coe_names.length
        )
      : 0,
    total_over_allocations: scenario.metrics?.total_over_allocation_count || 0,
    created_at: scenario.created_at || new Date().toISOString(),
  };
}
