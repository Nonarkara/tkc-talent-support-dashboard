'use client';

/**
 * MatrixGrid - allocation sandbox.
 * Rows are functions, columns are CoEs. Candidates are draggable, cells are
 * live drop zones, and every percent control updates the scenario immediately.
 */

import { useMemo, useState } from 'react';
import type { CSSProperties, DragEvent } from 'react';
import type { Employee } from '@/app/command-center/_shared/types';
import { capabilityFit } from '@/lib/capability-fit';
import type { FunctionUtilizationReport } from '@/lib/coe-readiness';
import type { MatrixScenario } from '@/lib/matrix-scenarios';
import type { CompetencyStandard } from '../_shared/types';

const EMPLOYEE_MIME = 'application/x-tkc-matrix-employee';
const STEP = 10;
const DROP_DEFAULT = 25;

const FUNCTION_LABELS: Record<string, string> = {
  SALES: 'Sales',
  ENTERPRISE: 'Operations',
  FINANCE: 'Finance',
  HR_ADMIN: 'HR & Admin',
};

interface AllocationEntry {
  employee: Employee;
  coe: string;
  pct: number;
  totalPct: number;
}

export function MatrixGrid({
  scenario,
  allEmployees,
  filteredEmployees,
  selectedSkills,
  competencyStandards,
  onAllocate,
}: {
  scenario: MatrixScenario;
  allEmployees: Employee[];
  filteredEmployees: Employee[];
  selectedSkills: string[];
  competencyStandards: CompetencyStandard[];
  onAllocate: (employeeId: string, coeName: string, pct: number) => void;
}) {
  const [draggingId, setDraggingId] = useState<string | null>(null);
  const [activeCell, setActiveCell] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const employeeById = useMemo(
    () => new Map(allEmployees.map((employee) => [employee.id, employee])),
    [allEmployees],
  );
  const draggingEmployee = draggingId ? employeeById.get(draggingId) ?? null : null;

  const allocationTotals = useMemo(() => {
    const totals: Record<string, number> = {};
    for (const [employeeId, byCoe] of Object.entries(scenario.allocations)) {
      totals[employeeId] = Object.values(byCoe).reduce((sum, pct) => sum + pct, 0);
    }
    return totals;
  }, [scenario.allocations]);

  const entriesByCell = useMemo(() => {
    const result: Record<string, AllocationEntry[]> = {};
    for (const func of scenario.function_codes) {
      for (const coe of scenario.coe_names) {
        result[cellKey(func, coe)] = [];
      }
    }

    for (const [employeeId, byCoe] of Object.entries(scenario.allocations)) {
      const employee = employeeById.get(employeeId);
      if (!employee) continue;
      const func = employee.dept_code ?? 'UNKNOWN';
      for (const [coe, pct] of Object.entries(byCoe)) {
        const key = cellKey(func, coe);
        if (!result[key]) continue;
        result[key].push({
          employee,
          coe,
          pct,
          totalPct: allocationTotals[employeeId] ?? pct,
        });
      }
    }

    for (const entries of Object.values(result)) {
      entries.sort((left, right) => right.pct - left.pct || left.employee.display_name.localeCompare(right.employee.display_name));
    }
    return result;
  }, [allocationTotals, employeeById, scenario.allocations, scenario.coe_names, scenario.function_codes]);

  const coeTotals = useMemo(() => {
    const totals: Record<string, number> = {};
    for (const coe of scenario.coe_names) totals[coe] = 0;
    for (const byCoe of Object.values(scenario.allocations)) {
      for (const [coe, pct] of Object.entries(byCoe)) {
        totals[coe] = (totals[coe] ?? 0) + pct / 100;
      }
    }
    return totals;
  }, [scenario.allocations, scenario.coe_names]);

  if (!scenario.metrics) {
    return <div style={{ color: 'var(--ink-2)', padding: '20px' }}>Loading metrics...</div>;
  }

  function handleDragStart(event: DragEvent<HTMLElement>, employee: Employee) {
    event.dataTransfer.setData(EMPLOYEE_MIME, employee.id);
    event.dataTransfer.setData('text/plain', employee.id);
    event.dataTransfer.effectAllowed = 'copyMove';
    setDraggingId(employee.id);
    setNotice(null);
  }

  function handleDragEnd() {
    setDraggingId(null);
    setActiveCell(null);
  }

  function handleDrop(event: DragEvent<HTMLElement>, func: string, coe: string) {
    event.preventDefault();
    const employeeId =
      event.dataTransfer.getData(EMPLOYEE_MIME) ||
      event.dataTransfer.getData('text/plain') ||
      draggingId;
    const employee = employeeId ? employeeById.get(employeeId) : null;

    setActiveCell(null);
    setDraggingId(null);

    if (!employee) return;
    const employeeFunc = employee.dept_code ?? func;
    if (employeeFunc !== func) {
      setNotice(`${employee.display_name} is in ${labelForFunction(employeeFunc)}. Drop in that function row.`);
      return;
    }

    const nextPct = nextDropPct(scenario, allocationTotals, employee.id, coe);
    onAllocate(employee.id, coe, nextPct);
    setNotice(`${employee.display_name} -> ${shortCoe(coe)} ${nextPct}%`);
  }

  function changeAllocation(employee: Employee, coe: string, nextPct: number) {
    const clamped = clamp(nextPct, 0, 100);
    onAllocate(employee.id, coe, clamped);
    setNotice(clamped === 0
      ? `${employee.display_name} removed from ${shortCoe(coe)}`
      : `${employee.display_name} -> ${shortCoe(coe)} ${clamped}%`);
  }

  return (
    <div
      style={{
        border: '1px solid var(--border-subtle)',
        background: 'var(--ink-4)',
        padding: 12,
        display: 'grid',
        gap: 12,
        minWidth: 0,
      }}
    >
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 220px), 1fr))',
          gap: 8,
        }}
      >
        {filteredEmployees.slice(0, 8).map((employee) => {
          const fit = capabilityFit(employee, selectedSkills, competencyStandards);
          const total = allocationTotals[employee.id] ?? 0;
          const over = total > 100;
          const employeeFunc = employee.dept_code ?? 'UNKNOWN';

          return (
            <div
              key={employee.id}
              draggable
              onDragStart={(event) => handleDragStart(event, employee)}
              onDragEnd={handleDragEnd}
              title={`Drag ${employee.display_name} into a ${labelForFunction(employeeFunc)} CoE cell`}
              style={{
                border: `1px solid ${over ? 'var(--rpg-red)' : 'var(--border-subtle)'}`,
                background: draggingId === employee.id ? 'rgba(243,182,31,0.13)' : 'rgba(0,0,0,0.14)',
                color: 'var(--ink-0)',
                cursor: 'grab',
                display: 'grid',
                gap: 8,
                minHeight: 104,
                padding: '9px 10px',
                opacity: draggingId === employee.id ? 0.72 : 1,
                transition: 'border-color 140ms ease, background 140ms ease, opacity 100ms ease',
              }}
            >
              <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) auto', gap: 8, alignItems: 'start' }}>
                <div style={{ minWidth: 0, display: 'grid', gap: 4 }}>
                  <div
                    style={{
                      color: 'var(--ink-0)',
                      fontSize: 11,
                      fontWeight: 800,
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap',
                    }}
                  >
                    {employee.display_name}
                  </div>
                  <div style={{ color: 'var(--ink-1)', fontSize: 9, letterSpacing: '0.08em', textTransform: 'uppercase' }}>
                    {labelForFunction(employeeFunc)} · {Number(employee.availability_fte ?? 0).toFixed(1)}FTE
                  </div>
                  <div style={{ color: fitTone(fit.score), fontSize: 10, fontWeight: 800 }}>
                    FIT {fit.score}
                  </div>
                </div>
                <div style={{ display: 'grid', gap: 5, justifyItems: 'end' }}>
                  <span
                    style={{
                      border: `1px solid ${over ? 'var(--rpg-red)' : 'var(--ink-2)'}`,
                      color: over ? 'var(--rpg-red)' : 'var(--ink-1)',
                      fontSize: 9,
                      fontWeight: 800,
                      lineHeight: 1,
                      padding: '4px 6px',
                    }}
                  >
                    {total}%
                  </span>
                  <span style={{ color: 'var(--rpg-yellow)', fontSize: 9, letterSpacing: '0.1em', textTransform: 'uppercase' }}>
                    Drag
                  </span>
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: `repeat(${scenario.coe_names.length}, minmax(0, 1fr))`, gap: 5 }}>
                {scenario.coe_names.map((coe) => (
                  <button
                    key={`${employee.id}:${coe}`}
                    type="button"
                    onClick={(event) => {
                      event.stopPropagation();
                      const nextPct = nextDropPct(scenario, allocationTotals, employee.id, coe);
                      onAllocate(employee.id, coe, nextPct);
                      setNotice(`${employee.display_name} -> ${shortCoe(coe)} ${nextPct}%`);
                    }}
                    title={`Add ${employee.display_name} to ${shortCoe(coe)}`}
                    style={{
                      border: '1px solid rgba(243,182,31,0.45)',
                      background: 'rgba(243,182,31,0.1)',
                      color: 'var(--rpg-yellow)',
                      cursor: 'pointer',
                      fontFamily: 'inherit',
                      fontSize: 8,
                      fontWeight: 900,
                      letterSpacing: '0.06em',
                      lineHeight: 1,
                      minHeight: 24,
                      padding: '4px 2px',
                      textTransform: 'uppercase',
                    }}
                  >
                    {coeCode(coe)}
                  </button>
                ))}
              </div>
            </div>
          );
        })}
      </div>

      <div style={{ overflowX: 'auto', paddingBottom: 2 }}>
        <div style={{ minWidth: 840, display: 'grid', gap: 1 }}>
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: `132px repeat(${scenario.coe_names.length}, minmax(160px, 1fr))`,
              gap: 1,
            }}
          >
            <div />
            {scenario.coe_names.map((coe) => {
              const report = scenario.metrics?.coe_readiness[coe];
              const readinessPct = report?.overall_pct ?? 0;
              return (
                <div
                  key={coe}
                  style={{
                    border: '1px solid var(--border-subtle)',
                    background: 'rgba(0,0,0,0.16)',
                    padding: '9px 10px',
                    display: 'grid',
                    gap: 5,
                    minHeight: 72,
                  }}
                >
                  <div
                    style={{
                      color: 'var(--ink-0)',
                      fontSize: 10,
                      fontWeight: 800,
                      letterSpacing: '0.06em',
                      textTransform: 'uppercase',
                    }}
                  >
                    {shortCoe(coe)}
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8, fontSize: 9, color: 'var(--ink-1)' }}>
                    <span>{readinessPct}% ready</span>
                    <span>{formatFte(coeTotals[coe] ?? 0)}FTE</span>
                  </div>
                  <Meter pct={readinessPct} tone={readinessTone(readinessPct)} />
                </div>
              );
            })}
          </div>

          {scenario.function_codes.map((func) => (
            <div
              key={func}
              style={{
                display: 'grid',
                gridTemplateColumns: `132px repeat(${scenario.coe_names.length}, minmax(160px, 1fr))`,
                gap: 1,
              }}
            >
              <div
                style={{
                  border: '1px solid var(--rpg-blue)',
                  background: 'rgba(43,95,160,0.12)',
                  color: 'var(--ink-0)',
                  display: 'grid',
                  alignContent: 'center',
                  gap: 5,
                  minHeight: 132,
                  padding: '10px',
                }}
              >
                <div style={{ fontSize: 11, fontWeight: 800 }}>{labelForFunction(func)}</div>
                <div style={{ color: 'var(--ink-1)', fontSize: 9, lineHeight: 1.35 }}>
                  {functionUtilLabel(scenario.metrics?.function_utilization[func])}
                </div>
              </div>

              {scenario.coe_names.map((coe) => {
                const key = cellKey(func, coe);
                const entries = entriesByCell[key] ?? [];
                const active = activeCell === key;
                const canDrop = !draggingEmployee || (draggingEmployee.dept_code ?? func) === func;

                return (
                  <div
                    key={key}
                    onDragEnter={(event) => {
                      event.preventDefault();
                      setActiveCell(key);
                    }}
                    onDragLeave={() => setActiveCell((current) => (current === key ? null : current))}
                    onDragOver={(event) => {
                      event.preventDefault();
                      event.dataTransfer.dropEffect = canDrop ? 'copy' : 'none';
                    }}
                    onDrop={(event) => handleDrop(event, func, coe)}
                    style={{
                      border: `1px solid ${
                        active
                          ? canDrop
                            ? 'var(--rpg-yellow)'
                            : 'var(--rpg-red)'
                          : entries.length > 0
                            ? 'rgba(125,184,101,0.34)'
                            : 'var(--border-subtle)'
                      }`,
                      background: active
                        ? canDrop
                          ? 'rgba(243,182,31,0.12)'
                          : 'rgba(196,77,63,0.12)'
                        : entries.length > 0
                          ? 'rgba(91,140,74,0.07)'
                          : 'rgba(0,0,0,0.12)',
                      display: 'grid',
                      alignContent: entries.length > 0 ? 'start' : 'center',
                      gap: 7,
                      minHeight: 132,
                      padding: 8,
                      transition: 'border-color 120ms ease, background 120ms ease',
                    }}
                  >
                    {entries.length > 0 ? (
                      entries.map((entry) => (
                        <AllocationChip
                          key={`${entry.employee.id}:${entry.coe}`}
                          entry={entry}
                          onDragStart={(event) => handleDragStart(event, entry.employee)}
                          onDragEnd={handleDragEnd}
                          onDecrease={() => changeAllocation(entry.employee, coe, entry.pct - STEP)}
                          onIncrease={() => changeAllocation(entry.employee, coe, entry.pct + STEP)}
                          onRemove={() => changeAllocation(entry.employee, coe, 0)}
                        />
                      ))
                    ) : (
                      <div style={{ textAlign: 'center', display: 'grid', gap: 5 }}>
                        <div style={{ color: active ? (canDrop ? 'var(--rpg-yellow)' : 'var(--rpg-red)') : 'var(--ink-1)', fontSize: 10, fontWeight: 800, letterSpacing: '0.08em', textTransform: 'uppercase' }}>
                          {active ? (canDrop ? 'Drop' : 'Wrong row') : 'Open'}
                        </div>
                        <div style={{ color: 'var(--ink-1)', fontSize: 9, lineHeight: 1.35 }}>
                          {labelForFunction(func)} {'->'} {shortCoe(coe)}
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          ))}
        </div>
      </div>

      {notice ? (
        <div
          role="status"
          style={{
            border: '1px solid var(--border-subtle)',
            background: 'rgba(0,0,0,0.18)',
            color: notice.includes('Drop in') ? 'var(--rpg-orange)' : 'var(--flux-up)',
            fontSize: 10,
            lineHeight: 1.45,
            padding: '7px 9px',
          }}
        >
          {notice}
        </div>
      ) : null}
    </div>
  );
}

function AllocationChip({
  entry,
  onDragStart,
  onDragEnd,
  onDecrease,
  onIncrease,
  onRemove,
}: {
  entry: AllocationEntry;
  onDragStart: (event: DragEvent<HTMLElement>) => void;
  onDragEnd: () => void;
  onDecrease: () => void;
  onIncrease: () => void;
  onRemove: () => void;
}) {
  const over = entry.totalPct > 100;

  return (
    <div
      draggable
      onDragStart={onDragStart}
      onDragEnd={onDragEnd}
      style={{
        border: `1px solid ${over ? 'var(--rpg-red)' : 'var(--border-subtle)'}`,
        background: over ? 'rgba(196,77,63,0.13)' : 'rgba(0,0,0,0.16)',
        display: 'grid',
        gap: 6,
        padding: '7px 8px',
        cursor: 'grab',
      }}
      title={`${entry.employee.display_name} is allocated ${entry.pct}% here and ${entry.totalPct}% total`}
    >
      <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) auto', gap: 6, alignItems: 'center' }}>
        <div style={{ minWidth: 0 }}>
          <div
            style={{
              color: 'var(--ink-0)',
              fontSize: 10,
              fontWeight: 800,
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
            }}
          >
            {entry.employee.display_name}
          </div>
          <div style={{ color: over ? 'var(--rpg-red)' : 'var(--ink-1)', fontSize: 8, letterSpacing: '0.07em', textTransform: 'uppercase' }}>
            total {entry.totalPct}%
          </div>
        </div>
        <div style={{ color: over ? 'var(--rpg-red)' : 'var(--rpg-yellow)', fontSize: 14, fontWeight: 900, lineHeight: 1 }}>
          {entry.pct}%
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '28px 28px 1fr', gap: 5 }}>
        <button
          type="button"
          onClick={onDecrease}
          aria-label={`Decrease ${entry.employee.display_name} allocation`}
          style={stepButton(entry.pct <= 0)}
          disabled={entry.pct <= 0}
        >
          -
        </button>
        <button
          type="button"
          onClick={onIncrease}
          aria-label={`Increase ${entry.employee.display_name} allocation`}
          style={stepButton(entry.pct >= 100)}
          disabled={entry.pct >= 100}
        >
          +
        </button>
        <button
          type="button"
          onClick={onRemove}
          style={{
            border: '1px solid rgba(196,77,63,0.62)',
            background: 'rgba(196,77,63,0.12)',
            color: 'var(--rpg-red)',
            cursor: 'pointer',
            fontFamily: 'inherit',
            fontSize: 9,
            fontWeight: 800,
            letterSpacing: '0.08em',
            lineHeight: 1,
            padding: '5px 7px',
            textTransform: 'uppercase',
          }}
        >
          Remove
        </button>
      </div>
    </div>
  );
}

function Meter({ pct, tone }: { pct: number; tone: string }) {
  return (
    <div style={{ height: 6, background: 'var(--ink-3)', overflow: 'hidden' }}>
      <div
        style={{
          height: '100%',
          background: tone,
          width: `${clamp(pct, 0, 100)}%`,
          transition: 'width 180ms ease',
        }}
      />
    </div>
  );
}

function nextDropPct(
  scenario: MatrixScenario,
  allocationTotals: Record<string, number>,
  employeeId: string,
  coe: string,
) {
  const current = scenario.allocations[employeeId]?.[coe] ?? 0;
  if (current > 0) return clamp(current + STEP, 0, 100);
  const remaining = 100 - (allocationTotals[employeeId] ?? 0);
  if (remaining >= DROP_DEFAULT) return DROP_DEFAULT;
  if (remaining > 0) return Math.max(5, Math.floor(remaining / 5) * 5);
  return STEP;
}

function cellKey(func: string, coe: string) {
  return `${func}::${coe}`;
}

function shortCoe(coe: string) {
  return coe
    .replace('Solution Design & Architecture', 'Solution Design')
    .replace('Model Development & Deployment', 'Model Dev')
    .replace('Project & Pre-sales Support', 'Pre-sales')
    .replace('AI Use Case & Innovation', 'AI Innovation');
}

function coeCode(coe: string) {
  if (coe.includes('Solution')) return 'SD';
  if (coe.includes('Model')) return 'MD';
  if (coe.includes('Pre-sales')) return 'PS';
  if (coe.includes('Innovation')) return 'AI';
  return coe.slice(0, 2).toUpperCase();
}

function labelForFunction(func: string) {
  return FUNCTION_LABELS[func] ?? func.replaceAll('_', ' ');
}

function fitTone(score: number) {
  if (score >= 76) return 'var(--flux-up)';
  if (score >= 56) return 'var(--rpg-yellow)';
  return 'var(--rpg-orange)';
}

function readinessTone(pct: number) {
  if (pct >= 75) return 'var(--flux-up)';
  if (pct >= 50) return 'var(--rpg-orange)';
  return 'var(--rpg-red)';
}

function functionUtilLabel(util: FunctionUtilizationReport | undefined) {
  if (!util) return '0/0 allocated';
  return `${formatFte(util.allocated_headcount)}/${util.total_headcount} allocated (${util.utilization_pct}%)`;
}

function formatFte(value: number) {
  return Number.isInteger(value) ? String(value) : value.toFixed(1);
}

function stepButton(disabled: boolean): CSSProperties {
  return {
    border: `1px solid ${disabled ? 'var(--ink-2)' : 'var(--rpg-yellow)'}`,
    background: disabled ? 'var(--ink-3)' : 'rgba(243,182,31,0.14)',
    color: disabled ? 'var(--ink-1)' : 'var(--rpg-yellow)',
    cursor: disabled ? 'not-allowed' : 'pointer',
    fontFamily: 'inherit',
    fontSize: 13,
    fontWeight: 900,
    lineHeight: 1,
    minHeight: 26,
  };
}

function clamp(value: number, min: number, max: number) {
  return Math.max(min, Math.min(max, value));
}
