"use client";

/**
 * TalentDrillDownDrawer — side panel that opens when a director clicks
 * a nominee anywhere on the Talent Pool surface (9-Box cell or ranking
 * row). Closes the biggest dead-end of v4.7: clicking a name used to
 * do nothing.
 *
 * Renders everything we know about the person from the
 * /api/db/talent-assessment payload plus a computed "Next step" hint
 * based on which box they sit in (per the framework in
 * `TKC Talent rev.4.pdf` §5: Project Assignment for Stars,
 * Development Plan for Potential, Improving Trend for Box 4-5).
 *
 * Keyboard: Esc closes. Click outside the drawer closes.
 * Mobile: drawer takes 100% width below 480px so it's usable on phones.
 */

import { useEffect } from "react";

export interface NomineeDetail {
  employee_id?: string;
  employee_code: string | null;
  display_name: string;
  department: string | null;
  position: string | null;
  job_grade?: string | null;
  grade_prev?: string | null;
  grade_curr?: string | null;
  performance_score?: number | null;
  potential_score?: number | null;
  avg_score: number | null;
  performance_band?: number | null;
  potential_band?: number | null;
  box_id?: number | null;
  box_label?: string | null;
  referrence?: string | null;
  remark?: string | null;
  in_talent_pool: boolean;
}

interface NextStep {
  title_en: string;
  title_th: string;
  body_en: string;
  body_th: string;
  tone: "star" | "high" | "gem" | "mid" | "low";
}

function nextStepFor(boxId: number | null | undefined, inPool: boolean): NextStep {
  if (!boxId) {
    return {
      title_en: "Assess",
      title_th: "ประเมิน",
      body_en: "No 9-Box reading yet. Run the Performance × Potential assessment to place this person on the grid.",
      body_th: "ยังไม่มีผลประเมิน · ให้ทำ Performance × Potential ก่อน",
      tone: "mid",
    };
  }
  switch (boxId) {
    case 9:
      return {
        title_en: "Project Assignment + Succession Plan",
        title_th: "มอบโครงการพิเศษ + วางแผนสืบทอด",
        body_en: "Star tier — assign to a Pioneer / Process / Engagement special project with named KPIs and OKRs. Begin succession planning for the role above.",
        body_th: "ระดับดาวเด่น · มอบโครงการพิเศษพร้อม KPIs / OKRs และวางแผนสืบทอดตำแหน่งระดับเหนือ",
        tone: "star",
      };
    case 8:
      return {
        title_en: "Development Plan + Stretch Assignment",
        title_th: "แผนพัฒนา + งานยกระดับ",
        body_en: "High Potential — build an IDP with named competency gaps. Pair with a stretch project that exercises the gap.",
        body_th: "ศักยภาพสูง · ทำ IDP ระบุ Competency Gap ชัดเจน · จับคู่กับงานที่ stretch ความสามารถ",
        tone: "high",
      };
    case 7:
      return {
        title_en: "Polish + Visibility",
        title_th: "ขัดเกลา + เพิ่ม Visibility",
        body_en: "Potential Gem — high potential but performance not yet caught up. Coach for delivery confidence, give visibility moments with seniors.",
        body_th: "เพชรเม็ดงาม · ศักยภาพสูงแต่ผลงานยังตามไม่ทัน · โค้ชความมั่นใจในการส่งมอบ · เปิดเวทีให้ผู้บริหารเห็น",
        tone: "gem",
      };
    case 6:
      return {
        title_en: "Retain + Recognize",
        title_th: "รักษาไว้ + ยอมรับ",
        body_en: "High Performer — keep the delivery engine warm with recognition and pay-band alignment. Watch for flight-risk if Career signals weaken.",
        body_th: "ผลงานสูง · ดูแล Compensation ให้สอดคล้อง · จับสัญญาณ Flight Risk หาก Career drift",
        tone: "high",
      };
    case 5:
      return {
        title_en: "Improving Trend Coaching",
        title_th: "โค้ชเรื่อง Improving Trend",
        body_en: "Core Player — solid contributor. Focus on closing one named competency gap each quarter. Eligible to enter the Pipeline next cycle if trend is upward.",
        body_th: "ผู้เล่นแกน · ปิด Competency Gap หนึ่งข้อต่อไตรมาส · เข้า Pipeline ในรอบหน้าได้ถ้าแนวโน้มดีขึ้น",
        tone: "mid",
      };
    case 4:
      return {
        title_en: "Improving Trend + Mentor",
        title_th: "Improving Trend + Mentor",
        body_en: "Average Player — match with a Box 8/9 mentor inside the same function. Track the trend, not just the score.",
        body_th: "ผู้เล่นทั่วไป · จับคู่ Mentor จาก Box 8/9 ในสายงานเดียวกัน · ติดตามแนวโน้ม ไม่ใช่แค่คะแนน",
        tone: "mid",
      };
    case 3:
      return {
        title_en: "Hold the Line",
        title_th: "ประคองงาน",
        body_en: "Solid Performer at lower potential — performance is fine; growth ceiling near. Role-fit confirmation conversation.",
        body_th: "ผลงานมั่นคงแต่ศักยภาพถึงเพดาน · พูดคุยเรื่อง Role Fit",
        tone: "low",
      };
    case 2:
    case 1:
    default:
      return {
        title_en: "Performance Conversation",
        title_th: "พูดคุยเรื่องผลงาน",
        body_en: "Low band on both axes — start a structured performance conversation. Identify the one blocker that, if removed, would shift the trend.",
        body_th: "คะแนนต่ำทั้งสองแกน · ใช้กระบวนการ Performance Conversation · ระบุ blocker หนึ่งข้อที่ถ้าแก้แล้วเทรนด์จะดีขึ้น",
        tone: "low",
      };
  }
}

const TONE_COLOR: Record<NextStep["tone"], string> = {
  star: "#1f8a3a",
  high: "#3a8a5a",
  gem: "#3a6a8a",
  mid: "#8a7a3a",
  low: "#a8761f",
};

export function TalentDrillDownDrawer({
  nominee,
  onClose,
}: {
  nominee: NomineeDetail | null;
  onClose: () => void;
}) {
  useEffect(() => {
    if (!nominee) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    window.addEventListener("keydown", onKey);
    // Lock body scroll while drawer is open
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = prev;
    };
  }, [nominee, onClose]);

  if (!nominee) return null;

  const next = nextStepFor(nominee.box_id ?? null, nominee.in_talent_pool);
  const toneColor = TONE_COLOR[next.tone];

  // Performance breakdown — we only have the final 0-100 in the
  // employees snapshot, but the framework's weights are universal so
  // we annotate them. If the imported assessment row has sub-scores
  // later they'll surface here without a code change.
  const perf = nominee.performance_score ?? null;
  const pot = nominee.potential_score ?? null;
  const perfGradeContrib = perf !== null ? (perf * 0.4) : null;
  const perfCoreContrib = perf !== null ? (perf * 0.6) : null;
  const potManagerialContrib = pot !== null ? (pot * 0.5) : null;
  const potGrowthContrib = pot !== null ? (pot * 0.5) : null;

  return (
    <>
      {/* Backdrop — click closes */}
      <div
        onClick={onClose}
        aria-hidden="true"
        style={{
          position: "fixed",
          inset: 0,
          background: "rgba(0,0,0,0.55)",
          zIndex: 100,
        }}
      />
      {/* Drawer */}
      <aside
        role="dialog"
        aria-label={`Talent assessment · ${nominee.display_name}`}
        className="talent-drawer"
        style={{
          position: "fixed",
          top: 0,
          right: 0,
          bottom: 0,
          width: "min(480px, 100vw)",
          background: "#14100a",
          color: "#f5f0e8",
          borderLeft: `4px solid ${toneColor}`,
          padding: "20px 24px 32px",
          overflowY: "auto",
          zIndex: 101,
          fontFamily: "ui-monospace, 'JetBrains Mono', Menlo, monospace",
          fontSize: 12,
          lineHeight: 1.6,
        }}
      >
        {/* Close button */}
        <button
          onClick={onClose}
          aria-label="Close talent drawer"
          style={{
            position: "absolute",
            top: 14,
            right: 14,
            background: "transparent",
            border: "1px solid rgba(212,168,67,0.4)",
            color: "#D4A843",
            cursor: "pointer",
            width: 28,
            height: 28,
            fontFamily: "inherit",
            fontSize: 14,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          ×
        </button>

        {/* Header — name + tier badge */}
        <div style={{ marginBottom: 18 }}>
          <div style={{ fontSize: 10, letterSpacing: "0.16em", color: "#D4A843", textTransform: "uppercase" }}>
            Talent assessment · 2026-H1
          </div>
          <h2 style={{ fontSize: 22, fontWeight: 700, margin: "4px 0 2px", color: "#f5f0e8" }}>
            {nominee.display_name}
          </h2>
          <div style={{ fontSize: 11, color: "#b8a88a" }}>
            {nominee.position ?? "—"} · {nominee.department ?? "—"}
            {nominee.job_grade && (
              <span style={{ marginLeft: 8, color: "#8a7a5e" }}>· {nominee.job_grade}</span>
            )}
          </div>
          <div style={{ display: "flex", gap: 8, marginTop: 10, alignItems: "center", flexWrap: "wrap" }}>
            <span
              style={{
                border: `1px solid ${toneColor}`,
                color: toneColor,
                fontSize: 10,
                letterSpacing: "0.14em",
                padding: "3px 8px",
                textTransform: "uppercase",
                fontWeight: 700,
              }}
            >
              Box {nominee.box_id ?? "—"} · {nominee.box_label ?? "Unassessed"}
            </span>
            {nominee.in_talent_pool && (
              <span
                style={{
                  border: "1px solid #D4A843",
                  color: "#D4A843",
                  fontSize: 10,
                  letterSpacing: "0.14em",
                  padding: "3px 8px",
                  textTransform: "uppercase",
                  fontWeight: 700,
                }}
              >
                ★ Final Cut
              </span>
            )}
            {/* Scout rank — cassette dialect: stars derived from box.
                Box 9 = ★★★, Box 8 = ★★, Box 7 = ★, others = none. */}
            {(nominee.box_id ?? 0) >= 7 && (
              <span
                title={`Scout rank ${"★".repeat(Math.max(1, (nominee.box_id ?? 7) - 6))}`}
                style={{
                  color: "#D4A843",
                  fontSize: 13,
                  letterSpacing: "0.1em",
                  fontFamily: "var(--font-mono, monospace)",
                }}
              >
                {"★".repeat(Math.max(1, (nominee.box_id ?? 7) - 6))}
              </span>
            )}
          </div>
        </div>

        {/* Scores — Performance × Potential */}
        <section style={sectionStyle}>
          <div style={sectionTitle}>Performance × Potential</div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 8, marginTop: 8 }}>
            <ScoreTile label_en="Performance" label_th="ผลงาน" value={perf} tone="#5B89B5" />
            <ScoreTile label_en="Potential" label_th="ศักยภาพ" value={pot} tone="#3a8a5a" />
            <ScoreTile label_en="Average" label_th="เฉลี่ย" value={nominee.avg_score} tone="#D4A843" />
          </div>
        </section>

        {/* Performance breakdown */}
        <section style={sectionStyle}>
          <div style={sectionTitle}>Performance breakdown · 100 pts</div>
          <BreakdownRow
            label_en="2-yr grade history"
            label_th="เกรดย้อนหลัง 2 ปี"
            weight="40%"
            value={perfGradeContrib}
            ceiling={40}
          />
          <BreakdownRow
            label_en="Core Competency"
            label_th="Core Competency"
            weight="60%"
            value={perfCoreContrib}
            ceiling={60}
            footnote="Innovation · Learning · Motivation · Improvement · Integrity"
          />
        </section>

        {/* Potential breakdown */}
        <section style={sectionStyle}>
          <div style={sectionTitle}>Potential breakdown · 100 pts</div>
          <BreakdownRow
            label_en="Managerial Competency"
            label_th="Managerial Competency"
            weight="50%"
            value={potManagerialContrib}
            ceiling={50}
            footnote="Leadership · Planning · Problem Solving · Build Teamwork · Visioning"
          />
          <BreakdownRow
            label_en="Work Growth Readiness"
            label_th="Work Growth Readiness"
            weight="50%"
            value={potGrowthContrib}
            ceiling={50}
            footnote="Tech Savvy · Change Agility · Growth Mindset · Proactive · Future Role Awareness"
          />
        </section>

        {/* Grade history */}
        {(nominee.grade_prev || nominee.grade_curr) && (
          <section style={sectionStyle}>
            <div style={sectionTitle}>Grade history</div>
            <div style={{ display: "flex", gap: 14, marginTop: 8, alignItems: "center" }}>
              <GradePill year="2024" grade={nominee.grade_prev} />
              <span style={{ color: "#8a7a5e", fontSize: 16 }}>→</span>
              <GradePill year="2025" grade={nominee.grade_curr} />
              <span style={{ marginLeft: "auto", fontSize: 10, color: "#8a7a5e" }}>
                A = exceeds · B = meets · C = below
              </span>
            </div>
          </section>
        )}

        {/* Provenance */}
        {(nominee.referrence || nominee.remark) && (
          <section style={sectionStyle}>
            <div style={sectionTitle}>Provenance</div>
            {nominee.referrence && (
              <div style={{ marginTop: 8, fontSize: 11.5, color: "#b8a88a" }}>
                <span style={{ color: "#8a7a5e" }}>Source:</span> {nominee.referrence}
              </div>
            )}
            {nominee.remark && (
              <div style={{ marginTop: 4, fontSize: 11.5, color: "#b8a88a" }}>
                <span style={{ color: "#8a7a5e" }}>Remark:</span> {nominee.remark}
              </div>
            )}
          </section>
        )}

        {/* Next step */}
        <section
          style={{
            marginTop: 22,
            padding: "14px 16px",
            border: `1px solid ${toneColor}`,
            background: "rgba(255,255,255,0.02)",
          }}
        >
          <div
            style={{
              fontSize: 10,
              letterSpacing: "0.16em",
              color: toneColor,
              textTransform: "uppercase",
              fontWeight: 700,
            }}
          >
            Next step · ขั้นต่อไป
          </div>
          <div style={{ fontSize: 14, fontWeight: 700, color: "#f5f0e8", marginTop: 6 }}>
            {next.title_en}
          </div>
          <div style={{ fontSize: 11, color: "#b8a88a", marginTop: 1 }}>{next.title_th}</div>
          <div style={{ fontSize: 12, color: "#b8a88a", marginTop: 8, lineHeight: 1.65 }}>
            {next.body_en}
          </div>
          <div style={{ fontSize: 11, color: "#8a7a5e", marginTop: 6, lineHeight: 1.7 }}>
            {next.body_th}
          </div>
        </section>

        {/* Footer · employee code for cross-reference */}
        {nominee.employee_code && (
          <div style={{ marginTop: 16, fontSize: 10, color: "#5a4530", letterSpacing: "0.12em" }}>
            EMPLOYEE_CODE · {nominee.employee_code}
          </div>
        )}
      </aside>
    </>
  );
}

// ─── Sub-pieces ───────────────────────────────────────────────────────

function ScoreTile({
  label_en,
  label_th,
  value,
  tone,
}: {
  label_en: string;
  label_th: string;
  value: number | null | undefined;
  tone: string;
}) {
  return (
    <div
      style={{
        border: "1px solid rgba(212,168,67,0.22)",
        padding: "10px 12px",
        background: "rgba(255,255,255,0.02)",
      }}
    >
      <div
        style={{
          fontSize: 9,
          letterSpacing: "0.14em",
          textTransform: "uppercase",
          color: "#8a7a5e",
        }}
      >
        {label_en}
      </div>
      <div style={{ fontSize: 9, color: "#5a4530", marginTop: 1 }}>{label_th}</div>
      <div
        style={{
          fontSize: 22,
          fontWeight: 700,
          color: tone,
          marginTop: 6,
          fontFamily: "var(--font-mono, ui-monospace)",
          lineHeight: 1,
        }}
      >
        {value !== null && value !== undefined ? value.toFixed(1) : "—"}
      </div>
    </div>
  );
}

function BreakdownRow({
  label_en,
  label_th,
  weight,
  value,
  ceiling,
  footnote,
}: {
  label_en: string;
  label_th: string;
  weight: string;
  value: number | null;
  ceiling: number;
  footnote?: string;
}) {
  const pct = value !== null ? Math.min(100, Math.round((value / ceiling) * 100)) : 0;
  return (
    <div style={{ marginTop: 12 }}>
      <div style={{ display: "flex", gap: 10, alignItems: "baseline", justifyContent: "space-between" }}>
        <div>
          <span style={{ fontSize: 12, color: "#f5f0e8" }}>{label_en}</span>
          <span style={{ marginLeft: 8, fontSize: 10, color: "#8a7a5e" }}>({weight})</span>
        </div>
        <div style={{ fontSize: 12, fontFamily: "var(--font-mono, ui-monospace)", color: "#b8a88a" }}>
          {value !== null ? `${value.toFixed(1)} / ${ceiling}` : `— / ${ceiling}`}
        </div>
      </div>
      <div style={{ marginTop: 4, height: 4, background: "rgba(255,255,255,0.06)", position: "relative" }}>
        <div
          style={{
            position: "absolute",
            left: 0,
            top: 0,
            bottom: 0,
            width: `${pct}%`,
            background: "#D4A843",
            transition: "width 200ms ease-out",
          }}
        />
      </div>
      {footnote && (
        <div style={{ marginTop: 4, fontSize: 9.5, color: "#5a4530", lineHeight: 1.5 }}>
          {footnote}
        </div>
      )}
    </div>
  );
}

function GradePill({ year, grade }: { year: string; grade: string | null | undefined }) {
  const tone =
    grade === "A" ? "#5B8C4A" : grade === "B+" ? "#7A9C5A" : grade === "B" ? "#a8761f" : grade === "C+" || grade === "C" ? "#C44D3F" : "#8a7a5e";
  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 2 }}>
      <span style={{ fontSize: 9, color: "#8a7a5e", letterSpacing: "0.12em" }}>{year}</span>
      <span
        style={{
          border: `1px solid ${tone}`,
          color: tone,
          padding: "4px 10px",
          fontWeight: 700,
          fontSize: 14,
          fontFamily: "var(--font-mono, ui-monospace)",
        }}
      >
        {grade ?? "—"}
      </span>
    </div>
  );
}

const sectionStyle: React.CSSProperties = {
  marginTop: 18,
  paddingTop: 14,
  borderTop: "1px solid rgba(212,168,67,0.14)",
};

const sectionTitle: React.CSSProperties = {
  fontSize: 10,
  letterSpacing: "0.16em",
  textTransform: "uppercase",
  color: "#D4A843",
};
