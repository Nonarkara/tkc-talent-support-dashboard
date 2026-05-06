/**
 * Simple migration runner for Neon PostgreSQL.
 * Run: npx tsx db/migrate.ts
 *
 * Reads SQL files in db/ in order, skips already-applied ones.
 */

import { readFileSync, readdirSync } from "fs";
import { join } from "path";
import { neon } from "@neondatabase/serverless";

const DATABASE_URL = process.env.DATABASE_URL;

if (!DATABASE_URL || DATABASE_URL.includes("placeholder")) {
  console.error("ERROR: Set DATABASE_URL in .env.local or environment");
  console.error("Example: DATABASE_URL=postgresql://user:pass@ep-xxx.us-east-2.aws.neon.tech/neondb?sslmode=require");
  process.exit(1);
}

const sql = neon(DATABASE_URL);

/**
 * Split SQL into individual statements, respecting $$ quoted blocks.
 */
function splitSQL(text: string): string[] {
  const results: string[] = [];
  let current = "";
  let inDollarQuote = false;

  const lines = text.split("\n");
  for (const line of lines) {
    const trimmed = line.trim();
    // Skip pure comment lines outside statements
    if (!inDollarQuote && !current.trim() && trimmed.startsWith("--")) continue;

    // Track $$ blocks
    const dollarCount = (line.match(/\$\$/g) || []).length;
    if (dollarCount % 2 === 1) inDollarQuote = !inDollarQuote;

    current += line + "\n";

    // If we're not inside a $$ block and the line ends with ;
    if (!inDollarQuote && trimmed.endsWith(";")) {
      const stmt = current.trim().replace(/;\s*$/, "");
      if (stmt && !stmt.startsWith("--")) {
        results.push(stmt);
      }
      current = "";
    }
  }

  // Flush any remaining
  const leftover = current.trim().replace(/;\s*$/, "");
  if (leftover && !leftover.startsWith("--")) {
    results.push(leftover);
  }

  return results;
}

async function migrate() {
  const dbDir = join(import.meta.dirname ?? __dirname, ".");
  const files = readdirSync(dbDir)
    .filter((f) => f.endsWith(".sql") && /^\d{3}_/.test(f))
    .sort();

  console.log(`Found ${files.length} migration files`);

  // Ensure migrations table exists (bootstrap)
  await sql`
    CREATE TABLE IF NOT EXISTS _migrations (
      id SERIAL PRIMARY KEY,
      name TEXT UNIQUE NOT NULL,
      applied_at TIMESTAMPTZ DEFAULT now()
    )
  `;

  const applied = await sql`SELECT name FROM _migrations ORDER BY name`;
  const appliedSet = new Set(applied.map((r) => r.name));

  let count = 0;
  for (const file of files) {
    if (appliedSet.has(file)) {
      console.log(`  SKIP  ${file} (already applied)`);
      continue;
    }

    console.log(`  APPLY ${file} ...`);
    const content = readFileSync(join(dbDir, file), "utf-8");

    try {
      // Neon HTTP driver can't execute multiple statements in one call.
      // Split carefully, respecting $$ blocks (functions/DO blocks).
      const statements = splitSQL(content);

      for (const stmt of statements) {
        try {
          await sql.query(stmt);
        } catch (stmtErr: unknown) {
          const msg = stmtErr instanceof Error ? stmtErr.message : String(stmtErr);
          if (msg.includes("already exists") || msg.includes("duplicate key")) {
            console.log(`    SKIP (already exists): ${stmt.slice(0, 60)}...`);
          } else {
            throw stmtErr;
          }
        }
      }

      await sql`INSERT INTO _migrations (name) VALUES (${file})`;
      count++;
      console.log(`  OK    ${file} (${statements.length} statements)`);
    } catch (error) {
      console.error(`  FAIL  ${file}:`, error);
      process.exit(1);
    }
  }

  console.log(`\nDone. Applied ${count} new migration(s).`);

  // Show table counts
  const tables = ["divisions", "departments", "employees", "projects"];
  for (const table of tables) {
    try {
      const result = await sql.query(`SELECT COUNT(*) as count FROM ${table}`);
      console.log(`  ${table}: ${result[0]?.count ?? 0} rows`);
    } catch {
      // Table might not exist yet
    }
  }
}

migrate().catch((err) => {
  console.error("Migration failed:", err);
  process.exit(1);
});
