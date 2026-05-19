/**
 * /talent — standalone Talent Management Program (Phase 1) page.
 *
 * Mirrors the layout described in `TKC Talent rev.4.pdf` (Khun Jun,
 * Apr 2026) — funnel + 9-Box grid + department roll-up + Final Cut
 * ranking. Hooks into the cassette's polling /api/db/talent-assessment
 * endpoint so the data is always current.
 *
 * Standalone route by design — Dr Non walks into the HR room and types
 * tkc-digital-twin.fly.dev/talent without having to navigate the
 * command center.
 */

import { TalentPoolPanel } from "@/components/TalentPoolPanel";

export const dynamic = "force-dynamic";

export default function TalentPage() {
  return (
    <main
      style={{
        minHeight: "100vh",
        background: "#0d0d10",
        color: "var(--ink-0)",
        padding: "24px 28px",
      }}
    >
      <style>{`html, body { background: #0d0d10 !important; }`}</style>

      <header style={{ display: "grid", gap: 6, marginBottom: 20 }}>
        <div
          style={{
            fontSize: 10,
            letterSpacing: "0.14em",
            textTransform: "uppercase",
            color: "var(--rpg-yellow)",
          }}
        >
          TKC Cassette · v4.7 Ninja · Talent Management Program (Phase 1)
        </div>
        <h1 style={{ fontSize: 32, fontWeight: 800, color: "var(--ink-0)", margin: 0 }}>
          Ninja Team · The Talent Pipeline
        </h1>
        <p
          style={{
            fontSize: 12,
            color: "var(--ink-1)",
            margin: 0,
            lineHeight: 1.6,
            maxWidth: 800,
          }}
        >
          The funnel, 9-Box grid, and Final Cut ranking mirror the framework in
          <code style={{ margin: "0 4px" }}>TKC Talent rev.4.pdf</code>
          (Khun Jun, Apr 2026). Performance = grade-2yr (40 %) + Core Competency
          (60 %). Potential = Managerial Competency (50 %) + Work Growth Readiness
          (50 %). Final Cut keeps Boxes 6–9 and drops anyone whose current-year
          grade was C+/C. TKC chose <strong>~7 %</strong> of the workforce
          (≈20 people) as the target pipeline.
        </p>
      </header>

      <TalentPoolPanel />
    </main>
  );
}
