/**
 * POST /api/export/obsidian
 *
 * Writes a Markdown synthesis of current TKC dashboard state to the
 * user's Obsidian vault.
 *
 * Vault location: `OBSIDIAN_VAULT_PATH` env var, defaults to
 *   `~/Documents/SecondBrain/03-Topics/TKC`
 *
 * Files written (idempotent — overwritten on each call):
 *   TKC-Project-Intelligence.md  — top-level synthesis
 *   TKC-Roster-Pulse.md          — full hero scoreboard
 *   TKC-Heroes/{employee_id}.md  — one note per employee
 *
 * Body: optional `{ scope: "all" | "intelligence" | "roster" | "heroes" }`.
 * Default = "all". The scope lets the LedgerTab button trigger a fast
 * synthesis-only refresh without rewriting 348 hero files every time.
 *
 * Auth: protected by site middleware (tkc_access cookie).
 *
 * Notes on safety:
 *   - This endpoint writes to the developer's filesystem, NOT to a
 *     shared resource. Only meaningful when running locally on Dr Non's
 *     machine. In a deployed environment without the vault mounted,
 *     the write fails fast and returns 503.
 *   - Files are written via fs.promises.writeFile — atomic per file,
 *     no .tmp swap. A partial run leaves the vault in a mixed state
 *     (some files updated, others stale); not destructive.
 */

import { NextResponse } from "next/server";
import { promises as fs } from "node:fs";
import path from "node:path";
import os from "node:os";
import { isDbConfigured, query } from "@/lib/db";
import { logApiError } from "@/lib/api";
import {
  renderHeroDossier,
  renderProjectIntelligence,
  renderRosterPulse,
} from "@/lib/obsidian-export";
import type {
  Employee,
  Project,
  TeamComposition,
  SupportActionRecord,
  DeptKpi,
} from "@/app/command-center/_shared/types";

type Scope = "all" | "intelligence" | "roster" | "heroes";
const VALID_SCOPES: Scope[] = ["all", "intelligence", "roster", "heroes"];

function expandHome(p: string): string {
  if (p.startsWith("~")) return path.join(os.homedir(), p.slice(1));
  return p;
}

const VAULT_DEFAULT = "~/Documents/SecondBrain/03-Topics/TKC";

export async function POST(request: Request) {
  if (!isDbConfigured()) {
    return NextResponse.json(
      { ok: false, error: "Database not configured" },
      { status: 503 },
    );
  }

  const body = await request.json().catch(() => ({}) as { scope?: string });
  const scopeIn = (body as { scope?: string }).scope;
  const scope: Scope = (scopeIn && VALID_SCOPES.includes(scopeIn as Scope)) ? (scopeIn as Scope) : "all";

  const vaultRoot = expandHome(process.env.OBSIDIAN_VAULT_PATH ?? VAULT_DEFAULT);
  const heroDir = path.join(vaultRoot, "TKC-Heroes");
  const generatedAt = new Date().toISOString();

  try {
    // Make sure the target directories exist.
    await fs.mkdir(vaultRoot, { recursive: true });
    if (scope === "all" || scope === "heroes") {
      await fs.mkdir(heroDir, { recursive: true });
    }

    // Pull the data we need. Mirrors the dashboard route shape, but
    // queries only what we render (no full join salad).
    const [employees, projects, teams, supportActions, kpis] = await Promise.all([
      query<Employee>(`
        SELECT e.id, e.employee_code, e.full_name_th, e.full_name_en, e.nickname,
               e.title_th, e.title_en, e.role_level, e.tenure_years, e.is_active,
               e.skills, d.code AS dept_code,
               ea.str AS attr_str, ea.int AS attr_int, ea.wis AS attr_wis,
               ea.cha AS attr_cha, ea.dex AS attr_dex, ea.con AS attr_con,
               epf.languages, epf.certifications, epf.soft_skills
        FROM employees e
        LEFT JOIN departments d ON d.id = e.department_id
        LEFT JOIN employee_attributes ea ON ea.employee_id = e.id
        LEFT JOIN employee_profile_facets epf ON epf.employee_id = e.id
        WHERE e.is_active = true
        ORDER BY d.code NULLS LAST,
                 CASE e.role_level
                   WHEN 'md' THEN 0 WHEN 'deputy_md' THEN 1
                   WHEN 'director' THEN 2 WHEN 'manager' THEN 3
                   WHEN 'senior' THEN 4 ELSE 5 END
      `),
      query<Project>(`
        SELECT id, code, name, client_name, status, priority, team_size, project_slots
        FROM projects
        ORDER BY priority DESC, code
      `),
      query<TeamComposition>(`
        SELECT p.id::text AS id, p.id::text AS project_id, p.code AS project_code,
               array_agg(pa.employee_id::text) AS player_ids,
               NULL::text AS coach_id, NULL::text AS coach_code,
               NULL::text AS formation,
               ROUND(AVG(NULLIF(pa.chemistry, 0)))::int AS chemistry_score,
               ROUND(AVG(NULLIF(pa.overall_pct, 0)))::int AS overall_score,
               '{}'::jsonb AS allocation_pcts,
               NULL::jsonb AS insights
        FROM projects p
        JOIN project_allocations pa ON pa.project_id = p.id
        GROUP BY p.id, p.code
      `),
      query<SupportActionRecord>(`
        SELECT sa.id, sa.employee_id, sa.cycle, sa.action_type, sa.title, sa.note,
               sa.status, sa.owner_employee_id,
               owner.nickname AS owner_nickname,
               owner.full_name_en AS owner_full_name_en,
               owner.full_name_th AS owner_full_name_th,
               sa.created_at::text AS created_at,
               sa.updated_at::text AS updated_at
        FROM support_actions sa
        LEFT JOIN employees owner ON owner.id = sa.owner_employee_id
        WHERE sa.status IN ('open', 'in_progress')
        ORDER BY sa.created_at DESC
        LIMIT 100
      `),
      query<DeptKpi>(`
        SELECT id::text,
               kpi_name_en AS code,
               kpi_name_en AS name,
               target_value,
               actual_value,
               status,
               cycle
        FROM department_kpis
        ORDER BY cycle DESC, dept_code, kpi_name_en
        LIMIT 200
      `),
    ]);

    // Pull active allocations per employee for the dossiers.
    const allocations = await query<{
      employee_id: string;
      project_code: string;
      project_name: string;
      slot_dimension: string;
      fte: number;
    }>(`
      SELECT pa.employee_id::text AS employee_id, p.code AS project_code, p.name AS project_name,
             pa.slot_dimension, pa.fte
      FROM project_allocations pa
      JOIN projects p ON p.id = pa.project_id
    `);

    const allocsByEmp = new Map<string, Array<typeof allocations[number]>>();
    for (const a of allocations) {
      const arr = allocsByEmp.get(a.employee_id) ?? [];
      arr.push(a);
      allocsByEmp.set(a.employee_id, arr);
    }

    // Decorate employees with their allocations.
    const enriched: Employee[] = employees.map((e) => ({
      ...e,
      active_allocations: (allocsByEmp.get(e.id) ?? []).map((a) => ({
        id: `${a.project_code}:${a.employee_id}:${a.slot_dimension}`,
        employee_id: a.employee_id,
        project_code: a.project_code,
        project_name: a.project_name,
        fte: Number(a.fte),
        assignment_label: a.slot_dimension,
        planned_or_actual: "actual" as const,
        status: "active",
      })),
    }));

    // Write the files.
    const wrote: string[] = [];

    if (scope === "all" || scope === "intelligence") {
      const md = renderProjectIntelligence({
        employees: enriched, projects, teams, supportActions, kpis, generatedAt,
      });
      const target = path.join(vaultRoot, "TKC-Project-Intelligence.md");
      await fs.writeFile(target, md, "utf-8");
      wrote.push(target);
    }

    if (scope === "all" || scope === "roster") {
      const md = renderRosterPulse(enriched, generatedAt);
      const target = path.join(vaultRoot, "TKC-Roster-Pulse.md");
      await fs.writeFile(target, md, "utf-8");
      wrote.push(target);
    }

    if (scope === "all" || scope === "heroes") {
      for (const e of enriched) {
        const md = renderHeroDossier(e, generatedAt);
        const target = path.join(heroDir, `${e.id}.md`);
        await fs.writeFile(target, md, "utf-8");
        wrote.push(target);
      }
    }

    return NextResponse.json({
      ok: true,
      scope,
      vault: vaultRoot,
      files_written: wrote.length,
      generated_at: generatedAt,
    });
  } catch (err) {
    logApiError("api/export/obsidian", err);
    const msg = err instanceof Error ? err.message : String(err);
    const isPermission = msg.includes("EACCES") || msg.includes("EPERM") || msg.includes("ENOENT");
    return NextResponse.json(
      {
        ok: false,
        error: msg,
        hint: isPermission
          ? "Vault path not accessible. Set OBSIDIAN_VAULT_PATH in .env.local or check ~/Documents/SecondBrain/03-Topics/ exists."
          : undefined,
      },
      { status: isPermission ? 503 : 500 },
    );
  }
}

export async function GET() {
  const vaultRoot = expandHome(process.env.OBSIDIAN_VAULT_PATH ?? VAULT_DEFAULT);
  let vaultExists = false;
  try {
    await fs.access(vaultRoot);
    vaultExists = true;
  } catch {
    vaultExists = false;
  }
  return NextResponse.json({
    vault: vaultRoot,
    exists: vaultExists,
    hint: "POST { scope: 'all' | 'intelligence' | 'roster' | 'heroes' } to export.",
  });
}
