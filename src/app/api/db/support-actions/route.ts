import { apiError, apiJson, logApiError, parseJsonBody } from "@/lib/api";
import {
  supportActionCreatePayloadSchema,
  supportActionUpdatePayloadSchema,
} from "@/lib/api-schemas";
import { isDbConfigured, query } from "@/lib/db";
import { mirrorSupportAction } from "@/lib/sheets-mirror";

interface SupportActionRow {
  id: string;
  employee_id: string;
  employee_nickname: string | null;
  employee_full_name_en: string | null;
  employee_full_name_th: string | null;
  cycle: string;
  action_type: string;
  target_pillar: string | null;
  title: string;
  note: string | null;
  status: string;
  owner_employee_id: string | null;
  owner_nickname: string | null;
  owner_full_name_en: string | null;
  owner_full_name_th: string | null;
  created_at: string;
  updated_at: string;
}

function displayName(
  row: Pick<
    SupportActionRow,
    "employee_nickname" | "employee_full_name_en" | "employee_full_name_th"
  >,
): string | null {
  return row.employee_nickname ?? row.employee_full_name_en ?? row.employee_full_name_th ?? null;
}

function ownerName(
  row: Pick<
    SupportActionRow,
    "owner_nickname" | "owner_full_name_en" | "owner_full_name_th"
  >,
): string | null {
  return row.owner_nickname ?? row.owner_full_name_en ?? row.owner_full_name_th ?? null;
}

function mirrorSupportActionRow(row: SupportActionRow | null | undefined) {
  if (!row) return;
  void mirrorSupportAction({
    id: row.id,
    created_at: row.created_at,
    employee_id: row.employee_id,
    employee_name: displayName(row),
    cycle: row.cycle,
    action_type: row.action_type,
    target_pillar: row.target_pillar,
    title: row.title,
    note: row.note,
    status: row.status,
    owner_id: row.owner_employee_id,
    owner_name: ownerName(row),
  });
}

async function fetchSupportActions(employeeId: string | null, cycle: string | null) {
  return query<SupportActionRow>(
    `SELECT
       sa.id,
       sa.employee_id,
       e.nickname AS employee_nickname,
       e.full_name_en AS employee_full_name_en,
       e.full_name_th AS employee_full_name_th,
       sa.cycle,
       sa.action_type,
       sa.target_pillar,
       sa.title,
       sa.note,
       sa.status,
       sa.owner_employee_id,
       owner.nickname AS owner_nickname,
       owner.full_name_en AS owner_full_name_en,
       owner.full_name_th AS owner_full_name_th,
       sa.created_at,
       sa.updated_at
     FROM support_actions sa
     LEFT JOIN employees e ON e.id = sa.employee_id
     LEFT JOIN employees owner ON owner.id = sa.owner_employee_id
     WHERE ($1::uuid IS NULL OR sa.employee_id = $1::uuid)
       AND ($2::text IS NULL OR sa.cycle = $2)
     ORDER BY
       CASE sa.status
         WHEN 'in_progress' THEN 0
         WHEN 'planned' THEN 1
         WHEN 'done' THEN 2
         ELSE 3
       END,
       sa.updated_at DESC`,
    [employeeId, cycle],
  );
}

export async function GET(request: Request) {
  if (!isDbConfigured()) {
    return apiJson(
      { error: "Database not configured", support_actions: [] },
      { status: 503 },
    );
  }

  const { searchParams } = new URL(request.url);
  const employeeId = searchParams.get("employee_id");
  const cycle = searchParams.get("cycle");

  try {
    const supportActions = await fetchSupportActions(employeeId, cycle);
    return apiJson({
      support_actions: supportActions,
      count: supportActions.length,
    });
  } catch (error) {
    logApiError("api/db/support-actions GET error", error);
    return apiJson(
      { error: "Failed to fetch support actions", support_actions: [] },
      { status: 500 },
    );
  }
}

export async function POST(request: Request) {
  if (!isDbConfigured()) {
    return apiError("Database not configured", 503);
  }

  const parsed = await parseJsonBody(request, supportActionCreatePayloadSchema);
  if (!parsed.ok) {
    return parsed.response;
  }

  const payload = parsed.data;

  try {
    const rows = await query<{ id: string }>(
      `INSERT INTO support_actions (
         employee_id,
         cycle,
         action_type,
         target_pillar,
         title,
         note,
         status,
         owner_employee_id
       )
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
       RETURNING id`,
      [
        payload.employee_id,
        payload.cycle ?? "2026-Q2",
        payload.action_type,
        payload.target_pillar ?? null,
        payload.title,
        payload.note ?? "",
        payload.status ?? "planned",
        payload.owner_employee_id ?? null,
      ],
    );

    const createdId = rows[0]?.id;
    const supportActions = createdId
      ? await fetchSupportActions(payload.employee_id, payload.cycle ?? "2026-Q2")
      : [];
    mirrorSupportActionRow(
      supportActions.find((action) => action.id === createdId) ?? null,
    );

    return apiJson({
      ok: true,
      id: createdId,
      support_action: createdId
        ? supportActions.find((action) => action.id === createdId) ?? null
        : null,
    });
  } catch (error) {
    logApiError("api/db/support-actions POST error", error);
    return apiError("Failed to create support action", 500);
  }
}

export async function PATCH(request: Request) {
  if (!isDbConfigured()) {
    return apiError("Database not configured", 503);
  }

  const parsed = await parseJsonBody(request, supportActionUpdatePayloadSchema);
  if (!parsed.ok) {
    return parsed.response;
  }

  const payload = parsed.data;
  const hasOwnerField = Object.prototype.hasOwnProperty.call(
    payload,
    "owner_employee_id",
  );
  const hasTargetPillarField = Object.prototype.hasOwnProperty.call(
    payload,
    "target_pillar",
  );

  try {
    await query(
      `UPDATE support_actions SET
         title = COALESCE($2, title),
         note = COALESCE($3, note),
         status = COALESCE($4, status),
         owner_employee_id = CASE
           WHEN $6::boolean THEN $5::uuid
           ELSE owner_employee_id
         END,
         target_pillar = CASE
           WHEN $8::boolean THEN $7::text
           ELSE target_pillar
         END,
         updated_at = now()
       WHERE id = $1`,
      [
        payload.id,
        payload.title ?? null,
        payload.note ?? null,
        payload.status ?? null,
        payload.owner_employee_id ?? null,
        hasOwnerField,
        payload.target_pillar ?? null,
        hasTargetPillarField,
      ],
    );

    const rows = await query<SupportActionRow>(
      `SELECT
         sa.id,
         sa.employee_id,
         e.nickname AS employee_nickname,
         e.full_name_en AS employee_full_name_en,
         e.full_name_th AS employee_full_name_th,
         sa.cycle,
         sa.action_type,
         sa.target_pillar,
         sa.title,
         sa.note,
         sa.status,
         sa.owner_employee_id,
         owner.nickname AS owner_nickname,
         owner.full_name_en AS owner_full_name_en,
         owner.full_name_th AS owner_full_name_th,
         sa.created_at,
         sa.updated_at
       FROM support_actions sa
       LEFT JOIN employees e ON e.id = sa.employee_id
       LEFT JOIN employees owner ON owner.id = sa.owner_employee_id
       WHERE sa.id = $1
       LIMIT 1`,
      [payload.id],
    );

    mirrorSupportActionRow(rows[0] ?? null);

    return apiJson({ ok: true, support_action: rows[0] ?? null });
  } catch (error) {
    logApiError("api/db/support-actions PATCH error", error);
    return apiError("Failed to update support action", 500);
  }
}
