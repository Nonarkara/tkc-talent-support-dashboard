-- 013_seed_skills.sql
-- Phase-1 seeding of employees.skills[].
--
-- The column has existed since 001_schema.sql (line 48) but was never
-- populated. Ninja Squads need a skill vocabulary richer than the 5
-- SlotDimensions to answer "who has procurement + survey skills?" —
-- so this migration derives 2–3 skills per employee from the fields we
-- DO have reliably: dept_code, role_level, and title_en.
--
-- This is a proxy. Phase 2 (interview → Gen AI) will overlay real
-- proficiency data via skill_assessments.source = 'interview_ai', and
-- at that point this derived set becomes a fallback cache.
--
-- Vocabulary (matches src/lib/skills-vocab.ts):
--   technical, sales, procurement, survey, outsourcing_mgmt,
--   delivery_ops, finance_paperwork, marketing, customer_success,
--   data_analysis
--
-- Idempotent: re-running this file re-derives skills[] from scratch.

BEGIN;

-- Step 1: clear existing derived skills so the migration is repeatable.
UPDATE employees SET skills = '{}';

-- Step 2: base skills from dept_code.
WITH dept_skill_map (code, base_skills) AS (
  VALUES
    ('SALES',      ARRAY['sales', 'customer_success']),
    ('BIZ_DEV',    ARRAY['sales', 'customer_success']),
    ('ENTERPRISE', ARRAY['technical', 'delivery_ops']),
    ('NET_DEL',    ARRAY['technical', 'delivery_ops']),
    ('PUB_SAFETY', ARRAY['technical', 'delivery_ops']),
    ('DIGITAL',    ARRAY['technical', 'data_analysis']),
    ('IT',         ARRAY['technical', 'data_analysis']),
    ('PROCURE',    ARRAY['procurement', 'outsourcing_mgmt']),
    ('FINANCE',    ARRAY['finance_paperwork', 'data_analysis']),
    ('ACCT',       ARRAY['finance_paperwork', 'data_analysis']),
    ('HR_ADMIN',   ARRAY['finance_paperwork', 'delivery_ops']),
    ('CORP_ADM',   ARRAY['finance_paperwork', 'delivery_ops'])
)
UPDATE employees e
SET skills = dsm.base_skills
FROM departments d
JOIN dept_skill_map dsm ON dsm.code = d.code
WHERE e.department_id = d.id;

-- Step 3: title-regex overlays.
-- Anyone whose title suggests survey / research / analyst gets 'survey'.
UPDATE employees
SET skills = array_append(skills, 'survey')
WHERE (title_en ILIKE '%survey%'
    OR title_en ILIKE '%research%'
    OR title_en ILIKE '%analyst%')
  AND NOT ('survey' = ANY(skills));

-- Anyone whose title suggests marketing / brand / content gets 'marketing'.
UPDATE employees
SET skills = array_append(skills, 'marketing')
WHERE (title_en ILIKE '%marketing%'
    OR title_en ILIKE '%brand%'
    OR title_en ILIKE '%content%')
  AND NOT ('marketing' = ANY(skills));

-- Step 4: leadership overlay.
-- MDs and directors touch everyone; they all carry customer_success.
UPDATE employees
SET skills = array_append(skills, 'customer_success')
WHERE role_level IN ('md', 'deputy_md', 'director')
  AND NOT ('customer_success' = ANY(skills));

-- Step 5: record the migration.
INSERT INTO _migrations (name) VALUES ('013_seed_skills')
ON CONFLICT (name) DO NOTHING;

COMMIT;
