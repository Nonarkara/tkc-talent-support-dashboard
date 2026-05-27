/**
 * PATCH /api/db/missions/[id]
 *
 * Update a mission. All fields are optional; only supplied keys are updated.
 * The status field is validated against the allowed enum.
 * If demo_url is cleared (set to null/""), the client should treat the
 * mission as DRAFT regardless of the status field.
 */

import { apiError, apiJson, logApiError } from "@/lib/api";
import { isDbConfigured, query } from "@/lib/db";
import { mirrorMission } from "@/lib/sheets-mirror";

export const dynamic = "force-dynamic";

const ALLOWED_STATUSES = ["DRAFT", "BUILDING", "DEMO_READY", "DEPLOYED"] as const;

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id: rawId } = await params;
    const id = parseInt(rawId, 10);
    if (isNaN(id)) return apiError("Invalid mission id", 400);

    const body = await request.json().catch(() => null);
    if (!body || typeof body !== "object") return apiError("Invalid JSON body", 400);

    if (!isDbConfigured()) return apiError("Database not configured", 503);

    // Build SET clause from supplied fields only
    const setClauses: string[] = [];
    const values: unknown[] = [];
    let idx = 1;

    const patchable = [
      "team_name",
      "department",
      "brief",
      "owner_name",
      "owner_employee_id",
      "deadline",
      "demo_url",
      "tech_stack",
      "notes",
    ] as const;

    for (const field of patchable) {
      if (field in body) {
        setClauses.push(`${field} = $${idx++}`);
        values.push(body[field] === "" ? null : body[field]);
      }
    }

    if ("status" in body) {
      if (!ALLOWED_STATUSES.includes(body.status)) {
        return apiError(`status must be one of: ${ALLOWED_STATUSES.join(", ")}`, 400);
      }
      setClauses.push(`status = $${idx++}`);
      values.push(body.status);
    }

    if (setClauses.length === 0) return apiError("No fields to update", 400);

    values.push(id);
    const rows = await query<{
      id: number;
      team_name: string;
      department: string | null;
      brief: string | null;
      owner_name: string | null;
      owner_employee_id: string | null;
      deadline: string;
      demo_url: string | null;
      tech_stack: string | null;
      status: string;
      notes: string | null;
      created_at: string;
      updated_at: string;
    }>(
      `UPDATE missions
          SET ${setClauses.join(", ")}
        WHERE id = $${idx}
        RETURNING id, team_name, department, brief, owner_name, owner_employee_id,
                  deadline::text AS deadline, demo_url, tech_stack, status, notes,
                  created_at::text AS created_at, updated_at::text AS updated_at`,
      values,
    );

    if (!rows[0]) return apiError("Mission not found", 404);
    const mission = rows[0];

    void mirrorMission({
      id: mission.id,
      team_name: mission.team_name,
      department: mission.department,
      brief: mission.brief,
      owner_name: mission.owner_name,
      deadline: mission.deadline,
      demo_url: mission.demo_url,
      tech_stack: mission.tech_stack,
      status: mission.status,
      notes: mission.notes,
      created_at: mission.created_at,
      updated_at: mission.updated_at,
    });

    return apiJson({ ok: true, mission });
  } catch (err) {
    logApiError("api/db/missions PATCH", err);
    return apiError(err instanceof Error ? err.message : "Failed to update mission", 500);
  }
}
