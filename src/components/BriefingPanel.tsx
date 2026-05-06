"use client";

/**
 * BriefingPanel — the autotelic morning loop.
 *
 * Renders today's briefing as Markdown on the Home screen. Lazy-fetched
 * (so the home screen paint isn't blocked by the briefing query). Has a
 * "Refresh" button that re-runs the synthesis and re-pushes to Obsidian.
 *
 * Voice: dry, observation-first. Don Norman: the system teaches itself
 * — so the briefing format echoes the headings the boss should be
 * thinking in (Snapshot · Yesterday's signals · Today's calls · Watch).
 */

import { useCallback, useEffect, useState } from "react";
import { MenuWindow } from "@/components/MenuWindow";

interface BriefingTotals {
  active_heroes: number;
  active_projects: number;
  open_support_actions: number;
  chronicles_this_week: number;
}

interface BriefingChronicle {
  employee_id: string;
  employee_name: string;
  manager_name: string | null;
  cycle: string;
  narrative: string;
  approved_at: string | null;
}

interface BriefingRecognition {
  employee_id: string;
  employee_name: string;
  title: string;
  action_type: string;
}

interface BriefingOpenQuest {
  project_code: string;
  project_name: string;
  team_size: number;
  current_size: number;
  priority: string | null;
}

interface BriefingOverdue {
  employee_id: string;
  employee_name: string;
  dept_code: string | null;
  days_since_last_chronicle: number | null;
}

interface BriefingAtRisk {
  employee_id: string;
  employee_name: string;
  dept_code: string | null;
  fte: number;
  reason: string;
}

interface DailyBriefing {
  date: string;
  generated_at: string;
  totals: BriefingTotals;
  yesterday_chronicles: BriefingChronicle[];
  yesterday_recognitions: BriefingRecognition[];
  open_quests: BriefingOpenQuest[];
  overdue_check_ins: BriefingOverdue[];
  at_risk: BriefingAtRisk[];
}

export function BriefingPanel() {
  const [data, setData] = useState<DailyBriefing | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [vaultWritten, setVaultWritten] = useState<boolean | null>(null);

  const fetchBriefing = useCallback(async (push: boolean) => {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/briefing/today", { method: push ? "POST" : "GET" });
      const d = (await res.json()) as { briefing?: DailyBriefing; vault_written?: boolean };
      if (!res.ok || !d.briefing) {
        throw new Error("Briefing source is unavailable.");
      }
      if (d.briefing) {
        setData(d.briefing);
        if (push) setVaultWritten(d.vault_written ?? null);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Briefing source is unavailable.");
    } finally {
      setBusy(false);
    }
  }, []);

  useEffect(() => {
    void fetchBriefing(false);
  }, [fetchBriefing]);

  if (!data && error) {
    return (
      <MenuWindow title="Today's Briefing" className="cc-home-window">
        <div style={{ display: "grid", gap: 10, color: "var(--ink-1)", fontSize: 11, lineHeight: 1.5 }}>
          <div>{error}</div>
          <button
            type="button"
            onClick={() => void fetchBriefing(false)}
            disabled={busy}
            style={{
              width: "fit-content",
              padding: "6px 12px",
              fontFamily: "var(--font-mono)",
              fontSize: 10,
              letterSpacing: "0.12em",
              textTransform: "uppercase",
              background: "transparent",
              border: "1px solid var(--text-primary)",
              color: "var(--text-primary)",
              cursor: busy ? "not-allowed" : "pointer",
            }}
          >
            {busy ? "Retrying..." : "Retry briefing"}
          </button>
        </div>
      </MenuWindow>
    );
  }

  if (!data) {
    return (
      <MenuWindow title="Today's Briefing" className="cc-home-window">
        <div aria-busy="true" style={{ color: "var(--ink-1)", fontSize: 11, padding: "8px 0" }}>
          Composing the briefing…
        </div>
      </MenuWindow>
    );
  }

  return (
    <MenuWindow
      title={`Today's Briefing — ${data.date}`}
      className="cc-home-window"
    >
      <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
        {/* Snapshot strip */}
        <div style={{ display: "flex", flexWrap: "wrap", gap: 14, paddingBottom: 8, borderBottom: "1px solid rgba(245,240,232,0.08)" }}>
          <Stat label="Heroes" value={data.totals.active_heroes} />
          <Stat label="Quests" value={data.totals.active_projects} />
          <Stat label="Chronicles 7d" value={data.totals.chronicles_this_week} />
          <Stat label="Open actions" value={data.totals.open_support_actions} />
        </div>

        {/* Yesterday */}
        <Section heading="Yesterday's signals">
          {data.yesterday_chronicles.length === 0 && data.yesterday_recognitions.length === 0 ? (
            <Empty text="Quiet day. No ratified chronicles, no recognition stamps. Today is a fresh page." />
          ) : (
            <>
              {data.yesterday_chronicles.length > 0 && (
                <SubHeading>Chronicles ratified</SubHeading>
              )}
              {data.yesterday_chronicles.map((c) => (
                <div key={`${c.employee_id}-${c.cycle}`} style={chronicleRow}>
                  <div style={chronicleMeta}>
                    <strong style={{ color: "var(--text-primary)" }}>{c.employee_name}</strong>
                    <span style={{ color: "var(--ink-1)", marginLeft: 6 }}>· by {c.manager_name ?? "Anonymous"}</span>
                    <span style={{ color: "var(--ink-1)", marginLeft: 6 }}>· {c.cycle}</span>
                  </div>
                  <p style={chronicleBody}>
                    {c.narrative.length > 200 ? `${c.narrative.slice(0, 200)}…` : c.narrative}
                  </p>
                </div>
              ))}
              {data.yesterday_recognitions.length > 0 && (
                <SubHeading>Recognition stamps</SubHeading>
              )}
              {data.yesterday_recognitions.map((r, i) => (
                <div key={`${r.employee_id}-${i}`} style={lineRow}>
                  <strong>{r.employee_name}</strong> — {r.title}{" "}
                  <span style={{ color: "var(--ink-1)", fontSize: 10 }}>({r.action_type.replaceAll("_", " ")})</span>
                </div>
              ))}
            </>
          )}
        </Section>

        {/* Today's calls */}
        <Section heading="Today's calls">
          {data.open_quests.length === 0 && data.overdue_check_ins.length === 0 ? (
            <Empty text="Nothing pressing. The board is full and the chronicles are current." />
          ) : (
            <>
              {data.open_quests.length > 0 && <SubHeading>Quests needing staff</SubHeading>}
              {data.open_quests.map((q) => {
                const gap = q.team_size - q.current_size;
                return (
                  <div key={q.project_code} style={lineRow}>
                    <code style={{ color: "var(--rpg-yellow)", marginRight: 8 }}>{q.project_code}</code>
                    <strong>{q.project_name}</strong>
                    <span style={{ color: "var(--ink-1)", marginLeft: 8 }}>
                      {q.current_size}/{q.team_size} ({gap} open) · {q.priority ?? "—"}
                    </span>
                  </div>
                );
              })}
              {data.overdue_check_ins.length > 0 && <SubHeading>Heroes overdue for a chronicle</SubHeading>}
              {data.overdue_check_ins.map((o) => (
                <div key={o.employee_id} style={lineRow}>
                  <strong>{o.employee_name}</strong>
                  <span style={{ color: "var(--ink-1)", marginLeft: 6 }}>
                    ({o.dept_code ?? "—"}) — {o.days_since_last_chronicle == null ? "never written" : `${o.days_since_last_chronicle}d ago`}
                  </span>
                </div>
              ))}
            </>
          )}
        </Section>

        {/* Watch */}
        {data.at_risk.length > 0 && (
          <Section heading="Watch">
            {data.at_risk.map((r) => (
              <div key={r.employee_id} style={lineRow}>
                <strong>{r.employee_name}</strong>
                <span style={{ color: "var(--ink-1)", marginLeft: 6 }}>
                  ({r.dept_code ?? "—"}) — load {r.fte.toFixed(2)} FTE · {r.reason}
                </span>
              </div>
            ))}
          </Section>
        )}

        {/* Refresh + Push to Obsidian */}
        <div style={{ display: "flex", gap: 8, alignItems: "center", marginTop: 8 }}>
          <button
            type="button"
            onClick={() => void fetchBriefing(true)}
            disabled={busy}
            style={{
              padding: "6px 12px",
              fontFamily: "var(--font-mono)",
              fontSize: 10,
              letterSpacing: "0.12em",
              textTransform: "uppercase",
              background: "transparent",
              border: "1px solid var(--text-primary)",
              color: "var(--text-primary)",
              cursor: busy ? "not-allowed" : "pointer",
            }}
          >
            {busy ? "Composing…" : "Refresh & Push to Obsidian"}
          </button>
          {vaultWritten === true ? (
            <span style={{ fontSize: 10, color: "var(--flux-up)", letterSpacing: "0.06em" }}>
              ✓ written to vault
            </span>
          ) : null}
          {vaultWritten === false ? (
            <span style={{ fontSize: 10, color: "var(--rpg-orange)", letterSpacing: "0.06em" }}>
              vault unreachable
            </span>
          ) : null}
          <span style={{ fontSize: 9, color: "var(--ink-1)", marginLeft: "auto" }}>
            generated {new Date(data.generated_at).toLocaleTimeString()}
          </span>
        </div>
      </div>
    </MenuWindow>
  );
}

// ─── Internal building blocks ─────────────────────────────────────────

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
      <span style={{ fontSize: 8, color: "var(--ink-1)", letterSpacing: "0.14em", textTransform: "uppercase" }}>
        {label}
      </span>
      <strong style={{ fontSize: 18, color: "var(--text-primary)", fontFamily: "var(--font-mono)" }}>
        {value}
      </strong>
    </div>
  );
}

function Section({ heading, children }: { heading: string; children: React.ReactNode }) {
  return (
    <div>
      <div style={{ fontSize: 9, letterSpacing: "0.18em", textTransform: "uppercase", color: "var(--ink-1)", marginBottom: 8 }}>
        {heading}
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
        {children}
      </div>
    </div>
  );
}

function SubHeading({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ fontSize: 9, letterSpacing: "0.12em", textTransform: "uppercase", color: "var(--rpg-yellow)", marginTop: 6 }}>
      {children}
    </div>
  );
}

function Empty({ text }: { text: string }) {
  return (
    <div style={{ fontStyle: "italic", color: "var(--ink-1)", fontSize: 11, padding: "4px 0" }}>
      {text}
    </div>
  );
}

const chronicleRow: React.CSSProperties = {
  padding: "6px 0",
  borderBottom: "1px solid rgba(245,240,232,0.06)",
};

const chronicleMeta: React.CSSProperties = {
  fontSize: 11,
  marginBottom: 3,
};

const chronicleBody: React.CSSProperties = {
  fontSize: 11,
  lineHeight: 1.55,
  color: "var(--ink-0)",
  margin: 0,
  fontStyle: "italic",
};

const lineRow: React.CSSProperties = {
  fontSize: 11,
  padding: "3px 0",
  fontFamily: "var(--font-mono)",
};
