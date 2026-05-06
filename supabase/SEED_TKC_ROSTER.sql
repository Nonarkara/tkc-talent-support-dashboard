-- ============================================================
-- SEED: TKC Real Roster (28 key employees)
-- Run AFTER the combined migrations
-- NOTE: These are mock users for the demo. Real users will be
-- created via Supabase Auth when the system goes live.
-- ============================================================

-- First, create auth users (simplified — in production, users sign up via auth)
-- We use the admin API pattern: insert directly into auth.users and public.users

-- Helper: Insert into both auth.users and public.users
-- For demo purposes, we create placeholder auth entries

DO $$
DECLARE
  div_sales UUID;
  div_ops UUID;
  div_fin UUID;
  dept_sales UUID;
  dept_bizdev UUID;
  dept_netdel UUID;
  dept_enterprise UUID;
  dept_pubsafety UUID;
  dept_digital UUID;
  dept_finance UUID;
  dept_acct UUID;
  dept_procure UUID;
  dept_hradmin UUID;
  dept_it UUID;
  dept_corpadm UUID;
BEGIN
  -- Get division IDs
  SELECT id INTO div_sales FROM divisions WHERE code = 'SALES_MKT';
  SELECT id INTO div_ops FROM divisions WHERE code = 'OPERATIONS';
  SELECT id INTO div_fin FROM divisions WHERE code = 'FINANCE';

  -- Get department IDs
  SELECT id INTO dept_sales FROM departments WHERE code = 'SALES';
  SELECT id INTO dept_bizdev FROM departments WHERE code = 'BIZ_DEV';
  SELECT id INTO dept_netdel FROM departments WHERE code = 'NET_DEL';
  SELECT id INTO dept_enterprise FROM departments WHERE code = 'ENTERPRISE';
  SELECT id INTO dept_pubsafety FROM departments WHERE code = 'PUB_SAFETY';
  SELECT id INTO dept_digital FROM departments WHERE code = 'DIGITAL';
  SELECT id INTO dept_finance FROM departments WHERE code = 'FINANCE_D';
  SELECT id INTO dept_acct FROM departments WHERE code = 'ACCT';
  SELECT id INTO dept_procure FROM departments WHERE code = 'PROCURE';
  SELECT id INTO dept_hradmin FROM departments WHERE code = 'HR_ADMIN';
  SELECT id INTO dept_it FROM departments WHERE code = 'IT';
  SELECT id INTO dept_corpadm FROM departments WHERE code = 'CORP_ADM';

  RAISE NOTICE 'Division and department IDs retrieved successfully';
  RAISE NOTICE 'Sales div: %, Ops div: %, Fin div: %', div_sales, div_ops, div_fin;

  -- NOTE: In a real deployment, users would be created through Supabase Auth.
  -- For the demo, we'll insert directly into the users table with generated UUIDs.
  -- The auth.users entries would need to be created separately via the Auth Admin API.

END $$;

-- For now, just verify the schema is working
SELECT 'Divisions:' AS info, count(*) FROM divisions;
SELECT 'Departments:' AS info, count(*) FROM departments;
SELECT 'Financial Snapshots:' AS info, count(*) FROM financial_snapshots;
SELECT 'Skill Adjacencies:' AS info, count(*) FROM skill_adjacencies;
