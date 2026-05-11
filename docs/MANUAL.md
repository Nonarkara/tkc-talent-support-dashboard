```
┌─────────────────────────────────────────────────────────────┐
│                                                             │
│   T  K  C  X  :  T H E   G A M E                            │
│   ────────────────────────────────                          │
│   Player's Manual                                           │
│                                                             │
│   Manual edition       v1.1                                 │
│   ROM revision         v4.6 "Pulse"                         │
│   Issued               May 2026                             │
│   For                  the Kingdom of TKCX                  │
│                                                             │
│   The cassette in your hand is a working operating          │
│   system for a 320-hero kingdom. There is no final          │
│   boss. There is no end credit. You play because the        │
│   kingdom rises, falls, and rises again — and that is       │
│   the whole point.                                          │
│                                                             │
│   Read this before you spend a single Capacity Point.       │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

---

# Table of contents

| § | Section |
|---|---|
| 0 | A note before play |
| 1 | The story — the Kingdom of TKCX |
| 2 | The buildings, the lobby, and the invisible lines |
| 3 | Setting the task — the manager's craft |
| 4 | Assembling a team |
| 5 | Tactics, techniques, tips |
| 6 | Deploying the team — the weekly loop |
| 7 | The PMO — the watcher behind the curtain |
| 8 | Improving your command — competition and cooperation |
| 9 | Lifting all four C's together |
| 10 | The endless game — what victory looks like |
| A | Glossary |
| B | Quick-reference card |
| C | Sample sessions (four, end-to-end) |
| D | Where the screens live |
| E | Manual versioning |

> **Manual revision rule.** This file is part of the cassette. When the ROM bumps (e.g. `v4.6` → `v4.7`), the manual edition bumps too — first digit for engine breaks, second digit for tuning. Read §E before editing.

---

# 0. A note before play

You are not opening a dashboard. You are opening a **game cartridge** that happens to contain a real kingdom of 320 heroes.

Five things you need to accept before page one:

1. **The numbers are a compass, not a verdict.** Chemistry of 78 is a heading, not a grade. The system is a fitness tracker for a workforce, not a credit score.
2. **Every action writes twice.** Postgres is the source of truth. Google Sheets is the human-readable shadow save (the "memory card"). If the two disagree, Postgres wins. If the Sheet is missing a tab, fix the Sheet — never let the game stop writing.
3. **Speed of play matters.** Most loops should resolve in seconds (drag a hero, see the score change). Generative AI is an *input adapter* for prose; it never sits in the live loop. If the model is slow, deterministic scoring takes over.
4. **There is no win condition with end credits.** Like *Sim City*. Like *Animal Crossing*. Like *Dragon Quest III* once you've beaten Zoma and the world keeps turning. You play because the *kingdom* gets better, the *heroes* get better, and the *score* — which is a real share price connected to real revenue — climbs and dips and climbs again.
5. **You are not playing alone.** Other directors are picking heroes off the same roster you're looking at. Other heroes are watching what you do. The PMO is watching the watchers. The kingdom watches the PMO.

If you remember nothing else from this manual, remember those five.

---

# 1. The story — the Kingdom of TKCX

## 1.1 Once upon a time, on a publicly-listed island

TKCX is a kingdom of about three hundred and twenty heroes, headquartered in Bangkok and listed on a stock market that is watching. The kingdom's revenue comes from quests it accepts from other kingdoms — engineering work, integration work, infrastructure work, the kind of unglamorous labour that makes the modern world keep working. Each quest pays in baht. Each completed quest moves the kingdom's chair a little higher. Each failed or late quest costs more than money — it costs *story*, the slow accumulation of "people say good things about TKCX in chat groups and on social feeds" that eventually moves a share price.

This is the kingdom you have inherited.

It is, like most kingdoms, structurally beautiful and operationally tired. Two years ago a wandering consultant came through, gave the king a sermon about design thinking, and left. The sermon was good. The kingdom did not change. When the consultant came back this year, the king's HR Minister admitted what most ministers eventually admit: more sermons would not help. The *kingdom's operating system itself* was the problem.

So the consultant proposed something different. Embed for six months. Build the operating system. Hand it back as a *living game* the kingdom can keep playing after he leaves.

This cassette is that game.

## 1.2 The five tensions of the kingdom

| # | Tension | Symptom in the kingdom |
|---|---|---|
| 1 | Business is **matrix**, structure is **silo** | Quests cross departments; resources don't follow them |
| 2 | Revenue is **project-based**, knowledge **doesn't compound** | Every quest ships and is forgotten by next moon |
| 3 | Talent **exists**, no **capability engine** | Strong heroes leave; mediocre stay |
| 4 | **Speed** collides with **governance** | Castle controls were built for audit, not competition |
| 5 | Innovation is an **initiative**, not an **engine** | No mechanism for idea → prototype → ship → measure → repeat |

Each tension is structural. Each one is fatal if left alone. The whole game exists to take these five and convert them — slowly, visibly, week by week — into five operating *advantages*.

## 1.3 An endless game (Sim City, Animal Crossing, DQ3 after Zoma)

Most games end. *Tetris* ends when the screen fills up. *Mario* ends when you save the princess. The whole genre that this cassette belongs to is the *other* genre — the games that don't end.

- *Sim City* ends only when you stop playing. The city you build becomes the next city's foundation.
- *Animal Crossing* runs in real time, forever, because the relationships you build with neighbours and the shells you collect on the beach are the point — there is no boss.
- *Dragon Quest III*, the cassette this whole system is modelled on, does have a final boss (Zoma). But after you beat him, the world keeps turning. The party stays together. You can grind, you can change vocations at Alltrades, you can go to Tantegel and watch the world go on. Many of us, at age eleven, kept playing for months *after* the credits.

TKCX is one of those games. The kingdom does not end. The chair does not max out. The share price does not converge to a single perfect number. You are not racing to a finish line. You are *running a kingdom* — adding buildings, picking heroes, deploying parties on quests, watching the chair rise, watching the buzz on social media spike when a flagship quest ships, watching it dip when a star hero leaves, picking yourself up, doing it again.

That is the game.

## 1.4 Why a game (and not a dashboard)

Three reasons, in order of importance:

1. **HR Fun Again.** Most HR work is paperwork that nobody loves. A game makes team formation, performance, and growth a thing you *play* — visible, tactile, repeatable, like turning a Rubik's cube.
2. **God's Mode.** A king should be able to see the whole kingdom at once: who works with whom, where the chemistry sits, where the gaps are. A board game is the natural shape for that view.
3. **Moneyball.** You cannot afford a roster of LeBron Jameses. The salary cap forces tradeoffs. Smart allocation beats expensive talent. Build chemistry, don't buy stars. (More on this in §4.3 — the LeBron example is concrete.)

## 1.5 The cassette metaphor

The system is explicitly modelled on a 1988 Famicom Dragon Quest III cartridge.

```
┌──── THE CASSETTE ────────────────────────────────────────┐
│                                                          │
│   ROM CHIP        →  Next.js + TypeScript game logic     │
│   (rules, sprites)   The rules cannot be edited at run.  │
│                                                          │
│   BATTERY SAVE    →  Neon Postgres (Singapore region)    │
│   (the truth)        Every state change writes here.     │
│                                                          │
│   MEMORY CARD     →  Google Sheets                       │
│   (human-readable)   A fire-and-forget mirror of the     │
│                      battery save, for humans who want   │
│                      to inspect the world without        │
│                      opening a SQL prompt.               │
│                                                          │
└──────────────────────────────────────────────────────────┘
```

This is not aesthetic-only. The cassette metaphor encodes a hard rule: every write goes to Postgres *and* fires a `void mirrorX(...)` to Sheets. Sheets will eventually grow formulas that feed derived values back into the game, so the round-trip linkage is sacred.

## 1.6 The 4C compass — why people work

Every feature in the system traces back to one of four motivation drivers. They are not interchangeable. They are not ranked. They are a coordinate system.

| C | What it is | Where it lives in the cassette |
|---|---|---|
| **Compensation** | Money, survival, the hygiene baseline. If too low, nothing else matters (Herzberg). | Salary cap, token economy, Investment Value, Moneyball verdicts |
| **Cause** | Story, dignity, meaningful work. The answer to "why does this matter?". | Project briefings, mission framing, Quest design, Credo "Purpose" pillar |
| **Career** | Flow, growth, mastery. When work isn't work (Csikszentmihalyi). | Quests, XP curve, Alltrades reskilling, Credo "Story" pillar |
| **Community** | Belonging, being known. The Project Aristotle finding. | Lobby, chemistry score, party order, Credo "Belonging" pillar |

The system never optimises a single C. It surfaces *gaps* across all four and gives a director the tools to close them. §9 of this manual is about lifting all four together as a kingdom-wide loop.

## 1.7 What victory looks like

Because the game does not end, "victory" is not a state — it is a *trend*. Four trends, watched together, tell you the kingdom is winning:

```
   ┌─────────────────────────────────────────────────────────┐
   │                                                         │
   │   1.  THE CHAIR  RISES                                  │
   │       Org Grade (S/A/B/C/D/F) climbs and stays high.    │
   │       Wellbeing, capacity balance, dev compliance,      │
   │       output efficiency, retention, team fit — all      │
   │       composite. The chair is the visible signal.       │
   │                                                         │
   │   2.  REVENUE  RISES                                    │
   │       Quarterly billings vs target. The PMO Portfolio   │
   │       Dashboard's headline number. Project Value /      │
   │       Target should run > 90 %, and the slope of        │
   │       Billed / Project Value should bend upward.        │
   │                                                         │
   │   3.  THE BUZZ  RISES                                   │
   │       Mentions of TKCX in industry chats, on LinkedIn,  │
   │       in Bangkok press, in candidate-pipeline           │
   │       conversations. An anomaly *upward* is a tell      │
   │       that the kingdom's flagship quest landed.         │
   │                                                         │
   │   4.  THE SHARE PRICE  RISES                            │
   │       The slow-motion derivative of all three above.    │
   │       Lags the buzz by weeks. Lags the chair by         │
   │       quarters. But it is the only number the           │
   │       kingdom's *island* (Bangkok stock market) can     │
   │       see. Treat it as the long signal.                 │
   │                                                         │
   └─────────────────────────────────────────────────────────┘
```

You will rarely see all four rise in the same week. They rise in a *cascade*: chair leads, revenue follows, buzz lags, share price lags more. When you see all four rising in the same quarter, you are doing the right thing. When you see the chair drop and revenue still rising, you are mortgaging the kingdom's future. Reverse cascades are warning signs (§10 has the playbook).

There is no scenario in which you "beat" TKCX. There are infinite scenarios in which you *grow* it.

---

# 2. The buildings, the lobby, and the invisible lines

The kingdom has *buildings*. Not because we needed metaphor — because TKCX literally has a head office, satellite offices, project sites, and Bangkok DC racks that heroes physically inhabit. The cassette models each as a place a hero can **check into** at the start of the day.

## 2.1 The buildings

```
   ┌─────────────────────────┐    ┌─────────────────────────┐
   │     HQ BUILDING         │    │     SITE / DC RACK      │
   │     (Sukhumvit, BKK)    │    │     (e.g. Bangkok DC)   │
   │                         │    │                         │
   │   most heroes here      │    │   ops + tech on rota    │
   │   biggest lobby         │    │   smaller lobby         │
   │   morning standups      │    │   client-side meetings  │
   └─────────────────────────┘    └─────────────────────────┘

   ┌─────────────────────────┐    ┌─────────────────────────┐
   │  CLIENT-EMBEDDED DESK   │    │     REMOTE / WFH        │
   │  (rotating)             │    │                         │
   │                         │    │  not in any building    │
   │  scout / sales heroes   │    │  but still clocked in   │
   │  per project            │    │  via the bot punch      │
   └─────────────────────────┘    └─────────────────────────┘
```

Not every hero needs to physically be in a building to be "checked in". A scout meeting a client in Phuket is checked into the *embedded-desk* surface; a tech doing deep-work from home is checked in *remote*. The point is that **the kingdom always knows where each hero is, and every hero is somewhere**.

## 2.2 The check-in

Three ways a hero appears on the floor today:

1. **Manual punch from the dashboard.** Click the check-in panel on the right of the Lobby tab — toggles the hero in (or out). Recorded in `attendance_log` (db migration `022`), mirrored to the `Attendance` Sheets tab.
2. **Self-punch from the bot.** Heroes can DM the LINE / Telegram bot ("in", "out", "remote"); same DB write, same mirror.
3. **Auto-punch from a calendar event.** A hero with a 09:00 client meeting is auto-checked-in 30 minutes before the meeting starts.

All three paths land in the same `attendance_log` row. Every punch carries `source` so the kingdom knows whether the hero punched themselves in or whether HR did it for them.

## 2.3 The lobby — what you actually see

Open the **Lobby tab** in /command-center. You see a flat top-down floor — the kingdom's open ground floor. Every hero who has clocked in today walks around as a 16×16 sprite.

Two layers of physics drive the motion:

- **Gentle wander** toward a per-agent goal. A hero who is "in for the day" drifts in slow circles. A hero who has just punched out drifts toward the door.
- **Affinity** — a soft pull between heroes who share a connection. This is the *invisible line* the user keeps asking about. The lines are there. They are just rendered as the *gravitational field* between heroes, not as drawn arrows. (You can switch the Lobby into "graph mode" — see §2.5 — and the lines become visible.)

## 2.4 What the invisible lines connect

Five connection layers feed the affinity pull, in roughly this order of strength:

```
┌──── INVISIBLE LINES (connection layers) ────────────────────┐
│                                                             │
│   1.  PROFESSION  (archetype)                               │
│       Tech ↔ Tech, Sales ↔ Sales, etc. Strongest pull       │
│       because it correlates with daily working language.    │
│                                                             │
│   2.  WORKPLACE TEAM  (current project allocation)          │
│       Heroes on the same active project pull each other     │
│       into proximity. The team forms a cluster on the       │
│       floor whether anyone tells them to or not.            │
│                                                             │
│   3.  ORG GROUP  (department / division / สำนัก)            │
│       Same line-management, same coffee machine, same       │
│       quarterly review. The classical org chart line.       │
│                                                             │
│   4.  FRIENDSHIP  (interaction history)                     │
│       Heroes who have repeatedly logged interactions in     │
│       the `interactions` table pull each other across       │
│       the floor even if their archetype, team, and dept     │
│       all differ. This is the most *informative* line —     │
│       it shows you what the org chart hides.                │
│                                                             │
│   5.  PERSONAL RELATIONSHIP  (recorded — opt-in)            │
│       Mentor/mentee pairs, declared friend-of-the-floor,    │
│       buddy-system pairings, declared romantic              │
│       partnerships (only with both parties' consent).       │
│       Recorded by HR with permission; never inferred.       │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

Layers 1–3 are derived from data the kingdom already has. Layer 4 is derived from punches the cassette logs every minute. Layer 5 is *only* what HR has been explicitly told and given permission to record. The cassette never infers a personal relationship from interaction frequency alone — that's a line we deliberately do not cross.

## 2.5 Reading the floor — three patterns

The floor is a low-resolution social graph. Three patterns to look for:

| Pattern | What it usually means | What to do |
|---|---|---|
| **Tight cluster of one archetype** | Healthy department cohesion, *or* a silo forming | Sample two members in a 1:1 — is it pride or insularity? |
| **Lone walker** | Either a deep-work hermit (good) or social isolation (bad) | Cross-reference with HP and last-interaction date. Low HP + lone walker = intervene this week. |
| **Two heroes always near each other** | Real chemistry, not chart chemistry | Star them. They're a candidate pair for the next team. |

Switch the Lobby into **graph mode** (top-right toggle, Obsidian-style) and the soft-pulls become drawn lines. You can filter by layer (only profession, only friendship, only personal). Useful when scouting for a specific gap.

The Lobby will not tell you *why* — for that, open the Tome (§5.5).

## 2.6 The interaction log

When two sprites occupy the same proximity radius for long enough, the cassette logs an `interaction` (see `interactions` table, `db/022`). A throttle prevents flooding (one chat per pair per 10 minutes; six per minute kingdom-wide). The log is queryable directly. The honest reading: **high-frequency pairs across departments are the hidden chemistry the formal org chart does not show**. They are gold for cross-functional team formation.

## 2.7 Scouting scenario — finding a Scout for Sapphire

You're running Team Sapphire (the worked example in §4.8). Three weeks in, your Scout Khun May's HP has slid into the high 50s; she's been doubling on a second project. You want a fresh Scout for Phase 2 next cycle, and you don't know who to put there.

So:

1. Open the **Lobby**. Filter by archetype = scout. Three sprites are visible today.
2. Watch them for 60 seconds. One drifts toward the Tech cluster — the cluster Khun Tong sits in. That's signal: **they already orbit your team without being on it**.
3. Open that hero's **Tome**. Last-30-days log: HP 78, Form 6.4, last interaction with Khun Tong was three days ago. Compensation score is healthy. Career score is yellow — they want growth.
4. Verdict: pick them. Cheap (24 CP), already has rapport with Tong, and the deploy is itself a Career-pillar move for them.

That five-minute scout would take an HR director two weeks of meetings without the floor.

---

# 3. Setting the task — the manager's craft

You cannot build a team until somebody, somewhere, has filed a *task* for the team to take on. In this kingdom, tasks are **projects** — quests the kingdom has accepted from a client in exchange for baht. They are how the kingdom earns. Without filed tasks, nothing else in the cassette has anything to bite into.

This section is about the manager's first move: file the task, set its attributes, lock it, and send it out to the directors.

## 3.1 What a task actually is

A filed project carries six things:

```
   ┌─── A FILED PROJECT (a task on the board) ──────────────────┐
   │                                                            │
   │   1. NAME             "5G IoT Pilot — Phase 1"             │
   │   2. SLOT BOM         how many seats per attribute         │
   │   3. PRIORITY WEIGHTS where the Fit Matrix is strict       │
   │   4. DURATION         in months → drives the Gantt         │
   │   5. REVENUE          monthly billing rate                 │
   │   6. MARGIN TARGET    e.g. 25% — what counts as a "win"    │
   │                                                            │
   │   Once Saved, all six fields LOCK. The Formation board     │
   │   reads from them and the cap math derives from them.      │
   │   To change anything, the manager must Unlock the field    │
   │   (re-input authentication), edit, then Save again.        │
   │                                                            │
   └────────────────────────────────────────────────────────────┘
```

That is the whole task surface. Six fields. Filed once, locked, lived with for the rest of the project's life.

## 3.2 The five attributes — the slot BOM

A project's slot BOM is its *bill of materials*: how many seats it needs in each attribute family.

| Attribute | What the seat does | Real-world title at TKC |
|---|---|---|
| **technical** | Builds, architects, debugs the work itself | Engineer, developer, infra ops, integrator |
| **sales** | Wins the client, holds the account | Account manager, BD lead, presales |
| **marketing** | Positions, narrates, launches the story | Comms lead, content, launch coordinator |
| **outsourcing** | Procures, vendors, partner coordination | Procurement officer, vendor manager |
| **paperwork** | Legal, finance, compliance, admin | Contract reviewer, finance ops, compliance |

These five are placeholders that the kingdom will tune later — Dr Non has signalled that "procurement" may be a clearer name than "outsourcing" for the role family — but the *shape* is right. Five families covers everything a TKC project needs.

A typical slot BOM for a 6-month integration quest:

```
   technical    × 3      sales     × 1      marketing × 1
   outsourcing  × 2      paperwork × 1
   ──────────────────────────────────────────────────────
   slots total: 8
```

You set the BOM by clicking each row in the project's Brief drawer, hitting `+`/`−` to set the count, then Save.

## 3.3 The priority weights

The slot BOM tells the kingdom **how many** of each family the project needs. The priority weights tell the kingdom **how strict to be on each family** when scoring the team.

The five weights sum to 10 — like five planks balancing on a single fulcrum. A weight of 4 on `technical` means a missing tech seat hurts the Quality score *twice as much* as a missing weight-2 seat would.

```
   {tech: 5, sales: 2, marketing: 1, outsourcing: 1, paperwork: 1}
                                                    sum = 10
```

The default (2/2/2/2/2) treats every family equally. For an engineering-heavy quest, you push the technical weight up. For a stakeholder-management quest, you push sales and marketing up. There is no "right" answer — only the answer that reflects the actual shape of the work.

## 3.4 The Save → Lock workflow

Every field on a filed project is **lockable**. Locking is the cassette's way of saying "this is the brief, no more drift." The flow:

```
            ┌──────────────┐
            │  Manager     │
            │  edits field │
            └──────┬───────┘
                   ▼
            ┌──────────────┐                  ┌─────────────┐
            │   Save       │ ───── locks ────►│  LOCKED     │
            └──────────────┘                  └──────┬──────┘
                                                     │
                                                     │  director sees the brief.
                                                     │  cap math derives from it.
                                                     │  Formation board scores
                                                     │  teams against it.
                                                     ▼
                                              ┌─────────────┐
                                              │  someone    │
                                              │  wants to   │
                                              │  change it  │
                                              └──────┬──────┘
                                                     ▼
                                              ┌─────────────┐
                                              │  Unlock     │  re-authenticates,
                                              │             │  records who & why
                                              └──────┬──────┘  in audit log
                                                     ▼
                                              ┌─────────────┐
                                              │  edit       │
                                              │  Save again │  re-locks
                                              └─────────────┘
```

Why the explicit lock? Because every downstream calculation — readiness, salary cap, Gantt timeline, PMO health roll-up — assumes the brief is *stable*. If managers could silently nudge the BOM at 11pm before sprint lock, the readiness score would be lying about what it scored against. The lock makes drift expensive enough to think twice about. The unlock makes it possible when really needed, and *audited* every time. Every Unlock event lands in `game_adjustment_log`.

## 3.5 The duration → the Gantt chart

A project must declare **how many months** it expects to take. This is not a decoration — it drives three downstream things at once:

1. The **Gantt chart** for the project, drawn on the Formation tab and rolled up into the PMO Portfolio Dashboard.
2. The **monthly billing rate**, which is project total revenue ÷ duration in months.
3. The **monthly salary cap**, which is monthly billing rate ÷ 10.

So a ฿24M, 12-month quest has:
- Monthly billing rate = ฿2M/month
- Monthly salary cap = ฿200k/month = 200 CP

Same kingdom, same math, different scale.

The Gantt chart shows every active project as a horizontal bar from start month to end month, colour-tinted by project status. The rows stack so you can see, at a glance, which months the kingdom is over-committed in. (The PMO sees the same Gantt; §7 covers their reading.)

## 3.6 The revenue and the margin target

Two more numbers complete the brief.

- **Revenue.** Total contract value. ฿24M for the quest above. Stated up front because it sets the salary cap and feeds the 10× viability rule.
- **Margin target.** The percentage of revenue the kingdom expects to keep as profit. Default is **25 %**. A 25 % margin on a ฿24M project = ฿6M kept, ฿18M spent on payroll + overhead + delivery.

The margin target is the most useful sanity check on the cap math. If a director assembles a team that fits under the cap but blows the margin (because of overhead, vendor costs, contingency), the project is profitless even when delivered. The Formation tab shows projected margin live next to projected payroll. **A team that is under-cap but breaches the margin target is still a bad team.**

The Score for cycle (§6.6) multiplies by margin in three brackets:
- > 20 % → 1.5×
- 18 – 20 % → 1.2×
- < 18 % → 0.8×
- < 12 % → 0.5×

So picking a 25 % target is also picking the headroom: anything that delivers in the 18–20 % zone is still a multiplier > 1, but tight. Below 18 %, the kingdom is paying you to play.

## 3.7 Voice-mode adjustment (Wispr Flow)

The cassette will eventually let any authorised role **speak** an adjustment instead of typing it. The pipeline:

```
   manager opens project → presses 🎙️ → speaks
        │
        ▼
   Wispr Flow API transcribes (low-latency speech-to-text)
        │
        ▼
   the transcript is parsed for structured intent
   (e.g. "drop the marketing weight to 0, raise paperwork to 3,
    and shrink duration from 12 to 9 months")
        │
        ▼
   the cassette displays the proposed Brief diff side-by-side
        │
        ▼
   manager confirms → fields Unlock + Save in one move
        │
        ▼
   audit log captures the original transcript verbatim, in
   case the parse was wrong and someone needs to read what
   was actually said
```

Why voice? Two reasons. (1) It is faster to speak the change than to find five form fields, especially during a meeting. (2) It captures **observation alongside the change**. When HR says "Khun May seems exhausted, drop her FTE on Sapphire to 0.5 for the next two weeks", the cassette doesn't only adjust the FTE — it also writes the *observation* ("seems exhausted") into Khun May's Chronicle as a HR-sourced signal. The act of editing becomes the act of recording.

Two principles govern voice mode:

- **Authorisation is per-role.** HR can adjust morale signals and FTE. Directors can adjust priority weights and BOM on projects they own. The PMO can adjust revenue/margin (because they're the authority on those). The cassette refuses to apply a change the speaker isn't authorised to make.
- **Diff-confirm-then-write.** No write happens without the manager seeing the proposed diff first. The cassette is fast, not autonomous.

(Voice mode is on the roadmap; the pipeline above is the design. Wispr Flow integration lands in a future ROM rev.)

## 3.8 Worked example — filing the Sapphire brief

The HR Minister hands the manager a one-line ask: "5G IoT pilot, single-client deployment, Phase 1, get it done before Q4."

The manager opens a new project on the Formation board. Twelve seconds of work later:

```
   NAME             5G IoT Pilot — Phase 1
   SLOT BOM         technical × 3, sales × 1, marketing × 1, paperwork × 1
   PRIORITY WTS     {tech: 5, sales: 2, marketing: 1, paperwork: 2}      sum=10
   DURATION         3 months  (Q3, ending end of September)
   REVENUE          ฿6M total contract  →  ฿2M/month billing rate
   MARGIN TARGET    25 %
                    → cap = ฿2M / 10 = 200 CP / month
                    → annual OPEX at full cap = ฿24M  (so the 10× rule
                      requires the full programme — pilot + scale-up —
                      to clear ฿24M annual; Phase 1 alone is fine
                      because the cap usage will be intermittent).
```

Hits Save. All six fields lock. The brief drops onto the Formation board. Directors can now pull it open and start dragging heroes onto it.

The next time anyone wants to tweak the brief — say, the client expands the scope and the quest grows from 3 months to 4 — the manager has to Unlock, edit duration, Save again. The audit log captures it. The Gantt redraws. The cap stays at 200 CP/month (because billing rate stays at ฿2M/month — only the duration grew). No surprise to the team mid-cycle.

---

# 4. Assembling a team

This section is the heart of the game. Read it twice.

## 4.1 The two-sided puzzle

Team formation is a cross-product. On one side, the **task** declares what shape of work it needs (filed in §3). On the other, **people** declare what shape of work they are.

```
   TASK SIDE (filed, locked)             PEOPLE SIDE (the roster)

   Project slot BOM                      Heroes (employees)
   ─────────────────                     ────────────────────
   technical    × 3                      archetype   (one of 7)
   sales        × 1                      skill levels + freshness*
   marketing    × 1                      attributes  (STR/INT/WIS/
   outsourcing  × 0                                   CHA/DEX/CON)
   paperwork    × 1                      party row   (front/mid/back)
                                         FTE         (1.0 or 0.5)
   priority weights  (sum = 10)
   monthly cap       (in CP)
   monthly billing rate (THB)
   margin target     (default 25%)

   *Freshness = how recently the hero used the skill in real work,
    aged by month. Stale (> 6 months unused) drops a skill's effective
    contribution toward Quality. Used by the Standards Workshop drawer.
```

A team is a set of **assignments**, each one a pairing `(employee, slot dimension, party row, FTE)`. The Fit Matrix scores each pairing; the readiness formula scores the whole set.

## 4.2 The roster

Open the **Roster tab**. You see all 320 heroes as PlayerCards, filterable by:

- archetype (captain / tech / sales / ops / scout / fighter / goofoff)
- department / division
- role level (staff / senior / manager / director / deputy_md / md)
- skill keyword search ("kubernetes", "Mandarin", "MEA-region")
- search by name

Each card shows the hero's archetype, level, ICA Index (Impact + Collaboration + Advancement), salary in CP, and a tiny health line (HP / MP / Form). Clicking a card opens the Tome (the deep-read; §5.5).

## 4.3 The drag-and-drop — and the LeBron problem

To staff a slot, drag a hero from the roster onto the slot icon on the Formation tab. Done. The cassette computes the fit (§4.5), the cost (salary × FTE), and updates the team's running totals live.

You can drag five LeBron Jameses onto a single team. Nothing in the UI prevents it. But:

> **Five superstars × ~฿4M/month each = ฿20M/month payroll**
> **on a project that bills the kingdom ฿5M/month** = ฿15M/month *loss*.

The salary-cap meter at the top of the board turns red. The Save button greys out. The team cannot lock.

This is the single most important thing the cassette enforces. **You cannot stack the kingdom's strongest heroes on one quest.** The math is hard. You either reach for cheaper heroes, reach for half-FTE allocations of the strong ones, or — and this is the trap — you talk to the manager about expanding the brief (§4.9 Adjusting the task).

## 4.4 The seven archetypes

Names follow Famicom DQ3 (1988) canon, not remake-era substitutions. The TKC role in the right column is the rule-of-thumb mapping.

| Archetype | DQ3 name | TKC role | Strong on slot | Weak on slot |
|---|---|---|---|---|
| **Captain** | Hero | The team anchor; strategic generalist | Sales, marketing, outsourcing | (no clear weakness) |
| **Tech** | Wizard | Engineer; deep technical IC | Technical | Sales, marketing |
| **Sales** | Merchant | Account, negotiation, revenue | Sales, marketing | Technical |
| **Ops** | Soldier | Delivery, execution, closing | Outsourcing, paperwork | Marketing |
| **Scout** | Pilgrim | Generalist; cross-functional eyes | (balanced 0.6–0.7 everywhere) | (no peak) |
| **Fighter** | Fighter | Junior IC, agile, scrappy | Technical | Paperwork |
| **Goof-Off** | Goof-Off | Wildcard personality | (none cleanly) | (almost everything) |

The first five are the canonical party. **Fighter** and **Goof-Off** are present in code and intentionally rare on the floor — Fighter for true junior ICs, Goof-Off for the rare wildcard whose value is morale and chaos rather than slot fit.

## 4.5 The Fit Matrix

This is the law of who-fits-where. Read column-down, not row-across, when you're filling a slot.

```
                technical  sales  marketing  outsourcing  paperwork
   captain         0.7      0.9      0.8         0.8         0.7
   tech            1.0      0.4      0.5         0.6         0.5
   sales           0.4      1.0      0.9         0.6         0.5
   ops             0.6      0.5      0.4         0.9         1.0
   scout           0.7      0.7      0.7         0.6         0.6
   fighter         1.0      0.7      0.4         0.6         0.3
   goofoff         0.3      0.4      0.5         0.2         0.2
```

- **1.0** — native fit. Hero shines in this seat.
- **0.7** — acceptable. No friction.
- **0.4–0.6** — stretch. Works but doesn't shine.
- **≤ 0.3** — miscast. Avoid unless deliberate.

## 4.6 The salary cap (full math)

Money is hidden from the play surface, but it never leaves the math. Read the units carefully — they trip up first-time directors.

> **Project monthly billing ÷ 10 = monthly team salary cap.**
> If a project bills the client ฿2,000,000 per month, the team operating it has a ฿200,000-per-month payroll ceiling.
> Every employee has a real monthly salary. **1 CP = ฿1,000/month.**
> A ฿200k cap is therefore **200 CP** of team payroll.

That ratio is the **10× viability rule**, applied annually: project annual revenue must be at least 10× the team's annual cost. A team running at the full ฿200k/month cap costs ฿2.4M/year in payroll. The project must therefore generate at least ฿24M in annual revenue to be viable. Below that, the math does not work and the kingdom should not bid the work.

## 4.7 Party order — front, mid, back

Every assignment has a row.

| Row | Code | Meaning | Used for |
|---|---|---|---|
| Front | `1` | Takes the hits. Public-facing. | Captain, presenter, account lead |
| Mid | `2` | Default. The body of the team. | Most ICs |
| Back | `3` | Protected. Sees patterns the front row can't. | Scout, analyst, the long-game thinker |

Party order is its own bonus system. **Captain in the front + Scout in the back = +5 chemistry**, computed inline in `FormationCanvas.formationBonus()` and added to the readiness score below.

## 4.8 The readiness formula

When you stop dragging, the canvas computes:

```
   readiness = coverage × 0.40
             + quality  × 0.25
             + party_split × 0.05
             + chemistry × 0.15
             + morale    × 0.15
```

| Component | What it is | What raises it | What lowers it |
|---|---|---|---|
| **coverage** | % of slot BOM that is filled | Fill every seat, including paperwork | Empty slots, especially in your highest-priority dimension |
| **quality** | Mean fit-matrix score across all assignments | Native fits (1.0) | Stretch fits (0.4–0.6) and miscasts |
| **party_split** | DQ3 EXP-split: are you over-stuffing slots? | Match headcount to slot demand | Hoarding three Wizards in a slot that needs one |
| **chemistry** | Belbin / Tuckman / personality balance | Diverse archetypes; cohesion in CHA/CON | Groupthink (all same archetype, all same OCEAN profile) |
| **morale** | Aggregate of HP / MP / Form across the chosen heroes | Heroes with green vitals | Anyone HP < 40 or Form < 4.0 |

A team can be 100% covered and still score 60 — because three of the Techs are stretched into Sales seats, two heroes are at HP 30, and there's no Scout in the back. The number tells you **where to look**, not whether to ship.

## 4.9 Worked example — assembling Team Sapphire

The brief: **5G IoT Pilot — Phase 1, Q3 launch, project bills ฿2M/month → cap = 200 CP.** This is a focused first-phase deployment, not the full programme. Phase 2 with the vendor stack will get its own slot BOM and its own team.

The slot BOM the project lead has filed:

```
   technical    × 3      (the engineering build itself)
   sales        × 1      (one client face)
   marketing    × 1      (launch story)
   paperwork    × 1      (procurement, contracts)
   ───────────────────
   slots total:  6        priority weights:
                          {tech: 5, sales: 2, marketing: 1, paperwork: 2}
```

A working draft, chosen from the floor — ambitious 7-hero pick that includes a Scout in the back row to chase the +5 chemistry bonus:

| Hero | Archetype | Salary (CP) | Slot | Fit | Row | FTE |
|---|---|---|---|---|---|---|
| Khun Pim | Captain | 50 | sales | 0.9 | front | 1.0 |
| Khun Tong | Tech | 38 | technical | 1.0 | mid | 1.0 |
| Khun Gun | Tech | 32 | technical | 1.0 | mid | 1.0 |
| Khun Aey | Fighter | 22 | technical | 1.0 | mid | 1.0 |
| Khun May | Scout | 24 | technical | 0.7 | back | 1.0 |
| Khun Som | Sales | 30 | marketing | 0.9 | mid | 1.0 |
| Khun Boy | Ops | 18 | paperwork | 1.0 | mid | 1.0 |

**Cap math.** Payroll = sum of salary × FTE for each hero:

```
   50 + 38 + 32 + 22 + 24 + 30 + 18 = 214 CP
       → ฿214,000/month          OVER CAP by 14 CP
```

Coverage is also problematic: 4 heroes are pointing at 3 technical seats. The party-split nudge will fire.

You have three legal moves:

1. **Drop Khun May to 0 FTE**, give up the +5 chemistry bonus, and accept a 3-Tech load that exactly matches BOM. Saves 24 CP. New payroll 190 CP — under by 10. But you lose the Scout, lose the back-row bonus, and lose her cross-functional eyes for the cycle.
2. **Drop Khun Aey** entirely. Saves 22 CP. New payroll 192 CP — under by 8. Tech load drops from 4 to 3 — a clean fit. May stays in the back row, Pim stays in the front, +5 chemistry bonus is preserved. Quality drops a touch because Aey was a 1.0 fit and the team now relies on May's 0.7 for the third tech seat.
3. **Adjust the task** (next sub-section). Talk to the project lead and reshape the BOM.

Move 2 is the cleaner trade — keep the chemistry bonus, take the small quality hit. Move 3 is the right move when the brief itself was wrong, not when you got lazy on selection. Read 4.10 before reaching for it.

After Move 2:

```
   coverage    100   ░░░░░░░░░░  (all 6 slots filled)
   quality      87   ▓▓▓▓▓▓▓▓▓░  (lost Aey's 1.0 fit; May is 0.7)
   party_split 100   ▓▓▓▓▓▓▓▓▓▓  (no over-stuffing; tech 3 / 3)
   chemistry    78   ▓▓▓▓▓▓▓▓░░  (73 base + 5 from front/back rows)
   morale       72   ▓▓▓▓▓▓▓░░░  (Khun Tong currently HP 58)
   payroll     192 CP  (under cap, ฿8,000 of headroom)
   margin proj. 26%   (above the 25% target)
   ──────────────────────────────
   READINESS    89   ▓▓▓▓▓▓▓▓░░    (= 100·.40 + 87·.25 + 100·.05 +
                                      78·.15 + 72·.15)
```

A readiness of **89** is healthy. The morale dip points you to one specific conversation to have with Khun Tong before sprint lock — not a reason to re-pick the team.

## 4.10 Adjusting the task to fit the team

Sometimes the team you have can't fill the brief. Before reshuffling people across other projects (which is expensive — see §6.5 disruption hits), ask whether **the brief is actually right**. The manager — the same manager who filed §3 — has to Unlock the brief before you can change it.

There are four legitimate moves to adjust the task:

### A. Re-weight priorities (cheap, fast)

Priority weights live on `projects.priority_weights` and sum to 10. They tell the Fit Matrix where to be strict.

If your brief was filed `{tech: 4, sales: 1, marketing: 1, outsourcing: 2, paperwork: 2}` but the work is actually 70% engineering, re-file it as `{tech: 6, sales: 1, marketing: 1, outsourcing: 1, paperwork: 1}` and the readiness math will stop punishing you for under-filling outsourcing.

### B. Reshape the slot BOM (medium cost)

If the brief asks for 5 technical and 2 outsourcing but you only have 3 strong techs available this cycle, **shrink the BOM**. A 7-person team that ships beats a 10-person team that misses sprint lock. Document the cut in the project Chronicle so leadership sees the trade.

### C. Split into sub-quests (high cost, high reward)

A 4-week Main Quest worth 200 XP can become two 2-week Side Quests worth 100 XP each, run by two different (smaller) teams. Coverage problems vanish. Knowledge spreads. You pay one switching cost up front instead of two contention costs every week.

### D. Defer or scope down (last resort, but real)

Sometimes the right move is to take the task off this cycle's board and put it on the next one. The cassette has no penalty for *not playing* a card — only for playing it badly. Deferring with a written reason ("waiting for Khun Tong's HP to recover from Project Ruby finishing") is *better* command than forcing a deployment that will end as a -20 in the leaderboard.

### Decision flow

```
        ┌─────────────────────────────┐
        │  Readiness < 70 on draft?   │
        └────────────┬────────────────┘
                     ▼
        ┌─────────────────────────────┐
        │  Can the team even ship the │  NO   ┌──────────────────┐
        │  smallest viable version    │──────►│  D. DEFER        │
        │  this cycle?                │       │  Move to next    │
        └────────────┬────────────────┘       │  cycle's board.  │
                  YES                         └──────────────────┘
                     ▼
        ┌─────────────────────────────┐
        │  Is the gap in coverage     │   YES   ┌─────────────┐
        │  or in quality?             │────────►│  COVERAGE   │
        └────────────┬────────────────┘         └──────┬──────┘
                  QUALITY                              │
                     │                                 ▼
                     ▼                       ┌─────────────────────┐
        ┌─────────────────────────┐          │ A. Re-weight, OR    │
        │ Is the miscast in       │          │ B. Reshape BOM, OR  │
        │ a 4+ priority slot?     │          │ C. Split sub-quests │
        └────────────┬────────────┘          └─────────────────────┘
              YES    │    NO
                     │
            ┌────────┴───────────┐
            ▼                    ▼
   ┌────────────────┐   ┌──────────────────┐
   │ Adjust the     │   │ Ship as-is and   │
   │ task (A or B)  │   │ note in Chronicle │
   └────────────────┘   └──────────────────┘
```

---

# 5. Tactics, techniques, tips

The system rewards discipline. Most directors lose points to repeatable mistakes long before they lose them to bad luck.

## 5.1 The Front-Row +5 trick

The cheapest +5 chemistry in the game. Set your captain to row 1 (front) and your scout to row 3 (back). The bonus stacks on top of the chemistry score before the readiness multiplier. On a borderline-deploy team, this single move can flip a 68 into a 73.

If you don't have a scout on the cycle, **set a generalist hero — usually a captain or another scout from a sister team — to row 3 for this project**. The bonus is computed on row position, not vocation, so the back-row hero gets you partial credit. Do **not** trigger an Alltrades reskilling just to harvest the bonus — Alltrades is a permanent vocation change with a real capability dip (see §5.5), not a tactical chemistry move.

## 5.2 Anti-hoarding (the party-split rule)

If the brief calls for 3 technical seats and you stuff 5 Wizards in there, the DQ3 EXP-split kicks in: per-head contribution drops, two of those Wizards are *dead weight on this project*, and they're unavailable to the project on the next mat that desperately needs a tech.

`party_split_pct` in the readiness formula is small (0.05) by design — it doesn't blow up your score, it nudges you. But the real penalty is structural: you starve the next project. Watch the number; it tells you when you're hoarding.

## 5.3 Belbin balance — action / people / thinking

A common failure mode: nine engineers on a project that needs to ship to a client. Coverage 100, chemistry 45.

Use the rule of three:

```
   ACTION       THINKING        PEOPLE
   ──────       ────────        ──────
   ops          tech            captain
   fighter      scout           sales
   captain                      goofoff (rare)
```

Every team needs at least one of each. Even a small team of three. A two-Tech, one-Scout team is a thinking team — it will design beautifully and ship nothing. A two-Sales, one-Captain team is a people team — it will sell beautifully and build nothing. Mix.

## 5.4 The 80% rule (do not run heroes at 100%)

A fleet that runs every truck at 100% utilisation and skips maintenance destroys the fleet inside two years. People are no different.

| Utilisation | Reading |
|---|---|
| < 60% | Yellow — under-used. Idle at the inn. Lobby will show this hero loitering. |
| 60–85% | **Green — optimal.** |
| 85–100% | Red — over-used. HP will drop within four weeks. |
| > 100% | Critical — the cassette will block new assignments. |

Aim every team for ~80%. Plan slack into your roster. Slack is what lets you say *yes* to next month's surprise project.

## 5.5 Alltrades Abbey — reskilling without losing the soul

Canon: at level 20, an employee can change vocation. Stats halve. Level resets. Spells (institutional knowledge) are kept.

In TKC: this is a sanctioned **internal career move**. Use it when:

- A senior Tech wants to try Sales.
- A Sales hero needs to learn Ops to be promoted to a Director track.
- A scout has plateaued and wants to re-spec.

Cost is *visible* (capability dip short-term). Reward is *real* (institutional memory survives). The ledger is `vocation_changes` (POST `/api/alltrades`); it mirrors to the `VocationChanges` Sheets tab. Show the cost honestly in the conversation. Never use Alltrades as a stealth demotion.

## 5.6 Power-up chips — use them, don't hoard them

Limited per year. Hoarded chips are wasted chips.

| Chip | Limit | When to use |
|---|---|---|
| **Wildcard** ("Restructure") | 1 / half-year | One-shot full rebuild after a major surprise (acquisition, exec change, big client lost) |
| **All Hands** ("Bench Boost") | 1 / quarter | A demo week or hackathon — reach into bench heroes |
| **Spotlight** ("Triple Captain") | 1 / quarter | A make-or-break presentation by a single hero |
| **Task Force** ("Free Hit") | 2 / year | A one-sprint cross-functional team that doesn't survive past sprint end |

Rule of thumb: if you finish Q2 with all your chips unspent, you played too cautiously. Spend them on visible moments.

## 5.7 The traps

These cost real points. Memorise them.

- **Groupthink.** All same archetype + all similar OCEAN scores = 100% chemistry on paper, 30% adaptability under stress (Janis). The system will warn you with a chemistry "warning" insight; trust it.
- **Under-tasked stars.** A Captain at 50% on a low-priority project is a hero rotting. Their Investment Value will *fall*, their Form will sag, and a competing director will trade for them at a discount.
- **Hidden flight risk.** A hero with low Compensation score but high Career Form is six months from leaving. Read the 4C grid in §9 monthly.
- **Captain-only optimisation.** Every director picks the same Captain. The Investment Value rises, the cap math eats you. The right move is sometimes to pick the second-best Captain — which is precisely how Moneyball wins.
- **Storming-stage panic.** New teams *should* friction in week one (Tuckman). Pulling the team apart on day five because chemistry is 62 is the most common rookie error. Wait two weeks.

---

# 6. Deploying the team — the weekly loop

You have a team. You have a readiness number. The brief is locked. Now you ship — and you keep shipping, week after week, until the project closes.

## 6.1 The sprint lock

```
   Mon 09:00 ┃ SPRINT LOCK   — formation closes for the cycle
   Tue–Thu   ┃ work executes  — lobby + chronicle keep humming
   Fri 16:00 ┃ SPRINT REVIEW  — outcomes recorded
   ───────────┃────────────────────────────────────────────────
   weekly     ┃ team scores update                             }
   monthly    ┃ H2H matchups + leaderboard refresh             }  see §8
   quarterly  ┃ league standings + chip refresh                }
   annual     ┃ season review + trajectory + awards            }
```

After Monday 09:00 you can still move heroes between teams, but every transfer past your two free transfers per quarter costs a **disruption hit** (-4 from team score, FPL-style). If you must transfer mid-cycle, do it for a *named reason* and write it into the Chronicle.

## 6.2 The double-write (mirror discipline)

Every state-change path writes to **Postgres first**, then fires a fire-and-forget mirror to the relevant Google Sheets tab. The mirror module is `src/lib/sheets-mirror.ts`; the tab catalogue is `src/lib/sheets-tabs.ts`.

If Sheets credentials are absent (e.g. local dev without Google access), mirrors must **silently no-op** — never break the Postgres write. If a tab is missing, run `POST /api/sheets/bootstrap` and try again. If `GET /api/sheets/health` reports anything but `missing: []`, fix the Sheet before the next sprint.

## 6.3 The weekly observation feed

Every week, the team's *operating reality* gets fed back into the cassette via two streams that arrive in parallel:

```
   ┌──── QUALITATIVE STREAM ─────────────────────────────────────┐
   │                                                             │
   │   HR observations, manager notes, peer recognitions,        │
   │   sprint retrospective summaries.                           │
   │                                                             │
   │   Source: voice (Wispr Flow, §3.7), keyboard, bot DM.       │
   │   Authorised by: HR, the team's manager, the team itself    │
   │       via peer-recognition.                                 │
   │                                                             │
   │   Form: prose. Free text. Sometimes a single sentence       │
   │       ("Team ran the demo Friday — client clapped").        │
   │                                                             │
   └─────────────────────────────────────────────────────────────┘
                              │
                              ▼
   ┌──── QUANTITATIVE STREAM ────────────────────────────────────┐
   │                                                             │
   │   Productivity numbers from the kingdom's other systems:    │
   │   timesheet hours, ticket-close rates, code-review          │
   │   throughput, sales calls logged, vendor SLA hits.          │
   │                                                             │
   │   Source: integrations with the kingdom's other tools.      │
   │   No human authoring needed; numbers flow continuously.     │
   │                                                             │
   │   Form: structured. Plain numbers per metric per week.      │
   │                                                             │
   └─────────────────────────────────────────────────────────────┘
                              │
                              ▼
   ┌──── THE TRANSLATION LAYER ──────────────────────────────────┐
   │                                                             │
   │   Both streams land in the team's weekly snapshot. Prose    │
   │   gets sentiment-scored (numerically) by the cassette       │
   │   and slotted as adjustments to morale, trust, energy,      │
   │   clarity, momentum, risk. Numbers map directly to the      │
   │   same six axes via deterministic rules.                    │
   │                                                             │
   │   Six values × one team × one week = six new bars on the    │
   │   team's efficiency strip. The bars are what every other    │
   │   surface (Formation, Cockpit, PMO) reads from.             │
   │                                                             │
   └─────────────────────────────────────────────────────────────┘
```

The two streams keep each other honest. A team whose qualitative stream is glowing ("the energy is amazing this sprint") but whose quantitative stream is flat (zero tickets closed, zero sales calls) is a team that is feeling good without shipping. A team whose qualitative stream is grim ("we're exhausted, this is a death march") but whose quantitative stream is climbing is a team that is shipping at unsustainable cost — flag for HP review (§5.4 the 80% rule).

The cassette refuses to act on prose alone. It refuses to act on numbers alone. It always reads both.

## 6.4 The feedback loop — the killer feature

This is what makes the cassette more than a board. Without this loop, the game is decoration.

```
   ┌─────────────────────────┐
   │  1. PREDICT             │
   │     Form team, score    │
   │     {chem, fit, budget} │
   └────────────┬────────────┘
                ▼
   ┌─────────────────────────┐
   │  2. DEPLOY              │
   │     Sprint lock locks   │
   │     the prediction.     │
   └────────────┬────────────┘
                ▼
   ┌─────────────────────────┐
   │  3. RECORD ACTUALS      │
   │     on-time? margin?    │
   │     quality? client?    │
   └────────────┬────────────┘
                ▼
   ┌─────────────────────────┐
   │  4. COMPARE             │
   │     gap = actual − pred │
   │     The GAP is where    │
   │     learning happens.   │
   └────────────┬────────────┘
                ▼
   ┌─────────────────────────┐
   │  5. UPDATE PRIORS       │
   │     Director gets       │
   │     better at picking   │
   │     teams that win.     │
   └─────────────────────────┘
```

The actuals live in `project_outcomes` (db migration `004_outcomes.sql`). Recording them is not optional. A team deployed without an outcome is a dead card on the table.

## 6.5 Free transfers and disruption hits

```
   2 free transfers / quarter.   No score impact.
   Each extra transfer:          −4 to team score  (FPL transfer hit)
   Wildcard chip:                spend it for unlimited transfers, one cycle
```

This rule is the cassette's defence against churn-disguised-as-management. Reorgs don't ship products. Ship the product, *then* reorg.

## 6.6 Scoring the deploy

```
   points = base × margin_mult × chem_mult × budget_mult

   base:           on-time   100      late   50    failed   −20
   margin_mult:    > 20%   1.5×    18–20%  1.2×   < 18%   0.8×   < 12%   0.5×
   chem_mult:      > 75    1.3×       avg  1.0×   < 55    0.7×
   budget_mult:    under cap 1.1×              over cap   0.7×
```

Failures are *not free* but they are *not catastrophic*. A failed delivery still teaches the system. The director who deploys and learns four times beats the director who deploys once and is right.

## 6.7 The Gantt view — reading the kingdom's weeks

The Formation tab has a **Gantt mode** that shows every active project as a horizontal bar from start month to end month, stacked. The bars are colour-tinted by project status (Not Started, On Track, At Risk, Delayed, Closed — see §7.6).

Read the Gantt for two things:

1. **Headcount peaks.** Where the bars stack tallest is where the kingdom is most committed. If September has eight projects all active and the roster has 280 active heroes, you're at 28-heroes-per-project — fine. If December has twelve projects active, you're at 23 — and the cap math will start to bite. Plan deferrals (§4.10 D) before December arrives.
2. **Cliff edges.** A month with three projects ending in the same week is a *delivery cliff*. Three retrospectives. Three outcome records. Three handover meetings. Spread the ends if you can — ask the manager to extend the easier ones by a week.

The PMO sees the same Gantt with its own colouring (instalment payments, §7.6). Reconciling the two views is a useful weekly habit.

---

# 7. The PMO — the watcher behind the curtain

Every kingdom has a watcher. In TKCX, the watcher is the **Project Management Office** — abbreviated PMO. The PMO does not run projects. It does not pick teams. It does not file briefs. It *watches*. And what it watches, the king reads.

The PMO's official charter, dated April 2026, frames the office as "Transformation from administrative support to a **Strategic Value Partner**." That is the right way to think about it. The PMO is not a paperwork machine. It is the kingdom's *long lens*.

## 7.1 What the PMO actually does

Three things, simultaneously:

```
   ┌─────────────────────────────────────────────────────────┐
   │                                                         │
   │   1.  EFFICIENCY                                        │
   │       Are projects running efficiently — coverage,      │
   │       quality, party-split, morale, payroll vs cap?     │
   │       The PMO reads readiness scores in aggregate,      │
   │       not for any one project.                          │
   │                                                         │
   │   2.  PLAN ADHERENCE                                    │
   │       Is each project tracking against the plan it      │
   │       was filed with? Slipping milestones? Sliding      │
   │       margins? Budget burn ahead of timeline?           │
   │                                                         │
   │   3.  ANOMALIES                                         │
   │       Pattern breaks. A team that was 89 readiness      │
   │       suddenly drops to 64 in two weeks. A project      │
   │       whose burn rate doubles in one month with no      │
   │       scope change. A hero whose Form drops while       │
   │       their visible workload didn't move. The PMO       │
   │       flags these without prescribing fixes.            │
   │                                                         │
   └─────────────────────────────────────────────────────────┘
```

The PMO never *acts* directly. It surfaces. The director acts. The manager acts. The HR Minister acts. The PMO is the eye, not the hand.

## 7.2 The PMO Strategic Roadmap (Q2 → Q3 → Q4 2026)

The roadmap, in the PMO's own framing, runs across three quarters of 2026:

| Quarter | Posture | Strategy | Key activity | Outcome | Success metric |
|---|---|---|---|---|---|
| **Q2** | **Standardize** | Establish single source of truth and standardized project execution framework | PMO Governance Framework + Project Visibility Dashboard v1.0 | Standardised ways of working, role + responsibilities, std. manday rate, E2E delivery process, project tracking tools, document templates | **Adoption** — % of projects using std. template |
| **Q3** | **Control & Enable** | Implement portfolio controls and upskill capabilities for predictable delivery | Gate Review & Control (Go/No-Go) + People Development (KM, Training Academy & Communities) | E2E process on Sales (estimation + delivery), Centralized Portfolio Dashboard 2.0, Centralized Resource View, QA/QC quality gate review, training | **Efficiency** — risk identification + decreased skill / communication gap |
| **Q4** | **Optimize** | Maximise ROI through data-driven decisions and continuous innovation | Predictive Analytics (AI-driven risk + delay forecast) + Value Realization (outcome-based measurements) | Standardised E2E sales (cost estimation + process), Value Realization Report, Automated Decision Support, IS/Partner on Shelf, KPI/OKR alignment 2027 | **Success** — % project success |

You can read this roadmap as the PMO's own three-year curve from "we have spreadsheets" to "we have a kingdom-wide intelligence system." The cassette is the technical substrate the PMO needs to climb that curve.

## 7.3 The Portfolio Dashboard — the four headline tiles

The PMO's executive view is the **Portfolio Dashboard**. The first thing the king sees on it is four tiles, each one a percentage with a remaining-amount footnote:

```
   ┌──── EXECUTIVE SUMMARY ─────────────────────────────────────┐
   │                                                            │
   │   TOTAL PROJECTS 2026         PROJ. VALUE vs TARGET 2026   │
   │   ┌──────────────┐            ┌──────────────┐             │
   │   │   4 / 10     │            │     94%      │             │
   │   │              │            │   of target  │             │
   │   │  Active /    │            │ Value 284M / │             │
   │   │  All 2026    │            │ Target 302M  │             │
   │   │              │            │ Remaining    │             │
   │   └──────────────┘            │   18M        │             │
   │                               └──────────────┘             │
   │                                                            │
   │   BILLED vs PROJECT VALUE     BUDGET BURN RATE             │
   │   ┌──────────────┐            ┌──────────────┐             │
   │   │     70%      │            │     73%      │             │
   │   │   of target  │            │   of target  │             │
   │   │ Billed 198M /│            │ Expensed 142M│             │
   │   │ Value 284M   │            │ Budget 195M  │             │
   │   │ Remaining    │            │ Remaining    │             │
   │   │   86M        │            │   53M        │             │
   │   └──────────────┘            └──────────────┘             │
   │                                                            │
   └────────────────────────────────────────────────────────────┘
```

What each tile means in plain language:

| Tile | What it tells you |
|---|---|
| **Total Projects** | Active count and full-year count. A simple ratio of "what's running" to "what we said we'd run." |
| **Project Value vs Target** | What we *signed* this year against what we *said* we would sign. 94% means we're under target on bookings. |
| **Billed vs Project Value** | What we *invoiced* against what we *signed*. 70% means a third of signed work is yet to bill — could be normal phasing or could be a collections backlog. |
| **Budget Burn Rate** | What we *spent* against what we *budgeted*. 73% spent vs an 83% time-elapsed year would mean we're running lean (good); 73% spent vs a 50% time-elapsed year would mean we're going to overrun (bad). Always read against the calendar. |

These four together are the kingdom's quarterly vital signs. The king should be able to recite them without looking. If the king doesn't know them, the PMO has not done its job.

## 7.4 Project Health — the donut

Below the four tiles is a donut chart breaking active projects into five status buckets:

```
   ┌──── OVERALL BY STATUS ──────────────────────────┐
   │                                                 │
   │       1.  Not Started      40%                  │
   │       2.  On Track         20%                  │
   │       3.  At Risk          10%                  │
   │       4.  Delayed          10%                  │
   │       5.  Closed           20%                  │
   │                                                 │
   │   The donut is read clockwise from green        │
   │   (Not Started + On Track) through amber        │
   │   (At Risk) into red (Delayed) and finally      │
   │   black (Closed). A healthy kingdom keeps       │
   │   At Risk + Delayed under 25% combined.         │
   │                                                 │
   └─────────────────────────────────────────────────┘
```

A status moves from On Track → At Risk when *any one* of three things crosses a threshold:
- Readiness falls below 70 for two consecutive weeks.
- Burn rate runs > 110% of planned schedule for one month.
- A milestone slips by > 20% of its planned duration.

A status moves from At Risk → Delayed when two or more of the three apply, or when a slipped milestone has slid more than once.

## 7.5 The Instalment Payments timeline

The bottom half of the Portfolio Dashboard is a **monthly stacked-bar Gantt** of *expected payments by project by month*, in millions of THB excluding VAT. Each bar shows the contribution of each active project to that month's invoicing.

```
   ┌──── INSTALMENT PAYMENTS TIMELINE  (฿M, exc. VAT) ──────────┐
   │                                                            │
   │   Jan  ████████████ 12  ████ 5                        17M  │
   │   Feb  ████████ 8       █████ 5                       13M  │
   │   Mar  ████████████████ 15    ██████ 6                21M  │
   │   Apr  ██████████ 10    ████████ 8                    18M  │
   │   May  ██████████████████ 18  ██████ 6                24M  │
   │   Jun  ████████ 8                                      8M  │
   │   Jul  ████████████ 12  ██████████ 10                 22M  │
   │   Aug  ████████████ 12  ██████████ 10  ██████ 6       28M  │
   │   Sep  ████████████████████ 20                        20M  │
   │   Oct  █████████ 9      ████████ 8                    17M  │
   │   Nov  ██████████████ 14  ████████████ 12             26M  │
   │   Dec  ███████████ 11  ████████ 8                     19M  │
   │                                                            │
   │   colour key:  Project Alpha · Beta · Gamma · Delta        │
   │                                                            │
   └────────────────────────────────────────────────────────────┘
```

Read the timeline for two things:

1. **Cash-flow valleys.** A month like June (8M) is a thin month. If payroll is fixed at ~16M/month, June is loss-making in isolation. The PMO uses these to nudge sales toward shorter close cycles or to shift instalment milestones.
2. **Cash-flow ridges.** A month like August (28M) is a fat month. The PMO uses ridges to plan large vendor disbursements, hardware refresh cycles, bonus pools, etc.

The Gantt the directors see (§6.7) is *headcount-shaped*. The Gantt the PMO sees is *cash-shaped*. Same months, different lenses. Reconcile them quarterly.

## 7.6 What triggers a PMO intervention

The PMO does not run projects — but it *does* call for action when its watchers cross thresholds. Six triggers:

| Trigger | What the PMO does |
|---|---|
| Active project count > 10 (kingdom over-committed) | Calls a portfolio-prioritisation review with the king + directors |
| Project Value vs Target falls below 85% mid-year | Triggers a "sales acceleration" working session |
| Billed vs Project Value below 60% for 2 months | Triggers a collections + project-closure review |
| Budget Burn Rate ahead of timeline by > 15% | Triggers a per-project burn audit |
| Any project At Risk for 2 cycles | Triggers a Go / No-Go gate review (Q3 control mechanic) |
| Skill-gap signal in two consecutive sprints | Triggers a Training Academy intake (Q3 People Development) |

These triggers are how the kingdom *avoids* surprises. By the time the king notices a problem in the press, the PMO has already known about it for two cycles and has been pulling the relevant levers.

## 7.7 The three watcher layers

Behind the cassette, the PMO actually maintains *three* concurrent reading layers, each with its own dashboard:

```
   ┌──── 1. TALENT SUPPORT ─────────────────────────────────────┐
   │                                                            │
   │   The HR-facing dashboard. HP / MP / Form per hero.        │
   │   Flight-risk heat map. 4C grid (compensation / cause /    │
   │   career / community) per hero and per team. Lobby         │
   │   isolates. The PMO reads this to know whether the         │
   │   kingdom is grinding its heroes down.                     │
   │                                                            │
   └────────────────────────────────────────────────────────────┘

   ┌──── 2. TALENT PROGRAM ─────────────────────────────────────┐
   │                                                            │
   │   The Career-pillar dashboard. Quest XP curves, Alltrades  │
   │   throughput, Training Academy intake/completion, skill    │
   │   coverage maps, certification freshness. The PMO reads    │
   │   this to know whether the kingdom's heroes are *getting   │
   │   better*, not just delivering.                            │
   │                                                            │
   └────────────────────────────────────────────────────────────┘

   ┌──── 3. KINGDOM DASHBOARD (Portfolio + Resource) ───────────┐
   │                                                            │
   │   The executive-facing dashboard. The four tiles in §7.3.  │
   │   The donut in §7.4. The instalment Gantt in §7.5. The     │
   │   PMO reads this to know whether the kingdom *as a         │
   │   business* is hitting its number.                         │
   │                                                            │
   └────────────────────────────────────────────────────────────┘
```

The PMO's job is to keep all three reading consistent with each other. A great Kingdom Dashboard built on a broken Talent Support layer is a kingdom that will collapse in 18 months. A great Talent Support layer with a flat Kingdom Dashboard is a kingdom that is being kind to its heroes and going out of business. The three layers are *one signal*, read three ways.

---

# 8. Improving your command — competition and cooperation

The game is partly competitive (directors vs directors, departments vs departments) and partly cooperative (every team contributes to the kingdom-wide Org Grade). Both loops run continuously.

## 8.1 The director leaderboard

Every director's score is the sum of their teams' scoring (§6.6) over the active league window. The leaderboard is visible to all directors. It does not show absolute salary, only the score.

**Design principle:** the leaderboard celebrates the top, hides the bottom. The bottom is information for HR support, not for public ranking. Never publish bottom positions.

## 8.2 League cadence

Four leagues run simultaneously, each on a different rhythm.

| League | Format | Cadence | Reset |
|---|---|---|---|
| **Annual Department Championship** | Classic — cumulative score by department | 12-month rolling | January 1 |
| **Monthly H2H** | Two departments matched as opponents; head-to-head deltas | Monthly | First Monday |
| **Innovation Cup** | Knockout — quarterly bracket of cross-functional teams pitching prototypes | Quarterly | Each quarter |
| **Mini-leagues** | Voluntary affinity groups (e.g. "data nerds", "Bangkok DC ops") | Self-selected | Self-managed |

The Innovation Cup is the cassette's mechanism for the fifth tension — *innovation as engine, not initiative*. The bracket forces idea → prototype → demo → deploy on a real schedule. Without it, innovation slides off the calendar.

## 8.3 The trade rules (Pokémon-style — partially shipped)

A director can offer a hero on their roster to another director in exchange for either:

- another hero (straight trade), **or**
- a chip refund (e.g. an unused Spotlight returns to the offering director).

Trades require **both heroes to consent** (recorded in their Chronicle). The cassette will eventually show a trade view with Investment Value deltas. Until then, trades are recorded manually as a pair of `vocation_changes` events plus a Chronicle note. See `CLAUDE.md` §8 "Reserved / Not Yet Built" — this is on the roadmap, not yet on the floor.

## 8.4 The Org Grade

The whole kingdom is graded `S / A / B / C / D / F` on the home screen. The grade is composite:

```
   OrgHealth = 0.25 · AvgWellbeing
             + 0.20 · UtilizationBalance
             + 0.20 · DevCompliance
             + 0.15 · OutputEfficiency
             + 0.10 · RetentionScore
             + 0.10 · TeamCompositionFit

   S  ≥ 90    A  80–89    B  70–79
   C  60–69   D  50–59    F  < 50
```

The grade is a single number that pushes the whole kingdom in the same direction. It is also, deliberately, the only "ranking" the system shows. Individual scores are private. Team scores are visible to the team and the league. The Org Grade is the only public number.

## 8.5 Why competition is healthy here

Competition without cooperation produces hoarders. Cooperation without competition produces drift. The cassette runs both because:

- The **director leaderboard** punishes hoarding (a hoarded hero is a hero not earning points elsewhere).
- The **Org Grade** punishes silos (one department winning the H2H but tanking the kingdom grade is a Pyrrhic win — visible to everyone).
- The **trade mechanic** turns competition into liquidity (a hero stuck in one team can move where they grow faster).

The result, over a season, is what the consultant called the "command improvement loop":

```
   ┌──────────────┐    ┌──────────────┐    ┌──────────────┐
   │  Director A  │    │  Director B  │    │  Director C  │
   │  picks team  │    │  picks team  │    │  picks team  │
   └──────┬───────┘    └──────┬───────┘    └──────┬───────┘
          │                   │                   │
          └─────────┬─────────┴─────────┬─────────┘
                    ▼                   ▼
          ┌──────────────────────────────────┐
          │      H2H + Cup + Annual          │
          │       (visible scoreboard)       │
          └────────────────┬─────────────────┘
                           │
                           ▼
          ┌──────────────────────────────────┐
          │   ORG GRADE (single shared num)  │
          │   if it drops, everyone loses    │
          └────────────────┬─────────────────┘
                           │
                           ▼
          ┌──────────────────────────────────┐
          │   Directors learn each other's   │
          │   tactics → next cycle's picks   │
          │   are smarter → next OG climbs   │
          └──────────────────────────────────┘
```

The whole system is self-improving. Each director gets better because each director can *see* the others' moves. The collective gets better because the same scoreboard makes everyone responsible for it.

---

# 9. Lifting all four C's together

Most performance systems optimise one variable and pretend the others don't exist. The cassette refuses that.

## 9.1 The 4C OS — recap

```
   ┌──────────────────────────────────────────────────────────┐
   │                     THE 4C COMPASS                       │
   │                                                          │
   │                     COMPENSATION                         │
   │                          ▲                               │
   │                          │                               │
   │                          │                               │
   │     COMMUNITY  ◄─────────┼─────────►  CAUSE              │
   │                          │                               │
   │                          │                               │
   │                          ▼                               │
   │                       CAREER                             │
   │                                                          │
   │   Compensation = money / survival      (Herzberg)        │
   │   Cause        = meaning / dignity     (Esfahani Smith)  │
   │   Career       = flow / growth         (Csikszentmihalyi)│
   │   Community    = belonging             (Aristotle proj.) │
   └──────────────────────────────────────────────────────────┘
```

A hero's 4C grid is displayed on their Tome and aggregated to team and department level on the Org View. A hero can be 80/80/80/80 (rare and golden) or 80/30/40/20 (a paycheck-only hire — a flight risk in three months).

## 9.2 How each surface contributes to each C

| Surface | C raised |
|---|---|
| Salary cap, Investment Value, Moneyball verdict | **Compensation** (transparency) |
| Project briefings, Quest design, Innovation Cup pitches | **Cause** |
| Quests, XP, Alltrades reskilling, Innovation Cup itself | **Career** |
| Lobby, party order, chemistry, mini-leagues | **Community** |

A well-run cycle touches all four columns. A badly run cycle touches one.

## 9.3 The 4C lift loop

The kingdom lifts all four C's together when each cycle does this:

```
   ┌────────────────────────────────────────────────────────────┐
   │                   ONE CYCLE = ONE LIFT                     │
   │                                                            │
   │  COMPENSATION    Salary cap is honoured. Investment Value  │
   │                  rises for heroes who earned it.           │
   │                                                            │
   │  CAUSE           Every project brief names the WHY in one  │
   │                  sentence. Heroes can recite it.           │
   │                                                            │
   │  CAREER          At least one Alltrades event happens, or  │
   │                  one hero promotes a sub-skill by a level. │
   │                                                            │
   │  COMMUNITY       At least one new cross-department pair    │
   │                  appears in the interactions log.          │
   │                                                            │
   └────────────────────────────────────────────────────────────┘
                              │
                              ▼
   At sprint review, ask:  "Which C did we lift this cycle?"
   If the honest answer is "none" or "only Compensation",
   the cycle was a maintenance cycle, not a lift cycle.
   Three maintenance cycles in a row = the system is drifting.
   Spend a chip. Adjust the brief. Move a hero. Lift something.
```

## 9.4 Anti-patterns (never do this)

These are the four ways a kingdom silently breaks the compass.

1. **Trading Community for Compensation.** "We pay 20% above market so we don't need a lobby." Wrong. People leave high-paying isolation for lower-paying belonging. Always.
2. **Trading Career for Cause.** "Our mission is so important you don't need a growth path." Wrong. Two years of mission without growth is exit interview material.
3. **Trading Cause for Compensation.** Mercenary culture. The product ships but no one defends it after launch.
4. **Trading Compensation for Cause.** "We pay below market because the work is meaningful." This works for 18 months, then the hygiene factor breaks and you lose your best heroes overnight.

The cassette refuses all four trades. The 4C grid is *and*, not *or*.

## 9.5 The compass principle

> **The numbers are a compass, not a verdict.**

Re-read this sentence at the end of every season. The cassette shows you where to look. It does not tell you what to do. The director's job is to look at where the compass points and *decide*. The cassette will never decide for you.

---

# 10. The endless game — what victory looks like

The cassette has no credits. There is no "you won". There is no "you lost". There is the kingdom *now* and the kingdom *next season* and the kingdom *the season after that*.

## 10.1 No final boss

In *Dragon Quest III*, you fight Zoma at the bottom of the dark world. After you beat him, the credits roll. Then you keep playing — Erdrick's tomb is still there, your party is still alive, the world keeps turning. Many of us who played as kids lost months to that *after*-game.

TKCX does not even pretend to have a Zoma. There is no single client, no single year, no single milestone whose completion ends the game. Each year a new set of quests arrives. Each year the kingdom either grows or it doesn't. The game does not pause to ask "how do you feel about that?" — it just keeps running.

The implication for the player: **stop looking for the win condition.** There is none. There are only trends.

## 10.2 The four trends — the long victory cascade

```
   ┌─────────────────────────────────────────────────────────────┐
   │                                                             │
   │     CHAIR  ┐                                                │
   │            │  (org grade — composite of 6 sub-metrics)      │
   │            ▼                                                │
   │     REVENUE  ┐                                              │
   │              │  (PMO Portfolio Dashboard — billings)        │
   │              ▼                                              │
   │       BUZZ  ┐                                               │
   │             │  (mentions, press, candidate pipeline)        │
   │             ▼                                               │
   │       SHARE PRICE                                           │
   │       (slow derivative — quarters to react)                 │
   │                                                             │
   │   Each trend leads the next by weeks or months. When all    │
   │   four are rising in the same quarter, the kingdom is in    │
   │   what consultants call "a flywheel" and economists call    │
   │   "a virtuous cycle". When all four are dropping, the       │
   │   kingdom is in a doom loop. Most of the time, two are up   │
   │   and two are down — the question is *which two*.           │
   │                                                             │
   └─────────────────────────────────────────────────────────────┘
```

## 10.3 The chair — why it goes up

The chair (Org Grade S/A/B/C/D/F) climbs when:
- Average wellbeing climbs (heroes are sustainably happy).
- Utilisation balance is healthy (no fleet running at 100%).
- Dev compliance is met (training is happening, not skipped).
- Output efficiency is steady or rising (teams ship what they say they will).
- Retention holds (your best heroes don't leave).
- Team composition fit is good (you assembled mostly well, not mostly stretched).

Six sub-metrics, each one a weekly story you can intervene in. The chair is the most *responsive* of the four trends — a director's actions in any single week can move it.

## 10.4 The revenue — why it goes up

The PMO's headline tile (§7.3 — Project Value vs Target) climbs when:
- Sales close more contracts than they used to (top-of-funnel).
- Existing contracts get renewed and expanded (account growth).
- Margins on each contract hold or improve (pricing discipline).
- Late-quarter project deliveries actually land (fewer slips into next year).

Revenue is the trend the king watches the loudest. It is also the trend most *outside* any one director's control. Sales cycles are months. The lag between a great quarter on the floor and a great quarter on the ledger is two-to-three quarters.

## 10.5 The buzz — why it goes up

This is the trend most kingdoms ignore until it is too late. The buzz is the conversation about TKCX in the wider tech ecosystem — LinkedIn posts, industry chat groups, candidate-pipeline conversations, press mentions, conference panels.

The buzz climbs when:
- A flagship project ships and the client publicly says nice things.
- A senior hero gives a talk or writes something that the industry shares.
- The kingdom's hiring page suddenly has more applicants than usual.
- A competitor's hero leaves *them* and joins *you*, citing the work as the reason.

The buzz is hard to measure but easy to *notice*. The PMO's anomaly-detector watches mention counts; sudden positive spikes are reported as *good* anomalies. (The same detector also catches negative spikes — a viral complaint, a press story going wrong — and routes those to the Comms Minister with high priority.)

## 10.6 The share price — the long signal

The kingdom is publicly listed. The share price is the *integral* of the other three trends, with a lag.

You will see weeks where the chair drops, revenue is flat, buzz dips, and the share price still *rises* — because the market has noticed something the cassette hasn't surfaced yet. You will see weeks where everything internal is great and the share price falls — because the macro environment moved.

Treat the share price as the **fourth-order signal**. Do not trade decisions against it weekly. Do read it quarterly. Over twelve quarters, it tells you the truth.

## 10.7 What "winning" looks like

If the chair has climbed from C to A over six quarters, if revenue has cleared 100% of target two years running, if the buzz cluster on social has gone from "TKC who?" to "TKC is the one to watch in Bangkok integrators", and if the share price has compounded at a steady positive rate — **you have won the game**, in the only sense in which the game can be won.

You will not get a credit roll. There will be a quiet quarterly board meeting where someone says "we're doing well", and then everyone goes back to work, and the next set of quests arrives, and you start again.

This is what the consultant meant when he said "build a *living* system" instead of leaving a binder. A binder ends. A living system keeps lifting the kingdom — chair, revenue, buzz, share price — for as long as someone keeps playing.

That someone is you.

---

# Appendix A — Glossary

| Term | Meaning |
|---|---|
| **Archetype** | The class a hero belongs to. Seven canonical: captain / tech / sales / ops / scout / fighter / goofoff. |
| **Assignment** | A single mapping `(employee, slot dimension, party row, FTE)` on a project. |
| **Bench** | Heroes not on any active team this cycle. Visible in the Lobby. Eligible for All Hands chip. |
| **BOM** | Bill-of-materials. The slot counts a project requires. |
| **Building** | A physical or virtual workplace a hero can check into (HQ, site, embedded desk, remote). |
| **Burn Rate** | Budget Burn Rate on the PMO Portfolio Dashboard — % of annual budget already expensed. |
| **CP** | Capacity Point. 1 CP = ฿1,000/month. |
| **Cap** | Monthly salary ceiling = project monthly billing ÷ 10. |
| **Cassette** | The whole system. ROM + battery save + memory card. |
| **Chair** | Informal name for the Org Grade — S/A/B/C/D/F composite. The kingdom's executive seat. |
| **Chemistry** | 0–100 score from coverage / diversity / synergy / cohesion across a team. |
| **Chronicle** | Append-only event timeline for a hero or project. |
| **Chip** | A power-up. Wildcard / All Hands / Spotlight / Task Force. |
| **Director** | A player. Forms teams, deploys them, scores. |
| **Form** | 0.0–10.0 30-day momentum score (FPL-style). |
| **FTE** | Full-time equivalent. 1.0 or 0.5 in this build. |
| **Gantt** | Horizontal-bar timeline — months × projects. Two flavours: headcount Gantt (Formation) + cash Gantt (PMO instalments). |
| **HP / MP** | Health Points (wellbeing) / Mana Points (energy). 0–100ish. |
| **ICA Index** | Impact + Collaboration + Advancement composite, 0–100. |
| **Invisible lines** | The five affinity layers connecting heroes on the Lobby floor — profession, team, org group, friendship, personal. |
| **Kingdom** | TKCX as a whole — the company, its heroes, its quests, its share price. |
| **League** | A scoring window. Annual / Monthly H2H / Quarterly Cup / Mini-league. |
| **Lobby** | The 2D floor of clocked-in heroes per building. |
| **Lock / Unlock** | Save state for a project's brief. Once Saved, six fields lock; Unlock requires re-auth and is audited. |
| **Margin target** | The profit % the kingdom expects to keep from a project. Default 25%. |
| **Org Grade** | Composite kingdom health, S–F. The only public ranking. |
| **Party order** | Front (1) / mid (2) / back (3) row of an assignment. |
| **PMO** | Project Management Office. The watcher behind the curtain. Three reading layers (talent support / talent program / kingdom dashboard). |
| **Punch** | A check-in or check-out event. Logged in `attendance_log`. |
| **Quest** | A project. The kingdom's word for a paid piece of work. |
| **Readiness** | The composite team score: coverage × .40 + quality × .25 + party_split × .05 + chem × .15 + morale × .15. |
| **Sprint lock** | Monday 09:00 — formation closes for the cycle. |
| **Tome** | A hero's deep profile page. |
| **Vocation change** | An Alltrades reskilling event. Recorded in `vocation_changes`. |
| **Wispr Flow** | The voice-input API the cassette will use to let authorised roles speak adjustments instead of typing them. |

---

# Appendix B — Quick-reference card

```
┌──── DAILY ────────────────────────────────────────────────────┐
│ • Open Lobby for 60 seconds. Note who is missing or alone.    │
│ • Glance at HP/Form alerts.                                   │
│ • Approve any pending Tome conversations.                     │
│ • Confirm overnight check-ins look right.                     │
└───────────────────────────────────────────────────────────────┘

┌──── MONDAY 09:00 — SPRINT LOCK ───────────────────────────────┐
│ 1. Confirm formation. Verify cap (project ÷ 10).              │
│ 2. Verify margin projection > 25% target.                     │
│ 3. Verify Front+Back captain/scout for the +5 chem bonus.     │
│ 4. Verify no slot >120% (anti-hoard).                         │
│ 5. Lock. The mirror writes to Sheets.                         │
└───────────────────────────────────────────────────────────────┘

┌──── FRIDAY 16:00 — SPRINT REVIEW ─────────────────────────────┐
│ 1. Record outcomes for any project that closed this cycle:    │
│    on-time? margin? quality? client satisfaction?             │
│ 2. Compare predicted vs actual on the Outcomes screen.        │
│ 3. The GAP is the lesson. Note it in the Chronicle.           │
│ 4. Feed the qualitative observation stream from your sprint   │
│    retro into the team's weekly snapshot.                     │
└───────────────────────────────────────────────────────────────┘

┌──── MONTHLY ──────────────────────────────────────────────────┐
│ • H2H matchup result lands. Read the delta, not the rank.     │
│ • Refresh every Tome you have not opened this month.          │
│ • Spend at least one chip per quarter — never hoard them.     │
│ • Read the four PMO tiles. Recite them without looking.       │
└───────────────────────────────────────────────────────────────┘

┌──── QUARTERLY ────────────────────────────────────────────────┐
│ • Innovation Cup bracket. One pitch per director.             │
│ • Chip refresh (All Hands × 1, Spotlight × 1).                │
│ • Org Grade reads. If it dropped, ask which C broke.          │
│ • Reconcile headcount Gantt vs PMO instalment Gantt.          │
│ • Glance at the share-price chart. Quarter-over-quarter only. │
└───────────────────────────────────────────────────────────────┘
```

---

# Appendix C — Sample sessions (four, end-to-end)

## C.1 Session — "Sapphire deploy" (one director, one team, one cycle)

This is the cycle that produced the §4.9 worked example, narrated end-to-end.

**Friday 09:00** — Project lead files the 5G IoT Phase 1 brief. Slot BOM drops into the Formation board. Cap = ฿200k/month = 200 CP.

**Friday 11:00** — Director A opens Formation. Pulls the ambitious 7-hero draft from §4.9 — Pim, Tong, Gun, Aey, May, Som, Boy. Readiness comes back at **90**: coverage 100, quality 92 (Aey's 1.0 fit pulls it up), party_split 80 (the four-on-three tech overstuff is showing as a small nudge), chemistry 78 (front+back bonus applied), morale 72. The number looks great — but cap is over by 14 CP. The formation cannot lock at this payroll. **A high readiness on an over-cap team is unlockable**; the cap is a hard gate, the readiness is a soft signal.

**Friday 14:00** — Director A applies Move 2 from §4.9: drop Khun Aey, accept the small quality hit, keep May in the back for the +5. Re-draft. Readiness = **89** (one point lower because Aey's 1.0 fit is gone, but party_split rises to 100 which partly compensates). Cap = 192 CP (under cap by 8 CP). The team can lock. Mirror health checked — `GET /api/sheets/health` returns `missing: []`.

**Monday 09:00** — Sprint lock. Postgres + Sheets both record the formation. Chronicle entries written for each hero ("deployed to 5G IoT Phase 1, party row mid", etc.).

**Cycle runs.** Lobby shows the team clustering Wed–Fri. One interaction event between Khun Tong and Khun Pim is logged on Wednesday morning — first time the two have crossed paths. Captured for next cycle's mini-league suggestion.

**Friday 16:00 of week 4** — Project closes on time. 19% margin. Quality 88. Client satisfaction 4/5. Outcomes recorded in `project_outcomes`. Compare: predicted overall 89, actual 91. Gap +2 — a small confirmation that the team picked the right Move 2 trade-off. Director A logs the lesson: *"Keep the +5 chemistry bonus over a one-step quality fit when the front/back rows are otherwise empty."*

**Score for cycle.** base 100 (on-time) × margin 1.2 (margin in 18–20% bracket) × chem 1.3 (78 > 75) × budget 1.1 (under cap) = **172 points** to Director A.

## C.2 Session — "Two directors, one Captain" (the trade)

> **Note.** The trade view (§8.3) is on the roadmap, not yet on the floor. This session shows the *manual* workflow that approximates a trade today, plus the Chronicle and chip movements that the eventual one-click trade will encode.

Director A and Director B both want Khun Pim (Captain, 50 CP, Investment Value rising). Pim's current cycle is with A.

The cassette shows Pim at 100% on Project Sapphire. The two directors agree by message: B offers A a Spotlight chip and access to Khun Joy (Sales, 30 CP) for half-cycle access to Pim, weeks 3–4.

Director A accepts. Both directors record a Chronicle event manually: for Pim ("party-rotated, Sapphire → Onyx for weeks 3–4") and for Joy ("rotated to Sapphire weeks 3–4"). No vocation change is written (no class change). The Spotlight chip is transferred — today by editing the chip ledger directly; in the future, by the trade endpoint.

Pim's next-cycle readiness contribution is split. Both projects benefit. A's free transfers count drops by 1 (from 2 to 1).

**Lesson:** trades are how the cassette routes around hoarding. They cost a free transfer but they unlock the floor.

## C.3 Session — "Innovation Cup pitch" (cross-functional, free hit)

Director C plays a Free Hit chip. Forms a 4-person Task Force for one cycle:

| Hero | Archetype | Reason |
|---|---|---|
| Khun Mind | Captain | Pitches to leadership |
| Khun Bow | Tech | Builds the prototype |
| Khun Fern | Scout | Reads the market signal |
| Khun Lek | Goof-Off | The wildcard the system rarely uses |

Brief: a 5-day prototype for "AI-assisted procurement triage". No cap. No mirror to long-term allocations (the chip suspends the rule for one cycle).

End of cycle: prototype demoed at Innovation Cup. Wins quarterly bracket. Project promoted from Cup to a real project on the next cycle's board, with a real BOM and a real cap. Khun Lek's Investment Value goes from 18 to 27 — the floor noticed.

**Lesson:** the Goof-Off archetype is rarely the right pick on a normal cycle. On a Free Hit cycle, it can be the right pick. The cassette has a slot for the wildcard precisely so the wildcard gets played sometimes.

## C.4 Session — "The PMO pulls the alarm" (anomaly intervention)

**Week 6 of Q3.** The Portfolio Dashboard shows: Project Value vs Target at 88% (was 94% last week). A 6-point drop in one week.

The PMO's anomaly detector flags it. Drilling in: two contracts were due to sign this week and one slipped to Q4 (a client procurement freeze). The other did sign — but at 70% of expected value because the client cut scope.

The PMO does not run sales. But it does call a **portfolio-prioritisation review** under §7.6 trigger 2 ("Project Value vs Target falls below 85% mid-year — wait, we're at 88%, watch threshold but don't trigger yet"). Instead the PMO writes a one-paragraph note to the king and the sales DMD, naming both contracts, naming the client procurement freeze, and proposing two questions for the next director huddle: (1) is the freeze likely to thaw in Q4 or is the contract gone? (2) can we backfill the lost scope from the existing pipeline?

Two weeks later: the freeze does thaw, the contract signs at full value, Project Value vs Target climbs back to 96%. The kingdom's Org Grade does not move (the PMO call was caught before the chair noticed). The buzz layer also does not move. The share price does nothing for another six weeks, then ticks up.

**Lesson:** the PMO's job is to catch things before they ripple into the chair, the buzz, or the share. The most valuable PMO moves are the ones nobody else notices.

---

# Appendix D — Where the screens live

This is a router, not a tutorial. Each screen has its own deeper documentation in code.

| Screen | URL | What it is | Source |
|---|---|---|---|
| **Cockpit** | `/command-center` (default) | The main board. Tab-switcher above. | `src/app/command-center/page.tsx` |
| **Roster** | `/command-center` → Roster tab | The 320-card wall. Filter, search, drawer. | `src/app/command-center/_tabs/RosterTab.tsx` |
| **Formation** | `/command-center` → Formation tab | The drag-and-drop team builder + Gantt mode. | `src/app/command-center/_tabs/FormationTab.tsx` + `formation/` |
| **Ninja** | `/command-center` → Ninja tab | Skill-weighted alt builder with readiness matrix. | `_tabs/NinjaTab.tsx` |
| **Matrix** | `/command-center` → Matrix tab | Capability heatmap (org supply vs project demand). | `_tabs/MatrixTab.tsx` |
| **Signals** | `/command-center` → Signals tab | Derived strategic signals from operational data. | `_tabs/SignalsTab.tsx` |
| **Insights** | `/command-center` → Insights tab | Aggregations across cycles. | `_tabs/InsightsTab.tsx` |
| **Ledger** | `/command-center` → Ledger tab | Game-balance sliders, audit log, lock/unlock history. | `_tabs/LedgerTab.tsx` |
| **Lobby** | `/command-center` → Lobby tab | The 2D walking floor + graph mode for invisible lines. | `_tabs/LobbyTab.tsx` |
| **Tome** | `/tome/[id]` | Server-rendered hero profile. Printable. | `src/app/tome/[id]/page.tsx` |
| **Report** | `/report` | 10-page e-report + whitepaper + print back cover. | `src/app/report/` |
| **PMO Portfolio** | (Q3 — coming) | The Portfolio + Resource Utilization Dashboard | per `docs/From TKC May 2026/ref. from PMO/` |

---

# Appendix E — Manual versioning

This manual is part of the cassette. Treat it like the ROM.

- **First digit** bumps when an engine break invalidates earlier copy (e.g. a new readiness formula, a new archetype, a new sacred rule).
- **Second digit** bumps when a tactic, table, or screen changes but the whole still reads correctly to a v1 player.
- **Manual edition** is independent of ROM revision but should always declare which ROM revision it is *for* (top of file).

When you bump:

1. Update the front-matter cassette block.
2. Add a row to the table below.
3. Leave a one-line note on what changed.
4. Commit with a `docs:` prefix.

| Manual rev | ROM target | Date | Change |
|---|---|---|---|
| v1.0 | v4.6 "Pulse" | 2026-05-11 | First publication of the Player's Manual. |
| v1.1 | v4.6 "Pulse" | 2026-05-11 | Substantial expansion. New §1 kingdom storyline (TKCX, Sim City / Animal Crossing / DQ3-after-Zoma framing, four-trend victory cascade). New §2 buildings + check-in + lobby + invisible lines (folds the old standalone lobby section). New §3 setting the task — manager workflow with Save/Lock, Gantt duration, margin target, voice-mode (Wispr Flow). New §6.3 weekly observation feed (qualitative + productivity streams). New §6.7 Gantt view. New §7 The PMO — the watcher behind the curtain (Q2/Q3/Q4 strategic roadmap, Portfolio Dashboard four tiles, Project Health donut, Instalment Payments timeline, intervention triggers, three watcher layers). New §10 The endless game (no final boss; the four-trend victory cascade explained). New sample session C.4 (PMO pulls the alarm). Glossary expanded to 35 terms. |

---

*End of manual. The cassette is in your hand. Form a team.*
