-- ============================================================
-- TKC Talent Dashboard — Seed Data (Placeholder)
-- Representative org structure: 3 divisions, 12 departments,
-- 28 employees, 8 projects. All names are fictional.
-- ============================================================

-- ─── DIVISIONS ──────────────────────────────────────────────
INSERT INTO divisions (code, name_th, name_en, head_title_th, head_title_en, color, sort_order) VALUES
  ('SALES_MKT',  'สายงานขายและการตลาด',        'Sales & Marketing',   'รอง กจก. สายงานขายและการตลาด',         'Deputy MD — Sales & Marketing',    '#2563EB', 1),
  ('OPERATIONS', 'สายงานปฏิบัติการ',            'Operations',          'รอง กจก. สายงานปฏิบัติการ',             'Deputy MD — Operations',           '#DC2626', 2),
  ('FINANCE',    'สายงานการเงินและบัญชี',        'Finance & Admin',     'รอง กจก. สายงานการเงินและบัญชี',         'Deputy MD — Finance & Accounting', '#059669', 3),
  ('EXEC',       'ผู้บริหาร',                   'Executive',           'กรรมการผู้จัดการ',                      'Managing Director',                '#1a1a1a', 0)
ON CONFLICT (code) DO NOTHING;

-- ─── DEPARTMENTS ────────────────────────────────────────────
-- Sales & Marketing Division
INSERT INTO departments (code, name_th, name_en, color, division_id, sort_order) VALUES
  ('SALES',      'ฝ่ายขาย',                     'Sales',                '#3B82F6', (SELECT id FROM divisions WHERE code = 'SALES_MKT'), 1),
  ('BIZ_DEV',    'ฝ่ายพัฒนาธุรกิจ',              'Business Development', '#60A5FA', (SELECT id FROM divisions WHERE code = 'SALES_MKT'), 2)
ON CONFLICT (code) DO NOTHING;

-- Operations Division
INSERT INTO departments (code, name_th, name_en, color, division_id, sort_order) VALUES
  ('NET_DEL',    'ฝ่ายเน็ตเวิร์กดิลิเวอรี่',         'Network Delivery',    '#EF4444', (SELECT id FROM divisions WHERE code = 'OPERATIONS'), 3),
  ('ENTERPRISE', 'ฝ่ายธุรกิจองค์กร',              'Enterprise Business',  '#F87171', (SELECT id FROM divisions WHERE code = 'OPERATIONS'), 4),
  ('PUB_SAFETY', 'ฝ่ายความปลอดภัยสาธารณะ',       'Public Safety',        '#DC2626', (SELECT id FROM divisions WHERE code = 'OPERATIONS'), 5),
  ('DIGITAL',    'ฝ่ายบริการดิจิทัล',             'Digital Services',     '#FB923C', (SELECT id FROM divisions WHERE code = 'OPERATIONS'), 6)
ON CONFLICT (code) DO NOTHING;

-- Finance & Admin Division
INSERT INTO departments (code, name_th, name_en, color, division_id, sort_order) VALUES
  ('FINANCE',    'ฝ่ายการเงิน',                  'Finance',              '#10B981', (SELECT id FROM divisions WHERE code = 'FINANCE'), 7),
  ('ACCT',       'ฝ่ายบัญชี',                    'Accounting',           '#34D399', (SELECT id FROM divisions WHERE code = 'FINANCE'), 8),
  ('PROCURE',    'ฝ่ายจัดซื้อจัดจ้าง',            'Procurement',          '#6EE7B7', (SELECT id FROM divisions WHERE code = 'FINANCE'), 9),
  ('HR_ADMIN',   'ฝ่ายทรัพยากรบุคคลและธุรการ',     'HR & Admin',           '#F59E0B', (SELECT id FROM divisions WHERE code = 'FINANCE'), 10),
  ('IT',         'ฝ่ายเทคโนโลยีสารสนเทศ',        'IT',                   '#8B5CF6', (SELECT id FROM divisions WHERE code = 'FINANCE'), 11),
  ('CORP_ADM',   'ฝ่ายบริหารองค์กร',              'Corporate Admin',      '#6B7280', (SELECT id FROM divisions WHERE code = 'FINANCE'), 12)
ON CONFLICT (code) DO NOTHING;

-- Executive "department"
INSERT INTO departments (code, name_th, name_en, color, division_id, sort_order) VALUES
  ('EXEC',       'สำนักกรรมการผู้จัดการ',          'Executive Office',     '#1a1a1a', (SELECT id FROM divisions WHERE code = 'EXEC'), 0)
ON CONFLICT (code) DO NOTHING;

-- ─── EMPLOYEES (all names are fictional placeholders) ───────

-- MD
INSERT INTO employees (employee_code, nickname, full_name_th, full_name_en, email, department_id, division_id, role_level, title_th, title_en, level, tenure_years, salary_thb) VALUES
  ('md1', 'Mike', 'คุณ Mike Chen', 'Mike Chen', 'mike@example.com',
   (SELECT id FROM departments WHERE code = 'EXEC'), (SELECT id FROM divisions WHERE code = 'EXEC'),
   'md', 'กรรมการผู้จัดการ', 'Managing Director', 20, 20, 245000)
ON CONFLICT (employee_code) DO NOTHING;

-- Deputy MDs
INSERT INTO employees (employee_code, nickname, full_name_th, full_name_en, email, department_id, division_id, role_level, title_th, title_en, level, tenure_years, salary_thb) VALUES
  ('dm1', 'James', 'คุณ James Wilson', 'James Wilson', 'james@example.com',
   (SELECT id FROM departments WHERE code = 'SALES'), (SELECT id FROM divisions WHERE code = 'SALES_MKT'),
   'deputy_md', 'รอง กจก.', 'Deputy MD', 16, 15, 175000),
  ('dm2', 'Robert', 'คุณ Robert Taylor', 'Robert Taylor', 'robert@example.com',
   (SELECT id FROM departments WHERE code = 'NET_DEL'), (SELECT id FROM divisions WHERE code = 'OPERATIONS'),
   'deputy_md', 'รอง กจก.', 'Deputy MD', 17, 18, 185000),
  ('dm3', 'Sarah', 'คุณ Sarah Johnson', 'Sarah Johnson', 'sarah@example.com',
   (SELECT id FROM departments WHERE code = 'FINANCE'), (SELECT id FROM divisions WHERE code = 'FINANCE'),
   'deputy_md', 'รอง กจก.', 'Deputy MD', 15, 14, 168000)
ON CONFLICT (employee_code) DO NOTHING;

-- Sales & Marketing
INSERT INTO employees (employee_code, nickname, full_name_th, full_name_en, email, department_id, division_id, role_level, title_th, title_en, level, tenure_years, salary_thb) VALUES
  ('s1', 'Tom', 'คุณ Tom Davis', 'Tom Davis', 'tom@example.com',
   (SELECT id FROM departments WHERE code = 'SALES'), (SELECT id FROM divisions WHERE code = 'SALES_MKT'),
   'manager', 'ผู้จัดการ', 'Manager', 9, 7, 72000),
  ('s2', 'Ryan', 'คุณ Ryan Miller', 'Ryan Miller', 'ryan@example.com',
   (SELECT id FROM departments WHERE code = 'SALES'), (SELECT id FROM divisions WHERE code = 'SALES_MKT'),
   'senior', 'อาวุโส', 'Senior', 6, 4, 46000),
  ('s3', 'Emma', 'คุณ Emma Wilson', 'Emma Wilson', 'emma@example.com',
   (SELECT id FROM departments WHERE code = 'SALES'), (SELECT id FROM divisions WHERE code = 'SALES_MKT'),
   'staff', 'พนักงาน', 'Staff', 4, 2, 24000),
  ('bd1', 'Lisa', 'คุณ Lisa Anderson', 'Lisa Anderson', 'lisa@example.com',
   (SELECT id FROM departments WHERE code = 'BIZ_DEV'), (SELECT id FROM divisions WHERE code = 'SALES_MKT'),
   'manager', 'ผู้จัดการ', 'Manager', 8, 6, 66000),
  ('bd2', 'Kevin', 'คุณ Kevin Park', 'Kevin Park', 'kevin@example.com',
   (SELECT id FROM departments WHERE code = 'BIZ_DEV'), (SELECT id FROM divisions WHERE code = 'SALES_MKT'),
   'staff', 'พนักงาน', 'Staff', 5, 3, 29000)
ON CONFLICT (employee_code) DO NOTHING;

-- Operations
INSERT INTO employees (employee_code, nickname, full_name_th, full_name_en, email, department_id, division_id, role_level, title_th, title_en, level, tenure_years, salary_thb) VALUES
  ('n1', 'David', 'คุณ David Kim', 'David Kim', 'david@example.com',
   (SELECT id FROM departments WHERE code = 'NET_DEL'), (SELECT id FROM divisions WHERE code = 'OPERATIONS'),
   'manager', 'ผู้จัดการ', 'Manager', 10, 8, 78000),
  ('n2', 'Chris', 'คุณ Chris Lee', 'Chris Lee', 'chris@example.com',
   (SELECT id FROM departments WHERE code = 'NET_DEL'), (SELECT id FROM divisions WHERE code = 'OPERATIONS'),
   'senior', 'อาวุโส', 'Senior', 7, 5, 50000),
  ('n3', 'Amy', 'คุณ Amy Zhang', 'Amy Zhang', 'amy@example.com',
   (SELECT id FROM departments WHERE code = 'NET_DEL'), (SELECT id FROM divisions WHERE code = 'OPERATIONS'),
   'staff', 'พนักงาน', 'Staff', 6, 3, 34000),
  ('eb1', 'Mark', 'คุณ Mark Thomas', 'Mark Thomas', 'mark@example.com',
   (SELECT id FROM departments WHERE code = 'ENTERPRISE'), (SELECT id FROM divisions WHERE code = 'OPERATIONS'),
   'director', 'ผู้อำนวยการ', 'Director', 12, 10, 118000),
  ('eb2', 'Jake', 'คุณ Jake Brown', 'Jake Brown', 'jake@example.com',
   (SELECT id FROM departments WHERE code = 'ENTERPRISE'), (SELECT id FROM divisions WHERE code = 'OPERATIONS'),
   'senior', 'อาวุโส', 'Senior', 7, 4, 48000),
  ('ps1', 'Diana', 'คุณ Diana Ross', 'Diana Ross', 'diana@example.com',
   (SELECT id FROM departments WHERE code = 'PUB_SAFETY'), (SELECT id FROM divisions WHERE code = 'OPERATIONS'),
   'manager', 'ผู้จัดการ', 'Manager', 11, 9, 83000),
  ('ps2', 'Brian', 'คุณ Brian White', 'Brian White', 'brian@example.com',
   (SELECT id FROM departments WHERE code = 'PUB_SAFETY'), (SELECT id FROM divisions WHERE code = 'OPERATIONS'),
   'senior', 'อาวุโส', 'Senior', 8, 6, 53000),
  ('ps3', 'Eric', 'คุณ Eric Martin', 'Eric Martin', 'eric@example.com',
   (SELECT id FROM departments WHERE code = 'PUB_SAFETY'), (SELECT id FROM divisions WHERE code = 'OPERATIONS'),
   'senior', 'อาวุโส', 'Senior', 9, 7, 58000),
  ('ds1', 'Nicole', 'คุณ Nicole Green', 'Nicole Green', 'nicole@example.com',
   (SELECT id FROM departments WHERE code = 'DIGITAL'), (SELECT id FROM divisions WHERE code = 'OPERATIONS'),
   'manager', 'ผู้จัดการ', 'Manager', 11, 8, 80000),
  ('ds2', 'Rachel', 'คุณ Rachel Adams', 'Rachel Adams', 'rachel@example.com',
   (SELECT id FROM departments WHERE code = 'DIGITAL'), (SELECT id FROM divisions WHERE code = 'OPERATIONS'),
   'staff', 'พนักงาน', 'Staff', 6, 3, 34000),
  ('ds3', 'Alex', 'คุณ Alex Turner', 'Alex Turner', 'alex@example.com',
   (SELECT id FROM departments WHERE code = 'DIGITAL'), (SELECT id FROM divisions WHERE code = 'OPERATIONS'),
   'staff', 'พนักงาน', 'Staff', 5, 2, 27000)
ON CONFLICT (employee_code) DO NOTHING;

-- Finance & Admin
INSERT INTO employees (employee_code, nickname, full_name_th, full_name_en, email, department_id, division_id, role_level, title_th, title_en, level, tenure_years, salary_thb) VALUES
  ('f1', 'Helen', 'คุณ Helen Scott', 'Helen Scott', 'helen@example.com',
   (SELECT id FROM departments WHERE code = 'FINANCE'), (SELECT id FROM divisions WHERE code = 'FINANCE'),
   'manager', 'ผู้จัดการ', 'Manager', 8, 6, 63000),
  ('f2', 'Frank', 'คุณ Frank Moore', 'Frank Moore', 'frank@example.com',
   (SELECT id FROM departments WHERE code = 'ACCT'), (SELECT id FROM divisions WHERE code = 'FINANCE'),
   'staff', 'พนักงาน', 'Staff', 5, 3, 31000),
  ('hr1', 'Grace', 'คุณ Grace Lee', 'Grace Lee', 'grace@example.com',
   (SELECT id FROM departments WHERE code = 'HR_ADMIN'), (SELECT id FROM divisions WHERE code = 'FINANCE'),
   'manager', 'ผู้จัดการ', 'Manager', 7, 5, 56000),
  ('hr2', 'Julia', 'คุณ Julia Chen', 'Julia Chen', 'julia@example.com',
   (SELECT id FROM departments WHERE code = 'HR_ADMIN'), (SELECT id FROM divisions WHERE code = 'FINANCE'),
   'staff', 'พนักงาน', 'Staff', 5, 2, 27000),
  ('pc1', 'Peter', 'คุณ Peter Hall', 'Peter Hall', 'peter@example.com',
   (SELECT id FROM departments WHERE code = 'PROCURE'), (SELECT id FROM divisions WHERE code = 'FINANCE'),
   'staff', 'พนักงาน', 'Staff', 4, 2, 24000),
  ('it1', 'Sam', 'คุณ Sam Wright', 'Sam Wright', 'sam@example.com',
   (SELECT id FROM departments WHERE code = 'IT'), (SELECT id FROM divisions WHERE code = 'FINANCE'),
   'senior', 'อาวุโส', 'Senior', 6, 4, 44000),
  ('it2', 'Daniel', 'คุณ Daniel King', 'Daniel King', 'daniel@example.com',
   (SELECT id FROM departments WHERE code = 'IT'), (SELECT id FROM divisions WHERE code = 'FINANCE'),
   'staff', 'พนักงาน', 'Staff', 4, 1, 21000),
  ('ca1', 'Leo', 'คุณ Leo Young', 'Leo Young', 'leo@example.com',
   (SELECT id FROM departments WHERE code = 'CORP_ADM'), (SELECT id FROM divisions WHERE code = 'FINANCE'),
   'staff', 'พนักงาน', 'Staff', 3, 1, 19000)
ON CONFLICT (employee_code) DO NOTHING;

-- ─── PROJECTS (all client names are fictional) ─────────────
INSERT INTO projects (code, name, client_name, division_id, department_id, priority, status, budget_thb, monthly_ceiling, gross_margin_pct, required_skills, team_size, progress_pct) VALUES
  ('P1', 'Network Expansion South',  'Client A', (SELECT id FROM divisions WHERE code = 'OPERATIONS'), (SELECT id FROM departments WHERE code = 'NET_DEL'),    'critical', 'active',  180000000, 500000, 15, ARRAY['NET_DEL','PM','ENTERPRISE'], 6, 42),
  ('P7', 'IoT Airport',              'Client B', (SELECT id FROM divisions WHERE code = 'OPERATIONS'), (SELECT id FROM departments WHERE code = 'NET_DEL'),    'medium',   'active',  45000000,  250000, 22, ARRAY['NET_DEL','DIGITAL','PUB_SAFETY'], 4, 30),
  ('P4', 'Cybersecurity Gov',        'Client C', (SELECT id FROM divisions WHERE code = 'OPERATIONS'), (SELECT id FROM departments WHERE code = 'PUB_SAFETY'), 'critical', 'planning', 320000000, 800000, 12, ARRAY['PUB_SAFETY','DIGITAL','NET_DEL','PM'], 8, 0),
  ('P6', 'DC Phase 2',               'Internal', (SELECT id FROM divisions WHERE code = 'OPERATIONS'), (SELECT id FROM departments WHERE code = 'DIGITAL'),    'medium',   'active',  85000000,  300000, 25, ARRAY['DIGITAL','NET_DEL'], 4, 70),
  ('P8', 'Cloud Migration',          'Client D', (SELECT id FROM divisions WHERE code = 'OPERATIONS'), (SELECT id FROM departments WHERE code = 'ENTERPRISE'), 'high',     'active',  120000000, 400000, 20, ARRAY['ENTERPRISE','DIGITAL','PM'], 5, 60),
  ('P2', 'Smart City Platform',      'Client E', (SELECT id FROM divisions WHERE code = 'SALES_MKT'),  (SELECT id FROM departments WHERE code = 'BIZ_DEV'),    'high',     'active',  250000000, 600000, 18, ARRAY['BIZ_DEV','DIGITAL','NET_DEL','SALES'], 7, 25),
  ('P3', 'Smart Hospital',           'Client F', (SELECT id FROM divisions WHERE code = 'SALES_MKT'),  (SELECT id FROM departments WHERE code = 'BIZ_DEV'),    'high',     'active',  150000000, 450000, 19, ARRAY['BIZ_DEV','ENTERPRISE','DIGITAL'], 5, 10),
  ('P5', 'EduTech Platform',         'Client G', (SELECT id FROM divisions WHERE code = 'SALES_MKT'),  (SELECT id FROM departments WHERE code = 'SALES'),      'medium',   'active',  35000000,  200000, 28, ARRAY['SALES','DIGITAL'], 3, 55)
ON CONFLICT (code) DO NOTHING;
