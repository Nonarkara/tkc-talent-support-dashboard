import { z } from "zod";
import { apiError, apiJson, logApiError, parseJsonBody } from "@/lib/api";
import { buildHeuristicHeroBrief, type HeroIntelEmployee } from "@/lib/hero-intel";

const GEMINI_API_KEY =
  process.env.GEMINI_API_KEY || process.env.GOOGLE_GENERATIVE_AI_API_KEY || "";
const MODEL = "gemini-2.0-flash";
const GEMINI_URL = GEMINI_API_KEY
  ? `https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent?key=${GEMINI_API_KEY}`
  : null;

const employeeSchema = z.object({
  id: z.string().min(1).max(128),
  display_name: z.string().min(1).max(200),
  title: z.string().max(200).nullable().optional(),
  role_level: z.string().min(1).max(64),
  dept_code: z.string().max(64).nullable().optional(),
  attr_str: z.number().int().min(1).max(20).nullable().optional(),
  attr_int: z.number().int().min(1).max(20).nullable().optional(),
  attr_wis: z.number().int().min(1).max(20).nullable().optional(),
  attr_cha: z.number().int().min(1).max(20).nullable().optional(),
  attr_dex: z.number().int().min(1).max(20).nullable().optional(),
  attr_con: z.number().int().min(1).max(20).nullable().optional(),
});

const payloadSchema = z.object({
  employee: employeeSchema,
});

const aiResponseSchema = z.object({
  summary: z.string().trim().min(1).max(280),
  strengths: z.array(z.string().trim().min(1).max(120)).max(4),
  skills: z.array(z.string().trim().min(1).max(120)).max(8),
  recommended_trainings: z.array(z.string().trim().min(1).max(120)).max(5),
  project_fit: z.array(z.string().trim().min(1).max(160)).max(4),
  watchouts: z.array(z.string().trim().min(1).max(160)).max(4),
});

function stripToJson(raw: string): string {
  const trimmed = raw.trim();
  const first = trimmed.indexOf("{");
  const last = trimmed.lastIndexOf("}");
  return first >= 0 && last > first ? trimmed.slice(first, last + 1) : trimmed;
}

function buildPrompt(employee: HeroIntelEmployee, heuristic = buildHeuristicHeroBrief(employee)) {
  return `You are the talent adviser behind a Championship-Manager-meets-Dragon-Quest staffing board.
Return strict JSON only.

Employee:
- Name: ${employee.display_name}
- Role: ${employee.role_level}
- Title: ${employee.title ?? "—"}
- Dept: ${employee.dept_code ?? "—"}
- STR ${employee.attr_str ?? 10}
- INT ${employee.attr_int ?? 10}
- WIS ${employee.attr_wis ?? 10}
- CHA ${employee.attr_cha ?? 10}
- DEX ${employee.attr_dex ?? 10}
- CON ${employee.attr_con ?? 10}

Heuristic baseline:
- Summary: ${heuristic.summary}
- Strengths: ${heuristic.strengths.join(" | ")}
- Skills: ${heuristic.skills.join(" | ")}
- Recommended training: ${heuristic.recommended_trainings.join(" | ")}
- Project fit: ${heuristic.project_fit.join(" | ")}
- Watchouts: ${heuristic.watchouts.join(" | ")}

Respond with this schema:
{
  "summary": "one concise paragraph",
  "strengths": ["...", "..."],
  "skills": ["...", "..."],
  "recommended_trainings": ["...", "..."],
  "project_fit": ["...", "..."],
  "watchouts": ["...", "..."]
}

Keep it practical, short, and specific to staffing and development. No salary. No fluff.`;
}

export async function POST(request: Request) {
  const parsed = await parseJsonBody(request, payloadSchema);
  if (!parsed.ok) return parsed.response;

  const employee = parsed.data.employee;
  const heuristic = buildHeuristicHeroBrief(employee);

  if (!GEMINI_URL) {
    return apiJson({
      ...heuristic,
      source: "heuristic",
      note: "Gemini is not configured, so this brief is running on deterministic fallback logic.",
    });
  }

  try {
    const response = await fetch(GEMINI_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      signal:
        typeof AbortSignal.timeout === "function"
          ? AbortSignal.timeout(12_000)
          : undefined,
      body: JSON.stringify({
        contents: [{ role: "user", parts: [{ text: buildPrompt(employee, heuristic) }] }],
        generationConfig: {
          temperature: 0.4,
          topP: 0.9,
          maxOutputTokens: 700,
          responseMimeType: "application/json",
        },
      }),
    });

    if (!response.ok) {
      return apiJson({
        ...heuristic,
        source: "heuristic",
        note: `Gemini returned ${response.status}, so fallback logic is being used.`,
      });
    }

    const data = await response.json();
    const text: string = data?.candidates?.[0]?.content?.parts?.[0]?.text ?? "";
    const parsedAi = aiResponseSchema.safeParse(JSON.parse(stripToJson(text)));

    if (!parsedAi.success) {
      return apiJson({
        ...heuristic,
        source: "heuristic",
        note: "Gemini responded, but the structure was invalid, so fallback logic is being used.",
      });
    }

    return apiJson({
      ...heuristic,
      ...parsedAi.data,
      archetype: heuristic.archetype,
      completed_trainings: heuristic.completed_trainings,
      source: "gemini",
    });
  } catch (error) {
    logApiError("api/ai/player-brief POST", error);
    return apiJson({
      ...heuristic,
      source: "heuristic",
      note: "Gemini was unavailable during this request, so fallback logic is being used.",
    });
  }
}
