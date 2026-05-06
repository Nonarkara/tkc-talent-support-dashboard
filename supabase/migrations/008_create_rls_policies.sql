-- Enable RLS on all tables
ALTER TABLE departments ENABLE ROW LEVEL SECURITY;
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE contribution_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE contribution_types ENABLE ROW LEVEL SECURITY;
ALTER TABLE contributions ENABLE ROW LEVEL SECURITY;
ALTER TABLE points_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE badge_definitions ENABLE ROW LEVEL SECURITY;
ALTER TABLE badge_awards ENABLE ROW LEVEL SECURITY;
ALTER TABLE activity_log ENABLE ROW LEVEL SECURITY;

-- Helper function to get current user's role
CREATE OR REPLACE FUNCTION get_user_role()
RETURNS TEXT AS $$
  SELECT role FROM users WHERE id = auth.uid();
$$ LANGUAGE sql SECURITY DEFINER STABLE;

-- Helper function to get current user's department
CREATE OR REPLACE FUNCTION get_user_department_id()
RETURNS UUID AS $$
  SELECT department_id FROM users WHERE id = auth.uid();
$$ LANGUAGE sql SECURITY DEFINER STABLE;

-- Departments: readable by all authenticated users
CREATE POLICY "departments_select" ON departments FOR SELECT TO authenticated USING (true);

-- Users: readable by all authenticated, updatable by self or admin
CREATE POLICY "users_select" ON users FOR SELECT TO authenticated USING (true);
CREATE POLICY "users_update_self" ON users FOR UPDATE TO authenticated
  USING (id = auth.uid());
CREATE POLICY "users_update_admin" ON users FOR UPDATE TO authenticated
  USING (get_user_role() = 'admin');
CREATE POLICY "users_insert_admin" ON users FOR INSERT TO authenticated
  WITH CHECK (get_user_role() = 'admin' OR id = auth.uid());

-- Categories & Types: readable by all
CREATE POLICY "categories_select" ON contribution_categories FOR SELECT TO authenticated USING (true);
CREATE POLICY "types_select" ON contribution_types FOR SELECT TO authenticated USING (true);

-- Contributions:
-- employees see own + all verified
-- managers see own department
-- admins see all
CREATE POLICY "contributions_select_own" ON contributions FOR SELECT TO authenticated
  USING (
    user_id = auth.uid()
    OR status = 'verified'
    OR get_user_role() = 'admin'
    OR (get_user_role() = 'manager' AND user_id IN (
      SELECT id FROM users WHERE department_id = get_user_department_id()
    ))
  );
CREATE POLICY "contributions_insert" ON contributions FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid());
CREATE POLICY "contributions_update_own" ON contributions FOR UPDATE TO authenticated
  USING (user_id = auth.uid() AND status = 'pending');
CREATE POLICY "contributions_verify" ON contributions FOR UPDATE TO authenticated
  USING (
    get_user_role() IN ('manager', 'admin')
  );

-- Points: own or manager's team or admin
CREATE POLICY "points_select" ON points_transactions FOR SELECT TO authenticated
  USING (
    user_id = auth.uid()
    OR get_user_role() = 'admin'
    OR (get_user_role() = 'manager' AND user_id IN (
      SELECT id FROM users WHERE department_id = get_user_department_id()
    ))
  );

-- Badges: definitions readable by all, awards readable by all (public gamification)
CREATE POLICY "badge_defs_select" ON badge_definitions FOR SELECT TO authenticated USING (true);
CREATE POLICY "badge_defs_manage" ON badge_definitions FOR ALL TO authenticated
  USING (get_user_role() = 'admin');
CREATE POLICY "badge_awards_select" ON badge_awards FOR SELECT TO authenticated USING (true);

-- Activity log: readable by all (the feed is public)
CREATE POLICY "activity_select" ON activity_log FOR SELECT TO authenticated USING (true);
