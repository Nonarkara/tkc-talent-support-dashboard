/**
 * Neon Database Client
 *
 * Single module for all database access. Uses @neondatabase/serverless
 * which works over HTTP — no persistent connections, edge-compatible.
 *
 * If DATABASE_URL is missing or placeholder, all queries return empty results
 * and the app falls back to mock/localStorage data.
 */

import { neon } from "@neondatabase/serverless";

const DATABASE_URL = process.env.DATABASE_URL ?? "";
const DEFAULT_QUERY_TIMEOUT_MS = 3500;
const parsedTimeout = Number(process.env.DB_QUERY_TIMEOUT_MS ?? DEFAULT_QUERY_TIMEOUT_MS);
const QUERY_TIMEOUT_MS = Number.isFinite(parsedTimeout)
  ? Math.max(500, parsedTimeout)
  : DEFAULT_QUERY_TIMEOUT_MS;

const isConfigured =
  DATABASE_URL.length > 0 &&
  !DATABASE_URL.includes("placeholder") &&
  DATABASE_URL.startsWith("postgresql");

/**
 * Tagged template for SQL queries. Returns rows directly.
 * Usage: const rows = await sql`SELECT * FROM employees`;
 */
export const sql = isConfigured ? neon(DATABASE_URL) : null;

/**
 * Whether the database is configured and ready.
 */
export function isDbConfigured(): boolean {
  return isConfigured && sql !== null;
}

/**
 * Execute a parameterized query with $1, $2 placeholders.
 * Returns typed rows. Returns empty array if DB is not configured.
 */
export async function query<T = Record<string, unknown>>(
  text: string,
  params: unknown[] = [],
): Promise<T[]> {
  if (!sql) return [];

  try {
    const resultPromise = sql.query(text, params) as Promise<T[]>;
    const timed = new Promise<T[]>((resolve, reject) => {
      const timeoutId = setTimeout(() => {
        reject(new Error(`Database query timed out after ${QUERY_TIMEOUT_MS}ms`));
      }, QUERY_TIMEOUT_MS);

      void resultPromise.then(
        (rows) => {
          clearTimeout(timeoutId);
          resolve(rows);
        },
        (error) => {
          clearTimeout(timeoutId);
          reject(error);
        },
      );
    });

    const result = await timed;
    return result as T[];
  } catch (error) {
    console.error("[db] Query failed:", error);
    throw error;
  }
}

/**
 * Execute raw SQL (for migrations). Returns void.
 */
export async function exec(text: string): Promise<void> {
  if (!sql) throw new Error("Database not configured");
  await sql.query(text);
}
