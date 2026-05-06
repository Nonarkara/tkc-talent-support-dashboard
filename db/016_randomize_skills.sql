-- 016_randomize_skills.sql
--
-- Two operations:
--
-- 1. Seed three base Ninja mission quest records so NinjaTab can PATCH
--    titles without needing to create quests first.
--
-- 2. Re-seed employees.skills[] with role_level-based counts so
--    readiness scoring is meaningful: directors get 4–5 skills,
--    managers 3–4, seniors 2–3, juniors 1–2.
--    Same dept-code mapping as 013_seed_skills but varied by level.
--
-- Idempotent: safe to re-run.

BEGIN;

-- ── 1. Base mission quest records ──────────────────────────────────────────

INSERT INTO quests (code, title, cycle, status, notes, role_slots)
VALUES
  ('NINJA_ALPHA', 'Siam City Signal Atlas',     '2026-Q2', 'scouting', 'Alpha Party', '[]'::jsonb),
  ('NINJA_BETA',  'Hero Loom Talent Engine',     '2026-Q2', 'scouting', 'Beta Party',  '[]'::jsonb),
  ('NINJA_GAMMA', 'Civic Shield Response Grid',  '2026-Q2', 'scouting', 'Gamma Party', '[]'::jsonb)
ON CONFLICT (code) DO NOTHING;

-- ── 2. Re-seed employees.skills[] by role_level ────────────────────────────

DO $$
DECLARE
  all_skills TEXT[] := ARRAY[
    'technical','sales','procurement','survey','outsourcing_mgmt',
    'delivery_ops','finance_paperwork','marketing','customer_success','data_analysis'
  ];
  r RECORD;
  base_skills TEXT[];
  pool TEXT[];
  target_count INT;
  extra_count INT;
BEGIN
  -- Clear first so this is idempotent
  UPDATE employees SET skills = '{}';

  FOR r IN
    SELECT e.id, d.code AS dept_code, e.role_level
    FROM employees e
    LEFT JOIN departments d ON d.id = e.department_id
    WHERE e.is_active = true
  LOOP
    -- Dept-based core skills (same mapping as 013)
    base_skills := CASE r.dept_code
      WHEN 'SALES'      THEN ARRAY['sales','customer_success']
      WHEN 'BIZ_DEV'    THEN ARRAY['sales','customer_success']
      WHEN 'ENTERPRISE' THEN ARRAY['technical','delivery_ops']
      WHEN 'NET_DEL'    THEN ARRAY['technical','delivery_ops']
      WHEN 'PUB_SAFETY' THEN ARRAY['technical','delivery_ops']
      WHEN 'DIGITAL'    THEN ARRAY['technical','data_analysis']
      WHEN 'IT'         THEN ARRAY['technical','data_analysis']
      WHEN 'PROCURE'    THEN ARRAY['procurement','outsourcing_mgmt']
      WHEN 'FINANCE'    THEN ARRAY['finance_paperwork','data_analysis']
      WHEN 'ACCT'       THEN ARRAY['finance_paperwork','data_analysis']
      WHEN 'HR_ADMIN'   THEN ARRAY['finance_paperwork','delivery_ops']
      WHEN 'CORP_ADM'   THEN ARRAY['finance_paperwork','delivery_ops']
      ELSE ARRAY['delivery_ops']
    END;

    -- Target total skill count per role level
    target_count := CASE r.role_level
      WHEN 'md'        THEN 4 + (floor(random() * 2))::int   -- 4 or 5
      WHEN 'deputy_md' THEN 4 + (floor(random() * 2))::int   -- 4 or 5
      WHEN 'director'  THEN 4                                  -- exactly 4
      WHEN 'manager'   THEN 3 + (floor(random() * 2))::int   -- 3 or 4
      WHEN 'senior'    THEN 2 + (floor(random() * 2))::int   -- 2 or 3
      ELSE                  1 + (floor(random() * 2))::int   -- 1 or 2 (staff/junior)
    END;

    -- Pool of skills not already in base, shuffled for random picks
    pool := ARRAY(
      SELECT s FROM unnest(all_skills) AS s
      WHERE NOT (s = ANY(base_skills))
      ORDER BY random()
    );

    -- How many extras we need (clamped to available pool size)
    extra_count := LEAST(
      GREATEST(0, target_count - array_length(base_skills, 1)),
      COALESCE(array_length(pool, 1), 0)
    );

    UPDATE employees
    SET skills = CASE
      WHEN extra_count > 0 THEN base_skills || pool[1:extra_count]
      ELSE base_skills
    END
    WHERE id = r.id;
  END LOOP;
END $$;

-- ── Record migration ───────────────────────────────────────────────────────

INSERT INTO _migrations (name) VALUES ('016_randomize_skills')
ON CONFLICT (name) DO NOTHING;

COMMIT;
