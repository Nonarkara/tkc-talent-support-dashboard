/**
 * Parse TKC_Department_KPIs_2025.csv and upsert into department_kpis table.
 * Cycle: FY2025. Department names mapped to DB dept codes where possible;
 * otherwise a slug is used so the row is still queryable.
 */
import { neon } from "@neondatabase/serverless";
import { readFileSync } from "fs";
import { fileURLToPath } from "url";
import { dirname, join } from "path";

const __dirname = dirname(fileURLToPath(import.meta.url));
const env = readFileSync(join(__dirname, "../.env.local"), "utf-8");
const url = env.match(/^DATABASE_URL=(.+)$/m)[1].trim();
const sql = neon(url);

const CSV_PATH = "/Volumes/KINGSTON/Projects 2/archive/tkc/Documents/TKC_Department_KPIs_2025.csv";
const CYCLE = "FY2025";

// CSV dept label (trimmed, lowercased, parens/line-breaks stripped) → DB code
const DEPT_MAP = new Map([
  ["sales & marketing", "SALES"],
  ["business development", "BIZ_DEV"],
  ["network delivery", "NET_DEL"],
  ["intelligent solutions", "INTEL_SOL"],
  ["data center", "DC"],
  ["data communication digital product", "DIGI_PROD"],
  ["data communication enterprise business", "ENTERPRISE"],
  ["public safety", "PUB_SAFETY"],
  ["digital services", "DIGITAL"],
  ["ibs", "IBS"],
  ["finance", "FINANCE"],
  ["accounting", "ACCT"],
  ["procurement", "PROCURE"],
  ["hr&ga", "HR_ADMIN"],
  ["it", "IT"],
  ["org. management", "ORG_MGMT"],
]);

function slug(s) {
  return s.toLowerCase().replace(/[\r\n]+/g, " ")
    .replace(/[()]/g, " ").replace(/\s+/g, " ").trim();
}

// CSV parser supporting quoted fields with embedded newlines.
function parseCSV(text) {
  const rows = [];
  let field = "", row = [], inQ = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (inQ) {
      if (c === '"' && text[i + 1] === '"') { field += '"'; i++; }
      else if (c === '"') { inQ = false; }
      else { field += c; }
    } else {
      if (c === '"') inQ = true;
      else if (c === ",") { row.push(field); field = ""; }
      else if (c === "\n") { row.push(field); rows.push(row); row = []; field = ""; }
      else if (c === "\r") { /* skip */ }
      else field += c;
    }
  }
  if (field.length || row.length) { row.push(field); rows.push(row); }
  return rows;
}

function parseNum(s) {
  if (!s) return null;
  const cleaned = s.replace(/%/g, "").replace(/,/g, "").trim();
  if (!cleaned) return null;
  const n = Number(cleaned);
  return Number.isFinite(n) ? n : null;
}

async function main() {
  const text = readFileSync(CSV_PATH, "utf-8");
  const rows = parseCSV(text);

  let currentDept = null;
  const entries = [];

  for (const r of rows) {
    const [deptRaw, kpi, weight, target, unit, actual] = r.map(x => (x ?? "").trim());
    if (!deptRaw && !kpi) { continue; }

    // Header row (repeats) — skip
    if (deptRaw.toLowerCase() === "department" || kpi.toLowerCase() === "kpi name") continue;

    if (deptRaw) currentDept = slug(deptRaw);
    if (!currentDept || !kpi) continue;

    // Weight might say (%) as a stray second header row
    if (kpi.toLowerCase() === "kpi name") continue;

    const code = DEPT_MAP.get(currentDept) || currentDept.toUpperCase().replace(/[^A-Z0-9]/g, "_").slice(0, 16);
    entries.push({
      dept_code: code,
      kpi_name_en: kpi.replace(/\s+/g, " ").slice(0, 500),
      weight_pct: parseNum(weight) ?? 0,
      target_value: parseNum(target),
      target_unit: unit || null,
      actual_value: parseNum(actual),
    });
  }

  console.log(`Parsed ${entries.length} KPI rows across ${new Set(entries.map(e => e.dept_code)).size} departments`);

  // Batch upsert
  for (const e of entries) {
    await sql`
      INSERT INTO department_kpis (dept_code, cycle, kpi_name_en, weight_pct, target_value, target_unit, actual_value)
      VALUES (${e.dept_code}, ${CYCLE}, ${e.kpi_name_en}, ${e.weight_pct}, ${e.target_value}, ${e.target_unit}, ${e.actual_value})
      ON CONFLICT (dept_code, cycle, kpi_name_en) DO UPDATE SET
        weight_pct = EXCLUDED.weight_pct,
        target_value = EXCLUDED.target_value,
        target_unit = EXCLUDED.target_unit,
        actual_value = EXCLUDED.actual_value,
        updated_at = now()
    `;
  }
  console.log(`✅ upserted ${entries.length} KPIs`);
}

main().catch(e => { console.error(e); process.exit(1); });
