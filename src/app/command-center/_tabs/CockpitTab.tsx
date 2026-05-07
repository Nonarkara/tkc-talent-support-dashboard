"use client";

/**
 * CockpitTab — company pulse.
 *
 * Four Subway-Map metric tiles + a KPI grid + Active Quests + Four
 * Pillars + Outcomes. Read-only. No interactions beyond hover. The
 * first tab a boss lands on when they open the app.
 */

import { useState } from "react";
import { MenuWindow } from "@/components/MenuWindow";
import type { DashboardPayload } from "../_shared/types";
import {
  lastQuarterRecap,
  marginWatch,
  quarterlyBurn,
  tkcTicker,
} from "@/lib/company-pulse";
import type { DeptKpi } from "../_shared/types";
import { OutcomeReveal } from "@/components/OutcomeReveal";
import { WorldTicker } from "@/components/WorldTicker";
import { FourPillarsPanel } from "@/components/FourPillarsPanel";

const thb = (n: number) =>
  new Intl.NumberFormat("en-US", { maximumFractionDigits: 0 }).format(n);

function cockpitGrade(
  teams: DashboardPayload["teams"],
  employees: DashboardPayload["employees"],
  kpis: DeptKpi[],
): { grade: string; color: string; label: string } {
  const baseChemistry =
    teams.length > 0
      ? Math.round(teams.reduce((s, t) => s + (t.chemistry_score ?? 50), 0) / teams.length)
      : 0;
  const kpiScore =
    kpis.length > 0
      ? Math.round((kpis.filter((k) => k.status === "on_track").length / kpis.length) * 100)
      : 50;
  const score = teams.length > 0 ? baseChemistry * 0.6 + kpiScore * 0.4 : 0;
  if (score >= 82) return { grade: "S", color: "#f3b61f", label: "Elite" };
  if (score >= 70) return { grade: "A", color: "#86CD7E", label: "Strong" };
  if (score >= 58) return { grade: "B", color: "#86D1FF", label: "Functional" };
  if (score >= 44) return { grade: "C", color: "#FB923C", label: "Fragmented" };
  if (score >= 30) return { grade: "D", color: "#F87171", label: "Unstable" };
  return { grade: employees.length === 0 ? "—" : "F", color: "#888888", label: employees.length === 0 ? "No data" : "Critical" };
}

export function CockpitTab({ dash }: { dash: DashboardPayload }) {
  const ticker = tkcTicker({ teams: dash.teams, projects: dash.projects });
  const burn = quarterlyBurn({ projects: dash.projects });
  const margin = marginWatch(dash.projects);
  const recap = lastQuarterRecap({
    supportActions: dash.support_actions,
    kpis: dash.kpis,
  });
  const grade = cockpitGrade(dash.teams, dash.employees, dash.kpis);

  // ─── Single-viewport layout ───────────────────────────────────────
  // Three rows in the .cc-tab-frame:
  //   row 1 (auto)  — four metric tiles
  //   row 2 (1fr)   — two columns: Pillars · KPIs+Quests
  //                   each column has its own internal scroll
  //   row 3 (auto)  — World ticker + Outcomes (only if data exists)
  return (
    <div
      className="cc-tab-frame"
      style={{
        gridTemplateRows: "auto 1fr auto",
        gap: 12,
      }}
    >
      {/* Row 1 — four metric tiles */}
      <div style={{ display: "grid", gap: 8 }}>
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(4, 1fr)",
            gap: 12,
          }}
        >
          <Tile
            title="Org Grade"
            value={grade.grade}
            sub={grade.label}
            subColor={grade.color}
            accent={grade.color}
            mono
          />
          <Tile
            title="Quarterly Burn"
            value={`฿${thb(burn.quarterly_projected)}`}
            sub={`฿${thb(burn.monthly_run_rate)}/mo`}
            accent="var(--rpg-orange)"
          />
          <Tile
            title="Avg Margin"
            value={`${margin.avg_margin_pct.toFixed(1)}%`}
            sub={`${margin.healthy_count} ✓ · ${margin.thin_count} thin`}
            subColor={
              margin.thin_count > margin.healthy_count
                ? "var(--rpg-red)"
                : "var(--flux-up)"
            }
            accent="var(--rpg-yellow)"
          />
          <Tile
            title="Support"
            value={`${recap.open_support_actions}`}
            sub={`${recap.closed_this_cycle} closed · ${recap.kpis_off_track} KPI off`}
            accent="var(--rpg-red)"
          />
        </div>
      </div>

      {/* Row 2 — two columns of working surfaces. Each column scrolls
          independently inside this fixed-height row. */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "minmax(0, 1fr) minmax(0, 1.3fr)",
          gap: 12,
          minHeight: 0,
        }}
      >
        {/* Column A — The Four Pillars (the morning question) */}
        <div className="cc-scroll" style={{ display: "grid", gap: 12, alignContent: "start" }}>
          <FourPillarsPanel />
        </div>

        {/* Column B — KPI grid + Active Quests, the working numbers */}
        <div className="cc-scroll" style={{ display: "grid", gap: 12, alignContent: "start" }}>
          <MenuWindow title="Department KPIs">
            {dash.kpis.length === 0 ? (
              <div style={{ color: "var(--ink-1)", fontSize: 11, padding: "8px 0" }}>
                No KPIs loaded for the current cycle.
              </div>
            ) : (
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))",
                  gap: 8,
                }}
              >
                {dash.kpis.slice(0, 12).map((kpi, index) => {
                  const target = kpi.target_value ?? 0;
                  const actual = kpi.actual_value ?? 0;
                  const pct = target > 0 ? Math.min(100, (actual / target) * 100) : 0;
                  const healthy = kpi.status === "on_track";
                  return (
                    <div
                      key={kpi.id ?? `${kpi.code}-${kpi.name ?? "kpi"}-${index}`}
                      style={{
                        background: "var(--ink-4)",
                        border: "1px solid var(--rpg-blue-deep)",
                        padding: "7px 9px",
                        display: "flex",
                        flexDirection: "column",
                        gap: 4,
                      }}
                    >
                      <div
                        style={{
                          fontSize: 9,
                          letterSpacing: "0.1em",
                          textTransform: "uppercase",
                          color: "var(--ink-1)",
                          overflow: "hidden",
                          textOverflow: "ellipsis",
                          whiteSpace: "nowrap",
                        }}
                      >
                        {kpi.code}
                      </div>
                      <div style={{ fontSize: 12, color: "var(--ink-0)", fontWeight: 600 }}>
                        {actual} / {target}
                      </div>
                      <div style={{ position: "relative", height: 2, background: "var(--rpg-blue-deep)" }}>
                        <div
                          style={{
                            position: "absolute",
                            left: 0, top: 0, bottom: 0,
                            width: `${pct}%`,
                            background: healthy ? "var(--rpg-yellow)" : "var(--rpg-red)",
                          }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </MenuWindow>

          <MenuWindow title="Active Quests">
            <div style={{ display: "grid", gap: 4 }}>
              {dash.projects
                .filter((p) => p.status !== "done")
                .slice(0, 8)
                .map((p) => (
                  <div
                    key={p.code}
                    style={{
                      display: "grid",
                      gridTemplateColumns: "minmax(48px, 60px) minmax(0, 1fr) auto auto",
                      alignItems: "center",
                      gap: 10,
                      padding: "4px 0",
                      borderBottom: "1px solid var(--rpg-blue-deep)",
                      fontSize: 11,
                    }}
                  >
                    <span className="pixel" style={{ color: "var(--rpg-yellow)", fontSize: 9 }}>
                      {p.code}
                    </span>
                    <span
                      style={{
                        color: "var(--ink-0)",
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                        whiteSpace: "nowrap",
                      }}
                    >
                      {p.name}
                    </span>
                    <span
                      style={{
                        color: "var(--ink-1)",
                        fontSize: 9,
                        textTransform: "uppercase",
                        letterSpacing: "0.08em",
                      }}
                    >
                      {p.priority ?? "—"}
                    </span>
                    <span
                      style={{
                        color: (p.progress_pct ?? 0) >= 70 ? "var(--flux-up)" : "var(--rpg-orange)",
                        textAlign: "right",
                        fontFamily: "var(--font-mono)",
                      }}
                    >
                      {p.progress_pct ?? 0}%
                    </span>
                  </div>
                ))}
            </div>
          </MenuWindow>
        </div>

      </div>

      {/* Row 3 — World ticker + Outcomes, only if data exists */}
      {(dash.world_events?.length ?? 0) > 0 || (dash.outcomes && dash.outcomes.length > 0) ? (
        <div style={{ display: "grid", gap: 8 }}>
          {(dash.world_events?.length ?? 0) > 0 && <WorldTicker events={dash.world_events || []} />}
          {dash.outcomes && dash.outcomes.length > 0 && (
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
                gap: 8,
              }}
            >
              {dash.outcomes.slice(0, 3).map((outcome) => (
                <OutcomeReveal key={outcome.id} outcome={outcome} />
              ))}
            </div>
          )}
        </div>
      ) : null}
    </div>
  );
}

function Tile({
  title,
  value,
  sub,
  subColor = "var(--ink-1)",
  accent,
  mono = false,
}: {
  title: string;
  value: string;
  sub: string;
  subColor?: string;
  accent: string;
  mono?: boolean;
}) {
  return (
    <div
      style={{
        background: "var(--ink-4)",
        border: `2px solid ${accent}`,
        padding: "16px 18px",
        display: "flex",
        flexDirection: "column",
        gap: 6,
      }}
    >
      <div
        className="pixel"
        style={{
          fontSize: 9,
          color: accent,
          letterSpacing: "0.14em",
          textTransform: "uppercase",
        }}
      >
        {title}
      </div>
      <div
        style={{
          fontSize: 28,
          fontWeight: 700,
          color: mono ? accent : "var(--ink-0)",
          letterSpacing: mono ? "0.04em" : "-0.01em",
          lineHeight: 1.1,
          fontFamily: mono ? "var(--font-mono, monospace)" : undefined,
        }}
      >
        {value}
      </div>
      <div
        style={{
          fontSize: 11,
          color: subColor,
          letterSpacing: "0.04em",
        }}
      >
        {sub}
      </div>
    </div>
  );
}
