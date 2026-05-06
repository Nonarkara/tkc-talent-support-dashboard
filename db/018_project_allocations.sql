-- Project allocations — clean slot-dimension staffing per project.
--
-- Previously, Formation saves compressed slot assignments into
-- team_compositions.insights as BOARD::ASSIGN:empId@dimension|...
-- That worked for a prototype but fights every SQL join. This table
-- makes the mapping a first-class citizen:
--
--   one row per (project, employee, slot_dimension, fte_cycle)
--
-- Foreign keys cascade. Re-saves for a project simply DELETE + INSERT
-- the whole set. Fast, explicit, obvious.

CREATE TABLE IF NOT EXISTS project_allocations (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id     UUID REFERENCES projects(id) ON DELETE CASCADE NOT NULL,
  employee_id    UUID REFERENCES employees(id) ON DELETE CASCADE NOT NULL,
  slot_dimension TEXT NOT NULL CHECK (slot_dimension IN (
    'technical','sales','marketing','outsourcing','paperwork'
  )),
  fte            NUMERIC(3,2) NOT NULL DEFAULT 1.00 CHECK (fte > 0 AND fte <= 1.0),
  -- Readiness snapshot at time of last save, for quick per-project lookup
  -- without re-running the skill math. Recomputed on every save.
  coverage_pct   INTEGER,
  quality_pct    INTEGER,
  chemistry      INTEGER,
  morale         INTEGER,
  overall_pct    INTEGER,
  created_at     TIMESTAMPTZ DEFAULT now(),
  updated_at     TIMESTAMPTZ DEFAULT now(),
  UNIQUE(project_id, employee_id, slot_dimension)
);

CREATE INDEX IF NOT EXISTS idx_project_allocations_project ON project_allocations(project_id);
CREATE INDEX IF NOT EXISTS idx_project_allocations_employee ON project_allocations(employee_id);

CREATE TRIGGER tr_project_allocations_updated_at
  BEFORE UPDATE ON project_allocations
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at();
