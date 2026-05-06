import { apiError, apiJson, logApiError, parseJsonBody } from "@/lib/api";
import {
  supportActionCreatePayloadSchema,
  supportActionUpdatePayloadSchema,
} from "@/lib/api-schemas";
import { isDbConfigured, query } from "@/lib/db";

interface SupportActionRow {
  id: string;
  employee_id: string;
  cycle: string;
  action_type: string;
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

async function fetchSupportActions(employeeId: string | null, cycle: string | null) {
  return query<SupportActionRow>(
    `SELECT
       sa.id,
       sa.employee_id,
       sa.cycle,
       sa.action_type,
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
         title,
         note,
         status,
         owner_employee_id
       )
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       RETURNING id`,
      [
        payload.employee_id,
        payload.cycle ?? "2026-Q2",
        payload.action_type,
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
         updated_at = now()
       WHERE id = $1`,
      [
        payload.id,
        payload.title ?? null,
        payload.note ?? null,
        payload.status ?? null,
        payload.owner_employee_id ?? null,
        hasOwnerField,
      ],
    );

    const rows = await query<SupportActionRow>(
      `SELECT
         sa.id,
         sa.employee_id,
         sa.cycle,
         sa.action_type,
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
       LEFT JOIN employees owner ON owner.id = sa.owner_employee_id
       WHERE sa.id = $1
       LIMIT 1`,
      [payload.id],
    );

    return apiJson({ ok: true, support_action: rows[0] ?? null });
  } catch (error) {
    logApiError("api/db/support-actions PATCH error", error);
    return apiError("Failed to update support action", 500);
  }
}
