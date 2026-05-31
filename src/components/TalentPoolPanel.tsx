"use client";

/**
 * TalentPoolPanel — surfaces the Talent Management Program (Phase 1)
 * snapshot inside the cassette. Bilingual EN + ไทย per workspace rule.
 *
 * Polls `/api/db/talent-assessment` for live data. Renders four blocks:
 *   1. Funnel · active workforce → nominees → talent pool → target
 *   2. 9-Box grid · classic Performance × Potential matrix with each
 *      nominee's name + dept inside their box. Final Cut survivors are
 *      visually distinguished (gold border + bold name).
 *   3. Department roll-up · which depts have how many in the pipeline.
 *   4. Ranking · the Final Cut, ordered by avg_score desc.
 *
 * House style (per docs/HOUSE_STYLE_AUDIT.md):
 *   - border-radius: 0 everywhere
 *   - no gradients, no drop shadows
 *   - colours from the dark-tabletop palette
 *   - mobile-first; everything collapses cleanly at 480px and 768px
 */

import { useEffect, useState } from "react";
import { TalentDrillDownDrawer, type NomineeDetail } from "./TalentDrillDownDrawer";
import { analytics } from "@/lib/firebase/config";
import { logEvent } from "firebase/analytics";

interface BoxNominee {
  employee_id: string;
  employee_code: string | null;
  display_name: string;
  department: string | null;
  position: string | null;
  avg_score: number | null;
  in_talent_pool: boolean;
}

interface BoxBucket {
  id: number;
  label_en: string;
  label_th: string;
  group: "low" | "mid" | "high";
  headcount: number;
  final_cut: number;
  nominees: BoxNominee[];
}

interface DeptRow {
  department: string;
  nominees: number;
  pipeline: number;
  avg_score: number | null;
}

interface RankingRow {
  rank: number;
  employee_id?: string;
  employee_code: string | null;
  display_name: string;
  department: string | null;
  position: string | null;
  job_grade: string | null;
  grade_prev?: string | null;
  grade_curr?: string | null;
  performance_score: number | null;
  potential_score: number | null;
  avg_score: number | null;
  performance_band: number | null;
  potential_band: number | null;
  box_id: number | null;
  box_label: string | null;
  referrence: string | null;
  remark?: string | null;
  in_talent_pool: boolean;
}

interface TalentPayload {
  cycle: string;
  generated_at: string;
  funnel: {
    active_workforce: number;
    nominees: number;
    talent_pool: number;
    target: number;
  };
  boxes: BoxBucket[];
  departments: DeptRow[];
  ranking: RankingRow[];
  emerging?: RankingRow[];
  total_nominees: number;
  total_pool: number;
}

const BOX_GRID_ORDER = [7, 8, 9, 4, 5, 6, 1, 2, 3] as const;

const BOX_ACCENT: Record<number, string> = {
  1: "#7a1f1f",   // risk
  2: "#a85a1f",   // average (low band)
  3: "#a8761f",   // solid
  4: "#a85a1f",   // average (mid band)
  5: "#8a7a3a",   // core
  6: "#6a8a3a",   // high performer
  7: "#3a6a8a",   // potential gem
  8: "#3a8a5a",   // high potential
  9: "#1f8a3a",   // star
};

export function TalentPoolPanel({
  pollMs = 60_000,
  compact = false,
}: {
  pollMs?: number;
  compact?: boolean;
}) {
  const [data, setData] = useState<TalentPayload | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [drillDown, setDrillDown] = useState<NomineeDetail | null>(null);

  const handlePick = (n: NomineeDetail) => {
    setDrillDown(n);
    if (analytics) {
      logEvent(analytics, "select_candidate", {
        candidate_name: n.display_name,
        candidate_dept: n.department || "Unknown",
      });
    }
  };

  // ── Filter state ──────────────────────────────────────────────────
  // Sticky search + dept multi-select + Final Cut toggle. Closes the
  // "with 45+ nominees this becomes a wall" problem we'd hit by Phase 2
  // when nominee count climbs.
  const [search, setSearch] = useState("");
  const [deptFilter, setDeptFilter] = useState<Set<string>>(new Set());
  const [finalCutOnly, setFinalCutOnly] = useState(false);

  // Build a fast lookup so a click on a 9-Box mini-row can find the
  // full ranking row (which carries grades + scores). Falls back to the
  // mini-row data so the drawer always has something to show.
  const lookup = (n: BoxNominee | RankingRow): NomineeDetail => {
    const allRows = [...(data?.ranking ?? []), ...(data?.emerging ?? [])];
    const hit = allRows.find(
      (r) =>
        ("employee_id" in n && n.employee_id ? r.employee_id === n.employee_id : false) ||
        (n.employee_code ? r.employee_code === n.employee_code : false) ||
        r.display_name === n.display_name,
    );
    if (hit) return hit as NomineeDetail;
    return n as NomineeDetail;
  };

  useEffect(() => {
    let cancelled = false;

    async function load() {
      try {
        const r = await fetch("/api/db/talent-assessment", { cache: "no-store" });
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        const json = (await r.json()) as TalentPayload;
        if (!cancelled) {
          setData(json);
          setError(null);
        }
      } catch (e) {
        if (!cancelled) setError(e instanceof Error ? e.message : "load_failed");
      }
    }

    load();
    const t = setInterval(load, pollMs);
    return () => {
      cancelled = true;
      clearInterval(t);
    };
  }, [pollMs]);

  if (error) {
    return (
      <div style={errorStyle}>
        <div style={{ color: "var(--rpg-red, #C44D3F)", fontSize: 11, letterSpacing: "0.1em" }}>
          TALENT API · ERROR
        </div>
        <div style={{ color: "var(--ink-1, #b8a88a)", fontSize: 12, marginTop: 6 }}>{error}</div>
      </div>
    );
  }

  if (!data) {
    return <div style={loadingStyle}>Loading talent snapshot…</div>;
  }

  const { funnel, departments, cycle, generated_at } = data;

  // ── Filter strip state-derived ────────────────────────────────────
  // Filters are local-only (no URL state) — keeps the page reload
  // cheap and the data read-only. If we ever need to share a filtered
  // view, we'll lift this into the URL.
  const allDepts = new Set<string>();
  for (const r of [...data.ranking, ...(data.emerging ?? [])]) {
    if (r.department) allDepts.add(r.department);
  }
  for (const b of data.boxes) {
    for (const n of b.nominees) if (n.department) allDepts.add(n.department);
  }
  const deptOptions = [...allDepts].sort();

  const q = search.trim().toLowerCase();
  const matches = (name: string, dept: string | null, inPool: boolean) => {
    if (finalCutOnly && !inPool) return false;
    if (deptFilter.size > 0 && (!dept || !deptFilter.has(dept))) return false;
    if (q.length === 0) return true;
    return (
      name.toLowerCase().includes(q) ||
      (dept ?? "").toLowerCase().includes(q)
    );
  };

  const boxes = data.boxes.map((b) => {
    const filtered = b.nominees.filter((n) =>
      matches(n.display_name, n.department, n.in_talent_pool),
    );
    return {
      ...b,
      nominees: filtered,
      headcount: filtered.length,
      final_cut: filtered.filter((n) => n.in_talent_pool).length,
    };
  });
  const boxById = new Map(boxes.map((b) => [b.id, b]));

  const ranking = data.ranking
    .filter((r) => matches(r.display_name, r.department, r.in_talent_pool))
    .map((r, i) => ({ ...r, rank: i + 1 }));

  const emerging = (data.emerging ?? [])
    .filter((r) => matches(r.display_name, r.department, r.in_talent_pool))
    .map((r, i) => ({ ...r, rank: i + 1 }));

  const totalNominees =
    data.ranking.length + (data.emerging?.length ?? 0);
  const visibleNominees =
    ranking.length + emerging.length;
  const filterActive = q.length > 0 || deptFilter.size > 0 || finalCutOnly;

  function clearFilters() {
    setSearch("");
    setDeptFilter(new Set());
    setFinalCutOnly(false);
  }

  function toggleDept(d: string) {
    setDeptFilter((prev) => {
      const next = new Set(prev);
      if (next.has(d)) next.delete(d);
      else next.add(d);
      return next;
    });
  }

  return (
    <div style={{ display: "grid", gap: 18 }}>
      {/* ── Filter strip (sticky on scroll) ─────────────────────── */}
      <div className="talent-filter-strip" style={filterStripStyle}>
        <div style={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: 10 }}>
          <span
            style={{
              fontSize: 9,
              letterSpacing: "0.16em",
              textTransform: "uppercase",
              color: "#D4A843",
              fontWeight: 700,
            }}
          >
            Sieve
          </span>
          <input
            type="search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="name or department…"
            aria-label="Filter talent pool by name or department"
            className="talent-filter-input"
            style={filterInputStyle}
          />
          <label
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 6,
              cursor: "pointer",
              fontSize: 11,
              color: finalCutOnly ? "#D4A843" : "#b8a88a",
              userSelect: "none",
            }}
          >
            <input
              type="checkbox"
              checked={finalCutOnly}
              onChange={(e) => setFinalCutOnly(e.target.checked)}
              style={{ accentColor: "#D4A843", cursor: "pointer" }}
            />
            ★ Final Cut only
          </label>
          <span
            style={{
              marginLeft: "auto",
              fontSize: 10,
              color: filterActive ? "#D4A843" : "#8a7a5e",
              letterSpacing: "0.08em",
              fontFamily: "var(--font-mono, monospace)",
            }}
          >
            {filterActive ? "filtered" : "showing"} {visibleNominees} / {totalNominees}
          </span>
          {filterActive && (
            <button
              onClick={clearFilters}
              type="button"
              className="talent-clear-btn"
              style={filterClearStyle}
            >
              clear ×
            </button>
          )}
        </div>
        {deptOptions.length > 0 && (
          <div className="talent-dept-chips" style={{ display: "flex", flexWrap: "wrap", gap: 6, marginTop: 8 }}>
            {deptOptions.map((d) => {
              const active = deptFilter.has(d);
              return (
                <button
                  key={d}
                  onClick={() => toggleDept(d)}
                  type="button"
                  aria-pressed={active}
                  className="talent-dept-chip"
                  style={{
                    ...deptChipStyle,
                    borderColor: active ? "#D4A843" : "rgba(212,168,67,0.22)",
                    color: active ? "#D4A843" : "#b8a88a",
                    background: active ? "rgba(212,168,67,0.08)" : "transparent",
                    fontWeight: active ? 700 : 400,
                  }}
                >
                  {d}
                </button>
              );
            })}
          </div>
        )}
      </div>

      <SectionHeader
        numeral="A"
        label_en="Funnel"
        label_th="กรวยคัดเลือก"
        sub_en={`Cycle ${cycle} · refreshed ${new Date(generated_at).toLocaleTimeString()}`}
        sub_th="(รอบนี้)"
      />

      <div className="talent-funnel-grid" style={funnelGrid}>
        <FunnelTile
          label_en="Active workforce"
          label_th="พนักงาน Active"
          value={funnel.active_workforce}
          unit="คน"
          tone="muted"
        />
        <FunnelTile
          label_en="Nominees (Phase 1)"
          label_th="ผู้ถูกเสนอชื่อ"
          value={funnel.nominees}
          unit="คน"
          tone="info"
        />
        <FunnelTile
          label_en="Talent pool"
          label_th="กลุ่ม Talent Pool"
          value={funnel.talent_pool}
          unit="คน"
          tone="accent"
        />
        <FunnelTile
          label_en="Target (≈7%)"
          label_th="เป้าหมาย"
          value={funnel.target}
          unit="คน"
          tone="neutral"
        />
      </div>

      <SectionHeader
        numeral="B"
        label_en="9-Box · Performance × Potential"
        label_th="กล่อง 9 ช่อง · ผลงาน × ศักยภาพ"
        sub_en="Final Cut = Boxes 6–9 with current-year grade ≥ B"
        sub_th="(ตัดคนเกรด C+/C ปีล่าสุดออก)"
      />

      <div className="talent-9box" style={{ display: "grid", gap: 8 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
          <span style={axisLabel}>↑ Potential / ศักยภาพ</span>
          <span style={{ ...axisLabel, color: "#5a4530" }}>
            cuts: Potential <strong style={{ color: "#8a7a5e" }}>65</strong> · Performance{" "}
            <strong style={{ color: "#8a7a5e" }}>80</strong>
          </span>
        </div>
        <div className="talent-9box-grid" style={gridStyle}>
          {BOX_GRID_ORDER.map((boxId) => {
            const b = boxById.get(boxId);
            if (!b) return <div key={boxId} style={emptyBoxStyle} />;
            return (
              <BoxCell
                key={boxId}
                box={b}
                compact={compact}
                onPick={(n) => handlePick(lookup(n))}
              />
            );
          })}
        </div>
        <div style={axisLabel}>Performance / ผลงาน →</div>
      </div>

      <SectionHeader
        numeral="C"
        label_en="By department"
        label_th="ตามฝ่าย"
        sub_en="Where the pipeline is concentrated"
        sub_th="(สะท้อนสมดุลขององค์กร)"
      />

      <div style={deptTableWrap}>
        <table style={deptTable}>
          <thead>
            <tr>
              <th style={thLeft}>Department</th>
              <th style={thRight}>Nominees</th>
              <th style={thRight}>Pipeline</th>
              <th style={thRight}>Avg score</th>
            </tr>
          </thead>
          <tbody>
            {departments.map((d) => (
              <tr key={d.department}>
                <td style={tdLeft}>{d.department}</td>
                <td style={tdRight}>{d.nominees}</td>
                <td style={{ ...tdRight, color: d.pipeline > 0 ? "#D4A843" : "#8a7a5e" }}>
                  {d.pipeline}
                </td>
                <td style={tdRight}>{d.avg_score != null ? Number(d.avg_score).toFixed(1) : "—"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <SectionHeader
        numeral="D"
        label_en="Final Cut · Talent Pipeline ranking"
        label_th="รายชื่อ Talent Pool · จัดอันดับ"
        sub_en={`${ranking.length} survivors of the Final Cut`}
        sub_th="(เรียงตามคะแนนเฉลี่ย)"
      />

      {ranking.length === 0 && filterActive ? (
        <div style={emptyStateStyle}>
          No Final Cut nominees match the current sieve.
        </div>
      ) : (
        <RankingTable rows={ranking} onPick={(n) => handlePick(lookup(n))} tone="pool" />
      )}

      {emerging.length > 0 && (
        <>
          <SectionHeader
            numeral="E"
            label_en="Emerging Group · the bench"
            label_th="กลุ่ม Emerging · บัลลังก์รอ"
            sub_en={`${emerging.length} from Box 4 + 5 · Improving Trend candidates`}
            sub_th="(กลุ่มที่ปิด Competency Gap แล้วเข้า Pipeline ได้ในรอบหน้า)"
          />
          <RankingTable
            rows={emerging}
            onPick={(n) => handlePick(lookup(n))}
            tone="emerging"
          />
        </>
      )}

      <TalentDrillDownDrawer
        nominee={drillDown}
        onClose={() => setDrillDown(null)}
      />
    </div>
  );
}

function RankingTable({
  rows,
  onPick,
  tone,
}: {
  rows: RankingRow[];
  onPick: (r: RankingRow) => void;
  tone: "pool" | "emerging";
}) {
  const isEmerging = tone === "emerging";
  return (
    <div style={rankingWrap}>
      <table style={rankingTable}>
        <thead>
          <tr>
            <th style={thRankRight}>#</th>
            <th style={thLeft}>Name</th>
            <th style={thLeft}>Department</th>
            <th style={thLeft}>Position</th>
            <th style={thRight}>JG</th>
            <th style={thRight}>Perf</th>
            <th style={thRight}>Pot</th>
            <th style={thRight}>Avg</th>
            <th style={thLeft}>9-Box</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr
              key={`${r.employee_code}-${r.rank}`}
              onClick={() => onPick(r)}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") {
                  e.preventDefault();
                  onPick(r);
                }
              }}
              tabIndex={0}
              role="button"
              aria-label={`Open assessment for ${r.display_name}`}
              style={{ cursor: "pointer" }}
              className="talent-row-clickable"
            >
              <td style={tdRankRight}>{r.rank.toString().padStart(2, "0")}</td>
              <td style={isEmerging ? tdLeft : tdLeftBold}>{r.display_name}</td>
              <td style={tdLeftMuted}>{r.department ?? "—"}</td>
              <td style={tdLeftMuted}>{r.position ?? "—"}</td>
              <td style={tdRight}>{r.job_grade ?? "—"}</td>
              <td style={tdRight}>{r.performance_score != null ? Number(r.performance_score).toFixed(1) : "—"}</td>
              <td style={tdRight}>{r.potential_score != null ? Number(r.potential_score).toFixed(1) : "—"}</td>
              <td
                style={{
                  ...tdRight,
                  color: isEmerging ? "#b8a88a" : "#D4A843",
                  fontWeight: isEmerging ? 500 : 700,
                }}
              >
                {r.avg_score != null ? Number(r.avg_score).toFixed(1) : "—"}
              </td>
              <td style={tdLeftMuted}>
                <span style={{ color: BOX_ACCENT[r.box_id ?? 0] ?? "#8a7a5e" }}>
                  {r.box_label ?? "—"}
                </span>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// ─── Sub-components ───────────────────────────────────────────────────

function SectionHeader({
  numeral,
  label_en,
  label_th,
  sub_en,
  sub_th,
}: {
  numeral: string;
  label_en: string;
  label_th: string;
  sub_en?: string;
  sub_th?: string;
}) {
  return (
    <header style={sectionHeader}>
      <span style={{ color: "#D4A843", fontWeight: 700, marginRight: 6 }}>{numeral}</span>
      <span>{label_en}</span>
      <span style={{ color: "rgba(255,255,255,0.55)", fontSize: 11, fontWeight: 500 }}>
        · {label_th}
      </span>
      {sub_en && (
        <span style={{ marginLeft: "auto", color: "rgba(255,255,255,0.45)", fontSize: 10 }}>
          {sub_en} <span style={{ color: "rgba(255,255,255,0.30)" }}>{sub_th ?? ""}</span>
        </span>
      )}
    </header>
  );
}

function FunnelTile({
  label_en,
  label_th,
  value,
  unit,
  tone,
}: {
  label_en: string;
  label_th: string;
  value: number;
  unit: string;
  tone: "muted" | "info" | "accent" | "neutral";
}) {
  const colour =
    tone === "accent" ? "#D4A843" : tone === "info" ? "#5B89B5" : tone === "neutral" ? "#5B8C4A" : "#b8a88a";
  return (
    <div style={funnelTile}>
      <div style={{ fontSize: 9, letterSpacing: "0.14em", textTransform: "uppercase", color: "#8a7a5e" }}>
        {label_en}
      </div>
      <div style={{ fontSize: 10, color: "#8a7a5e", marginTop: 1 }}>{label_th}</div>
      <div
        style={{
          fontSize: 30,
          fontWeight: 700,
          fontFamily: "var(--font-mono, ui-monospace)",
          color: colour,
          marginTop: 10,
          lineHeight: 1,
        }}
      >
        {value}
      </div>
      <div style={{ fontSize: 9, color: "#8a7a5e", marginTop: 4 }}>{unit}</div>
    </div>
  );
}

function BoxCell({
  box,
  compact,
  onPick,
}: {
  box: BoxBucket;
  compact?: boolean;
  onPick: (n: BoxNominee) => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const accent = BOX_ACCENT[box.id] ?? "#8a7a5e";
  return (
    <div
      onMouseEnter={() => setExpanded(true)}
      onMouseLeave={() => setExpanded(false)}
      style={{
        border: `1px solid ${accent}`,
        background: "rgba(255,255,255,0.02)",
        padding: compact ? "8px 10px" : "10px 12px",
        minHeight: compact ? 90 : 130,
        display: "flex",
        flexDirection: "column",
        gap: 6,
        position: "relative",
      }}
    >
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", gap: 8 }}>
        <span
          style={{
            fontSize: 10,
            letterSpacing: "0.14em",
            textTransform: "uppercase",
            color: accent,
            fontWeight: 700,
          }}
        >
          Box {box.id}
        </span>
        <span style={{ fontSize: 9, color: "#8a7a5e" }}>
          {box.headcount} · {box.final_cut} cut
        </span>
      </div>
      <div style={{ fontSize: 10, color: "#b8a88a" }}>
        {box.label_en}
        <span style={{ color: "#8a7a5e", marginLeft: 4 }}>· {box.label_th}</span>
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 2, marginTop: 2 }}>
        {box.nominees.slice(0, compact ? 4 : 8).map((n) => (
          <button
            key={(n.employee_code ?? "") + n.display_name}
            onClick={() => onPick(n)}
            type="button"
            title={`${n.position ?? ""} · ${n.department ?? ""} · avg ${n.avg_score != null ? Number(n.avg_score).toFixed(1) : "—"} · click to drill down`}
            style={{
              fontSize: 10,
              color: n.in_talent_pool ? "#f5f0e8" : "#8a7a5e",
              fontWeight: n.in_talent_pool ? 600 : 400,
              display: "flex",
              justifyContent: "space-between",
              gap: 6,
              background: "transparent",
              border: 0,
              padding: "2px 0",
              cursor: "pointer",
              fontFamily: "inherit",
              textAlign: "left",
              width: "100%",
            }}
            className="talent-nominee-btn"
          >
            <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
              {n.in_talent_pool ? "★ " : "  "}
              {n.display_name}
            </span>
            <span style={{ fontFamily: "var(--font-mono, monospace)", color: "#8a7a5e", fontSize: 9 }}>
              {n.avg_score != null ? Number(n.avg_score).toFixed(1) : ""}
            </span>
          </button>
        ))}
        {box.nominees.length > (compact ? 4 : 8) && (
          <div style={{ fontSize: 9, color: "#8a7a5e", marginTop: 2 }}>
            + {box.nominees.length - (compact ? 4 : 8)} more (hover to expand)
          </div>
        )}
      </div>

      {expanded && box.nominees.length > (compact ? 4 : 8) && (
        <div
          style={{
            position: "absolute",
            top: -1,
            left: -1,
            right: -1,
            background: "#0c0c0c",
            border: `1px solid ${accent}`,
            padding: compact ? "8px 10px" : "10px 12px",
            zIndex: 10,
            display: "flex",
            flexDirection: "column",
            gap: 6,
            maxHeight: 300,
            boxShadow: "0 8px 32px rgba(0,0,0,0.8)",
          }}
        >
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", gap: 8 }}>
            <span style={{ fontSize: 10, letterSpacing: "0.14em", textTransform: "uppercase", color: accent, fontWeight: 700 }}>
              Box {box.id}
            </span>
            <span style={{ fontSize: 9, color: "#8a7a5e" }}>
              {box.headcount} · {box.final_cut} cut
            </span>
          </div>
          <div style={{ fontSize: 10, color: "#b8a88a" }}>{box.label_en}</div>
          <div
            className="cc-scroll"
            style={{
              display: "flex",
              flexDirection: "column",
              gap: 2,
              marginTop: 2,
              overflowY: "auto",
              paddingRight: 4,
            }}
          >
            {box.nominees.map((n) => (
              <button
                key={(n.employee_code ?? "") + n.display_name}
                onClick={() => onPick(n)}
                type="button"
                style={{
                  fontSize: 10,
                  color: n.in_talent_pool ? "#f5f0e8" : "#8a7a5e",
                  fontWeight: n.in_talent_pool ? 600 : 400,
                  display: "flex",
                  justifyContent: "space-between",
                  gap: 6,
                  background: "transparent",
                  border: 0,
                  padding: "4px 0",
                  cursor: "pointer",
                  fontFamily: "inherit",
                  textAlign: "left",
                  width: "100%",
                  borderBottom: "1px dashed rgba(255,255,255,0.05)",
                }}
                className="talent-nominee-btn"
              >
                <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                  {n.in_talent_pool ? "★ " : "  "}
                  {n.display_name}
                </span>
                <span style={{ fontFamily: "var(--font-mono, monospace)", color: "#8a7a5e", fontSize: 9 }}>
                  {n.avg_score != null ? Number(n.avg_score).toFixed(1) : ""}
                </span>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────

const sectionHeader: React.CSSProperties = {
  display: "flex",
  gap: 8,
  alignItems: "center",
  borderBottom: "1px solid rgba(212,168,67,0.18)",
  paddingBottom: 6,
  color: "#f5f0e8",
  fontSize: 13,
  fontWeight: 600,
  letterSpacing: "0.04em",
};

const funnelGrid: React.CSSProperties = {
  display: "grid",
  gridTemplateColumns: "repeat(4, 1fr)",
  gap: 14,
};

const funnelTile: React.CSSProperties = {
  border: "1px solid rgba(212,168,67,0.22)",
  padding: "14px 16px",
  background: "rgba(255,255,255,0.02)",
};

const gridStyle: React.CSSProperties = {
  display: "grid",
  gridTemplateColumns: "1fr 1fr 1fr",
  gap: 8,
};

const emptyBoxStyle: React.CSSProperties = {
  border: "1px dashed rgba(255,255,255,0.08)",
  minHeight: 100,
};

const axisLabel: React.CSSProperties = {
  fontSize: 10,
  letterSpacing: "0.14em",
  color: "#8a7a5e",
  textTransform: "uppercase",
};

const deptTableWrap: React.CSSProperties = {
  border: "1px solid rgba(212,168,67,0.18)",
};

const deptTable: React.CSSProperties = {
  width: "100%",
  borderCollapse: "collapse",
  fontSize: 11.5,
};

const rankingWrap: React.CSSProperties = {
  border: "1px solid rgba(212,168,67,0.18)",
  overflowX: "auto",
};

const rankingTable: React.CSSProperties = {
  width: "100%",
  borderCollapse: "collapse",
  fontSize: 11.5,
  minWidth: 700,
};

const thLeft: React.CSSProperties = {
  background: "#2a1f12",
  color: "#D4A843",
  padding: "8px 10px",
  textAlign: "left",
  fontSize: 9,
  letterSpacing: "0.12em",
  textTransform: "uppercase",
  fontWeight: 600,
  border: "1px solid rgba(212,168,67,0.18)",
};

const thRight: React.CSSProperties = {
  ...thLeft,
  textAlign: "right",
};

const thRankRight: React.CSSProperties = {
  ...thLeft,
  textAlign: "right",
  width: 48,
};

const tdLeft: React.CSSProperties = {
  padding: "7px 10px",
  color: "#f5f0e8",
  borderBottom: "1px solid rgba(212,168,67,0.10)",
};

const tdLeftBold: React.CSSProperties = {
  ...tdLeft,
  fontWeight: 700,
};

const tdLeftMuted: React.CSSProperties = {
  ...tdLeft,
  color: "#b8a88a",
};

const tdRight: React.CSSProperties = {
  ...tdLeft,
  textAlign: "right",
  fontFamily: "var(--font-mono, ui-monospace)",
  color: "#b8a88a",
};

const tdRankRight: React.CSSProperties = {
  ...tdRight,
  color: "#D4A843",
  fontWeight: 700,
};

const loadingStyle: React.CSSProperties = {
  padding: 24,
  color: "#8a7a5e",
  fontSize: 12,
  letterSpacing: "0.08em",
  textAlign: "center",
};

const errorStyle: React.CSSProperties = {
  padding: 14,
  border: "1px solid rgba(196,77,63,0.4)",
  background: "rgba(196,77,63,0.05)",
};

const filterStripStyle: React.CSSProperties = {
  position: "sticky",
  top: 0,
  zIndex: 5,
  background: "#14100a",
  border: "1px solid rgba(212,168,67,0.18)",
  padding: "10px 12px",
};

const filterInputStyle: React.CSSProperties = {
  background: "rgba(255,255,255,0.04)",
  border: "1px solid rgba(212,168,67,0.22)",
  color: "#f5f0e8",
  padding: "6px 10px",
  fontSize: 12,
  fontFamily: "inherit",
  minWidth: 220,
  flexGrow: 1,
  maxWidth: 360,
};

const filterClearStyle: React.CSSProperties = {
  background: "transparent",
  border: "1px solid rgba(212,168,67,0.4)",
  color: "#D4A843",
  cursor: "pointer",
  fontSize: 10,
  letterSpacing: "0.1em",
  padding: "4px 8px",
  fontFamily: "inherit",
};

const deptChipStyle: React.CSSProperties = {
  border: "1px solid rgba(212,168,67,0.22)",
  padding: "4px 9px",
  fontSize: 10,
  letterSpacing: "0.06em",
  cursor: "pointer",
  fontFamily: "inherit",
  textTransform: "uppercase",
};

const emptyStateStyle: React.CSSProperties = {
  padding: "20px 16px",
  border: "1px dashed rgba(212,168,67,0.22)",
  color: "#8a7a5e",
  fontSize: 12,
  letterSpacing: "0.06em",
  textAlign: "center",
};
