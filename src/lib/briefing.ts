/**
 * Daily Briefing — the autotelic morning artifact.
 *
 * Five-minute auto-narrative pushed to Obsidian (and rendered on the
 * Home screen). The reason a director opens the dashboard every day:
 * the briefing should be good company.
 *
 * Sections:
 *   Yesterday's signals    — 3 most recent ratified chronicles, 3 most
 *                            recent recognition stamps
 *   Today's calls          — open quests needing staff, employees overdue
 *                            for chronicle (>30 days since last)
 *   Watch                  — at-risk employees: heavy load + stale
 *                            evidence + (later) flow zone = anxiety
 *   Tomorrow               — quests closing this week, ascensions due
 *
 * Pure data + Markdown serialiser. The HTTP layer lives in
 * src/app/api/briefing/today/route.ts; the Obsidian write happens there.
 *
 * Defensive: every section gracefully empty. A new install with zero
 * chronicles still gets a beautiful one-page briefing.
 */

import { isDbConfigured, query } from "./db";

// ─── Types ───────────────────────────────────────────────────────────────

export interface BriefingChronicle {
  employee_id: string;
  employee_name: string;
  manager_name: string | null;
  cycle: string;
  narrative: string;
  approved_at: string | null;
}

export interface BriefingRecognition {
  employee_id: string;
  employee_name: string;
  title: string;
  action_type: string;
  cycle: string;
  created_at: string;
  owner_name: string | null;
}

export interface BriefingOpenQuest {
  project_code: string;
  project_name: string;
  team_size: number;
  current_size: number;
  priority: string | null;
}

export interface BriefingOverdue {
  employee_id: string;
  employee_name: string;
  dept_code: string | null;
  days_since_last_chronicle: number | null;
}

export interface BriefingAtRisk {
  employee_id: string;
  employee_name: string;
  dept_code: string | null;
  fte: number;
  reason: string;
}

export interface DailyBriefing {
  date: string;
  generated_at: string;
  totals: {
    active_heroes: number;
    active_projects: number;
    open_support_actions: number;
    chronicles_this_week: number;
  };
  yesterday_chronicles: BriefingChronicle[];
  yesterday_recognitions: BriefingRecognition[];
  open_quests: BriefingOpenQuest[];
  overdue_check_ins: BriefingOverdue[];
  at_risk: BriefingAtRisk[];
}

// ─── Loader ──────────────────────────────────────────────────────────────

export async function loadBriefing(): Promise<DailyBriefing> {
  const generated_at = new Date().toISOString();
  const date = generated_at.slice(0, 10);

  const empty: DailyBriefing = {
    date, generated_at,
    totals: { active_heroes: 0, active_projects: 0, open_support_actions: 0, chronicles_this_week: 0 },
    yesterday_chronicles: [], yesterday_recognitions: [],
    open_quests: [], overdue_check_ins: [], at_risk: [],
  };

  if (!isDbConfigured()) return empty;

  // Totals
  const [{ active_heroes = 0 } = {}] = await safe<{ active_heroes: number }>(
    `SELECT COUNT(*)::int AS active_heroes FROM employees WHERE is_active = true`,
  );
  const [{ active_projects = 0 } = {}] = await safe<{ active_projects: number }>(
    `SELECT COUNT(*)::int AS active_projects FROM projects
       WHERE status NOT IN ('completed','done','cancelled')`,
  );
  const [{ open_support_actions = 0 } = {}] = await safe<{ open_support_actions: number }>(
    `SELECT COUNT(*)::int AS open_support_actions FROM support_actions
       WHERE status IN ('open','in_progress')`,
  );
  const [{ chronicles_this_week = 0 } = {}] = await safe<{ chronicles_this_week: number }>(
    `SELECT COUNT(*)::int AS chronicles_this_week FROM check_ins
       WHERE created_at > NOW() - INTERVAL '7 days'`,
  );

  // Yesterday's chronicles — last 3 ratified, regardless of exact day, so a
  // briefing that runs on Monday still shows last Friday's work.
  const yesterdayChronicles = await safe<BriefingChronicle>(
    `SELECT ci.employee_id::text,
            COALESCE(e.nickname, e.full_name_en, e.full_name_th) AS employee_name,
            COALESCE(mgr.nickname, mgr.full_name_en, mgr.full_name_th) AS manager_name,
            ci.cycle,
            ci.narrative,
            ci.approved_at::text
       FROM check_ins ci
       JOIN employees e ON e.id = ci.employee_id
       LEFT JOIN employees mgr ON mgr.id = ci.manager_id
       WHERE ci.status = 'approved'
       ORDER BY ci.approved_at DESC NULLS LAST, ci.created_at DESC
       LIMIT 3`,
  );

  // Yesterday's recognitions — last 3 support actions
  const yesterdayRecognitions = await safe<BriefingRecognition>(
    `SELECT sa.employee_id::text,
            COALESCE(e.nickname, e.full_name_en, e.full_name_th) AS employee_name,
            sa.title, sa.action_type, sa.cycle,
            sa.created_at::text,
            COALESCE(owner.nickname, owner.full_name_en, owner.full_name_th) AS owner_name
       FROM support_actions sa
       JOIN employees e ON e.id = sa.employee_id
       LEFT JOIN employees owner ON owner.id = sa.owner_employee_id
       ORDER BY sa.created_at DESC
       LIMIT 3`,
  );

  // Open quests needing staff — projects whose team_size exceeds current allocations
  const openQuests = await safe<BriefingOpenQuest>(
    `SELECT p.code AS project_code, p.name AS project_name,
            p.team_size,
            (SELECT COUNT(DISTINCT pa.employee_id)::int
               FROM project_allocations pa WHERE pa.project_id = p.id) AS current_size,
            p.priority
       FROM projects p
       WHERE p.status NOT IN ('completed','done','cancelled')
         AND p.team_size > (SELECT COUNT(DISTINCT pa.employee_id)
                              FROM project_allocations pa WHERE pa.project_id = p.id)
       ORDER BY
         CASE p.priority WHEN 'critical' THEN 0 WHEN 'high' THEN 1 WHEN 'medium' THEN 2 ELSE 3 END
       LIMIT 8`,
  );

  // Overdue chronicles — heroes whose last check_in (any status) is >30 days old
  // OR who have no check_in at all and have been active >60 days.
  const overdue = await safe<BriefingOverdue>(
    `WITH last_chron AS (
       SELECT employee_id, MAX(created_at) AS last_at
         FROM check_ins
         GROUP BY employee_id
     )
     SELECT e.id::text AS employee_id,
            COALESCE(e.nickname, e.full_name_en, e.full_name_th) AS employee_name,
            d.code AS dept_code,
            CASE WHEN lc.last_at IS NULL THEN NULL
                 ELSE EXTRACT(DAY FROM NOW() - lc.last_at)::int END AS days_since_last_chronicle
       FROM employees e
       LEFT JOIN departments d ON d.id = e.department_id
       LEFT JOIN last_chron lc ON lc.employee_id = e.id
       WHERE e.is_active = true
         AND (
           lc.last_at < NOW() - INTERVAL '30 days'
           OR (lc.last_at IS NULL AND e.created_at < NOW() - INTERVAL '60 days')
         )
       ORDER BY lc.last_at NULLS FIRST
       LIMIT 8`,
  );

  // At-risk — heroes with high allocation FTE
  const atRisk = await safe<BriefingAtRisk>(
    `SELECT e.id::text AS employee_id,
            COALESCE(e.nickname, e.full_name_en, e.full_name_th) AS employee_name,
            d.code AS dept_code,
            COALESCE(SUM(pa.fte), 0)::float AS fte,
            'over capacity'::text AS reason
       FROM employees e
       LEFT JOIN departments d ON d.id = e.department_id
       LEFT JOIN project_allocations pa ON pa.employee_id = e.id
       WHERE e.is_active = true
       GROUP BY e.id, d.code
       HAVING COALESCE(SUM(pa.fte), 0) > 1.05
       ORDER BY fte DESC
       LIMIT 8`,
  );

  return {
    date, generated_at,
    totals: { active_heroes, active_projects, open_support_actions, chronicles_this_week },
    yesterday_chronicles: yesterdayChronicles,
    yesterday_recognitions: yesterdayRecognitions,
    open_quests: openQuests,
    overdue_check_ins: overdue,
    at_risk: atRisk,
  };
}

// ─── Markdown serialiser ─────────────────────────────────────────────────

export function renderBriefingMarkdown(b: DailyBriefing): string {
  const lines: string[] = [];
  lines.push("---");
  lines.push(`date: ${b.date}`);
  lines.push(`generated_at: ${b.generated_at}`);
  lines.push("source: /api/briefing/today");
  lines.push("tags: [tkc, briefing]");
  lines.push("---");
  lines.push("");
  lines.push(`# TKC · The Briefing — ${b.date}`);
  lines.push("");
  lines.push(`*Auto-generated by the Briefing Ritual. Five minutes of reading. Re-run \`POST /api/briefing/today\` to refresh.*`);
  lines.push("");

  // Snapshot strip
  lines.push("## Snapshot");
  lines.push("");
  lines.push(`- **${b.totals.active_heroes}** active heroes`);
  lines.push(`- **${b.totals.active_projects}** active quests`);
  lines.push(`- **${b.totals.chronicles_this_week}** chronicle paragraphs written this week`);
  lines.push(`- **${b.totals.open_support_actions}** open support actions`);
  lines.push("");

  // Yesterday's signals
  lines.push("## Yesterday's signals");
  lines.push("");
  if (b.yesterday_chronicles.length === 0 && b.yesterday_recognitions.length === 0) {
    lines.push("> *Quiet day. No ratified chronicles, no recognition stamps. Today is a fresh page.*");
    lines.push("");
  } else {
    if (b.yesterday_chronicles.length > 0) {
      lines.push("**Chronicles ratified:**");
      lines.push("");
      for (const c of b.yesterday_chronicles) {
        const preview = c.narrative.length > 220 ? `${c.narrative.slice(0, 220)}…` : c.narrative;
        lines.push(`- *${c.employee_name}* — by ${c.manager_name ?? "Anonymous"} (${c.cycle})`);
        lines.push(`  > ${preview}`);
      }
      lines.push("");
    }
    if (b.yesterday_recognitions.length > 0) {
      lines.push("**Recognitions stamped:**");
      lines.push("");
      for (const r of b.yesterday_recognitions) {
        lines.push(`- *${r.employee_name}* — **${r.title}** (${r.action_type.replaceAll("_", " ")}) by ${r.owner_name ?? "Anonymous"}`);
      }
      lines.push("");
    }
  }

  // Today's calls
  lines.push("## Today's calls");
  lines.push("");
  if (b.open_quests.length === 0 && b.overdue_check_ins.length === 0) {
    lines.push("> *Nothing pressing. The board is full and the chronicles are current.*");
    lines.push("");
  } else {
    if (b.open_quests.length > 0) {
      lines.push("**Quests needing staff:**");
      lines.push("");
      for (const q of b.open_quests) {
        const gap = q.team_size - q.current_size;
        lines.push(`- \`${q.project_code}\` **${q.project_name}** — ${q.current_size}/${q.team_size} (${gap} open) · ${q.priority ?? "—"} priority`);
      }
      lines.push("");
    }
    if (b.overdue_check_ins.length > 0) {
      lines.push("**Heroes overdue for a chronicle:**");
      lines.push("");
      for (const o of b.overdue_check_ins) {
        const days = o.days_since_last_chronicle == null ? "never written" : `${o.days_since_last_chronicle} days ago`;
        lines.push(`- *${o.employee_name}* (${o.dept_code ?? "—"}) — last chronicle: ${days}`);
      }
      lines.push("");
    }
  }

  // Watch
  if (b.at_risk.length > 0) {
    lines.push("## Watch");
    lines.push("");
    lines.push("**Heroes carrying too much:**");
    lines.push("");
    for (const r of b.at_risk) {
      lines.push(`- *${r.employee_name}* (${r.dept_code ?? "—"}) — load **${r.fte.toFixed(2)} FTE** · ${r.reason}`);
    }
    lines.push("");
  }

  // Footer
  lines.push("---");
  lines.push("");
  lines.push(`*Briefing generated ${b.generated_at}. Open the [[TKC-Project-Intelligence]] for the synthesis page, or open \`/command-center\` for the live board.*`);
  lines.push("");

  return lines.join("\n");
}

// ─── Helpers ─────────────────────────────────────────────────────────────

async function safe<T>(text: string): Promise<T[]> {
  try {
    return await query<T>(text, []);
  } catch {
    return [];
  }
}
