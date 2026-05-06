-- v3.5 "The Living World" — Schema Expansion

-- 1. Add Growth & Personality to Employees
ALTER TABLE employees 
ADD COLUMN IF NOT EXISTS xp INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS traits JSONB DEFAULT '[]',
ADD COLUMN IF NOT EXISTS perks JSONB DEFAULT '[]';

-- 2. Create World Events Table
CREATE TABLE IF NOT EXISTS world_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_date DATE UNIQUE NOT NULL DEFAULT CURRENT_DATE,
  code TEXT NOT NULL, -- e.g. 'MARKET_BOOM', 'FLU_SEASON'
  name TEXT NOT NULL,
  description TEXT,
  modifier_type TEXT NOT NULL, -- 'stat_buff', 'fte_debuff', 'xp_multiplier'
  impact_json JSONB, -- { "target": "merchant", "stat": "cha", "value": 2 }
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. Seed some initial events for the current week
INSERT INTO world_events (event_date, code, name, description, modifier_type, impact_json)
VALUES 
  (CURRENT_DATE, 'TECH_BOOM', 'Silicon Valley Influx', 'A wave of new documentation standards has boosted efficiency.', 'xp_multiplier', '{"target": "wizard", "multiplier": 1.5}'),
  (CURRENT_DATE + 1, 'MARKET_BOOM', 'Thai SET Rally', 'The stock market is up. Sales confidence is at an all-time high.', 'stat_buff', '{"target": "merchant", "stat": "cha", "value": 2}'),
  (CURRENT_DATE + 2, 'MONSOON', 'Heavy Rainfall', 'Commute delays are affecting the physical presence of the team.', 'fte_debuff', '{"target": "all", "fte_loss": 0.1}')
ON CONFLICT (event_date) DO NOTHING;
