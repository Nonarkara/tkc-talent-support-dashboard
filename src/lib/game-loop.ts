/**
 * Game Loop — The Core Mechanic
 *
 * How the game works:
 *
 * 1. PROJECTS arrive (tasks from clients/market)
 * 2. DIRECTORS compete to take projects — they pitch why they should lead it
 * 3. Each Director has a BUDGET CEILING — can't hire all superstars
 * 4. Director picks a MIDDLE MANAGER who connects vision to execution
 * 5. Middle Manager + Director fill the team with STAFF from the pool
 * 6. Team composition is scored: skill fit, chemistry, budget efficiency
 * 7. Team DELIVERS the project over 1-4 quarters
 * 8. Points are awarded based on delivery quality, margin, and on-time
 * 9. Directors who form better teams and deliver more = higher score
 * 10. Company-wide score = aggregate of all teams = THE ORG GRADE
 *
 * The salary cap (budget ceiling) means:
 * - You can have ONE Michael Jordan + role players
 * - OR a balanced team of mid-tier talent
 * - You CANNOT have 5 superstars — the math doesn't work
 * - This IS Moneyball
 */

import { type CommandCharacter } from "./command-center-data";
import { type TKCProject } from "./tkc-org";
import { scoreTeamForProject, type TeamProjectScore, PROJECT_DEMANDS } from "./snap-engine";
import type { SentimentSignal } from "./sentiment-engine";

// ─── GAME CONSTANTS ──────────────────────────────────────

export const GAME_CONFIG = {
  // ─── THE SALARY CAP ───────────────────────────────────────
  // Default monthly salary cap per project team: 200,000 THB/month
  // Real salaries from employee data. 1 CP = 1,000 THB/month.
  // So 200k = 200 CP.
  salaryCap: 200,  // in CP (×1,000 = THB)
  salaryCapThb: 200_000,

  // Project monthly ceiling can override default (from project data)
  // If project has monthlyCeiling, use that. Otherwise use default.

  // ─── THE 10x RULE ─────────────────────────────────────────
  // Product must sell at 10x the OPEX cost.
  // If team costs 200k/month = 2.4M/year OPEX,
  // project revenue must be at least 24M to be viable.
  revenueMultiplier: 10,

  // Max projects per director
  maxProjectsPerDirector: 3,

  // Points for delivery
  pointsForDelivery: {
    onTime: 100,
    late: 50,
    failed: -20,
  },

  // Bonus multipliers
  marginBonus: {
    above20: 1.5,  // GM > 20% = 1.5x points
    above18: 1.2,  // GM > 18% = 1.2x points
    below18: 0.8,  // GM < 18% = 0.8x points
    below12: 0.5,  // GM < 12% = 0.5x points
  },

  // Chemistry bonus
  chemistryBonus: {
    above75: 1.3,
    above55: 1.0,
    below55: 0.7,
  },

  quarters: ["Q1", "Q2", "Q3", "Q4"],
};

// ─── TYPES ───────────────────────────────────────────────

export interface GameTeam {
  id: string;
  projectId: string;
  directorId: string;       // the director leading this project
  managerId: string | null;  // the middle manager (bridge)
  staffIds: string[];        // the team members
  budgetCeiling: number;     // max capacity points this team can spend
  budgetUsed: number;        // actual capacity points used
  // Scores (calculated)
  teamScore: TeamProjectScore | null;
  // Delivery tracking
  status: "forming" | "active" | "delivered" | "failed";
  quarterStarted: string;    // e.g., "Q1"
  quarterEnded?: string;
  deliveryPoints: number;
}

export interface DirectorRecord {
  directorId: string;
  nickname: string;
  activeProjects: string[];  // project IDs
  totalPoints: number;       // accumulated over the year
  quarterlyPoints: Record<string, number>; // per quarter
  teamsFormed: number;
  teamsDelivered: number;
  avgTeamChemistry: number;
  avgMargin: number;
  rank: number;
}

export interface OrgGrade {
  totalPoints: number;
  totalDelivered: number;
  totalFailed: number;
  avgChemistry: number;
  avgMargin: number;
  grade: "S" | "A" | "B" | "C" | "D" | "F";
  gradeLabel: string;
  gradeLabelTh: string;
}

// ─── BUDGET CALCULATION ──────────────────────────────────

/**
 * Salary cap = project budget ÷ 10, expressed in CP (1 CP = 1,000 THB/month).
 * A ฿2M project → ฿200k/month → 200 CP.
 * A ฿180M project → ฿18M/month... that's too high. Cap at project's monthlyCeiling if set.
 * Fallback: ฿200k default for projects without budget data.
 */
export function calculateBudgetCeiling(project: TKCProject): number {
  if (project.monthlyCeiling) {
    return Math.round(project.monthlyCeiling / 1000);
  }
  if (project.budgetThb) {
    return Math.round(project.budgetThb / 10 / 1000);
  }
  return GAME_CONFIG.salaryCap;
}

/**
 * The 10x Rule: monthly team OPEX × 12 × 10 = minimum viable project revenue.
 * Returns { monthlyOpex, annualOpex, minRevenue, projectBudget, viable }.
 */
export function calculate10xViability(teamCostCp: number, project: TKCProject): {
  monthlyOpex: number;
  annualOpex: number;
  minRevenue: number;
  projectBudget: number;
  viable: boolean;
  ratio: number;
} {
  const monthlyOpex = teamCostCp * 1000;  // THB
  const annualOpex = monthlyOpex * 12;
  const minRevenue = annualOpex * GAME_CONFIG.revenueMultiplier;
  const projectBudget = project.budgetThb ?? 0;
  const ratio = annualOpex > 0 ? projectBudget / annualOpex : 0;
  return { monthlyOpex, annualOpex, minRevenue, projectBudget, viable: projectBudget >= minRevenue, ratio };
}

export function calculateBudgetUsed(team: CommandCharacter[]): number {
  return team.reduce((sum, c) => sum + c.capacityCost, 0);
}

export function getBudgetStatus(used: number, ceiling: number): {
  pct: number;
  status: "under" | "optimal" | "tight" | "over";
  message: string;
} {
  const pct = Math.round((used / ceiling) * 100);
  if (pct > 100) return { pct, status: "over", message: `Over budget by ${pct - 100}%` };
  if (pct > 85) return { pct, status: "tight", message: `${100 - pct}% budget remaining — tight` };
  if (pct > 50) return { pct, status: "optimal", message: `${100 - pct}% budget remaining` };
  return { pct, status: "under", message: `${100 - pct}% budget remaining — room for talent` };
}

// ─── MONEYBALL VALUE ────────────────────────────────────

/**
 * Moneyball metric: how much value does this person bring per THB of salary?
 * Higher = better bang for buck. A junior with high ICA/form is a Moneyball pick.
 */
export function calculateMoneyballValue(character: CommandCharacter): {
  value: number;        // composite contribution score
  cost: number;         // monthly salary in CP
  ratio: number;        // value per CP spent (higher = better deal)
  verdict: "steal" | "fair" | "expensive" | "overpaid";
} {
  // Value = weighted blend of ICA, form, and project versatility
  const value = Math.round(
    character.ica.overall * 0.4 +
    character.form * 8 +
    character.demandCount * 6 +
    character.level * 2
  );
  const cost = character.capacityCost;
  const ratio = cost > 0 ? Math.round((value / cost) * 100) / 100 : 0;

  let verdict: "steal" | "fair" | "expensive" | "overpaid";
  if (ratio >= 1.2) verdict = "steal";
  else if (ratio >= 0.8) verdict = "fair";
  else if (ratio >= 0.5) verdict = "expensive";
  else verdict = "overpaid";

  return { value, cost, ratio, verdict };
}

// ─── TEAM FORMATION VALIDATION ───────────────────────────

export interface FormationResult {
  valid: boolean;
  issues: string[];
  warnings: string[];
  budgetStatus: ReturnType<typeof getBudgetStatus>;
  teamScore: TeamProjectScore | null;
  estimatedPoints: number;
}

export function validateTeamFormation(
  director: CommandCharacter,
  manager: CommandCharacter | null,
  staff: CommandCharacter[],
  project: TKCProject,
  sentiment?: SentimentSignal,
): FormationResult {
  const issues: string[] = [];
  const warnings: string[] = [];

  // Director must be director-level or above
  if (director.role !== "director" && director.role !== "deputy_md" && director.role !== "md") {
    issues.push("Team leader must be Director level or above");
  }

  // Must have a middle manager if there are staff
  if (staff.length > 0 && !manager) {
    issues.push("Need a Middle Manager to connect Director to Staff");
  }

  // Manager must be manager-level
  if (manager && manager.role !== "manager") {
    warnings.push(`${manager.nickname} is ${manager.roleEn}, not a Manager — may lack coordination skills`);
  }

  // Budget check
  const allMembers = [director, ...(manager ? [manager] : []), ...staff];
  const budgetCeiling = calculateBudgetCeiling(project);
  const budgetUsed = calculateBudgetUsed(allMembers);
  const budgetStatus = getBudgetStatus(budgetUsed, budgetCeiling);

  if (budgetStatus.status === "over") {
    issues.push(`Budget exceeded: ${budgetUsed}/${budgetCeiling} CP — remove a high-cost member or swap for cheaper talent`);
  }

  // Team size check
  const recSize = project.teamSize ?? 5;
  if (allMembers.length < Math.max(3, recSize - 2)) {
    warnings.push(`Team is small (${allMembers.length}) — recommended ${recSize}`);
  }
  if (allMembers.length > recSize + 3) {
    warnings.push(`Team is large (${allMembers.length}) — coordination overhead`);
  }

  // Score the team
  const demand = PROJECT_DEMANDS[project.id];
  const teamScore = allMembers.length >= 2
    ? scoreTeamForProject(allMembers, project, demand, sentiment)
    : null;

  // Estimate delivery points
  let estimatedPoints = 0;
  if (teamScore) {
    const basePoints = GAME_CONFIG.pointsForDelivery.onTime;
    // Margin multiplier
    const gm = project.grossMarginPct ?? 15;
    const marginMult = gm >= 20 ? GAME_CONFIG.marginBonus.above20
      : gm >= 18 ? GAME_CONFIG.marginBonus.above18
      : gm >= 12 ? GAME_CONFIG.marginBonus.below18
      : GAME_CONFIG.marginBonus.below12;
    // Chemistry multiplier
    const chemMult = teamScore.chemistryScore >= 75 ? GAME_CONFIG.chemistryBonus.above75
      : teamScore.chemistryScore >= 55 ? GAME_CONFIG.chemistryBonus.above55
      : GAME_CONFIG.chemistryBonus.below55;
    // Budget efficiency bonus: under budget = bonus, over = penalty
    const budgetMult = budgetStatus.status === "under" ? 1.1
      : budgetStatus.status === "optimal" ? 1.0
      : budgetStatus.status === "tight" ? 0.95
      : 0.7;

    estimatedPoints = Math.round(basePoints * marginMult * chemMult * budgetMult * (teamScore.overallScore / 100));
  }

  return {
    valid: issues.length === 0,
    issues,
    warnings,
    budgetStatus,
    teamScore,
    estimatedPoints,
  };
}

// ─── DIRECTOR LEADERBOARD ────────────────────────────────

export function buildDirectorLeaderboard(
  teams: GameTeam[],
  characters: CommandCharacter[],
): DirectorRecord[] {
  const directors: Map<string, DirectorRecord> = new Map();

  for (const team of teams) {
    const char = characters.find((c) => c.id === team.directorId);
    if (!char) continue;

    if (!directors.has(team.directorId)) {
      directors.set(team.directorId, {
        directorId: team.directorId,
        nickname: char.nickname,
        activeProjects: [],
        totalPoints: 0,
        quarterlyPoints: { Q1: 0, Q2: 0, Q3: 0, Q4: 0 },
        teamsFormed: 0,
        teamsDelivered: 0,
        avgTeamChemistry: 0,
        avgMargin: 0,
        rank: 0,
      });
    }

    const rec = directors.get(team.directorId)!;
    rec.activeProjects.push(team.projectId);
    rec.teamsFormed++;
    rec.totalPoints += team.deliveryPoints;
    if (team.quarterEnded) {
      rec.quarterlyPoints[team.quarterEnded] = (rec.quarterlyPoints[team.quarterEnded] || 0) + team.deliveryPoints;
    }
    if (team.status === "delivered") rec.teamsDelivered++;
    if (team.teamScore) {
      rec.avgTeamChemistry = (rec.avgTeamChemistry * (rec.teamsFormed - 1) + team.teamScore.chemistryScore) / rec.teamsFormed;
    }
  }

  // Rank by total points
  const sorted = [...directors.values()].sort((a, b) => b.totalPoints - a.totalPoints);
  sorted.forEach((d, i) => { d.rank = i + 1; });

  return sorted;
}

// ─── ORG GRADE ───────────────────────────────────────────
// The company-wide score that tells you: are we winning?

export function calculateOrgGrade(teams: GameTeam[]): OrgGrade {
  const delivered = teams.filter((t) => t.status === "delivered");
  const failed = teams.filter((t) => t.status === "failed");
  const totalPoints = teams.reduce((s, t) => s + t.deliveryPoints, 0);

  const avgChemistry = teams.length > 0
    ? Math.round(teams.filter((t) => t.teamScore).reduce((s, t) => s + (t.teamScore?.chemistryScore ?? 0), 0) / Math.max(1, teams.filter((t) => t.teamScore).length))
    : 0;

  const avgMargin = 0; // Would come from actual project data

  // Grade based on points per team (normalized)
  const pointsPerTeam = teams.length > 0 ? totalPoints / teams.length : 0;

  let grade: OrgGrade["grade"];
  let gradeLabel: string;
  let gradeLabelTh: string;

  if (pointsPerTeam >= 150) { grade = "S"; gradeLabel = "Exceptional"; gradeLabelTh = "ยอดเยี่ยม"; }
  else if (pointsPerTeam >= 120) { grade = "A"; gradeLabel = "Excellent"; gradeLabelTh = "ดีเยี่ยม"; }
  else if (pointsPerTeam >= 90) { grade = "B"; gradeLabel = "Good"; gradeLabelTh = "ดี"; }
  else if (pointsPerTeam >= 60) { grade = "C"; gradeLabel = "Average"; gradeLabelTh = "ปานกลาง"; }
  else if (pointsPerTeam >= 30) { grade = "D"; gradeLabel = "Below Average"; gradeLabelTh = "ต่ำกว่าค่าเฉลี่ย"; }
  else { grade = "F"; gradeLabel = "Critical"; gradeLabelTh = "วิกฤต"; }

  return {
    totalPoints,
    totalDelivered: delivered.length,
    totalFailed: failed.length,
    avgChemistry,
    avgMargin,
    grade,
    gradeLabel,
    gradeLabelTh,
  };
}

// ─── SALARY CAP EXAMPLES ─────────────────────────────────
// To show why you can't have all superstars

export function showBudgetTradeoffs(project: TKCProject, characters: CommandCharacter[]): {
  allStars: { cost: number; names: string[]; overBudget: boolean };
  balanced: { cost: number; names: string[]; overBudget: boolean };
  budget: number;
} {
  const budget = calculateBudgetCeiling(project);
  const sorted = [...characters]
    .filter((c) => c.role !== "md" && c.role !== "deputy_md")
    .sort((a, b) => b.ica.overall - a.ica.overall);

  // All-stars: top N by ICA
  const recSize = project.teamSize ?? 5;
  const allStars = sorted.slice(0, recSize);
  const allStarCost = calculateBudgetUsed(allStars);

  // Balanced: 1 top + rest mid-tier
  const topPick = sorted[0];
  const midTier = sorted.filter((c) => c.capacityCost < 90).slice(0, recSize - 1);
  const balanced = [topPick, ...midTier];
  const balancedCost = calculateBudgetUsed(balanced);

  return {
    allStars: { cost: allStarCost, names: allStars.map((c) => c.nickname), overBudget: allStarCost > budget },
    balanced: { cost: balancedCost, names: balanced.map((c) => c.nickname), overBudget: balancedCost > budget },
    budget,
  };
}
