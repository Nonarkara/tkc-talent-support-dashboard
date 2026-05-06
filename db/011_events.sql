-- Events — the canonical append-only ledger.
--
-- Every stat change, XP gain, level-up, allocation change, and
-- check-in gets a row here. The `events` table is the source of truth
-- for the Check-ins timeline, XP accumulation (→ level bands), and the
-- Sheets `Events` tab mirror.
--
-- verbs:
--   stat_delta   — one attribute changed. payload: {attr, delta, from, to}
--   xp_gain      — XP awarded.            payload: {amount, reason}
--   level_up     — band crossed.          payload: {from_band, to_band}
--   allocation   — team composition edit. payload: {project_id, pct_from, pct_to}
--   check_in     — chronicle ratified.    payload: {narrative_preview, deltas}

CREATE TABLE IF NOT EXISTS events (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  actor_id       UUID REFERENCES employees(id) ON DELETE SET NULL,
  subject_id     UUID REFERENCES employees(id) ON DELETE CASCADE,
  verb           TEXT NOT NULL
                   CHECK (verb IN ('stat_delta','xp_gain','level_up','allocation','check_in')),
  payload        JSONB NOT NULL,
  source         TEXT,                    -- 'check_in:<uuid>' | 'outcome:<uuid>' | 'manual'
  created_at     TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_events_subject_created
  ON events (subject_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_events_verb_created
  ON events (verb, created_at DESC);
