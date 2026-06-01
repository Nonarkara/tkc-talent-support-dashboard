/**
 * Build version — the cassette ROM revision.
 *
 * We iterate the cartridge visibly. Each revision gets a number and a
 * short DQ3-flavour codename so the user can tell at a glance which
 * mechanics are live. Shown in the top-left of /command-center next to
 * the TKC X wordmark.
 *
 * History
 *   v1 · Sheets               Google Sheets only. Manual HR tracking,
 *                             the literal first version of this system.
 *   v2 · Command Center       Next.js + Postgres dashboard wrapped
 *                             around the Sheets, with fire-and-forget
 *                             mirroring so the Sheet stays authoritative
 *                             for humans while Postgres is source of
 *                             truth for the app.
 *   v3 · Cassette             DQ3-canon archetypes (Hero / Soldier /
 *                             Wizard / Pilgrim / Merchant), 32×32
 *                             gendered sprites with 6-slot palette
 *                             variation, Formation + Resources tabs,
 *                             readiness = coverage·0.45 + quality·0.25
 *                             + chemistry·0.15 + morale·0.15.
 *   v3.1 · Party Split        DQ3 EXP-split: over-staffed slots now
 *                             dilute readiness. A new `party_split_pct`
 *                             feeds the formula at weight 0.05 (taken
 *                             from coverage). Hoarding a slot costs
 *                             visibly instead of silently.
 *   v3.2 · Alltrades          Alltrades Abbey ledger. `vocation_changes`
 *                             table records every reskilling event;
 *                             POST /api/alltrades appends + mirrors to
 *                             the VocationChanges Sheets tab. Infra
 *                             tonight, UI follow-up on the Roster card.
 *   v3.3 · Front Row          DQ3 party order. Every allocation carries
 *                             a row (1=front/2=mid/3=back). Captain in
 *                             front + scout in back earns +5 chemistry
 *                             which feeds readiness. `project_allocations`
 *                             gains a `party_order` column; the Formation
 *                             Sheets mirror encodes `empid@dim@order` and
 *                             emits front_count / mid_count / back_count.
 *   v4.2 · Fluid Legend      SNES-grade 16-bit sprites (64x64) with
 *                             shading and vocation gear. Obsidian-style
 *                             Social Graph in Lobby. URL-based routing.
 *                             Optimized path-based SVG rendering.
 *   v4.3 · Alive             Org Grade (S/A/B/C/D/F) on home screen.
 *                             Sprint countdown (days to cycle end).
 *                             Editable hero attributes in Roster.
 *                             MatrixGrid scenario rebuild (Codex).
 *                             Ticker shows ORG not SET (synthetic price).
 *   v4.4 · Talk-to-Fill      Conversational stat builder. Open any
 *                             hero card → "Compose with AI" → answer 3-4
 *                             questions → AI proposes full DQ3 profile.
 *                             Review, nudge, approve. Writes Postgres +
 *                             Sheets + AI live context all in one chain.
 *                             ICA Index (I/C/A bars + score) on every
 *                             card — reacts live to stat changes.
 *                             Live AI context: chatbot reads real DB on
 *                             every call (heroes, formations, anchors).
 *                             ProjectTrajectoryStrip: financial burn /
 *                             weeks-left / projected / margin + spark.
 *   v4.5 · Real              May 2026 dossier merged: 320 employees with
 *                             real names (EN), gender (215m/105f), DOB,
 *                             education, ส่วน, certifications (77 records),
 *                             KPIs (62 rows). 28 missing employees become
 *                             ghost rows: greyed sprite + halo + "Departed
 *                             Apr 2026" badge. PlayerCard gains a
 *                             narrative one-liner. Tome rebuilt as a
 *                             CEO-signed Letter of Recommendation derived
 *                             entirely from real DB facts. DQ3 sprite
 *                             takes a real `gender` prop — no more 50/50
 *                             RNG.
 *   v4.6 · Pulse             Hero-page rebuild around real org pulse:
 *                             /api/pulse aggregates active heroes, in-
 *                             office check-ins, skill family stack,
 *                             department head-counts, anchor count,
 *                             ghost count; PulseBanner renders it as the
 *                             first thing you see after login.
 *                             /api/hiring reads 33 actual TKC job-board
 *                             banners and computes a need-gauge per
 *                             role (HOT/WARM/COVERED/DEEP) by token-
 *                             matching against employee titles + skills.
 *                             HiringNow component shows the openings
 *                             with their gauge filter + colored badges.
 *   v4.6.6 · Red Dot          Closed the seven Red Dot accessibility +
 *                             mobile gates. Formation drag-drop now
 *                             announces every assign/remove via a
 *                             visually-hidden aria-live region; hero
 *                             cards (pool + assigned) are keyboard-
 *                             reachable with Enter/Space. Project Health
 *                             cards collapse cleanly at 768px and 420px,
 *                             instalment tables get a horizontal-scroll
 *                             hint with inset shadow. Handbook flipbook,
 *                             Tome (/tome/[employee_id]), and Lobby all
 *                             get a 360px mobile pass. Viewport meta
 *                             added with theme-color. SSR hydration
 *                             cleanup: removed stray requestAnimationFrame
 *                             in i18n hydrator, moved sprintDaysLeft into
 *                             useEffect, dropped Date() during render. PMO
 *                             Control Tower lifted its inline <style jsx>
 *                             keyframe into globals.css. Card-appear
 *                             animation on Fixture / Matrix / Roster tab
 *                             enters. docs/HOUSE_STYLE_AUDIT.md captures
 *                             the full rule set for third-party review.
 *   v4.7 · Ninja              Talent Management Program (Phase 1)
 *                             wired end-to-end. Migration 031 adds the
 *                             9-Box columns to `employees` plus a
 *                             `talent_assessments` history table keyed
 *                             on (employee_id, cycle). 48 of 49
 *                             nominees from Khun Jun's CSV imported
 *                             to Postgres + mirrored to the new
 *                             `TalentAssessment` Sheets tab.
 *                             `/api/db/talent-assessment` returns the
 *                             full snapshot (funnel · 9-Box buckets ·
 *                             dept roll-up · Final Cut ranking).
 *                             Standalone route `/talent` mirrors the
 *                             `/project-health` pattern. NinjaTab gets
 *                             a thin Talent-Pool strip up top with
 *                             headline counts + link to /talent.
 *                             Aligned with the framework in
 *                             `TKC Talent rev.4.pdf` (HR Strategy
 *                             Map Y2026, Danang management meeting).
 *   v4.8.0 · Crystal          Four C Framework + drag-drop perfection.
 *                             Migration 032 creates four_pillar_responses,
 *                             credo_scores, and house_score_history tables.
 *                             POST /api/four-pillars/respond and
 *                             POST /api/credo/respond let employees and
 *                             managers self-report Community, Career, Cause,
 *                             and Compensation scores. Sheets tabs
 *                             FourPillarResponses, CredoScores,
 *                             HouseScoreHistory, and SupportActions mirror
 *                             the new data. Formation Board drag-drop:
 *                             dragLeave flicker fixed with ref counter,
 *                             custom dark drag image, opacity 0.3→0.5 +
 *                             scale(0.97), cursor grabbing on all sources,
 *                             preemptive "Slot full" red warning on hover,
 *                             persistent Return-to-Pool strip, aria-grabbed
 *                             + aria-label on all drag sources and drop
 *                             zones. Dead .drop-zone CSS removed from
 *                             globals.css.
 *   v4.7.2 · Sieve            Filter strip on the Talent Pool surface.
 *                             Sticky-on-scroll row with text search
 *                             (name + dept substring), department
 *                             multi-select chips, and a "Final Cut
 *                             only" toggle. Filters scope every
 *                             surface together — the 9-Box grid
 *                             rebalances nominee counts per box, the
 *                             ranking + emerging tables shrink to
 *                             matches, and the counter shows "filtered
 *                             X / Y". Clear-button appears when any
 *                             filter is active. Empty-state placeholder
 *                             when the sieve catches nothing.
 *                             Bonus: Scout-rank stars (★/★★/★★★) on
 *                             the drawer header derived from box_id
 *                             (Box 9 = ★★★, Box 8 = ★★, Box 7 = ★).
 *                             Cassette-dialect touch without renaming
 *                             Khun Jun's HR vocabulary.
 *                             Mobile pass: dept chips scroll
 *                             horizontally instead of wrapping; search
 *                             input takes full row width at ≤520px.
 *   v4.7.1 · Scout            Talent surface turns from dashboard into
 *                             working tool. Per-person drill-down
 *                             drawer opens on any name click — 9-Box
 *                             cell or ranking row — and shows full
 *                             Performance × Potential breakdown
 *                             (40/60 and 50/50 weights named), 2-yr
 *                             grade history pills, provenance
 *                             (referrence + remark), and a computed
 *                             "Next step" hint specific to the box
 *                             they sit in (Project Assignment for
 *                             Box 9, Development Plan for Box 8,
 *                             Polish + Visibility for Box 7, etc.).
 *                             Box-cell rows are now real buttons
 *                             (Enter/Space + hover/focus rings).
 *                             Ranking rows are clickable + keyboard-
 *                             reachable. 65/80 axis-cut thresholds
 *                             now shown on the 9-Box header. New
 *                             "Emerging Group" section surfaces the
 *                             Box 4/5 bench (the ~23 the framework
 *                             explicitly calls out as next-cycle
 *                             pipeline candidates) — addresses the
 *                             previously invisible middle tier.
 *                             Mobile: funnel collapses 4→2→1 col,
 *                             9-Box collapses to 1-col at ≤520px,
 *                             drawer takes 100vw on phones.
 *   v4.9.2 · Scroll           Doc layer + workshop ingestion. docs/workshops/
 *                             directory with 2026-05-27 transcript + summary.
 *                             WORKSHOPS-INDEX.md. MATRIX-ORGANIZATION.md
 *                             expanded: three-framework table (4C/G/D/U/C/4P),
 *                             Section 10 game manual context — 4P failure-mode
 *                             table, NST/Chonburi/Chula case studies, no-
 *                             localhost rule, SLIC vs depa vehicles.
 *   v4.9.3 · Gate             Release-readiness gate. `npm run
 *                             verify:readiness` now lints within the current
 *                             warning budget, builds, boots the command center,
 *                             probes Sheets + dashboard JSON health, and drives
 *                             the browser shell through Boss Room → Route Menu
 *                             → Formation Board → Home. DQ3 smoke-test doc now
 *                             names what automation covers vs what remains a
 *                             human visual-canon pass. Firebase Analytics is
 *                             optional in local/demo envs, so missing public
 *                             config no longer trips the Next error overlay.
 *   v4.9.1 · Battery+         Live browser audit fixes. aria-labels on all
 *                             icon buttons (✏/+/skill filters/Clear).
 *                             role="region" on ninja-scope so AT tree
 *                             reaches all 138 controls. aria-live="polite"
 *                             on party-card message footer. Hide 0.0 FTE
 *                             from roster cards. ⚠ stale freshness with
 *                             hover tooltip.
 *   v4.9.0 · Battery          Ninja Board trust + affordance + game-feel
 *                             sweep. Save Name placebo fixed (now reads
 *                             res.ok). New POST /api/ninja/upsert-member
 *                             for single-warrior persistence; sliders /
 *                             drag-add / drag-remove all auto-persist via
 *                             debounce + Sheets mirror. Empty party slots
 *                             render as visible drop zones with dashed
 *                             amber outline + glow loop. "Seal Mission"
 *                             becomes "Mark Ready for Deploy"; DRAFT
 *                             badge surfaces draft state. Snap-lock /
 *                             amber pulse / red flash + shake / press
 *                             states / sprite-breathing animations.
 *                             Readiness number now tweens (300ms RAF)
 *                             instead of snapping. Larger game pieces
 *                             (52px readiness, 40px sprites). Cooler
 *                             canvas tint inside the geometric §14
 *                             single-amber palette — no second hue
 *                             introduced. Demo-hardened.
 *
 * Bump both fields together. Codename stays one or two words.
 */

export const BUILD_VERSION = "v4.9.3";
export const BUILD_CODENAME = "Gate";
