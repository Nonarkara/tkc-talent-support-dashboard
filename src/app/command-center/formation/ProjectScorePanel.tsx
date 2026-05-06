"use client";

/**
 * ProjectScorePanel — edit the five diagnostic scores on each project.
 *
 * Scores:
 *   Complexity (0–100)       How hard the work itself is
 *   Urgency (0–100)          How time-critical the delivery is
 *   Strategic value (0–100)  Long-term importance to TKC
 *   Delivery risk (0–100)    Chance of slippage or failure
 *   AI leverage (0–100)      How much AI tooling can amplify output
 *
 * Rules:
 *   - Projects start locked after criteria-seeding.
 *   - Unlock requires a reason (≥10 chars).
 *   - Every change writes to game_adjustment_log.
 *   - Re-locking is encouraged after any edit session.
 */

import { useCallback, useEffect, useState, type CSSProperties } from "react";

interface ProjectScores {
  id: string;
  code: string;
  name: string;
  complexity_score: number;
  urgency_score: number;
  strategic_value_score: number;
  delivery_risk_score: number;
  ai_leverage_score: number;
  config_locked: boolean;
  config_lock_reason: string | null;
  config_source: string | null;
}

type ScoreKey =
  | "complexity_score"
  | "urgency_score"
  | "strategic_value_score"
  | "delivery_risk_score"
  | "ai_leverage_score";

const SCORE_DEFS: Array<{ key: ScoreKey; label: string; desc: string }> = [
  { key: "complexity_score",      label: "Complexity",       desc: "Inherent difficulty" },
  { key: "urgency_score",         label: "Urgency",          desc: "Time pressure" },
  { key: "strategic_value_score", label: "Strategic Value",  desc: "Long-term importance" },
  { key: "delivery_risk_score",   label: "Delivery Risk",    desc: "Chance of slippage" },
  { key: "ai_leverage_score",     label: "AI Leverage",      desc: "Amplification potential" },
];

// ─── Styles ───────────────────────────────────────────────────────────────

const mono: CSSProperties = {
  fontFamily: '"JetBrains Mono","SF Mono","Fira Code",ui-monospace,monospace',
};

const labelStyle: CSSProperties = {
  fontSize: 9,
  letterSpacing: "0.16em",
  textTransform: "uppercase",
  color: "var(--text-muted)",
};

const btnBase: CSSProperties = {
  ...mono,
  fontSize: 9,
  letterSpacing: "0.14em",
  textTransform: "uppercase",
  padding: "5px 10px",
  border: "1px solid var(--border-subtle)",
  background: "transparent",
  color: "var(--text-primary)",
  cursor: "pointer",
};

function ScoreBar({ value, changed }: { value: number; changed: boolean }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
      <div style={{ flex: 1, height: 3, background: "var(--border-subtle)", position: "relative" }}>
        <div style={{
          position: "absolute",
          left: 0, top: 0, height: "100%",
          width: `${value}%`,
          background: changed ? "var(--accent-gold)" : "var(--text-secondary)",
          transition: "width 180ms ease",
        }} />
      </div>
      <span style={{
        ...mono,
        fontSize: 11,
        width: 28,
        textAlign: "right",
        color: changed ? "var(--accent-gold)" : "var(--text-primary)",
      }}>
        {value}
      </span>
    </div>
  );
}

// ─── Single-project editor row ─────────────────────────────────────────────

function ProjectRow({ project, onUpdated }: {
  project: ProjectScores;
  onUpdated: (id: string, updates: Partial<ProjectScores>) => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const [edits, setEdits] = useState<Partial<Record<ScoreKey, number>>>({});
  const [reason, setReason] = useState("");
  const [lockReason, setLockReason] = useState("");
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);

  const locked = project.config_locked;
  const dirtyKeys = (Object.keys(edits) as ScoreKey[]).filter(
    (k) => edits[k] !== undefined && edits[k] !== project[k]
  );

  function setEdit(key: ScoreKey, v: number) {
    setEdits((prev) => ({ ...prev, [key]: Math.max(0, Math.min(100, v)) }));
  }

  async function handleLockToggle(newLocked: boolean) {
    const r = lockReason.trim();
    if (r.length < 10) { setMsg({ ok: false, text: "Reason ≥10 chars required." }); return; }
    setSaving(true); setMsg(null);
    try {
      const res = await fetch("/api/game/lock", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ target_type: "project", target_id: project.id, locked: newLocked, reason: r }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Lock failed");
      onUpdated(project.id, { config_locked: newLocked, config_lock_reason: r });
      setLockReason("");
      setMsg({ ok: true, text: newLocked ? "Locked." : "Unlocked." });
    } catch (e) {
      setMsg({ ok: false, text: e instanceof Error ? e.message : "Failed" });
    } finally { setSaving(false); }
  }

  async function handleSave() {
    if (reason.trim().length < 10) { setMsg({ ok: false, text: "Reason ≥10 chars required." }); return; }
    if (!dirtyKeys.length) { setMsg({ ok: false, text: "No changes." }); return; }
    setSaving(true); setMsg(null);
    try {
      const scores: Partial<Record<ScoreKey, number>> = {};
      for (const k of dirtyKeys) scores[k] = edits[k]!;
      const res = await fetch("/api/game/project-scores", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ project_id: project.id, scores, reason: reason.trim() }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Save failed");
      onUpdated(project.id, scores);
      setEdits({}); setReason("");
      setMsg({ ok: true, text: `Saved ${dirtyKeys.length} score${dirtyKeys.length > 1 ? "s" : ""}.` });
    } catch (e) {
      setMsg({ ok: false, text: e instanceof Error ? e.message : "Failed" });
    } finally { setSaving(false); }
  }

  return (
    <div style={{ borderBottom: "1px solid var(--border-subtle)" }}>
      {/* Row header */}
      <button
        onClick={() => setExpanded((v) => !v)}
        style={{
          width: "100%",
          display: "flex",
          alignItems: "center",
          gap: 12,
          padding: "10px 0",
          background: "transparent",
          border: "none",
          cursor: "pointer",
          textAlign: "left",
        }}
      >
        <span style={{ ...mono, fontSize: 9, color: "var(--text-muted)", width: 28 }}>
          {project.code}
        </span>
        <span style={{ ...mono, fontSize: 11, color: "var(--text-primary)", flex: 1 }}>
          {project.name}
        </span>
        <span style={{
          fontSize: 8,
          letterSpacing: "0.12em",
          textTransform: "uppercase",
          padding: "2px 7px",
          border: `1px solid ${locked ? "#ef4444" : "#22c55e"}`,
          color: locked ? "#ef4444" : "#22c55e",
        }}>
          {locked ? "🔒" : "🔓"}
        </span>
        <span style={{ ...mono, fontSize: 9, color: "var(--text-muted)", width: 16 }}>
          {expanded ? "▲" : "▼"}
        </span>
      </button>

      {/* Expanded editor */}
      {expanded && (
        <div style={{ paddingBottom: 14, paddingLeft: 40 }}>
          {/* Score bars */}
          <div style={{ display: "grid", gap: 8, marginBottom: 14 }}>
            {SCORE_DEFS.map(({ key, label, desc }) => {
              const current = project[key] as number;
              const editedVal = edits[key] ?? current;
              const changed = !locked && editedVal !== current;
              return (
                <div key={key}>
                  <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 3 }}>
                    <span style={{ ...labelStyle, width: 110 }}>{label}</span>
                    <span style={{ fontSize: 8, color: "var(--text-muted)" }}>{desc}</span>
                  </div>
                  <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                    {!locked && (
                      <>
                        <button
                          onClick={() => setEdit(key, (edits[key] ?? current) - 5)}
                          disabled={saving || (edits[key] ?? current) <= 0}
                          style={{ ...btnBase, padding: "1px 6px", fontSize: 11, opacity: (edits[key] ?? current) <= 0 ? 0.3 : 1 }}
                        >−</button>
                        <button
                          onClick={() => setEdit(key, (edits[key] ?? current) + 5)}
                          disabled={saving || (edits[key] ?? current) >= 100}
                          style={{ ...btnBase, padding: "1px 6px", fontSize: 11, opacity: (edits[key] ?? current) >= 100 ? 0.3 : 1 }}
                        >+</button>
                      </>
                    )}
                    <div style={{ flex: 1 }}>
                      <ScoreBar value={editedVal} changed={changed} />
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Lock/unlock controls */}
          {locked ? (
            <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
              <input
                type="text"
                placeholder="Reason to unlock (min 10 chars)…"
                value={lockReason}
                onChange={(e) => setLockReason(e.target.value)}
                style={{
                  flex: 1, minWidth: 160,
                  ...mono, fontSize: 10, padding: "5px 8px",
                  background: "var(--bg-base)", border: "1px solid var(--border-subtle)", color: "var(--text-primary)",
                }}
              />
              <button
                onClick={() => handleLockToggle(false)}
                disabled={saving || lockReason.trim().length < 10}
                style={{ ...btnBase, borderColor: "var(--accent-gold)", color: "var(--accent-gold)", opacity: lockReason.trim().length < 10 ? 0.4 : 1 }}
              >Unlock</button>
            </div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              <input
                type="text"
                placeholder="Reason for changes (min 10 chars)…"
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                style={{
                  ...mono, fontSize: 10, padding: "5px 8px",
                  background: "var(--bg-base)", border: "1px solid var(--border-subtle)", color: "var(--text-primary)",
                }}
              />
              <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                <button
                  onClick={handleSave}
                  disabled={saving || !dirtyKeys.length || reason.trim().length < 10}
                  style={{
                    ...btnBase,
                    borderColor: dirtyKeys.length && reason.trim().length >= 10 ? "var(--accent-gold)" : "var(--border-subtle)",
                    color: dirtyKeys.length && reason.trim().length >= 10 ? "var(--accent-gold)" : "var(--text-muted)",
                    opacity: saving ? 0.5 : 1,
                  }}
                >
                  {saving ? "Saving…" : dirtyKeys.length ? `Save ${dirtyKeys.length} Score${dirtyKeys.length > 1 ? "s" : ""}` : "No Changes"}
                </button>
                <input
                  type="text"
                  placeholder="Re-lock reason…"
                  value={lockReason}
                  onChange={(e) => setLockReason(e.target.value)}
                  style={{
                    flex: 1, minWidth: 130,
                    ...mono, fontSize: 10, padding: "5px 8px",
                    background: "var(--bg-base)", border: "1px solid var(--border-subtle)", color: "var(--text-primary)",
                  }}
                />
                <button
                  onClick={() => handleLockToggle(true)}
                  disabled={saving || lockReason.trim().length < 10}
                  style={{ ...btnBase, opacity: lockReason.trim().length < 10 ? 0.4 : 1 }}
                >Re-lock</button>
              </div>
            </div>
          )}

          {msg && (
            <div style={{ marginTop: 6, fontSize: 10, letterSpacing: "0.08em", color: msg.ok ? "#22c55e" : "#ef4444" }}>
              {msg.text}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ─── Main panel ────────────────────────────────────────────────────────────

export function ProjectScorePanel() {
  const [projects, setProjects] = useState<ProjectScores[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/db/projects");
      const data = await res.json();
      const raw: Array<{
        id: string; code: string; name: string;
        complexity_score?: number | null; urgency_score?: number | null;
        strategic_value_score?: number | null; delivery_risk_score?: number | null;
        ai_leverage_score?: number | null;
        config_locked?: boolean | null;
        config_lock_reason?: string | null;
        config_source?: string | null;
      }> = data.projects ?? data;
      setProjects(raw.map((p) => ({
        id: p.id,
        code: p.code,
        name: p.name,
        complexity_score:      p.complexity_score      ?? 50,
        urgency_score:         p.urgency_score         ?? 50,
        strategic_value_score: p.strategic_value_score ?? 50,
        delivery_risk_score:   p.delivery_risk_score   ?? 50,
        ai_leverage_score:     p.ai_leverage_score     ?? 50,
        config_locked:         p.config_locked         ?? true,
        config_lock_reason:    p.config_lock_reason    ?? null,
        config_source:         p.config_source         ?? null,
      })));
    } catch (e) {
      setError(e instanceof Error ? e.message : "Load failed");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { void load(); }, [load]);

  function handleUpdated(id: string, updates: Partial<ProjectScores>) {
    setProjects((prev) => prev.map((p) => p.id === id ? { ...p, ...updates } : p));
  }

  if (loading) {
    return (
      <div style={{ padding: 16, fontFamily: "var(--font-mono,monospace)", fontSize: 10, color: "var(--text-muted)" }}>
        Loading project scores…
      </div>
    );
  }

  if (error) {
    return (
      <div style={{ padding: 16, fontFamily: "var(--font-mono,monospace)", fontSize: 10, color: "#ef4444" }}>
        {error}
      </div>
    );
  }

  const lockedCount = projects.filter((p) => p.config_locked).length;

  return (
    <div>
      {/* Header */}
      <div style={{ marginBottom: 14, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div style={{ fontSize: 9, letterSpacing: "0.18em", textTransform: "uppercase", color: "var(--text-muted)" }}>
          {projects.length} projects · {lockedCount} locked · {projects.length - lockedCount} unlocked
        </div>
        <button
          onClick={load}
          style={{
            fontFamily: "var(--font-mono,monospace)",
            fontSize: 9, letterSpacing: "0.14em", textTransform: "uppercase",
            padding: "4px 10px", border: "1px solid var(--border-subtle)",
            background: "transparent", color: "var(--text-muted)", cursor: "pointer",
          }}
        >↺ Refresh</button>
      </div>

      {/* Score legend */}
      <div style={{ display: "flex", gap: 12, flexWrap: "wrap", marginBottom: 12 }}>
        {SCORE_DEFS.map(({ label, desc }) => (
          <span key={label} style={{ fontSize: 9, color: "var(--text-muted)", letterSpacing: "0.1em" }}>
            <span style={{ textTransform: "uppercase" }}>{label}</span>
            {" "}— {desc}
          </span>
        ))}
      </div>

      {/* Project rows */}
      {projects.map((p) => (
        <ProjectRow key={p.id} project={p} onUpdated={handleUpdated} />
      ))}
    </div>
  );
}
