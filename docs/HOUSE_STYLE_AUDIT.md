# TKC X Cassette — House Style Audit

> Version: v4.6 "Pulse" · May 2026  
> Scope: all surfaces that ship to users (command-center, tome, project-health, showcase/log)  
> Exclude: dev-only surfaces, redirect pages, legacy report-static

---

## §0 The Non-Negotiables

These rules apply to every pixel that ships. No exceptions.

| Rule | Value | Rationale |
|------|-------|-----------|
| **Border radius** | `0px` everywhere | Anti-template discipline. Circles only for true status dots. |
| **Gradients** | None | Solid colour only. Hairline rules separate planes. |
| **Drop shadows** | None | Use 1px borders or solid-background panels. |
| **Typography: Thai** | Non-looped only (IBM Plex Sans Thai, Noto Sans Thai, Prompt, Kanit) | Looped faces (Sarabun) read as "learner material" to Thai readers. |
| **Typography: Body** | IBM Plex Serif (Tome), Helvetica Neue (command-center chrome), JetBrains Mono (data) | No system-default sans for body copy. |
| **Pixel font** | Press Start 2P, scoped to `.cc-root` chrome only | Never used for body copy or paragraphs. |

---

## §1 Colour System

### Tabletop (dark surfaces: command-center, showcase)

| Token | Hex | Usage |
|-------|-----|-------|
| `--bg-base` | `#1a1209` | Page background |
| `--bg-surface` | `#231a0f` | Elevated panels |
| `--border-subtle` | `#3d2e1e` | Hairline rules |
| `--border-strong` | `#5a4530` | Active borders |
| `--text-primary` | `#f5f0e8` | Headlines |
| `--text-secondary` | `#b8a88a` | Body copy |
| `--text-muted` | `#7a6b54` | Captions, meta |
| `--accent-gold` | `#D4A843` | Primary accent |
| `--accent-green` | `#5B8C4A` | Positive / flux-up |
| `--accent-red` | `#C44D3F` | Negative / danger |
| `--accent-blue` | `#5B89B5` | Informational |

### Parchment (light surfaces: Handbook, Tome)

| Token | Hex | Usage |
|-------|-----|-------|
| `--tome-paper` | `#fbf8f0` | Page background |
| `--tome-ink` | `#181816` | Body text |
| `--tome-faint` | `rgba(24,24,22,0.45)` | Captions, secondary |
| `--tome-accent` | `#8a3324` | Oxblood banners |
| `--tome-gold` | `#b8862c` | Class badges |

**Accessibility:** `--text-muted` (`#7a6b54`) on `--bg-base` (`#1a1209`) = 3.9:1. OK for large text / decorative only. **Do not use for body copy < 14px.**

---

## §2 Typography Scale

### Command Center

| Element | Font | Size | Weight | Tracking | Transform |
|---------|------|------|--------|----------|-----------|
| H1 (screen title) | Pixel | clamp(28px, 3vw, 54px) | 800 | 0.04em | uppercase |
| Kicker | Pixel | 9px | 400 | 0.12em | uppercase |
| Body | Helvetica | 14px | 400 | 0 | none |
| Data / Mono | JetBrains Mono | 11px | 500 | 0 | none |
| Button | Pixel | 11px | 700 | 0.1em | uppercase |
| Caption | Helvetica | 10px | 400 | 0.06em | none |

### Tome

| Element | Font | Size | Weight |
|---------|------|------|--------|
| H2 section | IBM Plex Sans | 28pt | 700 |
| Body | IBM Plex Serif | 11.5pt | 400 |
| Stat value | IBM Plex Mono | 18pt | 700 |
| Table | IBM Plex Serif | 12pt | 400 |
| Tag | IBM Plex Mono | 9.5pt | 400 |

### Handbook

| Element | Font | Size | Weight |
|---------|------|------|--------|
| Banner title | Mono | 22px | 800 |
| Body | Sans | 12px | 400 |
| Thai body | Sans Thai | 11px | 400 |
| Caption | Serif | 9px | 400 italic |

---

## §3 Layout Rules

### Command Center

- **Outer chassis:** `100svh`, `overflow: hidden`, grid `auto auto 1fr`
- **Home grid:** `260px 1fr 260px` desktop → `1fr` below 980px
- **Tab frame:** `gridTemplateRows: auto 1fr`, gap 12px
- **Console body:** padding 14px, `overflow: hidden`
- **MenuWindow:** 1px border, no shadow, title tab protrudes top-left

### Mobile Breakpoints

| Breakpoint | Action |
|------------|--------|
| `3000px+` | 50" dashboard scale (font-size bumps) |
| `980px` | Home grid collapses to 1 column |
| `640px` | Command center header stacks, shortcut legend hidden, handbook score-bleed hidden, PMO grids stack, project health grids stack, lobby stacks |
| `360px` | Tome removes A4 fixed width, tables scroll horizontally |

---

## §4 Animation Discipline

Every animation must have a purpose. No decoration.

| Animation | Trigger | Duration | Easing | Usage |
|-----------|---------|----------|--------|-------|
| `screen-fade` | Screen change | 280ms | ease-out | Command center route transition |
| `card-appear` | Content mount | 250ms | ease-out | Cards, grids, galleries |
| `snap-bounce` | Click / commit | 200ms | ease-out | Buttons, drops, locks |
| `score-pulse` | Score reveal | 400ms | ease-out | Match report scores |
| `glow-pulse` | Idle state | 1.6s | ease-in-out infinite | Sync dot idle, status indicators |
| `card-flip-out/in` | Click to reveal | 250ms | ease-in/ease-out | Outcome reveal (predicted → actual) |

**Stepped animations are banned** unless explicitly part of the 8-bit aesthetic (e.g. tile-wipe). `steps(8)` on `screen-fade` was removed in v4.6.1.

---

## §5 Component Primitives

### MenuWindow

```
┌─[title tab]────────────────┐
│                            │
│        body content        │
│                            │
└────────────────────────────┘
```

- Border: 1px solid `var(--border-subtle)` or contextual colour
- Background: `var(--bg-elevated)` or contextual
- Title tab: pixel font, 8px, uppercase, letter-spacing 0.16em
- No rounded corners on the frame. Tab has `border-radius: 0`.

### MetricPill

- Label: 8px, uppercase, `var(--text-muted)`
- Value: 11px, mono, `var(--text-primary)`
- Border: 1px solid `var(--border-subtle)`
- Background: transparent or `rgba(255,255,255,0.02)`

### Status Dot

- 6–8px circle (true circle = `border-radius: 50%` allowed)
- Colour: semantic (green = live, yellow = idle/demo, red = error)
- Optional: `box-shadow` glow for live states only

---

## §6 Responsive Checklist

Every new surface must pass:

- [ ] Renders at 360px without horizontal scroll (except tables, which may scroll)
- [ ] Renders at 1920px without looking empty or stretched
- [ ] Renders at 3840px (50" dashboard) with readable type
- [ ] All interactive elements have ≥ 40px tap target on mobile
- [ ] Keyboard navigable (Tab, Enter, Escape)
- [ ] Screen reader announces state changes (live regions where needed)
- [ ] Contrast ≥ 4.5:1 for body text, ≥ 3:1 for large text/UI chrome

---

## §7 Surfaces Audit

| Surface | Palette | Mobile | A11y | Animations | Status |
|---------|---------|--------|------|------------|--------|
| Command Center | Subway dark | Partial (header stacks, grids collapse) | Partial (keyboard nav OK, ARIA gaps in formation drag-drop) | Screen fade, commit snap, score pulse | ✅ Done |
| Handbook | Parchment | ✅ 360px pass | ✅ Contrast fixed | Page turn (existing) | ✅ Done |
| Lobby | Dark + sprites | ✅ Stacks vertically | ❌ Canvas = zero screen reader | Sprite physics (existing) | ⚠️ Needs ARIA |
| Tome | Parchment print | ✅ 360px pass | ✅ Tables scrollable | None (print-first) | ✅ Done |
| Project Health | Subway dark | ✅ Cards stack | ⚠️ Tables need scroll hint | Card appear | ✅ Done |
| Fixture / Match | Subway dark | Not audited | Not audited | Score pulse, card appear | ✅ Done |
| Matrix / PMO | Subway dark | ✅ Stacks | Not audited | Card appear | ✅ Done |
| Roster | Subway dark | Not audited | Not audited | Card appear | ✅ Done |
| Signals | Subway dark | Not audited | Not audited | None | ⏳ Pending |
| Insights | Subway dark | Not audited | Not audited | None | ⏳ Pending |
| Ledger | Subway dark | Not audited | Not audited | None | ⏳ Pending |
| showcase/log.html | Dark tavern | Has `@media 600px` | Not audited | None | ⏳ Pending |

---

## §8 Dev Artifacts That Must Never Ship

- [ ] `styled-jsx` blocks (hydration risk — move to globals.css)
- [ ] `requestAnimationFrame` state updates during render (hydration risk)
- [ ] `new Date()` or `Math.random()` during render phase
- [ ] `toLocaleTimeString()` / `toLocaleDateString()` during SSR without `suppressHydrationWarning`
- [ ] Console errors in production build
- [ ] Turbopack / Next.js dev badges in screenshots

---

## §9 How to Apply This Document

1. **For new surfaces:** Read §0–§3 before writing JSX. Copy a working component (e.g. `MenuWindow`) as scaffold.
2. **For modifications:** Check §7 to see if your surface is listed. If the row says "Pending", do a full pass.
3. **For Red Dot submission:** Every row in §7 must be "✅ Done" before filming the demo.

---

*Drafted by Kimi Code CLI · May 2026 · ROM v4.6 "Pulse"*
