-- ============================================================
-- Migration 013: Consultant Data Collection
-- Supports Dr. Non's embedded ethnography work at TKC
-- ============================================================

-- Observations — field notes from shadowing, meetings, informal encounters
CREATE TABLE IF NOT EXISTS observations (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  observer_id       UUID REFERENCES users(id) NOT NULL,
  subject_user_id   UUID REFERENCES users(id),
  subject_team_id   TEXT,
  observation_type  TEXT NOT NULL CHECK (observation_type IN (
    'interview', 'shadow', 'meeting', 'informal', 'workshop', 'town_hall'
  )),
  content           TEXT NOT NULL,
  tags              TEXT[] DEFAULT '{}',
  sentiment         TEXT CHECK (sentiment IN ('positive', 'neutral', 'negative', 'mixed')),
  credo_signals     JSONB DEFAULT '{}', -- {belonging: "high", purpose: "unclear", ...}
  is_confidential   BOOLEAN DEFAULT false,
  observed_at       TIMESTAMPTZ NOT NULL,
  created_at        TIMESTAMPTZ DEFAULT now()
);

-- Interview Records — structured interview data
CREATE TABLE IF NOT EXISTS interview_records (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  interviewer_id    UUID REFERENCES users(id) NOT NULL,
  interviewee_id    UUID REFERENCES users(id),
  interviewee_name  TEXT, -- for non-employee interviews (candidates, clients)
  interview_type    TEXT NOT NULL CHECK (interview_type IN (
    'one_on_one', 'group', 'exit', 'onboarding', 'stakeholder', 'client'
  )),
  key_findings      TEXT[] DEFAULT '{}',
  pain_points       TEXT[] DEFAULT '{}',
  opportunities     TEXT[] DEFAULT '{}',
  quotes            TEXT[] DEFAULT '{}', -- notable direct quotes
  credo_signals     JSONB DEFAULT '{}',
  four_c_signals    JSONB DEFAULT '{}', -- {cause: "strong", career: "blocked", ...}
  duration_minutes  INTEGER,
  is_recorded       BOOLEAN DEFAULT false,
  transcript_url    TEXT,
  conducted_at      TIMESTAMPTZ NOT NULL,
  created_at        TIMESTAMPTZ DEFAULT now()
);

-- Process Maps — observed workflows and their pain points
CREATE TABLE IF NOT EXISTS process_maps (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  department_id     UUID REFERENCES departments(id),
  division_id       UUID REFERENCES divisions(id),
  process_name_th   TEXT NOT NULL,
  process_name_en   TEXT,
  current_state     TEXT, -- description of how it works now
  pain_points       TEXT[] DEFAULT '{}',
  improvement_ideas TEXT[] DEFAULT '{}',
  stakeholders      TEXT[] DEFAULT '{}',
  complexity        TEXT CHECK (complexity IN ('simple', 'moderate', 'complex', 'chaotic')),
  ai_potential      TEXT CHECK (ai_potential IN ('none', 'low', 'medium', 'high', 'transformative')),
  mapped_by         UUID REFERENCES users(id),
  mapped_at         TIMESTAMPTZ DEFAULT now(),
  created_at        TIMESTAMPTZ DEFAULT now()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_observations_observer ON observations(observer_id);
CREATE INDEX IF NOT EXISTS idx_observations_subject ON observations(subject_user_id);
CREATE INDEX IF NOT EXISTS idx_observations_type ON observations(observation_type);
CREATE INDEX IF NOT EXISTS idx_observations_date ON observations(observed_at);
CREATE INDEX IF NOT EXISTS idx_interviews_interviewer ON interview_records(interviewer_id);
CREATE INDEX IF NOT EXISTS idx_interviews_interviewee ON interview_records(interviewee_id);
CREATE INDEX IF NOT EXISTS idx_process_maps_dept ON process_maps(department_id);

-- RLS
ALTER TABLE observations ENABLE ROW LEVEL SECURITY;
ALTER TABLE interview_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE process_maps ENABLE ROW LEVEL SECURITY;

-- Only consultants (admin role) and managers can see observations
CREATE POLICY "Admins can manage observations" ON observations
  FOR ALL USING (get_user_role() = 'admin');
CREATE POLICY "Managers can view non-confidential observations" ON observations
  FOR SELECT USING (get_user_role() = 'manager' AND NOT is_confidential);

CREATE POLICY "Admins can manage interviews" ON interview_records
  FOR ALL USING (get_user_role() = 'admin');

CREATE POLICY "Admins can manage process maps" ON process_maps
  FOR ALL USING (get_user_role() = 'admin');
CREATE POLICY "All authenticated can view process maps" ON process_maps
  FOR SELECT USING (auth.uid() IS NOT NULL);
