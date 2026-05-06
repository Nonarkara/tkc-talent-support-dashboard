-- Quests (projects as "fixtures") + quest_members (roster assignment per role slot).
-- role_slots: [{ key, label, priority_dims: [dim_key,...], min_score }, ...]

CREATE TABLE IF NOT EXISTS quests (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code          text UNIQUE NOT NULL,          -- 'SMART_CITY_SAAS_26Q2'
  title         text NOT NULL,
  description   text DEFAULT '',
  cycle         text NOT NULL DEFAULT '2026-Q2',
  dept_code     text,                          -- owning dept
  status        text NOT NULL DEFAULT 'active', -- active / scouting / shipped / dropped
  revenue_m     numeric(12,2),                 -- THB M revenue impact if applicable
  target_date   date,
  role_slots    jsonb NOT NULL DEFAULT '[]'::jsonb,
  notes         text DEFAULT '',
  created_at    timestamptz NOT NULL DEFAULT now(),
  updated_at    timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_quests_cycle_status ON quests (cycle, status);
CREATE INDEX IF NOT EXISTS idx_quests_dept ON quests (dept_code);

CREATE TABLE IF NOT EXISTS quest_members (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  quest_id      uuid NOT NULL REFERENCES quests(id) ON DELETE CASCADE,
  employee_id   uuid NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
  slot_key      text NOT NULL,                 -- matches role_slots[].key
  note          text DEFAULT '',
  created_at    timestamptz NOT NULL DEFAULT now(),
  UNIQUE (quest_id, slot_key)                  -- one person per slot
);

CREATE INDEX IF NOT EXISTS idx_qm_quest ON quest_members (quest_id);
CREATE INDEX IF NOT EXISTS idx_qm_emp   ON quest_members (employee_id);
