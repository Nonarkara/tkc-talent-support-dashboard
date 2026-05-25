import { apiError, apiJson, logApiError } from "@/lib/api";
import { isDbConfigured, query } from "@/lib/db";
import { mirrorNinjaSquad, mirrorSquadEvent } from "@/lib/sheets-mirror";
import { CURRENT_CYCLE } from "@/lib/cycle";
import type { Skill } from "@/lib/skills-vocab";

interface QuestRow {
  id: string;
  code: string;
  title: string;
  description: string;
  cycle: string;
  dept_code: string | null;
  status: string;
  revenue_m: number | null;
  target_date: string | null;
  role_slots: unknown;
  notes: string;
  member_count: number;
  slot_count: number;
}

export async function GET(request: Request) {
  if (!isDbConfigured()) {
    return apiJson({ error: "Database not configured", quests: [] }, { status: 503 });
  }
  const url = new URL(request.url);
  const cycle = url.searchParams.get("cycle") ?? CURRENT_CYCLE;
  const status = url.searchParams.get("status");

  try {
    const quests = status
      ? await query<QuestRow>(
          `SELECT q.*,
             (SELECT COUNT(*)::int FROM quest_members qm WHERE qm.quest_id = q.id) AS member_count,
             jsonb_array_length(q.role_slots) AS slot_count
           FROM quests q
           WHERE q.cycle = $1 AND q.status = $2
           ORDER BY q.target_date NULLS LAST, q.created_at
           LIMIT 200`,
          [cycle, status]
        )
      : await query<QuestRow>(
          `SELECT q.*,
             (SELECT COUNT(*)::int FROM quest_members qm WHERE qm.quest_id = q.id) AS member_count,
             jsonb_array_length(q.role_slots) AS slot_count
           FROM quests q
           WHERE q.cycle = $1
           ORDER BY q.target_date NULLS LAST, q.created_at
           LIMIT 200`,
          [cycle]
        );
    return apiJson({ quests, count: quests.length });
  } catch (error) {
    logApiError("api/db/quests GET error", error);
    return apiJson({ error: "Failed to fetch quests", quests: [] }, { status: 500 });
  }
}

/**
 * POST /api/db/quests
 *
 * Create a new quest. Used by the Ninja tab to materialize an assembled
 * squad. The client first calls this, then POSTs each tray member to
 * /api/db/quest-members with the slot_key derived from the role_slots
 * returned here.
 *
 * Body:
 *   code          required, unique in `quests.code`
 *   title         required
 *   description   optional
 *   dept_code     optional
 *   cycle         optional, defaults to 2026-Q2
 *   role_slots    required, JSON array — see src/lib/skills-vocab.ts
 *   notes         optional
 *
 * Returns: { id: string }
 */
export async function POST(request: Request) {
  if (!isDbConfigured()) return apiError("Database not configured", 503);
  try {
    const body = (await request.json()) as {
      code?: string;
      title?: string;
      description?: string;
      dept_code?: string | null;
      cycle?: string;
      role_slots?: unknown;
      notes?: string;
      revenue_m?: number | null;
      target_date?: string | null;
      status?: string;
    };
    if (!body.code || !body.title) {
      return apiError("Missing code or title", 400);
    }
    if (!Array.isArray(body.role_slots)) {
      return apiError("role_slots must be an array", 400);
    }

    const rows = await query<{ id: string }>(
      `INSERT INTO quests (code, title, description, dept_code, cycle, status,
                           revenue_m, target_date, role_slots, notes)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8::date, $9::jsonb, $10)
       ON CONFLICT (code) DO UPDATE SET
         title = EXCLUDED.title,
         description = EXCLUDED.description,
         dept_code = EXCLUDED.dept_code,
         role_slots = EXCLUDED.role_slots,
         notes = EXCLUDED.notes,
         updated_at = now()
       RETURNING id`,
      [
        body.code,
        body.title,
        body.description ?? "",
        body.dept_code ?? null,
        body.cycle ?? CURRENT_CYCLE,
        body.status ?? "scouting",
        body.revenue_m ?? null,
        body.target_date ?? null,
        JSON.stringify(body.role_slots),
        body.notes ?? "",
      ],
    );
    const id = rows[0]?.id;
    if (!id) return apiError("Failed to create quest", 500);

    // Close the bypass: any write to /api/db/quests must mirror to Sheets
    // the same way /api/ninja/save-squad does. Fire-and-forget — never
    // blocks the response. The `source` field in the SquadEvents payload
    // makes it visible in the ledger when this generic route was used
    // instead of the canonical save-squad path.
    void mirrorNinjaSquad(id, {
      skills_required: extractSkillsFromRoleSlots(body.role_slots) as Skill[],
      readiness_overall: 0,
      readiness_gaps: [],
      chemistry: 0,
    });
    void mirrorSquadEvent("quest.write", {
      quest_id: id,
      payload: { source: "generic-quests-route", code: body.code, title: body.title },
    });

    return apiJson({ id, ok: true });
  } catch (error) {
    logApiError("api/db/quests POST error", error);
    return apiError("Failed to create quest", 500);
  }
}

/**
 * Pull a flat list of skill keys out of the role_slots JSON. The shape
 * is a union — sometimes a list of objects with `skills_required`,
 * sometimes flat strings. Best-effort: deduplicate and pass to mirror.
 */
function extractSkillsFromRoleSlots(roleSlots: unknown): string[] {
  if (!Array.isArray(roleSlots)) return [];
  const out = new Set<string>();
  for (const slot of roleSlots) {
    if (typeof slot === "string") {
      out.add(slot);
    } else if (slot && typeof slot === "object") {
      const skills = (slot as { skills_required?: unknown }).skills_required;
      if (Array.isArray(skills)) {
        for (const s of skills) if (typeof s === "string") out.add(s);
      }
      const skill = (slot as { skill?: unknown }).skill;
      if (typeof skill === "string") out.add(skill);
    }
  }
  return Array.from(out);
}

export async function PATCH(request: Request) {
  if (!isDbConfigured()) return apiError("Database not configured", 503);
  try {
    const body = (await request.json()) as {
      id: string;
      title?: string;
      description?: string;
      status?: string;
      notes?: string;
      revenue_m?: number | null;
      target_date?: string | null;
    };
    if (!body.id) return apiError("Missing quest id", 400);

    await query(
      `UPDATE quests SET
        title       = COALESCE($2, title),
        description = COALESCE($3, description),
        status      = COALESCE($4, status),
        notes       = COALESCE($5, notes),
        revenue_m   = COALESCE($6, revenue_m),
        target_date = COALESCE($7::date, target_date),
        updated_at  = now()
       WHERE id = $1`,
      [body.id, body.title ?? null, body.description ?? null, body.status ?? null,
       body.notes ?? null, body.revenue_m ?? null, body.target_date ?? null]
    );

    // Mirror PATCH so any metadata change reaches the ledger.
    void mirrorNinjaSquad(body.id, {
      skills_required: [],
      readiness_overall: 0,
      readiness_gaps: [],
      chemistry: 0,
    });
    void mirrorSquadEvent("quest.write", {
      quest_id: body.id,
      payload: { source: "generic-quests-route", op: "patch" },
    });

    return apiJson({ ok: true });
  } catch (error) {
    logApiError("api/db/quests PATCH error", error);
    return apiError("Failed to update quest", 500);
  }
}
