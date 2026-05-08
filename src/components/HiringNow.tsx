"use client";

/**
 * HiringNow — open positions panel for the home screen.
 *
 * Each job is a small banner card with:
 *   • The actual TKC job poster image (from public/jobboard/)
 *   • The role label
 *   • A "need gauge" telling whether we still need this person:
 *       HOT      — 0–2 existing employees match → priority hire
 *       WARM     — 3–5 match → could be useful
 *       COVERED  — 6–15 match → already have depth
 *       DEEP     — 15+ match → reconsider whether to hire more
 *
 * The gauge is computed server-side in /api/hiring by token-matching
 * each role label against employee.title_en and skills.
 */

import { useEffect, useState } from "react";

interface Opening {
  filename: string;
  category: string;
  label: string;
  matched_count: number;
  match_examples: string[];
  gauge: "HOT" | "WARM" | "COVERED" | "DEEP" | "UNKNOWN";
  banner_url: string;
}

interface HiringResponse {
  ok: boolean;
  total_openings: number;
  by_gauge: { HOT: number; WARM: number; COVERED: number; DEEP: number };
  openings: Opening[];
}

const GAUGE_COLOR: Record<Opening["gauge"], string> = {
  HOT: "var(--rpg-red, #d45e4e)",
  WARM: "var(--rpg-orange, #FB923C)",
  COVERED: "var(--rpg-yellow, #f3b61f)",
  DEEP: "var(--flux-up, #86CD7E)",
  UNKNOWN: "var(--ink-1)",
};

const GAUGE_LABEL: Record<Opening["gauge"], string> = {
  HOT: "Priority hire",
  WARM: "Useful",
  COVERED: "Have depth",
  DEEP: "Overstaffed",
  UNKNOWN: "—",
};

export function HiringNow() {
  const [data, setData] = useState<HiringResponse | null>(null);
  const [filter, setFilter] = useState<Opening["gauge"] | "ALL">("HOT");

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const res = await fetch("/api/hiring");
        const d = (await res.json()) as HiringResponse;
        if (!cancelled && d.ok) setData(d);
      } catch {
        // silent — panel just stays empty
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  if (!data) {
    return (
      <div style={{ padding: 14, color: "var(--ink-1)", fontSize: 11 }}>
        Reading job board…
      </div>
    );
  }

  const visible =
    filter === "ALL" ? data.openings : data.openings.filter((o) => o.gauge === filter);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
      {/* Header strip */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 10,
          flexWrap: "wrap",
        }}
      >
        <div style={{ fontSize: 10, color: "var(--ink-1)", letterSpacing: "0.04em" }}>
          {data.total_openings} open positions · gauge based on internal coverage
        </div>
        <div style={{ display: "flex", gap: 4 }}>
          {(["HOT", "WARM", "COVERED", "DEEP", "ALL"] as const).map((g) => {
            const count =
              g === "ALL"
                ? data.total_openings
                : data.by_gauge[g as keyof HiringResponse["by_gauge"]] ?? 0;
            const active = filter === g;
            return (
              <button
                key={g}
                type="button"
                onClick={() => setFilter(g)}
                style={{
                  background: active ? GAUGE_COLOR[g as Opening["gauge"]] ?? "var(--rpg-yellow)" : "transparent",
                  color: active ? "#0c0c0c" : g === "ALL" ? "var(--ink-1)" : GAUGE_COLOR[g as Opening["gauge"]],
                  border: `1px solid ${g === "ALL" ? "var(--ink-1)" : GAUGE_COLOR[g as Opening["gauge"]]}`,
                  padding: "4px 8px",
                  fontSize: 9,
                  fontFamily: "var(--font-mono)",
                  letterSpacing: "0.12em",
                  textTransform: "uppercase",
                  cursor: "pointer",
                  fontWeight: active ? 800 : 600,
                }}
              >
                {g === "ALL" ? "All" : g} · {count}
              </button>
            );
          })}
        </div>
      </div>

      {/* Grid of openings */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fill, minmax(180px, 1fr))",
          gap: 10,
          maxHeight: 360,
          overflowY: "auto",
          paddingRight: 4,
        }}
      >
        {visible.map((o) => (
          <article
            key={o.filename}
            style={{
              border: `1px solid ${GAUGE_COLOR[o.gauge]}`,
              background: "rgba(0,0,0,0.18)",
              display: "flex",
              flexDirection: "column",
              overflow: "hidden",
            }}
            title={
              o.match_examples.length > 0
                ? `Internal matches: ${o.match_examples.join(", ")}`
                : "No internal match — priority hire"
            }
          >
            <div
              style={{
                aspectRatio: "1 / 1",
                background: `#000 url(${o.banner_url}) center / cover no-repeat`,
                position: "relative",
              }}
            >
              {/* Gauge badge */}
              <div
                style={{
                  position: "absolute",
                  top: 6,
                  left: 6,
                  background: GAUGE_COLOR[o.gauge],
                  color: "#0c0c0c",
                  fontSize: 8,
                  letterSpacing: "0.16em",
                  textTransform: "uppercase",
                  padding: "2px 6px",
                  fontWeight: 800,
                  fontFamily: "var(--font-mono)",
                }}
              >
                {o.gauge}
              </div>
            </div>
            <div
              style={{
                padding: "8px 10px",
                display: "flex",
                flexDirection: "column",
                gap: 3,
              }}
            >
              <strong
                style={{
                  fontSize: 11,
                  color: "var(--ink-0)",
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                  whiteSpace: "nowrap",
                }}
              >
                {o.label}
              </strong>
              <span style={{ fontSize: 9, color: GAUGE_COLOR[o.gauge], fontWeight: 600 }}>
                {GAUGE_LABEL[o.gauge]}
                {o.gauge !== "UNKNOWN" && ` · ${o.matched_count} match${o.matched_count === 1 ? "" : "es"}`}
              </span>
            </div>
          </article>
        ))}
        {visible.length === 0 && (
          <div style={{ color: "var(--ink-1)", fontSize: 11 }}>
            No {filter.toLowerCase()} openings.
          </div>
        )}
      </div>
    </div>
  );
}
