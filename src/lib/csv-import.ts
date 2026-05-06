/**
 * CSV Import — From Excel to Dashboard in Minutes
 *
 * Upload a CSV of employees → system generates:
 * - RPG attributes (from role, department, tenure)
 * - OCEAN personality (estimated from attributes)
 * - ICA scores (from level/role/tenure)
 * - 4C scores (estimated)
 * - HP/MP/form (initial defaults)
 * - All the game mechanics data
 *
 * The HR person exports from their HRIS → uploads here → real dashboard appears.
 */

import * as XLSX from "xlsx";

import {
  rollAttributes,
  getClass,
} from "./rpg-attributes";
import { calculateCredoScores } from "./credo";
import { type CommandCharacter, type OceanProfile } from "./command-center-data";

type EmployeeRole = CommandCharacter["role"];
type ProjectPriority = "critical" | "high" | "medium" | "low";

// ─── CSV PARSING ─────────────────────────────────────────

export interface CSVEmployee {
  // Required columns
  nickname: string;           // ชื่อเล่น / Thai nickname
  department: string;         // แผนก e.g., "NET_DEL", "SALES", etc.
  role: EmployeeRole;         // บทบาท e.g., "manager", "staff", "director"
  // Optional but valuable
  fullNameTh?: string;        // ชื่อ-นามสกุล
  fullNameEn?: string;
  level?: number;             // ระดับ 1-20 (if not provided, derived from role+tenure)
  tenure?: number;            // อายุงาน (years)
  salary?: number;            // เงินเดือน (THB/month) — for real budget calculations
  division?: string;          // สายงาน
  email?: string;
  employeeId?: string;
}

function normalizeHeader(input: string): string {
  return input.trim().replace(/^\uFEFF/, "").toLowerCase().replace(/["\s]/g, "");
}

function stringifyCell(value: unknown): string {
  if (value === null || value === undefined) return "";
  return String(value).trim();
}

function parseEmployeeRow(row: Record<string, string>): CSVEmployee | null {
  const nickname = row.nickname || row.name || row.ชื่อเล่น || row.ชื่อ || "";
  const department = row.department || row.dept || row.แผนก || row.deptcode || "";
  const role = row.role || row.position || row.ตำแหน่ง || row.บทบาท || "staff";

  if (!nickname) return null;

  return {
    nickname,
    department: mapDepartment(department),
    role: mapRole(role),
    fullNameTh: row.fullnameth || row.ชื่อนามสกุล || row.fullname || undefined,
    fullNameEn: row.fullnameen || row.nameen || undefined,
    level: row.level ? parseInt(row.level, 10) : undefined,
    tenure: (row.tenure ?? row.อายุงาน) ? parseFloat(row.tenure ?? row.อายุงาน ?? "0") : undefined,
    salary: (row.salary ?? row.เงินเดือน) ? parseFloat(row.salary ?? row.เงินเดือน ?? "0") : undefined,
    division: row.division || row.สายงาน || undefined,
    email: row.email || undefined,
    employeeId: row.employeeid || row.id || row.รหัสพนักงาน || undefined,
  };
}

export function parseCSV(csvText: string): CSVEmployee[] {
  const workbook = XLSX.read(csvText, { type: "string" });
  const firstSheetName = workbook.SheetNames[0];
  if (!firstSheetName) return [];

  const sheet = workbook.Sheets[firstSheetName];
  if (!sheet) return [];

  const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet, {
    defval: "",
    raw: false,
  });

  return rows
    .map((rawRow) =>
      Object.fromEntries(
        Object.entries(rawRow).map(([key, value]) => [normalizeHeader(key), stringifyCell(value)])
      )
    )
    .map((row) => parseEmployeeRow(row))
    .filter((employee): employee is CSVEmployee => Boolean(employee));
}

export interface WorkbookEmployeeImport {
  employees: CSVEmployee[];
  sheetNames: string[];
}

export function parseEmployeeWorkbook(arrayBuffer: ArrayBuffer): WorkbookEmployeeImport {
  const workbook = XLSX.read(arrayBuffer, { type: "array" });
  const employees: CSVEmployee[] = [];

  for (const sheetName of workbook.SheetNames) {
    const sheet = workbook.Sheets[sheetName];
    if (!sheet) continue;

    const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet, {
      defval: "",
      raw: false,
    });

    for (const rawRow of rows) {
      const normalizedRow = Object.fromEntries(
        Object.entries(rawRow).map(([key, value]) => [normalizeHeader(key), stringifyCell(value)])
      );

      const employee = parseEmployeeRow(normalizedRow);
      if (employee) employees.push(employee);
    }
  }

  return {
    employees,
    sheetNames: workbook.SheetNames,
  };
}

// Map Thai/English department names to codes
function mapDepartment(input: string): string {
  const lower = input.toLowerCase().replace(/[\s_-]/g, "");
  const mapping: Record<string, string> = {
    // English
    networkdelivery: "NET_DEL", netdel: "NET_DEL", network: "NET_DEL",
    enterprise: "ENTERPRISE", datacommunication: "ENTERPRISE", datacomm: "ENTERPRISE",
    publicsafety: "PUB_SAFETY", pubsafety: "PUB_SAFETY", digitalproduct: "PUB_SAFETY",
    digital: "DIGITAL", digitalservices: "DIGITAL",
    sales: "SALES", salesmarketing: "SALES", marketing: "SALES",
    businessdevelopment: "BIZ_DEV", bizdev: "BIZ_DEV", bd: "BIZ_DEV",
    finance: "FINANCE", accounting: "ACCT", acct: "ACCT",
    procurement: "PROCURE", procure: "PROCURE",
    hr: "HR_ADMIN", hrga: "HR_ADMIN", hradmin: "HR_ADMIN", humanresources: "HR_ADMIN",
    it: "IT", informationtechnology: "IT",
    corpadmin: "CORP_ADM", orgmanagement: "CORP_ADM", corporate: "CORP_ADM",
    // Thai
    เน็ตเวิร์ก: "NET_DEL", โครงข่าย: "NET_DEL",
    ธุรกิจองค์กร: "ENTERPRISE",
    ความปลอดภัย: "PUB_SAFETY", ไซเบอร์: "PUB_SAFETY",
    ดิจิทัล: "DIGITAL", บริการดิจิทัล: "DIGITAL",
    ขาย: "SALES", การตลาด: "SALES",
    พัฒนาธุรกิจ: "BIZ_DEV",
    การเงิน: "FINANCE", บัญชี: "ACCT",
    จัดซื้อ: "PROCURE",
    ทรัพยากร: "HR_ADMIN", บุคคล: "HR_ADMIN",
    เทคโนโลยี: "IT",
    บริหาร: "CORP_ADM",
  };
  // Try direct match first
  if (mapping[lower]) return mapping[lower];
  // Try partial match
  for (const [key, val] of Object.entries(mapping)) {
    if (lower.includes(key) || key.includes(lower)) return val;
  }
  // Default
  return input.toUpperCase().replace(/[\s-]/g, "_").slice(0, 12) || "UNKNOWN";
}

function mapRole(input: string): EmployeeRole {
  const lower = input.toLowerCase().replace(/[\s_-]/g, "");
  const mapping: Record<string, EmployeeRole> = {
    md: "md", managingdirector: "md", กรรมการผู้จัดการ: "md",
    deputymd: "deputy_md", รองกจก: "deputy_md",
    director: "director", ผู้อำนวยการ: "director",
    manager: "manager", ผู้จัดการ: "manager",
    senior: "senior", อาวุโส: "senior",
    staff: "staff", พนักงาน: "staff", junior: "staff",
  };
  if (mapping[lower]) return mapping[lower];
  for (const [key, val] of Object.entries(mapping)) {
    if (lower.includes(key)) return val;
  }
  return "staff";
}

function mapPriority(input: string): ProjectPriority {
  const lower = input.toLowerCase().trim();
  if (lower === "critical") return "critical";
  if (lower === "high") return "high";
  if (lower === "low") return "low";
  return "medium";
}

// ─── CONVERT TO COMMAND CHARACTERS ───────────────────────

function hashString(str: string): number {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = ((hash << 5) - hash) + str.charCodeAt(i);
    hash |= 0;
  }
  return Math.abs(hash) || 1;
}

function deriveLevel(role: string, tenure?: number): number {
  const roleBase: Record<string, number> = {
    md: 18, deputy_md: 15, director: 11, manager: 8, senior: 6, staff: 3,
  };
  const base = roleBase[role] ?? 3;
  const tenureBonus = Math.min(4, Math.floor((tenure ?? 0) / 2));
  return Math.min(20, base + tenureBonus);
}

function deriveDivision(dept: string): string {
  const map: Record<string, string> = {
    SALES: "SALES_MKT", BIZ_DEV: "SALES_MKT",
    NET_DEL: "OPERATIONS", ENTERPRISE: "OPERATIONS", PUB_SAFETY: "OPERATIONS", DIGITAL: "OPERATIONS",
    FINANCE: "FINANCE", ACCT: "FINANCE", PROCURE: "FINANCE", HR_ADMIN: "FINANCE", IT: "FINANCE", CORP_ADM: "FINANCE",
  };
  return map[dept] ?? "OPERATIONS";
}

export function csvToCharacters(employees: CSVEmployee[]): CommandCharacter[] {
  return employees.map((emp, idx) => {
    const seed = hashString(emp.nickname + emp.department + idx);
    const level = emp.level ?? deriveLevel(emp.role, emp.tenure);
    const tenure = emp.tenure ?? 1;
    const attributes = rollAttributes(seed);
    const rpgClass = getClass(attributes);
    const credo = calculateCredoScores(attributes);
    const divisionCode = emp.division ? mapDepartment(emp.division) : deriveDivision(emp.department);

    // Salary-based capacity cost (real THB)
    const salary = emp.salary ?? estimateSalary(emp.role, level);
    const capacityCost = Math.round(salary / 1000); // Convert to points: 1 CP = 1,000 THB

    // Generate all the game data
    const rng = (() => { let s = seed + 8888; return () => { s = (s * 16807) % 2147483647; return (s - 1) / 2147483646; }; })();

    const maxHp = 100 + attributes.con * 5 + level * 2;
    const maxMp = 80 + attributes.dex * 3 + attributes.int * 2;
    const hp = Math.round(maxHp * (0.5 + rng() * 0.5));
    const mp = Math.round(maxMp * (0.4 + rng() * 0.6));
    const utilization = Math.round(55 + rng() * 35);
    const streakDays = Math.round(rng() * 40);
    const form = Math.round((5 + rng() * 5) * 10) / 10;
    const hpRatio = hp / maxHp;
    const status: CommandCharacter["status"] = hpRatio > 0.7 ? "healthy" : hpRatio > 0.4 ? "watch" : hpRatio > 0.2 ? "at_risk" : "critical";

    const impact = Math.round(((attributes.str * 3 + attributes.wis * 2) / 5) * (100 / 20) * (0.8 + rng() * 0.4));
    const collaboration = Math.round(((attributes.cha * 3 + attributes.dex * 2) / 5) * (100 / 20) * (0.8 + rng() * 0.4));
    const advancement = Math.round(((attributes.int * 3 + attributes.dex * 2) / 5) * (100 / 20) * (0.8 + rng() * 0.4));
    const icaOverall = Math.round(impact * 0.4 + collaboration * 0.3 + advancement * 0.3);

    const ocean: OceanProfile = {
      openness: Math.min(100, Math.round(((attributes.int + attributes.dex) / 40) * 100 * (0.85 + rng() * 0.3))),
      conscientiousness: Math.min(100, Math.round(((attributes.str + attributes.con) / 40) * 100 * (0.85 + rng() * 0.3))),
      extraversion: Math.min(100, Math.round(((attributes.cha + attributes.dex) / 40) * 100 * (0.85 + rng() * 0.3))),
      agreeableness: Math.min(100, Math.round(((attributes.cha + attributes.con + attributes.wis) / 60) * 100 * (0.85 + rng() * 0.3))),
      neuroticism: Math.min(100, Math.round(100 - ((attributes.con + attributes.wis) / 40) * 100 * (0.85 + rng() * 0.3))),
    };

    const fourC = {
      cause: Math.round(credo.purpose * 0.6 + credo.transcendence * 0.4),
      compensation: salary > 0 ? Math.min(100, Math.round(40 + (salary / 1000) * 0.5)) : Math.min(100, Math.round(40 + level * 4 + tenure * 2)),
      career: Math.round(credo.story * 0.5 + credo.transcendence * 0.3 + advancement * 0.002),
      community: Math.round(credo.belonging * 0.6 + collaboration * 0.004),
    };

    const investmentValue = Math.round(30 + level * 8 + tenure * 2 + form * 3 + rng() * 15);
    const weeklyPoints = Math.round(20 + rng() * 60 + level * 2);
    const seasonPoints = Math.round(weeklyPoints * (8 + rng() * 4));
    const demandCount = Math.min(5, Math.floor(rng() * 3 + (level > 8 ? 2 : 0)));
    const positionType = emp.role === "md" || emp.role === "deputy_md" ? "GK" as const : emp.role === "director" ? "DEF" as const : emp.role === "manager" ? "MID" as const : "FWD" as const;

    return {
      id: `csv-${idx}-${seed}`,
      nickname: emp.nickname,
      seed,
      level,
      deptCode: emp.department,
      divisionCode,
      role: emp.role,
      roleTh: emp.role,
      roleEn: emp.role,
      tenure,
      attributes,
      rpgClass,
      isPresent: rng() < 0.9,
      isRemote: rng() > 0.7,
      hp, maxHp, mp, maxMp,
      credo,
      utilization,
      streakDays,
      totalXp: seasonPoints,
      status,
      currentTask: undefined,
      dailyGoals: undefined,
      goalCompletion: undefined,
      isCaptain: false,
      ica: { impact, collaboration, advancement, overall: icaOverall },
      form,
      investmentValue,
      capacityCost,
      weeklyPoints,
      seasonPoints,
      demandCount,
      positionType,
      fourC,
      ocean,
      leaveDaysTotal: (() => { const lt = emp.role === "md" ? 30 : emp.role === "deputy_md" ? 25 : tenure > 5 ? 18 : 12; return lt; })(),
      leaveDaysUsed: Math.round(rng() * 8),
      leaveDaysRemaining: (() => { const lt = emp.role === "md" ? 30 : emp.role === "deputy_md" ? 25 : tenure > 5 ? 18 : 12; return lt - Math.round(rng() * 8); })(),
      sickDaysUsed: Math.round(rng() * 3),
    };
  });
}

// Estimate salary from role and level (Thai market rates)
function estimateSalary(role: string, level: number): number {
  const baseSalaries: Record<string, number> = {
    md: 200000,
    deputy_md: 150000,
    director: 100000,
    manager: 60000,
    senior: 40000,
    staff: 20000,
  };
  const base = baseSalaries[role] ?? 20000;
  const levelBonus = level * 2000;
  return base + levelBonus;
}

// ─── PROJECT IMPORT ──────────────────────────────────────

export interface CSVProject {
  name: string;
  client: string;
  budget: number;           // THB total project budget
  monthlyCeiling: number;   // THB/month salary ceiling for team
  priority: ProjectPriority;
  requiredSkills: string[];
  teamSize: number;
  grossMarginPct: number;
}

export function parseProjectCSV(csvText: string): CSVProject[] {
  const workbook = XLSX.read(csvText, { type: "string" });
  const firstSheetName = workbook.SheetNames[0];
  if (!firstSheetName) return [];

  const sheet = workbook.Sheets[firstSheetName];
  if (!sheet) return [];

  const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet, {
    defval: "",
    raw: false,
  });

  return rows.map((rawRow, index) => {
    const row = Object.fromEntries(
      Object.entries(rawRow).map(([key, value]) => [normalizeHeader(key), stringifyCell(value)])
    );

    return {
      name: row.name || row.project || row.โครงการ || `Project ${index + 1}`,
      client: row.client || row.ลูกค้า || "",
      budget: parseFloat(row.budget || row.งบ || "0"),
      monthlyCeiling: parseFloat(row.ceiling || row.monthlyceiling || row.เพดาน || "200000"),
      priority: mapPriority(row.priority || "medium"),
      requiredSkills: (row.skills || row.requiredskills || "")
        .split(";")
        .map((skill: string) => skill.trim())
        .filter(Boolean),
      teamSize: parseInt(row.teamsize || row.size || "5", 10),
      grossMarginPct: parseFloat(row.margin || row.gm || "17"),
    };
  });
}
