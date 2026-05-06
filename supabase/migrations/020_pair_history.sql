-- ============================================================
-- Migration 020: Pair Chemistry History
-- Track who works well with whom over time.
-- Predicted chemistry gets calibrated by actual feedback.
-- The system LEARNS.
-- ============================================================

CREATE TABLE IF NOT EXISTS pair_chemistry_log (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  person_a_id           UUID REFERENCES users(id) NOT NULL,
  person_b_id           UUID REFERENCES users(id) NOT NULL,
  project_id            UUID REFERENCES projects(id),
  -- Predicted (from algorithm)
  predicted_chemistry   INTEGER CHECK (predicted_chemistry >= 0 AND predicted_chemistry <= 100),
  -- Actual (from feedback/observation)
  actual_feedback       INTEGER CHECK (actual_feedback >= 0 AND actual_feedback <= 100),
  -- Behavioral signals
  collaboration_events  INTEGER DEFAULT 0,
  conflict_events       INTEGER DEFAULT 0,
  -- Period
  period_start          DATE NOT NULL,
  period_end            DATE,
  created_at            TIMESTAMPTZ DEFAULT now(),
  -- Ensure A < B to avoid duplicates (always store lower ID first)
  CHECK (person_a_id < person_b_id)
);

CREATE INDEX IF NOT EXISTS idx_pair_chem_a ON pair_chemistry_log(person_a_id);
CREATE INDEX IF NOT EXISTS idx_pair_chem_b ON pair_chemistry_log(person_b_id);
CREATE INDEX IF NOT EXISTS idx_pair_chem_project ON pair_chemistry_log(project_id);
CREATE INDEX IF NOT EXISTS idx_pair_chem_period ON pair_chemistry_log(period_start);

ALTER TABLE pair_chemistry_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated can view pair chemistry" ON pair_chemistry_log
  FOR SELECT USING (auth.uid() IS NOT NULL);
CREATE POLICY "Admins can manage pair chemistry" ON pair_chemistry_log
  FOR ALL USING (get_user_role() = 'admin');

-- View: aggregate pair chemistry with calibration factor
CREATE OR REPLACE VIEW v_pair_chemistry_calibrated AS
SELECT
  person_a_id,
  person_b_id,
  COUNT(*) AS projects_together,
  AVG(predicted_chemistry) AS avg_predicted,
  AVG(actual_feedback) AS avg_actual,
  SUM(collaboration_events) AS total_collabs,
  SUM(conflict_events) AS total_conflicts,
  -- Calibration: if actual consistently differs from predicted, adjust
  CASE
    WHEN AVG(actual_feedback) IS NOT NULL
    THEN ROUND(AVG(predicted_chemistry) * 0.4 + AVG(actual_feedback) * 0.6)
    ELSE ROUND(AVG(predicted_chemistry))
  END AS calibrated_chemistry
FROM pair_chemistry_log
GROUP BY person_a_id, person_b_id;
