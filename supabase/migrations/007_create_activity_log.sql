-- Activity log for real-time feed
CREATE TABLE IF NOT EXISTS activity_log (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID REFERENCES users(id),
  action      TEXT NOT NULL,
  entity_type TEXT,
  entity_id   UUID,
  metadata    JSONB DEFAULT '{}',
  created_at  TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_activity_created ON activity_log(created_at DESC);
CREATE INDEX idx_activity_user ON activity_log(user_id);

-- Enable Supabase Realtime on activity_log
ALTER PUBLICATION supabase_realtime ADD TABLE activity_log;

-- Function to log activity when contribution is verified
CREATE OR REPLACE FUNCTION fn_log_contribution_verified()
RETURNS TRIGGER AS $$
BEGIN
  -- Only fire when status changes to 'verified'
  IF NEW.status = 'verified' AND (OLD.status IS NULL OR OLD.status != 'verified') THEN
    -- Award points
    INSERT INTO points_transactions (user_id, amount, type, reference_id, description_th, description_en)
    SELECT
      NEW.user_id,
      COALESCE(NEW.points_awarded, ct.base_points),
      'contribution',
      NEW.id,
      'ได้รับแต้มจากผลงาน: ' || NEW.title,
      'Points from contribution: ' || NEW.title
    FROM contribution_types ct
    WHERE ct.id = NEW.type_id;

    -- Update points_awarded if not set
    IF NEW.points_awarded IS NULL THEN
      UPDATE contributions
      SET points_awarded = (SELECT base_points FROM contribution_types WHERE id = NEW.type_id)
      WHERE id = NEW.id;
    END IF;

    -- Log the verification
    INSERT INTO activity_log (user_id, action, entity_type, entity_id, metadata)
    VALUES (
      NEW.user_id,
      'contribution_verified',
      'contribution',
      NEW.id,
      jsonb_build_object('title', NEW.title, 'verifier_id', NEW.verified_by)
    );
  END IF;

  -- Log rejection
  IF NEW.status = 'rejected' AND (OLD.status IS NULL OR OLD.status != 'rejected') THEN
    INSERT INTO activity_log (user_id, action, entity_type, entity_id, metadata)
    VALUES (
      NEW.user_id,
      'contribution_rejected',
      'contribution',
      NEW.id,
      jsonb_build_object('title', NEW.title, 'note', NEW.rejection_note)
    );
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER tr_contribution_status_change
  AFTER UPDATE OF status ON contributions
  FOR EACH ROW
  EXECUTE FUNCTION fn_log_contribution_verified();

-- Log new contribution submission
CREATE OR REPLACE FUNCTION fn_log_contribution_submitted()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO activity_log (user_id, action, entity_type, entity_id, metadata)
  VALUES (
    NEW.user_id,
    'contribution_submitted',
    'contribution',
    NEW.id,
    jsonb_build_object('title', NEW.title)
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER tr_contribution_submitted
  AFTER INSERT ON contributions
  FOR EACH ROW
  EXECUTE FUNCTION fn_log_contribution_submitted();

-- Log badge awards
CREATE OR REPLACE FUNCTION fn_log_badge_awarded()
RETURNS TRIGGER AS $$
DECLARE
  badge_name TEXT;
BEGIN
  SELECT name_th INTO badge_name FROM badge_definitions WHERE id = NEW.badge_id;

  INSERT INTO activity_log (user_id, action, entity_type, entity_id, metadata)
  VALUES (
    NEW.user_id,
    'badge_earned',
    'badge',
    NEW.badge_id,
    jsonb_build_object('badge_name', badge_name)
  );

  -- Award bonus points for the badge
  INSERT INTO points_transactions (user_id, amount, type, reference_id, description_th, description_en)
  SELECT
    NEW.user_id,
    bd.bonus_points,
    'badge_bonus',
    NEW.id,
    'โบนัสจากเหรียญ: ' || bd.name_th,
    'Badge bonus: ' || bd.name_en
  FROM badge_definitions bd
  WHERE bd.id = NEW.badge_id AND bd.bonus_points > 0;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER tr_badge_awarded
  AFTER INSERT ON badge_awards
  FOR EACH ROW
  EXECUTE FUNCTION fn_log_badge_awarded();
