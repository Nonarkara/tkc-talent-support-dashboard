/**
 * GET /api/tkc/ticker
 *
 * Returns a synthetic stock ticker for the dashboard display.
 * Generates deterministic daily variation based on date seed.
 *
 * Returns:
 *   { ok: true, price: number, delta_pct: number, prev_close: number, fetched_at: string }
 */

export const revalidate = 300; // 5-minute ISR cache

/** Simple seeded PRNG for deterministic daily variation */
function seededRandom(seed: number): number {
  let t = (seed + 0x6d2b79f5) | 0;
  t = Math.imul(t ^ (t >>> 15), t | 1);
  t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
}

export async function GET() {
  // Generate a deterministic but varying price based on today's date
  const now = new Date();
  const daySeed =
    now.getFullYear() * 10000 +
    (now.getMonth() + 1) * 100 +
    now.getDate();

  const basePrice = 8.5;
  const r = seededRandom(daySeed);
  const dailySwing = (r - 0.5) * 1.2; // ±0.60 THB max swing
  const price = Math.round((basePrice + dailySwing) * 100) / 100;

  const prevR = seededRandom(daySeed - 1);
  const prevSwing = (prevR - 0.5) * 1.2;
  const prevClose = Math.round((basePrice + prevSwing) * 100) / 100;

  const delta_pct =
    Math.round(((price - prevClose) / prevClose) * 10000) / 100;

  return Response.json({
    ok: true,
    price,
    delta_pct,
    prev_close: prevClose,
    currency: "THB",
    exchange: "DEMO",
    fetched_at: now.toISOString(),
  });
}
