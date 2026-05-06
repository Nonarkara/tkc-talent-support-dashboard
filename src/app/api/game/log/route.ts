/**
 * GET /api/game/log
 *
 * Fetch game_adjustment_log entries for a target.
 *
 * Query params:
 *   target_type: "employee" | "project"
 *   target_id:   UUID
 *   limit?:      number (default 20, max 100)
 */

import { apiError, apiJson, logApiError } from "@/lib/api";
import { isDbConfigured, query } from "@/lib/db";

interface LogRow {
  id: string;
  action: string;
  source: string;
  field: string;
  before_value: Record<string, unknown> | null;
  after_value: Record<string, unknown> | null;
  criteria_snapshot: Record<string, unknown> | null;
  reason: string;
  created_at: string;
}

export async function GET(request: Request) {
  if (!isDbConfigured())
    return apiJson({ error: "Database not configured", entries: [] }, { status: 503 });

  const url = new URL(request.url);
  const target_type = url.searchParams.get("target_type");
  const target_id = url.searchParams.get("target_id");
  const limitRaw = parseInt(url.searchParams.get("limit") ?? "20", 10);
  const limit = Math.max(1, Math.min(100, Number.isFinite(limitRaw) ? limitRaw : 20));

  if (!target_type || !target_id)
    return apiError("target_type and target_id are required", 400);

  try {
    const entries = await query<LogRow>(
      `SELECT id, action, source, field, before_value, after_value,
              criteria_snapshot, reason, created_at
         FROM game_adjustment_log
        WHERE target_type = $1 AND target_id = $2
        ORDER BY created_at DESC
        LIMIT $3`,
      [target_type, target_id, limit],
    );

    return apiJson({ entries, count: entries.length });
  } catch (err) {
    logApiError("api/game/log GET", err);
    return apiJson({ entries: [], count: 0 });
  }
}
