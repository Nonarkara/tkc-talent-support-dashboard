import {
  ARCHETYPE_LABEL,
  getArchetype,
  type Archetype,
  type EmpStatsInput,
} from "./token-economy";

export interface HeroIntelEmployee extends EmpStatsInput {
  id: string;
  display_name: string;
  title?: string | null;
  dept_code?: string | null;
}

export interface HeroTrainingRecord {
  title: string;
  provider: string;
  status: "completed" | "in_progress" | "recommended";
}

export interface HeroBrief {
  summary: string;
  strengths: string[];
  skills: string[];
  completed_trainings: HeroTrainingRecord[];
  recommended_trainings: string[];
  project_fit: string[];
  watchouts: string[];
  archetype: Archetype;
}

type AttrKey = "str" | "int" | "wis" | "cha" | "dex" | "con";

const ATTR_LABEL: Record<AttrKey, string> = {
  str: "Load Bearing",
  int: "Systems Thinking",
  wis: "Judgment",
  cha: "Room Control",
  dex: "Speed",
  con: "Stamina",
};

const DEPT_SKILLS: Record<string, string[]> = {
  DIGITAL: ["Cloud delivery", "UX coordination", "Product shaping"],
  IT: ["Infrastructure support", "Endpoint governance", "Incident triage"],
  NET_DEL: ["Network delivery", "Field rollout", "Integration debugging"],
  ENTERPRISE: ["Solution design", "Enterprise accounts", "Technical workshops"],
  PUB_SAFETY: ["Mission-critical rollout", "Operations control", "Escalation handling"],
  SALES: ["Pipeline building", "Client narrative", "Commercial follow-through"],
  BIZ_DEV: ["Deal framing", "Partnership building", "Proposal shaping"],
  PROCURE: ["Vendor management", "Commercial comparison", "Sourcing discipline"],
  ACCT: ["Margin tracking", "Ledger discipline", "Forecast control"],
  FINANCE: ["Run-rate reading", "Budget stewardship", "Scenario planning"],
  HR_ADMIN: ["People coordination", "Process hygiene", "Support follow-through"],
  CORP_ADM: ["Admin continuity", "Back-office readiness", "Cross-team support"],
};

const ARCHETYPE_TRAINING: Record<Archetype, string[]> = {
  captain: ["Stakeholder steering", "Project rescue leadership", "Executive communication"],
  tech: ["Systems architecture", "Reliability debugging", "AI-assisted build workflow"],
  sales: ["Consultative selling", "Story-led proposals", "Account expansion"],
  ops: ["Vendor orchestration", "Program operations", "Quality gates"],
  scout: ["Business analysis", "Forecast modeling", "Evidence-led reviews"],
  fighter: ["Hands-on delivery", "Agile sprinting", "Performance debugging"],
  goofoff: ["Team morale booster", "Creative ideation", "Cultural bridging"],
};

const ARCHETYPE_PROJECT_FIT: Record<Archetype, string[]> = {
  captain: ["Best when a project needs one visible bridge across silos", "Strong fit for rescue or politically sensitive work"],
  tech: ["Best when the quest is system-heavy and ambiguity is technical", "Raises confidence on build-first projects"],
  sales: ["Best when the work must win trust before it can ship", "Useful on outsourcing, renewals, and early discovery"],
  ops: ["Best when procurement, paperwork, and delivery coordination can kill momentum", "Stabilizes messy multi-party projects"],
  scout: ["Best when the team needs reading, evidence, and early warning", "Useful on margin-sensitive or high-risk projects"],
  fighter: ["Best for aggressive shipping and technical execution", "Strongest when work is high-intensity and hands-on"],
  goofoff: ["Best for creative work and raising team morale", "Can be a wildcard success in unpredictable environments"],
};

function attrValue(emp: HeroIntelEmployee, key: AttrKey): number {
  const raw = emp[`attr_${key}` as const];
  return typeof raw === "number" ? raw : 10;
}

function topAttributes(emp: HeroIntelEmployee): Array<{ key: AttrKey; value: number }> {
  return (["str", "int", "wis", "cha", "dex", "con"] as const)
    .map((key) => ({ key, value: attrValue(emp, key) }))
    .sort((left, right) => right.value - left.value)
    .slice(0, 3);
}

function deptSkills(emp: HeroIntelEmployee): string[] {
  return DEPT_SKILLS[(emp.dept_code ?? "").toUpperCase()] ?? ["Cross-functional support", "General delivery", "Operational learning"];
}

function inferredWatchouts(emp: HeroIntelEmployee, archetype: Archetype): string[] {
  const watchouts: string[] = [];
  if (attrValue(emp, "con") <= 8) watchouts.push("May lose shape under stacked deadlines");
  if (attrValue(emp, "cha") <= 8 && archetype === "sales") watchouts.push("Needs support in high-stakes room management");
  if (attrValue(emp, "wis") <= 8 && archetype === "captain") watchouts.push("Can lead hard, but may need a stronger reader beside them");
  if (attrValue(emp, "dex") <= 8) watchouts.push("Turnaround speed may lag on multi-threaded work");
  return watchouts.length > 0 ? watchouts : ["No immediate fragility signal; keep challenge level rising"];
}

function completedTrainings(emp: HeroIntelEmployee, archetype: Archetype): HeroTrainingRecord[] {
  const skillSeed = deptSkills(emp);
  return [
    {
      title: `${skillSeed[0]} Foundation`,
      provider: "TKC Academy",
      status: "completed",
    },
    {
      title: `${ARCHETYPE_LABEL[archetype]} Methods`,
      provider: "Manager Guild",
      status: attrValue(emp, "wis") >= 12 ? "completed" : "in_progress",
    },
    {
      title: `${skillSeed[1]} Clinic`,
      provider: "Project Lab",
      status: attrValue(emp, "dex") >= 11 ? "completed" : "in_progress",
    },
  ];
}

export function buildHeuristicHeroBrief(emp: HeroIntelEmployee): HeroBrief {
  const archetype = getArchetype(emp);
  const top = topAttributes(emp);
  const skills = [...new Set([...deptSkills(emp), ...top.map((entry) => ATTR_LABEL[entry.key])])].slice(0, 6);
  const completed = completedTrainings(emp, archetype);
  const recommended = [
    ...ARCHETYPE_TRAINING[archetype],
    top[0]?.key === "int" ? "AI workflow supervision" : "Cross-functional storytelling",
    top[0]?.key === "cha" ? "Client-room simulations" : "Decision hygiene",
  ].filter((value, index, arr) => arr.indexOf(value) === index).slice(0, 4);

  return {
    summary:
      `${emp.display_name} reads as a ${ARCHETYPE_LABEL[archetype]}-class hero in ${emp.dept_code ?? "the House"}, ` +
      `with the strongest pull in ${top.map((entry) => ATTR_LABEL[entry.key]).slice(0, 2).join(" + ")}.`,
    strengths: top.map((entry) => `${ATTR_LABEL[entry.key]} ${entry.value}`),
    skills,
    completed_trainings: completed,
    recommended_trainings: recommended,
    project_fit: ARCHETYPE_PROJECT_FIT[archetype],
    watchouts: inferredWatchouts(emp, archetype),
    archetype,
  };
}

