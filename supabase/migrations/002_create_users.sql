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
