/**
 * GET  /api/db/missions  — list all missions ordered by status + created_at
 * POST /api/db/missions  — create a new mission
 *
 * Status flow: DRAFT → BUILDING → DEMO_READY → DEPLOYED
 * A mission without demo_url is always treated as DRAFT on the client.
 * The DB stores whatever status was submitted; the API never auto-downgrades.
 */

import { apiError, apiJson, logApiError, parseJsonBody } from "@/lib/api";
import { isDbConfigured, query } from "@/lib/db";
import { mirrorMission } from "@/lib/sheets-mirror";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

// ---------------------------------------------------------------------------
// GET
// ---------------------------------------------------------------------------

export async function GET() {
  if (!isDbConfigured()) {
    return apiJson({ missions: [] });
  }

  try {
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
      `SELECT id, team_name, department, brief, owner_name, owner_employee_id,
              deadline::text AS deadline, demo_url, tech_stack, status, notes,
              created_at::text AS created_at, updated_at::text AS updated_at
         FROM missions
        ORDER BY
          CASE status
            WHEN 'DEPLOYED'   THEN 1
            WHEN 'DEMO_READY' THEN 2
            WHEN 'BUILDING'   THEN 3
            WHEN 'DRAFT'      THEN 4
            ELSE 5
          END,
          created_at DESC`,
    );

    return apiJson({ missions: rows });
  } catch (err) {
    logApiError("api/db/missions GET", err);
    return apiError(err instanceof Error ? err.message : "Failed to fetch missions", 500);
  }
}

// ---------------------------------------------------------------------------
// POST
// ---------------------------------------------------------------------------

const CREATE_SCHEMA = {
  team_name: (v: unknown) => typeof v === "string" && v.trim().length > 0,
  department: (v: unknown) => v === undefined || v === null || typeof v === "string",
  brief: (v: unknown) => v === undefined || v === null || typeof v === "string",
  owner_name: (v: unknown) => v === undefined || v === null || typeof v === "string",
  owner_employee_id: (v: unknown) => v === undefined || v === null || typeof v === "string",
  deadline: (v: unknown) => v === undefined || v === null || typeof v === "string",
  demo_url: (v: unknown) => v === undefined || v === null || typeof v === "string",
  tech_stack: (v: unknown) => v === undefined || v === null || typeof v === "string",
  status: (v: unknown) => v === undefined || ["DRAFT", "BUILDING", "DEMO_READY", "DEPLOYED"].includes(v as string),
  notes: (v: unknown) => v === undefined || v === null || typeof v === "string",
};

export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => null);
    if (!body || typeof body !== "object") {
      return apiError("Invalid JSON body", 400);
    }

    if (!CREATE_SCHEMA.team_name(body.team_name)) {
      return apiError("team_name is required", 400);
    }

    if (!isDbConfigured()) {
      return apiError("Database not configured", 503);
    }

    const status: string = body.status ?? "DRAFT";
    const deadline: string = body.deadline ?? "2026-06-27";

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
      `INSERT INTO missions
         (team_name, department, brief, owner_name, owner_employee_id,
          deadline, demo_url, tech_stack, status, notes)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
       RETURNING id, team_name, department, brief, owner_name, owner_employee_id,
                 deadline::text AS deadline, demo_url, tech_stack, status, notes,
                 created_at::text AS created_at, updated_at::text AS updated_at`,
      [
        (body.team_name as string).trim(),
        body.department ?? null,
        body.brief ?? null,
        body.owner_name ?? null,
        body.owner_employee_id ?? null,
        deadline,
        body.demo_url ?? null,
        body.tech_stack ?? null,
        status,
        body.notes ?? null,
      ],
    );

    const mission = rows[0];
    if (!mission) return apiError("Insert failed", 500);

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

    return NextResponse.json({ ok: true, mission }, { status: 201 });
  } catch (err) {
    logApiError("api/db/missions POST", err);
    return apiError(err instanceof Error ? err.message : "Failed to create mission", 500);
  }
}
