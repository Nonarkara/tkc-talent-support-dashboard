"use client";

/**
 * StatAdjustPanel — inline stat editor on the check-in / character page.
 *
 * Behaviour
 * ─────────
 *   • Stats are locked by default after seeding. A lock badge shows.
 *   • Manager can unlock (with a reason ≥10 chars) to enable editing.
 *   • Each stat has –/+ steppers; values clamp to 1–20.
 *   • A Save button posts to /api/game/adjust — one stat at a time.
 *   • After saving, the panel refetches lock state and the audit log.
 *   • Audit log shows the last 10 changes in a compact mono list.
 *
 * AI integration note
 * ───────────────────
 *   The Chronicle ritual (narrative → LLM → delta proposal → ratify)
 *   is the primary path for stat changes. This panel is the secondary
 *   path for direct correction — it requires an explicit reason and
 *   leaves a full audit trail so casual edits are visible.
 */

import { useCallback, useEffect, useState, type CSSProperties } from "react";

type AttrKey = "str" | "int" | "wis" | "cha" | "dex" | "con";

const ATTRS: Array<{ key: AttrKey; label: string; desc: string }> = [
  { key: "str", label: "STR", desc: "Throughput" },
  { key: "int", label: "INT", desc: "Reasoning" },
  { key: "wis", label: "WIS", desc: "Judgement" },
  { key: "cha", label: "CHA", desc: "Influence" },
  { key: "dex", label: "DEX", desc: "Speed" },
  { key: "con", label: "CON", desc: "Stamina" },
];

interface StatState {
  str: number; int: number; wis: number;
  cha: number; dex: number; con: number;
  stat_locked: boolean;
  stat_lock_reason: string | null;
  stat_source: string | null;
}

interface LogEntry {
  id: string;
  action: string;
  source: string;
  field: string;
  before_value: Record<string, unknown> | null;
  after_value: Record<string, unknown> | null;
  reason: string;
  created_at: string;
}

// ─── Styles ───────────────────────────────────────────────────────────────

const mono: CSSProperties = {
  fontFamily: '"JetBrains Mono","SF Mono","Fira Code",ui-monospace,monospace',
};

const panelStyle: CSSProperties = {
  border: "1px solid var(--border-subtle)",
  background: "var(--bg-elevated)",
  padding: 20,
  marginTop: 24,
};

const labelStyle: CSSProperties = {
  fontSize: 9,
  letterSpacing: "0.18em",
  textTransform: "uppercase",
  color: "var(--text-muted)",
};

const buttonBase: CSSProperties = {
  ...mono,
  fontSize: 10,
  letterSpacing: "0.14em",
  textTransform: "uppercase",
  padding: "7px 14px",
  border: "1px solid var(--border-subtle)",
  background: "transparent",
  color: "var(--text-primary)",
  cursor: "pointer",
};

function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-GB", {
    day: "2-digit", month: "short", year: "numeric",
    hour: "2-digit", minute: "2-digit",
  });
}

// ─── Component ────────────────────────────────────────────────────────────

export function StatAdjustPanel({
  employeeId,
  initialStats,
}: {
  employeeId: string;
  initialStats: {
    str: number | null | undefined;
    int: number | null | undefined;
    wis: number | null | undefined;
    cha: number | null | undefined;
    dex: number | null | undefined;
    con: number | null | undefined;
    stat_locked: boolean;
    stat_lock_reason: string | null;
    stat_source: string | null;
  };
}) {
  const [stats, setStats] = useState<StatState>({
    str:  initialStats.str  ?? 10,
    int:  initialStats.int  ?? 10,
    wis:  initialStats.wis  ?? 10,
    cha:  initialStats.cha  ?? 10,
    dex:  initialStats.dex  ?? 10,
    con:  initialStats.con  ?? 10,
    stat_locked:      initialStats.stat_locked,
    stat_lock_reason: initialStats.stat_lock_reason,
    stat_source:      initialStats.stat_source,
  });

  // Local edits in progress — only active when unlocked
  const [edits, setEdits] = useState<Partial<Record<AttrKey, number>>>({});
  const [reason, setReason] = useState("");
  const [lockReason, setLockReason] = useState("");
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [log, setLog] = useState<LogEntry[]>([]);
  const [logLoading, setLogLoading] = useState(false);
  const [showLog, setShowLog] = useState(false);

  const fetchLog = useCallback(async () => {
    setLogLoading(true);
    try {
      const res = await fetch(
        `/api/game/log?target_type=employee&target_id=${employeeId}&limit=10`
      );
      const data = await res.json();
      setLog(data.entries ?? []);
    } finally {
      setLogLoading(false);
    }
  }, [employeeId]);

  useEffect(() => {
    if (showLog && log.length === 0) fetchLog();
  }, [showLog, log.length, fetchLog]);

  function setEdit(key: AttrKey, v: number) {
    setEdits((prev) => ({ ...prev, [key]: Math.max(1, Math.min(20, v)) }));
  }

  async function handleLockToggle(newLocked: boolean) {
    const r = newLocked ? lockReason : lockReason;
    if (r.trim().length < 10) {
      setMsg({ ok: false, text: "Reason must be at least 10 characters." });
      return;
    }
    setSaving(true);
    setMsg(null);
    try {
      const res = await fetch("/api/game/lock", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          target_type: "employee",
          target_id: employeeId,
          locked: newLocked,
          reason: r.trim(),
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Lock failed");
      setStats((s) => ({ ...s, stat_locked: newLocked, stat_lock_reason: r.trim() }));
      setLockReason("");
      setEdits({});
      setMsg({ ok: true, text: newLocked ? "Stats locked." : "Stats unlocked. Edits are now active." });
      if (showLog) fetchLog();
    } catch (e) {
      setMsg({ ok: false, text: e instanceof Error ? e.message : "Failed" });
    } finally {
      setSaving(false);
    }
  }

  async function handleSave() {
    if (reason.trim().length < 10) {
      setMsg({ ok: false, text: "Reason must be at least 10 characters." });
      return;
    }
    const changes = Object.entries(edits).filter(
      ([k, v]) => v !== undefined && v !== stats[k as AttrKey]
    ) as Array<[AttrKey, number]>;

    if (!changes.length) {
      setMsg({ ok: false, text: "No changes to save." });
      return;
    }

    setSaving(true);
    setMsg(null);
    const errors: string[] = [];

    for (const [field, value] of changes) {
      try {
        const res = await fetch("/api/game/adjust", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            target_type: "employee",
            target_id: employeeId,
            field,
            value,
            reason: reason.trim(),
          }),
        });
        const data = await res.json();
        if (!res.ok) errors.push(data.error ?? `${field} failed`);
        else setStats((s) => ({ ...s, [field]: value }));
      } catch {
        errors.push(`${field} network error`);
      }
    }

    if (errors.length) {
      setMsg({ ok: false, text: errors.join("; ") });
    } else {
      setEdits({});
      setReason("");
      setMsg({ ok: true, text: `Saved ${changes.length} stat${changes.length > 1 ? "s" : ""}.` });
      if (showLog) fetchLog();
    }
    setSaving(false);
  }

  const locked = stats.stat_locked;
  const dirtyCount = Object.entries(edits).filter(
    ([k, v]) => v !== undefined && v !== stats[k as AttrKey]
  ).length;

  return (
    <div style={panelStyle}>
      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 14 }}>
        <div>
          <div style={labelStyle}>Attributes · Direct Adjustment</div>
          <div style={{ fontSize: 9, color: "var(--text-muted)", marginTop: 4 }}>
            Source: <span style={{ color: "var(--text-secondary)" }}>
              {stats.stat_source ?? "—"}
            </span>
            {locked && stats.stat_lock_reason && (
              <> · Locked: <span style={{ color: "var(--text-secondary)" }}>{stats.stat_lock_reason}</span></>
            )}
          </div>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
          <span style={{
            fontSize: 9, letterSpacing: "0.14em", textTransform: "uppercase",
            color: locked ? "#ef4444" : "#22c55e", padding: "3px 8px",
            border: `1px solid ${locked ? "#ef4444" : "#22c55e"}`,
          }}>
            {locked ? "🔒 Locked" : "🔓 Unlocked"}
          </span>
        </div>
      </div>

      {/* Stat grid */}
      <div style={{
        display: "grid",
        gridTemplateColumns: "repeat(6, 1fr)",
        gap: 8,
        marginBottom: 16,
      }}>
        {ATTRS.map(({ key, label, desc }) => {
          const current = stats[key];
          const edited = edits[key] ?? current;
          const changed = !locked && edited !== current;
          return (
            <div key={key} style={{
              border: `1px solid ${changed ? "var(--accent-gold)" : "var(--border-subtle)"}`,
              padding: "10px 8px",
              textAlign: "center",
              background: changed ? "rgba(255,215,0,0.04)" : "var(--bg-base)",
            }}>
              <div style={{ ...labelStyle, fontSize: 8, marginBottom: 4 }}>{label}</div>
              <div style={{
                ...mono,
                fontSize: 20,
                fontWeight: 400,
                lineHeight: 1,
                color: changed ? "var(--accent-gold)" : "var(--text-primary)",
                marginBottom: 4,
              }}>
                {edited}
              </div>
              <div style={{ fontSize: 8, color: "var(--text-muted)", marginBottom: locked ? 0 : 6 }}>
                {desc}
              </div>
              {!locked && (
                <div style={{ display: "flex", gap: 2, justifyContent: "center" }}>
                  <button
                    onClick={() => setEdit(key, (edits[key] ?? current) - 1)}
                    disabled={saving || (edits[key] ?? current) <= 1}
                    style={{
                      ...buttonBase,
                      padding: "2px 8px",
                      fontSize: 12,
                      lineHeight: 1,
                      opacity: (edits[key] ?? current) <= 1 ? 0.3 : 1,
                    }}
                  >−</button>
                  <button
                    onClick={() => setEdit(key, (edits[key] ?? current) + 1)}
                    disabled={saving || (edits[key] ?? current) >= 20}
                    style={{
                      ...buttonBase,
                      padding: "2px 8px",
                      fontSize: 12,
                      lineHeight: 1,
                      opacity: (edits[key] ?? current) >= 20 ? 0.3 : 1,
                    }}
                  >+</button>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Action zone */}
      {locked ? (
        // Unlock form
        <div style={{ display: "flex", gap: 8, alignItems: "flex-start", flexWrap: "wrap" }}>
          <input
            type="text"
            placeholder="Reason to unlock (min 10 chars)…"
            value={lockReason}
            onChange={(e) => setLockReason(e.target.value)}
            style={{
              flex: 1,
              minWidth: 200,
              ...mono,
              fontSize: 11,
              padding: "7px 10px",
              background: "var(--bg-base)",
              border: "1px solid var(--border-subtle)",
              color: "var(--text-primary)",
            }}
          />
          <button
            onClick={() => handleLockToggle(false)}
            disabled={saving || lockReason.trim().length < 10}
            style={{
              ...buttonBase,
              borderColor: "var(--accent-gold)",
              color: "var(--accent-gold)",
              opacity: lockReason.trim().length < 10 ? 0.4 : 1,
            }}
          >
            Unlock
          </button>
        </div>
      ) : (
        // Edit + save + re-lock form
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          <input
            type="text"
            placeholder="Reason for this adjustment (min 10 chars)…"
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            style={{
              ...mono,
              fontSize: 11,
              padding: "7px 10px",
              background: "var(--bg-base)",
              border: "1px solid var(--border-subtle)",
              color: "var(--text-primary)",
            }}
          />
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            <button
              onClick={handleSave}
              disabled={saving || dirtyCount === 0 || reason.trim().length < 10}
              style={{
                ...buttonBase,
                borderColor: dirtyCount > 0 && reason.trim().length >= 10 ? "var(--accent-gold)" : "var(--border-subtle)",
                color: dirtyCount > 0 && reason.trim().length >= 10 ? "var(--accent-gold)" : "var(--text-muted)",
                opacity: saving ? 0.5 : 1,
              }}
            >
              {saving ? "Saving…" : dirtyCount > 0 ? `Save ${dirtyCount} Change${dirtyCount > 1 ? "s" : ""}` : "No Changes"}
            </button>
            <input
              type="text"
              placeholder="Reason to re-lock…"
              value={lockReason}
              onChange={(e) => setLockReason(e.target.value)}
              style={{
                flex: 1,
                minWidth: 160,
                ...mono,
                fontSize: 11,
                padding: "7px 10px",
                background: "var(--bg-base)",
                border: "1px solid var(--border-subtle)",
                color: "var(--text-primary)",
              }}
            />
            <button
              onClick={() => handleLockToggle(true)}
              disabled={saving || lockReason.trim().length < 10}
              style={{
                ...buttonBase,
                opacity: lockReason.trim().length < 10 ? 0.4 : 1,
              }}
            >
              Re-lock
            </button>
          </div>
        </div>
      )}

      {/* Message */}
      {msg && (
        <div style={{
          marginTop: 10,
          fontSize: 10,
          letterSpacing: "0.1em",
          color: msg.ok ? "#22c55e" : "#ef4444",
        }}>
          {msg.text}
        </div>
      )}

      {/* Audit log toggle */}
      <div style={{ marginTop: 14 }}>
        <button
          onClick={() => {
            setShowLog((v) => !v);
            if (!showLog) fetchLog();
          }}
          style={{ ...buttonBase, fontSize: 9, padding: "4px 10px", letterSpacing: "0.16em" }}
        >
          {showLog ? "▲ Hide History" : "▼ Show Change History"}
        </button>

        {showLog && (
          <div style={{ marginTop: 10 }}>
            {logLoading ? (
              <div style={{ fontSize: 10, color: "var(--text-muted)" }}>Loading…</div>
            ) : log.length === 0 ? (
              <div style={{ fontSize: 10, color: "var(--text-muted)" }}>No changes recorded yet.</div>
            ) : (
              <table style={{ width: "100%", borderCollapse: "collapse", ...mono, fontSize: 9 }}>
                <thead>
                  <tr style={{ borderBottom: "1px solid var(--border-subtle)" }}>
                    {["Date", "Action", "Field", "Before → After", "Reason"].map((h) => (
                      <th key={h} style={{ textAlign: "left", padding: "4px 8px 4px 0", color: "var(--text-muted)", letterSpacing: "0.12em", textTransform: "uppercase" }}>
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {log.map((entry) => {
                    const bv = entry.before_value ?? {};
                    const av = entry.after_value ?? {};
                    const field = entry.field === "all_attributes" ? "all" : entry.field;
                    const beforeStr = entry.field === "all_attributes"
                      ? "neutral"
                      : String(Object.values(bv)[0] ?? "—");
                    const afterStr = entry.field === "all_attributes"
                      ? JSON.stringify(av).replace(/[{}"]/g, "").replace(/:/g, "=")
                      : String(Object.values(av)[0] ?? "—");
                    return (
                      <tr key={entry.id} style={{ borderBottom: "1px solid var(--border-subtle)" }}>
                        <td style={{ padding: "5px 8px 5px 0", color: "var(--text-secondary)" }}>{fmtDate(entry.created_at)}</td>
                        <td style={{ padding: "5px 8px 5px 0" }}>
                          <span style={{
                            padding: "1px 6px",
                            border: "1px solid var(--border-subtle)",
                            fontSize: 8,
                            letterSpacing: "0.12em",
                            textTransform: "uppercase",
                          }}>
                            {entry.action}
                          </span>
                        </td>
                        <td style={{ padding: "5px 8px 5px 0", color: "var(--accent-gold)", textTransform: "uppercase" }}>{field}</td>
                        <td style={{ padding: "5px 8px 5px 0", color: "var(--text-secondary)" }}>
                          {entry.field === "all_attributes"
                            ? afterStr.slice(0, 60)
                            : `${beforeStr} → ${afterStr}`}
                        </td>
                        <td style={{ padding: "5px 0 5px 0", color: "var(--text-secondary)", maxWidth: 180, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                          {entry.reason}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
