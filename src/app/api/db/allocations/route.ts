import { apiError, apiJson, logApiError, parseJsonBody } from "@/lib/api";
import { allocationPatchPayloadSchema, allocationsPayloadSchema } from "@/lib/api-schemas";
import {
  createEmployeeAllocation,
  patchEmployeeAllocation,
  replaceProjectPlannedAllocations,
  replaceQuestPlannedAllocations,
} from "@/lib/allocation-sync";
import { isDbConfigured, query } from "@/lib/db";
import { mirrorPlayer, mirrorProject } from "@/lib/sheets-mirror";

interface AllocationRow {
  id: string;
  employee_id: string;
  project_id: string | null;
  project_code: string | null;
  project_name: string | null;
  quest_id: string | null;
  quest_code: string | null;
  quest_title: string | null;
  coe_name: string | null;
  slot_key: string | null;
  assignment_label: string | null;
  fte: number;
  planned_or_actual: "planned" | "actual";
  status: string;
  start_date: string | null;
  end_date: string | null;
  source: string | null;
  external_id: string | null;
  metadata: Record<string, unknown> | null;
  created_at: string;
  updated_at: string;
}

export async function GET(request: Request) {
  if (!isDbConfigured()) {
    return apiJson({ error: "Database not configured", allocations: [] }, { status: 503 });
  }

  try {
    const url = new URL(request.url);
    const employeeId = url.searchParams.get("employee_id");
    const projectCode = url.searchParams.get("project_code");
    const plannedOrActual = url.searchParams.get("planned_or_actual");
    const status = url.searchParams.get("status");

    const conditions: string[] = [];
    const params: unknown[] = [];
    const bind = (value: unknown) => {
      params.push(value);
      return `$${params.length}`;
    };

    if (employeeId) conditions.push(`ea.employee_id = ${bind(employeeId)}`);
    if (projectCode) conditions.push(`p.code = ${bind(projectCode)}`);
    if (plannedOrActual === "planned" || plannedOrActual === "actual") {
      conditions.push(`ea.planned_or_actual = ${bind(plannedOrActual)}`);
    }
    if (status) conditions.push(`ea.status = ${bind(status)}`);

    const rows = await query<AllocationRow>(
      `SELECT
         ea.id, ea.employee_id,
         ea.project_id, p.code AS project_code, p.name AS project_name,
         ea.quest_id, q.code AS quest_code, q.title AS quest_title,
         ea.coe_name, ea.slot_key, ea.assignment_label,
         ea.fte, ea.planned_or_actual, ea.status,
         ea.start_date, ea.end_date, ea.source, ea.external_id,
         ea.metadata, ea.created_at, ea.updated_at
       FROM employee_allocations ea
       LEFT JOIN projects p ON p.id = ea.project_id
       LEFT JOIN quests q ON q.id = ea.quest_id
       ${conditions.length > 0 ? `WHERE ${conditions.join(" AND ")}` : ""}
       ORDER BY ea.updated_at DESC
       LIMIT 400`,
      params,
    );
    return apiJson({ allocations: rows, count: rows.length });
  } catch (error) {
    logApiError("api/db/allocations GET error", error);
    return apiJson({ error: "Failed to fetch allocations", allocations: [] }, { status: 500 });
  }
}

export async function POST(request: Request) {
  if (!isDbConfigured()) return apiError("Database not configured", 503);

  const parsed = await parseJsonBody(request, allocationsPayloadSchema);
  if (!parsed.ok) return parsed.response;

  try {
    const body = parsed.data;
    const mode = body.mode ?? "append";
    const plannedOrActual = body.planned_or_actual ?? "planned";
    const status =
      body.status ?? (plannedOrActual === "planned" ? "planned" : "active");

    let projectId: string | null = null;
    if (body.project_code) {
      const projectRows = await query<{ id: string }>(
        `SELECT id FROM projects WHERE code = $1`,
        [body.project_code],
      );
      projectId = projectRows[0]?.id ?? null;
      if (!projectId) return apiError(`Project ${body.project_code} not found`, 404);
    }

    let questId: string | null = body.quest_id ?? null;
    if (!questId && body.quest_code) {
      const questRows = await query<{ id: string }>(
        `SELECT id FROM quests WHERE code = $1`,
        [body.quest_code],
      );
      questId = questRows[0]?.id ?? null;
      if (!questId) return apiError(`Quest ${body.quest_code} not found`, 404);
    }

    if (mode === "replace" && plannedOrActual === "planned" && projectId) {
      await replaceProjectPlannedAllocations({
        projectId,
        source: body.source ?? "allocations_api",
        status,
        items: body.allocations.map((item) => ({
          ...item,
          coe_name: item.coe_name ?? body.coe_name ?? null,
        })),
      });
    } else if (mode === "replace" && plannedOrActual === "planned" && questId) {
      await replaceQuestPlannedAllocations({
        questId,
        source: body.source ?? "allocations_api",
        status,
        items: body.allocations.map((item) => ({
          ...item,
          coe_name: item.coe_name ?? body.coe_name ?? null,
        })),
      });
    } else {
      for (const item of body.allocations) {
        await createEmployeeAllocation({
          employee_id: item.employee_id,
          project_id: projectId,
          quest_id: questId,
          coe_name: item.coe_name ?? body.coe_name ?? null,
          assignment_label: item.assignment_label ?? body.project_code ?? body.quest_code ?? body.coe_name ?? "",
          slot_key: item.slot_key ?? null,
          fte: item.fte,
          planned_or_actual: plannedOrActual,
          status,
          start_date: item.start_date ?? null,
          end_date: item.end_date ?? null,
          source: body.source ?? "allocations_api",
          external_id: item.external_id ?? null,
          metadata: item.metadata,
        });
      }
    }

    if (body.project_code) {
      void mirrorProject(body.project_code);
    }
    for (const employeeId of body.allocations.map((item) => item.employee_id)) {
      void mirrorPlayer(employeeId);
    }
    return apiJson({ ok: true, count: body.allocations.length });
  } catch (error) {
    logApiError("api/db/allocations POST error", error);
    return apiError("Failed to save allocations", 500);
  }
}

export async function PATCH(request: Request) {
  if (!isDbConfigured()) return apiError("Database not configured", 503);

  const parsed = await parseJsonBody(request, allocationPatchPayloadSchema);
  if (!parsed.ok) return parsed.response;

  try {
    await patchEmployeeAllocation(parsed.data);
    const rows = await query<{
      employee_id: string;
      project_code: string | null;
    }>(
      `SELECT ea.employee_id, p.code AS project_code
       FROM employee_allocations ea
       LEFT JOIN projects p ON p.id = ea.project_id
       WHERE ea.id = $1
       LIMIT 1`,
      [parsed.data.id],
    );
    const allocation = rows[0];
    if (allocation?.project_code) {
      void mirrorProject(allocation.project_code);
    }
    if (allocation?.employee_id) {
      void mirrorPlayer(allocation.employee_id);
    }
    return apiJson({ ok: true });
  } catch (error) {
    logApiError("api/db/allocations PATCH error", error);
    return apiError("Failed to update allocation", 500);
  }
}
