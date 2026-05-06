/**
 * POST /api/formation/save-project
 *
 * Clean replacement for the `team_compositions.insights` compression
 * trick. Saves a Formation state directly into `project_allocations`
 * (one row per employee/slot) and mirrors to the Google Sheets
 * Formation + FormationEvents tabs.
 *
 * Body shape:
 * {
 *   project_code: string;
 *   project_name: string;
 *   required_slots: Record<SlotDimension, number>;
 *   allocations: Array<{ employee_id: string; slot_dimension: string; fte?: number; party_order?: 1|2|3 }>;
 *   readiness: { coverage: number; quality: number; chemistry: number; morale: number; overall: number };
 *   actor_id?: string;
 * }
 *
 * Auth note: currently unguarded. TODO(access-control) gate once the
 * governance model lands — plan file §A6.
 */

import { neon } from "@neondatabase/serverless";
import { NextRequest, NextResponse } from "next/server";
import {
  mirrorFormation,
  mirrorFormationEvent,
  mirrorPlayer,
  mirrorProject,
  mirrorTeamAssignments,
} from "@/lib/sheets-mirror";

const sql = neon(process.env.DATABASE_URL!);

type Body = {
  project_code: string;
  project_name: string;
  required_slots: Record<string, number>;
  allocations: Array<{
    employee_id: string;
    slot_dimension: string;
    fte?: number;
    /** DQ3 party order. 1=front, 2=mid (default), 3=back. */
    party_order?: 1 | 2 | 3;
  }>;
  readiness: {
    coverage: number;
    quality: number;
    chemistry: number;
    morale: number;
    overall: number;
  };
  actor_id?: string;
};

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json()) as Body;

    if (!body.project_code) {
      return NextResponse.json({ error: "project_code is required" }, { status: 400 });
    }

    // Resolve project row.
    const projRows = await sql`
      SELECT id FROM projects WHERE code = ${body.project_code} LIMIT 1
    `;
    if (projRows.length === 0) {
      return NextResponse.json({ error: "project not found" }, { status: 404 });
    }
    const projectId = projRows[0].id as string;

    // Update required_slots (reuses existing project_slots JSONB column).
    await sql`
      UPDATE projects
         SET project_slots = ${JSON.stringify(body.required_slots)}::jsonb,
             updated_at = NOW()
       WHERE id = ${projectId}
    `;

    // Replace the allocation set atomically.
    await sql`DELETE FROM project_allocations WHERE project_id = ${projectId}`;

    for (const a of body.allocations) {
      await sql`
        INSERT INTO project_allocations
          (project_id, employee_id, slot_dimension, fte, party_order,
           coverage_pct, quality_pct, chemistry, morale, overall_pct)
        VALUES
          (${projectId}, ${a.employee_id}, ${a.slot_dimension}, ${a.fte ?? 1.0},
           ${a.party_order ?? 2},
           ${body.readiness.coverage}, ${body.readiness.quality},
           ${body.readiness.chemistry}, ${body.readiness.morale},
           ${body.readiness.overall})
        ON CONFLICT (project_id, employee_id, slot_dimension) DO NOTHING
      `;
    }

    // Compute filled-slot counts for the mirror payload.
    const filled: Record<string, number> = {
      technical: 0, sales: 0, marketing: 0, outsourcing: 0, paperwork: 0,
    };
    for (const a of body.allocations) {
      filled[a.slot_dimension] = (filled[a.slot_dimension] ?? 0) + 1;
    }

    // Party-order counts for the Sheets mirror.
    let front_count = 0;
    let mid_count = 0;
    let back_count = 0;
    for (const a of body.allocations) {
      const ord = a.party_order ?? 2;
      if (ord === 1) front_count += 1;
      else if (ord === 3) back_count += 1;
      else mid_count += 1;
    }

    // Fire-and-forget Sheets mirror.
    void mirrorFormation({
      project_code: body.project_code,
      project_name: body.project_name,
      required_slots: body.required_slots,
      filled_slots: filled,
      assigned: body.allocations.map((a) => ({
        employee_id: a.employee_id,
        slot_dimension: a.slot_dimension,
        party_order: (a.party_order ?? 2) as 1 | 2 | 3,
      })),
      front_count,
      mid_count,
      back_count,
      coverage_pct: body.readiness.coverage,
      quality_pct: body.readiness.quality,
      chemistry: body.readiness.chemistry,
      morale: body.readiness.morale,
      overall_readiness_pct: body.readiness.overall,
    });

    void mirrorFormationEvent("save", {
      actor_id: body.actor_id ?? null,
      project_code: body.project_code,
      extra: {
        required_slots: body.required_slots,
        allocation_count: body.allocations.length,
        readiness: body.readiness,
      },
    });
    void mirrorProject(body.project_code);
    void mirrorTeamAssignments();
    for (const employeeId of body.allocations.map((item) => item.employee_id)) {
      void mirrorPlayer(employeeId);
    }

    return NextResponse.json({
      ok: true,
      project_code: body.project_code,
      allocations_saved: body.allocations.length,
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error("[POST /api/formation/save-project]", msg);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
