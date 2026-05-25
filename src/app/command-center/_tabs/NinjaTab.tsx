"use client";

/**
 * NinjaTab — three mission parties with fractional FTE allocation.
 *
 * Allocation model (Phase 3.1):
 *   • A warrior can be in up to 2 missions (directors / md / deputy_md: up to 5).
 *   • First assignment: 1.0 FTE (full time on this mission).
 *   • Second+ assignment: boss picks 0.3 / 0.5 / 0.7 FTE via an inline picker.
 *   • Candidate cards show coloured assignment badges for missions already joined.
 *   • At-capacity warriors appear muted/disabled; already-in-this-party warriors
 *     show a checkmark.
 */

import { useEffect, useMemo, useState } from "react";
import { MenuWindow } from "@/components/MenuWindow";
import { PixelSprite } from "@/components/PixelSprite";
import { capabilityFit } from "@/lib/capability-fit";
import { getVariation, inferGender } from "@/lib/sprite-variation";
import {
  ARCHETYPE_COLOR,
  ARCHETYPE_LABEL,
  getArchetype,
} from "@/lib/token-economy";
import {
  SKILL_COLOR,
  SKILL_LABEL,
  SKILLS,
  isSkill,
  parseSkills,
  type Skill,
} from "@/lib/skills-vocab";
import { squadReadiness, type ReadinessReport } from "@/lib/squad-readiness";
import { CURRENT_CYCLE } from "@/lib/cycle";
import type { DashboardPayload, Employee } from "../_shared/types";
import { StandardsWorkshopDrawer } from "../_shared/StandardsWorkshopDrawer";
import { ReadinessStrip } from "../ninja/ReadinessStrip";
import { CandidateList } from "../ninja/CandidateList";
import { MissionConfigPanel } from "../ninja/MissionConfigPanel";

interface Props {
  dash: DashboardPayload;
}

type TeamKey = "zen" | "kodawari" | "ikigai" | "wabisabi" | "bushido";
const TEAM_KEYS: TeamKey[] = ["zen", "kodawari", "ikigai", "wabisabi", "bushido"];

/** One seat in a party — who + what fraction of their time. */
type PartySlot = { empId: string; fte: number };
type PartyAllocations = Record<TeamKey, PartySlot[]>;

/** Computed assignment state for a single employee. */
export type EmpAssignment = { team: TeamKey; tone: string; label: string; fte: number };
export type EmpStatus = {
  assignedHere: boolean;  // already in the currently active party
  atCapacity: boolean;    // hit project-count limit
  maxProjects: number;
  assignments: EmpAssignment[];
};

interface NinjaMission {
  key: TeamKey;
  callSign: string;
  brief: string;
  defaultRequired: Skill[];
  tone: string;
}

const MAX_PARTY = 6;
const FTE_OPTIONS = [0.3, 0.5, 0.7] as const;

const MISSIONS: NinjaMission[] = [
  {
    key: "zen",
    callSign: "Zen Party",
    brief: "City data platform for Thai municipalities: field surveys, civic data, dashboards, and mayor-ready insight.",
    defaultRequired: ["technical", "data_analysis", "survey", "customer_success"],
    tone: "var(--rpg-blue)",
  },
  {
    key: "kodawari",
    callSign: "Kodawari Party",
    brief: "Pursuit of craft excellence — process standards, delivery ops, and relentless improvement of system quality.",
    defaultRequired: ["technical", "delivery_ops", "data_analysis", "finance_paperwork"],
    tone: "var(--rpg-yellow)",
  },
  {
    key: "ikigai",
    callSign: "Ikigai Party",
    brief: "Talent Support System reborn as a living party ledger: check-ins, growth quests, support missions, and skill memory.",
    defaultRequired: ["customer_success", "survey", "data_analysis", "outsourcing_mgmt"],
    tone: "var(--rpg-purple)",
  },
  {
    key: "wabisabi",
    callSign: "Wabisabi Party",
    brief: "Field-first fieldwork squad: surveys, citizen touchpoints, on-ground intelligence, and real-world validation.",
    defaultRequired: ["survey", "customer_success", "procurement", "delivery_ops"],
    tone: "var(--rpg-orange)",
  },
  {
    key: "bushido",
    callSign: "Bushido Party",
    brief: "A fast-response operating room for city incidents, vendor movement, procurement friction, and recovery actions.",
    defaultRequired: ["procurement", "delivery_ops", "outsourcing_mgmt", "finance_paperwork"],
    tone: "var(--rpg-red)",
  },
];

/** Tone map for badges (so CandidateList can colour-code assignment chips). */
const MISSION_TONE: Record<TeamKey, string> = {
  zen: "var(--rpg-blue)",
  kodawari: "var(--rpg-yellow)",
  ikigai: "var(--rpg-purple)",
  wabisabi: "var(--rpg-orange)",
  bushido: "var(--rpg-red)",
};

/** Directors and above can span up to 5 missions; everyone else max 2. */
function getMaxProjects(emp: Employee): number {
  return ["md", "deputy_md", "director"].includes(emp.role_level ?? "") ? 5 : 2;
}

function initSkillNeeds(required: Skill[]): Record<Skill, number> {
  return Object.fromEntries(
    SKILLS.map((s) => [s, required.includes(s) ? 3 : 0]),
  ) as Record<Skill, number>;
}

/** Reconstruct the required-skill list from a quest's persisted role_slots.
 *  Each slot stores `priority_dims` — the first entry is the primary skill,
 *  the rest are the full required set. We collect every valid skill token. */
function skillsFromRoleSlots(roleSlots: unknown): Skill[] {
  if (!Array.isArray(roleSlots)) return [];
  const out = new Set<Skill>();
  for (const slot of roleSlots) {
    if (slot && typeof slot === "object") {
      const dims = (slot as { priority_dims?: string[] }).priority_dims;
      if (Array.isArray(dims)) {
        for (const d of dims) {
          if (isSkill(d)) out.add(d);
        }
      }
    }
  }
  return Array.from(out);
}

const EMPTY_ALLOCATIONS: PartyAllocations = { zen: [], kodawari: [], ikigai: [], wabisabi: [], bushido: [] };

export function NinjaTab({ dash }: Props) {
  const [activeTeam, setActiveTeam] = useState<TeamKey>("zen");
  const [partyAllocations, setPartyAllocations] = useState<PartyAllocations>(EMPTY_ALLOCATIONS);
  const [search, setSearch] = useState("");
  const [workshopOpen, setWorkshopOpen] = useState(false);
  const [savingTeam, setSavingTeam] = useState<TeamKey | null>(null);
  const [messageByTeam, setMessageByTeam] = useState<Record<TeamKey, string | null>>({
    zen: null, kodawari: null, ikigai: null, wabisabi: null, bushido: null,
  });

  // ── Phase 3 state ─────────────────────────────────────────────────────

  const [questIds, setQuestIds] = useState<Record<TeamKey, string | null>>({
    zen: null, kodawari: null, ikigai: null, wabisabi: null, bushido: null,
  });
  const [missionTitles, setMissionTitles] = useState<Record<TeamKey, string>>({
    zen: "Siam City Signal Atlas",
    kodawari: "Hero Loom Talent Engine",
    ikigai: "Ikigai Talent Engine",
    wabisabi: "Field Intelligence Grid",
    bushido: "Civic Shield Response Grid",
  });
  const [savingTitle, setSavingTitle] = useState<TeamKey | null>(null);

  const [skillNeeds, setSkillNeeds] = useState<Record<TeamKey, Record<Skill, number>>>(() => ({
    zen: initSkillNeeds(MISSIONS[0].defaultRequired),
    kodawari: initSkillNeeds(MISSIONS[1].defaultRequired),
    ikigai: initSkillNeeds(MISSIONS[2].defaultRequired),
    wabisabi: initSkillNeeds(MISSIONS[3].defaultRequired),
    bushido: initSkillNeeds(MISSIONS[4].defaultRequired),
  }));
  const [configLocked, setConfigLocked] = useState<Record<TeamKey, boolean>>({
    zen: false, kodawari: false, ikigai: false, wabisabi: false, bushido: false,
  });
  const [empSkillOverrides, setEmpSkillOverrides] = useState<Map<string, Skill[]>>(new Map());
  const [skillFilter, setSkillFilter] = useState<Set<Skill>>(new Set());

  // Reset skill filter when switching teams
  useEffect(() => { setSkillFilter(new Set()); }, [activeTeam]);

  // ── On-mount: load saved squads from the cartridge ─────────────────────
  // DQ3 rule: when you power on, your party is exactly where you saved it.
  // We fetch the quest row (title + role_slots) AND the quest_members rows
  // (who is in which slot) and hydrate React state from the DB truth.

  useEffect(() => {
    void (async () => {
      try {
        const res = await fetch(`/api/db/quests?cycle=${CURRENT_CYCLE}`);
        const data = (await res.json()) as {
          quests?: Array<{
            id: string;
            code: string;
            title: string;
            role_slots: unknown;
          }>;
        };
        const codeMap: Record<string, TeamKey> = {
          NINJA_ZEN: "zen", NINJA_KODAWARI: "kodawari", NINJA_IKIGAI: "ikigai",
          NINJA_WABISABI: "wabisabi", NINJA_BUSHIDO: "bushido",
        };

        const nextQuestIds: Record<TeamKey, string | null> = {
          zen: null, kodawari: null, ikigai: null, wabisabi: null, bushido: null,
        };
        const nextTitles: Record<TeamKey, string> = {
          zen: "Siam City Signal Atlas",
          kodawari: "Hero Loom Talent Engine",
          ikigai: "Ikigai Talent Engine",
          wabisabi: "Field Intelligence Grid",
          bushido: "Civic Shield Response Grid",
        };
        const nextParty: PartyAllocations = { zen: [], kodawari: [], ikigai: [], wabisabi: [], bushido: [] };
        const nextNeeds: Record<TeamKey, Record<Skill, number>> = {
          zen: initSkillNeeds(MISSIONS[0].defaultRequired),
          kodawari: initSkillNeeds(MISSIONS[1].defaultRequired),
          ikigai: initSkillNeeds(MISSIONS[2].defaultRequired),
          wabisabi: initSkillNeeds(MISSIONS[3].defaultRequired),
          bushido: initSkillNeeds(MISSIONS[4].defaultRequired),
        };
        const nextLocked: Record<TeamKey, boolean> = {
          zen: false, kodawari: false, ikigai: false, wabisabi: false, bushido: false,
        };

        for (const q of data.quests ?? []) {
          const key = codeMap[q.code];
          if (!key) continue;

          nextQuestIds[key] = q.id;
          nextTitles[key] = q.title;
          nextLocked[key] = true; // Any DB quest was locked before save

          // Restore skill needs from the quest's role_slots
          const required = skillsFromRoleSlots(q.role_slots);
          if (required.length > 0) {
            nextNeeds[key] = initSkillNeeds(required);
          }

          // Restore party members
          const mRes = await fetch(`/api/db/quest-members?quest_id=${q.id}`);
          const mData = (await mRes.json()) as {
            members?: Array<{ employee_id: string; slot_key: string }>;
          };
          const sorted = (mData.members ?? []).sort((a, b) => {
            const aIdx = parseInt(a.slot_key.replace("ninja_", ""), 10);
            const bIdx = parseInt(b.slot_key.replace("ninja_", ""), 10);
            return aIdx - bIdx;
          });
          nextParty[key] = sorted.map((m) => ({
            empId: m.employee_id,
            fte: 1.0, // FTE lives in allocations; default to full until we fetch it
          }));
        }

        setQuestIds(nextQuestIds);
        setMissionTitles(nextTitles);
        setPartyAllocations(nextParty);
        setSkillNeeds(nextNeeds);
        setConfigLocked(nextLocked);
      } catch { /* silent — cartridge slot empty, start fresh */ }
    })();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Derived values ─────────────────────────────────────────────────────

  const effectiveEmployees = useMemo(
    () =>
      dash.employees.map((emp) =>
        empSkillOverrides.has(emp.id)
          ? { ...emp, skills: empSkillOverrides.get(emp.id) as string[] }
          : emp,
      ),
    [dash.employees, empSkillOverrides],
  );

  const derivedRequired = useMemo(
    () => ({
      zen: SKILLS.filter((s) => (skillNeeds.zen[s] ?? 0) > 0),
      kodawari: SKILLS.filter((s) => (skillNeeds.kodawari[s] ?? 0) > 0),
      ikigai: SKILLS.filter((s) => (skillNeeds.ikigai[s] ?? 0) > 0),
      wabisabi: SKILLS.filter((s) => (skillNeeds.wabisabi[s] ?? 0) > 0),
      bushido: SKILLS.filter((s) => (skillNeeds.bushido[s] ?? 0) > 0),
    }),
    [skillNeeds],
  );

  const employeeById = useMemo(
    () => new Map(effectiveEmployees.map((emp) => [emp.id, emp])),
    [effectiveEmployees],
  );

  /** empId → [{team, fte}] across all parties. */
  const employeeAssignments = useMemo(() => {
    const map = new Map<string, Array<{ team: TeamKey; fte: number }>>();
    for (const team of TEAM_KEYS) {
      for (const slot of partyAllocations[team]) {
        const list = map.get(slot.empId) ?? [];
        list.push({ team, fte: slot.fte });
        map.set(slot.empId, list);
      }
    }
    return map;
  }, [partyAllocations]);

  /** Per-employee display status, keyed by empId. */
  const empStatuses = useMemo(() => {
    const map = new Map<string, EmpStatus>();
    for (const emp of effectiveEmployees) {
      const raw = employeeAssignments.get(emp.id) ?? [];
      const maxProjects = getMaxProjects(emp);
      map.set(emp.id, {
        assignedHere: raw.some((a) => a.team === activeTeam),
        atCapacity: raw.length >= maxProjects,
        maxProjects,
        assignments: raw.map((a) => ({
          team: a.team,
          tone: MISSION_TONE[a.team],
          label: MISSIONS.find((m) => m.key === a.team)?.callSign ?? a.team,
          fte: a.fte,
        })),
      });
    }
    return map;
  }, [effectiveEmployees, employeeAssignments, activeTeam]);

  const membersByTeam = useMemo(
    () =>
      Object.fromEntries(
        TEAM_KEYS.map((team) => [
          team,
          partyAllocations[team]
            .map((slot) => employeeById.get(slot.empId))
            .filter((emp): emp is Employee => Boolean(emp)),
        ]),
      ) as Record<TeamKey, Employee[]>,
    [employeeById, partyAllocations],
  );

  const reportsByTeam = useMemo(
    () =>
      Object.fromEntries(
        TEAM_KEYS.map((team) => [
          team,
          squadReadiness(membersByTeam[team], derivedRequired[team]),
        ]),
      ) as Record<TeamKey, ReadinessReport>,
    [membersByTeam, derivedRequired],
  );

  const missionByKey = useMemo(
    () => new Map(MISSIONS.map((m) => [m.key, m])),
    [],
  );
  const activeMission = missionByKey.get(activeTeam) ?? MISSIONS[0];
  const activeRequired = derivedRequired[activeTeam];
  const candidateFitByEmployee = useMemo(
    () =>
      new Map(
        effectiveEmployees.map((emp) => [
          emp.id,
          capabilityFit(emp, activeRequired, dash.competency_standards),
        ]),
      ),
    [activeRequired, dash.competency_standards, effectiveEmployees],
  );

  const candidates = useMemo(() => {
    const query = search.trim().toLowerCase();
    return effectiveEmployees
      .map((emp) => {
        const status = empStatuses.get(emp.id);
        const skills = parseSkills(emp.skills);
        const fit = candidateFitByEmployee.get(emp.id);
        return { emp, skills, fit, status };
      })
      .filter(({ fit }) => (fit?.matched ?? 0) > 0 || activeRequired.length === 0)
      // AND-filter from toggled skill chips
      .filter(({ skills }) => {
        if (skillFilter.size === 0) return true;
        for (const s of skillFilter) {
          if (!skills.includes(s)) return false;
        }
        return true;
      })
      // Text search — broader haystack so the right-pane search can find by
      // attribute, archetype, role, skill, or department in addition to name.
      // E.g. typing "pilgrim" filters to Pilgrim-archetype heroes; "manager"
      // to managers; "delivery" to anyone with the delivery_ops skill.
      .filter(({ emp, skills }) => {
        if (!query) return true;
        const archetype = getArchetype(emp);
        const skillLabels = skills.map((s) => SKILL_LABEL[s as Skill] ?? s);
        const hay = [
          emp.nickname,
          emp.full_name_en,
          emp.full_name_th,
          emp.display_name,
          emp.dept_code,
          emp.dept_name_en,
          emp.role_level,
          ARCHETYPE_LABEL[archetype],
          ...skillLabels,
          ...skills,
        ]
          .filter(Boolean)
          .join(" ")
          .toLowerCase();
        return hay.includes(query);
      })
      // Sort: unassigned first → partially assigned → already here → at-capacity last
      .sort((a, b) => {
        const aHere = a.status?.assignedHere ? 1 : 0;
        const bHere = b.status?.assignedHere ? 1 : 0;
        const aCap = a.status?.atCapacity ? 1 : 0;
        const bCap = b.status?.atCapacity ? 1 : 0;
        if (aCap !== bCap) return aCap - bCap;
        if (aHere !== bHere) return aHere - bHere;
        const scoreDiff = (b.fit?.score ?? 0) - (a.fit?.score ?? 0);
        if (scoreDiff !== 0) return scoreDiff;
        return (b.fit?.matched ?? 0) - (a.fit?.matched ?? 0);
      })
      .map(({ emp }) => emp);
  }, [activeRequired, candidateFitByEmployee, empStatuses, effectiveEmployees, search, skillFilter]);

  const partyEconomics = useMemo(() => {
    return Object.fromEntries(
      TEAM_KEYS.map((team) => {
        const rows = partyAllocations[team];
        const members = rows
          .map((row) => ({ row, emp: employeeById.get(row.empId) }))
          .filter((entry): entry is { row: PartySlot; emp: Employee } => Boolean(entry.emp));
        const plannedFte = members.reduce((sum, entry) => sum + entry.row.fte, 0);
        const plannedCostThb = members.reduce(
          (sum, entry) => sum + entry.row.fte * Number(entry.emp.salary_thb ?? 0),
          0,
        );
        const overloaded = members.filter(
          (entry) => (entry.emp.availability_fte ?? 0) > 1.05,
        ).length;
        return [
          team,
          {
            plannedFte: Math.round(plannedFte * 100) / 100,
            plannedCostThb: Math.round(plannedCostThb),
            overloaded,
          },
        ];
      }),
    ) as Record<TeamKey, { plannedFte: number; plannedCostThb: number; overloaded: number }>;
  }, [employeeById, partyAllocations]);

  // ── Handlers ───────────────────────────────────────────────────────────

  function setTeamMessage(team: TeamKey, msg: string | null) {
    setMessageByTeam((prev) => ({ ...prev, [team]: msg }));
  }

  function addToTeam(team: TeamKey, emp: Employee, fte: number = 1.0) {
    const mission = missionByKey.get(team);
    if (!mission) return;

    const status = empStatuses.get(emp.id);

    if (!configLocked[team]) {
      setTeamMessage(team, `Open ${mission.callSign} before recruiting.`);
      return;
    }
    if (status?.assignedHere) {
      setTeamMessage(team, `${emp.display_name} is already in ${mission.callSign}.`);
      return;
    }
    if (status?.atCapacity) {
      setTeamMessage(team, `${emp.display_name} is at ${status.maxProjects}-project max.`);
      return;
    }
    if (partyAllocations[team].length >= MAX_PARTY) {
      setTeamMessage(team, `${mission.callSign} is full (${MAX_PARTY} seats).`);
      return;
    }

    setPartyAllocations((prev) => ({
      ...prev,
      [team]: [...prev[team], { empId: emp.id, fte }],
    }));
    const fteLabel = fte < 1.0 ? ` · ${fte} FTE` : "";
    setTeamMessage(team, `${emp.display_name} joined ${mission.callSign}${fteLabel}.`);
  }

  function removeFromTeam(team: TeamKey, empId: string) {
    const emp = employeeById.get(empId);
    const mission = missionByKey.get(team);
    setPartyAllocations((prev) => ({
      ...prev,
      [team]: prev[team].filter((slot) => slot.empId !== empId),
    }));
    setTeamMessage(team, `${emp?.display_name ?? "Hero"} left ${mission?.callSign ?? "party"}.`);
  }

  function handleCandidateDragStart(emp: Employee, event: React.DragEvent<HTMLDivElement>) {
    event.dataTransfer.setData("text/plain", emp.id);
    event.dataTransfer.effectAllowed = "copy";
  }

  function handleDropOnTeam(team: TeamKey, event: React.DragEvent) {
    event.preventDefault();
    const empId = event.dataTransfer.getData("text/plain");
    const emp = employeeById.get(empId);
    if (!emp) return;
    // Drag = 1.0 FTE for first assignment; 0.5 for subsequent (reasonable default)
    const existing = employeeAssignments.get(empId) ?? [];
    const fte = existing.length > 0 ? 0.5 : 1.0;
    addToTeam(team, emp, fte);
  }

  async function handleSaveTitle(team: TeamKey) {
    const questId = questIds[team];
    if (!questId) {
      setTeamMessage(team, "Quest record not found — run migration 016.");
      return;
    }
    setSavingTitle(team);
    try {
      await fetch("/api/db/quests", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: questId, title: missionTitles[team] }),
      });
      setTeamMessage(team, "✓ Mission name saved.");
    } catch {
      setTeamMessage(team, "Failed to save name.");
    } finally {
      setSavingTitle(null);
    }
  }

  function handleSkillNeedChange(team: TeamKey, skill: Skill, value: number) {
    setSkillNeeds((prev) => ({
      ...prev,
      [team]: { ...prev[team], [skill]: value },
    }));
  }

  function handleLockIn(team: TeamKey) {
    setConfigLocked((prev) => ({ ...prev, [team]: true }));
  }

  function handleUnlock(team: TeamKey) {
    setConfigLocked((prev) => ({ ...prev, [team]: false }));
  }

  function handleSkillsUpdated(empId: string, newSkills: Skill[]) {
    setEmpSkillOverrides((prev) => new Map(prev).set(empId, newSkills));
    void dash.refresh();
  }

  function toggleSkillFilter(skill: Skill) {
    setSkillFilter((prev) => {
      const next = new Set(prev);
      if (next.has(skill)) { next.delete(skill); } else { next.add(skill); }
      return next;
    });
  }

  async function handleSaveTeam(team: TeamKey) {
    const mission = missionByKey.get(team);
    if (!mission) return;
    const members = membersByTeam[team];
    const report = reportsByTeam[team];
    if (members.length === 0) {
      setTeamMessage(team, `Place at least one hero in ${mission.callSign}.`);
      return;
    }
    setSavingTeam(team);
    setTeamMessage(team, null);
    try {
      const code = `NINJA_${team.toUpperCase()}`;
      const slots = partyAllocations[team];
      const res = await fetch("/api/ninja/save-squad", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          code,
          title: missionTitles[team],
          dept_code: null,
          cycle: CURRENT_CYCLE,
          notes: `${mission.callSign} | ${mission.brief}`,
          required_skills: derivedRequired[team],
          tray_employee_ids: slots.map((s) => s.empId),
          member_ftes: Object.fromEntries(slots.map((s) => [s.empId, s.fte])),
          readiness_overall: report.overall_pct,
          gaps: report.gaps,
          chemistry: report.chemistry,
          role_slots: Object.entries(skillNeeds[team])
            .filter(([, v]) => v > 0)
            .map(([skill, importance]) => ({ skill, importance })),
        }),
      });
      const json = (await res.json()) as { ok?: boolean; error?: string };
      if (!res.ok || !json.ok) throw new Error(json.error ?? `HTTP ${res.status}`);
      setTeamMessage(team, `Saved ${mission.callSign}: ${missionTitles[team]}.`);
      void dash.refresh();
    } catch (err) {
      setTeamMessage(team, `Save failed: ${err instanceof Error ? err.message : String(err)}`);
    } finally {
      setSavingTeam(null);
    }
  }

  async function handleSaveStandards(nextStandards: typeof dash.competency_standards) {
    const res = await fetch("/api/db/competency-standards", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ standards: nextStandards }),
    });
    const json = (await res.json()) as { ok?: boolean; standards?: typeof dash.competency_standards; error?: string };
    if (!res.ok || !json.ok) {
      throw new Error(json.error ?? `HTTP ${res.status}`);
    }
    dash.updateCompetencyStandards(json.standards ?? nextStandards);
    void dash.refresh();
  }

  return (
    <div
      className="cc-tab-frame"
      style={{
        gridTemplateRows: "auto auto auto 1fr",
        gap: 12,
      }}
    >
      <NinjaTalentStrip />
      <ReadinessStrip
        report={reportsByTeam[activeTeam]}
        memberCount={membersByTeam[activeTeam].length}
      />

      {/* Workshop strip — compressed to a thin row so the two-pane gets the
          budget. Opens the Standards Workshop drawer on click; the economy
          + integration readouts inline as three pills.
          Pre-fix this panel ate ~280px of viewport height and starved the
          single-team-focus layout. */}
      <div style={{ order: 3 }}>
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 12,
          padding: "8px 12px",
          background: "rgba(0,0,0,0.18)",
          border: "1px solid var(--border-subtle)",
          flexWrap: "wrap",
        }}
      >
        <button
          type="button"
          onClick={() => setWorkshopOpen(true)}
          style={{
            border: "none",
            background: "var(--rpg-yellow)",
            color: "var(--ink-4)",
            cursor: "pointer",
            fontFamily: "inherit",
            fontSize: 10,
            fontWeight: 800,
            padding: "7px 11px",
            textTransform: "uppercase",
            letterSpacing: "0.08em",
            whiteSpace: "nowrap",
          }}
        >
          ⚙ Standards Workshop
        </button>
        <span
          style={{
            color: activeMission.tone,
            fontSize: 10,
            fontWeight: 800,
            textTransform: "uppercase",
            letterSpacing: "0.06em",
            whiteSpace: "nowrap",
          }}
        >
          {activeMission.callSign}
        </span>
        <span style={{ color: "var(--ink-1)", fontSize: 11, fontFamily: "var(--font-mono)" }}>
          FTE {partyEconomics[activeTeam].plannedFte.toFixed(1)}
          {" · "}
          ฿{partyEconomics[activeTeam].plannedCostThb.toLocaleString()}
          {" · "}
          <span
            style={{
              color: partyEconomics[activeTeam].overloaded > 0 ? "var(--rpg-red)" : "var(--flux-up)",
            }}
          >
            {partyEconomics[activeTeam].overloaded} overload{partyEconomics[activeTeam].overloaded === 1 ? "" : "s"}
          </span>
        </span>
        <span style={{ display: "flex", gap: 8, marginLeft: "auto", flexWrap: "wrap" }}>
          {dash.integration_status.map((item) => (
            <span
              key={item.key}
              title={item.label + " — " + item.status}
              style={{
                fontSize: 9,
                color:
                  item.status === "connected"
                    ? "var(--flux-up)"
                    : item.status === "ready_for_import"
                      ? "var(--rpg-yellow)"
                      : "var(--ink-1)",
                textTransform: "uppercase",
                letterSpacing: "0.06em",
                fontFamily: "var(--font-mono)",
              }}
            >
              ● {item.label}
            </span>
          ))}
        </span>
      </div>

      </div>

      <div
        className="cc-two-pane"
        style={{
          order: 2,
          display: "grid",
          gridTemplateColumns: "minmax(0, 1.35fr) 390px",
          gap: 16,
          alignItems: "stretch",
          minHeight: 0,
          height: "100%",
          overflow: "hidden",
        }}
      >
        <div className="cc-scroll" style={{ paddingRight: 4 }}>
        <MenuWindow title="Ninja Party">
          <div style={{ display: "grid", gap: 12 }}>
            {/* Team chips — pick ONE squad at a time, the rest collapse.
                Per the human-playtest feedback: showing three party cards
                side-by-side made the page unusable. You only ever recruit
                for one squad at a time, so only one squad gets the
                spotlight; the others sit as quick-switch chips above. */}
            <div
              style={{
                display: "flex",
                gap: 6,
                flexWrap: "wrap",
                paddingBottom: 4,
                borderBottom: "1px solid rgba(245,240,232,0.08)",
              }}
            >
              {MISSIONS.map((m) => {
                const isActive = m.key === activeTeam;
                const memberCount = membersByTeam[m.key].length;
                return (
                  <button
                    key={m.key}
                    type="button"
                    onClick={() => setActiveTeam(m.key)}
                    style={{
                      flex: "0 1 auto",
                      padding: "5px 14px",
                      background: isActive ? "rgba(212,168,67,0.10)" : "transparent",
                      color: isActive ? "#D4A843" : "#8a7a5e",
                      border: `1px solid ${isActive ? "rgba(212,168,67,0.35)" : "rgba(245,240,232,0.10)"}`,
                      cursor: "pointer",
                      fontFamily: "var(--font-mono, monospace)",
                      fontSize: 9,
                      fontWeight: isActive ? 800 : 500,
                      letterSpacing: "0.14em",
                      textTransform: "uppercase",
                      display: "inline-flex", alignItems: "center", gap: 10,
                    }}
                  >
                    <span>{m.callSign}</span>
                    <span style={{ color: isActive ? "rgba(212,168,67,0.6)" : "rgba(245,240,232,0.25)", fontSize: 8, fontFamily: "var(--font-mono)" }}>
                      {memberCount}/{MAX_PARTY}
                    </span>
                  </button>
                );
              })}
            </div>
            {/* Single focused mission card — only the active team is rendered. */}
            {(() => {
              const mission = missionByKey.get(activeTeam);
              if (!mission) return null;
              return (
                <MissionPartyCard
                  key={mission.key}
                  mission={mission}
                  title={missionTitles[mission.key]}
                  active={true}
                  slots={partyAllocations[mission.key]}
                  members={membersByTeam[mission.key]}
                  report={reportsByTeam[mission.key]}
                  saving={savingTeam === mission.key}
                  message={messageByTeam[mission.key]}
                  configLocked={configLocked[mission.key]}
                  configPanel={
                    <MissionConfigPanel
                      tone={mission.tone}
                      callSign={mission.callSign}
                      title={missionTitles[mission.key]}
                      skillNeeds={skillNeeds[mission.key]}
                      savingName={savingTitle === mission.key}
                      onTitleChange={(t) => setMissionTitles((prev) => ({ ...prev, [mission.key]: t }))}
                      onSaveName={() => void handleSaveTitle(mission.key)}
                      onSkillNeedChange={(skill, val) => handleSkillNeedChange(mission.key, skill, val)}
                      onLockIn={() => handleLockIn(mission.key)}
                    />
                  }
                  onSelect={() => setActiveTeam(mission.key)}
                  onDrop={(e) => handleDropOnTeam(mission.key, e)}
                  onAddActive={() => setActiveTeam(mission.key)}
                  onRemove={(empId) => removeFromTeam(mission.key, empId)}
                  onSave={() => void handleSaveTeam(mission.key)}
                  onUnlock={() => handleUnlock(mission.key)}
                />
              );
            })()}
          </div>
        </MenuWindow>
        </div>

        <div className="cc-scroll" style={{ display: "grid", gap: 12, alignContent: "start" }}>
          <MenuWindow title="Candidate Roster">
            <div style={{ display: "grid", gap: 10 }}>
              <div style={{ display: "grid", gap: 8 }}>
                <div style={{ display: "flex", justifyContent: "space-between", gap: 10, alignItems: "center" }}>
                  <div>
                    <div style={{ color: "#D4A843", fontSize: 9, fontWeight: 800, textTransform: "uppercase", letterSpacing: "0.14em", fontFamily: "var(--font-mono)" }}>
                      {activeMission.callSign}
                    </div>
                    <div style={{ color: "#f5f0e8", fontSize: 13, fontWeight: 700, marginTop: 2 }}>
                      {missionTitles[activeTeam]}
                    </div>
                  </div>
                  <div style={{ color: "#8a7a5e", fontSize: 9, fontFamily: "var(--font-mono)", letterSpacing: "0.08em" }}>
                    {configLocked[activeTeam]
                      ? `${MAX_PARTY - partyAllocations[activeTeam].length} OPEN`
                      : "CONFIG FIRST"}
                  </div>
                </div>
                <SkillLine
                  skills={activeRequired}
                  activeFilter={skillFilter}
                  onToggle={toggleSkillFilter}
                />
              </div>

              <CandidateList
                candidates={candidates}
                fitByEmployee={candidateFitByEmployee}
                required={activeRequired}
                empStatuses={empStatuses}
                onAdd={(emp, fte) => addToTeam(activeTeam, emp, fte)}
                onDragStart={configLocked[activeTeam] ? handleCandidateDragStart : undefined}
                searchQuery={search}
                onSearchChange={setSearch}
                activeTeamName={activeMission.callSign}
                recruitingEnabled={configLocked[activeTeam]}
                onSkillsUpdated={handleSkillsUpdated}
              />
            </div>
          </MenuWindow>
        </div>
      </div>

      <StandardsWorkshopDrawer
        open={workshopOpen}
        onClose={() => setWorkshopOpen(false)}
        standards={dash.competency_standards}
        onSave={handleSaveStandards}
      />
    </div>
  );
}

// ── MissionPartyCard ─────────────────────────────────────────────────────────

function MissionPartyCard({
  mission, title, active, slots, members, report, saving, message,
  configLocked, configPanel, onSelect, onDrop, onAddActive, onRemove, onSave, onUnlock,
}: {
  mission: NinjaMission;
  title: string;
  active: boolean;
  slots: PartySlot[];
  members: Employee[];
  report: ReadinessReport;
  saving: boolean;
  message: string | null;
  configLocked: boolean;
  configPanel: React.ReactNode;
  onSelect: () => void;
  onDrop: (e: React.DragEvent<HTMLDivElement>) => void;
  onAddActive: () => void;
  onRemove: (empId: string) => void;
  onSave: () => void;
  onUnlock: () => void;
}) {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const seats = Array.from({ length: MAX_PARTY }, (_, i) => ({
    member: members[i] ?? null,
    fte: slots[i]?.fte ?? 1.0,
  }));
  const canSave = configLocked && members.length > 0 && !saving;

  return (
    <section
      onClick={onSelect}
      onDragOver={(e) => { e.preventDefault(); e.dataTransfer.dropEffect = "copy"; }}
      onDrop={onDrop}
      style={{
        border: "1px solid rgba(245,240,232,0.10)",
        borderLeft: "3px solid #D4A843",
        background: "rgba(15,12,8,0.35)",
        padding: 14,
        display: "grid",
        gap: 14,
      }}
    >
      {configLocked ? (
        <>
          {/* Header — callsign · title · readiness sensor */}
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 12 }}>
            <div style={{ minWidth: 0, flex: 1 }}>
              <div style={{ color: "#D4A843", fontSize: 9, fontWeight: 800, textTransform: "uppercase", letterSpacing: "0.16em", fontFamily: "var(--font-mono)" }}>
                {mission.callSign}
              </div>
              <h3 style={{ margin: "3px 0 0", color: "#f5f0e8", fontSize: 16, fontWeight: 700, lineHeight: 1.1 }}>
                {title}
              </h3>
              <p style={{ margin: "4px 0 0", color: "#8a7a5e", fontSize: 10, lineHeight: 1.5 }}>
                {mission.brief}
              </p>
            </div>
            <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 6, flexShrink: 0 }}>
              <div style={{
                color: report.overall_pct >= 70 ? "#4a8a5a" : report.overall_pct >= 45 ? "#D4A843" : "#C44D3F",
                fontSize: 44, fontWeight: 800, lineHeight: 1,
                fontFamily: "var(--font-mono)",
              }}>
                {report.overall_pct}
              </div>
              <button
                type="button"
                onClick={(e) => { e.stopPropagation(); onUnlock(); }}
                title="Unlock to edit skill requirements"
                style={{
                  border: "1px solid rgba(212,168,67,0.22)",
                  background: "transparent", color: "#8a7a5e",
                  cursor: "pointer", fontFamily: "inherit",
                  fontSize: 9, fontWeight: 700,
                  padding: "3px 9px", textTransform: "uppercase",
                  letterSpacing: "0.08em",
                }}
              >
                ⊘ Edit Skills
              </button>
            </div>
          </div>

          {/* Skill coverage status */}
          {(() => {
            const requiredSkills = (Object.entries(report.per_skill) as [Skill, { required: boolean; coverage: number }][])
              .filter(([, s]) => s.required)
              .map(([skill, s]) => ({ skill, coverage: s.coverage }));
            if (requiredSkills.length === 0) return null;
            return (
              <div style={{ display: "flex", flexWrap: "wrap", gap: 5, borderTop: "1px solid rgba(245,240,232,0.06)", paddingTop: 10 }}>
                {requiredSkills.map(({ skill, coverage }) => (
                  <span
                    key={skill}
                    style={{
                      fontSize: 9, fontWeight: coverage === 0 ? 800 : 600,
                      padding: "2px 8px",
                      border: `1px solid ${coverage === 0 ? "rgba(196,77,63,0.5)" : "rgba(245,240,232,0.10)"}`,
                      color: coverage === 0 ? "#C44D3F" : coverage === 1 ? "#D4A843" : "#8a7a5e",
                      background: coverage === 0 ? "rgba(196,77,63,0.06)" : "transparent",
                      textTransform: "uppercase", letterSpacing: "0.06em",
                      fontFamily: "var(--font-mono)",
                    }}
                  >
                    {SKILL_LABEL[skill as Skill]} ×{coverage}
                  </span>
                ))}
              </div>
            );
          })()}

          {/* Warrior roster — compact list */}
          <div style={{ display: "grid", gap: 0 }}>
            {members.map((member, i) => {
              const slot = slots[i];
              const fte = slot?.fte ?? 1.0;
              const archetype = getArchetype(member);
              return (
                <div key={member.id} style={{
                  display: "grid",
                  gridTemplateColumns: "22px 20px minmax(0,1fr) auto auto",
                  gap: 8, alignItems: "center",
                  padding: "7px 0",
                  borderBottom: "1px solid rgba(245,240,232,0.05)",
                }}>
                  <span style={{ color: "#8a7a5e", fontSize: 9, fontFamily: "var(--font-mono)", textAlign: "right" }}>
                    {String(i + 1).padStart(2, "0")}
                  </span>
                  <PixelSprite archetype={archetype} gender={inferGender(member.id, member.display_name)} size={18} seed={member.id} />
                  <div style={{ minWidth: 0 }}>
                    <div style={{ color: "#f5f0e8", fontSize: 11, fontWeight: 700, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                      {member.display_name}
                    </div>
                    <div style={{ color: "#8a7a5e", fontSize: 9, textTransform: "uppercase", letterSpacing: "0.05em" }}>
                      {ARCHETYPE_LABEL[archetype]} · {member.dept_code ?? "—"}
                    </div>
                  </div>
                  {fte < 1.0 ? (
                    <span style={{ fontSize: 9, color: "#D4A843", fontFamily: "var(--font-mono)", whiteSpace: "nowrap" }}>
                      {fte} FTE
                    </span>
                  ) : <span />}
                  <button
                    type="button"
                    onClick={(e) => { e.stopPropagation(); onRemove(member.id); }}
                    title={`Remove ${member.display_name}`}
                    style={{
                      border: "1px solid rgba(196,77,63,0.28)",
                      background: "transparent", color: "#C44D3F",
                      cursor: "pointer", fontFamily: "inherit",
                      fontSize: 9, padding: "3px 7px",
                    }}
                  >
                    ✕
                  </button>
                </div>
              );
            })}
            {members.length < MAX_PARTY && (
              <div style={{ padding: "8px 0", color: "#8a7a5e", fontSize: 9, letterSpacing: "0.08em", textTransform: "uppercase", fontFamily: "var(--font-mono)" }}>
                {MAX_PARTY - members.length} seat{MAX_PARTY - members.length !== 1 ? "s" : ""} open — drag from roster or click ＋
              </div>
            )}
          </div>

          {/* Footer */}
          <div style={{ borderTop: "1px solid rgba(245,240,232,0.08)", paddingTop: 10, display: "flex", justifyContent: "space-between", alignItems: "center", gap: 8 }}>
            <div style={{
              color: message?.startsWith("Save failed") ? "#C44D3F" : message ? "#D4A843" : "#8a7a5e",
              fontSize: 10, lineHeight: 1.4, fontFamily: "var(--font-mono)",
            }}>
              {message ?? `${members.length}/${MAX_PARTY} · chem ${report.chemistry}`}
            </div>
            <button
              type="button"
              onClick={(e) => { e.stopPropagation(); onSave(); }}
              disabled={!canSave}
              style={{
                border: `1px solid ${canSave ? "#D4A843" : "rgba(245,240,232,0.12)"}`,
                background: canSave ? "#D4A843" : "transparent",
                color: canSave ? "#0d0d10" : "#8a7a5e",
                cursor: canSave ? "pointer" : "not-allowed",
                fontFamily: "inherit", fontSize: 9, fontWeight: 800,
                padding: "7px 14px", textTransform: "uppercase", letterSpacing: "0.10em",
              }}
            >
              {saving ? "Sealing…" : "Seal Mission"}
            </button>
          </div>
        </>
      ) : (
        <div onClick={(e) => e.stopPropagation()}>{configPanel}</div>
      )}
    </section>
  );
}

// ── PartyMemberChip ──────────────────────────────────────────────────────────

function PartyMemberChip({
  member, fte, tone, onRemove,
}: {
  member: Employee;
  fte: number;
  tone: string;
  onRemove: () => void;
}) {
  const archetype = getArchetype(member);
  const archetypeTone = ARCHETYPE_COLOR[archetype];
  const isPartTime = fte < 1.0;

  return (
    <div style={{
      display: "grid",
      gridTemplateColumns: "28px minmax(0, 1fr) auto",
      gap: 6,
      alignItems: "center",
      minHeight: 64,
      border: `1px solid ${archetypeTone}88`,
      background: "rgba(0,0,0,0.18)",
      padding: "6px 8px",
    }}>
      <PixelSprite archetype={archetype} gender={inferGender(member.id, member.display_name)} size={26} seed={member.id} />
      <div style={{ minWidth: 0 }}>
        <div style={{
          color: "var(--ink-0)", fontSize: 11, fontWeight: 800,
          overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
        }}>
          {member.display_name}
        </div>
        <div style={{ color: archetypeTone, fontSize: 9, textTransform: "uppercase" }}>
          {ARCHETYPE_LABEL[archetype]} · {member.dept_code ?? "--"}
        </div>
        {/* FTE badge — only shown when partial */}
        {isPartTime && (
          <div style={{
            display: "inline-block",
            marginTop: 2,
            fontSize: 9, fontWeight: 800,
            color: tone,
            border: `1px solid ${tone}`,
            padding: "1px 5px",
            textTransform: "uppercase",
          }}>
            {fte} FTE
          </div>
        )}
      </div>
      <button
        type="button"
        onClick={(e) => { e.stopPropagation(); onRemove(); }}
        title={`Remove ${member.display_name}`}
        style={{
          border: "1px solid rgba(196,77,63,0.65)",
          background: "rgba(196,77,63,0.12)",
          color: "var(--rpg-red)", cursor: "pointer",
          fontFamily: "inherit", fontSize: 10, fontWeight: 800,
          lineHeight: 1, padding: "5px 7px", textTransform: "uppercase",
        }}
      >
        ✕
      </button>
    </div>
  );
}

// ── SkillLine ────────────────────────────────────────────────────────────────

function SkillLine({
  skills, activeFilter, onToggle,
}: {
  skills: Skill[];
  activeFilter?: Set<Skill>;
  onToggle?: (skill: Skill) => void;
}) {
  if (skills.length === 0) {
    return (
      <div style={{ fontSize: 10, color: "var(--ink-2)", letterSpacing: "0.05em" }}>
        No skills configured yet
      </div>
    );
  }
  return (
    <div style={{ display: "flex", flexWrap: "wrap", gap: 5 }}>
      {skills.map((skill) => {
        const active = activeFilter?.has(skill) ?? false;
        if (onToggle) {
          return (
            <button
              key={skill}
              type="button"
              onClick={() => onToggle(skill)}
              title={active ? `Remove ${SKILL_LABEL[skill]} filter` : `Filter by ${SKILL_LABEL[skill]}`}
              style={{
                border: `1px solid ${active ? "#D4A843" : "rgba(212,168,67,0.22)"}`,
                background: active ? "#D4A843" : "transparent",
                color: active ? "#0d0d10" : "#b8a88a",
                fontSize: 9, fontWeight: 800,
                padding: "3px 8px", textTransform: "uppercase",
                cursor: "pointer", fontFamily: "inherit", letterSpacing: "0.05em",
              }}
            >
              {SKILL_LABEL[skill]}
            </button>
          );
        }
        return (
          <span
            key={skill}
            style={{
              border: `1px solid ${SKILL_COLOR[skill]}`,
              color: SKILL_COLOR[skill],
              fontSize: 9, fontWeight: 800,
              padding: "2px 6px", textTransform: "uppercase",
            }}
          >
            {SKILL_LABEL[skill]}
          </span>
        );
      })}
      {onToggle && activeFilter && activeFilter.size > 0 && (
        <button
          type="button"
          onClick={() => skills.forEach((s) => activeFilter.has(s) && onToggle(s))}
          style={{
            border: "1px solid var(--ink-2)", background: "transparent",
            color: "var(--ink-1)", fontSize: 9, fontWeight: 700,
            padding: "3px 8px", textTransform: "uppercase",
            cursor: "pointer", fontFamily: "inherit", letterSpacing: "0.05em",
          }}
        >
          Clear
        </button>
      )}
    </div>
  );
}

// Re-export FTE_OPTIONS so CandidateList can use the same values
export { FTE_OPTIONS };

// ─── v4.7 · Talent Pipeline thin strip ────────────────────────────────
//
// One-row ticker that surfaces the live Talent Pool counts in the
// staffing surface without disrupting the project-staffing flow.
// Clicks open the full /talent page (matches /project-health pattern).
// Polls `/api/db/talent-assessment` once per 90s — cheap signal, no
// state coupling with the rest of the tab.

function NinjaTalentStrip() {
  const [data, setData] = useState<{
    nominees: number;
    pool: number;
    target: number;
    boxStars: number;
    boxHighPot: number;
  } | null>(null);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        const r = await fetch("/api/db/talent-assessment", { cache: "no-store" });
        if (!r.ok) return;
        const j = await r.json();
        if (cancelled) return;
        const boxes = j.boxes ?? [];
        const findBox = (id: number) =>
          (boxes.find((b: { id: number; final_cut?: number }) => b.id === id)?.final_cut ?? 0) as number;
        setData({
          nominees: j.total_nominees ?? 0,
          pool: j.total_pool ?? 0,
          target: j.funnel?.target ?? 20,
          boxStars: findBox(9),
          boxHighPot: findBox(8),
        });
      } catch {
        // silent fail — strip is supplementary
      }
    }
    load();
    const t = setInterval(load, 90_000);
    return () => {
      cancelled = true;
      clearInterval(t);
    };
  }, []);

  return (
    <a
      href="/talent"
      style={{
        display: "flex",
        alignItems: "center",
        gap: 14,
        padding: "8px 12px",
        border: "1px solid rgba(212,168,67,0.28)",
        background: "rgba(212,168,67,0.04)",
        color: "var(--ink-0)",
        textDecoration: "none",
        fontSize: 11,
        letterSpacing: "0.04em",
      }}
    >
      <span style={{ color: "#D4A843", fontWeight: 700, letterSpacing: "0.14em" }}>
        TALENT POOL · 2026-H1
      </span>
      <span style={{ color: "#8a7a5e" }}>·</span>
      <NinjaTalentMetric label="Nominees" value={data?.nominees ?? "—"} />
      <NinjaTalentMetric label="Pool" value={data?.pool ?? "—"} accent />
      <NinjaTalentMetric label="Target" value={data?.target ?? "—"} />
      <NinjaTalentMetric label="★ Stars" value={data?.boxStars ?? "—"} />
      <NinjaTalentMetric label="High Pot" value={data?.boxHighPot ?? "—"} />
      <span style={{ marginLeft: "auto", color: "#D4A843" }}>open full view →</span>
    </a>
  );
}

function NinjaTalentMetric({
  label,
  value,
  accent = false,
}: {
  label: string;
  value: number | string;
  accent?: boolean;
}) {
  return (
    <span style={{ display: "flex", alignItems: "baseline", gap: 6 }}>
      <span style={{ color: "#8a7a5e", fontSize: 9, letterSpacing: "0.12em", textTransform: "uppercase" }}>
        {label}
      </span>
      <span
        style={{
          color: accent ? "#D4A843" : "var(--ink-0)",
          fontWeight: 700,
          fontFamily: "var(--font-mono, ui-monospace)",
        }}
      >
        {value}
      </span>
    </span>
  );
}
