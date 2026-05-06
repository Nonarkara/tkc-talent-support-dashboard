"use client";

import { useEffect, useState } from "react";
import { motion, useMotionValue, useTransform, animate, AnimatePresence } from "framer-motion";
import Link from "next/link";
import { MenuWindow } from "@/components/MenuWindow";
import { PixelSprite } from "@/components/PixelSprite";

// ── Constants ──────────────────────────────────────────────────────────────
const SHEET_URL =
  "https://docs.google.com/spreadsheets/d/1LR8t7QxccwL1d5NBbQ9d_ZDy-T4qvxwUTi-3PJYuttE/edit";
const SHEET_ID_SHORT = "1LR8t7Qx…3PJYuttE";

// ── Stat counter ───────────────────────────────────────────────────────────
function CountUp({ target, duration = 0.5 }: { target: number; duration?: number }) {
  const count = useMotionValue(0);
  const rounded = useTransform(count, (v) => Math.round(v).toLocaleString());
  const [display, setDisplay] = useState("0");
  useEffect(() => {
    const controls = animate(count, target, { duration, ease: [0.16, 1, 0.3, 1] as const });
    const unsub = rounded.on("change", setDisplay);
    return () => {
      controls.stop();
      unsub();
    };
  }, [target, duration, count, rounded]);
  return <span>{display}</span>;
}

// ── Live data ──────────────────────────────────────────────────────────────
type LiveData = { heroCount: number; projectCount: number; teamCount: number; live: boolean };

function useLiveData() {
  const [data, setData] = useState<LiveData | null>(null);
  const [error, setError] = useState(false);
  useEffect(() => {
    fetch("/api/db/dashboard")
      .then((r) => r.json())
      .then((j) =>
        setData({
          heroCount: j.employees?.length ?? 0,
          projectCount: j.projects?.length ?? 0,
          teamCount: j.teams?.length ?? 0,
          live: j.live ?? false,
        }),
      )
      .catch(() => setError(true));
  }, []);
  return { data, error };
}

// ── Data ───────────────────────────────────────────────────────────────────
const DELIVERABLES = [
  { no: 1, th: "ระบบ Command Center ออนไลน์ (8 หน้าจอ)", note: "tkc-digital-twin.fly.dev", exp: 800 },
  { no: 2, th: "ฐานข้อมูล PostgreSQL บน Cloud (Singapore)", note: "28 ตาราง · 348 พนักงาน", exp: 600 },
  { no: 3, th: "★ Google Sheets Shadow Mirror — THE MAGIC", note: "20 แท็บ · sync auto", exp: 1000 },
  { no: 4, th: "Game Engine — ICA · Credo · HP/MP/XP", note: "Fantasy Football", exp: 700 },
  { no: 5, th: "Formation Engine — จัดทีม + Budget Cap", note: "Moneyball rule", exp: 600 },
  { no: 6, th: "Ninja Squad Engine — ประเมินความพร้อม", note: "Mission readiness", exp: 500 },
  { no: 7, th: "Capability Matrix — Heatmap ทักษะ", note: "Real-time gaps", exp: 500 },
  { no: 8, th: "The Tome Printer — ประวัติพนักงาน", note: "Retirement Ritual", exp: 400 },
  { no: 9, th: "Obsidian Export Engine — 348 dossiers", note: "Auto Knowledge Base", exp: 500 },
  { no: 10, th: "Daily Briefing System — รายงานรายวัน", note: "Auto-generated", exp: 400 },
];
const TOTAL_EXP = DELIVERABLES.reduce((s, d) => s + d.exp, 0);

const SCREENS = [
  { key: "C", codename: "COCKPIT", nameTh: "ห้องควบคุม", desc: "Org health · Four Pillars · GitHub Pulse · Flow Distribution", accent: "#5B89B5" },
  { key: "F", codename: "FORMATION", nameTh: "จัดทีม", desc: "Drag-and-drop felt mat · salary cap · party order · chemistry", accent: "#D4A843" },
  { key: "N", codename: "NINJA", nameTh: "สกวอด", desc: "Candidate matching · skill-gap analysis · mission config", accent: "#8B6FB5" },
  { key: "M", codename: "MATRIX", nameTh: "แมทริกซ์", desc: "Capability heatmap · supply vs demand · gaps before failures", accent: "#4A9BA8" },
  { key: "R", codename: "ROSTER", nameTh: "รายชื่อฮีโร่", desc: "Wall of 348 cards · Warhol principle · repetition IS the company", accent: "#D4A843" },
  { key: "S", codename: "SIGNALS", nameTh: "สัญญาณ", desc: "Deployment history · prediction vs reality · the feedback loop", accent: "#C44D3F" },
  { key: "L", codename: "LOBBY", nameTh: "โลบบี้", desc: "Pixel characters · real-time check-in · the living heartbeat", accent: "#d8411f" },
  { key: "G", codename: "LEDGER", nameTh: "บัญชีระบบ", desc: "Sheets health · Game Balance · Obsidian export · audit log", accent: "#f3b61f" },
];

const SHEET_TABS = [
  "Players", "Projects", "Teams", "CheckIns", "Events", "League",
  "DeptHeat", "AttrHistory", "NinjaSquads", "SkillCatalog", "MatrixScenarios",
  "Formation", "FormationEvents", "Resources", "Attendance", "Interactions",
  "VocationChanges", "Outcomes", "Allocations", "Ledger",
];

const ROADMAP = [
  { version: "v8.6", codename: "MEMPALACE", desc: "LLM-powered relationship memory — local-first AI that learns who works well with whom", accent: "#8B6FB5" },
  { version: "v8.7", codename: "VOICE CHECK-IN", desc: "Thai STT daily input — directors speak, engine transcribes and structures", accent: "#5B89B5" },
  { version: "v8.8", codename: "MANGO ERP", desc: "End the double-entry — pull project history directly from Mango via Sheets", accent: "#5B8C4A" },
];

// ── Tabs ───────────────────────────────────────────────────────────────────
type TabKey = "scope" | "screens" | "sheets" | "vibes" | "next";
const TABS: Array<{ key: TabKey; shortcut: string; label: string; sub: string }> = [
  { key: "scope",   shortcut: "1", label: "SCOPE",    sub: "ขอบเขตงาน" },
  { key: "screens", shortcut: "2", label: "SCREENS",  sub: "8 หน้าจอ" },
  { key: "sheets",  shortcut: "3", label: "SHEETS",   sub: "★ THE MAGIC" },
  { key: "vibes",   shortcut: "4", label: "VIBES",    sub: "สัญญาณสด" },
  { key: "next",    shortcut: "5", label: "NEXT",     sub: "ขั้นถัดไป" },
];

// ═══════════════════════════════════════════════════════════════════════════
export default function ReportPage() {
  const [tab, setTab] = useState<TabKey>("scope");
  const [started, setStarted] = useState(false);
  const { data, error } = useLiveData();

  // PRESS START gate — dismiss on key, click, or 6s timeout
  useEffect(() => {
    if (started) return;
    const start = () => setStarted(true);
    window.addEventListener("keydown", start);
    window.addEventListener("click", start);
    const t = setTimeout(start, 6000);
    return () => {
      window.removeEventListener("keydown", start);
      window.removeEventListener("click", start);
      clearTimeout(t);
    };
  }, [started]);

  // 1-5 keys for tab nav
  useEffect(() => {
    if (!started) return;
    const onKey = (e: KeyboardEvent) => {
      const found = TABS.find((t) => t.shortcut === e.key);
      if (found) setTab(found.key);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [started]);

  return (
    <>
      <AnimatePresence>{!started && <TitleScreen />}</AnimatePresence>

      <div
        className="tabletop"
        style={{
          height: "100dvh",
          width: "100vw",
          overflow: "hidden",
          display: "flex",
          flexDirection: "column",
          color: "var(--text-primary)",
        }}
      >
        {/* ═══ TOP BAR ═══ */}
        <div
          style={{
            flex: "0 0 auto",
            borderBottom: "1px solid var(--border-subtle)",
            padding: "8px 16px",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: 12,
            fontFamily: "var(--font-mono)",
            fontSize: 10,
          }}
        >
          <Link href="/command-center" style={{ color: "var(--accent-gold)", textDecoration: "none", whiteSpace: "nowrap" }}>
            ← COMMAND CENTER
          </Link>
          <span style={{ color: "var(--text-muted)", letterSpacing: "0.06em", textAlign: "center", flex: 1 }}>
            TKC DIGITAL TWIN · v4.2 FLUID LEGEND
          </span>
          <span style={{ color: "var(--accent-green)", whiteSpace: "nowrap" }}>
            <BlinkingDot /> LIVE
          </span>
        </div>

        {/* ═══ HERO ═══ */}
        <div
          style={{
            flex: "0 0 auto",
            padding: "14px 16px 12px",
            textAlign: "center",
            borderBottom: "1px solid var(--border-subtle)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: 18,
          }}
        >
          <div style={{ flexShrink: 0 }}>
            <PixelSprite archetype="captain" seed="non-arakara" size={42} />
          </div>
          <motion.div
            initial={{ opacity: 0, y: 4 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.24, ease: [0.16, 1, 0.3, 1] }}
            style={{ textAlign: "left" }}
          >
            <div
              style={{
                fontFamily: "var(--font-pixel)",
                fontSize: 7,
                letterSpacing: "0.22em",
                color: "var(--accent-gold)",
                marginBottom: 4,
              }}
            >
              ★ MISSION COMPLETE ★ &nbsp;·&nbsp; +{TOTAL_EXP.toLocaleString()} EXP
            </div>
            <h1
              style={{
                fontFamily: "var(--font-sans)",
                fontSize: "clamp(15px, 2.2vw, 20px)",
                fontWeight: 700,
                lineHeight: 1.25,
                margin: 0,
              }}
            >
              รายงานสรุปผลการพัฒนา ระบบสนับสนุนทรัพยากรมนุษย์ TKC
            </h1>
            <p style={{ fontFamily: "var(--font-mono)", fontSize: 10, color: "var(--text-muted)", marginTop: 4, display: "flex", alignItems: "center", gap: 8 }}>
              <img src="/non-logo.png" alt="Dr Non" style={{ width: 28, height: 28, borderRadius: "50%", objectFit: "cover", opacity: 0.9 }} />
              by นน อัครประเสริฐกุล · ส่งมอบ 6 พฤษภาคม 2569
            </p>
          </motion.div>
        </div>

        {/* ═══ MAIN BODY ═══ */}
        <div
          style={{
            flex: "1 1 auto",
            minHeight: 0,
            display: "grid",
            gridTemplateColumns: "minmax(190px, 230px) 1fr",
          }}
        >
          {/* ── SIDEBAR ── */}
          <aside
            style={{
              borderRight: "1px solid var(--border-subtle)",
              padding: "12px 10px",
              display: "flex",
              flexDirection: "column",
              gap: 4,
              overflowY: "auto",
              background: "rgba(0,0,0,0.15)",
            }}
          >
            {TABS.map((t) => {
              const active = tab === t.key;
              return (
                <button
                  key={t.key}
                  onClick={() => setTab(t.key)}
                  style={{
                    position: "relative",
                    display: "grid",
                    gridTemplateColumns: "14px 18px 1fr",
                    alignItems: "center",
                    gap: 8,
                    padding: "9px 8px",
                    border: `1px solid ${active ? "var(--accent-gold)" : "transparent"}`,
                    background: active ? "rgba(212,168,67,0.10)" : "transparent",
                    color: active ? "var(--accent-gold)" : "var(--text-secondary)",
                    cursor: "pointer",
                    fontFamily: "var(--font-mono)",
                    textAlign: "left",
                    transition: "border-color 90ms ease-out, background 90ms ease-out, color 90ms ease-out",
                  }}
                  onMouseEnter={(e) => {
                    if (!active) (e.currentTarget as HTMLButtonElement).style.borderColor = "var(--text-muted)";
                  }}
                  onMouseLeave={(e) => {
                    if (!active) (e.currentTarget as HTMLButtonElement).style.borderColor = "transparent";
                  }}
                >
                  {/* Animated ▶ cursor for active tab */}
                  <span
                    style={{
                      fontFamily: "var(--font-pixel)",
                      fontSize: 9,
                      color: "var(--accent-gold)",
                      visibility: active ? "visible" : "hidden",
                      animation: active ? "selector-blink 700ms steps(2, end) infinite" : undefined,
                    }}
                  >
                    ▶
                  </span>
                  <span
                    style={{
                      fontFamily: "var(--font-pixel)",
                      fontSize: 9,
                      color: active ? "var(--accent-gold)" : "var(--text-muted)",
                    }}
                  >
                    {t.shortcut}
                  </span>
                  <span style={{ display: "flex", flexDirection: "column", gap: 2 }}>
                    <span style={{ fontSize: 11, fontWeight: 600, letterSpacing: "0.08em" }}>{t.label}</span>
                    <span style={{ fontFamily: "var(--font-sans)", fontSize: 10, color: "var(--text-muted)" }}>
                      {t.sub}
                    </span>
                  </span>
                </button>
              );
            })}

            {/* ── Stats footer ── */}
            <div style={{ marginTop: "auto", paddingTop: 12, borderTop: "1px solid var(--border-subtle)" }}>
              <div
                style={{
                  fontFamily: "var(--font-pixel)",
                  fontSize: 6,
                  letterSpacing: "0.2em",
                  color: "var(--text-muted)",
                  marginBottom: 8,
                  textAlign: "center",
                }}
              >
                — SCOREBOARD —
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 4 }}>
                {[
                  { label: "HEROES", value: 348 },
                  { label: "PROJECTS", value: 8 },
                  { label: "TABLES", value: 28 },
                  { label: "EXP", value: TOTAL_EXP },
                ].map((s) => (
                  <div
                    key={s.label}
                    style={{
                      border: "1px solid var(--border-subtle)",
                      padding: "5px 6px",
                      textAlign: "center",
                    }}
                  >
                    <div
                      style={{
                        fontFamily: "var(--font-mono)",
                        fontSize: 13,
                        fontWeight: 700,
                        color: "var(--accent-gold)",
                      }}
                    >
                      <CountUp target={s.value} />
                    </div>
                    <div
                      style={{
                        fontFamily: "var(--font-pixel)",
                        fontSize: 6,
                        letterSpacing: "0.16em",
                        color: "var(--text-muted)",
                        marginTop: 2,
                      }}
                    >
                      {s.label}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </aside>

          {/* ── PANEL ── */}
          <main style={{ position: "relative", overflowY: "auto", padding: "16px 18px" }}>
            <AnimatePresence mode="wait">
              <motion.div
                key={tab}
                initial={{ opacity: 0, y: 4 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -4 }}
                transition={{ duration: 0.16, ease: [0.16, 1, 0.3, 1] }}
              >
                {tab === "scope" && <ScopePanel />}
                {tab === "screens" && <ScreensPanel />}
                {tab === "sheets" && <SheetsPanel />}
                {tab === "vibes" && <VibesPanel data={data} error={error} />}
                {tab === "next" && <NextPanel />}
              </motion.div>
            </AnimatePresence>
          </main>
        </div>

        {/* ═══ FOOTER ═══ */}
        <div
          style={{
            flex: "0 0 auto",
            padding: "10px 16px",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: 12,
            background: "var(--bg-base)",
          }}
        >
          <span style={{ fontFamily: "var(--font-mono)", fontSize: 9, color: "var(--text-muted)" }}>
            ▲▼ keys: 1–5 to switch panels
          </span>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap", justifyContent: "flex-end" }}>
            <a
              href="/whitepaper.html"
              target="_blank"
              rel="noopener noreferrer"
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 8,
                padding: "10px 18px",
                border: "2px solid var(--accent-blue, #5B89B5)",
                background: "var(--bg-elevated)",
                color: "var(--accent-blue, #5B89B5)",
                fontFamily: "var(--font-pixel)",
                fontSize: 8,
                letterSpacing: "0.18em",
                textDecoration: "none",
                cursor: "pointer",
                transition: "background 100ms ease-out, transform 80ms ease-out",
                whiteSpace: "nowrap",
              }}
              onMouseEnter={(e) => ((e.currentTarget as HTMLAnchorElement).style.background = "rgba(91,137,181,0.16)")}
              onMouseLeave={(e) => ((e.currentTarget as HTMLAnchorElement).style.background = "var(--bg-elevated)")}
              onMouseDown={(e) => ((e.currentTarget as HTMLAnchorElement).style.transform = "scale(0.97)")}
              onMouseUp={(e) => ((e.currentTarget as HTMLAnchorElement).style.transform = "scale(1)")}
            >
              📖 WHITEPAPER · รายงานเบื้องต้น
            </a>
            <a
              href="/report/print"
              target="_blank"
              rel="noopener noreferrer"
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 8,
                padding: "10px 18px",
                border: "2px solid var(--accent-gold)",
                background: "var(--bg-elevated)",
                color: "var(--accent-gold)",
                fontFamily: "var(--font-pixel)",
                fontSize: 8,
                letterSpacing: "0.18em",
                textDecoration: "none",
                cursor: "pointer",
                transition: "background 100ms ease-out, transform 80ms ease-out",
                whiteSpace: "nowrap",
              }}
              onMouseEnter={(e) => ((e.currentTarget as HTMLAnchorElement).style.background = "rgba(212,168,67,0.18)")}
              onMouseLeave={(e) => ((e.currentTarget as HTMLAnchorElement).style.background = "var(--bg-elevated)")}
              onMouseDown={(e) => ((e.currentTarget as HTMLAnchorElement).style.transform = "scale(0.97)")}
              onMouseUp={(e) => ((e.currentTarget as HTMLAnchorElement).style.transform = "scale(1)")}
            >
              📄 FORMAL · ใบตรวจรับงาน
            </a>
            <a
              href="https://github.com/Nonarkara/tkc-digital-twin-showcase"
              target="_blank"
              rel="noopener noreferrer"
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 8,
                padding: "10px 18px",
                border: "1px solid var(--border-subtle)",
                background: "var(--bg-elevated)",
                color: "var(--text-muted)",
                fontFamily: "var(--font-pixel)",
                fontSize: 8,
                letterSpacing: "0.18em",
                textDecoration: "none",
                cursor: "pointer",
                transition: "background 100ms ease-out, transform 80ms ease-out",
                whiteSpace: "nowrap",
              }}
              onMouseEnter={(e) => ((e.currentTarget as HTMLAnchorElement).style.background = "rgba(255,255,255,0.06)")}
              onMouseLeave={(e) => ((e.currentTarget as HTMLAnchorElement).style.background = "var(--bg-elevated)")}
              onMouseDown={(e) => ((e.currentTarget as HTMLAnchorElement).style.transform = "scale(0.97)")}
              onMouseUp={(e) => ((e.currentTarget as HTMLAnchorElement).style.transform = "scale(1)")}
            >
              ⌥ GITHUB · SHOWCASE
            </a>
          </div>
        </div>
      </div>

      <style jsx global>{`
        @keyframes selector-blink {
          0%, 49% { opacity: 1; }
          50%, 100% { opacity: 0; }
        }
        @keyframes title-pulse {
          0%, 100% { opacity: 0.35; }
          50% { opacity: 1; }
        }
      `}</style>
    </>
  );
}

// ═══ TITLE SCREEN ═══════════════════════════════════════════════════════════
function TitleScreen() {
  return (
    <motion.div
      initial={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.18, ease: "easeOut" }}
      className="tabletop"
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 100,
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        cursor: "pointer",
        gap: 28,
      }}
    >
      <motion.div
        initial={{ scale: 0.92, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ duration: 0.32, ease: [0.16, 1, 0.3, 1] }}
        style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 14 }}
      >
        <PixelSprite archetype="captain" seed="non-arakara" size={72} />
        <div
          style={{
            fontFamily: "var(--font-pixel)",
            fontSize: 11,
            letterSpacing: "0.3em",
            color: "var(--accent-gold)",
            textAlign: "center",
          }}
        >
          TKC DIGITAL TWIN
        </div>
        <div
          style={{
            fontFamily: "var(--font-sans)",
            fontSize: "clamp(20px, 3.4vw, 30px)",
            fontWeight: 700,
            color: "var(--text-primary)",
            textAlign: "center",
            lineHeight: 1.25,
            maxWidth: 720,
            padding: "0 24px",
          }}
        >
          ★ MISSION COMPLETE ★
        </div>
        <div
          style={{
            fontFamily: "var(--font-sans)",
            fontSize: 13,
            color: "var(--text-secondary)",
            textAlign: "center",
            maxWidth: 560,
            lineHeight: 1.5,
            padding: "0 24px",
          }}
        >
          รายงานสรุปผลการพัฒนา ระบบสนับสนุนทรัพยากรมนุษย์ TKC
          <br />
          <span style={{ color: "var(--text-muted)", fontSize: 11, fontFamily: "var(--font-mono)" }}>
            by นน อัครประเสริฐกุล · 6 พฤษภาคม 2569
          </span>
        </div>
      </motion.div>

      <div
        style={{
          fontFamily: "var(--font-pixel)",
          fontSize: 10,
          letterSpacing: "0.3em",
          color: "var(--text-primary)",
          animation: "title-pulse 1.1s ease-in-out infinite",
        }}
      >
        ▶ PRESS ANY KEY TO START ◀
      </div>
    </motion.div>
  );
}

// ═══ Reusable blinking LIVE dot ═════════════════════════════════════════════
function BlinkingDot() {
  return (
    <span
      style={{
        display: "inline-block",
        width: 8,
        height: 8,
        background: "var(--accent-green)",
        marginRight: 4,
        animation: "selector-blink 1.2s steps(2, end) infinite",
      }}
    />
  );
}

// ═══ PANEL: SCOPE ═══════════════════════════════════════════════════════════
function ScopePanel() {
  return (
    <MenuWindow title="QUEST LOG · ขอบเขตงานที่ส่งมอบ">
      <div style={{ display: "flex", flexDirection: "column", gap: 0 }}>
        {DELIVERABLES.map((d) => (
          <div
            key={d.no}
            style={{
              display: "grid",
              gridTemplateColumns: "26px 1fr auto auto auto",
              gap: 10,
              alignItems: "center",
              padding: "9px 4px",
              borderBottom: "1px solid rgba(255,255,255,0.05)",
            }}
          >
            <span style={{ fontFamily: "var(--font-mono)", fontSize: 10, color: "var(--text-muted)" }}>
              {String(d.no).padStart(2, "0")}
            </span>
            <span style={{ fontFamily: "var(--font-sans)", fontSize: 12.5, color: "var(--text-primary)", lineHeight: 1.4 }}>
              {d.th}
            </span>
            <span style={{ fontFamily: "var(--font-mono)", fontSize: 9, color: "var(--text-muted)", whiteSpace: "nowrap" }}>
              {d.note}
            </span>
            <span
              style={{
                fontFamily: "var(--font-pixel)",
                fontSize: 7,
                letterSpacing: "0.1em",
                color: "var(--accent-gold)",
                whiteSpace: "nowrap",
              }}
            >
              +{d.exp} EXP
            </span>
            <span
              style={{
                display: "inline-flex",
                alignItems: "center",
                padding: "2px 6px",
                border: "1px solid var(--accent-green)",
                color: "var(--accent-green)",
                fontFamily: "var(--font-pixel)",
                fontSize: 7,
                letterSpacing: "0.1em",
                whiteSpace: "nowrap",
              }}
            >
              ✓ WIN
            </span>
          </div>
        ))}
      </div>
      <div
        style={{
          marginTop: 12,
          padding: "10px 12px",
          border: "1px solid var(--accent-gold)",
          background: "rgba(212,168,67,0.06)",
          fontFamily: "var(--font-pixel)",
          fontSize: 8,
          letterSpacing: "0.18em",
          color: "var(--accent-gold)",
          textAlign: "center",
        }}
      >
        ★ TOTAL EXP GAINED: {TOTAL_EXP.toLocaleString()} ★
      </div>
    </MenuWindow>
  );
}

// ═══ PANEL: SCREENS ═════════════════════════════════════════════════════════
function ScreensPanel() {
  return (
    <MenuWindow title="COMMAND MENU · 8 หน้าจอที่พัฒนา">
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(240px, 1fr))", gap: 8 }}>
        {SCREENS.map((s) => (
          <div
            key={s.key}
            style={{
              border: "1px solid var(--border-subtle)",
              padding: 12,
              background: "rgba(0,0,0,0.2)",
              transition: "border-color 100ms ease-out, transform 100ms ease-out",
            }}
            onMouseEnter={(e) => {
              const el = e.currentTarget as HTMLDivElement;
              el.style.borderColor = s.accent;
              el.style.transform = "translateY(-2px)";
            }}
            onMouseLeave={(e) => {
              const el = e.currentTarget as HTMLDivElement;
              el.style.borderColor = "var(--border-subtle)";
              el.style.transform = "translateY(0)";
            }}
          >
            <div style={{ display: "flex", alignItems: "baseline", gap: 8, marginBottom: 5 }}>
              <span style={{ fontFamily: "var(--font-pixel)", fontSize: 10, color: s.accent }}>[{s.key}]</span>
              <span style={{ fontFamily: "var(--font-pixel)", fontSize: 7, letterSpacing: "0.16em", color: "var(--text-secondary)" }}>
                {s.codename}
              </span>
            </div>
            <div style={{ fontFamily: "var(--font-sans)", fontSize: 13, fontWeight: 600, marginBottom: 4 }}>{s.nameTh}</div>
            <div style={{ fontFamily: "var(--font-sans)", fontSize: 11, color: "var(--text-muted)", lineHeight: 1.5 }}>
              {s.desc}
            </div>
          </div>
        ))}
      </div>
    </MenuWindow>
  );
}

// ═══ PANEL: SHEETS — THE MAGIC ═════════════════════════════════════════════
function SheetsPanel() {
  return (
    <MenuWindow title="★ THE MAGIC · GOOGLE SHEETS SHADOW MIRROR">
      <div
        style={{
          padding: "12px 14px",
          border: "1px solid var(--accent-gold)",
          background: "rgba(212,168,67,0.06)",
          fontFamily: "var(--font-sans)",
          fontSize: 12,
          color: "var(--text-secondary)",
          lineHeight: 1.7,
          marginBottom: 14,
        }}
      >
        <strong style={{ color: "var(--accent-gold)" }}>ROM = Next.js · Battery save = Postgres · Memory card = Google Sheets.</strong>
        {" "}เกมเก็บ truth ไว้ใน Postgres แต่ทุก state-change ยิง mirror ไป Sheets แบบ
        fire-and-forget. ผลคือ ทีม HR เปิด Sheets เห็นทุกอย่าง — แก้ได้ ใส่สูตรได้
        ทำ pivot ได้ — เหมือนถือ memory card ของระบบไว้ในมือ.
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 14 }}>
        <div style={{ border: "1px solid var(--border-subtle)", padding: "10px 12px" }}>
          <div style={{ fontFamily: "var(--font-pixel)", fontSize: 7, letterSpacing: "0.16em", color: "var(--text-muted)", marginBottom: 4 }}>
            SHEET ID
          </div>
          <div style={{ fontFamily: "var(--font-mono)", fontSize: 11, color: "var(--accent-gold)" }}>{SHEET_ID_SHORT}</div>
        </div>
        <div style={{ border: "1px solid var(--border-subtle)", padding: "10px 12px" }}>
          <div style={{ fontFamily: "var(--font-pixel)", fontSize: 7, letterSpacing: "0.16em", color: "var(--text-muted)", marginBottom: 4 }}>
            TABS
          </div>
          <div style={{ fontFamily: "var(--font-mono)", fontSize: 11, color: "var(--accent-gold)" }}>{SHEET_TABS.length} ACTIVE</div>
        </div>
      </div>

      <div style={{ marginBottom: 14 }}>
        <div
          style={{
            fontFamily: "var(--font-pixel)",
            fontSize: 7,
            letterSpacing: "0.16em",
            color: "var(--text-muted)",
            marginBottom: 8,
          }}
        >
          THE 20 TABS
        </div>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 4 }}>
          {SHEET_TABS.map((t) => (
            <span
              key={t}
              style={{
                padding: "3px 7px",
                border: "1px solid var(--border-subtle)",
                fontFamily: "var(--font-mono)",
                fontSize: 9,
                color: "var(--text-secondary)",
                background: "rgba(0,0,0,0.2)",
              }}
            >
              {t}
            </span>
          ))}
        </div>
      </div>

      <a
        href={SHEET_URL}
        target="_blank"
        rel="noopener noreferrer"
        style={{
          display: "inline-flex",
          alignItems: "center",
          gap: 8,
          padding: "10px 18px",
          border: "2px solid var(--accent-green)",
          color: "var(--accent-green)",
          fontFamily: "var(--font-pixel)",
          fontSize: 8,
          letterSpacing: "0.18em",
          textDecoration: "none",
          transition: "background 100ms ease-out",
        }}
        onMouseEnter={(e) => ((e.currentTarget as HTMLAnchorElement).style.background = "rgba(91,140,74,0.14)")}
        onMouseLeave={(e) => ((e.currentTarget as HTMLAnchorElement).style.background = "transparent")}
      >
        ▶ OPEN THE MAGIC SHEET
      </a>
    </MenuWindow>
  );
}

// ═══ PANEL: VIBES ═══════════════════════════════════════════════════════════
function VibesPanel({ data, error }: { data: LiveData | null; error: boolean }) {
  return (
    <MenuWindow title="LIVE PARTY STATUS · สัญญาณสด">
      {error ? (
        <div style={{ border: "1px solid var(--border-subtle)", padding: 18, textAlign: "center" }}>
          <span style={{ fontFamily: "var(--font-pixel)", fontSize: 8, color: "var(--text-muted)", letterSpacing: "0.14em" }}>
            SYSTEM OFFLINE — LIVE DATA UNAVAILABLE
          </span>
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          <VibeMeter label="HEROES ACTIVE" value={data?.heroCount ?? null} max={400} />
          <VibeMeter label="PROJECTS IN FLIGHT" value={data?.projectCount ?? null} max={15} />
          <VibeMeter label="TEAMS FORMED" value={data?.teamCount ?? null} max={10} />
          <div
            style={{
              padding: "10px 12px",
              border: "1px solid var(--border-subtle)",
              fontFamily: "var(--font-mono)",
              fontSize: 10,
              color: "var(--text-muted)",
              lineHeight: 1.6,
            }}
          >
            ตัวเลขดึงมาจาก Postgres สดทุกครั้งที่เปิดหน้านี้ — สถานะจริง ณ ขณะนี้
          </div>
        </div>
      )}
    </MenuWindow>
  );
}

function VibeMeter({ label, value, max }: { label: string; value: number | null; max: number }) {
  const pct = value == null ? 0 : Math.min(100, (value / max) * 100);
  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
        <span style={{ fontFamily: "var(--font-pixel)", fontSize: 7, letterSpacing: "0.14em", color: "var(--text-muted)" }}>
          {label}
        </span>
        <span style={{ fontFamily: "var(--font-mono)", fontSize: 12, color: value == null ? "var(--text-muted)" : "var(--accent-gold)" }}>
          {value == null ? "—" : value.toLocaleString()}
        </span>
      </div>
      <div className="dq-meter" style={{ height: 8, background: "rgba(255,255,255,0.04)" }}>
        <motion.div
          initial={{ width: 0 }}
          animate={{ width: `${pct}%` }}
          transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
          style={{ height: "100%", background: value == null ? "var(--border-subtle)" : "var(--accent-gold)" }}
        />
      </div>
    </div>
  );
}

// ═══ PANEL: NEXT ════════════════════════════════════════════════════════════
function NextPanel() {
  return (
    <MenuWindow title="QUEST CONTINUES · ขั้นถัดไป">
      <div
        style={{
          fontFamily: "var(--font-sans)",
          fontSize: 12.5,
          color: "var(--text-secondary)",
          lineHeight: 1.7,
          marginBottom: 14,
          padding: "12px 14px",
          border: "1px solid var(--accent-gold)",
          background: "rgba(212,168,67,0.06)",
        }}
      >
        <strong style={{ color: "var(--accent-gold)" }}>The core is the game.</strong>{" "}
        Engine ทำงานสมบูรณ์แล้ว — สร้างจาก 1990s Famicom DQ3 console.
        ขั้นถัดไปคือเปลี่ยน mock data → real data: ผมจะเข้าไปทำงานกับคนจริงที่ TKC,
        feed ข้อมูลให้ Claude Code, แล้วระบบจะดีขึ้นเรื่อย ๆ ทุก installment.
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))", gap: 8 }}>
        {ROADMAP.map((item) => (
          <div
            key={item.version}
            style={{ border: `1px dashed ${item.accent}66`, padding: 12, background: "rgba(0,0,0,0.2)" }}
          >
            <div style={{ display: "flex", alignItems: "baseline", gap: 8, marginBottom: 5 }}>
              <span style={{ fontFamily: "var(--font-pixel)", fontSize: 8, color: item.accent }}>{item.version}</span>
              <span style={{ fontFamily: "var(--font-pixel)", fontSize: 7, letterSpacing: "0.14em", color: "var(--text-muted)" }}>
                {item.codename}
              </span>
            </div>
            <div style={{ fontFamily: "var(--font-sans)", fontSize: 11, color: "var(--text-muted)", lineHeight: 1.6 }}>
              {item.desc}
            </div>
          </div>
        ))}
      </div>
    </MenuWindow>
  );
}
