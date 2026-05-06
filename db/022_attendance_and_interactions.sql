-- v3.4 · Persistence Layer
--
-- Adds the missing tables for Lobby attendance and interactions.
-- Ensures Postgres is the source of truth for all events.

-- ─── ATTENDANCE LOG ──────────────────────────────────────────
CREATE TABLE IF NOT EXISTS attendance_log (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id  uuid NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
  action       text NOT NULL CHECK (action IN ('in', 'out')),
  source       text DEFAULT 'manual',
  punched_at   timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_attendance_employee_at
  ON attendance_log (employee_id, punched_at DESC);

CREATE INDEX IF NOT EXISTS idx_attendance_punched_at
  ON attendance_log (punched_at DESC);

-- ─── INTERACTIONS ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS interactions (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  initiator_id      uuid NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
  partner_id        uuid NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
  interaction_type  text DEFAULT 'chat',
  note              text,
  happened_at       timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_interactions_initiator
  ON interactions (initiator_id, happened_at DESC);

CREATE INDEX IF NOT EXISTS idx_interactions_partner
  ON interactions (partner_id, happened_at DESC);

CREATE INDEX IF NOT EXISTS idx_interactions_happened_at
  ON interactions (happened_at DESC);

COMMENT ON TABLE attendance_log IS 'Append-only log of lobby check-in / check-out punches.';
COMMENT ON TABLE interactions IS 'Append-only log of lobby chat / proximity events between employees.';
