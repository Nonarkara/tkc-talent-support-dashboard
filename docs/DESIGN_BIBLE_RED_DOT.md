# TKC X — Design Bible

**Submission category — Red Dot Design Award · Brands & Communication Design 2026**

---

## What this is, in one sentence

**TKC X is the first HR system designed for the eight-thousand days between hello and goodbye.**

Hiring and firing are the only HR moments anyone studies. The 2,000–10,000 days *in between* — the actual life of being supported at work — have no design language. The category is full of compliance plumbing wearing a UI. TKC X is in a different category. This document defines that category.

---

## The problem

Existing HR software is built around three artifacts: the offer letter, the performance review, and the white envelope. These three documents define the legal scaffold of an employment relationship. They define almost nothing of what it feels like to be supported by an institution.

The 2,000-day reality between those documents is where careers are made or quietly broken — where a senior burns out unobserved, where a quiet hero never gets visibility, where a manager forgets to write down what just happened, where a junior loses their flow because their challenge outruns their skill by a week. None of that lands in any HR system on the market. It lands in private chats, in a manager's notebook, or in nothing at all.

When the white envelope arrives, twenty years of presence collapse into a one-page legal document. Nothing of the person remains in the institution. Nothing of the institution leaves with the person. **This is the most asymmetric design failure in modern enterprise.**

We solve it.

---

## The three observations the system rests on

1. **Gamification fails when it is points and badges; succeeds when it is narrative and ritual.**
   Bartle's player taxonomy — *achievers, explorers, socialisers, killers* — applies to office workers. Most HR tools serve only achievers. We address all four by giving the system a *world* (the Codex) instead of a leaderboard.

2. **Csíkszentmihályi's flow has eight conditions.** Almost every existing HR product violates at least four of them — opaque goals, delayed feedback, mismatched challenge/skill ratios, no autotelic loop. TKC X is built so the manager opening the app each morning experiences flow themselves, and so the data they generate keeps every employee on their team in their own flow zone.

3. **The white envelope is a design failure that can be inverted.**
   Solve it elegantly and the system becomes the most humane piece of enterprise software ever shipped. The Tome — a printed hardcover of an employee's full institutional record, given on departure — is that inversion. It is the showpiece.

---

## Three design principles

### 1. Ritual before rule

Every workflow is a named ceremony with a tone, a duration, and an aftermath. The check-in is not a "weekly check-in form." It is **The Chronicler's Scroll** — *Scribe, Divine, Ratify.* The act of naming the workflow changes what gets done with it. *Save* becomes *Lock the Squad.* *Approve* becomes *Ratify the Chronicle.* *Open employee* becomes *Open the Tome.* The vocabulary is the brand.

Seven canonical rituals govern the full daily life of the system:

| Ritual | Cadence | Aftermath |
|---|---|---|
| **The Chronicler's Scroll** | Weekly per direct report | One paragraph + ratified stat deltas |
| **The Ascension** | Triggered automatically on XP threshold cross | One 400 ms glow on the card; nothing else |
| **The Lend** | When allocation < 100% | Goodwill stamp on League row |
| **The Retirement** | On departure | The Tome — printed hardcover |
| **The Recognition** | Weekly, intentional | Public stamp into the Tome |
| **The Briefing** | Daily, automatic | Five-minute morning narrative per manager |
| **The Closing** | Weekly, Friday | Three lines per active project blended into a House newsletter |

These are not metaphors. They are the canonical action names rendered in the UI.

### 2. The system teaches itself

Don Norman's promise. Every metric, every glyph, every status pill answers *"why does this exist?"* on hover. **Codex** (`?` keypress) is the deep version: a 363-line in-app operating manual, glossary plus narrative, slid in from the right. **`<TermDef>`** is the shallow version: any acronym in the UI carries a dotted underline; hover surfaces a one-sentence definition pulled from a single source of truth.

Nobody opens a manual. The system reveals itself as you use it. A new director hired tomorrow can run the system within thirty minutes by hovering their way through it.

### 3. The narrative has provenance

What managers write about their people is the audit trail. The numbers are the game state, but **the paragraphs are the truth.** Every chronicle, every recognition, every flag is signed, dated, and preserved in the Tome — searchable forever, exportable to Obsidian today, printable as a hardcover at retirement.

A consequence: the system never produces a forced ranking. It never compares peer to peer. It never shows salary outside finance. It produces a *record of presence*, not a verdict on it. This is encoded in the Codex as a binding rule and surfaced to every user who opens the app.

---

## The eight components of flow → the eight UI affordances

| Component (Csíkszentmihályi) | TKC X affordance |
|---|---|
| Clear goals | Per-quest bill-of-materials with five slot dimensions |
| Immediate feedback | Mirror writes within 200 ms of every save (Sheets pipe) |
| Challenge ≈ skill | The **Flow Indicator** per employee per week |
| Action–awareness merging | Cassette-save — the act of saving is part of the work, not separate from it |
| Concentration on the task | One screen, no permanent tab bar; Menu overlays, Esc returns home |
| Sense of control | **Game Balance** sliders — the boss tunes the engine without redeploy |
| Loss of self-consciousness | The **Lobby** — agents drift, chat, work without surveillance UI |
| Distorted time / autotelic | The **Tome** — ten years of a career compressed into a hardcover |

All eight have working implementations as of v8.4. No HR product in market has any.

---

## The white envelope, re-engineered

In Thailand and across Southeast Asia, when an employee leaves a long-tenured employer the institution hands them a white envelope. The envelope contains a sum. That sum is the entire artifact of those years.

**The Retirement Ritual** replaces this with **the Tome** — a printed hardcover book.

- *Cover.* Their pixel sprite, their final class, their banner-epithet from the Codex.
- *Inside.* Every chronicle paragraph any manager ever wrote about them, in chronological order. Every formation they played. Every quest they led. Every ascension. Every lend given and received. Every recognition. Every memo signed.
- *Closing.* A signature line for the MD. A Tome registry number. The date.

Printed at the company's expense. Given to the leaving employee in a handover ceremony — small, internal, theatrical-restrained, never performative.

The institution keeps a digital twin in the Tome registry, searchable forever as institutional memory. When a future manager faces a similar problem, the Oracle can surface *"Khun Suchada faced this in 2012 — here is what she did."*

The departure stops being a transaction. It becomes a graduation. **The same single inversion explains why the system is in a different category — and why it deserves a Red Dot.**

---

## What this is not

- It is not a performance management tool. It tracks presence, not verdicts.
- It is not a hiring funnel. It does nothing about candidates not yet inside the House.
- It is not surveillance. The salary field never leaves finance; peer comparison is structurally absent; ranking is not a system output.
- It is not for any company. The vocabulary, the rituals, and the Codex are designed for one specific institution — TKC, a Thai mid-cap technology firm with 348 active heroes. The artifact is the *exemplar* of a category, not a generic SaaS shell.

---

## The aesthetic stance

Built to four constraints, all of which are encoded in `CLAUDE.md` §11 as immutable anti-regression laws:

1. **Geometric, mono-accent, high-contrast.** No border-radius greater than zero. No gradient fills outside dark-over-photo legibility overlays. No drop shadows other than `inset` border substitutes and accessibility focus rings. The four CSS tokens for radius and the three for shadow are explicitly *zero* in `styles.css`.
2. **Subway-flat plus tabletop RPG.** New York Subway signage layout for chrome (corner pills, two-line metric tiles, monospace numerics). Dragon Quest III status windows for content (the bordered MenuWindow primitive, the player card with sprite + class glyph + six-stat block).
3. **Thai typography is non-looped only.** A Thai reader recognises a non-Thai-made artifact in a single glance by its looped หัว (head-loops). The system uses **IBM Plex Sans Thai** as primary and **Noto Sans Thai** as fallback. Sarabun, IBM Plex Sans Thai *Looped*, and TH Sarabun New are explicitly forbidden across every Thai-facing surface in the codebase.
4. **Every photo earns its pixels.** No Unsplash filler, no Lorem Ipsum, no generic "Feature 1 / Feature 2 / Feature 3" placeholder. Every visible image, headline, and number is real, sourced, and attributable.

---

## The submission story arc

> A small Thai technology house, 348 people, one director who refuses to let people disappear into a spreadsheet. He commissions a system that names every workflow as a ritual, gives every employee a class and a banner, writes the operating manual into the UI itself, and ends every employment with a printed book of the person it remembered.

What gets submitted to the jury:

- A walkthrough video of the eight flow affordances in use across one full simulated day.
- The Codex, exported as a 32-page printed booklet.
- One real Tome — handed in as a physical artifact, with the consent of the volunteer employee whose career it documents.
- This Bible.

The jury sees something they have not seen before: enterprise software with a literary voice, a typographic position, and a *thesis* about the eight thousand days between hello and goodbye.

That is the bid.

---

*Last revised 2026-04-27. Subject to addition only — never deletion. The Bible extends; it does not retract. New rituals are appended. Existing principles are immutable.*
