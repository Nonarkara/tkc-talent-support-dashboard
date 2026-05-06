-- ============================================================
-- Game Balance — runtime-tunable constants for token-economy.ts
--
-- Lift hard-coded numbers out of compiled TypeScript so Dr Non can
-- tune the engine without a redeploy. Single-row "config" table; the
-- TS layer reads it once per request and falls back to baked-in
-- defaults if the row is absent.
--
-- Knobs covered this turn:
--   token_cost_md        — token cost for MD / Deputy MD roles
--   token_cost_director  — token cost for directors
--   token_cost_manager   — token cost for managers
--   token_cost_senior    — token cost for senior staff
--   token_cost_staff     — token cost for staff
--   token_cost_attr_bump — average-attr threshold for the +1 cost bump
--   archetype_fighter_str — STR threshold to override into fighter
--   archetype_fighter_dex — DEX threshold to override into fighter
--   archetype_scout_int   — INT threshold for scout override
--   archetype_scout_wis   — WIS threshold for scout override
--   archetype_tech_int    — INT threshold for tech override
--   archetype_sales_cha   — CHA threshold for sales override
--   hp_base               — HP base (formula: HP = base + CON × multiplier)
--   hp_per_con            — HP multiplier per CON point
--   mp_base               — MP base
--   mp_per_int            — MP multiplier per INT point
--
-- All values are integers stored as JSONB to allow future shape changes
-- (e.g. per-archetype overrides). Edits are append-only via versioning
-- in updated_at — no rollback table this turn (v8.4 if needed).
-- ============================================================

CREATE TABLE IF NOT EXISTS game_balance (
  key        TEXT PRIMARY KEY,
  value      JSONB NOT NULL,
  description TEXT,
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Seed with current defaults extracted from src/lib/token-economy.ts
-- and src/lib/lore.ts (HP/MP formulas).
INSERT INTO game_balance (key, value, description) VALUES
  ('token_cost_md',         '5'::jsonb, 'Token cost for MD / Deputy MD roles'),
  ('token_cost_director',   '4'::jsonb, 'Token cost for directors'),
  ('token_cost_manager',    '3'::jsonb, 'Token cost for managers'),
  ('token_cost_senior',     '2'::jsonb, 'Token cost for senior IC'),
  ('token_cost_staff',      '1'::jsonb, 'Token cost for staff'),
  ('token_cost_attr_bump',  '14'::jsonb, 'Average attribute threshold for +1 token bump'),
  ('archetype_fighter_str', '16'::jsonb, 'STR threshold to classify as Fighter'),
  ('archetype_fighter_dex', '14'::jsonb, 'DEX threshold to classify as Fighter'),
  ('archetype_scout_int',   '15'::jsonb, 'INT threshold to classify as Scout'),
  ('archetype_scout_wis',   '14'::jsonb, 'WIS threshold to classify as Scout'),
  ('archetype_tech_int',    '15'::jsonb, 'INT threshold to classify as Tech'),
  ('archetype_sales_cha',   '14'::jsonb, 'CHA threshold to classify as Sales'),
  ('hp_base',               '40'::jsonb, 'HP formula base (HP = base + CON × per_con)'),
  ('hp_per_con',            '4'::jsonb,  'HP gained per CON point'),
  ('mp_base',               '20'::jsonb, 'MP formula base'),
  ('mp_per_int',            '3'::jsonb,  'MP gained per INT point')
ON CONFLICT (key) DO NOTHING;

CREATE OR REPLACE FUNCTION update_game_balance_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS tr_game_balance_updated_at ON game_balance;
CREATE TRIGGER tr_game_balance_updated_at
  BEFORE UPDATE ON game_balance
  FOR EACH ROW
  EXECUTE FUNCTION update_game_balance_timestamp();
