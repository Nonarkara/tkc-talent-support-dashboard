# Knowledge Base — TKC Talent Support Dashboard

Source-of-truth for decisions, meetings, and stakeholder signals that shape
this project. When something is decided in a room, it lands here. When an
older document contradicts a newer one, the newer one wins.

This is **not** a design doc (see `/CLAUDE.md`, `/GAME_ENGINE.md`,
`/TALENT_SUPPORT_GUIDE.md` at the repo root for those). This is raw history
— transcripts, summaries, screenshots, email threads.

## File naming

Follows the workspace convention in `/Users/nonarkara/Projects/CLAUDE.md §8`:
`TKC_[YYYY-MM-DD]_[TYPE]_[kebab-description].[ext]`

- `TXT` — raw text (transcripts, notes)
- `DOC` — structured analysis (summaries, decisions, action items)
- `DATA` — exports, CSVs, JSON snapshots
- `UI`  — screenshots, screen recordings
- `IMG` — photos

## Start here

**[Project synthesis →](./TKC_2026-04-23_DOC_knowledge-base-synthesis.md)** —
what we're doing, why, and what's next, pulled from every meeting on
file. Open this one first.

**[Mechanics + Sheets audit →](./TKC_2026-04-24_DOC_mechanics-sheets-audit.md)** —
backend-only audit of the game mechanics, Neon/Sheets pipeline contract,
and the current route-level consistency gaps.

## Index

### Audits

| Date       | Title                              | Files                                                                                  | Outcome                                                                 |
|------------|------------------------------------|----------------------------------------------------------------------------------------|-------------------------------------------------------------------------|
| 2026-04-24 | mechanics + Sheets pipeline audit  | [audit](./TKC_2026-04-24_DOC_mechanics-sheets-audit.md)                               | Mapped live mechanics, route-level DB/Sheets flows, and top sync risks |

### Meetings (`meetings/`)

| Date       | Title                                                 | Files                                                                                                                                                      | Outcome                                                                                  |
|------------|-------------------------------------------------------|------------------------------------------------------------------------------------------------------------------------------------------------------------|------------------------------------------------------------------------------------------|
| 2026-04-17 | depa × TKC kickoff (Thai minutes)                     | [summary](./meetings/TKC_2026-04-17_DOC_depa-tkc-kickoff-summary.md)                                                                                       | Ninja Team concept introduced; Dr Non committed to help on AI, gamification, Ninja Team  |
| 2026-04-21 | TKC management review — matrix org + ninja squad demo | [transcript](./meetings/TKC_2026-04-21_TXT_management-meeting-transcript.txt) · [summary](./meetings/TKC_2026-04-21_DOC_meeting-summary.md)                | Green-lit 6-month sandbox; management loved RPG card UI; requested 5 follow-up features  |

### Decisions (`decisions/`)

*(empty — first entries will land here after Phase 3 reviews)*

### Signals (`signals/`)

Bits of feedback worth remembering that don't belong to a specific meeting
(Slack threads, corridor comments, screenshot annotations).

*(empty)*

## How to add a new entry

1. Drop the raw file into the right sub-folder with the naming convention above.
2. If it's a meeting, write a companion `_DOC_` summary that extracts:
   - Participants (role + who said what mattered)
   - Decisions made
   - Explicit asks from management
   - Things Dr Non committed to
3. Add a row to the index table in this README with the outcome in plain English.
4. If the entry produces work items, create matching issues / tasks — don't let asks die in a markdown file.
