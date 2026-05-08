/**
 * GET /api/tkc/financials
 *
 * Quarterly company snapshot for the dashboard ticker and the Cockpit
 * tiles. Reads from env so the live deploy can show real numbers from
 * the latest 56-1 filing while the public repo stays generic.
 *
 * Configure via fly secrets (numbers are public — straight from
 * the company's 56-1 / IR website):
 *   fly secrets set \
 *     TKC_REVENUE_9M_M="2315" \
 *     TKC_NET_PROFIT_9M_M="170.6" \
 *     TKC_EPS_THB="0.43" \
 *     TKC_MARKET_CAP_B="2.98" \
 *     TKC_PE_RATIO="17.35" \
 *     TKC_DIVIDEND_THB="0.20" \
 *     TKC_DIVIDEND_YIELD="2.68" \
 *     TKC_AS_OF="9M 2025"
 *
 * If unset, the route returns synthetic placeholders (for the public repo).
 */

export const dynamic = "force-dynamic";
export const revalidate = 0;

function num(envVar: string | undefined, fallback: number): number {
  if (envVar == null) return fallback;
  const v = Number(envVar);
  return Number.isFinite(v) ? v : fallback;
}

export async function GET() {
  return Response.json({
    revenue_9m_m: num(process.env.TKC_REVENUE_9M_M, 1340),
    net_profit_9m_m: num(process.env.TKC_NET_PROFIT_9M_M, 98),
    eps_thb: num(process.env.TKC_EPS_THB, 0.38),
    market_cap_b: num(process.env.TKC_MARKET_CAP_B, 2.8),
    pe_ratio: num(process.env.TKC_PE_RATIO, 15.2),
    dividend_thb: num(process.env.TKC_DIVIDEND_THB, 0.18),
    dividend_yield_pct: num(process.env.TKC_DIVIDEND_YIELD, 2.1),
    as_of: process.env.TKC_AS_OF ?? "Representative",
    ticker: process.env.TICKER_LABEL ?? "ORG",
    exchange: process.env.TICKER_EXCHANGE ?? "DEMO",
    currency: "THB",
    live: Boolean(process.env.TKC_REVENUE_9M_M),
  });
}
