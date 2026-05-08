/**
 * GET /api/tkc/ticker
 *
 * Stock ticker for the dashboard ticker strip.
 *
 * Strategy:
 *   1. If TICKER_FETCH_URL is set, try the live source (Yahoo Finance shape).
 *   2. If that fails (429, network, parse), fall back to env-configured
 *      "last known good" price from TICKER_FALLBACK_PRICE/PREV_CLOSE.
 *   3. If no env config at all, generate a deterministic synthetic price.
 *
 * The label/exchange come from TICKER_LABEL and TICKER_EXCHANGE so the
 * code stays generic (public repo) while the live site shows real
 * branding (TKC.BK · SET).
 *
 * To configure the live deploy:
 *   fly secrets set \
 *     TICKER_FETCH_URL="https://query1.finance.yahoo.com/v8/finance/chart/TKC.BK?interval=1d&range=5d" \
 *     TICKER_LABEL="TKC.BK" \
 *     TICKER_EXCHANGE="SET" \
 *     TICKER_FALLBACK_PRICE="8.50" \
 *     TICKER_FALLBACK_PREV="8.45"
 */

export const dynamic = "force-dynamic";
export const revalidate = 0;
const TICKER_TIMEOUT_MS = 2500;

const HEADERS = {
  "User-Agent":
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Safari/605.1.15",
  Accept: "application/json,text/plain,*/*",
  "Accept-Language": "en-US,en;q=0.9",
  Referer: "https://finance.yahoo.com/",
};

// Module-level cache so consecutive requests within 5 min reuse one fetch
// and we don't hammer Yahoo.
let CACHED_QUOTE: { price: number; prev_close: number; delta_pct: number; fetched_at: number } | null = null;
const CACHE_TTL_MS = 5 * 60 * 1000;

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

function seededRandom(seed: number): number {
  let t = (seed + 0x6d2b79f5) | 0;
  t = Math.imul(t ^ (t >>> 15), t | 1);
  t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
}

function syntheticPrice() {
  const now = new Date();
  const daySeed =
    now.getFullYear() * 10000 + (now.getMonth() + 1) * 100 + now.getDate();
  const basePrice = 8.5;
  const r = seededRandom(daySeed);
  const dailySwing = (r - 0.5) * 1.2;
  const price = Math.round((basePrice + dailySwing) * 100) / 100;
  const prevR = seededRandom(daySeed - 1);
  const prevClose = Math.round((basePrice + (prevR - 0.5) * 1.2) * 100) / 100;
  const delta_pct = Math.round(((price - prevClose) / prevClose) * 10000) / 100;
  return { price, prev_close: prevClose, delta_pct };
}

async function tryLiveFetch(url: string): Promise<{ price: number; prev_close: number; delta_pct: number } | null> {
  try {
    const res = await fetch(url, {
      headers: HEADERS,
      signal: AbortSignal.timeout(TICKER_TIMEOUT_MS),
    });
    if (!res.ok) return null;
    const data = (await res.json()) as YahooChartResponse;
    const meta = data.chart?.result?.[0]?.meta;
    if (!meta?.regularMarketPrice) return null;
    const price = meta.regularMarketPrice;
    const prevClose = meta.chartPreviousClose ?? price;
    const delta_pct =
      meta.regularMarketChangePercent ??
      ((price - prevClose) / prevClose) * 100;
    return { price, prev_close: prevClose, delta_pct };
  } catch {
    return null;
  }
}

export async function GET() {
  const TICKER_FETCH_URL = process.env.TICKER_FETCH_URL ?? "";
  const TICKER_LABEL = process.env.TICKER_LABEL ?? "ORG";
  const TICKER_EXCHANGE = process.env.TICKER_EXCHANGE ?? "DEMO";
  const FALLBACK_PRICE = Number(process.env.TICKER_FALLBACK_PRICE ?? "");
  const FALLBACK_PREV = Number(process.env.TICKER_FALLBACK_PREV ?? "");

  const now = new Date();
  const nowMs = now.getTime();

  // 1. Try live fetch if configured AND cache is stale
  if (TICKER_FETCH_URL) {
    if (CACHED_QUOTE && nowMs - CACHED_QUOTE.fetched_at < CACHE_TTL_MS) {
      return Response.json({
        ok: true,
        live: true,
        cached: true,
        ticker: TICKER_LABEL,
        exchange: TICKER_EXCHANGE,
        price: CACHED_QUOTE.price,
        prev_close: CACHED_QUOTE.prev_close,
        delta_pct: CACHED_QUOTE.delta_pct,
        currency: "THB",
        fetched_at: new Date(CACHED_QUOTE.fetched_at).toISOString(),
      });
    }

    const live = await tryLiveFetch(TICKER_FETCH_URL);
    if (live) {
      CACHED_QUOTE = { ...live, fetched_at: nowMs };
      return Response.json({
        ok: true,
        live: true,
        cached: false,
        ticker: TICKER_LABEL,
        exchange: TICKER_EXCHANGE,
        ...live,
        currency: "THB",
        fetched_at: now.toISOString(),
      });
    }

    // Live fetch failed — try last cached if we have anything
    if (CACHED_QUOTE) {
      return Response.json({
        ok: true,
        live: false,
        cached: true,
        stale: true,
        ticker: TICKER_LABEL,
        exchange: TICKER_EXCHANGE,
        price: CACHED_QUOTE.price,
        prev_close: CACHED_QUOTE.prev_close,
        delta_pct: CACHED_QUOTE.delta_pct,
        currency: "THB",
        fetched_at: new Date(CACHED_QUOTE.fetched_at).toISOString(),
      });
    }
  }

  // 2. Env-configured fallback (real but stale price)
  if (Number.isFinite(FALLBACK_PRICE) && FALLBACK_PRICE > 0) {
    const prev = Number.isFinite(FALLBACK_PREV) && FALLBACK_PREV > 0 ? FALLBACK_PREV : FALLBACK_PRICE;
    const delta_pct = Math.round(((FALLBACK_PRICE - prev) / prev) * 10000) / 100;
    return Response.json({
      ok: true,
      live: false,
      cached: false,
      stale: true,
      source: "env_fallback",
      ticker: TICKER_LABEL,
      exchange: TICKER_EXCHANGE,
      price: FALLBACK_PRICE,
      prev_close: prev,
      delta_pct,
      currency: "THB",
      fetched_at: now.toISOString(),
    });
  }

  // 3. Last resort — deterministic synthetic
  const syn = syntheticPrice();
  return Response.json({
    ok: true,
    live: false,
    source: "synthetic",
    ticker: TICKER_LABEL,
    exchange: TICKER_EXCHANGE,
    price: syn.price,
    prev_close: syn.prev_close,
    delta_pct: syn.delta_pct,
    currency: "THB",
    fetched_at: now.toISOString(),
  });
}
