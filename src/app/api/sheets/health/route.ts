/**
 * GET /api/sheets/health
 *
 * Cheap health probe for the Google Sheets mirror. The command-center UI
 * polls this every 60s to drive its sync-status LED. No writes happen
 * here — we only enumerate tab titles and compare against our declared
 * schema in `sheets-tabs.ts`.
 *
 * Returns `{ ok, enabled, tabs, declared, missing, error?, checked_at }`.
 * Never surfaces the service-account key contents.
 */

import { NextResponse } from "next/server";
import { sheetsHealth } from "@/lib/sheets-sync";

export async function GET() {
  const health = await sheetsHealth();
  return NextResponse.json(health, {
    status: 200,
    headers: { "cache-control": "no-store" },
  });
}
