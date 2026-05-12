/**
 * GET /api/game/events?director_id=...&unread_only=true
 * POST /api/game/events — mark events as read
 *
 * The "newspaper" API. Directors check this to see what happened
 * while they were away.
 */

import { apiJson, apiError } from "@/lib/api";
import { isDbConfigured, query } from "@/lib/db";

interface GameEventRow {
  id: string;
  type: string;
  project_id: string | null;
  project_name: string | null;
  employee_id: string | null;
  employee_name: string | null;
  director_id: string | null;
  description: string;
  description_th: string | null;
  impact: number | null;
  metadata: Record<string, unknown> | null;
  read: boolean;
  created_at: string;
}

export async function GET(request: Request) {
  if (!isDbConfigured()) {
    return apiError("Database not configured", 503);
  }

  const url = new URL(request.url);
  const directorId = url.searchParams.get("director_id");
  const unreadOnly = url.searchParams.get("unread_only") === "true";
  const limit = Math.min(100, parseInt(url.searchParams.get("limit") ?? "20", 10));

  try {
    const conditions: string[] = [];
    const params: unknown[] = [];
    const bind = (v: unknown) => {
      params.push(v);
      return `$${params.length}`;
    };

    if (directorId) {
      conditions.push(`(e.director_id = ${bind(directorId)} OR e.director_id IS NULL)`);
    }
    if (unreadOnly) {
      conditions.push("e.read = false");
    }

    const where = conditions.length > 0 ? `WHERE ${conditions.join(" AND ")}` : "";

    const rows = await query<GameEventRow>(`
      SELECT
        e.id, e.type,
        e.project_id, p.name AS project_name,
        e.employee_id, emp.nickname AS employee_name,
        e.director_id,
        e.description, e.description_th, e.impact, e.metadata,
        e.read, e.created_at
      FROM game_events e
      LEFT JOIN projects p ON p.id = e.project_id
      LEFT JOIN employees emp ON emp.id = e.employee_id
      ${where}
      ORDER BY e.created_at DESC
      LIMIT ${bind(limit)}
    `, params);

    return apiJson({
      ok: true,
      events: rows,
      unread_count: rows.filter((r) => !r.read).length,
    });
  } catch (error) {
    console.error("[api/game/events] GET error:", error);
    return apiError("Failed to fetch events", 500);
  }
}

export async function POST(request: Request) {
  if (!isDbConfigured()) {
    return apiError("Database not configured", 503);
  }

  let body: { event_ids?: string[]; mark_all_read?: boolean; director_id?: string };
  try {
    body = (await request.json()) as typeof body;
  } catch {
    return apiError("Invalid JSON body", 400);
  }

  try {
    if (body.mark_all_read && body.director_id) {
      await query(
        `UPDATE game_events SET read = true
         WHERE director_id = $1 OR director_id IS NULL`,
        [body.director_id],
      );
    } else if (body.event_ids && body.event_ids.length > 0) {
      await query(
        `UPDATE game_events SET read = true WHERE id = ANY($1)`,
        [body.event_ids],
      );
    } else {
      return apiError("event_ids or mark_all_read required", 400);
    }

    return apiJson({ ok: true, message: "Events marked as read" });
  } catch (error) {
    console.error("[api/game/events] POST error:", error);
    return apiError("Failed to update events", 500);
  }
}
