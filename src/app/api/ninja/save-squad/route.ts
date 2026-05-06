/**
 * POST /api/ninja/save-squad
 *
 * One-shot save path for the Ninja tab. Bundles everything the client
 * would otherwise have to choreograph across 1 + N round trips:
 *
 *   1. INSERT / UPDATE the quest row (via ON CONFLICT on `code`).
 *   2. For each tray member, wipe and re-insert their quest_members slot.
 *   3. Fire-and-forget mirror to Google Sheets:
 *        • NinjaSquads (upsert) — current readiness snapshot.
 *        • SquadEvents (append) — one "squad.save" row + one "member.add"
 *          row per tray member.
 *        • SkillCatalog (replace) — refreshed head-counts, since the
 *          vocabulary doesn't change often but this is a cheap moment
 *          to keep the read-side current.
 *
 * Why this lives in its own namespace (not /api/db/…):
 *   This route knows about the Skill vocabulary and the Ninja flow —
 *   whereas /api/db/quests is a generic CRUD shim. Keeping the Ninja
 *   logic here means future shape changes land in one place.
 */

import { apiError, apiJson, logApiError } from "@/lib/api";
import { replaceQuestPlannedAllocations } from "@/lib/allocation-sync";
import { isDbConfigured, query } from "@/lib/db";
import { isSkill, type Skill, SKILL_LABEL } from "@/lib/skills-vocab";
import {
  mirrorNinjaSquad,
  mirrorSkillCatalog,
  mirrorSquadEvent,
} from "@/lib/sheets-mirror";

interface Body {
  /** Pre-derived `quests.code`. See `ninjaQuestCode()` in squad-readiness.ts. */
  code: string;
  /** Human-readable title shown to the boss and in Sheets. */
  title: string;
  /** Optional — owning dept, falls back to null. */
  dept_code?: string | null;
  /** Optional — defaults to 2026-Q2 (matches DB default). */
  cycle?: string;
  /** Optional — freetext for the quest. */
  notes?: string;
  /** Toggled skills from the Expedia panel. Stored on each role_slot. */
  required_skills: string[];
  /** Tray picks, in the order the boss added them. */
  tray_employee_ids: string[];
  /** Optional FTE split by employee id. */
  member_ftes?: Record<string, number>;
  /** Optional richer workshop role-slot payload. */
  role_slots?: Array<{ skill?: string; importance?: number }>;
  /** Readiness headline numbers, computed client-side. */
  readiness_overall: number;
  /** Gap list, client-computed, pipe-joined into the Sheet. */
  gaps: string[];
  /** Chemistry score, reused from calculateChemistry(). */
  chemistry: number;
}

export async function POST(request: Request) {
  if (!isDbConfigured()) return apiError("Database not configured", 503);
  try {
    const body = (await request.json()) as Body;
    if (!body.code || !body.title) return apiError("Missing code or title", 400);
    if (!Array.isArray(body.required_skills)) {
      return apiError("required_skills must be an array", 400);
    }
    if (!Array.isArray(body.tray_employee_ids) || body.tray_employee_ids.length === 0) {
      return apiError("tray_employee_ids must be a non-empty array", 400);
    }

    const required: Skill[] = body.required_skills.filter(isSkill);

    // Role slots — one per tray member. slot_key is the employee index so
    // we can round-trip into quest_members cleanly. Priority_dims carries
    // the skill tokens (see code comment in squad-readiness.ts / the plan).
    const roleSlots =
      Array.isArray(body.role_slots) && body.role_slots.length > 0
        ? body.role_slots.map((slot, idx) => {
            const primarySkill = isSkill(slot.skill) ? slot.skill : required[idx % Math.max(required.length, 1)] ?? "technical";
            return {
              key: `ninja_${idx + 1}`,
              label: SKILL_LABEL[primarySkill] ?? `Slot ${idx + 1}`,
              priority_dims: [primarySkill, ...required.filter((item) => item !== primarySkill)],
              min_score: Math.max(0, Math.min(5, Math.round(slot.importance ?? 0))),
            };
          })
        : body.tray_employee_ids.map((_, idx) => {
            const primarySkill = required[idx % Math.max(required.length, 1)] ?? "technical";
            return {
              key: `ninja_${idx + 1}`,
              label: SKILL_LABEL[primarySkill as Skill] ?? `Slot ${idx + 1}`,
              priority_dims: required,
              min_score: 0,
            };
          });

    // 1. Upsert the quest.
    const questRows = await query<{ id: string }>(
      `INSERT INTO quests (code, title, description, dept_code, cycle, status, role_slots, notes)
       VALUES ($1, $2, '', $3, $4, 'scouting', $5::jsonb, $6)
       ON CONFLICT (code) DO UPDATE SET
         title = EXCLUDED.title,
         dept_code = EXCLUDED.dept_code,
         role_slots = EXCLUDED.role_slots,
         notes = EXCLUDED.notes,
         updated_at = now()
       RETURNING id`,
      [
        body.code,
        body.title,
        body.dept_code ?? null,
        body.cycle ?? "2026-Q2",
        JSON.stringify(roleSlots),
        body.notes ?? "",
      ],
    );
    const questId = questRows[0]?.id;
    if (!questId) return apiError("Failed to create quest", 500);

    // 2. Wipe old members and re-insert.
    await query(`DELETE FROM quest_members WHERE quest_id = $1`, [questId]);
    for (let idx = 0; idx < body.tray_employee_ids.length; idx++) {
      const empId = body.tray_employee_ids[idx];
      const slotKey = `ninja_${idx + 1}`;
      await query(
        `INSERT INTO quest_members (quest_id, employee_id, slot_key)
         VALUES ($1, $2, $3)
         ON CONFLICT (quest_id, slot_key) DO UPDATE SET employee_id = EXCLUDED.employee_id`,
        [questId, empId, slotKey],
      );
    }

    try {
      await replaceQuestPlannedAllocations({
        questId,
        source: "ninja_commit",
        status: "planned",
        items: body.tray_employee_ids.map((empId, idx) => ({
          employee_id: empId,
          assignment_label: body.title,
          slot_key: `ninja_${idx + 1}`,
          fte: Number(body.member_ftes?.[empId] ?? 1),
          metadata: {
            via: "api/ninja/save-squad",
            required_skills: required,
            quest_code: body.code,
          },
        })),
      });
    } catch (allocationError) {
      logApiError("api/ninja/save-squad planned allocation sync warning", allocationError);
    }

    // 3. Mirror to Sheets — fire-and-forget so a Sheets hiccup never
    //    breaks the DB commit.
    void mirrorNinjaSquad(questId, {
      skills_required: required,
      readiness_overall: body.readiness_overall,
      readiness_gaps: body.gaps.filter(isSkill),
      chemistry: body.chemistry,
    });
    void mirrorSquadEvent("squad.save", {
      quest_id: questId,
      payload: {
        code: body.code,
        title: body.title,
        required_skills: required,
        member_count: body.tray_employee_ids.length,
        readiness_overall: body.readiness_overall,
      },
    });
    for (const empId of body.tray_employee_ids) {
      void mirrorSquadEvent("member.add", {
        quest_id: questId,
        payload: { employee_id: empId, via: "ninja_tab_save" },
      });
    }
    void mirrorSkillCatalog();

    return apiJson({ ok: true, quest_id: questId });
  } catch (error) {
    logApiError("api/ninja/save-squad POST error", error);
    return apiError("Failed to save squad", 500);
  }
}
