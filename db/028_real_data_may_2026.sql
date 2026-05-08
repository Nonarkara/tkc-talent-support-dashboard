-- ============================================================
-- Migration 028: Real Data — May 2026 dossier merge
--
-- Adds the columns needed to absorb TKC's May 2026 export:
-- title prefix (drives gender), DOB, education chain, section,
-- resign tracking. Existing data is preserved; new fields default
-- NULL. Newer-wins is enforced at import-script level.
-- ============================================================

ALTER TABLE employees ADD COLUMN IF NOT EXISTS title_prefix TEXT;
ALTER TABLE employees ADD COLUMN IF NOT EXISTS gender TEXT;
ALTER TABLE employees ADD COLUMN IF NOT EXISTS gender_override TEXT;
ALTER TABLE employees ADD COLUMN IF NOT EXISTS date_of_birth DATE;
ALTER TABLE employees ADD COLUMN IF NOT EXISTS education_level TEXT;
ALTER TABLE employees ADD COLUMN IF NOT EXISTS education_school TEXT;
ALTER TABLE employees ADD COLUMN IF NOT EXISTS education_faculty TEXT;
ALTER TABLE employees ADD COLUMN IF NOT EXISTS education_major TEXT;
ALTER TABLE employees ADD COLUMN IF NOT EXISTS section_th TEXT;
ALTER TABLE employees ADD COLUMN IF NOT EXISTS resign_date DATE;
ALTER TABLE employees ADD COLUMN IF NOT EXISTS resign_status TEXT;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE table_name = 'employees' AND constraint_name = 'employees_gender_check'
  ) THEN
    ALTER TABLE employees ADD CONSTRAINT employees_gender_check
      CHECK (gender IS NULL OR gender IN ('m', 'f'));
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE table_name = 'employees' AND constraint_name = 'employees_resign_status_check'
  ) THEN
    ALTER TABLE employees ADD CONSTRAINT employees_resign_status_check
      CHECK (resign_status IS NULL OR resign_status IN ('presumed_departed', 'confirmed', 'none'));
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_employees_resign_status ON employees(resign_status) WHERE resign_status IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_employees_active_resign ON employees(is_active, resign_status);
