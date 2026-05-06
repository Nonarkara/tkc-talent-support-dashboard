-- 017_matrix_workshop_slice.sql
-- Director-first matrix workshop slice:
--   • competency_standards for workshop-editable skill definitions
--   • employee_profile_facets for languages / certifications / soft skills
--   • employee_allocations for planned vs actual FTE visibility
--   • framework_id support on skill evidence rows

BEGIN;

ALTER TABLE skill_assessments
  ADD COLUMN IF NOT EXISTS framework_id TEXT;

ALTER TABLE skill_assessments
  ADD COLUMN IF NOT EXISTS evidence_metadata JSONB NOT NULL DEFAULT '{}'::jsonb;

CREATE TABLE IF NOT EXISTS competency_standards (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  skill_key TEXT NOT NULL,
  display_name TEXT NOT NULL,
  framework_source TEXT NOT NULL DEFAULT 'Aisha Core',
  framework_id TEXT,
  category TEXT NOT NULL DEFAULT 'skill',
  descriptors JSONB NOT NULL DEFAULT '{}'::jsonb,
  weight NUMERIC(6,2) NOT NULL DEFAULT 1.00,
  recency_window_days INTEGER NOT NULL DEFAULT 540,
  expected_level INTEGER NOT NULL DEFAULT 3 CHECK (expected_level BETWEEN 1 AND 5),
  evidence_policy TEXT NOT NULL DEFAULT 'recent_best',
  linked_dimensions TEXT[] NOT NULL DEFAULT '{}'::text[],
  active BOOLEAN NOT NULL DEFAULT true,
  external_refs JSONB NOT NULL DEFAULT '{}'::jsonb,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(skill_key, framework_source)
);

CREATE INDEX IF NOT EXISTS idx_competency_standards_active
  ON competency_standards(active, sort_order, skill_key);

CREATE TRIGGER tr_competency_standards_updated_at
  BEFORE UPDATE ON competency_standards
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at();

CREATE TABLE IF NOT EXISTS employee_profile_facets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id UUID NOT NULL REFERENCES employees(id) ON DELETE CASCADE UNIQUE,
  languages TEXT[] NOT NULL DEFAULT '{}'::text[],
  certifications TEXT[] NOT NULL DEFAULT '{}'::text[],
  soft_skills TEXT[] NOT NULL DEFAULT '{}'::text[],
  external_refs JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_employee_profile_facets_employee
  ON employee_profile_facets(employee_id);

CREATE TRIGGER tr_employee_profile_facets_updated_at
  BEFORE UPDATE ON employee_profile_facets
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at();

CREATE TABLE IF NOT EXISTS employee_allocations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id UUID NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
  project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
  quest_id UUID REFERENCES quests(id) ON DELETE CASCADE,
  coe_name TEXT,
  slot_key TEXT,
  assignment_label TEXT NOT NULL DEFAULT '',
  fte NUMERIC(5,2) NOT NULL CHECK (fte > 0 AND fte <= 1.50),
  planned_or_actual TEXT NOT NULL CHECK (planned_or_actual IN ('planned', 'actual')),
  status TEXT NOT NULL CHECK (status IN ('planned', 'active', 'completed', 'paused', 'cancelled')) DEFAULT 'planned',
  start_date DATE,
  end_date DATE,
  source TEXT NOT NULL DEFAULT 'manual',
  external_id TEXT,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CHECK (project_id IS NOT NULL OR quest_id IS NOT NULL OR coe_name IS NOT NULL)
);

CREATE INDEX IF NOT EXISTS idx_employee_allocations_employee
  ON employee_allocations(employee_id, status, planned_or_actual);

CREATE INDEX IF NOT EXISTS idx_employee_allocations_project
  ON employee_allocations(project_id, planned_or_actual, status);

CREATE INDEX IF NOT EXISTS idx_employee_allocations_quest
  ON employee_allocations(quest_id, planned_or_actual, status);

CREATE INDEX IF NOT EXISTS idx_employee_allocations_dates
  ON employee_allocations(start_date, end_date);

CREATE TRIGGER tr_employee_allocations_updated_at
  BEFORE UPDATE ON employee_allocations
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at();

INSERT INTO competency_standards (
  skill_key,
  display_name,
  framework_source,
  framework_id,
  category,
  descriptors,
  weight,
  recency_window_days,
  expected_level,
  evidence_policy,
  linked_dimensions,
  sort_order
)
VALUES
  ('technical', 'Technical Delivery', 'Aisha Core', 'AISHA-TECH-01', 'skill',
    '{"1":"Can support guided tasks.","2":"Can deliver small work items.","3":"Can independently deliver scoped modules.","4":"Can architect and debug across systems.","5":"Sets technical standards for others."}'::jsonb,
    1.30, 540, 4, 'recent_best', ARRAY['technical'], 10),
  ('sales', 'Sales Leadership', 'Aisha Core', 'AISHA-SALES-01', 'skill',
    '{"1":"Can assist in pitches.","2":"Can present prepared offers.","3":"Can own client conversations.","4":"Can lead pursuit strategy.","5":"Opens new revenue paths."}'::jsonb,
    1.20, 540, 3, 'recent_best', ARRAY['sales','marketing'], 20),
  ('procurement', 'Procurement Control', 'Aisha Core', 'AISHA-PROC-01', 'skill',
    '{"1":"Understands vendor paperwork.","2":"Can compare quotations.","3":"Can run standard sourcing.","4":"Can negotiate and manage vendor risk.","5":"Shapes procurement policy."}'::jsonb,
    1.00, 720, 3, 'recent_best', ARRAY['outsourcing','paperwork'], 30),
  ('survey', 'Field Survey & Discovery', 'Aisha Core', 'AISHA-SURV-01', 'skill',
    '{"1":"Can collect guided observations.","2":"Can execute simple survey plans.","3":"Can run interviews and field discovery.","4":"Turns findings into action models.","5":"Designs discovery programs across projects."}'::jsonb,
    0.95, 540, 3, 'recent_best', ARRAY['technical','outsourcing'], 40),
  ('outsourcing_mgmt', 'Partner Orchestration', 'Aisha Core', 'AISHA-OUT-01', 'skill',
    '{"1":"Can track vendor tasks.","2":"Can coordinate routine partner work.","3":"Can manage external delivery streams.","4":"Can recover slipping partner commitments.","5":"Builds scalable partner operating models."}'::jsonb,
    1.05, 720, 3, 'recent_best', ARRAY['outsourcing'], 50),
  ('delivery_ops', 'Delivery Operations', 'Aisha Core', 'AISHA-DEL-01', 'skill',
    '{"1":"Understands delivery rituals.","2":"Can track status and blockers.","3":"Can coordinate delivery to deadline.","4":"Can run complex cross-team execution.","5":"Designs delivery systems that scale."}'::jsonb,
    1.15, 540, 4, 'recent_best', ARRAY['technical','outsourcing','paperwork'], 60),
  ('finance_paperwork', 'Finance & Controls', 'Aisha Core', 'AISHA-FIN-01', 'skill',
    '{"1":"Can support document preparation.","2":"Can complete standard finance paperwork.","3":"Can run project controls and compliance.","4":"Can forecast and challenge commercial drift.","5":"Shapes commercial governance."}'::jsonb,
    1.10, 720, 3, 'recent_best', ARRAY['paperwork'], 70),
  ('marketing', 'Narrative & Positioning', 'Aisha Core', 'AISHA-MKT-01', 'skill',
    '{"1":"Can support content production.","2":"Can adapt core messages.","3":"Can position offers for target buyers.","4":"Can shape go-to-market narrative.","5":"Sets category story for the business."}'::jsonb,
    0.85, 720, 2, 'recent_best', ARRAY['marketing','sales'], 80),
  ('customer_success', 'Customer Success', 'Aisha Core', 'AISHA-CS-01', 'skill',
    '{"1":"Can respond to routine client needs.","2":"Can maintain working client trust.","3":"Can steer ongoing value conversations.","4":"Can recover fragile accounts.","5":"Turns accounts into long-term growth."}'::jsonb,
    1.05, 540, 3, 'recent_best', ARRAY['sales','marketing'], 90),
  ('data_analysis', 'Data Analysis', 'Aisha Core', 'AISHA-DATA-01', 'skill',
    '{"1":"Can read basic reports.","2":"Can clean and inspect structured data.","3":"Can produce decision-grade analysis.","4":"Can model patterns and tradeoffs.","5":"Defines analytical standards and interpretation."}'::jsonb,
    1.10, 540, 3, 'recent_best', ARRAY['technical','paperwork'], 100)
ON CONFLICT (skill_key, framework_source) DO NOTHING;

INSERT INTO employee_profile_facets (employee_id, languages, certifications, soft_skills)
SELECT
  e.id,
  CASE
    WHEN e.role_level IN ('director', 'deputy_md', 'md') THEN ARRAY['Thai', 'English']
    WHEN d.code IN ('SALES', 'BIZ_DEV', 'ENTERPRISE') THEN ARRAY['Thai', 'English']
    ELSE ARRAY['Thai']
  END,
  CASE
    WHEN d.code IN ('DIGITAL', 'IT', 'NET_DEL', 'ENTERPRISE') THEN ARRAY['Cloud Foundations']
    WHEN d.code IN ('FINANCE', 'ACCT') THEN ARRAY['Financial Controls']
    WHEN d.code IN ('PROCURE', 'CORP_ADM') THEN ARRAY['Vendor Compliance']
    ELSE ARRAY[]::text[]
  END,
  CASE
    WHEN e.role_level IN ('director', 'deputy_md', 'md') THEN ARRAY['Leadership', 'Stakeholder Alignment']
    WHEN e.role_level = 'manager' THEN ARRAY['Coaching', 'Coordination']
    ELSE ARRAY['Collaboration']
  END
FROM employees e
LEFT JOIN departments d ON d.id = e.department_id
WHERE e.is_active = true
ON CONFLICT (employee_id) DO NOTHING;

INSERT INTO _migrations (name) VALUES ('017_matrix_workshop_slice')
ON CONFLICT (name) DO NOTHING;

COMMIT;
