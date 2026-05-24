/**
 * POST /api/four-pillars/respond
 *
 * Submit or update a Four C self-report for an employee in a given cycle.
 * Upserts into `four_pillar_responses` and mirrors to Sheets.
 *
 * Body:
 *   employee_id: string (UUID)
 *   cycle?: string (default "2026-Q2")
 *   compensation: number (0–100)
 *   purpose: number (0–100)
 *   career: number (0–100)
 *   community: number (0–100)
 *   source?: string (default "self_report")
 */

import { apiError, apiJson, logApiError, parseJsonBody } from "@/lib/api";
import { fourPillarResponsePayloadSchema } from "@/lib/api-schemas";
import { isDbConfigured, query } from "@/lib/db";
import { mirrorFourPillarResponse } from "@/lib/sheets-mirror";

export async function POST(request: Request) {
  try {
    const parsed = await parseJsonBody(request, fourPillarResponsePayloadSchema);
    if (!parsed.ok) return parsed.response;

    if (!isDbConfigured()) {
      return apiError("Database not configured", 503);
    }

    const { employee_id, cycle, compensation, purpose, career, community, source } = parsed.data;

    await query(
      `INSERT INTO four_pillar_responses (employee_id, cycle, compensation, purpose, career, community, source, updated_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, now())
       ON CONFLICT (employee_id, cycle) DO UPDATE SET
         compensation = EXCLUDED.compensation,
         purpose      = EXCLUDED.purpose,
         career       = EXCLUDED.career,
         community    = EXCLUDED.community,
         source       = EXCLUDED.source,
         updated_at   = now()`,
      [employee_id, cycle, compensation, purpose, career, community, source],
    );

    // Fetch employee name for the mirror
    const nameRows = await query<{ display_name: string }>(
      `SELECT COALESCE(nickname, full_name_en, full_name_th) AS display_name
       FROM employees WHERE id = $1 LIMIT 1`,
      [employee_id],
    );
    const employee_name = nameRows[0]?.display_name ?? null;

    // Fire-and-forget Sheets mirror
    void mirrorFourPillarResponse({
      employee_id,
      cycle,
      employee_name,
      compensation,
      purpose,
      career,
      community,
      source,
      created_at: new Date().toISOString(),
    });

    return apiJson({ ok: true, employee_id, cycle, compensation, purpose, career, community, source });
  } catch (err) {
    logApiError("api/four-pillars/respond", err);
    return apiError(err instanceof Error ? err.message : "Failed to save Four C response", 500);
  }
}
