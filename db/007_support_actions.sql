-- Private HR support actions
-- Structured interventions tied to one employee and one talent cycle.

ALTER TABLE employees
  ADD COLUMN IF NOT EXISTS hr_notes TEXT;

CREATE TABLE IF NOT EXISTS support_actions (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id       UUID NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
  cycle             TEXT NOT NULL,
  action_type       TEXT NOT NULL CHECK (
    action_type IN (
      'mentor_assigned',
      'fit_conversation',
      'load_review',
      'class_change_discussion',
      'skill_review',
      'growth_assignment',
      'succession_flag',
      'recognition'
    )
  ),
  title             TEXT NOT NULL,
  note              TEXT DEFAULT '',
  status            TEXT NOT NULL DEFAULT 'planned' CHECK (
    status IN ('planned', 'in_progress', 'done', 'dropped')
  ),
  owner_employee_id UUID REFERENCES employees(id),
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_support_actions_employee_cycle
  ON support_actions(employee_id, cycle);

CREATE INDEX IF NOT EXISTS idx_support_actions_status
  ON support_actions(status);

CREATE INDEX IF NOT EXISTS idx_support_actions_owner
  ON support_actions(owner_employee_id);

CREATE TRIGGER tr_support_actions_updated_at
  BEFORE UPDATE ON support_actions
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at();
