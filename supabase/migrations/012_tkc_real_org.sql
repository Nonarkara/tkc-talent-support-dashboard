-- ============================================================
-- Migration 012: Real TKC Organization Structure
-- Representative organization structure
-- ============================================================

-- Divisions (the 3 Deputy MD lines)
CREATE TABLE IF NOT EXISTS divisions (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code          TEXT UNIQUE NOT NULL,
  name_th       TEXT NOT NULL,
  name_en       TEXT NOT NULL,
  head_title_th TEXT,
  head_title_en TEXT,
  color         TEXT DEFAULT '#3B82F6',
  sort_order    INTEGER DEFAULT 0,
  created_at    TIMESTAMPTZ DEFAULT now()
);

-- Add division_id to departments
ALTER TABLE departments ADD COLUMN IF NOT EXISTS division_id UUID REFERENCES divisions(id);
ALTER TABLE departments ADD COLUMN IF NOT EXISTS sort_order INTEGER DEFAULT 0;

-- Add role_level and tenure to users
DO $$ BEGIN
  CREATE TYPE role_level AS ENUM ('md', 'deputy_md', 'director', 'manager', 'senior', 'staff');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

ALTER TABLE users ADD COLUMN IF NOT EXISTS role_level role_level DEFAULT 'staff';
ALTER TABLE users ADD COLUMN IF NOT EXISTS tenure_years INTEGER DEFAULT 0;
ALTER TABLE users ADD COLUMN IF NOT EXISTS division_id UUID REFERENCES divisions(id);

-- ============================================================
-- SEED: Divisions
-- ============================================================

INSERT INTO divisions (code, name_th, name_en, head_title_th, head_title_en, color, sort_order) VALUES
  ('SALES_MKT',  'สายงานขายและการตลาด',        'Sales & Marketing',   'รอง กจก. สายงานขายและการตลาด',        'Deputy MD — Sales & Marketing',   '#2563EB', 1),
  ('OPERATIONS', 'สายงานปฏิบัติการ',            'Operations',          'รอง กจก. สายงานปฏิบัติการ',            'Deputy MD — Operations',          '#DC2626', 2),
  ('FINANCE',    'สายงานการเงินและบัญชี',        'Finance & Admin',     'รอง กจก. สายงานการเงินและบัญชี',        'Deputy MD — Finance & Accounting','#059669', 3)
ON CONFLICT (code) DO NOTHING;

-- ============================================================
-- SEED: Real TKC Departments (replace old 8 with real 12)
-- ============================================================

-- First, update existing departments or insert new ones
-- Sales & Marketing Division
INSERT INTO departments (code, name_th, name_en, color) VALUES
  ('SALES',      'ฝ่ายขาย',                     'Sales',                '#3B82F6'),
  ('BIZ_DEV',    'ฝ่ายพัฒนาธุรกิจ',              'Business Development', '#60A5FA')
ON CONFLICT (code) DO UPDATE SET name_th = EXCLUDED.name_th, name_en = EXCLUDED.name_en, color = EXCLUDED.color;

-- Operations Division
INSERT INTO departments (code, name_th, name_en, color) VALUES
  ('NET_DEL',    'ฝ่ายเน็ตเวิร์กดิลิเวอรี่',         'Network Delivery',    '#EF4444'),
  ('ENTERPRISE', 'ฝ่ายธุรกิจองค์กร',              'Enterprise Business',  '#F87171'),
  ('PUB_SAFETY', 'ฝ่ายความปลอดภัยสาธารณะ',       'Public Safety',        '#DC2626'),
  ('DIGITAL',    'ฝ่ายบริการดิจิทัล',             'Digital Services',     '#FB923C')
ON CONFLICT (code) DO UPDATE SET name_th = EXCLUDED.name_th, name_en = EXCLUDED.name_en, color = EXCLUDED.color;

-- Finance & Admin Division
INSERT INTO departments (code, name_th, name_en, color) VALUES
  ('FINANCE_D',  'ฝ่ายการเงิน',                  'Finance',              '#10B981'),
  ('ACCT',       'ฝ่ายบัญชี',                    'Accounting',           '#34D399'),
  ('PROCURE',    'ฝ่ายจัดซื้อจัดจ้าง',            'Procurement',          '#6EE7B7'),
  ('HR_ADMIN',   'ฝ่ายทรัพยากรบุคคลและธุรการ',     'HR & Admin',           '#F59E0B'),
  ('IT',         'ฝ่ายเทคโนโลยีสารสนเทศ',        'IT',                   '#8B5CF6'),
  ('CORP_ADM',   'ฝ่ายบริหารองค์กร',              'Corporate Admin',      '#6B7280')
ON CONFLICT (code) DO UPDATE SET name_th = EXCLUDED.name_th, name_en = EXCLUDED.name_en, color = EXCLUDED.color;

-- Link departments to divisions
UPDATE departments SET division_id = (SELECT id FROM divisions WHERE code = 'SALES_MKT')
  WHERE code IN ('SALES', 'BIZ_DEV');
UPDATE departments SET division_id = (SELECT id FROM divisions WHERE code = 'OPERATIONS')
  WHERE code IN ('NET_DEL', 'ENTERPRISE', 'PUB_SAFETY', 'DIGITAL');
UPDATE departments SET division_id = (SELECT id FROM divisions WHERE code = 'FINANCE')
  WHERE code IN ('FINANCE_D', 'ACCT', 'PROCURE', 'HR_ADMIN', 'IT', 'CORP_ADM');

-- ============================================================
-- INDEX
-- ============================================================
CREATE INDEX IF NOT EXISTS idx_departments_division ON departments(division_id);
CREATE INDEX IF NOT EXISTS idx_users_division ON users(division_id);
CREATE INDEX IF NOT EXISTS idx_users_role_level ON users(role_level);
