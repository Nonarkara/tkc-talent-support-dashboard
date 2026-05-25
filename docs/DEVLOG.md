# TKC Cassette — Devlog

A running record of the cassette's development. Written for the next engineer (or the next Claude session) to pick up cold.

---

## Convention

One entry per meaningful work session. Entries are added to the **top** of the file (newest first). Each entry has the following shape:

```
## YYYY-MM-DD — Codename / topic        (ROM rev at end of session)

**Shipped**
- Bullet list of what landed. Past tense. Concrete.

**Next**
- Bullet list of what's queued for the next session.

**Open questions**
- Bullet list of things the author noticed but did not resolve.
  Future-you will thank present-you for writing these down.

**Notes (optional)**
- Anything that doesn't fit the three buckets above. Decisions made
  with reasoning. Surprises. Things the next person should know.
```

A "meaningful work session" is one in which something concrete moved — code merged, schema migrated, manual revised, design rule changed. Pure exploration without an artifact does not get an entry.

When a ROM revision bumps mid-session, note the old → new bump in the entry header.

---

## 2026-05-25 — Matrix org architecture ingested        (v4.8.0 "Crystal" · architecture pivot)

**Shipped**
- `docs/sources/tkc-new-chapter-matrix-organization.pdf` — canonical source copied into repo
- `docs/MATRIX-ORGANIZATION.md` — full architecture reference: G/D/U/C outcomes, 10-step value chain, RACI matrix (all 3 process groups + 2.4 drill-down), Soft Side credential map, cassette wiring notes

**On hold pending Dr. Non review**
- RACI data layer (`process_steps` + `raci_matrix` tables)
- Matrix-Org overview surface (dept × stage grid)
- Project stage tracking (`current_step_id` on projects)
- G/D/U/C KPI strip
- Soft Side credential tags (`hia_complete`, `lac_complete`, `resilience_retreat_complete`)
- Game manual update (10 steps replace generic stage names)

**Notes**
- **4C reconciliation:** the original 4C (Compensation/Cause/Career/Community) and the deck's G/D/U/C are different layers. 4C = individual motivation model. G/D/U/C = org performance KPIs from the matrix transformation. No conflict — they coexist. The 4C feeds morale/retention signals that underpin G, D, and U.
- **Hard Side scope is explicit:** Dr. Non owns Structure/System/Process. Key Solution owns Mindset/Culture/Leadership. The cassette reads Soft Side completions as credentials on talent profiles; it does not run those programs.
- **The Lobby view IS the matrix view** — dept × stage intersection, pick a name from a cell. This is what the Social Graph in Lobby should become.
- **9-Box axis reinterpretation:** Performance = delivery outcomes (UAT pass rate, on-time per steps 3.5 and 3.7). Potential = readiness to take on higher-RACI roles. Current talent data is compatible with this reading once project outcomes feed in.

---

## 2026-05-16 — Red Dot accessibility + mobile gates closed        (v4.6.5 → v4.6.6 "Red Dot")

Kimi shipped against the seven-point Red Dot blocker list. I verified, wired the build-version, wrote the changelog, and pushed. The cassette now passes the smartphone-first §11.8 floor on every surface that ships.

**Shipped**

- **Formation drag-drop ARIA live regions.** A visually-hidden `aria-live="polite" aria-atomic="true"` region in `FormationCanvas.tsx` announces every assign / remove. Three call sites set the announcement: drop into slot ("X assigned to Sales"), drop on roster pool ("X removed from Sales"), kebab-button remove ("X removed from Outsourcing"). Pool cards and assigned hero cards both gained `tabIndex={0} role="button" aria-label="…"` with Enter/Space keyboard handlers — drag-drop is no longer mouse-only. `DnaPill` got a `title` tooltip explaining coverage maths.
- **Project Health phone overflow.** Two new class hooks on `ProjectHealthCard.tsx` — `project-health-row1` (the four KPI sections) and `project-health-row2` (Issues/Risks/Instalments). Media queries in `globals.css` collapse Row 1 to 2-col at ≤768px and 1-col at ≤420px; Row 2 collapses to 1-col at ≤768px. Instalment table wrapped in `.instalment-scroll` with `overflow-x: auto` + an `inset -8px 0 6px -6px rgba(0,0,0,0.35)` shadow hinting at scrollable content. `financing-grid` and `resource-flex` also collapse at 420px. Also: days_until_deadline now correctly renders "X days overdue" when negative.
- **Tome mobile pass.** +120 lines of `@media screen and (max-width: 640px)` rules in `tome.css` — strips A4 fixed width, collapses the attributes grid to one column, makes tables horizontally scrollable, reflows the cover headline, the letter body, the chronicle, and the ascensions list. Readable at 360px without zoom.
- **Handbook flipbook mobile pass.** `handbook-root` / `handbook-body-grid` / `handbook-body` class hooks; mobile rules hide the score-bleed sidebars, stack the header, drop body font to 11px, remove the max-height clamp so the parchment scrolls naturally. `Caption` colour bumped from `#7a6b54` → `#5a4530` for a real 4.5:1 on parchment.
- **Lobby mobile pass.** `lobby-root` class replaces the old `lobby-floor-grid`; collapses to 1 column on phone, map pane ≥320px tall with a hairline border between map and side panel.
- **PortfolioControlTower polish.** Removed the inline `<style jsx>` block (hydration risk) — the `pmo-pulse` keyframe now lives in `globals.css` alongside the other animations. `pmo-summary-grid` / `pmo-performance-grid` class hooks for the same 768px collapse pattern.
- **SSR hydration cleanup.**
  - `i18n.tsx`: removed the stray `requestAnimationFrame(setLocState)` — `useEffect` already runs post-hydration, the rAF was redundant and introduced a one-frame flash.
  - `command-center/page.tsx`: `sprintDaysLeft()` moved into `useEffect` so the server doesn't render a value that diverges from the client clock. `checked_at` defaults to `""` instead of `new Date().toISOString()` for the same reason — the empty string is a server-stable sentinel.
- **Viewport meta + theme-color.** `layout.tsx` now exports `viewport: Viewport` with `width: 'device-width'`, `initialScale: 1`, `themeColor: '#1a1209'`. Status bar matches the cassette on iOS.
- **Tab-enter animations.** `anim-card-appear` on FixtureTab match report container, MatrixTab control tower wrapper, RosterTab hero gallery panel, SignalsTab grid root, InsightsTab tab frame, and LedgerTab container — every Command Center tab now has a signature opening animation. `anim-score-pulse` on the predicted/actual score numerals. `anim-snap-active` on the Formation LOCK / commit button. Subtle — 250–400ms ease-out, no decoration.
- **`docs/HOUSE_STYLE_AUDIT.md` (212 lines).** Backlog item 4 closed. Captures §0 non-negotiables, §1 colour system (tabletop + parchment), §2 typography scale for all three surface families (Command Center, Tome, Handbook), §3 layout rules with breakpoints, §4 animation discipline, §5 component primitives, §6 responsive checklist, §7 per-surface audit grid (which surfaces are Done vs Pending), §8 dev artefacts that must never ship (styled-jsx, rAF state updates, `new Date()` during render, `toLocaleTimeString()` without `suppressHydrationWarning`, console errors, Turbopack badges), §9 how to apply. Single source for Red Dot reviewer documentation.

**Backlog status (the seven-point list)**

1. ✅ Formation drag-drop ARIA live regions — shipped
2. ✅ Project Health card inner tables phone overflow — shipped
3. ⏳ Demo film script (2-minute scripted, bilingually narrated) — own session
4. ✅ House-style audit doc — `docs/HOUSE_STYLE_AUDIT.md` shipped
5. ✅ Patent provisional draft — `/Users/nonarkara/Projects/TKC/docs/PATENT_PROVISIONAL_DRAFT.md` (297 lines, workspace-level). Method claims cover the qualitative-plus-quantitative weekly observation streams → six-axis team-efficiency signal with deterministic reconciliation. Prior-art differentiation against Jira, Lattice, Viva, Culture Amp. Code references map each claim to a real file. Ready for attorney review.
6. ⏳ Lobby canvas a11y (screen reader read of sprite world) — open
7. ✅ Signals / Insights / Ledger / showcase-log mobile pass — Kimi rolled these in overnight along with `anim-card-appear` on the three remaining tab containers (SignalsTab, InsightsTab, LedgerTab). showcase-log gets a 600px breakpoint mobile pass in the separate `/showcase/log.html` repo.

**Patent pivot — shipped this cycle.** Kimi spawned a parallel sub-agent to draft `docs/PATENT_PROVISIONAL_DRAFT.md` while finishing the mobile sweep. The draft is at workspace level (`/Users/nonarkara/Projects/TKC/docs/`), not inside this repo, so it travels with the TKC workspace not the cassette codebase. Five formal method claims plus prior-art table; the attorney inserts the filing date and the inventor block.

**Notes**

- ROM bumped `v4.6 "Pulse"` → `v4.6.6 "Red Dot"`. The `.6.6` suffix is intentional — we held at v4.6 from Pulse through Handbook (v4.6.1–v4.6.5) and the Red Dot pass is a horizontal accessibility/mobile sweep, not a new mechanic, so a fresh `.X` revision under the same `v4.6` major.
- Type-check clean. No lint errors. Single coordinated commit.
- No Sheets schema change this cycle. No mirror bootstrap re-run needed.

---

## 2026-05-14 — Three-AI coordination on the PMO Control Tower        (v4.6 "Pulse")

Dr Non asked all three of us — me, Antigravity, Kimi — to converge on the PMO Control Tower. The PDFs in `docs/From TKC May 2026/ref. from PMO/` are the spec; the cassette has to look like what the PMO wants. Coordination notes below; the result is one tower, two surfaces, real data.

**Who shipped what this session**

- **Antigravity** rewrote `MatrixTab.tsx` end-to-end (783 lines). The old TOM allocation sandbox is preserved behind a mode toggle; the default is now the PMO Control Tower, built from the PMO Roadmap May 7 deck. Includes per-quarter outcomes (Q2 Standardize · Q3 Control & Enable · Q4 Optimize), the five business lines from page 2 (Digital Services / Network Delivery / Enterprise Business / Public Safety / Intelligent Solution) with owner-mapping (Pananan M., Wanchai R., Sakol K., DMD Op Piya), and a resource summary panel. Also bumped `PortfolioStrip`'s annual target from the ฿1.5B placeholder to the **฿4.0B Base Case** the PMO Roadmap actually quotes, and added PDF cross-references in the tooltips.
- **Kimi**'s game-loop layer (game-clock, match-engine, FixtureTab) from the 12 May commit is unchanged and untouched.
- **Me (Claude)**:
  1. Extended `/api/db/project-health` to return a **portfolio rollup** alongside the per-project cards — 4 executive tiles, 5-bucket status distribution, 12-month instalment timeline (split billed vs pending). Same endpoint, two consumers. Verified: portfolio reads `30% / ฿1.185B of ฿4.0B target`, `40% billed`, `26% burn`, status `1 not_start + 7 on_track`, monthly bars peaking ฿237M every other month from the demo seed.
  2. Built `src/components/PortfolioControlTower.tsx` — a focused, **bilingual** (EN + TH side-by-side per label) implementation of the PMO PDF page-4 layout. Three sections: `01 EXECUTIVE SUMMARY` (4 tiles), `02 OVERALL PROJECT PERFORMANCE` (status distribution + instalment timeline with billed/pending stacking). Fixes house-style violations the inline version had (radius-6 on bars, fake `0.73` multiplier, fake bar heights, `any` typing).
  3. Prepended this shared tower above the per-project Health cards on `/project-health`. The page now reads top-to-bottom: header → rollup tower (PMO page 4) → per-project cards (PMO page 5). Both rows pull from the same endpoint.

**Why two towers and not one**

Antigravity's MatrixTab `ControlTower` is built from the **PMO Roadmap deck** (strategic — quarterly posture, business-line revenue, resource summary). My `PortfolioControlTower` is built from the **PMO Portfolio Dashboard deck** (operational — executive tiles, status distribution, monthly instalments). The two decks serve different conversations and the cassette should show both, in different places:

- **`/command-center` → Matrix tab → ControlTower** = the strategic surface the PMO will project at the all-hands.
- **`/project-health`** = the operational surface for the weekly portfolio review, with rolled-up tiles on top and per-project drilldowns below.

Both surfaces read `/api/db/project-health`. Both quote the ฿4.0B Base Case target. Both reference the PMO PDFs in their copy. The PMO sees one number across two views.

**House-style audit applied**

Workspace rule: no rounded corners >4px, no gradients, no decorative shadows. My shared component honours all three. Status-distribution dots use `border-radius:50%` only because they're *true circles* (the rule explicitly permits this).

**Shipped**

- `db/030_pmo_parity.sql` — `project_issues`, `project_risks`, `project_instalments` tables (already shipped 5/13; backfill remains)
- `src/app/api/db/project-health/route.ts` — extended with `portfolio` rollup (executive tiles + status counts + monthly instalments)
- `src/components/PortfolioControlTower.tsx` — new shared bilingual tower (PMO PDF page-4 mirror, fed by the real API)
- `src/app/project-health/page.tsx` — now renders tower + per-project cards together
- `docs/PMO_MEETING_PREP_20260514.md` — meeting prep (already shipped 5/13)

**Next**

- Get the ERP feed spec from the PMO so `expensed_thb` stops reading from `project_outcomes.budget_actual_thb` (only 3 rows seeded) and starts reading from real billing data.
- Get the Timesheet feed spec from HR so `resource_actual_hrs` stops rendering `DATA PENDING` on every card.
- Antigravity's MatrixTab tower currently uses synthesized "burn ahead 4 days" / "risk projects 1" labels in its tiles — could be wired to the same `portfolio` rollup once they're online and we sync.
- Build `tkc.nonarkara.org/log.html` for the public-facing version of this DEVLOG.

**Open questions**

- The status bucketing I added (`not_start / on_track / at_risk / delayed / closed`) maps approximately. The PMO uses their own taxonomy; we should swap to theirs once they publish.
- The instalment timeline shows ฿237M peaks every other month — that's the seed pattern, not real. Spread will look natural the day the ERP feed lands.

**Notes**

- ROM unchanged at v4.6 "Pulse" — all three agents shipped additive code on top of Kimi's game-loop base.
- Three AIs ran in the same codebase without a single merge conflict. The pattern that worked: each agent took an end (Antigravity = MatrixTab end-to-end rewrite, me = `/project-health` end-to-end + shared component, Kimi = unchanged game loop). The shared endpoint `/api/db/project-health` is the single source of truth that ties the two new surfaces together.

---

## 2026-05-13 — PMO parity ships for the 14 May alignment        (v4.6 "Pulse")

Dr Non has a meeting with the PMO lead tomorrow (Khun Nuntawan Phoonkerd). Read both her decks (`TKC_PMO Portfolio_Resource_Dashboard_20260427.pdf` + the new `TKC_PMO_Roadmap_20260507.pdf`), mapped every metric in her Portfolio Dashboard to a cassette data source, then built the parity surface so the meeting becomes "what feeds do you commit to send us" instead of "do we trust your dashboard."

**Shipped**

- `docs/PMO_MEETING_PREP_20260514.md` — **the master strategic artifact** (~6000 words). Eight sections: PMO ask read (strategic frame ฿4.0B Base / ฿6.9B Best, Q2-Q3-Q4 roadmap, new R&R/RACI layer), metric-by-metric parity map, three data gaps with named owners, what we have that they didn't ask for but should want (talent layer + Kimi's game loop), the 60-second-per-step walkthrough script, the three asks to leave the meeting with, the not-to-say list (don't pitch gamification, don't litigate the RACI matrix), and the backstop deliverables list. Dr Non walks in with it printed.
- **DB migration 030 — `db/030_pmo_parity.sql`** — adds three tables and two columns the PMO needs but we don't yet store:
  - `project_issues` (Critical / High / Medium / Low rows per project)
  - `project_risks` (same shape + probability + mitigation columns)
  - `project_instalments` (5 rows per project: term, original_due, revised_due, amount_thb, billed_status ∈ billed/pending/overdue/within_60)
  - `projects.pm_id` (separate from `director_id`; PMO uses PM rather than Director)
  - `projects.internal_budget_thb` (the *internal* budget, distinct from contract value; PMO shows both)
  - `projects.project_year` (PY in PMO terminology)
  - Demo backfill so the cards aren't empty: each project gets a deterministic 0–3 issues, 0–2 risks, and 5 instalments (terms 1-2 billed, 3 overdue, 4 within_60, 5 pending). Migration ran cleanly via `npx tsx db/migrate.ts`.
- **`/api/db/project-health` endpoint** — returns one fully-shaped row per active project: header (name/PM/updated/status/PY), overall progress, timeline (start/today/end), resource utilization (plan + actual nullable), financing (project cost / billed / budget / expensed), issue+risk buckets, ordered instalments, plus the `expensed_data_pending` flag so the UI can render the DATA PENDING band cleanly.
- **`ProjectHealthCard.tsx` component** — mirrors PMO page-5 layout 1:1. Five sections per the parity-map (§2.3 of the meeting prep). Sections that depend on data we don't yet have (Resource Actual hrs from Timesheet; Financing Expensed from ERP) render as a clearly-labelled dashed-yellow `DATA PENDING · WAITING ON <source> FEED` band. The gap is visible to the PMO, not hidden.
- **`/project-health` standalone page** — top-level route, single-click open. Renders the full set of 8 project cards on one scroll surface. Header reads "PMO Portfolio Parity" with a deck that explicitly references `docs/PMO_MEETING_PREP_20260514.md` so the PMO sees the linkage immediately.

**Visual parity confirmed in browser**

Final hero screenshot (Project Health page) shows for "5G ภาคใต้ P1 NT":
- Header row: name + code + client · On Track / PY 2026 chips · PM/Updated meta
- Row 1: OVERALL PROGRESS (42%, yellow bar) · PROJECT TIMELINE · RESOURCE UTILIZATION (Plan 0 / Actual — with DATA PENDING band) · FINANCING (Project Cost ฿180M, Billed ฿72M=40%, Budget ฿144M, Expensed — with DATA PENDING band)
- Row 2: ISSUE chart (3 open, Critical 0 / High 1 / Medium 1 / Low 1 with severity-colored bars) · RISK chart (1 open) · INSTALMENT PLAN (5-row table with proper ✓ Billed / ✕ Over 30d / △ Within 60d / · Pending status chips per term)
- 8 cards total, 16 DATA PENDING bands total (8 × Timesheet + 8 × ERP)
- `tsc --noEmit` exit 0

**Turbopack stale-route bug (third recurrence; bypassed)**

Tried first to add `health` as a sub-screen of `/command-center?screen=health`. The page chunk on disk contains the new ROUTES entry + new isScreen guard + my race-fix `urlReadRef` (verified by fetching the chunk and matching the source). But at runtime, the React tree uses an OLD module reference that doesn't know about `health` — same Turbopack HMR-cache stickiness encountered in the FixtureTab session on 2026-05-12. Kill -9 + nuke `.next` + cold-boot did not fix it; the symptom is that `isScreen("health")` returns false at runtime even though the chunk source has `health` in ROUTES.

**Workaround taken:** put the Project Health view at its own top-level route `/project-health`, which loads cleanly without going through the bouncing screen-state machine. Single-click URL. Same data, same component, no menu navigation needed for the demo. Strictly better UX for tomorrow's meeting anyway — Dr Non types or pastes one URL into the browser and the PMO sees their layout.

**Open question for follow-up:** root-cause the Turbopack stale-module-reference bug. Two suspicions: (1) the SWC server cache at `node_modules/.cache/turbopack` (couldn't find it) persists, OR (2) the SSR-vs-client chunk hash divergence (we have both `src_app_command-center_page_tsx_0_7qv0v._.js` for client + a separate SSR chunk under `.next/dev/server/chunks/ssr/`) creates a hydration mismatch where React keeps the SSR'd version. Worth filing upstream once we have a minimal reproduction.

**Next**

- **In the meeting:** walk the screenshot order in §5 of the meeting prep. Get the PMO to commit to (1) ERP feed spec by end of May, (2) Timesheet feed spec by mid-June, (3) cassette as Q2 deliverable.
- **After the meeting:** apply whatever the PMO commits to. The hardest path is the Timesheet feed because HR is the rate-limiting partner.
- **Schema add:** populate `projects.pm_id` from a sensible default (currently all 8 demo projects show `PM: —`). Round-robin the DMD-level owners (Wanchai, Sakol, Pananan) per business line from §1.1 of the prep doc.
- **Wire `/project-health` from the Cockpit menu** once the Turbopack issue is resolved or the routing system is migrated to Next 16's preferred App Router pattern.
- **Resource Utilization weekly grid** — page 8 of the PMO deck shows the Employee × Week and Project × Week pivot tables. Not built yet; needs the Timesheet feed first.

**Notes**

- ROM revision unchanged at v4.6 "Pulse". Adding PMO parity is additive (new table, new endpoint, new page, no engine break). When the Timesheet + ERP feeds land and the Resource Utilization grid ships, that's a clean v4.7 "Parity" bump.
- The `project_health` data is fully reproducible from demo backfill in migration 030. The PMO can swap demo numbers for real numbers by running their ERP feed against the same endpoint — no schema or code change required.

---

## 2026-05-12 — Kimi shipped the game loop; FixtureTab UX cleanup        (v4.6 "Pulse")

Walked into the repo after Kimi's `a8c7dc3 feat: real-time game loop` commit. Read his work end-to-end, played it in the browser, found two real UX gaps in the new FixtureTab and fixed them.

**What Kimi shipped (read-through)**
- `src/lib/game-clock.ts` (486 lines) — the "Animal Crossing" world-state engine. Lazy evaluation: when a director opens the cassette, the game computes "what should have happened since last time" from dates + allocations + outcomes. Returns a `WorldState` with bucketed `openFixtures` / `activeMatches` / `pendingReviews` / `resolvedMatches` and a `notifications` feed for the "while you were away" newspaper.
- `src/lib/match-engine.ts` (596 lines) — Championship-Manager-95-style match simulator. Takes a (project, team, predictedScore, randomSeed) and runs a stochastic match playthrough that yields a `MatchReport` with timeline status, quality, client-sat, deltas to each player's HP/MP/Form/XP/attrs, and a list of `MatchEvent`s like "Khun Tong made a critical save at minute 67". The seed makes the result reproducible and the philosophy is the gap-between-prediction-and-reality.
- `db/029_game_loop.sql` — new `game_events` table (the newspaper), `projects.director_id` column (ownership), enrichments to `project_outcomes` (random_seed, simulated, delivery_points, margin_achieved).
- `src/app/api/game/*` — four new endpoints: `lock-in`, `record-outcome`, `world-state`, `events`. lock-in transitions allocations `planned → active`; record-outcome runs the match engine; world-state is read-only aggregation; events serves the notification feed.
- `src/app/command-center/_tabs/FixtureTab.tsx` (705 lines) — the new tab on shortcut **0**, "LINE X: Fixture List". Four buckets, header tagline "The season never stops."
- Kimi also tightened my `PortfolioStrip` Coverage Rollup math: he switched from `dash.employees.active_project_codes` (every employee with any active code) to `dash.teams.player_ids` (committed team rosters only), so the bar now reflects committed coverage rather than aspirational coverage. **Better signal.** Confirmed visually: PMO strip reads `10 / 10` (one committed team P4, perfect coverage) instead of my earlier `10 / 44`.

**Playtest end-to-end**
1. Migration 029 ran cleanly. `GET /api/game/world-state` returns `ok:true, counts:{open:1, active:4, pendingReview:0, resolved:3, total:8}, cycle:'2026-Q2', daysIntoCycle:42`.
2. `/command-center?screen=fixture` renders the four bucket counters + Open Fixtures + Active Matches + Resolved with appropriate status badges. Header "The season never stops" reads exactly right.
3. Locked the previously-committed P4 team via the Formation flow; the world-state correctly categorizes it as `drafting` (planned allocations) → `pending` after lock-in transition.
4. `dash.teams` correctly reflects the committed team. PortfolioStrip Coverage Rollup ticks live: 1/10 → 10/10 as heroes get assigned and the formation is committed. Burn rate corrected from 857% to 86% via Kimi's `dash.teams` switch.

**Two UX gaps found in FixtureTab + fixed**

Per Dr Non's standing directive — make buttons obvious, NES aesthetic as a vehicle for clarity — I caught two issues by inventorying every button on the page:

1. **Rows had no labelled action buttons.** Every fixture row is technically `role="button"` with the whole card clickable, but nothing on screen tells the player "click me" or "this row does X when clicked". A director sees a list of matches and has to guess. **Fix:** added a per-row `<RowAction>` component on the right edge with a status-specific label:
   - `open` / `drafting` → **OPEN FORMATION** (jumps to `/command-center?screen=formation&pid=…`)
   - `active` → **INSPECT TEAM** (same target — directors can review the in-flight team)
   - `pending` / `completed` → returns null (the Pending Reviews section already renders an explicit **RECORD OUTCOME** button)
   - `resolved` → **VIEW REPORT** (jumps to insights screen for the project)

   Every button has `aria-label="<action> for <project name>"` and stops click propagation so the row-level fallback doesn't double-fire. The project code (`P4`, `P7`, …) is now a small subtitle under the button, not a bare orphan at the row's right edge.

2. **Active matches with `teamSize === 0` rendered the count without any visible alarm.** Four of the active matches in the seed had no committed team (project went active but no formation was ever locked in — a real "the cycle is eating the deadline" state). **Fix:** the "Team: 0" span now renders in red + bold when active-with-no-team, and a red filled **NO TEAM LOCKED** / **ยังไม่มีทีม** chip appears next to it. Tooltip explains: "Active project with no locked team. Open the Formation board and assign one before the cycle keeps eating the deadline."

   This means an opening director scanning the Fixture List immediately sees "four of my four active matches are unstaffed — go fix that" without having to count or hover.

Both changes compile clean (`tsc --noEmit` exit 0) and were verified rendering in the browser earlier in the session — 8 RowAction buttons across the three buckets + 4 NO TEAM LOCKED chips on the active matches that needed them.

**Dev-time caveat I have to be honest about**

Next 16 + Turbopack's HMR has a sticky cache issue in this repo: when FixtureTab is edited, the served chunk on `localhost:3000/_next/static/chunks/src_app_command-center__tabs_0rx0lpc._.js` correctly contains the new code (verified via curl + DOM-side `fetch` of the script), but the React fiber tree in the browser sometimes continues rendering the previous version of the component even after a full `window.location.reload()` and even after a complete `pkill -9 -f next-server` + `rm -rf .next` + `preview_start`. The behaviour:

- Edit the file → console.log inside FixtureList confirms the new function body runs → DOM still shows the old JSX output.
- Add a structural marker like `data-fix="row-action-wrapper"` → next reload picks up the new JSX cleanly → screenshots confirm all 8 buttons + 4 chips render visually.
- Remove the marker → next reload regresses to the old JSX output even though the chunk is identical.

This is **not** a production issue — `next build` produces a single static bundle without Turbopack's incremental HMR, and the deployed Fly.io URL will pick up the fix on first deploy. But it makes dev-time verification flaky, and I lost ~30 minutes chasing it before figuring out the pattern.

The clean code that's now on disk (146 insertions in `FixtureTab.tsx`) is the version that was verified to render correctly during the brief window when Turbopack accepted a fresh invalidation. Committing it.

**Next**
- `next build && next start` smoke test to confirm the fixture-row UX renders in production mode. Should be a 60-second verification.
- The View Report action currently navigates to the Insights tab with `?pid=<id>` but the Insights tab doesn't yet route per-project. Either wire that handling into Insights or change View Report to load `/api/game/record-outcome` with a `read_only` flag (would need a small backend change to skip re-simulation and just return the stored outcome).
- The lock-in API expects a full team payload (`project_id, director_id, team[]`) — there's no shortcut for "lock in whatever's already in the planned allocations". Worth adding so the Open Formation → Lock In transition is a single click rather than requiring the director to re-stage the team.
- Kimi's migration 029 adds `projects.director_id` but the seed doesn't populate it; all current projects show `directorName: null` on the Fixture List. Pick a seed strategy (e.g. round-robin DMDs across active projects) so the director chip on rows isn't always empty.

**Open questions**
- The "View Report" link goes to Insights as a placeholder. If we instead built a dedicated `/api/game/match-report?project_id=<id>` GET endpoint that reads `project_outcomes` and reconstructs a `MatchReport`, we could open the same `MatchReportView` modal Kimi already wrote for the simulate-fresh path. Cleaner UX, ~50 lines of backend.
- Active matches without a locked team is currently a *visual* warning only. Should there also be a kingdom-level PMO trigger? §7.6 of the manual lists six PMO intervention triggers; "active match with no committed team for N days" is a natural seventh. Worth adding to `PortfolioStrip` as a sixth tile or to the Project Health donut as an explicit "abandoned" bucket.
- I bumped the right-column min-width to 110px to give the action buttons breathing room. On very narrow viewports the row layout will start to wrap. Phone-first audit when we have a mobile screen to test on.

**Notes**
- ROM revision unchanged at v4.6 "Pulse" — additive UX work on Kimi's existing v4.7-pending engine. When Kimi's game loop + my FixtureTab cleanup + the WisprFlow voice mode all land together, that's a clean v4.7 "Watcher" bump.
- Manual is at v1.1 and still describes the FixtureTab honestly (the actions described in the manual now actually have visible buttons rather than "click anywhere on the row" which was the v1.0 implementation).

---

## 2026-05-11 — UX clarity audit + PMO Portfolio strip ships        (v4.6 "Pulse")

Dr Non asked for two things: (1) the NES aesthetic must serve clarity, every button obviously labelled; (2) actually go play the cassette and see whether the slot-coverage bar lights up *and* whether the bar on the PMO side ticks when pseudo-info feeds in.

Did both, end-to-end, with the Claude Preview MCP driving a real browser against `localhost:3000`.

**Shipped**
- `.claude/launch.json` — preview-server config so the cassette is one click from inspection on every future session.
- `src/components/PortfolioStrip.tsx` — **new component**, the PMO watcher's headline view. Five tiles computed live from the dashboard payload: Active Projects, Project Value vs target, **Coverage Rollup** (filled / required slots across every committed team — this is the bar that ticks), Burn Rate, Project Health (status mix). Every tile labelled in plain words, with a `title` tooltip explaining the math, an `aria-label` for assistive tech, and a coloured bar that animates on value change. Read-only by design — clicking a tile shows the tooltip; the PMO never acts directly.
- `src/app/command-center/_tabs/CockpitTab.tsx` — slotted the PortfolioStrip as a new row above the existing four metric tiles, with a header row labelled "PMO PORTFOLIO — what the watcher sees" and a "live · refreshes when formations commit" subline so users understand the cadence.
- `src/app/command-center/formation/FormationCanvas.tsx` — party-row toggle button: `"F"`/`"M"`/`"B"` → **`"FRONT"`/`"MID"`/`"BACK"`**, plus a proper `aria-label="Party row: MID. Click to cycle."` and an updated tooltip that names the next state. Per Dr Non's directive: "make it even more stupid than you are supposed to". Plain words, no glyph-only buttons.

**Playtest cycle, end-to-end, verified in the browser**

1. **Slot-coverage bar.** Opened Formation board on project P4 (Cyber มหาดไทย, cap 320 CP, 9 technical seats). Clicked "Assign Best" repeatedly and recorded the bar climb after each click:

   ```
   step  TECHNICAL  READY  fit  chem
     0    1/9        51    18    62
     1    2/9        53    33    49
     2    3/9        57    46    52
     3    4/9        62    57    55
     4    5/9        65    67    52
     5    6/9        69    75    50
     6    7/9        73    82    53
     7    8/9        77    89    52
     8    9/9        81    95    52
   ```

   Every click produced a measurable, monotonic move on coverage / readiness / fit. Chemistry oscillated 49–55 because each new hero changed the team's archetype balance. The blue bar fills proportionally; the diagnostic "Still blocked by …" auto-updates to point at the next gap.

2. **PMO bar.** Before commit, the new PMO Portfolio strip on the Cockpit read **Coverage Rollup 1 / 44 (2 % of all required slots filled)**. Hit Commit on the P4 formation (POST `/api/db/teams` → 200, POST `/api/formation/save-project` → 200, dashboard refetched). Reloaded the Cockpit. Coverage Rollup now reads **10 / 44 (23 %)**. Burn Rate corrected from 857 % (stale read) to 86 %. Project Value held at 79 % (no project budgets changed). Project Health unchanged. **The bar moved exactly when the commit landed.**

3. **Button clarity audit.** Inventoried every `<button>` on the Cockpit and Formation surfaces. Most are full-text-labelled (Back, Home, Menu, Ledger, Sign Out, Junior, Senior, Wizard, Soldier, Pilgrim, Fighter, Goof-Off, Hide pool, Remove, Assign best, Unlock, Re-roll, Queue, Commit, Start, Open Standards Workshop, etc.). The four ambiguous ones found:
   - `±` slot-need adjusters → already had `title="Reduce Technical need"` etc. Acceptable.
   - `M` party-row toggle → only had hover-only tooltip, single-letter glyph. **Fixed** (see above).
   - `EN` / `TH` language toggle → conventional flag-of-language convention, leaving as-is.
   - `MD` filter chip → matches the role-level series (Junior / Senior / Manager / Director / **MD**). Reads cleanly in context, leaving as-is.

**Next**
- The PMO strip's `ANNUAL_TARGET_THB` is hard-coded to ฿1.5B placeholder. When the PMO publishes the real annual revenue target, lift it into `game-balance` table or `pmo_config` and read from there. (Today's reading is "the kingdom is at ฿1.2B of a ฿1.5B target" — pleasingly plausible but not real.)
- Burn Rate dropped from 857 % to 86 % between two reads — that's a sign the seed values for `actual_cost_thb` and `planned_cost_thb` on at least one project are stale or out-of-date. Worth a one-pass audit: check `db/028_real_data_may_2026.sql` to see whether actuals were re-seeded but planned wasn't.
- The PMO strip currently only refreshes when the Cockpit reloads (or when the underlying `useDashboard` hook polls). Consider wiring it to react instantly when a Commit POST resolves — would feel even snappier.
- Dr Non named "Wispr Flow" voice mode for adjustments (manual §3.7). Once that lands, the PMO strip should also surface "last voice-mode adjustment by [role] at [time]" as a fifth row of evidence — voice events are the most likely to surprise a watcher.
- The party-row toggle now reads FRONT/MID/BACK, but the same convention isn't yet applied to the F/M/B summary chips elsewhere in the codebase (e.g. the formation summary line). Consider a sweep: any single-letter UI element that represents a state should spell the state out at the canonical surface, and may abbreviate only when space is critical.

**Open questions**
- The `1 / 44` reading at first load suggested "only 1 hero is committed company-wide", which is technically true (all my Assign-Best clicks earlier were drag-state, not committed). Should the PMO strip carry a hint like "out of 348 heroes total, 1 is committed to a quest" so the reader can tell whether the kingdom is *empty* or *uncommitted*? Probably yes — that distinction matters for the watcher.
- Project Health currently buckets by `margin_risk` but says "On Track / Watch / At Risk / Closed / Not Started" in its label. The mapping is approximate — `margin_risk='watch'` doesn't perfectly mean "Watch" in the PMO sense (margin is one signal among many). When the PMO publishes its own status taxonomy, replace the bucketing logic. For now, the column is honest about being directional.

**Notes**
- ROM revision unchanged at v4.6 "Pulse". This is a small additive component + two button-label tweaks; doesn't justify a ROM bump on its own. If we ship a rev that includes the PMO strip + the Wispr Flow integration + the personal-relationship affinity layer, that bundle would warrant a v4.7 bump with a codename like "Watcher".
- The cassette's design discipline around clarity is already strong — most of the buttons audit found were labelled. The one-letter party-row toggle was the most jarring exception; fixing it took 5 minutes. The PMO surface gap was the bigger one and now it's filled.

---

## 2026-05-11 — Player's Manual v1.1 — Kingdom Expansion        (v4.6 "Pulse")

**Shipped**
- `docs/MANUAL.md` bumped v1.0 → **v1.1**. Substantial expansion driven by Dr Non's expanded storyline brief (the kingdom of TKCX, no-final-boss endless play, Sim City / Animal Crossing / DQ3-after-Zoma framing). Manual grew from ~920 lines to **1,678 lines**.
- New §1 fully rewritten — kingdom storyline, the five tensions retold as kingdom tensions, the cassette metaphor preserved verbatim, and a new §1.7 "What victory looks like" introducing the four-trend cascade (chair → revenue → buzz → share price).
- New §2 "The buildings, the lobby, and the invisible lines" — covers buildings (HQ, sites, embedded desks, remote), three check-in paths (manual / bot / calendar), the Lobby itself, and the **five affinity layers** the user asked for (profession / workplace team / org group / friendship / personal-relationship-with-consent). Folds the old standalone Lobby section into here so the daily entry experience is one coherent chapter.
- New §3 "Setting the task — the manager's craft" — the full task-filing workflow Dr Non described: name, slot BOM, priority weights, **duration in months → Gantt**, revenue, **25% margin target**, plus the **Save → Lock** workflow, Unlock-with-audit semantics, and the **voice-mode adjustment via Wispr Flow API** as a roadmap mechanic with a clear pipeline diagram.
- New §6.3 "The weekly observation feed" — the two-stream model (qualitative observations + quantitative productivity numbers) feeding into six efficiency-bar axes. Explicitly says the cassette refuses to act on prose alone or numbers alone — both required.
- New §6.7 "The Gantt view" — reading headcount peaks and delivery cliffs.
- **New §7 "The PMO — the watcher behind the curtain"** — full new section covering: what the PMO actually does (efficiency / plan adherence / anomalies), the **Q2 / Q3 / Q4 strategic roadmap** from `ref. from PMO/TKC_PMO_Roadmap_20260428.pdf` (Standardize → Control & Enable → Optimize), the four headline tiles of the **Portfolio Dashboard** (Total Projects, Project Value vs Target, Billed vs Project Value, Budget Burn Rate) reproduced in ASCII with real placeholder values from the PDF, the Project Health donut, the Instalment Payments timeline (cash-shaped Gantt), six PMO-intervention triggers, and the **three watcher layers** (Talent Support / Talent Program / Kingdom Dashboard).
- New §10 "The endless game — what victory looks like" — explicit treatment of why TKCX is *Sim City*-shaped, not *Mario*-shaped. The four-trend victory cascade with one sub-section per trend (chair, revenue, buzz, share price). Closes on what "winning" feels like.
- New sample session **C.4 "The PMO pulls the alarm"** — a worked anomaly-intervention narrative that shows the PMO catching a 6-point Project Value vs Target drop, surfacing it without prescribing, and the kingdom self-correcting before the chair or the buzz noticed.
- Glossary expanded from 22 to 35 terms (added Building, Burn Rate, Chair, Gantt, Invisible lines, Kingdom, Lock/Unlock, Margin target, PMO, Punch, Quest, Wispr Flow).
- Quick-reference card updated to include margin-projection check at sprint lock and PMO-tile + share-price reads at monthly/quarterly cadence.
- Appendix D screen router gained a row for the upcoming PMO Portfolio screen.
- Appendix E versioning table gets a v1.1 row with the changelog.

**Next**
- The PMO Portfolio Dashboard screen referenced in Appendix D doesn't exist as a built screen yet. Either build it (Q3 PMO roadmap target anyway) or downgrade the Appendix D row to "(planned)". For now the manual is honest by labelling it "(Q3 — coming)".
- Voice-mode (§3.7) is a roadmap mechanic. When Wispr Flow integration lands as code, the manual's pipeline diagram should be checked against the actual implementation and tightened.
- The five-affinity-layer model in §2.4 includes a "personal relationship (recorded — opt-in)" layer that is not currently in `LobbyTab.tsx`'s affinity model. Either add a `personal_relationships` table + opt-in capture flow, or downgrade the manual's claim to "future layer". I lean toward building it — it's a small schema + a single opt-in toggle on the Tome.
- Thai translation of the manual remains open from the v1.0 entry.

**Open questions**
- The "five LeBron Jameses on a 5M baht project = 20M baht payroll" example in §4.3 uses ฿4M/month/hero as the implicit superstar salary. That's much higher than any real TKC salary on the floor (top-end Thai-tech-services salaries cluster at ฿200k–฿400k/month). The example is *illustratively* right (you can't fit 5 superstars under cap) but the *number* is borrowed from NBA scale. Consider switching to a Thai-anchored example (e.g. "five MD-level architects at ฿350k each = ฿1.75M/month on a project that bills ฿2M/month — leaves ฿250k for everything else, no margin, the math collapses"). Lower drama, more credible.
- Should §10 (Endless Game) live at the *end* of the manual or right after §1 (Story)? Argument for end: it's the long-arc payoff after the player understands all the mechanics. Argument for after-§1: it sets stakes before the player learns mechanics. v1.1 keeps it at end; revisit after first-reader feedback.

**Notes**
- ROM revision unchanged at v4.6 "Pulse". Doc-only work; the cassette code is untouched. Manual edition is the field that bumped (v1.0 → v1.1), per Appendix E.
- Walkthrough notes in `docs/MANUAL_WALKTHROUGH_NOTES.md` extended with a v1.1 addendum capturing the kingdom-expansion findings.

---

## 2026-05-11 — Player's Manual, first publication        (v4.6 "Pulse")

**Shipped**
- `docs/MANUAL.md` v1.0 — Player's Manual covering the seven canonical sections requested by Dr Non:
  1. The story (TKC's transformation, the cassette metaphor, the 4C compass)
  2. Assembling a team — including how to adjust the task to fit
  3. Tactics, techniques, tips
  4. Deploying the team (sprint lock, mirror writes, feedback loop)
  5. Reading the lobby (clusters, isolates, interaction log, Tome)
  6. Improving command — competition + cooperation (leagues, Org Grade, trades)
  7. Lifting all four C's together (the 4C lift loop, anti-patterns)
- Five appendices: glossary, quick-reference card, three sample sessions, screen router, manual versioning convention.
- This devlog (`docs/DEVLOG.md`) — convention + first entry.
- `docs/MANUAL_WALKTHROUGH_NOTES.md` — self-walkthrough of the manual after first draft, with the in-place fixes captured.

**Next**
- The Manual currently lives only as markdown in `docs/`. A printable HTML version (à la the Game Manual flipbook in `src/components/GameManual.tsx`) would be the right next move, especially as a hand-out at the next consulting workshop. Reuse the report-static print pipeline.
- Cross-link the Manual from the Cockpit (a `?` button in the top bar that opens `/manual` as a server-rendered page). Treat it as a screen, not just a doc.
- Surface the Quick-Reference Card (Appendix B) as an inline "cheat sheet" pop-over on Formation. Five seconds to glance, no navigation.

**Open questions**
- The Manual references the **trade mechanic** (§6.3) as partially shipped — currently it's a manual `vocation_changes` + Chronicle pair. Do we want to formalise a `trades` table + `/api/trade` endpoint before the Manual goes public to the company, or leave it as a future-tense "roadmap" callout in §6.3?
- The Manual is English-only. A Thai translation (using ผม + non-looped IBM Plex Sans Thai per the workspace standing rule) would double its real reach inside TKC. Worth one translation pass after the first round of feedback.
- Sample-session "Sapphire" uses a representative slot BOM. Should the Manual use a real project's BOM (anonymised) instead, so directors recognise the shape?

**Notes**
- The Manual is stamped `v1.0 / for ROM v4.6 "Pulse"` per the standing version-stamp rule. Bump policy is documented in Appendix E of the Manual itself.
- The four C's were located in `talent-support-dashboard/CLAUDE.md` §"The 4C Framework" (Compensation / Cause / Career / Community), with a deeper psychological mapping in `GAME_ENGINE.md` §1 (Esfahani Smith pillars × Ritz-Carlton Credo). Both readings are reflected in the Manual — §1.4 is the operational definition, §7.1 is the diagrammatic compass.
- No code changed this session. Doc-only work. ROM revision is therefore unchanged at v4.6 "Pulse".
