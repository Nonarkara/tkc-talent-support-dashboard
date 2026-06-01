/**
 * POST /api/ninja/upsert-member
 *
 * Single-warrior persistence for the Ninja Tab. The big "Seal Mission"
 * route exists for full-squad commits, but the auto-save loop calls this
 * for one add / remove / FTE-change at a time. Trust honesty: every
 * action the boss takes on screen lands in Postgres immediately.
 *
 * Body shape:
 *   {
 *     verb:        "add" | "remove" | "fte",
 *     quest_id:    UUID,
 *     employee_id: string,
 *     slot_key:    string  (e.g. "ninja_1"; required for add)
 *     fte:         number  (required for add and fte verbs)
 *   }
 *
 * Mirror chain (fire-and-forget, never blocks the DB commit):
 *   - mirrorSquadEvent("member.add" | "member.remove" | "member.fte")
 */

import { apiError, apiJson, logApiError } from "@/lib/api";
import { isDbConfigured, query } from "@/lib/db";
import { mirrorSquadEvent } from "@/lib/sheets-mirror";

interface Body {
  verb: "add" | "remove" | "fte";
  quest_id: string;
  employee_id: string;
  slot_key?: string;
  fte?: number;
}

function clampFte(fte: number) {
  return Math.max(0.05, Math.min(1.5, Math.round(fte * 100) / 100));
}

export async function POST(request: Request) {
  if (!isDbConfigured()) return apiError("Database not configured", 503);

  try {
    const body = (await request.json()) as Body;
    if (!body.verb || !body.quest_id || !body.employee_id) {
      return apiError("Missing verb, quest_id, or employee_id", 400);
    }

    if (body.verb === "add") {
      if (!body.slot_key) return apiError("slot_key required for add", 400);
      const fte = clampFte(body.fte ?? 1);

      // Quest membership row — UPSERT by (quest_id, slot_key).
      await query(
        `INSERT INTO quest_members (quest_id, employee_id, slot_key)
         VALUES ($1, $2, $3)
         ON CONFLICT (quest_id, slot_key)
         DO UPDATE SET employee_id = EXCLUDED.employee_id`,
        [body.quest_id, body.employee_id, body.slot_key],
      );

      // Planned allocation row — delete any prior planned row for this
      // employee on this quest, then insert a fresh one with the new FTE.
      // (Keeps the surface honest if the boss removes + re-adds.)
      await query(
        `DELETE FROM employee_allocations
         WHERE quest_id = $1
           AND employee_id = $2
           AND planned_or_actual = 'planned'`,
        [body.quest_id, body.employee_id],
      );
      await query(
        `INSERT INTO employee_allocations (
          employee_id, quest_id, assignment_label, slot_key,
          fte, planned_or_actual, status, source, metadata
        )
        VALUES ($1, $2, '', $3, $4, 'planned', 'planned',
                'ninja_auto_persist', '{"via": "upsert-member"}'::jsonb)`,
        [body.employee_id, body.quest_id, body.slot_key, fte],
      );

      void mirrorSquadEvent("member.add", {
        quest_id: body.quest_id,
        payload: {
          employee_id: body.employee_id,
          slot_key: body.slot_key,
          fte,
          via: "ninja_auto_persist",
        },
      });
      return apiJson({ ok: true, verb: "add" });
    }

    if (body.verb === "remove") {
      await query(
        `DELETE FROM quest_members
         WHERE quest_id = $1 AND employee_id = $2`,
        [body.quest_id, body.employee_id],
      );
      await query(
        `DELETE FROM employee_allocations
         WHERE quest_id = $1 AND employee_id = $2 AND planned_or_actual = 'planned'`,
        [body.quest_id, body.employee_id],
      );

      void mirrorSquadEvent("member.remove", {
        quest_id: body.quest_id,
        payload: {
          employee_id: body.employee_id,
          via: "ninja_auto_persist",
        },
      });
      return apiJson({ ok: true, verb: "remove" });
    }

    if (body.verb === "fte") {
      const fte = clampFte(body.fte ?? 1);
      await query(
        `UPDATE employee_allocations
         SET fte = $3, updated_at = now()
         WHERE quest_id = $1
           AND employee_id = $2
           AND planned_or_actual = 'planned'`,
        [body.quest_id, body.employee_id, fte],
      );

      void mirrorSquadEvent("member.fte", {
        quest_id: body.quest_id,
        payload: {
          employee_id: body.employee_id,
          fte,
          via: "ninja_auto_persist",
        },
      });
      return apiJson({ ok: true, verb: "fte", fte });
    }

    return apiError(`Unknown verb: ${body.verb}`, 400);
  } catch (error) {
    logApiError("api/ninja/upsert-member POST error", error);
    return apiError("Failed to persist member", 500);
  }
}
