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
const MODEL = "gemini-2.5-flash";
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


// ════════════════════════════════════════════════════════════════════════
// Multi-turn Profile Conversation (Talk-to-Fill)
// ════════════════════════════════════════════════════════════════════════
//
// The Chronicle ritual above is one-shot: narrative in, deltas out. The
// "Talk-to-Fill" wizard is multi-turn: AI asks, user answers, repeat 2-4
// times, AI synthesizes a full proposal.
//
// Same Gemini key, same fallback discipline. We never block on AI: if it
// stalls or returns garbage, we hand the user a deterministic suggestion
// and let them adjust by hand.

export type ConvTurn = { role: "user" | "assistant"; content: string; ts?: string };

export interface EmployeeProfileProposal {
  attributes: { str: number; int: number; wis: number; cha: number; dex: number; con: number };
  archetype: "captain" | "ops" | "tech" | "scout" | "sales" | "fighter" | "goofoff";
  rationale: Partial<Record<AttrKey, string>>;
  confidence: Partial<Record<AttrKey, "high" | "med" | "low">>;
  summary: string; // one-line overall read
}

export interface ProjectProposal {
  complexity_score: number;
  urgency_score: number;
  strategic_value_score: number;
  delivery_risk_score: number;
  ai_leverage_score: number;
  suggested_slots: { technical: number; sales: number; marketing: number; outsourcing: number; paperwork: number };
  team_size: number;
  budget_thb?: number;
  monthly_ceiling?: number;
  rationale: string;
  summary: string;
}

export interface ConverseResult<TProposal> {
  ai_message: string;       // the next thing the AI says (a question, or "ready to propose")
  proposal: TProposal | null; // present once the AI is ready (typically after turn 3)
  done: boolean;            // true when AI has emitted its final proposal
  model: string;
  note?: string;            // surfaces failure modes to the UI
}

// ─── Employee profile interview ──────────────────────────────────────────

const employeeProposalSchema = z.object({
  attributes: z.object({
    str: z.number().int().min(1).max(20),
    int: z.number().int().min(1).max(20),
    wis: z.number().int().min(1).max(20),
    cha: z.number().int().min(1).max(20),
    dex: z.number().int().min(1).max(20),
    con: z.number().int().min(1).max(20),
  }),
  archetype: z.enum(["captain", "ops", "tech", "scout", "sales", "fighter", "goofoff"]),
  rationale: z.record(z.string(), z.string()).optional(),
  confidence: z.record(z.string(), z.enum(["high", "med", "low"])).optional(),
  summary: z.string().max(280),
});

function employeeInterviewSystem(employee: { display_name: string; role_level: string; dept_code: string | null }) {
  return `You are the Interviewer of TKC. You are interviewing a manager
about one employee to fill a Dragon Quest III-style stat profile.

Subject: ${employee.display_name} · ${employee.role_level}${employee.dept_code ? ` · ${employee.dept_code}` : ""}

Your job: ask CONCRETE story-shaped questions that surface evidence for the
six attributes (STR/INT/WIS/CHA/DEX/CON). Never ask the manager to rate a
number directly. Always ask for a specific recent example.

Attribute glossary:
${ATTRS.map((a) => `- ${a.code} (${a.name}): ${a.body}`).join("\n")}

Conversation rules:
- Bound the interview to AT MOST 4 user turns. By turn 3 you should be
  ready to propose; turn 4 is for refinement only.
- Each AI turn is ONE short paragraph (under 40 words) ending with
  exactly ONE question. No bulleted lists. No multiple questions.
- Match the manager's language (Thai or English).
- If the manager says "skip" or "don't know", move on with defaults.
- When you have enough evidence (typically by turn 3), instead of asking
  another question, emit your final proposal in the EXACT format:

<<PROPOSAL>>
{
  "attributes": { "str": 12, "int": 14, "wis": 13, "cha": 11, "dex": 12, "con": 13 },
  "archetype": "tech",
  "rationale": { "str": "ships on cadence...", "int": "catches second-order...", ... },
  "confidence": { "str": "med", "int": "high", ... },
  "summary": "Steady technical operator who quietly carries the engineering load."
}
<<END>>

After the <<END>> tag, write nothing else.

If the manager has not yet answered, OR you are mid-conversation and not
ready to propose, just respond with your next question — DO NOT include
the proposal block.

Score scale (1-20, 10 is mean, 13+ is notable, 17+ is rare excellence).
Confidence: "high" if the manager gave concrete evidence, "med" if
inferred, "low" if you are guessing from defaults.`;
}

function projectInterviewSystem(project: { code: string; name: string }) {
  return `You are the Project Reader of TKC. You are interviewing a director
about one project to fill its game profile.

Subject: ${project.code} — ${project.name}

Your job: ask CONCRETE story-shaped questions that surface the project's
shape (deliverable, deadline, budget, risks, team needs). Never ask the
director to rate a number directly.

Conversation rules:
- AT MOST 4 user turns. By turn 3 propose; turn 4 is refinement.
- Each AI turn: ONE short paragraph (under 40 words), ONE question only.
- Match the director's language (Thai or English).
- "Skip" or "don't know" → move on with defaults.

When ready, emit:

<<PROPOSAL>>
{
  "complexity_score": 70,
  "urgency_score": 80,
  "strategic_value_score": 65,
  "delivery_risk_score": 55,
  "ai_leverage_score": 40,
  "suggested_slots": { "technical": 3, "sales": 1, "marketing": 1, "outsourcing": 0, "paperwork": 1 },
  "team_size": 6,
  "budget_thb": 1200000,
  "monthly_ceiling": 240000,
  "rationale": "Tight deadline + multi-stakeholder shipping → high urgency, complex coordination.",
  "summary": "Moderate-complexity, high-urgency platform delivery."
}
<<END>>

Scores are 1-100, 50 is mean. Slots sum should equal team_size.
Budget is THB total, monthly_ceiling is THB/month allowed.`;
}

const projectProposalSchema = z.object({
  complexity_score: z.number().int().min(1).max(100),
  urgency_score: z.number().int().min(1).max(100),
  strategic_value_score: z.number().int().min(1).max(100),
  delivery_risk_score: z.number().int().min(1).max(100),
  ai_leverage_score: z.number().int().min(1).max(100),
  suggested_slots: z.object({
    technical: z.number().int().min(0).max(20),
    sales: z.number().int().min(0).max(20),
    marketing: z.number().int().min(0).max(20),
    outsourcing: z.number().int().min(0).max(20),
    paperwork: z.number().int().min(0).max(20),
  }),
  team_size: z.number().int().min(1).max(50),
  budget_thb: z.number().nonnegative().optional(),
  monthly_ceiling: z.number().nonnegative().optional(),
  rationale: z.string().max(400),
  summary: z.string().max(280),
});

/** Extract <<PROPOSAL>>...<<END>> JSON block from AI response. */
function extractProposalBlock(text: string): string | null {
  const match = text.match(/<<PROPOSAL>>\s*([\s\S]*?)\s*<<END>>/);
  return match ? stripToJson(match[1]) : null;
}

/** Strip the proposal block from the AI message so the user sees clean text. */
function stripProposalBlock(text: string): string {
  return text.replace(/<<PROPOSAL>>[\s\S]*?<<END>>/, "").trim();
}

async function runInterviewTurn(
  systemPrompt: string,
  transcript: ConvTurn[],
): Promise<{ raw: string; latency_ms: number; note?: string }> {
  const started = Date.now();

  if (!GEMINI_URL) {
    return {
      raw: "",
      latency_ms: 0,
      note: "Interviewer offline (GEMINI_API_KEY not set). Switch to manual stat entry.",
    };
  }

  // Build Gemini contents: system as first user turn, then transcript.
  const contents = [
    { role: "user" as const, parts: [{ text: systemPrompt }] },
    { role: "model" as const, parts: [{ text: "Understood. I'll begin with one concrete question." }] },
    ...transcript.map((t) => ({
      role: t.role === "user" ? ("user" as const) : ("model" as const),
      parts: [{ text: t.content }],
    })),
  ];

  try {
    const response = await fetch(GEMINI_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      signal:
        typeof AbortSignal.timeout === "function" ? AbortSignal.timeout(20_000) : undefined,
      body: JSON.stringify({
        contents,
        generationConfig: {
          temperature: 0.6,
          topP: 0.9,
          maxOutputTokens: 1024,
        },
      }),
    });

    if (!response.ok) {
      return {
        raw: "",
        latency_ms: Date.now() - started,
        note: `Interviewer unreachable (${response.status}).`,
      };
    }

    const data = await response.json();
    const text: string = data?.candidates?.[0]?.content?.parts?.[0]?.text ?? "";

    if (!text) {
      return { raw: "", latency_ms: Date.now() - started, note: "Interviewer returned no text." };
    }

    return { raw: text, latency_ms: Date.now() - started };
  } catch (err) {
    return {
      raw: "",
      latency_ms: Date.now() - started,
      note: err instanceof Error ? err.message : "Interviewer call failed.",
    };
  }
}

export async function continueEmployeeInterview(
  employee: { display_name: string; role_level: string; dept_code: string | null },
  transcript: ConvTurn[],
): Promise<ConverseResult<EmployeeProfileProposal>> {
  const system = employeeInterviewSystem(employee);
  const turn = await runInterviewTurn(system, transcript);

  if (!turn.raw) {
    return {
      ai_message:
        transcript.length === 0
          ? `Tell me about ${employee.display_name} — what's the most recent thing they shipped, and how did it land?`
          : "(The interviewer paused. Try reloading or commit your notes manually.)",
      proposal: null,
      done: false,
      model: MODEL,
      note: turn.note,
    };
  }

  const proposalBlock = extractProposalBlock(turn.raw);
  const cleanMessage = stripProposalBlock(turn.raw) || "Ready to propose.";

  if (!proposalBlock) {
    return {
      ai_message: cleanMessage,
      proposal: null,
      done: false,
      model: MODEL,
    };
  }

  try {
    const json = JSON.parse(proposalBlock);
    const parsed = employeeProposalSchema.safeParse(json);
    if (!parsed.success) {
      return {
        ai_message: cleanMessage,
        proposal: null,
        done: false,
        model: MODEL,
        note: "Proposal block did not parse. Continue the conversation or fill manually.",
      };
    }
    return {
      ai_message: cleanMessage,
      proposal: parsed.data as EmployeeProfileProposal,
      done: true,
      model: MODEL,
    };
  } catch {
    return {
      ai_message: cleanMessage,
      proposal: null,
      done: false,
      model: MODEL,
      note: "Proposal block was not valid JSON. Continue the conversation or fill manually.",
    };
  }
}

export async function continueProjectInterview(
  project: { code: string; name: string },
  transcript: ConvTurn[],
): Promise<ConverseResult<ProjectProposal>> {
  const system = projectInterviewSystem(project);
  const turn = await runInterviewTurn(system, transcript);

  if (!turn.raw) {
    return {
      ai_message:
        transcript.length === 0
          ? `Tell me about "${project.name}" — what's the deliverable, and when does it have to ship?`
          : "(The reader paused. Try reloading or fill manually.)",
      proposal: null,
      done: false,
      model: MODEL,
      note: turn.note,
    };
  }

  const proposalBlock = extractProposalBlock(turn.raw);
  const cleanMessage = stripProposalBlock(turn.raw) || "Ready to propose.";

  if (!proposalBlock) {
    return { ai_message: cleanMessage, proposal: null, done: false, model: MODEL };
  }

  try {
    const json = JSON.parse(proposalBlock);
    const parsed = projectProposalSchema.safeParse(json);
    if (!parsed.success) {
      return {
        ai_message: cleanMessage,
        proposal: null,
        done: false,
        model: MODEL,
        note: "Proposal block did not parse. Continue or fill manually.",
      };
    }
    return {
      ai_message: cleanMessage,
      proposal: parsed.data as ProjectProposal,
      done: true,
      model: MODEL,
    };
  } catch {
    return {
      ai_message: cleanMessage,
      proposal: null,
      done: false,
      model: MODEL,
      note: "Proposal block was not valid JSON.",
    };
  }
}
