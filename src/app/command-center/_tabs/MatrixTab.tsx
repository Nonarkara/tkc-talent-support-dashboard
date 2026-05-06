'use client';

/**
 * MatrixTab — PoC sandbox for testing the TOM.
 *
 * Workflow:
 * 1. Load a scenario (or start blank)
 * 2. Filter people by function + skills (Expedia style)
 * 3. Drag allocations onto a CoE/Function grid
 * 4. Watch readiness/utilization recompute live
 * 5. Save scenario → Sheets logs it
 */

import { useMemo, useState } from 'react';
import { MenuWindow } from '@/components/MenuWindow';
import { capabilityFit } from '@/lib/capability-fit';
import {
  DEFAULT_FUNCTIONS,
  DEFAULT_COES,
  createBlankScenario,
  recomputeMetrics,
  setAllocation,
  isOverAllocated,
  type MatrixScenario,
} from '@/lib/matrix-scenarios';
import type { DashboardPayload } from '../_shared/types';
import { ScenarioSelector } from '../matrix/ScenarioSelector';
import { FilterPanel } from '../matrix/FilterPanel';
import { MatrixGrid } from '../matrix/MatrixGrid';
import { MetricsPanel } from '../matrix/MetricsPanel';

interface Props {
  dash: DashboardPayload;
}

export function MatrixTab({ dash }: Props) {
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

  // Filter roster by selected functions + skills + search
  const filtered = useMemo(() => {
    return dash.employees.filter((emp) => {
      // Function filter
      if (!selectedFunctions.has(emp.dept_code || 'UNKNOWN')) return false;

      // Skill filter (AND semantics like Ninja Tab)
      const empSkills = new Set(emp.skills ?? []);
      if (selectedSkills.size > 0) {
        for (const skill of selectedSkills) {
          if (!empSkills.has(skill)) return false;
        }
      }

      // Search filter
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

  // Recompute metrics whenever scenario or roster changes
  const scenarioWithMetrics = useMemo(() => {
    return recomputeMetrics(scenario, dash.employees);
  }, [scenario, dash.employees]);

  const handleFunctionToggle = (funcCode: string) => {
    const next = new Set(selectedFunctions);
    if (next.has(funcCode)) {
      next.delete(funcCode);
    } else {
      next.add(funcCode);
    }
    setSelectedFunctions(next);
  };

  const handleSkillToggle = (skill: string) => {
    const next = new Set(selectedSkills);
    if (next.has(skill)) {
      next.delete(skill);
    } else {
      next.add(skill);
    }
    setSelectedSkills(next);
  };

  const handleAllocate = (employeeId: string, coeName: string, pct: number) => {
    const updated = setAllocation(scenario, employeeId, coeName, pct);
    setScenario(updated);
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
      {/* Scenario selector + name */}
      <ScenarioSelector
        scenario={scenario}
        onScenarioChange={setScenario}
        onNameChange={(name) => setScenario({ ...scenario, name })}
        onSave={handleSaveScenario}
        saving={saving}
      />

      {/* Main two-pane: filter + grid */}
      <div className="cc-two-pane" style={{ display: 'grid', gridTemplateColumns: '320px 1fr', gap: 16, minHeight: 0 }}>
        {/* Left: Filter panel (functions + skills) */}
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

        {/* Right: Grid + metrics */}
        <div style={{ display: 'grid', gap: 12, minHeight: 0 }}>
          <MatrixGrid
            scenario={scenarioWithMetrics}
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

      {/* Footer: help text */}
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
