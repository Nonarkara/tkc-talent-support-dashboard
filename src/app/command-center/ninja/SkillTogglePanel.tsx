"use client";

/**
 * SkillTogglePanel — Expedia-style skill chips, 2×5 grid.
 *
 * The chassis of the Ninja tab's "find ~30 candidates" flow. Each chip
 * shows a live count: "Technical (142)". Clicking toggles the skill on
 * AND-filter; the counts instantly recompute and shrink the others
 * (Expedia's reassurance move). Presets let the boss load a canonical
 * mission shape in one click.
 *
 * This component is dumb — it takes `required` / `counts` from props
 * and calls `onToggle` / `onPreset`. All narrowing logic lives in
 * NinjaTab.
 */

import {
  SKILLS,
  SKILL_COLOR,
  SKILL_LABEL,
  SKILL_BLURB,
  SKILL_PRESETS,
  type Skill,
} from "@/lib/skills-vocab";

interface Props {
  /** Skills toggled on right now. */
  required: Skill[];
  /** Per-skill candidate count AFTER applying the current AND filter.
   *  Used to label the chip so the user sees "if I turn this on, N
   *  candidates will match". */
  counts: Record<Skill, number>;
  onToggle: (skill: Skill) => void;
  onPreset: (skills: Skill[]) => void;
  onClear: () => void;
  onFlagGap: () => void;
  /** Whether the current filter has no matches at all. */
  empty: boolean;
}

export function SkillTogglePanel({
  required,
  counts,
  onToggle,
  onPreset,
  onClear,
  onFlagGap,
  empty,
}: Props) {
  const activeSet = new Set(required);

  return (
    <div
      style={{
        border: "1px solid var(--border-subtle)",
        background: "var(--ink-4)",
        padding: 14,
        display: "grid",
        gap: 12,
        alignContent: "start",
      }}
    >
      <div style={{ display: "grid", gap: 6 }}>
        <h3
          style={{
            margin: 0,
            fontSize: 11,
            fontWeight: 700,
            letterSpacing: "0.16em",
            textTransform: "uppercase",
            color: "var(--rpg-purple, #8B6FB5)",
          }}
        >
          Skills Needed
        </h3>
        <p
          style={{
            margin: 0,
            fontSize: 10,
            color: "var(--ink-1)",
            letterSpacing: "0.04em",
            lineHeight: 1.5,
          }}
        >
          Toggle the skills the mission needs. The list on the right narrows to
          only warriors who carry <em>all</em> of them.
        </p>
      </div>

      {/* Presets. One row, horizontal, can wrap on narrow viewports. */}
      <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
        {Object.entries(SKILL_PRESETS).map(([key, preset]) => (
          <PresetButton
            key={key}
            onClick={() => onPreset(preset.skills)}
            active={
              required.length === preset.skills.length &&
              preset.skills.every((s) => activeSet.has(s))
            }
          >
            {preset.label}
          </PresetButton>
        ))}
        <PresetButton onClick={onClear} tone="ghost">
          Clear
        </PresetButton>
      </div>

      {/* Chip grid. 2×5 on wide, auto-wraps on narrow. */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
          gap: 6,
        }}
      >
        {SKILLS.map((skill) => {
          const on = activeSet.has(skill);
          const count = counts[skill];
          return (
            <button
              key={skill}
              type="button"
              title={SKILL_BLURB[skill]}
              onClick={() => onToggle(skill)}
              style={{
                display: "grid",
                gridTemplateColumns: "1fr auto",
                alignItems: "center",
                gap: 8,
                padding: "8px 10px",
                background: on ? SKILL_COLOR[skill] : "transparent",
                color: on ? "var(--ink-4)" : "var(--ink-0)",
                border: `1.5px solid ${on ? SKILL_COLOR[skill] : "var(--ink-2)"}`,
                cursor: "pointer",
                fontFamily: "inherit",
                fontSize: 11,
                letterSpacing: "0.04em",
                textAlign: "left",
                transition: "background 100ms ease, border-color 100ms ease",
              }}
              onMouseEnter={(e) => {
                if (!on) {
                  e.currentTarget.style.borderColor = SKILL_COLOR[skill];
                }
              }}
              onMouseLeave={(e) => {
                if (!on) {
                  e.currentTarget.style.borderColor = "var(--ink-2)";
                }
              }}
            >
              <span style={{ fontWeight: on ? 700 : 600, minWidth: 0, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                {SKILL_LABEL[skill]}
              </span>
              <span
                style={{
                  fontSize: 10,
                  fontVariantNumeric: "tabular-nums",
                  color: on ? "var(--ink-4)" : count === 0 ? "var(--rpg-red)" : "var(--ink-1)",
                  opacity: on ? 0.9 : 1,
                }}
              >
                {count}
              </span>
            </button>
          );
        })}
      </div>

      {/* Empty-state + gap-flag. */}
      {empty && required.length > 0 ? (
        <div
          style={{
            border: "1px dashed var(--rpg-red)",
            padding: 10,
            background: "rgba(196,77,63,0.08)",
            display: "grid",
            gap: 6,
          }}
        >
          <span
            style={{
              fontSize: 11,
              fontWeight: 700,
              letterSpacing: "0.08em",
              textTransform: "uppercase",
              color: "var(--rpg-red)",
            }}
          >
            No one has all of these.
          </span>
          <span style={{ fontSize: 11, color: "var(--ink-1)", lineHeight: 1.5 }}>
            Drop a skill — or flag it as a capability gap to hire for.
          </span>
          <button
            type="button"
            onClick={onFlagGap}
            style={{
              justifySelf: "start",
              marginTop: 4,
              padding: "5px 10px",
              background: "var(--rpg-red)",
              color: "var(--ink-4)",
              border: "none",
              cursor: "pointer",
              fontFamily: "inherit",
              fontSize: 10,
              fontWeight: 700,
              letterSpacing: "0.1em",
              textTransform: "uppercase",
            }}
          >
            Flag as gap
          </button>
        </div>
      ) : null}
    </div>
  );
}

function PresetButton({
  onClick,
  active = false,
  tone = "accent",
  children,
}: {
  onClick: () => void;
  active?: boolean;
  tone?: "accent" | "ghost";
  children: React.ReactNode;
}) {
  const accent = "var(--rpg-purple, #8B6FB5)";
  return (
    <button
      type="button"
      onClick={onClick}
      style={{
        padding: "4px 10px",
        fontSize: 9,
        fontWeight: 700,
        letterSpacing: "0.1em",
        textTransform: "uppercase",
        background: active ? accent : "transparent",
        color: active ? "var(--ink-4)" : tone === "ghost" ? "var(--ink-1)" : accent,
        border: `1px solid ${active ? accent : tone === "ghost" ? "var(--ink-2)" : accent}`,
        cursor: "pointer",
        fontFamily: "inherit",
      }}
    >
      {children}
    </button>
  );
}
