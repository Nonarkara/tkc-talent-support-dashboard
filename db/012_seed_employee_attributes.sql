-- Seed default attribute rows so the Chronicle ritual can operate.
--
-- Every active employee needs exactly one row in `employee_attributes`
-- (the schema already enforces UNIQUE on employee_id). When rosters
-- are imported via CSV the attribute row is not always created — this
-- migration backfills defaults (all attributes = 10, "neutral") for
-- any employee without one. Idempotent: safe to re-run.
--
-- 10 is the DQ3 "default human" value: neither gifted nor weak. First
-- real check-in cycle will move them off it.

INSERT INTO employee_attributes (employee_id, str, int, wis, cha, dex, con)
SELECT e.id, 10, 10, 10, 10, 10, 10
  FROM employees e
 WHERE e.is_active = true
   AND NOT EXISTS (
     SELECT 1 FROM employee_attributes ea WHERE ea.employee_id = e.id
   );
