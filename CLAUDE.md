@AGENTS.md

# TKC Digital Twin — Project Intelligence

This file is the single source of truth for Claude working on this project. Every session should internalize this before writing code.

---

## What This Is

A **gamified talent management system** for TKC (Talent Knowledge Collaborative) — a mid-size technology services company (~200 employees). It's not a dashboard. It's a **board game that contains company data**. Employees are collectible cards. The salary cap is a stack of paper money. Projects are task cards you flip over. Team formation is cards laid on a table.

The system IS the company's transformation engine. Not a report about transformation — the actual mechanism that makes it happen.

## Why It Exists

TKC has 5 structural tensions (from Dr Non's first-meeting diagnostic):

1. **Business is Matrix, structure is Silo** — projects cross departments but resources don't
2. **Revenue is Project-Based, knowledge doesn't compound** — deliver and forget
3. **Talent exists but no Capability Engine** — good people leave, mediocre stay
4. **Speed collides with Governance** — controls designed for audit, not competition
5. **Innovation is Initiative, not Engine** — no system for idea → prototype → deploy → measure → repeat

The Digital Twin addresses all 5 by making contribution **visible, measurable, and linked to reward**.

## The Three Pillars

Every feature must serve one of these:

1. **HR Fun Again** — Assemble teams, simulate performance, compare prediction with reality. Data → better hypotheses. This is a NEW transformation of HR management.

2. **God's Mode** — CEO sees the entire company as a digital twin. Who works with whom, where the skill gaps are, which teams have chemistry. Pure signal, zero gossip.

3. **Moneyball** — You can't afford all superstars. The salary cap forces smart allocation. Find undervalued talent, build chemistry instead of buying stars.

## The 4C Framework (Why People Work)

Every person has 4 motivation drivers:
- **Compensation** — Money/survival. Hygiene baseline. If too low, nothing else matters (Herzberg).
- **Cause** — Story/dignity. Meaningful work. Purpose.
- **Career** — Flow/fun. Growth. When work isn't work (Csikszentmihalyi).
- **Community** — Belonging. Social connection. Mental health.

## The Game Mechanics

### Skill Dimensions (4)
- **Technical** — engineering, coding, infrastructure (INT-heavy)
- **Soft Skill** — presentation, negotiation, client relations (CHA-heavy)
- **Outsource Management** — vendor coordination, procurement (balanced)
- **In-House Execution** — hands-on building, internal operations (STR+CON+DEX)

### Personality Modifiers (3)
- **Resilience** — will they break under pressure? (CON + WIS)
- **Authenticity** — do they understand or just recite scripts? (INT + WIS)
- **Adaptability** — can they handle surprises? (DEX + CHA)

### Budget Rule
**Project budget ÷ 10 = monthly salary cap.** A ฿2M project → ฿200k/month. Everyone's real salary counts. 1 CP = ฿1,000/month.

### Team Scoring
- Skill fit: does the team's combined profile match the project's demand?
- Chemistry: coverage, diversity, synergy, cohesion (Belbin, Tuckman)
- Hierarchy: director → manager → staff chain
- Budget efficiency: cost vs coverage
- Team coverage uses **weighted average** (not MAX — everyone contributes proportionally)

### The Feedback Loop (THE killer feature)
1. Form a team → get a predicted score (chemistry, fit, budget)
2. Deploy the team → project runs
3. Record actual outcomes (on-time? budget adherence? quality?)
4. Compare prediction vs reality — the GAP is where learning happens
5. Over time: directors learn which compositions actually work

## Scoring Philosophy

**Compass, not judgment.** Fitness tracker, not social credit.

- Numbers are arbitrary but directional — they show trends, not truth
- Never rank-bottom or publicly shame
- Frame as "where you could grow" not "where you're failing"
- Individuals see their own data first, always
- Voluntary participation — nudge, never mandate
- The system works FOR people, not ON them

## Design Rules (Hard Requirements)

### Sacred
- **No rounded corners** — `border-radius: 0` globally. Sharp edges only. The only exception: playing cards can have 2-4px radius because they represent physical cards.
- **No boxed layouts** — No Bootstrap/SaaS grid of equal cards. Structure through spacing, not containers.
- **No templates** — If it looks like "AI made this in 30 seconds," it's wrong.
- **No placeholder content** — Every number real, every claim sourced.
- **Algorithm first, graphics second** — Build the formula, then visualize it.

### The Board Game Aesthetic
- Background: dark wood tabletop (CSS gradient, not image)
- Employee cards: cream card-stock with department-colored header stripes
- Salary cap: visual stack of paper bills that depletes
- Team formation: cards laid on green felt mat
- Jigsaw connectors: wood pegs between team members
- Typography: JetBrains Mono (data), Press Start 2P (labels), Sarabun (Thai)
- Color: warm palette — cream (#f5f0e8), dark wood (#1a1209), gold foil (#D4A843)

### The Warhol Principle
Same card template repeated for every employee, different department colors. The repetition IS the aesthetic. A wall of 200 employee cards in a grid IS the company.

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Framework | Next.js 16 + React 19 + TypeScript 5 |
| Styling | Tailwind v4 + globals.css design tokens |
| Database | Neon PostgreSQL (serverless, Singapore region) |
| ORM | None — direct SQL via `@neondatabase/serverless` |
| Pixel Art | Canvas-rendered 16×16 procedural sprites |
| Fonts | JetBrains Mono, Press Start 2P, Sarabun |
| Deployment | Fly.io (Singapore, auto-sleep on idle) |
| Domain | tkc-digital-twin.fly.dev |

## Org Chart (representative)

```
MD: Director Alpha
├── DMD (CMO): Director Alpha — Sales, Business Development, R&D
├── DMD (Tech): Director Beta — PMO, Implementation, Engineering, AI CoE, Digital Services, Digital Product
├── DMD (CFO): Director Gamma — Accounting, Financial
└── DMD (vacant): HR & GA, Org Management, Procurement, IT
```

## Database Schema (Neon PostgreSQL)

**Core tables:** divisions, departments, employees, employee_attributes, projects, team_compositions, team_snapshots, skill_assessments, project_outcomes

**Connection:** `DATABASE_URL` in `.env.local` (Neon connection string)

**Migration runner:** `npx tsx db/migrate.ts` (reads SQL files in `db/` directory in order)

## API Routes

| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/api/db/employees` | GET/POST | List all / bulk upsert |
| `/api/db/projects` | GET/POST | List all / upsert |
| `/api/db/teams` | GET/POST | Team compositions / save |
| `/api/db/import` | POST | CSV text → bulk employee upsert |
| `/api/db/dashboard` | GET | Aggregated payload for initialization |
| `/api/db/outcomes` | GET/POST | Project delivery outcomes (feedback loop) |

## Key Files

| File | Purpose |
|------|---------|
| `src/app/command-center/page.tsx` | THE main page (~2000 lines, all screens) |
| `src/lib/snap-engine.ts` | Team scoring, skill matching, snap rules |
| `src/lib/game-loop.ts` | Budget, salary cap, 10x rule, Moneyball |
| `src/lib/team-chemistry.ts` | 4-component chemistry scoring |
| `src/lib/talent-engine.ts` | Flight risk, pair chemistry, support needs |
| `src/lib/command-center-data.ts` | Mock character generation, org health |
| `src/lib/tkc-org.ts` | Real TKC org structure, projects, roster |
| `src/lib/csv-import.ts` | CSV/XLSX → employee parsing |
| `src/lib/db.ts` | Neon database client |
| `src/lib/db-sync.ts` | localStorage ↔ DB bridge |
| `src/components/rpg/PixelCharacter.tsx` | 16×16 procedural pixel sprites |
| `src/components/rpg/TownSquare.tsx` | Check-in world visualization |
| `src/components/GameManual.tsx` | 10-page flipbook game manual |
| `src/components/MoneyStack.tsx` | Salary cap paper money visualization |
| `GAME_ENGINE.md` | Master game design document |

## Screens (ConsoleScreen type)

| Screen | What it shows |
|--------|--------------|
| `table` | **Team Builder** — The main game. 3 zones: project brief + felt mat + roster grid. DEFAULT. |
| `overview` | **All Teams** — 4×2 Warhol grid of all 8 projects. God's Mode. |
| `heatmap` | **Capability Heatmap** — Org skill supply vs project demand. Gap analysis. |
| `history` | **Deployment History** — Every team ever assembled. Prediction vs reality. |
| `square` | **Check-in** — Pixel characters walking in the town square. |
| `formation` | **Formation** — Soccer-style lane assignment (4-4-2, 3-5-1-1). |
| `cards` | **Cards** — Variable-size card grid (anchor/core/support tiers). |
| `list` | **List** — Simple roster list. |
| `console` | **Console** — Debug/data view. |

## What's Built vs What's Missing

### Built and Working
- Team formation with salary cap, skill matching, chemistry scoring
- 4 real skill dimensions + personality modifiers
- Budget = project ÷ 10, MoneyStack visualization
- 10x viability rule
- Moneyball value verdicts (steal/fair/expensive)
- All Teams overview (Warhol grid)
- Capability Heatmap (supply vs demand)
- Deployment History (scrollable log)
- CSV import pipeline (Thai/English headers, BOM-safe)
- Neon PostgreSQL database with 28 seeded employees, 8 projects
- Game Manual (10 flipbook pages with psychology references)
- Board game tabletop aesthetic (wood, card-stock, felt mat, paper money)
- Deployed on Fly.io (Singapore)

### Still Missing (for full Capability Engine)
- **Real contribution data** — ICA Index exists as a concept but is derived from mock RPG attributes, not real performance signals
- **Forecast vs reality comparison UI** — Outcomes table exists in DB but no visual card-flip reveal
- **Director leaderboard** — Defined in game-loop.ts but never populated
- **Time-series vital signs** — HP/MP/Form/Utilization are snapshot mocks, not tracked over time
- **Real employee data** — System uses 28 mock employees from the org chart; real data to be pasted later
- **AI-generated chemistry benchmarks** — Natural language descriptions → numerical compatibility (future integration)
- **Trading between directors** — The Pokemon card trading mechanic (conceptualized, not built)

## Psychology References (The Science)

| Theory | Application |
|--------|-------------|
| Self-Determination Theory | Autonomy (choose quests), Competence (skill growth), Relatedness (community) |
| Herzberg Hygiene-Motivation | If Compensation < threshold, other motivators grey out |
| Csikszentmihalyi Flow | Challenge ÷ skill ratio calibrates quest difficulty |
| Belbin Team Roles | Teams need Action + People + Thinking balance |
| Tuckman Stages | New teams must storm before performing; some friction is healthy |
| JD-R Model | High demands + low resources = burnout (HP tracks this) |
| Prospect Theory | Many small celebrations > one big annual award |
| Loss Aversion | Streak decay motivates, but permanent achievements never vanish |
| Social Proof | Activity feed shows what peers do (positive only, never shame) |
| Endowment Effect | Your pixel avatar, your team — ownership drives care |
| Google Project Aristotle | Psychological safety is #1 predictor of team success |
| Groupthink (Janis) | High cohesion + low dissent + uniform personalities → warning |

## Financial Context

Representative mid-size technology services company. Revenue in the low single-digit billions THB range, with margin pressure from project-based delivery. The company is investing in digital transformation while managing working capital constraints. Talent transformation is not optional — it's survival.

## Working Style

- The user (Dr Non) works exclusively in Claude Code sessions, not in an IDE
- Only the deployed site counts — never accept localhost as a deliverable
- Push to GitHub, deploy to Fly.io, evaluate on the live URL
- Speed matters but correctness matters more
- The user HATES: placeholder content, templated aesthetics, rounded corners, generic descriptions, "Disney Frozen" over-polish
- The user LOVES: mathematical rigor behind aesthetics, real data, Dieter Rams minimalism, board game tactility, Championship Manager density, Andy Warhol repetition-as-art
- Every design decision should trace back to the strategic diagnostic or the 4C framework
- When in doubt: make it feel like a board game, not a software product
- Don't ask permission to do obvious things — just do them
- Don't summarize what you just did at the end of every response
- The center canvas should feel flexible, not boxed
- Sidebars should be thin but dense

## Deploy Commands

```bash
# Local dev
./node_modules/.bin/next dev -p 3001

# TypeScript check
npx tsc --noEmit

# Database migration
DATABASE_URL="..." npx tsx db/migrate.ts

# Deploy to Fly.io
fly deploy

# Live URL
https://tkc-digital-twin.fly.dev/command-center
```

---

# TKC X — The Cassette Metaphor (2026 layer)

Everything above is the original Digital Twin brief. This section is the
**current working model** — read this first on any new session.

## 0. Version Log

The cassette revises visibly. The pill in the top-left of /command-center
is always the truth — `src/lib/build-version.ts` is the single source.

| Rev | Codename | What landed |
|---|---|---|
| v1 | Sheets | Google Sheets only. The *actual* first version — manual HR tracking in spreadsheets, which remains the shadow save today. |
| v2 | Command Center | Next.js + Postgres dashboard wrapped around the Sheets, with fire-and-forget mirror writes. |
| v3 | Cassette | DQ3-canon archetypes (Hero / Soldier / Wizard / Pilgrim / Merchant), 32×32 gendered sprites with 6-slot palette variation, Formation + Resources tabs. |
| v3.1 | Party Split | DQ3 EXP-split baked into readiness — over-staffed slots now dilute per-head contribution at weight 0.05. |
| v3.2 | Alltrades | Alltrades Abbey reskilling ledger — `vocation_changes` table + `POST /api/alltrades` + `VocationChanges` Sheets tab. Backend only; Roster UI is v3.2.1. |
| v3.3 | Front Row | DQ3 party order (F/M/B) on every allocation. Captain-front + scout-back earns +5 chemistry. `project_allocations.party_order` column, Formation mirror encodes `empid@dim@order` and emits front/mid/back counts. Header change — re-run `POST /api/sheets/bootstrap`. |

When a new mechanic lands, bump `BUILD_VERSION` + `BUILD_CODENAME`, add
one row here, and leave a one-line entry in the version-log comment
inside `build-version.ts`. Keep codenames to one or two words.

---

## 1. The Cassette

The project is explicitly modelled on a **Famicom Dragon Quest III
cartridge (1988)**. Self-contained. Three physical parts:

| Cartridge part | In this project |
|---|---|
| **ROM chip** (game rules, sprites) | Next.js 16 app + TypeScript game logic |
| **Battery-backed save RAM** (the truth) | **Neon Postgres** — source of truth |
| **Memory card** (human-readable save) | **Google Sheets** — shadow mirror |

**The rule:** every state-change path MUST write to Postgres AND fire a
fire-and-forget `void mirrorX(...)` to Sheets. No exceptions. Sheets will
grow formulas that feed derived values back into the game, so the
round-trip linkage is sacred.

## 2. The Game (current build)

- **5 archetypes** mapped to DQ3 Famicom (1988) vocations — names are
  canon, not remake-era substitutions:
  captain → **Hero**, ops → **Soldier** (not Warrior),
  tech → **Wizard** (not Mage/Magician), scout → **Pilgrim** (not Priest),
  sales → **Merchant**.
  Famicom DQ3 has 7 vocations; we use 5. **Fighter** (agility/martial,
  junior ICs) and **Goof-Off** (wildcard personalities) are candidates
  for expansion — see §8.
- **Sprites:** 32×32 pixel, dual silhouette (m/f) per archetype. Rendered
  by `src/components/PixelSprite.tsx`. Gender inferred from title/name
  by `inferGender()` in `src/lib/sprite-variation.ts`.
- **Per-employee colour variation:** 6 slots — hat / shirt / pants /
  shoes / gloves / weapon — each an 8-entry palette, hashed from
  `employee.id` via FNV-1a. ~260k combinations. DQ3-canon defaults
  (ruby wizard hat, Hero blue tunic, cream priest robe, steel helm,
  orange gi).
- **5 project slot dimensions:** technical, sales, marketing,
  outsourcing, paperwork.
- **Readiness formula (v3.1):**
  `coverage × 0.40 + quality × 0.25 + party_split × 0.05 + chemistry × 0.15 + morale × 0.15`.
  `party_split_pct` is the DQ3 EXP-split: over-staffed slots dilute per-
  head contribution. 100 = every staffed slot at or under headcount;
  below 100 = someone is hoarding. Lives in `src/lib/fit-matrix.ts`.
- **Resources register:** non-human capacity (data centres, compute,
  licences, wishlist items like NVIDIA H100 or Bangkok DC co-location)
  living alongside people in the same economy.

## 3. HR Problems the Game Answers

- **Over-allocation** — FTE > 1.0 shows red. A hoarded hero.
- **Under-utilisation** — FTE < 0.7 shows yellow. Idle at the inn.
- **Under-readied projects** — readiness below threshold on any slot.
- **Missing capabilities** — heatmap gap between demand and org supply.
- **Resource contention** — two projects want the same shared asset
  (e.g. Bangkok DC rack).

## 4. The Data (source-of-truth tables)

| File | Table |
|---|---|
| `db/018_project_allocations.sql` | `project_allocations` (who is on what, FTE share) |
| `db/019_resources.sql` | `resources` (non-human capacity register) |
| Earlier migrations | `employees`, `projects`, `team_compositions`, `skill_assessments`, `project_outcomes`, etc. |

**Deferred:** `staff_reports` table for bot-driven self-reports (see §8).

## 5. The Sheets Save File

- **Mirror module:** `src/lib/sheets-mirror.ts`
- **Tab declarations:** `src/lib/sheets-tabs.ts` (sixteen tabs currently
  declared, including `Formation`, `FormationEvents`, `Resources`)
- **Health:** `GET /api/sheets/health` → reports `missing: []` when
  bootstrap is complete.
- **Bootstrap:** `POST /api/sheets/bootstrap` creates any missing tabs.
- **Silent-no-op rule:** if Sheets credentials are absent in an
  environment, mirrors must no-op silently — never break the Postgres
  write.

## 6. Rules of Engagement

1. **Sheets is not optional.** Every writing API route fires a mirror.
2. **Postgres is truth.** If the two disagree, Postgres wins.
3. **DQ3 aesthetic.** Pixel sprites, NES palette, no modern UI chrome.
4. **FTE is the unit of scarcity.** Budget, chemistry, readiness all
   compose on top of FTE — don't invent parallel units.
5. **Self-contained.** The cassette runs without external services
   beyond Neon + Sheets. No analytics SaaS, no tracking pixels.

## 7. Dev Loop

```bash
npm run dev                                    # localhost:3000
npx tsc --noEmit                               # type-check
DATABASE_URL="..." npx tsx db/migrate.ts       # apply new migrations
curl localhost:3000/api/sheets/health          # verify mirror linkage
```

## 8. Reserved / Not Yet Built

- **Bot ingest** — staff self-reports via LINE/Telegram into
  `staff_reports`, feeding morale + availability signals.
- **Cockpit gamification redesign** — Track C, previously deferred.
- **Sheets → frontend derived columns** — read formulas back and
  surface them as in-game values (the reason the mirror must be round-
  trip clean).
- **Role-gated slot-weight editing** — directors tune their own project
  slot weights; others read-only.

### DQ3 mechanics worth porting (design debt)

- **Alltrades Abbey (reskilling).** Canon: at level 20 an employee can
  change vocation — stats halved, level resets, spells kept. HR
  equivalent: internal career move. Cost is visible (capability dip
  short-term) but institutional memory (spells) survives. Good frame
  for the reskilling conversation that ERP-based HR tools dodge.
- ~~**EXP splits by party size.**~~ Shipped in v3.1 as
  `party_split_pct` inside `TeamFitReport`. Over-stuffed slots now
  subtract from readiness at weight 0.05. See `src/lib/fit-matrix.ts`
  and the "Party Split" MetricMini on the Formation board.
- ~~**Alltrades Abbey — ledger side.**~~ Shipped in v3.2. Table
  `vocation_changes` (`db/020_vocation_changes.sql`), API
  `src/app/api/alltrades/route.ts`, Sheets tab `VocationChanges`,
  mirror `mirrorVocationChange()` in `src/lib/sheets-mirror.ts`.
  **UI follow-up (v3.2.1):** a "Change vocation at Alltrades" action
  on `PlayerCard` or the Roster drawer that POSTs to the API and
  flashes a "+spells retained / stats halved" notice. Scope: one
  dropdown + one button. No new mirror work.
- ~~**v3.3 · Front Row**~~ Shipped. F/M/B toggle next to each fit chip,
  captain-front + scout-back earns +5 chemistry (computed inline in
  `FormationCanvas.formationBonus()`, keeping `calculateChemistry`'s
  attribute-only signature clean for Ninja). `project_allocations.party_order`
  persists, Formation mirror encodes `empid@dim@order` and emits
  front/mid/back counts. **Re-run `POST /api/sheets/bootstrap`** once
  so the Formation tab picks up the new headers.

- **v3.4 · Septet** (Fighter + Goof-Off archetypes). 7 vocations
  canon. **Scope — the long tail is the risk, not the logic:**
  1. `src/lib/token-economy.ts`: extend `Archetype` union +
     `ARCHETYPES` array; add entries in `ARCHETYPE_COLOR` /
     `ARCHETYPE_GLOW` / `ARCHETYPE_SPARK` / `ARCHETYPE_LABEL`
     (DQ3 canon: "Fighter" and "Goof-Off") / `ARCHETYPE_BLURB`;
     extend `deptArchetype()` and `getArchetype()` classifier.
  2. `src/lib/fit-matrix.ts`: add two new rows to `MATRIX`.
     Fighter = agility/scrappy (good sales, decent tech, poor
     paperwork). Goof-Off = wildcard (mid everywhere, low quality,
     morale-adjacent).
  3. `src/lib/sprite-variation.ts`: no change — sprite keys are
     archetype-derived.
  4. `src/components/PixelSprite.tsx`: add 2 × m/f sprites
     (Fighter: headband + fists; Goof-Off: jester cap + stick).
     Follow existing glyph grid.
  5. Grep for exhaustive `Record<Archetype, …>` and fix them:
     expect hits in `FormationFilters`, `CandidateList`,
     heatmap / league aggregators, and anywhere that switches
     over archetypes.
  6. Tests: `npx tsc --noEmit` will find most; run and patch
     until clean.
  Bump to `v3.4 "Septet"`.

- **v3.5 · Immigrant Town** (colonist-driven new division builder).
  **Scope:**
  1. `db/022_towns.sql` — `towns` (id, name, theme, progress_pct,
     created_at) + `town_colonists` (town_id, employee_id,
     role_hint, joined_at).
  2. `src/app/command-center/town/` route (new), Expedia-filter
     picker for colonists, progress bar based on archetype
     balance vs theme.
  3. Sheets tabs `Towns` (upsert) + `TownColonists` (upsert);
     mirror fns in `sheets-mirror.ts`.
  4. When a town hits 100% → optional button to promote to a real
     dept (inserts into `departments`, reassigns colonists,
     archives town).
  Bump to `v3.5 "Colonists"`.

- **Battery save preserves on death.** Already the Postgres-is-truth
  rule (§6) — name it explicitly when users ask why crashes don't
  lose data.

