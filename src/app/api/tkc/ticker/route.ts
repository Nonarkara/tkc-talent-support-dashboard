/**
 * GET /api/tkc/ticker
 *
 * Returns a stock ticker for the dashboard ticker strip.
 *
 * If env vars TICKER_FETCH_URL and TICKER_LABEL are set, fetches the
 * live quote (Yahoo Finance shape). Otherwise returns a deterministic
 * synthetic price seeded by today's date — useful for the public repo
 * and for offline development.
 *
 * To turn on the live ticker on a deployed instance:
 *   fly secrets set \
 *     TICKER_FETCH_URL="https://query1.finance.yahoo.com/v8/finance/chart/TKC.BK?interval=1d&range=5d" \
 *     TICKER_LABEL="TKC.BK"
 *
 * The code never hardcodes a ticker symbol — public repo stays generic.
 */

// Disable ISR caching — env vars must be read at request time so the
// secrets-set workflow doesn't require a code change to take effect.
export const dynamic = "force-dynamic";
export const revalidate = 0;
const TICKER_TIMEOUT_MS = 2500;

const HEADERS = {
  "User-Agent":
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
  Accept: "application/json",
  "Accept-Language": "en-US,en;q=0.9",
};

interface YahooChartResponse {
  chart?: {
    result?: Array<{
      meta?: {
        regularMarketPrice?: number;
        chartPreviousClose?: number;
        regularMarketChangePercent?: number;
        currency?: string;
        exchangeName?: string;
      };
    }>;
    error?: { code: string; description: string } | null;
  };
}

/** Deterministic synthetic price seeded from today's date. */
function seededRandom(seed: number): number {
  let t = (seed + 0x6d2b79f5) | 0;
  t = Math.imul(t ^ (t >>> 15), t | 1);
  t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
}

function syntheticTicker(label: string, exchange: string) {
  const now = new Date();
  const daySeed =
    now.getFullYear() * 10000 + (now.getMonth() + 1) * 100 + now.getDate();
  const basePrice = 8.5;
  const r = seededRandom(daySeed);
  const dailySwing = (r - 0.5) * 1.2;
  const price = Math.round((basePrice + dailySwing) * 100) / 100;

  const prevR = seededRandom(daySeed - 1);
  const prevSwing = (prevR - 0.5) * 1.2;
  const prevClose = Math.round((basePrice + prevSwing) * 100) / 100;

  const delta_pct =
    Math.round(((price - prevClose) / prevClose) * 10000) / 100;

  return Response.json({
    ok: true,
    live: false,
    ticker: label,
    exchange,
    price,
    delta_pct,
    prev_close: prevClose,
    currency: "THB",
    fetched_at: now.toISOString(),
  });
}

export async function GET() {
  // Read env at request time, not at module load — so `fly secrets set`
  // takes effect immediately without a code change.
  const TICKER_FETCH_URL = process.env.TICKER_FETCH_URL ?? "";
  const TICKER_LABEL = process.env.TICKER_LABEL ?? "ORG";
  const TICKER_EXCHANGE = process.env.TICKER_EXCHANGE ?? "DEMO";

  // No live source configured → fall back to synthetic
  if (!TICKER_FETCH_URL) {
    return syntheticTicker(TICKER_LABEL, TICKER_EXCHANGE);
  }

  try {
    const res = await fetch(TICKER_FETCH_URL, {
      headers: HEADERS,
      signal: AbortSignal.timeout(TICKER_TIMEOUT_MS),
    });

    if (!res.ok) {
      return Response.json({
        ok: false,
        live: false,
        error: `Source returned ${res.status}`,
        ticker: TICKER_LABEL,
      });
    }

    const data = (await res.json()) as YahooChartResponse;
    const meta = data.chart?.result?.[0]?.meta;

    if (!meta?.regularMarketPrice) {
      return Response.json({
        ok: false,
        live: false,
        error: "No price data returned",
        ticker: TICKER_LABEL,
      });
    }

    const price = meta.regularMarketPrice;
    const prevClose = meta.chartPreviousClose ?? price;
    const delta_pct =
      meta.regularMarketChangePercent ??
      ((price - prevClose) / prevClose) * 100;

    return Response.json({
      ok: true,
      live: true,
      ticker: TICKER_LABEL,
      exchange: meta.exchangeName ?? TICKER_EXCHANGE,
      price,
      delta_pct,
      prev_close: prevClose,
      currency: meta.currency ?? "THB",
      fetched_at: new Date().toISOString(),
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return Response.json({
      ok: false,
      live: false,
      error: msg,
      ticker: TICKER_LABEL,
    });
  }
}
