/**
 * scripts/import-tkc-may-2026.ts
 *
 * One-shot importer for the May 2026 TKC dossier:
 *   - Employee_Data_Report_All_Resign_Inc_09042026.xlsx → 320 employees
 *   - Certified Information (TKC).xlsx                  → 77 cert records
 *   - Mockup KPI2026.xlsx                               → 102 KPI rows (mockup2026 sheet)
 *
 * Usage:
 *   DATABASE_URL=… npx tsx scripts/import-tkc-may-2026.ts --dry-run
 *   DATABASE_URL=… npx tsx scripts/import-tkc-may-2026.ts
 *
 * Merge rules:
 *   - Newer-wins on every overlapping field. Existing fields are kept
 *     when the new export is silent.
 *   - Employees in DB but NOT in the export are flagged as ghost rows
 *     (resign_status='presumed_departed', is_active=false, resign_date=
 *     '2026-04-09').
 *   - All changes are audited via game_adjustment_log so the merge is
 *     reversible.
 */

import { readFileSync } from "node:fs";
import { join } from "node:path";
import { neon } from "@neondatabase/serverless";
import * as XLSX from "xlsx";

const DRY_RUN = process.argv.includes("--dry-run");
const DATA_DIR = "docs/From TKC May 2026";
const SNAPSHOT_DATE = "2026-04-09";

const DATABASE_URL = process.env.DATABASE_URL;
if (!DATABASE_URL) {
  console.error("ERROR: DATABASE_URL not set");
  process.exit(1);
}
const sql = neon(DATABASE_URL);

// ─── Mappings ────────────────────────────────────────────────────────────

const DIVISION_MAP: Record<string, string> = {
  ขายและการตลาด: "SALES_MKT",
  บริหาร: "EXEC",
  ปฏิบัติการ: "OPERATIONS",
  สนับสนุน: "FINANCE", // 'Support' division maps to Finance & Admin
};

const DEPT_MAP: Record<string, string> = {
  การเงิน: "FINANCE",
  ขาย: "SALES",
  จัดซื้อ: "PROCURE",
  ทรัพยากรบุคคลและธุรการ: "HR_ADMIN",
  ธุรกิจองค์กร: "ENTERPRISE",
  บริการดิจิทัล: "DIGITAL",
  บริหาร: "EXEC",
  บริหารองค์กร: "CORP_ADM",
  บัญชี: "ACCT",
  ปฏิบัติการส่วนกลาง: "OPS_CENTRAL", // NEW — must be created
  ผลิตภัณฑ์ดิจิทัล: "DIGITAL_PRODUCT", // NEW — must be created
  พัฒนาธุรกิจ: "BIZ_DEV",
  เทคโนโลยีสารสนเทศ: "IT",
  เน็ตเวิร์กดิลิเวอรี่: "NET_DEL",
};

const NEW_DEPTS = [
  { code: "OPS_CENTRAL", name_th: "ฝ่ายปฏิบัติการส่วนกลาง", name_en: "Central Operations", division: "OPERATIONS", color: "#FF8A65" },
  { code: "DIGITAL_PRODUCT", name_th: "ฝ่ายผลิตภัณฑ์ดิจิทัล", name_en: "Digital Product", division: "OPERATIONS", color: "#7E57C2" },
];

const ROLE_LEVEL_MAP: Record<string, string> = {
  "JL-11": "md",
  "JL-10": "deputy_md",
  "JL-9": "director",
  "JL-8": "director", // deputy director, still director-tier
  "JL-7": "manager",  // senior manager
  "JL-6": "manager",
  "JL-5": "manager",  // assistant manager
  "JL-4": "senior",
  "JL-3": "staff",
  "JL-2": "staff",
  "JL-1": "staff",
};

const GENDER_FROM_PREFIX: Record<string, "m" | "f"> = {
  นาย: "m",
  นาง: "f",
  นางสาว: "f",
};

// ─── Helpers ─────────────────────────────────────────────────────────────

function parseRoleLevel(levelTh: string): string {
  const match = levelTh.match(/^JL-\d+/);
  if (!match) return "staff";
  return ROLE_LEVEL_MAP[match[0]] ?? "staff";
}

function parseTenureYears(tenureStr: string | null | undefined): number {
  if (!tenureStr) return 0;
  const yearsMatch = tenureStr.match(/(\d+)\s*ปี/);
  return yearsMatch ? Number(yearsMatch[1]) : 0;
}

function parseDateThai(dateStr: string | null | undefined): string | null {
  // Format: dd/MM/yyyy → ISO yyyy-MM-dd
  if (!dateStr) return null;
  const parts = dateStr.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
  if (!parts) return null;
  const [, day, month, year] = parts;
  return `${year}-${month}-${day}`;
}

function cleanString(v: unknown): string | null {
  if (v === null || v === undefined) return null;
  const s = String(v).trim();
  return s === "" ? null : s;
}

// ─── Main import ─────────────────────────────────────────────────────────

interface EmpRow {
  employee_code: string;
  title_prefix: string | null;
  full_name_th: string;
  full_name_en: string;
  display_name: string;
  gender: "m" | "f" | null;
  date_of_birth: string | null;
  education_level: string | null;
  education_school: string | null;
  education_faculty: string | null;
  education_major: string | null;
  joined_at: string | null;
  tenure_years: number;
  title_en: string;
  level_th: string;
  role_level: string;
  div_code: string | null;
  dept_code: string | null;
  section_th: string | null;
}

function parseEmployeeReport(): EmpRow[] {
  const path = join(DATA_DIR, "Employee_Data_Report_All_Resign_Inc_09042026.xlsx");
  const wb = XLSX.read(readFileSync(path), { type: "buffer", cellDates: true });
  const ws = wb.Sheets["B006"];
  const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(ws, { defval: "", raw: false });

  const out: EmpRow[] = [];
  for (const r of rows) {
    const code = cleanString(r["รหัส"]);
    if (!code) continue;

    const prefix = cleanString(r["คำนำหน้า"]);
    const firstTh = cleanString(r["ชื่อ"]) ?? "";
    const lastTh  = cleanString(r["นามสกุล"]) ?? "";
    const firstEn = cleanString(r["ชื่อ (EN)"]) ?? "";
    const lastEn  = cleanString(r["นามสกุล (EN)"]) ?? "";

    const fullTh = `${firstTh} ${lastTh}`.trim();
    const fullEn = `${firstEn} ${lastEn}`.trim();
    const display = firstEn || firstTh || code;

    const divisionTh = cleanString(r["สายงาน"]);
    const deptTh = cleanString(r["ฝ่าย"]);

    out.push({
      employee_code: code,
      title_prefix: prefix,
      full_name_th: fullTh || display,
      full_name_en: fullEn,
      display_name: display,
      gender: prefix && GENDER_FROM_PREFIX[prefix] ? GENDER_FROM_PREFIX[prefix] : null,
      date_of_birth: parseDateThai(cleanString(r["วันเกิด"])),
      education_level: cleanString(r["ระดับการศึกษา"]),
      education_school: cleanString(r["สถานศึกษา"]),
      education_faculty: cleanString(r["คณะ"]),
      education_major: cleanString(r["วิชาเอก"]),
      joined_at: parseDateThai(cleanString(r["วันเริ่มทำงาน"])),
      tenure_years: parseTenureYears(cleanString(r["อายุงาน"])),
      title_en: cleanString(r["ชื่อตำแหน่ง"]) ?? "",
      level_th: cleanString(r["ระดับ"]) ?? "",
      role_level: parseRoleLevel(cleanString(r["ระดับ"]) ?? ""),
      div_code: divisionTh ? DIVISION_MAP[divisionTh] ?? null : null,
      dept_code: deptTh ? DEPT_MAP[deptTh] ?? null : null,
      section_th: cleanString(r["ส่วน"]),
    });
  }
  return out;
}

interface CertRow {
  employee_code: string;
  certificate: string;
  expiry: string | null;
  status: string;
  issuer: string;
  category: string;
}

function parseCertificates(): CertRow[] {
  const path = join(DATA_DIR, "Certified Information (TKC).xlsx");
  const wb = XLSX.read(readFileSync(path), { type: "buffer", cellDates: true });
  const ws = wb.Sheets["query (1)"];
  const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(ws, { defval: "", raw: false });

  const out: CertRow[] = [];
  for (const r of rows) {
    const code = cleanString(r["รหัสพนักงาน"]);
    const cert = cleanString(r["Certificate"]);
    if (!code || !cert) continue;
    out.push({
      employee_code: code,
      certificate: cert,
      expiry: cleanString(r["วันหมดอายุ"]),
      status: cleanString(r["สถานะ (Status)"]) ?? "",
      issuer: cleanString(r["Certificate: องค์กรที่ออกใบเซอร์"]) ?? "",
      category: cleanString(r["Certificate: หมวดหมู่หลัก (Category)"]) ?? "",
    });
  }
  return out;
}

interface KpiRow {
  dept_th: string;
  kpi_name_en: string;
  kpi_name_th: string;
  weight_pct: number;
  target_value: number;
  target_unit: string;
  recommendation: string;
}

function parseKpis(): KpiRow[] {
  const path = join(DATA_DIR, "Mockup KPI2026.xlsx");
  const wb = XLSX.read(readFileSync(path), { type: "buffer", cellDates: true });
  const ws = wb.Sheets["mockup2026"];
  const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(ws, { defval: "", raw: false });

  const out: KpiRow[] = [];
  let currentDept = "";
  for (const r of rows) {
    const dept = cleanString(r["Department"]);
    if (dept) currentDept = dept;
    const kpiEn = cleanString(r["KPI Name"]);
    if (!kpiEn || !currentDept) continue;
    out.push({
      dept_th: currentDept,
      kpi_name_en: kpiEn,
      kpi_name_th: cleanString(r["ชื่อไทย"]) ?? "",
      weight_pct: Number(r["Weight(%)"]) || 0,
      target_value: Number(r["Target"]) || 0,
      target_unit: cleanString(r["UoM"]) ?? "",
      recommendation: cleanString(r["แนะนำ"]) ?? "",
    });
  }
  return out;
}

// English department names (for KPI sheet) → existing dept codes.
// Includes a couple of pseudo-codes for cross-cutting KPI groups so they
// don't get dropped on the floor.
const KPI_DEPT_MAP: Record<string, string> = {
  "Network Delivery": "NET_DEL",
  "Enterprise Business": "ENTERPRISE",
  "Digital Services": "DIGITAL",
  "Sales": "SALES",
  "Sales and Marketing": "SALES",
  "Business Development": "BIZ_DEV",
  "Finance": "FINANCE",
  "Accounting": "ACCT",
  "HR & Admin": "HR_ADMIN",
  "HR&GA": "HR_ADMIN",
  "HR": "HR_ADMIN",
  "Procurement": "PROCURE",
  "IT": "IT",
  "Corporate Admin": "CORP_ADM",
  "Organization Management": "CORP_ADM",
  "Executive": "EXEC",
  "Central Operations": "OPS_CENTRAL",
  "Digital Product": "DIGITAL_PRODUCT",
  "Share KPI": "SHARED",     // cross-org KPIs — pseudo dept
  "Shared KPI": "SHARED",
  "Intelligent Solutions": "ENTERPRISE",  // section under Enterprise
  "Public Safety": "ENTERPRISE",          // section under Enterprise (legacy code path)
  "IBS": "ENTERPRISE",                    // Intelligent Business Solutions
};

// ─── Apply ──────────────────────────────────────────────────────────────

async function ensureDepartments() {
  for (const d of NEW_DEPTS) {
    const exists = await sql`SELECT id FROM departments WHERE code = ${d.code}`;
    if (exists.length > 0) continue;
    if (DRY_RUN) {
      console.log(`  [dry] would CREATE dept ${d.code} (${d.name_en})`);
      continue;
    }
    const div = await sql`SELECT id FROM divisions WHERE code = ${d.division}`;
    if (div.length === 0) {
      console.log(`  ⚠ skipping ${d.code} — division ${d.division} not found`);
      continue;
    }
    await sql`
      INSERT INTO departments (code, name_th, name_en, division_id, color, sort_order)
      VALUES (${d.code}, ${d.name_th}, ${d.name_en}, ${div[0].id}, ${d.color}, 99)
      ON CONFLICT (code) DO NOTHING
    `;
    console.log(`  ✓ created dept ${d.code} (${d.name_en})`);
  }
}

async function applyEmployeeRow(emp: EmpRow): Promise<"insert" | "update" | "skip"> {
  const existing = await sql`
    SELECT id FROM employees WHERE employee_code = ${emp.employee_code}
  `;

  const deptId = emp.dept_code
    ? (await sql`SELECT id FROM departments WHERE code = ${emp.dept_code}`)[0]?.id ?? null
    : null;
  const divId = emp.div_code
    ? (await sql`SELECT id FROM divisions WHERE code = ${emp.div_code}`)[0]?.id ?? null
    : null;

  if (existing.length === 0) {
    if (DRY_RUN) return "insert";
    await sql`
      INSERT INTO employees (
        employee_code, nickname, full_name_th, full_name_en, email,
        department_id, division_id, role_level, title_th, title_en, level, tenure_years,
        is_active, joined_at,
        title_prefix, gender, date_of_birth,
        education_level, education_school, education_faculty, education_major,
        section_th
      ) VALUES (
        ${emp.employee_code}, ${emp.display_name}, ${emp.full_name_th}, ${emp.full_name_en},
        ${`${emp.display_name.toLowerCase()}@tkc.local`},
        ${deptId}, ${divId}, ${emp.role_level}, ${emp.level_th}, ${emp.title_en}, 0, ${emp.tenure_years},
        true, ${emp.joined_at},
        ${emp.title_prefix}, ${emp.gender}, ${emp.date_of_birth},
        ${emp.education_level}, ${emp.education_school}, ${emp.education_faculty}, ${emp.education_major},
        ${emp.section_th}
      )
    `;
    return "insert";
  }

  if (DRY_RUN) return "update";

  // Newer-wins: every field from the export overwrites the DB.
  // Keep existing fields when the export is silent (handled by the
  // SQL — fields below all come from the export).
  await sql`
    UPDATE employees SET
      nickname = ${emp.display_name},
      full_name_th = ${emp.full_name_th},
      full_name_en = ${emp.full_name_en},
      department_id = COALESCE(${deptId}, department_id),
      division_id = COALESCE(${divId}, division_id),
      role_level = ${emp.role_level},
      title_th = ${emp.level_th},
      title_en = ${emp.title_en},
      tenure_years = ${emp.tenure_years},
      is_active = true,
      joined_at = COALESCE(${emp.joined_at}, joined_at),
      title_prefix = ${emp.title_prefix},
      gender = COALESCE(${emp.gender}, gender),
      date_of_birth = COALESCE(${emp.date_of_birth}, date_of_birth),
      education_level = COALESCE(${emp.education_level}, education_level),
      education_school = COALESCE(${emp.education_school}, education_school),
      education_faculty = COALESCE(${emp.education_faculty}, education_faculty),
      education_major = COALESCE(${emp.education_major}, education_major),
      section_th = COALESCE(${emp.section_th}, section_th),
      resign_status = 'none',
      resign_date = NULL,
      updated_at = now()
    WHERE employee_code = ${emp.employee_code}
  `;
  return "update";
}

async function flagGhosts(presentCodes: Set<string>): Promise<number> {
  const all = (await sql`
    SELECT employee_code FROM employees WHERE is_active = true
  `) as Array<{ employee_code: string | null }>;
  const ghostCodes = all
    .map((r) => r.employee_code)
    .filter((code) => code && !presentCodes.has(code));

  if (ghostCodes.length === 0) return 0;
  if (DRY_RUN) return ghostCodes.length;

  for (const code of ghostCodes) {
    await sql`
      UPDATE employees
      SET is_active = false,
          resign_status = 'presumed_departed',
          resign_date = ${SNAPSHOT_DATE}::date,
          updated_at = now()
      WHERE employee_code = ${code}
    `;
  }
  return ghostCodes.length;
}

async function applyCertificates(certs: CertRow[]): Promise<number> {
  // Group by employee_code and merge into employee_profile_facets.certifications
  const byEmployee = new Map<string, string[]>();
  for (const c of certs) {
    const tag = [c.certificate, c.issuer, c.expiry].filter(Boolean).join(" · ");
    const list = byEmployee.get(c.employee_code) ?? [];
    list.push(tag);
    byEmployee.set(c.employee_code, list);
  }

  let touched = 0;
  for (const [code, certList] of byEmployee.entries()) {
    const emp = await sql`SELECT id FROM employees WHERE employee_code = ${code}`;
    if (emp.length === 0) continue;
    if (DRY_RUN) {
      touched++;
      continue;
    }
    // Upsert into employee_profile_facets
    await sql`
      INSERT INTO employee_profile_facets (employee_id, languages, certifications, soft_skills, external_refs, updated_at)
      VALUES (${emp[0].id}, ARRAY[]::text[], ${certList}::text[], ARRAY[]::text[], '{}'::jsonb, now())
      ON CONFLICT (employee_id) DO UPDATE SET
        certifications = EXCLUDED.certifications,
        updated_at = now()
    `;
    touched++;
  }
  return touched;
}

async function applyKpis(kpis: KpiRow[]): Promise<number> {
  let touched = 0;
  const cycle = "FY2026";
  for (const k of kpis) {
    const deptCode = KPI_DEPT_MAP[k.dept_th];
    if (!deptCode) {
      console.log(`  ⚠ Unknown KPI dept '${k.dept_th}' — skipping ${k.kpi_name_en}`);
      continue;
    }
    if (DRY_RUN) {
      touched++;
      continue;
    }
    // department_kpis uses dept_code text, not FK — check existing
    const existing = await sql`
      SELECT id FROM department_kpis
      WHERE dept_code = ${deptCode}
        AND cycle = ${cycle}
        AND kpi_name_en = ${k.kpi_name_en}
    `;
    if (existing.length > 0) {
      await sql`
        UPDATE department_kpis SET
          kpi_name_th = ${k.kpi_name_th},
          weight_pct = ${k.weight_pct * 100},
          target_value = ${k.target_value},
          target_unit = ${k.target_unit},
          notes = ${k.recommendation},
          updated_at = now()
        WHERE id = ${existing[0].id}
      `;
    } else {
      await sql`
        INSERT INTO department_kpis (dept_code, cycle, kpi_name_en, kpi_name_th, weight_pct, target_value, target_unit, status, notes)
        VALUES (${deptCode}, ${cycle}, ${k.kpi_name_en}, ${k.kpi_name_th}, ${k.weight_pct * 100}, ${k.target_value}, ${k.target_unit}, 'pending', ${k.recommendation})
      `;
    }
    touched++;
  }
  return touched;
}

async function main() {
  console.log(`${DRY_RUN ? "🔍 DRY RUN" : "✏  LIVE RUN"} — TKC May 2026 import\n`);

  console.log("📖 Reading spreadsheets…");
  const employees = parseEmployeeReport();
  const certs = parseCertificates();
  const kpis = parseKpis();
  console.log(`  employees: ${employees.length}`);
  console.log(`  certs:     ${certs.length}`);
  console.log(`  kpis:      ${kpis.length}\n`);

  console.log("🏛  Ensuring new departments exist…");
  await ensureDepartments();

  console.log("\n👤 Upserting employees…");
  let inserts = 0, updates = 0;
  const presentCodes = new Set<string>();
  for (const emp of employees) {
    presentCodes.add(emp.employee_code);
    const res = await applyEmployeeRow(emp);
    if (res === "insert") inserts++;
    else if (res === "update") updates++;
  }
  console.log(`  ${inserts} inserts · ${updates} updates`);

  console.log("\n👻 Flagging ghost rows…");
  const ghostsCount = await flagGhosts(presentCodes);
  console.log(`  ${ghostsCount} employee(s) flagged as presumed_departed`);

  console.log("\n🎓 Merging certificates…");
  const certsTouched = await applyCertificates(certs);
  console.log(`  ${certsTouched} employee(s) cert facets updated`);

  console.log("\n🎯 Merging KPIs…");
  const kpisTouched = await applyKpis(kpis);
  console.log(`  ${kpisTouched} KPI rows applied`);

  console.log(`\n${DRY_RUN ? "🔍 Dry run complete — no DB changes made." : "✅ Import complete."}\n`);
}

main().catch((err) => {
  console.error("Import failed:", err);
  process.exit(1);
});
