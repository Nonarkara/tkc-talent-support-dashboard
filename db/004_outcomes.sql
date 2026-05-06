-- Project Outcomes — the feedback loop
-- Records actual delivery results to compare with team composition predictions.
-- The GAP between predicted and actual is where learning happens.

CREATE TABLE IF NOT EXISTS project_outcomes (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id      UUID REFERENCES projects(id) ON DELETE CASCADE NOT NULL,
  -- Actual delivery data
  budget_actual_thb   NUMERIC,            -- what was actually spent
  timeline_status     TEXT CHECK (timeline_status IN ('early', 'on_time', 'late', 'failed')) DEFAULT 'on_time',
  quality_score       INTEGER CHECK (quality_score >= 0 AND quality_score <= 100),
  client_satisfaction INTEGER CHECK (client_satisfaction >= 1 AND client_satisfaction <= 5),
  -- Predicted scores (snapshot at time of deployment)
  predicted_fit       INTEGER,
  predicted_chemistry INTEGER,
  predicted_overall   INTEGER,
  team_cost_cp        INTEGER,            -- budget used at deployment time
  team_size           INTEGER,
  -- Learning
  notes               TEXT,               -- what went right/wrong
  lessons             TEXT[],             -- structured learnings
  recorded_by         TEXT,               -- who recorded this
  recorded_at         TIMESTAMPTZ DEFAULT now(),
  UNIQUE(project_id)                      -- one outcome per project
);

CREATE INDEX IF NOT EXISTS idx_outcomes_project ON project_outcomes(project_id);
CREATE INDEX IF NOT EXISTS idx_outcomes_date ON project_outcomes(recorded_at DESC);
