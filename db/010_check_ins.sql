-- Check-ins — the Chronicle ritual, made literal.
--
-- A manager writes a paragraph about an employee during a review cycle.
-- The LLM proposes attribute deltas; the manager ratifies or edits them.
-- The narrative is preserved verbatim as audit trail; the approved
-- deltas get stamped into `events` and `employee_attributes`.
--
-- Status lifecycle:
--   draft     → created, narrative saved, LLM not yet called
--   proposed  → llm_proposal populated, awaiting manager ratification
--   approved  → approved payload set, attributes updated, events written
--   rejected  → manager discarded the draft (kept for history)

CREATE TABLE IF NOT EXISTS check_ins (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id    UUID NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
  manager_id     UUID REFERENCES employees(id) ON DELETE SET NULL,
  cycle          TEXT NOT NULL,           -- '2026-Q2' (quarterly default)
  narrative      TEXT NOT NULL,
  llm_proposal   JSONB,                   -- { deltas: [...], model, latency_ms }
  approved       JSONB,                   -- { deltas: [{attr, delta}], notes? }
  status         TEXT NOT NULL DEFAULT 'draft'
                   CHECK (status IN ('draft','proposed','approved','rejected')),
  created_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
  approved_at    TIMESTAMPTZ,
  created_by     UUID REFERENCES employees(id) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS idx_check_ins_employee_created
  ON check_ins (employee_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_check_ins_status
  ON check_ins (status);
