-- v4.3 — Criteria baselines, locks, and audit trail.
--
-- The game needs differentiated numbers, but the numbers must not be
-- casual. Every generated or manual change is recorded in
-- game_adjustment_log; locks prevent accidental re-rolls.

ALTER TABLE employee_attributes
  ADD COLUMN IF NOT EXISTS stat_locked BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS stat_lock_reason TEXT,
  ADD COLUMN IF NOT EXISTS stat_seed INTEGER,
  ADD COLUMN IF NOT EXISTS stat_source TEXT DEFAULT 'neutral_seed',
  ADD COLUMN IF NOT EXISTS stat_criteria JSONB DEFAULT '{}'::jsonb;

ALTER TABLE projects
  ADD COLUMN IF NOT EXISTS complexity_score INTEGER DEFAULT 50 CHECK (complexity_score >= 0 AND complexity_score <= 100),
  ADD COLUMN IF NOT EXISTS urgency_score INTEGER DEFAULT 50 CHECK (urgency_score >= 0 AND urgency_score <= 100),
  ADD COLUMN IF NOT EXISTS strategic_value_score INTEGER DEFAULT 50 CHECK (strategic_value_score >= 0 AND strategic_value_score <= 100),
  ADD COLUMN IF NOT EXISTS delivery_risk_score INTEGER DEFAULT 50 CHECK (delivery_risk_score >= 0 AND delivery_risk_score <= 100),
  ADD COLUMN IF NOT EXISTS ai_leverage_score INTEGER DEFAULT 50 CHECK (ai_leverage_score >= 0 AND ai_leverage_score <= 100),
  ADD COLUMN IF NOT EXISTS config_locked BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS config_lock_reason TEXT,
  ADD COLUMN IF NOT EXISTS config_seed INTEGER,
  ADD COLUMN IF NOT EXISTS config_source TEXT DEFAULT 'neutral_seed',
  ADD COLUMN IF NOT EXISTS config_criteria JSONB DEFAULT '{}'::jsonb;

CREATE TABLE IF NOT EXISTS game_adjustment_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  target_type TEXT NOT NULL CHECK (target_type IN ('employee','project')),
  target_id UUID NOT NULL,
  action TEXT NOT NULL CHECK (action IN ('seed','adjust','lock','unlock','ai_adjust')),
  source TEXT NOT NULL CHECK (source IN ('seed','manual','ai','system')),
  field TEXT NOT NULL,
  before_value JSONB,
  after_value JSONB,
  criteria_snapshot JSONB DEFAULT '{}'::jsonb,
  reason TEXT NOT NULL,
  actor_id UUID REFERENCES employees(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_game_adjustment_target
  ON game_adjustment_log (target_type, target_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_game_adjustment_created
  ON game_adjustment_log (created_at DESC);

INSERT INTO _migrations (name) VALUES ('025_adjustment_audit_and_locks')
ON CONFLICT (name) DO NOTHING;
