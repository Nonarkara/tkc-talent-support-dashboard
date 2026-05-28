/**
 * POST /api/game/lock-in
 *
 * The "submit team sheet" moment.
 * Director has formed a team in the Formation tab and clicks LOCK IN.
 * This commits the team, creates allocations, and moves the project to active.
 *
 * Body:
 * {
 *   project_id: string,
 *   director_id: string,
 *   team: { employee_id: string, fte: number, slot_key?: string, assignment_label?: string }[],
 *   predicted_scores: { fit_pct: number, chemistry_score: number, overall_score: number },
 *   estimated_points: number,
 *   budget_status: "under" | "optimal" | "tight" | "over",
 *   formation?: string,
 *   notes?: string
 * }
 */

import { apiJson, apiError } from "@/lib/api";
import { isDbConfigured, query } from "@/lib/db";

interface LockInBody {
  project_id: string;
  director_id: string;
  team: {
    employee_id: string;
    fte: number;
    slot_key?: string;
    assignment_label?: string;
  }[];
  predicted_scores: {
    fit_pct: number;
    chemistry_score: number;
    overall_score: number;
  };
  estimated_points: number;
  budget_status: "under" | "optimal" | "tight" | "over";
  formation?: string;
  notes?: string;
}

export async function POST(request: Request) {
  if (!isDbConfigured()) {
    return apiError("Database not configured", 503);
  }

  let body: LockInBody;
  try {
    body = (await request.json()) as LockInBody;
  } catch {
    return apiError("Invalid JSON body", 400);
  }

  const { project_id, director_id, team, predicted_scores, estimated_points, budget_status, formation, notes } = body;

  if (!project_id || !director_id || !team || team.length === 0) {
    return apiError("project_id, director_id, and team are required", 400);
  }

  try {
    // 1. Verify project exists and is open/drafting
    const projectRows = await query<{ id: string; status: string; name: string }>(
      "SELECT id, status, name FROM projects WHERE id = $1",
      [project_id],
    );
    if (projectRows.length === 0) {
      return apiError("Project not found", 404);
    }
    const project = projectRows[0];
    if (project.status === "active") {
      return apiError("Project already has a locked active team", 409);
    }
    if (project.status === "completed" || project.status === "on_hold") {
      return apiError(`Cannot lock team for project with status: ${project.status}`, 400);
    }

    // 2. Verify all employees exist and are active
    const empIds = team.map((t) => t.employee_id);
    const empRows = await query<{ id: string; full_name_en: string | null; nickname: string | null }>(
      `SELECT id, full_name_en, nickname FROM employees WHERE id = ANY($1) AND is_active = true`,
      [empIds],
    );
    if (empRows.length !== empIds.length) {
      return apiError("One or more employees not found or inactive", 400);
    }

    // 3. Check for double-booking (employees already active on other projects)
    const nowStr = new Date().toISOString().split("T")[0];
    for (const member of team) {
      const existing = await query<{ total_fte: number }>(
        `SELECT COALESCE(SUM(fte), 0) as total_fte
         FROM employee_allocations
         WHERE employee_id = $1
           AND project_id != $2
           AND status = 'active'
           AND (end_date IS NULL OR end_date >= $3::date)`,
        [member.employee_id, project_id, nowStr],
      );
      const currentFte = Number(existing[0]?.total_fte ?? 0);
      if (currentFte + member.fte > 1.5) {
        const emp = empRows.find((e) => e.id === member.employee_id);
        return apiError(
          `${emp?.nickname ?? emp?.full_name_en ?? member.employee_id} is already over-allocated (${Math.round(currentFte * 100)}% on other projects)`,
          409,
        );
      }
    }

    // 4. Save team snapshot (historical record)
    const playerIds = team.map((t) => t.employee_id);
    await query(
      `INSERT INTO team_snapshots (
        project_id, coach_id, player_ids, member_count,
        fit_pct, chemistry_score, overall_score, formation, insights, trigger_event
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, 'team_locked')`,
      [
        project_id,
        director_id,
        playerIds,
        team.length,
        predicted_scores.fit_pct,
        predicted_scores.chemistry_score,
        predicted_scores.overall_score,
        formation ?? "442",
        notes ? [notes] : [],
      ],
    );

    // 5. Delete any old planned allocations for this project
    await query(
      `DELETE FROM employee_allocations WHERE project_id = $1 AND planned_or_actual = 'planned'`,
      [project_id],
    );

    // 6. Create actual allocations
    for (const member of team) {
      await query(
        `INSERT INTO employee_allocations (
          employee_id, project_id, slot_key, assignment_label,
          fte, planned_or_actual, status, source, metadata
        ) VALUES ($1, $2, $3, $4, $5, 'actual', 'active', 'game_lock_in', $6)`,
        [
          member.employee_id,
          project_id,
          member.slot_key ?? null,
          member.assignment_label ?? "",
          member.fte,
          JSON.stringify({
            predicted_fit: predicted_scores.fit_pct,
            predicted_chemistry: predicted_scores.chemistry_score,
            predicted_overall: predicted_scores.overall_score,
            estimated_points: estimated_points,
            budget_status,
            locked_at: new Date().toISOString(),
          }),
        ],
      );
    }

    // 7. Update project: set director, status active, start date if not set
    await query(
      `UPDATE projects
       SET director_id = $1,
           status = 'active',
           start_date = COALESCE(start_date, CURRENT_DATE),
           updated_at = now()
       WHERE id = $2`,
      [director_id, project_id],
    );

    // 8. Log game event
    await query(
      `INSERT INTO game_events (type, project_id, director_id, description, description_th, metadata)
       VALUES ('team_locked', $1, $2, $3, $4, $5)`,
      [
        project_id,
        director_id,
        `Team locked for "${project.name}" with ${team.length} members. Predicted score: ${predicted_scores.overall_score}.`,
        `ล็อคทีมสำหรับ "${project.name}" ${team.length} คน คะแนนคาดการณ์: ${predicted_scores.overall_score}`,
        JSON.stringify({ team_size: team.length, predicted_overall: predicted_scores.overall_score }),
      ],
    );

    return apiJson({
      ok: true,
      message: "Team locked in. Project is now active.",
      messageTh: "ล็อคทีมเรียบร้อย โครงการเริ่มต้นแล้ว",
      project_id,
      team_size: team.length,
    });
  } catch (error) {
    console.error("[api/game/lock-in] error:", error);
    return apiError("Failed to lock in team", 500);
  }
}
