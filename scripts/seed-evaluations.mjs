/**
 * Seed evaluations for cycle 2026-Q2 — batched, one multi-row INSERT per employee.
 */
import { neon } from "@neondatabase/serverless";
import { readFileSync } from "fs";
import { fileURLToPath } from "url";
import { dirname, join } from "path";

const __dirname = dirname(fileURLToPath(import.meta.url));
const env = readFileSync(join(__dirname, "../.env.local"), "utf-8");
const url = env.match(/^DATABASE_URL=(.+)$/m)[1].trim();
const sql = neon(url);

const CYCLE = "2026-Q2";
const EXEC_DIMS = ["str", "int", "wis", "cha", "dex", "con"];
const OTHER_DIMS = [
  ["cause", 72], ["compensation", 58], ["career", 62],
  ["community", 70], ["delivery", 68], ["growth", 60],
];
const scale = (v) => Math.max(0, Math.min(100, Math.round((v ?? 10) * 5)));
const jitter = (r) => r === "self" ? 6 : r === "manager" ? -3 : -1;
const clamp = (v) => Math.max(0, Math.min(100, Math.round(v)));

async function main() {
  const rows = await sql`
    SELECT e.id,
           a.str, a.int, a.wis, a.cha, a.dex, a.con
    FROM employees e
    LEFT JOIN employee_attributes a ON a.employee_id = e.id
    WHERE e.is_active = true
  `;
  console.log(`Seeding ${rows.length} employees × 36 rows each`);

  let done = 0;
  for (const emp of rows) {
    const exec = { str: scale(emp.str), int: scale(emp.int), wis: scale(emp.wis),
                   cha: scale(emp.cha), dex: scale(emp.dex), con: scale(emp.con) };
    const values = [];
    const params = [];
    let p = 1;
    for (const rater of ["self", "manager", "hr"]) {
      const j = jitter(rater);
      for (const k of EXEC_DIMS) {
        values.push(`($${p++}, $${p++}, $${p++}, $${p++}, $${p++})`);
        params.push(emp.id, k, rater, CYCLE, clamp(exec[k] + j));
      }
      for (const [k, base] of OTHER_DIMS) {
        values.push(`($${p++}, $${p++}, $${p++}, $${p++}, $${p++})`);
        params.push(emp.id, k, rater, CYCLE, clamp(base + j));
      }
    }
    const q = `INSERT INTO evaluations (employee_id, dimension_key, rater_type, cycle, score)
               VALUES ${values.join(",")}
               ON CONFLICT (employee_id, dimension_key, rater_type, cycle)
               DO UPDATE SET score = EXCLUDED.score, updated_at = now()`;
    let attempt = 0;
    while (true) {
      try {
        await sql.query(q, params);
        break;
      } catch (e) {
        attempt++;
        if (attempt >= 3) throw e;
        console.warn(`  retry ${attempt} for employee ${done}: ${e.message}`);
        await new Promise(r => setTimeout(r, 1500 * attempt));
      }
    }
    done++;
    if (done % 50 === 0) console.log(`  ${done}/${rows.length}`);
  }
  console.log(`✅ done`);
}

main().catch(e => { console.error(e); process.exit(1); });
