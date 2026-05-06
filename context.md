# TKC X — Talent Support Dashboard · Project Context

Last updated: 2026-04-25

## Stack

- Next.js 16 + React 19 + TypeScript 5 + Tailwind v4
- Neon PostgreSQL (primary DB)
- Google Sheets (fire-and-forget shadow mirror)
- Service: `npm run dev` → http://localhost:3000
- Entry point: `/command-center`

---

## Google Sheets Integration (LIVE)

| Field | Value |
|---|---|
| GCP Project | `tkcx-494310` |
| GCP Project Name | TKCx |
| Service Account | `tkc-dashboard-sheets@tkcx-494310.iam.gserviceaccount.com` |
| Spreadsheet ID | `1LR8t7QxccwL1d5NBbQ9d_ZDy-T4qvxwUTi-3PJYuttE` |
| Spreadsheet URL | https://docs.google.com/spreadsheets/d/1LR8t7QxccwL1d5NBbQ9d_ZDy-T4qvxwUTi-3PJYuttE/edit |
| Tabs | 20 tabs bootstrapped (Players, Projects, Teams, CheckIns, Events, League, DeptHeat, AttrHistory, NinjaSquads, SquadEvents, SkillCatalog, InterviewLog, MatrixScenarios, Formation, FormationEvents, Resources, Attendance, Interactions, Memos, VocationChanges) |
| Players synced | 348 |
| Projects synced | 8 |

`.env.local` keys (set by CLI on 2026-04-24 — never commit this file):

```
GOOGLE_SHEETS_ID=1LR8t7QxccwL1d5NBbQ9d_ZDy-T4qvxwUTi-3PJYuttE
GOOGLE_SERVICE_ACCOUNT_KEY=<base64 SA key — already in .env.local>
NEXT_PUBLIC_GOOGLE_SHEETS_ID=1LR8t7QxccwL1d5NBbQ9d_ZDy-T4qvxwUTi-3PJYuttE
NEXT_PUBLIC_LEDGER_SHARE_URL=https://docs.google.com/spreadsheets/d/1LR8t7QxccwL1d5NBbQ9d_ZDy-T4qvxwUTi-3PJYuttE/edit
```

---

## Useful CLI Commands

```bash
# Health probe (Sheets live status)
curl -s http://localhost:3000/api/sheets/health | python3 -m json.tool

# Re-bootstrap all 20 Sheets tabs (idempotent — safe to re-run)
curl -s -X POST http://localhost:3000/api/sync/sheets-bootstrap | python3 -m json.tool

# RESTORE Sheets → DB (after a wipe). UPSERT semantics, never deletes.
# Scope: "players" | "projects" | "resources" | "all". Confirm field is required.
curl -s -X POST http://localhost:3000/api/sync/sheets-restore \
  -H "Content-Type: application/json" \
  -d '{"scope":"players","confirm":"RESTORE"}' | python3 -m json.tool

# UI equivalent: command-center → Ledger tab → "Restore from Sheets" panel.
# Two-click confirmation, red destructive style. Disabled until tabs healthy.

# OBSIDIAN export — push current dashboard state to ~/Documents/SecondBrain/03-Topics/TKC/
curl -s -X POST http://localhost:3000/api/export/obsidian \
  -H "Content-Type: application/json" \
  -d '{"scope":"all"}' | python3 -m json.tool
# Scopes: "all" | "intelligence" | "roster" | "heroes"
# UI equivalent: Ledger tab → "Obsidian Export" panel.

# GITHUB pulse — commits per repo, 7d/28d windows, via gh CLI
curl -s http://localhost:3000/api/github/pulse | python3 -m json.tool
# 5-minute server cache; appears as a panel in CockpitTab.

# GAME BALANCE — runtime tuning of engine constants
curl -s http://localhost:3000/api/game-balance | python3 -m json.tool
# Update one or more knobs:
curl -s -X PUT http://localhost:3000/api/game-balance \
  -H "Content-Type: application/json" \
  -d '{"updates":{"token_cost_md":6,"hp_per_con":5}}' | python3 -m json.tool
# Reset to defaults:
curl -s -X POST http://localhost:3000/api/game-balance \
  -H "Content-Type: application/json" \
  -d '{"reset":true}' | python3 -m json.tool
# UI equivalent: Ledger tab → "Game Balance" panel — sliders + reset button.

# THE TOME — print-ready hardcover per employee
curl -s http://localhost:3000/api/tome/<employee_id>/print | python3 -m json.tool
# Browser path: /tome/<employee_id> — opens the rendered hardcover.
# Cmd-P prints to PDF. UI: Roster drawer → "Open the Tome" button.

# DAILY BRIEFING — autotelic morning artifact, pushed to Obsidian
curl -s -X POST http://localhost:3000/api/briefing/today | python3 -m json.tool
# Output also lands at ~/Documents/SecondBrain/03-Topics/TKC/TKC-Briefing-YYYY-MM-DD.md
# UI: Home screen "Today's Briefing" panel (auto-loads on home).

# THE FOUR PILLARS — house health score
curl -s http://localhost:3000/api/four-pillars | python3 -m json.tool
# House composite + per-employee breakdown across Compensation × Purpose × Career × Community.
# UI: Cockpit tab "The Four Pillars" panel.

# FLOW INDICATOR — Csíkszentmihályi challenge/skill ratio
curl -s http://localhost:3000/api/flow | python3 -m json.tool
# Per-employee zone (bored/flow/edge/anxiety) + distribution count.
# UI: Cockpit "Flow Distribution" panel + coloured dot on every Roster card.

# FOUR-PILLAR SELF-REPORT — calibrate the heuristic with actual responses
curl -s -X POST http://localhost:3000/api/four-pillars/respond \
  -H "Content-Type: application/json" \
  -d '{"employee_id":"<uuid>","cycle":"2026-Q2","compensation":80,"purpose":75,"career":60,"community":55,"comment":"optional"}' \
  | python3 -m json.tool
# When a response exists for an employee+cycle, the Four Pillars score uses it
# instead of the heuristic. Cockpit panel shows "X of N self-reported" coverage.

# PROJECT BUDGET BAR — visceral money depletion on the formation board
# No new endpoint; computed live in src/lib/project-budget.ts. Tunable knob:
curl -s -X PUT http://localhost:3000/api/game-balance \
  -H "Content-Type: application/json" \
  -d '{"updates":{"cost_per_token_thb":75000}}' | python3 -m json.tool
# Default 50,000 THB/token-month. The BudgetBar above each project's slot grid
# repaints in real time.

# RUNTIME GAME BALANCE — sliders now actually move the engine (v8.5)
# Slide token_cost_md from 5 to 8 → every PlayerCard updates. Slide
# cost_per_token_thb → every BudgetBar repaints. Cache TTL 30s + immediate
# invalidate on PUT/POST.

# Rotate SA key (if compromised)
gcloud iam service-accounts keys create /tmp/new-tkc-key.json \
  --iam-account=tkc-dashboard-sheets@tkcx-494310.iam.gserviceaccount.com
base64 -i /tmp/new-tkc-key.json | pbcopy
# then paste into .env.local GOOGLE_SERVICE_ACCOUNT_KEY= and restart dev server
rm /tmp/new-tkc-key.json

# List current SA keys
gcloud iam service-accounts keys list \
  --iam-account=tkc-dashboard-sheets@tkcx-494310.iam.gserviceaccount.com

# Type-check
npx tsc --noEmit

# Build
npm run build

# Dev server
npm run dev
```

---

## Database

- Provider: Neon PostgreSQL
- Connection string: `DATABASE_URL` in `.env.local`
- Primary entry: `src/lib/db.ts`
- Migrations: `src/migrations/` — apply via `psql $DATABASE_URL < migration.sql`

---

## Architecture Notes

- **`/command-center`** — boss-facing command room. All routes are `?screen=X` params, no separate pages.
- **Routes (keyboard shortcuts):** C Cockpit · F Formation · N Ninja · M Matrix · R Roster · S Signals · L Lobby · G Ledger · `?` Codex
- **i18n:** EN/TH toggle persisted in `localStorage["tkc.locale"]`. Shell + Lobby + CassetteBadge + LedgerTab + CodexPanel translated. Tab bodies → v8.3+.
- **Sheets mirror:** 16 mirror functions across 20 tabs. All fire-and-forget — Sheets failure never breaks DB write. Generic `/api/db/quests` and `/api/db/quest-members` routes also mirror as of v8.2 — closes the bypass risk.
- **Sheets restore:** `/api/sync/sheets-restore` reads Sheets → UPSERTs DB. Players / Projects / Resources land round-trip clean. Computed columns (HP, MP, token cost, league points) ignored on restore — recomputed on next mirror.
- **Teams source of truth:** `project_allocations` table (written by Formation save). Dashboard reads via CTE pivot, not legacy `team_compositions`.
- **`BUILD_VERSION`:** update `src/lib/build-version.ts` on each shipping turn.
- **Site-wide gate:** `DASHBOARD_PASSWORD` env var (= `696969`) + `tkc_access` cookie via `src/middleware.ts`. Local dev bypasses if env unset. `/api/auth/login` POST sets the cookie.

---

## In-app Codex (knowledge base)

- Source: `src/lib/lore.ts` (363 lines, narrative spine), `src/lib/glossary.ts` (16 terms).
- Surface: `<CodexPanel>` slide-out — click `?` button in cc-header or press `?` key. Two sections: searchable glossary, collapsible lore (World / Classes / Attributes / Mechanics / Rituals / Campaign).
- Inline: wrap any UI label in `<TermDef term="KPI">KPI</TermDef>` for hover-definition. Cockpit tab has the proof-of-concept; Formation/Ninja/Matrix/Roster/Signals migrate one-per-turn in v8.4+.

---

## External integrations (v8.3)

- **Obsidian vault** — `~/Documents/SecondBrain/03-Topics/TKC/` (override via `OBSIDIAN_VAULT_PATH`). Three artifacts: `TKC-Project-Intelligence.md` (synthesis), `TKC-Roster-Pulse.md` (scoreboard), `TKC-Heroes/{employee_id}.md` (348 dossiers). Idempotent — overwritten on each export. POST `/api/export/obsidian` or click the LedgerTab button.
- **GitHub Pulse** — `gh` CLI shells out to `repo list` + per-repo `commits` API. Surfaces 7d/28d commit volume across 12 active repos. 5-minute server cache. Surface: Cockpit's "GitHub Pulse" panel.
- **Game Balance** — `game_balance` table seeds 16 tunable knobs (token cost by role, archetype thresholds, HP/MP formulas). Engine reads via `getGameBalance()` from `src/lib/game-balance.ts`; defaults are in the same file. UI: LedgerTab "Game Balance" panel with per-knob inputs and a Reset button.

---

## Versions

| Version | Status | Notes |
|---|---|---|
| v8.1 | shipped | Box-in-box killed, bilingual shell, Ledger tab, Sheets live, site-wide auth gate |
| v8.2 | shipped | Sheets restore (Players/Projects/Resources), Ninja bypass closed, Teams query pivot to project_allocations, Codex slide-out + glossary inline |
| v8.3 | shipped | Obsidian export to vault (synthesis + roster + 348 hero dossiers), GitHub Pulse panel in Cockpit (gh CLI, 5-min cache), Game Balance runtime tuning (16 knobs, sliders in Ledger) |
| v8.4 | shipped | Red Dot Design Bible · Tome printer · Daily Briefing · Four Pillars · Flow Indicator · ritual rename · class-distinguishing PixelSprite |
| v8.5 | **LIVE** | Project Budget BoM bars (visceral money depletion on Formation board, finance-grade legibility) · runtime Game Balance cache (Ledger sliders actually move the engine — `getTokenCost`/`getArchetype` consult cached snapshot) · Four-Pillar self-report scaffold (table + endpoint + survey-over-heuristic precedence + coverage chip) |
| v8.6 | Next | MemPalace integration (LLM-powered relationship understanding via local-first AI memory — see plan file for spec) · pixel-sprite art commission · four-pillar survey UI · voice check-in transcription · two-way Uber-style ratings · weekly Gantt nags · drop legacy `team_compositions` |
