-- Contributions table (the core entity)
CREATE TABLE IF NOT EXISTS contributions (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         UUID REFERENCES users(id) NOT NULL,
  type_id         UUID REFERENCES contribution_types(id) NOT NULL,
  title           TEXT NOT NULL,
  description     TEXT,
  evidence_url    TEXT,
  status          TEXT CHECK (status IN ('pending', 'verified', 'rejected')) DEFAULT 'pending',
  verified_by     UUID REFERENCES users(id),
  verified_at     TIMESTAMPTZ,
  rejection_note  TEXT,
  points_awarded  INTEGER,
  submitted_at    TIMESTAMPTZ DEFAULT now(),
  created_at      TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_contributions_user ON contributions(user_id);
CREATE INDEX idx_contributions_status ON contributions(status);
CREATE INDEX idx_contributions_submitted ON contributions(submitted_at DESC);
CREATE INDEX idx_contributions_type ON contributions(type_id);
