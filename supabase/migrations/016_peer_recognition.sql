-- ============================================================
-- Migration 016: Peer Recognition
-- Small, frequent, Kahneman-approved: many small rewards > few large ones.
-- Tied to the 4C framework so every recognition reinforces the Credo.
-- ============================================================

CREATE TABLE IF NOT EXISTS recognitions (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  from_user_id      UUID REFERENCES users(id) NOT NULL,
  to_user_id        UUID REFERENCES users(id) NOT NULL,
  category_code     TEXT NOT NULL CHECK (category_code IN ('cause', 'career', 'compensation', 'community')),
  message           TEXT NOT NULL,
  message_th        TEXT, -- optional Thai version
  points_awarded    INTEGER DEFAULT 5, -- small but meaningful
  is_public         BOOLEAN DEFAULT true,
  created_at        TIMESTAMPTZ DEFAULT now(),
  -- Prevent self-recognition
  CHECK (from_user_id != to_user_id)
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_recognitions_from ON recognitions(from_user_id);
CREATE INDEX IF NOT EXISTS idx_recognitions_to ON recognitions(to_user_id);
CREATE INDEX IF NOT EXISTS idx_recognitions_category ON recognitions(category_code);
CREATE INDEX IF NOT EXISTS idx_recognitions_created ON recognitions(created_at DESC);

-- RLS
ALTER TABLE recognitions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can give recognition" ON recognitions
  FOR INSERT WITH CHECK (auth.uid() = from_user_id);
CREATE POLICY "Public recognition visible to all" ON recognitions
  FOR SELECT USING (is_public AND auth.uid() IS NOT NULL);
CREATE POLICY "Private recognition visible to participants" ON recognitions
  FOR SELECT USING (NOT is_public AND (auth.uid() = from_user_id OR auth.uid() = to_user_id));
CREATE POLICY "Admins can view all" ON recognitions
  FOR SELECT USING (get_user_role() = 'admin');

-- Trigger: award points to recipient and log activity
CREATE OR REPLACE FUNCTION fn_recognition_awarded()
RETURNS TRIGGER AS $$
BEGIN
  -- Award points to recipient
  INSERT INTO points_transactions (user_id, amount, type, reference_id, description_en, description_th)
  VALUES (
    NEW.to_user_id,
    NEW.points_awarded,
    'contribution',
    NEW.id,
    'Peer recognition from colleague',
    'ได้รับการชื่นชมจากเพื่อนร่วมงาน'
  );

  -- Log activity
  INSERT INTO activity_log (user_id, action, entity_type, entity_id, metadata)
  VALUES (
    NEW.from_user_id,
    'recognition_given',
    'recognition',
    NEW.id,
    jsonb_build_object('to_user_id', NEW.to_user_id, 'category', NEW.category_code, 'points', NEW.points_awarded)
  );

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_recognition_insert
  AFTER INSERT ON recognitions
  FOR EACH ROW EXECUTE FUNCTION fn_recognition_awarded();
