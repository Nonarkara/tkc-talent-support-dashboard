# PMO Alignment — Meeting Prep

**Meeting date** 14 May 2026 (tomorrow)
**Counterpart** Khun Nuntawan Phoonkerd (PMO lead) — author of both `TKC_PMO Portfolio_Resource_Dashboard_20260427.pdf` and `TKC_PMO_Roadmap_20260507.pdf`
**Cassette rev** v4.6 "Pulse"
**Goal of meeting** Show the PMO that the cassette already speaks their language at the metric level, agree on shared definitions, and lock down what data they will own (ERP, Timesheet) vs what we will own (every other signal).

> **One-sentence pitch** "The metrics on your Portfolio Dashboard are the metrics we already compute. The cassette is the source-of-truth substrate for everything you want to show; your Excel report is the polished surface. Let me show you the parity, and let me show you the three places where you have to feed us data we cannot compute on our own."

---

## 1. What the PMO is asking for (read across both decks)

### 1.1 The strategic frame (Roadmap 5/7, page 2)

The PMO has formally positioned itself as a **Strategic Value Partner** with one concrete number to defend: **THB 4,000 MB revenue target in 2026** (Base Case = ฿4.0B; Best Case = ฿6.9B with 1,178 MB carried from 2025 wins + 2,688 MB pipeline from Q4 2025 bids). Revenue plan is split across five business lines:

| Business line | Base ฿M | Best ฿M | Owner (org chart page 3) |
|---|---:|---:|---|
| Digital Services | 1,696 | 2,317 | Pananan Muanjit |
| Network Delivery | 1,098 | 1,802 | Wanchai Rawang |
| Enterprise Business | 687 | 1,252 | Sakol Klinrun |
| Public Safety | 332 | 547 | (under DMD Op Piya) |
| Intelligent Solution | 187 | 321 | (under DMD Op Piya) |

Every PMO conversation should be framed against these five numbers. If a feature or screen does not help close the gap between Base and Best, it is decoration.

### 1.2 The three-quarter roadmap (unchanged between 4/28 and 5/7)

| Quarter | Posture | Outcome we'll be measured against |
|---|---|---|
| **Q2 Standardize** | Establish single source of truth + standardized project execution framework | Project Visibility Dashboard v1.0 in production, % of projects using std. template |
| **Q3 Control & Enable** | Implement portfolio controls + upskill capabilities | Centralized Portfolio Dashboard 2.0, Centralized Resource View, QA/QC gate review |
| **Q4 Optimize** | Maximise ROI via data-driven decisions | Predictive Analytics (AI risk/delay forecast), Value Realization report |

We are currently in Q2. The Portfolio Dashboard (4/27 deck) IS the Q2 deliverable. Our job is to make sure that Q2 deliverable runs on the cassette — not on a spreadsheet that has to be re-typed monthly.

### 1.3 The new R&R / RACI layer (Roadmap 5/7, pages 5–18)

The 5/7 deck adds something the 4/28 deck didn't have: a full **PMO Governance Framework** with RACI matrix. This is important — the PMO is moving from "we report on projects" to "we own the rules of how projects run." The framework defines:

- **15+ named roles** with clear Role / Responsibilities / Key Deliverables / Key Success criteria per role
- **23 numbered deliverables** in the Sales → Solution Delivery → Warranty hand-off pipeline
- **16-phase project lifecycle** (Initiation through Warranty) with explicit RACI per phase
- A new role we don't currently model: **Project Coordinator (PC)** — "Execution Orchestrator", supports PM on docs/MoM/version-control. Distinct from the PM.

**Implication for the cassette:** our roster currently has 7 archetypes (Captain / Tech / Sales / Ops / Scout / Fighter / Goof-Off). The PMO's 15 named roles are more granular but they all map cleanly onto our archetypes through `employees.title_en` / `employees.role_level`. We don't need to redesign the archetype system; we need to surface "PMO-tagged role" as a secondary attribute on the Tome and on the Project Health card.

### 1.4 What the PMO explicitly asked for (Roadmap 5/7, page 19)

The "Need Support" slide is the action list they are bringing to the meeting:

1. **Timesheet Awareness — Need to discuss with HR.** Without timesheet data, the Resource Utilization grid (which the PMO has already designed) has no Actual column to populate. This is the biggest data gap.
2. **Std. Package Cost and Std. Manday Rate for Customization Solution / Software Project** — needs alignment with K.Wanchai.R, K.Sakol.K, K.Pananan.M (the three Solution Delivery DMD-level owners).
3. **PM alignment session on Ways of Working** — they want HR to send the PM/PC list so they can train the whole population on the framework. Four sub-topics: Project Governance, Centralized Project Tracking Tools, Centralized Portfolio Dashboard, Training — Project Management.

**What we can volunteer in the meeting:** the cassette already IS the centralized project tracking tool + the portfolio dashboard. We don't need to build a separate one. We need to *show them* that what they pictured in PowerPoint is what we've built in code, then negotiate the timesheet + ERP feeds we need from them.

---

## 2. Metric-by-metric parity map

For every tile on the PMO Portfolio Dashboard, this is where the data lives in our cassette today.

### 2.1 Executive Summary tiles (Portfolio Dashboard page 4)

| PMO tile | PMO formula | Our source | Cassette surface | Gap |
|---|---|---|---|---|
| **Total Projects** | active / total filed | `projects` table; `is_active`/`status` | `PortfolioStrip` "Active Projects" tile | None |
| **Project Value vs Target** | Σ project value / 2026 target | `projects.budget_thb` summed | `PortfolioStrip` "Project Value" tile | **2026 target is hard-coded ฿1.5B placeholder.** PMO must publish the real target (per §1.1, it's ฿4.0B Base / ฿6.9B Best). |
| **Billed vs Project Value** | Σ billed / Σ project value | Σ `project_instalments.billed` (NEW table needed) | (rebuild w/ new table) | **NEW DATA REQUIRED — ERP feed.** |
| **Budget Burn Rate** | Σ expensed / Σ budget | `projects.actual_cost_thb / budget_thb` | `PortfolioStrip` "Burn Rate" tile | None (data is in our DB, may be stale per seed) |

### 2.2 Overall by Status donut (Portfolio Dashboard page 4)

Five buckets: Not Started / On Track / At Risk / Delayed / Closed. We have a 6-state model via `game_clock.ts`: `open / drafting / pending / active / completed / resolved / cancelled`. The mapping table:

| PMO bucket | Our gameStatus |
|---|---|
| Not Started | `open` + `drafting` |
| On Track | `active` (where margin_risk = stable AND readiness ≥ 70) |
| At Risk | `active` (margin_risk = watch OR readiness 50–69) |
| Delayed | `active` (daysOverdue > 0 OR margin_risk = high) |
| Closed | `resolved` |

Currently `PortfolioStrip` "Project Health" tile rolls these into On Track / Watch / At Risk / Closed / Not Started. **One-line edit** to relabel: rename "Watch" → "At Risk (Watch)" and add an explicit "Delayed" bucket pulled from `daysOverdue`. Will do before meeting.

### 2.3 Per-Project Health card (Portfolio Dashboard pages 5–6)

This is the main page Dr Non shows tomorrow. The PMO designed one card per project. The mapping:

| Section in PMO card | PMO formula | Our source | Status |
|---|---|---|---|
| **Header** name + PM + Updated Date | name from project, PM from project, updated from latest edit | `projects.name` + `projects.director_id` (we use director, PMO uses PM) | We name the field differently. **Decision needed in meeting:** PM = our "captain" archetype assigned to project, OR a new `projects.pm_id` column? My recommendation: add `projects.pm_id` to be explicit. |
| **Status badge** | manual: On Track / Delay | `game_clock.gameStatus` + `project_variance.margin_risk` | Map per §2.2 above. ✓ |
| **Project Year (PY)** | manual | `EXTRACT(year FROM start_date)` | Trivial. ✓ |
| **Overall Progress %** | manual | `projects.progress_pct` | We have it. ✓ |
| **Project Timeline** (start/today/end Gantt) | start_date, end_date, today | `projects.start_date / end_date` + `now()` | We have it via `game_clock`. ✓ |
| **Resource Utilization** Plan/Actual hrs | Plan from `employee_allocations.fte × 40hr × weeks`; Actual from Timesheet | We have Plan; **Actual = TIMESHEET GAP** | Plan ✓, Actual NEEDS TIMESHEET FEED. |
| **Financing — Project Cost** | Total contract value | `projects.budget_thb` | ✓ (note PMO calls this "Project Cost" but their `Budget` column is also `projects.budget_thb`; semantics need alignment — see §3.1) |
| **Financing — Billed** | Σ instalments billed | Σ `project_instalments.billed_thb` (NEW table) | **NEW TABLE NEEDED — ERP** |
| **Financing — Budget** | Internal budget (different from Project Cost) | NEW column `projects.internal_budget_thb` | **NEW DATA REQUIRED** |
| **Financing — Expensed** | Actual spend to date | `projects.actual_cost_thb` | ✓ |
| **Issue chart** (C/H/M/L counts) | manual or from `issues` table | NEW table `project_issues` | **NEW TABLE NEEDED** |
| **Risk chart** (C/H/M/L counts) | manual or from `risks` table | NEW table `project_risks` | **NEW TABLE NEEDED** |
| **Instalment table** (5 rows: Term / Original Due / Revised Due / Amount / Billed Status) | manual + ERP billed-flag | NEW table `project_instalments` | **NEW TABLE NEEDED — ERP** |

### 2.4 Resource Utilization Dashboard (Portfolio Dashboard pages 8–10)

The PMO has a **weekly grid** with two pivots:
- **Employee View:** rows = employees, columns = weeks, cell = `actual_hrs / plan_hrs` + utilisation % + colour + project chips
- **Project View:** rows = employees grouped by project, columns = weeks, cell = same shape

Colour rules from the deck:
- Red ≥ 100% utilisation (over)
- Green = 100% utilisation (target)
- Yellow = 50–99% (under)
- Pink/red = 0% with planned hours (over-target gap)
- Blue = future weeks (no data yet)

Our `employee_allocations.fte` gives us **plan** (assuming 40hr standard week). **Actual hours per employee per week is the timesheet gap.** Without timesheet, this grid renders all cells as 0% / N% future-only.

---

## 3. The Three Data Gaps (the conversation we have to lead)

Pretend the cassette is the substrate. The three things we cannot infer from what we already have:

### 3.1 ERP feed — billed amount, instalment terms, internal budget

**What we need:** a daily (or weekly) pull from the ERP that lands these fields:

- `project_instalments(project_id, term_no, original_due, revised_due, amount_thb_exc_vat, billed_status, billed_at)` — one row per instalment, ~5 rows per project
- `projects.internal_budget_thb` — the *internal* budget which is different from `budget_thb` (contract value). PMO shows both: "Project Cost" (contract) and "Budget" (internal cap). We currently only have one column.

**Owner on PMO side:** Finance / ERP team.
**Effort:** trivial on our side once the feed exists — a `POST /api/erp/sync` endpoint that upserts. 2-3 days of work assuming PMO can deliver a CSV or API.

### 3.2 Timesheet feed — actual hours per employee per week

**What we need:** a regular sync of:

- `employee_timesheet(employee_id, week_starting, project_id, project_hours, non_project_hours)` — one row per (employee, week, project)

**Owner on PMO side:** HR — explicitly called out on Roadmap page 19 as "Need to discuss with HR." This is the rate-limiting step.
**Effort:** medium. We need the data shape agreed and the import endpoint built. Also need to define what "Non-PJ hours" means (training? holiday? unassigned?). PMO showed it as a side column in the grid — we should adopt the same.

### 3.3 Issues + Risks log

**What we need:** two parallel tables:

- `project_issues(project_id, severity ∈ {Critical, High, Medium, Low}, title, opened_at, closed_at, owner)`
- `project_risks(project_id, severity, title, probability, mitigation, owner, opened_at, closed_at)`

**Owner on PMO side:** PMs themselves, with PMO oversight. PMO's slide showed click-through links "Project Issue & Risk Logs" — so they imagine a per-project drilldown.
**Effort:** low. Schema is straightforward. The hard part is getting PMs to actually fill it in. Suggestion: surface it on the Formation tab so it's part of the weekly flow, not a separate site.

---

## 4. What we have already built that the PMO didn't ask for but should want

Two things to volunteer in the meeting that go beyond their PowerPoint:

### 4.1 The Talent layer (HR Fun Again)

The PMO Portfolio Dashboard treats employees as **hours**. The cassette treats them as **heroes with attributes, chemistry, morale, and growth trajectories**. Both views are needed. Their dashboard tells you *what* a person did this week. Our Tome / Lobby tells you *who* the person is and *why* they're trending where they're trending.

**Pitch:** "Your Resource Utilization grid sits on the surface; our Lobby + Tome sits underneath. Same person, two depths of read. When you spot a yellow cell on your grid, you click through and you're in the Tome — HP, MP, Form, the last 30-day Chronicle, the 4C grid. You stop guessing why and you know."

### 4.2 The Game Loop (Kimi's recent commit)

Kimi shipped the real-time match engine (DEVLOG 2026-05-12). Every committed team gets a stochastic match simulation when the cycle closes. The output is a `MatchReport` with timeline status, quality, client-sat, per-player stat deltas, and a list of named match events ("Khun Tong made a critical save at minute 67"). The PMO's Q4 deliverable is "Predictive Analytics (AI-driven Risk & Delay forecast)." **We have a substrate for that already.** The match engine is the prediction; the recorded outcome is the actual; the gap is the learning signal. Hand the PMO that loop and they have a Q4 outcome in Q2.

---

## 5. The walkthrough script (what to show, in order)

Open the cassette at `tkc-digital-twin.fly.dev/command-center` and walk it in this sequence (each step ~60 seconds):

1. **Cockpit** — point at the **PMO Portfolio strip** at top. "These are the four tiles from your page-4 executive summary. Total Projects, Project Value vs Target, Coverage Rollup, Burn Rate, Project Health donut. The numbers move when teams commit formations."
2. **Fixture List (key 0)** — "This is your Project Health page-5 prototype, but as a live game-loop. Drafting / Active / Pending Review / Resolved. Each row is one fixture; the action buttons say exactly what they do: OPEN FORMATION, INSPECT TEAM, VIEW REPORT. Red 'NO TEAM LOCKED' tags fire when an active match has zero committed FTE — your delayed-project warning, pre-fired."
3. **Formation Board** — "When you click OPEN FORMATION, you arrive here. The slot-coverage bars are the live attribute fill — they light up as you drag heroes onto the project. The team's readiness number is the soft prediction; cap math is the hard gate."
4. **Roster + Tome (key 5)** — "Here's where we go deeper than your Resource Utilization grid. Each employee is a card. Click in, you get the Chronicle, the ICA Index, the 4C grid, the Letter of Recommendation."
5. **Lobby (key 7)** — "And this is the social layer your spreadsheet can never show — the floor in real time. Five invisible affinity lines. When an active project has nobody clustered around it, that's a different kind of warning."
6. **Project Health (NEW — built tonight)** — "And here, finally, is your page-5 Project Health card, rendered against live data. Same layout you designed, our metrics under it. Where we don't have ERP or Timesheet yet, the section is shaded grey and labelled DATA PENDING — your job, not mine."

---

## 6. The asks (what we want them to commit to)

Three commitments. If we walk out with these signed off, the meeting succeeded:

1. **PMO delivers an ERP-to-cassette feed spec by end of May.** CSV is fine for v1. Fields: per §3.1. We will build the import endpoint within one week of receiving the spec.
2. **PMO partners with HR to define the Timesheet feed spec by mid-June.** Same delivery model. Without this, the Resource Utilization grid renders as 0% forever.
3. **PMO endorses the cassette as the Q2 "Project Visibility Dashboard v1.0" deliverable** in their official roadmap. We are not asking them to abandon their PowerPoint; we are asking them to acknowledge that the live dashboard runs on Postgres, not slides.

If they push back on #3, fallback: "Use the cassette as the *generative* source; export the PMO PowerPoint format weekly from our endpoint." Same data, different surface.

---

## 7. Things to NOT say in the meeting

The PMO is a Strategic Value Partner trying to land a governance framework. Two reflexes that would derail us:

- **Don't pitch the gamification.** The 4C grid, the Lobby physics, the match engine — leave these as backdrop. They are the *advantage* but they are not the *ask*. If the PMO doesn't ask "how does this work under the hood?", we don't volunteer it. We volunteer the metric parity (§2), the gaps (§3), and the upgrades (§4) — in that order.
- **Don't litigate the RACI matrix.** The 16-phase RACI on Roadmap page 17 is theirs to own. Our system doesn't disagree with it; our system gives them the substrate to *enforce* it. If they ask whether the cassette models the RACI per phase, the answer is "not yet, but adding `phase` and `responsible_id` to the project lifecycle is one schema migration. Let me come back with a proposal once the ERP feed is signed." Bank the answer; don't try to design it in the meeting.

---

## 8. Backstop: what to build BEFORE the meeting (deliverables tonight)

To make §5 step 6 real, three pieces ship tonight:

1. **DB migration 030** — adds `project_issues`, `project_risks`, `project_instalments` tables + `projects.pm_id` and `projects.internal_budget_thb` columns. Schema only; backfilled with one round of demo data per project so the cards aren't empty.
2. **`ProjectHealthCard` component** — mirrors PMO page-5 layout 1:1. Five sections per the §2.3 mapping. Sections that depend on missing data render as a clearly-labelled "DATA PENDING — needs Timesheet / ERP feed" placeholder so the gap is visible, not hidden.
3. **`/command-center?screen=health` route** — renders one `ProjectHealthCard` per project; PMO recognises their layout instantly.

These are documented in DEVLOG.md after they ship. The migration is reversible; nothing in production breaks.

---

*Owner of this doc: Dr Non. Walk in with it printed. The PMO will recognise their own slides reflected back and the conversation becomes "what feeds do you commit to send us" instead of "do we trust your dashboard." That is the win.*
