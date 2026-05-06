-- Points transactions (immutable ledger)
CREATE TABLE IF NOT EXISTS points_transactions (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         UUID REFERENCES users(id) NOT NULL,
  amount          INTEGER NOT NULL,
  type            TEXT CHECK (type IN (
    'contribution', 'badge_bonus', 'manager_award',
    'streak_bonus', 'level_up_bonus', 'adjustment'
  )) NOT NULL,
  reference_id    UUID,
  description_th  TEXT,
  description_en  TEXT,
  created_at      TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_points_user ON points_transactions(user_id);
CREATE INDEX idx_points_created ON points_transactions(created_at DESC);
CREATE INDEX idx_points_type ON points_transactions(type);

-- Function to update user totals after point transaction
CREATE OR REPLACE FUNCTION fn_update_user_totals()
RETURNS TRIGGER AS $$
DECLARE
  new_total INTEGER;
  new_level INTEGER;
  accumulated INTEGER;
  lvl INTEGER;
BEGIN
  -- Calculate new total
  SELECT COALESCE(SUM(amount), 0) INTO new_total
  FROM points_transactions
  WHERE user_id = NEW.user_id;

  -- Calculate level from total points
  -- Formula: pointsForLevel(n) = floor(100 * n * 1.5)
  lvl := 1;
  accumulated := 0;
  WHILE accumulated + FLOOR(100 * lvl * 1.5) <= new_total LOOP
    accumulated := accumulated + FLOOR(100 * lvl * 1.5);
    lvl := lvl + 1;
  END LOOP;

  new_level := lvl;

  -- Update user
  UPDATE users
  SET total_points = new_total,
      level = new_level,
      updated_at = now()
  WHERE id = NEW.user_id;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER tr_points_update_user_totals
  AFTER INSERT ON points_transactions
  FOR EACH ROW
  EXECUTE FUNCTION fn_update_user_totals();
