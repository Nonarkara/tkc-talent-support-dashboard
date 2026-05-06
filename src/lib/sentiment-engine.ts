/**
 * Sentiment Engine
 *
 * Converts qualitative user notes into compact numbers the game can use.
 * The expensive part, if any, is allowed only at capture time. Formation,
 * readiness, chemistry, and delivery rules consume this normalized shape
 * synchronously.
 */

export type SentimentLabel = "positive" | "neutral" | "negative" | "mixed";

export interface SentimentVector {
  morale: number;   // 0..100, higher is better
  trust: number;    // 0..100, higher is better
  energy: number;   // 0..100, higher is better
  clarity: number;  // 0..100, higher is better
  momentum: number; // 0..100, higher is better
  risk: number;     // 0..100, higher is worse
}

export interface SentimentSignal {
  label: SentimentLabel;
  score: number;
  confidence: number;
  vector: SentimentVector;
  drivers: string[];
  symptoms: string[];
  source: string;
  created_at?: string;
}

export interface SentimentRuleModifiers {
  chemistry_delta: number;
  readiness_delta: number;
  form_delta: number;
  hp_pressure: number;
  mp_pressure: number;
}

export interface SentimentTextSample {
  text: string;
  source?: string;
  created_at?: string;
}

export const NEUTRAL_SENTIMENT: SentimentSignal = {
  label: "neutral",
  score: 50,
  confidence: 0.2,
  vector: {
    morale: 50,
    trust: 50,
    energy: 50,
    clarity: 50,
    momentum: 50,
    risk: 25,
  },
  drivers: [],
  symptoms: [],
  source: "neutral",
};

const POSITIVE_TERMS = [
  "clear",
  "smooth",
  "good",
  "great",
  "fast",
  "solved",
  "happy",
  "stable",
  "supportive",
  "on time",
  "approved",
  "trusted",
  "trust",
  "helpful",
  "confident",
  "proud",
  "growth",
  "learning",
  "aligned",
  "calm",
  "unblocked",
  "done",
  "delivered",
  "ขอบคุณ",
  "ดี",
  "ชัดเจน",
  "สำเร็จ",
  "ราบรื่น",
  "ไว",
  "มั่นใจ",
  "ภูมิใจ",
  "ช่วย",
  "เข้าใจ",
];

const NEGATIVE_TERMS = [
  "blocked",
  "delay",
  "late",
  "unclear",
  "tired",
  "burn",
  "vendor",
  "paperwork",
  "stuck",
  "friction",
  "scope",
  "conflict",
  "angry",
  "confused",
  "overloaded",
  "fatigue",
  "rework",
  "waiting",
  "lonely",
  "no support",
  "ล่าช้า",
  "ไม่ชัด",
  "เหนื่อย",
  "หมดไฟ",
  "ติด",
  "ปัญหา",
  "ขัดแย้ง",
  "กดดัน",
];

const AXIS_TERMS: Record<
  keyof SentimentVector,
  { positive: string[]; negative: string[]; positiveLabel: string; negativeLabel: string }
> = {
  morale: {
    positive: ["happy", "proud", "supportive", "calm", "ขอบคุณ", "ภูมิใจ"],
    negative: ["angry", "lonely", "no support", "friction", "ขัดแย้ง"],
    positiveLabel: "Morale lift",
    negativeLabel: "Morale drag",
  },
  trust: {
    positive: ["trusted", "trust", "supportive", "aligned", "เข้าใจ"],
    negative: ["conflict", "unclear", "friction", "no support", "ไม่ชัด"],
    positiveLabel: "Trust signal",
    negativeLabel: "Trust fracture",
  },
  energy: {
    positive: ["fast", "done", "delivered", "growth", "learning", "ไว"],
    negative: ["tired", "burn", "overloaded", "fatigue", "เหนื่อย", "หมดไฟ", "กดดัน"],
    positiveLabel: "Energy available",
    negativeLabel: "Fatigue signal",
  },
  clarity: {
    positive: ["clear", "smooth", "approved", "aligned", "ชัดเจน", "ราบรื่น"],
    negative: ["unclear", "confused", "scope", "paperwork", "waiting", "ไม่ชัด"],
    positiveLabel: "Direction clear",
    negativeLabel: "Direction blur",
  },
  momentum: {
    positive: ["solved", "done", "delivered", "approved", "unblocked", "สำเร็จ"],
    negative: ["blocked", "delay", "late", "stuck", "rework", "ล่าช้า", "ติด"],
    positiveLabel: "Execution moving",
    negativeLabel: "Execution blockage",
  },
  risk: {
    positive: ["stable", "calm", "smooth", "ราบรื่น"],
    negative: ["burn", "conflict", "blocked", "late", "vendor", "scope", "หมดไฟ", "ขัดแย้ง"],
    positiveLabel: "Risk cooling",
    negativeLabel: "Risk cluster",
  },
};

function clamp(value: number, min = 0, max = 100) {
  return Math.max(min, Math.min(max, value));
}

function round1(value: number) {
  return Math.round(value * 10) / 10;
}

function hits(text: string, terms: string[]) {
  const found: string[] = [];
  for (const term of terms) {
    if (text.includes(term.toLowerCase())) found.push(term);
  }
  return found;
}

function scoreToLabel(score: number, posHits: number, negHits: number): SentimentLabel {
  if (posHits > 0 && negHits > 0 && Math.abs(posHits - negHits) <= 2) return "mixed";
  if (score >= 64) return "positive";
  if (score <= 42) return "negative";
  return "neutral";
}

function uniq(list: string[]) {
  return Array.from(new Set(list)).slice(0, 5);
}

function sourceWeight(source: string | undefined) {
  if (source === "staff") return 1.2;
  if (source === "hr") return 1.1;
  if (source === "gemini") return 1.05;
  if (source === "observation") return 1.05;
  return 1;
}

function signalWeight(signal: SentimentSignal, now: number, halfLifeDays: number) {
  const created = signal.created_at ? new Date(signal.created_at).getTime() : now;
  const ageDays = Number.isFinite(created) ? Math.max(0, (now - created) / 86_400_000) : 0;
  const recency = Math.pow(0.5, ageDays / halfLifeDays);
  return Math.max(0.05, signal.confidence) * sourceWeight(signal.source) * recency;
}

function fromLegacyLabel(label: SentimentLabel, source: string, created_at?: string): SentimentSignal {
  const scoreByLabel: Record<SentimentLabel, number> = {
    positive: 70,
    neutral: 50,
    negative: 34,
    mixed: 52,
  };
  const riskByLabel: Record<SentimentLabel, number> = {
    positive: 18,
    neutral: 25,
    negative: 62,
    mixed: 45,
  };
  const score = scoreByLabel[label];
  return {
    label,
    score,
    confidence: label === "neutral" ? 0.35 : 0.55,
    vector: {
      morale: score,
      trust: score,
      energy: score,
      clarity: score,
      momentum: score,
      risk: riskByLabel[label],
    },
    drivers: label === "positive" ? ["Positive field sentiment"] : [],
    symptoms: label === "negative" ? ["Negative field sentiment"] : label === "mixed" ? ["Mixed field sentiment"] : [],
    source,
    created_at,
  };
}

export function scoreTextSentiment(
  text: string,
  options: { source?: string; created_at?: string } = {},
): SentimentSignal {
  const lower = text.trim().toLowerCase();
  if (!lower) return { ...NEUTRAL_SENTIMENT, source: options.source ?? "heuristic", created_at: options.created_at };

  const pos = hits(lower, POSITIVE_TERMS);
  const neg = hits(lower, NEGATIVE_TERMS);
  const drivers: string[] = [];
  const symptoms: string[] = [];

  const vector = {} as SentimentVector;
  for (const key of Object.keys(AXIS_TERMS) as Array<keyof SentimentVector>) {
    const axis = AXIS_TERMS[key];
    const axisPos = hits(lower, axis.positive).length;
    const axisNeg = hits(lower, axis.negative).length;

    if (axisPos > 0) drivers.push(axis.positiveLabel);
    if (axisNeg > 0) symptoms.push(axis.negativeLabel);

    if (key === "risk") {
      vector[key] = clamp(25 + axisNeg * 13 + neg.length * 4 - axisPos * 5);
    } else {
      vector[key] = clamp(55 + axisPos * 10 + pos.length * 2 - axisNeg * 12 - neg.length * 3);
    }
  }

  const score = Math.round(
    vector.morale * 0.24 +
      vector.trust * 0.18 +
      vector.energy * 0.18 +
      vector.clarity * 0.18 +
      vector.momentum * 0.17 -
      vector.risk * 0.15 +
      4,
  );
  const boundedScore = clamp(score);
  const evidenceCount = pos.length + neg.length;
  const confidence = round1(clamp(0.25 + evidenceCount * 0.08 + Math.min(0.15, lower.length / 900), 0.2, 0.9));

  return {
    label: scoreToLabel(boundedScore, pos.length, neg.length),
    score: boundedScore,
    confidence,
    vector,
    drivers: uniq(drivers),
    symptoms: uniq(symptoms),
    source: options.source ?? "heuristic",
    created_at: options.created_at,
  };
}

export function normalizeSentimentSignal(
  raw: unknown,
  fallbackText = "",
  options: { source?: string; created_at?: string } = {},
): SentimentSignal {
  if (typeof raw === "string") {
    const label = raw.toLowerCase() as SentimentLabel;
    if (label === "positive" || label === "neutral" || label === "negative" || label === "mixed") {
      return fromLegacyLabel(label, options.source ?? "legacy", options.created_at);
    }
  }

  if (raw == null || typeof raw !== "object") {
    return scoreTextSentiment(fallbackText, options);
  }

  const obj = raw as Record<string, unknown>;
  const vectorObj =
    obj.vector && typeof obj.vector === "object"
      ? (obj.vector as Record<string, unknown>)
      : obj;
  const fallback = scoreTextSentiment(fallbackText, options);

  const readNumber = (source: Record<string, unknown>, key: string, fallbackValue: number) => {
    const n = Number(source[key]);
    return Number.isFinite(n) ? clamp(n) : fallbackValue;
  };

  const vector: SentimentVector = {
    morale: readNumber(vectorObj, "morale", fallback.vector.morale),
    trust: readNumber(vectorObj, "trust", fallback.vector.trust),
    energy: readNumber(vectorObj, "energy", fallback.vector.energy),
    clarity: readNumber(vectorObj, "clarity", fallback.vector.clarity),
    momentum: readNumber(vectorObj, "momentum", fallback.vector.momentum),
    risk: readNumber(vectorObj, "risk", fallback.vector.risk),
  };

  const score = readNumber(obj, "score", Math.round(
    vector.morale * 0.24 +
      vector.trust * 0.18 +
      vector.energy * 0.18 +
      vector.clarity * 0.18 +
      vector.momentum * 0.17 -
      vector.risk * 0.15 +
      4,
  ));
  const rawLabel = typeof obj.label === "string" ? obj.label.toLowerCase() : "";
  const label =
    rawLabel === "positive" || rawLabel === "neutral" || rawLabel === "negative" || rawLabel === "mixed"
      ? rawLabel
      : scoreToLabel(score, score >= 64 ? 1 : 0, score <= 42 ? 1 : 0);
  const confidence = clamp(Number(obj.confidence), 0, 1);

  return {
    label,
    score,
    confidence: Number.isFinite(confidence) && confidence > 0 ? round1(confidence) : fallback.confidence,
    vector,
    drivers: Array.isArray(obj.drivers)
      ? uniq(obj.drivers.filter((item): item is string => typeof item === "string"))
      : fallback.drivers,
    symptoms: Array.isArray(obj.symptoms)
      ? uniq(obj.symptoms.filter((item): item is string => typeof item === "string"))
      : fallback.symptoms,
    source: options.source ?? (typeof obj.source === "string" ? obj.source : fallback.source),
    created_at: options.created_at ?? (typeof obj.created_at === "string" ? obj.created_at : fallback.created_at),
  };
}

export function combineSentimentSignals(
  signals: SentimentSignal[],
  options: { now?: number; halfLifeDays?: number; source?: string } = {},
): SentimentSignal {
  const valid = signals.filter((signal) => Number.isFinite(signal.score));
  if (valid.length === 0) {
    return { ...NEUTRAL_SENTIMENT, source: options.source ?? "combined" };
  }

  const now = options.now ?? Date.now();
  const halfLifeDays = options.halfLifeDays ?? 45;
  let totalWeight = 0;
  const vectorTotals: SentimentVector = {
    morale: 0,
    trust: 0,
    energy: 0,
    clarity: 0,
    momentum: 0,
    risk: 0,
  };
  let scoreTotal = 0;
  let confidenceTotal = 0;

  for (const signal of valid) {
    const weight = signalWeight(signal, now, halfLifeDays);
    totalWeight += weight;
    scoreTotal += signal.score * weight;
    confidenceTotal += signal.confidence * weight;
    for (const key of Object.keys(vectorTotals) as Array<keyof SentimentVector>) {
      vectorTotals[key] += signal.vector[key] * weight;
    }
  }

  const vector = Object.fromEntries(
    (Object.keys(vectorTotals) as Array<keyof SentimentVector>).map((key) => [
      key,
      Math.round(vectorTotals[key] / totalWeight),
    ]),
  ) as unknown as SentimentVector;
  const score = Math.round(scoreTotal / totalWeight);
  const posHits = valid.filter((signal) => signal.label === "positive").length;
  const negHits = valid.filter((signal) => signal.label === "negative").length;

  return {
    label: scoreToLabel(score, posHits, negHits),
    score,
    confidence: round1(clamp(confidenceTotal / totalWeight, 0.2, 0.95)),
    vector,
    drivers: uniq(valid.flatMap((signal) => signal.drivers)),
    symptoms: uniq(valid.flatMap((signal) => signal.symptoms)),
    source: options.source ?? "combined",
    created_at: valid
      .map((signal) => signal.created_at)
      .filter((value): value is string => Boolean(value))
      .sort()
      .at(-1),
  };
}

export function scoreSentimentSamples(
  samples: SentimentTextSample[],
  options: { source?: string; halfLifeDays?: number } = {},
): SentimentSignal {
  return combineSentimentSignals(
    samples.map((sample) =>
      scoreTextSentiment(sample.text, {
        source: sample.source ?? options.source ?? "sample",
        created_at: sample.created_at,
      }),
    ),
    { source: options.source ?? "samples", halfLifeDays: options.halfLifeDays },
  );
}

export function sentimentRuleModifiers(signal: SentimentSignal): SentimentRuleModifiers {
  const v = signal.vector;
  const chemistry_delta = Math.round((v.trust - 50) * 0.08 + (v.clarity - 50) * 0.05 - Math.max(0, v.risk - 50) * 0.06);
  const readiness_delta = Math.round((signal.score - 50) * 0.18 + (v.momentum - 50) * 0.05);
  const form_delta = round1(clamp((v.momentum - 50) / 30 + (v.energy - 50) / 45, -2, 2));
  const hp_pressure = Math.round(clamp(Math.max(0, v.risk - 45) * 0.7 + Math.max(0, 50 - v.energy) * 0.4));
  const mp_pressure = Math.round(clamp(Math.max(0, 55 - v.clarity) * 0.5 + Math.max(0, 55 - v.energy) * 0.4));

  return {
    chemistry_delta,
    readiness_delta,
    form_delta,
    hp_pressure,
    mp_pressure,
  };
}

export function moraleLabel(score: number) {
  if (score >= 76) return "Strong morale";
  if (score >= 58) return "Stable morale";
  if (score >= 40) return "Fragile morale";
  return "Critical morale";
}
