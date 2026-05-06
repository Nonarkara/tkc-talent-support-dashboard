/**
 * Obsidian export — Markdown serialisation of TKC dashboard state.
 *
 * Pure functions (no I/O) that turn dashboard payload + DB rows into
 * Markdown strings. The route handler at
 * `src/app/api/export/obsidian/route.ts` writes the strings to disk.
 *
 * Vault layout (under OBSIDIAN_VAULT_PATH, default `~/Documents/SecondBrain/03-Topics/TKC`):
 *
 *   TKC-Project-Intelligence.md   — top-level synthesis, regenerated on each call
 *   TKC-Roster-Pulse.md           — one-line-per-hero scoreboard
 *   TKC-Heroes/{employee_code}.md — one note per active employee
 *
 * Voice: Dr Non aesthetic — observation-first, no marketing tone, plain
 * English, no exclamation marks. The Markdown should read as if an HR
 * director took 10 minutes to write a memo, not as if a script flushed
 * a database. Numbers come with context.
 */

import type {
  Employee,
  Project,
  TeamComposition,
  SupportActionRecord,
  DeptKpi,
} from "@/app/command-center/_shared/types";

// ─── Helpers ─────────────────────────────────────────────────────────────

function fmtDate(d?: string | null): string {
  if (!d) return "—";
  try {
    return new Date(d).toISOString().slice(0, 10);
  } catch {
    return d;
  }
}

function safe(s?: string | null): string {
  return (s ?? "").trim() || "—";
}

function escapeMd(s: string): string {
  return s.replace(/\|/g, "\\|").replace(/\n/g, " ");
}

function thb(n: number | null | undefined): string {
  if (n == null || !Number.isFinite(Number(n))) return "—";
  const v = Number(n);
  if (v >= 1_000_000) return `฿${(v / 1_000_000).toFixed(1)}M`;
  if (v >= 1_000) return `฿${(v / 1_000).toFixed(0)}k`;
  return `฿${v.toFixed(0)}`;
}

// ─── Project Intelligence (top-level synthesis) ──────────────────────────

export interface IntelInput {
  employees: Employee[];
  projects: Project[];
  teams: TeamComposition[];
  supportActions: SupportActionRecord[];
  kpis: DeptKpi[];
  generatedAt: string;
}

export function renderProjectIntelligence(d: IntelInput): string {
  const activeProjects = d.projects.filter((p) => p.status !== "completed" && p.status !== "done");
  const onHold = d.projects.filter((p) => p.status === "on_hold");
  const openSupport = d.supportActions.filter(
    (a) => a.status === "open" || a.status === "in_progress",
  );
  const kpisOffTrack = d.kpis.filter((k) => k.status && k.status !== "on_track");

  const deptByCount = new Map<string, number>();
  for (const e of d.employees) {
    if (!e.dept_code) continue;
    deptByCount.set(e.dept_code, (deptByCount.get(e.dept_code) ?? 0) + 1);
  }
  const topDepts = Array.from(deptByCount.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 8);

  const lines: string[] = [];
  lines.push("---");
  lines.push("project: TKC X — Talent Support Dashboard");
  lines.push(`updated: ${d.generatedAt}`);
  lines.push("source: /api/export/obsidian");
  lines.push("tags: [tkc, dashboard, project-intelligence]");
  lines.push("---");
  lines.push("");
  lines.push("# TKC X · Project Intelligence");
  lines.push("");
  lines.push(`*Auto-exported from the dashboard on ${d.generatedAt}. Re-run \`POST /api/export/obsidian\` to refresh. This file is overwritten on every run — edits will be lost.*`);
  lines.push("");

  // Snapshot strip
  lines.push("## Snapshot");
  lines.push("");
  lines.push(`- **${d.employees.length}** active heroes across **${deptByCount.size}** departments`);
  lines.push(`- **${activeProjects.length}** active projects (${onHold.length} on hold)`);
  lines.push(`- **${d.teams.length}** projects with at least one allocation`);
  lines.push(`- **${openSupport.length}** open support actions`);
  lines.push(`- **${kpisOffTrack.length}** KPIs off track of **${d.kpis.length}** tracked`);
  lines.push("");

  // Department roster shape
  lines.push("## Roster shape");
  lines.push("");
  lines.push("| Department | Heroes |");
  lines.push("|---|---:|");
  for (const [code, count] of topDepts) {
    lines.push(`| ${code} | ${count} |`);
  }
  lines.push("");

  // Active projects
  if (activeProjects.length > 0) {
    lines.push("## Active projects");
    lines.push("");
    lines.push("| Code | Name | Client | Priority | Team Size |");
    lines.push("|---|---|---|---|---:|");
    for (const p of activeProjects.slice(0, 30)) {
      lines.push(
        `| ${escapeMd(p.code)} | ${escapeMd(safe(p.name))} | ${escapeMd(safe(p.client_name))} | ${safe(p.priority)} | ${p.team_size ?? "—"} |`,
      );
    }
    lines.push("");
  }

  // KPIs off track
  if (kpisOffTrack.length > 0) {
    lines.push("## KPIs needing attention");
    lines.push("");
    lines.push("| Code | Status | Actual / Target |");
    lines.push("|---|---|---|");
    for (const k of kpisOffTrack.slice(0, 20)) {
      const at = k.actual_value ?? 0;
      const tg = k.target_value ?? 0;
      lines.push(`| ${escapeMd(k.code)} | ${safe(k.status)} | ${at} / ${tg} |`);
    }
    lines.push("");
  }

  // Open support actions
  if (openSupport.length > 0) {
    lines.push("## Open support actions");
    lines.push("");
    for (const a of openSupport.slice(0, 30)) {
      const owner = a.owner_nickname ?? a.owner_full_name_en ?? "—";
      const heroLink = `[[TKC-Heroes/${a.employee_id}|hero]]`;
      lines.push(`- **${escapeMd(a.title)}** — owner ${escapeMd(owner)} · ${heroLink} · ${a.action_type}`);
    }
    lines.push("");
  }

  // Footer
  lines.push("---");
  lines.push("");
  lines.push("*See [[TKC-Roster-Pulse]] for the full hero scoreboard, or open `TKC-Heroes/` for individual dossiers. The live dashboard runs at `http://localhost:3000/command-center`. The Sheets ledger is at `https://docs.google.com/spreadsheets/d/1LR8t7QxccwL1d5NBbQ9d_ZDy-T4qvxwUTi-3PJYuttE/edit`.*");
  lines.push("");

  return lines.join("\n");
}

// ─── Roster Pulse (one-line-per-hero scoreboard) ─────────────────────────

export function renderRosterPulse(employees: Employee[], generatedAt: string): string {
  const sorted = [...employees].sort((a, b) => {
    // Sort by department then by role seniority (md > director > manager > senior > staff)
    const roleOrder: Record<string, number> = {
      md: 0, deputy_md: 1, director: 2, manager: 3, senior: 4, staff: 5,
    };
    const da = a.dept_code ?? "";
    const db = b.dept_code ?? "";
    if (da !== db) return da.localeCompare(db);
    return (roleOrder[a.role_level ?? "staff"] ?? 9) - (roleOrder[b.role_level ?? "staff"] ?? 9);
  });

  const lines: string[] = [];
  lines.push("---");
  lines.push(`updated: ${generatedAt}`);
  lines.push("tags: [tkc, roster, pulse]");
  lines.push("---");
  lines.push("");
  lines.push("# TKC · Roster Pulse");
  lines.push("");
  lines.push(`*${sorted.length} heroes, sorted by department then seniority. Refreshed ${generatedAt}.*`);
  lines.push("");
  lines.push("| Code | Name | Dept | Role | Tenure | Load |");
  lines.push("|---|---|---|---|---:|---:|");
  for (const e of sorted) {
    const code = e.employee_code ?? e.id?.slice(0, 8) ?? "—";
    const name = e.nickname ?? e.full_name_en ?? e.full_name_th ?? "—";
    const dept = e.dept_code ?? "—";
    const role = e.role_level ?? "—";
    const tenure = e.tenure_years != null ? `${e.tenure_years}y` : "—";
    const load = e.availability_fte != null
      ? Number(e.availability_fte).toFixed(1)
      : "—";
    lines.push(`| ${escapeMd(code)} | [[TKC-Heroes/${e.id}\\|${escapeMd(name)}]] | ${dept} | ${role} | ${tenure} | ${load} |`);
  }
  lines.push("");

  return lines.join("\n");
}

// ─── Per-hero dossier ────────────────────────────────────────────────────

export function renderHeroDossier(e: Employee, generatedAt: string): string {
  const lines: string[] = [];
  const name = e.nickname ?? e.full_name_en ?? e.full_name_th ?? "—";

  lines.push("---");
  lines.push(`employee_id: ${e.id}`);
  lines.push(`employee_code: ${e.employee_code ?? "—"}`);
  lines.push(`name: ${escapeMd(name)}`);
  lines.push(`dept: ${e.dept_code ?? "—"}`);
  lines.push(`role: ${e.role_level ?? "—"}`);
  lines.push(`updated: ${generatedAt}`);
  lines.push("tags: [tkc, hero]");
  lines.push("---");
  lines.push("");
  lines.push(`# ${name}`);
  lines.push("");
  lines.push(`**${e.title_en ?? e.title ?? "—"}** · ${e.dept_code ?? "—"} · ${e.role_level ?? "—"}`);
  lines.push("");

  // Identity
  lines.push("## Identity");
  lines.push("");
  lines.push(`- Code: \`${e.employee_code ?? "—"}\``);
  lines.push(`- Full name (TH): ${escapeMd(safe(e.full_name_th))}`);
  lines.push(`- Full name (EN): ${escapeMd(safe(e.full_name_en))}`);
  if (e.tenure_years != null) lines.push(`- Tenure: ${e.tenure_years} year(s)`);
  if (e.is_active === false) lines.push(`- **Status:** retired`);
  lines.push("");

  // Attributes
  if (e.attr_str != null || e.attr_int != null) {
    lines.push("## Attributes");
    lines.push("");
    lines.push(`- STR ${e.attr_str ?? "—"} · INT ${e.attr_int ?? "—"} · WIS ${e.attr_wis ?? "—"}`);
    lines.push(`- CHA ${e.attr_cha ?? "—"} · DEX ${e.attr_dex ?? "—"} · CON ${e.attr_con ?? "—"}`);
    lines.push("");
  }

  // Skills
  if (e.skills && e.skills.length > 0) {
    lines.push("## Skills");
    lines.push("");
    for (const s of e.skills) lines.push(`- \`${s}\``);
    lines.push("");
  }

  // Languages / Certifications / Soft skills
  if (e.languages?.length || e.certifications?.length || e.soft_skills?.length) {
    lines.push("## Profile facets");
    lines.push("");
    if (e.languages?.length) lines.push(`- **Languages:** ${e.languages.join(", ")}`);
    if (e.certifications?.length) lines.push(`- **Certifications:** ${e.certifications.join(", ")}`);
    if (e.soft_skills?.length) lines.push(`- **Soft skills:** ${e.soft_skills.join(", ")}`);
    lines.push("");
  }

  // Active allocations
  if (e.active_allocations && e.active_allocations.length > 0) {
    lines.push("## Active allocations");
    lines.push("");
    lines.push("| Project | FTE | Role | Status |");
    lines.push("|---|---:|---|---|");
    for (const a of e.active_allocations) {
      const proj = a.project_name ?? a.project_code ?? a.quest_title ?? "—";
      lines.push(
        `| ${escapeMd(safe(proj))} | ${Number(a.fte ?? 0).toFixed(2)} | ${escapeMd(safe(a.assignment_label))} | ${escapeMd(safe(a.status))} |`,
      );
    }
    lines.push("");
  } else {
    lines.push("## Active allocations");
    lines.push("");
    lines.push("- *No active allocations.*");
    lines.push("");
  }

  // Capability evidence
  if (e.competency_summary && e.competency_summary.length > 0) {
    lines.push("## Capability evidence");
    lines.push("");
    lines.push("| Skill | Level / Target | Freshness |");
    lines.push("|---|---|---|");
    for (const s of e.competency_summary.slice(0, 20)) {
      lines.push(
        `| ${escapeMd(s.display_name)} | ${s.actual_level ?? 0} / ${s.expected_level ?? 3} | ${s.freshness} |`,
      );
    }
    lines.push("");
  }

  // Footer
  lines.push("---");
  lines.push("");
  lines.push(`*Auto-exported from the dashboard. Edit at \`/check-in/${e.id}\` or in the Roster drawer.*`);
  lines.push("");

  return lines.join("\n");
}
