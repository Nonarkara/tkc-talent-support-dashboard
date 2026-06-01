# DQ3 Smoke Test — Command Center

**Purpose:** quick manual pass to confirm the command-center still
honours the Dragon Quest III canon after any change to shell, tabs, or
global styles. Takes under 3 minutes. Run before every demo.

**Automated gate:** run `npm run verify:readiness` before every demo or
deploy. It lints within the current warning budget, builds the production
bundle, boots a local command center, probes `/api/sheets/health` and
`/api/db/dashboard`, then drives a browser through Boss Room → Route Menu →
Formation Board → Home.

**Manual visual pass:** `npm run dev`, open http://localhost:3000/command-center
in a 16:10 or larger browser window.

The automated gate proves the cassette boots and the shell loop works. The
manual checklist below still matters for visual canon: pixel timing, chrome
feel, corner discipline, and typography are human-reviewed.

---

## Checklist

- [ ] **1. Cold-load home screen** — the home screen renders within ~500 ms
      of page load. Title reads "Boss Room". Command-list grid shows all
      six routes.

- [ ] **2. Every route opens** — click each of the six command buttons in
      sequence (Cockpit → Formation → Ninja → Matrix → Roster → Signals).
      Each one renders without an error banner.

- [ ] **3. Tile-fade on screen swap** — when switching routes, the console
      body visibly re-fades in. Not a smooth web fade — should feel
      8-step / pixelated. If transitions are instant, `.anim-screen-enter`
      is not wired to the `key={screen}` prop.

- [ ] **4. Back button pops history** — from any route, click Back. Returns
      to the previously-open route. Button is disabled on the home screen
      with no history.

- [ ] **5. Home button always returns to root** — from any sub-route, click
      Home. Returns to home screen regardless of depth.

- [ ] **6. Menu overlay opens + closes** — click Menu. Overlay appears on
      top of the console. Click the scrim (outside the window) to dismiss.
      Opening the overlay does not push history.

- [ ] **7. Menu overlay selects a route** — click a route inside the menu.
      Overlay closes, console switches to that route.

- [ ] **8. 16:9 lock holds** — drag the window smaller and larger. The
      `.cc-console` box maintains its 16:9 aspect ratio; the surrounding
      area letterboxes in warm brown (`--bg-base`).

- [ ] **9. Breadcrumb reflects position** — on home, breadcrumb shows
      "⌂ Command". On any sub-route, shows "⌂ Command → <LINE>: <TITLE>".

- [ ] **10. Keyboard shortcuts fire** — press:
      - `Esc` → Back (or close overlay first if open)
      - `H` → Home
      - `M` → toggles Menu
      - `1` → Cockpit, `2` → Formation, ..., `6` → Signals
      Shortcuts must NOT fire while a text input is focused.

- [ ] **11. Sync LED visible** — top-right of the header, small dot with
      text. Yellow in dev without Sheets env. Green when env is
      configured and all 13 tabs exist. Click it → opens detail popup.

- [ ] **12. Sync popup shows tab list** — the `SyncStatusPopup` renders
      the declared tab names, with ✓ or ✗ per tab. Click Close → dismisses.

- [ ] **13. Pixel font on chrome** — tab titles ("Company Pulse", "Ninja
      Squad Builder", etc.), nav buttons (Back / Home / Menu), command
      labels, and breadcrumbs all render in Press Start 2P (boxy, pixel).
      If they render in system sans, the `.cc-root` scoped selector in
      `globals.css` is not matching.

- [ ] **14. Sharp corners everywhere** — no rounded corners on any card,
      button, or window inside the console. If you see rounding, a new
      component has slipped past the `border-radius: 0 !important` rule.

- [ ] **15. No Lucide / emoji in chrome** — the header chrome, command
      grid, route tabs, and menu overlay contain zero icon-font and zero
      emoji. Emoji inside data fields (employee card comments, etc.) is
      acceptable.

---

## Common regressions

- **Instant tab swaps** → usually means `key={screen-${screen}}` was
  removed from `.cc-console-body`, so React re-uses the DOM node and the
  animation never replays.
- **Helvetica headings** → check for a new hardcoded `fontFamily:` style
  attribute. The fix is to use `.type-heading` or let the scoped
  `.cc-root` selectors do their work.
- **Sync LED always red** → `/api/sheets/health` is throwing. `curl` the
  endpoint directly for the error string.
- **Broken Back button after refresh** → expected behaviour. History is
  in-memory only; URL `?screen=` restores the route but not the nav
  stack. Not a bug.

---

## When a check fails

1. File a bug with the numbered item reference ("smoke test #3 fails on
   Safari").
2. Don't ship until the full list passes in Chrome + Safari + Firefox.
3. After fixing, add a regression note here so the next contributor
   knows what to watch for.
