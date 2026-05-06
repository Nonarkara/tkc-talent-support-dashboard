import { apiError, apiJson, logApiError, parseJsonBody } from "@/lib/api";
import { teamSavePayloadSchema } from "@/lib/api-schemas";
import { replaceProjectPlannedAllocations } from "@/lib/allocation-sync";
import { isDbConfigured, query } from "@/lib/db";
import { mirrorPlayer, mirrorProject } from "@/lib/sheets-mirror";

interface TeamRow {
  id: string;
  project_id: string;
  project_code: string;
  coach_id: string | null;
  coach_code: string | null;
  player_ids: string[];
  formation: string;
  selector_mode: string;
  fit_pct: number | null;
  chemistry_score: number | null;
  overall_score: number | null;
  insights: string[] | null;
  updated_at: string;
}

function normalizeSelectorMode(mode: string | null | undefined) {
  return mode === "hr" ? "hr" : "director";
}

function normalizeFormationMode(formation: string | null | undefined) {
  return formation === "3511" ? "3511" : "442";
}

export async function GET(request: Request) {
  if (!isDbConfigured()) {
    return apiJson(
      { error: "Database not configured", teams: [] },
      { status: 503 },
    );
  }

  const { searchParams } = new URL(request.url);
  const projectCode = searchParams.get("projectCode");

  try {
    let teams: TeamRow[];

    if (projectCode) {
      teams = await query<TeamRow>(
        `SELECT tc.*, p.code AS project_code, coach.employee_code AS coach_code
         FROM team_compositions tc
         JOIN projects p ON p.id = tc.project_id
         LEFT JOIN employees coach ON coach.id = tc.coach_id
         WHERE p.code = $1`,
        [projectCode]
      );
    } else {
      teams = await query<TeamRow>(
        `SELECT tc.*, p.code AS project_code, coach.employee_code AS coach_code
         FROM team_compositions tc
         JOIN projects p ON p.id = tc.project_id
         LEFT JOIN employees coach ON coach.id = tc.coach_id
         ORDER BY p.code`
      );
    }

    return apiJson({ teams, count: teams.length });
  } catch (error) {
    logApiError("api/db/teams GET error", error);
    return apiJson(
      { error: "Failed to fetch teams", teams: [] },
      { status: 500 },
    );
  }
}

export async function POST(request: Request) {
  if (!isDbConfigured()) {
    return apiError("Database not configured", 503);
  }

  const parsed = await parseJsonBody(request, teamSavePayloadSchema);
  if (!parsed.ok) {
    return parsed.response;
  }

  const payload = parsed.data;
  const selectorMode = normalizeSelectorMode(payload.selector_mode);
  const formation = normalizeFormationMode(payload.formation);

  try {
    // Resolve project ID
    const projectRows = await query<{ id: string }>(
      `SELECT id FROM projects WHERE code = $1`,
      [payload.project_code]
    );
    if (projectRows.length === 0) {
      return apiError(`Project ${payload.project_code} not found`, 404);
    }
    const projectId = projectRows[0].id;

    // Resolve coach ID
    let coachId: string | null = null;
    if (payload.coach_id) {
      const coachRows = await query<{ id: string }>(
        `SELECT id FROM employees WHERE id = $1`,
        [payload.coach_id]
      );
      if (coachRows.length === 0) {
        return apiError(`Coach ${payload.coach_id} not found`, 404);
      }
      coachId = coachRows[0]?.id ?? null;
    } else if (payload.coach_code) {
      const coachRows = await query<{ id: string }>(
        `SELECT id FROM employees WHERE employee_code = $1`,
        [payload.coach_code]
      );
      if (coachRows.length === 0) {
        return apiError(`Coach ${payload.coach_code} not found`, 404);
      }
      coachId = coachRows[0]?.id ?? null;
    }

    let playerIds: string[] = [];
    if ((payload.player_ids?.length ?? 0) > 0) {
      const playerRows = await query<{ id: string }>(
        `SELECT id FROM employees WHERE id = ANY($1::uuid[])`,
        [payload.player_ids],
      );

      const validPlayerIds = new Set(playerRows.map((row) => row.id));
      const missingPlayerIds = (payload.player_ids ?? []).filter(
        (id) => !validPlayerIds.has(id),
      );

      if (missingPlayerIds.length > 0) {
        return apiJson(
          {
            error: "Some player ids could not be resolved",
            missingPlayerIds,
          },
          { status: 400 },
        );
      }

      playerIds = (payload.player_ids ?? []).filter((value): value is string => Boolean(value));
    } else if (payload.player_codes.length > 0) {
      const playerRows = await query<{ id: string; employee_code: string }>(
        `SELECT id, employee_code FROM employees WHERE employee_code = ANY($1::text[])`,
        [payload.player_codes],
      );

      const playerIdByCode = new Map(
        playerRows.map((row) => [row.employee_code, row.id]),
      );
      const missingPlayerCodes = payload.player_codes.filter(
        (code) => !playerIdByCode.has(code),
      );

      if (missingPlayerCodes.length > 0) {
        return apiJson(
          {
            error: "Some player codes could not be resolved",
            missingPlayerCodes,
          },
          { status: 400 },
        );
      }

      playerIds = payload.player_codes
        .map((code) => playerIdByCode.get(code))
        .filter((value): value is string => Boolean(value));
    }

    // Keep only allocations for players actually on the roster — stops
    // stale ids lingering in the jsonb blob forever.
    const playerSet = new Set(playerIds);
    const scopedAllocation = Object.fromEntries(
      Object.entries(payload.allocation_pcts ?? {}).filter(
        ([id, pct]) => playerSet.has(id) && (pct === 25 || pct === 50 || pct === 75 || pct === 100),
      ),
    );

    // Upsert team composition
    await query(
      `INSERT INTO team_compositions (project_id, coach_id, player_ids, formation, selector_mode, fit_pct, chemistry_score, overall_score, insights, allocation_pcts)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10::jsonb)
       ON CONFLICT (project_id) DO UPDATE SET
         coach_id = EXCLUDED.coach_id,
         player_ids = EXCLUDED.player_ids,
         formation = EXCLUDED.formation,
         selector_mode = COALESCE(EXCLUDED.selector_mode, team_compositions.selector_mode),
         fit_pct = EXCLUDED.fit_pct,
         chemistry_score = EXCLUDED.chemistry_score,
         overall_score = EXCLUDED.overall_score,
         insights = EXCLUDED.insights,
         allocation_pcts = EXCLUDED.allocation_pcts,
         updated_at = now()`,
      [
        projectId, coachId, playerIds, formation,
        selectorMode,
        payload.fit_pct ?? null, payload.chemistry_score ?? null,
        payload.overall_score ?? null, payload.insights ?? [],
        JSON.stringify(scopedAllocation),
      ]
    );

    // Also save a snapshot
    await query(
      `INSERT INTO team_snapshots (project_id, coach_id, player_ids, member_count, fit_pct, chemistry_score, overall_score, formation, insights, trigger_event)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, 'manual_save')`,
      [
        projectId, coachId, playerIds, playerIds.length + (coachId ? 1 : 0),
        payload.fit_pct ?? null, payload.chemistry_score ?? null,
        payload.overall_score ?? null, formation, payload.insights ?? [],
      ]
    );

    try {
      await replaceProjectPlannedAllocations({
        projectId,
        source: "team_commit",
        status: "planned",
        items: [
          ...(coachId
            ? [
                {
                  employee_id: coachId,
                  assignment_label: `${payload.project_code} Coach`,
                  fte: 1,
                  metadata: {
                    via: "api/db/teams",
                    role: "coach",
                    selector_mode: selectorMode,
                  },
                },
              ]
            : []),
          ...playerIds.map((id) => ({
            employee_id: id,
            assignment_label: payload.project_code,
            fte: Number((scopedAllocation[id] ?? 100) / 100),
            metadata: {
              via: "api/db/teams",
              role: "player",
              formation,
              formation_source: payload.formation,
              selector_mode: selectorMode,
            },
          })),
        ],
      });
    } catch (allocationError) {
      logApiError("api/db/teams planned allocation sync warning", allocationError);
    }

    void mirrorProject(payload.project_code);
    for (const employeeId of [coachId, ...playerIds].filter((value): value is string => Boolean(value))) {
      void mirrorPlayer(employeeId);
    }

    return apiJson({ ok: true, playerCount: playerIds.length });
  } catch (error) {
    logApiError("api/db/teams POST error", error);
    return apiError("Failed to save team", 500);
  }
}
