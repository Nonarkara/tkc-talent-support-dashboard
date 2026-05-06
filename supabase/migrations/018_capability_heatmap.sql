-- ============================================================
-- Migration 018: Capability Heatmap & Skills
-- Beyond RPG attributes — track actual, validated skills.
-- The Moneyball layer: find undervalued talent through data.
-- ============================================================

-- Individual skill assessments
CREATE TABLE IF NOT EXISTS skill_assessments (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         UUID REFERENCES users(id) NOT NULL,
  skill_name      TEXT NOT NULL,
  skill_category  TEXT CHECK (skill_category IN (
    'technical', 'leadership', 'domain', 'tool', 'soft_skill', 'certification'
  )) DEFAULT 'technical',
  proficiency     INTEGER NOT NULL CHECK (proficiency >= 1 AND proficiency <= 5),
  -- 1=Awareness, 2=Beginner, 3=Competent, 4=Proficient, 5=Expert
  source          TEXT CHECK (source IN (
    'self', 'peer', 'manager', 'certification', 'project', 'assessment'
  )) DEFAULT 'self',
  validated_by    UUID REFERENCES users(id),
  evidence_url    TEXT,
  notes           TEXT,
  assessed_at     TIMESTAMPTZ DEFAULT now(),
  expires_at      TIMESTAMPTZ, -- some skills decay (certifications expire)
  UNIQUE(user_id, skill_name, source)
);

-- Skill adjacency map — which skills are close to each other
-- Used for reskilling path recommendations
CREATE TABLE IF NOT EXISTS skill_adjacencies (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  skill_a         TEXT NOT NULL,
  skill_b         TEXT NOT NULL,
  transition_ease NUMERIC(3,2) NOT NULL CHECK (transition_ease >= 0 AND transition_ease <= 1),
  -- 1.0 = trivial transition, 0.0 = completely unrelated
  notes           TEXT,
  UNIQUE(skill_a, skill_b)
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_skills_user ON skill_assessments(user_id);
CREATE INDEX IF NOT EXISTS idx_skills_name ON skill_assessments(skill_name);
CREATE INDEX IF NOT EXISTS idx_skills_category ON skill_assessments(skill_category);
CREATE INDEX IF NOT EXISTS idx_skill_adj_a ON skill_adjacencies(skill_a);
CREATE INDEX IF NOT EXISTS idx_skill_adj_b ON skill_adjacencies(skill_b);

-- RLS
ALTER TABLE skill_assessments ENABLE ROW LEVEL SECURITY;
ALTER TABLE skill_adjacencies ENABLE ROW LEVEL SECURITY;

-- Users see own skills, managers see team, admin sees all
CREATE POLICY "Users can manage own skills" ON skill_assessments
  FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "Managers can view team skills" ON skill_assessments
  FOR SELECT USING (
    get_user_role() = 'manager'
    AND user_id IN (SELECT id FROM users WHERE department_id = get_user_department_id())
  );
CREATE POLICY "Admins can manage all skills" ON skill_assessments
  FOR ALL USING (get_user_role() = 'admin');

CREATE POLICY "All can view adjacencies" ON skill_adjacencies
  FOR SELECT USING (auth.uid() IS NOT NULL);
CREATE POLICY "Admins can manage adjacencies" ON skill_adjacencies
  FOR ALL USING (get_user_role() = 'admin');

-- Seed some skill adjacencies relevant to TKC
INSERT INTO skill_adjacencies (skill_a, skill_b, transition_ease, notes) VALUES
  ('Network Engineering', 'Cybersecurity', 0.75, 'Strong overlap in infrastructure knowledge'),
  ('Network Engineering', 'Cloud Architecture', 0.60, 'Networking fundamentals transfer'),
  ('Cybersecurity', 'Penetration Testing', 0.85, 'Direct specialization'),
  ('Software Development', 'DevOps', 0.65, 'Code skills transfer to infrastructure-as-code'),
  ('Software Development', 'Data Engineering', 0.55, 'Programming transfers, domain differs'),
  ('UX Design', 'Product Management', 0.60, 'User-centric thinking transfers'),
  ('UX Design', 'Frontend Development', 0.45, 'Design-to-code gap'),
  ('Project Management', 'Product Management', 0.55, 'Delivery skills overlap, strategy differs'),
  ('Sales', 'Business Development', 0.80, 'Client-facing skills directly transfer'),
  ('Sales', 'Account Management', 0.70, 'Relationship skills transfer'),
  ('Accounting', 'Financial Analysis', 0.75, 'Numbers foundation transfers'),
  ('IT Support', 'System Administration', 0.70, 'Hands-on infra knowledge'),
  ('IoT', 'Network Engineering', 0.60, 'Connected device + networking'),
  ('AI/ML', 'Data Engineering', 0.55, 'Data pipeline skills overlap'),
  ('Cloud Architecture', 'DevOps', 0.70, 'Infrastructure management overlap')
ON CONFLICT (skill_a, skill_b) DO NOTHING;

-- View: Org capability heatmap
CREATE OR REPLACE VIEW v_capability_heatmap AS
SELECT
  d.code AS dept_code,
  d.name_en AS dept_name,
  sa.skill_name,
  sa.skill_category,
  COUNT(DISTINCT sa.user_id) AS people_count,
  ROUND(AVG(sa.proficiency), 1) AS avg_proficiency,
  MAX(sa.proficiency) AS max_proficiency
FROM skill_assessments sa
JOIN users u ON u.id = sa.user_id AND u.is_active = true
JOIN departments d ON d.id = u.department_id
GROUP BY d.code, d.name_en, sa.skill_name, sa.skill_category;
