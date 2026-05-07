"use client";

/**
 * ProjectTrajectoryStrip — four-stat financial projection strip with
 * an inline sparkline. Plugs into Formation tab project headers and
 * the Cockpit Active Quests panel.
 *
 * Inputs are pure: pass project + allocations + employees and the
 * component computes everything client-side. Updates instantly as
 * allocations change.
 */

import type { CSSProperties } from "react";
import { computeTrajectory, formatThb } from "@/lib/project-trajectory";

interface Props {
  project: {
    code: string;
    budget_thb: number | null;
    monthly_ceiling: number | null;
    due_date?: string | null;
    progress_pct?: number | null;
    team_size?: number | null;
  };
  allocations: Array<{ employee_id: string; fte: number }>;
  employees: Array<{ id: string; salary_thb: number | string | null }>;
  compact?: boolean;
}

export function ProjectTrajectoryStrip({ project, allocations, employees, compact = false }: Props) {
  const t = computeTrajectory({ project, allocations, employees });

  const statusColor =
    t.status === "healthy" ? "var(--flux-up, #86CD7E)" :
    t.status === "tight" ? "var(--rpg-orange, #FB923C)" :
    t.status === "over" ? "var(--rpg-red, #d45e4e)" :
    "var(--ink-1)";

  const statusLabel =
    t.status === "healthy" ? "On budget" :
    t.status === "tight" ? "Tight" :
    t.status === "over" ? "Over budget" :
    t.status === "no_budget" ? "No budget set" :
    "No team yet";

  return (
    <div
      style={{
        border: `1px solid ${statusColor}`,
        background: "rgba(0,0,0,0.18)",
        padding: compact ? "8px 10px" : "10px 12px",
        display: "grid",
        gap: 8,
      }}
    >
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, minmax(0, 1fr))", gap: 8 }}>
        <Stat label="Burn / wk" value={formatThb(t.weekly_burn_thb)} tone="var(--ink-0)" />
        <Stat
          label="Weeks left"
          value={t.weeks_to_deadline > 0 ? String(t.weeks_to_deadline) : "—"}
          tone={t.weeks_to_deadline <= 4 && t.weeks_to_deadline > 0 ? "var(--rpg-orange)" : "var(--ink-0)"}
        />
        <Stat
          label="Projected"
          value={t.weekly_burn_thb > 0 ? formatThb(t.projected_total_cost) : "—"}
          tone={t.status === "over" ? "var(--rpg-red)" : "var(--ink-0)"}
        />
        <Stat
          label="Margin"
          value={t.status === "no_budget" ? "—" : `${t.margin_pct.toFixed(0)}%`}
          tone={statusColor}
        />
      </div>

      {!compact && t.weekly_burn_thb > 0 && (
        <Sparkline trajectory={t} accent={statusColor} />
      )}

      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 6,
          fontSize: 9,
          letterSpacing: "0.14em",
          textTransform: "uppercase",
          color: statusColor,
        }}
      >
        <span style={{ width: 5, height: 5, background: statusColor }} />
        {statusLabel}
      </div>
    </div>
  );
}

function Stat({ label, value, tone }: { label: string; value: string; tone: string }) {
  return (
    <div>
      <div
        style={{
          fontSize: 8,
          letterSpacing: "0.16em",
          textTransform: "uppercase",
          color: "var(--ink-1)",
          marginBottom: 2,
        }}
      >
        {label}
      </div>
      <strong style={{ fontFamily: "var(--font-mono, monospace)", fontSize: 14, color: tone, lineHeight: 1.1 }}>
        {value}
      </strong>
    </div>
  );
}

function Sparkline({
  trajectory,
  accent,
}: {
  trajectory: ReturnType<typeof computeTrajectory>;
  accent: string;
}) {
  const { spark } = trajectory;
  if (spark.length === 0) return null;

  const width = 100;
  const height = 18;
  const maxY = Math.max(
    ...spark.map((p) => Math.max(p.cost, p.budget_at_week)),
    1,
  );

  const costPoints = spark
    .map((p) => `${(p.week / (spark.length - 1)) * width},${height - (p.cost / maxY) * height}`)
    .join(" ");
  const budgetPoints = spark
    .map((p) => `${(p.week / (spark.length - 1)) * width},${height - (p.budget_at_week / maxY) * height}`)
    .join(" ");

  return (
    <svg
      viewBox={`0 0 ${width} ${height}`}
      preserveAspectRatio="none"
      style={{ width: "100%", height: 18, display: "block" }}
      aria-hidden
    >
      {/* Budget straight line — dashed grey */}
      <polyline
        points={budgetPoints}
        fill="none"
        stroke="var(--ink-1)"
        strokeWidth="0.6"
        strokeDasharray="2 2"
        opacity="0.6"
      />
      {/* Projected cost — solid accent */}
      <polyline
        points={costPoints}
        fill="none"
        stroke={accent}
        strokeWidth="1.2"
      />
    </svg>
  );
}
