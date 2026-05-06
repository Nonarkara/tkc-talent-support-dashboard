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

import { MenuWindow } from "@/components/MenuWindow";
import { ClassGlyph } from "@/components/ClassGlyph";
import {
  ARCHETYPE_LABEL,
  getArchetype,
  type Archetype,
} from "@/lib/token-economy";
import type { DashboardPayload, Employee } from "../_shared/types";

type Signal = "anchor" | "ok" | "watch" | "risk";

const HIGH_RISK_DEPTS = new Set(["PROCURE", "ACCT", "DIGITAL"]);

function riskFor(emp: Employee): Signal {
  const tenure = typeof emp.tenure_years === "number" ? emp.tenure_years : 0;
  const con = typeof emp.attr_con === "number" ? emp.attr_con : 10;
  const cha = typeof emp.attr_cha === "number" ? emp.attr_cha : 10;
  if (tenure >= 10 && (con >= 14 || cha >= 14)) return "anchor";
  if (tenure < 1) return "watch";
  if (HIGH_RISK_DEPTS.has(emp.dept_code ?? "") && con < 9) return "risk";
  return "ok";
}

export function SignalsTab({ dash }: { dash: DashboardPayload }) {
  const atRisk = dash.employees
    .map((e) => ({ emp: e, signal: riskFor(e) }))
    .filter((r) => r.signal === "risk" || r.signal === "watch");
  const anchors = dash.employees
    .filter((e) => riskFor(e) === "anchor")
    .slice(0, 12);
  const openActions = dash.support_actions.filter(
    (a) => a.status === "open" || a.status === "in_progress",
  );

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
                <div
                  key={emp.id}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 10,
                    padding: "8px 10px",
                    background: "var(--ink-4)",
                    border: "1px solid var(--rpg-yellow)",
                    fontSize: 12,
                    color: "var(--ink-0)",
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
                </div>
              );
            })}
          </div>
        )}
      </MenuWindow>
    </div>
  );
}

function SignalRow({
  emp,
  tone,
  tag,
}: {
  emp: Employee;
  tone: string;
  tag: string;
}) {
  const a: Archetype = getArchetype(emp);
  return (
    <div
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
    </div>
  );
}
