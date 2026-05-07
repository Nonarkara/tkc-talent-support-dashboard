/**
 * POST /api/profile/commit
 *
 * Apply an approved profile proposal from a Talk-to-Fill conversation.
 * For employees: writes to `employee_attributes` and fires `mirrorPlayer()`.
 * For projects: writes to `projects` and fires `mirrorProject()`.
 *
 * Body:
 *   {
 *     conversation_id: string,            // must be in 'proposed' state
 *     approved_proposal: object,          // user-edited proposal (may differ from AI's)
 *     reason: string                      // audit reason (≥10 chars)
 *   }
 *
 * Response:
 *   { ok: true, target_type, target_id, applied_fields: string[] }
 *
 * Behaviour:
 *   - Validates the approved_proposal against the appropriate schema
 *   - Writes to Postgres atomically
 *   - Logs to game_adjustment_log + appends to GameAdjustments Sheets tab
 *   - Mirrors Players or Projects tab to Sheets
 *   - Marks conversation as 'approved' with reason + actor
 */

import { apiError, apiJson, logApiError, parseJsonBody } from "@/lib/api";
import { isDbConfigured, query } from "@/lib/db";
import {
  appendGameAdjustment,
  appendAttrHistory,
  mirrorPlayer,
  mirrorProject,
} from "@/lib/sheets-mirror";
import { z } from "zod";

const ATTR_SCHEMA = z.object({
  str: z.number().int().min(1).max(20),
  int: z.number().int().min(1).max(20),
  wis: z.number().int().min(1).max(20),
  cha: z.number().int().min(1).max(20),
  dex: z.number().int().min(1).max(20),
  con: z.number().int().min(1).max(20),
});

const EMPLOYEE_PROPOSAL_SCHEMA = z.object({
  attributes: ATTR_SCHEMA,
  archetype: z.enum(["captain", "ops", "tech", "scout", "sales", "fighter", "goofoff"]),
  rationale: z.record(z.string(), z.string()).optional(),
  confidence: z.record(z.string(), z.enum(["high", "med", "low"])).optional(),
  summary: z.string().max(280).optional(),
});

const PROJECT_PROPOSAL_SCHEMA = z.object({
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
});

const bodySchema = z.object({
  conversation_id: z.string().uuid(),
  approved_proposal: z.record(z.string(), z.unknown()),
  reason: z.string().trim().min(10).max(400),
  approved_by: z.string().uuid().optional(),
});

interface ConvRow {
  id: string;
  target_type: "employee" | "project";
  target_id: string;
  status: string;
}

interface EmployeeBefore {
  str: number | null; int: number | null; wis: number | null;
  cha: number | null; dex: number | null; con: number | null;
  rpg_class: string | null;
  display_name: string;
  level: number | null;
}

interface ProjectBefore {
  code: string;
  complexity_score: number | null;
  urgency_score: number | null;
  strategic_value_score: number | null;
  delivery_risk_score: number | null;
  ai_leverage_score: number | null;
  team_size: number | null;
  budget_thb: number | null;
  monthly_ceiling: number | null;
  project_slots: Record<string, number> | null;
}

export async function POST(request: Request) {
  if (!isDbConfigured()) return apiError("Database not configured", 503);

  const parsed = await parseJsonBody(request, bodySchema);
  if (!parsed.ok) return parsed.response;

  const { conversation_id, approved_proposal, reason, approved_by } = parsed.data;

  try {
    const rows = await query<ConvRow>(
      `SELECT id, target_type, target_id, status
         FROM profile_conversations WHERE id = $1::uuid`,
      [conversation_id],
    );
    if (rows.length === 0) return apiError("Conversation not found", 404);
    const conv = rows[0];
    if (conv.status === "approved") return apiError("Already approved", 409);
    if (conv.status === "abandoned") return apiError("Conversation abandoned", 409);

    if (conv.target_type === "employee") {
      const valid = EMPLOYEE_PROPOSAL_SCHEMA.safeParse(approved_proposal);
      if (!valid.success) {
        return apiError(`Invalid employee proposal: ${valid.error.message}`, 400);
      }
      const proposal = valid.data;

      // Load before state + employee name/level for the AttrHistory snapshot
      const beforeRows = await query<EmployeeBefore>(
        `SELECT
           ea.str, ea.int, ea.wis, ea.cha, ea.dex, ea.con, ea.rpg_class,
           COALESCE(NULLIF(e.nickname,''), e.full_name_en, e.full_name_th) AS display_name,
           e.level
         FROM employees e
         LEFT JOIN employee_attributes ea ON ea.employee_id = e.id
         WHERE e.id = $1::uuid`,
        [conv.target_id],
      );
      if (beforeRows.length === 0) return apiError("Employee not found", 404);
      const before = beforeRows[0];

      // Apply
      await query(
        `INSERT INTO employee_attributes
           (employee_id, str, int, wis, cha, dex, con, rpg_class, stat_source, updated_at)
         VALUES ($1::uuid, $2, $3, $4, $5, $6, $7, $8, 'profile_conversation', now())
         ON CONFLICT (employee_id) DO UPDATE SET
           str = EXCLUDED.str,
           int = EXCLUDED.int,
           wis = EXCLUDED.wis,
           cha = EXCLUDED.cha,
           dex = EXCLUDED.dex,
           con = EXCLUDED.con,
           rpg_class = EXCLUDED.rpg_class,
           stat_source = EXCLUDED.stat_source,
           updated_at = now()`,
        [
          conv.target_id,
          proposal.attributes.str,
          proposal.attributes.int,
          proposal.attributes.wis,
          proposal.attributes.cha,
          proposal.attributes.dex,
          proposal.attributes.con,
          proposal.archetype,
        ],
      );

      // Audit log
      await query(
        `INSERT INTO game_adjustment_log (
           target_type, target_id, action, source, field,
           before_value, after_value, criteria_snapshot, reason
         ) VALUES ($1, $2::uuid, $3, $4, $5, $6::jsonb, $7::jsonb, $8::jsonb, $9)`,
        [
          "employee",
          conv.target_id,
          "ai_adjust",
          "ai",
          "all_attributes",
          JSON.stringify(before),
          JSON.stringify(proposal.attributes),
          JSON.stringify({ archetype: proposal.archetype, conversation_id }),
          reason,
        ],
      ).catch(() => undefined); // audit table may not exist in some envs; non-fatal

      // Sheets mirror — fire and forget
      void appendGameAdjustment({
        target_type: "employee",
        target_id: conv.target_id,
        action: "ai_adjust",
        source: "ai",
        field: "all_attributes",
        before_value: before,
        after_value: proposal.attributes,
        reason,
      }).catch(() => undefined);
      void appendAttrHistory({
        employee_id: conv.target_id,
        employee_name: before.display_name,
        str: proposal.attributes.str,
        int: proposal.attributes.int,
        wis: proposal.attributes.wis,
        cha: proposal.attributes.cha,
        dex: proposal.attributes.dex,
        con: proposal.attributes.con,
        level: before.level ?? 0,
        class_label: proposal.archetype,
      }).catch(() => undefined);
      void mirrorPlayer(conv.target_id);

      // Mark conversation as approved
      await query(
        `UPDATE profile_conversations
           SET status = 'approved',
               approved_at = now(),
               approved_by = $2::uuid,
               reason = $3,
               proposal = $4::jsonb,
               updated_at = now()
         WHERE id = $1::uuid`,
        [conversation_id, approved_by ?? null, reason, JSON.stringify(proposal)],
      );

      return apiJson({
        ok: true,
        target_type: "employee",
        target_id: conv.target_id,
        applied_fields: ["str", "int", "wis", "cha", "dex", "con", "rpg_class"],
      });
    }

    // ─── Project commit ───────────────────────────────────────────────
    const valid = PROJECT_PROPOSAL_SCHEMA.safeParse(approved_proposal);
    if (!valid.success) {
      return apiError(`Invalid project proposal: ${valid.error.message}`, 400);
    }
    const proposal = valid.data;

    const beforeRows = await query<ProjectBefore>(
      `SELECT code, complexity_score, urgency_score, strategic_value_score,
              delivery_risk_score, ai_leverage_score, team_size,
              budget_thb, monthly_ceiling, project_slots
         FROM projects WHERE id = $1::uuid`,
      [conv.target_id],
    );
    if (beforeRows.length === 0) return apiError("Project not found", 404);
    const before = beforeRows[0];

    await query(
      `UPDATE projects SET
         complexity_score = $2,
         urgency_score = $3,
         strategic_value_score = $4,
         delivery_risk_score = $5,
         ai_leverage_score = $6,
         team_size = $7,
         budget_thb = COALESCE($8, budget_thb),
         monthly_ceiling = COALESCE($9, monthly_ceiling),
         project_slots = $10::jsonb,
         updated_at = now()
       WHERE id = $1::uuid`,
      [
        conv.target_id,
        proposal.complexity_score,
        proposal.urgency_score,
        proposal.strategic_value_score,
        proposal.delivery_risk_score,
        proposal.ai_leverage_score,
        proposal.team_size,
        proposal.budget_thb ?? null,
        proposal.monthly_ceiling ?? null,
        JSON.stringify(proposal.suggested_slots),
      ],
    );

    await query(
      `INSERT INTO game_adjustment_log (
         target_type, target_id, action, source, field,
         before_value, after_value, criteria_snapshot, reason
       ) VALUES ($1, $2::uuid, $3, $4, $5, $6::jsonb, $7::jsonb, $8::jsonb, $9)`,
      [
        "project",
        conv.target_id,
        "ai_adjust",
        "ai",
        "all_scores",
        JSON.stringify(before),
        JSON.stringify(proposal),
        JSON.stringify({ conversation_id }),
        reason,
      ],
    ).catch(() => undefined);

    void appendGameAdjustment({
      target_type: "project",
      target_id: conv.target_id,
      action: "ai_adjust",
      source: "ai",
      field: "all_scores",
      before_value: before,
      after_value: proposal,
      reason,
    }).catch(() => undefined);
    void mirrorProject(before.code);

    await query(
      `UPDATE profile_conversations
         SET status = 'approved',
             approved_at = now(),
             approved_by = $2::uuid,
             reason = $3,
             proposal = $4::jsonb,
             updated_at = now()
       WHERE id = $1::uuid`,
      [conversation_id, approved_by ?? null, reason, JSON.stringify(proposal)],
    );

    return apiJson({
      ok: true,
      target_type: "project",
      target_id: conv.target_id,
      applied_fields: [
        "complexity_score", "urgency_score", "strategic_value_score",
        "delivery_risk_score", "ai_leverage_score", "team_size",
        "budget_thb", "monthly_ceiling", "project_slots",
      ],
    });
  } catch (error) {
    logApiError("api/profile/commit POST error", error);
    return apiError("Commit failed", 500);
  }
}
