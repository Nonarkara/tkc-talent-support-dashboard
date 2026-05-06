import { apiError, apiJson, logApiError } from "@/lib/api";
import { isDbConfigured, query } from "@/lib/db";

interface EventRow {
  id: string;
  actor_id: string | null;
  subject_id: string | null;
  verb: string;
  payload: Record<string, unknown> | null;
  source: string | null;
  created_at: string;
}

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export async function GET(request: Request) {
  if (!isDbConfigured()) {
    return apiJson({ error: "Database not configured", events: [] }, { status: 503 });
  }

  const { searchParams } = new URL(request.url);
  const subjectId = searchParams.get("subject_id");
  const limitParam = Number(searchParams.get("limit") ?? 40);
  const limit = Number.isFinite(limitParam)
    ? Math.max(1, Math.min(100, Math.round(limitParam)))
    : 40;

  if (subjectId && !UUID_RE.test(subjectId)) {
    return apiError("Invalid subject_id", 400);
  }

  try {
    const events = await query<EventRow>(
      `SELECT
         id,
         actor_id,
         subject_id,
         verb,
         payload,
         source,
         created_at
       FROM events
       WHERE ($1::uuid IS NULL OR subject_id = $1::uuid)
       ORDER BY created_at DESC
       LIMIT $2`,
      [subjectId ?? null, limit],
    );

    return apiJson({ events, count: events.length });
  } catch (error) {
    logApiError("api/db/events GET error", error);
    return apiJson({ error: "Failed to fetch events", events: [] }, { status: 500 });
  }
}
