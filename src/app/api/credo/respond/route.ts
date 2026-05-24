/**
 * POST /api/credo/respond
 *
 * Submit or update a Credo pulse reading for an employee in a given cycle.
 * Upserts into `credo_scores` and mirrors to Sheets.
 *
 * Body:
 *   employee_id: string (UUID)
 *   cycle?: string (default "2026-Q2")
 *   belonging: number (0–100)
 *   purpose: number (0–100)
 *   transcendence: number (0–100)
 *   story: number (0–100)
 *   pulse_source?: string (default "survey")
 */

import { apiError, apiJson, logApiError, parseJsonBody } from "@/lib/api";
import { credoResponsePayloadSchema } from "@/lib/api-schemas";
import { isDbConfigured, query } from "@/lib/db";
import { mirrorCredoScore } from "@/lib/sheets-mirror";

export async function POST(request: Request) {
  try {
    const parsed = await parseJsonBody(request, credoResponsePayloadSchema);
    if (!parsed.ok) return parsed.response;

    const { employee_id, cycle, belonging, purpose, transcendence, story, pulse_source } = parsed.data;
    const overall = Math.round((belonging + purpose + transcendence + story) / 4);

    if (!isDbConfigured()) {
      return apiError("Database not configured", 503);
    }

    await query(
      `INSERT INTO credo_scores (employee_id, cycle, belonging, purpose, transcendence, story, pulse_source, updated_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, now())
       ON CONFLICT (employee_id, cycle) DO UPDATE SET
         belonging     = EXCLUDED.belonging,
         purpose       = EXCLUDED.purpose,
         transcendence = EXCLUDED.transcendence,
         story         = EXCLUDED.story,
         pulse_source  = EXCLUDED.pulse_source,
         updated_at    = now()`,
      [employee_id, cycle, belonging, purpose, transcendence, story, pulse_source],
    );

    // Fetch employee name for the mirror
    const nameRows = await query<{ display_name: string }>(
      `SELECT COALESCE(nickname, full_name_en, full_name_th) AS display_name
       FROM employees WHERE id = $1 LIMIT 1`,
      [employee_id],
    );
    const employee_name = nameRows[0]?.display_name ?? null;

    // Fire-and-forget Sheets mirror
    void mirrorCredoScore({
      employee_id,
      cycle,
      employee_name,
      belonging,
      purpose,
      transcendence,
      story,
      overall,
      pulse_source,
      created_at: new Date().toISOString(),
    });

    return apiJson({ ok: true, employee_id, cycle, belonging, purpose, transcendence, story, overall, pulse_source });
  } catch (err) {
    logApiError("api/credo/respond", err);
    return apiError(err instanceof Error ? err.message : "Failed to save Credo response", 500);
  }
}
