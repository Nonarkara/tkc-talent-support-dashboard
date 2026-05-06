/**
 * Command Center — Data Layer
 * Now using REAL TKC org structure from tkc-org.ts
 */

import {
  rollAttributes,
  getClass,
  type RPGAttributes,
  type RPGClass,
  ATTRIBUTE_KEYS,
} from "./rpg-attributes";
import { calculateCredoScores, type CredoScores } from "./credo";
import { calculateChemistry, type ChemistryReport } from "./team-chemistry";
import {
  TKC_DIVISIONS,
  TKC_REAL_DEPARTMENTS,
  TKC_ROSTER,
  TKC_REAL_PROJECTS,
  getDeptColor,
  getDivision,
  getDepartment,
  type TKCDivision,
  type TKCDepartment,
  type TKCEmployee,
  type TKCProject,
} from "./tkc-org";

// ─── RE-EXPORTS for backward compat ─────────────────────
export { TKC_DIVISIONS, TKC_REAL_DEPARTMENTS, TKC_REAL_PROJECTS, getDeptColor, getDivision, getDepartment };
export type { TKCDivision, TKCDepartment, TKCProject };

// ─── TYPES ───────────────────────────────────────────────

export interface ICAIndex {
  impact: number;       // 0-100: business outcomes delivered
  collaboration: number; // 0-100: enabling others
  advancement: number;   // 0-100: growth velocity
  overall: number;       // weighted composite
}

// OCEAN / Big Five personality model — derived from RPG attributes as initial estimate
export interface OceanProfile {
  openness: number;          // 0-100: INT + DEX → curiosity, creativity, openness to experience
  conscientiousness: number; // 0-100: STR + CON → discipline, organization, reliability
  extraversion: number;      // 0-100: CHA + DEX → sociability, assertiveness, energy
  agreeableness: number;     // 0-100: CHA + CON + WIS → cooperation, trust, empathy
  neuroticism: number;       // 0-100 (inverted: high = MORE stable): CON + WIS → emotional stability
}

export interface CommandCharacter {
  id: string;
  nickname: string;
  seed: number;
  level: number;
  deptCode: string;
  divisionCode: string;
  role: TKCEmployee["role"];
  roleTh: string;
  roleEn: string;
  tenure: number;
  attributes: RPGAttributes;
  rpgClass: RPGClass;
  isPresent: boolean;
  isRemote: boolean;
  checkedInAt?: string;
  hp: number;
  maxHp: number;
  mp: number;
  maxMp: number;
  credo: CredoScores;
  utilization: number;
  streakDays: number;
  totalXp: number;
  status: "healthy" | "watch" | "at_risk" | "critical";
  currentTask?: string;
  dailyGoals?: string[];
  goalCompletion?: number;
  // Fantasy Football mechanics
  ica: ICAIndex;           // Impact, Collaboration, Advancement
  form: number;            // 0.0-10.0 (30-day momentum, like FPL form)
  investmentValue: number; // "price" — rises with demand, falls with disengagement
  isCaptain: boolean;      // Sprint Lead this cycle (2x points)
  capacityCost: number;    // how much budget this person costs a manager
  weeklyPoints: number;    // points scored this sprint
  seasonPoints: number;    // cumulative points this year
  demandCount: number;     // how many project leads want this person
  positionType: "GK" | "DEF" | "MID" | "FWD"; // fantasy position for scoring rules
  fourC: { cause: number; compensation: number; career: number; community: number }; // 0-100 each
  ocean: OceanProfile; // Big Five personality estimate
  // Vital signs — leave days
  leaveDaysUsed: number;    // days of leave taken this year
  leaveDaysTotal: number;   // total annual leave entitlement
  leaveDaysRemaining: number; // remaining leave days
  sickDaysUsed: number;     // sick days taken
}

export interface AIInsight {
  id: string;
  type: "burnout_risk" | "hidden_talent" | "skill_gap" | "chemistry_alert" | "growth_opportunity" | "trend";
  severity: "critical" | "warning" | "info" | "positive";
  icon: string;
  title: string;
  titleTh: string;
  message: string;
  messageTh: string;
  relatedPersonId?: string;
  relatedTeamId?: string;
  timestamp: string;
}

export interface AlertItem {
  id: string;
  severity: "critical" | "warning" | "info";
  icon: string;
  text: string;
  textTh: string;
  relatedId?: string;
}

// ─── TKC STOCK & COMPANY ─────────────────────────────────

export const TKC_STOCK = {
  price: 7.55, change: +0.10, changePct: +1.34,
  high52w: 10.90, low52w: 6.95, pe: 17.35, pb: 0.72,
  marketCap: "2.98B", marketCapFull: 2_980_000_000,
  dividendYield: 2.68, volume: 19_000, shares: 400_000_000,
  history: [
    { month: "Apr 25", price: 8.20 }, { month: "May 25", price: 7.90 },
    { month: "Jun 25", price: 7.40 }, { month: "Jul 25", price: 6.95 },
    { month: "Aug 25", price: 7.30 }, { month: "Sep 25", price: 7.80 },
    { month: "Oct 25", price: 8.50 }, { month: "Nov 25", price: 9.20 },
    { month: "Dec 25", price: 8.80 }, { month: "Jan 26", price: 9.10 },
    { month: "Feb 26", price: 8.40 }, { month: "Mar 26", price: 7.55 },
  ],
};

export const TKC_COMPANY = {
  revenue: { q3_2025: 566.50, q3_2024: 458.17, changePct: 23.64 },
  netProfit: { q3_2025: 56.75, q3_2024: 51.51, changePct: 10.17 },
  grossMargin: 12.34,
  employees: 200,
  founded: 2003,
  ticker: "TKC",
  exchange: "SET",
};

// ─── CURRENT TASKS ───────────────────────────────────────

const TASKS: Record<string, string> = {
  md1: "Strategic planning FY2026",
  dm1: "Client pipeline review", dm2: "5G project oversight", dm3: "Q4 budget planning",
  s1: "Client call — SCB", s2: "Proposal: IoT package", s3: "Lead generation — healthcare",
  bd1: "Smart City PKT proposal", bd2: "Market research — EduTech",
  n1: "Site survey ภาคใต้", n2: "Router config — site 12", n3: "Network monitoring setup",
  eb1: "Cloud Migration architecture", eb2: "Feature: dashboard widget",
  ps1: "Penetration test — MOI", ps2: "Security audit report", ps3: "Compliance checklist",
  ds1: "Deploy DC Phase 2 v3", ds2: "Bug fix: auth module", ds3: "UI review — EduTech",
  f1: "Q3 financial close", f2: "Invoice processing — Q1",
  hr1: "Interview — candidate #4", hr2: "Payroll reconciliation",
  pc1: "Procurement — network equipment",
  it1: "Database optimization", it2: "Server maintenance",
  ca1: "Office lease renewal",
};

const GOALS: string[][] = [
  ["ส่ง API endpoint ระบบใหม่", "Review PR ของทีม", "อัปเดต documentation"],
  ["ทดสอบระบบ firewall", "แก้ bug ระบบ monitoring", "ประชุมทีม security"],
  ["ติดตั้งอุปกรณ์ site ใหม่", "เตรียม proposal", "ส่งรายงานความคืบหน้า"],
  ["นำเสนอ demo ให้ลูกค้า", "ปิด deal ใหม่", "อัปเดต CRM"],
  ["ออกแบบ wireframe", "User testing", "ปรับ UI ตาม feedback"],
  ["จัดทำแผนพัฒนาบุคลากร Q2", "สัมภาษณ์ผู้สมัครใหม่", "อัปเดตข้อมูลพนักงาน"],
  ["Sprint planning", "ประสานงานกับลูกค้า", "ตรวจสอบ timeline โครงการ"],
  ["ปิดบัญชีรายเดือน", "จัดทำ invoice", "ประสานงานจัดซื้อ"],
];

// ─── HELPERS ─────────────────────────────────────────────

function sRng(seed: number) {
  let s = seed;
  return () => { s = (s * 16807) % 2147483647; return (s - 1) / 2147483646; };
}

function computeVitals(attrs: RPGAttributes, level: number, seed: number, role: string) {
  const rng = sRng(seed + 7777);
  const maxHp = 100 + attrs.con * 5 + level * 2;
  const maxMp = 80 + attrs.dex * 3 + attrs.int * 2;
  // Senior roles have higher HP (more resilient), but also more utilization
  const roleBonus = role === "md" ? 0.9 : role === "deputy_md" ? 0.85 : role === "director" ? 0.8 : 0;
  const hpPct = Math.min(1, 0.45 + rng() * 0.55 + roleBonus * 0.1);
  const mpPct = 0.30 + rng() * 0.70;
  const hp = Math.round(maxHp * hpPct);
  const mp = Math.round(maxMp * mpPct);
  // Senior roles are more utilized
  const baseUtil = role === "deputy_md" ? 75 : role === "director" ? 70 : role === "manager" ? 65 : 55;
  const utilization = Math.round(baseUtil + rng() * 30);
  const streakDays = Math.round(rng() * 60);
  const baseXp = level * level * 80 + level * 200;
  const totalXp = Math.round(baseXp + rng() * baseXp * 0.3);
  const hpRatio = hp / maxHp;
  const status: CommandCharacter["status"] =
    hpRatio > 0.7 ? "healthy" : hpRatio > 0.4 ? "watch" : hpRatio > 0.2 ? "at_risk" : "critical";
  return { hp, maxHp, mp, maxMp, utilization, streakDays, totalXp, status };
}

// ─── FANTASY FOOTBALL COMPUTATIONS ───────────────────────

const ROLE_TO_POSITION: Record<string, CommandCharacter["positionType"]> = {
  md: "GK", deputy_md: "GK", director: "DEF", manager: "MID", senior: "MID", staff: "FWD",
};

function computeFantasy(attrs: RPGAttributes, credo: CredoScores, level: number, role: string, tenure: number, seed: number) {
  const rng = sRng(seed + 8888);

  // ICA Index — derived from attributes + credo
  const impact = Math.round(
    (attrs.str * 3 + attrs.wis * 2 + attrs.con * 1) / 6 * (100 / 20) * (0.8 + rng() * 0.4)
  );
  const collaboration = Math.round(
    (attrs.cha * 3 + attrs.dex * 2 + attrs.con * 1) / 6 * (100 / 20) * (0.8 + rng() * 0.4)
  );
  const advancement = Math.round(
    (attrs.int * 3 + attrs.dex * 2 + attrs.wis * 1) / 6 * (100 / 20) * (0.8 + rng() * 0.4)
  );
  const icaOverall = Math.round(impact * 0.4 + collaboration * 0.3 + advancement * 0.3);

  // Form — 30-day rolling momentum (0.0-10.0)
  const baseForm = (icaOverall / 100) * 7 + rng() * 3;
  const form = Math.round(Math.min(10, Math.max(0, baseForm)) * 10) / 10;

  // Investment Value — based on level, demand, form
  const baseValue = 30 + level * 8 + tenure * 2;
  const investmentValue = Math.round(baseValue + form * 3 + rng() * 15);

  // Capacity cost — what a manager pays to have this person
  const capacityCost = role === "md" ? 200 : role === "deputy_md" ? 150 :
    role === "director" ? 120 : role === "manager" ? 100 :
    role === "senior" ? 80 : 40 + level * 5;

  // Weekly/season points (mock)
  const weeklyPoints = Math.round(20 + rng() * 60 + level * 2);
  const seasonPoints = Math.round(weeklyPoints * (8 + rng() * 4)); // ~8-12 weeks simulated

  // Demand — how many project leads want this person (0-5)
  const demandCount = Math.min(5, Math.floor(rng() * 3 + (level > 8 ? 2 : 0) + (form > 7 ? 1 : 0)));

  // Position type
  const positionType = ROLE_TO_POSITION[role] ?? "MID";

  // 4C scores — the updated framework
  const fourC = {
    cause: Math.round(credo.purpose * 0.6 + credo.transcendence * 0.4),
    compensation: Math.min(100, Math.round(40 + level * 4 + tenure * 2 + rng() * 15)),
    career: Math.round(credo.story * 0.5 + credo.transcendence * 0.3 + advancement * 0.2),
    community: Math.round(credo.belonging * 0.6 + collaboration * 0.4),
  };

  // OCEAN / Big Five — derived from RPG attributes as initial estimate
  // This is a starting point — real OCEAN would come from actual personality assessments
  const ocean: OceanProfile = {
    openness: Math.min(100, Math.round((attrs.int * 3 + attrs.dex * 2) / 5 * (100 / 20) * (0.85 + rng() * 0.3))),
    conscientiousness: Math.min(100, Math.round((attrs.str * 3 + attrs.con * 2) / 5 * (100 / 20) * (0.85 + rng() * 0.3))),
    extraversion: Math.min(100, Math.round((attrs.cha * 3 + attrs.dex * 2) / 5 * (100 / 20) * (0.85 + rng() * 0.3))),
    agreeableness: Math.min(100, Math.round((attrs.cha * 2 + attrs.con * 2 + attrs.wis * 1) / 5 * (100 / 20) * (0.85 + rng() * 0.3))),
    neuroticism: Math.min(100, Math.round(100 - (attrs.con * 3 + attrs.wis * 2) / 5 * (100 / 20) * (0.85 + rng() * 0.3))), // inverted: low neuroticism = stable
  };

  return {
    ica: { impact, collaboration, advancement, overall: icaOverall } as ICAIndex,
    form,
    investmentValue,
    capacityCost,
    weeklyPoints,
    seasonPoints,
    demandCount,
    positionType: positionType as CommandCharacter["positionType"],
    fourC,
    ocean,
  };
}

// ─── CHARACTER CREATION ──────────────────────────────────

export function createCommandCharacters(): CommandCharacter[] {
  // Determine captains per division (highest level non-MD person)
  const captainIds = new Set<string>();
  for (const div of TKC_DIVISIONS) {
    const divMembers = TKC_ROSTER
      .filter((r) => r.divisionCode === div.code && r.role !== "md" && r.role !== "deputy_md")
      .sort((a, b) => b.level - a.level);
    if (divMembers[0]) captainIds.add(divMembers[0].id);
  }

  return TKC_ROSTER.map((r) => {
    const rng = sRng(r.seed + 3333);
    const isPresent = r.role === "md" ? true : rng() < 0.90;
    const isRemote = isPresent && rng() > 0.70;
    const attributes = rollAttributes(r.seed);
    const rpgClass = getClass(attributes);
    const credo = calculateCredoScores(attributes);
    const vitals = computeVitals(attributes, r.level, r.seed, r.role);
    const fantasy = computeFantasy(attributes, credo, r.level, r.role, r.tenure, r.seed);
    const goalIdx = Math.floor(rng() * GOALS.length);

    const base = {
      id: r.id,
      nickname: r.nickname,
      seed: r.seed,
      level: r.level,
      deptCode: r.deptCode,
      divisionCode: r.divisionCode,
      role: r.role,
      roleTh: r.roleTh,
      roleEn: r.roleEn,
      tenure: r.tenure,
      attributes, rpgClass, isPresent, isRemote,
      checkedInAt: isPresent ? `${8 + Math.floor(rng() * 2)}:${String(Math.floor(rng() * 60)).padStart(2, "0")}` : undefined,
      credo,
      currentTask: TASKS[r.id],
      dailyGoals: isPresent ? GOALS[goalIdx] : undefined,
      goalCompletion: isPresent ? Math.round(rng() * 100) : undefined,
      isCaptain: captainIds.has(r.id),
      // Leave days as vital signs
      leaveDaysTotal: r.role === "md" ? 30 : r.role === "deputy_md" ? 25 : r.tenure > 5 ? 18 : 12,
      leaveDaysUsed: 0, // set below
      leaveDaysRemaining: 0,
      sickDaysUsed: 0,
      ...vitals,
      ...fantasy,
    };
    // Compute leave
    const totalLeave = r.role === "md" ? 30 : r.role === "deputy_md" ? 25 : r.tenure > 5 ? 18 : 12;
    const usedLeave = Math.round(rng() * Math.min(totalLeave, r.tenure > 5 ? 12 : 8));
    const sickDays = Math.round(rng() * 5);
    return { ...base, leaveDaysTotal: totalLeave, leaveDaysUsed: usedLeave, leaveDaysRemaining: totalLeave - usedLeave, sickDaysUsed: sickDays };
  });
}

// ─── TEAM CHEMISTRY ──────────────────────────────────────

export function getDivisionChemistry(characters: CommandCharacter[], divisionCode: string, excludeIds?: Set<string>): ChemistryReport {
  const members = characters
    .filter((c) => c.divisionCode === divisionCode && c.role !== "md" && (!excludeIds || !excludeIds.has(c.id)))
    .map((c) => c.attributes);
  return calculateChemistry(members);
}

// ─── AI INSIGHTS ─────────────────────────────────────────

export function createMockInsights(characters: CommandCharacter[]): AIInsight[] {
  const insights: AIInsight[] = [];
  const now = new Date();

  for (const c of characters.filter((c) => c.status === "at_risk" || c.status === "critical")) {
    insights.push({
      id: `burn-${c.id}`, type: "burnout_risk",
      severity: c.status === "critical" ? "critical" : "warning", icon: "~",
      title: `${c.nickname} — Burnout Risk`, titleTh: `${c.nickname} — เสี่ยงหมดไฟ`,
      message: `HP ${Math.round((c.hp / c.maxHp) * 100)}%`, messageTh: `HP ${Math.round((c.hp / c.maxHp) * 100)}%`,
      relatedPersonId: c.id, relatedTeamId: c.divisionCode,
      timestamp: new Date(now.getTime() - Math.random() * 3600000).toISOString(),
    });
  }

  for (const c of characters.filter((c) => {
    const avg = ATTRIBUTE_KEYS.reduce((s, k) => s + c.attributes[k], 0) / 6;
    return avg > 11 && c.level < 6;
  })) {
    insights.push({
      id: `hid-${c.id}`, type: "hidden_talent", severity: "positive", icon: "*",
      title: `${c.nickname} — Hidden Talent`, titleTh: `${c.nickname} — พรสวรรค์ซ่อนเร้น`,
      message: `High attributes, only Lv.${c.level}`, messageTh: `คุณสมบัติสูง แต่ Lv.${c.level}`,
      relatedPersonId: c.id, timestamp: new Date(now.getTime() - Math.random() * 7200000).toISOString(),
    });
  }

  for (const c of characters.filter((c) => c.utilization > 85)) {
    insights.push({
      id: `util-${c.id}`, type: "trend", severity: "warning", icon: "!",
      title: `${c.nickname} — Over-utilized`, titleTh: `${c.nickname} — ใช้งานเกิน`,
      message: `Util ${c.utilization}%`, messageTh: `ใช้งาน ${c.utilization}%`,
      relatedPersonId: c.id, timestamp: new Date(now.getTime() - Math.random() * 5400000).toISOString(),
    });
  }

  for (const div of TKC_DIVISIONS) {
    const chem = getDivisionChemistry(characters, div.code);
    if (chem.overall < 60) {
      insights.push({
        id: `chem-${div.code}`, type: "chemistry_alert", severity: "warning", icon: "%",
        title: `${div.nameEn} — Low Chemistry`, titleTh: `${div.nameTh} — เคมีต่ำ`,
        message: `Chemistry ${chem.overall}`, messageTh: `เคมี ${chem.overall}`,
        relatedTeamId: div.code, timestamp: new Date(now.getTime() - Math.random() * 3600000).toISOString(),
      });
    }
  }

  const sev: Record<string, number> = { critical: 0, warning: 1, info: 2, positive: 3 };
  insights.sort((a, b) => sev[a.severity] - sev[b.severity]);
  return insights;
}

// ─── ALERTS ──────────────────────────────────────────────

export function createMockAlerts(characters: CommandCharacter[]): AlertItem[] {
  const alerts: AlertItem[] = [];

  for (const div of TKC_DIVISIONS) {
    const members = characters.filter((c) => c.divisionCode === div.code && c.role !== "md");
    const avgUtil = members.reduce((s, c) => s + c.utilization, 0) / Math.max(members.length, 1);
    if (avgUtil > 80) {
      alerts.push({ id: `au-${div.code}`, severity: "warning", icon: "!", text: `${div.nameEn} over-utilized ${Math.round(avgUtil)}%`, textTh: `${div.nameTh} ใช้งานเกิน ${Math.round(avgUtil)}%` });
    }
    const chem = getDivisionChemistry(characters, div.code);
    if (chem.overall < 55) {
      alerts.push({ id: `ac-${div.code}`, severity: "warning", icon: "%", text: `${div.nameEn} chemistry ${chem.overall}`, textTh: `${div.nameTh} เคมี ${chem.overall}` });
    }
  }

  for (const c of characters.filter((c) => c.status === "critical")) {
    alerts.push({ id: `ah-${c.id}`, severity: "critical", icon: "!", text: `${c.nickname} HP critical`, textTh: `${c.nickname} HP วิกฤต` });
  }

  return alerts;
}

// ─── ORG HEALTH ──────────────────────────────────────────

export function calculateOrgHealth(characters: CommandCharacter[]): number {
  const active = characters.filter((c) => c.isPresent && c.role !== "md");
  if (active.length === 0) return 0;
  const avgWellbeing = active.reduce((s, c) => s + (c.hp / c.maxHp) * 100, 0) / active.length;
  const avgUtil = active.reduce((s, c) => s + c.utilization, 0) / active.length;
  const utilBalance = avgUtil >= 70 && avgUtil <= 85 ? 100 : Math.max(0, 100 - Math.abs(avgUtil - 77.5) * 3);
  const chemScores = TKC_DIVISIONS.map((d) => getDivisionChemistry(characters, d.code).overall);
  const avgChem = chemScores.reduce((s, c) => s + c, 0) / chemScores.length;
  const avgCredo = active.reduce((s, c) => s + c.credo.overall, 0) / active.length;
  return Math.round(avgWellbeing * 0.25 + utilBalance * 0.20 + avgChem * 0.25 + avgCredo * 0.30);
}

// ─── DEPT COLORS (backward compat) ───────────────────────

export const DEPT_COLORS: Record<string, string> = {};
for (const d of TKC_REAL_DEPARTMENTS) DEPT_COLORS[d.code] = d.color;
for (const d of TKC_DIVISIONS) DEPT_COLORS[d.code] = d.color;
DEPT_COLORS["EXEC"] = "#1a1a1a";
