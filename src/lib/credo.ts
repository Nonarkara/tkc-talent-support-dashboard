/**
 * The Credo Framework — inspired by the Ritz-Carlton Credo and
 * Emily Esfahani Smith's four pillars of a meaningful life.
 *
 * ═══════════════════════════════════════════════════════════════
 *
 *   "The Ritz-Carlton is a place where the genuine care and
 *    comfort of our guests is our highest mission."
 *
 *   → BELONGING  — "is a place"
 *   → PURPOSE    — "highest mission"
 *
 *   "We pledge to provide the finest personal service and
 *    facilities for our guests who will always enjoy a warm,
 *    relaxed, yet refined ambience."
 *
 *   → TRANSCENDENCE — "finest service" (being in the zone)
 *
 *   "The Ritz-Carlton experience enlivens the senses, instills
 *    well-being, and fulfills even the unexpressed wishes and
 *    needs of our guests."
 *
 *   → STORY — "the experience" (narrative of lived experience)
 *
 * ═══════════════════════════════════════════════════════════════
 *
 * These four pillars are measured at individual, team, and
 * organizational levels. They are the qualitative-but-measurable
 * dimensions that complement the RPG attribute system.
 *
 * Reference:
 *   - Joseph Michelli, "The New Gold Standard"
 *   - Emily Esfahani Smith, "There's More To Life Than Being Happy" (TED)
 *   - Dr. Non's analysis connecting the Credo to the four pillars
 */

// ─────────────────────────────────────────────────────────────
// PILLAR DEFINITIONS
// ─────────────────────────────────────────────────────────────

export interface CredoPillar {
  code: PillarCode;
  nameEn: string;
  nameTh: string;
  icon: string;
  color: string;
  credoLine: string;
  credoLineTh: string;
  description: string;
  descriptionTh: string;
  /** What HR measures for this pillar */
  metrics: string[];
  /** How RPG attributes map into this pillar */
  attributeWeights: Record<string, number>;
}

export type PillarCode = "belonging" | "purpose" | "transcendence" | "story";

export const CREDO_PILLARS: Record<PillarCode, CredoPillar> = {
  belonging: {
    code: "belonging",
    nameEn: "Belonging",
    nameTh: "ความผูกพัน",
    icon: "🏠",
    color: "#F59E0B", // warm gold
    credoLine: "The Ritz-Carlton is a place...",
    credoLineTh: "ที่นี่คือบ้านของเรา",
    description:
      "Where do you feel you belong? The sense of being part of a tribe, a team, a family.",
    descriptionTh:
      "ความรู้สึกเป็นส่วนหนึ่ง — เป็นทีม เป็นครอบครัว เป็นบ้าน",
    metrics: [
      "Check-in consistency",
      "Team event participation",
      "Peer recognition given & received",
      "Collaboration frequency across teams",
      "Tenure & retention indicators",
    ],
    // CHA + CON contribute most: being social + being consistent
    attributeWeights: { str: 0.05, int: 0.05, wis: 0.15, cha: 0.35, dex: 0.10, con: 0.30 },
  },

  purpose: {
    code: "purpose",
    nameEn: "Purpose",
    nameTh: "เป้าหมาย",
    icon: "⭐",
    color: "#EF4444", // strong red
    credoLine: "...genuine care and comfort is our highest mission.",
    credoLineTh: "ภารกิจสูงสุดของเรา",
    description:
      "Make the purpose of your organization your mission. The drive beyond self.",
    descriptionTh:
      "ทำภารกิจขององค์กรให้เป็นภารกิจของตัวเอง — แรงขับที่เหนือกว่าตัวเอง",
    metrics: [
      "Goal alignment score",
      "Project completion rate",
      "Initiative proposals submitted",
      "Contribution to strategic objectives",
      "Impact beyond own team",
    ],
    // STR + WIS contribute most: delivering + having judgment
    attributeWeights: { str: 0.35, int: 0.15, wis: 0.25, cha: 0.10, dex: 0.05, con: 0.10 },
  },

  transcendence: {
    code: "transcendence",
    nameEn: "Transcendence",
    nameTh: "สมาธิ",
    icon: "✨",
    color: "#8B5CF6", // purple
    credoLine: "We pledge to provide the finest personal service...",
    credoLineTh: "บริการที่ดีที่สุด — อยู่ใน 'โซน'",
    description:
      "Being in the zone. Flow state. To provide the finest, you must transcend the ordinary.",
    descriptionTh:
      "การอยู่ใน 'โซน' — สภาวะ Flow — ต้องเหนือกว่าธรรมดาเพื่อให้สิ่งที่ดีที่สุด",
    metrics: [
      "Deep work hours logged",
      "Skill growth velocity",
      "Innovation output",
      "Quality scores (code review, client feedback)",
      "Learning hours per week",
    ],
    // INT + DEX contribute most: depth + adaptability
    attributeWeights: { str: 0.10, int: 0.35, wis: 0.10, cha: 0.05, dex: 0.30, con: 0.10 },
  },

  story: {
    code: "story",
    nameEn: "Story",
    nameTh: "เรื่องราว",
    icon: "📖",
    color: "#3B82F6", // blue
    credoLine: "...fulfills even the unexpressed wishes and needs.",
    credoLineTh: "สร้างประสบการณ์ที่เหนือความคาดหวัง",
    description:
      "The narrative of your lived experience. Creating experiences, not just outputs.",
    descriptionTh:
      "เรื่องราวของประสบการณ์ที่ใช้ร่วมกัน — สร้างประสบการณ์ ไม่ใช่แค่ผลงาน",
    metrics: [
      "Client satisfaction (NPS)",
      "Internal storytelling (knowledge shared)",
      "Mentoring relationships",
      "Cross-project experience breadth",
      "Career narrative progression",
    ],
    // WIS + CHA contribute most: experience + communication
    attributeWeights: { str: 0.05, int: 0.10, wis: 0.30, cha: 0.30, dex: 0.15, con: 0.10 },
  },
} as const;

export const PILLAR_CODES: PillarCode[] = ["belonging", "purpose", "transcendence", "story"];

// ─────────────────────────────────────────────────────────────
// CREDO SCORES
// ─────────────────────────────────────────────────────────────

export interface CredoScores {
  belonging: number;      // 0-100
  purpose: number;        // 0-100
  transcendence: number;  // 0-100
  story: number;          // 0-100
  overall: number;        // 0-100 (weighted average)
}

/**
 * Calculate a person's Credo pillar scores from their RPG attributes.
 * Each pillar is a weighted sum of the 6 RPG attributes, normalized to 0-100.
 *
 * In production, these would be augmented by real survey data, HR metrics,
 * check-in patterns, etc. For now, attributes serve as the base.
 */
export function calculateCredoScores(
  attrs: { str: number; int: number; wis: number; cha: number; dex: number; con: number },
  /** Optional pulse survey overrides (0-100 each) */
  pulseOverrides?: Partial<Record<PillarCode, number>>,
): CredoScores {
  const scores: Record<PillarCode, number> = {} as Record<PillarCode, number>;

  for (const code of PILLAR_CODES) {
    const pillar = CREDO_PILLARS[code];
    let raw = 0;
    for (const [attr, weight] of Object.entries(pillar.attributeWeights)) {
      raw += (attrs[attr as keyof typeof attrs] ?? 10) * weight;
    }
    // raw is on a 1-20 scale → normalize to 0-100
    const fromAttrs = Math.round(((raw - 1) / 19) * 100);

    // If pulse survey data exists, blend 60% survey + 40% attributes
    if (pulseOverrides?.[code] !== undefined) {
      scores[code] = Math.round(pulseOverrides[code]! * 0.6 + fromAttrs * 0.4);
    } else {
      scores[code] = fromAttrs;
    }
  }

  // Overall: equal weight across all 4 pillars
  const overall = Math.round(
    PILLAR_CODES.reduce((sum, c) => sum + scores[c], 0) / 4
  );

  return { ...scores, overall };
}

/**
 * Calculate team-level Credo scores by averaging individual scores,
 * then applying a synergy bonus for diversity.
 */
export function calculateTeamCredoScores(
  memberScores: CredoScores[],
): CredoScores & { synergyBonus: number } {
  if (memberScores.length === 0) {
    return { belonging: 0, purpose: 0, transcendence: 0, story: 0, overall: 0, synergyBonus: 0 };
  }

  const avg: Record<PillarCode, number> = { belonging: 0, purpose: 0, transcendence: 0, story: 0 };
  for (const m of memberScores) {
    for (const code of PILLAR_CODES) {
      avg[code] += m[code];
    }
  }
  for (const code of PILLAR_CODES) {
    avg[code] = Math.round(avg[code] / memberScores.length);
  }

  // Synergy bonus: if all four pillars are above 40, bonus = 5-15 pts
  // Represents the team's "credo alignment"
  const minPillar = Math.min(...PILLAR_CODES.map((c) => avg[c]));
  const balance = minPillar / Math.max(1, Math.max(...PILLAR_CODES.map((c) => avg[c])));
  const synergyBonus = Math.round(balance * 15);

  const result: Record<PillarCode, number> = { ...avg };
  for (const code of PILLAR_CODES) {
    result[code] = Math.min(100, result[code] + synergyBonus);
  }

  const overall = Math.round(PILLAR_CODES.reduce((sum, c) => sum + result[c], 0) / 4);

  return { ...result, overall, synergyBonus };
}

// ─────────────────────────────────────────────────────────────
// THE CREDO TEXT (for display)
// ─────────────────────────────────────────────────────────────

export const CREDO_LINES = [
  {
    en: "TKC is a place where the genuine growth and wellbeing of our people is our highest mission.",
    th: "TKC คือที่ที่การเติบโตและความเป็นอยู่ที่ดีของทุกคน คือภารกิจสูงสุดของเรา",
    pillars: ["belonging", "purpose"] as PillarCode[],
  },
  {
    en: "We pledge to build the finest teams and environments where everyone will always enjoy a warm, collaborative, yet excellent culture.",
    th: "เราให้คำมั่นว่าจะสร้างทีมและสิ่งแวดล้อมที่ดีที่สุด ที่ทุกคนจะได้สัมผัสวัฒนธรรมที่อบอุ่น ร่วมมือ และเป็นเลิศ",
    pillars: ["belonging", "transcendence"] as PillarCode[],
  },
  {
    en: "The TKC experience enlivens potential, instills purpose, and fulfills even the unexpressed aspirations of our team.",
    th: "ประสบการณ์ TKC จุดประกายศักยภาพ ปลูกฝังเป้าหมาย และเติมเต็มแม้แรงบันดาลใจที่ยังไม่ได้พูดออกมา",
    pillars: ["transcendence", "story"] as PillarCode[],
  },
] as const;

/**
 * TKC adaptation of the four actions from the Credo:
 *
 * 1. Ask yourself where you feel you belong (BELONGING)
 * 2. Make the purpose of TKC your mission (PURPOSE)
 * 3. Pledge to provide the best of your craft (TRANSCENDENCE)
 * 4. Be in the zone — see needs beyond the obvious (STORY)
 */
export const CREDO_ACTIONS = [
  { pillar: "belonging" as PillarCode,     th: "ค้นหาที่ที่คุณรู้สึกเป็นส่วนหนึ่ง",                     en: "Find where you belong" },
  { pillar: "purpose" as PillarCode,       th: "ทำเป้าหมายขององค์กรให้เป็นภารกิจของคุณ",               en: "Make TKC's purpose your mission" },
  { pillar: "transcendence" as PillarCode, th: "ให้คำมั่นว่าจะมอบสิ่งที่ดีที่สุดของคุณ",                 en: "Pledge your finest craft" },
  { pillar: "story" as PillarCode,         th: "อยู่ใน 'โซน' — มองเห็นความต้องการที่ยังไม่ได้พูด",      en: "Be in the zone — see the unseen" },
] as const;
