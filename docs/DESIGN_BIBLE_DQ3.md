# DQ3 Design Bible — TKC X (Talent Knowledge Collaborative)

**Status:** canonical · **Last updated:** 2026-04-24

> **Codename:** The product is **TKC X** — *Talent Knowledge
> Collaborative*. "TKC" alone is the company name. "TKC X" is the
> platform: the cassette, the save-game, the single-screen command
> room. Use **TKC X** in wordmarks, metadata titles, and Sheets labels
> going forward.


Every design decision in this codebase descends from **Dragon Quest III**
(Chunsoft, Famicom, 1988). The app is not "inspired by" DQ3. It **is**
DQ3, ported to a corporate staffing problem. When a new screen, window,
or control needs designing, read this file first.

---

## The one-sentence rule

> **One screen. Nested windows. Navy border. Gold-tab titles. Sharp corners. Pixel font for chrome, crisp text for data. Home, Back, Menu always visible.**

If a proposal breaks any of those words, it's not DQ3, and it doesn't ship.

---

## Canon table

| DQ3 convention | How this dashboard honours it |
|---|---|
| One screen, nested menus | `/command-center` is the only boss-facing route. Tabs are panels inside it, not separate pages. |
| Blue bordered dialog window | `MenuWindow` component: navy fill, gold title-tab, 2px navy border, zero rounding. |
| Command menu is a grid | Home screen's `cc-command-list` six-button grid (Cockpit · Formation · Ninja · Matrix · Roster · Signals). |
| Party status top-right | `cc-top-controls` chrome: Back / Home / Menu + live sync indicator. |
| Tile-fade between screens | `.anim-screen-enter` with `steps(8, end)` — quantised, not smooth. |
| Grid movement, no free-scroll | `.cc-console` locked `overflow: hidden`. No smooth scroll anywhere. |
| Sharp edges, no rounding | `border-radius: 0 !important` on `*` in `globals.css`. |
| Bitmap font for menu text | Press Start 2P on headings, buttons, labels. Sarabun/Helvetica on body copy (readability at modern DPI). |
| Character-by-character text reveal | Reserved for ceremonial moments only (welcome, save confirmations). Do not instrument globally. |
| Audio cues (menu bloop, confirm ding) | Phase 4. Out of scope for this pass. |

---

## Palette — tokens in `globals.css`

| Role | Token | Hex |
|---|---|---|
| Page base (warm brown, off the canvas) | `--bg-base` | `#1a1209` |
| Surface (slightly lighter) | `--bg-surface` | `#231a0f` |
| DQ3 menu window fill | `--ink-4` (navy) | `#0c1a3d` |
| DQ3 menu border / accent | `--rpg-blue` | `#2B5FA0` |
| DQ3 title-tab yellow | `--rpg-yellow` | `#E8C547` |
| Paper-white text | `--ink-0` | `#F5F0E8` |
| Secondary text | `--ink-1` | `#d9d1c2` |
| Muted metadata | `--text-muted` | `#8a7f6b` |
| Warning red | `--rpg-red` | (see CSS) |
| Quest orange | `--rpg-orange` | (see CSS) |
| Class purple | `--rpg-purple` | (see CSS) |

Never hardcode a colour in a component. Always reference a token.

---

## Typography

Three tiers. Know which one you're using before you type `font-family:`.

### `.type-heading` — screen titles, button labels, tab captions
- `var(--font-pixel)` (Press Start 2P)
- Size range: 10–20px (scale up via explicit override on h1)
- `letter-spacing: 0.04em`, `line-height: 1.3`
- Uppercase for labels under 12px

### `.type-label` — ambient metadata, section headers above data blocks
- `var(--font-pixel)` at 8px
- `text-transform: uppercase`, `letter-spacing: 0.2em`
- Colour `--text-muted`

### `.type-data`, `.type-meta`, body copy — everything a human reads in sentences
- `var(--font-mono)` (JetBrains Mono) for numeric data
- `var(--font-sans)` (Sarabun) for prose, Thai text, long English text
- Body minimum 12px. Pixel font at 12px body = illegible. Don't.

**Rule:** bitmap font for chrome, crisp font for content. DQ3 used
bitmap at all sizes because the screen was 256×224. At 1080p+, bitmap
at body size is not faithful — it's cosplay. Match the intent, not the
artefact.

---

## Spacing + layout

- `.cc-console` viewport lock: `min(100%, calc((100svh - 188px) * 16 / 9), 1680px)`. Never un-lock.
- Grid column gutter: 8–18px. Never > 24px inside the console.
- MenuWindow internal padding: 16px.
- MenuWindow title-tab offset: `-28px 0 12px -6px` (protrudes above top border).

---

## The six routes (Famicom subway-map naming)

| Shortcut | Key | Label | Deck |
|---|---|---|---|
| **C** | cockpit | Cockpit | Financial tempo + support load + quest health |
| **F** | formation | Formation | Chemistry, morale gates, support missions |
| **N** | ninja | Ninja | Mission-skill team builder |
| **M** | matrix | Matrix | TOM allocation lab, functions × CoEs |
| **R** | roster | Roster | Full hero wall by class / dept / role |
| **S** | signals | Signals | At-risk + anchor + support actions |

Keyboard shortcut conventions:
- `Esc` → Back
- `H` → Home
- `M` → Menu overlay
- `1`–`6` → jump directly to route index
- Letter keys (C/F/N/M/R/S) reserved — don't repurpose.

---

## Don't do this

- ❌ `border-radius` anywhere on anything. Ever.
- ❌ Lucide icons, Feather icons, any line-icon set. DQ3 had no icons.
- ❌ Emoji in chrome/navigation. (Emoji in data fields — fine.)
- ❌ System-ui / Helvetica for headings. Use `.type-heading`.
- ❌ CSS transitions over 400ms. DQ3 UI responds instantly; anything over
  400ms reads as a stall, not as motion.
- ❌ Smooth scroll. `scroll-behavior: auto` everywhere.
- ❌ Drop shadows on chrome. DQ3 windows sit flat, bordered, no shadow.
  (Shadows on cards — acceptable, kept subtle.)
- ❌ Gradients on buttons. Solid fill, border, done.
- ❌ Loading spinners. Use the `.cc-console-message` block with text:
  `Loading command data...`
- ❌ Toast notifications that drift in from edges. Use `MenuWindow`
  popups for anything meaningful. Toaster is retained only for
  low-stakes confirmations.

---

## Adding a new screen

1. Add a new `RouteScreen` to `_shared/types.ts`.
2. Add entry to `ROUTES` + `SCREEN_META` in `src/app/command-center/page.tsx`.
3. Create `src/app/command-center/_tabs/YourTab.tsx`. Wrap everything in
   `MenuWindow`s. No bare divs with borders — use the frame.
4. Register in `RouteContent` switch statement.
5. Add route title to `SCREEN_META.deck` (≤ 80 chars).
6. Pick a keyboard shortcut. Update this bible if it clashes.

---

## Adding a new window inside a tab

1. `<MenuWindow title="Thing Name">` — title is optional but almost
   always wanted.
2. Inside, grid or flex layout, 8–18px gaps.
3. Fields go in `.cc-info-row` pairs: `<span>Label</span><strong>Value</strong>`.
4. Lists go in `.cc-info-list` containers.
5. Primary actions = `.cc-primary-action` button, one per window max.

---

## Sync + health visibility

The Google Sheets mirror is part of the DQ3 persona: the "party status"
indicator. It lives as a small dot in `cc-top-controls`:

- **Green** — healthy, all tabs present, last write < 60s ago.
- **Yellow** — no-op mode (env missing). App runs DB-only.
- **Red** — health endpoint returned an error on last poll.

Click the dot → opens a `MenuWindow` with tab list, last sync time,
and env present (never key contents). Treat it like DQ3's equipment
screen: factual, zero decoration.

---

## Source of truth

- Code: `src/app/command-center/page.tsx` is the shell.
- Primitive: `src/components/MenuWindow.tsx` is the frame.
- Tokens: `src/app/globals.css` `:root` block.
- Canon: this file.

When the code and this file disagree, **fix whichever is newer and
update the other to match**. This file is canon only as long as the
code honours it.
