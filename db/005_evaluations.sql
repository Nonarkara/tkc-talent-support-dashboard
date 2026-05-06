-- Unified 12-dimension evaluation system
-- Each (employee, dimension, rater_type, cycle) gets one row.

CREATE TABLE IF NOT EXISTS evaluation_dimensions (
  key         text PRIMARY KEY,             -- 'str', 'int', 'cause', 'delivery', etc.
  dim_group   text NOT NULL,                -- 'execution' | 'engagement' | 'outcomes'
  label_en    text NOT NULL,
  label_th    text NOT NULL,
  sort_order  int  NOT NULL DEFAULT 0
);

INSERT INTO evaluation_dimensions (key, dim_group, label_en, label_th, sort_order) VALUES
  ('str',          'execution',  'Strength',      'พละกำลัง',        1),
  ('int',          'execution',  'Intellect',     'สติปัญญา',         2),
  ('wis',          'execution',  'Wisdom',        'ปัญญาญาณ',         3),
  ('cha',          'execution',  'Charisma',      'เสน่ห์',            4),
  ('dex',          'execution',  'Dexterity',     'ความคล่องตัว',     5),
  ('con',          'execution',  'Constitution',  'ความอดทน',         6),
  ('cause',        'engagement', 'Cause',         'เป้าหมายร่วม',     7),
  ('compensation', 'engagement', 'Compensation',  'ค่าตอบแทน',        8),
  ('career',       'engagement', 'Career',        'เส้นทางอาชีพ',     9),
  ('community',    'engagement', 'Community',     'ชุมชน',            10),
  ('delivery',     'outcomes',   'Delivery',      'ผลงานส่งมอบ',      11),
  ('growth',       'outcomes',   'Growth',        'การเติบโต',        12)
ON CONFLICT (key) DO NOTHING;

CREATE TABLE IF NOT EXISTS evaluations (
  id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id    uuid NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
  dimension_key  text NOT NULL REFERENCES evaluation_dimensions(key),
  rater_type     text NOT NULL,                -- 'self' | 'manager' | 'hr'
  rater_id       uuid,                         -- optional link to employees.id
  cycle          text NOT NULL,                -- '2026-Q2'
  score          numeric(5,2) NOT NULL,        -- 0-100
  notes          text DEFAULT '',
  created_at     timestamptz NOT NULL DEFAULT now(),
  updated_at     timestamptz NOT NULL DEFAULT now(),
  UNIQUE (employee_id, dimension_key, rater_type, cycle)
);

CREATE INDEX IF NOT EXISTS idx_evals_emp_cycle ON evaluations (employee_id, cycle);
CREATE INDEX IF NOT EXISTS idx_evals_cycle_dim ON evaluations (cycle, dimension_key);
