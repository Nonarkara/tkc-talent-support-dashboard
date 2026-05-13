'use client';

/**
 * MatrixTab — PMO Control Tower.
 *
 * Transformed from the original TOM Matrix Lab into the Strategic Value
 * Partner view the PMO Roadmap (2026-05-07) calls for.
 *
 * The executive view combines:
 *   • Antigravity's PortfolioControlTower (PMO Portfolio Dashboard pages 4-5)
 *   • Quarterly roadmap, business lines, and resource signals
 *
 * The old allocation sandbox is preserved behind a toggle:
 *   "Control Tower" (default) ↔ "Matrix Lab"
 */

import { useMemo, useState } from 'react';
import { MenuWindow } from '@/components/MenuWindow';
import { PortfolioControlTower } from '@/components/PortfolioControlTower';
import type { DashboardPayload, Project } from '../_shared/types';
import {
  DEFAULT_FUNCTIONS,
  createBlankScenario,
  recomputeMetrics,
  setAllocation,
  type MatrixScenario,
} from '@/lib/matrix-scenarios';
import { capabilityFit } from '@/lib/capability-fit';
import { ScenarioSelector } from '../matrix/ScenarioSelector';
import { FilterPanel } from '../matrix/FilterPanel';
import { MatrixGrid } from '../matrix/MatrixGrid';
import { MetricsPanel } from '../matrix/MetricsPanel';

interface Props {
  dash: DashboardPayload;
}

/* ─── PMO Constants from Roadmap 2026-05-07 ─────────────────────────── */

const BUSINESS_LINES: Array<{
  name: string;
  base: number;
  best: number;
  owner: string;
  deptHint: string[];
}> = [
  { name: 'Digital Services', base: 1_696_000_000, best: 2_317_000_000, owner: 'Pananan M.', deptHint: ['DIGITAL', 'DIG_PROD'] },
  { name: 'Network Delivery', base: 1_098_000_000, best: 1_802_000_000, owner: 'Wanchai R.', deptHint: ['IMPL', 'ENG'] },
  { name: 'Enterprise Business', base: 687_000_000, best: 1_252_000_000, owner: 'Sakol K.', deptHint: ['SALES', 'BIZ_DEV'] },
  { name: 'Public Safety', base: 332_000_000, best: 547_000_000, owner: 'DMD Op Piya', deptHint: ['PMO'] },
  { name: 'Intelligent Solution', base: 187_000_000, best: 321_000_000, owner: 'DMD Op Piya', deptHint: ['AI_COE'] },
];

const QUARTERS = [
  {
    q: 'Q2',
    label: 'Standardize',
    posture: 'Governance',
    outcomes: [
      'Project Visibility Dashboard v1.0',
      'Std. Template Adoption',
      'Single Source of Truth',
    ],
    active: true,
  },
  {
    q: 'Q3',
    label: 'Control & Enable',
    posture: 'Efficiency',
    outcomes: [
      'Centralized Portfolio Dashboard 2.0',
      'Centralized Resource View',
      'QA/QC Gate Review',
    ],
    active: false,
  },
  {
    q: 'Q4',
    label: 'Optimize',
    posture: 'Value',
    outcomes: [
      'Predictive Analytics (AI Risk/Delay)',
      'Value Realization Report',
      'Automated Decision Support',
    ],
    active: false,
  },
];

/* ─── Helpers ───────────────────────────────────────────────────────── */

const thbShort = (n: number) => {
  if (n >= 1_000_000_000) return `฿${(n / 1_000_000_000).toFixed(1)}B`;
  if (n >= 1_000_000) return `฿${(n / 1_000_000).toFixed(0)}M`;
  if (n >= 1_000) return `฿${(n / 1_000).toFixed(0)}k`;
  return `฿${n}`;
};

const pct = (num: number, denom: number) => {
  if (!denom) return 0;
  return Math.max(0, Math.min(999, Math.round((num / denom) * 100)));
};

/* ─── Main Tab ──────────────────────────────────────────────────────── */

export function MatrixTab({ dash }: Props) {
  const [mode, setMode] = useState<'tower' | 'lab'>('tower');

  return (
    <div className="cc-tab-frame" style={{ gridTemplateRows: 'auto 1fr', gap: 12 }}>
      {/* Row 0 — mode toggle */}
      <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
        <ModePill active={mode === 'tower'} onClick={() => setMode('tower')}>
          Control Tower
        </ModePill>
        <ModePill active={mode === 'lab'} onClick={() => setMode('lab')}>
          Matrix Lab
        </ModePill>
        <span style={{ fontSize: 9, color: 'var(--ink-2)', marginLeft: 'auto', letterSpacing: '0.08em', textTransform: 'uppercase' }}>
          PMO Roadmap 2026-05-07
        </span>
      </div>

      {/* Row 1 — content switches by mode */}
      <div className="cc-scroll" style={{ minHeight: 0 }}>
        {mode === 'tower' ? (
          <ControlTower dash={dash} />
        ) : (
          <MatrixLab dash={dash} />
        )}
      </div>
    </div>
  );
}

/* ─── Control Tower ─────────────────────────────────────────────────── */

function ControlTower({ dash }: { dash: DashboardPayload }) {
  const projects = dash.projects ?? [];
  const employees = dash.employees ?? [];
  const variance = dash.project_variance ?? [];

  /* ── Business line actuals (best-effort mapping by dept) ─────────── */
  const lineActuals = useMemo(() => {
    return BUSINESS_LINES.map((line) => {
      const lineProjects = projects.filter((p) =>
        line.deptHint.some((hint) =>
          (p.dept_code ?? '').toUpperCase().includes(hint) ||
          (p.div_code ?? '').toUpperCase().includes(hint)
        )
      );
      const actualValue = lineProjects.reduce((s, p) => s + Number(p.budget_thb ?? 0), 0);
      const count = lineProjects.length;
      const basePct = pct(actualValue, line.base);
      const bestPct = pct(actualValue, line.best);
      return { ...line, actualValue, count, basePct, bestPct };
    });
  }, [projects]);

  /* ── Resource utilization summary ────────────────────────────────── */
  const resourceUtil = useMemo(() => {
    const totalPlannedFte = variance.reduce((s, v) => s + (v.planned_fte ?? 0), 0);
    const totalActualFte = variance.reduce((s, v) => s + (v.actual_fte ?? 0), 0);
    const availableFte = employees.reduce((s, e) => s + (e.availability_fte ?? 1), 0);
    return {
      planned: totalPlannedFte,
      actual: totalActualFte,
      available: availableFte,
      utilizationPct: availableFte > 0 ? Math.round((totalPlannedFte / availableFte) * 100) : 0,
    };
  }, [variance, employees]);

  /* ── Active project list with health ─────────────────────────────── */
  const activeProjectList = useMemo(() => {
    return projects
      .filter((p) => p.status !== 'done' && p.status !== 'closed' && p.status !== 'archived')
      .sort((a, b) => (b.budget_thb ?? 0) - (a.budget_thb ?? 0))
      .slice(0, 12);
  }, [projects]);

  /* ── Issues / Risks proxy ────────────────────────────────────────── */
  const issueRiskSummary = useMemo(() => {
    const openIssues = dash.support_actions.filter((a) => a.status === 'open' || a.status === 'in_progress').length;
    const highRiskProjects = variance.filter((v) => v.margin_risk === 'high').length;
    const watchProjects = variance.filter((v) => v.margin_risk === 'watch').length;
    return { openIssues, highRisks: highRiskProjects, watchRisks: watchProjects };
  }, [dash.support_actions, variance]);

  return (
    <div style={{ display: 'grid', gap: 16, gridAutoRows: 'max-content' }}>
      {/* ── Antigravity's PMO Portfolio Dashboard (pages 4-5) ─────── */}
      <PortfolioControlTower pollMs={30_000} />

      {/* ── Two-column strategic context ──────────────────────────── */}
      <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) minmax(0, 1.3fr)', gap: 12, minHeight: 0 }}>
        {/* LEFT COLUMN */}
        <div style={{ display: 'grid', gap: 12, gridAutoRows: 'max-content', alignContent: 'start' }}>
          {/* Quarterly Roadmap */}
          <MenuWindow title="PMO Strategic Roadmap 2026">
            <div style={{ display: 'grid', gap: 8, padding: '4px 2px' }}>
              {QUARTERS.map((q) => (
                <QuarterCard key={q.q} quarter={q} />
              ))}
            </div>
          </MenuWindow>

          {/* Business Lines */}
          <MenuWindow title="Business Lines vs Target">
            <div style={{ display: 'grid', gap: 10, padding: '4px 2px' }}>
              {lineActuals.map((line) => (
                <div key={line.name} style={{ display: 'grid', gap: 5 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', fontSize: 10 }}>
                    <span style={{ fontWeight: 700, color: 'var(--ink-0)' }}>{line.name}</span>
                    <span style={{ color: 'var(--ink-1)', fontSize: 9 }}>{line.owner}</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 9, color: 'var(--ink-1)' }}>
                    <span>{line.count} projects · {thbShort(line.actualValue)} actual</span>
                    <span>Base {thbShort(line.base)} · Best {thbShort(line.best)}</span>
                  </div>
                  <div style={{ height: 6, background: 'rgba(255,255,255,0.06)', position: 'relative' }}>
                    <div style={{ position: 'absolute', inset: 0, width: `${Math.min(100, line.basePct)}%`, background: 'var(--rpg-blue)', opacity: 0.6 }} />
                    <div style={{ position: 'absolute', inset: 0, width: `${Math.min(100, line.bestPct)}%`, background: 'var(--flux-up)', opacity: 0.25 }} />
                  </div>
                  <div style={{ display: 'flex', gap: 8, fontSize: 8, color: 'var(--ink-2)' }}>
                    <span style={{ color: 'var(--rpg-blue)' }}>▬ base {line.basePct}%</span>
                    <span style={{ color: 'var(--flux-up)' }}>▬ best {line.bestPct}%</span>
                  </div>
                </div>
              ))}
            </div>
          </MenuWindow>

          {/* Resource Summary */}
          <MenuWindow title="Resource Utilization Summary">
            <div style={{ display: 'grid', gap: 10, padding: '4px 2px' }}>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8 }}>
                <MetricCard label="Planned FTE" value={resourceUtil.planned.toFixed(1)} />
                <MetricCard label="Actual FTE" value={resourceUtil.actual != null ? resourceUtil.actual.toFixed(1) : '—'} />
                <MetricCard label="Utilization" value={`${resourceUtil.utilizationPct}%`} warning={resourceUtil.utilizationPct > 95} />
              </div>
              <div style={{ height: 8, background: 'rgba(255,255,255,0.06)', position: 'relative' }}>
                <div style={{ position: 'absolute', inset: 0, width: `${Math.min(100, resourceUtil.utilizationPct)}%`, background: resourceUtil.utilizationPct > 95 ? 'var(--rpg-red)' : resourceUtil.utilizationPct > 80 ? 'var(--rpg-yellow)' : 'var(--flux-up)', transition: 'width 240ms ease' }} />
              </div>
              {resourceUtil.actual == null && (
                <div style={{ fontSize: 9, color: 'var(--rpg-yellow)' }}>
                  DATA PENDING · Timesheet feed required for actual hours
                </div>
              )}
            </div>
          </MenuWindow>
        </div>

        {/* RIGHT COLUMN */}
        <div style={{ display: 'grid', gap: 12, gridAutoRows: 'max-content', alignContent: 'start' }}>
          {/* Active Projects — mini health list */}
          <MenuWindow title="Active Project Health">
            <div style={{ display: 'grid', gap: 4, maxHeight: 320, overflowY: 'auto' }}>
              {activeProjectList.map((p) => {
                const pv = variance.find((v) => v.project_id === p.id);
                const marginRisk = pv?.margin_risk ?? p.margin_risk ?? 'stable';
                const { color, label } = projectStatusTone(marginRisk, p.progress_pct ?? 0);
                return (
                  <div
                    key={p.id}
                    style={{
                      display: 'grid',
                      gridTemplateColumns: 'minmax(48px, 60px) minmax(0, 1fr) auto auto auto',
                      alignItems: 'center',
                      gap: 10,
                      padding: '5px 6px',
                      borderBottom: '1px solid rgba(245,240,232,0.06)',
                      fontSize: 11,
                    }}
                  >
                    <span className="pixel" style={{ color: 'var(--rpg-yellow)', fontSize: 9 }}>
                      {p.code}
                    </span>
                    <span style={{ color: 'var(--ink-0)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {p.name}
                    </span>
                    <span style={{ fontSize: 9, color: 'var(--ink-1)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                      {p.priority ?? '—'}
                    </span>
                    <span style={{ fontSize: 9, color, fontWeight: 700, padding: '2px 6px', background: `${color}14`, border: `1px solid ${color}44` }}>
                      {label}
                    </span>
                    <span style={{ color: 'var(--ink-1)', fontFamily: 'var(--font-mono)', fontSize: 10, textAlign: 'right', minWidth: 36 }}>
                      {p.progress_pct ?? 0}%
                    </span>
                  </div>
                );
              })}
              {activeProjectList.length === 0 && (
                <div style={{ color: 'var(--ink-1)', fontSize: 11, padding: '8px 0' }}>
                  No active projects loaded.
                </div>
              )}
            </div>
          </MenuWindow>

          {/* Issues & Risks Summary */}
          <MenuWindow title="Issues & Risks">
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 10, padding: '4px 2px' }}>
              <IssueRiskCard
                label="Open Support Issues"
                value={issueRiskSummary.openIssues}
                tone={issueRiskSummary.openIssues > 5 ? 'bad' : issueRiskSummary.openIssues > 0 ? 'watch' : 'good'}
              />
              <IssueRiskCard
                label="High Risk Projects"
                value={issueRiskSummary.highRisks}
                tone={issueRiskSummary.highRisks > 2 ? 'bad' : issueRiskSummary.highRisks > 0 ? 'watch' : 'good'}
              />
              <IssueRiskCard
                label="Watch List"
                value={issueRiskSummary.watchRisks}
                tone={issueRiskSummary.watchRisks > 5 ? 'bad' : 'watch'}
              />
            </div>
          </MenuWindow>
        </div>
      </div>
    </div>
  );
}

/* ─── Matrix Lab (preserved original) ───────────────────────────────── */

function MatrixLab({ dash }: { dash: DashboardPayload }) {
  const [scenario, setScenario] = useState<MatrixScenario>(() =>
    createBlankScenario('Untitled Scenario')
  );
  const [selectedFunctions, setSelectedFunctions] = useState<Set<string>>(
    new Set(DEFAULT_FUNCTIONS)
  );
  const [selectedSkills, setSelectedSkills] = useState<Set<string>>(new Set());
  const [searchQuery, setSearchQuery] = useState('');
  const [saving, setSaving] = useState(false);
  const [lastMsg, setLastMsg] = useState<string | null>(null);

  const filtered = useMemo(() => {
    return dash.employees.filter((emp) => {
      if (!selectedFunctions.has(emp.dept_code || 'UNKNOWN')) return false;
      const empSkills = new Set(emp.skills ?? []);
      if (selectedSkills.size > 0) {
        for (const skill of selectedSkills) {
          if (!empSkills.has(skill)) return false;
        }
      }
      if (searchQuery.trim()) {
        const hay = [emp.nickname, emp.full_name_en, emp.full_name_th, emp.dept_code]
          .filter(Boolean)
          .join(' ')
          .toLowerCase();
        if (!hay.includes(searchQuery.toLowerCase())) return false;
      }
      return true;
    }).sort((left, right) => {
      const rightFit = capabilityFit(right, Array.from(selectedSkills), dash.competency_standards).score;
      const leftFit = capabilityFit(left, Array.from(selectedSkills), dash.competency_standards).score;
      return rightFit - leftFit;
    });
  }, [dash.competency_standards, dash.employees, searchQuery, selectedFunctions, selectedSkills]);

  const scenarioWithMetrics = useMemo(() => {
    return recomputeMetrics(scenario, dash.employees);
  }, [scenario, dash.employees]);

  const handleFunctionToggle = (funcCode: string) => {
    const next = new Set(selectedFunctions);
    if (next.has(funcCode)) next.delete(funcCode);
    else next.add(funcCode);
    setSelectedFunctions(next);
  };

  const handleSkillToggle = (skill: string) => {
    const next = new Set(selectedSkills);
    if (next.has(skill)) next.delete(skill);
    else next.add(skill);
    setSelectedSkills(next);
  };

  const handleAllocate = (employeeId: string, coeName: string, pct: number) => {
    setScenario((current) => setAllocation(current, employeeId, coeName, pct));
    setLastMsg(null);
  };

  const handleSaveScenario = async () => {
    if (!scenario.name.trim()) {
      setLastMsg('Name the scenario first');
      return;
    }
    setSaving(true);
    setLastMsg(null);
    try {
      const res = await fetch('/api/matrix/scenarios', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(scenarioWithMetrics),
      });
      const json = (await res.json()) as { ok?: boolean; error?: string };
      if (!res.ok || !json.ok) {
        throw new Error(json.error ?? `HTTP ${res.status}`);
      }
      setLastMsg(`✓ Saved "${scenario.name}"`);
    } catch (err) {
      setLastMsg(`Failed to save: ${err instanceof Error ? err.message : String(err)}`);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div style={{ display: 'grid', gap: 16 }}>
      <ScenarioSelector
        scenario={scenario}
        onScenarioChange={setScenario}
        onNameChange={(name) => setScenario({ ...scenario, name })}
        onSave={handleSaveScenario}
        saving={saving}
      />

      <div className="cc-two-pane" style={{ display: 'grid', gridTemplateColumns: '320px 1fr', gap: 16, minHeight: 0 }}>
        <FilterPanel
          functions={Array.from(selectedFunctions)}
          allFunctions={DEFAULT_FUNCTIONS}
          skills={Array.from(selectedSkills)}
          searchQuery={searchQuery}
          onFunctionToggle={handleFunctionToggle}
          onSkillToggle={handleSkillToggle}
          onSearchChange={setSearchQuery}
          candidateCount={filtered.length}
        />

        <div style={{ display: 'grid', gap: 12, minHeight: 0 }}>
          <MatrixGrid
            scenario={scenarioWithMetrics}
            allEmployees={dash.employees}
            filteredEmployees={filtered}
            selectedSkills={Array.from(selectedSkills)}
            competencyStandards={dash.competency_standards}
            onAllocate={handleAllocate}
          />

          {lastMsg && (
            <div
              style={{
                padding: '8px 12px',
                fontSize: 11,
                color: lastMsg.startsWith('✓') ? 'var(--flux-up)' : 'var(--rpg-orange)',
                background: 'rgba(0,0,0,0.25)',
                border: '1px solid var(--border-subtle)',
                letterSpacing: '0.04em',
              }}
            >
              {lastMsg}
            </div>
          )}

          <MetricsPanel report={scenarioWithMetrics} />
        </div>
      </div>

      <MenuWindow title="How this works">
        <div
          style={{
            padding: '10px 14px',
            fontSize: 11,
            color: 'var(--ink-1)',
            lineHeight: 1.6,
            letterSpacing: '0.02em',
          }}
        >
          Load the proposed TOM structure (4 functions × 4 CoEs). Use the left panel to filter people by function + skills.
          On the grid, drag employees into CoE cells to test allocations. Watch readiness and utilization metrics
          update live. Save when the numbers look healthy. Compare multiple scenarios to validate the matrix works.
        </div>
      </MenuWindow>
    </div>
  );
}

/* ─── Small components ──────────────────────────────────────────────── */

function ModePill({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      style={{
        padding: '5px 12px',
        fontSize: 10,
        fontWeight: 700,
        letterSpacing: '0.12em',
        textTransform: 'uppercase',
        border: `1px solid ${active ? 'var(--rpg-yellow)' : 'var(--ink-2)'}`,
        background: active ? 'rgba(243,182,31,0.14)' : 'transparent',
        color: active ? 'var(--rpg-yellow)' : 'var(--ink-1)',
        cursor: 'pointer',
        fontFamily: 'inherit',
      }}
    >
      {children}
    </button>
  );
}

function QuarterCard({ quarter }: { quarter: typeof QUARTERS[number] }) {
  return (
    <div
      style={{
        border: `1px solid ${quarter.active ? 'var(--rpg-yellow)' : 'var(--ink-2)'}`,
        background: quarter.active ? 'rgba(243,182,31,0.08)' : 'rgba(0,0,0,0.12)',
        padding: '10px 12px',
        display: 'grid',
        gap: 6,
        opacity: quarter.active ? 1 : 0.7,
      }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <span style={{ fontSize: 14, fontWeight: 800, color: quarter.active ? 'var(--rpg-yellow)' : 'var(--ink-0)', fontFamily: 'var(--font-mono)' }}>
          {quarter.q}
        </span>
        <span
          style={{
            fontSize: 9,
            fontWeight: 700,
            letterSpacing: '0.1em',
            textTransform: 'uppercase',
            color: quarter.active ? 'var(--rpg-yellow)' : 'var(--ink-1)',
            padding: '2px 8px',
            border: `1px solid ${quarter.active ? 'var(--rpg-yellow)' : 'var(--ink-2)'}`,
          }}
        >
          {quarter.active ? 'ACTIVE' : 'UPCOMING'}
        </span>
      </div>
      <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--ink-0)' }}>{quarter.label}</div>
      <div style={{ fontSize: 9, color: 'var(--ink-2)', letterSpacing: '0.08em', textTransform: 'uppercase' }}>{quarter.posture}</div>
      <div style={{ display: 'grid', gap: 3 }}>
        {quarter.outcomes.map((outcome) => (
          <div key={outcome} style={{ fontSize: 10, color: 'var(--ink-1)', display: 'flex', gap: 6, alignItems: 'flex-start' }}>
            <span style={{ color: quarter.active ? 'var(--flux-up)' : 'var(--ink-2)' }}>✦</span>
            <span>{outcome}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function MetricCard({ label, value, warning }: { label: string; value: string | number; warning?: boolean }) {
  return (
    <div
      style={{
        padding: '10px',
        background: warning ? 'rgba(193,75,75,0.08)' : 'rgba(0,0,0,0.15)',
        border: `1px solid ${warning ? 'var(--rpg-red)' : 'var(--border-subtle)'}`,
        textAlign: 'center',
      }}
    >
      <div style={{ fontSize: 9, color: 'var(--ink-1)', letterSpacing: '0.05em' }}>{label}</div>
      <div style={{ fontSize: 16, fontWeight: 700, color: warning ? 'var(--rpg-red)' : 'var(--ink-0)', marginTop: 4 }}>{value}</div>
    </div>
  );
}

function IssueRiskCard({ label, value, tone }: { label: string; value: number; tone: 'good' | 'watch' | 'bad' }) {
  const color = tone === 'good' ? 'var(--flux-up)' : tone === 'watch' ? 'var(--rpg-yellow)' : 'var(--rpg-red)';
  return (
    <div
      style={{
        padding: '12px',
        background: 'rgba(0,0,0,0.12)',
        border: `1px solid ${color}44`,
        textAlign: 'center',
      }}
    >
      <div style={{ fontSize: 22, fontWeight: 800, color, fontFamily: 'var(--font-mono)', lineHeight: 1.2 }}>{value}</div>
      <div style={{ fontSize: 9, color: 'var(--ink-1)', letterSpacing: '0.06em', textTransform: 'uppercase', marginTop: 6 }}>{label}</div>
    </div>
  );
}

function projectStatusTone(marginRisk: string, progress: number): { color: string; label: string } {
  if (marginRisk === 'high') return { color: '#FB923C', label: 'Delayed' };
  if (marginRisk === 'watch') return { color: '#f3b61f', label: 'At Risk' };
  if (progress >= 70) return { color: '#86CD7E', label: 'On Track' };
  return { color: '#86D1FF', label: 'In Progress' };
}
