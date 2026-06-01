-- 036_engagement_log_concern_update.sql
--
-- Appends concern-framing insights to the coordination call row
-- based on the second review of the pre-planning transcript.
-- The five additions reflect what the pre-planning call was really about:
-- scope anxiety, population filter, unresolved budget, challenge format,
-- and Dr Non's explicit stance on talent leaving for better pay.

BEGIN;

UPDATE engagement_log
SET key_insights = key_insights || '[
  {
    "finding": "HR coordinator was managing downward expectations — proposed reducing scope. Dr Non: if the group does not engage, that is data showing they cannot be trained in attitude (คะแนนทัศนคติ). He is fine either way.",
    "source": "pre_planning_call",
    "priority": "high"
  },
  {
    "finding": "300 employees is the broader TKC pool. The 26 Ninja Squad members are a deliberate filter from that population — a signal, not a sample.",
    "source": "pre_planning_call",
    "priority": "medium"
  },
  {
    "finding": "Claude subscription budget is NOT approved — coordinator asked for a cost plan, Dr Non deflected to Khun Toom. This is an open financial gap, not a resolved item. Risk: team builds enthusiasm with no tools.",
    "source": "pre_planning_call",
    "priority": "high"
  },
  {
    "finding": "Challenge format planned: 168 hours (one week) to build something independently, then show Dr Non what they made. Not a classroom. Ship or do not ship. No participation points for attendance alone.",
    "source": "pre_planning_call",
    "priority": "high"
  },
  {
    "finding": "Dr Non explicitly stated Ninja members who upskill may leave TKC for higher-paying work — and he is unbothered. The system is designed to make people valuable enough to leave, not to retain through dependency. This is a philosophically different aim from standard HR retention programs.",
    "source": "pre_planning_call",
    "priority": "critical"
  }
]'::jsonb
WHERE event_title = 'Ninja Workshop Coordination Call';

COMMIT;
