-- Project slot sheets — the bill-of-materials for a project.
--
-- Each project declares how many seats it needs per dimension. Unlike
-- priority_weights (which was weight-based, sum = 10, abstract), slots
-- are absolute counts: "5G IOT = 10 technical · 2 sales · 1 marketing
-- · 2 outsourcing · 1 paperwork". No cap, no sum constraint.
--
-- Dimensions are project-side (what the project needs), distinct from
-- person-archetypes (what a person is). Fit is a cross-product.
--
-- priority_weights column stays (legacy; still used by Cockpit roster-DNA
-- view). project_slots is the new semantic for Teams-screen planning.

ALTER TABLE projects
  ADD COLUMN IF NOT EXISTS project_slots jsonb
  NOT NULL DEFAULT '{"technical":0,"sales":0,"marketing":0,"outsourcing":0,"paperwork":0}'::jsonb;
