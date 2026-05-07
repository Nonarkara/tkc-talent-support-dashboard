/**
 * POST /api/chat
 *
 * AI assistant with LIVE org context.
 *
 * Before every Gemini call we snapshot the actual DB state — current
 * formations, hero roster, project status, risk signals — and inject it
 * alongside the static knowledge base. The AI can now answer:
 *   "Who is on Project P4?"
 *   "Is Mark overallocated?"
 *   "Which projects are understaffed?"
 *   "What's our org chemistry this week?"
 *
 * Live context is capped at ~1500 tokens so it never swamps the KB.
 * All DB calls are wrapped in try/catch — if the DB is unavailable the
 * AI still works with the static KB only (degraded but not broken).
 */

import { apiJson, logApiError, parseJsonBody } from "@/lib/api";
import { chatPayloadSchema } from "@/lib/api-schemas";
import { isDbConfigured, query } from "@/lib/db";
import { SYSTEM_PROMPT, TKC_KNOWLEDGE_BASE } from "@/lib/knowledge-base";

const GEMINI_API_KEY =
  process.env.GEMINI_API_KEY || process.env.GOOGLE_GENERATIVE_AI_API_KEY || "";
const GEMINI_URL = GEMINI_API_KEY
  ? `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${GEMINI_API_KEY}`
  : null;

// ─── Live context builder ─────────────────────────────────────────────
// Queries the DB and returns a compact text snapshot. Cached for the
// duration of the request only (no server-side cache — each message
// sees fresh data).

interface HeroRow {
  display_name: string;
  dept_code: string | null;
  rpg_class: string | null;
  level: number | null;
  tenure_years: number | null;
  attr_con: number | null;
  active_project_codes: string | null;
  total_fte: number | null;
}

interface ProjectRow {
  code: string;
  name: string;
  status: string | null;
  priority: string | null;
  team_size: number | null;
  filled: number | null;
  chemistry: number | null;
  overall: number | null;
  assigned_names: string | null;
}

interface CheckInRow {
  display_name: string;
  dept_code: string | null;
  checked_in_at: string;
}

async function buildLiveContext(): Promise<string> {
  if (!isDbConfigured()) return "";

  try {
    const [heroes, projects, recentCheckIns] = await Promise.all([
      // Top-level hero roster: class, level, active projects, FTE load
      query<HeroRow>(`
        SELECT
          COALESCE(NULLIF(e.nickname,''), e.full_name_en, e.full_name_th) AS display_name,
          d.code AS dept_code,
          ea.rpg_class,
          e.level,
          e.tenure_years,
          ea.con AS attr_con,
          STRING_AGG(DISTINCT p.code, ', ' ORDER BY p.code) AS active_project_codes,
          COALESCE(SUM(pa.fte), 0)::numeric(4,2) AS total_fte
        FROM employees e
        LEFT JOIN departments d ON d.id = e.department_id
        LEFT JOIN employee_attributes ea ON ea.employee_id = e.id
        LEFT JOIN project_allocations pa ON pa.employee_id = e.id
        LEFT JOIN projects p ON p.id = pa.project_id AND p.status NOT IN ('done','cancelled','completed')
        WHERE e.is_active = true
        GROUP BY e.id, e.nickname, e.full_name_en, e.full_name_th, d.code, ea.rpg_class, e.level, e.tenure_years, ea.con
        ORDER BY e.level DESC NULLS LAST, e.tenure_years DESC NULLS LAST
        LIMIT 60
      `).catch(() => [] as HeroRow[]),

      // Project formations: who's on what, chemistry, staffing gaps
      query<ProjectRow>(`
        SELECT
          p.code, p.name, p.status, p.priority, p.team_size,
          COUNT(DISTINCT pa.employee_id)::int AS filled,
          tc.chemistry_score AS chemistry,
          tc.overall_score AS overall,
          STRING_AGG(
            DISTINCT COALESCE(NULLIF(e.nickname,''), e.full_name_en, e.full_name_th),
            ', ' ORDER BY COALESCE(NULLIF(e.nickname,''), e.full_name_en, e.full_name_th)
          ) AS assigned_names
        FROM projects p
        LEFT JOIN project_allocations pa ON pa.project_id = p.id
        LEFT JOIN employees e ON e.id = pa.employee_id
        LEFT JOIN LATERAL (
          SELECT chemistry_score, overall_score
          FROM team_compositions tc2
          WHERE tc2.project_id = p.id
          ORDER BY tc2.saved_at DESC NULLS LAST
          LIMIT 1
        ) tc ON true
        WHERE p.status NOT IN ('done','cancelled','completed')
        GROUP BY p.id, p.code, p.name, p.status, p.priority, p.team_size, tc.chemistry_score, tc.overall_score
        ORDER BY p.priority DESC NULLS LAST, p.code
      `).catch(() => [] as ProjectRow[]),

      // Recent check-ins (last 7 days)
      query<CheckInRow>(`
        SELECT
          COALESCE(NULLIF(e.nickname,''), e.full_name_en, e.full_name_th) AS display_name,
          d.code AS dept_code,
          al.punched_at::text AS checked_in_at
        FROM attendance_log al
        JOIN employees e ON e.id = al.employee_id
        LEFT JOIN departments d ON d.id = e.department_id
        WHERE al.action = 'in'
          AND al.punched_at >= NOW() - INTERVAL '7 days'
        ORDER BY al.punched_at DESC
        LIMIT 15
      `).catch(() => [] as CheckInRow[]),
    ]);

    // ── Format roster summary ──────────────────────────────────────────
    const overloaded = heroes.filter((h) => Number(h.total_fte) > 1.05);
    const idle       = heroes.filter((h) => Number(h.total_fte) === 0);
    const anchors    = heroes.filter(
      (h) => (h.tenure_years ?? 0) >= 10 && (h.attr_con ?? 0) >= 14,
    );

    const deptMap: Record<string, number> = {};
    for (const h of heroes) {
      const dept = h.dept_code ?? "UNKNOWN";
      deptMap[dept] = (deptMap[dept] ?? 0) + 1;
    }
    const deptLine = Object.entries(deptMap)
      .sort((a, b) => b[1] - a[1])
      .map(([dept, n]) => `${dept}:${n}`)
      .join(", ");

    // ── Format project formations ──────────────────────────────────────
    const projectLines = projects.map((p) => {
      const filled = p.filled ?? 0;
      const needed = p.team_size ?? 0;
      const gap    = Math.max(0, needed - filled);
      const gapStr = gap > 0 ? ` ⚠ NEEDS ${gap} MORE` : " ✓ FULL";
      const chem   = p.chemistry != null ? ` chemistry:${p.chemistry}` : "";
      const score  = p.overall != null ? ` readiness:${p.overall}%` : "";
      const team   = p.assigned_names ? ` → [${p.assigned_names}]` : " → (empty)";
      return `  ${p.code} "${p.name}" ${p.priority ?? ""}${gapStr}${chem}${score}${team}`;
    }).join("\n");

    // ── Format check-in activity ───────────────────────────────────────
    const checkInLine = recentCheckIns.length > 0
      ? recentCheckIns.slice(0, 8).map((c) => c.display_name).join(", ")
      : "none in last 7 days";

    const lines = [
      `## Live Org Snapshot — ${new Date().toISOString().slice(0, 10)}`,
      ``,
      `### Roster`,
      `Total active heroes: ${heroes.length}`,
      `Departments: ${deptLine}`,
      `Overloaded (>1.05 FTE): ${overloaded.length > 0 ? overloaded.map((h) => h.display_name).join(", ") : "none"}`,
      `Idle (0 FTE, unassigned): ${idle.length > 0 ? idle.slice(0, 10).map((h) => h.display_name).join(", ") : "none"}`,
      `Anchors (≥10yr tenure, CON≥14): ${anchors.length > 0 ? anchors.map((h) => h.display_name).join(", ") : "none identified"}`,
      ``,
      `### Active Projects & Formations`,
      projects.length > 0 ? projectLines : "  (no active projects)",
      ``,
      `### Recent Check-ins (last 7 days)`,
      checkInLine,
    ];

    return lines.join("\n");
  } catch {
    return ""; // DB unavailable — fall back to static KB only
  }
}

function buildOfflineReply(question: string): string {
  const lower = question.toLowerCase();

  if (lower.includes("best team") || lower.includes("team")) {
    return "Use the Formation screen. Lock a director-level coach first, then add one manager bridge before stacking specialists. Watch budget, missing skills, and chemistry together.";
  }
  if (lower.includes("flight") || lower.includes("risk")) {
    return "Check the Signals screen. Heroes with weak community or career scores, low HP, and high utilization are the first retention risks.";
  }
  if (lower.includes("company") || lower.includes("summary")) {
    return "The company is fighting margin compression. Connect project margin, team chemistry, and retention risk instead of treating HR and delivery as separate worlds.";
  }
  return "The live AI service is offline right now. You can still use the dashboard mechanics: check the Formation board for staffing gaps, Signals for risk alerts, and the Briefing for today's priorities.";
}

export async function POST(request: Request) {
  const parsed = await parseJsonBody(request, chatPayloadSchema);
  if (!parsed.ok) {
    return parsed.response;
  }

  const messages = parsed.data.messages;
  const latestMessage = messages.at(-1)?.content ?? "";

  try {
    if (!GEMINI_URL) {
      return apiJson({ message: buildOfflineReply(latestMessage), offline: true });
    }

    // Fetch live org context in parallel with nothing (fast path if DB is down)
    const liveContext = await buildLiveContext();

    const systemContext = [
      SYSTEM_PROMPT,
      `\n\nKnowledge Base:\n${TKC_KNOWLEDGE_BASE}`,
      liveContext ? `\n\n${liveContext}` : "",
      `\n\nNow respond to the conversation below. When you reference specific people, projects, or formations, use the live snapshot data above — not generic examples.`,
    ].join("");

    const contents = [
      {
        role: "user",
        parts: [{ text: systemContext }],
      },
      {
        role: "model",
        parts: [
          {
            text: "Understood. I have access to the live org data and can answer questions about specific heroes, projects, formations, and risk signals. How can I help?",
          },
        ],
      },
      ...messages.map((message) => ({
        role: message.role === "user" ? "user" : "model",
        parts: [{ text: message.content }],
      })),
    ];

    const response = await fetch(GEMINI_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      signal:
        typeof AbortSignal.timeout === "function"
          ? AbortSignal.timeout(18_000) // slightly longer for live context build
          : undefined,
      body: JSON.stringify({
        contents,
        generationConfig: {
          temperature: 0.65,
          topP: 0.88,
          maxOutputTokens: 1024,
        },
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      logApiError("api/chat Gemini API error", error);
      return apiJson(
        { message: buildOfflineReply(latestMessage), offline: true },
        { status: 200 },
      );
    }

    const data = await response.json();
    const text =
      data.candidates?.[0]?.content?.parts?.[0]?.text ?? buildOfflineReply(latestMessage);

    return apiJson({ message: text });
  } catch (error) {
    logApiError("api/chat POST error", error);
    return apiJson(
      { message: buildOfflineReply(latestMessage), offline: true },
      { status: 200 },
    );
  }
}
