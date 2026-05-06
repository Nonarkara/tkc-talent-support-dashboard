'use client';

/**
 * ScenarioSelector — load/save scenarios.
 * Shows scenario name input + Save button.
 * TODO: dropdown to load previous scenarios.
 */

import type { MatrixScenario } from '@/lib/matrix-scenarios';

export function ScenarioSelector({
  scenario,
  onScenarioChange,
  onNameChange,
  onSave,
  saving,
}: {
  scenario: MatrixScenario;
  onScenarioChange: (s: MatrixScenario) => void;
  onNameChange: (name: string) => void;
  onSave: () => void;
  saving: boolean;
}) {
  return (
    <div
      style={{
        border: '1px solid var(--border-subtle)',
        background: 'var(--ink-4)',
        padding: '12px',
        display: 'grid',
        gridTemplateColumns: '1fr auto',
        gap: 12,
        alignItems: 'center',
      }}
    >
      <div style={{ display: 'grid', gap: 6, minWidth: 0 }}>
        <label
          style={{
            fontSize: 10,
            letterSpacing: '0.12em',
            textTransform: 'uppercase',
            color: 'var(--ink-1)',
          }}
        >
          Scenario
        </label>
        <input
          type="text"
          value={scenario.name}
          onChange={(e) => onNameChange(e.target.value)}
          placeholder="Name this scenario… (e.g. 'Model-heavy staffing')"
          style={{
            background: 'transparent',
            border: '1px solid var(--ink-2)',
            borderRadius: '2px',
            color: 'var(--ink-0)',
            padding: '6px 10px',
            fontFamily: 'inherit',
            fontSize: 12,
            outline: 'none',
          }}
        />
      </div>

      <button
        type="button"
        onClick={onSave}
        disabled={saving}
        style={{
          padding: '10px 16px',
          background: saving ? 'var(--ink-3)' : 'var(--rpg-blue)',
          color: saving ? 'var(--ink-1)' : 'var(--ink-4)',
          border: 'none',
          cursor: saving ? 'not-allowed' : 'pointer',
          fontFamily: 'inherit',
          fontSize: 11,
          fontWeight: 700,
          letterSpacing: '0.14em',
          textTransform: 'uppercase',
          whiteSpace: 'nowrap',
        }}
      >
        {saving ? 'Saving…' : 'Save Scenario'}
      </button>
    </div>
  );
}
