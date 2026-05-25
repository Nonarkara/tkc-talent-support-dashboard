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

**Reconciliation with the original 4C framework:** The 4C (Compensation / Cause / Career / Community) is an individual motivation model — it explains *why a person shows up*. G/D/U/C is an organizational performance model — it explains *what the org measures to know if the matrix is working*. The two frameworks operate at different layers and do not conflict. The 4C feeds morale and retention signals that underpin G, D, and U. Both stay in the cassette; they are different gauges on the same dashboard.

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

*Last updated: 2026-05-25. Source: TKC New Chapter deck, May 2026 management presentation.*
