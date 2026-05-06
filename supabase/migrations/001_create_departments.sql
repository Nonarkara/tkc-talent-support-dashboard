-- Create departments table
CREATE TABLE IF NOT EXISTS departments (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name_th       TEXT NOT NULL,
  name_en       TEXT NOT NULL,
  code          TEXT UNIQUE NOT NULL,
  head_user_id  UUID,  -- FK added after users table exists
  color         TEXT DEFAULT '#3B82F6',
  created_at    TIMESTAMPTZ DEFAULT now()
);

-- Seed TKC departments
INSERT INTO departments (code, name_th, name_en, color) VALUES
  ('NET_ENG',   'วิศวกรรมโครงข่าย',     'Network Engineering',  '#3B82F6'),
  ('SW_DEV',    'พัฒนาซอฟต์แวร์',       'Software Development', '#8B5CF6'),
  ('CYBER',     'ไซเบอร์ซีเคียวริตี้',    'Cybersecurity',        '#EF4444'),
  ('SALES',     'ฝ่ายขาย',              'Sales',                '#10B981'),
  ('UX',        'ออกแบบ UX/UI',         'UX/UI Design',         '#EC4899'),
  ('TALENT',    'สนับสนุนบุคลากร',       'Talent Support',       '#F59E0B'),
  ('PM',        'บริหารโครงการ',          'Project Management',   '#06B6D4'),
  ('ADMIN_FIN', 'ธุรการและการเงิน',       'Admin & Finance',      '#6B7280');
