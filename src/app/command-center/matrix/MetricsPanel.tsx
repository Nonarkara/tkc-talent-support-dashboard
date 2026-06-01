'use client';

/**
 * MetricsPanel — live metrics dashboard.
 * Shows: CoE readiness, function utilization, skill scarcity, warnings.
 */

import type { MatrixScenario } from '@/lib/matrix-scenarios';

const FUNCTION_LABELS: Record<string, string> = {
  SALES: 'Sales',
  ENTERPRISE: 'Operations',
  FINANCE: 'Finance',
  HR_ADMIN: 'HR & Admin',
};

export function MetricsPanel({ report }: { report: MatrixScenario }) {
  if (!report.metrics) return null;

  const { coe_readiness, function_utilization, skill_scarcity, total_over_allocation_count } = report.metrics;
  const coeReports = Object.values(coe_readiness);

  const avgReadiness = coeReports.length > 0
    ? Math.round(coeReports.reduce((a, r) => a + r.overall_pct, 0) / coeReports.length)
    : 0;

  return (
    <div style={{ display: 'grid', gap: 12 }}>
      {/* Summary metrics */}
      <div
        style={{
          border: '1px solid var(--border-subtle)',
          background: 'var(--ink-4)',
          padding: '12px',
          display: 'grid',
          gridTemplateColumns: 'repeat(4, 1fr)',
          gap: 10,
        }}
      >
        <MetricCard label="Avg Readiness" value={`${avgReadiness}%`} />
        <MetricCard
          label="Over-Allocated"
          value={total_over_allocation_count}
          warning={total_over_allocation_count > 0}
        />
        <MetricCard
          label="Total Skills"
          value={Object.keys(skill_scarcity).length}
        />
        <MetricCard
          label="Scarcity Gaps"
          value={Object.values(skill_scarcity).filter((s) => s.coes_with_gap.length > 0).length}
          warning={Object.values(skill_scarcity).some((s) => s.coes_with_gap.length > 0)}
        />
      </div>

      {/* Function utilization heatmap */}
      <div
        style={{
          border: '1px solid var(--border-subtle)',
          background: 'var(--ink-4)',
          padding: '12px',
          display: 'grid',
          gap: 8,
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
          Function Utilization
        </div>
        <div style={{ display: 'grid', gap: 6 }}>
          {Object.entries(function_utilization).map(([func, util]) => (
            <div key={func} style={{ display: 'grid', gap: 4 }}>
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  fontSize: 10,
                  color: 'var(--ink-0)',
                }}
              >
                <span>{FUNCTION_LABELS[func] || func}</span>
                <span style={{ fontWeight: 700 }}>
                  {formatMetricNumber(util.allocated_headcount)}/{util.total_headcount} ({util.utilization_pct}%)
                </span>
              </div>
              <div
                style={{
                  height: 8,
                  background: 'var(--ink-3)',
                  borderRadius: '2px',
                  overflow: 'hidden',
                }}
              >
                <div
                  style={{
                    height: '100%',
                    background:
                      util.warning === 'over-allocated'
                        ? 'var(--rpg-red)'
                        : util.warning === 'under-allocated'
                          ? 'var(--rpg-orange)'
                          : 'var(--flux-up)',
                    width: `${Math.min(100, util.utilization_pct)}%`,
                    transition: 'width 200ms ease',
                  }}
                />
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* CoE readiness table */}
      <div
        style={{
          border: '1px solid var(--border-subtle)',
          background: 'var(--ink-4)',
          padding: '12px',
          display: 'grid',
          gap: 8,
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
          CoE Readiness & Gaps
        </div>
        <div style={{ display: 'grid', gap: 6 }}>
          {Object.entries(coe_readiness).map(([coeName, report]) => (
            <div key={coeName} style={{ display: 'grid', gap: 4 }}>
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  fontSize: 10,
                  color: 'var(--ink-0)',
                }}
              >
                <span style={{ fontWeight: 600 }}>{coeName}</span>
                <span>{report.overall_pct}%</span>
              </div>
              {report.gaps.length > 0 && (
                <div
                  style={{
                    fontSize: 8,
                    color: 'var(--rpg-red)',
                    padding: '4px 8px',
                    background: 'rgba(193,75,75,0.1)',
                    borderRadius: '2px',
                  }}
                >
                  Gaps: {report.gaps.join(', ')}
                </div>
              )}
              {report.single_points.length > 0 && (
                <div
                  style={{
                    fontSize: 8,
                    color: 'var(--rpg-orange)',
                    padding: '4px 8px',
                    background: 'rgba(212,128,63,0.1)',
                    borderRadius: '2px',
                  }}
                >
                  Single-point: {report.single_points.join(', ')}
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function formatMetricNumber(value: number) {
  const num = Number(value);
  if (isNaN(num)) return "—";
  return Number.isInteger(num) ? String(num) : num.toFixed(1);
}

function MetricCard({
  label,
  value,
  warning,
}: {
  label: string;
  value: string | number;
  warning?: boolean;
}) {
  return (
    <div
      style={{
        padding: '10px',
        background: warning ? 'rgba(193,75,75,0.08)' : 'rgba(0,0,0,0.15)',
        border: `1px solid ${warning ? 'var(--rpg-red)' : 'var(--border-subtle)'}`,
        borderRadius: '2px',
        display: 'grid',
        gap: 4,
      }}
    >
      <div style={{ fontSize: 9, color: 'var(--ink-1)', letterSpacing: '0.05em' }}>
        {label}
      </div>
      <div
        style={{
          fontSize: 14,
          fontWeight: 700,
          color: warning ? 'var(--rpg-red)' : 'var(--ink-0)',
        }}
      >
        {value}
      </div>
    </div>
  );
}
