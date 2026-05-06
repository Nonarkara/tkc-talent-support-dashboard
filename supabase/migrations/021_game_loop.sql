-- ============================================================
-- Migration 021: Game Loop — Directors compete, form teams, deliver
-- The core mechanic that makes HR a strategy game.
-- ============================================================

-- Director-Project assignments (who leads what)
CREATE TABLE IF NOT EXISTS director_assignments (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  director_id     UUID REFERENCES users(id) NOT NULL,
  project_id      UUID REFERENCES projects(id) NOT NULL,
  quarter         TEXT NOT NULL, -- 'Q1_2026', etc.
  status          TEXT CHECK (status IN ('pitched', 'assigned', 'active', 'delivered', 'failed')) DEFAULT 'pitched',
  budget_ceiling  INTEGER NOT NULL, -- max capacity points
  budget_used     INTEGER DEFAULT 0,
  created_at      TIMESTAMPTZ DEFAULT now(),
  UNIQUE(director_id, project_id, quarter)
);

-- Team rosters per project (who is on the team, what role)
CREATE TABLE IF NOT EXISTS project_rosters (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  assignment_id   UUID REFERENCES director_assignments(id) ON DELETE CASCADE NOT NULL,
  user_id         UUID REFERENCES users(id) NOT NULL,
  team_role       TEXT CHECK (team_role IN ('director', 'manager', 'staff')) NOT NULL,
  capacity_cost   INTEGER NOT NULL,
  joined_at       TIMESTAMPTZ DEFAULT now(),
  left_at         TIMESTAMPTZ,
  UNIQUE(assignment_id, user_id)
);

-- Quarterly delivery scores
CREATE TABLE IF NOT EXISTS delivery_scores (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  assignment_id   UUID REFERENCES director_assignments(id) ON DELETE CASCADE NOT NULL,
  quarter         TEXT NOT NULL,
  -- Delivery metrics
  on_time         BOOLEAN,
  quality_score   INTEGER CHECK (quality_score >= 0 AND quality_score <= 100),
  margin_actual   NUMERIC,
  chemistry_score INTEGER CHECK (chemistry_score >= 0 AND chemistry_score <= 100),
  -- Points earned
  base_points     INTEGER DEFAULT 0,
  margin_multiplier NUMERIC DEFAULT 1.0,
  chemistry_multiplier NUMERIC DEFAULT 1.0,
  budget_multiplier NUMERIC DEFAULT 1.0,
  total_points    INTEGER DEFAULT 0,
  -- Context
  notes           TEXT,
  scored_at       TIMESTAMPTZ DEFAULT now()
);

-- Director leaderboard (materialized view pattern — updated after each quarter)
CREATE TABLE IF NOT EXISTS director_leaderboard (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  director_id     UUID REFERENCES users(id) NOT NULL,
  quarter         TEXT NOT NULL,
  total_points    INTEGER DEFAULT 0,
  teams_formed    INTEGER DEFAULT 0,
  teams_delivered INTEGER DEFAULT 0,
  avg_chemistry   INTEGER DEFAULT 0,
  avg_margin      NUMERIC DEFAULT 0,
  rank            INTEGER DEFAULT 0,
  updated_at      TIMESTAMPTZ DEFAULT now(),
  UNIQUE(director_id, quarter)
);

-- Org grade (one row per quarter)
CREATE TABLE IF NOT EXISTS org_grades (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  quarter         TEXT UNIQUE NOT NULL,
  total_points    INTEGER DEFAULT 0,
  total_delivered INTEGER DEFAULT 0,
  total_failed    INTEGER DEFAULT 0,
  avg_chemistry   INTEGER DEFAULT 0,
  grade           TEXT CHECK (grade IN ('S', 'A', 'B', 'C', 'D', 'F')) DEFAULT 'C',
  grade_label     TEXT,
  updated_at      TIMESTAMPTZ DEFAULT now()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_director_assign_director ON director_assignments(director_id);
CREATE INDEX IF NOT EXISTS idx_director_assign_project ON director_assignments(project_id);
CREATE INDEX IF NOT EXISTS idx_director_assign_quarter ON director_assignments(quarter);
CREATE INDEX IF NOT EXISTS idx_roster_assignment ON project_rosters(assignment_id);
CREATE INDEX IF NOT EXISTS idx_roster_user ON project_rosters(user_id);
CREATE INDEX IF NOT EXISTS idx_delivery_assignment ON delivery_scores(assignment_id);
CREATE INDEX IF NOT EXISTS idx_leaderboard_quarter ON director_leaderboard(quarter);

-- RLS
ALTER TABLE director_assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE project_rosters ENABLE ROW LEVEL SECURITY;
ALTER TABLE delivery_scores ENABLE ROW LEVEL SECURITY;
ALTER TABLE director_leaderboard ENABLE ROW LEVEL SECURITY;
ALTER TABLE org_grades ENABLE ROW LEVEL SECURITY;

CREATE POLICY "All authenticated can view assignments" ON director_assignments FOR SELECT USING (auth.uid() IS NOT NULL);
CREATE POLICY "Directors and admins can manage assignments" ON director_assignments FOR ALL USING (get_user_role() IN ('manager', 'admin') OR auth.uid() = director_id);

CREATE POLICY "All authenticated can view rosters" ON project_rosters FOR SELECT USING (auth.uid() IS NOT NULL);
CREATE POLICY "Assignment owners can manage rosters" ON project_rosters FOR ALL USING (get_user_role() = 'admin');

CREATE POLICY "All can view delivery scores" ON delivery_scores FOR SELECT USING (auth.uid() IS NOT NULL);
CREATE POLICY "Admins manage scores" ON delivery_scores FOR ALL USING (get_user_role() = 'admin');

CREATE POLICY "All can view leaderboard" ON director_leaderboard FOR SELECT USING (auth.uid() IS NOT NULL);
CREATE POLICY "All can view org grades" ON org_grades FOR SELECT USING (auth.uid() IS NOT NULL);
