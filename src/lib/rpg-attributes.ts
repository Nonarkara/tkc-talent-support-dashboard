/**
 * RPG Attribute System — grounded in workplace psychology research.
 *
 * Maps classic RPG stats to real competencies:
 *
 * STR (Strength)     → Execution — ability to deliver, ship, close
 *                      Grounded in: conscientiousness (Big Five), Implementer (Belbin)
 *
 * INT (Intelligence) → Analysis — technical depth, problem-solving, systems thinking
 *                      Grounded in: openness to experience (Big Five), Plant/Specialist (Belbin)
 *
 * WIS (Wisdom)       → Experience — domain knowledge, judgment, pattern recognition
 *                      Grounded in: crystallized intelligence (Cattell), Monitor Evaluator (Belbin)
 *
 * CHA (Charisma)     → Influence — communication, leadership, client-facing
 *                      Grounded in: extraversion (Big Five), Coordinator/Resource Investigator (Belbin)
 *
 * DEX (Dexterity)    → Adaptability — learning speed, versatility, cross-functional
 *                      Grounded in: cognitive flexibility, Teamworker (Belbin)
 *
 * CON (Constitution) → Resilience — consistency, stress tolerance, reliability
 *                      Grounded in: emotional stability/neuroticism (Big Five), Completer Finisher (Belbin)
 */

export interface RPGAttributes {
  str: number; // 1-20
  int: number;
  wis: number;
  cha: number;
  dex: number;
  con: number;
}

export const ATTRIBUTE_META = {
  str: {
    code: "str",
    label: "STR",
    nameTh: "พลัง",
    nameEn: "Strength",
    meaning: "Execution",
    meaningTh: "ความสามารถในการส่งมอบ",
    color: "#EF4444",
    icon: "⚔️",
  },
  int: {
    code: "int",
    label: "INT",
    nameTh: "ปัญญา",
    nameEn: "Intelligence",
    meaning: "Analysis",
    meaningTh: "การวิเคราะห์และแก้ปัญหา",
    color: "#3B82F6",
    icon: "🧠",
  },
  wis: {
    code: "wis",
    label: "WIS",
    nameTh: "ปราชญ์",
    nameEn: "Wisdom",
    meaning: "Experience",
    meaningTh: "ประสบการณ์และวิจารณญาณ",
    color: "#8B5CF6",
    icon: "📖",
  },
  cha: {
    code: "cha",
    label: "CHA",
    nameTh: "เสน่ห์",
    nameEn: "Charisma",
    meaning: "Influence",
    meaningTh: "การสื่อสารและภาวะผู้นำ",
    color: "#F59E0B",
    icon: "👑",
  },
  dex: {
    code: "dex",
    label: "DEX",
    nameTh: "ว่องไว",
    nameEn: "Dexterity",
    meaning: "Adaptability",
    meaningTh: "ความยืดหยุ่นและเรียนรู้เร็ว",
    color: "#10B981",
    icon: "🌀",
  },
  con: {
    code: "con",
    label: "CON",
    nameTh: "อึด",
    nameEn: "Constitution",
    meaning: "Resilience",
    meaningTh: "ความอดทนและความสม่ำเสมอ",
    color: "#6366F1",
    icon: "🛡️",
  },
} as const;

export type AttributeKey = keyof RPGAttributes;
export const ATTRIBUTE_KEYS: AttributeKey[] = ["str", "int", "wis", "cha", "dex", "con"];

/** Generate random attributes with a total budget (like classic D&D point buy) */
export function rollAttributes(seed?: number): RPGAttributes {
  const rng = seed !== undefined ? seededRandom(seed) : Math.random;
  // Total points budget: 60 (average 10 per stat, range 4-18)
  const budget = 60;
  const min = 4;
  const max = 18;
  const attrs = ATTRIBUTE_KEYS.map(() => min);
  let remaining = budget - min * 6;

  // Distribute remaining points randomly
  while (remaining > 0) {
    const idx = Math.floor(rng() * 6);
    if (attrs[idx] < max) {
      attrs[idx]++;
      remaining--;
    }
  }

  return {
    str: attrs[0],
    int: attrs[1],
    wis: attrs[2],
    cha: attrs[3],
    dex: attrs[4],
    con: attrs[5],
  };
}

/** Seeded PRNG for deterministic character generation */
function seededRandom(seed: number) {
  let s = seed;
  return () => {
    s = (s * 16807 + 0) % 2147483647;
    return (s - 1) / 2147483646;
  };
}

/** RPG class archetypes based on dominant attributes */
export type RPGClass =
  | "warrior"    // STR dominant — the executor, project closer
  | "mage"       // INT dominant — the analyst, architect
  | "sage"       // WIS dominant — the veteran, advisor
  | "bard"       // CHA dominant — the communicator, leader
  | "ranger"     // DEX dominant — the versatile, cross-functional
  | "paladin";   // CON dominant — the reliable, backbone

export const CLASS_META: Record<RPGClass, { nameTh: string; nameEn: string; emoji: string; color: string }> = {
  warrior:  { nameTh: "นักรบ",     nameEn: "Warrior",  emoji: "⚔️", color: "#EF4444" },
  mage:     { nameTh: "จอมเวท",    nameEn: "Mage",     emoji: "🧙", color: "#3B82F6" },
  sage:     { nameTh: "ปราชญ์",    nameEn: "Sage",     emoji: "📚", color: "#8B5CF6" },
  bard:     { nameTh: "นักกวี",    nameEn: "Bard",     emoji: "🎭", color: "#F59E0B" },
  ranger:   { nameTh: "เรนเจอร์",  nameEn: "Ranger",   emoji: "🏹", color: "#10B981" },
  paladin:  { nameTh: "อัศวิน",    nameEn: "Paladin",  emoji: "🛡️", color: "#6366F1" },
};

export function getClass(attrs: RPGAttributes): RPGClass {
  const entries: [RPGClass, number][] = [
    ["warrior", attrs.str],
    ["mage", attrs.int],
    ["sage", attrs.wis],
    ["bard", attrs.cha],
    ["ranger", attrs.dex],
    ["paladin", attrs.con],
  ];
  entries.sort((a, b) => b[1] - a[1]);
  return entries[0][0];
}

/**
 * Team composition analysis.
 * A balanced party needs coverage across all attributes.
 * Returns a score 0-100 and diagnostic.
 */
export interface TeamAnalysis {
  score: number;
  avgAttributes: RPGAttributes;
  maxAttributes: RPGAttributes;
  coverage: Record<AttributeKey, "weak" | "ok" | "strong">;
  warnings: string[];
  strengths: string[];
}

export function analyzeTeam(members: RPGAttributes[]): TeamAnalysis {
  if (members.length === 0) {
    return {
      score: 0,
      avgAttributes: { str: 0, int: 0, wis: 0, cha: 0, dex: 0, con: 0 },
      maxAttributes: { str: 0, int: 0, wis: 0, cha: 0, dex: 0, con: 0 },
      coverage: { str: "weak", int: "weak", wis: "weak", cha: "weak", dex: "weak", con: "weak" },
      warnings: ["ยังไม่มีสมาชิกในทีม"],
      strengths: [],
    };
  }

  const avg: RPGAttributes = { str: 0, int: 0, wis: 0, cha: 0, dex: 0, con: 0 };
  const max: RPGAttributes = { str: 0, int: 0, wis: 0, cha: 0, dex: 0, con: 0 };

  for (const m of members) {
    for (const k of ATTRIBUTE_KEYS) {
      avg[k] += m[k];
      max[k] = Math.max(max[k], m[k]);
    }
  }
  for (const k of ATTRIBUTE_KEYS) {
    avg[k] = Math.round(avg[k] / members.length);
  }

  // Coverage: how well each attribute is covered by the best member
  const coverage: Record<string, "weak" | "ok" | "strong"> = {} as Record<AttributeKey, "weak" | "ok" | "strong">;
  for (const k of ATTRIBUTE_KEYS) {
    if (max[k] >= 14) coverage[k] = "strong";
    else if (max[k] >= 9) coverage[k] = "ok";
    else coverage[k] = "weak";
  }

  // Score: based on coverage balance (penalize gaps)
  const coverageValues = ATTRIBUTE_KEYS.map((k) => max[k]);
  const minCoverage = Math.min(...coverageValues);
  const avgCoverage = coverageValues.reduce((a, b) => a + b, 0) / 6;
  const balance = minCoverage / avgCoverage; // 1.0 = perfectly balanced
  const rawScore = (avgCoverage / 18) * 60 + balance * 40;
  const score = Math.min(100, Math.round(rawScore));

  // Diagnostics
  const warnings: string[] = [];
  const strengths: string[] = [];

  for (const k of ATTRIBUTE_KEYS) {
    const meta = ATTRIBUTE_META[k];
    if (coverage[k] === "weak") {
      warnings.push(`${meta.icon} ${meta.meaningTh} (${meta.label}) อ่อน — ต้องการคนที่เก่งด้านนี้`);
    }
    if (coverage[k] === "strong") {
      strengths.push(`${meta.icon} ${meta.meaningTh} (${meta.label}) แข็งแกร่ง`);
    }
  }

  if (members.length < 3) {
    warnings.push("⚠️ ทีมเล็กเกินไป — แนะนำ 4-6 คน");
  }
  if (members.length > 8) {
    warnings.push("⚠️ ทีมใหญ่เกินไป — อาจสื่อสารยาก");
  }

  // Check class diversity
  const classes = members.map((m) => getClass(m));
  const uniqueClasses = new Set(classes);
  if (uniqueClasses.size === 1 && members.length > 2) {
    warnings.push("⚠️ ทุกคนเป็นประเภทเดียวกัน — ทีมขาดความหลากหลาย");
  }
  if (uniqueClasses.size >= 4) {
    strengths.push("🌈 ทีมมีความหลากหลายสูง");
  }

  return {
    score,
    avgAttributes: avg,
    maxAttributes: max,
    coverage: coverage as Record<AttributeKey, "weak" | "ok" | "strong">,
    warnings,
    strengths,
  };
}
