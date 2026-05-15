"use client";

/**
 * InsightsTab — bonus analytics wing.
 *
 * Eight live charts pulled straight from the May 2026 dossier fields
 * (date_of_birth, education_school, education_faculty, gender,
 * tenure_years, joined_at, certifications, rpg_class, attr_*,
 * resign_date, dept_name_en). Pure SVG, zero deps. The whole tab
 * recomputes from `dash.employees` on every payload — when the import
 * pipeline adds a row, the charts move on the next refresh.
 *
 * Why this lives in its own tab: every other surface (Roster, Lobby,
 * Pulse) reads the data row-wise. This wing reads it column-wise —
 * the patterns the spreadsheet was hiding.
 *
 * Charts:
 *   1. Succession Map      — age × tenure scatter, anchor & retirement zones
 *   2. Cert Decay Calendar — 12-month forward expiry timeline
 *   3. Archetype Mix       — vocation donut over the 320 active heroes
 *   4. Gender Ladder       — % female by job level
 *   5. School Pedigree     — top-10 universities feeding TKC
 *   6. Birthday Clock      — month × dept calendar of DOBs
 *   7. Attribute Curves    — six histograms (STR / INT / WIS / CHA / DEX / CON)
 *   8. Ghost Calendar      — 28 departed employees by resign month
 */

import { useMemo } from "react";
import { MenuWindow } from "@/components/MenuWindow";
import { isAnchor } from "@/lib/company-pulse";
import type { DashboardPayload, Employee } from "../_shared/types";

// ─── Palette (matches the rest of the cockpit chrome) ───────────────────
const C = {
  blue: "#5B89B5",
  gold: "#D4A843",
  green: "#5B8C4A",
  red: "#C44D3F",
  purple: "#8B6FB5",
  cyan: "#4A9BA8",
  ink0: "var(--ink-0)",
  ink1: "var(--ink-1)",
  rule: "rgba(245,240,232,0.18)",
};

// ─── Helpers ────────────────────────────────────────────────────────────
function computeAge(dobIso: string | null | undefined): number | null {
  if (!dobIso) return null;
  const d = new Date(dobIso);
  if (Number.isNaN(d.getTime())) return null;
  const now = new Date();
  let years = now.getFullYear() - d.getFullYear();
  if (
    now.getMonth() < d.getMonth() ||
    (now.getMonth() === d.getMonth() && now.getDate() < d.getDate())
  ) {
    years -= 1;
  }
  return years > 0 && years < 90 ? years : null;
}

function bucketize<T>(rows: T[], key: (r: T) => string | null | undefined) {
  const map = new Map<string, number>();
  for (const r of rows) {
    const k = key(r);
    if (!k) continue;
    map.set(k, (map.get(k) ?? 0) + 1);
  }
  return Array.from(map.entries()).sort((a, b) => b[1] - a[1]);
}

function shortDept(name: string | null | undefined, code: string | null | undefined): string {
  return (name ?? code ?? "—").trim() || "—";
}

const MONTH_TH = ["ม.ค.", "ก.พ.", "มี.ค.", "เม.ย.", "พ.ค.", "มิ.ย.", "ก.ค.", "ส.ค.", "ก.ย.", "ต.ค.", "พ.ย.", "ธ.ค."];
const MONTH_EN = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

// ─── Tab ────────────────────────────────────────────────────────────────
export function InsightsTab({ dash }: { dash: DashboardPayload }) {
  const all = dash.employees ?? [];
  const active = useMemo(() => all.filter((e) => e.is_active !== false), [all]);
  const ghosts = useMemo(() => all.filter((e) => e.is_active === false), [all]);

  return (
    <div
      className="cc-tab-frame anim-card-appear"
      style={{
        gridTemplateRows: "auto 1fr",
        gap: 8,
      }}
    >
      {/* Hero strip — compact for viewport-fit. The intro copy moved into
          a single line so the strip takes ~50px not ~120px, freeing
          height for the 4×2 chart grid below. */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "1fr auto",
          gap: 18,
          alignItems: "center",
          padding: "0 4px 6px",
          borderBottom: "1px dashed " + C.rule,
        }}
      >
        <div style={{ display: "flex", alignItems: "baseline", gap: 14, flexWrap: "wrap" }}>
          <span
            style={{
              fontFamily: "var(--font-pixel, monospace)",
              fontSize: 8,
              letterSpacing: "0.22em",
              color: C.purple,
            }}
          >
            ★ INSIGHTS LAB · BONUS WING ★
          </span>
          <span style={{ fontSize: 11, color: C.ink1 }}>
            Eight read-outs from {all.length} dossier rows. Hover any cell for detail.
          </span>
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          <Stat label="ACTIVE" value={active.length} accent={C.green} />
          <Stat label="GHOSTS" value={ghosts.length} accent={C.red} />
          <Stat label="DEPTS" value={new Set(active.map((e) => e.dept_code).filter(Boolean)).size} accent={C.gold} />
        </div>
      </div>

      {/* Chart grid — 4 columns × 2 rows, fits the cc-tab-frame's 1fr row. */}
      <div
        className="cc-scroll"
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(4, 1fr)",
          gridTemplateRows: "1fr 1fr",
          gap: 8,
          padding: "4px 2px 4px",
          minHeight: 0,
        }}
      >
        <SuccessionMap employees={active} />
        <CertDecayCalendar employees={all} />
        <ArchetypeMix employees={active} />
        <GenderLadder employees={active} />
        <SchoolPedigree employees={active} />
        <BirthdayClock employees={active} />
        <AttributeCurves employees={active} />
        <GhostCalendar ghosts={ghosts} />
      </div>
    </div>
  );
}

// ─── Stat tile ──────────────────────────────────────────────────────────
function Stat({ label, value, accent }: { label: string; value: number; accent: string }) {
  return (
    <div
      style={{
        border: "1px solid " + C.rule,
        borderLeft: `3px solid ${accent}`,
        padding: "8px 14px",
        minWidth: 84,
        background: "rgba(0,0,0,0.18)",
      }}
    >
      <div
        style={{
          fontFamily: "var(--font-pixel, monospace)",
          fontSize: 7,
          letterSpacing: "0.22em",
          color: C.ink1,
          marginBottom: 2,
        }}
      >
        {label}
      </div>
      <div style={{ fontSize: 22, fontWeight: 700, color: accent, fontVariantNumeric: "tabular-nums" }}>
        {value}
      </div>
    </div>
  );
}

// ─── Card frame ─────────────────────────────────────────────────────────
function ChartCard({
  num,
  title,
  caption,
  accent,
  children,
}: {
  num: number;
  title: string;
  caption: string;
  accent: string;
  children: React.ReactNode;
}) {
  return (
    <MenuWindow>
      <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        <div
          style={{
            display: "flex",
            alignItems: "baseline",
            gap: 10,
            paddingBottom: 8,
            borderBottom: "1px solid " + C.rule,
          }}
        >
          <span
            style={{
              fontFamily: "var(--font-pixel, monospace)",
              fontSize: 7,
              letterSpacing: "0.22em",
              color: accent,
            }}
          >
            ◆ 0{num}
          </span>
          <span style={{ fontSize: 14, fontWeight: 700, color: C.ink0, letterSpacing: "0.02em" }}>
            {title}
          </span>
        </div>
        <div style={{ fontSize: 11, lineHeight: 1.55, color: C.ink1 }}>{caption}</div>
        <div style={{ marginTop: 4 }}>{children}</div>
      </div>
    </MenuWindow>
  );
}

// ═══ 1. SUCCESSION MAP — age × tenure scatter ═══════════════════════════
function SuccessionMap({ employees }: { employees: Employee[] }) {
  const points = useMemo(() => {
    return employees
      .map((e) => {
        const age = computeAge(e.date_of_birth);
        const tenure = e.tenure_years ?? 0;
        if (age == null || tenure < 0) return null;
        return {
          age,
          tenure,
          name: e.display_name ?? "—",
          dept: e.dept_code ?? "—",
          // Use the canonical isAnchor predicate so the dot colour and the
          // banner / roster header all agree. Pre-fix the chart counted by
          // age-band which gave 89 while everything else gave 43.
          anchor: isAnchor(e),
        };
      })
      .filter((p): p is { age: number; tenure: number; name: string; dept: string; anchor: boolean } => p != null);
  }, [employees]);

  const W = 420, H = 240, PAD = 28;
  const xMax = 30; // tenure 0–30y
  const yMin = 22, yMax = 65;
  const xScale = (t: number) => PAD + (Math.min(t, xMax) / xMax) * (W - PAD * 2);
  const yScale = (a: number) =>
    H - PAD - ((Math.max(a, yMin) - yMin) / (yMax - yMin)) * (H - PAD * 2);

  // Counts that match the rest of the dashboard.
  const anchorCount = points.filter((p) => p.anchor).length;
  const retireCount = points.filter((p) => p.age >= 55).length;

  return (
    <ChartCard
      num={1}
      title="Succession Map · Age × Tenure"
      caption={`Each dot is one active employee. Gold dots are anchors (≥10y AND CON or CHA ≥14) — institutional memory + relational glue. The red band is the retirement zone (55+) — successors needed. ${anchorCount} anchors and ${retireCount} approaching retirement, today.`}
      accent={C.gold}
    >
      <svg viewBox={`0 0 ${W} ${H}`} style={{ width: "100%", height: "auto", display: "block" }}>
        {/* Retirement zone */}
        <rect x={PAD} y={yScale(65)} width={W - PAD * 2} height={yScale(55) - yScale(65)} fill={C.red} opacity="0.10" />
        {/* Tenure-veteran band (10+ years) — visual context, not the anchor count */}
        <rect x={xScale(10)} y={PAD} width={W - PAD - xScale(10)} height={H - PAD * 2} fill={C.gold} opacity="0.05" />
        {/* Axes */}
        <line x1={PAD} y1={H - PAD} x2={W - PAD} y2={H - PAD} stroke={C.rule} strokeWidth="0.6" />
        <line x1={PAD} y1={PAD} x2={PAD} y2={H - PAD} stroke={C.rule} strokeWidth="0.6" />
        {/* Tenure ticks */}
        {[0, 5, 10, 15, 20, 25, 30].map((t) => (
          <g key={t}>
            <line x1={xScale(t)} y1={H - PAD} x2={xScale(t)} y2={H - PAD + 3} stroke={C.ink1} strokeWidth="0.5" />
            <text x={xScale(t)} y={H - PAD + 12} fontSize="8" fill={C.ink1} textAnchor="middle" fontFamily="var(--font-mono, monospace)">
              {t}y
            </text>
          </g>
        ))}
        {/* Age ticks */}
        {[25, 35, 45, 55, 65].map((a) => (
          <g key={a}>
            <line x1={PAD - 3} y1={yScale(a)} x2={PAD} y2={yScale(a)} stroke={C.ink1} strokeWidth="0.5" />
            <text x={PAD - 6} y={yScale(a) + 3} fontSize="8" fill={C.ink1} textAnchor="end" fontFamily="var(--font-mono, monospace)">
              {a}
            </text>
          </g>
        ))}
        {/* Dots — gold = anchor (canonical), red = retirement zone, blue = everyone else */}
        {points.map((p, i) => {
          const inRetire = p.age >= 55;
          const fill = p.anchor ? C.gold : inRetire ? C.red : C.blue;
          return (
            <circle
              key={`${p.name}-${i}`}
              cx={xScale(p.tenure)}
              cy={yScale(p.age)}
              r={p.anchor ? 2.8 : 2.4}
              fill={fill}
              opacity="0.78"
            >
              <title>{`${p.name} · age ${p.age} · ${p.tenure}y at TKC · ${p.dept}${p.anchor ? " · ⚓ ANCHOR" : ""}`}</title>
            </circle>
          );
        })}
        {/* Axis labels */}
        <text x={W / 2} y={H - 4} fontSize="8" fill={C.ink1} textAnchor="middle" fontFamily="var(--font-mono, monospace)" letterSpacing="1.4">
          TENURE (YEARS) →
        </text>
        <text x={10} y={PAD - 6} fontSize="8" fill={C.ink1} fontFamily="var(--font-mono, monospace)" letterSpacing="1.4">
          AGE ↑
        </text>
      </svg>
    </ChartCard>
  );
}

// ═══ 2. CERT DECAY CALENDAR ═════════════════════════════════════════════
// The certifications array carries free-form strings like
//   "VMS 7.5 (XProtect) · Milestone · 2027-12-12"
// The third pipe segment is the expiry date. We parse it; rows without a
// date land in "no-expiry" (informational, not blocking).
function CertDecayCalendar({ employees }: { employees: Employee[] }) {
  const data = useMemo(() => {
    const now = new Date();
    const buckets: Record<string, { month: string; count: number; total: number; criticals: string[] }> = {};
    for (let m = 0; m < 12; m++) {
      const d = new Date(now.getFullYear(), now.getMonth() + m, 1);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
      buckets[key] = { month: MONTH_EN[d.getMonth()] + " '" + String(d.getFullYear()).slice(2), count: 0, total: 0, criticals: [] };
    }
    let parsed = 0, total = 0;
    for (const e of employees) {
      const certs = e.certifications ?? [];
      for (const cert of certs) {
        total += 1;
        const m = cert.match(/(\d{4})-(\d{2})-(\d{2})/);
        if (!m) continue;
        const [, y, mo] = m;
        const key = `${y}-${mo}`;
        if (buckets[key]) {
          buckets[key].count += 1;
          parsed += 1;
          if (buckets[key].count <= 5) buckets[key].criticals.push(cert.split("·")[0]?.trim() ?? cert);
        }
      }
    }
    return { buckets: Object.values(buckets), parsed, total };
  }, [employees]);

  const W = 420, H = 200, PAD = 28;
  const max = Math.max(1, ...data.buckets.map((b) => b.count));
  const barW = (W - PAD * 2) / data.buckets.length;

  return (
    <ChartCard
      num={2}
      title="Cert Decay Calendar · 12 Months Forward"
      caption={`${data.parsed} of ${data.total} certifications carry an expiry date. Each bar is a month — taller means more certs lapse that month and the renewal pipeline needs attention. Red columns are within the next 90 days.`}
      accent={C.red}
    >
      <svg viewBox={`0 0 ${W} ${H}`} style={{ width: "100%", height: "auto", display: "block" }}>
        <line x1={PAD} y1={H - PAD} x2={W - PAD} y2={H - PAD} stroke={C.rule} strokeWidth="0.6" />
        {data.buckets.map((b, i) => {
          const h = (b.count / max) * (H - PAD * 2);
          const x = PAD + i * barW + 2;
          const fill = i < 3 ? C.red : i < 6 ? C.gold : C.green;
          return (
            <g key={b.month}>
              {b.count > 0 && (
                <rect
                  x={x}
                  y={H - PAD - h}
                  width={barW - 4}
                  height={h}
                  fill={fill}
                  opacity="0.85"
                >
                  <title>
                    {b.month} · {b.count} cert{b.count === 1 ? "" : "s"} expire
                    {b.criticals.length ? "\n— " + b.criticals.join("\n— ") : ""}
                  </title>
                </rect>
              )}
              {b.count > 0 && (
                <text
                  x={x + (barW - 4) / 2}
                  y={H - PAD - h - 4}
                  fontSize="9"
                  fill={C.ink0}
                  textAnchor="middle"
                  fontFamily="var(--font-mono, monospace)"
                  fontWeight="600"
                >
                  {b.count}
                </text>
              )}
              <text
                x={x + (barW - 4) / 2}
                y={H - PAD + 12}
                fontSize="8"
                fill={C.ink1}
                textAnchor="middle"
                fontFamily="var(--font-mono, monospace)"
              >
                {b.month}
              </text>
            </g>
          );
        })}
      </svg>
    </ChartCard>
  );
}

// ═══ 3. ARCHETYPE MIX — donut over rpg_class ════════════════════════════
function ArchetypeMix({ employees }: { employees: Employee[] }) {
  const data = useMemo(() => {
    const order = ["hero", "wizard", "pilgrim", "sage", "merchant", "trader", "soldier", "thief"];
    const tally = bucketize(employees, (e) => (e.rpg_class ?? "hero").toLowerCase());
    return tally.sort((a, b) => {
      const ai = order.indexOf(a[0]);
      const bi = order.indexOf(b[0]);
      return (ai === -1 ? 99 : ai) - (bi === -1 ? 99 : bi);
    });
  }, [employees]);

  const total = data.reduce((s, [, n]) => s + n, 0) || 1;
  const COLORS = [C.gold, C.purple, C.cyan, C.green, C.blue, C.red, "#E07A5F", "#81B29A"];

  let acc = 0;
  const W = 420, H = 220, R = 72, CX = 108, CY = H / 2;

  return (
    <ChartCard
      num={3}
      title="Archetype Mix · The Org as RPG Party"
      caption={`Every employee is mapped to a vocation by their attribute profile. ${data.length} archetypes across ${total} active heroes — the org's combat composition at a glance.`}
      accent={C.purple}
    >
      <svg viewBox={`0 0 ${W} ${H}`} style={{ width: "100%", height: "auto", display: "block" }}>
        {/* Donut */}
        {data.map(([name, n], i) => {
          const start = (acc / total) * Math.PI * 2 - Math.PI / 2;
          const end = ((acc + n) / total) * Math.PI * 2 - Math.PI / 2;
          acc += n;
          const x1 = CX + Math.cos(start) * R;
          const y1 = CY + Math.sin(start) * R;
          const x2 = CX + Math.cos(end) * R;
          const y2 = CY + Math.sin(end) * R;
          const largeArc = end - start > Math.PI ? 1 : 0;
          const ix1 = CX + Math.cos(start) * (R - 24);
          const iy1 = CY + Math.sin(start) * (R - 24);
          const ix2 = CX + Math.cos(end) * (R - 24);
          const iy2 = CY + Math.sin(end) * (R - 24);
          const d = `M ${x1} ${y1} A ${R} ${R} 0 ${largeArc} 1 ${x2} ${y2} L ${ix2} ${iy2} A ${R - 24} ${R - 24} 0 ${largeArc} 0 ${ix1} ${iy1} Z`;
          return <path key={name} d={d} fill={COLORS[i % COLORS.length]} opacity="0.90" />;
        })}
        <text x={CX} y={CY - 6} textAnchor="middle" fontSize="22" fontWeight="700" fill={C.ink0} fontFamily="var(--font-mono, monospace)">
          {total}
        </text>
        <text x={CX} y={CY + 12} textAnchor="middle" fontSize="8" fill={C.ink1} fontFamily="var(--font-pixel, monospace)" letterSpacing="2.2">
          HEROES
        </text>
        {/* Legend */}
        {data.map(([name, n], i) => {
          const y = 30 + i * 22;
          const pct = ((n / total) * 100).toFixed(1);
          return (
            <g key={name}>
              <rect x={210} y={y - 9} width={12} height={12} fill={COLORS[i % COLORS.length]} />
              <text x={228} y={y} fontSize="11" fill={C.ink0} fontFamily="var(--font-mono, monospace)" letterSpacing="0.06em">
                {name.toUpperCase()}
              </text>
              <text x={W - 8} y={y} fontSize="11" fill={C.ink1} textAnchor="end" fontFamily="var(--font-mono, monospace)" style={{ fontVariantNumeric: "tabular-nums" }}>
                {n} · {pct}%
              </text>
            </g>
          );
        })}
      </svg>
    </ChartCard>
  );
}

// ═══ 4. GENDER LADDER — % female by job level ════════════════════════════
function GenderLadder({ employees }: { employees: Employee[] }) {
  const ladder = useMemo(() => {
    const order: Array<{ key: string; label: string }> = [
      { key: "md", label: "Managing Director" },
      { key: "deputy_md", label: "Deputy MD" },
      { key: "director", label: "Director" },
      { key: "manager", label: "Manager" },
      { key: "specialist", label: "Specialist" },
      { key: "staff", label: "Staff" },
    ];
    return order
      .map(({ key, label }) => {
        const rows = employees.filter((e) => (e.role_level ?? "staff").toLowerCase() === key);
        const f = rows.filter((e) => e.gender === "f").length;
        const m = rows.filter((e) => e.gender === "m").length;
        const u = rows.length - f - m;
        return { key, label, total: rows.length, f, m, u };
      })
      .filter((r) => r.total > 0);
  }, [employees]);

  const W = 420, H = 220, PAD = 30;
  const rowH = (H - PAD * 2) / Math.max(1, ladder.length);

  return (
    <ChartCard
      num={4}
      title="Gender Ladder · Female Share by Level"
      caption={`Each row is one role tier; the orange band is the female share. Watch how the proportion changes as the ladder rises — the leak (or absence of one) is the culture in numbers.`}
      accent={C.gold}
    >
      <svg viewBox={`0 0 ${W} ${H}`} style={{ width: "100%", height: "auto", display: "block" }}>
        {ladder.map((r, i) => {
          const y = PAD + i * rowH;
          const fPct = r.total > 0 ? r.f / r.total : 0;
          const mPct = r.total > 0 ? r.m / r.total : 0;
          const xStart = PAD + 110;
          const widthAvail = W - PAD - xStart;
          const fW = fPct * widthAvail;
          const mW = mPct * widthAvail;
          return (
            <g key={r.key}>
              <text x={PAD} y={y + rowH / 2 + 3} fontSize="11" fill={C.ink0} fontFamily="var(--font-mono, monospace)">
                {r.label}
              </text>
              <rect x={xStart} y={y + 4} width={widthAvail} height={rowH - 12} fill="rgba(255,255,255,0.04)" />
              <rect x={xStart} y={y + 4} width={fW} height={rowH - 12} fill={C.gold} opacity="0.85">
                <title>{`${r.label}: ${r.f} female · ${r.m} male · ${r.u} unspecified`}</title>
              </rect>
              <rect x={xStart + fW} y={y + 4} width={mW} height={rowH - 12} fill={C.blue} opacity="0.85" />
              <text x={xStart + widthAvail + 4} y={y + rowH / 2 + 3} fontSize="10" fill={C.ink1} fontFamily="var(--font-mono, monospace)" style={{ fontVariantNumeric: "tabular-nums" }}>
                {(fPct * 100).toFixed(0)}%
              </text>
              <text x={xStart + 4} y={y + rowH / 2 + 3} fontSize="9" fill={C.ink0} fontFamily="var(--font-mono, monospace)" fontWeight="600">
                {r.f}♀
              </text>
              <text x={xStart + fW + 4} y={y + rowH / 2 + 3} fontSize="9" fill="rgba(245,240,232,0.8)" fontFamily="var(--font-mono, monospace)" fontWeight="600">
                {r.m}♂
              </text>
            </g>
          );
        })}
      </svg>
    </ChartCard>
  );
}

// ═══ 5. SCHOOL PEDIGREE — top universities ═══════════════════════════════
function SchoolPedigree({ employees }: { employees: Employee[] }) {
  const top = useMemo(() => bucketize(employees, (e) => e.education_school).slice(0, 10), [employees]);

  const W = 420, H = 240, PAD = 12;
  const rowH = (H - PAD * 2) / Math.max(1, top.length);
  const max = Math.max(1, ...top.map(([, n]) => n));
  const labelW = 180;

  if (top.length === 0) {
    return (
      <ChartCard num={5} title="School Pedigree" caption="No education data on file yet." accent={C.cyan}>
        <div style={{ padding: 20, color: C.ink1, fontSize: 11 }}>
          No `education_school` records on the active dossier. The May 2026 import populates this — wait for the next refresh.
        </div>
      </ChartCard>
    );
  }

  return (
    <ChartCard
      num={5}
      title="School Pedigree · Top Universities Feeding TKC"
      caption={`The ten universities that produced the most current TKC employees. Useful for recruiting partnerships and alumni outreach.`}
      accent={C.cyan}
    >
      <svg viewBox={`0 0 ${W} ${H}`} style={{ width: "100%", height: "auto", display: "block" }}>
        {top.map(([name, n], i) => {
          const y = PAD + i * rowH;
          const barWidth = (n / max) * (W - labelW - PAD - 30);
          return (
            <g key={name}>
              <text x={PAD} y={y + rowH / 2 + 3} fontSize="10" fill={C.ink0} fontFamily="var(--font-mono, monospace)">
                {name.length > 30 ? name.slice(0, 28) + "…" : name}
              </text>
              <rect
                x={labelW}
                y={y + 3}
                width={barWidth}
                height={rowH - 8}
                fill={C.cyan}
                opacity="0.8"
              >
                <title>{`${name}: ${n} alumni`}</title>
              </rect>
              <text
                x={labelW + barWidth + 6}
                y={y + rowH / 2 + 3}
                fontSize="11"
                fill={C.ink0}
                fontFamily="var(--font-mono, monospace)"
                style={{ fontVariantNumeric: "tabular-nums" }}
                fontWeight="600"
              >
                {n}
              </text>
            </g>
          );
        })}
      </svg>
    </ChartCard>
  );
}

// ═══ 6. BIRTHDAY CLOCK — month × dept heatmap ═══════════════════════════
function BirthdayClock({ employees }: { employees: Employee[] }) {
  const data = useMemo(() => {
    const topDepts = bucketize(employees, (e) => e.dept_name_en ?? e.dept_code).slice(0, 6).map(([d]) => d);
    const grid: Record<string, number[]> = {};
    for (const dept of topDepts) grid[dept] = Array(12).fill(0);
    for (const e of employees) {
      const dept = shortDept(e.dept_name_en, e.dept_code);
      if (!grid[dept]) continue;
      if (!e.date_of_birth) continue;
      const d = new Date(e.date_of_birth);
      if (Number.isNaN(d.getTime())) continue;
      grid[dept][d.getMonth()] += 1;
    }
    return { topDepts, grid };
  }, [employees]);

  const W = 420, H = 240, PAD = 24, LEFT = 130;
  const rowH = (H - PAD * 2) / Math.max(1, data.topDepts.length);
  const colW = (W - LEFT - PAD) / 12;
  const max = Math.max(1, ...data.topDepts.flatMap((d) => data.grid[d] ?? [0]));

  return (
    <ChartCard
      num={6}
      title="Birthday Clock · Month × Department"
      caption={`Top 6 departments × 12 months. Darker cells mean more birthdays that month — handy for cake budgets and the "good month / bad month" attendance pattern.`}
      accent={C.green}
    >
      <svg viewBox={`0 0 ${W} ${H}`} style={{ width: "100%", height: "auto", display: "block" }}>
        {/* Month headers */}
        {MONTH_EN.map((m, i) => (
          <text
            key={m}
            x={LEFT + i * colW + colW / 2}
            y={PAD - 6}
            fontSize="8"
            fill={C.ink1}
            textAnchor="middle"
            fontFamily="var(--font-mono, monospace)"
          >
            {m}
          </text>
        ))}
        {/* Cells */}
        {data.topDepts.map((dept, di) => {
          const y = PAD + di * rowH;
          return (
            <g key={dept}>
              <text x={LEFT - 6} y={y + rowH / 2 + 3} fontSize="10" fill={C.ink0} textAnchor="end" fontFamily="var(--font-mono, monospace)">
                {dept.length > 18 ? dept.slice(0, 16) + "…" : dept}
              </text>
              {(data.grid[dept] ?? []).map((cnt, mi) => {
                const intensity = cnt / max;
                return (
                  <g key={mi}>
                    <rect
                      x={LEFT + mi * colW}
                      y={y + 2}
                      width={colW - 2}
                      height={rowH - 4}
                      fill={C.green}
                      opacity={0.08 + intensity * 0.85}
                    >
                      <title>{`${dept} · ${MONTH_EN[mi]}: ${cnt} birthday${cnt === 1 ? "" : "s"}`}</title>
                    </rect>
                    {cnt > 0 && (
                      <text
                        x={LEFT + mi * colW + colW / 2 - 1}
                        y={y + rowH / 2 + 3}
                        fontSize="9"
                        fill={intensity > 0.45 ? "#0c0c14" : C.ink0}
                        textAnchor="middle"
                        fontFamily="var(--font-mono, monospace)"
                        fontWeight="600"
                      >
                        {cnt}
                      </text>
                    )}
                  </g>
                );
              })}
            </g>
          );
        })}
      </svg>
    </ChartCard>
  );
}

// ═══ 7. ATTRIBUTE CURVES — six histograms ════════════════════════════════
function AttributeCurves({ employees }: { employees: Employee[] }) {
  const stats = useMemo(() => {
    const keys: Array<{ key: keyof Employee; label: string; color: string }> = [
      { key: "attr_str", label: "STR", color: C.red },
      { key: "attr_int", label: "INT", color: C.blue },
      { key: "attr_wis", label: "WIS", color: C.purple },
      { key: "attr_cha", label: "CHA", color: C.gold },
      { key: "attr_dex", label: "DEX", color: C.green },
      { key: "attr_con", label: "CON", color: C.cyan },
    ];
    return keys.map(({ key, label, color }) => {
      const buckets = Array(11).fill(0); // 10–20 inclusive
      let sum = 0, count = 0;
      for (const e of employees) {
        const v = (e as unknown as Record<string, number | null | undefined>)[key as string];
        if (typeof v !== "number") continue;
        const b = Math.max(0, Math.min(10, Math.round(v) - 10));
        buckets[b] += 1;
        sum += v;
        count += 1;
      }
      const mean = count > 0 ? sum / count : 0;
      return { label, color, buckets, mean, count };
    });
  }, [employees]);

  const cellW = 140, cellH = 90;
  const W = cellW * 3, H = cellH * 2 + 20;

  return (
    <ChartCard
      num={7}
      title="Attribute Curves · STR · INT · WIS · CHA · DEX · CON"
      caption={`Six histograms across the active roster. Each bar is a stat value (10–20). The teal pin marks the org-wide mean. Tells you the company's "stat profile" at one glance.`}
      accent={C.cyan}
    >
      <svg viewBox={`0 0 ${W} ${H}`} style={{ width: "100%", height: "auto", display: "block" }}>
        {stats.map((s, i) => {
          const col = i % 3, row = Math.floor(i / 3);
          const ox = col * cellW, oy = row * cellH + 8;
          const max = Math.max(1, ...s.buckets);
          const bw = (cellW - 16) / s.buckets.length;
          return (
            <g key={s.label} transform={`translate(${ox}, ${oy})`}>
              <text x="6" y="10" fontSize="9" fill={s.color} fontFamily="var(--font-pixel, monospace)" letterSpacing="2">
                {s.label}
              </text>
              <text x={cellW - 6} y="10" fontSize="9" fill={C.ink1} textAnchor="end" fontFamily="var(--font-mono, monospace)" style={{ fontVariantNumeric: "tabular-nums" }}>
                μ {s.mean.toFixed(1)}
              </text>
              {s.buckets.map((cnt, b) => {
                const h = (cnt / max) * (cellH - 30);
                return (
                  <rect
                    key={b}
                    x={8 + b * bw}
                    y={cellH - 14 - h}
                    width={bw - 1.5}
                    height={h}
                    fill={s.color}
                    opacity="0.78"
                  >
                    <title>{`${s.label} ${10 + b}: ${cnt} hero${cnt === 1 ? "" : "es"}`}</title>
                  </rect>
                );
              })}
              {/* Mean pin */}
              <line
                x1={8 + ((s.mean - 10) / 10) * (cellW - 16)}
                y1={14}
                x2={8 + ((s.mean - 10) / 10) * (cellW - 16)}
                y2={cellH - 14}
                stroke={C.cyan}
                strokeWidth="1"
                strokeDasharray="2 2"
              />
            </g>
          );
        })}
      </svg>
    </ChartCard>
  );
}

// ═══ 8. GHOST CALENDAR — when did people leave ══════════════════════════
function GhostCalendar({ ghosts }: { ghosts: Employee[] }) {
  const months = useMemo(() => {
    const tally: Record<string, { label: string; count: number; names: string[] }> = {};
    for (const e of ghosts) {
      if (!e.resign_date) continue;
      const d = new Date(e.resign_date);
      if (Number.isNaN(d.getTime())) continue;
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
      const label = `${MONTH_EN[d.getMonth()]} ${d.getFullYear()}`;
      if (!tally[key]) tally[key] = { label, count: 0, names: [] };
      tally[key].count += 1;
      if (tally[key].names.length < 8) tally[key].names.push(e.display_name ?? "—");
    }
    return Object.entries(tally)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([, v]) => v);
  }, [ghosts]);

  const W = 420, H = 200, PAD = 28;
  const max = Math.max(1, ...months.map((m) => m.count));
  const barW = months.length > 0 ? (W - PAD * 2) / months.length : 0;

  if (months.length === 0) {
    return (
      <ChartCard
        num={8}
        title="Ghost Calendar · When People Left"
        caption="No resignation dates on file."
        accent={C.red}
      >
        <div style={{ padding: 20, color: C.ink1, fontSize: 11 }}>
          The May 2026 import marked {ghosts.length} ghosts as `presumed_departed` without a precise resignation date. Run the manual-confirm step on Risk Signals to set real dates.
        </div>
      </ChartCard>
    );
  }

  return (
    <ChartCard
      num={8}
      title="Ghost Calendar · 28 Departures by Month"
      caption={`Each bar is a month with at least one resignation on file. Hover for names. Reads like a turnover seasonality map — one month spiking 3× the others is a story worth digging into.`}
      accent={C.red}
    >
      <svg viewBox={`0 0 ${W} ${H}`} style={{ width: "100%", height: "auto", display: "block" }}>
        <line x1={PAD} y1={H - PAD} x2={W - PAD} y2={H - PAD} stroke={C.rule} strokeWidth="0.6" />
        {months.map((m, i) => {
          const h = (m.count / max) * (H - PAD * 2);
          const x = PAD + i * barW + 2;
          return (
            <g key={m.label}>
              <rect x={x} y={H - PAD - h} width={barW - 4} height={h} fill={C.red} opacity="0.78">
                <title>{`${m.label} · ${m.count} departure${m.count === 1 ? "" : "s"}\n— ${m.names.join("\n— ")}`}</title>
              </rect>
              <text
                x={x + (barW - 4) / 2}
                y={H - PAD - h - 4}
                fontSize="9"
                fill={C.ink0}
                textAnchor="middle"
                fontFamily="var(--font-mono, monospace)"
                fontWeight="600"
              >
                {m.count}
              </text>
              <text
                x={x + (barW - 4) / 2}
                y={H - PAD + 12}
                fontSize="8"
                fill={C.ink1}
                textAnchor="middle"
                fontFamily="var(--font-mono, monospace)"
                transform={months.length > 8 ? `rotate(-30 ${x + (barW - 4) / 2} ${H - PAD + 12})` : undefined}
              >
                {m.label}
              </text>
            </g>
          );
        })}
      </svg>
    </ChartCard>
  );
}
