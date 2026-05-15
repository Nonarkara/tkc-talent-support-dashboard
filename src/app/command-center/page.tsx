/**
 * /command-center — the boss-facing command room.
 *
 * One screen, Dragon Quest logic:
 *   • "Home" returns to the central command room.
 *   • "Back" returns to the previous screen.
 *   • "Menu" opens an overlay route chooser instead of a permanent tab bar.
 *   • Sub-information belongs in windows layered over the main board.
 *
 * The data hook still fetches once. Screen changes are local and instant.
 */

"use client";

import type { CSSProperties } from "react";
import { startTransition, useEffect, useMemo, useRef, useState } from "react";
import { BookOpen, ChevronLeft, ChevronRight, X } from "lucide-react";
import { MenuWindow } from "@/components/MenuWindow";
import { CockpitTab } from "./_tabs/CockpitTab";
import { FixtureTab } from "./_tabs/FixtureTab";
import { FormationTab } from "./_tabs/FormationTab";
import { RosterTab } from "./_tabs/RosterTab";
import { SignalsTab } from "./_tabs/SignalsTab";
import { NinjaTab } from "./_tabs/NinjaTab";
import { MatrixTab } from "./_tabs/MatrixTab";
import { LobbyTab } from "./_tabs/LobbyTab";
import { LedgerTab } from "./_tabs/LedgerTab";
import { InsightsTab } from "./_tabs/InsightsTab";
import { ProjectHealthPage } from "@/components/ProjectHealthCard";
import { useDashboard } from "./_shared/useDashboard";
import type { DashboardPayload, RouteScreen, Screen } from "./_shared/types";
import { tkcTicker, TKC_ANNUAL, isAnchor } from "@/lib/company-pulse";
import { BUILD_VERSION, BUILD_CODENAME } from "@/lib/build-version";
import { translate, useLocale, type Locale } from "@/lib/i18n";
import { NAV, SCREEN } from "@/lib/i18n-dict";
import { LocaleToggle } from "@/components/LocaleToggle";
import { BriefingPanel } from "@/components/BriefingPanel";
import { PulseBanner } from "@/components/PulseBanner";
import { HiringNow } from "@/components/HiringNow";

type RouteMetric = {
  label: string;
  value: string;
  hint?: string;
};

// PMO Parity (key: "health") landed in migration 030. Eleventh route,
// shortcut "P" — keyboard handler is digit-only so this one is mouse/URL
// driven. Driven by /api/db/project-health.
const ROUTES: Array<{ key: RouteScreen; shortcut: string }> = [
  { key: "cockpit", shortcut: "1" },
  { key: "formation", shortcut: "2" },
  { key: "ninja", shortcut: "3" },
  { key: "matrix", shortcut: "4" },
  { key: "roster", shortcut: "5" },
  { key: "signals", shortcut: "6" },
  { key: "lobby", shortcut: "7" },
  { key: "ledger", shortcut: "8" },
  { key: "insights", shortcut: "9" },
  { key: "fixture", shortcut: "0" },
  { key: "health", shortcut: "P" },
];

const ROUTE_ACCENT: Record<RouteScreen, string> = {
  cockpit: "var(--rpg-blue)",
  fixture: "var(--rpg-green)",
  formation: "var(--rpg-orange)",
  ninja: "var(--rpg-purple)",
  matrix: "#4A9BA8",
  roster: "var(--rpg-yellow)",
  signals: "var(--rpg-red)",
  lobby: "#d8411f",
  ledger: "#f3b61f",
  insights: "#9F7BFF",
  health: "#FB923C",
};

type RouteMeta = { kicker: string; title: string; deck: string; accent: string };

function metaFor(route: RouteScreen, loc: Locale): RouteMeta {
  const s = SCREEN[route];
  return {
    kicker: translate(loc, s.kicker),
    title: translate(loc, s.title),
    deck: translate(loc, s.deck),
    accent: ROUTE_ACCENT[route],
  };
}

const HIGH_RISK_DEPTS = new Set(["PROCURE", "ACCT", "DIGITAL"]);

// ─── Org Grade ────────────────────────────────────────────────────────
// S/A/B/C/D/F derived from chemistry, hero count, and open risk signals.
// Mirrors the DQ3 "org grade" concept — the compass reading on overall
// org health. Not a judgment; a direction.
function orgGrade(chemistry: number, heroCount: number, atRisk: number): {
  grade: "S" | "A" | "B" | "C" | "D" | "F";
  color: string;
  label: string;
} {
  const riskPenalty = heroCount > 0 ? Math.min(30, (atRisk / heroCount) * 200) : 0;
  const score = Math.max(0, chemistry - riskPenalty);
  if (score >= 82) return { grade: "S", color: "#f3b61f", label: "Elite cohesion" };
  if (score >= 70) return { grade: "A", color: "#86CD7E", label: "Strong formation" };
  if (score >= 58) return { grade: "B", color: "#86D1FF", label: "Functional" };
  if (score >= 44) return { grade: "C", color: "#FB923C", label: "Fragmented" };
  if (score >= 30) return { grade: "D", color: "#F87171", label: "Unstable" };
  return { grade: "F", color: "#d45e4e", label: "Critical" };
}

// ─── Sprint Countdown ─────────────────────────────────────────────────
// Days remaining until end of current quarter (Q2 2026 = 30 Jun).
// Updates the urgency of the board every day — the "Sprint Lock"
// from the game design doc.
function sprintDaysLeft(): number {
  const now = new Date();
  // Q2 ends June 30. If past, move to Q3 end (Sep 30), etc.
  const ends = [
    new Date(now.getFullYear(), 2, 31),   // Q1: Mar 31
    new Date(now.getFullYear(), 5, 30),   // Q2: Jun 30
    new Date(now.getFullYear(), 8, 30),   // Q3: Sep 30
    new Date(now.getFullYear(), 11, 31),  // Q4: Dec 31
  ];
  const next = ends.find((d) => d > now) ?? ends[3];
  return Math.ceil((next.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
}

type SheetsHealth = {
  ok: boolean;
  enabled: boolean;
  tabs: string[];
  declared: string[];
  missing: string[];
  error?: string;
  checked_at: string;
};

export default function CommandCenterPage() {
  const [screen, setScreen] = useState<Screen>("home");
  const [homeSelection, setHomeSelection] = useState<RouteScreen>("cockpit");
  const [history, setHistory] = useState<Screen[]>([]);
  const [menuOpen, setMenuOpen] = useState(false);
  const [manualOpen, setManualOpen] = useState(false);
  const [syncOpen, setSyncOpen] = useState(false);
  const [sheetsHealth, setSheetsHealth] = useState<SheetsHealth | null>(null);
  const dash = useDashboard();
  const { loc } = useLocale();
  const activeRoute = screen === "home" ? homeSelection : screen;
  const activeMeta = useMemo(() => metaFor(activeRoute, loc), [activeRoute, loc]);
  const homeTitle = translate(loc, SCREEN.home.title);
  const homeDeck = translate(loc, SCREEN.home.deck);

  const [liveStock, setLiveStock] = useState<{
    price: number;
    delta_pct: number;
    ticker: string;
    exchange: string;
    live: boolean;
  } | null>(null);
  const [liveFinancials, setLiveFinancials] = useState<{
    revenue_9m_m: number;
    net_profit_9m_m: number;
    eps_thb: number;
    market_cap_b: number;
    pe_ratio: number;
    dividend_thb: number;
    dividend_yield_pct: number;
    as_of: string;
  } | null>(null);

  useEffect(() => {
    async function fetchStock() {
      try {
        const res = await fetch("/api/tkc/ticker");
        const data = (await res.json()) as {
          ok?: boolean; live?: boolean;
          price?: number; delta_pct?: number;
          ticker?: string; exchange?: string;
        };
        if (data.ok && typeof data.price === "number") {
          setLiveStock({
            price: data.price,
            delta_pct: data.delta_pct ?? 0,
            ticker: data.ticker ?? "ORG",
            exchange: data.exchange ?? "DEMO",
            live: Boolean(data.live),
          });
        }
      } catch {
        // Silent — falls back to synthetic indicator.
      }
    }

    async function fetchFinancials() {
      try {
        const res = await fetch("/api/tkc/financials");
        const data = await res.json();
        if (typeof data.revenue_9m_m === "number") {
          setLiveFinancials(data);
        }
      } catch {
        // Silent — ticker uses TKC_ANNUAL fallback.
      }
    }

    void fetchStock();
    void fetchFinancials();
    const interval = setInterval(() => {
      void fetchStock();
      void fetchFinancials();
    }, 5 * 60 * 1000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    async function fetchHealth() {
      try {
        const res = await fetch("/api/sheets/health");
        const data = (await res.json()) as SheetsHealth;
        setSheetsHealth(data);
      } catch {
        setSheetsHealth({
          ok: false,
          enabled: false,
          tabs: [],
          declared: [],
          missing: [],
          error: "health endpoint unreachable",
          checked_at: "",
        });
      }
    }

    void fetchHealth();
    const interval = setInterval(() => void fetchHealth(), 60 * 1000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    const handlePopState = () => {
      const requested = new URLSearchParams(window.location.search).get("screen");
      if (!requested || !isScreen(requested)) {
        setScreen("home");
        setHistory((prev) => (prev.length > 0 ? prev.slice(0, -1) : prev));
        return;
      }
      setScreen(requested);
      if (requested !== "home") setHomeSelection(requested);
      setHistory((prev) => (prev.length > 0 ? prev.slice(0, -1) : prev));
    };

    window.addEventListener("popstate", handlePopState);
    
    // Initial sync
    const requested = new URLSearchParams(window.location.search).get("screen");
    if (requested && isScreen(requested)) {
      setScreen(requested);
      if (requested !== "home") setHomeSelection(requested);
    }
    // Now safe to let the URL-write effect run.
    urlReadRef.current = true;

    return () => window.removeEventListener("popstate", handlePopState);
  }, []);

  // Track whether the initial URL-sync effect (below) has consumed
  // the boot-time `?screen=…` param. Without this, the URL-write
  // effect would fire on mount with state="home", see "health" in the
  // URL, and strip the param before the boot-time URL-read effect
  // gets to call setScreen("health"). That race meant /screen=health
  // would always bounce to Boss Room.
  const urlReadRef = useRef(false);

  useEffect(() => {
    if (!urlReadRef.current) return;
    const params = new URLSearchParams(window.location.search);
    const current = params.get("screen") || "home";
    if (current === screen) return;

    if (screen === "home") {
      params.delete("screen");
    } else {
      params.set("screen", screen);
    }
    const next = params.toString();
    const target = next ? `${window.location.pathname}?${next}` : window.location.pathname;

    // Only push if we are navigating manually, not via popstate
    window.history.pushState({ screen }, "", target);
  }, [screen]);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      const tag = (e.target as HTMLElement | null)?.tagName;
      if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT") return;
      if (e.metaKey || e.ctrlKey || e.altKey) return;

      const k = e.key.toLowerCase();

      if (e.key === "Escape") {
        if (manualOpen) {
          setManualOpen(false);
          e.preventDefault();
          return;
        }
        if (syncOpen) {
          setSyncOpen(false);
          e.preventDefault();
          return;
        }
        if (menuOpen) {
          setMenuOpen(false);
          e.preventDefault();
          return;
        }
        if (history.length > 0) {
          handleBack();
          e.preventDefault();
        }
        return;
      }

      if (k === "h") {
        handleGoHome();
        e.preventDefault();
        return;
      }
      if (k === "m") {
        setMenuOpen((prev) => !prev);
        e.preventDefault();
        return;
      }
      if (k === "?") {
        setManualOpen((prev) => !prev);
        e.preventDefault();
        return;
      }

      // Numeric 1-6 jumps to ROUTES[index].
      const idx = Number.parseInt(e.key, 10);
      if (!Number.isNaN(idx) && idx >= 1 && idx <= ROUTES.length) {
        navigateTo(ROUTES[idx - 1].key);
        e.preventDefault();
      }
    }

    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [screen, menuOpen, manualOpen, syncOpen, history.length]);

  const activeProjects = dash.projects.filter((project) => project.status !== "done").length;
  const chemistryScore = Math.round(aggregateChemistry(dash.teams));
  // Both counts only over the active roster — /api/db/dashboard returns
  // ghosts too (so the lobby/tome can read them), but the chrome metrics
  // and the PulseBanner agree to count active people only. Without this
  // filter, the header pill said 48 anchors while the banner said 43.
  const activeEmployees = dash.employees.filter((e) => e.is_active !== false);
  const atRiskCount = activeEmployees.filter((employee) => riskSignalFor(employee) !== "ok").length;
  const anchorCount = activeEmployees.filter((employee) => riskSignalFor(employee) === "anchor").length;
  const openSupportActions = dash.support_actions.filter(
    (action) => action.status === "open" || action.status === "in_progress",
  ).length;
  const overloadedHeroes = dash.employee_availability.filter(
    (availability) => availability.over_capacity,
  ).length;
  const deptCount = new Set(
    dash.employees.map((employee) => employee.dept_code).filter(Boolean),
  ).size;

  const routeMetrics = useMemo(
    () =>
      buildRouteMetrics(activeRoute, {
        heroCount: dash.employees.length,
        activeProjects,
        kpiCount: dash.kpis.length,
        chemistryScore,
        atRiskCount,
        anchorCount,
        openSupportActions,
        overloadedHeroes,
        deptCount,
        standardsCount: dash.competency_standards.length,
        integrationCount: dash.integration_status.length,
        varianceWatchCount: dash.project_variance.filter((item) => item.margin_risk !== "stable").length,
      }),
    [
      activeProjects,
      activeRoute,
      anchorCount,
      atRiskCount,
      chemistryScore,
      dash.competency_standards.length,
      dash.employees.length,
      dash.integration_status.length,
      dash.kpis.length,
      dash.project_variance,
      deptCount,
      openSupportActions,
      overloadedHeroes,
    ],
  );
  const homeHeaderMetrics = useMemo<RouteMetric[]>(
    () => [
      { label: "Heroes", value: String(dash.employees.length) },
      { label: "Active Quests", value: String(activeProjects) },
      { label: "KPIs", value: String(dash.kpis.length) },
    ],
    [activeProjects, dash.employees.length, dash.kpis.length],
  );
  const headerMetrics = screen === "home" ? homeHeaderMetrics : routeMetrics;

  // LIVE = real Neon DB data. DEMO = seeded fallback (auth missing or API down).
  // The user must always know which world they're navigating.
  const statusText = dash.loading
    ? "Syncing"
    : dash.error
      ? "Offline"
      : dash.live
        ? "Live"
        : "Demo";

  const grade = orgGrade(chemistryScore, activeEmployees.length, atRiskCount);
  const [daysLeft, setDaysLeft] = useState(0);
  useEffect(() => {
    setDaysLeft(sprintDaysLeft());
  }, []);

  const ticker = useMemo(() => {
    const stockData = liveStock ?? tkcTicker({ teams: dash.teams, projects: dash.projects });
    const { price, delta_pct } = stockData;
    const isLive = liveStock?.live === true;
    const arrow = delta_pct >= 0 ? "▲" : "▼";
    const pct = `${delta_pct >= 0 ? "+" : ""}${delta_pct.toFixed(2)}%`;
    const priceLabel = isLive ? `${price.toFixed(2)} THB` : `${price.toFixed(2)}*`;

    const a = liveFinancials ?? TKC_ANNUAL;
    const tickerName = liveStock?.ticker ?? "ORG";
    const tickerExchange = liveStock?.exchange ?? "DEMO";

    return (
      `◆ ${tickerName}·${tickerExchange}  ${priceLabel}  ${arrow} ${pct}` +
      `     ✦ EPS ฿${a.eps_thb}` +
      `     ✦ DIV ฿${a.dividend_thb} (${a.dividend_yield_pct}% yield)` +
      `     ◆ REV ${a.as_of}  ฿${a.revenue_9m_m.toFixed(0)}M` +
      `     ✦ NET PROFIT  ฿${a.net_profit_9m_m.toFixed(0)}M` +
      `     ◆ HEROES ${dash.employees.length}` +
      `     ✦ QUESTS ${dash.projects.length}` +
      `     ✦ KPIs ${dash.kpis.length}` +
      `     ✦ CHEMISTRY ${dash.teams.length > 0 ? chemistryScore : "—"}` +
      `     ◆ ORG GRADE ${grade.grade} · ${grade.label.toUpperCase()}` +
      `     ✦ SPRINT LOCK ${daysLeft}d`
    );
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [chemistryScore, dash.employees.length, dash.kpis.length, dash.projects, dash.teams, liveStock, liveFinancials, grade.grade, daysLeft]);

  function navigateTo(next: RouteScreen) {
    if (screen === next) return;
    startTransition(() => {
      setHomeSelection(next);
      setHistory((prev) => [...prev, screen]);
      setScreen(next);
      setMenuOpen(false);
    });
  }

  function handleGoHome() {
    if (screen === "home") {
      setMenuOpen(false);
      return;
    }

    startTransition(() => {
      setHistory((prev) => [...prev, screen]);
      setScreen("home");
      setMenuOpen(false);
    });
  }

  function handleBack() {
    window.history.back();
  }

  return (
    <div className="cc-root">
      <header className="cc-header">
        <div className="cc-brand-row">
          <div className="cc-brand-lockup">
            <span className="cc-wordmark pixel">TKC X</span>
            <span className="cc-product-name">บริษัท เทิร์นคีย์ คอมมูนิเคชั่น เซอร์วิส จำกัด (มหาชน)</span>
            <span
              className="cc-build-pill"
              title={`Build ${BUILD_VERSION} — ${BUILD_CODENAME}. See src/lib/build-version.ts for the version log.`}
              style={{
                fontFamily: "var(--mono, monospace)",
                fontSize: 10,
                letterSpacing: "0.14em",
                textTransform: "uppercase",
                color: "var(--ink-1)",
                padding: "2px 8px",
                border: "1px solid var(--border-subtle)",
                background: "rgba(139,111,181,0.08)",
                whiteSpace: "nowrap",
                marginLeft: 6,
              }}
            >
              {BUILD_VERSION} · {BUILD_CODENAME}
            </span>
          </div>

          <div className="cc-top-controls">
            <button
              type="button"
              className="cc-nav-button"
              onClick={handleBack}
              disabled={history.length === 0}
            >
              {translate(loc, NAV.back)}
            </button>
            <button
              type="button"
              className="cc-nav-button"
              onClick={handleGoHome}
              disabled={screen === "home"}
            >
              {translate(loc, NAV.home)}
            </button>
            <button
              type="button"
              className="cc-nav-button"
              onClick={() => setMenuOpen(true)}
            >
              {translate(loc, NAV.menu)}
            </button>
            <button
              type="button"
              className="cc-nav-button"
              onClick={() => setManualOpen(true)}
              title="Open the player manual"
            >
              <BookOpen size={14} aria-hidden="true" />
              {translate(loc, { en: "Manual", th: "คู่มือ" })}
            </button>
            <button
              type="button"
              className="cc-nav-button"
              onClick={() => navigateTo("ledger")}
              title="Open the in-app company ledger and sync status"
            >
              {translate(loc, NAV.ledger)}
            </button>
            <LocaleToggle />
            <SyncDot
              health={sheetsHealth}
              onClick={() => setSyncOpen((prev) => !prev)}
            />
            <button
              type="button"
              className="cc-status"
              data-state={statusText.toLowerCase()}
              onClick={() => void dash.refresh()}
              disabled={dash.loading}
              title={dash.live ? "Live data from Neon DB — click to resync" : "Demo mode — click to retry live DB connection"}
            >
              <span className="cc-status-label">{statusText}</span>
            </button>
            <button
              type="button"
              className="cc-nav-button"
              onClick={async () => {
                await fetch("/api/auth/logout", { method: "POST" });
                window.location.href = "/login";
              }}
              title="Sign out — clears your access cookie immediately"
              style={{ borderColor: "var(--rpg-red, #d45e4e)", color: "var(--rpg-red, #d45e4e)" }}
            >
              {translate(loc, { en: "Sign Out", th: "ออก" })}
            </button>
          </div>
        </div>
      </header>

      <div className="tkc-ticker" aria-label="TKC ticker">
        <div className="tkc-ticker-inner">{ticker}</div>
      </div>

      <main className="cc-main">
        <section
          className="cc-console"
          style={{ "--route-accent": activeMeta.accent } as CSSProperties}
        >
          <div className="cc-console-header">
            <div className="cc-console-title">
              <div className="cc-breadcrumb" aria-label="Navigation path">
                <span className="cc-breadcrumb-node" data-current={screen === "home" ? "true" : "false"}>
                  ⌂ Command
                </span>
                {screen !== "home" && (
                  <>
                    <span className="cc-breadcrumb-sep">→</span>
                    <span className="cc-breadcrumb-node" data-current="true">
                      {activeMeta.kicker}: {activeMeta.title}
                    </span>
                  </>
                )}
              </div>
              <div className="cc-screen-kicker">
                {screen === "home" ? translate(loc, { en: "Central Command", th: "ศูนย์บัญชาการ" }) : activeMeta.kicker}
              </div>
              <h1>{screen === "home" ? homeTitle : activeMeta.title}</h1>
              <p>
                {screen === "home" ? homeDeck : activeMeta.deck}
              </p>
            </div>

            <div className="cc-console-metrics" aria-label="Command center totals">
              {headerMetrics.map((metric) => (
                <MetricPill
                  key={`${screen}-${activeRoute}-${metric.label}`}
                  label={metric.label}
                  value={metric.value}
                />
              ))}
            </div>
          </div>

          <div className="cc-console-body anim-screen-enter" key={`screen-${screen}`}>
            {dash.loading ? (
              <div className="cc-console-message">
                {translate(loc, { en: "Loading command data...", th: "กำลังโหลดข้อมูล..." })}
              </div>
            ) : dash.error ? (
              <div className="cc-console-message cc-console-message-danger">
                {dash.error}
              </div>
            ) : screen === "home" ? (
              <HomeScreen
                selected={homeSelection}
                onPreview={setHomeSelection}
                onOpen={navigateTo}
                routeMetrics={routeMetrics}
                diagnostics={dash.diagnostics}
                integrationStatus={dash.integration_status}
                loc={loc}
                summary={{
                  activeProjects,
                  chemistryScore,
                  atRiskCount,
                  anchorCount,
                  openSupportActions,
                  heroCount: dash.employees.length,
                  orgGrade: orgGrade(chemistryScore, dash.employees.length, atRiskCount),
                  sprintDaysLeft: daysLeft,
                }}
              />
            ) : (
              <div className="cc-route-stage">
                <RouteContent route={activeRoute} dash={dash} />
              </div>
            )}
          </div>

          {menuOpen && (
            <RouteMenuOverlay
              selected={activeRoute}
              onClose={() => setMenuOpen(false)}
              onOpen={navigateTo}
              loc={loc}
            />
          )}

          {manualOpen && (
            <ManualOverlay
              activeRoute={activeRoute}
              onClose={() => setManualOpen(false)}
              onNavigate={(route) => {
                setManualOpen(false);
                navigateTo(route);
              }}
              loc={loc}
            />
          )}

          {syncOpen && (
            <SyncStatusPopup
              health={sheetsHealth}
              onClose={() => setSyncOpen(false)}
            />
          )}
        </section>

        <div className="cc-shortcut-legend" aria-label="Keyboard shortcuts">
          <span><kbd>Esc</kbd> {translate(loc, NAV.back)}</span>
          <span><kbd>H</kbd> {translate(loc, NAV.home)}</span>
          <span><kbd>M</kbd> {translate(loc, NAV.menu)}</span>
          <span><kbd>?</kbd> {translate(loc, { en: "Manual", th: "คู่มือ" })}</span>
          <span><kbd>1</kbd>–<kbd>9</kbd><kbd>0</kbd> {translate(loc, { en: "Route", th: "เส้นทาง" })}</span>
        </div>
      </main>
    </div>
  );
}

function HomeScreen({
  selected,
  onPreview,
  onOpen,
  routeMetrics,
  diagnostics,
  integrationStatus,
  summary,
  loc,
}: {
  selected: RouteScreen;
  onPreview: (route: RouteScreen) => void;
  onOpen: (route: RouteScreen) => void;
  routeMetrics: RouteMetric[];
  diagnostics: string[];
  integrationStatus: Array<{ key: string; label: string; status: string; source: string; note: string }>;
  summary: {
    activeProjects: number;
    chemistryScore: number;
    atRiskCount: number;
    anchorCount: number;
    openSupportActions: number;
    heroCount: number;
    orgGrade: { grade: string; color: string; label: string };
    sprintDaysLeft: number;
  };
  loc: Locale;
}) {
  const activeMeta = metaFor(selected, loc);

  return (
    <div className="cc-home-page">

      {/* Hero band — full width, above the 3-column grid.
          Pulse first (org snapshot), Hiring Now second (open roles).
          Both are fed by /api/pulse + /api/hiring + /api/tkc/{ticker,financials}. */}
      <div className="cc-home-hero">
        <PulseBanner />
        <MenuWindow title={translate(loc, { en: "Hiring Now", th: "กำลังจ้าง" })} className="cc-home-hero-window">
          <HiringNow />
        </MenuWindow>
      </div>

      <div className="cc-home-grid">
        <MenuWindow title={translate(loc, { en: "Command List", th: "รายการคำสั่ง" })} className="cc-home-window">
          <div className="cc-command-list">
            {ROUTES.map((route) => {
              const m = metaFor(route.key, loc);
              return (
                <button
                  key={route.key}
                  type="button"
                  className="cc-command-button"
                  data-active={selected === route.key ? "true" : "false"}
                  onMouseEnter={() => onPreview(route.key)}
                  onFocus={() => onPreview(route.key)}
                  onClick={() => onOpen(route.key)}
                >
                  <span className="cc-command-shortcut pixel">{route.shortcut}</span>
                  <span className="cc-command-label">{m.title}</span>
                  <span className="cc-command-deck">{m.deck}</span>
                </button>
              );
            })}
          </div>
        </MenuWindow>

      <div className="cc-home-center">
        {/* The Briefing Ritual — the autotelic morning loop. First thing
            the boss sees. Lazy-fetched so the rest of the home grid paints
            instantly. */}
        <BriefingPanel />

        <MenuWindow title={`${activeMeta.kicker} · ${activeMeta.title}`} className="cc-home-window">
          <div className="cc-home-preview">
            <div className="cc-home-preview-copy">
              <div className="cc-home-preview-title">{activeMeta.title}</div>
              <p>{activeMeta.deck}</p>
            </div>
            <div className="cc-home-preview-grid">
              {routeMetrics.map((metric) => (
                <div key={metric.label} className="cc-home-stat">
                  <span>{metric.label}</span>
                  <strong>{metric.value}</strong>
                  {metric.hint ? <small>{metric.hint}</small> : null}
                </div>
              ))}
            </div>
            <button type="button" className="cc-primary-action" onClick={() => onOpen(selected)}>
              {translate(loc, { en: "Enter", th: "เข้าสู่" })} {activeMeta.title}
            </button>
          </div>
        </MenuWindow>

        <MenuWindow title={translate(loc, { en: "Board Pulse", th: "ภาพรวมกระดาน" })} className="cc-home-window">
          {/* Org Grade + Sprint Countdown — the two numbers that tell you
              everything at a glance before you drill into any screen. */}
          <div style={{ display: "flex", gap: 12, marginBottom: 14, paddingBottom: 12, borderBottom: "1px solid rgba(245,240,232,0.08)" }}>
            <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 2 }}>
              <span style={{ fontSize: 8, letterSpacing: "0.16em", textTransform: "uppercase", color: "var(--ink-1)" }}>
                {translate(loc, { en: "Org Grade", th: "เกรดองค์กร" })}
              </span>
              <div style={{ display: "flex", alignItems: "baseline", gap: 8 }}>
                <strong style={{ fontSize: 32, fontFamily: "var(--font-mono)", lineHeight: 1, color: summary.orgGrade.color }}>
                  {summary.orgGrade.grade}
                </strong>
                <span style={{ fontSize: 10, color: "var(--ink-1)", letterSpacing: "0.06em" }}>
                  {summary.orgGrade.label}
                </span>
              </div>
            </div>
            <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 2, textAlign: "right" }}>
              <span style={{ fontSize: 8, letterSpacing: "0.16em", textTransform: "uppercase", color: "var(--ink-1)" }}>
                {translate(loc, { en: "Sprint Lock", th: "สปรินต์ล็อก" })}
              </span>
              <div style={{ display: "flex", alignItems: "baseline", gap: 4, justifyContent: "flex-end" }}>
                <strong style={{ fontSize: 32, fontFamily: "var(--font-mono)", lineHeight: 1, color: summary.sprintDaysLeft <= 14 ? "var(--rpg-orange)" : "var(--text-primary)" }}>
                  {summary.sprintDaysLeft}
                </strong>
                <span style={{ fontSize: 10, color: "var(--ink-1)", letterSpacing: "0.06em" }}>
                  {translate(loc, { en: "days", th: "วัน" })}
                </span>
              </div>
            </div>
          </div>
          <div className="cc-info-list">
            <div className="cc-info-row">
              <span>{translate(loc, { en: "Active Quests", th: "ภารกิจที่ดำเนิน" })}</span>
              <strong>{summary.activeProjects}</strong>
            </div>
            <div className="cc-info-row">
              <span>{translate(loc, { en: "Chemistry", th: "เคมีทีม" })}</span>
              <strong>{summary.chemistryScore > 0 ? summary.chemistryScore : "—"}</strong>
            </div>
            <div className="cc-info-row">
              <span>{translate(loc, { en: "At-Risk Heroes", th: "พนักงานเสี่ยง" })}</span>
              <strong style={{ color: summary.atRiskCount > 5 ? "var(--rpg-red)" : undefined }}>
                {summary.atRiskCount}
              </strong>
            </div>
            <div className="cc-info-row">
              <span>{translate(loc, { en: "Anchors", th: "ผู้สืบทอดหลัก" })}</span>
              <strong style={{ color: "var(--rpg-yellow)" }}>{summary.anchorCount}</strong>
            </div>
            <div className="cc-info-row">
              <span>{translate(loc, { en: "Open Support", th: "งานสนับสนุน" })}</span>
              <strong>{summary.openSupportActions}</strong>
            </div>
            <div className="cc-info-row">
              <span>{translate(loc, { en: "Heroes", th: "พนักงาน" })}</span>
              <strong>{summary.heroCount}</strong>
            </div>
          </div>
        </MenuWindow>
      </div>

      <div className="cc-home-side">
        <MenuWindow title={translate(loc, { en: "System Linkage", th: "การเชื่อมต่อระบบ" })} className="cc-home-window">
          <div className="cc-linkage-list">
            {integrationStatus.map((item) => (
              <div key={item.key} className="cc-linkage-row">
                <div>
                  <strong>{item.label}</strong>
                  <p>{item.source}</p>
                </div>
                <span className="cc-linkage-status">{item.status.replaceAll("_", " ")}</span>
              </div>
            ))}
          </div>
        </MenuWindow>

        <MenuWindow title={translate(loc, { en: "Operator Notes", th: "บันทึกผู้ดูแล" })} className="cc-home-window">
          {diagnostics.length > 0 ? (
            <div className="cc-diagnostic-list">
              {diagnostics.map((diagnostic) => (
                <div key={diagnostic} className="cc-diagnostic-item">
                  {diagnostic}
                </div>
              ))}
            </div>
          ) : (
            <div className="cc-operating-loop" aria-label="Operating loop">
              {[
                {
                  label: translate(loc, { en: "Pulse", th: "ชีพจร" }),
                  copy: translate(loc, {
                    en: "Scan finance, KPI drift, and active quest pressure first.",
                    th: "ดูการเงิน ความคลาดเคลื่อน KPI และแรงกดดันของภารกิจที่กำลังเดิน",
                  }),
                },
                {
                  label: translate(loc, { en: "Formation", th: "จัดทีม" }),
                  copy: translate(loc, {
                    en: "Fill critical quest seats and check budget or morale gates.",
                    th: "เติมตำแหน่งภารกิจสำคัญ และตรวจประตูงบประมาณหรือขวัญกำลังใจ",
                  }),
                },
                {
                  label: translate(loc, { en: "Roster", th: "ทำเนียบ" }),
                  copy: translate(loc, {
                    en: "Open the people wall when the next decision depends on one person.",
                    th: "เปิดทำเนียบเมื่อการตัดสินใจถัดไปผูกกับคนใดคนหนึ่ง",
                  }),
                },
                {
                  label: translate(loc, { en: "Ledger", th: "บัญชีกลาง" }),
                  copy: translate(loc, {
                    en: "Confirm the Sheets pipe before trusting a save-heavy session.",
                    th: "ตรวจท่อ Sheets ก่อนเริ่มช่วงงานที่มีการบันทึกจำนวนมาก",
                  }),
                },
              ].map((item) => (
                <div key={item.label} className="cc-operating-loop-row">
                  <strong>{item.label}</strong>
                  <span>{item.copy}</span>
                </div>
              ))}
            </div>
          )}
        </MenuWindow>
      </div>
      </div>
    </div>
  );
}

type ManualPage = {
  eyebrow: string;
  title: string;
  body: string;
  steps: string[];
  buttons: Array<{ label: string; action: string; route?: RouteScreen }>;
};

const MANUAL_PAGES: ManualPage[] = [
  {
    eyebrow: "READ FIRST",
    title: "You are running a kingdom, not reading a dashboard",
    body:
      "Each project is a quest. Each employee is a hero with limits, strengths, fatigue, salary cost, and social fit. The game is endless: improve the chair, revenue, buzz, and share-price signal by making better weekly formation decisions.",
    steps: [
      "Start in Boss Room and read the Board Pulse.",
      "Open Fixture List to see which quests are open, active, waiting for review, or done.",
      "Use Formation Board or Ninja Squad Builder to staff the quest.",
      "Lock the squad only when budget, skills, chemistry, and morale all make sense.",
      "Record the outcome after the work lands. The gap between prediction and reality is how the kingdom learns.",
    ],
    buttons: [
      { label: "Home", action: "Return to Boss Room without losing the selected route." },
      { label: "Menu", action: "Open the route chooser for every playable screen." },
      { label: "Back / Esc", action: "Move one browser-history step back. Esc also closes overlays first." },
      { label: "Manual / ?", action: "Open or close this player manual." },
    ],
  },
  {
    eyebrow: "BOSS ROOM",
    title: "Read the board before moving pieces",
    body:
      "The first screen is a morning ritual. It tells you whether the game is using live data, how the company pulse feels, which routes matter today, and whether the save pipe is healthy.",
    steps: [
      "Use Command List to preview a route, then press Enter on the preview or click the route itself.",
      "Board Pulse gives the quick compass: active quests, chemistry, at-risk heroes, anchors, support load, and roster size.",
      "System Linkage shows whether the data pipes are connected. Check Ledger before save-heavy sessions.",
      "Operator Notes become warnings when the app falls back to seeded demo data.",
    ],
    buttons: [
      { label: "Enter", action: "Open the selected route from the preview panel." },
      { label: "Live / Demo / Offline", action: "Refresh dashboard data. Purple Demo means local fallback, green Live means Neon DB." },
      { label: "DB / Sync / Err", action: "Open Sheets mirror status. Err means a missing or broken memory-card tab." },
      { label: "TH / EN", action: "Switch shell language." },
      { label: "Sign Out", action: "Clear the access cookie and return to login." },
    ],
  },
  {
    eyebrow: "ROUTES",
    title: "Every route has a job",
    body:
      "The route menu is the cartridge map. Use number keys for speed after you know the board. Health uses the P route button because the number row is already full.",
    steps: [
      "1 Company Pulse: read financial tempo, KPIs, and active quest pressure.",
      "0 Fixture List: advance the season from open quest to outcome review.",
      "2 Formation Board: assign heroes to real project slots and lock squads.",
      "3 Ninja Squad Builder: build a compact skill-first squad and save it as a quest.",
      "4 Matrix / PMO: compare strategy, resource pressure, and capability demand.",
      "5 Roster, 6 Signals, 7 Lobby, 8 Ledger, 9 Insights, P Health: inspect people, risk, floor motion, saves, analytics, and PMO parity.",
    ],
    buttons: ROUTES.map((route) => ({
      label: route.shortcut,
      action: `${SCREEN[route.key].title.en}: ${SCREEN[route.key].deck.en}`,
      route: route.key,
    })),
  },
  {
    eyebrow: "FORMATION",
    title: "Build parties like you mean it",
    body:
      "Formation is the main game mechanic. A high readiness score is not enough if the team is over cap. A legal team with weak chemistry may ship once and damage the kingdom later. Read all gates together.",
    steps: [
      "Pick an active quest, then fill required slots with heroes from the pool.",
      "Use filters to find people by department, class, fit, availability, and risk signal.",
      "Cycle party row on assigned heroes: front, middle, back. Captain up front plus support in back earns the DQ3-style chemistry lift.",
      "Watch Capacity Points, missing skills, chemistry, quality, morale, and party split before committing.",
      "Save/Lock writes to the ledger and makes the quest active. Unlocking values should be deliberate because the audit log records it.",
    ],
    buttons: [
      { label: "Assign / hero card", action: "Place a hero into the selected project slot." },
      { label: "Party row", action: "Cycle front, middle, and back row for chemistry calculation." },
      { label: "Save formation", action: "Persist the current board and mirror it to Sheets when configured." },
      { label: "Lock squad", action: "Start the game loop for the project with predicted scores and team state." },
      { label: "+ / - value controls", action: "Manual score edits work only after unlock and write to the adjustment log." },
    ],
  },
  {
    eyebrow: "FLOOR AND MEMORY",
    title: "The kingdom keeps moving after deployment",
    body:
      "Lobby, Signals, Ledger, and Health make the game honest. They show whether people are present, overloaded, drifting, supported, and recorded.",
    steps: [
      "Lobby check-in shows who is on the floor and who naturally clusters. It is a visibility tool, not a prescription.",
      "Signals surfaces risk and support actions before they become resignation or delivery problems.",
      "Ledger confirms that Postgres and the Google Sheets memory card are in step.",
      "Project Health mirrors PMO language so the game and the business review can talk to each other.",
      "When a quest ends, record the outcome. Prediction versus reality is more important than a perfect-looking draft.",
    ],
    buttons: [
      { label: "Check In / Check Out", action: "Toggle a hero's floor presence in the Lobby." },
      { label: "Create missing tabs", action: "Bootstrap Sheets tabs when the memory card is configured but incomplete." },
      { label: "Close Quest", action: "Record the real outcome and update the feedback loop." },
      { label: "Open Tome", action: "Inspect the printable story and quest history for one hero." },
    ],
  },
];

function ManualOverlay({
  activeRoute,
  onClose,
  onNavigate,
  loc,
}: {
  activeRoute: RouteScreen;
  onClose: () => void;
  onNavigate: (route: RouteScreen) => void;
  loc: Locale;
}) {
  const [pageIndex, setPageIndex] = useState(0);
  const [turning, setTurning] = useState<"prev" | "next" | null>(null);
  const page = MANUAL_PAGES[pageIndex];
  const activeTitle = SCREEN[activeRoute].title.en;

  function flip(nextIndex: number, direction: "prev" | "next") {
    setTurning(direction);
    window.setTimeout(() => {
      setPageIndex(nextIndex);
      setTurning(null);
    }, 120);
  }

  function prevPage() {
    if (pageIndex === 0) return;
    flip(pageIndex - 1, "prev");
  }

  function nextPage() {
    if (pageIndex >= MANUAL_PAGES.length - 1) return;
    flip(pageIndex + 1, "next");
  }

  return (
    <div className="cc-overlay cc-manual-overlay" role="dialog" aria-modal="true" aria-label="Player manual">
      <div className="cc-overlay-scrim" onClick={onClose} />
      <div className="cc-manual-window">
        <div className="cc-manual-chrome">
          <div>
            <span className="cc-manual-kicker">{page.eyebrow}</span>
            <h2>TKCX Player Manual</h2>
            <p>Current route: {activeTitle}</p>
          </div>
          <button type="button" className="cc-icon-button" onClick={onClose} aria-label="Close manual">
            <X size={18} aria-hidden="true" />
          </button>
        </div>

        <div className="cc-manual-book" data-turning={turning ?? "idle"}>
          <section className="cc-manual-page" aria-live="polite">
            <div className="cc-manual-page-number">
              Page {pageIndex + 1} / {MANUAL_PAGES.length}
            </div>
            <h3>{page.title}</h3>
            <p>{page.body}</p>
            <ol className="cc-manual-steps">
              {page.steps.map((step) => (
                <li key={step}>{step}</li>
              ))}
            </ol>
          </section>

          <section className="cc-manual-page cc-manual-buttons">
            <div className="cc-manual-page-number">Button map</div>
            <div className="cc-manual-button-list">
              {page.buttons.map((button) => (
                <button
                  key={`${page.title}-${button.label}`}
                  type="button"
                  className="cc-manual-button-row"
                  onClick={button.route ? () => onNavigate(button.route!) : undefined}
                  disabled={!button.route}
                >
                  <strong>{button.label}</strong>
                  <span>{button.action}</span>
                </button>
              ))}
            </div>
          </section>
        </div>

        <div className="cc-manual-controls">
          <button type="button" className="cc-nav-button" onClick={prevPage} disabled={pageIndex === 0}>
            <ChevronLeft size={15} aria-hidden="true" />
            {translate(loc, { en: "Prev", th: "ก่อนหน้า" })}
          </button>
          <div className="cc-manual-dots" aria-label="Manual pages">
            {MANUAL_PAGES.map((manualPage, idx) => (
              <button
                key={manualPage.title}
                type="button"
                aria-label={`Open manual page ${idx + 1}`}
                data-active={idx === pageIndex ? "true" : "false"}
                onClick={() => {
                  if (idx === pageIndex) return;
                  flip(idx, idx > pageIndex ? "next" : "prev");
                }}
              />
            ))}
          </div>
          <button type="button" className="cc-nav-button" onClick={nextPage} disabled={pageIndex >= MANUAL_PAGES.length - 1}>
            {translate(loc, { en: "Next", th: "ถัดไป" })}
            <ChevronRight size={15} aria-hidden="true" />
          </button>
        </div>
      </div>
    </div>
  );
}

function RouteMenuOverlay({
  selected,
  onClose,
  onOpen,
  loc,
}: {
  selected: RouteScreen;
  onClose: () => void;
  onOpen: (route: RouteScreen) => void;
  loc: Locale;
}) {
  return (
    <div className="cc-overlay" role="dialog" aria-modal="true">
      <div className="cc-overlay-scrim" onClick={onClose} />
      <div className="cc-overlay-window">
        <MenuWindow title={translate(loc, { en: "Route Menu", th: "เมนูเส้นทาง" })}>
          <div className="cc-overlay-actions">
            <button type="button" className="cc-nav-button" onClick={onClose}>
              {translate(loc, { en: "Close", th: "ปิด" })}
            </button>
          </div>
          <div className="cc-overlay-list">
            {ROUTES.map((route) => {
              const m = metaFor(route.key, loc);
              return (
                <button
                  key={route.key}
                  type="button"
                  className="cc-overlay-button"
                  data-active={selected === route.key ? "true" : "false"}
                  onClick={() => onOpen(route.key)}
                >
                  <span className="pixel">{route.shortcut}</span>
                  <div>
                    <strong>{m.title}</strong>
                    <p>{m.deck}</p>
                  </div>
                </button>
              );
            })}
          </div>
        </MenuWindow>
      </div>
    </div>
  );
}

function RouteContent({
  route,
  dash,
}: {
  route: RouteScreen;
  dash: DashboardPayload;
}) {
  switch (route) {
    case "cockpit":
      return <CockpitTab dash={dash} />;
    case "fixture":
      return <FixtureTab dash={dash} />;
    case "formation":
      return <FormationTab dash={dash} />;
    case "ninja":
      return <NinjaTab dash={dash} />;
    case "matrix":
      return <MatrixTab dash={dash} />;
    case "roster":
      return <RosterTab dash={dash} />;
    case "signals":
      return <SignalsTab dash={dash} />;
    case "lobby":
      return <LobbyTab dash={dash} />;
    case "ledger":
      return <LedgerTab dash={dash} />;
    case "insights":
      return <InsightsTab dash={dash} />;
    case "health":
      // dash prop unused; ProjectHealthPage fetches its own /api endpoint.
      void dash;
      return <ProjectHealthPage />;
    default:
      return null;
  }
}

function MetricPill({ label, value }: { label: string; value: string }) {
  return (
    <div className="cc-metric-pill">
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  );
}

function SyncDot({
  health,
  onClick,
}: {
  health: SheetsHealth | null;
  onClick: () => void;
}) {
  const state = !health
    ? "idle"
    : !health.enabled
      ? "idle"
      : health.ok && health.missing.length === 0
        ? "ok"
        : "error";
  const label = state === "ok" ? "Sync" : state === "error" ? "Err" : "DB";
  return (
    <button
      type="button"
      className="cc-sync-dot"
      data-state={state}
      onClick={onClick}
      title={state === "ok" ? "Sheets healthy" : state === "error" ? "Sheets error — click for detail" : "Sheets no-op (DB only)"}
    >
      <span className="cc-sync-dot-led" />
      <span>{label}</span>
    </button>
  );
}

function SyncStatusPopup({
  health,
  onClose,
}: {
  health: SheetsHealth | null;
  onClose: () => void;
}) {
  return (
    <div className="cc-sync-popup" role="dialog" aria-modal="false">
      <MenuWindow title="Sheets Sync Status">
        <div className="cc-info-list">
          <div className="cc-info-row">
            <span>Enabled</span>
            <strong>{health?.enabled ? "Yes" : "No"}</strong>
          </div>
          <div className="cc-info-row">
            <span>Last Check</span>
            <strong>
              {health?.checked_at
                ? new Date(health.checked_at).toLocaleTimeString()
                : "—"}
            </strong>
          </div>
          <div className="cc-info-row">
            <span>Status</span>
            <strong>
              {!health
                ? "probing"
                : !health.enabled
                  ? "no-op (env missing)"
                  : health.ok
                    ? "healthy"
                    : health.error ?? "error"}
            </strong>
          </div>
          <div className="cc-info-row">
            <span>Tabs Found</span>
            <strong>{health?.tabs.length ?? 0}</strong>
          </div>
          <div className="cc-info-row">
            <span>Missing</span>
            <strong>{health?.missing.length ?? 0}</strong>
          </div>
        </div>

        {health?.declared && health.declared.length > 0 && (
          <div className="cc-sync-popup-tablist">
            {health.declared.map((t) => (
              <code key={t} data-missing={health.missing.includes(t) ? "true" : "false"}>
                {health.missing.includes(t) ? "✗ " : "✓ "}
                {t}
              </code>
            ))}
          </div>
        )}

        <div className="cc-rail-actions" style={{ marginTop: 12 }}>
          <button type="button" className="cc-rail-button" onClick={onClose}>
            Close
          </button>
        </div>
      </MenuWindow>
    </div>
  );
}

function isScreen(value: string): value is Screen {
  return value === "home" || ROUTES.some((route) => route.key === value);
}

function aggregateChemistry(teams: { chemistry_score?: number | null }[]): number {
  const scores = teams
    .map((team) => team.chemistry_score)
    .filter((score): score is number => typeof score === "number");
  if (scores.length === 0) return 0;
  return scores.reduce((sum, score) => sum + score, 0) / scores.length;
}

function riskSignalFor(employee: {
  tenure_years?: number | null;
  attr_con?: number | null;
  attr_cha?: number | null;
  dept_code?: string | null;
}) {
  if (isAnchor(employee)) return "anchor" as const;
  const tenure = typeof employee.tenure_years === "number" ? employee.tenure_years : 0;
  const con = typeof employee.attr_con === "number" ? employee.attr_con : 10;
  if (tenure < 1) return "watch" as const;
  if (HIGH_RISK_DEPTS.has(employee.dept_code ?? "") && con < 9) return "risk" as const;
  return "ok" as const;
}

function buildRouteMetrics(
  route: RouteScreen,
  stats: {
    heroCount: number;
    activeProjects: number;
    kpiCount: number;
    chemistryScore: number;
    atRiskCount: number;
    anchorCount: number;
    openSupportActions: number;
    overloadedHeroes: number;
    deptCount: number;
    standardsCount: number;
    integrationCount: number;
    varianceWatchCount: number;
  },
): RouteMetric[] {
  switch (route) {
    case "cockpit":
      return [
        { label: "Heroes", value: String(stats.heroCount) },
        { label: "Active Quests", value: String(stats.activeProjects) },
        { label: "KPIs", value: String(stats.kpiCount) },
      ];
    case "formation":
      return [
        { label: "Standards", value: String(stats.standardsCount) },
        { label: "Over Capacity", value: String(stats.overloadedHeroes) },
        { label: "Variance Watch", value: String(stats.varianceWatchCount) },
      ];
    case "ninja":
      return [
        { label: "Hero Pool", value: String(stats.heroCount) },
        { label: "Open Support", value: String(stats.openSupportActions) },
        { label: "Integrations", value: String(stats.integrationCount) },
      ];
    case "matrix":
      return [
        { label: "Departments", value: String(stats.deptCount) },
        { label: "Standards", value: String(stats.standardsCount) },
        { label: "Chemistry", value: String(stats.chemistryScore) },
      ];
    case "roster":
      return [
        { label: "Heroes", value: String(stats.heroCount) },
        { label: "Departments", value: String(stats.deptCount) },
        { label: "Anchors", value: String(stats.anchorCount) },
      ];
    case "signals":
      return [
        { label: "At Risk", value: String(stats.atRiskCount) },
        { label: "Open Actions", value: String(stats.openSupportActions) },
        { label: "Anchors", value: String(stats.anchorCount) },
      ];
    case "lobby":
      return [
        { label: "Heroes", value: String(stats.heroCount) },
        { label: "Open Support", value: String(stats.openSupportActions) },
        { label: "Departments", value: String(stats.deptCount) },
      ];
    case "ledger":
      return [
        { label: "Integrations", value: String(stats.integrationCount) },
        { label: "Standards", value: String(stats.standardsCount) },
        { label: "Variance Watch", value: String(stats.varianceWatchCount) },
      ];
    case "insights":
      return [
        { label: "Heroes", value: String(stats.heroCount) },
        { label: "Departments", value: String(stats.deptCount) },
        { label: "Charts", value: "8" },
      ];
    default:
      return [];
  }
}
