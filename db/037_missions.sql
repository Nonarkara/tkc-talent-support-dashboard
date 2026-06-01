-- Migration 037: missions table
-- Team prototype tracker for the one-month sprint (deadline: 2026-06-27).
-- Each TKC team commits to one working prototype by that date.
-- Non provides API credits + coaching.
-- A mission without demo_url is DRAFT regardless of stated status.

CREATE TABLE IF NOT EXISTS missions (
  id               SERIAL PRIMARY KEY,
  team_name        VARCHAR(255) NOT NULL,
  department       VARCHAR(100),
  brief            TEXT,                          -- one-sentence description of what they're building
  owner_name       VARCHAR(255),                  -- primary contact / squad lead name
  owner_employee_id UUID REFERENCES employees(id) ON DELETE SET NULL,
  deadline         DATE NOT NULL DEFAULT '2026-06-27',
  demo_url         TEXT,                          -- REQUIRED for non-DRAFT status (enforced in API, not DB)
  tech_stack       TEXT,                          -- free text, e.g. "Next.js, Supabase, Claude API"
  status           VARCHAR(20) NOT NULL DEFAULT 'DRAFT'
                     CHECK (status IN ('DRAFT', 'BUILDING', 'DEMO_READY', 'DEPLOYED')),
  notes            TEXT,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Trigger to auto-update updated_at on any row change
CREATE OR REPLACE FUNCTION update_missions_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE TRIGGER missions_updated_at
  BEFORE UPDATE ON missions
  FOR EACH ROW
  EXECUTE FUNCTION update_missions_updated_at();

-- Index for status filtering (common in the board view)
CREATE INDEX IF NOT EXISTS idx_missions_status ON missions(status);
CREATE INDEX IF NOT EXISTS idx_missions_deadline ON missions(deadline);
