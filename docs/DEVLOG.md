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
