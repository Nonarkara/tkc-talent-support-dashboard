-- 015_matrix_scenarios.sql
-- Schema for matrix PoC scenarios.
--
-- Stores multiple staffing scenarios (e.g. "Model-heavy", "Service-heavy", "Balanced")
-- so Dr Non can test whether different TOM allocations are viable given the talent pool.
--
-- Each scenario records:
-- - Which functions + CoEs are active
-- - How many people allocated to each cell
-- - Computed readiness/utilization metrics
-- - Timestamp for audit trail
--
-- This table is the primary artifact. Sheets mirrors each save as scenario history.

BEGIN;

CREATE TABLE IF NOT EXISTS matrix_scenarios (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Metadata
  name TEXT NOT NULL,                           -- "Scenario A: Model-heavy"
  description TEXT,                            -- Free-form notes
  cycle TEXT DEFAULT '2026-Q2',                -- Which business cycle

  -- Structure definition
  function_codes TEXT[] NOT NULL,              -- ['SALES','ENTERPRISE','FINANCE','HR_ADMIN']
  coe_names TEXT[] NOT NULL,                   -- ['Solution Design','Model Dev','Project Support','AI Innovation']

  -- The staffing model: { employee_id → { coe_name → allocation_pct }, ... }
  -- Example: { "emp_123" → { "Solution Design" → 60, "Model Dev" → 40 }, ... }
  allocations JSONB NOT NULL DEFAULT '{}',

  -- Computed metrics (cached at save time)
  -- { readiness: {coe_name → %}, utilization: {function → %}, gaps: [skill, ...], ... }
  metrics JSONB,

  -- Audit
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
  draft_by_user_id TEXT,                       -- TBD: auth layer (optional for Phase 2)

  -- Indexing
  UNIQUE(name, cycle)
);

CREATE INDEX idx_matrix_scenarios_cycle ON matrix_scenarios(cycle);
CREATE INDEX idx_matrix_scenarios_created ON matrix_scenarios(created_at DESC);

-- Record the migration
INSERT INTO _migrations (name) VALUES ('015_matrix_scenarios')
ON CONFLICT (name) DO NOTHING;

COMMIT;
