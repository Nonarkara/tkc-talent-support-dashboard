-- 026 — Criteria-based attribute seeding for all employees
--
-- Seeds STR/INT/WIS/CHA/DEX/CON using:
--   - role_level  → base stat pool (staff=6 … md=16)
--   - tenure_years → WIS and CON bonus (up to +3)
--   - dept code pattern → per-attribute weight
--   - hashtext(employee_id::text || attr)  → deterministic ±2 jitter
--
-- The top two MDs already have hand-tuned stats and are left alone.
-- All other employees with flat 10/10/10 are seeded.
-- Idempotent: WHERE stat_source = 'neutral_seed' guard.

DO $$
DECLARE
  r RECORD;
  role_base INTEGER;
  tenure_bonus_wis INTEGER;
  tenure_bonus_con INTEGER;
  dept TEXT;
  jitter INTEGER;
  new_str INTEGER;
  new_int INTEGER;
  new_wis INTEGER;
  new_cha INTEGER;
  new_dex INTEGER;
  new_con INTEGER;
  seed INTEGER;
BEGIN

  FOR r IN
    SELECT
      e.id,
      e.role_level,
      COALESCE(e.tenure_years, 0) AS tenure_years,
      COALESCE(d.code, '') AS dept_code
    FROM employees e
    LEFT JOIN departments d ON d.id = e.department_id
    LEFT JOIN employee_attributes ea ON ea.employee_id = e.id
    WHERE e.is_active = true
      AND (ea.stat_source IS NULL OR ea.stat_source = 'neutral_seed')
      -- Skip employees who already have varied stats (hand-tuned or prior seed)
      AND (
        ea.str IS NULL
        OR (ea.str = 10 AND ea.int = 10 AND ea.wis = 10
            AND ea.cha = 10 AND ea.dex = 10 AND ea.con = 10)
      )
  LOOP

    -- 1. Role-level base pool (higher = more experienced/capable)
    role_base := CASE r.role_level
      WHEN 'md'         THEN 16
      WHEN 'deputy_md'  THEN 14
      WHEN 'director'   THEN 12
      WHEN 'manager'    THEN 10
      WHEN 'senior'     THEN 8
      ELSE                   6   -- staff
    END;

    -- 2. Tenure-derived wisdom and constitution bonuses
    tenure_bonus_wis := LEAST(r.tenure_years / 5, 3);
    tenure_bonus_con := LEAST(r.tenure_years / 7, 2);

    -- 3. Department pattern → attribute bias
    --    dept_code examples: 'IT', 'BD', 'HR', 'FIN', 'OPS', 'MKT', 'STRAT'
    dept := upper(r.dept_code);

    -- 4. Compute seeded jitter per attribute using hashtext
    --    hashtext returns a 32-bit int; mod 5 gives 0-4, subtract 2 → -2..+2
    seed := abs(hashtext(r.id::text));

    -- STR — throughput, operations, execution
    jitter := (abs(hashtext(r.id::text || 'str')) % 5) - 2;
    new_str := role_base + jitter
      + CASE WHEN dept IN ('OPS','FAC','LOG','ADMIN') THEN 2
             WHEN dept IN ('IT','TECH','DEV')         THEN -1
             ELSE 0 END;

    -- INT — reasoning, technical depth
    jitter := (abs(hashtext(r.id::text || 'int')) % 5) - 2;
    new_int := role_base + jitter
      + CASE WHEN dept IN ('IT','TECH','DEV','DATA','STRAT','FIN') THEN 2
             WHEN dept IN ('OPS','FAC','LOG')                       THEN -1
             ELSE 0 END;

    -- WIS — judgment, long experience
    jitter := (abs(hashtext(r.id::text || 'wis')) % 5) - 2;
    new_wis := role_base + jitter + tenure_bonus_wis
      + CASE WHEN dept IN ('STRAT','HR','LEGAL')  THEN 1
             ELSE 0 END;

    -- CHA — influence, persuasion, client trust
    jitter := (abs(hashtext(r.id::text || 'cha')) % 5) - 2;
    new_cha := role_base + jitter
      + CASE WHEN dept IN ('BD','SALES','MKT','PR','CX') THEN 2
             WHEN dept IN ('IT','TECH','DEV')            THEN -1
             ELSE 0 END;

    -- DEX — speed, adaptability (inverse age proxy: junior = faster)
    jitter := (abs(hashtext(r.id::text || 'dex')) % 5) - 2;
    new_dex := role_base + jitter
      + CASE WHEN r.role_level IN ('staff','senior') THEN 2  -- juniors are quick
             WHEN r.role_level IN ('md','deputy_md') THEN -1 -- vets move deliberate
             ELSE 0 END
      + CASE WHEN dept IN ('IT','TECH','DEV','BD') THEN 1
             ELSE 0 END;

    -- CON — stamina, longevity, not burning out
    jitter := (abs(hashtext(r.id::text || 'con')) % 5) - 2;
    new_con := role_base + jitter + tenure_bonus_con;

    -- 5. Clamp all to 1–20
    new_str := GREATEST(1, LEAST(20, new_str));
    new_int := GREATEST(1, LEAST(20, new_int));
    new_wis := GREATEST(1, LEAST(20, new_wis));
    new_cha := GREATEST(1, LEAST(20, new_cha));
    new_dex := GREATEST(1, LEAST(20, new_dex));
    new_con := GREATEST(1, LEAST(20, new_con));

    -- 6. Upsert employee_attributes
    INSERT INTO employee_attributes (employee_id, str, int, wis, cha, dex, con,
                                     stat_locked, stat_source, stat_seed, stat_criteria)
    VALUES (
      r.id, new_str, new_int, new_wis, new_cha, new_dex, new_con,
      true,                       -- locked after seeding; unlock per AI/manager request
      'criteria_seed',
      seed,
      jsonb_build_object(
        'role_level',    r.role_level,
        'tenure_years',  r.tenure_years,
        'dept_code',     r.dept_code,
        'role_base',     role_base,
        'seeded_at',     now()
      )
    )
    ON CONFLICT (employee_id) DO UPDATE
      SET str           = EXCLUDED.str,
          int           = EXCLUDED.int,
          wis           = EXCLUDED.wis,
          cha           = EXCLUDED.cha,
          dex           = EXCLUDED.dex,
          con           = EXCLUDED.con,
          stat_locked   = true,
          stat_source   = 'criteria_seed',
          stat_seed     = EXCLUDED.stat_seed,
          stat_criteria = EXCLUDED.stat_criteria,
          updated_at    = now();

    -- 7. Write audit log entry
    INSERT INTO game_adjustment_log (
      target_type, target_id, action, source, field,
      before_value, after_value, criteria_snapshot, reason
    ) VALUES (
      'employee', r.id, 'seed', 'system', 'all_attributes',
      '{"str":10,"int":10,"wis":10,"cha":10,"dex":10,"con":10}'::jsonb,
      jsonb_build_object('str',new_str,'int',new_int,'wis',new_wis,
                         'cha',new_cha,'dex',new_dex,'con',new_con),
      jsonb_build_object(
        'role_level', r.role_level,
        'tenure_years', r.tenure_years,
        'dept_code', r.dept_code
      ),
      'Initial criteria-based seed: role=' || r.role_level || ', tenure=' || r.tenure_years::text
    );

  END LOOP;

END $$;

-- Seed project scores using complexity heuristic
UPDATE projects
SET
  complexity_score      = GREATEST(10, LEAST(90,
    50 + (abs(hashtext(id::text || 'cplx')) % 40) - 20)),
  urgency_score         = GREATEST(10, LEAST(90,
    50 + (abs(hashtext(id::text || 'urg'))  % 40) - 20)),
  strategic_value_score = GREATEST(20, LEAST(95,
    60 + (abs(hashtext(id::text || 'strat')) % 35) - 17)),
  delivery_risk_score   = GREATEST(10, LEAST(80,
    40 + (abs(hashtext(id::text || 'risk'))  % 40) - 20)),
  ai_leverage_score     = GREATEST(10, LEAST(85,
    45 + (abs(hashtext(id::text || 'ai'))    % 40) - 20)),
  config_locked         = true,
  config_source         = 'criteria_seed',
  config_seed           = abs(hashtext(id::text)),
  config_criteria       = jsonb_build_object('seeded_at', now())
WHERE config_source IS NULL
   OR config_source = 'neutral_seed';

INSERT INTO _migrations (name) VALUES ('026_criteria_seed')
ON CONFLICT (name) DO NOTHING;
