"use client";

/**
 * FormationFilters — Expedia-style chip filters for the hero pool.
 *
 * Sits above the candidate list in the Formation right pane. All filter
 * state is owned by the parent (`FormationCanvas`) so the same filter
 * function can be applied to any grouping of employees in the pool.
 *
 * No role-gating yet — everyone can filter. Persisting last-used filter
 * state is a Phase-2 polish.
 */

import type { Archetype } from "@/lib/token-economy";
import { ARCHETYPES, ARCHETYPE_LABEL } from "@/lib/token-economy";

export type LevelBucket = "junior" | "senior" | "manager" | "director" | "md";

export interface FormationFilterState {
  search: string;
  levels: LevelBucket[];
  classes: Archetype[];
  skills: string[];
  departments: string[];
}

export const EMPTY_FILTERS: FormationFilterState = {
  search: "",
  levels: [],
  classes: [],
  skills: [],
  departments: [],
};

const LEVEL_LABEL: Record<LevelBucket, string> = {
  junior: "Junior",
  senior: "Senior",
  manager: "Manager",
  director: "Director",
  md: "MD",
};

const LEVEL_ORDER: LevelBucket[] = ["junior", "senior", "manager", "director", "md"];

/** Map a numeric level (1..10 in this dataset) to a bucket. */
export function levelBucket(level: number | null | undefined): LevelBucket | null {
  if (level == null) return null;
  if (level <= 3) return "junior";
  if (level <= 6) return "senior";
  if (level <= 8) return "manager";
  if (level === 9) return "director";
  return "md";
}

interface Props {
  filters: FormationFilterState;
  onChange: (next: FormationFilterState) => void;
  availableSkills: string[];
  availableDepartments: string[];
  /** Total matching count, shown beside the filter row for feedback. */
  matchCount: number;
  totalCount: number;
}

export function FormationFilters({
  filters,
  onChange,
  availableSkills,
  availableDepartments,
  matchCount,
  totalCount,
}: Props) {
  function toggle<T>(list: T[], value: T): T[] {
    return list.includes(value) ? list.filter((v) => v !== value) : [...list, value];
  }

  const anyActive =
    filters.search.trim().length > 0 ||
    filters.levels.length > 0 ||
    filters.classes.length > 0 ||
    filters.skills.length > 0 ||
    filters.departments.length > 0;

  return (
    <div
      style={{
        display: "grid",
        gap: 10,
        padding: "10px 12px",
        border: "1px solid var(--ink-2)",
        background: "var(--paper-1)",
        borderRadius: 4,
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
        <input
          type="search"
          value={filters.search}
          onChange={(e) => onChange({ ...filters, search: e.target.value })}
          placeholder="Search name or nickname…"
          style={{
            flex: "1 1 220px",
            minWidth: 180,
            padding: "6px 10px",
            fontSize: 12,
            fontFamily: "inherit",
            border: "1px solid var(--ink-2)",
            background: "var(--paper-0)",
            color: "var(--ink-0)",
          }}
        />
        <span style={{ fontSize: 10, color: "var(--ink-1)", letterSpacing: "0.08em" }}>
          {matchCount}/{totalCount} heroes
        </span>
        {anyActive ? (
          <button
            type="button"
            onClick={() => onChange(EMPTY_FILTERS)}
            style={chipButtonStyle(false, "var(--ink-1)")}
          >
            Clear
          </button>
        ) : null}
      </div>

      <ChipRow label="Level">
        {LEVEL_ORDER.map((lvl) => (
          <ChipButton
            key={lvl}
            active={filters.levels.includes(lvl)}
            onClick={() => onChange({ ...filters, levels: toggle(filters.levels, lvl) })}
          >
            {LEVEL_LABEL[lvl]}
          </ChipButton>
        ))}
      </ChipRow>

      <ChipRow label="Class">
        {ARCHETYPES.map((arch) => (
          <ChipButton
            key={arch}
            active={filters.classes.includes(arch)}
            onClick={() => onChange({ ...filters, classes: toggle(filters.classes, arch) })}
          >
            {ARCHETYPE_LABEL[arch]}
          </ChipButton>
        ))}
      </ChipRow>

      {availableSkills.length > 0 && (
        <ChipRow label="Skill">
          {availableSkills.map((skill) => (
            <ChipButton
              key={skill}
              active={filters.skills.includes(skill)}
              onClick={() => onChange({ ...filters, skills: toggle(filters.skills, skill) })}
            >
              {skill}
            </ChipButton>
          ))}
        </ChipRow>
      )}

      {availableDepartments.length > 0 && (
        <ChipRow label="Dept">
          {availableDepartments.map((dept) => (
            <ChipButton
              key={dept}
              active={filters.departments.includes(dept)}
              onClick={() => onChange({ ...filters, departments: toggle(filters.departments, dept) })}
            >
              {dept}
            </ChipButton>
          ))}
        </ChipRow>
      )}
    </div>
  );
}

function ChipRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
      <span
        className="pixel"
        style={{
          fontSize: 9,
          color: "var(--ink-1)",
          letterSpacing: "0.14em",
          textTransform: "uppercase",
          minWidth: 44,
        }}
      >
        {label}
      </span>
      {children}
    </div>
  );
}

function ChipButton({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button type="button" onClick={onClick} style={chipButtonStyle(active)}>
      {children}
    </button>
  );
}

function chipButtonStyle(active: boolean, color = "var(--rpg-yellow)"): React.CSSProperties {
  return {
    padding: "3px 10px",
    fontSize: 10,
    fontWeight: 700,
    letterSpacing: "0.08em",
    textTransform: "uppercase",
    cursor: "pointer",
    fontFamily: "inherit",
    border: `1px solid ${active ? color : "var(--ink-2)"}`,
    background: active ? color : "transparent",
    color: active ? "var(--ink-4)" : "var(--ink-1)",
    borderRadius: 2,
  };
}

/** Parent helper: apply filter state to an employee list. */
export function applyFormationFilters<
  E extends {
    full_name_en?: string | null;
    full_name_th?: string;
    nickname?: string | null;
    level?: number | null;
    rpg_class?: string | null;
    skills?: string[] | null;
    dept_name_en?: string | null;
    div_code?: string | null;
  },
>(employees: E[], filters: FormationFilterState): E[] {
  const q = filters.search.trim().toLowerCase();
  return employees.filter((emp) => {
    if (q) {
      const hay = [emp.full_name_en, emp.full_name_th, emp.nickname]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();
      if (!hay.includes(q)) return false;
    }
    if (filters.levels.length > 0) {
      const bucket = levelBucket(emp.level ?? null);
      if (!bucket || !filters.levels.includes(bucket)) return false;
    }
    if (filters.classes.length > 0) {
      const cls = (emp.rpg_class ?? "").toLowerCase() as Archetype;
      if (!filters.classes.includes(cls)) return false;
    }
    if (filters.skills.length > 0) {
      const skills = emp.skills ?? [];
      if (!filters.skills.every((s) => skills.includes(s))) return false;
    }
    if (filters.departments.length > 0) {
      const dept = emp.div_code ?? emp.dept_name_en ?? "";
      if (!filters.departments.includes(dept)) return false;
    }
    return true;
  });
}
