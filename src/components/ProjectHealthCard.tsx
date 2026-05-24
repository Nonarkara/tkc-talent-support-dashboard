"use client";

/**
 * ProjectHealthCard — mirrors the PMO Portfolio Dashboard page-5
 * "Project Health" card layout. One card per project. Designed to be
 * recognisable in tomorrow's PMO meeting (see docs/PMO_MEETING_PREP_
 * 20260514.md §5 step 6).
 *
 * Layout, top to bottom:
 *   [Header]   name + PM + Updated Date (warn if >30d) + Status badge + PY
 *   [Row 1]    Overall Progress · Project Timeline · Resource Utilization · Financing
 *   [Row 2]    Issue chart · Risk chart · Instalment table
 *
 * Sections that depend on data we don't yet have (Timesheet actuals)
 * render as a clearly-labelled "DATA PENDING" band so the gap is
 * visible to the PMO, not hidden.
 *
 * No rounded corners. No gradients. No drop shadows. Hairline borders
 * only. Per the TKC house style.
 */

import { useEffect, useState } from "react";

type SeverityBuckets = {
  critical: number;
  high: number;
  medium: number;
  low: number;
  total: number;
};

type Instalment = {
  term_no: number;
  original_due: string;
  revised_due: string | null;
  amount_thb: number;
  billed_status: "billed" | "pending" | "overdue" | "within_60";
};

type HealthCard = {
  id: string;
  code: string;
  name: string;
  client: string;
  status: string;
  project_year: number | null;
  pm_name: string;
  updated_at: string;
  days_since_update: number;

  overall_progress_pct: number;
  start_date: string | null;
  end_date: string | null;
  days_until_deadline: number | null;

  resource_plan_hrs: number;
  resource_actual_hrs: number | null;
  resource_actual_pct: number | null;
  resource_data_pending: boolean;

  project_cost_thb: number;
  billed_thb: number;
  billed_pct: number;
  internal_budget_thb: number;
  expensed_thb: number;
  expensed_pct: number;
  expensed_data_pending: boolean;

  issues: SeverityBuckets;
  risks: SeverityBuckets;
  instalments: Instalment[];
};

const fmtM = (thb: number): string => {
  if (!thb) return "—";
  if (thb >= 1_000_000) return `${(thb / 1_000_000).toFixed(0)}M`;
  if (thb >= 1_000) return `${(thb / 1_000).toFixed(0)}K`;
  return `${thb}`;
};

const fmtDate = (s: string | null): string => {
  if (!s) return "—";
  const d = new Date(s);
  return d.toLocaleDateString("en-GB", { day: "2-digit", month: "2-digit", year: "numeric" });
};

const statusTone = (s: string): { label: string; color: string; bg: string } => {
  const m: Record<string, { label: string; color: string; bg: string }> = {
    planning: { label: "Planning", color: "#86D1FF", bg: "rgba(134,209,255,0.14)" },
    active: { label: "On Track", color: "#86CD7E", bg: "rgba(134,205,126,0.14)" },
    completed: { label: "Closed", color: "#9F7BFF", bg: "rgba(159,123,255,0.14)" },
    on_hold: { label: "Delay", color: "#FB923C", bg: "rgba(251,146,60,0.14)" },
  };
  return m[s] ?? { label: s.toUpperCase(), color: "#aaa", bg: "rgba(170,170,170,0.14)" };
};

const SEVERITY_TONES = {
  critical: "#C44D3F",
  high: "#FB923C",
  medium: "#f3b61f",
  low: "#86D1FF",
} as const;

const BILLED_STATUS_TONES = {
  billed: { label: "✓ Billed", color: "#86CD7E", bg: "rgba(134,205,126,0.14)" },
  within_60: { label: "⚠ Within 60d", color: "#f3b61f", bg: "rgba(243,182,31,0.14)" },
  overdue: { label: "✕ Over 30d", color: "#C44D3F", bg: "rgba(196,77,63,0.18)" },
  pending: { label: "· Pending", color: "#aaaaaa", bg: "rgba(170,170,170,0.14)" },
};

export function ProjectHealthPage() {
  const [cards, setCards] = useState<HealthCard[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    fetch("/api/db/project-health")
      .then((r) => r.json())
      .then((d: { ok: boolean; projects?: HealthCard[]; error?: string }) => {
        if (!active) return;
        if (d.ok && d.projects) setCards(d.projects);
        else setError(d.error ?? "failed");
      })
      .catch((e) => active && setError(String(e)));
    return () => {
      active = false;
    };
  }, []);

  if (error) {
    return (
      <div style={{ padding: 24, color: "var(--rpg-red)" }}>
        Failed to load project health: {error}
      </div>
    );
  }
  if (!cards) {
    return <div style={{ padding: 24, color: "var(--ink-1)" }}>Loading project health…</div>;
  }

  return (
    <div style={{ display: "grid", gap: 18, padding: 4 }}>
      <header style={{ display: "grid", gap: 4 }}>
        <div style={{ color: "var(--rpg-yellow)", fontSize: 10, letterSpacing: "0.14em", textTransform: "uppercase" }}>
          PMO Parity · Project Health
        </div>
        <div style={{ fontSize: 11, color: "var(--ink-1)", lineHeight: 1.5 }}>
          Mirrors the PMO Portfolio Dashboard page-5 layout. Five metric strips per project,
          each fed from the cassette&apos;s source-of-truth tables. Sections labelled
          <span style={{ color: "var(--rpg-yellow)", margin: "0 6px" }}>DATA PENDING</span>
          require a feed the PMO must provide (Timesheet for actuals, ERP for billing). See
          <span style={{ fontFamily: "var(--font-mono)", color: "var(--ink-0)", margin: "0 6px" }}>
            docs/PMO_MEETING_PREP_20260514.md
          </span>
          §3 for the gap list.
        </div>
      </header>

      {cards.map((c) => (
        <Card key={c.id} card={c} />
      ))}
    </div>
  );
}

function Card({ card: c }: { card: HealthCard }) {
  const tone = statusTone(c.status);
  const staleUpdate = c.days_since_update > 30;

  return (
    <article
      style={{
        border: "1px solid var(--ink-2)",
        background: "rgba(0,0,0,0.22)",
        display: "grid",
        gap: 14,
        padding: "14px 16px",
      }}
    >
      {/* ── HEADER ─────────────────────────────────────────────── */}
      <header style={{ display: "grid", gap: 8 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
          <span style={{ fontSize: 16, fontWeight: 700, color: "var(--ink-0)" }}>{c.name}</span>
          <span style={{ fontSize: 10, color: "var(--ink-1)", fontFamily: "var(--font-mono)" }}>{c.code}</span>
          <span style={{ fontSize: 10, color: "var(--ink-1)" }}>· {c.client}</span>
          <span style={{ flex: 1 }} />
          <span
            style={{
              fontSize: 9,
              fontWeight: 800,
              letterSpacing: "0.12em",
              color: tone.color,
              background: tone.bg,
              border: `1px solid ${tone.color}`,
              padding: "3px 8px",
            }}
          >
            {tone.label}
          </span>
          {c.project_year && (
            <span
              style={{
                fontSize: 9,
                color: "var(--ink-1)",
                border: "1px solid var(--ink-2)",
                padding: "3px 6px",
              }}
            >
              PY {c.project_year}
            </span>
          )}
        </div>
        <div style={{ fontSize: 10, color: "var(--ink-1)" }}>
          PM: <span style={{ color: "var(--ink-0)" }}>{c.pm_name}</span>
          {"  ·  "}
          Updated:{" "}
          <span style={{ color: staleUpdate ? "var(--rpg-red)" : "var(--ink-0)" }}>
            {fmtDate(c.updated_at)}
            {staleUpdate && ` (No update ${c.days_since_update}d)`}
          </span>
        </div>
      </header>

      {/* ── ROW 1: Progress · Timeline · Resource · Financing ── */}
      <div
        className="project-health-row1"
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(4, 1fr)",
          gap: 10,
        }}
      >
        {/* Overall Progress */}
        <Section label="Overall Progress">
          <div style={{ fontSize: 28, fontWeight: 700, color: "var(--ink-0)", fontFamily: "var(--font-mono)" }}>
            {c.overall_progress_pct}%
          </div>
          <Bar pct={c.overall_progress_pct} tone={c.overall_progress_pct >= 70 ? "good" : c.overall_progress_pct >= 30 ? "watch" : "bad"} />
        </Section>

        {/* Project Timeline */}
        <Section label="Project Timeline">
          <div style={{ fontSize: 9, color: "var(--ink-1)" }}>{fmtDate(c.start_date)}</div>
          <Timeline start={c.start_date} end={c.end_date} />
          <div style={{ fontSize: 9, color: "var(--ink-1)", textAlign: "right" }}>{fmtDate(c.end_date)}</div>
          {c.days_until_deadline !== null && (
            <div style={{ fontSize: 9, color: "var(--ink-1)" }}>
              {c.days_until_deadline >= 0
                ? `${c.days_until_deadline} days to deadline`
                : `${Math.abs(c.days_until_deadline)} days overdue`}
            </div>
          )}
        </Section>

        {/* Resource Utilization */}
        <Section label="Resource Utilization">
          <div className="resource-flex" style={{ display: "flex", gap: 12, alignItems: "baseline" }}>
            <div>
              <div style={{ fontSize: 9, color: "var(--ink-1)" }}>Plan</div>
              <div style={{ fontSize: 18, fontWeight: 700, color: "var(--ink-0)", fontFamily: "var(--font-mono)" }}>
                {c.resource_plan_hrs}
              </div>
            </div>
            <div>
              <div style={{ fontSize: 9, color: "var(--ink-1)" }}>
                Actual {c.resource_actual_pct !== null ? `(${c.resource_actual_pct}%)` : ""}
              </div>
              <div style={{ fontSize: 18, fontWeight: 700, color: "var(--ink-0)", fontFamily: "var(--font-mono)" }}>
                {c.resource_actual_hrs ?? "—"}
              </div>
            </div>
          </div>
          {c.resource_data_pending && <DataPendingBand source="Timesheet" />}
        </Section>

        {/* Financing (Exc. VAT) */}
        <Section label="Financing (Exc. VAT)">
          <div className="financing-grid" style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: 8, fontFamily: "var(--font-mono)" }}>
            <div>
              <div style={{ fontSize: 9, color: "var(--ink-1)" }}>Project Cost</div>
              <div style={{ fontSize: 15, fontWeight: 700, color: "var(--ink-0)" }}>{fmtM(c.project_cost_thb)}</div>
            </div>
            <div>
              <div style={{ fontSize: 9, color: "var(--ink-1)" }}>Billed ({c.billed_pct}%)</div>
              <div style={{ fontSize: 15, fontWeight: 700, color: "var(--ink-0)" }}>{fmtM(c.billed_thb)}</div>
              <Bar pct={c.billed_pct} tone={c.billed_pct >= 70 ? "good" : c.billed_pct >= 30 ? "watch" : "bad"} />
            </div>
            <div>
              <div style={{ fontSize: 9, color: "var(--ink-1)" }}>Budget</div>
              <div style={{ fontSize: 15, fontWeight: 700, color: "var(--ink-0)" }}>{fmtM(c.internal_budget_thb)}</div>
            </div>
            <div>
              <div style={{ fontSize: 9, color: "var(--ink-1)" }}>Expensed ({c.expensed_pct}%)</div>
              <div style={{ fontSize: 15, fontWeight: 700, color: "var(--ink-0)" }}>
                {c.expensed_data_pending ? "—" : fmtM(c.expensed_thb)}
              </div>
              {!c.expensed_data_pending && (
                <Bar pct={c.expensed_pct} tone={c.expensed_pct < 80 ? "good" : c.expensed_pct < 100 ? "watch" : "bad"} />
              )}
            </div>
          </div>
          {c.expensed_data_pending && <DataPendingBand source="ERP — actuals" />}
        </Section>
      </div>

      {/* ── ROW 2: Issues · Risks · Instalments ────────────────── */}
      <div className="project-health-row2" style={{ display: "grid", gridTemplateColumns: "1fr 1fr 2fr", gap: 10 }}>
        <Section label={`Issue (${c.issues.total} open)`}>
          <SeverityBars buckets={c.issues} />
        </Section>
        <Section label={`Risk (${c.risks.total} open)`}>
          <SeverityBars buckets={c.risks} />
        </Section>
        <Section label="Instalment Plan">
          <div className="instalment-scroll">
            <InstalmentTable rows={c.instalments} />
          </div>
        </Section>
      </div>
    </article>
  );
}

function Section({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div
      style={{
        border: "1px solid var(--ink-2)",
        background: "rgba(0,0,0,0.16)",
        padding: "8px 10px",
        display: "grid",
        gap: 6,
      }}
    >
      <div style={{ fontSize: 9, letterSpacing: "0.10em", textTransform: "uppercase", color: "var(--ink-1)" }}>
        {label}
      </div>
      {children}
    </div>
  );
}

function Bar({ pct, tone }: { pct: number; tone: "good" | "watch" | "bad" }) {
  const colour = tone === "good" ? "var(--flux-up)" : tone === "watch" ? "var(--rpg-yellow)" : "var(--rpg-red)";
  return (
    <div style={{ height: 4, background: "rgba(255,255,255,0.06)", marginTop: 4 }} aria-hidden="true">
      <div style={{ height: "100%", width: `${Math.min(100, Math.max(0, pct))}%`, background: colour, transition: "width 240ms ease" }} />
    </div>
  );
}

function Timeline({ start, end }: { start: string | null; end: string | null }) {
  if (!start || !end) {
    return <div style={{ height: 12, background: "rgba(255,255,255,0.06)" }} aria-hidden="true" />;
  }
  const startMs = new Date(start).getTime();
  const endMs = new Date(end).getTime();
  // eslint-disable-next-line react-hooks/purity -- Timeline progress is a display-only wall-clock read.
  const now = Date.now();
  const total = endMs - startMs;
  let pct = 0;
  if (total > 0) pct = Math.min(100, Math.max(0, ((now - startMs) / total) * 100));
  return (
    <div
      style={{
        height: 12,
        position: "relative",
        background: "rgba(255,255,255,0.06)",
        border: "1px solid var(--ink-2)",
      }}
      aria-label={`Project timeline; ${Math.round(pct)}% elapsed`}
    >
      <div
        style={{
          position: "absolute",
          inset: 0,
          width: `${pct}%`,
          background: "var(--rpg-blue, #5B89B5)",
          opacity: 0.55,
        }}
      />
      <div
        title={`Today: ${new Date().toLocaleDateString()}`}
        style={{
          position: "absolute",
          top: -2,
          bottom: -2,
          left: `${pct}%`,
          width: 2,
          background: "var(--rpg-red)",
        }}
      />
    </div>
  );
}

function SeverityBars({ buckets }: { buckets: SeverityBuckets }) {
  const max = Math.max(1, buckets.critical, buckets.high, buckets.medium, buckets.low);
  return (
    <div style={{ display: "grid", gap: 4 }}>
      {(["critical", "high", "medium", "low"] as const).map((sev) => {
        const v = buckets[sev];
        const w = (v / max) * 100;
        return (
          <div key={sev} style={{ display: "grid", gridTemplateColumns: "60px 1fr 16px", gap: 6, alignItems: "center" }}>
            <span
              style={{
                fontSize: 9,
                color: SEVERITY_TONES[sev],
                fontWeight: 700,
                textTransform: "uppercase",
                letterSpacing: "0.08em",
              }}
            >
              {sev}
            </span>
            <div style={{ height: 8, background: "rgba(255,255,255,0.06)" }} aria-hidden="true">
              <div style={{ height: "100%", width: `${w}%`, background: SEVERITY_TONES[sev] }} />
            </div>
            <span style={{ fontSize: 10, color: "var(--ink-0)", fontFamily: "var(--font-mono)", textAlign: "right" }}>
              {v}
            </span>
          </div>
        );
      })}
    </div>
  );
}

function InstalmentTable({ rows }: { rows: Instalment[] }) {
  if (rows.length === 0) {
    return <DataPendingBand source="ERP — instalment plan" />;
  }
  return (
    <table
      className="instalment-table"
      style={{
        width: "100%",
        borderCollapse: "collapse",
        fontSize: 10,
        fontFamily: "var(--font-mono)",
        color: "var(--ink-0)",
      }}
    >
      <thead>
        <tr style={{ color: "var(--ink-1)", borderBottom: "1px solid var(--ink-2)" }}>
          <th style={th}>Term</th>
          <th style={th}>Original Due</th>
          <th style={th}>Revised</th>
          <th style={{ ...th, textAlign: "right" }}>Amount (฿)</th>
          <th style={th}>Status</th>
        </tr>
      </thead>
      <tbody>
        {rows.map((r) => {
          const t = BILLED_STATUS_TONES[r.billed_status];
          return (
            <tr key={r.term_no} style={{ borderBottom: "1px solid rgba(255,255,255,0.04)" }}>
              <td style={td}>{r.term_no}</td>
              <td style={td}>{fmtDate(r.original_due)}</td>
              <td style={td}>{r.revised_due ? fmtDate(r.revised_due) : "—"}</td>
              <td style={{ ...td, textAlign: "right" }}>{Number(r.amount_thb).toLocaleString()}</td>
              <td style={td}>
                <span style={{ color: t.color, background: t.bg, padding: "1px 6px", fontSize: 9, fontWeight: 700 }}>
                  {t.label}
                </span>
              </td>
            </tr>
          );
        })}
      </tbody>
    </table>
  );
}

const th: React.CSSProperties = { textAlign: "left", padding: "4px 6px", fontWeight: 600, fontSize: 9, textTransform: "uppercase", letterSpacing: "0.06em" };
const td: React.CSSProperties = { padding: "4px 6px", verticalAlign: "middle" };

function DataPendingBand({ source }: { source: string }) {
  return (
    <div
      style={{
        marginTop: 6,
        padding: "6px 8px",
        border: "1px dashed var(--rpg-yellow)",
        background: "rgba(243,182,31,0.06)",
        fontSize: 9,
        color: "var(--rpg-yellow)",
        letterSpacing: "0.10em",
        textTransform: "uppercase",
      }}
      aria-live="polite"
    >
      DATA PENDING · waiting on {source} feed
    </div>
  );
}
