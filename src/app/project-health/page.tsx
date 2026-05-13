/**
 * /project-health — standalone PMO-parity page.
 *
 * Mirrors the PMO Portfolio Dashboard page-5 "Project Health" layout
 * one card per project. Built to walk into tomorrow's PMO meeting and
 * show that the cassette already speaks their language (see
 * docs/PMO_MEETING_PREP_20260514.md).
 *
 * This route is intentionally a top-level page rather than a sub-
 * screen of /command-center so it can be opened in a single click /
 * single URL — no menu navigation needed for the demo.
 */

import { ProjectHealthPage } from "@/components/ProjectHealthCard";
import { PortfolioControlTower } from "@/components/PortfolioControlTower";

export const dynamic = "force-dynamic";

export default function PMOParityPage() {
  return (
    <main
      style={{
        minHeight: "100vh",
        background: "#0d0d10",
        color: "var(--ink-0)",
        padding: "24px 28px",
      }}
    >
      {/* Lift the page bg onto html + body so scrolling past the
          main element doesn't reveal the browser's white default. */}
      <style>{`html, body { background: #0d0d10 !important; }`}</style>
      <header style={{ display: "grid", gap: 6, marginBottom: 20 }}>
        <div style={{ fontSize: 10, letterSpacing: "0.14em", textTransform: "uppercase", color: "var(--rpg-yellow)" }}>
          TKC Cassette · v4.6 Pulse
        </div>
        <h1 style={{ fontSize: 32, fontWeight: 800, color: "var(--ink-0)", margin: 0 }}>
          PMO Portfolio Parity
        </h1>
        <p style={{ fontSize: 12, color: "var(--ink-1)", margin: 0, lineHeight: 1.6, maxWidth: 720 }}>
          The roll-up tower below mirrors the PMO Portfolio Dashboard page-4 layout (Khun Nuntawan
          Phoonkerd, 27 Apr 2026) — Executive Summary + Status Distribution + Instalment Payments
          Timeline. The per-project Health cards beneath it mirror page-5. Both surfaces read the
          same <code>/api/db/project-health</code> endpoint. Sections labelled <span style={{ color: "var(--rpg-yellow)" }}>DATA PENDING</span>
          require a feed the PMO must provide (Timesheet, ERP). See <code>docs/PMO_MEETING_PREP_20260514.md</code> §3.
        </p>
      </header>

      {/* ── Row 1 — Portfolio Control Tower (PMO PDF page 4) ─── */}
      <PortfolioControlTower />

      {/* ── Row 2 — Per-project Health cards (PMO PDF page 5) ── */}
      <div style={{ marginTop: 28 }}>
        <header style={{ display: "grid", gap: 6, marginBottom: 16 }}>
          <div style={{ fontSize: 10, letterSpacing: "0.14em", textTransform: "uppercase", color: "var(--rpg-yellow)" }}>
            03 PROJECT HEALTH · สุขภาพรายโครงการ
          </div>
          <p style={{ fontSize: 11, color: "var(--ink-1)", margin: 0, lineHeight: 1.5 }}>
            One card per active project. Drill from the rollup tower above into per-project facts.
            การ์ดละหนึ่งโครงการ — ลงรายละเอียดจากภาพรวมด้านบนสู่ข้อเท็จจริงรายโครงการ
          </p>
        </header>
        <ProjectHealthPage />
      </div>
    </main>
  );
}
