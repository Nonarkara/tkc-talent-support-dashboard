-- ============================================================
-- Migration 029: The Game Loop — Real-Time Match Engine
--
-- Closes the commit-and-reveal gap:
--   • projects.director_id — who owns this fixture
--   • game_events — the "while you were away" newspaper
--   • project_outcomes.random_seed — reproducible match results
--   • project_outcomes.simulated — flag for auto-generated outcomes
-- ============================================================

-- ─── PROJECT OWNERSHIP ─────────────────────────────────────

ALTER TABLE projects
  ADD COLUMN IF NOT EXISTS director_id UUID REFERENCES employees(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_projects_director
  ON projects(director_id) WHERE director_id IS NOT NULL;

-- ─── GAME EVENTS (The Newspaper) ───────────────────────────

CREATE TABLE IF NOT EXISTS game_events (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  type            TEXT NOT NULL CHECK (type IN (
    'project_started',
    'project_completed',
    'team_locked',
    'team_approved',
    'outcome_recorded',
    'employee_deployed',
    'employee_returned',
    'stat_changed',
    'random_event',
    'quarter_end'
  )),
  project_id      UUID REFERENCES projects(id) ON DELETE CASCADE,
  employee_id     UUID REFERENCES employees(id) ON DELETE CASCADE,
  director_id     UUID REFERENCES employees(id) ON DELETE CASCADE,
  description     TEXT NOT NULL,
  description_th  TEXT,
  impact          INTEGER DEFAULT 0, -- score impact, if applicable
  metadata        JSONB NOT NULL DEFAULT '{}'::jsonb,
  read            BOOLEAN NOT NULL DEFAULT false,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_game_events_director
  ON game_events(director_id, read, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_game_events_project
  ON game_events(project_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_game_events_unread
  ON game_events(read, created_at DESC) WHERE read = false;

CREATE INDEX IF NOT EXISTS idx_game_events_type
  ON game_events(type, created_at DESC);

-- ─── OUTCOME ENRICHMENT ────────────────────────────────────

ALTER TABLE project_outcomes
  ADD COLUMN IF NOT EXISTS random_seed TEXT,
  ADD COLUMN IF NOT EXISTS simulated BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS delivery_points INTEGER,
  ADD COLUMN IF NOT EXISTS margin_achieved NUMERIC(5,2);

-- ─── MIGRATION TRACKING ────────────────────────────────────

INSERT INTO _migrations (name) VALUES ('029_game_loop')
ON CONFLICT (name) DO NOTHING;
