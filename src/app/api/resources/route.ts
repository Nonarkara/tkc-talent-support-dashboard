/**
 * GET  /api/resources        — list all
 * POST /api/resources        — upsert by code
 *
 * Covers non-human capacity (data centres, compute, licences,
 * headcount pools, wishlist items). Mirrors to the Resources tab in
 * Google Sheets so HR + Strategy can see the same list.
 */

import { neon } from "@neondatabase/serverless";
import { NextRequest, NextResponse } from "next/server";
import { mirrorResource } from "@/lib/sheets-mirror";

const sql = neon(process.env.DATABASE_URL!);

type ResourceBody = {
  code: string;
  label: string;
  category: "datacentre" | "compute" | "license" | "headcount" | "wishlist";
  capacity?: number | null;
  unit?: string | null;
  status?: "owned" | "wishlist" | "co-location";
  notes?: string | null;
};

export async function GET() {
  try {
    const rows = await sql`
      SELECT code, label, category, capacity, unit, status, notes,
             created_at, updated_at
        FROM resources
       ORDER BY category, code
    `;
    return NextResponse.json({ resources: rows });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error("[GET /api/resources]", msg);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json()) as ResourceBody;

    if (!body.code || !body.label || !body.category) {
      return NextResponse.json(
        { error: "code, label, category are required" },
        { status: 400 },
      );
    }

    const status = body.status ?? "owned";

    await sql`
      INSERT INTO resources (code, label, category, capacity, unit, status, notes)
      VALUES (${body.code}, ${body.label}, ${body.category},
              ${body.capacity ?? null}, ${body.unit ?? null},
              ${status}, ${body.notes ?? null})
      ON CONFLICT (code) DO UPDATE SET
        label = EXCLUDED.label,
        category = EXCLUDED.category,
        capacity = EXCLUDED.capacity,
        unit = EXCLUDED.unit,
        status = EXCLUDED.status,
        notes = EXCLUDED.notes,
        updated_at = NOW()
    `;

    void mirrorResource({
      code: body.code,
      label: body.label,
      category: body.category,
      capacity: body.capacity ?? null,
      unit: body.unit ?? null,
      status,
      notes: body.notes ?? null,
    });

    return NextResponse.json({ ok: true, code: body.code });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error("[POST /api/resources]", msg);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
