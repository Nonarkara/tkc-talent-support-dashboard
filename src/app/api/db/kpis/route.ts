import { apiError, apiJson, logApiError } from "@/lib/api";
import { isDbConfigured, query } from "@/lib/db";

interface KpiRow {
  id: string;
  dept_code: string;
  cycle: string;
  kpi_name_en: string;
  kpi_name_th: string | null;
  weight_pct: number;
  target_value: number | null;
  target_unit: string | null;
  actual_value: number | null;
  status: string;
  notes: string;
  updated_at: string;
}

export async function GET(request: Request) {
  if (!isDbConfigured()) {
    return apiJson({ error: "Database not configured", kpis: [] }, { status: 503 });
  }
  const url = new URL(request.url);
  const dept = url.searchParams.get("dept");
  const cycle = url.searchParams.get("cycle") ?? "FY2025";

  try {
    const kpis = dept
      ? await query<KpiRow>(
          `SELECT * FROM department_kpis WHERE dept_code = $1 AND cycle = $2
           ORDER BY weight_pct DESC NULLS LAST, kpi_name_en`,
          [dept, cycle]
        )
      : await query<KpiRow>(
          `SELECT * FROM department_kpis WHERE cycle = $1
           ORDER BY dept_code, weight_pct DESC NULLS LAST`,
          [cycle]
        );
    return apiJson({ kpis, count: kpis.length });
  } catch (error) {
    logApiError("api/db/kpis GET error", error);
    return apiJson({ error: "Failed to fetch KPIs", kpis: [] }, { status: 500 });
  }
}

export async function PATCH(request: Request) {
  if (!isDbConfigured()) return apiError("Database not configured", 503);
  try {
    const body = (await request.json()) as {
      id: string;
      actual_value?: number | null;
      status?: string;
      notes?: string;
    };
    if (!body.id) return apiError("Missing KPI id", 400);

    await query(
      `UPDATE department_kpis SET
        actual_value = COALESCE($2, actual_value),
        status       = COALESCE($3, status),
        notes        = COALESCE($4, notes),
        updated_at   = now()
       WHERE id = $1`,
      [body.id, body.actual_value ?? null, body.status ?? null, body.notes ?? null]
    );
    return apiJson({ ok: true });
  } catch (error) {
    logApiError("api/db/kpis PATCH error", error);
    return apiError("Failed to update KPI", 500);
  }
}
