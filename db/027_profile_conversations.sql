-- ============================================================
-- Migration 027: Profile Conversations (Talk-to-Fill)
--
-- Polymorphic conversation log for the AI-driven profile builder.
-- One row per conversation; transcript and proposal stored as
-- JSONB so the schema stays stable as the wizard evolves.
--
-- Status flow: open → proposed → approved | abandoned
-- ============================================================

CREATE TABLE IF NOT EXISTS profile_conversations (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  target_type     TEXT NOT NULL CHECK (target_type IN ('employee', 'project')),
  target_id       UUID NOT NULL,
  started_by      UUID NULL,                 -- actor (manager/director); nullable for system runs
  status          TEXT NOT NULL DEFAULT 'open'
                    CHECK (status IN ('open', 'proposed', 'approved', 'abandoned')),
  transcript      JSONB NOT NULL DEFAULT '[]'::jsonb,  -- [{ role: 'user'|'assistant', content, ts }]
  proposal        JSONB NULL,                -- the structured extraction once AI is confident
  approved_at     TIMESTAMPTZ NULL,
  approved_by     UUID NULL,
  abandoned_at    TIMESTAMPTZ NULL,
  reason          TEXT NULL,                 -- audit reason on commit/abandon
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_profile_conversations_target
  ON profile_conversations(target_type, target_id);

CREATE INDEX IF NOT EXISTS idx_profile_conversations_status
  ON profile_conversations(status, created_at DESC);
