import { apiError, apiJson, logApiError } from "@/lib/api";
import { isDbConfigured, query } from "@/lib/db";
import { firstName } from "@/lib/redact-name";
import { mirrorAttendance } from "@/lib/sheets-mirror";
import { sheetsEnabled } from "@/lib/sheets-sync";

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

interface EmployeeRow {
  id: string;
  employee_code: string;
  employee_name: string;
}

export async function POST(request: Request) {
  if (!isDbConfigured()) return apiError("Database not configured", 503);

  try {
    const body = (await request.json()) as {
      employee_id?: string;
      action?: "in" | "out";
    };

    if (!body.employee_id || !UUID_RE.test(body.employee_id)) {
      return apiError("Valid employee_id is required", 400);
    }
    if (body.action !== "in" && body.action !== "out") {
      return apiError("action must be in or out", 400);
    }

    const rows = await query<EmployeeRow>(
      `SELECT
         id,
         employee_code,
         COALESCE(NULLIF(nickname, ''), NULLIF(full_name_en, ''), full_name_th, employee_code) AS employee_name
       FROM employees
       WHERE id = $1 AND is_active = true
       LIMIT 1`,
      [body.employee_id],
    );
    const employee = rows[0];
    if (!employee) return apiError("Employee not found", 404);
    // PDPA: punch echoes the given name only (response, mirror, downstream).
    employee.employee_name = firstName(employee.employee_name) || employee.employee_code;

    const ts = new Date().toISOString();

    // 1. Save to Postgres (Source of Truth)
    await query(
      `INSERT INTO attendance_log (employee_id, action, source, punched_at)
       VALUES ($1, $2, $3, $4)`,
      [employee.id, body.action, "command-center:lobby", ts],
    );

    // 2. Mirror to Sheets
    void mirrorAttendance({
      employee_code: employee.employee_code,
      employee_name: employee.employee_name,
      action: body.action,
      source: "command-center:lobby",
      ts,
    });

    return apiJson({
      ok: true,
      saved_to_sheets: sheetsEnabled(),
      attendance: {
        ts,
        employee_id: employee.id,
        employee_code: employee.employee_code,
        employee_name: employee.employee_name,
        action: body.action,
      },
    });
  } catch (error) {
    logApiError("api/lobby/punch POST error", error);
    return apiError("Failed to record lobby punch", 500);
  }
}
