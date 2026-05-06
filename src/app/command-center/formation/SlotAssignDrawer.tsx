"use client";

/**
 * SlotAssignDrawer — the fatigue fix.
 *
 * Click a slot on a project card → this drawer slides in from the right,
 * anchored to *that* slot's need. Search by name, sort by fit, click a
 * row to assign. No scrolling a 320-card pool. No long drags.
 *
 * The drawer is a pure candidate picker. State for the actual assignment
 * stays in FormationCanvas — the drawer hands an employee id up and
 * closes itself.
 *
 * Drag still works: every row is `draggable` so power users who prefer
 * the drag gesture keep it. Click-to-assign is the default.
 */
import { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { PixelSprite } from "@/components/PixelSprite";
import { capabilityFitForDimension } from "@/lib/capability-fit";
import { inferGender } from "@/lib/sprite-variation";
import {
  ARCHETYPE_COLOR,
  ARCHETYPE_LABEL,
  getArchetype,
  getTokenCost,
  type Archetype,
} from "@/lib/token-economy";
import {
  SLOT_COLOR,
  SLOT_LABEL,
  type SlotDimension,
} from "@/lib/project-slots";
import { type Assignment } from "@/lib/fit-matrix";
import type { DashboardPayload, Employee, Project } from "../_shared/types";

type Lens = "fit" | "dept" | "all";

const CANDIDATE_ROW_HEIGHT = 88;
const CANDIDATE_ROW_GAP = 4;
const CANDIDATE_ROW_OVERSCAN = 5;

interface Props {
  project: Project;
  dimension: SlotDimension;
  employees: Employee[];
  competencyStandards: DashboardPayload["competency_standards"];
  /** All current assignments across every project — lets us hide the busy. */
  allAssignments: Record<string, Assignment[]>;
  onAssign: (employeeId: string) => void;
  onDragStart: (event: React.DragEvent, employee: Employee) => void;
  onClose: () => void;
}

export function SlotAssignDrawer({
  project,
  dimension,
  employees,
  competencyStandards,
  allAssignments,
  onAssign,
  onDragStart,
  onClose,
}: Props) {
  const [query, setQuery] = useState("");
  const [lens, setLens] = useState<Lens>("fit");
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement | null>(null);
  const [listH, setListH] = useState(0);
  const [scrollTop, setScrollTop] = useState(0);

  // Auto-focus + Escape-to-close. Standard drawer ergonomics.
  useEffect(() => {
    inputRef.current?.focus();
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  useLayoutEffect(() => {
    const el = listRef.current;
    if (!el) return;
    const measure = () => setListH(el.clientHeight);
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const assignedIds = useMemo(() => {
    const ids = new Set<string>();
    for (const list of Object.values(allAssignments)) {
      for (const assignment of list) ids.add(assignment.employee_id);
    }
    return ids;
  }, [allAssignments]);

  // Dept codes already represented on this project (used by "Same dept" lens).
  const projectDeptCodes = useMemo(() => {
    const set = new Set<string>();
    if (project.dept_code) set.add(project.dept_code);
    const here = allAssignments[project.code] ?? [];
    for (const assignment of here) {
      const employee = employees.find((candidate) => candidate.id === assignment.employee_id);
      if (employee?.dept_code) set.add(employee.dept_code);
    }
    return set;
  }, [allAssignments, employees, project.code, project.dept_code]);

  const candidates = useMemo(() => {
    const trimmed = query.trim().toLowerCase();

    // Step 1: only unassigned heroes. Same rule the Hero Pool used.
    const pool = employees.filter((employee) => !assignedIds.has(employee.id));

    // Step 2: name / dept substring search (mirrors RosterTab filter).
    const searched = trimmed
      ? pool.filter((employee) => {
          const hay = [
            employee.nickname,
            employee.full_name_en,
            employee.full_name_th,
            employee.dept_code,
            employee.display_name,
          ]
            .filter(Boolean)
            .join(" ")
            .toLowerCase();
          return hay.includes(trimmed);
        })
      : pool;

    // Step 3: lens.
    const decorated = searched.map((employee) => {
      const archetype = getArchetype(employee);
      return {
        employee,
        archetype,
        fit: capabilityFitForDimension(employee, dimension, competencyStandards).score / 100,
      };
    });

    if (lens === "dept") {
      const withinDept = decorated.filter(
        (row) => row.employee.dept_code && projectDeptCodes.has(row.employee.dept_code),
      );
      return withinDept.sort((left, right) => right.fit - left.fit);
    }

    if (lens === "all") {
      return decorated.sort((left, right) =>
        left.employee.display_name.localeCompare(right.employee.display_name),
      );
    }

    // Default: best fit first, tie-breaker by name.
    return decorated.sort((left, right) => {
      if (right.fit !== left.fit) return right.fit - left.fit;
      return left.employee.display_name.localeCompare(right.employee.display_name);
    });
  }, [assignedIds, competencyStandards, dimension, employees, lens, projectDeptCodes, query]);

  const accent = SLOT_COLOR[dimension];
  const slotLabel = SLOT_LABEL[dimension];
  const rowStride = CANDIDATE_ROW_HEIGHT + CANDIDATE_ROW_GAP;
  const rowCount = candidates.length;
  const totalHeight = rowCount * rowStride;
  const clampedScrollTop = Math.min(
    scrollTop,
    Math.max(0, totalHeight - listH),
  );
  const startRow = Math.max(
    0,
    Math.floor(clampedScrollTop / rowStride) - CANDIDATE_ROW_OVERSCAN,
  );
  const endRow = Math.min(
    rowCount,
    Math.ceil((clampedScrollTop + listH) / rowStride) + CANDIDATE_ROW_OVERSCAN,
  );
  const visibleCandidates = candidates.slice(startRow, endRow);

  return (
    <div
      onClick={onClose}
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(0,0,0,0.55)",
        display: "flex",
        justifyContent: "flex-end",
        zIndex: 110,
      }}
    >
      <div
        onClick={(event) => event.stopPropagation()}
        style={{
          width: 460,
          maxWidth: "100vw",
          height: "100%",
          background: "var(--ink-4)",
          borderLeft: `3px solid ${accent}`,
          display: "flex",
          flexDirection: "column",
          fontFamily: "\"Helvetica Neue\", Helvetica, Arial, sans-serif",
        }}
      >
        {/* Header strip in the slot's accent colour. */}
        <div
          style={{
            background: accent,
            color: "var(--ink-4)",
            padding: "12px 16px",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
          }}
        >
          <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
            <span
              style={{
                fontSize: 9,
                letterSpacing: "0.14em",
                textTransform: "uppercase",
                fontWeight: 700,
                opacity: 0.75,
              }}
            >
              Assign →
            </span>
            <span
              style={{
                fontSize: 13,
                fontWeight: 700,
                letterSpacing: "0.02em",
              }}
            >
              {project.code} · {slotLabel}
            </span>
          </div>
          <button
            onClick={onClose}
            style={{
              background: "transparent",
              border: "1.5px solid var(--ink-4)",
              color: "var(--ink-4)",
              padding: "4px 10px",
              cursor: "pointer",
              fontSize: 11,
              fontWeight: 700,
              letterSpacing: "0.1em",
              textTransform: "uppercase",
              fontFamily: "inherit",
            }}
          >
            Close
          </button>
        </div>

        {/* Search + lens controls. */}
        <div style={{ padding: "14px 16px", display: "grid", gap: 10, borderBottom: "1px solid var(--border-subtle)" }}>
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search by name, nickname, or dept…"
            style={{
              background: "var(--ink-4)",
              border: "1px solid var(--ink-2)",
              color: "var(--ink-0)",
              fontSize: 13,
              padding: "8px 12px",
              fontFamily: "inherit",
              outline: "none",
            }}
          />
          <div style={{ display: "flex", gap: 6 }}>
            <LensChip active={lens === "fit"} onClick={() => setLens("fit")} tone={accent}>
              Best fit
            </LensChip>
            <LensChip active={lens === "dept"} onClick={() => setLens("dept")} tone={accent}>
              Same dept
            </LensChip>
            <LensChip active={lens === "all"} onClick={() => setLens("all")} tone={accent}>
              All
            </LensChip>
            <span style={{ marginLeft: "auto", fontSize: 10, color: "var(--ink-1)", alignSelf: "center", letterSpacing: "0.08em" }}>
              {candidates.length} available
            </span>
          </div>
        </div>

        {/* Candidate list. */}
        <div
          ref={listRef}
          onScroll={(event) => setScrollTop((event.target as HTMLDivElement).scrollTop)}
          style={{ flex: 1, overflowY: "auto", padding: "10px 12px" }}
        >
          {candidates.length === 0 ? (
            <div style={{ color: "var(--ink-1)", fontSize: 12, padding: "30px 8px", textAlign: "center" }}>
              No unassigned heroes match.
            </div>
          ) : (
            <div style={{ position: "relative", height: totalHeight }}>
              <div
                style={{
                  position: "absolute",
                  top: startRow * rowStride,
                  left: 0,
                  right: 0,
                  display: "grid",
                  gap: CANDIDATE_ROW_GAP,
                }}
              >
                {visibleCandidates.map(({ employee, archetype, fit }) => (
                  <CandidateRow
                    key={employee.id}
                    employee={employee}
                    archetype={archetype}
                    fit={fit}
                    accent={accent}
                    onAssign={() => onAssign(employee.id)}
                    onDragStart={(event) => onDragStart(event, employee)}
                  />
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function LensChip({
  active,
  onClick,
  tone,
  children,
}: {
  active: boolean;
  onClick: () => void;
  tone: string;
  children: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      style={{
        padding: "4px 10px",
        fontSize: 10,
        fontWeight: 700,
        letterSpacing: "0.08em",
        textTransform: "uppercase",
        background: active ? tone : "transparent",
        color: active ? "var(--ink-4)" : "var(--ink-1)",
        border: `1px solid ${active ? tone : "var(--ink-2)"}`,
        cursor: "pointer",
        fontFamily: "inherit",
      }}
    >
      {children}
    </button>
  );
}

function CandidateRow({
  employee,
  archetype,
  fit,
  accent,
  onAssign,
  onDragStart,
}: {
  employee: Employee;
  archetype: Archetype;
  fit: number;
  accent: string;
  onAssign: () => void;
  onDragStart: (event: React.DragEvent) => void;
}) {
  const pct = Math.round(fit * 100);
  const fitColour =
    fit >= 0.9 ? "var(--flux-up)" : fit >= 0.65 ? "var(--rpg-yellow)" : fit >= 0.45 ? "var(--rpg-orange)" : "var(--rpg-red)";

  return (
    <div
      draggable
      onDragStart={onDragStart}
      onClick={onAssign}
      title={`${employee.display_name} · ${ARCHETYPE_LABEL[archetype]} · ${pct}% fit — click to assign`}
      style={{
        height: CANDIDATE_ROW_HEIGHT,
        boxSizing: "border-box",
        display: "grid",
        gridTemplateColumns: "28px 1fr auto",
        alignItems: "center",
        gap: 10,
        padding: "6px 10px",
        border: "1px solid var(--border-subtle)",
        background: "rgba(0,0,0,0.18)",
        cursor: "pointer",
        transition: "background 100ms ease, border-color 100ms ease",
      }}
      onMouseEnter={(event) => {
        event.currentTarget.style.background = `${accent}22`;
        event.currentTarget.style.borderColor = `${accent}88`;
      }}
      onMouseLeave={(event) => {
        event.currentTarget.style.background = "rgba(0,0,0,0.18)";
        event.currentTarget.style.borderColor = "var(--border-subtle)";
      }}
    >
      <div style={{ display: "flex", alignItems: "center", justifyContent: "center" }}>
        <PixelSprite archetype={archetype} gender={inferGender(employee.id, employee.full_name_en ?? employee.full_name_th, employee.nickname, employee.title_en)} size={24} seed={employee.id} />
      </div>
      <div style={{ minWidth: 0, display: "grid", gap: 2 }}>
        <div
          style={{
            fontSize: 12,
            fontWeight: 600,
            color: "var(--ink-0)",
            whiteSpace: "nowrap",
            overflow: "hidden",
            textOverflow: "ellipsis",
          }}
        >
          {employee.display_name}
        </div>
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 6,
            flexWrap: "wrap",
            fontSize: 9,
            letterSpacing: "0.08em",
            textTransform: "uppercase",
          }}
        >
          <span style={{ color: ARCHETYPE_COLOR[archetype] }}>
            {ARCHETYPE_LABEL[archetype]}
          </span>
          <span style={{ color: "var(--ink-1)" }}>{employee.dept_code ?? "—"}</span>
          <span style={{ color: "var(--ink-1)" }}>⚡{getTokenCost(employee)}</span>
          <span style={{ color: "var(--ink-1)" }}>{Number(employee.availability_fte ?? 0).toFixed(1)}FTE</span>
        </div>
        <div style={{ fontSize: 9, color: "var(--ink-1)", lineHeight: 1.35 }}>
          {employee.next_available_at
            ? `next free ${new Date(employee.next_available_at).toLocaleDateString(undefined, { month: "short", day: "numeric" })}`
            : "available now"}
        </div>
        <div style={{ height: 4, background: "var(--border-subtle)", position: "relative", overflow: "hidden", marginTop: 2 }}>
          <div
            style={{
              position: "absolute",
              inset: 0,
              width: `${pct}%`,
              background: fitColour,
            }}
          />
        </div>
      </div>
      <div
        style={{
          fontSize: 10,
          fontWeight: 700,
          letterSpacing: "0.08em",
          padding: "3px 8px",
          color: fitColour,
          border: `1px solid ${fitColour}`,
          background: "rgba(0,0,0,0.35)",
        }}
      >
        FIT {pct}
      </div>
    </div>
  );
}
