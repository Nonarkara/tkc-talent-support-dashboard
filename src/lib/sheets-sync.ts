/**
 * Google Sheets sync — fire-and-forget ledger mirror.
 *
 * Philosophy
 * ──────────
 * Neon Postgres is the source of truth. Sheets is a human-readable shadow
 * so HR can sort, pivot, and share outside the app. Failure to write to
 * Sheets must NEVER break a DB commit. Every primitive here wraps its
 * work in a try/catch, logs on error, and returns normally.
 *
 * If either `GOOGLE_SHEETS_ID` or `GOOGLE_SERVICE_ACCOUNT_KEY` is absent,
 * the module goes into no-op mode — every call short-circuits before
 * talking to Google. The app keeps working; nothing is logged except a
 * one-time warning at import time.
 *
 * Primitives
 * ──────────
 *   upsertRow(tab, row)    — match by first-column ID, update or append.
 *   appendEvent(tab, row)  — append, no dedupe.
 *   replaceTab(tab, rows)  — wipe contents (keep header), rewrite all rows.
 *   bootstrapTabs()        — idempotent: create missing tabs, write headers.
 *
 * Call sites should use fire-and-forget: `void sheetsUpsert("Players", row)`.
 * Await only during the bootstrap endpoint where we want to surface errors.
 */

import { google, type sheets_v4 } from "googleapis";
import { TABS, type TabConfig, type TabName } from "./sheets-tabs";

// ─── Config + guard ───────────────────────────────────────────────────────

const SPREADSHEET_ID = process.env.GOOGLE_SHEETS_ID ?? "";
const SA_KEY_B64 = process.env.GOOGLE_SERVICE_ACCOUNT_KEY ?? "";

const configured = SPREADSHEET_ID.length > 0 && SA_KEY_B64.length > 0;

if (!configured && process.env.NODE_ENV !== "test") {
  // One-time import-time warning. Individual calls stay quiet.
  // eslint-disable-next-line no-console
  console.info(
    "[sheets] GOOGLE_SHEETS_ID or GOOGLE_SERVICE_ACCOUNT_KEY missing — sync disabled (DB-only mode)",
  );
}

/** True if both required env vars are present. Read by callers to gate. */
export function sheetsEnabled(): boolean {
  return configured;
}

// ─── Lazy client ──────────────────────────────────────────────────────────

let _client: sheets_v4.Sheets | null = null;

async function getClient(): Promise<sheets_v4.Sheets | null> {
  if (!configured) return null;
  if (_client) return _client;

  try {
    const keyJson = Buffer.from(SA_KEY_B64, "base64").toString("utf-8");
    const creds = JSON.parse(keyJson) as {
      client_email: string;
      private_key: string;
    };
    const auth = new google.auth.JWT({
      email: creds.client_email,
      key: creds.private_key,
      scopes: ["https://www.googleapis.com/auth/spreadsheets"],
    });
    _client = google.sheets({ version: "v4", auth });
    return _client;
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error("[sheets] failed to build client:", err);
    return null;
  }
}

// ─── Helpers ──────────────────────────────────────────────────────────────

/** A Sheets row = list of primitive cell values (strings/numbers/booleans). */
export type Cell = string | number | boolean | null;
export type Row = Record<string, Cell>;

/** Project a Row keyed by header name into an ordered list of cells. */
function rowToCells(tab: TabConfig, row: Row): Cell[] {
  return tab.headers.map((h) => {
    const v = row[h];
    if (v == null) return "";
    if (typeof v === "object") return JSON.stringify(v);
    return v;
  });
}

/** Fetch the current ID column for an upsert tab. Returns [] on failure. */
async function fetchIdColumn(
  client: sheets_v4.Sheets,
  tab: TabConfig,
): Promise<string[]> {
  try {
    const range = `${tab.name}!A2:A`;
    const res = await client.spreadsheets.values.get({
      spreadsheetId: SPREADSHEET_ID,
      range,
      majorDimension: "COLUMNS",
    });
    const cols = res.data.values ?? [];
    const idCol = cols[0] ?? [];
    return idCol.map((v) => String(v ?? ""));
  } catch {
    return [];
  }
}

// ─── Primitives ───────────────────────────────────────────────────────────

/**
 * Upsert a row keyed by the first header column (the stable ID).
 * Safe to fire-and-forget.
 */
export async function upsertRow(tabName: TabName, row: Row): Promise<void> {
  const client = await getClient();
  if (!client) return;
  const tab = TABS.find((t) => t.name === tabName);
  if (!tab) return;
  if (tab.strategy !== "upsert") {
    // eslint-disable-next-line no-console
    console.warn(`[sheets] upsertRow called on ${tabName} (strategy=${tab.strategy})`);
  }

  const idHeader = tab.headers[0];
  const id = String(row[idHeader] ?? "");
  if (!id) {
    // eslint-disable-next-line no-console
    console.warn(`[sheets] upsertRow: missing ${idHeader} for tab ${tabName}`);
    return;
  }

  try {
    const ids = await fetchIdColumn(client, tab);
    const cells = rowToCells(tab, row);
    const existingIdx = ids.indexOf(id);

    if (existingIdx >= 0) {
      // Row 1 is header, so existing row is at index + 2.
      const rowNumber = existingIdx + 2;
      const range = `${tab.name}!A${rowNumber}`;
      await client.spreadsheets.values.update({
        spreadsheetId: SPREADSHEET_ID,
        range,
        valueInputOption: "RAW",
        requestBody: { values: [cells] },
      });
    } else {
      await client.spreadsheets.values.append({
        spreadsheetId: SPREADSHEET_ID,
        range: `${tab.name}!A1`,
        valueInputOption: "RAW",
        insertDataOption: "INSERT_ROWS",
        requestBody: { values: [cells] },
      });
    }
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error(`[sheets] upsertRow ${tabName}:`, err);
  }
}

/**
 * Append a row to an append-only tab (events, check-ins, history).
 * Safe to fire-and-forget.
 */
export async function appendEvent(tabName: TabName, row: Row): Promise<void> {
  const client = await getClient();
  if (!client) return;
  const tab = TABS.find((t) => t.name === tabName);
  if (!tab) return;

  try {
    const cells = rowToCells(tab, row);
    await client.spreadsheets.values.append({
      spreadsheetId: SPREADSHEET_ID,
      range: `${tab.name}!A1`,
      valueInputOption: "RAW",
      insertDataOption: "INSERT_ROWS",
      requestBody: { values: [cells] },
    });
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error(`[sheets] appendEvent ${tabName}:`, err);
  }
}

/**
 * Append many rows to an append-only tab in a single Sheets call.
 * Bulk game seeds use this so the DB can stay fast while Sheets still
 * receives a readable audit shadow.
 */
export async function appendRows(tabName: TabName, rows: Row[]): Promise<void> {
  if (rows.length === 0) return;
  const client = await getClient();
  if (!client) return;
  const tab = TABS.find((t) => t.name === tabName);
  if (!tab) return;
  if (tab.strategy !== "append") {
    // eslint-disable-next-line no-console
    console.warn(`[sheets] appendRows called on ${tabName} (strategy=${tab.strategy})`);
  }

  try {
    const chunkSize = 50;
    for (let i = 0; i < rows.length; i += chunkSize) {
      const values = rows.slice(i, i + chunkSize).map((row) => rowToCells(tab, row));
      await client.spreadsheets.values.append({
        spreadsheetId: SPREADSHEET_ID,
        range: `${tab.name}!A1`,
        valueInputOption: "RAW",
        insertDataOption: "INSERT_ROWS",
        requestBody: { values },
      });
    }
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error(`[sheets] appendRows ${tabName}:`, err);
  }
}

/**
 * Replace the entire tab body (keeps header row). Used for snapshot tabs
 * where we recompute state from scratch. Safe to fire-and-forget but
 * typically awaited from cron endpoints.
 */
export async function replaceTab(
  tabName: TabName,
  rows: Row[],
): Promise<void> {
  const client = await getClient();
  if (!client) return;
  const tab = TABS.find((t) => t.name === tabName);
  if (!tab) return;

  try {
    // Clear body (row 2 onwards).
    await client.spreadsheets.values.clear({
      spreadsheetId: SPREADSHEET_ID,
      range: `${tab.name}!A2:Z`,
    });
    if (rows.length === 0) return;
    const values = rows.map((r) => rowToCells(tab, r));
    await client.spreadsheets.values.update({
      spreadsheetId: SPREADSHEET_ID,
      range: `${tab.name}!A2`,
      valueInputOption: "RAW",
      requestBody: { values },
    });
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error(`[sheets] replaceTab ${tabName}:`, err);
  }
}

// ─── Read primitive (restore path) ───────────────────────────────────────

/**
 * Read every row from a tab as an array of header-keyed objects.
 *
 * Row 1 is treated as headers; rows 2+ are returned as
 * `{ [header]: cellValue }` records. Empty cells become `""` so callers
 * can distinguish "missing column" from "explicit empty string". Tabs
 * not in TABS are still readable (returns empty when access fails).
 *
 * Used by the Sheets → DB restore flow in `sheets-mirror.ts`.
 * No-op (returns []) when sheets are disabled or the read fails — the
 * caller decides how to surface that to the user.
 *
 * Pagination: not needed at our scale (< 1000 rows per authoritative
 * tab). The Google API will return up to 5M cells in one shot, which
 * is far above what TKC writes.
 */
export async function readTab(tabName: string): Promise<Record<string, string>[]> {
  const client = await getClient();
  if (!client) return [];

  try {
    const res = await client.spreadsheets.values.get({
      spreadsheetId: SPREADSHEET_ID,
      range: `${tabName}!A:Z`,
      majorDimension: "ROWS",
    });
    const rows = res.data.values ?? [];
    if (rows.length < 2) return []; // header-only or empty.
    const headers = rows[0].map((h) => String(h ?? ""));
    return rows.slice(1).map((r) => {
      const out: Record<string, string> = {};
      headers.forEach((h, i) => {
        out[h] = String(r[i] ?? "");
      });
      return out;
    });
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error(`[sheets] readTab ${tabName}:`, err);
    return [];
  }
}

// ─── Health ───────────────────────────────────────────────────────────────

export interface SheetsHealthResult {
  ok: boolean;
  enabled: boolean;
  tabs: string[];
  declared: string[];
  missing: string[];
  error?: string;
  checked_at: string;
}

/**
 * Cheap health probe: read sheet metadata, list tab titles, diff against
 * the declared TABS list. No writes. Safe to hit every 60s.
 */
export async function sheetsHealth(): Promise<SheetsHealthResult> {
  const declared = TABS.map((t) => t.name);
  const checked_at = new Date().toISOString();

  if (!configured) {
    return {
      ok: false,
      enabled: false,
      tabs: [],
      declared,
      missing: declared,
      error: "ENV_MISSING",
      checked_at,
    };
  }

  const client = await getClient();
  if (!client) {
    return {
      ok: false,
      enabled: true,
      tabs: [],
      declared,
      missing: declared,
      error: "CLIENT_INIT_FAILED",
      checked_at,
    };
  }

  try {
    const meta = await client.spreadsheets.get({
      spreadsheetId: SPREADSHEET_ID,
    });
    const tabs = (meta.data.sheets ?? [])
      .map((s) => s.properties?.title ?? "")
      .filter(Boolean);
    const missing = declared.filter((t) => !tabs.includes(t));
    return {
      ok: missing.length === 0,
      enabled: true,
      tabs,
      declared,
      missing,
      checked_at,
    };
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return {
      ok: false,
      enabled: true,
      tabs: [],
      declared,
      missing: declared,
      error: msg,
      checked_at,
    };
  }
}

// ─── Bootstrap ────────────────────────────────────────────────────────────

interface BootstrapResult {
  ok: boolean;
  created: string[];
  already: string[];
  error?: string;
}

/**
 * Idempotent: ensure every tab in TABS exists with the correct header
 * row. Creates missing tabs, writes headers to both new and existing
 * tabs (overwriting the header row — safe because headers are fixed).
 */
export async function bootstrapTabs(): Promise<BootstrapResult> {
  const client = await getClient();
  if (!client) {
    return {
      ok: false,
      created: [],
      already: [],
      error: "Sheets not configured (GOOGLE_SHEETS_ID / GOOGLE_SERVICE_ACCOUNT_KEY missing)",
    };
  }

  const created: string[] = [];
  const already: string[] = [];

  try {
    const meta = await client.spreadsheets.get({
      spreadsheetId: SPREADSHEET_ID,
    });
    const existing = new Set(
      (meta.data.sheets ?? []).map((s) => s.properties?.title ?? ""),
    );

    // Create missing tabs in a single batchUpdate.
    const missing = TABS.filter((t) => !existing.has(t.name));
    if (missing.length > 0) {
      await client.spreadsheets.batchUpdate({
        spreadsheetId: SPREADSHEET_ID,
        requestBody: {
          requests: missing.map((t) => ({
            addSheet: { properties: { title: t.name } },
          })),
        },
      });
      for (const t of missing) created.push(t.name);
    }
    for (const t of TABS) {
      if (existing.has(t.name)) already.push(t.name);
    }

    // Write header row to every tab (idempotent).
    const data = TABS.map((t) => ({
      range: `${t.name}!A1`,
      values: [t.headers.slice()],
    }));
    await client.spreadsheets.values.batchUpdate({
      spreadsheetId: SPREADSHEET_ID,
      requestBody: { valueInputOption: "RAW", data },
    });

    // Freeze the header row on every tab for nicer UX.
    const sheetsMeta = await client.spreadsheets.get({
      spreadsheetId: SPREADSHEET_ID,
    });
    const freezeReqs = (sheetsMeta.data.sheets ?? [])
      .filter((s) => TABS.some((t) => t.name === s.properties?.title))
      .map((s) => ({
        updateSheetProperties: {
          properties: {
            sheetId: s.properties?.sheetId,
            gridProperties: { frozenRowCount: 1 },
          },
          fields: "gridProperties.frozenRowCount",
        },
      }));
    if (freezeReqs.length > 0) {
      await client.spreadsheets.batchUpdate({
        spreadsheetId: SPREADSHEET_ID,
        requestBody: { requests: freezeReqs },
      });
    }

    return { ok: true, created, already };
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    // eslint-disable-next-line no-console
    console.error("[sheets] bootstrapTabs:", err);
    return { ok: false, created, already, error: msg };
  }
}
