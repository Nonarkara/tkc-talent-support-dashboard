-- ═══════════════════════════════════════════════════════════════
-- Credo Framework & Check-in System
-- Based on the Ritz-Carlton Credo / Emily Esfahani Smith's
-- four pillars of meaning: Belonging, Purpose, Transcendence, Story
-- ═══════════════════════════════════════════════════════════════

-- Employee RPG attributes (HR-adjustable)
CREATE TABLE IF NOT EXISTS employee_attributes (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         UUID REFERENCES users(id) NOT NULL UNIQUE,
  -- Classic 6 RPG stats (1-20 scale)
  str             INTEGER NOT NULL DEFAULT 10 CHECK (str >= 1 AND str <= 20),
  int             INTEGER NOT NULL DEFAULT 10 CHECK (int >= 1 AND int <= 20),
  wis             INTEGER NOT NULL DEFAULT 10 CHECK (wis >= 1 AND wis <= 20),
  cha             INTEGER NOT NULL DEFAULT 10 CHECK (cha >= 1 AND cha <= 20),
  dex             INTEGER NOT NULL DEFAULT 10 CHECK (dex >= 1 AND dex <= 20),
  con             INTEGER NOT NULL DEFAULT 10 CHECK (con >= 1 AND con <= 20),
  -- Auto-derived RPG class
  rpg_class       TEXT,
  -- HR notes on attribute adjustments
  notes           TEXT,
  updated_at      TIMESTAMPTZ DEFAULT now(),
  updated_by      UUID REFERENCES users(id)
);

-- Team assignments — tracks who is on which team, with history
CREATE TABLE IF NOT EXISTS team_assignments (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         UUID REFERENCES users(id) NOT NULL,
  team_id         TEXT NOT NULL,
  assigned_at     TIMESTAMPTZ DEFAULT now(),
  unassigned_at   TIMESTAMPTZ,           -- NULL = currently active
  assigned_by     UUID REFERENCES users(id),
  reason          TEXT                     -- why the move was made
);

CREATE INDEX idx_team_assign_user ON team_assignments(user_id);
CREATE INDEX idx_team_assign_team ON team_assignments(team_id);
CREATE INDEX idx_team_assign_active ON team_assignments(team_id) WHERE unassigned_at IS NULL;

-- Daily check-ins — linked to physical presence system
CREATE TABLE IF NOT EXISTS daily_checkins (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         UUID REFERENCES users(id) NOT NULL,
  team_id         TEXT NOT NULL,
  check_in_at     TIMESTAMPTZ NOT NULL,
  check_out_at    TIMESTAMPTZ,
  check_in_method TEXT CHECK (check_in_method IN ('gps', 'fingerprint', 'nfc', 'qr', 'manual')),
  is_remote       BOOLEAN DEFAULT false,
  -- Auto-calculated
  hours_worked    NUMERIC(4,2) GENERATED ALWAYS AS (
    CASE WHEN check_out_at IS NOT NULL
      THEN EXTRACT(EPOCH FROM (check_out_at - check_in_at)) / 3600.0
      ELSE NULL
    END
  ) STORED,
  date            DATE GENERATED ALWAYS AS (check_in_at::DATE) STORED
);

CREATE INDEX idx_checkin_user ON daily_checkins(user_id);
CREATE INDEX idx_checkin_date ON daily_checkins(date DESC);
CREATE INDEX idx_checkin_team ON daily_checkins(team_id, date);

-- Credo pillar scores — per person, per period
-- These blend attribute-derived scores with pulse survey data
CREATE TABLE IF NOT EXISTS credo_scores (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         UUID REFERENCES users(id) NOT NULL,
  team_id         TEXT,
  period_start    DATE NOT NULL,
  period_end      DATE NOT NULL,
  -- The four pillars (0-100)
  belonging       INTEGER CHECK (belonging >= 0 AND belonging <= 100),
  purpose         INTEGER CHECK (purpose >= 0 AND purpose <= 100),
  transcendence   INTEGER CHECK (transcendence >= 0 AND transcendence <= 100),
  story           INTEGER CHECK (story >= 0 AND story <= 100),
  -- Overall composite
  overall         INTEGER CHECK (overall >= 0 AND overall <= 100),
  -- Source breakdown (for transparency)
  from_attributes JSONB,   -- {"belonging": 45, "purpose": 60, ...}
  from_pulse      JSONB,   -- {"belonging": 70, "purpose": 55, ...}
  created_at      TIMESTAMPTZ DEFAULT now(),
  UNIQUE(user_id, period_start)
);

CREATE INDEX idx_credo_user ON credo_scores(user_id);
CREATE INDEX idx_credo_team ON credo_scores(team_id);
CREATE INDEX idx_credo_period ON credo_scores(period_start DESC);

-- Credo pulse check-in — daily micro-survey (1 question per day, rotating)
CREATE TABLE IF NOT EXISTS credo_pulse (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         UUID REFERENCES users(id) NOT NULL,
  pillar          TEXT NOT NULL CHECK (pillar IN ('belonging', 'purpose', 'transcendence', 'story')),
  score           INTEGER NOT NULL CHECK (score >= 1 AND score <= 5),
  question_th     TEXT,                    -- the question that was asked
  note            TEXT,                    -- optional free text
  submitted_at    TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_credo_pulse_user ON credo_pulse(user_id);
CREATE INDEX idx_credo_pulse_date ON credo_pulse(submitted_at DESC);
CREATE INDEX idx_credo_pulse_pillar ON credo_pulse(pillar);

-- Team composition snapshots — captured whenever HR moves someone
-- Allows tracking how team composition changes affect performance
CREATE TABLE IF NOT EXISTS team_composition_snapshots (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  team_id         TEXT NOT NULL,
  snapshot_at     TIMESTAMPTZ DEFAULT now(),
  member_count    INTEGER,
  -- Aggregate RPG stats (team averages)
  avg_str         NUMERIC(4,1),
  avg_int         NUMERIC(4,1),
  avg_wis         NUMERIC(4,1),
  avg_cha         NUMERIC(4,1),
  avg_dex         NUMERIC(4,1),
  avg_con         NUMERIC(4,1),
  -- Aggregate Credo scores
  credo_belonging     INTEGER,
  credo_purpose       INTEGER,
  credo_transcendence INTEGER,
  credo_story         INTEGER,
  credo_overall       INTEGER,
  -- Team analysis
  composition_score   INTEGER,  -- 0-100 from analyzeTeam()
  class_diversity     INTEGER,  -- count of unique RPG classes
  warnings            TEXT[],
  strengths           TEXT[],
  -- What triggered this snapshot
  trigger_event       TEXT,     -- 'member_added', 'member_removed', 'manual'
  triggered_by        UUID REFERENCES users(id)
);

CREATE INDEX idx_comp_snapshot_team ON team_composition_snapshots(team_id);
CREATE INDEX idx_comp_snapshot_date ON team_composition_snapshots(snapshot_at DESC);

-- ═══════════════════════════════════════════════════════════════
-- VIEWS
-- ═══════════════════════════════════════════════════════════════

-- Current team roster (only active assignments)
CREATE OR REPLACE VIEW current_team_roster AS
SELECT
  ta.team_id,
  ta.user_id,
  u.nickname,
  u.full_name,
  u.department_id,
  ea.str, ea.int, ea.wis, ea.cha, ea.dex, ea.con,
  ea.rpg_class,
  ta.assigned_at
FROM team_assignments ta
JOIN users u ON u.id = ta.user_id
LEFT JOIN employee_attributes ea ON ea.user_id = ta.user_id
WHERE ta.unassigned_at IS NULL
ORDER BY ta.team_id, ta.assigned_at;

-- Today's presence
CREATE OR REPLACE VIEW todays_presence AS
SELECT
  dc.user_id,
  dc.team_id,
  dc.check_in_at,
  dc.check_out_at,
  dc.is_remote,
  dc.check_in_method,
  u.nickname
FROM daily_checkins dc
JOIN users u ON u.id = dc.user_id
WHERE dc.date = CURRENT_DATE
ORDER BY dc.check_in_at DESC;
