"use client";

/**
 * SignalsTab — risk watch, support actions queue, succession bench.
 *
 * Three MenuWindows:
 *   1. Risk — heroes flagged as watch/risk by simple heuristics.
 *   2. Open support actions — in-flight actions across the roster.
 *   3. Succession bench — candidates by archetype for leadership gaps.
 *
 * All content is derived from the dashboard payload. No writes.
 */

import { useState } from "react";
import { MenuWindow } from "@/components/MenuWindow";
import { ClassGlyph } from "@/components/ClassGlyph";
import { isAnchor } from "@/lib/company-pulse";
import {
  ARCHETYPE_LABEL,
  getArchetype,
  type Archetype,
} from "@/lib/token-economy";
import type { DashboardPayload, Employee } from "../_shared/types";
import { InspectModal } from "./RosterTab";

type Signal = "anchor" | "ok" | "watch" | "risk";

// Departments with historically elevated turnover — used for risk signals.
const HIGH_RISK_DEPTS = new Set(["PROCURE", "ACCT", "DIGITAL", "PROCUREMENT", "PROC"]);

// ─── Tenure milestones ─────────────────────────────────────────────────
// The "Animal Crossing birthday" mechanic. Heroes approaching a milestone
// (1 / 5 / 10 / 20 yr) within the next 60 days deserve recognition before
// the moment passes. Tenure is stored in whole years; we simulate the
// "days to milestone" as a fraction of the next calendar year.
const MILESTONE_YEARS = [1, 3, 5, 10, 15, 20];

function milestonesApproaching(
  employees: Employee[],
  windowDays = 60,
): Array<{ emp: Employee; milestone: number; daysLeft: number }> {
  const today = new Date();
  const results: Array<{ emp: Employee; milestone: number; daysLeft: number }> = [];

  for (const emp of employees) {
    const tenure = typeof emp.tenure_years === "number" ? emp.tenure_years : null;
    if (tenure === null) continue;

    for (const m of MILESTONE_YEARS) {
      // Already past this milestone — skip
      if (tenure >= m) continue;

      // Days until milestone = fractional years remaining × 365
      const yearsLeft = m - tenure;
      const daysLeft = Math.round(yearsLeft * 365);

      if (daysLeft <= windowDays) {
        results.push({ emp, milestone: m, daysLeft });
      }
      break; // Only the NEAREST upcoming milestone per person
    }
  }

  return results.sort((a, b) => a.daysLeft - b.daysLeft).slice(0, 12);
}

function milestoneColor(milestone: number): string {
  if (milestone >= 20) return "#f3b61f"; // gold — legend
  if (milestone >= 10) return "#86CD7E"; // green — veteran
  if (milestone >= 5)  return "#86D1FF"; // blue — senior
  return "var(--ink-1)";                 // grey — standard
}

function riskFor(emp: Employee): Signal {
  if (isAnchor(emp)) return "anchor";
  const tenure = typeof emp.tenure_years === "number" ? emp.tenure_years : 0;
  const con = typeof emp.attr_con === "number" ? emp.attr_con : 10;
  if (tenure < 1) return "watch";
  if (HIGH_RISK_DEPTS.has(emp.dept_code ?? "") && con < 9) return "risk";
  return "ok";
}

export function SignalsTab({ dash }: { dash: DashboardPayload }) {
  const [inspectId, setInspectId] = useState<string | null>(null);
  const inspected = inspectId ? dash.employees.find((e) => e.id === inspectId) ?? null : null;

  const atRisk = dash.employees
    .map((e) => ({ emp: e, signal: riskFor(e) }))
    .filter((r) => r.signal === "risk" || r.signal === "watch");
  const anchors = dash.employees
    .filter((e) => riskFor(e) === "anchor")
    .slice(0, 12);
  const openActions = dash.support_actions.filter(
    (a) => a.status === "open" || a.status === "in_progress",
  );
  const milestones = milestonesApproaching(dash.employees);

  return (
    <div style={{ display: "grid", gap: 20 }}>
      <MenuWindow title="At-Risk Watch">
        {atRisk.length === 0 ? (
          <div style={{ color: "var(--ink-1)", fontSize: 12 }}>
            No risk signals in the roster.
          </div>
        ) : (
          <div style={{ display: "grid", gap: 6 }}>
            {atRisk.map(({ emp, signal }) => (
              <SignalRow
                key={emp.id}
                emp={emp}
                tone={signal === "risk" ? "var(--rpg-red)" : "var(--rpg-orange)"}
                tag={signal.toUpperCase()}
                onInspect={() => setInspectId(emp.id)}
              />
            ))}
          </div>
        )}
      </MenuWindow>

      <MenuWindow title="Open Support Actions">
        {openActions.length === 0 ? (
          <div style={{ color: "var(--ink-1)", fontSize: 12 }}>
            No open actions this cycle.
          </div>
        ) : (
          <div style={{ display: "grid", gap: 6 }}>
            {openActions.slice(0, 20).map((a) => {
              const owner =
                a.owner_nickname ??
                a.owner_full_name_en ??
                a.owner_full_name_th ??
                "—";
              return (
                <div
                  key={a.id}
                  style={{
                    display: "grid",
                    gridTemplateColumns: "minmax(92px, 120px) minmax(0, 1fr) auto auto",
                    gap: 10,
                    padding: "8px 10px",
                    background: "var(--ink-4)",
                    border: "1px solid var(--rpg-blue-deep)",
                    fontSize: 12,
                    color: "var(--ink-0)",
                  }}
                >
                  <span
                    className="pixel"
                    style={{
                      color: "var(--rpg-yellow)",
                      fontSize: 9,
                      letterSpacing: "0.1em",
                      textTransform: "uppercase",
                    }}
                  >
                    {a.action_type}
                  </span>
                  <span>{a.title}</span>
                  <span style={{ color: "var(--ink-1)", fontSize: 10 }}>
                    {owner}
                  </span>
                  <span
                    style={{
                      color:
                        a.status === "in_progress"
                          ? "var(--rpg-orange)"
                          : "var(--ink-1)",
                      fontSize: 10,
                      textAlign: "right",
                      textTransform: "uppercase",
                      letterSpacing: "0.08em",
                    }}
                  >
                    {a.status}
                  </span>
                </div>
              );
            })}
          </div>
        )}
      </MenuWindow>

      {/* ── Tenure Milestones ─────────────────────────────────────
          The "Animal Crossing birthday" mechanic. Somebody is always
          approaching a milestone. Recognise them before the moment passes.
          Windows: 60 days → shows up here. 14 days → urgent (orange).
      ── */}
      <MenuWindow title="Tenure Milestones · Next 60 Days">
        {milestones.length === 0 ? (
          <div style={{ color: "var(--ink-1)", fontSize: 12 }}>
            No milestones approaching in the next 60 days.
          </div>
        ) : (
          <div style={{ display: "grid", gap: 6 }}>
            {milestones.map(({ emp, milestone, daysLeft }) => {
              const color = milestoneColor(milestone);
              const urgent = daysLeft <= 14;
              return (
                <div
                  key={emp.id}
                  style={{
                    display: "grid",
                    gridTemplateColumns: "64px minmax(0,1fr) auto auto",
                    alignItems: "center",
                    gap: 10,
                    padding: "8px 10px",
                    background: "var(--ink-4)",
                    border: `1px solid ${urgent ? "var(--rpg-orange)" : "var(--border-subtle)"}`,
                    fontSize: 12,
                    color: "var(--ink-0)",
                  }}
                >
                  <span
                    className="pixel"
                    style={{
                      color,
                      fontSize: 9,
                      letterSpacing: "0.12em",
                      textTransform: "uppercase",
                    }}
                  >
                    {milestone}yr
                  </span>
                  <span>{emp.display_name}</span>
                  <span style={{ color: "var(--ink-1)", fontSize: 10, textTransform: "uppercase", letterSpacing: "0.08em" }}>
                    {emp.dept_code ?? "—"}
                  </span>
                  <span
                    style={{
                      fontFamily: "var(--font-mono)",
                      fontSize: 10,
                      color: urgent ? "var(--rpg-orange)" : "var(--ink-1)",
                      textAlign: "right",
                      minWidth: 50,
                    }}
                  >
                    {daysLeft}d
                  </span>
                </div>
              );
            })}
          </div>
        )}
      </MenuWindow>

      <MenuWindow title="Anchors · Succession Bench">
        {anchors.length === 0 ? (
          <div style={{ color: "var(--ink-1)", fontSize: 12 }}>
            No anchor-class heroes identified yet.
          </div>
        ) : (
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
              gap: 8,
            }}
          >
            {anchors.map((emp) => {
              const a: Archetype = getArchetype(emp);
              return (
                <button
                  key={emp.id}
                  type="button"
                  onClick={() => setInspectId(emp.id)}
                  title={`Open dossier for ${emp.display_name ?? "this anchor"}`}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 10,
                    padding: "8px 10px",
                    background: "var(--ink-4)",
                    border: "1px solid var(--rpg-yellow)",
                    fontSize: 12,
                    color: "var(--ink-0)",
                    textAlign: "left",
                    font: "inherit",
                    cursor: "pointer",
                    transition: "background 90ms ease-out",
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.background = "rgba(243,182,31,0.08)";
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.background = "var(--ink-4)";
                  }}
                >
                  <ClassGlyph archetype={a} size={16} />
                  <div style={{ display: "flex", flexDirection: "column" }}>
                    <span>{emp.display_name}</span>
                    <span
                      style={{
                        color: "var(--ink-1)",
                        fontSize: 9,
                        letterSpacing: "0.08em",
                        textTransform: "uppercase",
                      }}
                    >
                      {ARCHETYPE_LABEL[a]} · {emp.dept_code ?? "—"}
                    </span>
                  </div>
                </button>
              );
            })}
          </div>
        )}
      </MenuWindow>

      {inspected && <InspectModal emp={inspected} onClose={() => setInspectId(null)} />}
    </div>
  );
}

function SignalRow({
  emp,
  tone,
  tag,
  onInspect,
}: {
  emp: Employee;
  tone: string;
  tag: string;
  onInspect?: () => void;
}) {
  const a: Archetype = getArchetype(emp);
  return (
    <button
      type="button"
      onClick={onInspect}
      title={`Open dossier for ${emp.display_name ?? "this hero"}`}
      style={{
        display: "grid",
        gridTemplateColumns: "minmax(56px, 70px) minmax(0, 1fr) auto auto",
        alignItems: "center",
        gap: 10,
        padding: "8px 10px",
        background: "var(--ink-4)",
        border: `1px solid ${tone}`,
        fontSize: 12,
        color: "var(--ink-0)",
        textAlign: "left",
        font: "inherit",
        cursor: onInspect ? "pointer" : "default",
        transition: "background 90ms ease-out",
      }}
      onMouseEnter={(e) => {
        if (onInspect) e.currentTarget.style.background = "rgba(255,255,255,0.04)";
      }}
      onMouseLeave={(e) => {
        if (onInspect) e.currentTarget.style.background = "var(--ink-4)";
      }}
    >
      <span
        className="pixel"
        style={{
          color: tone,
          fontSize: 8,
          letterSpacing: "0.14em",
          textTransform: "uppercase",
        }}
      >
        {tag}
      </span>
      <span>{emp.display_name}</span>
      <span
        style={{
          color: "var(--ink-1)",
          fontSize: 10,
          textTransform: "uppercase",
          letterSpacing: "0.08em",
        }}
      >
        {emp.dept_code ?? "—"}
      </span>
      <span
        style={{
          color: "var(--ink-1)",
          fontSize: 10,
          textAlign: "right",
          textTransform: "uppercase",
          letterSpacing: "0.08em",
        }}
      >
        {ARCHETYPE_LABEL[a]}
      </span>
    </button>
  );
}
