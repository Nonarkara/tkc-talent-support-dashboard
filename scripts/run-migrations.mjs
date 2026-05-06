/**
 * Run all numbered SQL migrations in /db against the configured database.
 * Usage: node scripts/run-migrations.mjs
 */
import { neon } from "@neondatabase/serverless";
import { readdirSync, readFileSync } from "fs";
import { fileURLToPath } from "url";
import { dirname, join } from "path";

const __dirname = dirname(fileURLToPath(import.meta.url));
const envPath = join(__dirname, "../.env.local");
const envContent = readFileSync(envPath, "utf-8");
const dbMatch = envContent.match(/^DATABASE_URL=(.+)$/m);
if (!dbMatch) { console.error("DATABASE_URL missing"); process.exit(1); }
const sql = neon(dbMatch[1].trim());

const files = readdirSync(join(__dirname, "../db"))
  .filter((file) => /^\d+.*\.sql$/i.test(file))
  .sort((left, right) => left.localeCompare(right, undefined, { numeric: true }));

function splitSqlStatements(text) {
  const statements = [];
  let current = "";
  let inSingleQuote = false;
  let inLineComment = false;
  let dollarTag = null;

  for (let i = 0; i < text.length; i += 1) {
    const char = text[i];
    const next = text[i + 1];

    if (inLineComment) {
      current += char;
      if (char === "\n") inLineComment = false;
      continue;
    }

    if (!inSingleQuote && !dollarTag && char === "-" && next === "-") {
      inLineComment = true;
      current += char;
      current += next;
      i += 1;
      continue;
    }

    if (!inSingleQuote && char === "$") {
      const rest = text.slice(i);
      const tagMatch = rest.match(/^\$[A-Za-z0-9_]*\$/);
      if (tagMatch) {
        const tag = tagMatch[0];
        current += tag;
        i += tag.length - 1;
        if (dollarTag === tag) {
          dollarTag = null;
        } else if (dollarTag == null) {
          dollarTag = tag;
        }
        continue;
      }
    }

    if (!dollarTag && char === "'") {
      current += char;
      if (inSingleQuote && next === "'") {
        current += next;
        i += 1;
        continue;
      }
      inSingleQuote = !inSingleQuote;
      continue;
    }

    if (!inSingleQuote && !dollarTag && char === ";") {
      if (current.trim()) statements.push(current.trim());
      current = "";
      continue;
    }

    current += char;
  }

  if (current.trim()) statements.push(current.trim());
  return statements;
}

for (const f of files) {
  const path = join(__dirname, "../db", f);
  const raw = readFileSync(path, "utf-8");
  console.log(`\n▶ ${f}`);
  const statements = splitSqlStatements(raw);
  for (const stmt of statements) {
    try {
      await sql.query(stmt);
      console.log(`  ✓ ${stmt.slice(0, 70).replace(/\s+/g, " ")}...`);
    } catch (e) {
      console.error(`  ✗ ${e.message}`);
      console.error(`    stmt: ${stmt.slice(0, 200)}`);
    }
  }
}
console.log("\n✅ migrations done");
