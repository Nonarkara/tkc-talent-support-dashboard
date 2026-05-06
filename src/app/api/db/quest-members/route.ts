import { apiError, apiJson, logApiError } from "@/lib/api";
import { isDbConfigured, query } from "@/lib/db";
import { mirrorNinjaSquad, mirrorSquadEvent } from "@/lib/sheets-mirror";

interface MemberRow {
  id: string;
  quest_id: string;
  employee_id: string;
  slot_key: string;
  note: string;
  // joined
  nickname: string | null;
  full_name_en: string | null;
  dept_code: string | null;
  role_level: string;
  tenure_years: number;
}

export async function GET(request: Request) {
  if (!isDbConfigured()) return apiJson({ error: "Database not configured", members: [] }, { status: 503 });
  const url = new URL(request.url);
  const questId = url.searchParams.get("quest_id");
  const employeeId = url.searchParams.get("employee_id");

  try {
    if (questId) {
      const members = await query<MemberRow>(
        `SELECT qm.id, qm.quest_id, qm.employee_id, qm.slot_key, qm.note,
                e.nickname, e.full_name_en, e.role_level, e.tenure_years,
                d.code AS dept_code
         FROM quest_members qm
         JOIN employees e ON e.id = qm.employee_id
         LEFT JOIN departments d ON d.id = e.department_id
         WHERE qm.quest_id = $1
         ORDER BY qm.created_at`,
        [questId]
      );
      return apiJson({ members });
    }
    if (employeeId) {
      const members = await query<{ quest_id: string; quest_code: string; quest_title: string; slot_key: string }>(
        `SELECT qm.quest_id, qm.slot_key, q.code AS quest_code, q.title AS quest_title
         FROM quest_members qm
         JOIN quests q ON q.id = qm.quest_id
         WHERE qm.employee_id = $1 AND q.status IN ('active', 'scouting')
         ORDER BY q.target_date NULLS LAST`,
        [employeeId]
      );
      return apiJson({ members });
    }
    return apiError("Provide quest_id or employee_id", 400);
  } catch (error) {
    logApiError("api/db/quest-members GET error", error);
    return apiJson({ error: "Failed", members: [] }, { status: 500 });
  }
}

export async function POST(request: Request) {
  if (!isDbConfigured()) return apiError("Database not configured", 503);
  try {
    const body = (await request.json()) as {
      quest_id: string;
      employee_id: string;
      slot_key: string;
      note?: string;
    };
    if (!body.quest_id || !body.employee_id || !body.slot_key) {
      return apiError("Missing quest_id, employee_id, or slot_key", 400);
    }

    // Replace whoever is in the slot
    await query(`DELETE FROM quest_members WHERE quest_id = $1 AND slot_key = $2`, [body.quest_id, body.slot_key]);
    await query(
      `INSERT INTO quest_members (quest_id, employee_id, slot_key, note)
       VALUES ($1, $2, $3, $4)`,
      [body.quest_id, body.employee_id, body.slot_key, body.note ?? ""]
    );

    // Close the bypass: ledger must reflect any membership change.
    void mirrorSquadEvent("member.add", {
      quest_id: body.quest_id,
      payload: {
        employee_id: body.employee_id,
        slot_key: body.slot_key,
        source: "generic-members-route",
      },
    });
    void mirrorNinjaSquad(body.quest_id, {
      skills_required: [],
      readiness_overall: 0,
      readiness_gaps: [],
      chemistry: 0,
    });

    return apiJson({ ok: true });
  } catch (error) {
    logApiError("api/db/quest-members POST error", error);
    return apiError("Failed to assign member", 500);
  }
}

export async function DELETE(request: Request) {
  if (!isDbConfigured()) return apiError("Database not configured", 503);
  try {
    const url = new URL(request.url);
    const questId = url.searchParams.get("quest_id");
    const slotKey = url.searchParams.get("slot_key");
    if (!questId || !slotKey) return apiError("Missing quest_id or slot_key", 400);
    await query(`DELETE FROM quest_members WHERE quest_id = $1 AND slot_key = $2`, [questId, slotKey]);

    void mirrorSquadEvent("member.remove", {
      quest_id: questId,
      payload: { slot_key: slotKey, source: "generic-members-route" },
    });
    void mirrorNinjaSquad(questId, {
      skills_required: [],
      readiness_overall: 0,
      readiness_gaps: [],
      chemistry: 0,
    });

    return apiJson({ ok: true });
  } catch (error) {
    logApiError("api/db/quest-members DELETE error", error);
    return apiError("Failed to unassign", 500);
  }
}
