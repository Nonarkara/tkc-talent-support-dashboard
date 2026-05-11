# MANUAL.md — first-pass walkthrough notes

After completing the first draft of `docs/MANUAL.md` (v1.0 for ROM v4.6 "Pulse"), I read it cold as if I were a TKC employee who had never seen the system. This file captures every issue the walkthrough surfaced and the in-place fixes that were applied to the manual itself. Both this file and the manual were edited in the same session, so the manual you see in `MANUAL.md` is the post-walkthrough version.

## Reading posture

I treated the audience as a TKC employee — director-level or middle manager — opening the manual on day one of the rollout. They have not read `CLAUDE.md`, `GAME_ENGINE.md`, or any source file. They know their company. They do not know this game.

The three failure modes I scanned for, per Dr Non's instruction:

1. **Hidden context** — the manual assumes a fact the reader doesn't have.
2. **Hand-waving** — a mechanic is named but not actually explained.
3. **Motivational text** — copy that *sounds* meaningful but doesn't tell the player how to do anything.

## Findings and fixes

### 1. §2.1 — "freshness" was named but never defined (hand-waving)

The two-sided-puzzle diagram listed `skills (level + freshness)` on the people side, but "freshness" never reappeared in the manual. A reader hits this term and has to either guess or skip. Worse, freshness *is* a real mechanic — it rides the Standards Workshop drawer and modulates the Quality component.

**Fix:** added a footnote directly under the diagram defining freshness as month-aged use of a skill, with the >6-month staleness threshold called out, and noted that it feeds Quality through the Standards Workshop. Reader now has the operational meaning at the moment they need it.

### 2. §2.4 — Cap-math units were muddled (hidden context)

Original text said "A ฿2,000,000-per-month project gives you a ฿200,000-per-month team budget" and then immediately said "the team costs ฿2.4M/year, the project must be worth ฿24M total". The reader has to infer that "project worth ฿24M" means *annual revenue*, not total contract value, to make the 10× rule consistent with a ฿2M/month billing rate.

This is the kind of unit confusion that loses a manager 30 minutes on a real bid. Not acceptable.

**Fix:** rewrote §2.4 to name the units explicitly:
- "Project monthly billing ÷ 10 = monthly team salary cap" (was: "Project budget ÷ 10")
- "10× viability rule, applied annually: project annual revenue must be at least 10× the team's annual cost" — restated cleanly with the ฿2.4M/year × 10 = ฿24M math written out.

The rule now reads correctly the first time.

### 3. §2.7 — Worked-example arithmetic was wrong (hand-waving disguised as math)

The single most damaging issue, and the one that took two passes.

**First pass.** Original example used these salaries:

```
Pim 60 + Tong 45 + Gun 40 + Aey 28 + May (30·.5=15) + Som 35 + Ple 25 + Boy (22·.5=11)
= 259 CP   over a 200 CP cap by 59
```

Then the manual proposed three legal moves. Move 2 ("Drop Khun Aey, save 28 CP, total 231 CP, **under cap**") — except 231 is *not* under a 200 cap. The example was claiming a fix that doesn't fix anything.

I rebuilt the salaries (Pim 50, Tong 38, Gun 32, Aey 22, May 24, Som 30, Ple 22, Boy 18) and re-checked. Total 215, over by 15. Move 2 (drop Aey) now lands at 193 CP — under cap, correct. *But* the post-iteration "after two more drag iterations" prose was still wrong: it claimed 100% coverage at 198 CP, when the actual sum (Aey kept, May reassigned, Boy raised to 1.0) is 212 CP, and coverage with the original 10-slot BOM tops out at ~70%.

**Second pass.** The structural problem: a 10-slot project with the listed seniority cannot fit under 200 CP at full coverage. The cap is genuinely tight. So I shrank the example brief itself — from the original 10-slot ambitious BOM (5 tech / 1 sales / 1 marketing / 2 outsourcing / 1 paperwork) to a 6-slot Phase 1 BOM (3 tech / 1 sales / 1 marketing / 1 paperwork). The narrative now frames Phase 1 as a focused launch with the vendor stack handled in a later Phase 2. This is also more realistic: real consulting engagements are phased.

With the smaller BOM and a cleaner draft (7-hero ambitious team that overstuffs tech to chase the +5 chemistry bonus), the math now resolves end-to-end:

- Draft: 214 CP, over by 14, party-split nudge fires.
- Move 1 (drop May, lose chemistry bonus): 190 CP, under by 10.
- Move 2 (drop Aey, keep chemistry bonus, take quality hit): 192 CP, under by 8.
- Final state after Move 2: readiness **89** (verified by hand: 100·.40 + 87·.25 + 100·.05 + 78·.15 + 72·.15 = 89.25).

The Move 1 vs Move 2 choice now teaches a real trade-off (chemistry bonus vs native fit quality), not a fictional one.

### 4. §2.8 — Decision flow omitted Option D Defer (hand-waving)

Section 2.8 listed four moves to adjust a task — A re-weight, B reshape BOM, C split into sub-quests, D defer/scope down. Then the ASCII decision flow at the bottom only branched into A / B / C. Option D was missing entirely from the visual.

For the section that explicitly tells the player "deferring is better command than forcing a bad deploy", omitting Defer from the flow chart is the worst kind of motivational-text trap — the principle is stated, but the operational guidance contradicts it.

**Fix:** added an upstream branch to the flow chart — "Can the team even ship the smallest viable version this cycle?" → if NO, route to D. Defer. This now matches the four-options text and gives the player a visible path to the boldest move.

### 5. §3.5 — Suggested using Alltrades reskilling for a tactical chemistry bonus (motivational text masquerading as tactic)

In §3.1 Front-Row +5, the original text said: "If you don't have a scout, **promote a balanced specialist to scout duty for the cycle** via Alltrades (see 3.5)."

That's wrong on two counts. (1) Alltrades is a permanent vocation change with stats halved and level reset — using it to harvest a +5 chemistry bonus on one cycle is grossly off-policy and would be a real-world HR incident. (2) The chemistry bonus is computed on **row position**, not on archetype, so the bonus actually accrues to whoever is in row 3 regardless of vocation.

The original text would have actively misled a director into making a damaging move. Removed.

**Fix:** rewrote the fallback advice to: "set a generalist hero — usually a captain or another scout from a sister team — to row 3 for this project. The bonus is computed on row position, not vocation, so the back-row hero gets you partial credit. Do **not** trigger an Alltrades reskilling just to harvest the bonus." The mechanic is now correctly named, and the off-policy temptation is explicitly forbidden.

### 6. §4.1 / §4.4 — "rotations" vs "transfers" used interchangeably (small but corrosive)

§4.1 said "two free quarterly transfers". §4.4 then said "2 free transfers / quarter" but described "rotation past your two free transfers" — and earlier in §3 / §C.2 the word "rotated" appears in Chronicle quotes. A reader who is trying to use the manual as reference (which is what manuals are for) ends up wondering whether rotations and transfers are the same thing or not.

**Fix:** in §4.1 standardised "every rotation past your two free transfers" → "every transfer past your two free transfers per quarter". Kept "rotated" in Chronicle quote-text since that's what's actually written into the event log historically. Glossary entries unchanged.

### 7. §5.1 — "women cluster with women" read value-laden in a player manual (motivational/ideological-feeling copy)

The Lobby physics model genuinely uses gender as one of several affinity dimensions, and the original text reflected that accurately: "Tech folks cluster with tech, women cluster with women, the Sales bench drifts toward the door." Inside the codebase this is a neutral statement of a model parameter. Inside a player-facing manual issued to all 320 employees, the same sentence reads as a value claim — that women *should* cluster with women, or that this is a desirable feature.

The Lobby's purpose is to *surface* the social patterns the floor is already showing, not to prescribe them. The manual should say so.

**Fix:** rewrote the affinity bullet to: "soft pull between heroes who share department, archetype, demographic background, or skill set. The model approximates the social patterns the floor actually shows: tech folks gravitate toward each other, the sales bench drifts toward the front door, people of similar background tend to cluster. The point is not to *prescribe* the clustering — it's to make it visible so you can read it."

The mechanic is unchanged. The framing is now player-facing rather than implementation-facing.

### 7a. §5.4 / §C.1 — Cross-references that depended on the old §2.7 needed updating (consistency)

The Sapphire example bleeds into two later sections. Both had to be reconciled with the new §2.7.

- **§5.4 Scouting scenario** — original framing was "Team Sapphire is over cap by ฿59k and short on a Scout in the back row". Both numbers and the framing are obsolete: the new §2.7 already has Khun May as Scout in the back row, and the over-cap figure is now ฿14k. Rewrote §5.4 as a *follow-on* scenario: Sapphire shipped Phase 1, May is fatigued three weeks in, and Director A wants to find a fresh Scout for Phase 2 next cycle. Same lesson (use the floor to scout chemistry); honest continuity with §2.7.
- **§C.1 Sapphire deploy session** — narrative numbers (Readiness 71 → 84, "three Wizards stretched into Sales seats", priority re-weight 4 → 6) all came from the old 10-slot BOM. Rewrote §C.1 as the day-by-day arc *of* the §2.7 example: ambitious draft → Move 2 → readiness 89 → cycle runs → outcomes recorded → cycle score 172 (verified: 100 × 1.2 × 1.3 × 1.1 = 171.6). The two sections now describe the same cycle from two angles instead of two contradictory cycles.

  A second-order finding from this reconciliation that I almost missed: my first pass at §C.1 had Director A's draft-1 score at "Readiness 76", on the assumption that the over-cap, party-split-penalised draft would obviously score worse than the post-iteration team. Plugging the numbers in proved that wrong: party_split's weight in the readiness formula is only 0.05, so an over-stuffed slot only drops the score a point or two, not double digits. Draft-1 actually scores **90** — slightly *higher* than the post-iteration team at 89. The real reason draft-1 fails is not the readiness — it's the **cap**, which is a hard gate. So §C.1 now teaches that explicitly: "a high readiness on an over-cap team is unlockable; the cap is a hard gate, the readiness is a soft signal". That single sentence is probably the most useful operational insight in the whole appendix.

### 8. §C.2 — Sample session referenced the trade view as if it were shipped (hand-waving)

§6.3 explicitly notes the trade mechanic is "partially shipped". Then §C.2 narrates a session where "Director B opens trade view" with no acknowledgement that this UI doesn't yet exist. A reader following the example would go look for the trade view, fail, and lose trust in the rest of the manual.

**Fix:** added an opening note callout to §C.2 stating that the trade view is on the roadmap and that the session is showing the *manual* workflow that approximates a trade today, plus the Chronicle and chip movements the eventual one-click trade will encode. Then rewrote the body of the session to describe the actual current process (manual chip-ledger edit, two Chronicle events) rather than the fictional one-click flow. Salaries also brought into line with §2.7's revised numbers (Pim 50, Joy 30) so the two examples match.

## What I deliberately did *not* change

- **§1.1 introduction of "the consultant".** The unnamed consultant is the narrative voice; naming Dr Non in a player manual issued company-wide would be self-promotional and out of register. Left as-is.
- **§5.5 "Letter of Recommendation".** Could be hand-waved as a feature that doesn't exist — but it's currently shipped (Tome rebuild in v4.5 "Real"). Left as-is.
- **The whole story tone in §1.** Reads close to motivational copy in places ("the consultant proposed something different from a binder"). I held it because the section's job is to give the reader a model for *why* the system exists — and the operational sections (§2 onward) carry the load of *how*. Pure how-to in §1 would feel like opening a board game manual with the rules and skipping the back-of-the-box pitch. The DnD Player's Handbook does the same thing.
- **Appendix B Quick-reference card.** Considered whether to also add an Appendix B' covering the Lobby reading patterns. Held — the Quick-reference card is meant to be the printable single-page cheat sheet, and adding more would push it over a page.

## Net change

Nine targeted edits, no structural changes, no sections renamed or removed. The manual still hits all seven of Dr Non's bullets. The math is now verifiable, the units are now consistent, the tactics no longer contradict the policies they sit next to, and the social-physics description no longer reads as prescriptive. One sample session (C.2) is now honestly flagged as future-tense.

The next walkthrough should be conducted by a real TKC employee, not by me — there are surface-area issues (concrete department names, real project names, real role titles) that no self-walkthrough can catch.

---

# Addendum — v1.1 Kingdom Expansion (2026-05-11, same day)

After Dr Non gave the expanded storyline (TKCX as a kingdom, Sim City / Animal Crossing endless-play framing, manager Save/Lock workflow, weekly observation feeds, the PMO as the watcher behind the curtain, voice via Wispr Flow), the manual was rewritten end-to-end at v1.1. The core v1.0 mechanics chapters (archetypes, fit matrix, salary cap, sample sessions, anti-patterns) were preserved verbatim or near-verbatim and re-numbered. New chapters wrap them.

This addendum captures the issues the second self-walkthrough surfaced and what I did about them.

## v1.1 — additional findings

### a1. The §1 storyline got long enough to swallow the lead

First v1.1 draft of §1 included the kingdom intro, the five tensions, the cassette metaphor, why-a-game, the 4C compass, *and* the four-trend victory cascade — all in one section. By the third sub-heading the reader has not yet been told what they will *do*. Fixed by tightening §1.7 and pushing the long victory-cascade discussion to a dedicated §10. §1 now sets the stakes; §10 closes the arc.

### a2. §2 originally framed buildings as "optional metaphor"

I caught myself writing "you can think of the buildings as a metaphor for…" — which is exactly the wrong move. Buildings are *real*; TKC has a head office, satellites, and DC racks that heroes physically inhabit. Rewrote §2.1 to lead with the literal physical reality, then explain how the cassette models it. The "metaphor" framing weakened the operational truth.

### a3. The five affinity layers had to be ranked by strength

First draft listed the five connection layers (profession / team / org / friendship / personal) as a flat bullet list. A reader looking at a clustered Lobby would have no way to weight what they're seeing. Added "in roughly this order of strength" with profession first (correlates with daily working language) and personal-relationship last (only what HR has been *told* and given permission to record). The strength ordering is what makes the visual reading useful.

### a4. §3 Save/Lock needed an Unlock-with-audit emphasis

First draft said "Unlock then re-edit". This invites stealth edits at 11pm before sprint lock. Made the Unlock explicitly require re-authentication and explicitly write to `game_adjustment_log`. The lock is the cassette's defence against silent drift in the brief — the audit trail makes "I'll just nudge the BOM real quick" impossible.

### a5. §3.7 Voice-mode needed an authorisation guard

Wispr Flow is fast and frictionless — which is exactly the failure mode. A team lead could speak "drop my margin target to 10% and add five paperwork seats" and the cassette would happily apply it if there were no role check. Added the "Authorisation is per-role" principle and the "diff-confirm-then-write" requirement up front. The cassette is fast; it is not autonomous.

### a6. The PMO section needed real numbers, not generic ones

First draft of §7 used placeholder figures for the four headline tiles ("e.g. 95% of target"). Replaced them with the actual values from the PMO Portfolio Dashboard PDF (4/10 active, 94% Project Value vs Target with ฿18M remaining, 70% Billed vs Project Value with ฿86M remaining, 73% Burn Rate with ฿53M remaining) — these are clearly placeholder numbers in the source PDF too, but using them anchors the reader in real shapes rather than abstract percentages. The Instalment Payments timeline in §7.5 reproduces the actual monthly bar pattern from page 4 of the PDF, including the June dip and the August / November ridges.

### a7. §10 endless-game needed concrete language for "no win condition"

First draft said "the game has no end condition" — accurate but sterile. Rewrote with three concrete game references the audience will recognise (Sim City, Animal Crossing, DQ3-after-Zoma — the last specifically because Dr Non named it as his childhood touchstone). Then explicitly stated the implication for the player: "stop looking for the win condition. There is none. There are only trends." A direct instruction beats abstract framing.

### a8. The four-trend cascade needed lag estimates

First draft listed the four trends (chair, revenue, buzz, share price) as if they all responded equally fast. A director reading this would expect to see the share price move when the chair moves. Wrong. The lags are real and big — chair to revenue is quarters, revenue to buzz is weeks, buzz to share price is more weeks. Added explicit lag language so a director who doesn't see the share price react this week doesn't conclude their work isn't working.

## What v1.1 deliberately did *not* fix

- **The "five LeBron Jameses" example in §4.3** uses NBA-scale salaries. Dr Non's brief explicitly used the LeBron framing, so I kept it for fidelity. Open question in the DEVLOG about substituting a Thai-anchored example in v1.2.
- **Sample session C.4** narrates the PMO catching an anomaly. The exact thresholds (88% triggers a watch but not the alarm; 85% triggers the alarm) are made up to illustrate the mechanic. They should be tuned with real PMO input before this session is shown to anyone in TKC.
- **§2.4 layer 5 "personal relationship (recorded — opt-in)"** — this layer is documented in the manual but not currently in `LobbyTab.tsx`'s affinity model. Open question in the DEVLOG.

## Net change at v1.1

Manual grew from ~920 to 1,678 lines. Three brand-new top-level sections (§2 Buildings/Lobby, §3 Setting the Task, §7 PMO, §10 Endless Game). One existing section (old §5 Lobby) folded into new §2. All v1.0 mechanics chapters preserved with section-number renumbering. New sample session (C.4 PMO intervention). Glossary expanded by 13 terms. Quick-reference card updated with margin-projection check + PMO tile reads.

The structural change is the biggest thing: the manual now reads as a *coherent kingdom narrative* (story → daily entry → setting tasks → assembling teams → playing → being watched by the PMO → improving over seasons → lifting all four C's → playing forever) rather than as a flat reference. The arc matches Dr Non's expanded brief.
