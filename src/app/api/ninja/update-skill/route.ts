/**
 * POST /api/ninja/update-skill
 *
 * Manager-initiated skill attribute edit. Updates the employee's skill
 * array and upserts a skill_assessments row for each skill.
 *
 * Body:
 *   employee_id  required UUID
 *   skills       required string[] — full replacement list (validated against vocab)
 *   proficiency  optional Record<skill, 1-5> — default 3 for missing skills
 */

import { apiError, apiJson, logApiError } from "@/lib/api";
import { isDbConfigured, query } from "@/lib/db";
import { isSkill } from "@/lib/skills-vocab";
import { mirrorSquadEvent } from "@/lib/sheets-mirror";

export async function POST(request: Request) {
  if (!isDbConfigured()) return apiError("Database not configured", 503);

  try {
    const body = (await request.json()) as {
      employee_id?: string;
      skills?: unknown;
      proficiency?: Record<string, number>;
    };

    if (!body.employee_id) return apiError("Missing employee_id", 400);
    if (!Array.isArray(body.skills)) return apiError("skills must be an array", 400);

    // Validate and filter to known skill tokens
    const skills = body.skills.filter((s): s is string => typeof s === "string" && isSkill(s));
    const proficiency = body.proficiency ?? {};

    // 1. Update employees.skills[]
    await query(
      `UPDATE employees SET skills = $2, updated_at = now() WHERE id = $1`,
      [body.employee_id, skills],
    );

    // 2. Upsert skill_assessments for each skill (source = 'manager')
    for (const skill of skills) {
      const level = Math.max(1, Math.min(5, Math.round(proficiency[skill] ?? 3)));
      await query(
        `INSERT INTO skill_assessments (employee_id, skill_name, proficiency, source, assessed_at)
         VALUES ($1, $2, $3, 'manager', now())
         ON CONFLICT (employee_id, skill_name, source) DO UPDATE
           SET proficiency  = EXCLUDED.proficiency,
               assessed_at  = now()`,
        [body.employee_id, skill, level],
      );
    }

    // 3. Sheets event stub (fire-and-forget)
    void mirrorSquadEvent("skill.update", {
      actor_id: null,
      payload: {
        employee_id: body.employee_id,
        skills,
        proficiency,
      },
    });

    return apiJson({ ok: true });
  } catch (error) {
    logApiError("api/ninja/update-skill POST error", error);
    return apiError("Failed to update skills", 500);
  }
}
