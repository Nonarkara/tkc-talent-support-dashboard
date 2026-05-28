-- 033_ninja_five_party_seed.sql
--
-- Seed the five canonical Ninja party quest rows introduced by the
-- 2026-05-26 five-party expansion. The UI now loads/saves against
-- NINJA_ZEN/KODAWARI/IKIGAI/WABISABI/BUSHIDO, so these records must
-- exist for title PATCH flows and first-load hydration to work.
--
-- Idempotent: safe to re-run.

BEGIN;

INSERT INTO quests (code, title, cycle, status, notes, role_slots)
VALUES
  ('NINJA_ZEN', 'Siam City Signal Atlas', '2026-Q2', 'scouting', 'Zen Party', '[]'::jsonb),
  ('NINJA_KODAWARI', 'Hero Loom Talent Engine', '2026-Q2', 'scouting', 'Kodawari Party', '[]'::jsonb),
  ('NINJA_IKIGAI', 'Ikigai Talent Engine', '2026-Q2', 'scouting', 'Ikigai Party', '[]'::jsonb),
  ('NINJA_WABISABI', 'Field Intelligence Grid', '2026-Q2', 'scouting', 'Wabisabi Party', '[]'::jsonb),
  ('NINJA_BUSHIDO', 'Civic Shield Response Grid', '2026-Q2', 'scouting', 'Bushido Party', '[]'::jsonb)
ON CONFLICT (code) DO UPDATE SET
  title = EXCLUDED.title,
  cycle = EXCLUDED.cycle,
  status = EXCLUDED.status,
  notes = EXCLUDED.notes;

INSERT INTO _migrations (name) VALUES ('033_ninja_five_party_seed')
ON CONFLICT (name) DO NOTHING;

COMMIT;
