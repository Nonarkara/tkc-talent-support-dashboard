import { apiError, apiJson, logApiError } from "@/lib/api";
import { isDbConfigured, query } from "@/lib/db";
import { CURRENT_CYCLE } from "@/lib/cycle";

interface EvaluationRow {
  id: string;
  employee_id: string;
  dimension_key: string;
  rater_type: string;
  cycle: string;
  score: number;
  notes: string;
  updated_at: string;
}

type RaterType = "self" | "manager" | "hr";
const VALID_RATERS: RaterType[] = ["self", "manager", "hr"];

export async function GET(request: Request) {
  if (!isDbConfigured()) {
    return apiJson({ error: "Database not configured", evaluations: [] }, { status: 503 });
  }
  const url = new URL(request.url);
  const employeeId = url.searchParams.get("employee_id");
  const cycle = url.searchParams.get("cycle") ?? CURRENT_CYCLE;

  if (!employeeId) {
    return apiError("Missing employee_id", 400);
  }

  try {
    const evaluations = await query<EvaluationRow>(
      `SELECT id, employee_id, dimension_key, rater_type, cycle, score, notes, updated_at
       FROM evaluations
       WHERE employee_id = $1 AND cycle = $2`,
      [employeeId, cycle]
    );
    return apiJson({ evaluations, count: evaluations.length });
  } catch (error) {
    logApiError("api/db/evaluations GET error", error);
    return apiJson({ error: "Failed to fetch evaluations", evaluations: [] }, { status: 500 });
  }
}

export async function POST(request: Request) {
  if (!isDbConfigured()) return apiError("Database not configured", 503);

  try {
    const body = (await request.json()) as {
      employee_id: string;
      dimension_key: string;
      rater_type: RaterType;
      cycle?: string;
      score: number;
      notes?: string;
    };

    if (!body.employee_id || !body.dimension_key) {
      return apiError("Missing employee_id or dimension_key", 400);
    }
    if (!VALID_RATERS.includes(body.rater_type)) {
      return apiError("Invalid rater_type", 400);
    }
    const score = Math.max(0, Math.min(100, Number(body.score)));
    if (!Number.isFinite(score)) return apiError("Invalid score", 400);

    const cycle = body.cycle ?? CURRENT_CYCLE;

    await query(
      `INSERT INTO evaluations (employee_id, dimension_key, rater_type, cycle, score, notes)
       VALUES ($1, $2, $3, $4, $5, $6)
       ON CONFLICT (employee_id, dimension_key, rater_type, cycle)
       DO UPDATE SET score = EXCLUDED.score,
                     notes = COALESCE(EXCLUDED.notes, evaluations.notes),
                     updated_at = now()`,
      [body.employee_id, body.dimension_key, body.rater_type, cycle, score, body.notes ?? null]
    );

    return apiJson({ ok: true, score });
  } catch (error) {
    logApiError("api/db/evaluations POST error", error);
    return apiError("Failed to upsert evaluation", 500);
  }
}
