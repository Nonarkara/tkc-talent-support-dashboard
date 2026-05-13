"use client";

/**
 * PortfolioControlTower — the PMO Control Tower.
 *
 * Mirrors the PMO Portfolio Dashboard layout from
 *   docs/From TKC May 2026/ref. from PMO/TKC_PMO Portfolio_Resource_Dashboard_20260427.pdf
 *
 * Renders three sections:
 *   01 EXECUTIVE SUMMARY         — 4 headline tiles
 *   02 OVERALL PROJECT PERF.     — status donut + instalment timeline
 *   (per-project Health cards live in ProjectHealthCard.tsx and may
 *    be rendered separately under the tower on dedicated pages)
 *
 * Data source: GET /api/db/project-health (single fetch, both this
 * tower and the per-project cards read from the same payload).
 *
 * House style enforced:
 *   • zero rounded corners on bars
 *   • zero gradients
 *   • status dots use border-radius:50% only because they are *true*
 *     circles (the workspace rule explicitly allows that case)
 *   • bilingual EN / TH labels per Dr Non's standing instruction
 *
 * Coordinates with Antigravity's original MatrixTab in-line tower:
 * this is the shared version both surfaces now use, so the PMO sees
 * the same numbers everywhere they look.
 */

import { useEffect, useState } from "react";

interface StatusCounts {
  not_start: number;
  on_track: number;
  at_risk: number;
  delayed: number;
  closed: number;
}

interface Portfolio {
  active_projects: number;
  total_projects: number;
  project_value_thb: number;
  project_value_target_thb: number;
  project_value_pct: number;
  billed_thb: number;
  billed_target_thb: number;
  billed_pct: number;
  expensed_thb: number;
  internal_budget_total_thb: number;
  burn_rate_pct: number;
  status_counts: StatusCounts;
  monthly_instalments_thb: number[];
  monthly_instalments_by_status: {
    billed: number[];
    pending: number[];
  };
}

interface PortfolioResponse {
  ok: boolean;
  portfolio?: Portfolio;
  error?: string;
}

const fmtM = (thb: number): string => {
  if (!thb) return "—";
  if (thb >= 1_000_000_000) return `${(thb / 1_000_000_000).toFixed(1)}B`;
  if (thb >= 1_000_000) return `${(thb / 1_000_000).toFixed(0)}M`;
  if (thb >= 1_000) return `${(thb / 1_000).toFixed(0)}k`;
  return `${thb}`;
};

const MONTH_LABELS_EN = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const MONTH_LABELS_TH = ["ม.ค.", "ก.พ.", "มี.ค.", "เม.ย.", "พ.ค.", "มิ.ย.", "ก.ค.", "ส.ค.", "ก.ย.", "ต.ค.", "พ.ย.", "ธ.ค."];

const STATUS_TONES: Record<keyof StatusCounts, { label_en: string; label_th: string; color: string }> = {
  not_start: { label_en: "Not Started", label_th: "ยังไม่เริ่ม", color: "#475569" },
  on_track: { label_en: "On Track", label_th: "ตามแผน", color: "#15803d" },
  at_risk: { label_en: "At Risk", label_th: "เสี่ยง", color: "#ca8a04" },
  delayed: { label_en: "Delayed", label_th: "ล่าช้า", color: "#b91c1c" },
  closed: { label_en: "Closed", label_th: "ปิดแล้ว", color: "#1e293b" },
};

export function PortfolioControlTower({ pollMs = 30_000 }: { pollMs?: number }) {
  const [portfolio, setPortfolio] = useState<Portfolio | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    async function fetchOnce() {
      try {
        const r = await fetch("/api/db/project-health");
        const d = (await r.json()) as PortfolioResponse;
        if (!active) return;
        if (d.ok && d.portfolio) setPortfolio(d.portfolio);
        else setError(d.error ?? "Failed to load portfolio");
      } catch (e) {
        if (active) setError(String(e));
      }
    }
    fetchOnce();
    const id = setInterval(fetchOnce, pollMs);
    return () => {
      active = false;
      clearInterval(id);
    };
  }, [pollMs]);

  if (error) {
    return (
      <div style={{ padding: 24, color: "var(--rpg-red, #b91c1c)" }}>
        Control tower unavailable: {error}
      </div>
    );
  }
  if (!portfolio) {
    return <div style={{ padding: 24, color: "var(--ink-1)" }}>Loading PMO Control Tower…</div>;
  }

  return (
    <div style={{ display: "grid", gap: 24, color: "var(--ink-0)" }} data-testid="pmo-control-tower">
      {/* ── 01 EXECUTIVE SUMMARY ───────────────────────────── */}
      <section>
        <SectionHeader
          numeral="01"
          label_en="Executive Summary"
          label_th="สรุปผู้บริหาร"
        />
        <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 16 }}>
          <SummaryCard
            title_en="Total Projects 2026"
            title_th="โครงการทั้งหมด 2569"
            value={`${portfolio.active_projects}/${portfolio.total_projects}`}
            subtext_en="Active / All Projects in 2026"
            subtext_th="ที่ดำเนินการ / ทั้งหมดในปี 2569"
            accent="#1e293b"
          />
          <SummaryCard
            title_en="Proj. Value vs Target 2026"
            title_th="มูลค่าโครงการ vs เป้าหมาย 2569"
            value={`${portfolio.project_value_pct}%`}
            subtext_en={`Value ${fmtM(portfolio.project_value_thb)} / Target ${fmtM(portfolio.project_value_target_thb)}`}
            subtext_th={`มูลค่า ${fmtM(portfolio.project_value_thb)} / เป้า ${fmtM(portfolio.project_value_target_thb)}`}
            footer_en={`Remaining ${fmtM(portfolio.project_value_target_thb - portfolio.project_value_thb)}`}
            footer_th={`คงเหลือ ${fmtM(portfolio.project_value_target_thb - portfolio.project_value_thb)}`}
            accent="#15803d"
            progress={portfolio.project_value_pct}
          />
          <SummaryCard
            title_en="Billed vs Project Value"
            title_th="ที่เรียกเก็บ vs มูลค่าโครงการ"
            value={`${portfolio.billed_pct}%`}
            subtext_en={`Billed ${fmtM(portfolio.billed_thb)} / Value ${fmtM(portfolio.billed_target_thb)}`}
            subtext_th={`เก็บแล้ว ${fmtM(portfolio.billed_thb)} / มูลค่า ${fmtM(portfolio.billed_target_thb)}`}
            footer_en={`Remaining ${fmtM(portfolio.billed_target_thb - portfolio.billed_thb)}`}
            footer_th={`คงเหลือ ${fmtM(portfolio.billed_target_thb - portfolio.billed_thb)}`}
            accent="#1d4ed8"
            progress={portfolio.billed_pct}
          />
          <SummaryCard
            title_en="Budget Burn Rate"
            title_th="อัตราการใช้งบประมาณ"
            value={`${portfolio.burn_rate_pct}%`}
            subtext_en={`Expensed ${fmtM(portfolio.expensed_thb)} / Budget ${fmtM(portfolio.internal_budget_total_thb)}`}
            subtext_th={`ใช้ไป ${fmtM(portfolio.expensed_thb)} / งบ ${fmtM(portfolio.internal_budget_total_thb)}`}
            footer_en={`Remaining ${fmtM(portfolio.internal_budget_total_thb - portfolio.expensed_thb)}`}
            footer_th={`คงเหลือ ${fmtM(portfolio.internal_budget_total_thb - portfolio.expensed_thb)}`}
            accent={portfolio.burn_rate_pct > 100 ? "#b91c1c" : portfolio.burn_rate_pct > 80 ? "#ca8a04" : "#15803d"}
            progress={Math.min(100, portfolio.burn_rate_pct)}
          />
        </div>
      </section>

      {/* ── 02 OVERALL PROJECT PERFORMANCE ─────────────────── */}
      <section>
        <SectionHeader
          numeral="02"
          label_en="Overall Project Performance"
          label_th="ภาพรวมผลการดำเนินงาน"
        />
        <div style={{ display: "grid", gridTemplateColumns: "minmax(220px, 1fr) 2fr", gap: 16 }}>
          <StatusDistribution counts={portfolio.status_counts} />
          <InstalmentTimeline
            monthly={portfolio.monthly_instalments_thb}
            billed={portfolio.monthly_instalments_by_status.billed}
            pending={portfolio.monthly_instalments_by_status.pending}
          />
        </div>
      </section>

      {/* Footnote bilingual */}
      <div
        style={{
          fontSize: 9,
          color: "var(--ink-1)",
          borderTop: "1px solid var(--ink-2, #475569)",
          paddingTop: 8,
          lineHeight: 1.6,
        }}
      >
        Source — แหล่งข้อมูล: <code>/api/db/project-health</code> · refreshed every {Math.round(pollMs / 1000)}s ·
        annual revenue target — เป้ารายได้ต่อปี ฿4.0B (Base Case, PMO Roadmap May 7 2026)
      </div>
    </div>
  );
}

// ─── SUB-COMPONENTS ──────────────────────────────────────────

function SectionHeader({ numeral, label_en, label_th }: { numeral: string; label_en: string; label_th: string }) {
  return (
    <header
      style={{
        background: "#1e293b",
        padding: "8px 16px",
        fontSize: 12,
        fontWeight: 700,
        letterSpacing: "0.1em",
        textTransform: "uppercase",
        marginBottom: 16,
        borderLeft: "4px solid var(--rpg-blue, #1d4ed8)",
        color: "#fff",
        display: "flex",
        gap: 12,
        alignItems: "baseline",
      }}
    >
      <span style={{ color: "var(--rpg-yellow, #ca8a04)" }}>{numeral}</span>
      <span>{label_en}</span>
      <span style={{ color: "rgba(255,255,255,0.55)", fontSize: 11, fontWeight: 500 }}>· {label_th}</span>
      <div style={{ marginLeft: "auto", display: "flex", alignItems: "center", gap: 6, fontSize: 9, opacity: 0.6 }}>
        <span style={{ 
          width: 6, 
          height: 6, 
          borderRadius: "50%", 
          background: "#10b981", 
          boxShadow: "0 0 4px #10b981",
          animation: "pulse 2s infinite" 
        }} />
        <span>LIVE DATA</span>
      </div>
      <style jsx>{`
        @keyframes pulse {
          0% { opacity: 0.4; transform: scale(0.8); }
          50% { opacity: 1; transform: scale(1.1); }
          100% { opacity: 0.4; transform: scale(0.8); }
        }
      `}</style>
    </header>
  );
}

function SummaryCard({
  title_en,
  title_th,
  value,
  subtext_en,
  subtext_th,
  footer_en,
  footer_th,
  accent,
  progress,
}: {
  title_en: string;
  title_th: string;
  value: string;
  subtext_en: string;
  subtext_th: string;
  footer_en?: string;
  footer_th?: string;
  accent: string;
  progress?: number;
}) {
  return (
    <div
      style={{
        background: "rgba(0,0,0,0.2)",
        border: "1px solid var(--ink-2, #475569)",
        borderTop: `4px solid ${accent}`,
        padding: "16px 12px",
        display: "grid",
        gap: 8,
      }}
    >
      <div style={{ fontSize: 10, fontWeight: 600, color: "var(--ink-1)", textTransform: "uppercase", letterSpacing: "0.04em" }}>
        {title_en}
      </div>
      <div style={{ fontSize: 9, color: "var(--ink-1)", lineHeight: 1.3 }}>{title_th}</div>
      <div
        style={{
          fontSize: 32,
          fontWeight: 800,
          textAlign: "center",
          fontFamily: "var(--font-mono, JetBrains Mono, monospace)",
          color: "var(--ink-0)",
          margin: "4px 0",
        }}
      >
        {value}
      </div>
      <div style={{ fontSize: 9, textAlign: "center", opacity: 0.8, color: "var(--ink-1)" }}>{subtext_en}</div>
      <div style={{ fontSize: 9, textAlign: "center", opacity: 0.7, color: "var(--ink-1)" }}>{subtext_th}</div>
      {progress !== undefined && (
        <div style={{ height: 8, background: "rgba(255,255,255,0.08)", overflow: "hidden", marginTop: 2 }} aria-hidden="true">
          <div style={{ height: "100%", width: `${Math.min(100, Math.max(0, progress))}%`, background: accent, transition: "width 240ms ease" }} />
        </div>
      )}
      {(footer_en || footer_th) && (
        <div style={{ display: "grid", gap: 2, marginTop: 4 }}>
          {footer_en && <div style={{ fontSize: 10, fontWeight: 700, textAlign: "center", color: accent }}>{footer_en}</div>}
          {footer_th && <div style={{ fontSize: 9, textAlign: "center", color: accent, opacity: 0.85 }}>{footer_th}</div>}
        </div>
      )}
    </div>
  );
}

function StatusDistribution({ counts }: { counts: StatusCounts }) {
  const total = Object.values(counts).reduce((s, n) => s + n, 0) || 1;
  const ordered: (keyof StatusCounts)[] = ["not_start", "on_track", "at_risk", "delayed", "closed"];

  return (
    <div style={{ background: "rgba(0,0,0,0.2)", border: "1px solid var(--ink-2, #475569)", padding: 16 }}>
      <h3
        style={{
          fontSize: 10,
          textTransform: "uppercase",
          letterSpacing: "0.08em",
          marginBottom: 16,
          color: "var(--ink-1)",
          fontWeight: 700,
        }}
      >
        Overall by Status · ภาพรวมตามสถานะ
      </h3>
      <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        {ordered.map((k, idx) => {
          const tone = STATUS_TONES[k];
          const v = counts[k];
          const pct = (v / total) * 100;
          return (
            <div key={k} style={{ display: "grid", gridTemplateColumns: "16px 1fr 28px", gap: 8, alignItems: "center" }}>
              <div
                style={{ width: 10, height: 10, borderRadius: "50%", background: tone.color, justifySelf: "center" }}
                aria-hidden="true"
                title={`${tone.label_en} · ${tone.label_th}`}
              />
              <div style={{ display: "grid", gap: 2 }}>
                <div style={{ fontSize: 10, color: "var(--ink-0)" }}>
                  {idx + 1}. {tone.label_en}
                </div>
                <div style={{ fontSize: 9, color: "var(--ink-1)" }}>{tone.label_th}</div>
                <div style={{ height: 4, background: "rgba(255,255,255,0.06)" }} aria-hidden="true">
                  <div style={{ height: "100%", width: `${pct}%`, background: tone.color }} />
                </div>
              </div>
              <strong
                style={{
                  fontSize: 13,
                  textAlign: "right",
                  fontFamily: "var(--font-mono, JetBrains Mono, monospace)",
                  color: "var(--ink-0)",
                }}
              >
                {v}
              </strong>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function InstalmentTimeline({
  monthly,
  billed,
  pending,
}: {
  monthly: number[];
  billed: number[];
  pending: number[];
}) {
  const peak = Math.max(...monthly, 1);

  return (
    <div style={{ background: "rgba(0,0,0,0.2)", border: "1px solid var(--ink-2, #475569)", padding: 16 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 12 }}>
        <h3
          style={{
            fontSize: 10,
            textTransform: "uppercase",
            letterSpacing: "0.08em",
            color: "var(--ink-1)",
            fontWeight: 700,
            margin: 0,
          }}
        >
          Instalment Payments Timeline · ตารางการเรียกเก็บงวด (฿M)
        </h3>
        <div style={{ display: "flex", gap: 10, fontSize: 9, color: "var(--ink-1)" }}>
          <LegendDot color="#15803d" label_en="Billed" label_th="เก็บแล้ว" />
          <LegendDot color="#1d4ed8" label_en="Pending" label_th="รอเก็บ" />
        </div>
      </div>
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(12, 1fr)",
          alignItems: "end",
          height: 160,
          gap: 6,
          borderLeft: "1px solid var(--ink-2, #475569)",
          borderBottom: "1px solid var(--ink-2, #475569)",
          padding: "0 6px 4px 6px",
        }}
      >
        {monthly.map((m, i) => {
          const h = (m / peak) * 100;
          const bH = (billed[i] / peak) * 100;
          const pH = (pending[i] / peak) * 100;
          const label = m >= 1_000_000 ? `${(m / 1_000_000).toFixed(0)}` : m > 0 ? `<1` : "";
          return (
            <div
              key={i}
              style={{ display: "grid", gridTemplateRows: "1fr auto", justifyItems: "center", gap: 4 }}
              title={`${MONTH_LABELS_EN[i]}: ฿${fmtM(m)} (Billed ฿${fmtM(billed[i])}, Pending ฿${fmtM(pending[i])})`}
            >
              <div style={{ width: "70%", height: "100%", display: "flex", flexDirection: "column", justifyContent: "flex-end", gap: 1 }}>
                <div style={{ width: "100%", height: `${pH}%`, background: "#1d4ed8" }} aria-hidden="true" />
                <div style={{ width: "100%", height: `${bH}%`, background: "#15803d" }} aria-hidden="true" />
                {h > 6 && (
                  <div
                    style={{
                      fontSize: 8,
                      color: "var(--ink-0)",
                      textAlign: "center",
                      lineHeight: 1,
                      marginTop: -10,
                      fontFamily: "var(--font-mono, JetBrains Mono, monospace)",
                    }}
                  >
                    {label}
                  </div>
                )}
              </div>
              <div style={{ display: "grid", gap: 1, justifyItems: "center" }}>
                <span style={{ fontSize: 8, color: "var(--ink-1)" }}>{MONTH_LABELS_EN[i]}</span>
                <span style={{ fontSize: 7, color: "var(--ink-1)", opacity: 0.7 }}>{MONTH_LABELS_TH[i]}</span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function LegendDot({ color, label_en, label_th }: { color: string; label_en: string; label_th: string }) {
  return (
    <span style={{ display: "inline-flex", gap: 6, alignItems: "center" }}>
      <span style={{ width: 8, height: 8, borderRadius: "50%", background: color }} aria-hidden="true" />
      <span>{label_en} · {label_th}</span>
    </span>
  );
}
