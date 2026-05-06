'use client';

/**
 * MatrixGrid — the allocation matrix visualization.
 * Rows = Functions, Columns = CoEs.
 * Cells show people allocated + readiness.
 * Drag-and-drop or quick-allocate (% input).
 *
 * MVP: show allocations + readiness bars per cell.
 * TODO: drag-and-drop interface for reallocating.
 */

import type { Employee } from '@/app/command-center/_shared/types';
import { capabilityFit } from '@/lib/capability-fit';
import type { MatrixScenario } from '@/lib/matrix-scenarios';
import type { CompetencyStandard } from '../_shared/types';

const FUNCTION_LABELS: Record<string, string> = {
  SALES: 'Sales',
  ENTERPRISE: 'Operations',
  FINANCE: 'Finance',
  HR_ADMIN: 'HR & Admin',
};

export function MatrixGrid({
  scenario,
  filteredEmployees,
  selectedSkills,
  competencyStandards,
  onAllocate,
}: {
  scenario: MatrixScenario;
  filteredEmployees: Employee[];
  selectedSkills: string[];
  competencyStandards: CompetencyStandard[];
  onAllocate: (employeeId: string, coeName: string, pct: number) => void;
}) {
  if (!scenario.metrics) {
    return <div style={{ color: 'var(--ink-2)', padding: '20px' }}>Loading metrics...</div>;
  }

  const { coe_readiness } = scenario.metrics;

  return (
    <div
      style={{
        border: '1px solid var(--border-subtle)',
        background: 'var(--ink-4)',
        overflowX: 'auto',
        padding: '12px',
      }}
    >
      {/* Header row: CoE names */}
      <div style={{ display: 'grid', gap: 1, marginBottom: 12 }}>
        <div style={{ display: 'grid', gridTemplateColumns: '120px repeat(4, 1fr)', gap: 1 }}>
          <div style={{ fontSize: 9, color: 'var(--ink-2)', fontWeight: 700 }}></div>
          {scenario.coe_names.map((coe) => (
            <div
              key={coe}
              style={{
                fontSize: 9,
                color: 'var(--ink-0)',
                fontWeight: 700,
                padding: '8px',
                textAlign: 'center',
                textTransform: 'uppercase',
                letterSpacing: '0.05em',
              }}
            >
              {coe.split(' ')[0]}
            </div>
          ))}
        </div>

        {/* Function rows */}
        {scenario.function_codes.map((func) => (
          <div
            key={func}
            style={{
              display: 'grid',
              gridTemplateColumns: '120px repeat(4, 1fr)',
              gap: 1,
            }}
          >
            {/* Function label */}
            <div
              style={{
                fontSize: 10,
                fontWeight: 600,
                padding: '8px',
                background: 'rgba(43,95,160,0.1)',
                border: '1px solid var(--rpg-blue)',
                color: 'var(--ink-0)',
                display: 'flex',
                alignItems: 'center',
              }}
            >
              {FUNCTION_LABELS[func] || func}
            </div>

            {/* CoE cells */}
            {scenario.coe_names.map((coe) => {
              const report = coe_readiness[coe];
              const readinessPct = report?.overall_pct || 0;
              const hasGaps = (report?.gaps || []).length > 0;

              return (
                <div
                  key={`${func}-${coe}`}
                  style={{
                    padding: '8px',
                    background: hasGaps ? 'rgba(193,75,75,0.08)' : 'rgba(0,0,0,0.15)',
                    border: `1px solid ${hasGaps ? 'var(--rpg-red)' : 'var(--border-subtle)'}`,
                    display: 'grid',
                    gap: 4,
                  }}
                >
                  {/* Readiness bar */}
                  <div style={{ fontSize: 9, color: 'var(--ink-1)' }}>
                    {readinessPct}% ready
                  </div>
                  <div
                    style={{
                      height: 6,
                      background: 'var(--ink-3)',
                      borderRadius: '2px',
                      overflow: 'hidden',
                    }}
                  >
                    <div
                      style={{
                        height: '100%',
                        background:
                          readinessPct < 50
                            ? 'var(--rpg-red)'
                            : readinessPct < 75
                              ? 'var(--rpg-orange)'
                              : 'var(--flux-up)',
                        width: `${readinessPct}%`,
                        transition: 'width 200ms ease',
                      }}
                    />
                  </div>

                  {/* Headcount placeholder */}
                  <div style={{ fontSize: 8, color: 'var(--ink-2)' }}>
                    {report?.headcount || 0} assigned
                  </div>
                </div>
              );
            })}
          </div>
        ))}
      </div>

      {/* Footer */}
      <div
        style={{
          fontSize: 9,
          color: 'var(--ink-2)',
          marginTop: 8,
          padding: '8px',
          borderTop: '1px solid var(--ink-2)',
          letterSpacing: '0.04em',
        }}
      >
        Red = gaps. Orange = single-point of failure. Green = healthy. Drag employees from left to allocate.
      </div>

      <div
        style={{
          marginTop: 12,
          display: 'grid',
          gap: 8,
          borderTop: '1px solid var(--border-subtle)',
          paddingTop: 12,
        }}
      >
        <div
          style={{
            fontSize: 9,
            fontWeight: 700,
            letterSpacing: '0.08em',
            textTransform: 'uppercase',
            color: 'var(--ink-1)',
          }}
        >
          Top Capability Matches
        </div>
        <div style={{ display: 'grid', gap: 6 }}>
          {filteredEmployees.slice(0, 8).map((employee) => {
            const fit = capabilityFit(employee, selectedSkills, competencyStandards);
            return (
              <div
                key={employee.id}
                style={{
                  display: 'grid',
                  gridTemplateColumns: '1fr auto auto',
                  gap: 10,
                  alignItems: 'center',
                  border: '1px solid var(--border-subtle)',
                  background: 'rgba(0,0,0,0.14)',
                  padding: '8px 10px',
                }}
              >
                <div style={{ minWidth: 0 }}>
                  <div style={{ color: 'var(--ink-0)', fontSize: 11, fontWeight: 700 }}>
                    {employee.display_name}
                  </div>
                  <div style={{ color: 'var(--ink-1)', fontSize: 9 }}>
                    {fit.reasons[0]}
                  </div>
                </div>
                <div style={{ color: 'var(--ink-1)', fontSize: 9 }}>
                  {Number(employee.availability_fte ?? 0).toFixed(1)}FTE
                </div>
                <div
                  style={{
                    color:
                      fit.score >= 76
                        ? 'var(--flux-up)'
                        : fit.score >= 56
                          ? 'var(--rpg-yellow)'
                          : 'var(--rpg-orange)',
                    fontSize: 10,
                    fontWeight: 800,
                    letterSpacing: '0.08em',
                  }}
                >
                  FIT {fit.score}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
