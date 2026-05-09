"use client";

/**
 * PulseBanner — the at-a-glance hero panel of the home screen.
 *
 * Shows the company's pulsation in one continuous strip:
 *   • Active heroes + ghosts
 *   • In office today (last 12h check-ins)
 *   • Skill family distribution (color-coded segments)
 *   • Top departments
 *   • Hiring gauge summary
 *
 * Lazy-fetches /api/pulse on mount; refetches every 5 min so the
 * "in office today" number stays close to live.
 */

import { useEffect, useState } from "react";

interface Pulse {
  ok: boolean;
  live: boolean;
  generated_at: string;
  in_office_today: number;
  active_total: number;
  ghost_total: number;
  gender_split: { m: number; f: number; unknown: number };
  by_division: Array<{ code: string; name: string; count: number; color: string }>;
  by_dept: Array<{ code: string; name: string; count: number; division_code: string | null }>;
  by_skill_family: Array<{ family: string; count: number; color: string }>;
  by_archetype: Array<{ key: string; label: string; count: number; color: string }>;
  tenure_brackets: { fresh: number; mid: number; anchor: number };
  anchors_count: number;
  hiring_summary: { hot: number; warm: number; covered: number; deep: number };
}

interface Ticker {
  price: number;
  delta_pct: number;
  ticker: string;
  exchange: string;
  live: boolean;
}

interface Financials {
  revenue_9m_m: number;
  net_profit_9m_m: number;
  eps_thb: number;
  market_cap_b: number;
  pe_ratio: number;
  dividend_thb: number;
  dividend_yield_pct: number;
  as_of: string;
}

export function PulseBanner() {
  const [pulse, setPulse] = useState<Pulse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [ticker, setTicker] = useState<Ticker | null>(null);
  const [financials, setFinancials] = useState<Financials | null>(null);

  useEffect(() => {
    let cancelled = false;
    async function fetchAll() {
      try {
        const [pulseRes, tickerRes, finRes] = await Promise.all([
          fetch("/api/pulse"),
          fetch("/api/tkc/ticker"),
          fetch("/api/tkc/financials"),
        ]);
        const pulseData = (await pulseRes.json()) as Pulse;
        const tickerData = await tickerRes.json();
        const finData = await finRes.json();
        if (cancelled) return;
        if (pulseData.ok) setPulse(pulseData);
        else setError("Pulse offline");
        if (tickerData.ok && typeof tickerData.price === "number") {
          setTicker({
            price: tickerData.price,
            delta_pct: tickerData.delta_pct ?? 0,
            ticker: tickerData.ticker ?? "ORG",
            exchange: tickerData.exchange ?? "DEMO",
            live: Boolean(tickerData.live),
          });
        }
        if (typeof finData.revenue_9m_m === "number") setFinancials(finData);
      } catch (e) {
        if (cancelled) return;
        setError(e instanceof Error ? e.message : "Pulse fetch failed");
      }
    }
    void fetchAll();
    const interval = setInterval(() => void fetchAll(), 5 * 60 * 1000);
    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, []);

  if (error) {
    return (
      <div style={panelStyle}>
        <div style={{ color: "var(--rpg-orange)", fontSize: 11 }}>Pulse: {error}</div>
      </div>
    );
  }

  if (!pulse) {
    return (
      <div style={panelStyle}>
        <div style={{ color: "var(--ink-1)", fontSize: 11 }}>Composing pulse…</div>
      </div>
    );
  }

  const totalSkill = pulse.by_skill_family.reduce((s, x) => s + x.count, 0) || 1;
  const totalArch = pulse.by_archetype.reduce((s, x) => s + x.count, 0) || 1;
  const topDepts = pulse.by_dept.slice(0, 6);
  const maxDept = topDepts[0]?.count ?? 1;
  const pctActive =
    pulse.active_total > 0
      ? Math.round((pulse.in_office_today / pulse.active_total) * 100)
      : 0;

  return (
    <div style={panelStyle}>
      <div
        style={{
          fontSize: 9,
          letterSpacing: "0.18em",
          textTransform: "uppercase",
          color: "var(--rpg-yellow)",
          marginBottom: 14,
        }}
      >
        Pulsation of the company
      </div>

      {/* Row 1 — three big numbers */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(4, 1fr)",
          gap: 14,
          paddingBottom: 14,
          borderBottom: "1px solid rgba(245,240,232,0.08)",
        }}
      >
        <BigStat label="Active" value={pulse.active_total} accent="var(--text-primary)" />
        {/* If nobody has punched in today, the "0" is misleading next to a
            lobby that shows 348 sprites. Treat zero as an empty state — the
            pill becomes "—" with a "no check-ins yet" caption. The Lobby
            sprite floor is decorative; the Pulse banner only counts real
            attendance_log rows. */}
        <BigStat
          label="In office (12h)"
          value={pulse.in_office_today > 0 ? pulse.in_office_today : "—"}
          sub={
            pulse.in_office_today > 0
              ? `${pctActive}% of roster`
              : "No check-ins yet today"
          }
          accent={pulse.in_office_today > 0 ? "var(--flux-up)" : "var(--ink-1)"}
        />
        <BigStat
          label="Anchors"
          value={pulse.anchors_count}
          sub="≥10yr · CON or CHA ≥14"
          accent="var(--rpg-yellow)"
        />
        <BigStat
          label="Ghosts"
          value={pulse.ghost_total}
          sub="Departed · file kept"
          accent="var(--rpg-orange)"
        />
      </div>

      {/* Row 1.5 — Market vibes (TKC stock + key annual numbers) */}
      {(ticker || financials) && (
        <div style={{ marginTop: 14, paddingBottom: 14, borderBottom: "1px solid rgba(245,240,232,0.08)" }}>
          <SectionLabel>Market signal · {financials?.as_of ?? "latest filing"}</SectionLabel>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(110px, 1fr))",
              gap: 10,
              fontSize: 10,
            }}
          >
            {ticker && (
              <MarketCell
                label={`${ticker.ticker}·${ticker.exchange}`}
                value={`฿${ticker.price.toFixed(2)}${ticker.live ? "" : "*"}`}
                sub={`${ticker.delta_pct >= 0 ? "▲ +" : "▼ "}${ticker.delta_pct.toFixed(2)}%`}
                tone={ticker.delta_pct >= 0 ? "var(--flux-up)" : "var(--rpg-red)"}
              />
            )}
            {financials && (
              <>
                <MarketCell label="Revenue" value={`฿${financials.revenue_9m_m.toFixed(0)}M`} sub={financials.as_of} tone="var(--text-primary)" />
                <MarketCell label="Net Profit" value={`฿${financials.net_profit_9m_m.toFixed(0)}M`} tone="var(--text-primary)" />
                <MarketCell label="EPS" value={`฿${financials.eps_thb}`} tone="var(--text-primary)" />
                <MarketCell label="P/E" value={`${financials.pe_ratio}x`} tone="var(--text-primary)" />
                <MarketCell label="Mkt Cap" value={`฿${financials.market_cap_b}B`} tone="var(--text-primary)" />
                <MarketCell label="Div Yield" value={`${financials.dividend_yield_pct}%`} sub={`฿${financials.dividend_thb}/sh`} tone="var(--rpg-yellow)" />
              </>
            )}
          </div>
        </div>
      )}

      {/* Row 2 — Skill family distribution as a stacked bar */}
      <div style={{ marginTop: 14 }}>
        <SectionLabel>Skill distribution · who we have</SectionLabel>
        <div
          style={{
            display: "flex",
            height: 14,
            overflow: "hidden",
            border: "1px solid rgba(245,240,232,0.08)",
            background: "rgba(0,0,0,0.18)",
          }}
        >
          {pulse.by_skill_family.map((fam) => (
            <div
              key={fam.family}
              title={`${fam.family}: ${fam.count}`}
              style={{
                width: `${(fam.count / totalSkill) * 100}%`,
                background: fam.color,
                transition: "width 0.4s ease",
              }}
            />
          ))}
        </div>
        <div
          style={{
            display: "flex",
            gap: 14,
            marginTop: 6,
            flexWrap: "wrap",
            fontSize: 10,
          }}
        >
          {pulse.by_skill_family.map((fam) => (
            <div key={fam.family} style={{ display: "flex", alignItems: "center", gap: 5 }}>
              <span
                style={{ width: 8, height: 8, background: fam.color, display: "inline-block" }}
              />
              <span style={{ color: "var(--ink-1)", letterSpacing: "0.06em" }}>{fam.family}</span>
              <strong style={{ color: fam.color, fontFamily: "var(--font-mono)" }}>
                {fam.count}
              </strong>
            </div>
          ))}
        </div>
      </div>

      {/* Row 3 — Department head-counts as horizontal bars */}
      <div style={{ marginTop: 16 }}>
        <SectionLabel>Department head-count · top {topDepts.length}</SectionLabel>
        <div style={{ display: "grid", gap: 4 }}>
          {topDepts.map((d) => (
            <div
              key={d.code}
              style={{
                display: "grid",
                gridTemplateColumns: "120px 1fr 32px",
                alignItems: "center",
                gap: 8,
                fontSize: 10,
              }}
            >
              <span
                style={{
                  color: "var(--ink-1)",
                  letterSpacing: "0.06em",
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                  whiteSpace: "nowrap",
                }}
              >
                {d.name ?? d.code}
              </span>
              <div
                style={{
                  position: "relative",
                  height: 6,
                  background: "rgba(245,240,232,0.06)",
                }}
              >
                <div
                  style={{
                    position: "absolute",
                    left: 0,
                    top: 0,
                    bottom: 0,
                    width: `${(d.count / maxDept) * 100}%`,
                    background: divisionColor(d.division_code) ?? "var(--rpg-blue)",
                  }}
                />
              </div>
              <strong
                style={{
                  fontFamily: "var(--font-mono)",
                  color: "var(--text-primary)",
                  textAlign: "right",
                }}
              >
                {d.count}
              </strong>
            </div>
          ))}
        </div>
      </div>

      {/* Row 4 — Hiring gauge summary */}
      <div style={{ marginTop: 16 }}>
        <SectionLabel>Hiring gauge · open roles</SectionLabel>
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(4, 1fr)",
            gap: 8,
            fontSize: 10,
          }}
        >
          <GaugeCell
            label="Hot"
            count={pulse.hiring_summary.hot}
            tone="var(--rpg-red, #d45e4e)"
            blurb="few or no matches"
          />
          <GaugeCell
            label="Warm"
            count={pulse.hiring_summary.warm}
            tone="var(--rpg-orange, #FB923C)"
            blurb="2-5 internal"
          />
          <GaugeCell
            label="Covered"
            count={pulse.hiring_summary.covered}
            tone="var(--rpg-yellow, #f3b61f)"
            blurb="6-15 internal"
          />
          <GaugeCell
            label="Deep"
            count={pulse.hiring_summary.deep}
            tone="var(--flux-up, #86CD7E)"
            blurb="overstaffed"
          />
        </div>
      </div>
    </div>
  );
}

function divisionColor(code: string | null | undefined): string | null {
  if (!code) return null;
  const map: Record<string, string> = {
    OPERATIONS: "#FB923C",
    SALES_MKT: "#F87171",
    FINANCE: "#86CD7E",
    EXEC: "#F3C567",
  };
  return map[code] ?? null;
}

function BigStat({
  label,
  value,
  sub,
  accent,
}: {
  label: string;
  value: number | string;
  sub?: string;
  accent: string;
}) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
      <span
        style={{
          fontSize: 8,
          letterSpacing: "0.16em",
          textTransform: "uppercase",
          color: "var(--ink-1)",
        }}
      >
        {label}
      </span>
      <strong
        style={{
          fontSize: 22,
          fontFamily: "var(--font-mono)",
          color: accent,
          lineHeight: 1.1,
        }}
      >
        {value}
      </strong>
      {sub && (
        <span style={{ fontSize: 9, color: "var(--ink-1)", letterSpacing: "0.04em" }}>
          {sub}
        </span>
      )}
    </div>
  );
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <div
      style={{
        fontSize: 8,
        letterSpacing: "0.18em",
        textTransform: "uppercase",
        color: "var(--ink-1)",
        marginBottom: 8,
      }}
    >
      {children}
    </div>
  );
}

function GaugeCell({
  label,
  count,
  tone,
  blurb,
}: {
  label: string;
  count: number;
  tone: string;
  blurb: string;
}) {
  return (
    <div
      style={{
        padding: "8px 10px",
        background: "rgba(0,0,0,0.18)",
        border: `1px solid ${tone}`,
      }}
    >
      <div
        style={{
          fontSize: 8,
          letterSpacing: "0.16em",
          textTransform: "uppercase",
          color: tone,
          fontWeight: 700,
        }}
      >
        {label}
      </div>
      <strong
        style={{
          fontSize: 18,
          fontFamily: "var(--font-mono)",
          color: tone,
          lineHeight: 1.1,
        }}
      >
        {count}
      </strong>
      <div style={{ fontSize: 9, color: "var(--ink-1)", marginTop: 2 }}>{blurb}</div>
    </div>
  );
}

function MarketCell({
  label,
  value,
  sub,
  tone,
}: {
  label: string;
  value: string;
  sub?: string;
  tone: string;
}) {
  return (
    <div
      style={{
        padding: "6px 8px",
        border: "1px solid rgba(245,240,232,0.08)",
        background: "rgba(0,0,0,0.18)",
        display: "flex",
        flexDirection: "column",
        gap: 2,
      }}
    >
      <span
        style={{
          fontSize: 8,
          letterSpacing: "0.16em",
          textTransform: "uppercase",
          color: "var(--ink-1)",
        }}
      >
        {label}
      </span>
      <strong
        style={{
          fontSize: 13,
          fontFamily: "var(--font-mono)",
          color: tone,
          lineHeight: 1.1,
        }}
      >
        {value}
      </strong>
      {sub && <span style={{ fontSize: 9, color: tone, opacity: 0.8 }}>{sub}</span>}
    </div>
  );
}

const panelStyle: React.CSSProperties = {
  padding: "14px 16px",
  background: "var(--ink-4, #0c0c14)",
  border: "1px solid rgba(243,182,31,0.4)",
  borderRadius: 0,
  color: "var(--ink-0)",
};
