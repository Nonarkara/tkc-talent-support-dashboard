"use client";

/**
 * ReadinessStrip — the pinned top strip of the Ninja tab.
 *
 * Renders the output of `squadReadiness()` as a horizontal bar per
 * SKILL. Red = missing (required but nobody has it), amber = single
 * point of failure, green = healthy bench (≥2 people). Overall % and
 * chemistry sit on the right as the headline numbers.
 *
 * The strip shows ALL skills, not only required ones — that way the
 * boss can glance across and see both gaps and *surpluses* ("I have
 * 6 technical people for a mission that doesn't need any").
 */

import { SKILLS, SKILL_COLOR, SKILL_LABEL, type Skill } from "@/lib/skills-vocab";
import type { ReadinessReport } from "@/lib/squad-readiness";

const BAR_COLOR = {
  missing: "var(--rpg-red)",
  "single-point": "var(--rpg-orange)",
  healthy: "var(--flux-up)",
} as const;

export function ReadinessStrip({
  report,
  memberCount,
}: {
  report: ReadinessReport;
  memberCount: number;
}) {
  const anyRequired = SKILLS.some((s) => report.per_skill[s].required);

  return (
    <div
      className="cc-readiness-strip"
      style={{
        background: "var(--ink-4)",
        border: "1px solid var(--border-subtle)",
        borderLeft: "3px solid var(--rpg-purple, #8B6FB5)",
        padding: "12px 16px",
        display: "grid",
        gridTemplateColumns: "1fr auto",
        gap: 20,
        alignItems: "center",
      }}
    >
      <div style={{ display: "grid", gap: 8 }}>
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 10,
            fontSize: 10,
            letterSpacing: "0.14em",
            textTransform: "uppercase",
            color: "var(--ink-1)",
          }}
        >
          <span style={{ color: "var(--rpg-purple, #8B6FB5)", fontWeight: 700 }}>
            Squad Readiness
          </span>
          <span>·</span>
          <span>
            {memberCount} {memberCount === 1 ? "warrior" : "warriors"}
          </span>
          {anyRequired ? null : (
            <span style={{ color: "var(--ink-2)" }}>
              — toggle skills on the left to set the mission
            </span>
          )}
        </div>
        {/* Per-skill bars. Grid of 10 tiny rows so the eye can scan
            down the list at a glance. */}
        <div
          className="cc-skill-bar-grid"
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(5, 1fr)",
            gap: "6px 14px",
          }}
        >
          {SKILLS.map((skill) => (
            <SkillBar key={skill} skill={skill} report={report} />
          ))}
        </div>
      </div>

      {/* Headline numbers. */}
      <div
        className="cc-readiness-metrics"
        style={{
          display: "grid",
          gridTemplateColumns: "auto auto",
          gap: "2px 18px",
          alignItems: "end",
          paddingLeft: 18,
          borderLeft: "1px solid var(--border-subtle)",
        }}
      >
        <Metric label="Readiness" value={report.overall_pct} tone="purple" big />
        <Metric label="Chemistry" value={report.chemistry} tone="gold" big />
        <GapsLine gaps={report.gaps} singles={report.single_points} />
      </div>
    </div>
  );
}

function SkillBar({ skill, report }: { skill: Skill; report: ReadinessReport }) {
  const entry = report.per_skill[skill];
  const { coverage, required, bench_depth } = entry;

  // Visual scale: the bar maxes at a coverage of 3 (beyond that, more
  // people doesn't make the squad meaningfully more ready for that
  // skill — it just means slack).
  const filled = Math.min(coverage, 3) / 3;
  const barColour = required ? BAR_COLOR[bench_depth] : "var(--ink-2)";
  const labelColour = required ? SKILL_COLOR[skill] : "var(--ink-2)";

  return (
    <div style={{ display: "grid", gap: 3 }}>
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "baseline",
          fontSize: 10,
          letterSpacing: "0.06em",
          textTransform: "uppercase",
          fontWeight: required ? 700 : 500,
          color: labelColour,
        }}
      >
        <span style={{ opacity: required ? 1 : 0.65 }}>{SKILL_LABEL[skill]}</span>
        <span style={{ color: "var(--ink-1)", fontSize: 9 }}>×{coverage}</span>
      </div>
      <div
        style={{
          height: 4,
          background: "var(--border-subtle)",
          position: "relative",
          overflow: "hidden",
        }}
      >
        <div
          style={{
            position: "absolute",
            inset: 0,
            width: `${filled * 100}%`,
            background: barColour,
            transition: "width 120ms ease",
          }}
        />
      </div>
    </div>
  );
}

function Metric({
  label,
  value,
  tone,
  big = false,
}: {
  label: string;
  value: number;
  tone: "purple" | "gold";
  big?: boolean;
}) {
  const colour = tone === "purple" ? "var(--rpg-purple, #8B6FB5)" : "var(--rpg-yellow)";
  return (
    <div style={{ display: "grid", gap: 2, textAlign: "right" }}>
      <span
        style={{
          fontSize: 9,
          letterSpacing: "0.14em",
          textTransform: "uppercase",
          color: "var(--ink-1)",
        }}
      >
        {label}
      </span>
      <span
        style={{
          fontSize: big ? 26 : 16,
          fontWeight: 700,
          color: colour,
          fontVariantNumeric: "tabular-nums",
          lineHeight: 1,
        }}
      >
        {value}
        <span style={{ fontSize: big ? 13 : 10, marginLeft: 2, color: "var(--ink-1)" }}>%</span>
      </span>
    </div>
  );
}

function GapsLine({ gaps, singles }: { gaps: Skill[]; singles: Skill[] }) {
  if (gaps.length === 0 && singles.length === 0) {
    return (
      <div
        style={{
          gridColumn: "1 / -1",
          textAlign: "right",
          fontSize: 10,
          letterSpacing: "0.1em",
          textTransform: "uppercase",
          color: "var(--flux-up)",
          marginTop: 4,
        }}
      >
        ✓ no gaps, healthy bench
      </div>
    );
  }
  return (
    <div
      style={{
        gridColumn: "1 / -1",
        textAlign: "right",
        fontSize: 10,
        letterSpacing: "0.06em",
        color: "var(--ink-1)",
        marginTop: 4,
      }}
    >
      {gaps.length > 0 ? (
        <span>
          <span style={{ color: "var(--rpg-red)", fontWeight: 700 }}>missing</span>{" "}
          {gaps.map((s) => SKILL_LABEL[s]).join(", ")}
        </span>
      ) : null}
      {gaps.length > 0 && singles.length > 0 ? <span> · </span> : null}
      {singles.length > 0 ? (
        <span>
          <span style={{ color: "var(--rpg-orange)", fontWeight: 700 }}>thin</span>{" "}
          {singles.map((s) => SKILL_LABEL[s]).join(", ")}
        </span>
      ) : null}
    </div>
  );
}
