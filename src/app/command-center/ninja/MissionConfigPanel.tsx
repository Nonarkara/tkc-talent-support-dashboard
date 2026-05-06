"use client";

/**
 * MissionConfigPanel — Step 1 of the Ninja Tab workflow.
 *
 * Shown in place of the warrior-seat grid until the boss confirms
 * the mission brief. Two things to set:
 *
 *   1. Mission name (saved to DB via PATCH /api/db/quests)
 *   2. Per-skill importance (0 = not required, 1–5 = required at that weight)
 *
 * Once at least one skill is marked > 0 and the boss clicks
 * "Lock In & Recruit Warriors →", the card switches to the seat grid
 * and the candidate roster filters to the configured required skills.
 */

import { SKILL_COLOR, SKILL_LABEL, SKILLS, type Skill } from "@/lib/skills-vocab";

interface Props {
  tone: string;
  callSign: string;
  title: string;
  skillNeeds: Record<Skill, number>;
  savingName: boolean;
  onTitleChange: (t: string) => void;
  onSaveName: () => void;
  onSkillNeedChange: (skill: Skill, value: number) => void;
  onLockIn: () => void;
}

export function MissionConfigPanel({
  tone,
  callSign,
  title,
  skillNeeds,
  savingName,
  onTitleChange,
  onSaveName,
  onSkillNeedChange,
  onLockIn,
}: Props) {
  const anyRequired = SKILLS.some((s) => (skillNeeds[s] ?? 0) > 0);

  return (
    <div style={{ display: "grid", gap: 14 }}>
      {/* Step label */}
      <div
        style={{
          fontSize: 9,
          fontWeight: 800,
          textTransform: "uppercase",
          letterSpacing: "0.12em",
          color: tone,
        }}
      >
        Step 1 · Configure {callSign}
      </div>

      {/* Mission name input */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr auto", gap: 8, alignItems: "center" }}>
        <input
          type="text"
          value={title}
          onChange={(e) => onTitleChange(e.target.value)}
          placeholder="Mission name…"
          style={{
            background: "rgba(0,0,0,0.25)",
            border: `1px solid ${tone}88`,
            color: "var(--ink-0)",
            fontSize: 13,
            fontWeight: 700,
            padding: "7px 10px",
            fontFamily: "inherit",
            outline: "none",
          }}
        />
        <button
          type="button"
          onClick={onSaveName}
          disabled={savingName || !title.trim()}
          style={{
            border: "none",
            background: savingName || !title.trim() ? "var(--ink-3)" : tone,
            color: savingName || !title.trim() ? "var(--ink-1)" : "var(--ink-4)",
            cursor: savingName || !title.trim() ? "not-allowed" : "pointer",
            fontFamily: "inherit",
            fontSize: 10,
            fontWeight: 800,
            padding: "8px 11px",
            textTransform: "uppercase",
            whiteSpace: "nowrap",
          }}
        >
          {savingName ? "Saving…" : "Save Name"}
        </button>
      </div>

      {/* Skill needs grid */}
      <div>
        <div
          style={{
            fontSize: 9,
            fontWeight: 700,
            textTransform: "uppercase",
            letterSpacing: "0.1em",
            color: "var(--ink-1)",
            marginBottom: 8,
          }}
        >
          Skill Requirements · slide to set importance (0 = off, 5 = critical)
        </div>
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "1fr 1fr",
            gap: "6px 16px",
          }}
        >
          {SKILLS.map((skill) => {
            const val = skillNeeds[skill] ?? 0;
            return (
              <div
                key={skill}
                style={{
                  display: "grid",
                  gridTemplateColumns: "auto 1fr auto",
                  alignItems: "center",
                  gap: 7,
                }}
              >
                {/* Color dot + label */}
                <div style={{ display: "flex", alignItems: "center", gap: 5, minWidth: 0 }}>
                  <span
                    style={{
                      width: 7,
                      height: 7,
                      borderRadius: "50%",
                      background: val > 0 ? SKILL_COLOR[skill] : "var(--ink-2)",
                      flexShrink: 0,
                      display: "inline-block",
                    }}
                  />
                  <span
                    style={{
                      fontSize: 10,
                      fontWeight: val > 0 ? 700 : 400,
                      color: val > 0 ? SKILL_COLOR[skill] : "var(--ink-1)",
                      textTransform: "uppercase",
                      letterSpacing: "0.04em",
                      whiteSpace: "nowrap",
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                    }}
                  >
                    {SKILL_LABEL[skill]}
                  </span>
                </div>

                {/* Range slider */}
                <input
                  type="range"
                  min="0"
                  max="5"
                  step="1"
                  value={val}
                  onChange={(e) => onSkillNeedChange(skill, parseInt(e.target.value, 10))}
                  style={{
                    accentColor: val > 0 ? SKILL_COLOR[skill] : "var(--ink-2)",
                    cursor: "pointer",
                    width: "100%",
                  }}
                />

                {/* Value label */}
                <span
                  style={{
                    fontSize: 10,
                    fontWeight: 800,
                    color: val > 0 ? SKILL_COLOR[skill] : "var(--ink-2)",
                    minWidth: 22,
                    textAlign: "right",
                  }}
                >
                  {val === 0 ? "Off" : val}
                </span>
              </div>
            );
          })}
        </div>
      </div>

      {/* Lock-in button */}
      <button
        type="button"
        onClick={onLockIn}
        disabled={!anyRequired}
        style={{
          border: "none",
          background: anyRequired ? tone : "var(--ink-3)",
          color: anyRequired ? "var(--ink-4)" : "var(--ink-1)",
          cursor: anyRequired ? "pointer" : "not-allowed",
          fontFamily: "inherit",
          fontSize: 10,
          fontWeight: 800,
          padding: "10px 14px",
          textTransform: "uppercase",
          letterSpacing: "0.08em",
          textAlign: "center",
        }}
      >
        {anyRequired ? "Open the Mission · Recruit →" : "Set at least one skill to open the mission"}
      </button>
    </div>
  );
}
