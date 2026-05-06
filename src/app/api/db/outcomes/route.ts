import { NextResponse } from "next/server";
import { isDbConfigured, query } from "@/lib/db";
import { appendEvent } from "@/lib/sheets-sync";

interface OutcomeRow {
  id: string;
  project_id: string;
  project_code: string;
  project_name: string;
  budget_actual_thb: number | null;
  timeline_status: string;
  quality_score: number | null;
  client_satisfaction: number | null;
  predicted_fit: number | null;
  predicted_chemistry: number | null;
  predicted_overall: number | null;
  team_cost_cp: number | null;
  team_size: number | null;
  notes: string | null;
  lessons: string[] | null;
  recorded_at: string;
}

export async function GET() {
  if (!isDbConfigured()) {
    return NextResponse.json({ error: "Database not configured", outcomes: [] }, { status: 503 });
  }

  try {
    const outcomes = await query<OutcomeRow>(`
      SELECT po.*, p.code AS project_code, p.name AS project_name
      FROM project_outcomes po
      JOIN projects p ON p.id = po.project_id
      ORDER BY po.recorded_at DESC
    `);
    return NextResponse.json({ outcomes, count: outcomes.length });
  } catch (error) {
    console.error("[api/db/outcomes] GET error:", error);
    return NextResponse.json({ error: "Failed to fetch outcomes", outcomes: [] }, { status: 500 });
  }
}

export async function POST(request: Request) {
  if (!isDbConfigured()) {
    return NextResponse.json({ error: "Database not configured" }, { status: 503 });
  }

  try {
    const payload = await request.json();
    const p = payload as {
      project_code: string;
      budget_actual_thb?: number;
      timeline_status?: string;
      quality_score?: number;
      client_satisfaction?: number;
      predicted_fit?: number;
      predicted_chemistry?: number;
      predicted_overall?: number;
      team_cost_cp?: number;
      team_size?: number;
      notes?: string;
      lessons?: string[];
    };

    const projectRows = await query<{ id: string; code: string; name: string }>(
      "SELECT id, code, name FROM projects WHERE code = $1", [p.project_code]
    );
    if (projectRows.length === 0) {
      return NextResponse.json({ error: `Project ${p.project_code} not found` }, { status: 404 });
    }

    const rows = await query<{ id: string; recorded_at: string }>(
      `INSERT INTO project_outcomes (
        project_id, budget_actual_thb, timeline_status, quality_score, client_satisfaction,
        predicted_fit, predicted_chemistry, predicted_overall, team_cost_cp, team_size,
        notes, lessons
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
      ON CONFLICT (project_id) DO UPDATE SET
        budget_actual_thb = COALESCE(EXCLUDED.budget_actual_thb, project_outcomes.budget_actual_thb),
        timeline_status = COALESCE(EXCLUDED.timeline_status, project_outcomes.timeline_status),
        quality_score = COALESCE(EXCLUDED.quality_score, project_outcomes.quality_score),
        client_satisfaction = COALESCE(EXCLUDED.client_satisfaction, project_outcomes.client_satisfaction),
        notes = COALESCE(EXCLUDED.notes, project_outcomes.notes),
        lessons = COALESCE(EXCLUDED.lessons, project_outcomes.lessons),
        recorded_at = now()
      RETURNING id, recorded_at::text`,
      [
        projectRows[0].id, p.budget_actual_thb ?? null, p.timeline_status ?? "on_time",
        p.quality_score ?? null, p.client_satisfaction ?? null,
        p.predicted_fit ?? null, p.predicted_chemistry ?? null, p.predicted_overall ?? null,
        p.team_cost_cp ?? null, p.team_size ?? null,
        p.notes ?? null, p.lessons ?? [],
      ]
    );
    const outcome = rows[0];
    if (outcome) {
      void appendEvent("Events", {
        id: outcome.id,
        created_at: outcome.recorded_at,
        verb: "project_outcome",
        subject_id: projectRows[0].id,
        subject_name: `${projectRows[0].code} ${projectRows[0].name}`,
        actor_id: "",
        actor_name: "",
        payload: JSON.stringify({
          timeline_status: p.timeline_status ?? "on_time",
          quality_score: p.quality_score ?? null,
          client_satisfaction: p.client_satisfaction ?? null,
          predicted_fit: p.predicted_fit ?? null,
          predicted_chemistry: p.predicted_chemistry ?? null,
          predicted_overall: p.predicted_overall ?? null,
          team_cost_cp: p.team_cost_cp ?? null,
          team_size: p.team_size ?? null,
        }),
        source: `project_outcomes:${outcome.id}`,
      });
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("[api/db/outcomes] POST error:", error);
    return NextResponse.json({ error: "Failed to record outcome" }, { status: 500 });
  }
}
