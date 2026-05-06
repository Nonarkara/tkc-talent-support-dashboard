"use client";

/**
 * FourPillarsPanel — the morning ritual tile.
 *
 * Shown on Cockpit. Renders the House score (Compensation × Purpose ×
 * Career × Community) as four horizontal bars plus a composite number.
 * No leaderboard, no peer comparison — this is a snapshot of presence,
 * not a verdict on it.
 *
 * Hover any bar → see the formula notes (Don Norman: the system teaches
 * itself). Click "Why this score?" → the formulas card slides open.
 */

import { useEffect, useState } from "react";
import { MenuWindow } from "@/components/MenuWindow";

interface PillarScore {
  compensation: number;
  purpose: number;
  career: number;
  community: number;
  composite: number;
  active_heroes: number;
  computed_at: string;
}

interface PillarFormula {
  pillar: "compensation" | "purpose" | "career" | "community";
  signals: string[];
  notes: string;
}

interface CoverageStat {
  self_reported: number;
  heuristic_only: number;
  cycle: string;
}

interface FourPillarsResponse {
  ok: boolean;
  house?: PillarScore;
  formulas?: PillarFormula[];
  coverage?: CoverageStat;
  error?: string;
}

const PILLARS: Array<{
  key: "compensation" | "purpose" | "career" | "community";
  label: string;
  question: string;
  accent: string;
}> = [
  { key: "compensation", label: "Compensation", question: "Are people happy with the cost?", accent: "var(--rpg-yellow, #f3c567)" },
  { key: "purpose",      label: "Purpose",      question: "Are people happy with the reason?",  accent: "var(--rpg-orange, #d8811d)" },
  { key: "career",       label: "Career",       question: "Do they see themselves growing?",   accent: "var(--rpg-blue, #3a82bf)" },
  { key: "community",    label: "Community",    question: "Do they feel they belong?",         accent: "var(--flux-up, #5ec28a)" },
];

export function FourPillarsPanel() {
  const [data, setData] = useState<FourPillarsResponse | null>(null);
  const [showFormulas, setShowFormulas] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch("/api/four-pillars");
        const d = (await res.json()) as FourPillarsResponse;
        if (!cancelled) setData(d);
      } catch {
        if (!cancelled) setData({ ok: false, error: "Failed to load" });
      }
    })();
    return () => { cancelled = true; };
  }, []);

  if (!data) {
    return (
      <MenuWindow title="The Four Pillars — House Score">
        <div style={{ color: "var(--ink-1)", fontSize: 11, padding: "12px 0" }}>Computing…</div>
      </MenuWindow>
    );
  }
  if (!data.ok || !data.house) {
    return (
      <MenuWindow title="The Four Pillars — House Score">
        <div style={{ color: "var(--ink-1)", fontSize: 11 }}>{data.error ?? "Score unavailable."}</div>
      </MenuWindow>
    );
  }

  const h = data.house;
  const compositeColor =
    h.composite >= 75 ? "var(--flux-up)" :
    h.composite >= 55 ? "var(--rpg-yellow)" :
    "var(--rpg-orange)";

  return (
    <MenuWindow title="The Four Pillars — House Score">
      <div style={{ display: "flex", gap: 24, alignItems: "flex-start", flexWrap: "wrap" }}>
        {/* Composite */}
        <div style={{ display: "flex", flexDirection: "column", gap: 4, minWidth: 130 }}>
          <span
            style={{
              fontSize: 9,
              letterSpacing: "0.18em",
              textTransform: "uppercase",
              color: "var(--ink-1)",
            }}
          >
            Composite
          </span>
          <strong
            style={{
              fontSize: 56,
              lineHeight: 1,
              fontFamily: "var(--font-mono)",
              color: compositeColor,
              fontWeight: 700,
            }}
          >
            {h.composite}
          </strong>
          <span style={{ fontSize: 9, color: "var(--ink-1)", letterSpacing: "0.06em" }}>
            across {h.active_heroes} heroes
          </span>
          {data.coverage ? (
            <span
              style={{
                fontSize: 9,
                color:
                  data.coverage.self_reported > 0
                    ? "var(--flux-up)"
                    : "var(--ink-1)",
                letterSpacing: "0.06em",
                marginTop: 4,
              }}
              title={`${data.coverage.self_reported} heroes self-reported · ${data.coverage.heuristic_only} on heuristic only`}
            >
              {data.coverage.self_reported} of{" "}
              {data.coverage.self_reported + data.coverage.heuristic_only}{" "}
              self-reported
            </span>
          ) : null}
        </div>

        {/* Bars */}
        <div style={{ flex: 1, minWidth: 280, display: "grid", gap: 10 }}>
          {PILLARS.map((p) => {
            const value = h[p.key];
            return (
              <div key={p.key}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 4 }}>
                  <div>
                    <span
                      style={{
                        fontSize: 11,
                        fontWeight: 700,
                        letterSpacing: "0.06em",
                        textTransform: "uppercase",
                        color: "var(--text-primary)",
                      }}
                    >
                      {p.label}
                    </span>
                    <span style={{ fontSize: 10, color: "var(--ink-1)", fontStyle: "italic", marginLeft: 8 }}>
                      {p.question}
                    </span>
                  </div>
                  <strong
                    style={{
                      fontSize: 13,
                      fontFamily: "var(--font-mono)",
                      color: p.accent,
                    }}
                  >
                    {value}
                  </strong>
                </div>
                <div
                  style={{
                    position: "relative",
                    height: 6,
                    background: "var(--rpg-blue-deep)",
                  }}
                  title={data.formulas?.find((f) => f.pillar === p.key)?.notes}
                >
                  <div
                    style={{
                      position: "absolute",
                      top: 0,
                      left: 0,
                      bottom: 0,
                      width: `${value}%`,
                      background: p.accent,
                    }}
                  />
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Why this score? */}
      <div style={{ marginTop: 16, paddingTop: 12, borderTop: "1px solid rgba(245,240,232,0.08)" }}>
        <button
          type="button"
          onClick={() => setShowFormulas((v) => !v)}
          style={{
            background: "transparent",
            border: 0,
            color: "var(--ink-1)",
            fontSize: 10,
            fontFamily: "var(--font-mono)",
            letterSpacing: "0.12em",
            textTransform: "uppercase",
            cursor: "pointer",
            padding: 0,
          }}
        >
          {showFormulas ? "▾" : "▸"} Why this score?
        </button>
        {showFormulas && data.formulas ? (
          <div style={{ marginTop: 10, display: "grid", gap: 10 }}>
            {data.formulas.map((f) => (
              <div key={f.pillar} style={{ fontSize: 10, color: "var(--ink-1)" }}>
                <strong style={{ color: "var(--text-primary)", textTransform: "uppercase", letterSpacing: "0.08em" }}>
                  {f.pillar}
                </strong>
                <p style={{ margin: "3px 0", lineHeight: 1.5 }}>{f.notes}</p>
                <ul style={{ margin: "3px 0 3px 16px", padding: 0 }}>
                  {f.signals.map((s) => (
                    <li key={s} style={{ fontSize: 9, fontFamily: "var(--font-mono)" }}>{s}</li>
                  ))}
                </ul>
              </div>
            ))}
            <p style={{ fontSize: 9, color: "var(--ink-1)", fontStyle: "italic", marginTop: 8 }}>
              These formulas are heuristic v1 (no self-report yet). v8.5+ adds survey-backed signals
              and per-employee drill-down. The computed score updates on every page load — no cache.
            </p>
          </div>
        ) : null}
      </div>
    </MenuWindow>
  );
}
