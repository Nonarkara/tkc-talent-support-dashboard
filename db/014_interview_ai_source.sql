-- 014_interview_ai_source.sql
-- Extend the skill_assessments.source CHECK constraint to allow
-- 'interview_ai' — the tag Phase 2's Gen-AI extraction pipeline will
-- use when it writes proficiency rows derived from interview transcripts.
--
-- This is the entire schema change needed for Phase 2. The transcript
-- URL lives in evidence_url, the timestamp lives in assessed_at, and
-- the longitudinal view is just `SELECT ... ORDER BY assessed_at`.
--
-- Idempotent.

BEGIN;

ALTER TABLE skill_assessments
  DROP CONSTRAINT IF EXISTS skill_assessments_source_check;

ALTER TABLE skill_assessments
  ADD CONSTRAINT skill_assessments_source_check
  CHECK (source IN ('self', 'manager', 'peer', 'assessment', 'system', 'interview_ai'));

INSERT INTO _migrations (name) VALUES ('014_interview_ai_source')
ON CONFLICT (name) DO NOTHING;

COMMIT;
