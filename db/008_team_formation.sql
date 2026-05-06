-- Team formation + token economy (Move A MVP).
-- Adds director priority weights per project (sum = 10 across 5 archetypes)
-- and per-employee allocation percentages (50 or 100) to team compositions.

ALTER TABLE projects
  ADD COLUMN IF NOT EXISTS priority_weights jsonb
  NOT NULL DEFAULT '{"captain":2,"tech":2,"sales":2,"ops":2,"scout":2}'::jsonb;

ALTER TABLE team_compositions
  ADD COLUMN IF NOT EXISTS allocation_pcts jsonb
  NOT NULL DEFAULT '{}'::jsonb;
