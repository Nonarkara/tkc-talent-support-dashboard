/**
 * Company Intelligence — Representative placeholder data
 *
 * All financial figures are fictional and for demonstration purposes only.
 * They illustrate the dashboard's analytical capabilities without
 * revealing any real company data.
 */

export interface TKCFinancialPoint {
  period: string;
  revenueM: number;
  grossProfitM: number;
  netProfitM: number;
  grossMarginPct: number;
  operatingCashflowM: number;
  netDebtM: number;
}

export interface TKCQuarterPoint {
  period: string;
  revenueM: number;
  grossMarginPct?: number;
  note?: string;
}

export interface TKCCompanyMetric {
  label: string;
  value: string;
  tone: string;
  note: string;
}

export interface TKCSignalCard {
  id: string;
  title: string;
  body: string;
  tone: "gold" | "green" | "red" | "blue";
}

export interface TKCNewsPulseItem {
  id: string;
  date: string;
  title: string;
  vibe: string;
  source: string;
}

export interface TKCBlindSpot {
  id: string;
  title: string;
  body: string;
}

export const TKC_FINANCIAL_SERIES: TKCFinancialPoint[] = [
  {
    period: "FY2024",
    revenueM: 1850.0,
    grossProfitM: 310.0,
    netProfitM: 165.0,
    grossMarginPct: 16.76,
    operatingCashflowM: -35.0,
    netDebtM: 380.0,
  },
  {
    period: "FY2025",
    revenueM: 1780.0,
    grossProfitM: 195.0,
    netProfitM: 135.0,
    grossMarginPct: 10.96,
    operatingCashflowM: -72.0,
    netDebtM: 1120.0,
  },
];

export const TKC_QUARTERLY_REVENUE_2025: TKCQuarterPoint[] = [
  { period: "Q1'25", revenueM: 445, note: "Estimated" },
  { period: "Q2'25", revenueM: 460, note: "Estimated" },
  { period: "Q3'25", revenueM: 438, grossMarginPct: 12.5, note: "Filed" },
  { period: "Q4'25", revenueM: 437, note: "Estimated" },
];

export const TKC_COMPANY_METRICS: TKCCompanyMetric[] = [
  {
    label: "Latest Filed Earnings",
    value: "FY2025 audited",
    tone: "#F3C567",
    note: "Net profit reduced, core ops carried by associate profit.",
  },
  {
    label: "Revenue Base",
    value: "THB 1.78B",
    tone: "#86D1FF",
    note: "Revenue fell ~4% year-on-year while costs still rose.",
  },
  {
    label: "Gross Margin",
    value: "10.96%",
    tone: "#F87171",
    note: "Down from 16.76% prior year, below the internal threshold.",
  },
  {
    label: "Net Debt",
    value: "THB 1.12B",
    tone: "#FB923C",
    note: "Net debt expanded significantly year-on-year.",
  },
];

export const TKC_DERIVED_SIGNALS: TKCSignalCard[] = [
  {
    id: "associate-crutch",
    title: "Core Engine Barely Breaks Even",
    body: "Profit was largely saved by share of associate profit. Strip that out and the operating machine looks nearly flat. The redesign problem is not 'growth' first. It is margin discipline and deployment accuracy.",
    tone: "red",
  },
  {
    id: "debt-finance",
    title: "Debt Bought Time, Not Proof",
    body: "Cash fell while net debt climbed past THB 1B. The company is financing optionality, IP bets, and working-capital stretch. That means the org has less room for talent waste and soft bureaucracy.",
    tone: "gold",
  },
  {
    id: "digital-pivot",
    title: "Digital Intent Is Real, Monetization Is Not Finished",
    body: "Intangible assets grew and AI / cyber / digital product language is everywhere, but the filings still show a company whose economics are shaped by project delivery and associate holdings. The people system has to help convert aspiration into margin, not just slogans.",
    tone: "blue",
  },
  {
    id: "execution-bottleneck",
    title: "Procurement + Digital Services Are the Real Fuse",
    body: "High turnover in procurement and digital services means the company can win strategy on paper and still lose the delivery war in the hallway. Those are not HR stats. They are execution risk.",
    tone: "red",
  },
];

export const TKC_KPI_FLASHPOINTS: TKCSignalCard[] = [
  {
    id: "procurement",
    title: "Procurement High Turnover",
    body: "This is not churn. It's organ failure. Any project mix that depends on vendor orchestration is structurally brittle until procurement is stabilized or bypassed.",
    tone: "red",
  },
  {
    id: "digital-services",
    title: "Digital Services Elevated Turnover",
    body: "The biggest revenue target sits on the hottest talent fire. If the company wants a higher-margin digital future, this is the room that cannot keep bleeding.",
    tone: "gold",
  },
  {
    id: "checkins",
    title: "No Department Hits 90% Check-In",
    body: "The compliance KPI is fantasy-land right now. That usually means either the ritual is wrong, the tooling is annoying, or leaders themselves do not model the behavior.",
    tone: "blue",
  },
];

export const TKC_NEWS_PULSE: TKCNewsPulseItem[] = [
  {
    id: "agm-2026",
    date: "2026-03-20",
    title: "Annual general meeting invitation published",
    vibe: "Governance routine is live. Market-facing communication is active, but this is maintenance, not a growth catalyst.",
    source: "Company announcement",
  },
  {
    id: "investment-result",
    date: "2025-07-23",
    title: "Strategic investment result submitted",
    vibe: "The company is leaning into associate exposure. Strategic optionality increases, but it also reinforces how much the group story depends on holdings outside the core delivery engine.",
    source: "Company announcement",
  },
  {
    id: "strategic-offer",
    date: "2025-05-28",
    title: "Significant strategic acquisition offer",
    vibe: "This was a serious capital move, not PR fluff. Read it as a signal that management was willing to place balance-sheet weight behind ecosystem control.",
    source: "Company announcement",
  },
];

export const TKC_BLIND_SPOTS: TKCBlindSpot[] = [
  {
    id: "segment-margin",
    title: "Segment Margin Truth Is Still Missing",
    body: "We know revenue mix, but not margin by project archetype. Without that, leaders can still hide weak work behind total revenue and associate profit.",
  },
  {
    id: "succession",
    title: "Admin Succession Depth Is Foggy",
    body: "The Admin-side DMD role is effectively vacant in the current narrative. The system should track bench depth, not just org chart boxes.",
  },
  {
    id: "recurring-revenue",
    title: "Recurring Revenue Monitor Is Not Visible",
    body: "Internal discussion says the company wants less dependence on one-off government projects, but there is no visible scoreboard yet for recurring revenue progress.",
  },
];

export function getToneColor(tone: TKCSignalCard["tone"]) {
  if (tone === "green") return "#86CD7E";
  if (tone === "red") return "#F87171";
  if (tone === "blue") return "#86D1FF";
  return "#F3C567";
}
