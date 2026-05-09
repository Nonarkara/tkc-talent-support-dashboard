"use client";

/**
 * CandidateList — the right-pane roster, filtered by mission required skills.
 *
 * Phase 3.1 (multi-FTE):
 *   • Replaced pickedIds: Set<string> with empStatuses: Map<string, EmpStatus>.
 *   • onAdd now carries an FTE argument (0.3 / 0.5 / 0.7 / 1.0).
 *   • Assignment badges show which other parties a hero is already in.
 *   • FTE picker appears inline when a multi-assigned hero hits "+".
 *   • At-capacity heroes are greyed + disabled.
 *
 * Phase 3 (skills editor):
 *   • "✏ Skills" expand button — opens inline skill toggle + proficiency editor.
 *   • POSTs to /api/ninja/update-skill; calls onSkillsUpdated for live readiness.
 */

import { useMemo, useState } from "react";
import { PixelSprite } from "@/components/PixelSprite";
import type { CapabilityFit } from "@/lib/capability-fit";
import { getVariation, inferGender } from "@/lib/sprite-variation";
import { getArchetype, ARCHETYPE_LABEL, ARCHETYPE_COLOR } from "@/lib/token-economy";
import {
  parseSkills,
  SKILL_COLOR,
  SKILL_LABEL,
  SKILLS,
  type Skill,
} from "@/lib/skills-vocab";
import type { Employee } from "../_shared/types";

const HARD_CAP = 60;

// ── Local type mirrors (avoids circular import with NinjaTab) ─────────────────

type TeamKey = "alpha" | "beta" | "gamma";
type EmpAssignment = { team: TeamKey; tone: string; label: string; fte: number };
export type EmpStatus = {
  assignedHere: boolean;   // already in the currently active party
  atCapacity: boolean;     // hit project-count limit
  maxProjects: number;
  assignments: EmpAssignment[];
};

const FTE_OPTIONS = [0.3, 0.5, 0.7] as const;
type FteOption = (typeof FTE_OPTIONS)[number];

// ── CandidateList ─────────────────────────────────────────────────────────────

export function CandidateList({
  candidates,
  fitByEmployee,
  required,
  empStatuses,
  onAdd,
  onDragStart,
  searchQuery,
  onSearchChange,
  activeTeamName = "squad",
  recruitingEnabled = true,
  onSkillsUpdated,
}: {
  candidates: Employee[];
  fitByEmployee: Map<string, CapabilityFit>;
  required: Skill[];
  empStatuses: Map<string, EmpStatus>;
  onAdd: (emp: Employee, fte: number) => void;
  onDragStart?: (emp: Employee, event: React.DragEvent<HTMLDivElement>) => void;
  searchQuery: string;
  onSearchChange: (q: string) => void;
  activeTeamName?: string;
  recruitingEnabled?: boolean;
  onSkillsUpdated?: (employeeId: string, newSkills: Skill[]) => void;
}) {
  const [capped, setCapped] = useState(true);
  const visible = useMemo(
    () => (capped ? candidates.slice(0, HARD_CAP) : candidates),
    [candidates, capped],
  );
  const truncated = candidates.length > HARD_CAP;

  return (
    <div
      style={{
        border: "1px solid var(--border-subtle)",
        background: "var(--ink-4)",
        display: "grid",
        gridTemplateRows: "auto 1fr",
        minHeight: 0,
      }}
    >
      {/* Search + count header */}
      <div
        style={{
          padding: "10px 12px",
          borderBottom: "1px solid var(--border-subtle)",
          display: "grid",
          gridTemplateColumns: "1fr auto",
          gap: 10,
          alignItems: "center",
        }}
      >
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => onSearchChange(e.target.value)}
          placeholder="Search: name, dept, role, archetype, skill…"
          style={{
            background: "var(--ink-4)",
            border: "1px solid var(--ink-2)",
            color: "var(--ink-0)",
            fontSize: 12,
            padding: "6px 10px",
            fontFamily: "inherit",
            outline: "none",
          }}
        />
        <span
          style={{
            fontSize: 10,
            letterSpacing: "0.1em",
            color: "var(--ink-1)",
            whiteSpace: "nowrap",
          }}
        >
          {candidates.length}{" "}
          {candidates.length === 1 ? "hero" : "heroes"} for {activeTeamName}
        </span>
      </div>

      {/* Rows */}
      <div style={{ overflowY: "auto", padding: "6px 8px" }}>
        {candidates.length === 0 ? (
          <div
            style={{
              color: "var(--ink-1)",
              fontSize: 12,
              padding: "40px 8px",
              textAlign: "center",
              lineHeight: 1.5,
            }}
          >
            No heroes match this mission.
            <br />
            <span style={{ color: "var(--ink-2)", fontSize: 11 }}>
              Configure skill requirements or broaden your search.
            </span>
          </div>
        ) : (
          <div style={{ display: "grid", gap: 4 }}>
            {visible.map((emp) => (
              <CandidateRow
                key={emp.id}
                emp={emp}
                fit={fitByEmployee.get(emp.id)}
                required={required}
                status={empStatuses.get(emp.id)}
                onAdd={(fte) => onAdd(emp, fte)}
                onDragStart={onDragStart ? (event) => onDragStart(emp, event) : undefined}
                addTitle={`Send to ${activeTeamName}`}
                recruitingEnabled={recruitingEnabled}
                onSkillsUpdated={onSkillsUpdated}
              />
            ))}
            {truncated && (
              <button
                type="button"
                onClick={() => setCapped(false)}
                style={{
                  padding: "10px 8px",
                  background: "transparent",
                  border: "1px dashed var(--ink-2)",
                  color: "var(--ink-1)",
                  cursor: "pointer",
                  fontFamily: "inherit",
                  fontSize: 11,
                  letterSpacing: "0.08em",
                  textTransform: "uppercase",
                }}
              >
                + Show {candidates.length - HARD_CAP} more (narrower filter recommended)
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

// ── CandidateRow ──────────────────────────────────────────────────────────────

function CandidateRow({
  emp,
  fit,
  required,
  status,
  onAdd,
  onDragStart,
  addTitle,
  recruitingEnabled,
  onSkillsUpdated,
}: {
  emp: Employee;
  fit?: CapabilityFit;
  required: Skill[];
  status?: EmpStatus;
  onAdd: (fte: number) => void;
  onDragStart?: (event: React.DragEvent<HTMLDivElement>) => void;
  addTitle: string;
  recruitingEnabled: boolean;
  onSkillsUpdated?: (employeeId: string, newSkills: Skill[]) => void;
}) {
  const archetype = getArchetype(emp);
  const empSkills = parseSkills(emp.skills);
  const requiredSet = new Set(required);

  const assignedHere = status?.assignedHere ?? false;
  const atCapacity = status?.atCapacity ?? false;
  const assignments = status?.assignments ?? [];
  const hasAssignmentsElsewhere = assignments.length > 0 && !assignedHere;

  // FTE picker state — appears when hero already assigned elsewhere and user hits "+"
  const [ftePicking, setFtePicking] = useState(false);

  // Skill editor state
  const [expanded, setExpanded] = useState(false);
  const [skillEdits, setSkillEdits] = useState<Record<Skill, { present: boolean; proficiency: number }>>(() =>
    Object.fromEntries(
      SKILLS.map((s) => [s, { present: empSkills.includes(s), proficiency: 3 }]),
    ) as Record<Skill, { present: boolean; proficiency: number }>,
  );
  const [saving, setSaving] = useState(false);
  const [saveMsg, setSaveMsg] = useState<string | null>(null);

  async function handleSaveSkills(e: React.MouseEvent) {
    e.stopPropagation();
    setSaving(true);
    setSaveMsg(null);
    const newSkills = SKILLS.filter((s) => skillEdits[s].present);
    const proficiency = Object.fromEntries(
      SKILLS.filter((s) => skillEdits[s].present).map((s) => [s, skillEdits[s].proficiency]),
    );
    try {
      const res = await fetch("/api/ninja/update-skill", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ employee_id: emp.id, skills: newSkills, proficiency }),
      });
      const json = (await res.json()) as { ok?: boolean; error?: string };
      if (json.ok) {
        setSaveMsg("✓ Saved");
        onSkillsUpdated?.(emp.id, newSkills);
      } else {
        setSaveMsg(json.error ?? "Save failed");
      }
    } catch {
      setSaveMsg("Save failed");
    } finally {
      setSaving(false);
    }
  }

  // Background tint: grey for at-capacity, gold for busy-elsewhere, purple for here, dark for clean
  const bgColor = atCapacity
    ? "rgba(80,80,80,0.18)"
    : assignedHere
      ? "rgba(139,111,181,0.14)"
      : hasAssignmentsElsewhere
        ? "rgba(212,168,67,0.08)"
        : "rgba(0,0,0,0.15)";

  const isDraggable = recruitingEnabled && !assignedHere && !atCapacity && Boolean(onDragStart);

  return (
    <div
      style={{
        border: "1px solid var(--border-subtle)",
        background: bgColor,
        opacity: atCapacity ? 0.55 : 1,
      }}
    >
      {/* Main row */}
      <div
        draggable={isDraggable}
        onDragStart={isDraggable ? onDragStart : undefined}
        style={{
          display: "grid",
          gridTemplateColumns: "32px 1fr auto",
          alignItems: "center",
          gap: 10,
          padding: "6px 10px",
          cursor: isDraggable ? "grab" : "default",
        }}
      >
        <PixelSprite archetype={archetype} gender={inferGender(emp.id, emp.full_name_en ?? emp.full_name_th, emp.nickname, emp.title_en)} size={32} seed={emp.id} />

        {/* Name + meta + assignment badges */}
        <div style={{ display: "grid", gap: 3, minWidth: 0 }}>
          <div
            style={{
              fontSize: 12,
              fontWeight: 600,
              color: atCapacity ? "var(--ink-2)" : "var(--ink-0)",
              whiteSpace: "nowrap",
              overflow: "hidden",
              textOverflow: "ellipsis",
            }}
          >
            {emp.display_name}
          </div>

          <div style={{ display: "flex", flexWrap: "wrap", gap: 4, alignItems: "center", fontSize: 9, letterSpacing: "0.05em" }}>
            <span style={{ color: ARCHETYPE_COLOR[archetype], textTransform: "uppercase", fontWeight: 700 }}>
              {ARCHETYPE_LABEL[archetype]}
            </span>
            <span style={{ color: "var(--ink-1)", textTransform: "uppercase" }}>
              {emp.dept_code ?? "—"}
            </span>
            {fit ? (
              <>
                <span
                  style={{
                    color:
                      fit.score >= 76
                        ? "var(--flux-up)"
                        : fit.score >= 56
                          ? "var(--rpg-yellow)"
                          : "var(--rpg-orange)",
                    textTransform: "uppercase",
                    fontWeight: 800,
                  }}
                >
                  Fit {fit.score}
                </span>
                <span style={{ color: "var(--ink-1)", textTransform: "uppercase" }}>
                  {fit.freshness}
                </span>
                <span style={{ color: "var(--ink-1)", textTransform: "uppercase" }}>
                  {Number(fit.availability_fte).toFixed(1)}FTE
                </span>
              </>
            ) : null}

            {/* Skill chips */}
            {empSkills.map((skill) => {
              const match = requiredSet.has(skill);
              return (
                <span
                  key={skill}
                  style={{
                    fontSize: 9,
                    padding: "1px 6px",
                    color: match ? "var(--ink-4)" : SKILL_COLOR[skill],
                    background: match ? SKILL_COLOR[skill] : "transparent",
                    border: `1px solid ${SKILL_COLOR[skill]}`,
                    opacity: match ? 1 : 0.55,
                    fontWeight: match ? 700 : 500,
                    letterSpacing: "0.05em",
                    textTransform: "uppercase",
                  }}
                >
                  {SKILL_LABEL[skill]}
                </span>
              );
            })}
          </div>

          {fit && (
            <div
              style={{
                color: fit.gap_keys.length > 0 ? "var(--rpg-orange)" : "var(--ink-1)",
                fontSize: 9,
                lineHeight: 1.35,
                minHeight: 12,
              }}
            >
              {fit.reasons[0]}
              {emp.next_available_at ? (
                <span style={{ color: "var(--ink-1)" }}>
                  {" "}
                  · next free {new Date(emp.next_available_at).toLocaleDateString(undefined, { month: "short", day: "numeric" })}
                </span>
              ) : null}
            </div>
          )}

          {/* Assignment badges — show which parties this hero is already in */}
          {assignments.length > 0 && (
            <div style={{ display: "flex", flexWrap: "wrap", gap: 4, marginTop: 1 }}>
              {assignments.map((a) => (
                <span
                  key={a.team}
                  style={{
                    fontSize: 8,
                    fontWeight: 800,
                    padding: "1px 6px",
                    border: `1px solid ${a.tone}`,
                    color: a.tone,
                    textTransform: "uppercase",
                    letterSpacing: "0.07em",
                    background: `${a.tone}18`,
                  }}
                >
                  ● {a.label.replace(" Party", "")} {a.fte < 1 ? `${a.fte}FTE` : ""}
                </span>
              ))}
              {atCapacity && (
                <span style={{ fontSize: 8, color: "var(--ink-2)", letterSpacing: "0.05em", textTransform: "uppercase" }}>
                  · MAX {status?.maxProjects} projects
                </span>
              )}
            </div>
          )}
        </div>

        {/* Action column: buttons or FTE picker */}
        <div style={{ display: "flex", alignItems: "center", gap: 5, flexShrink: 0 }}>
          {/* Edit skills button (always visible unless at capacity) */}
          {!atCapacity && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                setExpanded((v) => !v);
                setSaveMsg(null);
                setFtePicking(false);
              }}
              title="Edit this hero's skills"
              style={{
                width: 28,
                height: 28,
                border: `1.5px solid ${expanded ? "var(--rpg-yellow)" : "var(--ink-2)"}`,
                background: expanded ? "rgba(255,204,0,0.15)" : "transparent",
                color: expanded ? "var(--rpg-yellow)" : "var(--ink-1)",
                fontFamily: "inherit",
                fontSize: 12,
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              ✏
            </button>
          )}

          {/* Add / status button */}
          {assignedHere ? (
            // Already in this party
            <button
              type="button"
              disabled
              title="Already in this party"
              style={{
                width: 28,
                height: 28,
                borderRadius: "50%",
                border: "1.5px solid var(--rpg-purple, #8B6FB5)",
                background: "var(--rpg-purple, #8B6FB5)",
                color: "var(--ink-4)",
                fontFamily: "inherit",
                fontSize: 14,
                fontWeight: 700,
                cursor: "not-allowed",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              ✓
            </button>
          ) : atCapacity ? (
            // Hit project limit
            <div
              title={`${emp.display_name} is at ${status?.maxProjects}-project max`}
              style={{
                padding: "5px 8px",
                border: "1px solid var(--ink-2)",
                color: "var(--ink-2)",
                fontFamily: "inherit",
                fontSize: 9,
                fontWeight: 800,
                textTransform: "uppercase",
                letterSpacing: "0.06em",
                userSelect: "none",
              }}
            >
              MAX
            </div>
          ) : ftePicking ? (
            // FTE picker — inline buttons
            <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
              {FTE_OPTIONS.map((fte) => (
                <button
                  key={fte}
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    onAdd(fte);
                    setFtePicking(false);
                  }}
                  title={`Assign at ${fte} FTE`}
                  style={{
                    padding: "4px 7px",
                    border: "1.5px solid var(--rpg-purple, #8B6FB5)",
                    background: "transparent",
                    color: "var(--rpg-purple, #8B6FB5)",
                    fontFamily: "inherit",
                    fontSize: 10,
                    fontWeight: 800,
                    cursor: "pointer",
                  }}
                >
                  {fte}
                </button>
              ))}
              <button
                type="button"
                onClick={(e) => { e.stopPropagation(); setFtePicking(false); }}
                title="Cancel"
                style={{
                  width: 22,
                  height: 22,
                  border: "1px solid var(--ink-2)",
                  background: "transparent",
                  color: "var(--ink-1)",
                  fontFamily: "inherit",
                  fontSize: 11,
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                ×
              </button>
            </div>
          ) : (
            // Normal "+" button
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                if (!recruitingEnabled) return;
                if (hasAssignmentsElsewhere) {
                  // Hero already busy — ask boss to pick FTE split
                  setFtePicking(true);
                } else {
                  // First assignment — full 1.0 FTE
                  onAdd(1.0);
                }
              }}
              disabled={!recruitingEnabled}
              title={
                !recruitingEnabled
                  ? "Open the mission before recruiting."
                  : hasAssignmentsElsewhere
                    ? "Pick FTE split (hero already on another mission)"
                    : addTitle
              }
              style={{
                width: 28,
                height: 28,
                borderRadius: "50%",
                border: `1.5px solid ${recruitingEnabled ? "var(--rpg-purple, #8B6FB5)" : "var(--ink-2)"}`,
                background: recruitingEnabled ? "var(--rpg-purple, #8B6FB5)" : "var(--ink-3)",
                color: recruitingEnabled ? "var(--ink-4)" : "var(--ink-1)",
                fontFamily: "inherit",
                fontSize: 16,
                fontWeight: 700,
                lineHeight: 1,
                cursor: recruitingEnabled ? "pointer" : "not-allowed",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              {hasAssignmentsElsewhere ? "½" : "+"}
            </button>
          )}
        </div>
      </div>

      {/* Expanded skill editor */}
      {expanded && (
        <div
          style={{
            borderTop: "1px solid var(--border-subtle)",
            padding: "10px 12px",
            display: "grid",
            gap: 10,
          }}
        >
          <div
            style={{
              fontSize: 9,
              fontWeight: 700,
              textTransform: "uppercase",
              letterSpacing: "0.1em",
              color: "var(--ink-1)",
            }}
          >
            Skill Profile — {emp.display_name}
          </div>

          {/* Skill rows: 2 columns */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "5px 16px" }}>
            {SKILLS.map((skill) => {
              const { present, proficiency } = skillEdits[skill];
              return (
                <div
                  key={skill}
                  style={{
                    display: "grid",
                    gridTemplateColumns: "16px auto 1fr auto",
                    alignItems: "center",
                    gap: 6,
                  }}
                >
                  <input
                    type="checkbox"
                    checked={present}
                    onChange={(e) => {
                      setSkillEdits((prev) => ({
                        ...prev,
                        [skill]: { ...prev[skill], present: e.target.checked },
                      }));
                      setSaveMsg(null);
                    }}
                    style={{ accentColor: SKILL_COLOR[skill], cursor: "pointer", margin: 0 }}
                  />
                  <span
                    style={{
                      width: 6,
                      height: 6,
                      borderRadius: "50%",
                      background: present ? SKILL_COLOR[skill] : "var(--ink-2)",
                      display: "inline-block",
                      flexShrink: 0,
                    }}
                  />
                  <span
                    style={{
                      fontSize: 9,
                      color: present ? SKILL_COLOR[skill] : "var(--ink-2)",
                      fontWeight: present ? 700 : 400,
                      textTransform: "uppercase",
                      letterSpacing: "0.04em",
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                      whiteSpace: "nowrap",
                    }}
                  >
                    {SKILL_LABEL[skill]}
                  </span>
                  <select
                    value={proficiency}
                    disabled={!present}
                    onChange={(e) => {
                      setSkillEdits((prev) => ({
                        ...prev,
                        [skill]: { ...prev[skill], proficiency: parseInt(e.target.value, 10) },
                      }));
                      setSaveMsg(null);
                    }}
                    style={{
                      background: "rgba(0,0,0,0.3)",
                      border: `1px solid ${present ? SKILL_COLOR[skill] + "88" : "var(--ink-3)"}`,
                      color: present ? "var(--ink-0)" : "var(--ink-2)",
                      fontFamily: "inherit",
                      fontSize: 9,
                      padding: "1px 3px",
                      cursor: present ? "pointer" : "not-allowed",
                    }}
                  >
                    {[1, 2, 3, 4, 5].map((v) => (
                      <option key={v} value={v}>{v}</option>
                    ))}
                  </select>
                </div>
              );
            })}
          </div>

          {/* Footer: save + cancel + message */}
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <button
              type="button"
              onClick={handleSaveSkills}
              disabled={saving}
              style={{
                border: "none",
                background: saving ? "var(--ink-3)" : "var(--rpg-purple, #8B6FB5)",
                color: saving ? "var(--ink-1)" : "var(--ink-4)",
                cursor: saving ? "not-allowed" : "pointer",
                fontFamily: "inherit",
                fontSize: 10,
                fontWeight: 800,
                padding: "7px 12px",
                textTransform: "uppercase",
              }}
            >
              {saving ? "Saving…" : "Save Skills"}
            </button>
            <button
              type="button"
              onClick={(e) => { e.stopPropagation(); setExpanded(false); }}
              style={{
                background: "transparent",
                border: "1px solid var(--ink-2)",
                color: "var(--ink-1)",
                cursor: "pointer",
                fontFamily: "inherit",
                fontSize: 10,
                padding: "7px 12px",
                textTransform: "uppercase",
              }}
            >
              Cancel
            </button>
            {saveMsg && (
              <span
                style={{
                  fontSize: 10,
                  color: saveMsg.startsWith("✓") ? "var(--flux-up)" : "var(--rpg-orange)",
                  letterSpacing: "0.04em",
                }}
              >
                {saveMsg}
              </span>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
