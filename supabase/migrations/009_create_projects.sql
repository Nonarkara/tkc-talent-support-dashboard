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
