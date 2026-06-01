"use client";

/**
 * MissionConfigPanel — Step 1 of the Ninja Tab workflow.
 *
 * Shown in place of the warrior-seat grid until the boss confirms
 * the mission brief. Three things to set:
 *
 *   1. Mission name (saved to DB via PATCH /api/db/quests)
 *   2. Per-skill importance (0 = not required, 1–5 = required at that weight) —
 *      auto-persisted on debounce; the "saved · HH:MM" pill confirms.
 *   3. Lock In, which flips to the seat grid and filters the candidate
 *      roster to the configured required skills.
 */

import { SKILL_LABEL, SKILLS, type Skill } from "@/lib/skills-vocab";

interface Props {
  tone: string;
  callSign: string;
  title: string;
  skillNeeds: Record<Skill, number>;
  savingName: boolean;
  /** Live indicator from NinjaTab — "saving" | "saved · HH:MM" | error | null */
  saveStatus?: string | null;
  onTitleChange: (t: string) => void;
  onSaveName: () => void;
  onSkillNeedChange: (skill: Skill, value: number) => void;
  onLockIn: () => void;
}

export function MissionConfigPanel({
  tone: _tone,
  callSign,
  title,
  skillNeeds,
  savingName,
  saveStatus,
  onTitleChange,
  onSaveName,
  onSkillNeedChange,
  onLockIn,
}: Props) {
  const anyRequired = SKILLS.some((s) => (skillNeeds[s] ?? 0) > 0);
  const nameEmpty = !title.trim();

  // Save-status colour — green for saved, amber for in-flight, red for fail
  const statusColor = !saveStatus
    ? "transparent"
    : saveStatus.startsWith("saved")
      ? "#4a8a5a"
      : saveStatus.startsWith("saving")
        ? "#D4A843"
        : "#C44D3F";

  return (
    <div style={{ display: "grid", gap: 16 }}>
      {/* Step label */}
      <div
        style={{
          fontSize: 10,
          fontWeight: 800,
          textTransform: "uppercase",
          letterSpacing: "0.14em",
          color: "#D4A843",
        }}
      >
        Mission Brief — {callSign}
      </div>

      {/* Mission name input */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr auto", gap: 8, alignItems: "center" }}>
        <input
          type="text"
          value={title}
          onChange={(e) => onTitleChange(e.target.value)}
          placeholder="Mission name…"
          aria-label="Mission name"
          style={{
            background: "rgba(0,0,0,0.30)",
            border: `1px solid ${nameEmpty ? "rgba(212,168,67,0.25)" : "rgba(212,168,67,0.45)"}`,
            color: "var(--ink-0)",
            fontSize: 14,
            fontWeight: 700,
            padding: "10px 12px",
            fontFamily: "inherit",
            outline: "none",
            minHeight: 44,
          }}
        />
        <button
          type="button"
          onClick={onSaveName}
          disabled={savingName || nameEmpty}
          aria-label={savingName ? "Saving name" : nameEmpty ? "Type a mission name first" : "Save mission name"}
          title={nameEmpty ? "Type a mission name first" : "Save mission name"}
          style={{
            border: savingName || nameEmpty ? "1px dashed rgba(212,168,67,0.30)" : "1px solid #D4A843",
            background: savingName || nameEmpty ? "rgba(212,168,67,0.06)" : "#D4A843",
            color: savingName || nameEmpty ? "#7a6a4e" : "#0d0d10",
            cursor: savingName || nameEmpty ? "not-allowed" : "pointer",
            fontFamily: "inherit",
            fontSize: 11,
            fontWeight: 800,
            padding: "0 16px",
            minHeight: 44,
            textTransform: "uppercase",
            letterSpacing: "0.06em",
            whiteSpace: "nowrap",
            transition: "transform 80ms ease",
          }}
          onMouseDown={(e) => { e.currentTarget.style.transform = "translateY(1px)"; }}
          onMouseUp={(e) => { e.currentTarget.style.transform = "translateY(0)"; }}
          onMouseLeave={(e) => { e.currentTarget.style.transform = "translateY(0)"; }}
        >
          {savingName ? "Saving…" : "Save Name"}
        </button>
      </div>

      {/* Skill needs grid */}
      <div>
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "baseline",
            marginBottom: 10,
            gap: 12,
          }}
        >
          <div
            style={{
              fontSize: 10,
              fontWeight: 700,
              textTransform: "uppercase",
              letterSpacing: "0.10em",
              color: "var(--ink-1)",
            }}
          >
            Skill Requirements · slide to set importance (0 = off, 5 = critical)
          </div>
          {/* Auto-save status indicator — battery-save honesty */}
          {saveStatus && (
            <div
              style={{
                fontSize: 9,
                fontFamily: "var(--font-mono)",
                color: statusColor,
                letterSpacing: "0.08em",
                textTransform: "uppercase",
                whiteSpace: "nowrap",
                animation: saveStatus.startsWith("saving") ? "ninja-pulse 1s ease-in-out infinite" : "none",
              }}
              aria-live="polite"
            >
              ● {saveStatus}
            </div>
          )}
        </div>
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "1fr 1fr",
            gap: "8px 20px",
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
                  gap: 9,
                  minHeight: 28,
                }}
              >
                {/* Color dot + label */}
                <div style={{ display: "flex", alignItems: "center", gap: 6, minWidth: 0 }}>
                  <span
                    style={{
                      width: 7, height: 7,
                      background: val > 0 ? "#D4A843" : "rgba(245,240,232,0.15)",
                      flexShrink: 0, display: "inline-block",
                    }}
                  />
                  <span
                    style={{
                      fontSize: 11,
                      fontWeight: val > 0 ? 700 : 400,
                      color: val > 0 ? "#f5f0e8" : "#8a7a5e",
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
                  aria-label={`${SKILL_LABEL[skill]} importance`}
                  style={{
                    accentColor: val > 0 ? "#D4A843" : "rgba(245,240,232,0.2)",
                    cursor: "pointer",
                    width: "100%",
                    minHeight: 24,
                  }}
                />

                {/* Value label */}
                <span
                  style={{
                    fontSize: 11,
                    fontWeight: 800,
                    color: val > 0 ? "#D4A843" : "rgba(245,240,232,0.2)",
                    minWidth: 26,
                    textAlign: "right",
                    fontFamily: "var(--font-mono)",
                  }}
                >
                  {val === 0 ? "Off" : val}
                </span>
              </div>
            );
          })}
        </div>
      </div>

      {/* Inline constraint message — visible BEFORE the user clicks the
          disabled button. Don Norman: announce the rule, don't hide it. */}
      {!anyRequired && (
        <div
          style={{
            color: "#D4A843",
            fontSize: 11,
            fontStyle: "italic",
            letterSpacing: "0.02em",
            paddingLeft: 4,
          }}
          aria-live="polite"
        >
          ↑ Set at least one skill above 0 to open the mission.
        </div>
      )}

      {/* Lock-in button — primary CTA uses brighter amber per Track D */}
      <button
        type="button"
        onClick={onLockIn}
        disabled={!anyRequired}
        aria-label={anyRequired ? "Lock in the mission and start recruiting warriors" : "Set at least one skill to open the mission"}
        style={{
          border: anyRequired ? "1px solid #F5C04A" : "1px dashed rgba(212,168,67,0.30)",
          background: anyRequired ? "#F5C04A" : "rgba(212,168,67,0.06)",
          color: anyRequired ? "#0d0d10" : "#7a6a4e",
          cursor: anyRequired ? "pointer" : "not-allowed",
          fontFamily: "inherit",
          fontSize: 12,
          fontWeight: 800,
          padding: "0 16px",
          minHeight: 48,
          textTransform: "uppercase",
          letterSpacing: "0.10em",
          textAlign: "center",
          transition: "background 120ms ease, transform 80ms ease",
        }}
        onMouseEnter={(e) => { if (anyRequired) e.currentTarget.style.background = "#FFD66B"; }}
        onMouseLeave={(e) => { if (anyRequired) e.currentTarget.style.background = "#F5C04A"; }}
        onMouseDown={(e) => { if (anyRequired) e.currentTarget.style.transform = "translateY(1px)"; }}
        onMouseUp={(e) => { e.currentTarget.style.transform = "translateY(0)"; }}
      >
        {anyRequired ? "Open the Mission · Recruit →" : "Set a skill ↑ to enable"}
      </button>
    </div>
  );
}
