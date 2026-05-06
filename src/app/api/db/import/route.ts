import { apiError, apiJson, getErrorMessage, logApiError, parseJsonBody } from "@/lib/api";
import { importPayloadSchema } from "@/lib/api-schemas";
import { isDbConfigured, query } from "@/lib/db";
import { parseCSV } from "@/lib/csv-import";

const MAX_IMPORT_ROWS = 2_000;

export async function POST(request: Request) {
  if (!isDbConfigured()) {
    return apiError("Database not configured", 503);
  }

  const parsed = await parseJsonBody(request, importPayloadSchema);
  if (!parsed.ok) {
    return parsed.response;
  }

  try {
    const employees = parseCSV(parsed.data.csvText);

    if (employees.length === 0) {
      return apiError(
        "No employee rows found in CSV. Check header row has: nickname, department, role",
        400,
      );
    }

    if (employees.length > MAX_IMPORT_ROWS) {
      return apiError(
        `Import too large. Maximum ${MAX_IMPORT_ROWS} rows per request.`,
        413,
      );
    }

    // Pre-flight: load valid dept and division codes from DB
    const deptRows = await query<{ code: string }>("SELECT code FROM departments");
    const divRows = await query<{ code: string }>("SELECT code FROM divisions");
    const validDepts = new Set(deptRows.map((r) => r.code));
    const validDivs = new Set(divRows.map((r) => r.code));

    let upserted = 0;
    const warnings: string[] = [];

    for (const emp of employees) {
      const code = emp.employeeId || `imp-${emp.nickname.toLowerCase().replace(/[^\w]/g, "")}`;
      const deptCode = emp.department;
      const divCode = emp.division ?? emp.department;

      if (!validDepts.has(deptCode)) {
        warnings.push(`${emp.nickname}: unknown dept "${deptCode}", stored without dept link`);
      }
      if (!validDivs.has(divCode) && !validDepts.has(divCode)) {
        // Division code might match a dept code for sub-mapping — allow gracefully
      }

      try {
        await query(
          `INSERT INTO employees (
            employee_code, nickname, full_name_th, full_name_en, email,
            department_id, division_id,
            role_level, level, tenure_years, salary_thb
          ) VALUES (
            $1, $2, $3, $4, $5,
            (SELECT id FROM departments WHERE code = $6 LIMIT 1),
            (SELECT id FROM divisions WHERE code = $7 LIMIT 1),
            $8, $9, $10, $11
          )
          ON CONFLICT (employee_code) DO UPDATE SET
            nickname = COALESCE(NULLIF(EXCLUDED.nickname, ''), employees.nickname),
            full_name_th = COALESCE(NULLIF(EXCLUDED.full_name_th, ''), employees.full_name_th),
            full_name_en = COALESCE(NULLIF(EXCLUDED.full_name_en, ''), employees.full_name_en),
            email = COALESCE(NULLIF(EXCLUDED.email, ''), employees.email),
            department_id = COALESCE(EXCLUDED.department_id, employees.department_id),
            division_id = COALESCE(EXCLUDED.division_id, employees.division_id),
            role_level = COALESCE(EXCLUDED.role_level, employees.role_level),
            level = COALESCE(EXCLUDED.level, employees.level),
            tenure_years = COALESCE(EXCLUDED.tenure_years, employees.tenure_years),
            salary_thb = COALESCE(EXCLUDED.salary_thb, employees.salary_thb),
            updated_at = now()`,
          [
            code, emp.nickname,
            emp.fullNameTh ?? emp.nickname, emp.fullNameEn ?? null,
            emp.email ?? null,
            deptCode, divCode,
            emp.role, emp.level ?? 1, emp.tenure ?? 0, emp.salary ?? null,
          ]
        );
        upserted++;
      } catch (rowErr) {
        const msg = rowErr instanceof Error ? rowErr.message : String(rowErr);
        warnings.push(`${emp.nickname}: ${msg.slice(0, 100)}`);
      }
    }

    return apiJson({
      upserted,
      parsed: employees.length,
      warnings: warnings.length > 0 ? warnings : undefined,
    });
  } catch (error) {
    const message = getErrorMessage(error);
    logApiError("api/db/import POST error", error);
    return apiError(`Import failed: ${message}`, 500);
  }
}
