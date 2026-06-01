/**
 * Match Engine — The CM95 Match Simulation
 *
 * Like Championship Manager: you pick the team, set the formation, click submit.
 * The match plays out with randomness built in. Your perfect 4-4-2 can still lose.
 * The gap between what you predicted and what happened is where learning lives.
 *
 * Philosophy:
 * - Stats matter but aren't everything (the "post" factor)
 * - Random events create stories ("Remember when Mark's team saved the NT project?")
 * - The simulation is transparent: you see WHY the result happened
 * - Over time, directors learn which factors they can control
 */

import { scoreTeamForProject, type TeamProjectScore } from "./snap-engine";
import { calculateChemistry } from "./team-chemistry";
import { type CommandCharacter } from "./command-center-data";
import { type TKCProject } from "./tkc-org";
import { query } from "./db";

// ─── TYPES ─────────────────────────────────────────────────

export type TimelineResult = "early" | "on_time" | "late" | "failed";

export interface MatchEvent {
  minute: number; // 0-90, like a football match
  type: "positive" | "negative" | "neutral" | "critical";
  icon: string; // emoji or lucide name
  headline: string;
  headlineTh: string;
  detail: string;
  detailTh: string;
  impact: number; // -20 to +15, effect on overall score
  involvedPlayerId?: string;
  involvedPlayerName?: string;
}

export interface PlayerStatChange {
  employeeId: string;
  name: string;
  nickname: string;
  changes: {
    hp?: number;
    mp?: number;
    form?: number;
    str?: number;
    int?: number;
    wis?: number;
    cha?: number;
    dex?: number;
    con?: number;
    xp?: number;
  };
  reason: string;
  reasonTh: string;
}

export interface MatchReport {
  projectId: string;
  projectName: string;
  client: string;
  directorId: string;
  directorName: string;
  cycle: string;

  // The prediction (locked in at team selection)
  predicted: {
    fitPct: number;
    chemistryScore: number;
    overallScore: number;
    estimatedPoints: number;
    budgetStatus: "under" | "optimal" | "tight" | "over";
  };

  // The actual result
  actual: {
    timelineStatus: TimelineResult;
    qualityScore: number; // 0-100
    clientSatisfaction: number; // 1-5
    budgetVariancePct: number; // -50 to +50 (negative = under budget = good)
    overallScore: number; // 0-100
    deliveryPoints: number;
    marginAchieved: number; // actual GM %
  };

  // The story
  events: MatchEvent[];
  playerChanges: PlayerStatChange[];
  insights: string[]; // learning points
  insightsTh: string[];

  // Meta
  playedAt: Date;
  randomSeed: string;
}

export interface SimulationInput {
  project: TKCProject;
  team: CommandCharacter[];
  predictedScore: TeamProjectScore;
  estimatedPoints: number;
  budgetStatus: "under" | "optimal" | "tight" | "over";
  directorId: string;
  directorName: string;
  cycle: string;
}

// ─── SIMULATION CONFIG ─────────────────────────────────────

const SIM_CONFIG = {
  // Randomness: standard deviation of the "referee factor"
  // 12 means ~68% of results within ±12 points of prediction
  varianceSigma: 12,

  // Budget overruns are more common than underruns (Murphy's Law)
  budgetBias: 5, // pct (positive = over budget)

  // Quality tends to follow chemistry
  chemistryQualityCorrelation: 0.6,

  // HP drain during project: higher intensity = more drain
  hpDrainBase: 8,
  hpDrainVariance: 6,

  // MP drain: stress-based
  mpDrainBase: 5,
  mpDrainVariance: 5,

  // Form changes
  formBoostOnWin: 1.5,
  formPenaltyOnLoss: -2.0,
  formVariance: 1.0,

  // XP gain
  xpBase: 25,
  xpBonusOnSuccess: 15,

  // Event probabilities (per match)
  eventProbabilities: {
    positive: 0.25, // 25% chance of a good break
    negative: 0.30, // 30% chance of a setback
    critical: 0.08, // 8% chance of a game-changer
  },
};

// ─── RNG ───────────────────────────────────────────────────

/**
 * Seeded RNG for reproducible but unpredictable results.
 * Same seed = same match. Different seed = different story.
 */
function createRng(seed: string) {
  let s = 0;
  for (let i = 0; i < seed.length; i++) {
    s = ((s << 5) - s + seed.charCodeAt(i)) | 0;
  }
  return () => {
    s = (s * 16807 + 0) % 2147483647;
    return (s - 1) / 2147483646;
  };
}

function normalRandom(rng: () => number, mean = 0, sigma = 1): number {
  // Box-Muller transform
  const u1 = rng();
  const u2 = rng();
  const z = Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2);
  return mean + z * sigma;
}

function pickOne<T>(rng: () => number, items: T[]): T {
  return items[Math.floor(rng() * items.length)];
}

function chance(rng: () => number, probability: number): boolean {
  return rng() < probability;
}

function clamp(n: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, n));
}

// ─── EVENT POOLS ───────────────────────────────────────────

interface EventTemplate {
  type: MatchEvent["type"];
  icon: string;
  headline: string;
  headlineTh: string;
  detail: string;
  detailTh: string;
  impact: number;
  weight: number; // selection weight
}

const POSITIVE_EVENTS: EventTemplate[] = [
  {
    type: "positive",
    icon: "⚡",
    headline: "Breakthrough Insight",
    headlineTh: "ความคิดสร้างสรรค์เกิดขึ้น",
    detail: "The team discovered an elegant workaround that saved two weeks.",
    detailTh: "ทีมค้นพบวิธีแก้ปัญหาที่เรียบง่าย ประหยัดเวลาได้สองสัปดาห์",
    impact: 12,
    weight: 1,
  },
  {
    type: "positive",
    icon: "🤝",
    headline: "Vendor Delivered Early",
    headlineTh: "คู่ค้าส่งมอบก่อนกำหนด",
    detail: "A key subcontractor finished their module three days ahead of schedule.",
    detailTh: "คู่ค้ารายสำคัญส่งมอบงานเร็วกว่ากำหนดสามวัน",
    impact: 8,
    weight: 1,
  },
  {
    type: "positive",
    icon: "⭐",
    headline: "Client Impressed",
    headlineTh: "ลูกค้าประทับใจ",
    detail: "The demo exceeded expectations. Client signed off on phase 2 immediately.",
    detailTh: "การสาธิตเกินคาด ลูกค้าอนุมัติเฟส 2 ทันที",
    impact: 10,
    weight: 1,
  },
  {
    type: "positive",
    icon: "🔧",
    headline: "Technical Win",
    headlineTh: "ชัยชนะทางเทคนิค",
    detail: "A risky architecture choice paid off. Performance is 40% above spec.",
    detailTh: "การตัดสินใจด้านสถาปัตยกรรมที่เสี่ยงประสบความสำเร็จ ประสิทธิภาพสูงกว่าเป้า 40%",
    impact: 14,
    weight: 0.7,
  },
];

const NEGATIVE_EVENTS: EventTemplate[] = [
  {
    type: "negative",
    icon: "📋",
    headline: "Scope Creep",
    headlineTh: "ขอบเขตงานขยายตัว",
    detail: "Client added three new requirements after sign-off. Team had to replan.",
    detailTh: "ลูกค้าเพิ่มความต้องการใหม่สามรายการหลังเซ็นอนุมัติ ทีมต้องวางแผนใหม่",
    impact: -10,
    weight: 1,
  },
  {
    type: "negative",
    icon: "🚚",
    headline: "Vendor Delay",
    headlineTh: "คู่ค้าล่าช้า",
    detail: "A critical vendor missed their delivery date by five days.",
    detailTh: "คู่ค้ารายสำคัญส่งมอบช้ากว่ากำหนดห้าวัน",
    impact: -8,
    weight: 1,
  },
  {
    type: "negative",
    icon: "🤒",
    headline: "Key Person Sick",
    headlineTh: "บุคลากรสำคัญลาป่วย",
    detail: "The lead engineer was out for four days with flu during crunch time.",
    detailTh: "วิศวกรหลักลาป่วยสี่วันในช่วงเวลาวิกฤต",
    impact: -7,
    weight: 1,
  },
  {
    type: "negative",
    icon: "🏛️",
    headline: "Regulatory Delay",
    headlineTh: "การอนุมัติจากหน่วยงานล่าช้า",
    detail: "Government approval took two weeks longer than planned.",
    detailTh: "การอนุมัติจากรัฐใช้เวลานานกว่าที่วางแผนไว้สองสัปดาห์",
    impact: -9,
    weight: 0.8,
  },
  {
    type: "negative",
    icon: "💸",
    headline: "Budget Overrun",
    headlineTh: "งบประมาณเกิน",
    detail: "Unexpected equipment costs pushed the project 12% over budget.",
    detailTh: "ค่าใช้จ่ายด้านอุปกรณ์ที่ไม่คาดคิดทำให้โครงการเกินงบ 12%",
    impact: -6,
    weight: 1,
  },
];

const CRITICAL_EVENTS: EventTemplate[] = [
  {
    type: "critical",
    icon: "💥",
    headline: "Major Setback",
    headlineTh: "อุปสรรคร้ายแรง",
    detail: "A critical integration failed in production. Rollback required.",
    detailTh: "การเชื่อมต่อหลักล้มเหลวในระบบจริง ต้องย้อนกลับ",
    impact: -18,
    weight: 1,
  },
  {
    type: "critical",
    icon: "🏆",
    headline: "Epic Win",
    headlineTh: "ชัยชนะครั้งยิ่งใหญ่",
    detail: "The team delivered a solution so elegant that the client asked TKC to lead their national rollout.",
    detailTh: "ทีมส่งมอบโซลูชันที่สมบูรณ์แบบจนลูกค้าขอให้ TKC นำโครงการระดับประเทศ",
    impact: 20,
    weight: 1,
  },
];

// ─── CORE SIMULATION ───────────────────────────────────────

/**
 * Run the match simulation.
 * This is the Championship Manager 95 heart: predicted + randomness + events = actual.
 */
export function simulateMatch(input: SimulationInput): MatchReport {
  const { project, team, predictedScore, estimatedPoints, budgetStatus, directorId, directorName, cycle } = input;

  // Build deterministic seed from team + project
  const teamHash = team.map((t) => t.id).sort().join("-");
  const seed = `${project.id}::${teamHash}::${cycle}`;
  const rng = createRng(seed);

  // ─── 1. BASE VARIANCE (the "referee factor") ─────────────
  const baseVariance = normalRandom(rng, 0, SIM_CONFIG.varianceSigma);

  // ─── 2. EVENTS (the match story) ──────────────────────────
  const events: MatchEvent[] = [];
  let eventImpact = 0;

  // Positive event?
  if (chance(rng, SIM_CONFIG.eventProbabilities.positive)) {
    const tpl = pickOne(rng, POSITIVE_EVENTS);
    const involved = pickOne(rng, team);
    events.push({
      minute: Math.floor(rng() * 90),
      type: tpl.type,
      icon: tpl.icon,
      headline: tpl.headline,
      headlineTh: tpl.headlineTh,
      detail: tpl.detail,
      detailTh: tpl.detailTh,
      impact: tpl.impact,
      involvedPlayerId: involved.id,
      involvedPlayerName: involved.nickname,
    });
    eventImpact += tpl.impact;
  }

  // Negative event?
  if (chance(rng, SIM_CONFIG.eventProbabilities.negative)) {
    const tpl = pickOne(rng, NEGATIVE_EVENTS);
    const involved = pickOne(rng, team);
    events.push({
      minute: Math.floor(rng() * 90),
      type: tpl.type,
      icon: tpl.icon,
      headline: tpl.headline,
      headlineTh: tpl.headlineTh,
      detail: tpl.detail,
      detailTh: tpl.detailTh,
      impact: tpl.impact,
      involvedPlayerId: involved.id,
      involvedPlayerName: involved.nickname,
    });
    eventImpact += tpl.impact;
  }

  // Critical event? (rare but game-changing)
  if (chance(rng, SIM_CONFIG.eventProbabilities.critical)) {
    const tpl = pickOne(rng, CRITICAL_EVENTS);
    const involved = pickOne(rng, team);
    events.push({
      minute: Math.floor(rng() * 90),
      type: tpl.type,
      icon: tpl.icon,
      headline: tpl.headline,
      headlineTh: tpl.headlineTh,
      detail: tpl.detail,
      detailTh: tpl.detailTh,
      impact: tpl.impact,
      involvedPlayerId: involved.id,
      involvedPlayerName: involved.nickname,
    });
    eventImpact += tpl.impact;
  }

  events.sort((a, b) => a.minute - b.minute);

  // ─── 3. COMPUTE ACTUAL SCORE ──────────────────────────────
  const rawActual = clamp(
    predictedScore.overallScore + baseVariance + eventImpact,
    0,
    100,
  );

  // ─── 4. DERIVE OUTCOMES ───────────────────────────────────
  // Timeline status from overall score
  let timelineStatus: TimelineResult;
  if (rawActual >= 90) timelineStatus = "early";
  else if (rawActual >= 65) timelineStatus = "on_time";
  else if (rawActual >= 35) timelineStatus = "late";
  else timelineStatus = "failed";

  // Quality correlates with chemistry + some randomness
  const qualityBase = predictedScore.chemistryScore * SIM_CONFIG.chemistryQualityCorrelation +
    rawActual * (1 - SIM_CONFIG.chemistryQualityCorrelation);
  const qualityScore = clamp(Math.round(qualityBase + normalRandom(rng, 0, 8)), 0, 100);

  // Client satisfaction from quality + timeline
  let satisfactionBase = qualityScore / 20; // 0-5
  if (timelineStatus === "early") satisfactionBase += 0.5;
  if (timelineStatus === "late") satisfactionBase -= 0.8;
  if (timelineStatus === "failed") satisfactionBase -= 2;
  const clientSatisfaction = clamp(Math.round(satisfactionBase + normalRandom(rng, 0, 0.3)), 1, 5);

  // Budget variance: overruns more likely. Over-budget teams bleed more, under-budget have buffer.
  const budgetBase = SIM_CONFIG.budgetBias + (budgetStatus === "under" ? -5 : budgetStatus === "over" ? 10 : 0);
  const budgetVariancePct = clamp(Math.round(budgetBase + normalRandom(rng, 0, 10)), -40, 40);

  // Margin achieved: budget overruns (positive variance) reduce margin.
  const marginAchieved = clamp(
    Math.round((project.grossMarginPct ?? 15) - budgetVariancePct * 0.3 + normalRandom(rng, 0, 3)),
    5,
    45,
  );

  // Delivery points: derived from overall score with margin bonus
  const marginMult = marginAchieved >= 20 ? 1.5 : marginAchieved >= 18 ? 1.2 : marginAchieved >= 12 ? 0.8 : 0.5;
  const timelineMult = timelineStatus === "early" ? 1.3 : timelineStatus === "on_time" ? 1.0 : timelineStatus === "late" ? 0.6 : 0.2;
  const deliveryPoints = Math.round(rawActual * marginMult * timelineMult);

  // ─── 5. PLAYER STAT CHANGES ───────────────────────────────
  const playerChanges: PlayerStatChange[] = team.map((member) => {
    const isWin = rawActual >= 60;
    const isLoss = rawActual < 40;

    const hpDrain = Math.round(SIM_CONFIG.hpDrainBase + normalRandom(rng, 0, SIM_CONFIG.hpDrainVariance));
    const mpDrain = Math.round(SIM_CONFIG.mpDrainBase + normalRandom(rng, 0, SIM_CONFIG.mpDrainVariance));
    const formChange = isWin
      ? SIM_CONFIG.formBoostOnWin + normalRandom(rng, 0, SIM_CONFIG.formVariance)
      : isLoss
        ? SIM_CONFIG.formPenaltyOnLoss + normalRandom(rng, 0, SIM_CONFIG.formVariance)
        : normalRandom(rng, 0, SIM_CONFIG.formVariance);

    const xpGain = Math.round(SIM_CONFIG.xpBase + (isWin ? SIM_CONFIG.xpBonusOnSuccess : 0) + rawActual * 0.2);

    return {
      employeeId: member.id,
      name: member.nickname,
      nickname: member.nickname,
      changes: {
        hp: -hpDrain,
        mp: -mpDrain,
        form: Math.round(formChange * 10) / 10,
        xp: xpGain,
      },
      reason: isWin
        ? `Delivered successfully on ${project.name}`
        : isLoss
          ? `Struggled on ${project.name}`
          : `Completed ${project.name} with mixed results`,
      reasonTh: isWin
        ? `ส่งมอบ ${project.name} สำเร็จ`
        : isLoss
          ? `ประสบปัญหาใน ${project.name}`
          : `เสร็จสิ้น ${project.name} ด้วยผลลัพธ์ผสมผสาน`,
    };
  });

  // ─── 6. INSIGHTS (the learning loop) ──────────────────────
  const insights: string[] = [];
  const insightsTh: string[] = [];

  if (rawActual < predictedScore.overallScore - 15) {
    insights.push("The team underperformed predictions significantly. Check if the skill fit was overestimated.");
    insightsTh.push("ทีมทำผลงานต่ำกว่าที่คาดไว้มาก ตรวจสอบว่าทักษะตรงกับความต้องการหรือไม่");
  }
  if (eventImpact < -10) {
    insights.push("External events hurt this project. Consider building buffer time for vendor-dependent work.");
    insightsTh.push("เหตุการณ์ภายนอกส่งผลกระทบต่อโครงการนี้ พิจารณาเวลาสำรองสำหรับงานที่พึ่งพาคู่ค้า");
  }
  if (predictedScore.chemistryScore < 50 && rawActual < 50) {
    insights.push("Low chemistry predicted failure — and it did. Chemistry is a reliable early warning.");
    insightsTh.push("เคมีทีมต่ำทำนายความล้มเหลว — และเป็นจริง เคมีทีมเป็นสัญญาณเตือนล่วงหน้าที่เชื่อถือได้");
  }
  if (budgetStatus === "over" && rawActual < 60) {
    insights.push("Going over budget AND underdelivering is a red flag. Review resource allocation.");
    insightsTh.push("เกินงบประมาณและส่งมอบต่ำกว่ามาตรฐานเป็นสัญญาณอันตราย ทบทวนการจัดสรรทรัพยากร");
  }
  if (rawActual > predictedScore.overallScore + 10) {
    insights.push("The team overdelivered! Something clicked that the model didn't capture.");
    insightsTh.push("ทีมส่งมอเกินคาด! มีบางอย่างที่โมเดลไม่สามารถจับได้");
  }
  if (insights.length === 0) {
    insights.push("Result was close to prediction. The model is learning well.");
    insightsTh.push("ผลลัพธ์ใกล้เคียงกับการทำนาย โมเดลกำลังเรียนรู้ได้ดี");
  }

  return {
    projectId: project.id,
    projectName: project.name,
    client: project.client,
    directorId,
    directorName,
    cycle,
    predicted: {
      fitPct: predictedScore.fitPct,
      chemistryScore: predictedScore.chemistryScore,
      overallScore: predictedScore.overallScore,
      estimatedPoints,
      budgetStatus,
    },
    actual: {
      timelineStatus,
      qualityScore,
      clientSatisfaction,
      budgetVariancePct,
      overallScore: Math.round(rawActual),
      deliveryPoints,
      marginAchieved,
    },
    events,
    playerChanges,
    insights,
    insightsTh,
    playedAt: new Date(),
    randomSeed: seed,
  };
}

// ─── OUTCOME PERSISTENCE ───────────────────────────────────

/**
 * Save a match report as the official project outcome.
 * This is the "record the result" step — once saved, it's canon.
 */
export async function saveMatchOutcome(report: MatchReport): Promise<void> {
  await query(
    `INSERT INTO project_outcomes (
      project_id, budget_actual_thb, timeline_status, quality_score,
      client_satisfaction, predicted_fit, predicted_chemistry,
      predicted_overall, team_cost_cp, team_size, notes, lessons
    ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
    ON CONFLICT (project_id) DO UPDATE SET
      budget_actual_thb = EXCLUDED.budget_actual_thb,
      timeline_status = EXCLUDED.timeline_status,
      quality_score = EXCLUDED.quality_score,
      client_satisfaction = EXCLUDED.client_satisfaction,
      predicted_fit = EXCLUDED.predicted_fit,
      predicted_chemistry = EXCLUDED.predicted_chemistry,
      predicted_overall = EXCLUDED.predicted_overall,
      team_cost_cp = EXCLUDED.team_cost_cp,
      team_size = EXCLUDED.team_size,
      notes = EXCLUDED.notes,
      lessons = EXCLUDED.lessons`,
    [
      report.projectId,
      // approximate actual budget from variance
      null,
      report.actual.timelineStatus,
      report.actual.qualityScore,
      report.actual.clientSatisfaction,
      report.predicted.fitPct,
      report.predicted.chemistryScore,
      report.predicted.overallScore,
      null, // team_cost_cp would need to be passed separately
      null, // team_size
      report.insights.join("\n"),
      report.insightsTh,
    ],
  );

  // Record game events
  for (const evt of report.events) {
    await query(
      `INSERT INTO game_events (
        type, project_id, employee_id, director_id, description, description_th, impact, created_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, now())`,
      [
        evt.type === "critical" ? "random_event" : evt.type === "positive" ? "random_event" : "random_event",
        report.projectId,
        evt.involvedPlayerId ?? null,
        report.directorId,
        evt.headline + ": " + evt.detail,
        evt.headlineTh + ": " + evt.detailTh,
        evt.impact,
      ],
    );
  }
}
