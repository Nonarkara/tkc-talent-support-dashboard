/**
 * POST /api/game/adjust
 *
 * Adjust one attribute (str/int/wis/cha/dex/con) on an employee,
 * or one score (complexity/urgency/strategic_value/delivery_risk/ai_leverage)
 * on a project.
 *
 * Rules:
 *   - stat_locked / config_locked must be false, or the request is rejected.
 *   - Every accepted change is written to game_adjustment_log.
 *   - Values are clamped: employee attrs 1–20, project scores 0–100.
 *
 * Body:
 * {
 *   target_type: "employee" | "project",
 *   target_id:   string (UUID),
 *   field:       string (attr key or score key),
 *   value:       number,
 *   reason:      string  (required, min 10 chars)
 * }
 */

import { apiError, apiJson, logApiError } from "@/lib/api";
import { isDbConfigured, query } from "@/lib/db";

const EMPLOYEE_FIELDS = ["str", "int", "wis", "cha", "dex", "con"] as const;
const PROJECT_FIELDS = [
  "complexity_score",
  "urgency_score",
  "strategic_value_score",
  "delivery_risk_score",
  "ai_leverage_score",
] as const;
type EmployeeField = (typeof EMPLOYEE_FIELDS)[number];
type ProjectField = (typeof PROJECT_FIELDS)[number];

interface AdjustBody {
  target_type: "employee" | "project";
  target_id: string;
  field: string;
  value: number;
  reason: string;
}

export async function POST(request: Request) {
  if (!isDbConfigured()) return apiError("Database not configured", 503);

  const body = await request.json().catch(() => null) as AdjustBody | null;
  if (!body) return apiError("Invalid JSON body", 400);

  const { target_type, target_id, field, value, reason } = body;

  if (!["employee", "project"].includes(target_type))
    return apiError("target_type must be employee or project", 400);
  if (!target_id) return apiError("target_id required", 400);
  if (!reason || reason.trim().length < 10)
    return apiError("reason must be at least 10 characters", 400);
  if (typeof value !== "number" || !Number.isFinite(value))
    return apiError("value must be a finite number", 400);

  try {
    if (target_type === "employee") {
      if (!(EMPLOYEE_FIELDS as readonly string[]).includes(field))
        return apiError(`field must be one of: ${EMPLOYEE_FIELDS.join(", ")}`, 400);

      const clamped = Math.max(1, Math.min(20, Math.round(value)));

      // Fetch current row + lock status
      const rows = await query<{
        [K in EmployeeField]: number;
      } & { stat_locked: boolean }>(
        `SELECT str, int, wis, cha, dex, con, stat_locked
         FROM employee_attributes WHERE employee_id = $1`,
        [target_id],
      );
      if (!rows.length) return apiError("Employee attributes not found", 404);
      const current = rows[0];
      if (current.stat_locked)
        return apiError("Stats are locked. Unlock before adjusting.", 403);

      const before = current[field as EmployeeField];
      if (before === clamped)
        return apiJson({ ok: true, message: "No change", value: clamped });

      // Apply update
      await query(
        `UPDATE employee_attributes
            SET ${field} = $1, stat_source = 'manual', updated_at = now()
          WHERE employee_id = $2`,
        [clamped, target_id],
      );

      // Write audit log
      await query(
        `INSERT INTO game_adjustment_log
           (target_type, target_id, action, source, field, before_value, after_value, reason)
         VALUES ($1, $2, 'adjust', 'manual', $3, $4, $5, $6)`,
        [
          "employee",
          target_id,
          field,
          JSON.stringify({ [field]: before }),
          JSON.stringify({ [field]: clamped }),
          reason.trim(),
        ],
      );

      return apiJson({ ok: true, field, before, after: clamped });
    }

    // ── Project ──────────────────────────────────────────────────────────
    if (!(PROJECT_FIELDS as readonly string[]).includes(field))
      return apiError(`field must be one of: ${PROJECT_FIELDS.join(", ")}`, 400);

    const clamped = Math.max(0, Math.min(100, Math.round(value)));

    const rows = await query<{
      [K in ProjectField]: number;
    } & { config_locked: boolean }>(
      `SELECT complexity_score, urgency_score, strategic_value_score,
              delivery_risk_score, ai_leverage_score, config_locked
       FROM projects WHERE id = $1`,
      [target_id],
    );
    if (!rows.length) return apiError("Project not found", 404);
    const current = rows[0];
    if (current.config_locked)
      return apiError("Project config is locked. Unlock before adjusting.", 403);

    const before = current[field as ProjectField];
    if (before === clamped)
      return apiJson({ ok: true, message: "No change", value: clamped });

    await query(
      `UPDATE projects SET ${field} = $1, config_source = 'manual' WHERE id = $2`,
      [clamped, target_id],
    );

    await query(
      `INSERT INTO game_adjustment_log
         (target_type, target_id, action, source, field, before_value, after_value, reason)
       VALUES ($1, $2, 'adjust', 'manual', $3, $4, $5, $6)`,
      [
        "project",
        target_id,
        field,
        JSON.stringify({ [field]: before }),
        JSON.stringify({ [field]: clamped }),
        reason.trim(),
      ],
    );

    return apiJson({ ok: true, field, before, after: clamped });
  } catch (err) {
    logApiError("api/game/adjust POST", err);
    return apiError("Adjustment failed", 500);
  }
}
