/**
 * DB Sync — Bridge between localStorage and Neon PostgreSQL.
 *
 * Client-side module. Talks to /api/db/* routes.
 * Falls back gracefully if DB is not configured or offline.
 */

import type { CSVEmployee } from "./csv-import";

export type DbStatus = "synced" | "offline" | "error" | "unconfigured";

interface DbEmployeeRow {
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
  dept_code: string | null;
  div_code: string | null;
}

/**
 * Check if the DB API is reachable and configured.
 */
export async function checkDbStatus(): Promise<DbStatus> {
  try {
    const res = await fetch("/api/db/dashboard", { method: "GET" });
    if (res.status === 503) return "unconfigured";
    if (!res.ok) return "error";
    const data = await res.json();
    return data.live ? "synced" : "unconfigured";
  } catch {
    return "offline";
  }
}

/**
 * Sync CSV employees to the database via /api/db/import.
 */
export async function syncRosterToDb(csvText: string): Promise<{ ok: boolean; count: number; error?: string }> {
  try {
    const res = await fetch("/api/db/import", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ csvText }),
    });

    if (res.status === 503) return { ok: false, count: 0, error: "Database not configured" };
    if (!res.ok) {
      const data = await res.json();
      return { ok: false, count: 0, error: data.error ?? "Sync failed" };
    }

    const data = await res.json();
    return { ok: true, count: data.upserted ?? 0 };
  } catch {
    return { ok: false, count: 0, error: "Network error" };
  }
}

/**
 * Load employees from DB and convert to CSVEmployee format
 * (compatible with the existing csvToCharacters pipeline).
 */
export async function loadRosterFromDb(): Promise<CSVEmployee[] | null> {
  try {
    const res = await fetch("/api/db/employees");
    if (!res.ok) return null;

    const data = await res.json();
    if (!data.employees || data.employees.length === 0) return null;

    return (data.employees as DbEmployeeRow[]).map((row): CSVEmployee => ({
      nickname: row.nickname ?? row.full_name_th.split(" ")[0],
      department: row.dept_code ?? "UNKNOWN",
      role: row.role_level as CSVEmployee["role"],
      fullNameTh: row.full_name_th,
      fullNameEn: row.full_name_en ?? undefined,
      level: row.level,
      tenure: row.tenure_years,
      salary: row.salary_thb ? Number(row.salary_thb) : undefined,
      division: row.div_code ?? undefined,
      email: row.email ?? undefined,
      employeeId: row.employee_code ?? undefined,
    }));
  } catch {
    return null;
  }
}

/**
 * Load full dashboard data from DB.
 */
export async function loadDashboardFromDb(): Promise<{
  employees: DbEmployeeRow[];
  projects: unknown[];
  teams: unknown[];
  live: boolean;
} | null> {
  try {
    const res = await fetch("/api/db/dashboard");
    if (!res.ok) return null;
    return await res.json();
  } catch {
    return null;
  }
}

/**
 * Save team composition to DB.
 */
export async function saveTeamToDb(payload: {
  project_code: string;
  coach_code: string | null;
  player_codes: string[];
  formation: string;
  fit_pct?: number;
  chemistry_score?: number;
  overall_score?: number;
  insights?: string[];
}): Promise<boolean> {
  try {
    const res = await fetch("/api/db/teams", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    return res.ok;
  } catch {
    return false;
  }
}
