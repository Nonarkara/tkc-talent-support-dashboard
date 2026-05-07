import { apiError, apiJson, logApiError, parseJsonBody } from "@/lib/api";
import { gameValuesPayloadSchema } from "@/lib/api-schemas";
import {
  ATTR_KEYS,
  employeeBaseline,
  projectBaseline,
  type AttrKey,
  type EmployeeCriteriaInput,
  type ProjectCriteriaInput,
} from "@/lib/baseline-engine";
import { isDbConfigured, query } from "@/lib/db";
import {
  appendAttrHistory,
  appendAttrHistoryRows,
  appendGameAdjustment,
  appendGameAdjustments,
  mirrorPlayer,
  mirrorProject,
  type GameAdjustmentMirrorInput,
} from "@/lib/sheets-mirror";
import { ARCHETYPE_LABEL, getArchetype } from "@/lib/token-economy";

interface EmployeeRow extends EmployeeCriteriaInput {
  display_name: string;
  attr_str: number | null;
  attr_int: number | null;
  attr_wis: number | null;
  attr_cha: number | null;
  attr_dex: number | null;
  attr_con: number | null;
  stat_locked: boolean | null;
}

interface ProjectRow extends ProjectCriteriaInput {
  complexity_score: number | null;
  urgency_score: number | null;
  strategic_value_score: number | null;
  delivery_risk_score: number | null;
  ai_leverage_score: number | null;
  config_locked: boolean | null;
}

type Source = "seed" | "manual" | "ai" | "system";

function employeeBefore(row: EmployeeRow) {
  return {
    str: row.attr_str ?? 10,
    int: row.attr_int ?? 10,
    wis: row.attr_wis ?? 10,
    cha: row.attr_cha ?? 10,
    dex: row.attr_dex ?? 10,
    con: row.attr_con ?? 10,
  };
}

function projectBefore(row: ProjectRow) {
  return {
    complexity_score: row.complexity_score ?? 50,
    urgency_score: row.urgency_score ?? 50,
    strategic_value_score: row.strategic_value_score ?? 50,
    delivery_risk_score: row.delivery_risk_score ?? 50,
    ai_leverage_score: row.ai_leverage_score ?? 50,
  };
}

async function logAdjustment(args: {
  target_type: "employee" | "project";
  target_id: string;
  action: "seed" | "adjust" | "lock" | "unlock" | "ai_adjust";
  source: Source;
  field: string;
  before: unknown;
  after: unknown;
  criteria?: unknown;
  reason: string;
}) {
  await query(
    `INSERT INTO game_adjustment_log (
       target_type, target_id, action, source, field,
       before_value, after_value, criteria_snapshot, reason
     )
     VALUES ($1, $2::uuid, $3, $4, $5, $6::jsonb, $7::jsonb, $8::jsonb, $9)`,
    [
      args.target_type,
      args.target_id,
      args.action,
      args.source,
      args.field,
      JSON.stringify(args.before ?? null),
      JSON.stringify(args.after ?? null),
      JSON.stringify(args.criteria ?? {}),
      args.reason,
    ],
  );
  void appendGameAdjustment({
    target_type: args.target_type,
    target_id: args.target_id,
    action: args.action,
    source: args.source,
    field: args.field,
    before_value: args.before,
    after_value: args.after,
    criteria_snapshot: args.criteria ?? {},
    reason: args.reason,
  });
}

async function employeeRows(targetId?: string) {
  return query<EmployeeRow>(
    `SELECT
       e.id::text,
       e.employee_code,
       COALESCE(NULLIF(e.nickname, ''), NULLIF(e.full_name_en, ''), e.full_name_th) AS display_name,
       e.role_level,
       e.level,
       e.tenure_years,
       e.salary_thb::text,
       e.skills,
       d.code AS dept_code,
       div.code AS div_code,
       ea.str AS attr_str,
       ea.int AS attr_int,
       ea.wis AS attr_wis,
       ea.cha AS attr_cha,
       ea.dex AS attr_dex,
       ea.con AS attr_con,
       COALESCE(ea.stat_locked, false) AS stat_locked
     FROM employees e
     LEFT JOIN departments d ON d.id = e.department_id
     LEFT JOIN divisions div ON div.id = e.division_id
     LEFT JOIN employee_attributes ea ON ea.employee_id = e.id
     WHERE e.is_active = true
       AND ($1::uuid IS NULL OR e.id = $1::uuid)
     ORDER BY e.level DESC, e.tenure_years DESC`,
    [targetId ?? null],
  );
}

async function projectRows(targetId?: string) {
  return query<ProjectRow>(
    `SELECT
       p.id::text,
       p.code,
       p.status,
       p.priority,
       p.budget_thb::text,
       p.monthly_ceiling::text,
       p.gross_margin_pct::text,
       p.required_skills,
       p.team_size,
       p.progress_pct,
       p.project_slots,
       p.complexity_score,
       p.urgency_score,
       p.strategic_value_score,
       p.delivery_risk_score,
       p.ai_leverage_score,
       COALESCE(p.config_locked, false) AS config_locked
     FROM projects p
     WHERE ($1::uuid IS NULL OR p.id = $1::uuid)
     ORDER BY
       CASE p.priority WHEN 'critical' THEN 0 WHEN 'high' THEN 1 WHEN 'medium' THEN 2 ELSE 3 END,
       p.code`,
    [targetId ?? null],
  );
}

function mergedAttributes(
  before: Record<AttrKey, number>,
  patch: Partial<Record<AttrKey, number>> | undefined,
) {
  return Object.fromEntries(
    ATTR_KEYS.map((key) => [key, patch?.[key] ?? before[key]]),
  ) as Record<AttrKey, number>;
}

async function writeEmployeeValues(args: {
  row: EmployeeRow;
  action: "seed" | "adjust";
  source: Source;
  values?: Partial<Record<AttrKey, number>>;
  reason: string;
  force?: boolean;
}) {
  if (args.row.stat_locked && args.source !== "ai" && !args.force) {
    return { skipped: true, reason: "locked" };
  }

  const before = employeeBefore(args.row);
  const baseline = employeeBaseline(args.row);
  const after = args.action === "seed"
    ? baseline.attributes
    : mergedAttributes(before, args.values);
  const archetype = getArchetype({
    role_level: args.row.role_level ?? "staff",
    dept_code: args.row.dept_code,
    attr_str: after.str,
    attr_int: after.int,
    attr_wis: after.wis,
    attr_cha: after.cha,
    attr_dex: after.dex,
    attr_con: after.con,
  });

  await query(
    `INSERT INTO employee_attributes (
       employee_id, str, int, wis, cha, dex, con,
       rpg_class, notes, stat_seed, stat_source, stat_criteria, updated_at
     )
     VALUES ($1::uuid, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12::jsonb, now())
     ON CONFLICT (employee_id) DO UPDATE SET
       str = EXCLUDED.str,
       int = EXCLUDED.int,
       wis = EXCLUDED.wis,
       cha = EXCLUDED.cha,
       dex = EXCLUDED.dex,
       con = EXCLUDED.con,
       rpg_class = EXCLUDED.rpg_class,
       notes = EXCLUDED.notes,
       stat_seed = EXCLUDED.stat_seed,
       stat_source = EXCLUDED.stat_source,
       stat_criteria = EXCLUDED.stat_criteria,
       updated_at = now()`,
    [
      args.row.id,
      after.str,
      after.int,
      after.wis,
      after.cha,
      after.dex,
      after.con,
      archetype,
      args.reason,
      baseline.seed,
      args.source,
      JSON.stringify(baseline.criteria),
    ],
  );

  await logAdjustment({
    target_type: "employee",
    target_id: args.row.id,
    action: args.source === "ai" ? "ai_adjust" : args.action,
    source: args.source,
    field: "attributes",
    before,
    after,
    criteria: baseline.criteria,
    reason: args.reason,
  });

  for (const key of ATTR_KEYS) {
    const delta = after[key] - before[key];
    if (delta === 0) continue;
    await query(
      `INSERT INTO events (subject_id, verb, payload, source)
       VALUES ($1::uuid, 'stat_delta', $2::jsonb, $3)`,
      [
        args.row.id,
        JSON.stringify({ attr: key, delta, from: before[key], to: after[key], reason: args.reason }),
        `game_values:${args.action}`,
      ],
    );
  }

  void mirrorPlayer(args.row.id);
  void appendAttrHistory({
    employee_id: args.row.id,
    employee_name: args.row.display_name,
    str: after.str,
    int: after.int,
    wis: after.wis,
    cha: after.cha,
    dex: after.dex,
    con: after.con,
    level: args.row.level ?? 1,
    class_label: ARCHETYPE_LABEL[archetype],
  });

  return { skipped: false };
}

async function lockEmployee(row: EmployeeRow, locked: boolean, reason: string, source: Source) {
  const before = { locked: Boolean(row.stat_locked) };
  const after = { locked };
  await query(
    `INSERT INTO employee_attributes (employee_id, stat_locked, stat_lock_reason, updated_at)
     VALUES ($1::uuid, $2, $3, now())
     ON CONFLICT (employee_id) DO UPDATE SET
       stat_locked = EXCLUDED.stat_locked,
       stat_lock_reason = EXCLUDED.stat_lock_reason,
       updated_at = now()`,
    [row.id, locked, locked ? reason : null],
  );
  await logAdjustment({
    target_type: "employee",
    target_id: row.id,
    action: locked ? "lock" : "unlock",
    source,
    field: "stat_locked",
    before,
    after,
    reason,
  });
  // Mirror lock state to Sheets immediately so Players tab stays in sync
  void mirrorPlayer(row.id);
  return { skipped: false };
}

async function writeProjectValues(args: {
  row: ProjectRow;
  action: "seed" | "adjust";
  source: Source;
  values?: {
    complexity_score?: number;
    urgency_score?: number;
    strategic_value_score?: number;
    delivery_risk_score?: number;
    ai_leverage_score?: number;
    project_slots?: unknown;
  };
  reason: string;
  force?: boolean;
}) {
  if (args.row.config_locked && args.source !== "ai" && !args.force) {
    return { skipped: true, reason: "locked" };
  }

  const before = projectBefore(args.row);
  const baseline = projectBaseline(args.row);
  const after = args.action === "seed"
    ? {
        complexity_score: baseline.complexity_score,
        urgency_score: baseline.urgency_score,
        strategic_value_score: baseline.strategic_value_score,
        delivery_risk_score: baseline.delivery_risk_score,
        ai_leverage_score: baseline.ai_leverage_score,
      }
    : {
        complexity_score: args.values?.complexity_score ?? before.complexity_score,
        urgency_score: args.values?.urgency_score ?? before.urgency_score,
        strategic_value_score: args.values?.strategic_value_score ?? before.strategic_value_score,
        delivery_risk_score: args.values?.delivery_risk_score ?? before.delivery_risk_score,
        ai_leverage_score: args.values?.ai_leverage_score ?? before.ai_leverage_score,
      };
  const projectSlots = args.action === "seed"
    ? baseline.suggested_slots
    : args.values?.project_slots ?? args.row.project_slots ?? baseline.suggested_slots;

  await query(
    `UPDATE projects SET
       complexity_score = $2,
       urgency_score = $3,
       strategic_value_score = $4,
       delivery_risk_score = $5,
       ai_leverage_score = $6,
       project_slots = $7::jsonb,
       config_seed = $8,
       config_source = $9,
       config_criteria = $10::jsonb,
       updated_at = now()
     WHERE id = $1::uuid`,
    [
      args.row.id,
      after.complexity_score,
      after.urgency_score,
      after.strategic_value_score,
      after.delivery_risk_score,
      after.ai_leverage_score,
      JSON.stringify(projectSlots),
      baseline.seed,
      args.source,
      JSON.stringify(baseline.criteria),
    ],
  );

  await logAdjustment({
    target_type: "project",
    target_id: args.row.id,
    action: args.source === "ai" ? "ai_adjust" : args.action,
    source: args.source,
    field: "project_scores",
    before,
    after: { ...after, project_slots: projectSlots },
    criteria: baseline.criteria,
    reason: args.reason,
  });
  void mirrorProject(args.row.code);
  return { skipped: false };
}

async function lockProject(row: ProjectRow, locked: boolean, reason: string, source: Source) {
  const before = { locked: Boolean(row.config_locked) };
  const after = { locked };
  await query(
    `UPDATE projects
       SET config_locked = $2,
           config_lock_reason = $3,
           updated_at = now()
     WHERE id = $1::uuid`,
    [row.id, locked, locked ? reason : null],
  );
  await logAdjustment({
    target_type: "project",
    target_id: row.id,
    action: locked ? "lock" : "unlock",
    source,
    field: "config_locked",
    before,
    after,
    reason,
  });
  // Mirror lock state to Sheets immediately so Projects tab stays in sync
  void mirrorProject(row.code);
  return { skipped: false };
}

function valueRow(params: unknown[], values: unknown[], casts: string[] = []) {
  const offset = params.length;
  params.push(...values);
  return `(${values.map((_, index) => `$${offset + index + 1}${casts[index] ?? ""}`).join(", ")})`;
}

async function bulkSeedEmployees(args: {
  rows: EmployeeRow[];
  source: Source;
  reason: string;
  force?: boolean;
}) {
  const writable = args.rows.filter((row) => !row.stat_locked || args.source === "ai" || args.force);
  const skipped = args.rows.length - writable.length;
  if (writable.length === 0) return { touched: 0, skipped };

  const attrParams: unknown[] = [];
  const attrRows: string[] = [];
  const auditParams: unknown[] = [];
  const auditRowsSql: string[] = [];
  const eventParams: unknown[] = [];
  const eventRowsSql: string[] = [];
  const sheetAuditRows: GameAdjustmentMirrorInput[] = [];
  const historyRows: Parameters<typeof appendAttrHistoryRows>[0] = [];

  for (const row of writable) {
    const before = employeeBefore(row);
    const baseline = employeeBaseline(row);
    const after = baseline.attributes;
    const archetype = getArchetype({
      role_level: row.role_level ?? "staff",
      dept_code: row.dept_code,
      attr_str: after.str,
      attr_int: after.int,
      attr_wis: after.wis,
      attr_cha: after.cha,
      attr_dex: after.dex,
      attr_con: after.con,
    });
    const action = args.source === "ai" ? "ai_adjust" : "seed";
    const changedKeys = ATTR_KEYS.filter((key) => after[key] !== before[key]);

    attrRows.push(valueRow(
      attrParams,
      [
        row.id,
        after.str,
        after.int,
        after.wis,
        after.cha,
        after.dex,
        after.con,
        archetype,
        args.reason,
        baseline.seed,
        args.source,
        JSON.stringify(baseline.criteria),
      ],
      ["::uuid", "", "", "", "", "", "", "", "", "", "", "::jsonb"],
    ));

    if (changedKeys.length > 0) {
      auditRowsSql.push(valueRow(
        auditParams,
        [
          "employee",
          row.id,
          action,
          args.source,
          "attributes",
          JSON.stringify(before),
          JSON.stringify(after),
          JSON.stringify(baseline.criteria),
          args.reason,
        ],
        ["", "::uuid", "", "", "", "::jsonb", "::jsonb", "::jsonb", ""],
      ));

      sheetAuditRows.push({
        target_type: "employee",
        target_id: row.id,
        action,
        source: args.source,
        field: "attributes",
        before_value: before,
        after_value: after,
        criteria_snapshot: baseline.criteria,
        reason: args.reason,
      });
    }

    for (const key of changedKeys) {
      const delta = after[key] - before[key];
      eventRowsSql.push(valueRow(
        eventParams,
        [
          row.id,
          "stat_delta",
          JSON.stringify({ attr: key, delta, from: before[key], to: after[key], reason: args.reason }),
          "game_values:seed",
        ],
        ["::uuid", "", "::jsonb", ""],
      ));
    }

    if (changedKeys.length > 0) {
      historyRows.push({
        employee_id: row.id,
        employee_name: row.display_name,
        str: after.str,
        int: after.int,
        wis: after.wis,
        cha: after.cha,
        dex: after.dex,
        con: after.con,
        level: row.level ?? 1,
        class_label: ARCHETYPE_LABEL[archetype],
      });
    }
  }

  await query(
    `INSERT INTO employee_attributes (
       employee_id, str, int, wis, cha, dex, con,
       rpg_class, notes, stat_seed, stat_source, stat_criteria
     )
     VALUES ${attrRows.join(", ")}
     ON CONFLICT (employee_id) DO UPDATE SET
       str = EXCLUDED.str,
       int = EXCLUDED.int,
       wis = EXCLUDED.wis,
       cha = EXCLUDED.cha,
       dex = EXCLUDED.dex,
       con = EXCLUDED.con,
       rpg_class = EXCLUDED.rpg_class,
       notes = EXCLUDED.notes,
       stat_seed = EXCLUDED.stat_seed,
       stat_source = EXCLUDED.stat_source,
       stat_criteria = EXCLUDED.stat_criteria,
       updated_at = now()`,
    attrParams,
  );

  if (auditRowsSql.length > 0) {
    await query(
      `INSERT INTO game_adjustment_log (
         target_type, target_id, action, source, field,
         before_value, after_value, criteria_snapshot, reason
       )
       VALUES ${auditRowsSql.join(", ")}`,
      auditParams,
    );
  }

  if (eventRowsSql.length > 0) {
    await query(
      `INSERT INTO events (subject_id, verb, payload, source)
       VALUES ${eventRowsSql.join(", ")}`,
      eventParams,
    );
  }

  void appendGameAdjustments(sheetAuditRows);
  void appendAttrHistoryRows(historyRows);
  return { touched: writable.length, skipped };
}

async function bulkSeedProjects(args: {
  rows: ProjectRow[];
  source: Source;
  reason: string;
  force?: boolean;
}) {
  const writable = args.rows.filter((row) => !row.config_locked || args.source === "ai" || args.force);
  const skipped = args.rows.length - writable.length;
  if (writable.length === 0) return { touched: 0, skipped };

  const updateParams: unknown[] = [];
  const updateRowsSql: string[] = [];
  const auditParams: unknown[] = [];
  const auditRowsSql: string[] = [];
  const sheetAuditRows: GameAdjustmentMirrorInput[] = [];

  for (const row of writable) {
    const before = projectBefore(row);
    const baseline = projectBaseline(row);
    const after = {
      complexity_score: baseline.complexity_score,
      urgency_score: baseline.urgency_score,
      strategic_value_score: baseline.strategic_value_score,
      delivery_risk_score: baseline.delivery_risk_score,
      ai_leverage_score: baseline.ai_leverage_score,
    };
    const afterWithSlots = { ...after, project_slots: baseline.suggested_slots };
    const action = args.source === "ai" ? "ai_adjust" : "seed";
    const scoresChanged =
      after.complexity_score !== before.complexity_score ||
      after.urgency_score !== before.urgency_score ||
      after.strategic_value_score !== before.strategic_value_score ||
      after.delivery_risk_score !== before.delivery_risk_score ||
      after.ai_leverage_score !== before.ai_leverage_score ||
      JSON.stringify(baseline.suggested_slots) !== JSON.stringify(row.project_slots ?? null);

    updateRowsSql.push(valueRow(
      updateParams,
      [
        row.id,
        after.complexity_score,
        after.urgency_score,
        after.strategic_value_score,
        after.delivery_risk_score,
        after.ai_leverage_score,
        JSON.stringify(baseline.suggested_slots),
        baseline.seed,
        args.source,
        JSON.stringify(baseline.criteria),
      ],
      ["::uuid", "::int", "::int", "::int", "::int", "::int", "::jsonb", "::int", "::text", "::jsonb"],
    ));

    if (scoresChanged) {
      auditRowsSql.push(valueRow(
        auditParams,
        [
          "project",
          row.id,
          action,
          args.source,
          "project_scores",
          JSON.stringify(before),
          JSON.stringify(afterWithSlots),
          JSON.stringify(baseline.criteria),
          args.reason,
        ],
        ["", "::uuid", "", "", "", "::jsonb", "::jsonb", "::jsonb", ""],
      ));

      sheetAuditRows.push({
        target_type: "project",
        target_id: row.id,
        action,
        source: args.source,
        field: "project_scores",
        before_value: before,
        after_value: afterWithSlots,
        criteria_snapshot: baseline.criteria,
        reason: args.reason,
      });
    }
  }

  await query(
    `UPDATE projects AS p
       SET complexity_score = v.complexity_score,
           urgency_score = v.urgency_score,
           strategic_value_score = v.strategic_value_score,
           delivery_risk_score = v.delivery_risk_score,
           ai_leverage_score = v.ai_leverage_score,
           project_slots = v.project_slots,
           config_seed = v.config_seed,
           config_source = v.config_source,
           config_criteria = v.config_criteria,
           updated_at = now()
      FROM (
        VALUES ${updateRowsSql.join(", ")}
      ) AS v(
        id, complexity_score, urgency_score, strategic_value_score,
        delivery_risk_score, ai_leverage_score, project_slots,
        config_seed, config_source, config_criteria
      )
      WHERE p.id = v.id`,
    updateParams,
  );

  if (auditRowsSql.length > 0) {
    await query(
      `INSERT INTO game_adjustment_log (
         target_type, target_id, action, source, field,
         before_value, after_value, criteria_snapshot, reason
       )
       VALUES ${auditRowsSql.join(", ")}`,
      auditParams,
    );
  }

  void appendGameAdjustments(sheetAuditRows);
  return { touched: writable.length, skipped };
}

export async function POST(request: Request) {
  if (!isDbConfigured()) return apiError("Database not configured", 503);

  const parsed = await parseJsonBody(request, gameValuesPayloadSchema);
  if (!parsed.ok) return parsed.response;

  const body = parsed.data;
  const source: Source =
    body.source ?? (body.action === "seed" ? "seed" : body.action === "lock" || body.action === "unlock" ? "manual" : "manual");

  if (body.target_type !== "all" && !body.target_id) {
    return apiError("target_id is required unless target_type is all", 400);
  }
  if (body.target_type === "all" && body.action !== "seed") {
    return apiError("Bulk mode only supports seed", 400);
  }

  try {
    let touched = 0;
    let skipped = 0;

    if (body.target_type === "all" && body.action === "seed") {
      const [employees, projects] = await Promise.all([
        employeeRows(),
        projectRows(),
      ]);
      const employeeResult = await bulkSeedEmployees({
        rows: employees,
        source,
        reason: body.reason,
        force: body.force,
      });
      const projectResult = await bulkSeedProjects({
        rows: projects,
        source,
        reason: body.reason,
        force: body.force,
      });

      // Mirror all employees + projects to Sheets snapshot tabs after bulk seed.
      // Fire-and-forget — does not block the response but ensures Sheets stays
      // in sync without requiring a manual bootstrap call.
      void Promise.all([
        ...employees.map((emp) => mirrorPlayer(emp.id)),
        ...projects.map((proj) => mirrorProject(proj.code)),
      ]);

      return apiJson({
        ok: true,
        touched: employeeResult.touched + projectResult.touched,
        skipped: employeeResult.skipped + projectResult.skipped,
        sheets: "Players and Projects snapshot tabs queued for refresh after bulk seed.",
      });
    }

    if (body.target_type === "employee" || body.target_type === "all") {
      const rows = await employeeRows(body.target_type === "employee" ? body.target_id : undefined);
      if (body.target_type === "employee" && rows.length === 0) return apiError("Employee not found", 404);
      for (const row of rows) {
        const result = body.action === "lock"
          ? await lockEmployee(row, true, body.reason, source)
          : body.action === "unlock"
            ? await lockEmployee(row, false, body.reason, source)
            : await writeEmployeeValues({
                row,
                action: body.action,
                source,
                values: body.values?.attributes,
                reason: body.reason,
                force: body.force,
              });
        if (result.skipped) skipped += 1;
        else touched += 1;
      }
    }

    if (body.target_type === "project" || body.target_type === "all") {
      const rows = await projectRows(body.target_type === "project" ? body.target_id : undefined);
      if (body.target_type === "project" && rows.length === 0) return apiError("Project not found", 404);
      for (const row of rows) {
        const result = body.action === "lock"
          ? await lockProject(row, true, body.reason, source)
          : body.action === "unlock"
            ? await lockProject(row, false, body.reason, source)
            : await writeProjectValues({
                row,
                action: body.action,
                source,
                values: body.values?.project,
                reason: body.reason,
                force: body.force,
              });
        if (result.skipped) skipped += 1;
        else touched += 1;
      }
    }

    return apiJson({ ok: true, touched, skipped });
  } catch (error) {
    logApiError("api/game/values POST error", error);
    return apiError("Failed to update game values", 500);
  }
}
