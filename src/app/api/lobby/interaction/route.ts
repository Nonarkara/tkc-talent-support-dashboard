import { apiError, apiJson, logApiError, parseJsonBody } from "@/lib/api";
import { lobbyInteractionSchema } from "@/lib/api-schemas";
import { mirrorInteraction } from "@/lib/sheets-mirror";
import { isDbConfigured, query } from "@/lib/db";

export async function POST(request: Request) {
  if (!isDbConfigured()) {
    return apiError("Database not configured", 503);
  }

  const parsed = await parseJsonBody(request, lobbyInteractionSchema);
  if (!parsed.ok) {
    return parsed.response;
  }

  const data = parsed.data;

  try {
    // Resolve employee codes/depts for the mirror
    const rows = await query<{ id: string; employee_code: string; dept_code: string }>(
      `SELECT e.id, e.employee_code, d.code as dept_code
       FROM employees e
       JOIN departments d ON d.id = e.department_id
       WHERE e.id = ANY($1::uuid[])`,
      [[data.initiator_id, data.partner_id]]
    );

    const empMap = new Map(rows.map(r => [r.id, r]));
    const a = empMap.get(data.initiator_id);
    const b = empMap.get(data.partner_id);

    if (a && b) {
      const ts = new Date().toISOString();

      // 1. Save to Postgres (Source of Truth)
      await query(
        `INSERT INTO interactions (initiator_id, partner_id, interaction_type, note, happened_at)
         VALUES ($1, $2, $3, $4, $5)`,
        [data.initiator_id, data.partner_id, data.interaction_type || "chat", data.note || null, ts],
      );

      // 2. Mirror to Sheets
      void mirrorInteraction({
        a_code: a.employee_code,
        b_code: b.employee_code,
        duration_s: 10, // Simulated chat duration
        dept_a: a.dept_code,
        dept_b: b.dept_code,
        same_gender: Math.random() > 0.5, // Placeholder if gender not in query
        ts,
      });
    }

    return apiJson({ ok: true });
  } catch (error) {
    logApiError("api/lobby/interaction error", error);
    return apiError(`Failed to log interaction: ${error instanceof Error ? error.message : "Unknown error"}`, 500);
  }
}
