/**
 * GET  /api/game/project-scores?project_id=...
 *   Returns scores + lock state for a single project.
 *
 * PATCH /api/game/project-scores
 *   Bulk-update multiple score fields in one request (locked check applies).
 *   Body: { project_id, scores: { complexity_score?, urgency_score?, ... }, reason }
 */

import { apiError, apiJson, logApiError } from "@/lib/api";
import { isDbConfigured, query } from "@/lib/db";

interface ScoreRow {
  id: string;
  code: string;
  name: string;
  complexity_score: number;
  urgency_score: number;
  strategic_value_score: number;
  delivery_risk_score: number;
  ai_leverage_score: number;
  config_locked: boolean;
  config_lock_reason: string | null;
  config_source: string | null;
  config_criteria: Record<string, unknown> | null;
}

const SCORE_FIELDS = [
  "complexity_score",
  "urgency_score",
  "strategic_value_score",
  "delivery_risk_score",
  "ai_leverage_score",
] as const;
type ScoreField = (typeof SCORE_FIELDS)[number];

export async function GET(request: Request) {
  if (!isDbConfigured())
    return apiJson({ error: "Database not configured" }, { status: 503 });

  const url = new URL(request.url);
  const project_id = url.searchParams.get("project_id");
  if (!project_id) return apiError("project_id required", 400);

  try {
    const rows = await query<ScoreRow>(
      `SELECT id, code, name,
              complexity_score, urgency_score, strategic_value_score,
              delivery_risk_score, ai_leverage_score,
              config_locked, config_lock_reason, config_source, config_criteria
       FROM projects WHERE id = $1`,
      [project_id],
    );
    if (!rows.length) return apiError("Project not found", 404);
    return apiJson({ project: rows[0] });
  } catch (err) {
    logApiError("api/game/project-scores GET", err);
    return apiError("Failed to fetch project scores", 500);
  }
}

export async function PATCH(request: Request) {
  if (!isDbConfigured()) return apiError("Database not configured", 503);

  const body = await request.json().catch(() => null) as {
    project_id?: string;
    scores?: Partial<Record<ScoreField, number>>;
    reason?: string;
  } | null;
  if (!body) return apiError("Invalid JSON body", 400);

  const { project_id, scores, reason } = body as {
    project_id: string;
    scores: Partial<Record<ScoreField, number>>;
    reason: string;
  };
  if (!project_id) return apiError("project_id required", 400);
  if (!reason || reason.trim().length < 10)
    return apiError("reason must be at least 10 characters", 400);
  if (!scores || typeof scores !== "object")
    return apiError("scores object required", 400);

  // Validate field names
  const updates: Array<[ScoreField, number]> = [];
  for (const [k, v] of Object.entries(scores)) {
    if (!(SCORE_FIELDS as readonly string[]).includes(k))
      return apiError(`Unknown score field: ${k}`, 400);
    if (typeof v !== "number" || !Number.isFinite(v))
      return apiError(`Value for ${k} must be a number`, 400);
    updates.push([k as ScoreField, Math.max(0, Math.min(100, Math.round(v)))]);
  }
  if (!updates.length) return apiError("No score fields provided", 400);

  try {
    // Fetch current + lock check
    const rows = await query<ScoreRow & { config_locked: boolean }>(
      `SELECT complexity_score, urgency_score, strategic_value_score,
              delivery_risk_score, ai_leverage_score, config_locked
       FROM projects WHERE id = $1`,
      [project_id],
    );
    if (!rows.length) return apiError("Project not found", 404);
    if (rows[0].config_locked)
      return apiError("Project config is locked. Unlock before adjusting.", 403);

    const current = rows[0];

    // Build SET clause safely (field names are validated against allow-list)
    const setClauses = updates.map(([f], i) => `${f} = $${i + 1}`).join(", ");
    const values: unknown[] = updates.map(([, v]) => v);
    values.push(project_id);

    await query(
      `UPDATE projects SET ${setClauses}, config_source = 'manual' WHERE id = $${values.length}`,
      values,
    );

    // Audit entry
    const before: Record<string, number> = {};
    const after: Record<string, number> = {};
    for (const [f, v] of updates) {
      before[f] = current[f];
      after[f] = v;
    }
    await query(
      `INSERT INTO game_adjustment_log
         (target_type, target_id, action, source, field, before_value, after_value, reason)
       VALUES ('project', $1, 'adjust', 'manual', 'multi_score', $2, $3, $4)`,
      [project_id, JSON.stringify(before), JSON.stringify(after), reason.trim()],
    );

    return apiJson({ ok: true, updated: Object.fromEntries(updates) });
  } catch (err) {
    logApiError("api/game/project-scores PATCH", err);
    return apiError("Failed to update project scores", 500);
  }
}
