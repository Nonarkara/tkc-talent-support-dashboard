/**
 * POST /api/sync/sheets-restore
 *
 * Reverse direction of the bootstrap mirror. Reads authoritative-state
 * tabs from Google Sheets and UPSERTs the rows back into Postgres.
 *
 * Body: { scope: "players" | "projects" | "resources" | "all",
 *         confirm: "RESTORE" }
 *
 * The `confirm` field is a deliberate friction — UI requires a second
 * click to send it, so an accidental request 400s instead of mutating
 * the database.
 *
 * Returns aggregate counts: { ok, scope, players?, projects?, resources?,
 *   total_inserted, total_updated, total_skipped, errors[] }.
 *
 * Auth: protected by the site middleware's `tkc_access` cookie. Outside
 * traffic cannot reach this endpoint.
 *
 * Failure modes:
 *   400 — `confirm` missing or wrong scope
 *   503 — Sheets not configured (env vars missing)
 *   200 — partial success (errors[] populated, ok may be false)
 */

import { NextResponse } from "next/server";
import { sheetsEnabled } from "@/lib/sheets-sync";
import {
  restorePlayersFromSheet,
  restoreProjectsFromSheet,
  restoreResourcesFromSheet,
  type RestoreResult,
} from "@/lib/sheets-mirror";
import { logApiError } from "@/lib/api";

type Scope = "players" | "projects" | "resources" | "all";
const VALID_SCOPES: Scope[] = ["players", "projects", "resources", "all"];

export async function POST(request: Request) {
  if (!sheetsEnabled()) {
    return NextResponse.json(
      { ok: false, error: "Sheets not configured (GOOGLE_SHEETS_ID / GOOGLE_SERVICE_ACCOUNT_KEY missing)" },
      { status: 503 },
    );
  }

  let body: { scope?: string; confirm?: string };
  try {
    body = (await request.json()) as { scope?: string; confirm?: string };
  } catch {
    return NextResponse.json({ ok: false, error: "Invalid JSON body" }, { status: 400 });
  }

  if (body.confirm !== "RESTORE") {
    return NextResponse.json(
      { ok: false, error: "Missing or wrong confirm field — must equal \"RESTORE\"" },
      { status: 400 },
    );
  }

  const scope = body.scope as Scope | undefined;
  if (!scope || !VALID_SCOPES.includes(scope)) {
    return NextResponse.json(
      { ok: false, error: `Invalid scope. Use one of: ${VALID_SCOPES.join(", ")}` },
      { status: 400 },
    );
  }

  const out: {
    ok: boolean;
    scope: Scope;
    players?: RestoreResult;
    projects?: RestoreResult;
    resources?: RestoreResult;
    total_inserted: number;
    total_updated: number;
    total_skipped: number;
    total_scanned: number;
    errors: string[];
  } = {
    ok: true,
    scope,
    total_inserted: 0,
    total_updated: 0,
    total_skipped: 0,
    total_scanned: 0,
    errors: [],
  };

  try {
    if (scope === "players" || scope === "all") {
      const r = await restorePlayersFromSheet();
      out.players = r;
      out.ok = out.ok && r.ok;
      out.total_inserted += r.inserted;
      out.total_updated += r.updated;
      out.total_skipped += r.skipped;
      out.total_scanned += r.scanned;
      if (r.errors.length) out.errors.push(...r.errors.map((e) => `[players] ${e}`));
    }

    if (scope === "projects" || scope === "all") {
      const r = await restoreProjectsFromSheet();
      out.projects = r;
      out.ok = out.ok && r.ok;
      out.total_inserted += r.inserted;
      out.total_updated += r.updated;
      out.total_skipped += r.skipped;
      out.total_scanned += r.scanned;
      if (r.errors.length) out.errors.push(...r.errors.map((e) => `[projects] ${e}`));
    }

    if (scope === "resources" || scope === "all") {
      const r = await restoreResourcesFromSheet();
      out.resources = r;
      out.ok = out.ok && r.ok;
      out.total_inserted += r.inserted;
      out.total_updated += r.updated;
      out.total_skipped += r.skipped;
      out.total_scanned += r.scanned;
      if (r.errors.length) out.errors.push(...r.errors.map((e) => `[resources] ${e}`));
    }

    return NextResponse.json(out);
  } catch (err) {
    logApiError("api/sync/sheets-restore", err);
    return NextResponse.json(
      { ok: false, error: err instanceof Error ? err.message : "Restore failed" },
      { status: 500 },
    );
  }
}

export async function GET() {
  return NextResponse.json({
    configured: sheetsEnabled(),
    hint: "POST { scope: 'players' | 'projects' | 'resources' | 'all', confirm: 'RESTORE' }",
  });
}
