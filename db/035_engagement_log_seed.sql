-- 035_engagement_log_seed.sql
--
-- Seeds the engagement_log with all sessions to date:
--   1. Pre-workshop prep call (2026-05-25)
--   2. Ninja Squad Workshop (2026-05-26) ← first live engagement session
--
-- Also registers the TKC Assessment Framework (from Catalog แบบทดสอบ PDF)
-- as a reference row so it can be cross-referenced with skill_assessments.
--
-- Idempotent: ON CONFLICT DO NOTHING on event_date + event_title.

BEGIN;

-- Unique constraint for idempotency (guard with DO block)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'engagement_log_date_title_uq'
  ) THEN
    ALTER TABLE engagement_log
      ADD CONSTRAINT engagement_log_date_title_uq
        UNIQUE (event_date, event_title);
  END IF;
END $$;

-- ── Row 1: Pre-workshop prep call ─────────────────────────────────────
INSERT INTO engagement_log (
  event_type, event_date, event_title,
  facilitator, audience, participant_count,
  themes, frameworks_used,
  key_insights, outcomes, follow_ups,
  transcript_ref, notes
) VALUES (
  'meeting',
  '2026-05-25',
  'Ninja Workshop Coordination Call',
  'Dr Non',
  'TKC HR Coordinator (Speaker 2)',
  2,
  ARRAY['workshop_planning','Claude_subscription','AI_tools'],
  ARRAY['agile_facilitation'],
  '[
    {"finding": "26 participants confirmed for the Ninja Squad workshop", "source": "coordinator", "priority": "high"},
    {"finding": "Morning slot (10am-noon) chosen — Dr Non always prefers morning for training energy", "source": "Dr Non", "priority": "medium"},
    {"finding": "Claude Max subscription pricing discussed: ~$20/account or 2 shared accounts for the team", "source": "Dr Non", "priority": "medium"},
    {"finding": "Goal: teach Ninja team to use AI tools (Claude Code) as a force multiplier — same method used to build the Chulalongkorn dashboard (4M THB project, 45 minutes on BTS)", "source": "Dr Non", "priority": "high"},
    {"finding": "Coordinator open to reducing scope if team is not responsive — Dr Non happy to adjust KPIs to match real engagement level", "source": "discussion", "priority": "low"}
  ]'::jsonb,
  '[
    {"type": "planning", "description": "Confirmed 26 participants, 10am start, morning slot"},
    {"type": "planning", "description": "Coordinator to send roster to Dr Non ahead of workshop"}
  ]'::jsonb,
  '[
    {"owner": "Dr Non", "action": "Prepare workshop materials and Digital Twin demo", "due_date": "2026-05-26"},
    {"owner": "HR Coordinator", "action": "Share Claude subscription budget proposal with Khun Toom", "due_date": "2026-05-30"}
  ]'::jsonb,
  'Ninja Workshop Prep with TKC.txt',
  'Pre-workshop logistics call. Tone: collaborative, flexible. Dr Non explicitly does not mind scope reduction — he self-funds his Claude Max usage.'
) ON CONFLICT (event_date, event_title) DO NOTHING;

-- ── Row 2: Main Ninja Squad Workshop ──────────────────────────────────
INSERT INTO engagement_log (
  event_type, event_date, event_title,
  facilitator, audience, participant_count,
  themes, frameworks_used,
  key_insights, outcomes, follow_ups,
  transcript_ref, notes
) VALUES (
  'workshop',
  '2026-05-26',
  'Ninja Squad Activation Workshop — Session 1',
  'Dr Non',
  'TKC Ninja Squad (~26 participants)',
  26,
  ARRAY[
    '4C_framework',
    'digital_twin_demo',
    'ninja_concept',
    'S_curve_analysis',
    'AI_tools',
    'project_ideation',
    'Dragon_Quest_metaphor'
  ],
  ARRAY[
    '4C Framework (Compensation / Cause / Career / Community)',
    'Dragon Quest III vocation-and-party metaphor',
    'Ninja vs Nuclear Bomb (lean delivery)',
    'S-Curve lifecycle analysis',
    'Musk 4-step: Question → Streamline → Optimize → Automate'
  ],
  '[
    {"finding": "Workshop opened with honesty: some participants admitted their work feels boring — validated as a method problem, not a people problem", "source": "opening_discussion", "priority": "high"},
    {"finding": "4C Framework resonated: Cause (reason to work) and Career (growth/flow) identified as most lacking at TKC by participants", "source": "group_discussion", "priority": "high"},
    {"finding": "Digital Twin demo received strong positive reaction — the game-based RPG framing (employee cards, team formation, lobby visualization) made HR data feel alive", "source": "observation", "priority": "high"},
    {"finding": "Ninja concept landed well: do more with less, like a ninja using a pencil instead of nuclear weapons — applied to project delivery", "source": "Dr_Non_framing", "priority": "high"},
    {"finding": "Group exercise (20M THB National TV Portal challenge) generated active participation across all teams. One team proposed: NBTC as regulatory hub + pilot-first approach before seeking full 1B budget", "source": "group_exercise", "priority": "medium"},
    {"finding": "Real project pitches emerged in final segment — parking system with AI cameras (real-time availability), DEF team communication breakdown (QA not receiving requirements from client-facing roles), proposed IEEE 12207 + AI video explainer workflow", "source": "participant_presentations", "priority": "medium"},
    {"finding": "S-Curve diagnosis delivered directly: TKC has been in saturation for ~2 years. Recent 100M+ profit came from asset sales, not core business (which is net-negative). Without a new growth curve, layoffs within 2 years are probable", "source": "Dr_Non_analysis", "priority": "critical"},
    {"finding": "Chulalongkorn 45-minute dashboard story used as proof point — 4M THB project brief, turned into a working dashboard in 45 minutes on the BTS, using AI + the same methodology being taught here", "source": "Dr_Non_demo", "priority": "high"},
    {"finding": "Kodak and Nokia examples used to illustrate S-Curve — the disruption is not a failure of quality but a failure to see the next curve in time", "source": "Dr_Non_analysis", "priority": "medium"},
    {"finding": "Closing ask: participants invited to self-select into active Ninja Squad membership. Those who commit get real project support from Dr Non, including access to his network to sell/deploy their work", "source": "closing", "priority": "high"}
  ]'::jsonb,
  '[
    {"type": "engagement", "description": "26 participants attended, energy described as enthusiastic — no one zoned out"},
    {"type": "engagement", "description": "Participants asked substantive questions and presented real project ideas, not placeholder concepts"},
    {"type": "awareness", "description": "S-Curve analysis was the high-stakes reveal — TKC leadership has known, but this was likely the first time front-line staff heard it framed so directly"},
    {"type": "product_demo", "description": "TKC Digital Twin demo well-received — the RPG game framing made abstract HR concepts tangible"},
    {"type": "recruitment", "description": "Soft recruitment into active Ninja Squad — participants signalled willingness to continue"}
  ]'::jsonb,
  '[
    {"owner": "Dr Non", "action": "Log assessment framework from colleague LINE message into DB and cross-reference with skill_assessments schema", "due_date": "2026-05-28"},
    {"owner": "Dr Non", "action": "Follow up with HR on Claude subscription plan for the Ninja team (~2 shared Claude Max accounts)", "due_date": "2026-06-02"},
    {"owner": "Dr Non", "action": "Structure Ninja project tracks based on participant pitches — parking system (Speaker 8) and DEF communication (Speaker 7) are candidate pilot projects", "due_date": "2026-06-09"},
    {"owner": "HR Coordinator", "action": "Circulate workshop attendance record and award HR points to participants", "due_date": "2026-05-28"},
    {"owner": "TKC Leadership", "action": "Decision required: AI Unit advisory framing — does TKC want Dr Non as founding advisor of an AI Unit (separate from consulting contract)?", "due_date": "2026-06-15"}
  ]'::jsonb,
  'TKC May 26 Workshop.txt',
  'Two-hour session. Format: presentation → group exercise (5 groups) → participant project pitches → S-Curve closing. Facilitator intro by Khun Toom. Participants included members from DEF, PMO, and other technical teams. Workshop ran from ~10am to ~2:15pm (longer than planned). Kra Thom drink noted as fuel.'
) ON CONFLICT (event_date, event_title) DO NOTHING;

-- ── Row 3: Assessment Framework Reference ─────────────────────────────
INSERT INTO engagement_log (
  event_type, event_date, event_title,
  facilitator, audience, participant_count,
  themes, frameworks_used,
  key_insights, outcomes, follow_ups,
  transcript_ref, notes
) VALUES (
  'assessment',
  '2026-05-26',
  'TKC Assessment Framework Intake — Catalog แบบทดสอบ',
  'HR Department (TKC)',
  'TKC HR / Promotion Panel',
  NULL,
  ARRAY[
    'cognitive_ability',
    'EQ',
    'leadership',
    'promotion_readiness',
    'competency_assessment'
  ],
  ARRAY[
    'Promotion Readiness Model §7.2',
    '3-axis competency framework: Cognitive Ability + People Skill + Competency Gap/Fit'
  ],
  '[
    {"finding": "TKC uses a 7-category standardised test suite for career development and promotion decisions", "source": "Catalog แบบทดสอบ PDF", "priority": "high"},
    {"finding": "Promotion readiness §7.2 is determined by three axes: (1) Cognitive Ability = Cognitive Ability Test + Situational Judgment; (2) People Skill = Problem-Solving Assessment + Leadership Competency Interview; (3) Competency Gap/Fit = Competency Assessment + 360° Feedback", "source": "Catalog แบบทดสอบ PDF §7.2", "priority": "critical"},
    {"finding": "The assessment catalog was shared by a colleague via LINE (message received 2026-05-26) — HR is actively looking for tools to verify and cross-reference assessment results", "source": "LINE_message", "priority": "high"},
    {"finding": "The 3-axis promotion readiness model maps closely to the Digital Twin skill dimensions: Cognitive Ability ↔ Technical + Authenticity, People Skill ↔ Soft Skill + Resilience, Competency Gap ↔ skill_assessments gap analysis", "source": "Dr_Non_synthesis", "priority": "high"},
    {"finding": "A SharePoint link to the assessment tools was shared by the colleague — requires corporate auth to access. Needs follow-up to extract tool specifications", "source": "LINE_message", "priority": "medium"}
  ]'::jsonb,
  '[
    {"type": "data_intake", "description": "Assessment framework catalogued and cross-referenced with Digital Twin schema"},
    {"type": "integration_opportunity", "description": "3-axis model (Cognitive + People + Competency) can be imported as structured skill_assessments rows, enriching the cassette with HR-verified scores"}
  ]'::jsonb,
  '[
    {"owner": "Dr Non", "action": "Map §7.2 assessment axes to skill_assessments schema — create import template so HR can paste results directly into the cassette", "due_date": "2026-06-09"},
    {"owner": "Dr Non", "action": "Request SharePoint link to be shared as direct download or forwarded to a non-auth URL — so tool specs can be parsed without corporate login", "due_date": "2026-06-02"},
    {"owner": "HR Department", "action": "Pilot 1 assessment cycle with Ninja Squad volunteers to establish baseline data in the system", "due_date": "2026-06-30"}
  ]'::jsonb,
  'Catalog แบบทดสอบ.pdf',
  'Assessment catalog received via LINE from TKC colleague on the same day as the Ninja Workshop. Logged as a reference row so the framework can be cross-referenced when building the assessment import pipeline.'
) ON CONFLICT (event_date, event_title) DO NOTHING;

COMMIT;
