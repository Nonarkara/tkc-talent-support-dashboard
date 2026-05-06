/**
 * POST /api/formation/update-slots
 *
 * Update a project's `required_slots` (the per-dimension headcount
 * needs) without touching allocations. Separate from
 * `/api/formation/save-project` because the latter replaces the
 * allocation set — too expensive for a simple +/- tap on a slot needs
 * editor.
 *
 * Body: { project_code: string; required_slots: Record<SlotDimension, number> }
 *
 * Fires `mirrorFormationEvent("needs.update", …)` and `mirrorProject`
 * so the Sheets Formation tab stays in step.
 */

import { neon } from "@neondatabase/serverless";
import { NextRequest, NextResponse } from "next/server";
import { mirrorFormationEvent, mirrorProject } from "@/lib/sheets-mirror";

const sql = neon(process.env.DATABASE_URL!);

type Body = {
  project_code: string;
  required_slots: Record<string, number>;
  actor_id?: string;
};

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json()) as Body;
    if (!body.project_code) {
      return NextResponse.json({ error: "project_code is required" }, { status: 400 });
    }

    // Clamp values to non-negative integers.
    const clean: Record<string, number> = {};
    for (const [k, v] of Object.entries(body.required_slots ?? {})) {
      clean[k] = Math.max(0, Math.round(Number(v) || 0));
    }

    await sql`
      UPDATE projects
         SET project_slots = ${JSON.stringify(clean)}::jsonb,
             updated_at = NOW()
       WHERE code = ${body.project_code}
    `;

    void mirrorFormationEvent("needs.update", {
      actor_id: body.actor_id ?? null,
      project_code: body.project_code,
      extra: { required_slots: clean },
    });
    void mirrorProject(body.project_code);

    return NextResponse.json({ ok: true, project_code: body.project_code, required_slots: clean });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error("[POST /api/formation/update-slots]", msg);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
