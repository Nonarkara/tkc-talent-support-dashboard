/**
 * POST /api/game/lock
 *
 * Toggle the stat_locked flag on an employee's attributes,
 * or config_locked on a project.
 *
 * Body:
 * {
 *   target_type: "employee" | "project",
 *   target_id:   string (UUID),
 *   locked:      boolean,
 *   reason:      string (required, min 10 chars)
 * }
 */

import { apiError, apiJson, logApiError } from "@/lib/api";
import { isDbConfigured, query } from "@/lib/db";

interface LockBody {
  target_type: "employee" | "project";
  target_id: string;
  locked: boolean;
  reason: string;
}

export async function POST(request: Request) {
  if (!isDbConfigured()) return apiError("Database not configured", 503);

  const body = await request.json().catch(() => null) as LockBody | null;
  if (!body) return apiError("Invalid JSON body", 400);

  const { target_type, target_id, locked, reason } = body;

  if (!["employee", "project"].includes(target_type))
    return apiError("target_type must be employee or project", 400);
  if (!target_id) return apiError("target_id required", 400);
  if (typeof locked !== "boolean") return apiError("locked must be boolean", 400);
  if (!reason || reason.trim().length < 10)
    return apiError("reason must be at least 10 characters", 400);

  try {
    if (target_type === "employee") {
      await query(
        `UPDATE employee_attributes
            SET stat_locked = $1, stat_lock_reason = $2, updated_at = now()
          WHERE employee_id = $3`,
        [locked, reason.trim(), target_id],
      );
    } else {
      await query(
        `UPDATE projects
            SET config_locked = $1, config_lock_reason = $2
          WHERE id = $3`,
        [locked, reason.trim(), target_id],
      );
    }

    // Audit log
    await query(
      `INSERT INTO game_adjustment_log
         (target_type, target_id, action, source, field, before_value, after_value, reason)
       VALUES ($1, $2, $3, 'manual', 'locked', $4, $5, $6)`,
      [
        target_type,
        target_id,
        locked ? "lock" : "unlock",
        JSON.stringify({ locked: !locked }),
        JSON.stringify({ locked }),
        reason.trim(),
      ],
    );

    return apiJson({ ok: true, locked });
  } catch (err) {
    logApiError("api/game/lock POST", err);
    return apiError("Lock toggle failed", 500);
  }
}
