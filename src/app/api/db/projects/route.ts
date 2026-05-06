import { apiError, apiJson, logApiError, parseJsonBody } from "@/lib/api";
import {
  projectPayloadSchema,
  projectPriorityWeightsSchema,
} from "@/lib/api-schemas";
import { isDbConfigured, query } from "@/lib/db";
import {
  calculateSuggestedTeamSize,
  inferProjectScale,
} from "@/lib/project-planning";
import { normalizeSlots } from "@/lib/project-slots";
import { mirrorProject } from "@/lib/sheets-mirror";

interface ProjectRow {
  id: string;
  code: string;
  name: string;
  client_name: string | null;
  description: string | null;
  status: string;
  priority: string;
  budget_thb: number | null;
  monthly_ceiling: number | null;
  gross_margin_pct: number | null;
  required_skills: string[];
  team_size: number;
  progress_pct: number;
  project_slots: Record<string, number> | null;
  complexity_score: number | null;
  urgency_score: number | null;
  strategic_value_score: number | null;
  delivery_risk_score: number | null;
  ai_leverage_score: number | null;
  config_locked: boolean | null;
  config_lock_reason: string | null;
  config_source: string | null;
  config_criteria: Record<string, unknown> | null;
  div_code: string | null;
  dept_code: string | null;
}

export async function GET() {
  if (!isDbConfigured()) {
    return apiJson(
      { error: "Database not configured", projects: [] },
      { status: 503 },
    );
  }

  try {
    const projects = await query<ProjectRow>(`
      SELECT
        p.id, p.code, p.name, p.client_name, p.status, p.priority,
        p.description,
        p.budget_thb, p.monthly_ceiling, p.gross_margin_pct,
        p.required_skills, p.team_size, p.progress_pct, p.project_slots,
        p.complexity_score, p.urgency_score, p.strategic_value_score,
        p.delivery_risk_score, p.ai_leverage_score,
        COALESCE(p.config_locked, false) AS config_locked,
        p.config_lock_reason, p.config_source, p.config_criteria,
        div.code AS div_code, d.code AS dept_code
      FROM projects p
      LEFT JOIN divisions div ON div.id = p.division_id
      LEFT JOIN departments d ON d.id = p.department_id
      ORDER BY
        CASE p.priority WHEN 'critical' THEN 0 WHEN 'high' THEN 1 WHEN 'medium' THEN 2 ELSE 3 END,
        p.name
    `);

    return apiJson({
      projects: projects.map((project) => ({
        ...project,
        suggested_team_size: calculateSuggestedTeamSize(project),
        inferred_scale: inferProjectScale(project),
      })),
      count: projects.length,
    });
  } catch (error) {
    logApiError("api/db/projects GET error", error);
    return apiJson(
      { error: "Failed to fetch projects", projects: [] },
      { status: 500 },
    );
  }
}

export async function POST(request: Request) {
  if (!isDbConfigured()) {
    return apiError("Database not configured", 503);
  }

  const parsed = await parseJsonBody(request, projectPayloadSchema);
  if (!parsed.ok) {
    return parsed.response;
  }

  const p = parsed.data;
  const teamSize = calculateSuggestedTeamSize({
    budget_thb: p.budget_thb ?? null,
    monthly_ceiling: p.monthly_ceiling ?? null,
    team_size: p.team_size ?? null,
    required_skills: p.required_skills ?? [],
    project_slots: p.project_slots ?? null,
    priority: p.priority ?? "medium",
  });
  const normalizedSlots = normalizeSlots(p.project_slots);

  try {
    await query(
      `INSERT INTO projects (
         code, name, client_name, description, status, priority,
         budget_thb, monthly_ceiling, gross_margin_pct, required_skills,
         team_size, progress_pct, project_slots, start_date, end_date,
         department_id, division_id
       )
       VALUES (
         $1, $2, $3, $4, $5, $6,
         $7, $8, $9, $10, $11, $12, $13::jsonb, $14::date, $15::date,
         (SELECT id FROM departments WHERE code = $16 LIMIT 1),
         (SELECT id FROM divisions WHERE code = $17 LIMIT 1)
       )
       ON CONFLICT (code) DO UPDATE SET
         name = EXCLUDED.name,
         description = COALESCE(EXCLUDED.description, projects.description),
         client_name = COALESCE(EXCLUDED.client_name, projects.client_name),
         status = COALESCE(EXCLUDED.status, projects.status),
         priority = COALESCE(EXCLUDED.priority, projects.priority),
         budget_thb = COALESCE(EXCLUDED.budget_thb, projects.budget_thb),
         monthly_ceiling = COALESCE(EXCLUDED.monthly_ceiling, projects.monthly_ceiling),
         gross_margin_pct = COALESCE(EXCLUDED.gross_margin_pct, projects.gross_margin_pct),
         required_skills = COALESCE(EXCLUDED.required_skills, projects.required_skills),
         team_size = COALESCE(EXCLUDED.team_size, projects.team_size),
         progress_pct = COALESCE(EXCLUDED.progress_pct, projects.progress_pct),
         project_slots = COALESCE(EXCLUDED.project_slots, projects.project_slots),
         start_date = COALESCE(EXCLUDED.start_date, projects.start_date),
         end_date = COALESCE(EXCLUDED.end_date, projects.end_date),
         updated_at = now()`,
      [
        p.code,
        p.name,
        p.client_name ?? null,
        p.description ?? null,
        p.status ?? "planning",
        p.priority ?? "medium",
        p.budget_thb ?? null,
        p.monthly_ceiling ?? null,
        p.gross_margin_pct ?? null,
        p.required_skills ?? [],
        teamSize,
        p.progress_pct ?? 0,
        JSON.stringify(normalizedSlots),
        p.start_date ?? null,
        p.end_date ?? null,
        p.dept_code ?? null,
        p.div_code ?? null,
      ]
    );

    void mirrorProject(p.code);
    return apiJson({ ok: true });
  } catch (error) {
    logApiError("api/db/projects POST error", error);
    return apiError("Failed to upsert project", 500);
  }
}

/**
 * PATCH /api/db/projects
 * Director tunes the 5-archetype token allocation on a project.
 * Sum is expected to be 10, enforced client-side by rebalanceWeights().
 */
export async function PATCH(request: Request) {
  if (!isDbConfigured()) {
    return apiError("Database not configured", 503);
  }

  const parsed = await parseJsonBody(request, projectPriorityWeightsSchema);
  if (!parsed.ok) {
    return parsed.response;
  }

  const { project_code, priority_weights } = parsed.data;

  try {
    const rows = await query<{ id: string }>(
      `UPDATE projects
         SET priority_weights = $2::jsonb,
             updated_at = now()
       WHERE code = $1
       RETURNING id`,
      [project_code, JSON.stringify(priority_weights)],
    );

    if (rows.length === 0) {
      return apiError(`Project ${project_code} not found`, 404);
    }

    void mirrorProject(project_code);
    return apiJson({ ok: true, priority_weights });
  } catch (error) {
    logApiError("api/db/projects PATCH error", error);
    return apiError("Failed to update priority weights", 500);
  }
}
