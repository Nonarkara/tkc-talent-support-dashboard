/**
 * Build version — the cassette ROM revision.
 *
 * We iterate the cartridge visibly. Each revision gets a number and a
 * short DQ3-flavour codename so the user can tell at a glance which
 * mechanics are live. Shown in the top-left of /command-center next to
 * the TKC X wordmark.
 *
 * History
 *   v1 · Sheets               Google Sheets only. Manual HR tracking,
 *                             the literal first version of this system.
 *   v2 · Command Center       Next.js + Postgres dashboard wrapped
 *                             around the Sheets, with fire-and-forget
 *                             mirroring so the Sheet stays authoritative
 *                             for humans while Postgres is source of
 *                             truth for the app.
 *   v3 · Cassette             DQ3-canon archetypes (Hero / Soldier /
 *                             Wizard / Pilgrim / Merchant), 32×32
 *                             gendered sprites with 6-slot palette
 *                             variation, Formation + Resources tabs,
 *                             readiness = coverage·0.45 + quality·0.25
 *                             + chemistry·0.15 + morale·0.15.
 *   v3.1 · Party Split        DQ3 EXP-split: over-staffed slots now
 *                             dilute readiness. A new `party_split_pct`
 *                             feeds the formula at weight 0.05 (taken
 *                             from coverage). Hoarding a slot costs
 *                             visibly instead of silently.
 *   v3.2 · Alltrades          Alltrades Abbey ledger. `vocation_changes`
 *                             table records every reskilling event;
 *                             POST /api/alltrades appends + mirrors to
 *                             the VocationChanges Sheets tab. Infra
 *                             tonight, UI follow-up on the Roster card.
 *   v3.3 · Front Row          DQ3 party order. Every allocation carries
 *                             a row (1=front/2=mid/3=back). Captain in
 *                             front + scout in back earns +5 chemistry
 *                             which feeds readiness. `project_allocations`
 *                             gains a `party_order` column; the Formation
 *                             Sheets mirror encodes `empid@dim@order` and
 *                             emits front_count / mid_count / back_count.
 *   v4.2 · Fluid Legend      SNES-grade 16-bit sprites (64x64) with
 *                             shading and vocation gear. Obsidian-style
 *                             Social Graph in Lobby. URL-based routing.
 *                             Optimized path-based SVG rendering.
 *   v4.3 · Alive             Org Grade (S/A/B/C/D/F) on home screen.
 *                             Sprint countdown (days to cycle end).
 *                             Editable hero attributes in Roster.
 *                             MatrixGrid scenario rebuild (Codex).
 *                             Ticker shows ORG not SET (synthetic price).
 *   v4.4 · Talk-to-Fill      Conversational stat builder. Open any
 *                             hero card → "Compose with AI" → answer 3-4
 *                             questions → AI proposes full DQ3 profile.
 *                             Review, nudge, approve. Writes Postgres +
 *                             Sheets + AI live context all in one chain.
 *                             ICA Index (I/C/A bars + score) on every
 *                             card — reacts live to stat changes.
 *                             Live AI context: chatbot reads real DB on
 *                             every call (heroes, formations, anchors).
 *                             ProjectTrajectoryStrip: financial burn /
 *                             weeks-left / projected / margin + spark.
 *   v4.5 · Real              May 2026 dossier merged: 320 employees with
 *                             real names (EN), gender (215m/105f), DOB,
 *                             education, ส่วน, certifications (77 records),
 *                             KPIs (62 rows). 28 missing employees become
 *                             ghost rows: greyed sprite + halo + "Departed
 *                             Apr 2026" badge. PlayerCard gains a
 *                             narrative one-liner. Tome rebuilt as a
 *                             CEO-signed Letter of Recommendation derived
 *                             entirely from real DB facts. DQ3 sprite
 *                             takes a real `gender` prop — no more 50/50
 *                             RNG.
 *
 * Bump both fields together. Codename stays one or two words.
 */

export const BUILD_VERSION = "v4.5";
export const BUILD_CODENAME = "Real";
