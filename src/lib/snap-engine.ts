/**
 * Snap Engine — The Jigsaw Brain
 *
 * Like MIT Scratch: pieces snap together when compatible.
 * Rules enforce hierarchy, budget, skill coverage.
 * The system suggests who to add next (Moneyball).
 *
 * Philosophy: Simple rules, emergent complexity.
 */

import { type CommandCharacter } from "./command-center-data";
import { type TKCProject } from "./tkc-org";
import { calculateChemistry } from "./team-chemistry";
import { calculatePairChemistry } from "./talent-engine";
import { sentimentRuleModifiers, type SentimentSignal } from "./sentiment-engine";

// ─── ROLE HIERARCHY ──────────────────────────────────────

const ROLE_LEVEL: Record<string, number> = {
  md: 5, deputy_md: 4, director: 3, manager: 2, senior: 1, staff: 0,
};

// ─── PROJECT SKILL DEMAND ────────────────────────────────
// 4 real dimensions that a Thai telecom director thinks in.
// Each project specifies what % of work falls in each bucket.
// The team must collectively cover these percentages.

export interface ProjectSkillDemand {
  technical: number;     // 0-100: engineering, coding, infrastructure, system design
  softSkill: number;     // 0-100: presentation, client relations, negotiation, persuasion
  outsource: number;     // 0-100: vendor management, subcontractor coordination, procurement
  inHouse: number;       // 0-100: hands-on building, internal execution, operations
}

// ─── PERSONALITY MODIFIERS ──────────────────────────────
// These don't match project demand — they affect HOW the person performs.

export interface PersonalityProfile {
  resilience: number;    // 0-100: mental toughness under pressure (CON + WIS)
  authenticity: number;  // 0-100: deep understanding vs rehearsed script (INT + WIS)
  adaptability: number;  // 0-100: can handle surprises and pivots (DEX + CHA)
}

// Map RPG attributes → 4 work dimensions + 3 personality modifiers
export function getPersonSkillProfile(c: CommandCharacter): ProjectSkillDemand {
  const a = c.attributes;
  return {
    technical: Math.round(((a.int * 2 + a.wis) / 60) * 100),    // INT-heavy: can they engineer?
    softSkill: Math.round(((a.cha * 2 + a.dex) / 60) * 100),    // CHA-heavy: can they present?
    outsource: Math.round(((a.str + a.cha + a.wis) / 60) * 100), // balanced: can they manage vendors?
    inHouse: Math.round(((a.str + a.con + a.dex) / 60) * 100),   // execution: can they build it?
  };
}

export function getPersonPersonality(c: CommandCharacter): PersonalityProfile {
  const a = c.attributes;
  return {
    resilience: Math.round(((a.con * 2 + a.wis) / 60) * 100),    // will they break under pressure?
    authenticity: Math.round(((a.int + a.wis * 2) / 60) * 100),   // do they understand or just recite?
    adaptability: Math.round(((a.dex * 2 + a.cha) / 60) * 100),   // can they handle surprises?
  };
}

// Team coverage = weighted average of members (not MAX — everyone contributes proportionally)
function getTeamSkillCoverage(team: CommandCharacter[]): ProjectSkillDemand {
  if (team.length === 0) return { technical: 0, softSkill: 0, outsource: 0, inHouse: 0 };
  const profiles = team.map(getPersonSkillProfile);
  const n = profiles.length;
  return {
    technical: Math.round(profiles.reduce((s, p) => s + p.technical, 0) / n),
    softSkill: Math.round(profiles.reduce((s, p) => s + p.softSkill, 0) / n),
    outsource: Math.round(profiles.reduce((s, p) => s + p.outsource, 0) / n),
    inHouse: Math.round(profiles.reduce((s, p) => s + p.inHouse, 0) / n),
  };
}

// ─── SNAP RULES ──────────────────────────────────────────

export interface SnapResult {
  canSnap: boolean;
  reasons: string[];
  score: number; // 0-100: how good this snap would be (0 = can't snap)
}

/**
 * Can this person be snapped into this team for this project?
 */
export function canSnap(
  person: CommandCharacter,
  currentTeam: CommandCharacter[],
  project?: TKCProject,
): SnapResult {
  const reasons: string[] = [];
  let canDo = true;
  let score = 50; // start neutral

  // Rule 1: Already on team?
  if (currentTeam.some((c) => c.id === person.id)) {
    return { canSnap: false, reasons: ["Already on this team"], score: 0 };
  }

  // Rule 2: Hierarchy — check against existing team members
  if (currentTeam.length > 0) {
    // Find the hierarchy levels on the team
    const teamLevels = currentTeam.map((c) => ROLE_LEVEL[c.role] ?? 0);
    const personLevel = ROLE_LEVEL[person.role] ?? 0;
    const maxTeamLevel = Math.max(...teamLevels);
    const minTeamLevel = Math.min(...teamLevels);

    // Director trying to join a team of only staff (no manager bridge)?
    if (personLevel >= 3 && maxTeamLevel <= 0) {
      reasons.push("Needs a manager between director and staff");
      canDo = false;
    }
    // Staff trying to join a team with only directors (no manager bridge)?
    if (personLevel <= 0 && minTeamLevel >= 3) {
      const hasManager = currentTeam.some((c) => ROLE_LEVEL[c.role] === 2);
      if (!hasManager) {
        reasons.push("Needs a manager between staff and director");
        canDo = false;
      }
    }
  }

  // Rule 3: Team size limit
  const maxSize = project?.teamSize ? project.teamSize + 2 : 12;
  if (currentTeam.length >= maxSize) {
    reasons.push(`Team is full (max ${maxSize})`);
    canDo = false;
  }

  // Rule 4: Capacity budget (if project has budget)
  if (project?.budgetThb) {
    const currentCost = currentTeam.reduce((s, c) => s + c.capacityCost, 0);
    const totalCost = currentCost + person.capacityCost;
    // Rough: capacity cost * 10000 as annual cost proxy
    const annualTeamCost = totalCost * 10000;
    if (annualTeamCost > project.budgetThb * 0.4) { // team cost shouldn't exceed 40% of budget
      reasons.push("Adding this person exceeds team budget allocation");
      score -= 20;
      // Don't block, just penalize
    }
  }

  if (!canDo) return { canSnap: false, reasons, score: 0 };

  // ─── SCORING (how good is this snap?) ───

  // Skill coverage improvement
  if (project?.requiredSkills) {
    const teamDepts = new Set(currentTeam.map((c) => c.deptCode));
    const coveredBefore = project.requiredSkills.filter((s) => teamDepts.has(s)).length;
    teamDepts.add(person.deptCode);
    const coveredAfter = project.requiredSkills.filter((s) => teamDepts.has(s)).length;
    if (coveredAfter > coveredBefore) {
      score += 25; // Fills a skill gap!
      reasons.push(`Covers missing skill: ${person.deptCode}`);
    }
  }

  // Pair chemistry with existing members
  if (currentTeam.length > 0) {
    const avgPairChem = currentTeam.reduce((s, c) => s + calculatePairChemistry(person, c), 0) / currentTeam.length;
    if (avgPairChem > 65) { score += 15; reasons.push("High pair chemistry"); }
    else if (avgPairChem < 35) { score -= 10; reasons.push("Low pair chemistry — friction risk"); }
  }

  // Form bonus — adding someone in good form
  if (person.form >= 7) { score += 10; reasons.push("In excellent form"); }
  else if (person.form < 4) { score -= 10; reasons.push("Low form — may underperform"); }

  // HP check — don't overload burned out people
  if (person.hp / person.maxHp < 0.3) {
    score -= 15;
    reasons.push("Burnout risk — HP critical");
  }

  // Utilization check
  if (person.utilization > 85) {
    score -= 10;
    reasons.push("Already over-utilized");
  }

  // ICA bonus
  if (person.ica.overall > 70) { score += 10; }

  score = Math.max(0, Math.min(100, score));

  return { canSnap: true, reasons, score };
}

// ─── CANDIDATE RANKING ───────────────────────────────────

export interface SnapCandidate {
  person: CommandCharacter;
  snapResult: SnapResult;
  fillsGap: boolean;
  gapFilled?: string;
}

/**
 * Given a partial team and a project, rank all available people by snap quality.
 */
export function suggestNextSnap(
  currentTeam: CommandCharacter[],
  allPeople: CommandCharacter[],
  project?: TKCProject,
): SnapCandidate[] {
  const candidates: SnapCandidate[] = [];

  for (const person of allPeople) {
    const result = canSnap(person, currentTeam, project);
    if (!result.canSnap) continue;

    // Check if this person fills a skill gap
    let fillsGap = false;
    let gapFilled: string | undefined;
    if (project?.requiredSkills) {
      const teamDepts = new Set(currentTeam.map((c) => c.deptCode));
      const missing = project.requiredSkills.filter((s) => !teamDepts.has(s));
      if (missing.includes(person.deptCode)) {
        fillsGap = true;
        gapFilled = person.deptCode;
      }
    }

    candidates.push({ person, snapResult: result, fillsGap, gapFilled });
  }

  // Sort: gap-fillers first, then by snap score
  candidates.sort((a, b) => {
    if (a.fillsGap && !b.fillsGap) return -1;
    if (!a.fillsGap && b.fillsGap) return 1;
    return b.snapResult.score - a.snapResult.score;
  });

  return candidates;
}

// ─── TEAM SCORING FOR PROJECT ────────────────────────────

export interface TeamProjectScore {
  fitPct: number;
  chemistryScore: number;
  chemistryAdjusted: number;
  sentimentScore: number;
  sentimentAdjustment: number;
  demandCoverage: ProjectSkillDemand;
  demandGaps: string[];
  hierarchyValid: boolean;
  hierarchyIssues: string[];
  budgetPct: number;
  sizeMatch: "under" | "optimal" | "over";
  overallScore: number;
  insights: string[];
}

export function scoreTeamForProject(
  team: CommandCharacter[],
  project: TKCProject,
  demand?: ProjectSkillDemand,
  sentiment?: SentimentSignal,
): TeamProjectScore {
  // Skill coverage (dept-based)
  const teamDepts = new Set(team.map((c) => c.deptCode));
  const required = project.requiredSkills ?? [];
  const covered = required.filter((s) => teamDepts.has(s));
  const fitPct = required.length > 0 ? Math.round((covered.length / required.length) * 100) : 100;

  // Chemistry
  const chem = team.length >= 2 ? calculateChemistry(team.map((c) => c.attributes)) : { overall: 0 };
  const chemistryScore = chem.overall;
  const sentimentMods = sentiment ? sentimentRuleModifiers(sentiment) : null;
  const sentimentAdjustment = sentimentMods?.chemistry_delta ?? 0;
  const chemistryAdjusted = Math.max(0, Math.min(100, chemistryScore + sentimentAdjustment));
  const sentimentScore = sentiment?.score ?? 50;

  // Demand coverage (quantified)
  const teamCoverage = getTeamSkillCoverage(team);
  const demandGaps: string[] = [];
  if (demand) {
    if (teamCoverage.technical < demand.technical * 0.7) demandGaps.push("Technical");
    if (teamCoverage.softSkill < demand.softSkill * 0.7) demandGaps.push("Soft Skill");
    if (teamCoverage.outsource < demand.outsource * 0.7) demandGaps.push("Outsource Mgmt");
    if (teamCoverage.inHouse < demand.inHouse * 0.7) demandGaps.push("In-House");
  }

  // Hierarchy validation
  const hierarchyIssues: string[] = [];
  const levels = team.map((c) => ROLE_LEVEL[c.role] ?? 0);
  const hasDirector = levels.some((l) => l >= 3);
  const hasManager = levels.some((l) => l === 2);
  const hasStaff = levels.some((l) => l <= 1);
  if (hasDirector && hasStaff && !hasManager) {
    hierarchyIssues.push("Director connected directly to staff — needs a manager bridge");
  }
  const hierarchyValid = hierarchyIssues.length === 0;

  // Budget
  const teamCost = team.reduce((s, c) => s + c.capacityCost, 0);
  const budgetAllocation = project.budgetThb ? project.budgetThb * 0.4 / 10000 : 9999;
  const budgetPct = Math.round((teamCost / budgetAllocation) * 100);

  // Size
  const recSize = project.teamSize ?? 5;
  const sizeMatch = team.length < recSize - 1 ? "under" : team.length > recSize + 2 ? "over" : "optimal";

  // Overall weighted score
  const overallScore = Math.round(
    fitPct * 0.25 +
    chemistryAdjusted * 0.25 +
    (hierarchyValid ? 100 : 30) * 0.15 +
    Math.min(100, 100 - Math.max(0, budgetPct - 100)) * 0.10 +
    (sizeMatch === "optimal" ? 100 : sizeMatch === "under" ? 50 : 40) * 0.10 +
    (100 - demandGaps.length * 20) * 0.15
  );

  // Insights
  const insights: string[] = [];
  if (fitPct === 100) insights.push("✅ All required skills covered");
  else if (required.length > 0) {
    const missing = required.filter((s) => !teamDepts.has(s));
    insights.push(`⚠️ Missing skills: ${missing.join(", ")}`);
  }
  if (chemistryScore >= 75) insights.push("✅ Strong team chemistry");
  else if (chemistryScore < 50) insights.push("⚠️ Low chemistry — friction risk");
  if (!hierarchyValid) insights.push("🔴 Hierarchy gap — needs a manager bridge");
  if (demandGaps.length > 0) insights.push(`⚠️ Demand gaps: ${demandGaps.join(", ")}`);
  if (sizeMatch === "under") insights.push(`⚠️ Team too small — need ${recSize} people`);
  if (sizeMatch === "over") insights.push(`⚠️ Team too large — coordination overhead`);
  if (budgetPct > 100) insights.push("🔴 Over budget");
  if (sentiment && sentimentAdjustment >= 4) insights.push(`✅ Sentiment tailwind: ${sentimentScore}/100`);
  if (sentiment && sentimentAdjustment <= -4) insights.push(`⚠️ Sentiment headwind: ${sentimentScore}/100`);

  return {
    fitPct, chemistryScore, chemistryAdjusted, sentimentScore, sentimentAdjustment, demandCoverage: teamCoverage, demandGaps,
    hierarchyValid, hierarchyIssues, budgetPct, sizeMatch, overallScore, insights,
  };
}

// ─── DEMAND PROFILES FOR EXISTING PROJECTS ───────────────

// ─── DEMAND PROFILES ────────────────────────────────────
// Each project says: "this job is X% technical, Y% soft skill, Z% outsource, W% in-house"
// Numbers should roughly sum to 100 (the mix of what the project needs).

export const PROJECT_DEMANDS: Record<string, ProjectSkillDemand> = {
  // 5G ภาคใต้: heavy infra build, some vendor coordination
  p1: { technical: 60, softSkill: 10, outsource: 15, inHouse: 15 },
  // IoT สนามบิน: tech + vendor management for sensors
  p7: { technical: 45, softSkill: 15, outsource: 25, inHouse: 15 },
  // Cyber มหาดไทย: deep technical + government presentations
  p4: { technical: 55, softSkill: 20, outsource: 10, inHouse: 15 },
  // DC Phase 2: almost all in-house execution
  p6: { technical: 40, softSkill: 5, outsource: 10, inHouse: 45 },
  // Cloud Migration: tech + client hand-holding
  p8: { technical: 50, softSkill: 25, outsource: 15, inHouse: 10 },
  // Smart City PKT: lots of presentation to city officials
  p2: { technical: 30, softSkill: 35, outsource: 20, inHouse: 15 },
  // Smart Hospital: client relations + integration
  p3: { technical: 35, softSkill: 30, outsource: 20, inHouse: 15 },
  // EduTech: presentation-heavy, light tech
  p5: { technical: 25, softSkill: 45, outsource: 10, inHouse: 20 },
};

// ─── SKILL KEYS & LABELS ───────────────────────────────

const SKILL_KEYS: (keyof ProjectSkillDemand)[] = ["technical", "softSkill", "outsource", "inHouse"];
const SKILL_LABELS: Record<keyof ProjectSkillDemand, string> = {
  technical: "Technical",
  softSkill: "Soft Skill",
  outsource: "Outsource Mgmt",
  inHouse: "In-House",
};

/**
 * Preview what adding a candidate to the current team would do to demand coverage.
 * Returns the delta for each skill dimension (positive = improvement).
 */
export function previewSnapDelta(
  currentTeam: CommandCharacter[],
  candidate: CommandCharacter,
  projectId: string,
): { key: keyof ProjectSkillDemand; label: string; before: number; after: number; delta: number; demand: number }[] {
  const demand = PROJECT_DEMANDS[projectId];
  if (!demand) return [];

  const beforeCoverage = getTeamSkillCoverage(currentTeam);
  const afterCoverage = getTeamSkillCoverage([...currentTeam, candidate]);

  return SKILL_KEYS.map((key) => {
    const d = demand[key] || 1;
    const before = Math.min(100, Math.round((beforeCoverage[key] / d) * 100));
    const after = Math.min(100, Math.round((afterCoverage[key] / d) * 100));
    return { key, label: SKILL_LABELS[key], before, after, delta: after - before, demand: d };
  });
}

/**
 * Org-wide capability heatmap: supply (what people can do) vs demand (what projects need).
 */
export function calculateCapabilityHeatmap(
  allPeople: CommandCharacter[],
  activeProjects: TKCProject[],
): { key: keyof ProjectSkillDemand; label: string; supply: number; demand: number; gap: number }[] {
  // Supply: average skill profile across all employees
  const supply = getTeamSkillCoverage(allPeople);

  // Demand: weighted average of active project demands
  const demands = activeProjects.map((p) => PROJECT_DEMANDS[p.id]).filter(Boolean);
  const demandAvg: ProjectSkillDemand = demands.length > 0
    ? {
        technical: Math.round(demands.reduce((s, d) => s + d.technical, 0) / demands.length),
        softSkill: Math.round(demands.reduce((s, d) => s + d.softSkill, 0) / demands.length),
        outsource: Math.round(demands.reduce((s, d) => s + d.outsource, 0) / demands.length),
        inHouse: Math.round(demands.reduce((s, d) => s + d.inHouse, 0) / demands.length),
      }
    : { technical: 0, softSkill: 0, outsource: 0, inHouse: 0 };

  return SKILL_KEYS.map((key) => ({
    key,
    label: SKILL_LABELS[key],
    supply: supply[key],
    demand: demandAvg[key],
    gap: supply[key] - demandAvg[key],
  }));
}

export { SKILL_KEYS, SKILL_LABELS };
