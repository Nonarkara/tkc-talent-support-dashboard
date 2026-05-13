"use client";

/**
 * PortfolioStrip — the PMO watcher's headline view.
 *
 * Five tiles, computed live from the dashboard payload:
 *   1. Active Projects   — count vs total filed for the year
 *   2. Project Value     — sum of budget_thb vs an annual target
 *   3. Coverage Rollup   — total filled slots vs total required slots
 *                          across every committed team. THIS is the
 *                          bar that ticks when directors commit
 *                          formations.
 *   4. Burn Rate         — actual_cost vs planned_cost across all
 *                          projects. Healthy when actual < planned.
 *   5. Project Health    — a sparse 5-cell donut counting projects by
 *                          status bucket: On Track / Watch / At Risk /
 *                          Closed / Not Started.
 *
 * Design rule: every label is a full word, no glyph-only buttons.
 * The strip is read-only — clicking a tile does NOT navigate; it only
 * shows a hover tooltip explaining the math. The PMO watches; it
 * never acts directly.
 */

import { useMemo } from "react";
import type { DashboardPayload } from "@/app/command-center/_shared/types";

type ProjectLike = DashboardPayload["projects"][number];

interface SlotMap {
  technical?: number;
  sales?: number;
  marketing?: number;
  outsourcing?: number;
  paperwork?: number;
}

const ANNUAL_TARGET_THB = 4_000_000_000; // PMO Base Case 2026 (Roadmap 2026-05-07)

function sumSlots(slots: SlotMap | null | undefined): number {
  if (!slots) return 0;
  return (
    (slots.technical ?? 0) +
    (slots.sales ?? 0) +
    (slots.marketing ?? 0) +
    (slots.outsourcing ?? 0) +
    (slots.paperwork ?? 0)
  );
}

function thb(n: number): string {
  if (n >= 1_000_000_000) return `฿${(n / 1_000_000_000).toFixed(1)}B`;
  if (n >= 1_000_000) return `฿${(n / 1_000_000).toFixed(0)}M`;
  if (n >= 1_000) return `฿${(n / 1_000).toFixed(0)}k`;
  return `฿${n}`;
}

function pct(num: number, denom: number): number {
  if (!denom) return 0;
  return Math.max(0, Math.min(999, Math.round((num / denom) * 100)));
}

export function PortfolioStrip({ dash }: { dash: DashboardPayload }) {
  const rollup = useMemo(() => {
    const projects = dash.projects ?? [];
    const teams = dash.teams ?? [];

    const total_projects = projects.length;
    const active_projects = projects.filter(
      (p) => p.status !== "closed" && p.status !== "archived",
    ).length;

    const total_value = projects.reduce(
      (s, p) => s + Number(p.budget_thb ?? 0),
      0,
    );

    const total_planned = projects.reduce(
      (s, p) => s + Number(p.planned_cost_thb ?? 0),
      0,
    );
    const total_actual = projects.reduce(
      (s, p) => s + Number(p.actual_cost_thb ?? 0),
      0,
    );

    const committedProjectIds = new Set(
      teams
        .map((team) => team.project_id)
        .filter((value): value is string => Boolean(value)),
    );

    // Coverage must follow Formation commits. Those writes land in
    // `project_allocations`, and the dashboard projects that back into
    // `dash.teams`, not employee availability.
    let required_slots = 0;
    for (const p of projects) {
      if (!committedProjectIds.has(p.id)) continue;
      required_slots += sumSlots((p as ProjectLike & { project_slots?: SlotMap }).project_slots);
    }

    const filled_slots = teams.reduce(
      (sum, team) => sum + (team.player_ids?.length ?? 0),
      0,
    );

    type StatusBucket = "on_track" | "watch" | "at_risk" | "closed" | "not_started";
    const buckets: Record<StatusBucket, number> = {
      on_track: 0,
      watch: 0,
      at_risk: 0,
      closed: 0,
      not_started: 0,
    };
    for (const p of projects) {
      const status = (p.status ?? "").toLowerCase();
      const margin_risk = (p as ProjectLike & { margin_risk?: string }).margin_risk;
      if (status === "closed" || status === "archived") buckets.closed++;
      else if (status === "planning") buckets.not_started++;
      else if (margin_risk === "watch") buckets.watch++;
      else if (margin_risk === "high") buckets.at_risk++;
      else buckets.on_track++;
    }

    return {
      total_projects,
      active_projects,
      total_value,
      total_planned,
      total_actual,
      required_slots,
      filled_slots,
      buckets,
    };
  }, [dash.projects, dash.teams]);

  const value_pct = pct(rollup.total_value, ANNUAL_TARGET_THB);
  const coverage_pct = pct(rollup.filled_slots, rollup.required_slots);
  const burn_pct = pct(rollup.total_actual, rollup.total_planned);

  return (
    <div
      style={{
        border: "1px solid var(--ink-2)",
        background: "rgba(0,0,0,0.25)",
        padding: "10px 12px",
        display: "grid",
        gap: 10,
      }}
      data-testid="pmo-portfolio-strip"
    >
      {/* Header row — labelled, plain English */}
      <div
        style={{
          display: "flex",
          alignItems: "baseline",
          justifyContent: "space-between",
          gap: 8,
          fontSize: 10,
          letterSpacing: "0.12em",
          textTransform: "uppercase",
          color: "var(--ink-1)",
        }}
      >
        <span style={{ color: "var(--rpg-yellow)", fontWeight: 700 }}>
          PMO PORTFOLIO — what the watcher sees
        </span>
        <span style={{ fontSize: 9, color: "var(--ink-2)" }}>
          live · refreshes when formations commit
        </span>
      </div>

      {/* Five tiles */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(5, 1fr)",
          gap: 10,
        }}
      >
        <Tile
          label="Active Projects"
          big={`${rollup.active_projects} / ${rollup.total_projects}`}
          subline="committed to deliver"
          tooltip="Active projects (status != closed) over total filed projects this year."
        />
        <Tile
          label="Project Value"
          big={`${value_pct}%`}
          subline={`${thb(rollup.total_value)} / ${thb(ANNUAL_TARGET_THB)}`}
          tooltip="Sum of project budgets versus the PMO 2026 Base Case revenue target of ฿4.0B (Best Case ฿6.9B). See TKC_PMO_Roadmap_20260507.pdf §1.1."
          bar={value_pct}
          barTone={value_pct >= 90 ? "good" : value_pct >= 60 ? "watch" : "bad"}
        />
        <Tile
          label="Coverage Rollup"
          big={`${rollup.filled_slots} / ${rollup.required_slots}`}
          subline={`${coverage_pct}% of all required slots filled`}
          tooltip="Total filled slots across every committed team, divided by total required slots across every active project. THIS is the bar that ticks when a director commits a formation."
          bar={coverage_pct}
          barTone={coverage_pct >= 80 ? "good" : coverage_pct >= 50 ? "watch" : "bad"}
        />
        <Tile
          label="Burn Rate"
          big={`${burn_pct}%`}
          subline={`${thb(rollup.total_actual)} of ${thb(rollup.total_planned)} planned`}
          tooltip="Actual cost across every project versus planned cost. Healthy when actual is below planned, problematic when actual is racing ahead of schedule."
          bar={Math.min(100, burn_pct)}
          barTone={burn_pct < 95 ? "good" : burn_pct < 110 ? "watch" : "bad"}
        />
        <Tile
          label="Project Health"
          big={`${rollup.buckets.on_track + rollup.buckets.not_started}`}
          subline={`${rollup.buckets.watch} watch · ${rollup.buckets.at_risk} at risk · ${rollup.buckets.closed} closed`}
          tooltip="Project status mix. On Track + Not Started count as healthy; Watch and At Risk are flagged. PMO triggers a Go/No-Go gate review when At Risk persists for two cycles."
        />
      </div>
    </div>
  );
}

function Tile({
  label,
  big,
  subline,
  tooltip,
  bar,
  barTone,
}: {
  label: string;
  big: string;
  subline: string;
  tooltip: string;
  bar?: number;
  barTone?: "good" | "watch" | "bad";
}) {
  const toneColor =
    barTone === "good"
      ? "var(--flux-up)"
      : barTone === "watch"
        ? "var(--rpg-yellow)"
        : barTone === "bad"
          ? "var(--rpg-red)"
          : "var(--ink-1)";
  return (
    <div
      title={tooltip}
      aria-label={`${label}: ${big}. ${subline}.`}
      style={{
        border: "1px solid var(--ink-2)",
        background: "rgba(0,0,0,0.18)",
        padding: "8px 10px",
        display: "grid",
        gap: 4,
        cursor: "help",
      }}
    >
      <div
        style={{
          fontSize: 9,
          letterSpacing: "0.10em",
          textTransform: "uppercase",
          color: "var(--ink-1)",
        }}
      >
        {label}
      </div>
      <div
        style={{
          fontSize: 18,
          fontWeight: 700,
          color: "var(--ink-0)",
          fontFamily: "var(--font-mono, JetBrains Mono, monospace)",
        }}
      >
        {big}
      </div>
      {bar !== undefined ? (
        <div
          style={{
            height: 4,
            background: "rgba(255,255,255,0.06)",
            position: "relative",
            marginTop: 2,
          }}
          aria-hidden="true"
        >
          <div
            style={{
              height: "100%",
              width: `${Math.min(100, bar)}%`,
              background: toneColor,
              transition: "width 240ms ease",
            }}
          />
        </div>
      ) : null}
      <div style={{ fontSize: 9, color: "var(--ink-1)", lineHeight: 1.4 }}>
        {subline}
      </div>
    </div>
  );
}
