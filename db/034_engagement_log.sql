-- 034_engagement_log.sql
--
-- Org-level engagement event ledger.
--
-- Captures workshops, demos, presentations, assessments, and
-- structured interviews at the organisation level (not individual
-- employee stat events — those live in the `events` table).
--
-- Each row is an immutable record of an event. Insights, outcomes,
-- follow-ups, and raw transcript metadata live in JSONB so the schema
-- stays narrow while the payload grows over time.
--
-- Surfaced on the progress report at tkc.nonarkara.org.

BEGIN;

CREATE TABLE IF NOT EXISTS engagement_log (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Classification
  event_type     TEXT NOT NULL
                   CHECK (event_type IN (
                     'workshop',       -- facilitated group session
                     'demo',           -- live product demo
                     'interview',      -- 1-on-1 structured interview
                     'assessment',     -- psychometric / skill assessment
                     'presentation',   -- one-way presentation
                     'meeting',        -- alignment / planning meeting
                     'field_obs'       -- field observation / site visit
                   )),
  event_date     DATE NOT NULL,
  event_title    TEXT NOT NULL,

  -- Who
  facilitator    TEXT,                  -- e.g. "Dr Non"
  audience       TEXT,                  -- e.g. "Ninja Squad"
  participant_count INT,

  -- Content
  themes         TEXT[],                -- e.g. ARRAY['4C', 'S-Curve', 'Digital Twin']
  frameworks_used TEXT[],               -- e.g. ARRAY['4C Framework', 'Dragon Quest metaphor']
  key_insights   JSONB NOT NULL DEFAULT '[]',   -- array of {finding, source, priority}
  outcomes       JSONB NOT NULL DEFAULT '[]',   -- array of {type, description}
  follow_ups     JSONB NOT NULL DEFAULT '[]',   -- array of {owner, action, due_date}

  -- Artefacts
  transcript_ref TEXT,                  -- file path or URL to raw transcript
  report_ref     TEXT,                  -- link to published report/devlog entry

  -- Metadata
  notes          TEXT,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_engagement_log_date
  ON engagement_log (event_date DESC);

CREATE INDEX IF NOT EXISTS idx_engagement_log_type
  ON engagement_log (event_type, event_date DESC);

-- Sheets mirror registration (tab will auto-create on next bootstrap)
-- Tab name: EngagementLog

COMMIT;
