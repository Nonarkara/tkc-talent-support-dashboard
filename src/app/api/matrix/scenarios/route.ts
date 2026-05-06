import { neon } from '@neondatabase/serverless';
import { NextRequest, NextResponse } from 'next/server';
import { scenarioToSheets, type MatrixScenario } from '@/lib/matrix-scenarios';
import { mirrorMatrixScenario } from '@/lib/sheets-mirror';

const sql = neon(process.env.DATABASE_URL!);

/**
 * GET /api/matrix/scenarios
 * List all scenarios for the current cycle.
 */
export async function GET(req: NextRequest) {
  try {
    const cycle = req.nextUrl.searchParams.get('cycle') || '2026-Q2';

    const rows = await sql`
      SELECT
        id, name, description, cycle,
        function_codes, coe_names, allocations, metrics,
        created_at, updated_at
      FROM matrix_scenarios
      WHERE cycle = ${cycle}
      ORDER BY updated_at DESC
      LIMIT 50
    `;

    return NextResponse.json({ scenarios: rows });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error('[GET /api/matrix/scenarios]', msg);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

/**
 * POST /api/matrix/scenarios
 * Create or save a scenario. Body: { name, description?, cycle, function_codes, coe_names, allocations, metrics? }
 *
 * If a scenario with this name + cycle exists, upsert it.
 * Fire-and-forget mirror to Sheets.
 */
export async function POST(req: NextRequest) {
  try {
    const body = (await req.json()) as MatrixScenario;

    if (!body.name) {
      return NextResponse.json({ error: 'name is required' }, { status: 400 });
    }

    const cycle = body.cycle || '2026-Q2';

    const result = await sql`
      INSERT INTO matrix_scenarios
        (name, description, cycle, function_codes, coe_names, allocations, metrics, created_at, updated_at)
      VALUES
        (${body.name}, ${body.description || null}, ${cycle}, ${body.function_codes}, ${body.coe_names}, ${body.allocations}, ${body.metrics || null}, NOW(), NOW())
      ON CONFLICT (name, cycle) DO UPDATE SET
        description = EXCLUDED.description,
        allocations = EXCLUDED.allocations,
        metrics = EXCLUDED.metrics,
        updated_at = NOW()
      RETURNING id, name, created_at, updated_at
    `;

    const scenarioId = result[0]?.id;

    // Fire-and-forget Sheets mirror — errors swallowed inside appendEvent.
    if (scenarioId) {
      const shape = scenarioToSheets({ ...body, cycle });
      void mirrorMatrixScenario({
        scenario_id: String(scenarioId),
        name: body.name,
        cycle,
        functions: body.function_codes ?? [],
        coes: body.coe_names ?? [],
        overall_readiness_pct: Number(shape.overall_readiness_pct) || 0,
        total_over_allocations: Number(shape.total_over_allocations) || 0,
      });
    }

    return NextResponse.json({
      ok: true,
      scenario_id: scenarioId,
      name: body.name,
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error('[POST /api/matrix/scenarios]', msg);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

/**
 * PATCH /api/matrix/scenarios?id=...
 * Update allocations and recompute metrics. Body: { allocations, ?metrics }
 *
 * Mirrors the revised scenario summary to Sheets, same as POST.
 */
export async function PATCH(req: NextRequest) {
  try {
    const body = (await req.json()) as Partial<MatrixScenario>;
    const id = req.nextUrl.searchParams.get('id') || body.id;

    if (!id) {
      return NextResponse.json({ error: 'scenario id required' }, { status: 400 });
    }

    // Fetch the scenario
    const rows = await sql`SELECT * FROM matrix_scenarios WHERE id = ${id}`;
    if (rows.length === 0) {
      return NextResponse.json({ error: 'scenario not found' }, { status: 404 });
    }

    const scenario = rows[0] as MatrixScenario;

    // Merge updates
    const updated: MatrixScenario = {
      ...scenario,
      allocations: body.allocations || scenario.allocations,
      metrics: body.metrics || scenario.metrics,
    };

    // Update in DB
    await sql`
      UPDATE matrix_scenarios
      SET allocations = ${updated.allocations}, metrics = ${updated.metrics}, updated_at = NOW()
      WHERE id = ${id}
    `;
    const shape = scenarioToSheets(updated);
    void mirrorMatrixScenario({
      scenario_id: String(id),
      name: updated.name,
      cycle: updated.cycle,
      functions: updated.function_codes ?? [],
      coes: updated.coe_names ?? [],
      overall_readiness_pct: Number(shape.overall_readiness_pct) || 0,
      total_over_allocations: Number(shape.total_over_allocations) || 0,
    });

    return NextResponse.json({ ok: true, updated });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error('[PATCH /api/matrix/scenarios]', msg);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
