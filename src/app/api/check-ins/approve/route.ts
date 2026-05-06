/**
 * POST /api/check-ins/approve
 *
 * Step two of the Chronicle ritual. Ratify the manager-edited deltas.
 *
 * Request: { check_in_id, approved_deltas: [{attr, delta}], notes? }
 * Behaviour:
 *   1. Load the check_in, guard status === 'proposed'.
 *   2. Load current attributes (baseline for the event payload).
 *   3. Apply each delta to `employee_attributes`, clamped 1..20.
 *   4. Insert one `events(verb='stat_delta')` row per delta + one
 *      `events(verb='check_in')` summary row.
 *   5. Patch `check_ins` to status='approved'.
 *   6. Fire-and-forget Sheets sync: CheckIns, Events (per row), Players
 *      (mirrorPlayer), AttrHistory. All failures are swallowed — the DB
 *      commit is already done and the UI returns whether Sheets is up
 *      or not.
 *
 * No transaction — Neon serverless HTTP driver does not support them.
 * Idempotency is enforced by the status guard: re-submitting an approved
 * check-in returns 409.
 */

import { apiError, apiJson, logApiError, parseJsonBody } from "@/lib/api";
import { checkInApproveSchema } from "@/lib/api-schemas";
import { isDbConfigured, query } from "@/lib/db";
import { appendEvent } from "@/lib/sheets-sync";
import { appendAttrHistory, mirrorPlayer } from "@/lib/sheets-mirror";
import { ARCHETYPE_LABEL, getArchetype } from "@/lib/token-economy";
import { normalizeSentimentSignal } from "@/lib/sentiment-engine";

type AttrKey = "str" | "int" | "wis" | "cha" | "dex" | "con";

interface CheckInRow {
  id: string;
  employee_id: string;
  manager_id: string | null;
  cycle: string;
  narrative: string;
  status: string;
  llm_proposal: unknown;
}

interface AttrRow {
  str: number;
  int: number;
  wis: number;
  cha: number;
  dex: number;
  con: number;
}

interface EmployeeRow {
  id: string;
  display_name: string;
  role_level: string;
  dept_code: string | null;
}

const CLAMP_MIN = 1;
const CLAMP_MAX = 20;

function clamp(n: number): number {
  return Math.max(CLAMP_MIN, Math.min(CLAMP_MAX, n));
}

export async function POST(request: Request) {
  if (!isDbConfigured()) return apiError("Database not configured", 503);

  const parsed = await parseJsonBody(request, checkInApproveSchema);
  if (!parsed.ok) return parsed.response;

  const { check_in_id, approved_deltas, notes } = parsed.data;

  try {
    // 1. Load + guard.
    const [check_in] = await query<CheckInRow>(
      `SELECT id, employee_id, manager_id, cycle, narrative, status, llm_proposal
         FROM check_ins
        WHERE id = $1
        LIMIT 1`,
      [check_in_id],
    );
    if (!check_in) return apiError("Check-in not found", 404);
    if (check_in.status !== "proposed") {
      return apiError(`Check-in status must be 'proposed' (got '${check_in.status}')`, 409);
    }

    // 2. Employee + current attrs.
    const [emp] = await query<EmployeeRow>(
      `SELECT e.id,
              COALESCE(NULLIF(e.nickname, ''), NULLIF(e.full_name_en, ''), e.full_name_th) AS display_name,
              e.role_level,
              d.code AS dept_code
         FROM employees e
         LEFT JOIN departments d ON d.id = e.department_id
        WHERE e.id = $1
        LIMIT 1`,
      [check_in.employee_id],
    );
    if (!emp) return apiError("Employee not found", 404);

    const [beforeAttrs] = await query<AttrRow>(
      `SELECT str, int, wis, cha, dex, con
         FROM employee_attributes
        WHERE employee_id = $1
        LIMIT 1`,
      [check_in.employee_id],
    );
    if (!beforeAttrs) {
      // Rare: employee exists but no attribute row. Refuse — attributes
      // are seeded at import time; missing row is a data issue, not a
      // state we should silently paper over here.
      return apiError("Employee has no attribute row yet", 422);
    }

    // 3. Apply deltas. Collapse duplicates (shouldn't happen after UI
    // consolidation, but be defensive).
    const byAttr = new Map<AttrKey, number>();
    for (const d of approved_deltas) {
      byAttr.set(d.attr, (byAttr.get(d.attr) ?? 0) + d.delta);
    }
    const effectiveDeltas = Array.from(byAttr.entries())
      .map(([attr, delta]) => ({ attr, delta }))
      .filter((d) => d.delta !== 0);

    // Compute from/to per attribute *before* the UPDATE so we can stamp
    // accurate payloads even if the UPDATE partially clamps.
    const changeLog = effectiveDeltas.map((d) => {
      const from = beforeAttrs[d.attr];
      const to = clamp(from + d.delta);
      return { attr: d.attr, delta: to - from, from, to };
    });

    // Apply UPDATE — one SET per attribute, using GREATEST/LEAST for DB-side clamp.
    // Build dynamic SET clause.
    if (changeLog.length > 0) {
      const sets: string[] = [];
      const params: unknown[] = [check_in.employee_id];
      let i = 2;
      for (const c of changeLog) {
        sets.push(`${c.attr} = GREATEST(${CLAMP_MIN}, LEAST(${CLAMP_MAX}, ${c.attr} + $${i}))`);
        params.push(c.delta);
        i++;
      }
      sets.push(`updated_at = now()`);
      await query(
        `UPDATE employee_attributes SET ${sets.join(", ")} WHERE employee_id = $1`,
        params,
      );
    }

    // Re-read the post-update attributes for the event + Sheets snapshot.
    const [afterAttrs] = await query<AttrRow>(
      `SELECT str, int, wis, cha, dex, con
         FROM employee_attributes
        WHERE employee_id = $1
        LIMIT 1`,
      [check_in.employee_id],
    );
    const after = afterAttrs ?? beforeAttrs;
    const proposalObject =
      check_in.llm_proposal && typeof check_in.llm_proposal === "object"
        ? (check_in.llm_proposal as Record<string, unknown>)
        : {};
    const sentiment = normalizeSentimentSignal(
      proposalObject.sentiment,
      check_in.narrative,
      { source: `check_in:${check_in.id}` },
    );

    // 4. Events — one stat_delta per change, one check_in summary.
    const eventIds: string[] = [];
    for (const c of changeLog) {
      const [ev] = await query<{ id: string; created_at: string }>(
        `INSERT INTO events (actor_id, subject_id, verb, payload, source)
         VALUES ($1, $2, 'stat_delta', $3::jsonb, $4)
         RETURNING id, created_at::text`,
        [
          check_in.manager_id ?? null,
          check_in.employee_id,
          JSON.stringify({ attr: c.attr, delta: c.delta, from: c.from, to: c.to }),
          `check_in:${check_in.id}`,
        ],
      );
      eventIds.push(ev.id);
      // Sheets: append one Events row per stat_delta.
      void appendEvent("Events", {
        id: ev.id,
        created_at: ev.created_at,
        verb: "stat_delta",
        subject_id: check_in.employee_id,
        subject_name: emp.display_name,
        actor_id: check_in.manager_id ?? "",
        actor_name: "",
        payload: JSON.stringify({ attr: c.attr, delta: c.delta, from: c.from, to: c.to }),
        source: `check_in:${check_in.id}`,
      });
    }

    const narrativePreview = check_in.narrative.slice(0, 200);
    const [checkInEvent] = await query<{ id: string; created_at: string }>(
      `INSERT INTO events (actor_id, subject_id, verb, payload, source)
       VALUES ($1, $2, 'check_in', $3::jsonb, $4)
       RETURNING id, created_at::text`,
      [
        check_in.manager_id ?? null,
        check_in.employee_id,
        JSON.stringify({
          narrative_preview: narrativePreview,
          deltas: changeLog,
          sentiment,
          notes: notes ?? null,
        }),
        `check_in:${check_in.id}`,
      ],
    );
    eventIds.push(checkInEvent.id);
    void appendEvent("Events", {
      id: checkInEvent.id,
      created_at: checkInEvent.created_at,
      verb: "check_in",
      subject_id: check_in.employee_id,
      subject_name: emp.display_name,
      actor_id: check_in.manager_id ?? "",
      actor_name: "",
      payload: JSON.stringify({
        narrative_preview: narrativePreview,
        deltas: changeLog,
        sentiment,
        notes: notes ?? null,
      }),
      source: `check_in:${check_in.id}`,
    });

    // 5. Mark the check-in approved.
    const approvedPayload = {
      deltas: changeLog.map((c) => ({ attr: c.attr, delta: c.delta })),
      sentiment,
      notes: notes ?? null,
    };
    await query(
      `UPDATE check_ins
          SET status = 'approved',
              approved = $2::jsonb,
              approved_at = now()
        WHERE id = $1`,
      [check_in.id, JSON.stringify(approvedPayload)],
    );

    // 6. Sheets mirrors — fire-and-forget.
    void appendEvent("CheckIns", {
      id: check_in.id,
      created_at: new Date().toISOString(),
      cycle: check_in.cycle,
      employee_id: check_in.employee_id,
      employee_name: emp.display_name,
      manager_id: check_in.manager_id ?? "",
      manager_name: "",
      status: "approved",
      narrative: check_in.narrative,
      deltas: JSON.stringify(changeLog.map((c) => ({ attr: c.attr, delta: c.delta }))),
      rationale: notes ?? "",
    });
    void mirrorPlayer(check_in.employee_id);

    // Compute archetype + level for the attr-history row.
    const archetype = getArchetype({
      role_level: emp.role_level,
      dept_code: emp.dept_code,
      attr_str: after.str,
      attr_int: after.int,
      attr_wis: after.wis,
      attr_cha: after.cha,
      attr_dex: after.dex,
      attr_con: after.con,
    });
    const level =
      emp.role_level === "md" || emp.role_level === "deputy_md"
        ? 15
        : emp.role_level === "director"
          ? 12
          : emp.role_level === "manager"
            ? 8
            : emp.role_level === "senior"
              ? 4
              : 1;

    void appendAttrHistory({
      employee_id: check_in.employee_id,
      employee_name: emp.display_name,
      str: after.str,
      int: after.int,
      wis: after.wis,
      cha: after.cha,
      dex: after.dex,
      con: after.con,
      level,
      class_label: ARCHETYPE_LABEL[archetype],
    });

    return apiJson({
      ok: true,
      check_in_id: check_in.id,
      applied: changeLog,
      new_attributes: after,
      event_ids: eventIds,
    });
  } catch (error) {
    logApiError("api/check-ins/approve POST", error);
    return apiError("Failed to approve check-in", 500);
  }
}
