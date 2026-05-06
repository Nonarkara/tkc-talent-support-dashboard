/**
 * Data Provider — DB-first with mock fallback.
 *
 * Tries Neon PostgreSQL via /api/db/dashboard. Falls back to mock data
 * for demo resilience. The dashboard works offline, at a demo, or connected.
 */

import {
  createCommandCharacters,
  createMockInsights,
  createMockAlerts,
  calculateOrgHealth,
  type CommandCharacter,
  type AIInsight,
  type AlertItem,
} from "./command-center-data";
import { csvToCharacters, type CSVEmployee } from "./csv-import";

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
  attr_str: number | null;
  attr_int: number | null;
  attr_wis: number | null;
  attr_cha: number | null;
  attr_dex: number | null;
  attr_con: number | null;
}

// ─── DATA FETCHING ───────────────────────────────────────

export interface DashboardData {
  characters: CommandCharacter[];
  insights: AIInsight[];
  alerts: AlertItem[];
  orgHealth: number;
  presentCount: number;
  isLive: boolean; // true = from database, false = mock
}

export async function fetchDashboardData(): Promise<DashboardData> {
  try {
    const res = await fetch("/api/db/dashboard");
    if (res.ok) {
      const data = await res.json();
      if (data.live && data.employees?.length > 0) {
        return buildFromDbRows(data.employees);
      }
    }
  } catch (err) {
    console.warn("DB fetch failed, falling back to mock data:", err);
  }
  return buildMockData();
}

function buildMockData(): DashboardData {
  const characters = createCommandCharacters();
  return {
    characters,
    insights: createMockInsights(characters),
    alerts: createMockAlerts(characters),
    orgHealth: calculateOrgHealth(characters),
    presentCount: characters.filter((c) => c.isPresent).length,
    isLive: false,
  };
}

function buildFromDbRows(rows: DbEmployeeRow[]): DashboardData {
  // Convert DB rows to CSVEmployee format, then through the game engine
  const csvEmployees: CSVEmployee[] = rows.map((row) => ({
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

  const characters = csvToCharacters(csvEmployees);

  return {
    characters,
    insights: createMockInsights(characters),
    alerts: createMockAlerts(characters),
    orgHealth: calculateOrgHealth(characters),
    presentCount: characters.filter((c) => c.isPresent).length,
    isLive: true,
  };
}
