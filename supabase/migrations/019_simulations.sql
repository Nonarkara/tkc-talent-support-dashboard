-- ============================================================
-- Migration 019: Team Simulations
-- Save snap/jigsaw compositions for comparison with actual results.
-- The feedback loop: simulate → execute → measure → compare → improve.
-- ============================================================

CREATE TABLE IF NOT EXISTS team_simulations (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id        UUID REFERENCES projects(id),
  created_by        UUID REFERENCES users(id),
  team_member_ids   UUID[] NOT NULL,
  team_size         INTEGER NOT NULL,
  -- Scores at time of simulation
  fit_pct           INTEGER CHECK (fit_pct >= 0 AND fit_pct <= 100),
  chemistry_score   INTEGER CHECK (chemistry_score >= 0 AND chemistry_score <= 100),
  overall_score     INTEGER CHECK (overall_score >= 0 AND overall_score <= 100),
  hierarchy_valid   BOOLEAN DEFAULT true,
  -- Demand coverage snapshot
  demand_coverage   JSONB DEFAULT '{}',
  demand_gaps       TEXT[] DEFAULT '{}',
  -- Context
  insights          TEXT[] DEFAULT '{}',
  notes             TEXT,
  created_at        TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS simulation_outcomes (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  simulation_id         UUID REFERENCES team_simulations(id) ON DELETE CASCADE NOT NULL,
  -- Actual results (filled in later when project completes)
  actual_delivery_pct   INTEGER,
  actual_quality_score  INTEGER,
  actual_chemistry_feedback INTEGER,
  actual_on_time        BOOLEAN,
  actual_gm_pct         NUMERIC,
  -- Comparison
  score_delta           INTEGER, -- actual overall - predicted overall
  notes                 TEXT,
  measured_at           TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_simulations_project ON team_simulations(project_id);
CREATE INDEX IF NOT EXISTS idx_simulations_creator ON team_simulations(created_by);
CREATE INDEX IF NOT EXISTS idx_sim_outcomes ON simulation_outcomes(simulation_id);

ALTER TABLE team_simulations ENABLE ROW LEVEL SECURITY;
ALTER TABLE simulation_outcomes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated can view simulations" ON team_simulations
  FOR SELECT USING (auth.uid() IS NOT NULL);
CREATE POLICY "Managers and admins can create simulations" ON team_simulations
  FOR INSERT WITH CHECK (get_user_role() IN ('manager', 'admin'));
CREATE POLICY "Admins can manage outcomes" ON simulation_outcomes
  FOR ALL USING (get_user_role() = 'admin');
