"use client";

/**
 * PlayerCard — the command-center hero tile.
 *
 * Built as a Dragon Quest III-era status window: one sprite, one class, HP/MP,
 * six tabletop stats, and enough operational metadata for a boss to decide
 * where this hero belongs.
 */

import type { CSSProperties } from "react";
import { AvailabilityTimeline } from "@/components/AvailabilityTimeline";
import type { Archetype, EmpStatsInput } from "@/lib/token-economy";
import {
  ARCHETYPE_COLOR,
  ARCHETYPE_GLOW,
  ARCHETYPE_LABEL,
  getArchetype,
  getHeroLevel,
  getTokenCost,
} from "@/lib/token-economy";
import { DQ3HeroSprite } from "./DQ3HeroSprite";
import { ClassGlyph } from "./ClassGlyph";

export interface EmployeeLike extends EmpStatsInput {
  id: string;
  display_name: string;
  title?: string | null;
  title_en?: string | null;
  full_name_en?: string | null;
  employee_code?: string | null;
  tenure_years?: number | null;
  skills?: string[] | null;
  languages?: string[] | null;
  certifications?: string[] | null;
  soft_skills?: string[] | null;
  active_allocations?: Array<{
    id: string;
    employee_id: string;
    fte: number;
    assignment_label?: string | null;
    project_name?: string | null;
    project_code?: string | null;
    quest_title?: string | null;
    quest_code?: string | null;
    coe_name?: string | null;
    planned_or_actual: "planned" | "actual";
    status: string;
    start_date?: string | null;
    end_date?: string | null;
  }> | null;
  next_available_at?: string | null;
  evidence_freshness?: "fresh" | "aging" | "stale" | "unknown" | null;
  availability_fte?: number | null;
  // ─── May 2026 dossier ────────────────────────────────────────────────
  gender?: "m" | "f" | null;
  gender_override?: string | null;
  date_of_birth?: string | null;
  education_level?: string | null;
  education_school?: string | null;
  education_major?: string | null;
  is_active?: boolean;
  resign_status?: "presumed_departed" | "confirmed" | "none" | null;
  resign_date?: string | null;
  joined_at?: string | null;
  dept_name_en?: string | null;
}

type Variant = "compact" | "full";

type Props = {
  employee: EmployeeLike;
  variant?: Variant;
  onSelect?: (id: string) => void;
  className?: string;
};

const ROLE_SHORT: Record<string, string> = {
  md: "MD",
  deputy_md: "Dep. MD",
  director: "Director",
  manager: "Manager",
  senior: "Senior",
  staff: "Staff",
};

const STAT_ROWS: Array<{
  key: keyof Pick<
    EmployeeLike,
    "attr_str" | "attr_int" | "attr_wis" | "attr_cha" | "attr_dex" | "attr_con"
  >;
  label: string;
}> = [
  { key: "attr_str", label: "STR" },
  { key: "attr_int", label: "INT" },
  { key: "attr_wis", label: "WIS" },
  { key: "attr_cha", label: "CHA" },
  { key: "attr_dex", label: "DEX" },
  { key: "attr_con", label: "CON" },
];

function levelForRole(role: string): number {
  return 1; // DEPRECATED: Use getHeroLevel from lib/token-economy instead.
}

function attrToPct(attr: number | null | undefined): number {
  if (attr == null || !Number.isFinite(attr)) return 58;
  const pct = 10 + ((attr - 3) / 15) * 80;
  return Math.max(8, Math.min(96, Math.round(pct)));
}

function statValue(value: number | null | undefined) {
  return value == null ? "??" : String(value).padStart(2, "0");
}

function hexToRgba(hex: string, alpha: number): string {
  const h = hex.replace("#", "");
  const r = parseInt(h.substring(0, 2), 16);
  const g = parseInt(h.substring(2, 4), 16);
  const b = parseInt(h.substring(4, 6), 16);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

function freshnessTone(freshness: EmployeeLike["evidence_freshness"]) {
  switch (freshness) {
    case "fresh":
      return "var(--flux-up)";
    case "aging":
      return "var(--rpg-yellow)";
    case "stale":
      return "var(--rpg-orange)";
    case "unknown":
    default:
      return "var(--ink-1)";
  }
}

function freshnessLabel(freshness: EmployeeLike["evidence_freshness"]) {
  switch (freshness) {
    case "fresh":
      return "Fresh";
    case "aging":
      return "Aging";
    case "stale":
      return "Stale";
    case "unknown":
    default:
      return "Unknown";
  }
}

function availabilityLabel(employee: EmployeeLike, availabilityFte: number) {
  if (availabilityFte > 1.05) return "Over";
  if (availabilityFte >= 0.95) return "Full";
  if (availabilityFte >= 0.45) return "Split";
  if ((employee.active_allocations?.length ?? 0) > 0) return "Light";
  return "Open";
}

export function PlayerCard({
  employee,
  variant = "compact",
  onSelect,
  className,
}: Props) {
  const archetype: Archetype = getArchetype(employee);
  const cost = getTokenCost(employee);
  const level = getHeroLevel(employee);
  const tone = ARCHETYPE_COLOR[archetype];
  const glow = ARCHETYPE_GLOW[archetype];
  const roleLabel = ROLE_SHORT[employee.role_level] ?? employee.role_level;
  const dept = (employee.dept_code ?? "NO DEPT").toUpperCase();
  const code = employee.employee_code ?? employee.id.slice(0, 6).toUpperCase();
  const title = employee.title ?? ARCHETYPE_LABEL[archetype];

  // Ghost detection — resigned employees stay visible but greyed with a halo.
  const isGhost =
    employee.is_active === false ||
    employee.resign_status === "presumed_departed" ||
    employee.resign_status === "confirmed";

  // Age from DOB
  const age = employee.date_of_birth
    ? Math.floor(
        (Date.now() - new Date(employee.date_of_birth).getTime()) /
          (1000 * 60 * 60 * 24 * 365.25),
      )
    : null;

  // Narrative one-liner — the "story" line that reads like a sentence.
  // Format: "{Full Name} · {age} · {Title} — {tenure} years at TKC, {education_or_cert_hint}. {Dept}."
  const narrativeParts: string[] = [];
  if (employee.full_name_en) narrativeParts.push(employee.full_name_en);
  else narrativeParts.push(employee.display_name);
  if (age) narrativeParts.push(`${age}`);
  if (employee.title_en) narrativeParts.push(employee.title_en);
  const narrativeHead = narrativeParts.join(" · ");

  const tenureBit = employee.tenure_years && employee.tenure_years > 0
    ? `${employee.tenure_years} year${employee.tenure_years === 1 ? "" : "s"} at TKC`
    : "";
  const eduBit =
    employee.education_level && employee.education_major
      ? `${employee.education_level} in ${employee.education_major}`
      : employee.education_level ?? "";
  const certBit =
    employee.certifications && employee.certifications.length > 0
      ? `holds ${employee.certifications.length} certification${employee.certifications.length === 1 ? "" : "s"}`
      : "";
  const tail = [tenureBit, eduBit, certBit].filter(Boolean).join(" · ");
  const deptBit = employee.dept_name_en ?? employee.dept_code ?? "";
  const ghostBit = isGhost && employee.resign_date
    ? `· Departed ${new Date(employee.resign_date).toLocaleDateString("en-GB", { month: "short", year: "numeric" })}`
    : "";
  
  // ICA Index — the composite "power level" derived purely from the six attributes.
  // Impact    = execution + experience + resilience  (STR×3 + WIS×2 + CON×1) / 6
  // Collab    = influence + adaptability + resilience (CHA×3 + DEX×2 + CON×1) / 6
  // Advance   = analysis + adaptability + experience  (INT×3 + DEX×2 + WIS×1) / 6
  // Overall   = impact×0.4 + collab×0.3 + advance×0.3
  // Scale: attrs are 1–20, output is 0–100.
  const _str = employee.attr_str ?? 10;
  const _int = employee.attr_int ?? 10;
  const _wis = employee.attr_wis ?? 10;
  const _cha = employee.attr_cha ?? 10;
  const _dex = employee.attr_dex ?? 10;
  const _con = employee.attr_con ?? 10;
  const icaImpact       = Math.round((_str * 3 + _wis * 2 + _con * 1) / 6 * (100 / 20));
  const icaCollab       = Math.round((_cha * 3 + _dex * 2 + _con * 1) / 6 * (100 / 20));
  const icaAdvance      = Math.round((_int * 3 + _dex * 2 + _wis * 1) / 6 * (100 / 20));
  const icaOverall      = Math.round(icaImpact * 0.4 + icaCollab * 0.3 + icaAdvance * 0.3);

  // XP & Leveling Logic (v3.5+)
  const totalXp = employee.xp ?? 0;
  const levelBonus = Math.floor(Math.sqrt(totalXp / 100));
  const xpForCurrentBonus = Math.pow(levelBonus, 2) * 100;
  const xpForNextBonus = Math.pow(levelBonus + 1, 2) * 100;
  const xpProgress = levelBonus === 0 
    ? (totalXp / 100) * 100 
    : ((totalXp - xpForCurrentBonus) / (xpForNextBonus - xpForCurrentBonus)) * 100;

  const nextXp = xpForNextBonus;
  const skills = Array.isArray(employee.skills) ? employee.skills.slice(0, 3) : [];
  const availabilityFte =
    Number(employee.availability_fte ??
    (employee.active_allocations ?? []).reduce((sum, allocation) => sum + Number(allocation.fte ?? 0), 0));
  const freshness = employee.evidence_freshness ?? "unknown";
  const loadLabel = availabilityLabel(employee, availabilityFte);
  const nextFree =
    employee.next_available_at != null
      ? new Date(employee.next_available_at).toLocaleDateString(undefined, {
          month: "short",
          day: "numeric",
        })
      : "Now";
  const facetTags = [
    ...(employee.languages ?? []).slice(0, 2),
    ...(employee.certifications ?? []).slice(0, 1),
    ...(employee.soft_skills ?? []).slice(0, variant === "full" ? 2 : 1),
  ];

  const rootStyle: CSSProperties = {
    position: "relative",
    display: "grid",
    gridTemplateColumns: variant === "full" ? "88px minmax(0, 1fr)" : "72px minmax(0, 1fr)",
    gap: 12,
    padding: variant === "full" ? "16px" : "13px",
    minHeight: variant === "full" ? 338 : 212,
    color: "var(--ink-0)",
    background: isGhost
      ? `
        radial-gradient(circle at 100% 0%, rgba(243,182,31,0.08) 0%, transparent 46%),
        linear-gradient(180deg, #2a2730 0%, #1c1a22 100%)
      `
      : `
        radial-gradient(circle at 100% 0%, ${hexToRgba(glow, 0.22)} 0%, transparent 46%),
        linear-gradient(180deg, var(--rpg-blue) 0%, var(--rpg-blue-deep) 100%)
      `,
    border: isGhost ? "2px solid rgba(243,182,31,0.4)" : "2px solid var(--ink-0)",
    boxShadow: isGhost
      ? "inset 0 0 0 1px rgba(243,182,31,0.18)"
      : "inset -4px -4px 0 rgba(0,0,0,0.22), inset 4px 4px 0 rgba(255,255,255,0.08)",
    filter: isGhost ? "saturate(0.55)" : undefined,
    cursor: onSelect ? "pointer" : "default",
    fontFamily: 'var(--font-mono), "Courier New", monospace',
  };

  const handleClick = () => onSelect?.(employee.id);
  const handleKey = (e: React.KeyboardEvent<HTMLDivElement>) => {
    if (!onSelect) return;
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      onSelect(employee.id);
    }
  };

  return (
    <div
      className={className}
      style={rootStyle}
      onClick={onSelect ? handleClick : undefined}
      onKeyDown={onSelect ? handleKey : undefined}
      role={onSelect ? "button" : undefined}
      tabIndex={onSelect ? 0 : undefined}
      title={`${employee.display_name} / ${ARCHETYPE_LABEL[archetype]} / ${dept}`}
    >
      <div style={{ display: "grid", alignContent: "start", gap: 8 }}>
        <div
          style={{
            display: "grid",
            placeItems: "center",
            minHeight: variant === "full" ? 82 : 70,
            background: "rgba(0,0,0,0.18)",
            border: `1px solid ${hexToRgba(glow, 0.65)}`,
          }}
        >
          <div style={{ position: "relative" }}>
            {/* Halo for ghost rows — drawn above the sprite, in archetype color */}
            {isGhost && (
              <svg
                aria-hidden
                style={{
                  position: "absolute",
                  left: "50%",
                  top: -6,
                  transform: "translateX(-50%)",
                  width: variant === "full" ? 64 : 54,
                  height: 12,
                  pointerEvents: "none",
                  zIndex: 2,
                }}
                viewBox="0 0 64 12"
              >
                <ellipse cx="32" cy="9" rx="22" ry="2.4" fill="none" stroke="#f3b61f" strokeWidth="1.2" opacity="0.85" />
                <ellipse cx="32" cy="9" rx="18" ry="1.6" fill="none" stroke="#f3b61f" strokeWidth="0.7" opacity="0.55" />
              </svg>
            )}
            <DQ3HeroSprite
              employeeId={employee.id}
              archetype={archetype}
              gender={employee.gender ?? null}
              size={variant === "full" ? 68 : 58}
              ghost={isGhost}
            />
          </div>
        </div>
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "1fr auto",
            alignItems: "center",
            gap: 6,
            color: tone,
            fontSize: 10,
            fontWeight: 800,
            textTransform: "uppercase",
          }}
        >
          <span>{ARCHETYPE_LABEL[archetype]}</span>
          <ClassGlyph archetype={archetype} size={16} />
        </div>
        <div
          style={{
            display: "grid",
            gap: 3,
            color: "var(--ink-1)",
            fontSize: 10,
            lineHeight: 1.25,
          }}
        >
          <span>NO. {code}</span>
          <span>{roleLabel}</span>
          <span>{dept}</span>
        </div>
      </div>

      <div style={{ minWidth: 0, display: "grid", gap: 9 }}>
        <div style={{ minWidth: 0 }}>
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              gap: 10,
              alignItems: "baseline",
              minWidth: 0,
            }}
          >
            <div
              style={{
                color: "var(--ink-0)",
                fontSize: variant === "full" ? 18 : 15,
                fontWeight: 800,
                lineHeight: 1.05,
                overflow: "hidden",
                textOverflow: "ellipsis",
                whiteSpace: "nowrap",
              }}
            >
              {employee.display_name}
            </div>
            <div
              className="pixel"
              style={{
                background: "rgba(0,0,0,0.3)",
                padding: "2px 6px",
                border: "1px solid var(--rpg-yellow)",
                color: "var(--rpg-yellow)",
                fontSize: 10,
                fontWeight: 800,
                flexShrink: 0,
                boxShadow: "1px 1px 0 #000"
              }}
            >
              LV {level}
            </div>
          </div>
          
          {/* XP Bar (v3.6) */}
          <div style={{ 
            height: 3, 
            width: "100%", 
            background: "rgba(0,0,0,0.4)", 
            marginTop: 4,
            border: "1px solid rgba(255,255,255,0.05)"
          }}>
            <div style={{ 
              height: "100%", 
              width: `${Math.min(100, xpProgress)}%`, 
              background: "var(--flux-up)",
              transition: "width 0.8s ease-out"
            }} />
          </div>

          <div
            style={{
              marginTop: 4,
              color: "var(--ink-1)",
              fontSize: 11,
              overflow: "hidden",
              textOverflow: "ellipsis",
              whiteSpace: "nowrap",
            }}
          >
            {title}
          </div>

          {/* Narrative line — the "story" sentence about this person.
              Reads like a real description, not a list of stats. */}
          {(tail || isGhost) && (
            <div
              style={{
                marginTop: 6,
                color: isGhost ? "var(--rpg-orange, #FB923C)" : "var(--ink-1)",
                fontSize: 10,
                lineHeight: 1.5,
                fontStyle: "italic",
                opacity: 0.92,
                paddingTop: 4,
                borderTop: "1px solid rgba(245,240,232,0.06)",
              }}
            >
              {tail}
              {deptBit && (tail ? " · " : "")}
              {deptBit && <span style={{ color: tone, fontStyle: "normal", fontWeight: 600 }}>{deptBit}</span>}
              {ghostBit && (
                <span style={{ marginLeft: 6, color: "var(--rpg-orange)", fontStyle: "normal", fontWeight: 700 }}>
                  {ghostBit}
                </span>
              )}
            </div>
          )}
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
          <StatBar label="HP" pct={attrToPct(employee.attr_con)} value={employee.attr_con} colour="var(--flux-up)" />
          <StatBar label="MP" pct={attrToPct(employee.attr_int)} value={employee.attr_int} colour="var(--rpg-yellow)" />
        </div>

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(3, minmax(0, 1fr))",
            border: "1px solid rgba(245,240,232,0.28)",
            background: "rgba(0,0,0,0.12)",
          }}
        >
          {STAT_ROWS.map((stat) => (
            <div
              key={stat.key}
              style={{
                display: "grid",
                gridTemplateColumns: "1fr auto",
                gap: 4,
                padding: "5px 6px",
                borderRight: "1px solid rgba(245,240,232,0.18)",
                borderBottom: "1px solid rgba(245,240,232,0.18)",
                color: "var(--ink-0)",
                fontSize: 10,
              }}
            >
              <span style={{ color: "var(--ink-1)" }}>{stat.label}</span>
              <strong style={{ color: tone }}>{statValue(employee[stat.key])}</strong>
            </div>
          ))}
        </div>

        {/* ICA Index — the composite power level that reacts to every stat change.
            Three components + overall score. This is the number that matters for
            team building: Impact (delivery), Collaboration (chemistry), Advancement (growth). */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 8,
            padding: "5px 0",
            borderTop: "1px solid rgba(245,240,232,0.08)",
          }}
        >
          <div style={{ display: "flex", flexDirection: "column", gap: 2, flex: 1 }}>
            <IcaBar label="I" value={icaImpact} color="var(--rpg-orange)" />
            <IcaBar label="C" value={icaCollab}  color="var(--rpg-blue)" />
            <IcaBar label="A" value={icaAdvance}  color="var(--rpg-purple)" />
          </div>
          <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", minWidth: 38 }}>
            <span style={{ fontSize: 7, color: "var(--ink-1)", letterSpacing: "0.14em", textTransform: "uppercase" }}>ICA</span>
            <strong style={{ fontSize: 18, fontFamily: "var(--font-mono)", color: tone, lineHeight: 1 }}>
              {icaOverall}
            </strong>
          </div>
        </div>

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(4, minmax(0, 1fr))",
            gap: 6,
            color: "var(--ink-1)",
            fontSize: 10,
          }}
        >
          <MiniReadout label="TP" value={cost} tone="var(--rpg-yellow)" />
          <MiniReadout
            label="LOAD"
            value={`${availabilityFte.toFixed(1)}`}
            tone={availabilityFte > 1.05 ? "var(--rpg-red)" : availabilityFte >= 0.95 ? "var(--rpg-orange)" : "var(--flux-up)"}
          />
          <MiniReadout label="FREE" value={nextFree} tone="var(--ink-0)" />
          <MiniReadout
            label="FRESH"
            value={freshnessLabel(freshness)}
            tone={freshnessTone(freshness)}
          />
          {variant === "full" ? (
            <MiniReadout
              label="YRS"
              value={employee.tenure_years == null ? "--" : employee.tenure_years}
              tone="var(--ink-0)"
            />
          ) : null}
        </div>

        {variant === "full" || skills.length > 0 || facetTags.length > 0 ? (
          <div
            style={{
              display: "flex",
              flexWrap: "wrap",
              gap: 5,
              minHeight: 20,
            }}
          >
            {[...(skills.length > 0 ? skills : ["ready", "steady", loadLabel.toLowerCase()]), ...facetTags].slice(
              0,
              variant === "full" ? 8 : 5,
            ).map((skill) => (
              <span
                key={skill}
                style={{
                  border: "1px solid rgba(245,240,232,0.28)",
                  color: "var(--ink-1)",
                  fontSize: 9,
                  padding: "2px 5px",
                  textTransform: "uppercase",
                }}
              >
                {skill.replaceAll("_", " ")}
              </span>
            ))}
          </div>
        ) : null}

        {variant === "full" ? (
          <div style={{ display: "grid", gap: 6 }}>
            <div
              style={{
                color: "var(--ink-1)",
                fontSize: 9,
                letterSpacing: "0.1em",
                textTransform: "uppercase",
              }}
            >
              Availability Timeline
            </div>
            <AvailabilityTimeline
              allocations={employee.active_allocations ?? []}
              nextAvailableAt={employee.next_available_at}
            />
          </div>
        ) : employee.active_allocations && employee.active_allocations.length > 0 ? (
          <AvailabilityTimeline
            allocations={employee.active_allocations}
            nextAvailableAt={employee.next_available_at}
            compact
          />
        ) : null}
      </div>
    </div>
  );
}

function StatBar({
  label,
  pct,
  value,
  colour,
}: {
  label: string;
  pct: number;
  value: number | null | undefined;
  colour: string;
}) {
  return (
    <div style={{ display: "grid", gap: 4 }}>
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          color: "var(--ink-1)",
          fontSize: 10,
          textTransform: "uppercase",
        }}
      >
        <span>{label}</span>
        <span style={{ color: "var(--ink-0)" }}>{value == null ? "??" : value}</span>
      </div>
      <div
        style={{
          position: "relative",
          height: 5,
          background: "rgba(0,0,0,0.32)",
          border: "1px solid rgba(245,240,232,0.18)",
          overflow: "hidden",
        }}
        aria-label={`${label} ${pct}%`}
      >
        <div
          style={{
            position: "absolute",
            inset: 0,
            width: `${pct}%`,
            background: colour,
          }}
        />
      </div>
    </div>
  );
}

function MiniReadout({
  label,
  value,
  tone,
}: {
  label: string;
  value: string | number;
  tone: string;
}) {
  return (
    <div
      style={{
        border: "1px solid rgba(245,240,232,0.22)",
        padding: "4px 5px",
        background: "rgba(0,0,0,0.12)",
      }}
    >
      <div style={{ color: "var(--ink-1)", fontSize: 9 }}>{label}</div>
      <div style={{ color: tone, fontSize: 13, fontWeight: 800, lineHeight: 1.1 }}>
        {value}
      </div>
    </div>
  );
}

// ICA component bar — compact horizontal bar showing one ICA dimension.
// The bar width is proportional to 0-100. Label is I, C, or A.
function IcaBar({ label, value, color }: { label: string; value: number; color: string }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
      <span style={{ fontSize: 7, color, letterSpacing: "0.12em", minWidth: 8, fontWeight: 700 }}>
        {label}
      </span>
      <div style={{ flex: 1, height: 3, background: "rgba(245,240,232,0.08)", position: "relative" }}>
        <div
          style={{
            position: "absolute",
            left: 0, top: 0, bottom: 0,
            width: `${Math.min(100, value)}%`,
            background: color,
            transition: "width 0.3s ease",
          }}
        />
      </div>
      <span style={{ fontSize: 8, color, fontFamily: "var(--font-mono)", minWidth: 20, textAlign: "right" }}>
        {value}
      </span>
    </div>
  );
}
