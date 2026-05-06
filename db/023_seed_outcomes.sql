-- Seed Outcome data for the "Hall of Records"
-- Maps to projects P6, P8, P5 (which are well underway or nearing completion)

INSERT INTO project_outcomes (
  project_id, 
  budget_actual_thb, 
  timeline_status, 
  quality_score, 
  client_satisfaction,
  predicted_fit,
  predicted_chemistry,
  predicted_overall,
  team_cost_cp,
  team_size,
  notes,
  lessons
) VALUES
  (
    (SELECT id FROM projects WHERE code = 'P6'),
    82000000, 
    'early', 
    92, 
    5,
    88,
    85,
    86,
    85,
    4,
    'The Digital Services team crushed the DC Phase 2 rollout. High alignment between Arcanists and Vanguards.',
    ARRAY['Early involvement of procurement prevented lead-time issues', 'Fighter-class developers reduced sprint cycles by 20%']
  ),
  (
    (SELECT id FROM projects WHERE code = 'P8'),
    125000000, 
    'on_time', 
    85, 
    4,
    82,
    78,
    80,
    120,
    5,
    'Cloud Migration was complex but stable. The chemistry prediction was slightly lower than actual due to high Warden presence.',
    ARRAY['Standardized templates saved 40 hours in documentation', 'Client requested scope change in week 12; absorbed via STR bonus']
  ),
  (
    (SELECT id FROM projects WHERE code = 'P5'),
    38000000, 
    'late', 
    70, 
    3,
    75,
    82,
    78,
    35,
    3,
    'EduTech suffered from high volatility in the Sales-Merchant requirements. Wildcards were stretched too thin.',
    ARRAY['Requirement volatility must be capped in planning phase', 'Need more Warden oversight on margin-sensitive smaller projects']
  )
ON CONFLICT (project_id) DO NOTHING;
