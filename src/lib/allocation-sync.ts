import { query } from "@/lib/db";

export interface AllocationReplaceItem {
  employee_id: string;
  fte: number;
  assignment_label?: string | null;
  slot_key?: string | null;
  coe_name?: string | null;
  start_date?: string | null;
  end_date?: string | null;
  metadata?: Record<string, unknown>;
  external_id?: string | null;
}

function clampFte(fte: number) {
  return Math.max(0.05, Math.min(1.5, Math.round(fte * 100) / 100));
}

export async function replaceProjectPlannedAllocations(args: {
  projectId: string;
  items: AllocationReplaceItem[];
  status?: "planned" | "active" | "completed" | "paused" | "cancelled";
  source?: string;
}) {
  const status = args.status ?? "planned";
  const source = args.source ?? "formation_commit";

  await query(
    `DELETE FROM employee_allocations
     WHERE project_id = $1
       AND planned_or_actual = 'planned'`,
    [args.projectId],
  );

  for (const item of args.items) {
    await query(
      `INSERT INTO employee_allocations (
        employee_id, project_id, assignment_label, slot_key, coe_name,
        fte, planned_or_actual, status, start_date, end_date,
        source, external_id, metadata
      )
      VALUES ($1, $2, $3, $4, $5, $6, 'planned', $7, $8::date, $9::date, $10, $11, $12::jsonb)`,
      [
        item.employee_id,
        args.projectId,
        item.assignment_label ?? "",
        item.slot_key ?? null,
        item.coe_name ?? null,
        clampFte(item.fte),
        status,
        item.start_date ?? null,
        item.end_date ?? null,
        source,
        item.external_id ?? null,
        JSON.stringify(item.metadata ?? {}),
      ],
    );
  }
}

export async function replaceQuestPlannedAllocations(args: {
  questId: string;
  items: AllocationReplaceItem[];
  status?: "planned" | "active" | "completed" | "paused" | "cancelled";
  source?: string;
}) {
  const status = args.status ?? "planned";
  const source = args.source ?? "ninja_commit";

  await query(
    `DELETE FROM employee_allocations
     WHERE quest_id = $1
       AND planned_or_actual = 'planned'`,
    [args.questId],
  );

  for (const item of args.items) {
    await query(
      `INSERT INTO employee_allocations (
        employee_id, quest_id, assignment_label, slot_key, coe_name,
        fte, planned_or_actual, status, start_date, end_date,
        source, external_id, metadata
      )
      VALUES ($1, $2, $3, $4, $5, $6, 'planned', $7, $8::date, $9::date, $10, $11, $12::jsonb)`,
      [
        item.employee_id,
        args.questId,
        item.assignment_label ?? "",
        item.slot_key ?? null,
        item.coe_name ?? null,
        clampFte(item.fte),
        status,
        item.start_date ?? null,
        item.end_date ?? null,
        source,
        item.external_id ?? null,
        JSON.stringify(item.metadata ?? {}),
      ],
    );
  }
}

export async function createEmployeeAllocation(args: {
  employee_id: string;
  project_id?: string | null;
  quest_id?: string | null;
  assignment_label?: string | null;
  slot_key?: string | null;
  coe_name?: string | null;
  fte: number;
  planned_or_actual: "planned" | "actual";
  status?: "planned" | "active" | "completed" | "paused" | "cancelled";
  start_date?: string | null;
  end_date?: string | null;
  source?: string | null;
  external_id?: string | null;
  metadata?: Record<string, unknown>;
}) {
  const rows = await query<{ id: string }>(
    `INSERT INTO employee_allocations (
      employee_id, project_id, quest_id, assignment_label, slot_key, coe_name,
      fte, planned_or_actual, status, start_date, end_date,
      source, external_id, metadata
    )
    VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10::date, $11::date, $12, $13, $14::jsonb)
    RETURNING id`,
    [
      args.employee_id,
      args.project_id ?? null,
      args.quest_id ?? null,
      args.assignment_label ?? "",
      args.slot_key ?? null,
      args.coe_name ?? null,
      clampFte(args.fte),
      args.planned_or_actual,
      args.status ?? (args.planned_or_actual === "actual" ? "active" : "planned"),
      args.start_date ?? null,
      args.end_date ?? null,
      args.source ?? "allocations_api",
      args.external_id ?? null,
      JSON.stringify(args.metadata ?? {}),
    ],
  );

  return rows[0]?.id ?? null;
}

export async function patchEmployeeAllocation(args: {
  id: string;
  fte?: number;
  planned_or_actual?: "planned" | "actual";
  status?: "planned" | "active" | "completed" | "paused" | "cancelled";
  start_date?: string | null;
  end_date?: string | null;
  assignment_label?: string | null;
  metadata?: Record<string, unknown>;
}) {
  await query(
    `UPDATE employee_allocations
     SET fte = COALESCE($2, fte),
         planned_or_actual = COALESCE($3, planned_or_actual),
         status = COALESCE($4, status),
         start_date = COALESCE($5::date, start_date),
         end_date = COALESCE($6::date, end_date),
         assignment_label = COALESCE($7, assignment_label),
         metadata = CASE
           WHEN $8::jsonb IS NULL THEN metadata
           ELSE metadata || $8::jsonb
         END,
         updated_at = now()
     WHERE id = $1`,
    [
      args.id,
      args.fte == null ? null : clampFte(args.fte),
      args.planned_or_actual ?? null,
      args.status ?? null,
      args.start_date ?? null,
      args.end_date ?? null,
      args.assignment_label ?? null,
      args.metadata ? JSON.stringify(args.metadata) : null,
    ],
  );
}
