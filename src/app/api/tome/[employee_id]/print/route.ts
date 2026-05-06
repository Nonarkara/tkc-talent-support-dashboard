/**
 * GET /api/tome/[employee_id]/print
 *
 * Returns the full Tome data structure as JSON. The print-ready HTML
 * lives at `/tome/[employee_id]` (a server-rendered page). This endpoint
 * exists for:
 *   - external print pipelines (vendor that takes JSON → typesetter)
 *   - the Obsidian export (gives the LLM the same shape it has)
 *   - debugging
 *
 * Auth: protected by site middleware (tkc_access cookie).
 */

import { NextResponse } from "next/server";
import { loadTome } from "@/lib/tome";
import { logApiError } from "@/lib/api";

export async function GET(
  _request: Request,
  context: { params: Promise<{ employee_id: string }> },
) {
  try {
    const { employee_id } = await context.params;
    const tome = await loadTome(employee_id);
    if (!tome) {
      return NextResponse.json(
        { ok: false, error: "Employee not found" },
        { status: 404 },
      );
    }
    return NextResponse.json({ ok: true, tome });
  } catch (err) {
    logApiError("api/tome/[employee_id]/print", err);
    return NextResponse.json(
      { ok: false, error: err instanceof Error ? err.message : "Failed" },
      { status: 500 },
    );
  }
}
