'use client';

/**
 * FilterPanel — Expedia-style filtering for the roster.
 * Function chips (multi-select) + Skill toggles (AND semantics) + search.
 */

import { SKILLS, SKILL_LABEL, SKILL_COLOR } from '@/lib/skills-vocab';

export function FilterPanel({
  functions,
  allFunctions,
  skills,
  searchQuery,
  onFunctionToggle,
  onSkillToggle,
  onSearchChange,
  candidateCount,
}: {
  functions: string[];
  allFunctions: string[];
  skills: string[];
  searchQuery: string;
  onFunctionToggle: (func: string) => void;
  onSkillToggle: (skill: string) => void;
  onSearchChange: (q: string) => void;
  candidateCount: number;
}) {
  const functionLabels: Record<string, string> = {
    SALES: 'Sales',
    ENTERPRISE: 'Operations',
    FINANCE: 'Finance',
    HR_ADMIN: 'HR & Admin',
  };

  return (
    <div
      style={{
        border: '1px solid var(--border-subtle)',
        background: 'var(--ink-4)',
        display: 'grid',
        gridTemplateRows: 'auto 1fr',
        minHeight: 0,
      }}
    >
      {/* Header + search */}
      <div
        style={{
          padding: '10px 12px',
          borderBottom: '1px solid var(--border-subtle)',
          display: 'grid',
          gap: 8,
        }}
      >
        <div
          style={{
            fontSize: 10,
            letterSpacing: '0.12em',
            textTransform: 'uppercase',
            color: 'var(--ink-1)',
          }}
        >
          Filter
        </div>
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => onSearchChange(e.target.value)}
          placeholder="Search by name…"
          style={{
            background: 'var(--ink-4)',
            border: '1px solid var(--ink-2)',
            color: 'var(--ink-0)',
            fontSize: 11,
            padding: '6px 10px',
            fontFamily: 'inherit',
            outline: 'none',
          }}
        />
        <div
          style={{
            fontSize: 9,
            color: 'var(--ink-1)',
            letterSpacing: '0.05em',
          }}
        >
          {candidateCount} people match
        </div>
      </div>

      {/* Functions */}
      <div style={{ padding: '10px 12px', overflowY: 'auto', display: 'grid', gap: 8 }}>
        <div
          style={{
            fontSize: 9,
            fontWeight: 700,
            letterSpacing: '0.08em',
            textTransform: 'uppercase',
            color: 'var(--ink-2)',
          }}
        >
          Functions
        </div>
        <div style={{ display: 'grid', gap: 4 }}>
          {allFunctions.map((func) => (
            <button
              key={func}
              type="button"
              onClick={() => onFunctionToggle(func)}
              style={{
                padding: '6px 10px',
                background: functions.includes(func) ? 'rgba(43,95,160,0.2)' : 'transparent',
                border: `1px solid ${functions.includes(func) ? 'var(--rpg-blue)' : 'var(--ink-2)'}`,
                color: functions.includes(func) ? 'var(--rpg-blue)' : 'var(--ink-1)',
                fontFamily: 'inherit',
                fontSize: 11,
                fontWeight: functions.includes(func) ? 700 : 400,
                cursor: 'pointer',
                textAlign: 'left',
                letterSpacing: '0.05em',
              }}
            >
              {functionLabels[func] || func}
            </button>
          ))}
        </div>

        {/* Skills */}
        <div
          style={{
            fontSize: 9,
            fontWeight: 700,
            letterSpacing: '0.08em',
            textTransform: 'uppercase',
            color: 'var(--ink-2)',
            marginTop: 8,
          }}
        >
          Required Skills (AND)
        </div>
        <div style={{ display: 'grid', gap: 4 }}>
          {SKILLS.map((skill) => (
            <button
              key={skill}
              type="button"
              onClick={() => onSkillToggle(skill)}
              style={{
                padding: '6px 10px',
                background: skills.includes(skill) ? SKILL_COLOR[skill] : 'transparent',
                border: `1px solid ${SKILL_COLOR[skill]}`,
                color: skills.includes(skill) ? 'var(--ink-4)' : SKILL_COLOR[skill],
                fontFamily: 'inherit',
                fontSize: 10,
                fontWeight: skills.includes(skill) ? 700 : 400,
                cursor: 'pointer',
                letterSpacing: '0.05em',
                textTransform: 'uppercase',
                opacity: skills.includes(skill) ? 1 : 0.7,
              }}
            >
              {SKILL_LABEL[skill]}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
