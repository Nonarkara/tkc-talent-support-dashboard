import { apiError, apiJson, logApiError } from "@/lib/api";
import { isDbConfigured, query } from "@/lib/db";

interface OkrRow {
  id: string;
  employee_id: string;
  cycle: string;
  objective: string;
  key_results: unknown;
  status: string;
  sort_order: number;
  updated_at: string;
}

export async function GET(request: Request) {
  if (!isDbConfigured()) {
    return apiJson({ error: "Database not configured", okrs: [] }, { status: 503 });
  }
  const url = new URL(request.url);
  const employeeId = url.searchParams.get("employee_id");
  const cycle = url.searchParams.get("cycle") ?? "2026-Q2";
  if (!employeeId) return apiError("Missing employee_id", 400);

  try {
    const okrs = await query<OkrRow>(
      `SELECT id, employee_id, cycle, objective, key_results, status, sort_order, updated_at
       FROM okrs WHERE employee_id = $1 AND cycle = $2
       ORDER BY sort_order, created_at`,
      [employeeId, cycle]
    );
    return apiJson({ okrs });
  } catch (error) {
    logApiError("api/db/okrs GET error", error);
    return apiJson({ error: "Failed to fetch OKRs", okrs: [] }, { status: 500 });
  }
}

export async function POST(request: Request) {
  if (!isDbConfigured()) return apiError("Database not configured", 503);
  try {
    const body = (await request.json()) as {
      employee_id: string;
      cycle?: string;
      objective: string;
      key_results?: unknown[];
      sort_order?: number;
    };
    if (!body.employee_id || !body.objective) {
      return apiError("Missing employee_id or objective", 400);
    }
    const cycle = body.cycle ?? "2026-Q2";
    const krs = JSON.stringify(body.key_results ?? []);

    const rows = await query<{ id: string }>(
      `INSERT INTO okrs (employee_id, cycle, objective, key_results, sort_order)
       VALUES ($1, $2, $3, $4::jsonb, $5)
       RETURNING id`,
      [body.employee_id, cycle, body.objective, krs, body.sort_order ?? 0]
    );
    return apiJson({ ok: true, id: rows[0]?.id });
  } catch (error) {
    logApiError("api/db/okrs POST error", error);
    return apiError("Failed to insert OKR", 500);
  }
}

export async function PATCH(request: Request) {
  if (!isDbConfigured()) return apiError("Database not configured", 503);
  try {
    const body = (await request.json()) as {
      id: string;
      objective?: string;
      key_results?: unknown[];
      status?: string;
      sort_order?: number;
    };
    if (!body.id) return apiError("Missing OKR id", 400);

    await query(
      `UPDATE okrs SET
        objective   = COALESCE($2, objective),
        key_results = COALESCE($3::jsonb, key_results),
        status      = COALESCE($4, status),
        sort_order  = COALESCE($5, sort_order),
        updated_at  = now()
       WHERE id = $1`,
      [
        body.id,
        body.objective ?? null,
        body.key_results === undefined ? null : JSON.stringify(body.key_results),
        body.status ?? null,
        body.sort_order ?? null,
      ]
    );
    return apiJson({ ok: true });
  } catch (error) {
    logApiError("api/db/okrs PATCH error", error);
    return apiError("Failed to update OKR", 500);
  }
}

export async function DELETE(request: Request) {
  if (!isDbConfigured()) return apiError("Database not configured", 503);
  try {
    const url = new URL(request.url);
    const id = url.searchParams.get("id");
    if (!id) return apiError("Missing id", 400);
    await query(`DELETE FROM okrs WHERE id = $1`, [id]);
    return apiJson({ ok: true });
  } catch (error) {
    logApiError("api/db/okrs DELETE error", error);
    return apiError("Failed to delete OKR", 500);
  }
}
