/**
 * POST /api/profile/converse
 *
 * Multi-turn conversational stat builder. Talk-to-fill: user describes
 * a hero or project; AI asks follow-ups; AI synthesizes a structured
 * proposal once it has enough evidence.
 *
 * Body:
 *   {
 *     conversation_id?: string,           // omit to start a new conversation
 *     target_type: "employee" | "project",
 *     target_id: string,                  // uuid
 *     message?: string,                   // user's reply; omit on first call
 *     started_by?: string                 // actor uuid (optional)
 *   }
 *
 * Response:
 *   {
 *     conversation_id,
 *     ai_message,       // the next thing the AI says
 *     proposal | null,  // structured stats once AI is ready
 *     done,             // true once a proposal is locked
 *     turn_count,
 *     note?
 *   }
 *
 * The conversation transcript persists in `profile_conversations`. On
 * commit, /api/profile/commit reads the conversation, applies the
 * approved proposal, and writes to DB + Sheets via the same path used
 * by Chronicle ratification.
 */

import { apiError, apiJson, logApiError, parseJsonBody } from "@/lib/api";
import { isDbConfigured, query } from "@/lib/db";
import {
  continueEmployeeInterview,
  continueProjectInterview,
  type ConvTurn,
  type EmployeeProfileProposal,
  type ProjectProposal,
} from "@/lib/llm-extract";
import { z } from "zod";

const bodySchema = z.object({
  conversation_id: z.string().uuid().optional(),
  target_type: z.enum(["employee", "project"]),
  target_id: z.string().uuid(),
  message: z.string().trim().min(1).max(2000).optional(),
  started_by: z.string().uuid().optional(),
});

interface ConversationRow {
  id: string;
  target_type: "employee" | "project";
  target_id: string;
  status: string;
  transcript: ConvTurn[] | null;
  proposal: unknown | null;
}

interface EmployeeContextRow {
  display_name: string;
  role_level: string;
  dept_code: string | null;
}

interface ProjectContextRow {
  code: string;
  name: string;
}

const MAX_USER_TURNS = 5;

export async function POST(request: Request) {
  if (!isDbConfigured()) return apiError("Database not configured", 503);

  const parsed = await parseJsonBody(request, bodySchema);
  if (!parsed.ok) return parsed.response;

  const body = parsed.data;

  try {
    // ── Load or create conversation row ──────────────────────────────────
    let conv: ConversationRow;
    if (body.conversation_id) {
      const rows = await query<ConversationRow>(
        `SELECT id, target_type, target_id, status, transcript, proposal
           FROM profile_conversations WHERE id = $1::uuid`,
        [body.conversation_id],
      );
      if (rows.length === 0) return apiError("Conversation not found", 404);
      conv = rows[0];
      if (conv.status !== "open" && conv.status !== "proposed") {
        return apiError(`Conversation is ${conv.status}; start a new one`, 409);
      }
    } else {
      const inserted = await query<ConversationRow>(
        `INSERT INTO profile_conversations
           (target_type, target_id, started_by, status, transcript)
         VALUES ($1, $2::uuid, $3::uuid, 'open', '[]'::jsonb)
         RETURNING id, target_type, target_id, status, transcript, proposal`,
        [body.target_type, body.target_id, body.started_by ?? null],
      );
      conv = inserted[0];
    }

    // ── Append user message if present ───────────────────────────────────
    const transcript: ConvTurn[] = Array.isArray(conv.transcript) ? conv.transcript : [];
    if (body.message) {
      transcript.push({
        role: "user",
        content: body.message,
        ts: new Date().toISOString(),
      });
    }

    // Cap at MAX_USER_TURNS to bound the interview
    const userTurns = transcript.filter((t) => t.role === "user").length;
    if (userTurns > MAX_USER_TURNS) {
      return apiError(
        `Interview limit reached (${MAX_USER_TURNS} turns). Approve, abandon, or start a fresh conversation.`,
        429,
      );
    }

    // ── Load context for the AI's interviewer prompt ─────────────────────
    let aiResult:
      | Awaited<ReturnType<typeof continueEmployeeInterview>>
      | Awaited<ReturnType<typeof continueProjectInterview>>;

    if (body.target_type === "employee") {
      const ctx = await query<EmployeeContextRow>(
        `SELECT
           COALESCE(NULLIF(e.nickname,''), e.full_name_en, e.full_name_th) AS display_name,
           e.role_level,
           d.code AS dept_code
         FROM employees e
         LEFT JOIN departments d ON d.id = e.department_id
         WHERE e.id = $1::uuid`,
        [body.target_id],
      );
      if (ctx.length === 0) return apiError("Employee not found", 404);
      aiResult = await continueEmployeeInterview(ctx[0], transcript);
    } else {
      const ctx = await query<ProjectContextRow>(
        `SELECT code, name FROM projects WHERE id = $1::uuid`,
        [body.target_id],
      );
      if (ctx.length === 0) return apiError("Project not found", 404);
      aiResult = await continueProjectInterview(ctx[0], transcript);
    }

    // ── Append AI message to transcript ──────────────────────────────────
    transcript.push({
      role: "assistant",
      content: aiResult.ai_message,
      ts: new Date().toISOString(),
    });

    // ── Persist updated conversation ─────────────────────────────────────
    const newStatus = aiResult.proposal ? "proposed" : "open";
    const proposalJson = aiResult.proposal ?? conv.proposal;
    await query(
      `UPDATE profile_conversations
         SET transcript = $2::jsonb,
             proposal   = $3::jsonb,
             status     = $4,
             updated_at = now()
       WHERE id = $1::uuid`,
      [conv.id, JSON.stringify(transcript), JSON.stringify(proposalJson), newStatus],
    );

    return apiJson({
      conversation_id: conv.id,
      ai_message: aiResult.ai_message,
      proposal: proposalJson as EmployeeProfileProposal | ProjectProposal | null,
      done: aiResult.done,
      turn_count: userTurns,
      max_turns: MAX_USER_TURNS,
      note: aiResult.note,
    });
  } catch (error) {
    logApiError("api/profile/converse POST error", error);
    return apiError("Conversation failed", 500);
  }
}
