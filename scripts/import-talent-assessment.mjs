/**
 * Direct Neon import — TKC Talent Assessment (Phase 1).
 *
 * Reads the CSV Khun Jun shared (~46 nominees with 9-Box assignments)
 * and writes both:
 *   1. The current-cycle snapshot onto each matched `employees` row.
 *   2. A row in `talent_assessments` (cycle = "2026-H1") so we keep
 *      history for the next round.
 *
 * Match strategy: Employee_ID column → employees.employee_code.
 * Unmatched rows are reported and skipped; we never invent employees.
 *
 * Usage:
 *   node scripts/import-talent-assessment.mjs [path-to-csv]
 *   (defaults to /Users/nonarkara/Downloads/Talent Assessment_Draft rev.csv)
 */

import { neon } from "@neondatabase/serverless";
import { readFileSync } from "fs";
import { fileURLToPath } from "url";
import { dirname, join } from "path";

const __dirname = dirname(fileURLToPath(import.meta.url));
const DEFAULT_CSV = "/Users/nonarkara/Downloads/Talent Assessment_Draft rev.csv";
const CSV_PATH = process.argv[2] ?? DEFAULT_CSV;
const CYCLE = "2026-H1";

// Load DATABASE_URL from .env.local
const envPath = join(__dirname, "../.env.local");
const envContent = readFileSync(envPath, "utf-8");
const dbMatch = envContent.match(/^DATABASE_URL=(.+)$/m);
if (!dbMatch) {
  console.error("DATABASE_URL not found in .env.local");
  process.exit(1);
}
const DATABASE_URL = dbMatch[1].trim().replace(/^["']|["']$/g, "");
const sql = neon(DATABASE_URL);

// ─── CSV parser (matches direct-import.mjs conventions) ──────────────
function parseCSVLine(line) {
  const result = [];
  let current = "";
  let inQuotes = false;
  for (const ch of line) {
    if (ch === '"') {
      inQuotes = !inQuotes;
    } else if (ch === "," && !inQuotes) {
      result.push(current);
      current = "";
    } else {
      current += ch;
    }
  }
  result.push(current);
  return result.map((c) => c.trim());
}

/**
 * The CSV has duplicate column headers (`Box_ID`, `9-Box`, `Talent Pool`
 * each appear twice). A dict-by-header parser would let the later
 * occurrence overwrite the earlier one. We avoid that by using fixed
 * column positions (1-indexed for readability against the spreadsheet).
 *
 * Layout — Talent Assessment_Draft rev.csv (May 2026 export):
 *   1  NO
 *   2  Employee_ID
 *   3  Name
 *   4  Sur.            (initial)
 *   5  N+S             (display name)
 *   6  Surname         (full surname)
 *   7  Department
 *   8  Position
 *   9  JG              (Job Grade)
 *   10 G2024           (grade prev year)
 *   11 G2025           (grade curr year)
 *   12 G.Score         (raw grade weight)
 *   13 Grade Score     (40-point grade contribution to performance)
 *   14 Per.Score       (raw performance sub-score)
 *   16 Performance Score (final 0-100)
 *   17 Potential Score   (final 0-100)
 *   18 Average           (mean of perf + pot)
 *   19 Performance       (band 1-3)
 *   20 Potential         (band 1-3)
 *   21 Box_ID            (primary)
 *   22 9-Box             (primary label)
 *   23 Referrence
 *   24 Remark
 *   25 Talent Pool       (primary Y/N)
 */
const COL = {
  NO: 0,
  EMP_ID: 1,
  NAME: 2,
  SUR_INITIAL: 3,
  DISPLAY: 4,
  SURNAME: 5,
  DEPARTMENT: 6,
  POSITION: 7,
  JG: 8,
  G_PREV: 9,
  G_CURR: 10,
  G_SCORE_WEIGHT: 11,
  GRADE_SCORE: 12,
  PER_SCORE_RAW: 13,
  PERFORMANCE_SCORE: 15,
  POTENTIAL_SCORE: 16,
  AVERAGE: 17,
  PERF_BAND: 18,
  POT_BAND: 19,
  BOX_ID: 20,
  BOX_LABEL: 21,
  REFERRENCE: 22,
  REMARK: 23,
  TALENT_POOL: 24,
};

function parseCSV(content) {
  const lines = content.split(/\r?\n/).filter((l) => l.trim().length > 0);
  // skip the header row, return positional arrays
  return lines.slice(1).map(parseCSVLine);
}

function cell(row, idx) {
  return row[idx] ?? "";
}

function num(v) {
  if (v === undefined || v === null || v === "") return null;
  const n = Number(String(v).replace(/,/g, ""));
  return Number.isFinite(n) ? n : null;
}

function intOrNull(v) {
  const n = num(v);
  return n === null ? null : Math.round(n);
}

function nullify(v) {
  if (v === undefined || v === null) return null;
  const s = String(v).trim();
  return s.length === 0 ? null : s;
}

// ─── Run ──────────────────────────────────────────────────────────────
const raw = readFileSync(CSV_PATH, "utf-8");
const rows = parseCSV(raw).filter((r) => nullify(cell(r, COL.EMP_ID)));

console.log(`▶ Read ${rows.length} non-empty rows from ${CSV_PATH}`);

let matched = 0;
let unmatched = 0;
const unmatchedList = [];

for (const r of rows) {
  const employeeCode = nullify(cell(r, COL.EMP_ID));
  if (!employeeCode) continue;

  // Find the employee by employee_code
  const found = await sql`
    SELECT id, full_name_en, full_name_th
    FROM employees
    WHERE employee_code = ${employeeCode}
    LIMIT 1
  `;

  if (found.length === 0) {
    unmatched++;
    unmatchedList.push(`  ${employeeCode}  ${cell(r, COL.NAME)} ${cell(r, COL.SURNAME)}`);
    continue;
  }

  const empId = found[0].id;

  // Positional pulls
  const jobGrade = nullify(cell(r, COL.JG));
  const gradePrev = nullify(cell(r, COL.G_PREV));
  const gradeCurr = nullify(cell(r, COL.G_CURR));
  const gradeAvgScore = num(cell(r, COL.GRADE_SCORE));
  const perfScore = num(cell(r, COL.PERFORMANCE_SCORE));
  const potScore = num(cell(r, COL.POTENTIAL_SCORE));
  const avgScore = num(cell(r, COL.AVERAGE));
  const perfBand = intOrNull(cell(r, COL.PERF_BAND));
  const potBand = intOrNull(cell(r, COL.POT_BAND));
  const boxId = intOrNull(cell(r, COL.BOX_ID));
  const boxLabel = nullify(cell(r, COL.BOX_LABEL));
  const referrence = nullify(cell(r, COL.REFERRENCE));
  const remark = nullify(cell(r, COL.REMARK));
  const inPool = String(cell(r, COL.TALENT_POOL) || "").trim().toUpperCase() === "Y";

  // 1. Update the current snapshot on `employees`
  await sql`
    UPDATE employees
    SET
      job_grade           = COALESCE(${jobGrade},           job_grade),
      grade_prev          = COALESCE(${gradePrev},          grade_prev),
      grade_curr          = COALESCE(${gradeCurr},          grade_curr),
      performance_score   = COALESCE(${perfScore},          performance_score),
      potential_score     = COALESCE(${potScore},           potential_score),
      avg_score           = COALESCE(${avgScore},           avg_score),
      performance_band    = COALESCE(${perfBand},           performance_band),
      potential_band      = COALESCE(${potBand},            potential_band),
      box_id              = COALESCE(${boxId},              box_id),
      box_label           = COALESCE(${boxLabel},           box_label),
      talent_referrence   = COALESCE(${referrence},         talent_referrence),
      talent_remark       = COALESCE(${remark},             talent_remark),
      in_talent_pool      = ${inPool},
      talent_assessed_at  = now()
    WHERE id = ${empId}
  `;

  // 2. Insert / update the history row for this cycle
  await sql`
    INSERT INTO talent_assessments (
      employee_id, cycle,
      job_grade, grade_prev, grade_curr, grade_avg_score,
      performance_score, potential_score, avg_score,
      performance_band, potential_band, box_id, box_label,
      referrence, remark, in_talent_pool, source, imported_at
    ) VALUES (
      ${empId}, ${CYCLE},
      ${jobGrade}, ${gradePrev}, ${gradeCurr}, ${gradeAvgScore},
      ${perfScore}, ${potScore}, ${avgScore},
      ${perfBand}, ${potBand}, ${boxId}, ${boxLabel},
      ${referrence}, ${remark}, ${inPool}, 'csv_import', now()
    )
    ON CONFLICT (employee_id, cycle) DO UPDATE SET
      job_grade           = EXCLUDED.job_grade,
      grade_prev          = EXCLUDED.grade_prev,
      grade_curr          = EXCLUDED.grade_curr,
      grade_avg_score     = EXCLUDED.grade_avg_score,
      performance_score   = EXCLUDED.performance_score,
      potential_score     = EXCLUDED.potential_score,
      avg_score           = EXCLUDED.avg_score,
      performance_band    = EXCLUDED.performance_band,
      potential_band      = EXCLUDED.potential_band,
      box_id              = EXCLUDED.box_id,
      box_label           = EXCLUDED.box_label,
      referrence          = EXCLUDED.referrence,
      remark              = EXCLUDED.remark,
      in_talent_pool      = EXCLUDED.in_talent_pool,
      source              = EXCLUDED.source,
      imported_at         = now()
  `;

  matched++;
}

console.log(`\n✓ Imported / updated: ${matched}`);
console.log(`× Unmatched employee codes: ${unmatched}`);
if (unmatchedList.length > 0) {
  console.log(`\nUnmatched (skipped — no employees row to attach to):`);
  console.log(unmatchedList.join("\n"));
}

// Summary aggregates
const dist = await sql`SELECT * FROM talent_box_distribution`;
console.log(`\n── Box distribution ──`);
for (const row of dist) {
  console.log(
    `  Box ${row.box_id}  ${row.box_label?.padEnd(28) ?? ""}  ${String(row.headcount).padStart(3)}  (final cut: ${row.final_cut})`,
  );
}

const deptDist = await sql`SELECT * FROM talent_dept_distribution`;
console.log(`\n── Department distribution ──`);
for (const row of deptDist) {
  console.log(
    `  ${(row.department ?? "—").padEnd(24)}  nominees ${String(row.nominees).padStart(3)}  pipeline ${String(row.pipeline).padStart(3)}  avg ${row.avg_score ?? "—"}`,
  );
}

const poolCount = await sql`SELECT COUNT(*)::int AS n FROM employees WHERE in_talent_pool = true`;
console.log(`\n── Talent Pool ── ${poolCount[0].n} employees in the final cut`);

process.exit(0);
