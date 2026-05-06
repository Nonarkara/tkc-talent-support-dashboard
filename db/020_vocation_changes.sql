-- v3.2 · Alltrades Abbey
--
-- DQ3 canon: at level 20 a hero walks into Alltrades Abbey and changes
-- vocation. Stats halve. Level resets to 1. Spells survive the change.
-- The institutional memory (spells) carries; the mechanical expertise
-- (stats) takes a step back.
--
-- HR equivalent: internal career move. This table is the append-only
-- ledger of every reskilling event. We keep the canonical truth in the
-- employee row (dept_code + archetype derivation) and the *story* here:
-- who moved from what to what, when, at whose suggestion, for what reason.
--
-- The from/to archetype values are the Archetype union literals from
-- src/lib/token-economy.ts: captain | tech | sales | ops | scout (and
-- whatever v3.4 Septet adds: fighter, goofoff). We store them as plain
-- text rather than an enum so adding a new archetype doesn't require a
-- migration.

CREATE TABLE IF NOT EXISTS vocation_changes (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id     uuid NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
  from_archetype  text NOT NULL,
  to_archetype    text NOT NULL,
  changed_at      timestamptz NOT NULL DEFAULT now(),
  -- Flavour fields: the DQ3 level-reset and any human context. Null-safe
  -- so the API can skip them for quick recordings.
  level_before    int,
  reason          text,
  note            text,
  -- Audit: who triggered the change. Null for system/director-initiated
  -- until we wire auth; treat it as "the boss" by convention.
  actor_id        text
);

CREATE INDEX IF NOT EXISTS vocation_changes_employee_idx
  ON vocation_changes (employee_id, changed_at DESC);

CREATE INDEX IF NOT EXISTS vocation_changes_changed_at_idx
  ON vocation_changes (changed_at DESC);
