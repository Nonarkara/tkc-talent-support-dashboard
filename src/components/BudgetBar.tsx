"use client";

/**
 * BudgetBar — the visceral morning piece.
 *
 * Drop a hero on a project, the bar lurches. Drop a director, the bar
 * lurches more. Goes red when you've overspent. Goes green when you
 * have headroom. The bar IS the discipline.
 *
 * Design constraint (Dr Non 2026-04-27): the finance person is the
 * least tech-savvy user on the team. She needs the numbers to be
 * unmistakable.
 *   - Composite number is HUGE (32pt mono)
 *   - Three states crystal clear: ✓ green / ⚠ yellow / ✗ red
 *   - Bilingual header: งบประมาณ / Budget
 *   - The "over by ฿N" message is rendered in full notation when in
 *     the danger zone — never abbreviated to ฿M
 *   - Headroom shown in plain language, not just a percentage
 */

import { formatCompactThb, type ProjectBudget, type BudgetTone } from "@/lib/project-budget";

interface Props {
  budget: ProjectBudget;
  /** Optional: how to phrase the project. Used in the "over by" warning. */
  projectName?: string;
}

const TONE_COLOR: Record<BudgetTone, string> = {
  under: "var(--flux-up, #5ec28a)",     // green
  edge: "var(--rpg-yellow, #f3c567)",    // yellow / caution
  over: "var(--rpg-red, #d45e4e)",       // red / alarm
  untracked: "var(--ink-1, #7a7368)",    // neutral grey
};

const TONE_LABEL: Record<BudgetTone, { en: string; th: string; symbol: string }> = {
  under:     { en: "Under budget", th: "อยู่ในงบประมาณ",     symbol: "✓" },
  edge:      { en: "Approaching cap", th: "ใกล้เต็มงบ",        symbol: "⚠" },
  over:      { en: "Over budget",   th: "เกินงบประมาณ",       symbol: "✗" },
  untracked: { en: "No budget set", th: "ยังไม่ได้กำหนดงบ",   symbol: "—" },
};

/** Formal Thai-readable THB amount. NOT abbreviated. Used for the alarm
 *  line so the finance person sees the exact baht number when over budget. */
function formatFullThb(value: number): string {
  const sign = value < 0 ? "-" : "";
  const abs = Math.abs(Math.round(value));
  return `${sign}฿${abs.toLocaleString("en-US")}`;
}

export function BudgetBar({ budget, projectName }: Props) {
  const color = TONE_COLOR[budget.tone];
  const label = TONE_LABEL[budget.tone];

  // Width clamped at 100% (we never visually overshoot — the OVER alarm
  // does that visual work). Show the over-amount in the readout instead.
  const fillWidth = Math.min(100, budget.pct);

  return (
    <div
      data-budget-tone={budget.tone}
      style={{
        background: "var(--ink-4, #0c0c14)",
        border: `1px solid ${color}`,
        padding: "12px 16px 14px 16px",
        marginBottom: 12,
        fontFamily: "var(--font-mono, monospace)",
      }}
    >
      {/* Header row — bilingual title + state badge */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "baseline",
          marginBottom: 8,
        }}
      >
        <div>
          <span
            style={{
              fontSize: 10,
              letterSpacing: "0.18em",
              textTransform: "uppercase",
              color: "var(--ink-1)",
              marginRight: 10,
            }}
          >
            งบประมาณ · Budget
          </span>
          {projectName ? (
            <span style={{ fontSize: 10, color: "var(--ink-1)", letterSpacing: "0.04em" }}>
              {projectName}
            </span>
          ) : null}
        </div>
        <div
          aria-label={`Budget state: ${label.en}`}
          style={{
            fontSize: 10,
            fontWeight: 800,
            letterSpacing: "0.14em",
            textTransform: "uppercase",
            color,
            display: "flex",
            alignItems: "center",
            gap: 6,
          }}
        >
          <span style={{ fontSize: 14 }}>{label.symbol}</span>
          <span>{label.en}</span>
        </div>
      </div>

      {/* Big numbers row */}
      <div
        style={{
          display: "flex",
          alignItems: "baseline",
          gap: 16,
          marginBottom: 10,
          flexWrap: "wrap",
        }}
      >
        <strong
          style={{
            fontSize: 32,
            fontWeight: 700,
            color,
            fontFamily: "var(--font-mono)",
            lineHeight: 1,
            letterSpacing: "-0.01em",
          }}
        >
          {budget.tone === "untracked" ? "—" : `${Math.round(budget.pct)}%`}
        </strong>
        <span
          style={{
            fontSize: 14,
            color: "var(--text-primary)",
            fontFamily: "var(--font-mono)",
          }}
        >
          {budget.tone === "untracked"
            ? "no budget set"
            : `${formatCompactThb(budget.committed_thb)} of ${formatCompactThb(budget.total_thb)}`}
        </span>
        <span
          style={{
            fontSize: 11,
            color: "var(--ink-1)",
            letterSpacing: "0.06em",
            marginLeft: "auto",
          }}
        >
          {budget.assignment_count} hero{budget.assignment_count === 1 ? "" : "es"} committed
        </span>
      </div>

      {/* The bar itself */}
      <div
        role="progressbar"
        aria-valuenow={Math.round(budget.pct)}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-label={`${Math.round(budget.pct)} percent of budget committed`}
        style={{
          position: "relative",
          height: 14,
          background: "rgba(255,255,255,0.06)",
          border: "1px solid rgba(245,240,232,0.12)",
        }}
      >
        <div
          style={{
            position: "absolute",
            top: 0,
            left: 0,
            bottom: 0,
            width: `${fillWidth}%`,
            background: color,
            transition: "width 200ms ease-out, background 120ms",
          }}
        />
        {/* 80% caution tick */}
        {budget.tone !== "untracked" && (
          <div
            aria-hidden
            style={{
              position: "absolute",
              left: "80%",
              top: 0,
              bottom: 0,
              width: 1,
              background: "rgba(245,240,232,0.35)",
            }}
          />
        )}
      </div>

      {/* Headroom / overage line — the finance-person plain-language bit */}
      <div
        style={{
          marginTop: 10,
          fontSize: 12,
          fontFamily: "var(--font-mono)",
          color: budget.tone === "over" ? color : "var(--ink-1)",
          letterSpacing: "0.04em",
          fontWeight: budget.tone === "over" ? 700 : 400,
        }}
      >
        {budget.tone === "untracked" ? (
          <>
            <span lang="th">ยังไม่ได้กำหนดงบประมาณสำหรับโปรเจกต์นี้</span>
            <span style={{ marginLeft: 10, color: "var(--ink-1)" }}>· No budget set on this project.</span>
          </>
        ) : budget.tone === "over" ? (
          <>
            <span lang="th">เกินงบประมาณ {formatFullThb(-budget.headroom_thb)}</span>
            <span style={{ marginLeft: 10 }}>· Over by {formatFullThb(-budget.headroom_thb)}.</span>
          </>
        ) : budget.tone === "edge" ? (
          <>
            <span lang="th">เหลืองบประมาณ {formatCompactThb(budget.headroom_thb)}</span>
            <span style={{ marginLeft: 10 }}>· {formatCompactThb(budget.headroom_thb)} headroom.</span>
          </>
        ) : (
          <>
            <span lang="th">เหลืองบประมาณ {formatCompactThb(budget.headroom_thb)}</span>
            <span style={{ marginLeft: 10 }}>· {formatCompactThb(budget.headroom_thb)} headroom.</span>
          </>
        )}
      </div>

      {/* Cost rule footer — small print so the boss knows where the
          number comes from. Don Norman: the system teaches itself. */}
      <div
        style={{
          marginTop: 6,
          fontSize: 9,
          color: "var(--ink-1)",
          letterSpacing: "0.04em",
          fontStyle: "italic",
        }}
      >
        rule: {formatCompactThb(budget.cost_per_token_thb)} per token-month · tune in Ledger → Game Balance
      </div>
    </div>
  );
}
