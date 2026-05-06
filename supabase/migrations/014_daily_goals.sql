-- ============================================================
-- Migration 014: Daily Goals System
-- Morning: voice/text → AI parses to 3 bullets
-- Evening: reflection + completion
-- The compass, not the judgment.
-- ============================================================

CREATE TABLE IF NOT EXISTS daily_goals (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id               UUID REFERENCES users(id) NOT NULL,
  date                  DATE NOT NULL,

  -- Morning input
  morning_input         TEXT, -- raw voice/text before AI processing
  goals                 JSONB DEFAULT '[]', -- [{text, category?, estimated_hours?}]
  check_in_at           TIMESTAMPTZ,

  -- Evening reflection
  evening_input         TEXT, -- raw reflection
  completion_status     JSONB DEFAULT '[]', -- [{goal_index, completed, notes?}]
  overall_completion_pct INTEGER CHECK (overall_completion_pct >= 0 AND overall_completion_pct <= 100),
  check_out_at          TIMESTAMPTZ,

  -- How they feel (simple, non-intrusive)
  mood                  TEXT CHECK (mood IN ('energized', 'focused', 'neutral', 'tired', 'stressed')),

  -- Blockers (optional — only if they want to share)
  blocker               TEXT,

  -- Points earned for completing check-in (small reward, Kahneman's micro-recognition)
  points_earned         INTEGER DEFAULT 0,

  created_at            TIMESTAMPTZ DEFAULT now(),
  UNIQUE(user_id, date)
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_daily_goals_user ON daily_goals(user_id);
CREATE INDEX IF NOT EXISTS idx_daily_goals_date ON daily_goals(date);
CREATE INDEX IF NOT EXISTS idx_daily_goals_user_date ON daily_goals(user_id, date);

-- RLS — people see their own goals, managers see their team, admin sees all
ALTER TABLE daily_goals ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage own goals" ON daily_goals
  FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "Managers can view team goals" ON daily_goals
  FOR SELECT USING (
    get_user_role() = 'manager'
    AND user_id IN (
      SELECT id FROM users WHERE department_id = get_user_department_id()
    )
  );

CREATE POLICY "Admins can view all goals" ON daily_goals
  FOR SELECT USING (get_user_role() = 'admin');

-- View: Today's goals summary for the dashboard
CREATE OR REPLACE VIEW v_todays_goals AS
SELECT
  dg.user_id,
  u.nickname,
  u.department_id,
  dg.goals,
  dg.overall_completion_pct,
  dg.mood,
  dg.check_in_at,
  dg.check_out_at,
  dg.blocker,
  CASE
    WHEN dg.check_in_at IS NOT NULL AND dg.check_out_at IS NOT NULL THEN 'completed'
    WHEN dg.check_in_at IS NOT NULL THEN 'checked_in'
    ELSE 'not_checked_in'
  END AS status
FROM daily_goals dg
JOIN users u ON u.id = dg.user_id
WHERE dg.date = CURRENT_DATE;
