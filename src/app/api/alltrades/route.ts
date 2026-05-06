/**
 * Alltrades Abbey — vocation change API (v3.2)
 *
 * DQ3 canon: at level 20 a hero walks into Alltrades Abbey and changes
 * vocation. Stats halve. Level resets to 1. Spells survive.
 *
 * This route records the event. The employee's "archetype" in our model
 * is derived from dept_code + role_level by `getArchetype()`, so the
 * abbey doesn't mutate the employee row — it mutates their department
 * assignment (the canonical home-of-vocation) and appends a ledger row.
 * For now, we keep it simple and *only* append to the ledger. Moving
 * the employee between departments is a v3.2.1 follow-up that needs a
 * department-id lookup; recording the intention is the v3.2 deliverable.
 *
 *   GET  /api/alltrades?employee_id=…   — list the employee's history
 *   POST /api/alltrades                 — record a vocation change
 *
 * POST body:
 *   {
 *     employee_id:   string,
 *     from_archetype: Archetype,
 *     to_archetype:   Archetype,
 *     reason?:        string,
 *     note?:          string,
 *     level_before?:  number,
 *     actor_id?:      string
 *   }
 *
 * Sheets linkage: every POST fires a fire-and-forget append to the
 * VocationChanges tab. Silent no-op if Sheets env is missing.
 */

import { neon } from "@neondatabase/serverless";
import { NextRequest, NextResponse } from "next/server";
import {
  ARCHETYPE_LABEL,
  ARCHETYPES,
  getArchetype,
  type Archetype,
} from "@/lib/token-economy";
import { mirrorVocationChange } from "@/lib/sheets-mirror";

const sql = neon(process.env.DATABASE_URL!);

type VocationChangeBody = {
  employee_id: string;
  from_archetype: Archetype | "none";
  to_archetype: Archetype | "none";
  reason?: string | null;
  note?: string | null;
  level_before?: number | null;
  actor_id?: string | null;
};

function isArchetype(value: unknown): value is Archetype | "none" {
  return typeof value === "string" && (value === "none" || (ARCHETYPES as string[]).includes(value));
}

export async function GET(req: NextRequest) {
  try {
    const employeeId = req.nextUrl.searchParams.get("employee_id");
    const rows = employeeId
      ? await sql`
          SELECT id, employee_id, from_archetype, to_archetype,
                 changed_at, level_before, reason, note, actor_id
            FROM vocation_changes
           WHERE employee_id = ${employeeId}
           ORDER BY changed_at DESC
        `
      : await sql`
          SELECT id, employee_id, from_archetype, to_archetype,
                 changed_at, level_before, reason, note, actor_id
            FROM vocation_changes
           ORDER BY changed_at DESC
           LIMIT 200
        `;
    return NextResponse.json({ changes: rows });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error("[GET /api/alltrades]", msg);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json()) as VocationChangeBody;

    if (!body.employee_id) {
      return NextResponse.json(
        { error: "employee_id is required" },
        { status: 400 },
      );
    }
    if (!isArchetype(body.from_archetype) || !isArchetype(body.to_archetype)) {
      return NextResponse.json(
        { error: `from_archetype/to_archetype must be one of: ${ARCHETYPES.join(", ")}, none` },
        { status: 400 },
      );
    }

    // 1. Resolve current state for the mirror and to verify the employee exists
    const empRows = await sql`
      SELECT e.id, e.nickname, e.full_name_th, e.full_name_en, e.role_level, d.code AS dept_code, ea.rpg_class
        FROM employees e
        JOIN departments d ON d.id = e.department_id
        LEFT JOIN employee_attributes ea ON ea.employee_id = e.id
       WHERE e.id = ${body.employee_id}
       LIMIT 1
    `;
    const emp = empRows[0] as { id: string, nickname: string, full_name_th: string, full_name_en: string, role_level: string, dept_code: string, rpg_class: string | null } | undefined;
    if (!emp) return NextResponse.json({ error: "Employee not found" }, { status: 404 });

    const fromArchetype = getArchetype({ role_level: emp.role_level, dept_code: emp.dept_code, rpg_class: emp.rpg_class });
    const toArchetype = (body.to_archetype as string) === "none" 
      ? getArchetype({ role_level: emp.role_level, dept_code: emp.dept_code })
      : body.to_archetype;

    // 2. Mutate the live state (Alltrades Abbey ritual)
    await sql`
      INSERT INTO employee_attributes (employee_id, rpg_class, updated_at)
      VALUES (${body.employee_id}, ${body.to_archetype === "none" ? null : body.to_archetype}, now())
      ON CONFLICT (employee_id) DO UPDATE SET
        rpg_class = EXCLUDED.rpg_class,
        updated_at = now()
    `;

    // 3. Insert the ledger row
    const inserted = await sql`
      INSERT INTO vocation_changes (
        employee_id, from_archetype, to_archetype,
        level_before, reason, note, actor_id
      )
      VALUES (
        ${body.employee_id}, ${fromArchetype}, ${toArchetype},
        ${body.level_before ?? null}, ${body.reason ?? null},
        ${body.note ?? null}, ${body.actor_id ?? null}
      )
      RETURNING id, changed_at
    `;

    const row = inserted[0] as { id: string; changed_at: Date } | undefined;

    if (row) {
      const empName = emp.nickname || emp.full_name_en || emp.full_name_th || "—";
      void mirrorVocationChange({
        id: row.id,
        changed_at: row.changed_at.toISOString(),
        employee_id: body.employee_id,
        employee_name: empName,
        from_archetype: fromArchetype,
        from_label: ARCHETYPE_LABEL[fromArchetype as Archetype] ?? fromArchetype,
        to_archetype: toArchetype as Archetype,
        to_label: ARCHETYPE_LABEL[toArchetype as Archetype] ?? (toArchetype as string),
        level_before: body.level_before ?? null,
        actor_id: body.actor_id ?? null,
        reason: body.reason ?? null,
        note: body.note ?? null,
      });
    }

    return NextResponse.json({ ok: true, id: row?.id ?? null });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error("[POST /api/alltrades]", msg);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
