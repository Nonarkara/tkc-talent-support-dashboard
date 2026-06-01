-- 032_four_c.sql
--
-- Four C Framework + Credo persistence
-- Community · Career · Cause (Purpose) · Compensation
--
-- This migration creates the tables that let employees self-report their
-- Four C scores and managers record Credo pulse readings. It also links
-- support_actions to the Four C pillars so interventions can be tracked
-- against pillar improvements.

-- ── Four Pillar Responses ─────────────────────────────────────────────
-- Self-reported or manager-reported scores per employee per cycle.
-- When present, these override the heuristic scores in computeHouseScore().
CREATE TABLE IF NOT EXISTS four_pillar_responses (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id       UUID NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
  cycle             TEXT NOT NULL DEFAULT '2026-Q2',
  compensation      INTEGER CHECK (compensation BETWEEN 0 AND 100),
  purpose           INTEGER CHECK (purpose BETWEEN 0 AND 100),
  career            INTEGER CHECK (career BETWEEN 0 AND 100),
  community         INTEGER CHECK (community BETWEEN 0 AND 100),
  source            TEXT DEFAULT 'self_report',  -- 'self_report' | 'manager' | 'system' | 'ai_derived'
  created_at        TIMESTAMPTZ DEFAULT now(),
  updated_at        TIMESTAMPTZ DEFAULT now(),

  UNIQUE (employee_id, cycle)
);

-- If an earlier/manual draft table exists, CREATE TABLE IF NOT EXISTS will
-- not add missing columns. Keep this migration safely additive.
ALTER TABLE four_pillar_responses
  ADD COLUMN IF NOT EXISTS cycle TEXT NOT NULL DEFAULT '2026-Q2',
  ADD COLUMN IF NOT EXISTS compensation INTEGER CHECK (compensation BETWEEN 0 AND 100),
  ADD COLUMN IF NOT EXISTS purpose INTEGER CHECK (purpose BETWEEN 0 AND 100),
  ADD COLUMN IF NOT EXISTS career INTEGER CHECK (career BETWEEN 0 AND 100),
  ADD COLUMN IF NOT EXISTS community INTEGER CHECK (community BETWEEN 0 AND 100),
  ADD COLUMN IF NOT EXISTS source TEXT DEFAULT 'self_report',
  ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT now(),
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT now();

CREATE UNIQUE INDEX IF NOT EXISTS idx_fpr_employee_cycle_unique
  ON four_pillar_responses(employee_id, cycle);
CREATE INDEX IF NOT EXISTS idx_fpr_employee ON four_pillar_responses(employee_id);
CREATE INDEX IF NOT EXISTS idx_fpr_cycle     ON four_pillar_responses(cycle);
CREATE INDEX IF NOT EXISTS idx_fpr_source    ON four_pillar_responses(source);

-- ── Credo Scores ──────────────────────────────────────────────────────
-- Persisted Credo readings: Belonging · Purpose · Transcendence · Story
-- Originally computed from RPG attributes + pulse overrides in credo.ts.
-- Persistence lets us trend them and blend with Four Pillar data.
CREATE TABLE IF NOT EXISTS credo_scores (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id       UUID NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
  cycle             TEXT NOT NULL DEFAULT '2026-Q2',
  belonging         INTEGER CHECK (belonging BETWEEN 0 AND 100),
  purpose           INTEGER CHECK (purpose BETWEEN 0 AND 100),
  transcendence     INTEGER CHECK (transcendence BETWEEN 0 AND 100),
  story             INTEGER CHECK (story BETWEEN 0 AND 100),
  pulse_source      TEXT DEFAULT 'derived',  -- 'survey' | 'derived' | 'blended' | 'manager'
  created_at        TIMESTAMPTZ DEFAULT now(),
  updated_at        TIMESTAMPTZ DEFAULT now(),

  UNIQUE (employee_id, cycle)
);

ALTER TABLE credo_scores
  ADD COLUMN IF NOT EXISTS cycle TEXT NOT NULL DEFAULT '2026-Q2',
  ADD COLUMN IF NOT EXISTS belonging INTEGER CHECK (belonging BETWEEN 0 AND 100),
  ADD COLUMN IF NOT EXISTS purpose INTEGER CHECK (purpose BETWEEN 0 AND 100),
  ADD COLUMN IF NOT EXISTS transcendence INTEGER CHECK (transcendence BETWEEN 0 AND 100),
  ADD COLUMN IF NOT EXISTS story INTEGER CHECK (story BETWEEN 0 AND 100),
  ADD COLUMN IF NOT EXISTS pulse_source TEXT DEFAULT 'derived',
  ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT now(),
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT now();

CREATE UNIQUE INDEX IF NOT EXISTS idx_cs_employee_cycle_unique
  ON credo_scores(employee_id, cycle);
CREATE INDEX IF NOT EXISTS idx_cs_employee ON credo_scores(employee_id);
CREATE INDEX IF NOT EXISTS idx_cs_cycle    ON credo_scores(cycle);

-- ── Link support_actions to Four C pillars ────────────────────────────
-- So HR can see which interventions target which pillar.
ALTER TABLE support_actions
  ADD COLUMN IF NOT EXISTS target_pillar TEXT CHECK (target_pillar IN ('compensation','purpose','career','community','belonging','transcendence','story'));

CREATE INDEX IF NOT EXISTS idx_sa_pillar ON support_actions(target_pillar) WHERE target_pillar IS NOT NULL;

-- ── House Score History (nightly snapshot target) ─────────────────────
-- Appended by a cron or manual "Raise the bar" review. Not a source of
-- truth for current state — use computeHouseScore() for that — but
-- essential for trend lines.
CREATE TABLE IF NOT EXISTS house_score_history (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  snapshot_at       TIMESTAMPTZ DEFAULT now(),
  cycle             TEXT NOT NULL,
  active_heroes     INTEGER NOT NULL,
  compensation      NUMERIC(5,2),
  purpose           NUMERIC(5,2),
  career            NUMERIC(5,2),
  community         NUMERIC(5,2),
  composite         NUMERIC(5,2),
  self_reported_count INTEGER,
  heuristic_count     INTEGER,
  source            TEXT DEFAULT 'system'
);

CREATE INDEX IF NOT EXISTS idx_hsh_cycle ON house_score_history(cycle);
CREATE INDEX IF NOT EXISTS idx_hsh_at    ON house_score_history(snapshot_at);
