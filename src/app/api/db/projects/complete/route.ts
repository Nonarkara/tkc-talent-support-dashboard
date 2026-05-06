import { apiError, apiJson, logApiError, parseJsonBody } from "@/lib/api";
import { isDbConfigured, query } from "@/lib/db";
import { z } from "zod";

const completeProjectSchema = z.object({
  project_id: z.string().uuid(),
  budget_actual_thb: z.number().nullable(),
  timeline_status: z.enum(["early", "on_time", "late", "failed"]),
  quality_score: z.number().min(0).max(100),
  client_satisfaction: z.number().min(1).max(5),
  notes: z.string().optional(),
  lessons: z.array(z.string()).optional(),
});

/**
 * POST /api/db/projects/complete
 * Closes a quest, records the outcome, and awards XP to the party.
 */
export async function POST(request: Request) {
  if (!isDbConfigured()) {
    return apiError("Database not configured", 503);
  }

  const parsed = await parseJsonBody(request, completeProjectSchema);
  if (!parsed.ok) return parsed.response;

  const data = parsed.data;

  try {
    // 1. Mark Project as Done
    await query(
      `UPDATE projects SET status = 'done', progress_pct = 100, updated_at = NOW() WHERE id = $1`,
      [data.project_id]
    );

    // 2. Record Outcome
    await query(
      `INSERT INTO project_outcomes (
        project_id, budget_actual_thb, timeline_status, quality_score, 
        client_satisfaction, notes, lessons, recorded_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, NOW())
      ON CONFLICT (project_id) DO UPDATE SET
        budget_actual_thb = EXCLUDED.budget_actual_thb,
        timeline_status = EXCLUDED.timeline_status,
        quality_score = EXCLUDED.quality_score,
        client_satisfaction = EXCLUDED.client_satisfaction,
        notes = EXCLUDED.notes,
        lessons = EXCLUDED.lessons,
        recorded_at = NOW()`,
      [
        data.project_id,
        data.budget_actual_thb,
        data.timeline_status,
        data.quality_score,
        data.client_satisfaction,
        data.notes ?? null,
        data.lessons ?? []
      ]
    );

    // 3. Calculate XP Award
    // Base XP: (Quality * 2) + (Satisfaction * 50)
    // Bonus: Early = 100, On Time = 50
    let xpAward = (data.quality_score * 2) + (data.client_satisfaction * 50);
    if (data.timeline_status === 'early') xpAward += 100;
    else if (data.timeline_status === 'on_time') xpAward += 50;

    // 4. Distribute XP to the Team
    // Award XP to all employees currently allocated to this project
    const team = await query<{ employee_id: string }>(
      `SELECT employee_id FROM project_allocations WHERE project_id = $1`,
      [data.project_id]
    );

    for (const member of team) {
      await query(
        `UPDATE employees SET xp = COALESCE(xp, 0) + $1 WHERE id = $2`,
        [xpAward, member.employee_id]
      );
    }

    return apiJson({ 
      ok: true, 
      xp_awarded: xpAward, 
      team_size: team.length 
    });
  } catch (error) {
    logApiError("api/db/projects/complete POST error", error);
    return apiError("Failed to complete project and award XP", 500);
  }
}
