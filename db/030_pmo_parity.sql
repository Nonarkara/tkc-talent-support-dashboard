-- ============================================================
-- Migration 030: PMO Parity — Project Health card data model
--
-- The PMO's Portfolio Dashboard (TKC_PMO Portfolio_Resource_
-- Dashboard_20260427.pdf, pages 5–6) shows per-project cards with
-- sections we don't yet model:
--
--   • Issues log     (Critical / High / Medium / Low counts)
--   • Risks log      (Critical / High / Medium / Low counts)
--   • Instalments    (5 rows per project: term, due, amount, billed)
--   • PM ownership   (separate from director ownership)
--   • Internal budget vs contract value
--
-- This migration adds all five. ERP-sourced columns (billed_status,
-- internal_budget_thb) are left nullable so we can wire the ERP
-- feed later without breaking the schema.
-- ============================================================

-- ─── 0. Add columns to projects ────────────────────────────────

ALTER TABLE projects
  ADD COLUMN IF NOT EXISTS pm_id UUID REFERENCES employees(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS internal_budget_thb NUMERIC,
  ADD COLUMN IF NOT EXISTS project_year INTEGER;

CREATE INDEX IF NOT EXISTS idx_projects_pm ON projects(pm_id) WHERE pm_id IS NOT NULL;

-- Backfill project_year from start_date when present, else current year.
UPDATE projects
   SET project_year = COALESCE(EXTRACT(YEAR FROM start_date)::INTEGER, EXTRACT(YEAR FROM CURRENT_DATE)::INTEGER)
 WHERE project_year IS NULL;

-- Backfill internal_budget_thb to 80% of budget_thb as a working
-- placeholder. The PMO will hand us the real number via the ERP feed;
-- until then 80% gives the card a plausible Project Cost / Budget gap
-- so the layout doesn't render with "—".
UPDATE projects
   SET internal_budget_thb = ROUND(budget_thb * 0.8)
 WHERE internal_budget_thb IS NULL AND budget_thb IS NOT NULL;


-- ─── 1. project_issues ─────────────────────────────────────────
--
-- The PMO's Issue chart per page-5 shows Critical / High / Medium /
-- Low buckets. We store the row-level data so we can roll up to the
-- chart AND drill down to the log on click-through.

CREATE TABLE IF NOT EXISTS project_issues (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id   UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  severity     TEXT NOT NULL CHECK (severity IN ('critical', 'high', 'medium', 'low')),
  title        TEXT NOT NULL,
  description  TEXT,
  owner_id     UUID REFERENCES employees(id) ON DELETE SET NULL,
  opened_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  closed_at    TIMESTAMPTZ,
  -- A simple status; the PMO doesn't show a status column but PMs need one.
  status       TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'mitigating', 'closed')),
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_project_issues_project ON project_issues(project_id, opened_at DESC);
CREATE INDEX IF NOT EXISTS idx_project_issues_open    ON project_issues(project_id, severity) WHERE closed_at IS NULL;


-- ─── 2. project_risks ──────────────────────────────────────────
--
-- Identical shape to issues, plus probability + mitigation columns.
-- The PMO's Risk chart also uses C/H/M/L buckets.

CREATE TABLE IF NOT EXISTS project_risks (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id   UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  severity     TEXT NOT NULL CHECK (severity IN ('critical', 'high', 'medium', 'low')),
  title        TEXT NOT NULL,
  description  TEXT,
  probability  NUMERIC(3,2) CHECK (probability IS NULL OR (probability >= 0 AND probability <= 1)),
  mitigation   TEXT,
  owner_id     UUID REFERENCES employees(id) ON DELETE SET NULL,
  opened_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  closed_at    TIMESTAMPTZ,
  status       TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'mitigating', 'closed')),
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_project_risks_project ON project_risks(project_id, opened_at DESC);
CREATE INDEX IF NOT EXISTS idx_project_risks_open    ON project_risks(project_id, severity) WHERE closed_at IS NULL;


-- ─── 3. project_instalments ────────────────────────────────────
--
-- One row per term. PMO page 5 example shows 5 terms per project with
-- Original Due, Revised Due, Amount (exc. VAT), and Billed Status.
-- Billed status feeds from ERP later; for now it's a plain enum.

CREATE TABLE IF NOT EXISTS project_instalments (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id      UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  term_no         INTEGER NOT NULL CHECK (term_no >= 1),
  original_due    DATE NOT NULL,
  revised_due     DATE,
  amount_thb      NUMERIC NOT NULL,
  -- 'billed'   → ERP has billed (green check)
  -- 'pending'  → not yet billed, still within window
  -- 'overdue'  → past due, not billed (red)
  -- 'within_60'→ within 60 days of due, watch (amber)
  billed_status   TEXT NOT NULL DEFAULT 'pending'
                   CHECK (billed_status IN ('billed', 'pending', 'overdue', 'within_60')),
  billed_at       TIMESTAMPTZ,
  -- ERP feed metadata
  erp_invoice_id  TEXT,
  erp_synced_at   TIMESTAMPTZ,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (project_id, term_no)
);

CREATE INDEX IF NOT EXISTS idx_project_instalments_project ON project_instalments(project_id, term_no);
CREATE INDEX IF NOT EXISTS idx_project_instalments_due     ON project_instalments(original_due, billed_status);


-- ─── 4. Demo backfill ──────────────────────────────────────────
--
-- Seed each existing project with 5 instalments evenly split across
-- the year. Mark the first two as billed, the third as overdue, the
-- fourth as within_60, the last as pending. This gives the
-- ProjectHealthCard a realistic-looking layout for the meeting demo;
-- the real values arrive when the ERP feed lands.

DO $$
DECLARE
  p RECORD;
  i INTEGER;
  inst_amount NUMERIC;
  due_date DATE;
  status_for_term TEXT;
  billed_when TIMESTAMPTZ;
BEGIN
  FOR p IN SELECT id, budget_thb, start_date, end_date FROM projects WHERE budget_thb IS NOT NULL LOOP

    -- Skip if already seeded
    IF EXISTS (SELECT 1 FROM project_instalments WHERE project_id = p.id) THEN
      CONTINUE;
    END IF;

    inst_amount := ROUND(p.budget_thb::NUMERIC / 5);

    FOR i IN 1..5 LOOP
      -- Spread due dates from start to end (or current year if no dates).
      due_date := COALESCE(p.start_date, DATE_TRUNC('year', CURRENT_DATE)::DATE)
                    + ((i - 1) * INTERVAL '2 months')::INTERVAL;

      status_for_term := CASE
        WHEN i = 1 THEN 'billed'
        WHEN i = 2 THEN 'billed'
        WHEN i = 3 THEN 'overdue'
        WHEN i = 4 THEN 'within_60'
        ELSE 'pending'
      END;

      billed_when := CASE WHEN status_for_term = 'billed' THEN due_date::TIMESTAMPTZ + INTERVAL '7 days' ELSE NULL END;

      INSERT INTO project_instalments
        (project_id, term_no, original_due, amount_thb, billed_status, billed_at)
        VALUES (p.id, i, due_date::DATE, inst_amount, status_for_term, billed_when);
    END LOOP;
  END LOOP;
END $$;

-- Seed each project with 0–3 demo issues (varying severities) so the
-- chart isn't empty. Idempotent via NOT EXISTS guard.

DO $$
DECLARE
  p RECORD;
  num_issues INTEGER;
BEGIN
  FOR p IN SELECT id, code FROM projects LOOP
    IF EXISTS (SELECT 1 FROM project_issues WHERE project_id = p.id) THEN
      CONTINUE;
    END IF;

    -- Deterministic 0–3 based on project code hash
    num_issues := abs(hashtext(p.id::text)) % 4;

    IF num_issues >= 1 THEN
      INSERT INTO project_issues (project_id, severity, title)
        VALUES (p.id, 'medium', 'Vendor delivery slipped by one week — escalation queued.');
    END IF;
    IF num_issues >= 2 THEN
      INSERT INTO project_issues (project_id, severity, title)
        VALUES (p.id, 'low', 'Documentation backlog past sprint 4 — assigned to PC.');
    END IF;
    IF num_issues >= 3 THEN
      INSERT INTO project_issues (project_id, severity, title)
        VALUES (p.id, 'high', 'UAT environment instability blocking sign-off track.');
    END IF;
  END LOOP;
END $$;

-- Seed each project with 0–2 demo risks. Same pattern as issues.

DO $$
DECLARE
  p RECORD;
  num_risks INTEGER;
BEGIN
  FOR p IN SELECT id FROM projects LOOP
    IF EXISTS (SELECT 1 FROM project_risks WHERE project_id = p.id) THEN
      CONTINUE;
    END IF;

    num_risks := abs(hashtext(p.id::text || 'risk')) % 3;

    IF num_risks >= 1 THEN
      INSERT INTO project_risks (project_id, severity, title, probability, mitigation)
        VALUES (p.id, 'medium', 'Client procurement freeze possible in Q3.', 0.30,
                'Lock down monthly check-ins with stakeholder; pre-bid Q4 if signs appear.');
    END IF;
    IF num_risks >= 2 THEN
      INSERT INTO project_risks (project_id, severity, title, probability, mitigation)
        VALUES (p.id, 'high', 'Key tech lead may rotate off — single point of failure.', 0.45,
                'Cross-train senior engineer; document architectural decisions in Tome.');
    END IF;
  END LOOP;
END $$;

-- ─── 5. Trigger maintenance ────────────────────────────────────

CREATE TRIGGER tr_project_issues_updated_at
  BEFORE UPDATE ON project_issues
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER tr_project_risks_updated_at
  BEFORE UPDATE ON project_risks
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER tr_project_instalments_updated_at
  BEFORE UPDATE ON project_instalments
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();


-- ─── 6. Migration tracking ─────────────────────────────────────

INSERT INTO _migrations (name) VALUES ('030_pmo_parity')
ON CONFLICT (name) DO NOTHING;
