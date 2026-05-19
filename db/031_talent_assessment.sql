-- 031_talent_assessment.sql
--
-- TKC Talent Management Program (Phase 1) — schema for the 9-Box grid +
-- Performance/Potential assessment that came out of the HR Strategy Map
-- (Management Meeting @ Danang) and Rev.4 framework document.
--
-- Two-table design:
--   1. Per-employee CURRENT snapshot lives on the `employees` row so any
--      view that already pulls an employee row gets the talent state for
--      free (cassette home, Roster, Lobby).
--   2. Historical assessments live in `talent_assessments` so we can
--      track movement across cycles (Box 5 → Box 8 etc.) without losing
--      the previous reading. Phase-1 ingest = one row per nominee.
--
-- 9-Box numbering (canonical):
--   ┌──────────┬─────────────┬──────────┐
--   │ Box 7    │ Box 8       │ Box 9    │   ← high potential
--   │ Pot.Gem  │ High Pot.   │ Star     │
--   ├──────────┼─────────────┼──────────┤
--   │ Box 4    │ Box 5       │ Box 6    │   ← mid potential
--   │ Avg.Plyr │ Core Player │ HighPerf │
--   ├──────────┼─────────────┼──────────┤
--   │ Box 1    │ Box 2       │ Box 3    │   ← low potential
--   │ Risk     │ Avg.Player  │ SolidPrf │
--   └──────────┴─────────────┴──────────┘
--      low perf      mid          high perf
--
-- "Final Cut" rule from the framework: Boxes 6–9 only, and cut anyone
-- whose most-recent G score was C+ or C even if their average is high.

-- ── Extend employees with current-cycle talent state ────────────────
ALTER TABLE employees
  ADD COLUMN IF NOT EXISTS job_grade           TEXT,
  ADD COLUMN IF NOT EXISTS grade_prev          TEXT,
  ADD COLUMN IF NOT EXISTS grade_curr          TEXT,
  ADD COLUMN IF NOT EXISTS performance_score   NUMERIC(5,2),
  ADD COLUMN IF NOT EXISTS potential_score     NUMERIC(5,2),
  ADD COLUMN IF NOT EXISTS avg_score           NUMERIC(5,2),
  ADD COLUMN IF NOT EXISTS performance_band    INTEGER CHECK (performance_band BETWEEN 1 AND 3),
  ADD COLUMN IF NOT EXISTS potential_band      INTEGER CHECK (potential_band BETWEEN 1 AND 3),
  ADD COLUMN IF NOT EXISTS box_id              INTEGER CHECK (box_id BETWEEN 1 AND 9),
  ADD COLUMN IF NOT EXISTS box_label           TEXT,
  ADD COLUMN IF NOT EXISTS talent_referrence   TEXT,
  ADD COLUMN IF NOT EXISTS talent_remark       TEXT,
  ADD COLUMN IF NOT EXISTS in_talent_pool      BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS talent_assessed_at  TIMESTAMPTZ;

CREATE INDEX IF NOT EXISTS idx_employees_box        ON employees(box_id)          WHERE box_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_employees_talent     ON employees(in_talent_pool)  WHERE in_talent_pool = true;
CREATE INDEX IF NOT EXISTS idx_employees_avg_score  ON employees(avg_score DESC)  WHERE avg_score IS NOT NULL;

-- ── History table (one row per cycle assessment) ─────────────────────
CREATE TABLE IF NOT EXISTS talent_assessments (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id       UUID NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
  cycle             TEXT NOT NULL DEFAULT '2026-H1',  -- "2026-H1", "2026-H2", …
  assessment_date   DATE NOT NULL DEFAULT CURRENT_DATE,

  -- Inputs
  job_grade         TEXT,
  grade_prev        TEXT,                              -- previous year letter grade
  grade_curr        TEXT,                              -- current year letter grade
  grade_avg_score   NUMERIC(5,2),                      -- the grade-conversion sub-score
  core_competency_score   NUMERIC(5,2),                -- 60-point sub-score (Innovation/Learning/Motivation/Improvement/Integrity)
  managerial_competency_score NUMERIC(5,2),            -- 50-point sub-score (Leadership/Planning/ProblemSolving/BuildTeamwork/Visioning)
  work_growth_readiness_score NUMERIC(5,2),            -- 50-point sub-score (TechSavvy/ChangeAgility/GrowthMindset/Proactive/FutureRoleAwareness)

  -- Outputs
  performance_score NUMERIC(5,2),                      -- 0-100 (40% grade + 60% core competency)
  potential_score   NUMERIC(5,2),                      -- 0-100 (50% managerial + 50% growth readiness)
  avg_score         NUMERIC(5,2),                      -- mean of perf + pot
  performance_band  INTEGER CHECK (performance_band BETWEEN 1 AND 3),
  potential_band    INTEGER CHECK (potential_band BETWEEN 1 AND 3),
  box_id            INTEGER CHECK (box_id BETWEEN 1 AND 9),
  box_label         TEXT,

  -- Decisions
  referrence        TEXT,                              -- "Dept. Nomination", "Middle Management Program", etc.
  remark            TEXT,
  in_talent_pool    BOOLEAN DEFAULT false,             -- Final Cut survivor

  -- Provenance
  source            TEXT DEFAULT 'csv_import',         -- "csv_import" | "hr_manual" | "system"
  imported_at       TIMESTAMPTZ DEFAULT now(),
  created_at        TIMESTAMPTZ DEFAULT now(),

  UNIQUE (employee_id, cycle)
);

CREATE INDEX IF NOT EXISTS idx_ta_emp     ON talent_assessments(employee_id);
CREATE INDEX IF NOT EXISTS idx_ta_box     ON talent_assessments(box_id)        WHERE box_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_ta_pool    ON talent_assessments(in_talent_pool) WHERE in_talent_pool = true;
CREATE INDEX IF NOT EXISTS idx_ta_cycle   ON talent_assessments(cycle);

-- ── Aggregate views (so the API doesn't have to do the math) ────────
CREATE OR REPLACE VIEW talent_box_distribution AS
SELECT
  box_id,
  box_label,
  COUNT(*)::INTEGER AS headcount,
  COUNT(*) FILTER (WHERE in_talent_pool = true)::INTEGER AS final_cut
FROM employees
WHERE box_id IS NOT NULL
GROUP BY box_id, box_label
ORDER BY box_id;

CREATE OR REPLACE VIEW talent_dept_distribution AS
SELECT
  COALESCE(d.name_en, d.name_th)  AS department,
  COUNT(e.id) FILTER (WHERE e.box_id IS NOT NULL)::INTEGER AS nominees,
  COUNT(e.id) FILTER (WHERE e.in_talent_pool = true)::INTEGER AS pipeline,
  AVG(e.avg_score) FILTER (WHERE e.box_id IS NOT NULL)::NUMERIC(5,2) AS avg_score
FROM employees e
LEFT JOIN departments d ON d.id = e.department_id
WHERE e.box_id IS NOT NULL
GROUP BY COALESCE(d.name_en, d.name_th)
ORDER BY pipeline DESC NULLS LAST, nominees DESC;
