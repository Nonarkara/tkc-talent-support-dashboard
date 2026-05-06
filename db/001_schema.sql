-- ============================================================
-- TKC Talent Dashboard — Neon PostgreSQL Schema (MVP)
-- Clean migration: no Supabase auth, no RLS, plain Postgres 15+
-- ============================================================

-- ─── DIVISIONS ──────────────────────────────────────────────
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

-- ─── DEPARTMENTS ────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS departments (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code          TEXT UNIQUE NOT NULL,
  name_th       TEXT NOT NULL,
  name_en       TEXT NOT NULL,
  division_id   UUID REFERENCES divisions(id),
  head_user_id  UUID,  -- FK added after employees table
  color         TEXT DEFAULT '#3B82F6',
  sort_order    INTEGER DEFAULT 0,
  created_at    TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_departments_division ON departments(division_id);

-- ─── EMPLOYEES ──────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS employees (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_code   TEXT UNIQUE,                -- internal ID like "s1", "bd2"
  full_name_th    TEXT NOT NULL,
  full_name_en    TEXT,
  nickname        TEXT,
  email           TEXT,                        -- not unique: shared mailboxes, missing emails
  department_id   UUID REFERENCES departments(id),
  division_id     UUID REFERENCES divisions(id),
  role_level      TEXT CHECK (role_level IN ('md','deputy_md','director','manager','senior','staff')) DEFAULT 'staff',
  title_th        TEXT,
  title_en        TEXT,
  salary_thb      NUMERIC,                   -- monthly salary in Thai Baht
  skills          TEXT[] DEFAULT '{}',
  level           INTEGER DEFAULT 1 CHECK (level >= 1 AND level <= 20),
  tenure_years    INTEGER DEFAULT 0,
  total_points    INTEGER DEFAULT 0,
  streak_days     INTEGER DEFAULT 0,
  is_active       BOOLEAN DEFAULT true,
  joined_at       DATE,
  created_at      TIMESTAMPTZ DEFAULT now(),
  updated_at      TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_employees_dept ON employees(department_id);
CREATE INDEX IF NOT EXISTS idx_employees_division ON employees(division_id);
CREATE INDEX IF NOT EXISTS idx_employees_role ON employees(role_level);
CREATE INDEX IF NOT EXISTS idx_employees_active ON employees(is_active) WHERE is_active = true;

-- FK for department head
ALTER TABLE departments
  ADD CONSTRAINT fk_dept_head
  FOREIGN KEY (head_user_id) REFERENCES employees(id);

-- Auto-update updated_at
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER tr_employees_updated_at
  BEFORE UPDATE ON employees
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at();

-- ─── EMPLOYEE ATTRIBUTES (RPG stats) ───────────────────────
CREATE TABLE IF NOT EXISTS employee_attributes (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id     UUID REFERENCES employees(id) ON DELETE CASCADE NOT NULL UNIQUE,
  str             INTEGER NOT NULL DEFAULT 10 CHECK (str >= 1 AND str <= 20),
  int             INTEGER NOT NULL DEFAULT 10 CHECK (int >= 1 AND int <= 20),
  wis             INTEGER NOT NULL DEFAULT 10 CHECK (wis >= 1 AND wis <= 20),
  cha             INTEGER NOT NULL DEFAULT 10 CHECK (cha >= 1 AND cha <= 20),
  dex             INTEGER NOT NULL DEFAULT 10 CHECK (dex >= 1 AND dex <= 20),
  con             INTEGER NOT NULL DEFAULT 10 CHECK (con >= 1 AND con <= 20),
  rpg_class       TEXT,
  notes           TEXT,
  updated_at      TIMESTAMPTZ DEFAULT now()
);

-- ─── PROJECTS ───────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS projects (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code            TEXT UNIQUE NOT NULL,
  name            TEXT NOT NULL,
  client_name     TEXT,
  description     TEXT,
  division_id     UUID REFERENCES divisions(id),
  department_id   UUID REFERENCES departments(id),
  status          TEXT CHECK (status IN ('planning','active','completed','on_hold')) DEFAULT 'planning',
  priority        TEXT CHECK (priority IN ('low','medium','high','critical')) DEFAULT 'medium',
  budget_thb      NUMERIC,
  monthly_ceiling NUMERIC,
  gross_margin_pct NUMERIC,
  required_skills TEXT[] DEFAULT '{}',
  team_size       INTEGER DEFAULT 5,
  progress_pct    INTEGER DEFAULT 0 CHECK (progress_pct >= 0 AND progress_pct <= 100),
  start_date      DATE,
  end_date        DATE,
  created_at      TIMESTAMPTZ DEFAULT now(),
  updated_at      TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_projects_status ON projects(status);
CREATE INDEX IF NOT EXISTS idx_projects_priority ON projects(priority);

CREATE TRIGGER tr_projects_updated_at
  BEFORE UPDATE ON projects
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at();

-- ─── TEAM COMPOSITIONS ─────────────────────────────────────
-- Saves the coach + players assignment for each project
CREATE TABLE IF NOT EXISTS team_compositions (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id      UUID REFERENCES projects(id) ON DELETE CASCADE NOT NULL,
  coach_id        UUID REFERENCES employees(id),
  player_ids      UUID[] DEFAULT '{}',
  formation       TEXT CHECK (formation IN ('442','3511')) DEFAULT '442',
  selector_mode   TEXT CHECK (selector_mode IN ('director','hr')) DEFAULT 'director',
  -- Scores at time of save
  fit_pct         INTEGER,
  chemistry_score INTEGER,
  overall_score   INTEGER,
  insights        TEXT[],
  created_at      TIMESTAMPTZ DEFAULT now(),
  updated_at      TIMESTAMPTZ DEFAULT now(),
  UNIQUE(project_id)
);

CREATE TRIGGER tr_team_compositions_updated_at
  BEFORE UPDATE ON team_compositions
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at();

-- ─── TEAM SNAPSHOTS ─────────────────────────────────────────
-- Historical record of team compositions and their scores
CREATE TABLE IF NOT EXISTS team_snapshots (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id      UUID REFERENCES projects(id) ON DELETE CASCADE,
  coach_id        UUID REFERENCES employees(id),
  player_ids      UUID[],
  member_count    INTEGER,
  fit_pct         INTEGER,
  chemistry_score INTEGER,
  overall_score   INTEGER,
  formation       TEXT,
  insights        TEXT[],
  trigger_event   TEXT,       -- 'manual_save', 'member_added', 'member_removed'
  snapshot_at     TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_snapshots_project ON team_snapshots(project_id);
CREATE INDEX IF NOT EXISTS idx_snapshots_date ON team_snapshots(snapshot_at DESC);

-- ─── SKILL ASSESSMENTS ──────────────────────────────────────
CREATE TABLE IF NOT EXISTS skill_assessments (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id     UUID REFERENCES employees(id) ON DELETE CASCADE NOT NULL,
  skill_name      TEXT NOT NULL,
  proficiency     INTEGER NOT NULL CHECK (proficiency >= 1 AND proficiency <= 5),
  source          TEXT CHECK (source IN ('self','manager','peer','assessment','system')) DEFAULT 'system',
  evidence_url    TEXT,
  assessed_at     TIMESTAMPTZ DEFAULT now(),
  UNIQUE(employee_id, skill_name, source)
);

CREATE INDEX IF NOT EXISTS idx_skills_employee ON skill_assessments(employee_id);
CREATE INDEX IF NOT EXISTS idx_skills_name ON skill_assessments(skill_name);

-- ─── MIGRATIONS TRACKING ────────────────────────────────────
CREATE TABLE IF NOT EXISTS _migrations (
  id              SERIAL PRIMARY KEY,
  name            TEXT UNIQUE NOT NULL,
  applied_at      TIMESTAMPTZ DEFAULT now()
);
