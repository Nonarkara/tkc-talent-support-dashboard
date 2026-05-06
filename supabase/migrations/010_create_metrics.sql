-- Team metrics — tracked over time for each team
-- These are the 4 pillars: Compatibility, Productivity, Efficiency, Belonging
CREATE TABLE IF NOT EXISTS team_metrics (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  team_id         TEXT NOT NULL,              -- zone id (alpha, bravo, etc.)
  period_start    DATE NOT NULL,
  period_end      DATE NOT NULL,

  -- Compatibility (0-100): how well team members work together
  -- Derived from: attribute synergy, class diversity, conflict incidents
  compatibility   INTEGER CHECK (compatibility >= 0 AND compatibility <= 100),

  -- Productivity (0-100): output relative to capacity
  -- Derived from: tasks completed, contribution count, project progress
  productivity    INTEGER CHECK (productivity >= 0 AND productivity <= 100),

  -- Efficiency (0-100): output per resource unit
  -- Derived from: budget utilization, time-to-completion, rework rate
  efficiency      INTEGER CHECK (efficiency >= 0 AND efficiency <= 100),

  -- Belonging (0-100): qualitative sense of connection
  -- Derived from: pulse survey responses, streak days, community contributions
  belonging       INTEGER CHECK (belonging >= 0 AND belonging <= 100),

  notes           TEXT,
  created_at      TIMESTAMPTZ DEFAULT now(),
  UNIQUE(team_id, period_start)
);

CREATE INDEX idx_team_metrics_team ON team_metrics(team_id);
CREATE INDEX idx_team_metrics_period ON team_metrics(period_start);

-- Pulse survey — quick weekly check-in (qualitative but measurable)
CREATE TABLE IF NOT EXISTS pulse_surveys (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         UUID REFERENCES users(id) NOT NULL,
  team_id         TEXT,

  -- 1-5 scale questions
  energy          INTEGER CHECK (energy >= 1 AND energy <= 5),        -- "พลังงานในการทำงานสัปดาห์นี้เป็นอย่างไร?"
  belonging       INTEGER CHECK (belonging >= 1 AND belonging <= 5),  -- "รู้สึกเป็นส่วนหนึ่งของทีมแค่ไหน?"
  growth          INTEGER CHECK (growth >= 1 AND growth <= 5),        -- "ได้เรียนรู้อะไรใหม่ไหม?"
  support         INTEGER CHECK (support >= 1 AND support <= 5),      -- "ได้รับการสนับสนุนจากทีมเพียงพอไหม?"
  clarity         INTEGER CHECK (clarity >= 1 AND clarity <= 5),      -- "เข้าใจเป้าหมายของทีมชัดเจนไหม?"

  -- Open text (optional)
  highlight       TEXT,                       -- "สิ่งที่ดีที่สุดของสัปดาห์นี้"
  blocker         TEXT,                       -- "อะไรที่เป็นอุปสรรค"

  submitted_at    TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_pulse_user ON pulse_surveys(user_id);
CREATE INDEX idx_pulse_team ON pulse_surveys(team_id);
CREATE INDEX idx_pulse_date ON pulse_surveys(submitted_at DESC);

-- Seed historical team metrics (3 months of weekly data)
INSERT INTO team_metrics (team_id, period_start, period_end, compatibility, productivity, efficiency, belonging)
SELECT
  team_id,
  period_start,
  period_start + INTERVAL '7 days' AS period_end,
  -- Generate realistic-looking metrics with some variation
  GREATEST(30, LEAST(95, 60 + (RANDOM() * 30)::INTEGER - 10 + team_bonus)) AS compatibility,
  GREATEST(25, LEAST(95, 55 + (RANDOM() * 35)::INTEGER - 15 + team_bonus)) AS productivity,
  GREATEST(20, LEAST(95, 50 + (RANDOM() * 30)::INTEGER - 10 + team_bonus)) AS efficiency,
  GREATEST(30, LEAST(95, 58 + (RANDOM() * 25)::INTEGER - 8 + team_bonus)) AS belonging
FROM (
  SELECT
    t.team_id,
    t.team_bonus,
    generate_series('2026-01-06'::DATE, '2026-03-23'::DATE, '7 days'::INTERVAL)::DATE AS period_start
  FROM (VALUES
    ('alpha', 5), ('bravo', 0), ('charlie', -5),
    ('delta', 8), ('echo', 3), ('foxtrot', -3)
  ) AS t(team_id, team_bonus)
) sub;
