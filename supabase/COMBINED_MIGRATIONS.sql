-- Create departments table
CREATE TABLE IF NOT EXISTS departments (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name_th       TEXT NOT NULL,
  name_en       TEXT NOT NULL,
  code          TEXT UNIQUE NOT NULL,
  head_user_id  UUID,  -- FK added after users table exists
  color         TEXT DEFAULT '#3B82F6',
  created_at    TIMESTAMPTZ DEFAULT now()
);

-- Seed TKC departments
INSERT INTO departments (code, name_th, name_en, color) VALUES
  ('NET_ENG',   'วิศวกรรมโครงข่าย',     'Network Engineering',  '#3B82F6'),
  ('SW_DEV',    'พัฒนาซอฟต์แวร์',       'Software Development', '#8B5CF6'),
  ('CYBER',     'ไซเบอร์ซีเคียวริตี้',    'Cybersecurity',        '#EF4444'),
  ('SALES',     'ฝ่ายขาย',              'Sales',                '#10B981'),
  ('UX',        'ออกแบบ UX/UI',         'UX/UI Design',         '#EC4899'),
  ('TALENT',    'สนับสนุนบุคลากร',       'Talent Support',       '#F59E0B'),
  ('PM',        'บริหารโครงการ',          'Project Management',   '#06B6D4'),
  ('ADMIN_FIN', 'ธุรการและการเงิน',       'Admin & Finance',      '#6B7280');
-- Create users table (extends Supabase auth.users)
CREATE TABLE IF NOT EXISTS users (
  id              UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  employee_id     TEXT UNIQUE,
  full_name_th    TEXT NOT NULL,
  full_name_en    TEXT,
  nickname        TEXT,
  email           TEXT UNIQUE NOT NULL,
  avatar_url      TEXT,
  department_id   UUID REFERENCES departments(id),
  role            TEXT CHECK (role IN ('employee', 'manager', 'admin')) DEFAULT 'employee',
  title_th        TEXT,
  title_en        TEXT,
  skills          TEXT[] DEFAULT '{}',
  level           INTEGER DEFAULT 1,
  total_points    INTEGER DEFAULT 0,
  streak_days     INTEGER DEFAULT 0,
  joined_at       DATE,
  is_active       BOOLEAN DEFAULT true,
  created_at      TIMESTAMPTZ DEFAULT now(),
  updated_at      TIMESTAMPTZ DEFAULT now()
);

-- Add department head FK now that users exists
ALTER TABLE departments
  ADD CONSTRAINT fk_dept_head
  FOREIGN KEY (head_user_id) REFERENCES users(id);

-- Auto-update updated_at
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER tr_users_updated_at
  BEFORE UPDATE ON users
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at();
-- 4C Framework categories
CREATE TABLE IF NOT EXISTS contribution_categories (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code          TEXT UNIQUE NOT NULL,
  name_th       TEXT NOT NULL,
  name_en       TEXT NOT NULL,
  description_th TEXT,
  description_en TEXT,
  icon          TEXT,
  color         TEXT,
  sort_order    INTEGER DEFAULT 0
);

INSERT INTO contribution_categories (code, name_th, name_en, description_th, description_en, icon, color, sort_order) VALUES
  ('cause',        'คุณค่า',     'Cause',        'ผลงานที่สร้างคุณค่าให้องค์กรและสังคม', 'Contributions that create value', 'Heart',      '#EF4444', 1),
  ('career',       'อาชีพ',      'Career',       'การพัฒนาทักษะและความก้าวหน้า',       'Skill development and growth',    'TrendingUp', '#3B82F6', 2),
  ('compensation', 'ผลตอบแทน',   'Compensation', 'ผลงานที่สร้างรายได้และลดต้นทุน',      'Revenue and cost impact',         'Coins',      '#10B981', 3),
  ('community',    'ชุมชน',      'Community',    'การทำงานร่วมกันและแบ่งปันความรู้',     'Collaboration and sharing',       'Users',      '#F59E0B', 4);

-- Contribution types
CREATE TABLE IF NOT EXISTS contribution_types (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  category_id   UUID REFERENCES contribution_categories(id) NOT NULL,
  code          TEXT UNIQUE NOT NULL,
  name_th       TEXT NOT NULL,
  name_en       TEXT NOT NULL,
  description_th TEXT,
  description_en TEXT,
  base_points   INTEGER NOT NULL DEFAULT 10,
  is_active     BOOLEAN DEFAULT true
);

-- Seed contribution types
INSERT INTO contribution_types (category_id, code, name_th, name_en, base_points)
SELECT cc.id, ct.code, ct.name_th, ct.name_en, ct.base_points
FROM (VALUES
  ('career',       'task_completion',     'งานสำเร็จ',              'Task Completion',           10),
  ('career',       'skill_acquisition',   'เรียนรู้ทักษะใหม่',        'Skill Acquisition',         25),
  ('career',       'innovation_proposal', 'เสนอไอเดียนวัตกรรม',      'Innovation Proposal',       50),
  ('career',       'certification',       'ได้รับใบรับรอง',           'Certification Earned',      40),
  ('community',    'knowledge_sharing',   'แบ่งปันความรู้',           'Knowledge Sharing',         20),
  ('community',    'cross_team_collab',   'ทำงานข้ามทีม',            'Cross-Team Collaboration',  30),
  ('community',    'mentoring',           'เป็นพี่เลี้ยง',            'Mentoring',                 25),
  ('community',    'social_event',        'จัดกิจกรรม',              'Social Event Organization', 15),
  ('cause',        'process_improvement', 'ปรับปรุงกระบวนการ',        'Process Improvement',       35),
  ('cause',        'client_impact',       'สร้างคุณค่าให้ลูกค้า',      'Client Impact',             40),
  ('cause',        'quality_initiative',  'ริเริ่มด้านคุณภาพ',         'Quality Initiative',        30),
  ('compensation', 'revenue_contribution','สร้างรายได้',              'Revenue Contribution',      50),
  ('compensation', 'cost_saving',         'ลดต้นทุน',               'Cost Saving',               30),
  ('compensation', 'reusable_component',  'สร้าง Component ใช้ซ้ำ',   'Reusable Component',        35)
) AS ct(cat_code, code, name_th, name_en, base_points)
JOIN contribution_categories cc ON cc.code = ct.cat_code;
-- Contributions table (the core entity)
CREATE TABLE IF NOT EXISTS contributions (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         UUID REFERENCES users(id) NOT NULL,
  type_id         UUID REFERENCES contribution_types(id) NOT NULL,
  title           TEXT NOT NULL,
  description     TEXT,
  evidence_url    TEXT,
  status          TEXT CHECK (status IN ('pending', 'verified', 'rejected')) DEFAULT 'pending',
  verified_by     UUID REFERENCES users(id),
  verified_at     TIMESTAMPTZ,
  rejection_note  TEXT,
  points_awarded  INTEGER,
  submitted_at    TIMESTAMPTZ DEFAULT now(),
  created_at      TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_contributions_user ON contributions(user_id);
CREATE INDEX idx_contributions_status ON contributions(status);
CREATE INDEX idx_contributions_submitted ON contributions(submitted_at DESC);
CREATE INDEX idx_contributions_type ON contributions(type_id);
-- Points transactions (immutable ledger)
CREATE TABLE IF NOT EXISTS points_transactions (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         UUID REFERENCES users(id) NOT NULL,
  amount          INTEGER NOT NULL,
  type            TEXT CHECK (type IN (
    'contribution', 'badge_bonus', 'manager_award',
    'streak_bonus', 'level_up_bonus', 'adjustment'
  )) NOT NULL,
  reference_id    UUID,
  description_th  TEXT,
  description_en  TEXT,
  created_at      TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_points_user ON points_transactions(user_id);
CREATE INDEX idx_points_created ON points_transactions(created_at DESC);
CREATE INDEX idx_points_type ON points_transactions(type);

-- Function to update user totals after point transaction
CREATE OR REPLACE FUNCTION fn_update_user_totals()
RETURNS TRIGGER AS $$
DECLARE
  new_total INTEGER;
  new_level INTEGER;
  accumulated INTEGER;
  lvl INTEGER;
BEGIN
  -- Calculate new total
  SELECT COALESCE(SUM(amount), 0) INTO new_total
  FROM points_transactions
  WHERE user_id = NEW.user_id;

  -- Calculate level from total points
  -- Formula: pointsForLevel(n) = floor(100 * n * 1.5)
  lvl := 1;
  accumulated := 0;
  WHILE accumulated + FLOOR(100 * lvl * 1.5) <= new_total LOOP
    accumulated := accumulated + FLOOR(100 * lvl * 1.5);
    lvl := lvl + 1;
  END LOOP;

  new_level := lvl;

  -- Update user
  UPDATE users
  SET total_points = new_total,
      level = new_level,
      updated_at = now()
  WHERE id = NEW.user_id;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER tr_points_update_user_totals
  AFTER INSERT ON points_transactions
  FOR EACH ROW
  EXECUTE FUNCTION fn_update_user_totals();
-- Badge definitions
CREATE TABLE IF NOT EXISTS badge_definitions (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code            TEXT UNIQUE NOT NULL,
  name_th         TEXT NOT NULL,
  name_en         TEXT NOT NULL,
  description_th  TEXT NOT NULL,
  description_en  TEXT NOT NULL,
  icon_url        TEXT,
  category_id     UUID REFERENCES contribution_categories(id),
  tier            TEXT CHECK (tier IN ('bronze', 'silver', 'gold', 'platinum')) DEFAULT 'bronze',
  criteria_type   TEXT NOT NULL CHECK (criteria_type IN ('count', 'points', 'streak', 'custom')),
  criteria_value  INTEGER,
  criteria_json   JSONB,
  bonus_points    INTEGER DEFAULT 0,
  is_active       BOOLEAN DEFAULT true,
  created_at      TIMESTAMPTZ DEFAULT now()
);

-- Badge awards
CREATE TABLE IF NOT EXISTS badge_awards (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         UUID REFERENCES users(id) NOT NULL,
  badge_id        UUID REFERENCES badge_definitions(id) NOT NULL,
  awarded_at      TIMESTAMPTZ DEFAULT now(),
  UNIQUE(user_id, badge_id)
);

CREATE INDEX idx_badge_awards_user ON badge_awards(user_id);

-- Seed badge definitions
INSERT INTO badge_definitions (code, name_th, name_en, description_th, description_en, tier, criteria_type, criteria_value, criteria_json, bonus_points) VALUES
  ('first_contribution',  'ก้าวแรก',          'First Step',          'ส่งผลงานชิ้นแรก',                          'Submit your first contribution',                    'bronze',   'count',  1,    '{"contribution_type": "any"}',                                      10),
  ('cross_pollinator',    'ผู้เชื่อมสะพาน',     'Cross-Pollinator',    'ทำงานข้ามทีมกับ 3 แผนกขึ้นไป',               'Collaborate across 3+ departments',                 'gold',     'custom', 3,    '{"type": "distinct_departments", "contribution_code": "cross_team_collab"}', 100),
  ('knowledge_sharer',    'ผู้แบ่งปัน',         'Knowledge Sharer',    'แบ่งปันความรู้ 5 ครั้งขึ้นไป',                  'Share knowledge 5+ times',                          'silver',   'count',  5,    '{"contribution_code": "knowledge_sharing"}',                        50),
  ('innovation_spark',    'ประกายนวัตกรรม',     'Innovation Spark',    'เสนอไอเดียนวัตกรรม 1 ครั้ง',                  'Submit an innovation proposal',                     'bronze',   'count',  1,    '{"contribution_code": "innovation_proposal"}',                     25),
  ('streak_7',            'ไม่หยุดพัก 7 วัน',   '7-Day Streak',        'มีส่วนร่วมติดต่อกัน 7 วัน',                   'Engage 7 consecutive days',                         'bronze',   'streak', 7,    null,                                                                30),
  ('streak_30',           'นักสู้ 30 วัน',      '30-Day Warrior',      'มีส่วนร่วมติดต่อกัน 30 วัน',                  'Engage 30 consecutive days',                        'silver',   'streak', 30,   null,                                                                100),
  ('level_5',             'ระดับ 5',           'Level 5',             'เลื่อนระดับถึง 5',                            'Reach level 5',                                     'silver',   'points', 5,    '{"type": "level_reached"}',                                         50),
  ('level_10',            'ระดับ 10',          'Level 10',            'เลื่อนระดับถึง 10',                           'Reach level 10',                                    'gold',     'points', 10,   '{"type": "level_reached"}',                                         150),
  ('four_c_champion',     'แชมป์ 4C',          '4C Champion',         'ส่งผลงานครบทุก 4 ด้าน',                      'Contribute in all 4C categories',                   'platinum', 'custom', 4,    '{"type": "all_categories"}',                                        200),
  ('mentor_hero',         'ฮีโร่พี่เลี้ยง',       'Mentor Hero',         'เป็นพี่เลี้ยง 10 ครั้งขึ้นไป',                  'Mentor 10+ times',                                  'gold',     'count',  10,   '{"contribution_code": "mentoring"}',                                75),
  ('revenue_driver',      'ขับเคลื่อนรายได้',    'Revenue Driver',      'สร้างรายได้ให้บริษัท 5 ครั้ง',                  'Generate revenue 5 times',                          'gold',     'count',  5,    '{"contribution_code": "revenue_contribution"}',                    100),
  ('top_10_monthly',      'Top 10 ประจำเดือน',  'Monthly Top 10',      'ติด Top 10 ลีดเดอร์บอร์ดประจำเดือน',          'Reach monthly leaderboard top 10',                  'silver',   'custom', 1,    '{"type": "monthly_top_10"}',                                        50);
-- Activity log for real-time feed
CREATE TABLE IF NOT EXISTS activity_log (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID REFERENCES users(id),
  action      TEXT NOT NULL,
  entity_type TEXT,
  entity_id   UUID,
  metadata    JSONB DEFAULT '{}',
  created_at  TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_activity_created ON activity_log(created_at DESC);
CREATE INDEX idx_activity_user ON activity_log(user_id);

-- Enable Supabase Realtime on activity_log
ALTER PUBLICATION supabase_realtime ADD TABLE activity_log;

-- Function to log activity when contribution is verified
CREATE OR REPLACE FUNCTION fn_log_contribution_verified()
RETURNS TRIGGER AS $$
BEGIN
  -- Only fire when status changes to 'verified'
  IF NEW.status = 'verified' AND (OLD.status IS NULL OR OLD.status != 'verified') THEN
    -- Award points
    INSERT INTO points_transactions (user_id, amount, type, reference_id, description_th, description_en)
    SELECT
      NEW.user_id,
      COALESCE(NEW.points_awarded, ct.base_points),
      'contribution',
      NEW.id,
      'ได้รับแต้มจากผลงาน: ' || NEW.title,
      'Points from contribution: ' || NEW.title
    FROM contribution_types ct
    WHERE ct.id = NEW.type_id;

    -- Update points_awarded if not set
    IF NEW.points_awarded IS NULL THEN
      UPDATE contributions
      SET points_awarded = (SELECT base_points FROM contribution_types WHERE id = NEW.type_id)
      WHERE id = NEW.id;
    END IF;

    -- Log the verification
    INSERT INTO activity_log (user_id, action, entity_type, entity_id, metadata)
    VALUES (
      NEW.user_id,
      'contribution_verified',
      'contribution',
      NEW.id,
      jsonb_build_object('title', NEW.title, 'verifier_id', NEW.verified_by)
    );
  END IF;

  -- Log rejection
  IF NEW.status = 'rejected' AND (OLD.status IS NULL OR OLD.status != 'rejected') THEN
    INSERT INTO activity_log (user_id, action, entity_type, entity_id, metadata)
    VALUES (
      NEW.user_id,
      'contribution_rejected',
      'contribution',
      NEW.id,
      jsonb_build_object('title', NEW.title, 'note', NEW.rejection_note)
    );
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER tr_contribution_status_change
  AFTER UPDATE OF status ON contributions
  FOR EACH ROW
  EXECUTE FUNCTION fn_log_contribution_verified();

-- Log new contribution submission
CREATE OR REPLACE FUNCTION fn_log_contribution_submitted()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO activity_log (user_id, action, entity_type, entity_id, metadata)
  VALUES (
    NEW.user_id,
    'contribution_submitted',
    'contribution',
    NEW.id,
    jsonb_build_object('title', NEW.title)
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER tr_contribution_submitted
  AFTER INSERT ON contributions
  FOR EACH ROW
  EXECUTE FUNCTION fn_log_contribution_submitted();

-- Log badge awards
CREATE OR REPLACE FUNCTION fn_log_badge_awarded()
RETURNS TRIGGER AS $$
DECLARE
  badge_name TEXT;
BEGIN
  SELECT name_th INTO badge_name FROM badge_definitions WHERE id = NEW.badge_id;

  INSERT INTO activity_log (user_id, action, entity_type, entity_id, metadata)
  VALUES (
    NEW.user_id,
    'badge_earned',
    'badge',
    NEW.badge_id,
    jsonb_build_object('badge_name', badge_name)
  );

  -- Award bonus points for the badge
  INSERT INTO points_transactions (user_id, amount, type, reference_id, description_th, description_en)
  SELECT
    NEW.user_id,
    bd.bonus_points,
    'badge_bonus',
    NEW.id,
    'โบนัสจากเหรียญ: ' || bd.name_th,
    'Badge bonus: ' || bd.name_en
  FROM badge_definitions bd
  WHERE bd.id = NEW.badge_id AND bd.bonus_points > 0;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER tr_badge_awarded
  AFTER INSERT ON badge_awards
  FOR EACH ROW
  EXECUTE FUNCTION fn_log_badge_awarded();
-- Enable RLS on all tables
ALTER TABLE departments ENABLE ROW LEVEL SECURITY;
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE contribution_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE contribution_types ENABLE ROW LEVEL SECURITY;
ALTER TABLE contributions ENABLE ROW LEVEL SECURITY;
ALTER TABLE points_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE badge_definitions ENABLE ROW LEVEL SECURITY;
ALTER TABLE badge_awards ENABLE ROW LEVEL SECURITY;
ALTER TABLE activity_log ENABLE ROW LEVEL SECURITY;

-- Helper function to get current user's role
CREATE OR REPLACE FUNCTION get_user_role()
RETURNS TEXT AS $$
  SELECT role FROM users WHERE id = auth.uid();
$$ LANGUAGE sql SECURITY DEFINER STABLE;

-- Helper function to get current user's department
CREATE OR REPLACE FUNCTION get_user_department_id()
RETURNS UUID AS $$
  SELECT department_id FROM users WHERE id = auth.uid();
$$ LANGUAGE sql SECURITY DEFINER STABLE;

-- Departments: readable by all authenticated users
CREATE POLICY "departments_select" ON departments FOR SELECT TO authenticated USING (true);

-- Users: readable by all authenticated, updatable by self or admin
CREATE POLICY "users_select" ON users FOR SELECT TO authenticated USING (true);
CREATE POLICY "users_update_self" ON users FOR UPDATE TO authenticated
  USING (id = auth.uid());
CREATE POLICY "users_update_admin" ON users FOR UPDATE TO authenticated
  USING (get_user_role() = 'admin');
CREATE POLICY "users_insert_admin" ON users FOR INSERT TO authenticated
  WITH CHECK (get_user_role() = 'admin' OR id = auth.uid());

-- Categories & Types: readable by all
CREATE POLICY "categories_select" ON contribution_categories FOR SELECT TO authenticated USING (true);
CREATE POLICY "types_select" ON contribution_types FOR SELECT TO authenticated USING (true);

-- Contributions:
-- employees see own + all verified
-- managers see own department
-- admins see all
CREATE POLICY "contributions_select_own" ON contributions FOR SELECT TO authenticated
  USING (
    user_id = auth.uid()
    OR status = 'verified'
    OR get_user_role() = 'admin'
    OR (get_user_role() = 'manager' AND user_id IN (
      SELECT id FROM users WHERE department_id = get_user_department_id()
    ))
  );
CREATE POLICY "contributions_insert" ON contributions FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid());
CREATE POLICY "contributions_update_own" ON contributions FOR UPDATE TO authenticated
  USING (user_id = auth.uid() AND status = 'pending');
CREATE POLICY "contributions_verify" ON contributions FOR UPDATE TO authenticated
  USING (
    get_user_role() IN ('manager', 'admin')
  );

-- Points: own or manager's team or admin
CREATE POLICY "points_select" ON points_transactions FOR SELECT TO authenticated
  USING (
    user_id = auth.uid()
    OR get_user_role() = 'admin'
    OR (get_user_role() = 'manager' AND user_id IN (
      SELECT id FROM users WHERE department_id = get_user_department_id()
    ))
  );

-- Badges: definitions readable by all, awards readable by all (public gamification)
CREATE POLICY "badge_defs_select" ON badge_definitions FOR SELECT TO authenticated USING (true);
CREATE POLICY "badge_defs_manage" ON badge_definitions FOR ALL TO authenticated
  USING (get_user_role() = 'admin');
CREATE POLICY "badge_awards_select" ON badge_awards FOR SELECT TO authenticated USING (true);

-- Activity log: readable by all (the feed is public)
CREATE POLICY "activity_select" ON activity_log FOR SELECT TO authenticated USING (true);
-- Projects table — represents client engagements / tasks
CREATE TABLE IF NOT EXISTS projects (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code            TEXT UNIQUE NOT NULL,       -- e.g. 'NT-2026-001'
  name_th         TEXT NOT NULL,
  name_en         TEXT,
  client_name     TEXT,                       -- e.g. 'National Telecom', 'ผู้ว่าฯ ภูเก็ต'
  description     TEXT,
  status          TEXT CHECK (status IN ('planning', 'active', 'completed', 'on_hold')) DEFAULT 'planning',
  priority        TEXT CHECK (priority IN ('low', 'medium', 'high', 'critical')) DEFAULT 'medium',
  team_id         TEXT,                       -- FK to team zone id (alpha, bravo, etc.)
  budget_thb      NUMERIC,                   -- Budget in THB
  start_date      DATE,
  end_date        DATE,
  progress_pct    INTEGER DEFAULT 0 CHECK (progress_pct >= 0 AND progress_pct <= 100),
  created_at      TIMESTAMPTZ DEFAULT now(),
  updated_at      TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_projects_team ON projects(team_id);
CREATE INDEX idx_projects_status ON projects(status);

-- Project tasks — subtasks within a project (for Gantt chart)
CREATE TABLE IF NOT EXISTS project_tasks (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id      UUID REFERENCES projects(id) ON DELETE CASCADE NOT NULL,
  name_th         TEXT NOT NULL,
  name_en         TEXT,
  assigned_to     UUID REFERENCES users(id),  -- Specific person
  status          TEXT CHECK (status IN ('todo', 'in_progress', 'done', 'blocked')) DEFAULT 'todo',
  start_date      DATE,
  end_date        DATE,
  duration_days   INTEGER,
  depends_on      UUID REFERENCES project_tasks(id), -- Task dependency
  sort_order      INTEGER DEFAULT 0,
  created_at      TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_project_tasks_project ON project_tasks(project_id);

-- Project assignments — which characters are assigned to which project
CREATE TABLE IF NOT EXISTS project_assignments (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id      UUID REFERENCES projects(id) ON DELETE CASCADE NOT NULL,
  user_id         UUID REFERENCES users(id) NOT NULL,
  role_in_project TEXT,                       -- e.g. 'lead', 'engineer', 'support'
  allocation_pct  INTEGER DEFAULT 100 CHECK (allocation_pct > 0 AND allocation_pct <= 100),
  assigned_at     TIMESTAMPTZ DEFAULT now(),
  UNIQUE(project_id, user_id)
);

-- Seed some TKC-realistic projects
INSERT INTO projects (code, name_th, name_en, client_name, status, priority, team_id, budget_thb, start_date, end_date, progress_pct) VALUES
  ('NT-2026-001', 'ระบบโครงข่าย 5G ภาคใต้',           '5G Network Southern Region',        'National Telecom',     'active',    'critical', 'alpha',   45000000, '2026-01-15', '2026-07-30', 42),
  ('PKT-2026-002', 'Smart City Platform ภูเก็ต',       'Phuket Smart City Platform',        'ผู้ว่าฯ ภูเก็ต',       'active',    'high',     'bravo',   28000000, '2026-02-01', '2026-08-31', 25),
  ('BRH-2026-003', 'ระบบ Smart Hospital บำรุงราษฎร์',  'Bumrungrad Smart Hospital',         'รพ.บำรุงราษฎร์',      'active',    'high',     'charlie', 15000000, '2026-03-01', '2026-09-30', 10),
  ('GOV-2026-004', 'ระบบ Cybersecurity กระทรวงมหาดไทย','MOI Cybersecurity System',          'กระทรวงมหาดไทย',      'planning',  'critical', 'delta',   32000000, '2026-04-01', '2026-12-31', 0),
  ('EDU-2026-005', 'แพลตฟอร์ม EduTech โรงเรียนนานาชาติ','International School EduTech',     'โรงเรียนนานาชาติกรุงเทพ', 'active', 'medium',   'echo',    8000000,  '2026-02-15', '2026-06-30', 55),
  ('DC-2026-006',  'Data Center Expansion เฟส 2',       'Data Center Expansion Phase 2',    'TKC Internal',         'active',    'medium',   'foxtrot', 20000000, '2026-01-01', '2026-06-30', 70);
-- Team metrics — tracked over time for each team
-- These are the 4 pillars: Compatibility, Productivity, Efficiency, Belonging
CREATE TABLE IF NOT EXISTS team_metrics (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  team_id         TEXT NOT NULL,              -- zone id (alpha, bravo, etc.)
  period_start    DATE NOT NULL,
  period_end      DATE NOT NULL,

  -- Compatibility (0-100): how well team members work together
  -- Derived from: attribute synergy, class diversity, conflict incidents
  compatibility   INTEGER CHECK (compatibility >= 0 AND compatibility <= 100),

  -- Productivity (0-100): output relative to capacity
  -- Derived from: tasks completed, contribution count, project progress
  productivity    INTEGER CHECK (productivity >= 0 AND productivity <= 100),

  -- Efficiency (0-100): output per resource unit
  -- Derived from: budget utilization, time-to-completion, rework rate
  efficiency      INTEGER CHECK (efficiency >= 0 AND efficiency <= 100),

  -- Belonging (0-100): qualitative sense of connection
  -- Derived from: pulse survey responses, streak days, community contributions
  belonging       INTEGER CHECK (belonging >= 0 AND belonging <= 100),

  notes           TEXT,
  created_at      TIMESTAMPTZ DEFAULT now(),
  UNIQUE(team_id, period_start)
);

CREATE INDEX idx_team_metrics_team ON team_metrics(team_id);
CREATE INDEX idx_team_metrics_period ON team_metrics(period_start);

-- Pulse survey — quick weekly check-in (qualitative but measurable)
CREATE TABLE IF NOT EXISTS pulse_surveys (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         UUID REFERENCES users(id) NOT NULL,
  team_id         TEXT,

  -- 1-5 scale questions
  energy          INTEGER CHECK (energy >= 1 AND energy <= 5),        -- "พลังงานในการทำงานสัปดาห์นี้เป็นอย่างไร?"
  belonging       INTEGER CHECK (belonging >= 1 AND belonging <= 5),  -- "รู้สึกเป็นส่วนหนึ่งของทีมแค่ไหน?"
  growth          INTEGER CHECK (growth >= 1 AND growth <= 5),        -- "ได้เรียนรู้อะไรใหม่ไหม?"
  support         INTEGER CHECK (support >= 1 AND support <= 5),      -- "ได้รับการสนับสนุนจากทีมเพียงพอไหม?"
  clarity         INTEGER CHECK (clarity >= 1 AND clarity <= 5),      -- "เข้าใจเป้าหมายของทีมชัดเจนไหม?"

  -- Open text (optional)
  highlight       TEXT,                       -- "สิ่งที่ดีที่สุดของสัปดาห์นี้"
  blocker         TEXT,                       -- "อะไรที่เป็นอุปสรรค"

  submitted_at    TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_pulse_user ON pulse_surveys(user_id);
CREATE INDEX idx_pulse_team ON pulse_surveys(team_id);
CREATE INDEX idx_pulse_date ON pulse_surveys(submitted_at DESC);

-- Seed historical team metrics (3 months of weekly data)
INSERT INTO team_metrics (team_id, period_start, period_end, compatibility, productivity, efficiency, belonging)
SELECT
  team_id,
  period_start,
  period_start + INTERVAL '7 days' AS period_end,
  -- Generate realistic-looking metrics with some variation
  GREATEST(30, LEAST(95, 60 + (RANDOM() * 30)::INTEGER - 10 + team_bonus)) AS compatibility,
  GREATEST(25, LEAST(95, 55 + (RANDOM() * 35)::INTEGER - 15 + team_bonus)) AS productivity,
  GREATEST(20, LEAST(95, 50 + (RANDOM() * 30)::INTEGER - 10 + team_bonus)) AS efficiency,
  GREATEST(30, LEAST(95, 58 + (RANDOM() * 25)::INTEGER - 8 + team_bonus)) AS belonging
FROM (
  SELECT
    t.team_id,
    t.team_bonus,
    generate_series('2026-01-06'::DATE, '2026-03-23'::DATE, '7 days'::INTERVAL)::DATE AS period_start
  FROM (VALUES
    ('alpha', 5), ('bravo', 0), ('charlie', -5),
    ('delta', 8), ('echo', 3), ('foxtrot', -3)
  ) AS t(team_id, team_bonus)
) sub;
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
-- ============================================================
-- Migration 012: Real TKC Organization Structure
-- Representative organization structure
-- ============================================================

-- Divisions (the 3 Deputy MD lines)
CREATE TABLE IF NOT EXISTS divisions (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code          TEXT UNIQUE NOT NULL,
  name_th       TEXT NOT NULL,
  name_en       TEXT NOT NULL,
  head_title_th TEXT,
  head_title_en TEXT,
  color         TEXT DEFAULT '#3B82F6',
  sort_order    INTEGER DEFAULT 0,
  created_at    TIMESTAMPTZ DEFAULT now()
);

-- Add division_id to departments
ALTER TABLE departments ADD COLUMN IF NOT EXISTS division_id UUID REFERENCES divisions(id);
ALTER TABLE departments ADD COLUMN IF NOT EXISTS sort_order INTEGER DEFAULT 0;

-- Add role_level and tenure to users
DO $$ BEGIN
  CREATE TYPE role_level AS ENUM ('md', 'deputy_md', 'director', 'manager', 'senior', 'staff');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

ALTER TABLE users ADD COLUMN IF NOT EXISTS role_level role_level DEFAULT 'staff';
ALTER TABLE users ADD COLUMN IF NOT EXISTS tenure_years INTEGER DEFAULT 0;
ALTER TABLE users ADD COLUMN IF NOT EXISTS division_id UUID REFERENCES divisions(id);

-- ============================================================
-- SEED: Divisions
-- ============================================================

INSERT INTO divisions (code, name_th, name_en, head_title_th, head_title_en, color, sort_order) VALUES
  ('SALES_MKT',  'สายงานขายและการตลาด',        'Sales & Marketing',   'รอง กจก. สายงานขายและการตลาด',        'Deputy MD — Sales & Marketing',   '#2563EB', 1),
  ('OPERATIONS', 'สายงานปฏิบัติการ',            'Operations',          'รอง กจก. สายงานปฏิบัติการ',            'Deputy MD — Operations',          '#DC2626', 2),
  ('FINANCE',    'สายงานการเงินและบัญชี',        'Finance & Admin',     'รอง กจก. สายงานการเงินและบัญชี',        'Deputy MD — Finance & Accounting','#059669', 3)
ON CONFLICT (code) DO NOTHING;

-- ============================================================
-- SEED: Real TKC Departments (replace old 8 with real 12)
-- ============================================================

-- First, update existing departments or insert new ones
-- Sales & Marketing Division
INSERT INTO departments (code, name_th, name_en, color) VALUES
  ('SALES',      'ฝ่ายขาย',                     'Sales',                '#3B82F6'),
  ('BIZ_DEV',    'ฝ่ายพัฒนาธุรกิจ',              'Business Development', '#60A5FA')
ON CONFLICT (code) DO UPDATE SET name_th = EXCLUDED.name_th, name_en = EXCLUDED.name_en, color = EXCLUDED.color;

-- Operations Division
INSERT INTO departments (code, name_th, name_en, color) VALUES
  ('NET_DEL',    'ฝ่ายเน็ตเวิร์กดิลิเวอรี่',         'Network Delivery',    '#EF4444'),
  ('ENTERPRISE', 'ฝ่ายธุรกิจองค์กร',              'Enterprise Business',  '#F87171'),
  ('PUB_SAFETY', 'ฝ่ายความปลอดภัยสาธารณะ',       'Public Safety',        '#DC2626'),
  ('DIGITAL',    'ฝ่ายบริการดิจิทัล',             'Digital Services',     '#FB923C')
ON CONFLICT (code) DO UPDATE SET name_th = EXCLUDED.name_th, name_en = EXCLUDED.name_en, color = EXCLUDED.color;

-- Finance & Admin Division
INSERT INTO departments (code, name_th, name_en, color) VALUES
  ('FINANCE_D',  'ฝ่ายการเงิน',                  'Finance',              '#10B981'),
  ('ACCT',       'ฝ่ายบัญชี',                    'Accounting',           '#34D399'),
  ('PROCURE',    'ฝ่ายจัดซื้อจัดจ้าง',            'Procurement',          '#6EE7B7'),
  ('HR_ADMIN',   'ฝ่ายทรัพยากรบุคคลและธุรการ',     'HR & Admin',           '#F59E0B'),
  ('IT',         'ฝ่ายเทคโนโลยีสารสนเทศ',        'IT',                   '#8B5CF6'),
  ('CORP_ADM',   'ฝ่ายบริหารองค์กร',              'Corporate Admin',      '#6B7280')
ON CONFLICT (code) DO UPDATE SET name_th = EXCLUDED.name_th, name_en = EXCLUDED.name_en, color = EXCLUDED.color;

-- Link departments to divisions
UPDATE departments SET division_id = (SELECT id FROM divisions WHERE code = 'SALES_MKT')
  WHERE code IN ('SALES', 'BIZ_DEV');
UPDATE departments SET division_id = (SELECT id FROM divisions WHERE code = 'OPERATIONS')
  WHERE code IN ('NET_DEL', 'ENTERPRISE', 'PUB_SAFETY', 'DIGITAL');
UPDATE departments SET division_id = (SELECT id FROM divisions WHERE code = 'FINANCE')
  WHERE code IN ('FINANCE_D', 'ACCT', 'PROCURE', 'HR_ADMIN', 'IT', 'CORP_ADM');

-- ============================================================
-- INDEX
-- ============================================================
CREATE INDEX IF NOT EXISTS idx_departments_division ON departments(division_id);
CREATE INDEX IF NOT EXISTS idx_users_division ON users(division_id);
CREATE INDEX IF NOT EXISTS idx_users_role_level ON users(role_level);
-- ============================================================
-- Migration 013: Consultant Data Collection
-- Supports Dr. Non's embedded ethnography work at TKC
-- ============================================================

-- Observations — field notes from shadowing, meetings, informal encounters
CREATE TABLE IF NOT EXISTS observations (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  observer_id       UUID REFERENCES users(id) NOT NULL,
  subject_user_id   UUID REFERENCES users(id),
  subject_team_id   TEXT,
  observation_type  TEXT NOT NULL CHECK (observation_type IN (
    'interview', 'shadow', 'meeting', 'informal', 'workshop', 'town_hall'
  )),
  content           TEXT NOT NULL,
  tags              TEXT[] DEFAULT '{}',
  sentiment         TEXT CHECK (sentiment IN ('positive', 'neutral', 'negative', 'mixed')),
  credo_signals     JSONB DEFAULT '{}', -- {belonging: "high", purpose: "unclear", ...}
  is_confidential   BOOLEAN DEFAULT false,
  observed_at       TIMESTAMPTZ NOT NULL,
  created_at        TIMESTAMPTZ DEFAULT now()
);

-- Interview Records — structured interview data
CREATE TABLE IF NOT EXISTS interview_records (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  interviewer_id    UUID REFERENCES users(id) NOT NULL,
  interviewee_id    UUID REFERENCES users(id),
  interviewee_name  TEXT, -- for non-employee interviews (candidates, clients)
  interview_type    TEXT NOT NULL CHECK (interview_type IN (
    'one_on_one', 'group', 'exit', 'onboarding', 'stakeholder', 'client'
  )),
  key_findings      TEXT[] DEFAULT '{}',
  pain_points       TEXT[] DEFAULT '{}',
  opportunities     TEXT[] DEFAULT '{}',
  quotes            TEXT[] DEFAULT '{}', -- notable direct quotes
  credo_signals     JSONB DEFAULT '{}',
  four_c_signals    JSONB DEFAULT '{}', -- {cause: "strong", career: "blocked", ...}
  duration_minutes  INTEGER,
  is_recorded       BOOLEAN DEFAULT false,
  transcript_url    TEXT,
  conducted_at      TIMESTAMPTZ NOT NULL,
  created_at        TIMESTAMPTZ DEFAULT now()
);

-- Process Maps — observed workflows and their pain points
CREATE TABLE IF NOT EXISTS process_maps (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  department_id     UUID REFERENCES departments(id),
  division_id       UUID REFERENCES divisions(id),
  process_name_th   TEXT NOT NULL,
  process_name_en   TEXT,
  current_state     TEXT, -- description of how it works now
  pain_points       TEXT[] DEFAULT '{}',
  improvement_ideas TEXT[] DEFAULT '{}',
  stakeholders      TEXT[] DEFAULT '{}',
  complexity        TEXT CHECK (complexity IN ('simple', 'moderate', 'complex', 'chaotic')),
  ai_potential      TEXT CHECK (ai_potential IN ('none', 'low', 'medium', 'high', 'transformative')),
  mapped_by         UUID REFERENCES users(id),
  mapped_at         TIMESTAMPTZ DEFAULT now(),
  created_at        TIMESTAMPTZ DEFAULT now()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_observations_observer ON observations(observer_id);
CREATE INDEX IF NOT EXISTS idx_observations_subject ON observations(subject_user_id);
CREATE INDEX IF NOT EXISTS idx_observations_type ON observations(observation_type);
CREATE INDEX IF NOT EXISTS idx_observations_date ON observations(observed_at);
CREATE INDEX IF NOT EXISTS idx_interviews_interviewer ON interview_records(interviewer_id);
CREATE INDEX IF NOT EXISTS idx_interviews_interviewee ON interview_records(interviewee_id);
CREATE INDEX IF NOT EXISTS idx_process_maps_dept ON process_maps(department_id);

-- RLS
ALTER TABLE observations ENABLE ROW LEVEL SECURITY;
ALTER TABLE interview_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE process_maps ENABLE ROW LEVEL SECURITY;

-- Only consultants (admin role) and managers can see observations
CREATE POLICY "Admins can manage observations" ON observations
  FOR ALL USING (get_user_role() = 'admin');
CREATE POLICY "Managers can view non-confidential observations" ON observations
  FOR SELECT USING (get_user_role() = 'manager' AND NOT is_confidential);

CREATE POLICY "Admins can manage interviews" ON interview_records
  FOR ALL USING (get_user_role() = 'admin');

CREATE POLICY "Admins can manage process maps" ON process_maps
  FOR ALL USING (get_user_role() = 'admin');
CREATE POLICY "All authenticated can view process maps" ON process_maps
  FOR SELECT USING (auth.uid() IS NOT NULL);
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
-- ============================================================
-- Migration 015: Knowledge Management
-- The company's second brain — not just a report repository,
-- a living knowledge graph that compounds over time.
-- ============================================================

CREATE TABLE IF NOT EXISTS knowledge_entries (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  author_id             UUID REFERENCES users(id) NOT NULL,
  entry_type            TEXT NOT NULL CHECK (entry_type IN (
    'share', 'interview_note', 'retrospective', 'observation',
    'idea', 'lesson', 'template', 'how_to', 'case_study'
  )),
  title_th              TEXT NOT NULL,
  title_en              TEXT,
  content               TEXT NOT NULL, -- markdown
  summary               TEXT, -- AI-generated summary
  tags                  TEXT[] DEFAULT '{}',
  related_project_id    UUID REFERENCES projects(id),
  related_department_id UUID REFERENCES departments(id),
  related_division_id   UUID REFERENCES divisions(id),
  visibility            TEXT CHECK (visibility IN ('public', 'team', 'private', 'consultant_only')) DEFAULT 'public',
  -- Engagement tracking
  view_count            INTEGER DEFAULT 0,
  helpful_count         INTEGER DEFAULT 0, -- "this was useful" clicks
  -- Points for knowledge sharing (the Knowledge Compounding system)
  points_awarded        INTEGER DEFAULT 0,
  created_at            TIMESTAMPTZ DEFAULT now(),
  updated_at            TIMESTAMPTZ DEFAULT now()
);

-- Knowledge connections — how entries relate to each other
CREATE TABLE IF NOT EXISTS knowledge_links (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  source_id     UUID REFERENCES knowledge_entries(id) ON DELETE CASCADE NOT NULL,
  target_id     UUID REFERENCES knowledge_entries(id) ON DELETE CASCADE NOT NULL,
  link_type     TEXT CHECK (link_type IN (
    'relates_to', 'builds_on', 'contradicts', 'supersedes', 'inspired_by'
  )) NOT NULL,
  created_by    UUID REFERENCES users(id),
  created_at    TIMESTAMPTZ DEFAULT now(),
  UNIQUE(source_id, target_id, link_type)
);

-- Knowledge helpfulness — who found what useful
CREATE TABLE IF NOT EXISTS knowledge_reactions (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  entry_id      UUID REFERENCES knowledge_entries(id) ON DELETE CASCADE NOT NULL,
  user_id       UUID REFERENCES users(id) NOT NULL,
  reaction      TEXT CHECK (reaction IN ('helpful', 'bookmark', 'applied')) NOT NULL,
  created_at    TIMESTAMPTZ DEFAULT now(),
  UNIQUE(entry_id, user_id, reaction)
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_knowledge_author ON knowledge_entries(author_id);
CREATE INDEX IF NOT EXISTS idx_knowledge_type ON knowledge_entries(entry_type);
CREATE INDEX IF NOT EXISTS idx_knowledge_tags ON knowledge_entries USING GIN(tags);
CREATE INDEX IF NOT EXISTS idx_knowledge_project ON knowledge_entries(related_project_id);
CREATE INDEX IF NOT EXISTS idx_knowledge_created ON knowledge_entries(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_knowledge_links_source ON knowledge_links(source_id);
CREATE INDEX IF NOT EXISTS idx_knowledge_links_target ON knowledge_links(target_id);

-- RLS
ALTER TABLE knowledge_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE knowledge_links ENABLE ROW LEVEL SECURITY;
ALTER TABLE knowledge_reactions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public entries visible to all" ON knowledge_entries
  FOR SELECT USING (visibility = 'public' AND auth.uid() IS NOT NULL);
CREATE POLICY "Private entries visible to author" ON knowledge_entries
  FOR SELECT USING (visibility = 'private' AND auth.uid() = author_id);
CREATE POLICY "Consultant entries visible to admins" ON knowledge_entries
  FOR SELECT USING (visibility = 'consultant_only' AND get_user_role() = 'admin');
CREATE POLICY "Authors can manage own entries" ON knowledge_entries
  FOR ALL USING (auth.uid() = author_id);
CREATE POLICY "Admins can manage all entries" ON knowledge_entries
  FOR ALL USING (get_user_role() = 'admin');

CREATE POLICY "Authenticated can view links" ON knowledge_links
  FOR SELECT USING (auth.uid() IS NOT NULL);
CREATE POLICY "Authors and admins can manage links" ON knowledge_links
  FOR ALL USING (auth.uid() = created_by OR get_user_role() = 'admin');

CREATE POLICY "Users can manage own reactions" ON knowledge_reactions
  FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "All can view reactions" ON knowledge_reactions
  FOR SELECT USING (auth.uid() IS NOT NULL);

-- Trigger: increment helpful_count
CREATE OR REPLACE FUNCTION fn_update_knowledge_helpful_count()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.reaction = 'helpful' THEN
    UPDATE knowledge_entries SET helpful_count = helpful_count + 1 WHERE id = NEW.entry_id;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_knowledge_reaction_insert
  AFTER INSERT ON knowledge_reactions
  FOR EACH ROW EXECUTE FUNCTION fn_update_knowledge_helpful_count();
-- ============================================================
-- Migration 016: Peer Recognition
-- Small, frequent, Kahneman-approved: many small rewards > few large ones.
-- Tied to the 4C framework so every recognition reinforces the Credo.
-- ============================================================

CREATE TABLE IF NOT EXISTS recognitions (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  from_user_id      UUID REFERENCES users(id) NOT NULL,
  to_user_id        UUID REFERENCES users(id) NOT NULL,
  category_code     TEXT NOT NULL CHECK (category_code IN ('cause', 'career', 'compensation', 'community')),
  message           TEXT NOT NULL,
  message_th        TEXT, -- optional Thai version
  points_awarded    INTEGER DEFAULT 5, -- small but meaningful
  is_public         BOOLEAN DEFAULT true,
  created_at        TIMESTAMPTZ DEFAULT now(),
  -- Prevent self-recognition
  CHECK (from_user_id != to_user_id)
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_recognitions_from ON recognitions(from_user_id);
CREATE INDEX IF NOT EXISTS idx_recognitions_to ON recognitions(to_user_id);
CREATE INDEX IF NOT EXISTS idx_recognitions_category ON recognitions(category_code);
CREATE INDEX IF NOT EXISTS idx_recognitions_created ON recognitions(created_at DESC);

-- RLS
ALTER TABLE recognitions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can give recognition" ON recognitions
  FOR INSERT WITH CHECK (auth.uid() = from_user_id);
CREATE POLICY "Public recognition visible to all" ON recognitions
  FOR SELECT USING (is_public AND auth.uid() IS NOT NULL);
CREATE POLICY "Private recognition visible to participants" ON recognitions
  FOR SELECT USING (NOT is_public AND (auth.uid() = from_user_id OR auth.uid() = to_user_id));
CREATE POLICY "Admins can view all" ON recognitions
  FOR SELECT USING (get_user_role() = 'admin');

-- Trigger: award points to recipient and log activity
CREATE OR REPLACE FUNCTION fn_recognition_awarded()
RETURNS TRIGGER AS $$
BEGIN
  -- Award points to recipient
  INSERT INTO points_transactions (user_id, amount, type, reference_id, description_en, description_th)
  VALUES (
    NEW.to_user_id,
    NEW.points_awarded,
    'contribution',
    NEW.id,
    'Peer recognition from colleague',
    'ได้รับการชื่นชมจากเพื่อนร่วมงาน'
  );

  -- Log activity
  INSERT INTO activity_log (user_id, action, entity_type, entity_id, metadata)
  VALUES (
    NEW.from_user_id,
    'recognition_given',
    'recognition',
    NEW.id,
    jsonb_build_object('to_user_id', NEW.to_user_id, 'category', NEW.category_code, 'points', NEW.points_awarded)
  );

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_recognition_insert
  AFTER INSERT ON recognitions
  FOR EACH ROW EXECUTE FUNCTION fn_recognition_awarded();
-- ============================================================
-- Migration 017: Financial Snapshots
-- Quarterly financial data feeds the Market panel.
-- Everyone in the company should understand the conditions.
-- ============================================================

CREATE TABLE IF NOT EXISTS financial_snapshots (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  period                TEXT NOT NULL UNIQUE, -- 'Q1_2025', 'Q2_2025', 'FY2025', etc.
  period_type           TEXT CHECK (period_type IN ('quarterly', 'annual')) NOT NULL,
  fiscal_year           INTEGER NOT NULL,

  -- Income Statement
  revenue_thb           NUMERIC,
  cost_of_sales_thb     NUMERIC,
  gross_profit_thb      NUMERIC,
  gross_margin_pct      NUMERIC,
  operating_expenses_thb NUMERIC,
  net_profit_thb        NUMERIC,
  net_margin_pct        NUMERIC,
  eps_thb               NUMERIC,

  -- Revenue breakdown
  revenue_project_thb   NUMERIC,
  revenue_services_thb  NUMERIC,
  revenue_sales_thb     NUMERIC,
  revenue_other_thb     NUMERIC,

  -- Balance Sheet
  total_assets_thb      NUMERIC,
  total_liabilities_thb NUMERIC,
  total_equity_thb      NUMERIC,
  cash_thb              NUMERIC,
  total_debt_thb        NUMERIC,

  -- Cash Flow
  operating_cf_thb      NUMERIC,
  investing_cf_thb      NUMERIC,
  financing_cf_thb      NUMERIC,

  -- Market
  stock_price_thb       NUMERIC,
  pe_ratio              NUMERIC,
  pb_ratio              NUMERIC,
  market_cap_thb        NUMERIC,
  dividend_yield_pct    NUMERIC,

  -- Key Ratios
  roe_pct               NUMERIC,
  roa_pct               NUMERIC,
  debt_to_equity        NUMERIC,
  current_ratio         NUMERIC,

  -- People metrics (if available)
  employee_count        INTEGER,
  revenue_per_employee  NUMERIC,
  employee_cost_thb     NUMERIC,

  -- Notes
  notes                 TEXT,
  source                TEXT DEFAULT 'company filing',
  created_at            TIMESTAMPTZ DEFAULT now()
);

-- Seed with representative placeholder data
INSERT INTO financial_snapshots (period, period_type, fiscal_year,
  revenue_thb, gross_profit_thb, gross_margin_pct, net_profit_thb, net_margin_pct, eps_thb,
  total_assets_thb, cash_thb, total_debt_thb,
  operating_cf_thb,
  stock_price_thb, pe_ratio, pb_ratio, market_cap_thb, dividend_yield_pct,
  employee_cost_thb,
  notes
) VALUES
-- FY2025 (representative)
('FY2025', 'annual', 2025,
  1780000000, 195000000, 10.96, 135000000, 7.58, 0.38,
  4800000000, 110000000, 1230000000,
  -72000000,
  8.50, 15.20, 0.68, 2800000000, 2.10,
  85000000,
  'Revenue declined YoY. Gross margin under pressure. Associate profit masks weak core ops. Debt expanded significantly.'
),
-- FY2024 (representative)
('FY2024', 'annual', 2024,
  1850000000, 310000000, 16.76, 165000000, 8.92, 0.46,
  4200000000, 240000000, 580000000,
  NULL,
  8.80, NULL, NULL, NULL, NULL,
  68000000,
  'Stable year. Services revenue dominant.'
),
-- Q3 2025 (representative quarterly)
('Q3_2025', 'quarterly', 2025,
  438000000, 54750000, 12.50, 42000000, 9.59, NULL,
  NULL, NULL, NULL,
  NULL,
  8.50, 15.20, 0.68, 2800000000, 2.10,
  NULL,
  'Revenue growth QoQ from short-term project delivery. Margin pressure from cost escalation.'
)
ON CONFLICT (period) DO NOTHING;

-- Index
CREATE INDEX IF NOT EXISTS idx_financial_period ON financial_snapshots(fiscal_year, period_type);

-- RLS — everyone can see financials (public company data)
ALTER TABLE financial_snapshots ENABLE ROW LEVEL SECURITY;
CREATE POLICY "All authenticated can view financials" ON financial_snapshots
  FOR SELECT USING (auth.uid() IS NOT NULL);
CREATE POLICY "Admins can manage financials" ON financial_snapshots
  FOR ALL USING (get_user_role() = 'admin');
-- ============================================================
-- Migration 018: Capability Heatmap & Skills
-- Beyond RPG attributes — track actual, validated skills.
-- The Moneyball layer: find undervalued talent through data.
-- ============================================================

-- Individual skill assessments
CREATE TABLE IF NOT EXISTS skill_assessments (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         UUID REFERENCES users(id) NOT NULL,
  skill_name      TEXT NOT NULL,
  skill_category  TEXT CHECK (skill_category IN (
    'technical', 'leadership', 'domain', 'tool', 'soft_skill', 'certification'
  )) DEFAULT 'technical',
  proficiency     INTEGER NOT NULL CHECK (proficiency >= 1 AND proficiency <= 5),
  -- 1=Awareness, 2=Beginner, 3=Competent, 4=Proficient, 5=Expert
  source          TEXT CHECK (source IN (
    'self', 'peer', 'manager', 'certification', 'project', 'assessment'
  )) DEFAULT 'self',
  validated_by    UUID REFERENCES users(id),
  evidence_url    TEXT,
  notes           TEXT,
  assessed_at     TIMESTAMPTZ DEFAULT now(),
  expires_at      TIMESTAMPTZ, -- some skills decay (certifications expire)
  UNIQUE(user_id, skill_name, source)
);

-- Skill adjacency map — which skills are close to each other
-- Used for reskilling path recommendations
CREATE TABLE IF NOT EXISTS skill_adjacencies (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  skill_a         TEXT NOT NULL,
  skill_b         TEXT NOT NULL,
  transition_ease NUMERIC(3,2) NOT NULL CHECK (transition_ease >= 0 AND transition_ease <= 1),
  -- 1.0 = trivial transition, 0.0 = completely unrelated
  notes           TEXT,
  UNIQUE(skill_a, skill_b)
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_skills_user ON skill_assessments(user_id);
CREATE INDEX IF NOT EXISTS idx_skills_name ON skill_assessments(skill_name);
CREATE INDEX IF NOT EXISTS idx_skills_category ON skill_assessments(skill_category);
CREATE INDEX IF NOT EXISTS idx_skill_adj_a ON skill_adjacencies(skill_a);
CREATE INDEX IF NOT EXISTS idx_skill_adj_b ON skill_adjacencies(skill_b);

-- RLS
ALTER TABLE skill_assessments ENABLE ROW LEVEL SECURITY;
ALTER TABLE skill_adjacencies ENABLE ROW LEVEL SECURITY;

-- Users see own skills, managers see team, admin sees all
CREATE POLICY "Users can manage own skills" ON skill_assessments
  FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "Managers can view team skills" ON skill_assessments
  FOR SELECT USING (
    get_user_role() = 'manager'
    AND user_id IN (SELECT id FROM users WHERE department_id = get_user_department_id())
  );
CREATE POLICY "Admins can manage all skills" ON skill_assessments
  FOR ALL USING (get_user_role() = 'admin');

CREATE POLICY "All can view adjacencies" ON skill_adjacencies
  FOR SELECT USING (auth.uid() IS NOT NULL);
CREATE POLICY "Admins can manage adjacencies" ON skill_adjacencies
  FOR ALL USING (get_user_role() = 'admin');

-- Seed some skill adjacencies relevant to TKC
INSERT INTO skill_adjacencies (skill_a, skill_b, transition_ease, notes) VALUES
  ('Network Engineering', 'Cybersecurity', 0.75, 'Strong overlap in infrastructure knowledge'),
  ('Network Engineering', 'Cloud Architecture', 0.60, 'Networking fundamentals transfer'),
  ('Cybersecurity', 'Penetration Testing', 0.85, 'Direct specialization'),
  ('Software Development', 'DevOps', 0.65, 'Code skills transfer to infrastructure-as-code'),
  ('Software Development', 'Data Engineering', 0.55, 'Programming transfers, domain differs'),
  ('UX Design', 'Product Management', 0.60, 'User-centric thinking transfers'),
  ('UX Design', 'Frontend Development', 0.45, 'Design-to-code gap'),
  ('Project Management', 'Product Management', 0.55, 'Delivery skills overlap, strategy differs'),
  ('Sales', 'Business Development', 0.80, 'Client-facing skills directly transfer'),
  ('Sales', 'Account Management', 0.70, 'Relationship skills transfer'),
  ('Accounting', 'Financial Analysis', 0.75, 'Numbers foundation transfers'),
  ('IT Support', 'System Administration', 0.70, 'Hands-on infra knowledge'),
  ('IoT', 'Network Engineering', 0.60, 'Connected device + networking'),
  ('AI/ML', 'Data Engineering', 0.55, 'Data pipeline skills overlap'),
  ('Cloud Architecture', 'DevOps', 0.70, 'Infrastructure management overlap')
ON CONFLICT (skill_a, skill_b) DO NOTHING;

-- View: Org capability heatmap
CREATE OR REPLACE VIEW v_capability_heatmap AS
SELECT
  d.code AS dept_code,
  d.name_en AS dept_name,
  sa.skill_name,
  sa.skill_category,
  COUNT(DISTINCT sa.user_id) AS people_count,
  ROUND(AVG(sa.proficiency), 1) AS avg_proficiency,
  MAX(sa.proficiency) AS max_proficiency
FROM skill_assessments sa
JOIN users u ON u.id = sa.user_id AND u.is_active = true
JOIN departments d ON d.id = u.department_id
GROUP BY d.code, d.name_en, sa.skill_name, sa.skill_category;
