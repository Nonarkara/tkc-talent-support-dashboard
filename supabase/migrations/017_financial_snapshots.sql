-- ============================================================
-- Migration 017: Financial Snapshots
-- Quarterly financial data feeds the Market panel.
-- Everyone in the company should understand the conditions.
-- ============================================================

CREATE TABLE IF NOT EXISTS financial_snapshots (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  period                TEXT NOT NULL UNIQUE, -- 'Q1_2025', 'Q2_2025', 'FY2025', etc.
  period_type           TEXT CHECK (period_type IN ('quarterly', 'annual')) NOT NULL,
  fiscal_year           INTEGER NOT NULL,

  -- Income Statement
  revenue_thb           NUMERIC,
  cost_of_sales_thb     NUMERIC,
  gross_profit_thb      NUMERIC,
  gross_margin_pct      NUMERIC,
  operating_expenses_thb NUMERIC,
  net_profit_thb        NUMERIC,
  net_margin_pct        NUMERIC,
  eps_thb               NUMERIC,

  -- Revenue breakdown
  revenue_project_thb   NUMERIC,
  revenue_services_thb  NUMERIC,
  revenue_sales_thb     NUMERIC,
  revenue_other_thb     NUMERIC,

  -- Balance Sheet
  total_assets_thb      NUMERIC,
  total_liabilities_thb NUMERIC,
  total_equity_thb      NUMERIC,
  cash_thb              NUMERIC,
  total_debt_thb        NUMERIC,

  -- Cash Flow
  operating_cf_thb      NUMERIC,
  investing_cf_thb      NUMERIC,
  financing_cf_thb      NUMERIC,

  -- Market
  stock_price_thb       NUMERIC,
  pe_ratio              NUMERIC,
  pb_ratio              NUMERIC,
  market_cap_thb        NUMERIC,
  dividend_yield_pct    NUMERIC,

  -- Key Ratios
  roe_pct               NUMERIC,
  roa_pct               NUMERIC,
  debt_to_equity        NUMERIC,
  current_ratio         NUMERIC,

  -- People metrics (if available)
  employee_count        INTEGER,
  revenue_per_employee  NUMERIC,
  employee_cost_thb     NUMERIC,

  -- Notes
  notes                 TEXT,
  source                TEXT DEFAULT 'company filing',
  created_at            TIMESTAMPTZ DEFAULT now()
);

-- Seed with representative placeholder data
INSERT INTO financial_snapshots (period, period_type, fiscal_year,
  revenue_thb, gross_profit_thb, gross_margin_pct, net_profit_thb, net_margin_pct, eps_thb,
  total_assets_thb, cash_thb, total_debt_thb,
  operating_cf_thb,
  stock_price_thb, pe_ratio, pb_ratio, market_cap_thb, dividend_yield_pct,
  employee_cost_thb,
  notes
) VALUES
-- FY2025 (representative)
('FY2025', 'annual', 2025,
  1780000000, 195000000, 10.96, 135000000, 7.58, 0.38,
  4800000000, 110000000, 1230000000,
  -72000000,
  8.50, 15.20, 0.68, 2800000000, 2.10,
  85000000,
  'Revenue declined YoY. Gross margin under pressure. Associate profit masks weak core ops. Debt expanded significantly.'
),
-- FY2024 (representative)
('FY2024', 'annual', 2024,
  1850000000, 310000000, 16.76, 165000000, 8.92, 0.46,
  4200000000, 240000000, 580000000,
  NULL,
  8.80, NULL, NULL, NULL, NULL,
  68000000,
  'Stable year. Services revenue dominant.'
),
-- Q3 2025 (representative quarterly)
('Q3_2025', 'quarterly', 2025,
  438000000, 54750000, 12.50, 42000000, 9.59, NULL,
  NULL, NULL, NULL,
  NULL,
  8.50, 15.20, 0.68, 2800000000, 2.10,
  NULL,
  'Revenue growth QoQ from short-term project delivery. Margin pressure from cost escalation.'
)
ON CONFLICT (period) DO NOTHING;

-- Index
CREATE INDEX IF NOT EXISTS idx_financial_period ON financial_snapshots(fiscal_year, period_type);

-- RLS — everyone can see financials (public company data)
ALTER TABLE financial_snapshots ENABLE ROW LEVEL SECURITY;
CREATE POLICY "All authenticated can view financials" ON financial_snapshots
  FOR SELECT USING (auth.uid() IS NOT NULL);
CREATE POLICY "Admins can manage financials" ON financial_snapshots
  FOR ALL USING (get_user_role() = 'admin');
