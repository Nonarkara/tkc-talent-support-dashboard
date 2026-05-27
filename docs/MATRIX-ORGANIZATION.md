# TKC New Chapter — Matrix Organization
## Canonical Architecture Reference

**Source:** `docs/sources/tkc-new-chapter-matrix-organization.pdf` (15 slides, May 2026)
**Subtitle:** Synergy through Matrix Organization · ผนึกกำลัง ขับเคลื่อนองค์กรสู่อนาคตที่ยั่งยืน

This is the foundational framework. Every surface the cassette builds should align to it. Read this before designing any new feature that touches org structure, team assembly, project lifecycle, or competency mapping.

---

## 1. Why This Exists

TKC runs parallel projects across silos that were designed for sequential work. Sales closes a deal; the handover to PMO is verbal and lossy; the project runs without shared accountability; after-sales loops back only if someone remembers. The matrix transformation makes the seams visible and assigns clear RACI at each seam. This document is the map of those seams.

---

## 2. The Four Expected Outcomes (G/D/U/C)

The deck names four measurable outcomes the matrix is designed to produce. These are **org-level KPIs**, not individual motivation scores.

| Code | Outcome | Thai | Metric |
|---|---|---|---|
| **G** | Growth | การเติบโต | Pipeline Value + Win Rate (new Solutions) |
| **D** | Delivery | การส่งมอบ | UAT Pass Rate ≥ 95% + On-time Delivery |
| **U** | Utilization | การใช้ทรัพยากร | Billable vs Bench Rate |
| **C** | Communication | ประสิทธิภาพการสื่อสาร | Internal Kick-off Rate + Lead Time to resolve issues |

### Three frameworks, three audiences

Three analytical frames are active in this project simultaneously. They are not competing — they answer different questions for different audiences. Conflating them is the most common source of confusion in TKC workshop discussions.

| Framework | Full name | Audience | Question it answers | Origin |
|---|---|---|---|---|
| **4C** | Compensation · Cause · Community · Career | **Individual employee** | *Why do I show up? What keeps me here?* | Drawn live on whiteboard at TKC workshop, 2026-05-27. Not from a slide. |
| **G/D/U/C** | Growth · Delivery · Utilization · Communication | **Org / leadership** | *Is the matrix transformation producing the outcomes we promised?* | TKC New Chapter deck, May 2026 management presentation. |
| **4P** | Purpose · Practical · Proof · People | **Evaluator / external partner** | *Should I engage with this initiative at all?* | Dr Non's smart-city consulting methodology — the outside-in evaluation gate before any engagement. |

**4C — the employee-side frame (individual motivation)**

The 4C explains *why a person chooses to give their discretionary effort*. Compensation is Herzberg's hygiene baseline — if it falls below the survival threshold, the other three C's grey out entirely. Cause is dignity and meaning: "does what I build matter?" Community is belonging and psychological safety: Tuckman's forming → storming → norming → performing cycle runs faster when Community is high. Career is Csikszentmihalyi's flow state: the work is the reward.

The 4C was drawn live on a whiteboard — marker on board, not pulled from a slide — during the TKC employee workshop on 2026-05-27. Non asked the room: "Which C is missing for you?" They answered. He moved on. This is the canonical first use with a TKC audience.

The cassette surfaces the 4C through `four_pillar_responses` (self-report) and `credo_scores` (manager-side signals). The `FourCWidget` in the Crystal release (v4.8.0) is the primary display surface. When a person's Compensation score drops below the `HERZBERG_FLOOR` constant, the other three C bars render greyed and a flag appears.

**G/D/U/C — the org-side frame (matrix KPIs)**

G/D/U/C measures whether the matrix transformation is working at the organizational level. These are the four outcomes the deck promises to the MD and DMDs. They live in the KPI strip, not in individual employee profiles.

The 4C feeds G, D, and U indirectly: high Cause and Community correlate with lower attrition (protecting G), higher quality delivery (protecting D), and better bench utilisation (protecting U). The cassette does not yet compute this correlation — it's a future signal chain. For now, both frames surface independently as "different gauges on the same dashboard."

**4P — the evaluator frame (engagement gate)**

The 4P is Non's outside-in evaluation tool for smart-city and transformation initiatives. Before any engagement, four questions must each pass:

- **Purpose** — is the problem real? Does the initiative have a clear societal or organizational stake?
- **Practical** — can it be built with available resources? Is there a working prototype path?
- **Proof** — is there evidence the approach works somewhere? Can you demo it in 45 minutes on a phone?
- **People** — who owns it? Is there a committed sponsor who will still be there in six months?

The 4P is *not* a TKC-internal framework — it's the lens Non applies when evaluating whether to take an engagement. It appears in the TKC context as the implicit gate Non ran in his head when scoping the matrix transformation work. The TKC game manual references it as the standard Non uses to evaluate prototype ideas submitted by ninja squads during the one-month mission sprint.

---

## 3. Hard Side vs Soft Side

The transformation has two parallel workstreams with different owners.

```
TKC New Chapter
├── HARD SIDE — Dr. Non (this cassette)
│   Organize Transformation: Structure / System / Process
│   AS-IS: Complex & Inefficient → TO-BE: Streamlined & Efficient (AI-Powered)
│   Sub-workstreams:
│     · People Innovate — readying people for process change
│     · PMO Road Map    — operational capability build-out
│
└── SOFT SIDE — Key Solution (external partner)
    Mindset Transformation: Change Management / Culture / Leadership
    Three tiered programs:
      · Officer → Asst. Manager : Human Intelligence in Action (mindset + responsibility)
      · Manager → Deputy Director: Leader as Coach Program (6 months, JG6-JG8, 20-30/class)
      · Director UP             : วิชาใจเบา — Resilience Retreat (พญ.พิยะดา หาชัยภูมิ)
```

**Rule for the cassette:** stay on Hard Side. The dashboard is the input device for process + system change. But: Soft Side completions are *credentials* — when an employee completes Leader as Coach or วิชาใจเบา, that should appear as a promotion-readiness tag on their profile. The cassette reads Soft Side outcomes; it does not own them.

---

## 4. Department Structure (RACI columns)

| Zone | Departments |
|---|---|
| Front Office | BD, Sales, Pre-Sales |
| Operation | PMO, PD/PO, PM |
| Back Office / Support | PROC, FIN, ACC, HR, IT, SAFE, OM |

DQ3 archetype mapping (carried forward from the cassette):

| DQ3 Vocation | Department |
|---|---|
| Hero (Captain) | PMO / Department Head |
| Merchant (Sales) | Sales, BD |
| Wizard (Tech) | Pre-Sales, PD/PO, Tech |
| Pilgrim (Scout) | PM, talent acquisition |
| Soldier (Ops) | Operation, PROC, SAFE |

---

## 5. The 10-Step Value Chain — 4 Stages

This is the **game-manual spine**. Every project the cassette tracks passes through these stages. RACI tells the cassette who is accountable at each step.

### Stage 1 — Front Office Lead (การบุกเบิกและคัดกรองโอกาส)

| # | Step | A (Accountable) | R (Responsible) | C (Consult) | I (Informed) |
|---|---|---|---|---|---|
| 1 | Market Insight & Opportunity Creation | CMO | Sales, BD | — | — |
| 2 | Business / Solution Qualification | COO, PMO | Sales, Pre-Sales | — | — |

### Stage 2 — Collaborative Design (การออกแบบและขออนุมัติโครงการ)

| # | Step | A | R | C | I |
|---|---|---|---|---|---|
| 3 | Integrated Solution Design & Costing | PMO, PD | Pre-Sales, PM | — | — |
| 4 | Proposal & Commercial Approval | COO | Sales | PMO, FIN | — |
| 5 | Contract / Project Activation | PMO | Sales, PD, FIN | — | — |

### Stage 3 — Operation Mastery (การส่งมอบและควบคุมคุณภาพ)

| # | Step | A | R | C | I |
|---|---|---|---|---|---|
| 6 | Project Planning & Resource Allocation | PMO, PD | PM | Sales, Pre-Sales | HR, IT, SAFE |
| 7 | Project Delivery & Quality Control | PD, PM | Operation, SAFE | — | — |
| 8 | Handover / Launch / Closure | PMO | PM, FIN, ACC | — | Sales |

### Stage 4 — Closing the Loop (การดูแลต่อเนื่องและต่อยอดธุรกิจ)

| # | Step | A | R | C | I |
|---|---|---|---|---|---|
| 9 | After-sales / MA / Customer Success | PD | PM, PC, Sales | — | — |
| 10 | Learning Loop / New Biz Dev | CMO / BD | BD, Sales | — | — |

---

## 6. Full RACI Matrix

Source: slide 9 of the deck. The canonical table; use this when building `raci_matrix` table rows.

**Columns (13):** BD · Sales · Pre-Sales · PMO · PD/PO · PM · PROC · FIN · ACC · HR · IT · SAFE · OM

### Process Group 1 — Business Strategy & Research Development

| ID | Activity (TH) | BD | Sales | Pre | PMO | PD/PO | PM | PROC | FIN | ACC | HR | IT | SAFE | OM |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| 1.1 | วิจัยตลาดและพัฒนา Product/Service หรือ Solution ใหม่ | R/A | C | — | R | I | — | — | — | — | — | I | — | — |
| 1.2 | วางแผนกลยุทธ์การตลาด | R/A | C | — | R | — | — | — | — | — | — | C | — | — |
| 1.3 | ประเมินความเป็นไปได้ของการลงทุนในธุรกิจใหม่ | R/A | C | — | R | — | — | — | C | C | — | I | — | — |

### Process Group 2 — Sales & Pre-Sales *(primary scope: cross-functional seam)*

| ID | Activity (TH) | BD | Sales | Pre | PMO | PD/PO | PM | PROC | FIN | ACC | HR | IT | SAFE | OM |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| 2.1 | เข้าพบลูกค้า ค้นหาความต้องการและรับ Requirement | C | R/A | — | R | — | — | — | — | — | — | — | — | — |
| 2.2 | ออกแบบระบบและประเมินความเป็นไปได้ทางเทคนิค | C | R/A | — | R | — | — | — | — | — | — | — | — | — |
| 2.3 | ประเมินต้นทุนโครงการ | C | A | R/A | A | — | — | — | C | C | — | — | — | — |
| 2.4 | จัดทำและนำเสนอ Proposal | C | A | R/A | C | — | — | — | C | — | — | — | — | — |
| 2.5 | เจรจาต่อรองเงื่อนไขและปิดการขาย (เซ็นสัญญา) | — | R/A | I | — | — | — | — | C | C | — | — | — | — |
| 2.6 | จัดทำสื่อส่งเสริมการขาย | C | R/A | — | — | — | — | — | — | — | — | — | — | — |
| 2.7 | เปิดโครงการ (ERP) + Internal Kick-Off/Hand-Over | I | R/A | R/A | I | I | I | — | I | I | — | C | — | — |

#### Process 2.4 drill-down — Proposal sub-activities

| Sub-ID | Activity | Sales | Pre-Sales | PMO | FIN | ACC |
|---|---|---|---|---|---|---|
| 2.4.1 | รวบรวมข้อมูล Requirement และ Scope งาน | A | R | C | I | I |
| 2.4.2 | จัดทำ Technical Solution และ Architecture | C | A/R | C | I | I |
| 2.4.3 | ประเมินต้นทุน ราคา และ Margin | A | R | C | C | I |
| 2.4.4 | จัดทำ Proposal และ Commercial Proposal | A/R | R | C | C | I |
| 2.4.5 | ตรวจสอบเงื่อนไข ราคา และความเสี่ยงก่อนเสนอ | A | C | C | R | C |
| 2.4.6 | นำเสนอ Proposal และตอบคำถามลูกค้า | A/R | R | C | I | I |
| 2.4.7 | ปรับแก้ Proposal ตาม Feedback ลูกค้า | A | R | C | I | I |
| 2.4.8 | สรุป Final Proposal เพื่อขออนุมัติภายใน | A | C | C | R | C |

### Process Group 3 — Project Execution & Operations

| ID | Activity (TH) | BD | Sales | Pre | PMO | PD/PO | PM | PROC | FIN | ACC | HR | IT | SAFE | OM |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| 3.0 | เตรียมความพร้อมเพื่อเริ่มงาน (Initiation) | — | — | — | A | A | R | — | — | — | — | — | — | — |
| 3.1 | วางแผนและเปิดโครงการ (Project Planning & Kick-off) | I | C | C | C | C | R/A | — | — | — | I | I | I | C |
| 3.2 | จัดหาและสั่งซื้ออุปกรณ์/ผู้รับเหมา | — | C | C | I | C | C | R/A | I | I | — | — | — | — |
| 3.3 | ออกแบบ ปฏิบัติงาน/ติดตั้ง (Design, Build, Install) | — | — | — | — | A | — | — | — | — | — | — | — | C |
| 3.4 | ตรวจสอบคุณภาพและความปลอดภัย (Internal Test) | — | — | — | — | C | C | — | — | — | — | — | R/A | — |
| 3.5 | ตรวจรับงานร่วมกับลูกค้า (UAT) | — | — | I | A | C | — | — | — | — | — | — | — | — |
| 3.6 | อบรมการใช้งาน (Training) | — | — | — | A | C | — | — | — | — | — | — | — | — |
| 3.7 | ส่งมอบงาน / Launch & Closure | — | I | — | C | — | R | — | — | — | — | — | — | — |
| 3.8 | วางบิลกับลูกค้า และจ่ายบิลกับทาง vendor | — | — | — | — | — | A | — | I | R | — | — | — | — |

---

## 7. Soft Side — Credential Map (for talent tagging)

The cassette does not run these programs. It reads their completion status and surfaces it on talent profiles.

| Program | Target tier | Duration | Provider | Credential tag |
|---|---|---|---|---|
| Human Intelligence in Action | Officer – Asst. Manager | — | TKC / Key Solution | `hia_complete` |
| Leader as Coach Program | Manager – Deputy Director (JG6-JG8+) | 6 months | Key Solution | `lac_complete` |
| วิชาใจเบา Resilience Retreat | Director UP | — | พญ.พิยะดา หาชัยภูมิ | `resilience_retreat_complete` |

When `lac_complete = true`, the talent drawer should show "✓ Leader as Coach" under promotion-readiness. Same for the others. This tag is a boolean on the `employees` table or `employee_attributes` — not a score.

---

## 8. How This Wires into the Cassette

### What already exists (v4.8.0 as of this writing)

- **Talent Pool** (`/talent`, `talent_assessments` table) — roster view for the matrix
- **Formation Board** — team assembly for individual projects
- **Project Health** (`/project-health`, `project_issues`, `project_risks`, `project_instalments`) — Stage 3 visibility
- **PMO Control Tower** (`PortfolioControlTower`) — Stage 3 aggregate

### What the matrix adds as design constraints

1. **RACI on every team slot.** When a PM assembles a team for a project, each person's slot should carry the RACI letter for the step they own. An allocation without a RACI letter is invisible in the matrix game — it doesn't count.

2. **Stage on every project.** A project in the system should know which of the 10 steps it is currently on. Progress through the value chain is the heartbeat metric — not arbitrary percentage.

3. **Value-chain KPIs are the G/D/U/C metrics.** Pipeline Value and Win Rate come from Stage 1-2. UAT Pass Rate and On-time from Stage 3.5 and 3.7. Billable vs Bench from Formation utilization. Internal Kick-off Rate from step 2.7 completion time. The cassette already has most of the raw ingredients — they need to be surfaced against these four targets.

4. **Lobby = matrix navigation.** The Lobby view (department × stage intersection) is where a director sees who is qualified for each cell. Team assembly is picking a name from a cell. The Social Graph in the Lobby shows the cross-functional edges the matrix is designed to create.

5. **9-Box axes should incorporate process readiness.** Performance = delivery outcomes (UAT pass, on-time per step 3.5 / 3.7). Potential = readiness to take on higher-RACI roles (from R to A, or A across larger project scope). The existing 40/60 and 50/50 weights in the talent surface are compatible with this reading — they just need real data piped in from project outcomes.

---

## 9. Immediate Build Sequence (post-review)

Per Dr. Non's direction, do not start building until he reviews this doc. Sequence after approval:

1. RACI data layer — `process_steps` + `raci_matrix` tables (queryable JSON or normalized rows)
2. Matrix-Org overview surface — dept × stage grid, each cell showing RACI-qualified names
3. Project stage tracking — add `current_step_id` to projects; progress = step advancement
4. G/D/U/C KPI strip — compute the four metrics from existing data and surface on home screen
5. Soft Side credential tags — `hia_complete`, `lac_complete`, `resilience_retreat_complete` on employee profiles; surface on talent drawer
6. Game manual update — 10 steps replace the current generic stage names

---

## 10. Game Manual Context — Consulted Live (2026-05-27)

This section captures context that belongs in the game manual but is not yet wired into a UI surface. It comes from three live engagements: the TKC employee workshop (2026-05-27), a Chonburi lecture (2026-05-22), and a Chulalongkorn University meeting (2026-05-27).

### 10.1 The 4P Framework — Non's Evaluation Gate

Before engaging with any smart-city or transformation initiative, Non runs four gates. These apply equally when ninja squads pitch their one-month prototypes.

| P | Full name | The question | Failure mode |
|---|---|---|---|
| **Purpose** | Purpose | Is the problem real? Who suffers if it isn't solved? | "We want to modernize" with no specific pain |
| **Practical** | Practical | Can you build a working prototype in ≤ 1 week with ≤ ฿0 out of pocket? | "We need a 20M baht feasibility study first" |
| **Proof** | Proof | Can you demo it on a phone to a stranger right now? | "We'll have something to show in Q3" |
| **People** | People | Who owns this? Will they still be there in 6 months? | A champion who has no authority to ship |

The 4P is an outside-in gate, not an internal KPI. It answers "should we start?" before 4C answers "will people stay?" and before G/D/U/C measures "did the org improve?"

The game manual should present 4P as the pre-mission checklist ninja squads run before committing to their one-month prototype. A prototype that fails any P should be redesigned, not started.

### 10.2 Case Studies — What Failure Looks Like (Teaching Pattern)

Non's standard teaching pattern: show three failed or stalled smart-city initiatives before revealing the ninja approach. The contrast is the lesson — not "here's what we do" but "here's what everyone else did, here's why it didn't work, here's what we do differently."

| City / Institution | Initiative | What happened | Root cause |
|---|---|---|---|
| **Nakhon Si Thammarat** (Mayor Ganop) | Smart city platform | Platform sold well; company supporting it is now being sued, shareholders receiving court letters. Non was an observer, not the builder. | Procurement-first: bought a system before validating demand. Tommy (the platform builder) was technically excellent but the business model wasn't sustainable. |
| **Chonburi** (provincial) | Smart city dashboard | Non demoed the ninja approach to a Chonburi audience on 2026-05-22. The contrast case: the province had budget for a feasibility study but nothing deployable. | Budget-as-legitimacy: the 20M baht study existed to prove the project was serious, not to build anything. |
| **Chulalongkorn University** | Energy monitoring system | Non showed a working Chula energy dashboard to the Vice-Rector at their 2026-05-27 meeting. The system exists and runs. | Positive contrast, not a failure — included to show that even a world-class institution can get a real system from a ninja build at near-zero cost. |

The NST case is the emotionally resonant one — Non was there, got drunk, came back, and didn't enjoy the mode of work. The Chonburi case is the clean analytical argument. The Chula case is the proof that the approach scales up. The game manual should use all three in that sequence.

### 10.3 The No-Localhost Rule

*Verbatim from Non's working principle, established 2026-05-27 at the Chulalongkorn meeting:*

> "If a system isn't reachable from a stranger's phone the moment it exists, it's not finished — it isn't even started."

**Implementation in the cassette:**
- Every prototype submitted for the one-month mission must have a live public URL. GitHub repo + localhost does not count.
- The `/missions` tracking surface should have a `demo_url` field as a required field (not optional). A mission without a demo URL is in `DRAFT` state regardless of any other status.
- Acceptable deployment paths: Cloudflare Pages (free), Fly.io (free tier), Vercel (free), Railway (free), ngrok tunnel (temporary but counts for demo purposes).
- The rule applies to ninjas and to Non himself. The TKC digital twin is deployed on Fly.io — not localhost.

The game manual should state this rule on the first page of the Ninja Squad section, before describing any technical approach.

### 10.4 Contracting Vehicles — SLIC vs depa

Two contracting paths exist for Non's engagements with Thai institutions. The choice matters because it determines speed, budget type, and accountability structure.

| Vehicle | Full name | Use when | Speed | Budget type |
|---|---|---|---|---|
| **SLIC** | Smart City League Index Collaborative (Non's research consortium vehicle) | The institution wants academic endorsement + a published study + Non's brand attached | Moderate — procurement through research budget | Study budget: covers scoping, workshops, report writing, index methodology |
| **depa** | Digital Economy Promotion Agency | The institution wants government digital infrastructure endorsement | Slow — depa is policy-oriented, approval chains are long | Policy budget: covers compliance and certification, not build costs |

**The practical rule:** if TKC wants Non to bring a third institution into the matrix transformation as a reference case (e.g. "TKC helped Chonburi build X"), the engagement goes through SLIC — it generates a publishable case study and Non's name on the methodology. If TKC wants a government endorsement stamp on its product roadmap, that's a depa path but don't expect it to move fast.

The game manual does not need a full treatment of this — it's context for Dr Non's channel map when deciding how to structure TKC's external validation story.

---

*Last updated: 2026-05-27. Sources: TKC New Chapter deck (May 2026), TKC employee workshop transcript (2026-05-27), Chonburi lecture notes (2026-05-22), Chulalongkorn University meeting notes (2026-05-27).*
