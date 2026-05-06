-- v3.3 · Front Row
--
-- DQ3 party order. The front row takes hits; the back row is protected.
-- Until now a Formation slot has had no positional meaning; a captain
-- and a scout both just occupy the same dimension. With party_order,
-- the director explicitly assigns each hero a row, and the formation
-- shape flows into the chemistry bonus (leader-up-front + healer-in-
-- back earns +5 chemistry).
--
-- 1 = front (takes hits)
-- 2 = mid (default — no special meaning, just "on the team")
-- 3 = back (protected)

ALTER TABLE project_allocations
  ADD COLUMN IF NOT EXISTS party_order int NOT NULL DEFAULT 2
  CHECK (party_order BETWEEN 1 AND 3);

COMMENT ON COLUMN project_allocations.party_order IS
  'DQ3 party order. 1=front (takes hits), 2=mid (default), 3=back (protected).';
