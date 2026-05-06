-- Department KPIs (from TKC_Department_KPIs_2025.csv)
-- Each row is one KPI for one department for one cycle (e.g. FY2025, 2026-Q2)

CREATE TABLE IF NOT EXISTS department_kpis (
  id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  dept_code      text        NOT NULL,
  cycle          text        NOT NULL,        -- "FY2025", "2026-Q2", etc.
  kpi_name_en    text        NOT NULL,
  kpi_name_th    text,
  weight_pct     numeric(5,2) NOT NULL DEFAULT 0,
  target_value   numeric(12,2),
  target_unit    text,                        -- "Mb.", "%", "days", etc.
  actual_value   numeric(12,2),
  status         text        NOT NULL DEFAULT 'pending',  -- pending / on_track / at_risk / off_track / done
  notes          text        DEFAULT '',
  created_at     timestamptz NOT NULL DEFAULT now(),
  updated_at     timestamptz NOT NULL DEFAULT now(),
  UNIQUE (dept_code, cycle, kpi_name_en)
);

CREATE INDEX IF NOT EXISTS idx_dept_kpis_dept_cycle ON department_kpis (dept_code, cycle);
