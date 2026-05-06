/**
 * Talent Engine — The math behind the game.
 *
 * Simple algorithms that work. Not overcomplicated.
 * The system collects data over time to learn:
 * - Who has good chemistry with whom
 * - Who needs support and what kind
 * - Which team compositions produce results
 *
 * Philosophy: Competency > Instruction, Incentive > Force
 */

import { ATTRIBUTE_KEYS } from "./rpg-attributes";
import { type CommandCharacter } from "./command-center-data";
import { type TKCProject } from "./tkc-org";

// ─── PROJECT FIT ─────────────────────────────────────────
// Does this team cover what the project actually needs?

export interface ProjectFitResult {
  fitPct: number;              // 0-100: how well the team covers project needs
  coveredSkills: string[];     // skills that are covered
  missingSkills: string[];     // skills that are NOT covered
  teamSizeMatch: "under" | "optimal" | "over";
  marginStatus: "healthy" | "warning" | "critical";
  insight: string;
}

export function calculateProjectFit(
  team: CommandCharacter[],
  project: TKCProject,
): ProjectFitResult {
  const required = project.requiredSkills ?? [];
  const teamDepts = new Set(team.map((c) => c.deptCode));

  const coveredSkills = required.filter((s) => teamDepts.has(s));
  const missingSkills = required.filter((s) => !teamDepts.has(s));
  const fitPct = required.length > 0
    ? Math.round((coveredSkills.length / required.length) * 100)
    : 100;

  const recSize = project.teamSize ?? 5;
  const teamSizeMatch = team.length < recSize - 1 ? "under"
    : team.length > recSize + 2 ? "over"
    : "optimal";

  const gm = project.grossMarginPct ?? 20;
  const marginStatus = gm >= 18 ? "healthy" : gm >= 12 ? "warning" : "critical";

  let insight: string;
  if (fitPct === 100 && teamSizeMatch === "optimal") {
    insight = "ทีมครอบคลุมทักษะที่ต้องการทั้งหมด ขนาดเหมาะสม";
  } else if (missingSkills.length > 0) {
    insight = `ขาด: ${missingSkills.join(", ")} — ควรเพิ่มคนจากสายงานเหล่านี้`;
  } else if (teamSizeMatch === "under") {
    insight = `ทีมเล็กเกินไป — แนะนำ ${recSize} คน`;
  } else if (teamSizeMatch === "over") {
    insight = `ทีมใหญ่เกินไป — แนะนำ ${recSize} คน`;
  } else {
    insight = "ทีมพร้อม";
  }

  return { fitPct, coveredSkills, missingSkills, teamSizeMatch, marginStatus, insight };
}

// ─── CHANGE READINESS (20-50-30 Rule) ────────────────────
// Classify each person's adoption stance

export type ReadinessLevel = "adopter" | "watcher" | "resistor";

export interface ReadinessResult {
  level: ReadinessLevel;
  score: number;       // 0-100: higher = more ready
  signals: string[];   // what data supports this classification
}

export function classifyChangeReadiness(c: CommandCharacter): ReadinessResult {
  let score = 50; // start neutral
  const signals: string[] = [];

  // High form = engaged = likely adopter
  if (c.form >= 7) { score += 15; signals.push("High form — actively engaged"); }
  else if (c.form < 4) { score -= 15; signals.push("Low form — disengaged"); }

  // Streak = consistency = commitment to the system
  if (c.streakDays > 30) { score += 10; signals.push("Long streak — committed"); }
  else if (c.streakDays < 5) { score -= 10; signals.push("No streak — not using the system"); }

  // High ICA advancement = growth mindset
  if (c.ica.advancement > 60) { score += 10; signals.push("High advancement drive"); }
  else if (c.ica.advancement < 30) { score -= 10; signals.push("Low advancement — comfort zone"); }

  // OCEAN openness = receptive to change
  if (c.ocean.openness > 65) { score += 10; signals.push("High openness to experience"); }
  else if (c.ocean.openness < 35) { score -= 10; signals.push("Low openness — prefers status quo"); }

  // Tenure affects both ways: long tenure + low scores = entrenched
  if (c.tenure > 10 && c.ica.overall < 50) { score -= 15; signals.push("Long tenure, low output — entrenched"); }
  if (c.tenure <= 2 && c.ica.overall > 60) { score += 10; signals.push("New and high-performing — fresh energy"); }

  // Utilization: over-utilized people resist change (no bandwidth)
  if (c.utilization > 90) { score -= 5; signals.push("Over-utilized — no bandwidth for change"); }

  score = Math.max(0, Math.min(100, score));

  const level: ReadinessLevel = score >= 65 ? "adopter" : score >= 35 ? "watcher" : "resistor";

  return { level, score, signals };
}

export function getOrgReadinessDistribution(characters: CommandCharacter[]): {
  adopters: number;
  watchers: number;
  resistors: number;
  adoptersIds: string[];
  resistorsIds: string[];
} {
  const results = characters.map((c) => ({ id: c.id, ...classifyChangeReadiness(c) }));
  return {
    adopters: results.filter((r) => r.level === "adopter").length,
    watchers: results.filter((r) => r.level === "watcher").length,
    resistors: results.filter((r) => r.level === "resistor").length,
    adoptersIds: results.filter((r) => r.level === "adopter").map((r) => r.id),
    resistorsIds: results.filter((r) => r.level === "resistor").map((r) => r.id),
  };
}

// ─── FLIGHT RISK ─────────────────────────────────────────
// High ICA + low compensation = about to leave

export interface FlightRiskResult {
  risk: "low" | "moderate" | "high" | "critical";
  score: number;       // 0-100
  factors: string[];
}

export function calculateFlightRisk(c: CommandCharacter): FlightRiskResult {
  let score = 20; // baseline
  const factors: string[] = [];

  // High ICA + low compensation = classic flight risk
  if (c.ica.overall > 70 && c.fourC.compensation < 50) {
    score += 30;
    factors.push("High performer, low compensation satisfaction");
  }

  // Declining form = losing interest
  if (c.form < 4 && c.ica.overall > 50) {
    score += 20;
    factors.push("Capable but disengaging — form declining");
  }

  // Long tenure with no level growth = stagnation
  if (c.tenure > 5 && c.level < 8) {
    score += 15;
    factors.push("Long tenure, low level — career stagnation");
  }

  // Low career path score = no future here
  if (c.fourC.career < 40) {
    score += 15;
    factors.push("Cannot see career path at TKC");
  }

  // Low community/belonging = not attached
  if (c.fourC.community < 40) {
    score += 10;
    factors.push("Low belonging — not emotionally attached");
  }

  // High demand from other teams = valuable = options
  if (c.demandCount >= 3) {
    score += 10;
    factors.push("High internal demand — has options");
  }

  // HP critical = burned out = leaving
  if (c.hp / c.maxHp < 0.3) {
    score += 15;
    factors.push("Burnout risk — may leave for health reasons");
  }

  score = Math.min(100, score);

  const risk = score >= 70 ? "critical"
    : score >= 50 ? "high"
    : score >= 30 ? "moderate"
    : "low";

  return { risk, score, factors };
}

// ─── SUPPORT NEEDS ───────────────────────────────────────
// What kind of help does this person need most?

export type SupportType = "coaching" | "training" | "workload" | "recognition" | "career" | "compensation" | "belonging";

export interface SupportNeed {
  type: SupportType;
  urgency: "low" | "medium" | "high";
  description: string;
  descriptionTh: string;
}

export function identifySupportNeeds(c: CommandCharacter): SupportNeed[] {
  const needs: SupportNeed[] = [];

  // HP low = workload support
  if (c.hp / c.maxHp < 0.4) {
    needs.push({
      type: "workload",
      urgency: c.hp / c.maxHp < 0.25 ? "high" : "medium",
      description: "Reduce workload or redistribute tasks",
      descriptionTh: "ลดภาระงานหรือกระจายงาน",
    });
  }

  // Low advancement ICA = training
  if (c.ica.advancement < 40) {
    needs.push({
      type: "training",
      urgency: "medium",
      description: "Needs skill development opportunities",
      descriptionTh: "ต้องการโอกาสพัฒนาทักษะ",
    });
  }

  // Low form but high ICA = needs recognition
  if (c.form < 5 && c.ica.overall > 60) {
    needs.push({
      type: "recognition",
      urgency: "high",
      description: "Capable but unmotivated — needs visible recognition",
      descriptionTh: "มีความสามารถแต่ขาดแรงจูงใจ — ต้องการการยอมรับ",
    });
  }

  // Low career 4C = needs career coaching
  if (c.fourC.career < 45) {
    needs.push({
      type: "career",
      urgency: "medium",
      description: "Cannot see career path — needs development plan",
      descriptionTh: "มองไม่เห็นเส้นทางอาชีพ — ต้องการแผนพัฒนา",
    });
  }

  // Low compensation 4C = compensation review
  if (c.fourC.compensation < 40) {
    needs.push({
      type: "compensation",
      urgency: c.ica.overall > 60 ? "high" : "medium",
      description: "Compensation below market — review needed",
      descriptionTh: "ค่าตอบแทนต่ำกว่าตลาด — ต้องทบทวน",
    });
  }

  // Low community = needs belonging
  if (c.fourC.community < 40) {
    needs.push({
      type: "belonging",
      urgency: "medium",
      description: "Feels isolated — connect to team activities",
      descriptionTh: "รู้สึกโดดเดี่ยว — ต้องเชื่อมต่อกับกิจกรรมทีม",
    });
  }

  // Low OCEAN conscientiousness + low form = needs coaching
  if (c.ocean.conscientiousness < 40 && c.form < 5) {
    needs.push({
      type: "coaching",
      urgency: "medium",
      description: "Needs structured guidance and accountability",
      descriptionTh: "ต้องการการแนะนำและความรับผิดชอบที่ชัดเจน",
    });
  }

  // Sort by urgency
  const urgencyOrder = { high: 0, medium: 1, low: 2 };
  needs.sort((a, b) => urgencyOrder[a.urgency] - urgencyOrder[b.urgency]);

  return needs;
}

// ─── CHEMISTRY HISTORY (for long-term learning) ──────────
// Track which pairs work well together over time

export interface PairChemistry {
  personA: string;
  personB: string;
  projectsTogether: number;
  avgTeamScore: number;         // average chemistry when they're on the same team
  collaborationEvents: number;  // times they helped each other
  conflictEvents: number;       // times there was friction
  netChemistry: number;         // positive = good pair, negative = problematic
}

export function calculatePairChemistry(
  a: CommandCharacter,
  b: CommandCharacter,
): number {
  // Value alignment (similar conscientiousness + neuroticism)
  const conscDiff = Math.abs(a.ocean.conscientiousness - b.ocean.conscientiousness);
  const neuroDiff = Math.abs(a.ocean.neuroticism - b.ocean.neuroticism);
  const valueAlign = Math.max(0, 100 - (conscDiff + neuroDiff) / 2);

  // Skill complementarity (different dominant attributes)
  let skillComplement = 0;
  for (const k of ATTRIBUTE_KEYS) {
    // If one is strong where other is weak, that's complementary
    if ((a.attributes[k] > 14 && b.attributes[k] < 10) ||
        (b.attributes[k] > 14 && a.attributes[k] < 10)) {
      skillComplement += 20;
    }
  }
  skillComplement = Math.min(100, skillComplement);

  // Personality compatibility
  // Similar extraversion = good (both want same energy level)
  // Different openness = good (diverse thinking)
  const extDiff = Math.abs(a.ocean.extraversion - b.ocean.extraversion);
  const openDiff = Math.abs(a.ocean.openness - b.ocean.openness);
  const personalityFit = Math.max(0, (100 - extDiff) * 0.5 + openDiff * 0.5);

  // Weighted pair chemistry
  const pairScore = Math.round(
    valueAlign * 0.40 +
    skillComplement * 0.35 +
    personalityFit * 0.25
  );

  return pairScore;
}

// ─── MORNING BRIEF NARRATIVE ─────────────────────────────
// Generate a story from the data

export function generateMorningBrief(
  characters: CommandCharacter[],
  lang: "th" | "en",
): { people: string; projects: string; risks: string; wins: string } {
  const present = characters.filter((c) => c.isPresent);
  const total = characters.length;
  const atRisk = characters.filter((c) => c.status === "at_risk" || c.status === "critical");
  const topPerformers = [...characters].sort((a, b) => b.weeklyPoints - a.weeklyPoints).slice(0, 3);
  const highForm = characters.filter((c) => c.form >= 8);
  const flightRisks = characters.filter((c) => calculateFlightRisk(c).risk === "critical" || calculateFlightRisk(c).risk === "high");
  const readiness = getOrgReadinessDistribution(characters);

  if (lang === "th") {
    return {
      people: `วันนี้มี ${present.length}/${total} คนออนไลน์ ${atRisk.length > 0 ? `${atRisk.length} คนต้องการการสนับสนุน` : "ทุกคนสถานะดี"} การเปลี่ยนแปลง: ${readiness.adopters} พร้อม, ${readiness.watchers} รอดู, ${readiness.resistors} ต้านทาน`,
      projects: `ผู้ทำคะแนนสูงสุดสัปดาห์นี้: ${topPerformers.map((c) => `${c.nickname} (${c.weeklyPoints}pt)`).join(", ")} ${highForm.length > 0 ? `${highForm.length} คนอยู่ในฟอร์มดีเยี่ยม` : ""}`,
      risks: flightRisks.length > 0 ? `⚠️ ${flightRisks.length} คนเสี่ยงออกจากองค์กร — ควรพูดคุยเรื่องค่าตอบแทนและเส้นทางอาชีพ` : "ไม่พบความเสี่ยงเร่งด่วน",
      wins: `องค์กรมี ${readiness.adopters} Early Adopters ที่พร้อมขับเคลื่อนการเปลี่ยนแปลง ${highForm.length >= 5 ? "— โมเมนตัมดี" : ""}`,
    };
  }
  return {
    people: `${present.length}/${total} online today. ${atRisk.length > 0 ? `${atRisk.length} need support.` : "All healthy."} Change readiness: ${readiness.adopters} adopters, ${readiness.watchers} watchers, ${readiness.resistors} resistors.`,
    projects: `Top performers this week: ${topPerformers.map((c) => `${c.nickname} (${c.weeklyPoints}pt)`).join(", ")}. ${highForm.length > 0 ? `${highForm.length} in excellent form.` : ""}`,
    risks: flightRisks.length > 0 ? `⚠️ ${flightRisks.length} critical flight risks — review compensation and career paths immediately.` : "No urgent risks detected.",
    wins: `${readiness.adopters} early adopters ready to drive change. ${highForm.length >= 5 ? "Good momentum." : ""}`,
  };
}
