-- OKRs per employee per cycle
-- key_results shape: [{ text, target, current, unit }]

CREATE TABLE IF NOT EXISTS okrs (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id   uuid NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
  cycle         text NOT NULL,                    -- '2026-Q2'
  objective     text NOT NULL,
  key_results   jsonb NOT NULL DEFAULT '[]'::jsonb,
  status        text NOT NULL DEFAULT 'active',   -- active / done / dropped
  sort_order    int  NOT NULL DEFAULT 0,
  created_at    timestamptz NOT NULL DEFAULT now(),
  updated_at    timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_okrs_emp_cycle ON okrs (employee_id, cycle);
