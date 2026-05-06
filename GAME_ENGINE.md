# TKC Talent Support Dashboard — Game Engine Design Document

> "A fleet manager who runs every vehicle at 100% utilization and skips maintenance to maximize short-term output will destroy their fleet within 2 years. The same is true for talent."

## Philosophy

This system treats employees as **assets to be maintained and optimized, not resources to be consumed**. The RPG + Fantasy Football layer is not decoration — it is a **cognitive framework** that makes resource allocation, team composition, and individual development tangible and strategic.

**The system is a compass, not a judgment.** It's a fitness tracker for careers — personal, useful, in your control. Not social credit. Not surveillance.

**Three metaphor layers:**
1. **Fantasy Football** — the boss is a fantasy manager building squads within budget constraints, deploying power-ups, competing in leagues
2. **RPG** — each person has attributes, a class, a level, quests to complete, and a story to tell
3. **Fleet Management** — continuous health monitoring, preventive maintenance, route optimization, right-sizing

**The board is a constraint:**
- Moving someone out of Team A creates a **visible gap**
- People are **not interchangeable** — they have distinct stats and capabilities
- Team composition **matters** — not just headcount
- Resources are **finite** — budget caps force smart allocation

---

## AI-to-Rules Boundary

The live game loop must never wait for a model. Generative AI is an input adapter:

1. Users write observations, check-ins, or field notes.
2. The AI proposes structured numbers once: attribute deltas plus a sentiment signal.
3. If AI is unavailable or slow, deterministic text scoring produces the same numeric shape.
4. Game mechanics consume only numbers: morale, trust, energy, clarity, momentum, and risk.

This keeps play snappy. Formation readiness, chemistry adjustment, support recommendations, and delivery scoring read cached or in-memory signals, not prose.

---

## 0. THE ICA INDEX (Fantasy Football core mechanic)

Replaces the RPG-only attribute system with a composite score inspired by FPL's ICT Index.

### ICA = Impact + Collaboration + Advancement

| Component | What It Measures | Data Sources | Weight |
|-----------|-----------------|-------------|--------|
| **Impact (I)** | Business outcomes delivered | Revenue influenced, incidents resolved, deliverables completed, client satisfaction | 40% |
| **Collaboration (C)** | Enabling others | Cross-team projects, knowledge shared, mentoring hours, peer nominations, help given | 30% |
| **Advancement (A)** | Growth velocity | Certifications earned, skills leveled up, stretch assignments completed, innovation proposals | 30% |

```
ICA_Score = (Impact * 0.4) + (Collaboration * 0.3) + (Advancement * 0.3)
// Normalized to 0-100
```

### Form (30-day momentum)
```
Form = average(last_4_weekly_scores) / max_possible_weekly_score * 10
// Displayed as 0.0-10.0, like FPL form rating
// Green (7.0+), Amber (4.0-6.9), Red (0-3.9)
```

### Position-Adjusted Scoring
Like FPL where defenders get 6pts for a goal vs forwards getting 4pts:

| Role Type | Core Points | Stretch Bonus | Why |
|-----------|------------|---------------|-----|
| Operations (DEF) | Normal for ops tasks | +50% for sales/innovation tasks | Ops doing sales work is like a defender scoring |
| Sales (FWD) | Normal for revenue tasks | +50% for ops/process tasks | Sales improving processes is above their "position" |
| Support (GK) | Normal for support tasks | +50% for any direct delivery | Support people delivering is highest-value stretch |
| Cross-functional (MID) | Normal for coordination | Even scoring across types | Midfielders are already versatile |

---

## 0.1 FANTASY FOOTBALL MECHANICS

### Budget Cap System
Each department head gets **1000 Capacity Points** per quarter.
- Senior specialist = 120 CP
- Mid-level = 80 CP
- Junior = 40 CP
- You can't hoard all the talent. Budget forces trade-offs.

### Sprint Lead (Captain) — 2x Points
- One team member designated Sprint Lead per cycle
- Their accomplishments count **2x** toward team score
- **Rotates** — everyone gets the captain armband
- Builds leadership pipeline without formal promotion

### Transfers & Rotation
- **2 free rotations** per quarter (reassigning someone between projects)
- Extra rotations cost **disruption points** (-4 from team score, like FPL transfer hits)
- **Sprint lock deadline**: Monday 9AM — no changes after that without paying the hit

### Power-Ups (Chips) — Limited per year
| Chip | Name | Limit | Effect |
|------|------|-------|--------|
| Wildcard | **Restructure** | 1/half-year | Unlimited team changes for one sprint |
| Bench Boost | **All Hands** | 1/quarter | Bench/standby employees score too |
| Triple Captain | **Spotlight** | 1/quarter | One person's contributions count 3x |
| Free Hit | **Task Force** | 2/year | Temp cross-functional team for one sprint |

### Leagues & Competition
| League Type | TKC Version | Cadence |
|-------------|-------------|---------|
| Classic | Annual Department Championship | 12-month cumulative |
| Head-to-Head | Monthly Cross-Department Matchups | Monthly |
| Cup | Quarterly Innovation Cup | Knockout |
| Mini-leagues | Voluntary affinity groups | Self-selected |

### Investment Value (Market)
- Each employee has a visible **Investment Value** (like player price)
- Value **rises** when multiple project leads request them
- Value **falls** when engagement drops or demand decreases
- "Selling price" spread prevents rapid shuffling
- Managers who invest in developing juniors early "buy low, sell high"

### Engagement Cadence
```
WEEKLY:   Sprint lock (Monday 9AM) + Sprint review (Friday PM)
MONTHLY:  H2H matchup results + leaderboard update
QUARTERLY: Championship standings + power-up refresh + chip strategy
ANNUALLY:  Season review + trajectory visualization + awards
```

---

## 1. THE CREDO OPERATING SYSTEM

Four pillars from Emily Esfahani Smith, mapped through the Ritz-Carlton Credo:

| Pillar | Credo Connection | 4C Category | Employee Question | Boss Diagnostic |
|--------|-----------------|-------------|-------------------|-----------------|
| **Belonging** | "is a place" — you are home here | Community | Where do I feel I belong? | Which teams have low belonging? Why? |
| **Purpose** | "genuine care is our highest mission" | Cause | Is this organization's mission my mission? | Are people connected to why we exist? |
| **Transcendence** | "fulfills even the unexpressed wishes" | Compensation | Am I in the zone? Can I see beyond the addressable? | Who is in flow? Who is stuck? |
| **Story** | "we pledge to provide the finest service" | Career | Is my contribution becoming a story worth telling? | Whose narrative is growing? Whose is stalling? |

### Credo Score Formula (per person)
```
CredoScore = (BelongingScore * 0.25) + (PurposeScore * 0.25) +
             (TranscendenceScore * 0.25) + (StoryScore * 0.25)

BelongingScore = (teamChemistry * 0.3) + (peerRecognition * 0.3) +
                 (communityContributions * 0.2) + (pulseResponse_belonging * 0.2)

PurposeScore = (causeContributions * 0.3) + (missionAlignment * 0.3) +
               (strategicImpact * 0.2) + (pulseResponse_purpose * 0.2)

TranscendenceScore = (flowHours * 0.3) + (skillGrowth * 0.3) +
                     (innovationContributions * 0.2) + (pulseResponse_transcendence * 0.2)

StoryScore = (careerContributions * 0.3) + (mentoring * 0.2) +
             (questChainProgress * 0.3) + (pulseResponse_story * 0.2)
```

---

## 2. THE VITAL SIGNS — HP / MP / XP / STAMINA

Borrowed from fleet telematics: continuous health monitoring, not annual inspections.

### HP (Health Points) — Wellbeing / Burnout Resistance
```
maxHP = 100 + (CON * 5) + (level * 2)

HP depletes from:
  - Overwork: (weeklyHours - 45) * 3 per extra hour
  - Conflict events: -10 per event
  - Context switching: -2 per project beyond 2 simultaneous
  - Streak fatigue: -(streakDays - 30) * 0.5 if streak > 30 days

HP recovers from:
  - PTO days: +15 per day
  - Wellness activities: +5 per activity
  - Peer recognition received: +3 per recognition
  - Team social events: +8 per event

ALERT THRESHOLDS:
  HP > 70:  Green  — Healthy
  HP 40-70: Yellow — Watch (manager gets nudge)
  HP 20-40: Orange — Intervene (workload review triggered)
  HP < 20:  Red    — Critical (mandatory recovery conversation)
```

### MP (Mana Points) — Energy / Available Capacity
```
maxMP = 80 + (DEX * 3) + (INT * 2)
MP resets weekly (Monday = full MP)

MP costs:
  - Each quest accepted: estimatedHours * 3
  - Each meeting hour: -3 MP
  - Context switch (new project): -5 MP

MP recovery:
  - Completing a quest: +50% of MP cost refunded
  - Deep work block (>90 min uninterrupted): +10 MP
  - Delegation: +5 MP per delegated task

CAPACITY GATE:
  if (currentMP < 10): Cannot accept new quests
  if (currentMP < maxMP * 0.25): "Low Energy" warning on profile
```

### XP (Experience Points) — Growth / Progression

**Revised XP curve** (polynomial, replacing linear):
```
pointsForLevel(n) = floor(100 * n^1.8 / 1.5)

Level progression:
  L1:    67 XP    L6:  1,485 XP    L11: 4,114 XP    L16:  7,478 XP
  L2:   192 XP    L7:  1,891 XP    L12: 4,769 XP    L17:  8,332 XP
  L3:   387 XP    L8:  2,337 XP    L13: 5,457 XP    L18:  9,218 XP
  L4:   639 XP    L9:  2,822 XP    L14: 6,178 XP    L19: 10,136 XP
  L5:   941 XP    L10: 3,346 XP    L15: 6,932 XP    L20: 11,085 XP

Design principle: ~2-4 weeks of active participation per level-up at any level.
XP sources must scale with level (higher-level quests award more XP).
```

### Stamina — Focus / Deep Work Capacity
```
maxStamina = 8 hours/day (represents deep work potential)

Stamina drains from:
  - Every meeting: -duration in hours
  - Every interruption/context switch: -0.5 hours
  - Administrative overhead: -estimated hours

Stamina remaining = deep work capacity for the day
Track as rolling 5-day average for stability.
```

---

## 3. THE FLEET MODEL — Organizational Health Dashboard

### Individual "Vehicle Card" (Employee Profile)
```
┌─────────────────────────────────────────┐
│  [Avatar]  Mike C.  Lv.8 Mage          │
│  ─────────────────────────────────────  │
│  HP ████████░░░░  72/120  (Healthy)     │
│  MP ██████░░░░░░  48/100  (Moderate)    │
│  XP ████████████░  2,100/2,337 (→ Lv.9)│
│  ─────────────────────────────────────  │
│  STR ██░░  6   INT ████ 16  WIS ███░ 12│
│  CHA ██░░  8   DEX ███░ 11  CON ███░ 10│
│  ─────────────────────────────────────  │
│  Team: Alpha (Software+Cyber)           │
│  Streak: 23 days 🔥                    │
│  Credo: B:78 P:85 T:72 S:68            │
│  Utilization: 76% ✓                     │
│  Skills: Cloud Arch, ML/AI, Python      │
│  Freshness: 0.82 ✓                      │
│  Flight Risk: Low ✓                     │
└─────────────────────────────────────────┘
```

### Team "Fleet View" (Squad Dashboard)
```
┌───────────────────────────────────────────────────────┐
│  TEAM ALPHA — "The Data Dragons"  │  Guild Lv. 7      │
│  ───────────────────────────────────────────────────  │
│  Composition:                                         │
│  🛡️ Tank x1  ⚔️ DPS x2  🧙 Mage x1  🎵 Bard x1    │
│  Coverage: 85%  │  Gap: No Ranger (adaptability weak) │
│  ───────────────────────────────────────────────────  │
│  Fleet Health:                                        │
│  Avg HP: 68 (Yellow — 1 member at risk)               │
│  Avg MP: 52 (OK)                                      │
│  Utilization: 78% (Optimal range)                     │
│  Chemistry: 82/100                                    │
│  ───────────────────────────────────────────────────  │
│  Credo Radar:                                         │
│  Belonging: 80 ✓  Purpose: 75 ✓                      │
│  Transcendence: 65 ⚠️  Story: 70                     │
│  ───────────────────────────────────────────────────  │
│  Active Quests: 3/5 in progress                       │
│  Sprint Progress: ████████░░ 78%                      │
│  Dev Debt: 0.15 (Low ✓)                              │
└───────────────────────────────────────────────────────┘
```

### Organization "Fleet Map" (Boss View)
```
┌──────────────────────────────────────────────────────────┐
│  TKC TALENT COMMAND CENTER              Org Health: 74   │
│  ──────────────────────────────────────────────────────  │
│  [Isometric Board Game View]                             │
│                                                          │
│  Zone: Software+Cyber    Zone: Infra+Cloud               │
│  ┌──────────────┐       ┌──────────────┐                │
│  │ 🟢🟢🟡🟢🟢  │       │ 🟢🟢🟢🔴🟢  │                │
│  │ Chem: 82     │       │ Chem: 71     │                │
│  │ Util: 78%    │       │ Util: 88% ⚠️ │                │
│  └──────────────┘       └──────────────┘                │
│                                                          │
│  Zone: UX+Delivery       Zone: Sales+BD                  │
│  ┌──────────────┐       ┌──────────────┐                │
│  │ 🟢🟡🟢🟢    │       │ 🟢🟢🟡       │                │
│  │ Chem: 90     │       │ Chem: 65 ⚠️  │                │
│  │ Util: 72%    │       │ Util: 68%    │                │
│  └──────────────┘       └──────────────┘                │
│                                                          │
│  [Bench: 3 unassigned]   [Flight Risk: 2]               │
│  ──────────────────────────────────────────────────────  │
│  ALERTS:                                                 │
│  🔴 Infra team over-utilized (88%) — redistribute       │
│  🟡 Sales chemistry low — missing Mage archetype        │
│  🟡 2 employees dev debt > 0.5 — schedule training      │
│  🟢 Org-wide streak participation: 72%                  │
└──────────────────────────────────────────────────────────┘
```

---

## 4. QUEST SYSTEM

### Quest Types (mapped to RPG archetypes)

| Type | Workplace Equivalent | XP Range | Duration | MP Cost |
|------|---------------------|----------|----------|---------|
| Daily Quest | Check-in, daily log, micro-contribution | 5-15 | Same day | 3 |
| Side Quest | Help a colleague, small improvement | 20-50 | 1-3 days | 10 |
| Main Quest | Sprint deliverable, project milestone | 50-200 | 1-4 weeks | 30 |
| Quest Chain | Multi-sprint epic, certification path | 200-1000 | 1-3 months | 80 |
| Raid | Company-wide initiative (all teams) | 500-2000 split | 1-6 months | 50 |
| Boss Battle | Major demo, client presentation, crisis | 100-500 | Event-based | 40 |
| World Event | Hackathon, conference, seasonal challenge | Variable | Time-limited | 20 |

### Quest Design Principles
1. **Clear objective**: "Deploy the API endpoint" not "Work on backend"
2. **Visible reward**: XP + badge possibility shown before accepting
3. **Progress tracking**: % completion visible at all times
4. **Bonus objectives**: Stretch goals for extra XP (deliver early +20%, zero defects +30%)
5. **No catastrophic failure**: Failed quests give reduced XP, not zero (learning = XP)
6. **Flow calibration**: Quest difficulty should target 1.1-1.3x player capability

### Flow Ratio (difficulty scaling)
```
flowRatio = questDifficulty / (relevantAttrAvg * level * 0.5)

< 0.7:  TOO EASY  → suggest harder quest or add bonus objectives
0.7-1.3: FLOW ZONE → optimal engagement
> 1.3:  TOO HARD  → suggest party member to help or break into sub-quests
```

---

## 5. BEHAVIORAL ECONOMICS ENGINE

### Principle Application Matrix

| Principle | Mechanic | Where Applied | Ethical Guard |
|-----------|----------|--------------|---------------|
| **Loss Aversion** | Streak decay, provisional badges | Streaks, seasonal titles | Never take away permanent achievements |
| **Social Proof** | Activity feed, team comparisons | Dashboard home, leaderboard | Always frame positively, never show bottom ranks |
| **Endowment Effect** | Custom avatars, team identity | Profile, guild system | Carry identity across system changes |
| **Hyperbolic Discounting** | Instant XP on action, layered rewards | All contribution types | Balance micro-rewards with long-term meaning |
| **Anchoring** | Start at Level 3 after onboarding | New employee experience | Show next-level XP only, not lifetime total |
| **Commitment Devices** | Public quest pledges, team contracts | Quest board, guild charter | Always opt-in, mild social consequences only |
| **IKEA Effect** | Co-created team names/goals, custom quests | Guild setup, senior features | Keep creation tools simple with templates |
| **Prospect Theory** | Segregate gains, aggregate losses | Reward notifications | Multiple small celebrations > one big one |
| **Nudge Theory** | Default quest enrollment, timely prompts | Dashboard defaults | Limit to 2-3 nudges per session |
| **Status Quo Bias** | Auto-renew recurring quests, persistent teams | Quest system, guild membership | Easy opt-out at natural transition points |

### Reward Timing Structure
```
INSTANT:    XP animation, progress bar tick           (every action)
DAILY:      Check-in bonus, streak maintenance        (every 24h)
WEEKLY:     Summary with rank change, team progress   (every 7 days)
MONTHLY:    Level-ups, badge unlocks, leaderboard     (every 30 days)
QUARTERLY:  Season rewards, title promotions          (every 90 days)
ANNUALLY:   Prestige opportunity, legacy awards       (yearly)
```

### Streak System (with Variable Ratio Reinforcement)
```
Day 1-6:    +5 XP per check-in (base)
Day 7:      +25 XP (weekly milestone)
Day 14:     +50 XP + "Iron Will" badge (bronze)
Day 30:     +100 XP + "Unbreakable" badge (silver)
Day 90:     +250 XP + "Living Legend" badge (gold)
Day 365:    +1000 XP + "Mythic Dedication" badge (platinum)

Random bonus: 1-in-7 days = 3x-5x normal XP (variable ratio schedule)
Streak Shield: Earned after 14 days. Forgives one missed day. Consumed on use.
```

---

## 6. PLAYER TYPES (Bartle) — Design Weight

| Type | % of Users | What They Want | Feature Investment |
|------|-----------|---------------|-------------------|
| **Socializers** | ~80% | Connection, collaboration, belonging | 50% of features |
| **Achievers** | ~10% | Points, levels, completion | 25% of features |
| **Explorers** | ~10% | Discovery, hidden content, understanding | 15% of features |
| **Killers** | ~1% | Winning, exclusive status | 10% of features |

### Design Implications
- **Default leaderboard = Team**, not individual
- **Peer recognition** (gifting XP) is a primary mechanic, not secondary
- **Hidden badges** and **mystery quests** serve Explorers
- **Exclusive prestige titles** serve Killers (harmlessly)
- **Collaborative raids** serve Socializers and Achievers simultaneously

---

## 7. FLEET MANAGEMENT METRICS

### Alert System (adapted from fleet telematics)

| Alert | Trigger | Severity | Action |
|-------|---------|----------|--------|
| Utilization spike | >85% for 2+ weeks | Medium | Manager: review workload |
| Wellbeing dip | HP drops >15 points in 4 weeks | High | Manager: supportive 1:1 |
| Dev debt overdue | Training past due date | Medium | Auto-schedule dev time |
| Skill decay | Key skill unused >6 months | Medium | Suggest refresher or rotation |
| Engagement drop | Contribution frequency drops >50% | High | Manager + HR: investigate |
| Recovery deficit | No PTO in >90 days AND util >80% | High | Suggest mandatory recovery |
| Capacity breach | 100% utilization | Critical | Block new assignments |
| Flight risk | Composite score > 0.6 | Critical | Retention conversation |
| Team imbalance | Archetype gap detected | Medium | Review hiring/assignment |
| Streak break (long) | 30+ day streak broken | Low | Gentle check-in |

### Key Performance Indicators

| Category | Metric | Target | Alert |
|----------|--------|--------|-------|
| Health | Avg Wellbeing Index (HP) | >75 | <60 |
| Capacity | Utilization Rate | 70-85% | >85% or <60% |
| Energy | Avg MP Level | >40% of max | <25% |
| Development | Dev Debt Score | <0.2 | >0.5 |
| Skills | Freshness Index | >0.7 | <0.4 |
| Risk | Burnout Risk % | <10% of workforce | >15% |
| Risk | Flight Risk (top performers) | <15% at risk | >20% |
| Growth | Skill Velocity | 1-2 new skills/quarter | Stagnation |
| Team | Composition Health | >0.8 | <0.6 |
| Engagement | Quest Participation Rate | >70% | <50% |
| Knowledge | Cross-team Collaboration Index | >0.7 | <0.4 |
| Organization | Org Health Score | >75 | <60 |

### Organizational Health Score (composite)
```
OrgHealth = (0.25 * AvgWellbeing) + (0.20 * UtilizationBalance) +
            (0.20 * DevCompliance) + (0.15 * OutputEfficiency) +
            (0.10 * RetentionScore) + (0.10 * TeamCompositionFit)
```

---

## 8. TALENT MARKETPLACE — Dispatch Optimization

### Assignment Matching Score
```
MatchScore(person, project) =
    w1 * SkillFit          // Jaccard similarity of skill sets
  + w2 * GrowthAlignment   // Does this develop skills they want?
  + w3 * AvailabilityFit   // Do they have MP capacity?
  + w4 * TeamChemistry     // How do they fit with existing team?
  + w5 * FlowRatio         // Is difficulty in the flow zone?
  - penalty * ContextSwitch // Cost of pulling from current work
```

### IDEO-Style Team Formation
1. Project brief goes public on the Quest Board
2. Employees can "pitch" to join (express interest + what they bring + what they'd learn)
3. Project lead assembles team considering skill diversity, chemistry, growth needs
4. System shows MatchScore for each candidate
5. Teams are temporary — dissolve after project, reform for next one
6. No permanent departments — people belong to archetypes but work across them

---

## 9. SEASONAL CONTENT CALENDAR

| Quarter | Theme | Focus Credo | Special Mechanics |
|---------|-------|-------------|-------------------|
| Q1 | "New Horizons" | Story | Innovation challenge, new skill bonuses, fresh starts |
| Q2 | "Forge Alliance" | Belonging | Cross-team collaboration 2x XP, guild tournaments |
| Q3 | "Master's Path" | Transcendence | Certification fast-track, deep work rewards, flow tracking |
| Q4 | "Harvest Festival" | Purpose | Year-in-review, annual awards, legacy contributions, giving back |

Each season introduces:
- 3-5 limited-time badges
- A special quest chain
- Seasonal leaderboard (resets quarterly while permanent level persists)
- 1 "Raid Boss" (company-wide collaborative challenge)

### Prestige System (for max-level employees)
At Level 20, employees can "Prestige":
- Reset to Level 1 with a Prestige Star (P1, P2... up to P5)
- Permanent +5% XP multiplier per prestige level
- Exclusive Prestige-only badges and avatar items
- P5 Level 20 = permanent "Grandmaster" title

---

## 10. ANTI-PATTERNS — WHAT WE MUST NEVER DO

1. **Pointsification**: Points without meaning. Every XP source must connect to a Credo pillar.
2. **Mandatory fun**: System must be voluntary. Nudge, don't mandate.
3. **Surveillance disguised as gamification**: HP/MP are support tools, not punishment tools.
4. **Replacing compensation with badges**: Badges recognize. Paychecks compensate. Never conflate.
5. **Tying game metrics to formal reviews**: Inform conversations, don't determine outcomes.
6. **Showing bottom ranks**: Celebrate tops, hide bottoms. Never shame.
7. **Static content**: Plan seasonal refreshes from day one. The month-4 dip is real.
8. **Manager favoritism via bonus XP**: Cap manager awards at 20% of monthly XP, require justification.
9. **Punitive loss mechanics**: Use loss aversion on bonuses/multipliers, never on base progress.
10. **100% utilization as a goal**: 80% is optimal. 100% is a failure mode.

---

## 11. IMPLEMENTATION PRIORITY

### Phase 1 — Core Engine (Weeks 1-4)
- [ ] Revised XP curve (polynomial)
- [ ] HP/MP system with real-time calculation
- [ ] Quest system with flow-ratio matching
- [ ] Streak system with variable reinforcement
- [ ] Individual profile cards with vital signs

### Phase 2 — Fleet View (Weeks 5-8)
- [ ] Team fleet dashboard with chemistry + composition
- [ ] Organization command center (isometric board)
- [ ] Alert system with threshold triggers
- [ ] Utilization tracking and capacity gates

### Phase 3 — Behavioral Layer (Weeks 9-12)
- [ ] Talent marketplace / dispatch board
- [ ] Peer recognition / XP gifting
- [ ] Seasonal content system
- [ ] Predictive analytics (burnout, flight risk, hidden talent)

### Phase 4 — Intelligence (Ongoing)
- [ ] Skill adjacency mapping
- [ ] Knowledge compounding metrics
- [ ] Moneyball talent detection
- [ ] Career path routing (GPS metaphor)
