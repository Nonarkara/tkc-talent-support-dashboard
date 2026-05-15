"use client";

/**
 * RosterTab — the PlayerCard wall.
 *
 * 320 employees, each a PlayerCard with a unique sprite. Filter chips at
 * the top narrow by archetype / dept / role / search. Clicking a card
 * opens a lightweight drawer with a Chronicle timeline (events on this
 * subject). The drawer is the only side-effect here — Chronicle edits
 * happen on the full /check-in/[id] route.
 */

import { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { PlayerCard } from "@/components/PlayerCard";
import { ProfileWizard } from "@/components/ProfileWizard";
import { DQ3HeroSprite } from "@/components/DQ3HeroSprite";
import { MenuWindow } from "@/components/MenuWindow";
import {
  ARCHETYPE_BLURB,
  ARCHETYPE_LABEL,
  getArchetype,
  type Archetype,
} from "@/lib/token-economy";
import { dq3ClassFor, DQ3_CLASSES, weaponLabel, PERSONALITY_STATS } from "@/lib/dq3-roster";
import { renderToCanvas } from "@/lib/dq3-sprite";
import { buildHeroForEmployee } from "@/lib/dq3-roster";
import type { DQ3Class } from "@/lib/dq3-sprite";
import type { DashboardPayload, Employee } from "../_shared/types";

// ─── Virtualisation tuning ────────────────────────────────────────────
// PlayerCard compact variant minHeight is 212; with the dot wrapper add
// a ~6px halo. 220 hits the sweet spot. Min card width drives column
// count from container width.
const CARD_HEIGHT = 220;
const CARD_GAP = 12;
const CARD_MIN_WIDTH = 280;
const ROW_OVERSCAN = 2;

const ALL_ARCHETYPES: Archetype[] = [
  "captain",
  "tech",
  "sales",
  "ops",
  "scout",
];

type AttrKey = "str" | "int" | "wis" | "cha" | "dex" | "con";

const ATTR_CONTROLS: Array<{ key: AttrKey; label: string; field: keyof Employee }> = [
  { key: "str", label: "STR", field: "attr_str" },
  { key: "int", label: "INT", field: "attr_int" },
  { key: "wis", label: "WIS", field: "attr_wis" },
  { key: "cha", label: "CHA", field: "attr_cha" },
  { key: "dex", label: "DEX", field: "attr_dex" },
  { key: "con", label: "CON", field: "attr_con" },
];

type ViewMode = "cards" | "gallery";

function numberOr(value: unknown, fallback: number) {
  const next = Number(value ?? fallback);
  return Number.isFinite(next) ? next : fallback;
}

function attrDraftsForEmployee(emp: Employee): Record<AttrKey, string> {
  return Object.fromEntries(
    ATTR_CONTROLS.map((control) => [
      control.key,
      String(numberOr(emp[control.field], 10)),
    ]),
  ) as Record<AttrKey, string>;
}

export function RosterTab({ dash }: { dash: DashboardPayload }) {
  const [viewMode, setViewMode] = useState<ViewMode>("cards");
  const [search, setSearch] = useState("");
  const [archetypeFilter, setArchetypeFilter] = useState<Archetype | null>(null);
  const [deptFilter, setDeptFilter] = useState<string | null>(null);
  const [classFilter, setClassFilter] = useState<DQ3Class | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [inspectId, setInspectId] = useState<string | null>(null);

  const selected = useMemo(
    () => dash.employees.find((employee) => employee.id === selectedId) ?? null,
    [dash.employees, selectedId],
  );

  const allDepts = useMemo(() => {
    const set = new Set<string>();
    for (const e of dash.employees) if (e.dept_code) set.add(e.dept_code);
    return Array.from(set).sort();
  }, [dash.employees]);

  const visible = useMemo(() => {
    const q = search.trim().toLowerCase();
    return dash.employees.filter((emp) => {
      if (archetypeFilter && getArchetype(emp) !== archetypeFilter) return false;
      if (deptFilter && emp.dept_code !== deptFilter) return false;
      if (classFilter && dq3ClassFor(getArchetype(emp)) !== classFilter) return false;
      if (q) {
        const hay = `${emp.nickname ?? ""} ${emp.full_name_en ?? ""} ${
          emp.full_name_th ?? ""
        } ${emp.dept_code ?? ""}`.toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });
  }, [dash.employees, search, archetypeFilter, deptFilter, classFilter]);

  // ─── Virtualisation state ─────────────────────────────────────────
  const scrollRef = useRef<HTMLDivElement | null>(null);
  const [containerW, setContainerW] = useState(0);
  const [containerH, setContainerH] = useState(0);
  const [scrollTop, setScrollTop] = useState(0);

  useLayoutEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    const measure = () => {
      setContainerW(el.clientWidth);
      setContainerH(el.clientHeight);
    };
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const columns = Math.max(1, Math.floor((containerW + CARD_GAP) / (CARD_MIN_WIDTH + CARD_GAP)));
  const rowCount = Math.ceil(visible.length / columns);
  const rowStride = CARD_HEIGHT + CARD_GAP;
  const totalHeight = rowCount * rowStride;

  const startRow = Math.max(0, Math.floor(scrollTop / rowStride) - ROW_OVERSCAN);
  const endRow = Math.min(rowCount, Math.ceil((scrollTop + containerH) / rowStride) + ROW_OVERSCAN);
  const startIdx = startRow * columns;
  const endIdx = Math.min(visible.length, endRow * columns);
  const offsetY = startRow * rowStride;
  const slice = visible.slice(startIdx, endIdx);

  const inspectedEmp = useMemo(
    () => dash.employees.find((e) => e.id === inspectId) ?? null,
    [dash.employees, inspectId],
  );

  return (
    <div
      className="cc-tab-frame"
      style={{
        gridTemplateRows: "auto 1fr",
        gap: 12,
      }}
    >
      {/* Row 1 — filter strip */}
      <MenuWindow title={`${viewMode === "gallery" ? "Heroes of Alefgard" : "Filters"} · ${visible.length} of ${dash.employees.length}`}>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 10, alignItems: "center" }}>
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search hero, dept…"
            style={{
              background: "var(--ink-4)",
              border: "1px solid var(--rpg-blue-deep)",
              color: "var(--ink-0)",
              fontSize: 12,
              padding: "5px 9px",
              minWidth: 180,
              fontFamily: "inherit",
              outline: "none",
            }}
          />
          {viewMode === "cards" ? (
            <>
              <div style={{ display: "flex", gap: 4, alignItems: "center", flexWrap: "wrap" }}>
                <Label>Class</Label>
                <Chip active={archetypeFilter === null} onClick={() => setArchetypeFilter(null)}>All</Chip>
                {ALL_ARCHETYPES.map((a) => (
                  <Chip
                    key={a}
                    active={archetypeFilter === a}
                    onClick={() => setArchetypeFilter(archetypeFilter === a ? null : a)}
                    title={`${ARCHETYPE_LABEL[a]} — ${ARCHETYPE_BLURB[a]}`}
                  >
                    {ARCHETYPE_LABEL[a]}
                  </Chip>
                ))}
              </div>
              <div style={{ display: "flex", gap: 4, alignItems: "center", flexWrap: "wrap" }}>
                <Label>Dept</Label>
                <Chip active={deptFilter === null} onClick={() => setDeptFilter(null)}>All</Chip>
                {allDepts.map((d) => (
                  <Chip key={d} active={deptFilter === d} onClick={() => setDeptFilter(deptFilter === d ? null : d)}>
                    {d}
                  </Chip>
                ))}
              </div>
            </>
          ) : (
            <div style={{ display: "flex", gap: 4, alignItems: "center", flexWrap: "wrap" }}>
              <Label>DQ3 Class</Label>
              <GalleryChip active={classFilter === null} onClick={() => setClassFilter(null)}>All</GalleryChip>
              {DQ3_CLASSES.map((c) => (
                <GalleryChip
                  key={c}
                  active={classFilter === c}
                  onClick={() => setClassFilter(classFilter === c ? null : c)}
                >
                  {c}
                </GalleryChip>
              ))}
            </div>
          )}
          <div style={{ marginLeft: "auto" }}>
            <Chip
              active={false}
              onClick={() => {
                setViewMode(viewMode === "cards" ? "gallery" : "cards");
                setClassFilter(null);
              }}
            >
              {viewMode === "cards" ? "⚔ Gallery" : "☰ Cards"}
            </Chip>
          </div>
        </div>
      </MenuWindow>

      {/* Row 2 — card wall or gallery */}
      {viewMode === "cards" ? (
        <div
          ref={scrollRef}
          onScroll={(e) => setScrollTop((e.target as HTMLDivElement).scrollTop)}
          className="cc-scroll roster-card-wall"
          aria-label="Hero roster cards"
          style={{
            position: "relative",
            width: "100%",
            height: "100%",
            maxHeight: "calc(100svh - 320px)",
            minHeight: 520,
          }}
        >
          {visible.length === 0 ? (
            <div
              style={{
                color: "var(--ink-1)",
                fontSize: 12,
                padding: "40px 0",
                textAlign: "center",
                letterSpacing: "0.08em",
              }}
            >
              No heroes match the filter.
            </div>
          ) : (
            <div style={{ position: "relative", height: totalHeight, width: "100%" }}>
              <div
                style={{
                  position: "absolute",
                  top: offsetY,
                  left: 0,
                  right: 0,
                  display: "grid",
                  gridTemplateColumns: `repeat(${columns}, minmax(0, 1fr))`,
                  gap: CARD_GAP,
                }}
              >
                {slice.map((emp) => {
                  return (
                    <div key={emp.id} style={{ position: "relative", height: CARD_HEIGHT }}>
                      <PlayerCard
                        employee={emp}
                        variant="compact"
                        onSelect={() => setSelectedId(emp.id)}
                      />
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      ) : (
        <HeroGallery
          employees={visible}
          onInspect={setInspectId}
        />
      )}

      {/* Drawer (card mode) */}
      {selected && <Drawer emp={selected} onClose={() => setSelectedId(null)} onRefresh={dash.refresh} />}

      {/* Inspect modal (gallery mode) */}
      {inspectedEmp && (
        <InspectModal emp={inspectedEmp} onClose={() => setInspectId(null)} />
      )}
    </div>
  );
}

function Label({ children }: { children: React.ReactNode }) {
  return (
    <span
      className="pixel"
      style={{
        fontSize: 8,
        color: "var(--rpg-yellow)",
        letterSpacing: "0.14em",
        textTransform: "uppercase",
        marginRight: 4,
      }}
    >
      {children}
    </span>
  );
}

function Chip({
  active,
  onClick,
  children,
  title,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
  /** Optional hover hint — used to show the vocation glossary on archetype chips. */
  title?: string;
}) {
  return (
    <button
      onClick={onClick}
      title={title}
      style={{
        padding: "3px 10px",
        fontSize: 10,
        fontWeight: active ? 700 : 500,
        letterSpacing: "0.06em",
        background: active ? "var(--rpg-yellow)" : "transparent",
        color: active ? "var(--ink-4)" : "var(--ink-1)",
        border: `1px solid ${active ? "var(--rpg-yellow)" : "var(--ink-2)"}`,
        cursor: title ? "help" : "pointer",
        fontFamily: "inherit",
      }}
    >
      {children}
    </button>
  );
}

// ─── Gallery chip (DQ dark theme) ────────────────────────────────────────

function GalleryChip({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      style={{
        padding: "3px 10px",
        fontSize: 10,
        fontWeight: active ? 700 : 500,
        letterSpacing: "0.06em",
        background: active ? "#f8d878" : "transparent",
        color: active ? "#1a1a1a" : "var(--ink-1)",
        border: `1px solid ${active ? "#f8d878" : "var(--ink-2)"}`,
        cursor: "pointer",
        fontFamily: "inherit",
        textTransform: "uppercase",
      }}
    >
      {children}
    </button>
  );
}

// ─── Heroes of Alefgard gallery ──────────────────────────────────────────

function HeroGallery({
  employees,
  onInspect,
}: {
  employees: Employee[];
  onInspect: (id: string) => void;
}) {
  return (
    <div
      className="cc-scroll"
      style={{
        position: "relative",
        width: "100%",
        height: "100%",
        maxHeight: "calc(100svh - 320px)",
        minHeight: 520,
      }}
    >
      <div
        className="anim-card-appear"
        style={{
          background: "#14142a",
          border: "2px solid var(--ink-0)",
          padding: 14,
          display: "grid",
          gridTemplateColumns: "repeat(auto-fill, minmax(112px, 1fr))",
          gap: 6,
        }}
      >
        {employees.map((emp) => (
          <GalleryCell key={emp.id} emp={emp} onClick={() => onInspect(emp.id)} />
        ))}
      </div>
      {employees.length === 0 && (
        <div
          style={{
            color: "#8a8aa8",
            fontSize: 12,
            padding: "40px 0",
            textAlign: "center",
            letterSpacing: "0.08em",
          }}
        >
          No heroes match the filter.
        </div>
      )}
    </div>
  );
}

function GalleryCell({ emp, onClick }: { emp: Employee; onClick: () => void }) {
  const archetype: Archetype = getArchetype(emp);
  const klass = dq3ClassFor(archetype);
  const hero = useMemo(() => buildHeroForEmployee(emp.id, archetype), [emp.id, archetype]);

  return (
    <div
      onClick={onClick}
      style={{
        position: "relative",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        padding: "8px 4px 6px",
        background: "linear-gradient(180deg, #1a1a36 0%, #14142a 100%)",
        border: "2px solid #2a2a4a",
        cursor: "pointer",
        transition: "border-color 80ms ease, transform 80ms ease",
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.borderColor = "#f8d878";
        e.currentTarget.style.transform = "translateY(-2px)";
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.borderColor = "#2a2a4a";
        e.currentTarget.style.transform = "none";
      }}
    >
      <DQ3HeroSprite
        employeeId={emp.id}
        archetype={archetype}
        size={64}
      />
      <div
        style={{
          fontSize: 8,
          color: "#f8f4e3",
          letterSpacing: "0.5px",
          textAlign: "center",
          lineHeight: 1.3,
          maxWidth: "100%",
          overflow: "hidden",
          textOverflow: "ellipsis",
          whiteSpace: "nowrap",
          width: "100%",
          marginTop: 4,
        }}
      >
        {emp.display_name}
      </div>
      <div style={{ fontSize: 7, color: "#8a8aa8", letterSpacing: "0.5px", marginTop: 1 }}>
        {klass}
      </div>
      {hero.personality && (
        <div
          style={{
            fontSize: 7,
            color: "#f8d878",
            letterSpacing: "0.3px",
            marginTop: 1,
            maxWidth: "100%",
            overflow: "hidden",
            textOverflow: "ellipsis",
            whiteSpace: "nowrap",
            width: "100%",
            textAlign: "center",
          }}
        >
          {hero.personality}
        </div>
      )}
    </div>
  );
}

// ─── Inspect modal (gallery mode) ────────────────────────────────────────
// Exported so SignalsTab (and any future tab) can reuse the same Hero
// Dossier slide-out instead of re-implementing it. Click a row in
// Signals → opens this modal with the same chrome as Roster.

export function InspectModal({ emp, onClose }: { emp: Employee; onClose: () => void }) {
  const archetype: Archetype = getArchetype(emp);
  const hero = useMemo(() => buildHeroForEmployee(emp.id, archetype), [emp.id, archetype]);
  const bigCanvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = bigCanvasRef.current;
    if (!canvas) return;
    renderToCanvas(canvas, hero);
  }, [hero]);

  // ESC closes the dossier — keyboards beat cursors for this kind of
  // peek-then-dismiss pattern. The "Click outside to close" copy alone
  // is invisible to keyboard-only users and unintuitive on touch.
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onClose]);

  const stats = hero.stats ?? PERSONALITY_STATS[hero.personality ?? "Everyman"] ?? { STR: 100, AGL: 100, VIT: 100, INT: 100, LUCK: 100 };
  const weapon = weaponLabel(hero);
  const shieldName = hero.shield ? `${hero.shield.kind.charAt(0).toUpperCase() + hero.shield.kind.slice(1)} Shield` : "—";

  return (
    <div
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-label={`Hero dossier — ${emp.display_name}`}
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(0,0,0,0.85)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        zIndex: 100,
        padding: 24,
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          background: "#14142a",
          border: "4px solid #f8f4e3",
          padding: "24px 28px",
          display: "flex",
          gap: 28,
          alignItems: "flex-start",
          maxWidth: 560,
          position: "relative",
        }}
      >
        {/* Explicit close — discoverability beats charm. The ✕ is the
            universal dismiss affordance; keyboard users have ESC. */}
        <button
          type="button"
          onClick={onClose}
          aria-label="Close dossier"
          title="Close (Esc)"
          style={{
            position: "absolute",
            top: 8,
            right: 8,
            width: 28,
            height: 28,
            background: "transparent",
            border: "1px solid rgba(248,244,227,0.25)",
            color: "#f8f4e3",
            fontSize: 14,
            lineHeight: "26px",
            textAlign: "center",
            cursor: "pointer",
            padding: 0,
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.background = "rgba(248,244,227,0.08)";
            e.currentTarget.style.borderColor = "rgba(248,244,227,0.6)";
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = "transparent";
            e.currentTarget.style.borderColor = "rgba(248,244,227,0.25)";
          }}
        >
          ✕
        </button>
        <canvas
          ref={bigCanvasRef}
          width={16}
          height={16}
          style={{
            width: 192,
            height: 192,
            imageRendering: "pixelated",
            background: "#000",
            border: "2px solid #444",
            flexShrink: 0,
          }}
        />
        <div style={{ color: "#f8f4e3", fontSize: 12, lineHeight: 1.7, minWidth: 180 }}>
          <h2
            style={{
              margin: "0 0 6px",
              color: "#f8d878",
              fontSize: 14,
              letterSpacing: 1,
              fontWeight: 800,
            }}
          >
            {emp.display_name}
          </h2>
          <InspectRow label="Class" value={hero.klass} />
          <InspectRow label="Gender" value={hero.gender === "M" ? "Male" : "Female"} />
          <InspectRow label="Personality" value={hero.personality ?? "—"} />
          <InspectRow label="Armor" value={hero.armorName} />
          <InspectRow label="Weapon" value={weapon} />
          <InspectRow label="Shield" value={shieldName} />
          <div style={{ marginTop: 10, borderTop: "1px solid #2a2a4a", paddingTop: 8 }}>
            <InspectRow label="STR" value={`${stats.STR}%`} />
            <InspectRow label="AGL" value={`${stats.AGL}%`} />
            <InspectRow label="VIT" value={`${stats.VIT}%`} />
            <InspectRow label="INT" value={`${stats.INT}%`} />
            <InspectRow label="LUCK" value={`${stats.LUCK}%`} />
          </div>
          <div style={{ fontSize: 10, color: "#8a8aa8", marginTop: 16 }}>
            Press ESC, click ✕, or click outside to close.
          </div>
        </div>
      </div>
    </div>
  );
}

function InspectRow({ label, value }: { label: string; value: string }) {
  return (
    <div style={{ display: "flex", justifyContent: "space-between", gap: 12 }}>
      <span style={{ color: "#8a8aa8" }}>{label}</span>
      <span>{value}</span>
    </div>
  );
}

// ─── Drawer with Chronicle timeline ───────────────────────────────────────

interface EventRow {
  id: string;
  verb: string;
  payload: Record<string, unknown> | null;
  source: string | null;
  created_at: string;
}

function Drawer({
  emp,
  onClose,
  onRefresh,
}: {
  emp: Employee;
  onClose: () => void;
  onRefresh: () => Promise<void>;
}) {
  const [events, setEvents] = useState<EventRow[] | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [valueBusy, setValueBusy] = useState(false);
  const [valueNotice, setValueNotice] = useState<string | null>(null);
  const [wizardOpen, setWizardOpen] = useState(false);
  const [attrDrafts, setAttrDrafts] = useState<Record<AttrKey, string>>(() =>
    attrDraftsForEmployee(emp),
  );

  // Lazy fetch on mount. The /api/db/events endpoint may not exist yet
  // (it's a future read helper on the Phase 2 events table); the UI
  // fails softly with an empty timeline so the drawer still opens.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch(
          `/api/db/events?subject_id=${encodeURIComponent(emp.id)}`,
        );
        if (cancelled) return;
        if (!res.ok) {
          setEvents([]);
          return;
        }
        const data = await res.json();
        if (cancelled) return;
        setEvents(Array.isArray(data.events) ? data.events : []);
      } catch (e) {
        if (cancelled) return;
        setErr(e instanceof Error ? e.message : "Failed");
        setEvents([]);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [emp.id]);

  useEffect(() => {
    setAttrDrafts(attrDraftsForEmployee(emp));
  }, [emp]);

  async function mutateValues(
    action: "seed" | "lock" | "unlock" | "adjust",
    values?: { attributes?: Partial<Record<AttrKey, number>> },
    reasonDefault?: string,
  ) {
    const defaultReason =
      reasonDefault ??
      (action === "seed"
        ? "Criteria-based stat reroll requested from Hero Dossier"
        : action === "lock"
          ? "Locking stats after review"
          : action === "unlock"
            ? "Unlocking stats for approved adjustment"
            : "Manual stat adjustment after approved review");
    const reason =
      action === "adjust"
        ? defaultReason
        : window.prompt("Reason for audit log", defaultReason);
    if (!reason?.trim()) return;

    setValueBusy(true);
    setValueNotice(null);
    try {
      const response = await fetch("/api/game/values", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          target_type: "employee",
          target_id: emp.id,
          action,
          source: action === "seed" ? "seed" : "manual",
          values,
          reason: reason.trim(),
        }),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data.error ?? `Update failed (${response.status})`);
      setValueNotice(
        data.skipped > 0
          ? "No change: this hero is locked."
          : action === "seed"
            ? "Stats rerolled from criteria and logged."
            : action === "lock"
              ? "Stats locked and logged."
              : action === "unlock"
                ? "Stats unlocked and logged."
                : "Stat adjusted and logged.",
      );
      await onRefresh();
      const res = await fetch(`/api/db/events?subject_id=${encodeURIComponent(emp.id)}`);
      if (res.ok) {
        const next = await res.json();
        setEvents(Array.isArray(next.events) ? next.events : []);
      }
    } catch (error) {
      setValueNotice(error instanceof Error ? error.message : "Value update failed.");
    } finally {
      setValueBusy(false);
    }
  }

  function adjustAttribute(key: AttrKey, current: number, delta: -1 | 1) {
    if (emp.stat_locked || valueBusy) return;
    const next = Math.max(1, Math.min(20, current + delta));
    if (next === current) return;
    setAttrDrafts((currentDrafts) => ({ ...currentDrafts, [key]: String(next) }));
    void mutateValues(
      "adjust",
      { attributes: { [key]: next } },
      `${key.toUpperCase()} ${current} -> ${next} after approved review`,
    );
  }

  function commitAttributeDraft(control: (typeof ATTR_CONTROLS)[number], current: number) {
    if (emp.stat_locked || valueBusy) return;
    const raw = Number(attrDrafts[control.key]);
    if (!Number.isFinite(raw)) {
      setAttrDrafts((currentDrafts) => ({ ...currentDrafts, [control.key]: String(current) }));
      return;
    }
    const next = Math.max(1, Math.min(20, Math.round(raw)));
    setAttrDrafts((currentDrafts) => ({ ...currentDrafts, [control.key]: String(next) }));
    if (next === current) return;
    void mutateValues(
      "adjust",
      { attributes: { [control.key]: next } },
      `${control.key.toUpperCase()} ${current} -> ${next} after approved review`,
    );
  }

  return (
    <div
      onClick={onClose}
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(0,0,0,0.6)",
        display: "flex",
        justifyContent: "flex-end",
        zIndex: 100,
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          width: 440,
          maxWidth: "100vw",
          height: "100%",
          background: "var(--ink-4)",
          borderLeft: "2px solid var(--rpg-yellow)",
          overflowY: "auto",
        }}
      >
        <div style={{ padding: 20 }}>
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              marginBottom: 16,
            }}
          >
            <span
              className="pixel"
              style={{
                fontSize: 10,
                color: "var(--rpg-yellow)",
                letterSpacing: "0.14em",
                textTransform: "uppercase",
              }}
            >
              Hero Dossier
            </span>
            <button
              onClick={onClose}
              style={{
                background: "transparent",
                border: "1px solid var(--ink-2)",
                color: "var(--ink-1)",
                padding: "3px 10px",
                cursor: "pointer",
                fontSize: 11,
                fontFamily: "inherit",
              }}
            >
              Close
            </button>
          </div>

          <PlayerCard employee={emp} variant="full" />

          <div style={{ marginTop: 16, display: "flex", gap: 10, flexWrap: "wrap" }}>
            <a
              href={`/check-in/${emp.id}`}
              style={{
                display: "inline-block",
                padding: "8px 14px",
                background: "var(--rpg-orange)",
                color: "var(--ink-4)",
                fontSize: 11,
                fontWeight: 700,
                letterSpacing: "0.08em",
                textTransform: "uppercase",
                textDecoration: "none",
              }}
            >
              ✎ Scribe the Chronicle
            </a>
            <a
              href={`/tome/${emp.id}`}
              target="_blank"
              rel="noopener"
              style={{
                display: "inline-block",
                padding: "8px 14px",
                background: "transparent",
                color: "var(--rpg-yellow)",
                fontSize: 11,
                fontWeight: 700,
                letterSpacing: "0.08em",
                textTransform: "uppercase",
                textDecoration: "none",
                border: "1px solid var(--rpg-yellow)",
              }}
              title="Open this hero's full institutional record — the print-ready Tome"
            >
              📖 Open the Tome
            </a>
          </div>

          <div style={{ marginTop: 16 }}>
            <MenuWindow title="Stats Control">
              <div style={{ display: "grid", gap: 10 }}>
                <div style={{ display: "flex", justifyContent: "space-between", gap: 10, alignItems: "center" }}>
                  <div>
                    <div style={{ color: emp.stat_locked ? "var(--rpg-orange)" : "var(--flux-up)", fontSize: 11, fontWeight: 700 }}>
                      {emp.stat_locked ? "Locked" : "Unlocked"}
                    </div>
                    <div style={{ color: "var(--ink-1)", fontSize: 10, lineHeight: 1.5 }}>
                      {emp.stat_locked
                        ? emp.stat_lock_reason ?? "Manual changes are blocked until unlocked."
                        : `Source: ${emp.stat_source ?? "neutral seed"}`}
                    </div>
                  </div>
                  <button
                    onClick={() => void mutateValues(emp.stat_locked ? "unlock" : "lock")}
                    disabled={valueBusy}
                    style={miniActionButton(emp.stat_locked ? "var(--flux-up)" : "var(--rpg-orange)", valueBusy)}
                  >
                    {emp.stat_locked ? "Unlock" : "Lock"}
                  </button>
                </div>
                <button
                  onClick={() => setWizardOpen(true)}
                  disabled={valueBusy || Boolean(emp.stat_locked)}
                  style={miniActionButton("var(--rpg-purple)", valueBusy || Boolean(emp.stat_locked))}
                  title="Talk to the Interviewer about this hero. Answer 3 questions; AI proposes the full profile; you approve or adjust."
                >
                  Compose with AI
                </button>
                <button
                  onClick={() => void mutateValues("seed")}
                  disabled={valueBusy || Boolean(emp.stat_locked)}
                  style={miniActionButton("var(--rpg-yellow)", valueBusy || Boolean(emp.stat_locked))}
                  title="Reroll from role, level, tenure, salary band, department, and skills. Every change is logged."
                >
                  Re-roll from criteria
                </button>
                <div style={{ display: "grid", gap: 6 }}>
                  {ATTR_CONTROLS.map((control) => {
                    const current = numberOr(emp[control.field], 10);
                    const disabled = valueBusy || Boolean(emp.stat_locked);
                    return (
                      <div
                        key={control.key}
                        style={{
                          display: "grid",
                          gridTemplateColumns: "44px minmax(58px, 1fr) auto auto",
                          gap: 8,
                          alignItems: "center",
                          border: "1px solid var(--rpg-blue-deep)",
                          background: "rgba(0,0,0,0.12)",
                          padding: "6px 8px",
                        }}
                      >
                        <span className="pixel" style={{ color: "var(--rpg-yellow)", fontSize: 8 }}>
                          {control.label}
                        </span>
                        <input
                          type="number"
                          min={1}
                          max={20}
                          step={1}
                          value={attrDrafts[control.key] ?? String(current)}
                          onChange={(event) =>
                            setAttrDrafts((currentDrafts) => ({
                              ...currentDrafts,
                              [control.key]: event.target.value,
                            }))
                          }
                          onBlur={() => commitAttributeDraft(control, current)}
                          onKeyDown={(event) => {
                            if (event.key === "Enter") {
                              event.currentTarget.blur();
                            }
                          }}
                          disabled={disabled}
                          aria-label={`${control.label} value`}
                          style={{
                            minWidth: 0,
                            width: "100%",
                            border: "1px solid var(--ink-2)",
                            background: disabled ? "var(--ink-3)" : "rgba(0,0,0,0.2)",
                            color: disabled ? "var(--ink-1)" : "var(--ink-0)",
                            fontFamily: "inherit",
                            fontSize: 12,
                            fontWeight: 800,
                            padding: "5px 6px",
                          }}
                        />
                        <button
                          onClick={() => adjustAttribute(control.key, current, -1)}
                          disabled={disabled || current <= 1}
                          title={emp.stat_locked ? "Unlock stats before manual adjustment." : `Decrease ${control.label}`}
                          style={stepButtonStyle(disabled || current <= 1)}
                        >
                          -
                        </button>
                        <button
                          onClick={() => adjustAttribute(control.key, current, 1)}
                          disabled={disabled || current >= 20}
                          title={emp.stat_locked ? "Unlock stats before manual adjustment." : `Increase ${control.label}`}
                          style={stepButtonStyle(disabled || current >= 20)}
                        >
                          +
                        </button>
                      </div>
                    );
                  })}
                </div>
                {valueNotice ? (
                  <div style={{ color: valueNotice.includes("failed") || valueNotice.includes("locked") ? "var(--rpg-orange)" : "var(--flux-up)", fontSize: 10, lineHeight: 1.5 }}>
                    {valueNotice}
                  </div>
                ) : null}
              </div>
            </MenuWindow>
          </div>

          <div style={{ marginTop: 20, display: "grid", gap: 14 }}>
            <MenuWindow title="Availability">
              <div style={{ display: "grid", gap: 10 }}>
                <StatLine label="Current Load" value={`${numberOr(emp.availability_fte, 0).toFixed(1)} FTE`} />
                <StatLine
                  label="Next Free"
                  value={
                    emp.next_available_at
                      ? new Date(emp.next_available_at).toLocaleDateString()
                      : "Open now"
                  }
                />
                <AllocationList emp={emp} />
              </div>
            </MenuWindow>

            <MenuWindow title="Profile Facets">
              <div style={{ display: "grid", gap: 10 }}>
                <TagGroup label="Languages" values={emp.languages ?? []} fallback="Not captured yet" />
                <TagGroup label="Certifications" values={emp.certifications ?? []} fallback="No formal certs recorded" />
                <TagGroup label="Soft Skills" values={emp.soft_skills ?? []} fallback="Workshop notes pending" />
              </div>
            </MenuWindow>

            <MenuWindow title="Capability Ledger">
              {emp.competency_summary && emp.competency_summary.length > 0 ? (
                <div style={{ display: "grid", gap: 8 }}>
                  {emp.competency_summary.slice(0, 10).map((entry) => (
                    <div
                      key={entry.skill_key}
                      style={{
                        border: "1px solid var(--rpg-blue-deep)",
                        background: "rgba(0,0,0,0.14)",
                        padding: "7px 9px",
                        display: "grid",
                        gap: 3,
                      }}
                    >
                      <div style={{ display: "flex", justifyContent: "space-between", gap: 10, alignItems: "center" }}>
                        <span style={{ color: "var(--ink-0)", fontSize: 11, fontWeight: 700 }}>
                          {entry.display_name}
                        </span>
                        <span
                          style={{
                            color:
                              entry.freshness === "fresh"
                                ? "var(--flux-up)"
                                : entry.freshness === "aging"
                                  ? "var(--rpg-yellow)"
                                  : entry.freshness === "stale"
                                    ? "var(--rpg-orange)"
                                    : "var(--ink-1)",
                            fontSize: 9,
                            textTransform: "uppercase",
                            letterSpacing: "0.08em",
                          }}
                        >
                          {entry.freshness}
                        </span>
                      </div>
                      <div style={{ color: "var(--ink-1)", fontSize: 10 }}>
                        Level {entry.actual_level ?? 0} / target {entry.expected_level ?? 3}
                        {entry.source ? ` · ${entry.source}` : ""}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div style={{ color: "var(--ink-1)", fontSize: 11 }}>
                  No capability evidence recorded yet.
                </div>
              )}
            </MenuWindow>
          </div>

          <div style={{ marginTop: 24 }}>
            <MenuWindow title="Chronicle">
              {events === null ? (
                <div style={{ color: "var(--ink-1)", fontSize: 11 }}>
                  Loading timeline…
                </div>
              ) : events.length === 0 ? (
                <div style={{ color: "var(--ink-1)", fontSize: 11 }}>
                  No chronicle entries yet.
                </div>
              ) : (
                <div style={{ display: "grid", gap: 8 }}>
                  {events.slice(0, 40).map((ev) => (
                    <div
                      key={ev.id}
                      style={{
                        padding: "6px 10px",
                        background: "var(--ink-4)",
                        border: "1px solid var(--rpg-blue-deep)",
                        fontSize: 11,
                        color: "var(--ink-0)",
                      }}
                    >
                      <div
                        style={{
                          display: "flex",
                          justifyContent: "space-between",
                          color: "var(--ink-1)",
                          fontSize: 9,
                          letterSpacing: "0.1em",
                          textTransform: "uppercase",
                          marginBottom: 3,
                        }}
                      >
                        <span>{ev.verb}</span>
                        <span>
                          {new Date(ev.created_at).toLocaleDateString()}
                        </span>
                      </div>
                      <div style={{ wordBreak: "break-word" }}>
                        {describeEvent(ev)}
                      </div>
                    </div>
                  ))}
                </div>
              )}
              {err && (
                <div
                  style={{
                    color: "var(--rpg-red)",
                    fontSize: 10,
                    marginTop: 8,
                  }}
                >
                  {err}
                </div>
              )}
            </MenuWindow>
          </div>
        </div>
      </div>

      {wizardOpen && (
        <ProfileWizard
          target={{ type: "employee", id: emp.id, display_name: emp.display_name }}
          onClose={() => setWizardOpen(false)}
          onCommitted={() => {
            void onRefresh();
          }}
        />
      )}
    </div>
  );
}

function miniActionButton(accent: string, disabled = false): React.CSSProperties {
  return {
    background: disabled ? "var(--ink-3)" : accent,
    border: `1px solid ${disabled ? "var(--ink-2)" : accent}`,
    color: disabled ? "var(--ink-1)" : "var(--ink-4)",
    cursor: disabled ? "not-allowed" : "pointer",
    fontFamily: "inherit",
    fontSize: 10,
    fontWeight: 800,
    letterSpacing: "0.08em",
    padding: "7px 10px",
    textTransform: "uppercase",
  };
}

function stepButtonStyle(disabled = false): React.CSSProperties {
  return {
    width: 28,
    height: 28,
    border: `1px solid ${disabled ? "var(--ink-2)" : "var(--rpg-yellow)"}`,
    background: disabled ? "var(--ink-3)" : "rgba(244, 193, 79, 0.14)",
    color: disabled ? "var(--ink-1)" : "var(--rpg-yellow)",
    cursor: disabled ? "not-allowed" : "pointer",
    fontFamily: "inherit",
    fontSize: 14,
    fontWeight: 900,
    lineHeight: 1,
  };
}

function describeEvent(ev: EventRow): string {
  const p = ev.payload ?? {};
  if (ev.verb === "stat_delta") {
    const attr = String((p as Record<string, unknown>).attr ?? "?").toUpperCase();
    const delta = Number((p as Record<string, unknown>).delta ?? 0);
    const from = (p as Record<string, unknown>).from;
    const to = (p as Record<string, unknown>).to;
    const sign = delta > 0 ? "+" : "";
    return `${attr} ${sign}${delta}  (${from} → ${to})`;
  }
  if (ev.verb === "check_in") {
    const preview = String(
      (p as Record<string, unknown>).narrative_preview ?? "",
    );
    return preview.length > 180 ? `${preview.slice(0, 180)}…` : preview;
  }
  return JSON.stringify(p);
}

function StatLine({ label, value }: { label: string; value: string }) {
  return (
    <div style={{ display: "flex", justifyContent: "space-between", gap: 10, fontSize: 11 }}>
      <span style={{ color: "var(--ink-1)" }}>{label}</span>
      <span style={{ color: "var(--ink-0)", fontWeight: 700 }}>{value}</span>
    </div>
  );
}

function TagGroup({
  label,
  values,
  fallback,
}: {
  label: string;
  values: string[];
  fallback: string;
}) {
  return (
    <div style={{ display: "grid", gap: 6 }}>
      <div style={{ color: "var(--ink-1)", fontSize: 9, textTransform: "uppercase", letterSpacing: "0.1em" }}>
        {label}
      </div>
      {values.length > 0 ? (
        <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
          {values.map((value) => (
            <span
              key={value}
              style={{
                border: "1px solid rgba(245,240,232,0.22)",
                color: "var(--ink-0)",
                fontSize: 10,
                padding: "2px 7px",
              }}
            >
              {value}
            </span>
          ))}
        </div>
      ) : (
        <div style={{ color: "var(--ink-1)", fontSize: 11 }}>{fallback}</div>
      )}
    </div>
  );
}

function AllocationList({ emp }: { emp: Employee }) {
  const allocations = emp.active_allocations ?? [];
  if (allocations.length === 0) {
    return <div style={{ color: "var(--flux-up)", fontSize: 11 }}>No active allocations.</div>;
  }
  return (
    <div style={{ display: "grid", gap: 6 }}>
      {allocations.slice(0, 6).map((allocation) => (
        <div
          key={allocation.id}
          style={{
            border: "1px solid var(--border-subtle)",
            background: "rgba(0,0,0,0.12)",
            padding: "7px 9px",
            display: "grid",
            gap: 3,
          }}
        >
          <div style={{ display: "flex", justifyContent: "space-between", gap: 10 }}>
            <span style={{ color: "var(--ink-0)", fontSize: 11, fontWeight: 700 }}>
              {allocation.assignment_label || allocation.project_name || allocation.quest_title || allocation.project_code || allocation.quest_code || "Workshop hold"}
            </span>
            <span style={{ color: "var(--rpg-yellow)", fontSize: 10 }}>{numberOr(allocation.fte, 0).toFixed(1)} FTE</span>
          </div>
          <div style={{ color: "var(--ink-1)", fontSize: 10 }}>
            {allocation.planned_or_actual} · {allocation.project_code || allocation.quest_code || allocation.coe_name || "matrix"}
          </div>
        </div>
      ))}
    </div>
  );
}
