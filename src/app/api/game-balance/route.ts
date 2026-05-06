/**
 * /api/game-balance
 *
 * GET   — return current balance values + defaults (so the UI can show
 *         which keys diverge from baseline).
 * PUT   — update one or more keys. Body: { updates: { key: number, ... } }.
 * POST  — body { reset: true } resets all keys to defaults.
 *
 * Auth: protected by site middleware. Edits are persisted to
 * `game_balance` table; the engine's `getGameBalance()` picks them up
 * on the next read.
 */

import { NextResponse } from "next/server";
import {
  GAME_BALANCE_DEFAULTS,
  getGameBalance,
  resetGameBalance,
  setGameBalance,
} from "@/lib/game-balance";
import { invalidateBalanceCache } from "@/lib/balance-cache";
import { logApiError } from "@/lib/api";

export async function GET() {
  const current = await getGameBalance();
  return NextResponse.json({
    ok: true,
    current,
    defaults: GAME_BALANCE_DEFAULTS,
  });
}

export async function PUT(request: Request) {
  try {
    const body = (await request.json()) as { updates?: Record<string, unknown> };
    if (!body.updates || typeof body.updates !== "object") {
      return NextResponse.json({ ok: false, error: "Missing updates object" }, { status: 400 });
    }
    const sanitized: Record<string, number> = {};
    for (const [k, v] of Object.entries(body.updates)) {
      const n = Number(v);
      if (Number.isFinite(n)) sanitized[k] = n;
    }
    const changed = await setGameBalance(sanitized);
    invalidateBalanceCache(); // engine picks up the new values immediately
    const current = await getGameBalance();
    return NextResponse.json({ ok: true, changed, current });
  } catch (err) {
    logApiError("api/game-balance PUT", err);
    return NextResponse.json(
      { ok: false, error: err instanceof Error ? err.message : "Update failed" },
      { status: 500 },
    );
  }
}

export async function POST(request: Request) {
  try {
    const body = (await request.json().catch(() => ({}))) as { reset?: boolean };
    if (!body.reset) {
      return NextResponse.json({ ok: false, error: "Specify { reset: true } to reset to defaults" }, { status: 400 });
    }
    const changed = await resetGameBalance();
    invalidateBalanceCache();
    const current = await getGameBalance();
    return NextResponse.json({ ok: true, reset: changed, current });
  } catch (err) {
    logApiError("api/game-balance POST", err);
    return NextResponse.json(
      { ok: false, error: err instanceof Error ? err.message : "Reset failed" },
      { status: 500 },
    );
  }
}
