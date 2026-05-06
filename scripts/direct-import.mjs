/**
 * Direct Neon import — bypasses Next.js dev server entirely.
 * Usage: node scripts/direct-import.mjs
 */

import { neon } from "@neondatabase/serverless";
import { readFileSync } from "fs";
import { fileURLToPath } from "url";
import { dirname, join } from "path";
import { createReadStream } from "fs";

const __dirname = dirname(fileURLToPath(import.meta.url));
const CSV_PATH = join(__dirname, "tkc-employees-real.csv");

// Load DATABASE_URL from .env.local
const envPath = join(__dirname, "../.env.local");
const envContent = readFileSync(envPath, "utf-8");
const dbMatch = envContent.match(/^DATABASE_URL=(.+)$/m);
if (!dbMatch) { console.error("DATABASE_URL not found in .env.local"); process.exit(1); }
const DATABASE_URL = dbMatch[1].trim();

const sql = neon(DATABASE_URL);

// ─── Parse CSV ────────────────────────────────────────────────────────────────

function parseCSVLine(line) {
  const result = [];
  let current = "";
  let inQuotes = false;
  for (const ch of line) {
    if (ch === '"') { inQuotes = !inQuotes; }
    else if (ch === "," && !inQuotes) { result.push(current.trim()); current = ""; }
    else { current += ch; }
  }
  result.push(current.trim());
  return result;
}

function parseCSV(csvText) {
  const lines = csvText.split("\n").filter(Boolean);
  const headers = parseCSVLine(lines[0]).map(h => h.toLowerCase().replace(/["\s]/g, ""));
  return lines.slice(1).map(line => {
    const values = parseCSVLine(line);
    return Object.fromEntries(headers.map((h, i) => [h, values[i] ?? ""]));
  }).filter(row => row.nickname);
}

// ─── Main ─────────────────────────────────────────────────────────────────────

async function main() {
  const csvText = readFileSync(CSV_PATH, "utf-8");
  const rows = parseCSV(csvText);
  console.log(`Parsed ${rows.length} employees from CSV`);

  // Verify DB connection
  const deptRows = await sql`SELECT code FROM departments`;
  const divRows = await sql`SELECT code FROM divisions`;
  const validDepts = new Set(deptRows.map(r => r.code));
  const validDivs = new Set(divRows.map(r => r.code));
  console.log(`DB connected. Depts: ${[...validDepts].join(", ")}`);
  console.log(`Divs: ${[...validDivs].join(", ")}`);

  let upserted = 0;
  let warnings = [];

  for (const emp of rows) {
    const code = emp.employeeid || `real-${emp.nickname.toLowerCase().replace(/[^\w]/g, "")}`;
    const deptCode = emp.department;
    const divCode = emp.division || emp.department;
    const level = emp.level ? parseInt(emp.level) : 4;
    const tenure = emp.tenure ? parseInt(emp.tenure) : 0;
    const salary = emp.salary ? parseFloat(emp.salary) : null;

    if (!validDepts.has(deptCode)) {
      warnings.push(`${emp.nickname}: unknown dept "${deptCode}"`);
    }

    try {
      await sql`
        INSERT INTO employees (
          employee_code, nickname, full_name_th, full_name_en,
          department_id, division_id,
          role_level, level, tenure_years, salary_thb
        ) VALUES (
          ${code}, ${emp.nickname},
          ${emp.fullnameth || emp.nickname}, ${emp.fullnameen || null},
          (SELECT id FROM departments WHERE code = ${deptCode} LIMIT 1),
          (SELECT id FROM divisions WHERE code = ${divCode} LIMIT 1),
          ${emp.role}, ${level}, ${tenure}, ${salary}
        )
        ON CONFLICT (employee_code) DO UPDATE SET
          nickname = COALESCE(NULLIF(EXCLUDED.nickname, ''), employees.nickname),
          full_name_th = COALESCE(NULLIF(EXCLUDED.full_name_th, ''), employees.full_name_th),
          full_name_en = COALESCE(NULLIF(EXCLUDED.full_name_en, ''), employees.full_name_en),
          department_id = COALESCE(EXCLUDED.department_id, employees.department_id),
          division_id = COALESCE(EXCLUDED.division_id, employees.division_id),
          role_level = COALESCE(EXCLUDED.role_level, employees.role_level),
          level = COALESCE(EXCLUDED.level, employees.level),
          tenure_years = COALESCE(EXCLUDED.tenure_years, employees.tenure_years),
          salary_thb = COALESCE(EXCLUDED.salary_thb, employees.salary_thb),
          updated_at = now()
      `;
      upserted++;
    } catch (err) {
      warnings.push(`${emp.nickname}: ${err.message?.slice(0, 80)}`);
    }
  }

  console.log(`\n✓ Upserted: ${upserted} / ${rows.length}`);
  if (warnings.length > 0) {
    console.log(`\nWarnings (${warnings.length}):`);
    warnings.slice(0, 20).forEach(w => console.log(" •", w));
    if (warnings.length > 20) console.log(`  ... and ${warnings.length - 20} more`);
  }

  // Verify final count
  const count = await sql`SELECT COUNT(*) as n FROM employees`;
  console.log(`\nTotal employees in DB: ${count[0].n}`);
}

main().catch(err => { console.error("Fatal:", err); process.exit(1); });
