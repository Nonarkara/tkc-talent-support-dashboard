import { apiError, apiJson, logApiError, parseJsonBody } from "@/lib/api";
import {
  employeePatchPayloadSchema,
  employeeUpsertPayloadSchema,
} from "@/lib/api-schemas";
import { isDbConfigured, query } from "@/lib/db";
import { appendAttrHistory, mirrorPlayer } from "@/lib/sheets-mirror";

interface EmployeeRow {
  id: string;
  employee_code: string | null;
  nickname: string | null;
  full_name_th: string;
  full_name_en: string | null;
  email: string | null;
  role_level: string;
  title_th: string | null;
  title_en: string | null;
  level: number;
  tenure_years: number;
  salary_thb: number | null;
  is_active: boolean;
  dept_code: string | null;
  dept_name_en: string | null;
  div_code: string | null;
  div_name_en: string | null;
  attr_str: number | null;
  attr_int: number | null;
  attr_wis: number | null;
  attr_cha: number | null;
  attr_dex: number | null;
  attr_con: number | null;
  rpg_class: string | null;
  hr_notes: string | null;
}

function hasAttributeChanges(attributes: {
  str?: number;
  int?: number;
  wis?: number;
  cha?: number;
  dex?: number;
  con?: number;
  rpg_class?: string;
  notes?: string;
} | undefined) {
  if (!attributes) return false;
  return [
    attributes.str,
    attributes.int,
    attributes.wis,
    attributes.cha,
    attributes.dex,
    attributes.con,
    attributes.rpg_class,
    attributes.notes,
  ].some((value) => value !== undefined);
}

export async function GET() {
  if (!isDbConfigured()) {
    return apiJson(
      { error: "Database not configured", employees: [] },
      { status: 503 },
    );
  }

  try {
    const employees = await query<EmployeeRow>(`
      SELECT
        e.id, e.employee_code, e.nickname, e.full_name_th, e.full_name_en,
        e.email, e.role_level, e.title_th, e.title_en, e.level, e.tenure_years,
        e.salary_thb, e.is_active, e.hr_notes,
        d.code AS dept_code, d.name_en AS dept_name_en,
        div.code AS div_code, div.name_en AS div_name_en,
        ea.str AS attr_str, ea.int AS attr_int, ea.wis AS attr_wis,
        ea.cha AS attr_cha, ea.dex AS attr_dex, ea.con AS attr_con,
        ea.rpg_class
      FROM employees e
      LEFT JOIN departments d ON d.id = e.department_id
      LEFT JOIN divisions div ON div.id = e.division_id
      LEFT JOIN employee_attributes ea ON ea.employee_id = e.id
      WHERE e.is_active = true
      ORDER BY e.level DESC, e.tenure_years DESC
    `);

    return apiJson({ employees, count: employees.length });
  } catch (error) {
    logApiError("api/db/employees GET error", error);
    return apiJson(
      { error: "Failed to fetch employees", employees: [] },
      { status: 500 },
    );
  }
}

export async function POST(request: Request) {
  if (!isDbConfigured()) {
    return apiError("Database not configured", 503);
  }

  const parsed = await parseJsonBody(request, employeeUpsertPayloadSchema);
  if (!parsed.ok) {
    return parsed.response;
  }

  const rows = parsed.data.employees;

  try {
    let upserted = 0;
    const touchedIds = new Set<string>();
    for (const emp of rows) {
      const result = await query<{ id: string }>(
        `INSERT INTO employees (
          employee_code, nickname, full_name_th, full_name_en, email,
          department_id, division_id,
          role_level, title_th, title_en, level, tenure_years, salary_thb
        ) VALUES (
          $1, $2, $3, $4, $5,
          (SELECT id FROM departments WHERE code = $6 LIMIT 1),
          (SELECT id FROM divisions WHERE code = $7 LIMIT 1),
          $8, $9, $10, $11, $12, $13
        )
        ON CONFLICT (employee_code) DO UPDATE SET
          nickname = COALESCE(EXCLUDED.nickname, employees.nickname),
          full_name_th = COALESCE(EXCLUDED.full_name_th, employees.full_name_th),
          full_name_en = COALESCE(EXCLUDED.full_name_en, employees.full_name_en),
          email = COALESCE(EXCLUDED.email, employees.email),
          department_id = COALESCE(EXCLUDED.department_id, employees.department_id),
          division_id = COALESCE(EXCLUDED.division_id, employees.division_id),
          role_level = COALESCE(EXCLUDED.role_level, employees.role_level),
          title_th = COALESCE(EXCLUDED.title_th, employees.title_th),
          title_en = COALESCE(EXCLUDED.title_en, employees.title_en),
          level = COALESCE(EXCLUDED.level, employees.level),
          tenure_years = COALESCE(EXCLUDED.tenure_years, employees.tenure_years),
          salary_thb = COALESCE(EXCLUDED.salary_thb, employees.salary_thb),
          updated_at = now()
        RETURNING id`,
        [
          emp.employee_code, emp.nickname, emp.full_name_th, emp.full_name_en ?? null,
          emp.email ?? null, emp.dept_code, emp.div_code ?? emp.dept_code,
          emp.role_level, emp.title_th ?? null, emp.title_en ?? null,
          emp.level ?? 1, emp.tenure_years ?? 0, emp.salary_thb ?? null,
        ]
      );
      if (result[0]?.id) touchedIds.add(result[0].id);
      upserted++;
    }

    for (const employeeId of touchedIds) {
      void mirrorPlayer(employeeId);
    }
    return apiJson({ upserted, total: rows.length });
  } catch (error) {
    logApiError("api/db/employees POST error", error);
    return apiError("Failed to upsert employees", 500);
  }
}

export async function PATCH(request: Request) {
  if (!isDbConfigured()) return apiError("Database not configured", 503);

  const parsed = await parseJsonBody(request, employeePatchPayloadSchema);
  if (!parsed.ok) {
    return parsed.response;
  }

  const body = parsed.data;

  try {
    const employeeRows = await query<{ id: string }>(
      `SELECT id FROM employees WHERE id = $1 LIMIT 1`,
      [body.id],
    );
    if (employeeRows.length === 0) {
      return apiError("Employee not found", 404);
    }

    await query(
      `UPDATE employees SET
        employee_code = COALESCE($2, employee_code),
        nickname = COALESCE($3, nickname),
        full_name_th = COALESCE($4, full_name_th),
        full_name_en = COALESCE($5, full_name_en),
        email = COALESCE($6, email),
        department_id = COALESCE((SELECT id FROM departments WHERE code = $7 LIMIT 1), department_id),
        division_id = COALESCE((SELECT id FROM divisions WHERE code = $8 LIMIT 1), division_id),
        role_level = COALESCE($9, role_level),
        title_th = COALESCE($10, title_th),
        title_en = COALESCE($11, title_en),
        level = COALESCE($12, level),
        tenure_years = COALESCE($13, tenure_years),
        salary_thb = COALESCE($14, salary_thb),
        skills = COALESCE($15::text[], skills),
        hr_notes = COALESCE($16, hr_notes),
        updated_at = now()
       WHERE id = $1`,
      [
        body.id,
        body.employee_code ?? null,
        body.nickname ?? null,
        body.full_name_th ?? null,
        body.full_name_en ?? null,
        body.email ?? null,
        body.dept_code ?? null,
        body.div_code ?? null,
        body.role_level ?? null,
        body.title_th ?? null,
        body.title_en ?? null,
        body.level ?? null,
        body.tenure_years ?? null,
        body.salary_thb ?? null,
        body.skills ?? null,
        body.hr_notes ?? null,
      ],
    );

    if (hasAttributeChanges(body.attributes)) {
      await query(
        `INSERT INTO employee_attributes (
          employee_id, str, int, wis, cha, dex, con, rpg_class, notes
        ) VALUES (
          $1, COALESCE($2, 10), COALESCE($3, 10), COALESCE($4, 10),
          COALESCE($5, 10), COALESCE($6, 10), COALESCE($7, 10), $8, $9
        )
        ON CONFLICT (employee_id) DO UPDATE SET
          str = COALESCE($2, employee_attributes.str),
          int = COALESCE($3, employee_attributes.int),
          wis = COALESCE($4, employee_attributes.wis),
          cha = COALESCE($5, employee_attributes.cha),
          dex = COALESCE($6, employee_attributes.dex),
          con = COALESCE($7, employee_attributes.con),
          rpg_class = COALESCE($8, employee_attributes.rpg_class),
          notes = COALESCE($9, employee_attributes.notes),
          updated_at = now()`,
        [
          body.id,
          body.attributes?.str ?? null,
          body.attributes?.int ?? null,
          body.attributes?.wis ?? null,
          body.attributes?.cha ?? null,
          body.attributes?.dex ?? null,
          body.attributes?.con ?? null,
          body.attributes?.rpg_class ?? null,
          body.attributes?.notes ?? null,
        ],
      );
    }

    if (body.profile) {
      await query(
        `INSERT INTO employee_profile_facets (
          employee_id, languages, certifications, soft_skills, external_refs
        ) VALUES ($1, $2::text[], $3::text[], $4::text[], $5::jsonb)
        ON CONFLICT (employee_id) DO UPDATE SET
          languages = COALESCE(EXCLUDED.languages, employee_profile_facets.languages),
          certifications = COALESCE(EXCLUDED.certifications, employee_profile_facets.certifications),
          soft_skills = COALESCE(EXCLUDED.soft_skills, employee_profile_facets.soft_skills),
          external_refs = CASE
            WHEN EXCLUDED.external_refs IS NULL THEN employee_profile_facets.external_refs
            ELSE EXCLUDED.external_refs
          END,
          updated_at = now()`,
        [
          body.id,
          body.profile.languages ?? null,
          body.profile.certifications ?? null,
          body.profile.soft_skills ?? null,
          body.profile.external_refs == null
            ? null
            : JSON.stringify(body.profile.external_refs),
        ],
      );
    }

    void mirrorPlayer(body.id);

    if (hasAttributeChanges(body.attributes)) {
      const historyRows = await query<{
        employee_id: string;
        employee_name: string;
        str: number;
        int: number;
        wis: number;
        cha: number;
        dex: number;
        con: number;
        role_level: string;
        class_label: string | null;
      }>(
        `SELECT
           e.id AS employee_id,
           COALESCE(NULLIF(e.nickname, ''), NULLIF(e.full_name_en, ''), e.full_name_th) AS employee_name,
           ea.str, ea.int, ea.wis, ea.cha, ea.dex, ea.con,
           e.role_level,
           ea.rpg_class AS class_label
         FROM employees e
         JOIN employee_attributes ea ON ea.employee_id = e.id
         WHERE e.id = $1
         LIMIT 1`,
        [body.id],
      );
      const snapshot = historyRows[0];
      if (snapshot) {
        const level =
          snapshot.role_level === "md" || snapshot.role_level === "deputy_md" ? 15 :
          snapshot.role_level === "director" ? 12 :
          snapshot.role_level === "manager" ? 8 :
          snapshot.role_level === "senior" ? 4 : 1;
        void appendAttrHistory({
          employee_id: snapshot.employee_id,
          employee_name: snapshot.employee_name,
          str: snapshot.str,
          int: snapshot.int,
          wis: snapshot.wis,
          cha: snapshot.cha,
          dex: snapshot.dex,
          con: snapshot.con,
          level,
          class_label: snapshot.class_label ?? body.role_level ?? "Adventurer",
        });
      }
    }

    return apiJson({ ok: true });
  } catch (error) {
    logApiError("api/db/employees PATCH error", error);
    return apiError("Failed to update employee", 500);
  }
}
