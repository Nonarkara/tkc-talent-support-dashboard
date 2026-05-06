/**
 * LLM attribute-delta extraction — the magic behind the Chronicle ritual.
 *
 * Given a free-form narrative a manager has written about an employee,
 * ask Gemini to propose integer deltas across the six attributes, with a
 * short rationale per attribute. The manager reviews and ratifies before
 * anything is stamped into the ledger.
 *
 * Philosophy
 * ──────────
 * The LLM is a *proposer*, never a committer. Its output is always
 * reviewable in the UI and never bypasses the manager's judgement. If
 * the model fails or returns malformed JSON, we hand the manager an
 * empty proposal and a note — they can still edit by hand.
 *
 * Mirrors the Gemini fetch pattern in src/app/api/chat/route.ts (same
 * env var, same model, same 15s abort).
 */
import { z } from "zod";
import {
  normalizeSentimentSignal,
  scoreTextSentiment,
  type SentimentSignal,
} from "./sentiment-engine";
// Minimal attribute glossary inlined here after the v9.0 delete pass
// removed src/lib/lore.ts. Only LLM prompts use this — the dashboard
// itself never read lore at runtime.
const ATTRS = [
  { code: "STR", name: "Strength",     body: "Throughput and physical execution.",                  reads_as: "Pushes through volume work without fading." },
  { code: "INT", name: "Intellect",    body: "Reasoning, technical depth, and analytical breadth.",  reads_as: "Catches second-order consequences before they bite." },
  { code: "WIS", name: "Wisdom",       body: "Judgement under ambiguity, learned across cycles.",   reads_as: "Reads the room and the long arc at once." },
  { code: "CHA", name: "Charisma",     body: "Influence, persuasion, and trust.",                   reads_as: "Carries clients through bad weather without losing them." },
  { code: "DEX", name: "Dexterity",    body: "Speed, hand-skills, and on-the-fly adaptation.",      reads_as: "Turns a brief into a draft in an afternoon." },
  { code: "CON", name: "Constitution", body: "Stamina across long seasons without burning out.",    reads_as: "Still present in week 22 of an 18-week project." },
];

const GEMINI_API_KEY =
  process.env.GEMINI_API_KEY || process.env.GOOGLE_GENERATIVE_AI_API_KEY || "";
const MODEL = "gemini-2.0-flash";
const GEMINI_URL = GEMINI_API_KEY
  ? `https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent?key=${GEMINI_API_KEY}`
  : null;

// ─── Types + schema ──────────────────────────────────────────────────────

export type AttrKey = "str" | "int" | "wis" | "cha" | "dex" | "con";

export interface AttrDeltaProposal {
  attr: AttrKey;
  delta: number;
  rationale: string;
}

export interface ExtractResult {
  deltas: AttrDeltaProposal[];
  sentiment: SentimentSignal;
  model: string;
  latency_ms: number;
  /** When the LLM declined or failed, this holds the reason so the UI can say something honest. */
  note?: string;
}

const attrKey = z.enum(["str", "int", "wis", "cha", "dex", "con"]);

const rawProposalSchema = z.object({
  deltas: z
    .array(
      z.object({
        attr: attrKey,
        delta: z.coerce.number().int().min(-3).max(3),
        rationale: z.string().trim().min(1).max(400),
      }),
    )
    .max(6),
  sentiment: z.unknown().optional(),
});

// ─── Prompt ──────────────────────────────────────────────────────────────

function buildPrompt(
  narrative: string,
  employee: { display_name: string; role_level: string; dept_code: string | null },
): string {
  const attrGlossary = ATTRS
    .map((a) => `- ${a.code} (${a.name}): ${a.body} ${a.reads_as}`)
    .join("\n");

  const employeeLine = [
    `Subject: ${employee.display_name}`,
    `Role: ${employee.role_level}`,
    employee.dept_code ? `Department: ${employee.dept_code}` : "",
  ]
    .filter(Boolean)
    .join(" · ");

  return `You are the Chronicler of the House of TKC. A manager has written
a short narrative about an employee. Your task is to propose integer deltas
across the six RPG attributes, grounded in what the narrative actually shows.

${employeeLine}

Attribute glossary (the ontology you must reason in):
${attrGlossary}

Rules:
1. Output strict JSON only. No markdown, no prose outside JSON.
2. Schema: { "deltas": [ { "attr": "<str|int|wis|cha|dex|con>", "delta": <integer -3..+3>, "rationale": "<one short sentence>" } ], "sentiment": { "label": "<positive|neutral|negative|mixed>", "score": <0-100>, "confidence": <0-1>, "vector": { "morale": <0-100>, "trust": <0-100>, "energy": <0-100>, "clarity": <0-100>, "momentum": <0-100>, "risk": <0-100> }, "drivers": ["short positive driver"], "symptoms": ["short risk symptom"] } }.
3. Propose at most 3 deltas per narrative. Prefer fewer, clearer changes over speculation.
4. Delta magnitude: +1 for a clear single instance, +2 for a pattern across the cycle, +3 only for a defining season-long behaviour. Same scale for negatives.
5. Sentiment is the operational signal the rules engine will consume. Higher morale/trust/energy/clarity/momentum is better. Higher risk is worse.
6. If the narrative does not clearly evidence any attribute change, return "deltas": [] but still return a neutral sentiment object.
7. Rationale, drivers, and symptoms must quote or paraphrase the specific evidence from the narrative. Do not invent evidence.

Narrative:
"""
${narrative.trim()}
"""

Respond with the JSON object now.`;
}

// ─── JSON extraction ─────────────────────────────────────────────────────

/** Strip common wrappers Gemini sometimes emits despite instructions. */
function stripToJson(raw: string): string {
  let s = raw.trim();
  // Strip ```json ... ``` or ``` ... ``` fences.
  const fence = s.match(/^```(?:json)?\s*([\s\S]*?)\s*```$/);
  if (fence) s = fence[1].trim();
  // Find first '{' and last '}' — tolerate leading/trailing chatter.
  const first = s.indexOf("{");
  const last = s.lastIndexOf("}");
  if (first >= 0 && last > first) s = s.slice(first, last + 1);
  return s;
}

// ─── Public API ──────────────────────────────────────────────────────────

export async function extractAttributeDeltas(
  narrative: string,
  employee: { display_name: string; role_level: string; dept_code: string | null },
): Promise<ExtractResult> {
  const started = Date.now();
  const fallbackSentiment = scoreTextSentiment(narrative, { source: "heuristic" });

  if (!GEMINI_URL) {
    return {
      deltas: [],
      sentiment: fallbackSentiment,
      model: MODEL,
      latency_ms: 0,
      note: "LLM offline (GEMINI_API_KEY not set). Rule signal came from deterministic text scoring; edit deltas by hand below.",
    };
  }

  const prompt = buildPrompt(narrative, employee);

  try {
    const response = await fetch(GEMINI_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      signal:
        typeof AbortSignal.timeout === "function"
          ? AbortSignal.timeout(6_000)
          : undefined,
      body: JSON.stringify({
        contents: [{ role: "user", parts: [{ text: prompt }] }],
        generationConfig: {
          temperature: 0.3,
          topP: 0.9,
          maxOutputTokens: 448,
          responseMimeType: "application/json",
        },
      }),
    });

    const latency = Date.now() - started;

    if (!response.ok) {
      return {
        deltas: [],
        sentiment: fallbackSentiment,
        model: MODEL,
        latency_ms: latency,
        note: `Chronicler unreachable (${response.status}). Rule signal came from deterministic text scoring; edit deltas by hand below.`,
      };
    }

    const data = await response.json();
    const text: string =
      data?.candidates?.[0]?.content?.parts?.[0]?.text ?? "";

    if (!text) {
      return {
        deltas: [],
        sentiment: fallbackSentiment,
        model: MODEL,
        latency_ms: latency,
        note: "The Chronicler returned no text. Rule signal came from deterministic text scoring.",
      };
    }

    const parsed = rawProposalSchema.safeParse(JSON.parse(stripToJson(text)));
    if (!parsed.success) {
      console.warn("[llm-extract] malformed proposal:", text);
      return {
        deltas: [],
        sentiment: fallbackSentiment,
        model: MODEL,
        latency_ms: latency,
        note: "The Chronicler's words did not parse. Rule signal came from deterministic text scoring; edit deltas by hand below.",
      };
    }

    // Collapse duplicate attrs (keep first, sum deltas, concatenate rationales).
    const byAttr = new Map<AttrKey, AttrDeltaProposal>();
    for (const d of parsed.data.deltas) {
      const prev = byAttr.get(d.attr);
      if (!prev) {
        byAttr.set(d.attr, { attr: d.attr, delta: d.delta, rationale: d.rationale });
      } else {
        const sum = Math.max(-3, Math.min(3, prev.delta + d.delta));
        byAttr.set(d.attr, {
          attr: d.attr,
          delta: sum,
          rationale: `${prev.rationale} · ${d.rationale}`,
        });
      }
    }

    return {
      deltas: Array.from(byAttr.values()).filter((d) => d.delta !== 0),
      sentiment: normalizeSentimentSignal(parsed.data.sentiment, narrative, { source: "gemini" }),
      model: MODEL,
      latency_ms: latency,
    };
  } catch (err) {
    const latency = Date.now() - started;
    console.error("[llm-extract] failed:", err);
    return {
      deltas: [],
      sentiment: fallbackSentiment,
      model: MODEL,
      latency_ms: latency,
      note: "The Chronicler's voice was lost. Rule signal came from deterministic text scoring; edit deltas by hand below.",
    };
  }
}
