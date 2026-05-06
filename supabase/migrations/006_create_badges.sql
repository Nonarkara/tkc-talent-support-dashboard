-- Badge definitions
CREATE TABLE IF NOT EXISTS badge_definitions (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code            TEXT UNIQUE NOT NULL,
  name_th         TEXT NOT NULL,
  name_en         TEXT NOT NULL,
  description_th  TEXT NOT NULL,
  description_en  TEXT NOT NULL,
  icon_url        TEXT,
  category_id     UUID REFERENCES contribution_categories(id),
  tier            TEXT CHECK (tier IN ('bronze', 'silver', 'gold', 'platinum')) DEFAULT 'bronze',
  criteria_type   TEXT NOT NULL CHECK (criteria_type IN ('count', 'points', 'streak', 'custom')),
  criteria_value  INTEGER,
  criteria_json   JSONB,
  bonus_points    INTEGER DEFAULT 0,
  is_active       BOOLEAN DEFAULT true,
  created_at      TIMESTAMPTZ DEFAULT now()
);

-- Badge awards
CREATE TABLE IF NOT EXISTS badge_awards (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         UUID REFERENCES users(id) NOT NULL,
  badge_id        UUID REFERENCES badge_definitions(id) NOT NULL,
  awarded_at      TIMESTAMPTZ DEFAULT now(),
  UNIQUE(user_id, badge_id)
);

CREATE INDEX idx_badge_awards_user ON badge_awards(user_id);

-- Seed badge definitions
INSERT INTO badge_definitions (code, name_th, name_en, description_th, description_en, tier, criteria_type, criteria_value, criteria_json, bonus_points) VALUES
  ('first_contribution',  'ก้าวแรก',          'First Step',          'ส่งผลงานชิ้นแรก',                          'Submit your first contribution',                    'bronze',   'count',  1,    '{"contribution_type": "any"}',                                      10),
  ('cross_pollinator',    'ผู้เชื่อมสะพาน',     'Cross-Pollinator',    'ทำงานข้ามทีมกับ 3 แผนกขึ้นไป',               'Collaborate across 3+ departments',                 'gold',     'custom', 3,    '{"type": "distinct_departments", "contribution_code": "cross_team_collab"}', 100),
  ('knowledge_sharer',    'ผู้แบ่งปัน',         'Knowledge Sharer',    'แบ่งปันความรู้ 5 ครั้งขึ้นไป',                  'Share knowledge 5+ times',                          'silver',   'count',  5,    '{"contribution_code": "knowledge_sharing"}',                        50),
  ('innovation_spark',    'ประกายนวัตกรรม',     'Innovation Spark',    'เสนอไอเดียนวัตกรรม 1 ครั้ง',                  'Submit an innovation proposal',                     'bronze',   'count',  1,    '{"contribution_code": "innovation_proposal"}',                     25),
  ('streak_7',            'ไม่หยุดพัก 7 วัน',   '7-Day Streak',        'มีส่วนร่วมติดต่อกัน 7 วัน',                   'Engage 7 consecutive days',                         'bronze',   'streak', 7,    null,                                                                30),
  ('streak_30',           'นักสู้ 30 วัน',      '30-Day Warrior',      'มีส่วนร่วมติดต่อกัน 30 วัน',                  'Engage 30 consecutive days',                        'silver',   'streak', 30,   null,                                                                100),
  ('level_5',             'ระดับ 5',           'Level 5',             'เลื่อนระดับถึง 5',                            'Reach level 5',                                     'silver',   'points', 5,    '{"type": "level_reached"}',                                         50),
  ('level_10',            'ระดับ 10',          'Level 10',            'เลื่อนระดับถึง 10',                           'Reach level 10',                                    'gold',     'points', 10,   '{"type": "level_reached"}',                                         150),
  ('four_c_champion',     'แชมป์ 4C',          '4C Champion',         'ส่งผลงานครบทุก 4 ด้าน',                      'Contribute in all 4C categories',                   'platinum', 'custom', 4,    '{"type": "all_categories"}',                                        200),
  ('mentor_hero',         'ฮีโร่พี่เลี้ยง',       'Mentor Hero',         'เป็นพี่เลี้ยง 10 ครั้งขึ้นไป',                  'Mentor 10+ times',                                  'gold',     'count',  10,   '{"contribution_code": "mentoring"}',                                75),
  ('revenue_driver',      'ขับเคลื่อนรายได้',    'Revenue Driver',      'สร้างรายได้ให้บริษัท 5 ครั้ง',                  'Generate revenue 5 times',                          'gold',     'count',  5,    '{"contribution_code": "revenue_contribution"}',                    100),
  ('top_10_monthly',      'Top 10 ประจำเดือน',  'Monthly Top 10',      'ติด Top 10 ลีดเดอร์บอร์ดประจำเดือน',          'Reach monthly leaderboard top 10',                  'silver',   'custom', 1,    '{"type": "monthly_top_10"}',                                        50);
