/**
 * Team Chemistry Engine
 *
 * Based on research from:
 * - Belbin Team Roles: balanced teams outperform homogeneous ones
 * - Tuckman's stages: diversity creates productive friction
 * - Psychological safety (Edmondson): shared CON/resilience builds trust
 * - Complementary skills theory: gaps covered = higher team capability
 *
 * Chemistry score considers:
 * 1. Coverage — are all 6 attributes represented at a high level?
 * 2. Diversity — do we have different class archetypes?
 * 3. Synergy — do members complement each other's weaknesses?
 * 4. Cohesion — enough shared baseline to communicate effectively
 */

import {
  type RPGAttributes,
  ATTRIBUTE_KEYS,
  ATTRIBUTE_META,
  getClass,
} from "./rpg-attributes";

export interface ChemistryReport {
  overall: number; // 0-100
  coverage: number; // 0-100 — are all stats covered?
  diversity: number; // 0-100 — role variety
  synergy: number; // 0-100 — complementary strengths
  cohesion: number; // 0-100 — shared baseline
  insights: ChemistryInsight[];
}

export interface ChemistryInsight {
  type: "strength" | "warning" | "info";
  icon: string;
  text: string;
}

export function calculateChemistry(members: RPGAttributes[]): ChemistryReport {
  if (members.length < 2) {
    return {
      overall: 0,
      coverage: 0,
      diversity: 0,
      synergy: 0,
      cohesion: 0,
      insights: [{ type: "info", icon: "💭", text: "ต้องการอย่างน้อย 2 คนเพื่อวิเคราะห์เคมีทีม" }],
    };
  }

  const coverage = calcCoverage(members);
  const diversity = calcDiversity(members);
  const synergy = calcSynergy(members);
  const cohesion = calcCohesion(members);

  // Weighted average: coverage matters most, then synergy
  const overall = Math.round(
    coverage * 0.30 + diversity * 0.20 + synergy * 0.30 + cohesion * 0.20
  );

  const insights = generateInsights(members, { coverage, diversity, synergy, cohesion });

  return { overall, coverage, diversity, synergy, cohesion, insights };
}

/** Coverage: best member in each stat, normalized */
function calcCoverage(members: RPGAttributes[]): number {
  const maxPerStat = ATTRIBUTE_KEYS.map((k) =>
    Math.max(...members.map((m) => m[k]))
  );
  // Perfect coverage = all stats at 14+. Score drops for each weak stat.
  const target = 14;
  const scores = maxPerStat.map((v) => Math.min(v / target, 1));
  return Math.round((scores.reduce((a, b) => a + b, 0) / 6) * 100);
}

/** Diversity: how many different class archetypes */
function calcDiversity(members: RPGAttributes[]): number {
  const classes = members.map((m) => getClass(m));
  const unique = new Set(classes).size;
  const maxPossible = Math.min(members.length, 6);
  return Math.round((unique / maxPossible) * 100);
}

/** Synergy: do members cover each other's weaknesses? */
function calcSynergy(members: RPGAttributes[]): number {
  let synergyScore = 0;
  let comparisons = 0;

  for (let i = 0; i < members.length; i++) {
    for (let j = i + 1; j < members.length; j++) {
      const a = members[i];
      const b = members[j];
      // For each stat, if one is weak (<8) and the other is strong (>12), that's synergy
      let pairSynergy = 0;
      for (const k of ATTRIBUTE_KEYS) {
        if ((a[k] < 8 && b[k] > 12) || (b[k] < 8 && a[k] > 12)) {
          pairSynergy++;
        }
      }
      synergyScore += pairSynergy / 6; // normalize per pair
      comparisons++;
    }
  }

  return comparisons > 0
    ? Math.round((synergyScore / comparisons) * 100)
    : 0;
}

/** Cohesion: shared baseline — how close are members in CHA and CON (communication + reliability) */
function calcCohesion(members: RPGAttributes[]): number {
  // Lower variance in CHA and CON = better cohesion (people who communicate and persist similarly)
  const chaValues = members.map((m) => m.cha);
  const conValues = members.map((m) => m.con);

  const chaVariance = variance(chaValues);
  const conVariance = variance(conValues);
  const avgVariance = (chaVariance + conVariance) / 2;

  // Low variance (< 2) = high cohesion (100), high variance (> 8) = low cohesion (0)
  const score = Math.max(0, Math.min(100, Math.round((1 - avgVariance / 8) * 100)));
  return score;
}

function variance(values: number[]): number {
  const mean = values.reduce((a, b) => a + b, 0) / values.length;
  return values.reduce((sum, v) => sum + (v - mean) ** 2, 0) / values.length;
}

function generateInsights(
  members: RPGAttributes[],
  scores: { coverage: number; diversity: number; synergy: number; cohesion: number }
): ChemistryInsight[] {
  const insights: ChemistryInsight[] = [];

  // Coverage insights
  const maxPerStat: Record<string, number> = {};
  for (const k of ATTRIBUTE_KEYS) {
    maxPerStat[k] = Math.max(...members.map((m) => m[k]));
  }

  for (const k of ATTRIBUTE_KEYS) {
    if (maxPerStat[k] < 8) {
      const meta = ATTRIBUTE_META[k];
      insights.push({
        type: "warning",
        icon: meta.icon,
        text: `${meta.meaningTh} (${meta.label}) ต่ำมาก — ไม่มีใครในทีมเก่งด้านนี้`,
      });
    } else if (maxPerStat[k] >= 16) {
      const meta = ATTRIBUTE_META[k];
      insights.push({
        type: "strength",
        icon: meta.icon,
        text: `${meta.meaningTh} (${meta.label}) ยอดเยี่ยม!`,
      });
    }
  }

  // Diversity
  const classes = members.map((m) => getClass(m));
  const unique = new Set(classes);
  if (unique.size >= 4) {
    insights.push({ type: "strength", icon: "🌈", text: "ทีมมีความหลากหลายของบทบาทสูง" });
  } else if (unique.size === 1 && members.length > 2) {
    insights.push({ type: "warning", icon: "⚠️", text: "ทุกคนเป็นประเภทเดียวกัน — อาจขาดมุมมองที่แตกต่าง" });
  }

  // Cohesion
  if (scores.cohesion >= 75) {
    insights.push({ type: "strength", icon: "🤝", text: "ทีมมีความสอดคล้องในการสื่อสารสูง" });
  } else if (scores.cohesion < 35) {
    insights.push({ type: "warning", icon: "💬", text: "สมาชิกมีสไตล์การสื่อสารต่างกันมาก — อาจต้องมีกติการ่วม" });
  }

  // Synergy
  if (scores.synergy >= 60) {
    insights.push({ type: "strength", icon: "⚡", text: "สมาชิกเสริมจุดอ่อนของกันและกันได้ดี" });
  }

  // Size
  if (members.length >= 4 && members.length <= 6) {
    insights.push({ type: "info", icon: "👥", text: `ขนาดทีม ${members.length} คน — เหมาะสม` });
  } else if (members.length > 8) {
    insights.push({ type: "warning", icon: "📢", text: "ทีมใหญ่เกินไป — การสื่อสารอาจช้าลง" });
  }

  return insights;
}

// ═══════════════════════════════════════════════════════════
// ADVANCED TEAM ANALYSIS — Org Psychology Layer
// Based on: Belbin, Tuckman, Google Aristotle, Herzberg,
//           SDT, JD-R, Scott Page, Ringelmann
// ═══════════════════════════════════════════════════════════

export interface AdvancedTeamAnalysis {
  chemistry: ChemistryReport;
  communicationChannels: number;
  sizeVerdict: string;
  groupthinkRisk: number; // 0-100
  socialLoafingRisk: number; // 0-100
  cognitiveRange: number; // 0-100
  warnings: string[];
  recommendations: string[];
}

/**
 * Advanced team analysis that wraps the basic chemistry
 * and adds org psychology insights.
 */
export function analyzeTeamAdvanced(
  members: RPGAttributes[],
  ocean?: { openness: number; conscientiousness: number; extraversion: number; agreeableness: number; neuroticism: number }[]
): AdvancedTeamAnalysis {
  const chemistry = calculateChemistry(members);
  const n = members.length;
  const warnings: string[] = [];
  const recommendations: string[] = [];

  // Communication overhead (Dunbar / Brooks's Law)
  const communicationChannels = n * (n - 1) / 2;

  let sizeVerdict: string;
  if (n <= 2) sizeVerdict = "ทีมเล็กเกินไป — ขาดความหลากหลาย";
  else if (n <= 4) sizeVerdict = "ทีมกระชับ — ตัดสินใจเร็ว แต่ขาดความลึก";
  else if (n <= 7) sizeVerdict = "ขนาดเหมาะสม — สมดุลระหว่างความหลากหลายและการประสาน";
  else if (n <= 10) sizeVerdict = "ทีมใหญ่ — ต้องมีโครงสร้างย่อย";
  else sizeVerdict = `${communicationChannels} ช่องทางสื่อสาร — ต้องแบ่งเป็นทีมย่อย`;

  if (n > 7) {
    warnings.push(`📢 ${communicationChannels} ช่องทางสื่อสาร — ทีม ${n} คนมีค่าใช้จ่ายในการประสานงานสูง`);
  }

  // Cognitive Range (Scott Page's diversity)
  // Measure the spread of thinking styles (INT + WIS variance)
  const intValues = members.map((m) => m.int);
  const wisValues = members.map((m) => m.wis);
  const intVariance = v(intValues);
  const wisVariance = v(wisValues);
  const cognitiveRange = Math.min(100, Math.round(
    (intVariance + wisVariance) / 2 * (100 / 25)
  ));

  if (cognitiveRange < 20 && n >= 3) {
    warnings.push("🧠 ความหลากหลายทางความคิดต่ำ — ทุกคนคิดเหมือนกัน ดีสำหรับงานประจำ แต่ไม่ดีสำหรับนวัตกรรม");
    recommendations.push("เพิ่มคนที่มี INT หรือ WIS แตกต่างจากทีมปัจจุบัน");
  }

  // Groupthink Risk
  // High cohesion + low CHA variance + all similar types
  let groupthinkRisk = 0;
  if (n >= 3) {
    const chaValues = members.map((m) => m.cha);
    const chaVariance = v(chaValues);
    const classes = members.map((m) => getClass(m));
    const uniqueClasses = new Set(classes).size;

    if (chemistry.cohesion > 80 && uniqueClasses <= 2) groupthinkRisk += 35;
    if (chaVariance < 4 && n >= 4) groupthinkRisk += 25;
    if (cognitiveRange < 25) groupthinkRisk += 20;

    // OCEAN agreeableness check (if available)
    if (ocean && ocean.length === n) {
      const agreeVariance = v(ocean.map((o) => o.agreeableness));
      const avgAgree = ocean.reduce((s, o) => s + o.agreeableness, 0) / n;
      if (agreeVariance < 100 && avgAgree > 70) groupthinkRisk += 20;
    }

    groupthinkRisk = Math.min(100, groupthinkRisk);

    if (groupthinkRisk >= 50) {
      warnings.push("⚠️ ความเสี่ยงกลุ่มคิดเหมือนกัน (Groupthink) — ทีมเห็นด้วยหมดไม่ใช่สัญญาณดี แปลว่าไม่มีใครกล้าคัดค้าน");
      recommendations.push("กำหนดบทบาท 'ผู้คัดค้านเชิงสร้างสรรค์' (Devil's Advocate) ในทุกการตัดสินใจสำคัญ");
    }
  }

  // Social Loafing Risk (Ringelmann Effect)
  // Increases with team size: ~7% loss per additional member
  const socialLoafingRisk = Math.min(80, Math.max(0,
    (n - 3) * 13
  ));

  if (socialLoafingRisk > 40) {
    warnings.push(`👻 ความเสี่ยง Social Loafing — ทีม ${n} คนมีโอกาสที่บางคนจะลดความพยายามลง`);
    recommendations.push("ทำให้ผลงานของแต่ละคนมองเห็นได้ชัดเจน (individual accountability)");
  }

  // Missing role categories (Belbin-inspired)
  const maxPerStat: Record<string, number> = {};
  for (const k of ATTRIBUTE_KEYS) {
    maxPerStat[k] = Math.max(...members.map((m) => m[k]));
  }
  // Action (STR+CON), People (CHA+DEX), Thinking (INT+WIS)
  const actionMax = Math.max(maxPerStat.str, maxPerStat.con);
  const peopleMax = Math.max(maxPerStat.cha, maxPerStat.dex);
  const thinkingMax = Math.max(maxPerStat.int, maxPerStat.wis);

  if (actionMax < 10) {
    warnings.push("⚒️ ขาดคนลงมือทำ (Action) — ทีมคิดเก่งแต่ส่งมอบงานไม่ได้");
    recommendations.push("เพิ่มคนที่มี STR หรือ CON สูง (Implementer/Completer)");
  }
  if (peopleMax < 10) {
    warnings.push("💬 ขาดคนประสานงาน (People) — ทีมอาจมีปัญหาในการสื่อสารและทำงานร่วมกัน");
    recommendations.push("เพิ่มคนที่มี CHA หรือ DEX สูง (Coordinator/Teamworker)");
  }
  if (thinkingMax < 10) {
    warnings.push("🧪 ขาดนักคิด (Thinking) — ทีมอาจขาดการวิเคราะห์เชิงลึกและความคิดสร้างสรรค์");
    recommendations.push("เพิ่มคนที่มี INT หรือ WIS สูง (Plant/Monitor-Evaluator)");
  }

  return {
    chemistry,
    communicationChannels,
    sizeVerdict,
    groupthinkRisk,
    socialLoafingRisk,
    cognitiveRange,
    warnings: [...chemistry.insights.filter((i) => i.type === "warning").map((i) => i.text), ...warnings],
    recommendations,
  };
}

/** Variance helper */
function v(values: number[]): number {
  if (values.length === 0) return 0;
  const mean = values.reduce((a, b) => a + b, 0) / values.length;
  return values.reduce((sum, val) => sum + (val - mean) ** 2, 0) / values.length;
}
