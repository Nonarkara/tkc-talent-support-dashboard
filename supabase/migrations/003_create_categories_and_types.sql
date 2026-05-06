-- 4C Framework categories
CREATE TABLE IF NOT EXISTS contribution_categories (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code          TEXT UNIQUE NOT NULL,
  name_th       TEXT NOT NULL,
  name_en       TEXT NOT NULL,
  description_th TEXT,
  description_en TEXT,
  icon          TEXT,
  color         TEXT,
  sort_order    INTEGER DEFAULT 0
);

INSERT INTO contribution_categories (code, name_th, name_en, description_th, description_en, icon, color, sort_order) VALUES
  ('cause',        'คุณค่า',     'Cause',        'ผลงานที่สร้างคุณค่าให้องค์กรและสังคม', 'Contributions that create value', 'Heart',      '#EF4444', 1),
  ('career',       'อาชีพ',      'Career',       'การพัฒนาทักษะและความก้าวหน้า',       'Skill development and growth',    'TrendingUp', '#3B82F6', 2),
  ('compensation', 'ผลตอบแทน',   'Compensation', 'ผลงานที่สร้างรายได้และลดต้นทุน',      'Revenue and cost impact',         'Coins',      '#10B981', 3),
  ('community',    'ชุมชน',      'Community',    'การทำงานร่วมกันและแบ่งปันความรู้',     'Collaboration and sharing',       'Users',      '#F59E0B', 4);

-- Contribution types
CREATE TABLE IF NOT EXISTS contribution_types (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  category_id   UUID REFERENCES contribution_categories(id) NOT NULL,
  code          TEXT UNIQUE NOT NULL,
  name_th       TEXT NOT NULL,
  name_en       TEXT NOT NULL,
  description_th TEXT,
  description_en TEXT,
  base_points   INTEGER NOT NULL DEFAULT 10,
  is_active     BOOLEAN DEFAULT true
);

-- Seed contribution types
INSERT INTO contribution_types (category_id, code, name_th, name_en, base_points)
SELECT cc.id, ct.code, ct.name_th, ct.name_en, ct.base_points
FROM (VALUES
  ('career',       'task_completion',     'งานสำเร็จ',              'Task Completion',           10),
  ('career',       'skill_acquisition',   'เรียนรู้ทักษะใหม่',        'Skill Acquisition',         25),
  ('career',       'innovation_proposal', 'เสนอไอเดียนวัตกรรม',      'Innovation Proposal',       50),
  ('career',       'certification',       'ได้รับใบรับรอง',           'Certification Earned',      40),
  ('community',    'knowledge_sharing',   'แบ่งปันความรู้',           'Knowledge Sharing',         20),
  ('community',    'cross_team_collab',   'ทำงานข้ามทีม',            'Cross-Team Collaboration',  30),
  ('community',    'mentoring',           'เป็นพี่เลี้ยง',            'Mentoring',                 25),
  ('community',    'social_event',        'จัดกิจกรรม',              'Social Event Organization', 15),
  ('cause',        'process_improvement', 'ปรับปรุงกระบวนการ',        'Process Improvement',       35),
  ('cause',        'client_impact',       'สร้างคุณค่าให้ลูกค้า',      'Client Impact',             40),
  ('cause',        'quality_initiative',  'ริเริ่มด้านคุณภาพ',         'Quality Initiative',        30),
  ('compensation', 'revenue_contribution','สร้างรายได้',              'Revenue Contribution',      50),
  ('compensation', 'cost_saving',         'ลดต้นทุน',               'Cost Saving',               30),
  ('compensation', 'reusable_component',  'สร้าง Component ใช้ซ้ำ',   'Reusable Component',        35)
) AS ct(cat_code, code, name_th, name_en, base_points)
JOIN contribution_categories cc ON cc.code = ct.cat_code;
