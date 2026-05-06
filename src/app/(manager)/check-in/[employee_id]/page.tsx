/**
 * /check-in/[employee_id] — the Chronicle ritual, as a screen.
 *
 * Server component: loads the target employee + current attributes,
 * hands off to the client form below.
 *
 * Layout
 * ──────
 *   Left column   PlayerCard (current state) + cycle dropdown + narrative
 *                 textarea + "Divine deltas" submit.
 *   Right column  Once the draft returns, a per-attribute diff panel with
 *                 editable steppers. "Ratify" commits.
 *
 * The wording on the screen mirrors the three-phase Chronicle ritual
 * defined in `src/lib/lore.ts`: Scribe → Divine → Ratify.
 */

import { notFound } from "next/navigation";
import { isDbConfigured, query } from "@/lib/db";
import type { EmployeeLike } from "@/components/PlayerCard";
import { CheckInForm } from "./CheckInForm";
import { StatAdjustPanel } from "./StatAdjustPanel";

export const dynamic = "force-dynamic";

interface EmployeeRow {
  id: string;
  employee_code: string | null;
  nickname: string | null;
  full_name_en: string | null;
  full_name_th: string;
  title_en: string | null;
  role_level: string;
  dept_code: string | null;
  attr_str: number | null;
  attr_int: number | null;
  attr_wis: number | null;
  attr_cha: number | null;
  attr_dex: number | null;
  attr_con: number | null;
  stat_locked: boolean;
  stat_lock_reason: string | null;
  stat_source: string | null;
}

function defaultCycle(): string {
  const now = new Date();
  const q = Math.floor(now.getUTCMonth() / 3) + 1;
  return `${now.getUTCFullYear()}-Q${q}`;
}

interface LoadedEmployee {
  employee: EmployeeLike;
  stat_locked: boolean;
  stat_lock_reason: string | null;
  stat_source: string | null;
}

async function loadEmployee(employee_id: string): Promise<LoadedEmployee | null> {
  if (!isDbConfigured()) return null;
  const rows = await query<EmployeeRow>(
    `SELECT e.id, e.employee_code, e.nickname, e.full_name_en, e.full_name_th,
            e.title_en, e.role_level,
            d.code AS dept_code,
            ea.str AS attr_str, ea.int AS attr_int, ea.wis AS attr_wis,
            ea.cha AS attr_cha, ea.dex AS attr_dex, ea.con AS attr_con,
            COALESCE(ea.stat_locked, false) AS stat_locked,
            ea.stat_lock_reason,
            ea.stat_source
       FROM employees e
       LEFT JOIN departments d ON d.id = e.department_id
       LEFT JOIN employee_attributes ea ON ea.employee_id = e.id
      WHERE e.id = $1
      LIMIT 1`,
    [employee_id],
  );
  const r = rows[0];
  if (!r) return null;
  return {
    employee: {
      id: r.id,
      display_name:
        r.nickname ||
        r.full_name_en ||
        r.full_name_th ||
        r.employee_code ||
        "—",
      title: r.title_en,
      role_level: r.role_level,
      dept_code: r.dept_code,
      attr_str: r.attr_str,
      attr_int: r.attr_int,
      attr_wis: r.attr_wis,
      attr_cha: r.attr_cha,
      attr_dex: r.attr_dex,
      attr_con: r.attr_con,
    },
    stat_locked: r.stat_locked,
    stat_lock_reason: r.stat_lock_reason,
    stat_source: r.stat_source,
  };
}

export default async function CheckInPage({
  params,
}: {
  params: Promise<{ employee_id: string }>;
}) {
  const { employee_id } = await params;

  // Basic UUID shape guard — lets notFound do its work before the DB query.
  const uuidLike = /^[0-9a-f-]{36}$/i.test(employee_id);
  if (!uuidLike) notFound();

  const loaded = await loadEmployee(employee_id);
  if (!loaded) notFound();

  const { employee, stat_locked, stat_lock_reason, stat_source } = loaded;

  return (
    <div
      style={{
        minHeight: "100%",
        background: "var(--bg-base)",
        padding: "32px 24px 96px",
        color: "var(--text-primary)",
        fontFamily:
          '"JetBrains Mono", "SF Mono", "Fira Code", ui-monospace, monospace',
      }}
    >
      <div style={{ maxWidth: 1100, margin: "0 auto" }}>
        <header
          style={{
            paddingBottom: 16,
            borderBottom: "1px solid var(--border-subtle)",
            marginBottom: 28,
          }}
        >
          {/* Explicit back link — without this the user is stuck on this
              route except for browser-back (Dr Non 2026-04-28). */}
          <a
            href="/command-center?screen=roster"
            style={{
              display: "inline-block",
              fontSize: 10,
              letterSpacing: "0.16em",
              textTransform: "uppercase",
              color: "var(--text-muted)",
              textDecoration: "none",
              marginBottom: 14,
              border: "1px solid var(--border-subtle)",
              padding: "6px 12px",
            }}
          >
            ← Back to Roster
          </a>
          <div
            style={{
              fontSize: 9,
              letterSpacing: "0.18em",
              color: "var(--text-muted)",
              textTransform: "uppercase",
              marginBottom: 6,
            }}
          >
            Ritual · Chronicle
          </div>
          <h1
            style={{
              fontSize: 18,
              fontWeight: 400,
              letterSpacing: "0.02em",
              margin: 0,
            }}
          >
            Check-in
          </h1>
          <p
            style={{
              fontSize: 11,
              lineHeight: 1.7,
              color: "var(--text-secondary)",
              maxWidth: 640,
              marginTop: 10,
              marginBottom: 0,
            }}
          >
            Scribe what you have seen this cycle. The Chronicler will read it
            and propose shifts across the six attributes. You review the
            proposal and ratify — or edit it first. The paragraph is kept
            verbatim as the record of this cycle.
          </p>
        </header>

        <CheckInForm employee={employee} defaultCycle={defaultCycle()} />

        {/* ── Stat direct-adjustment panel ──────────────────────── */}
        <StatAdjustPanel
          employeeId={employee.id}
          initialStats={{
            str:              employee.attr_str,
            int:              employee.attr_int,
            wis:              employee.attr_wis,
            cha:              employee.attr_cha,
            dex:              employee.attr_dex,
            con:              employee.attr_con,
            stat_locked,
            stat_lock_reason,
            stat_source,
          }}
        />
      </div>
    </div>
  );
}
