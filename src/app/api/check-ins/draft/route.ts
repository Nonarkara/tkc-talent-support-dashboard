/**
 * POST /api/check-ins/draft
 *
 * Step one of the Chronicle ritual.
 * Request:  { employee_id, narrative, cycle, manager_id? }
 * Behaviour:
 *   1. Persist the narrative in `check_ins` with status='draft'.
 *   2. Call the LLM to propose attribute deltas.
 *   3. Patch the row to status='proposed' with the proposal.
 *   4. Return the check_in_id + proposal so the UI can render the diff view.
 *
 * The draft is DB-only — nothing goes to Sheets until the manager ratifies.
 */

import { apiError, apiJson, logApiError, parseJsonBody } from "@/lib/api";
import { checkInDraftSchema } from "@/lib/api-schemas";
import { isDbConfigured, query } from "@/lib/db";
import { extractAttributeDeltas } from "@/lib/llm-extract";

interface EmployeeLookup {
  id: string;
  display_name: string;
  role_level: string;
  dept_code: string | null;
}

export async function POST(request: Request) {
  if (!isDbConfigured()) return apiError("Database not configured", 503);

  const parsed = await parseJsonBody(request, checkInDraftSchema);
  if (!parsed.ok) return parsed.response;

  const { employee_id, narrative, cycle, manager_id } = parsed.data;

  try {
    // 1. Look up the employee. If missing, 404 before touching the DB.
    const [emp] = await query<EmployeeLookup>(
      `SELECT e.id,
              COALESCE(NULLIF(e.nickname, ''), NULLIF(e.full_name_en, ''), e.full_name_th) AS display_name,
              e.role_level,
              d.code AS dept_code
         FROM employees e
         LEFT JOIN departments d ON d.id = e.department_id
        WHERE e.id = $1
        LIMIT 1`,
      [employee_id],
    );
    if (!emp) return apiError("Employee not found", 404);

    // 2. Insert the draft row. Keep the original narrative verbatim for audit.
    const [inserted] = await query<{ id: string }>(
      `INSERT INTO check_ins (employee_id, manager_id, cycle, narrative, status)
       VALUES ($1, $2, $3, $4, 'draft')
       RETURNING id`,
      [employee_id, manager_id ?? null, cycle, narrative],
    );
    const check_in_id = inserted.id;

    // 3. Ask the Chronicler. Always succeeds — empty proposals on failure.
    const proposal = await extractAttributeDeltas(narrative, {
      display_name: emp.display_name,
      role_level: emp.role_level,
      dept_code: emp.dept_code,
    });

    // 4. Patch the row to proposed, stash the full proposal for audit.
    await query(
      `UPDATE check_ins
          SET status = 'proposed',
              llm_proposal = $2::jsonb
        WHERE id = $1`,
      [check_in_id, JSON.stringify(proposal)],
    );

    return apiJson({ check_in_id, proposal });
  } catch (error) {
    logApiError("api/check-ins/draft POST", error);
    return apiError("Failed to draft check-in", 500);
  }
}
