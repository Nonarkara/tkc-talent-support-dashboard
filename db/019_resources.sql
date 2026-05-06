-- Resources register — the "cassette contains more than just people" table.
--
-- Until now the app modelled only human resources (employees).
-- TKC runs a data centre, owns compute, holds software licences, and
-- has a wishlist of hardware (NVIDIA GPUs, Max Wellship etc.). All of
-- these are allocatable capacity against projects. This table is the
-- single list.
--
-- `status` lets us distinguish owned-and-usable from wishlist-only
-- from co-location-available (we own it, other companies can rent
-- capacity).

CREATE TABLE IF NOT EXISTS resources (
  code       TEXT PRIMARY KEY,
  label      TEXT NOT NULL,
  category   TEXT NOT NULL CHECK (category IN (
    'datacentre','compute','license','headcount','wishlist'
  )),
  capacity   NUMERIC,
  unit       TEXT,
  status     TEXT NOT NULL DEFAULT 'owned' CHECK (status IN (
    'owned','wishlist','co-location'
  )),
  notes      TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_resources_category ON resources(category);
CREATE INDEX IF NOT EXISTS idx_resources_status ON resources(status);

CREATE TRIGGER tr_resources_updated_at
  BEFORE UPDATE ON resources
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at();

-- ─── Seed — the known TKC resource landscape ──────────────────────────
INSERT INTO resources (code, label, category, capacity, unit, status, notes) VALUES
  ('DC-BKK-01',   'Bangkok Data Centre',                  'datacentre', 2.0,   'MW',     'owned',       'Primary DC. Co-location capacity available for enterprise clients.'),
  ('DC-SC-7K',    'Smart City Tambon Pool',               'datacentre', 7000,  'nodes',  'owned',       'Distributed edge across 7k tambons for Smart City Thailand.'),
  ('COMP-OLLAMA', 'Ollama On-Prem LLM Cluster',           'compute',    4,     'GPUs',   'owned',       'For Department of Corrections and other air-gapped customers.'),
  ('COMP-H100',   'NVIDIA H100 · SXM Block',              'compute',    8,     'GPUs',   'wishlist',    'Target capacity for AI CoE. Unblocks model training at scale.'),
  ('COMP-MAXW',   'NVIDIA Max Wellship (rumoured)',       'compute',    NULL,  NULL,     'wishlist',    'Strategic wishlist. Track availability and pricing.'),
  ('LIC-PALAN',   'Palantir AIP Seat Pool',               'license',    20,    'seats',  'owned',       'For enterprise analytics accounts.'),
  ('HC-DIGIT',    'Digital Department Headcount',         'headcount',  34,    'FTE',    'owned',       'Shared across CoEs. Over-allocation risk flagged on Matrix tab.')
ON CONFLICT (code) DO NOTHING;
