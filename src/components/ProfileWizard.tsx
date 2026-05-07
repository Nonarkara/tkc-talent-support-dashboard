"use client";

/**
 * ProfileWizard — Talk-to-Fill conversational stat builder.
 *
 * The director clicks "Compose with AI" on a hero or project card. This
 * drawer opens. They type one paragraph at a time; the AI asks at most 4
 * follow-ups, then proposes a full stat profile. The director reviews,
 * nudges any value, types a reason, and approves.
 *
 * The endpoint is /api/profile/converse for the chat loop and
 * /api/profile/commit to write the approved proposal to DB + Sheets.
 *
 * Voice: dry, observation-first. The AI is the Interviewer/Reader; the
 * UI uses the same DQ3-flavoured chrome as the rest of the app.
 */

import { useEffect, useRef, useState } from "react";

type Target = { type: "employee" | "project"; id: string; display_name: string };

interface EmployeeProposal {
  attributes: { str: number; int: number; wis: number; cha: number; dex: number; con: number };
  archetype: "captain" | "ops" | "tech" | "scout" | "sales" | "fighter" | "goofoff";
  rationale?: Record<string, string>;
  confidence?: Record<string, "high" | "med" | "low">;
  summary?: string;
}

interface ProjectProposal {
  complexity_score: number;
  urgency_score: number;
  strategic_value_score: number;
  delivery_risk_score: number;
  ai_leverage_score: number;
  suggested_slots: { technical: number; sales: number; marketing: number; outsourcing: number; paperwork: number };
  team_size: number;
  budget_thb?: number;
  monthly_ceiling?: number;
  rationale?: string;
  summary?: string;
}

type AnyProposal = EmployeeProposal | ProjectProposal;

interface ConverseResponse {
  conversation_id: string;
  ai_message: string;
  proposal: AnyProposal | null;
  done: boolean;
  turn_count: number;
  max_turns: number;
  note?: string;
  error?: string;
}

interface CommitResponse {
  ok: boolean;
  applied_fields?: string[];
  error?: string;
}

type Turn = { role: "user" | "assistant"; content: string };

export function ProfileWizard({
  target,
  onClose,
  onCommitted,
}: {
  target: Target;
  onClose: () => void;
  onCommitted?: () => void;
}) {
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [turns, setTurns] = useState<Turn[]>([]);
  const [proposal, setProposal] = useState<AnyProposal | null>(null);
  const [editedProposal, setEditedProposal] = useState<AnyProposal | null>(null);
  const [confidence, setConfidence] = useState<Record<string, "high" | "med" | "low">>({});
  const [draft, setDraft] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [reason, setReason] = useState("");
  const [committed, setCommitted] = useState(false);
  const transcriptRef = useRef<HTMLDivElement>(null);

  // Kick off the conversation on mount
  useEffect(() => {
    void converse({ initial: true });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Autoscroll transcript on new turns
  useEffect(() => {
    if (transcriptRef.current) {
      transcriptRef.current.scrollTop = transcriptRef.current.scrollHeight;
    }
  }, [turns.length]);

  async function converse({ initial = false }: { initial?: boolean } = {}) {
    setBusy(true);
    setError(null);
    try {
      const body: Record<string, unknown> = {
        target_type: target.type,
        target_id: target.id,
      };
      if (conversationId) body.conversation_id = conversationId;
      if (!initial && draft.trim()) body.message = draft.trim();

      const res = await fetch("/api/profile/converse", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data: ConverseResponse = await res.json();
      if (!res.ok || data.error) {
        setError(data.error ?? `HTTP ${res.status}`);
        return;
      }

      setConversationId(data.conversation_id);

      // Append the user message + AI reply to the local transcript
      setTurns((prev) => {
        const next = [...prev];
        if (!initial && draft.trim()) next.push({ role: "user", content: draft.trim() });
        next.push({ role: "assistant", content: data.ai_message });
        return next;
      });
      setDraft("");

      if (data.proposal) {
        setProposal(data.proposal);
        setEditedProposal(structuredClone(data.proposal));
        if ("confidence" in data.proposal && data.proposal.confidence) {
          setConfidence(data.proposal.confidence);
        }
      }

      if (data.note) setError(data.note);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Conversation failed");
    } finally {
      setBusy(false);
    }
  }

  async function commit() {
    if (!editedProposal || !conversationId) return;
    if (reason.trim().length < 10) {
      setError("Reason must be at least 10 characters.");
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/profile/commit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          conversation_id: conversationId,
          approved_proposal: editedProposal,
          reason: reason.trim(),
        }),
      });
      const data: CommitResponse = await res.json();
      if (!res.ok || !data.ok) {
        setError(data.error ?? `HTTP ${res.status}`);
        return;
      }
      setCommitted(true);
      onCommitted?.();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Commit failed");
    } finally {
      setBusy(false);
    }
  }

  const isEmployee = target.type === "employee";
  const isProject = target.type === "project";
  const empProposal = isEmployee ? (editedProposal as EmployeeProposal | null) : null;
  const projProposal = isProject ? (editedProposal as ProjectProposal | null) : null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(8,8,15,0.84)",
        display: "flex",
        alignItems: "stretch",
        justifyContent: "flex-end",
        zIndex: 1000,
        backdropFilter: "blur(4px)",
      }}
      onClick={onClose}
    >
      <aside
        onClick={(e) => e.stopPropagation()}
        style={{
          width: "min(560px, 100vw)",
          height: "100vh",
          background: "var(--ink-4, #0c0c14)",
          borderLeft: "1px solid var(--rpg-yellow, #f3b61f)",
          display: "flex",
          flexDirection: "column",
          fontFamily: "var(--font-mono, monospace)",
          color: "var(--ink-0, #f5f0e8)",
        }}
      >
        {/* Header */}
        <header
          style={{
            padding: "16px 20px",
            borderBottom: "1px solid var(--border-subtle, rgba(245,240,232,0.12))",
            display: "flex",
            alignItems: "center",
            gap: 12,
          }}
        >
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 9, color: "var(--rpg-yellow, #f3b61f)", letterSpacing: "0.18em", textTransform: "uppercase" }}>
              Talk-to-Fill · {isEmployee ? "Hero Profile" : "Project Setup"}
            </div>
            <div style={{ fontSize: 16, fontWeight: 700, marginTop: 4 }}>{target.display_name}</div>
          </div>
          <button
            onClick={onClose}
            type="button"
            style={{
              background: "transparent",
              border: "1px solid var(--border-subtle)",
              color: "var(--ink-1)",
              padding: "6px 10px",
              fontSize: 10,
              letterSpacing: "0.12em",
              textTransform: "uppercase",
              cursor: "pointer",
            }}
          >
            Close
          </button>
        </header>

        {/* Transcript */}
        <div
          ref={transcriptRef}
          style={{
            flex: 1,
            overflowY: "auto",
            padding: "16px 20px",
            display: "flex",
            flexDirection: "column",
            gap: 12,
          }}
        >
          {turns.length === 0 && busy && (
            <div style={{ fontSize: 11, color: "var(--ink-1)" }}>Composing the first question…</div>
          )}
          {turns.map((t, i) => (
            <div
              key={i}
              style={{
                alignSelf: t.role === "user" ? "flex-end" : "flex-start",
                maxWidth: "84%",
                background: t.role === "user" ? "rgba(243,182,31,0.08)" : "rgba(134,209,255,0.06)",
                border: `1px solid ${t.role === "user" ? "rgba(243,182,31,0.24)" : "rgba(134,209,255,0.18)"}`,
                padding: "10px 12px",
                fontSize: 12,
                lineHeight: 1.55,
                whiteSpace: "pre-wrap",
                fontFamily: t.role === "user" ? "var(--font-mono)" : "inherit",
              }}
            >
              <div style={{ fontSize: 8, color: "var(--ink-1)", letterSpacing: "0.16em", textTransform: "uppercase", marginBottom: 4 }}>
                {t.role === "user" ? "You" : isEmployee ? "Interviewer" : "Reader"}
              </div>
              {t.content}
            </div>
          ))}

          {/* Proposal panel */}
          {editedProposal && (
            <div
              style={{
                marginTop: 8,
                padding: "14px",
                background: "rgba(243,182,31,0.06)",
                border: "1px solid rgba(243,182,31,0.4)",
              }}
            >
              <div style={{ fontSize: 9, letterSpacing: "0.16em", textTransform: "uppercase", color: "var(--rpg-yellow)", marginBottom: 10 }}>
                Proposal · review and approve
              </div>

              {empProposal && (
                <div style={{ display: "grid", gap: 8 }}>
                  <div style={{ fontSize: 11, color: "var(--ink-1)", fontStyle: "italic" }}>
                    {empProposal.summary}
                  </div>
                  <div style={{ display: "grid", gap: 6 }}>
                    {(["str","int","wis","cha","dex","con"] as const).map((key) => (
                      <AttrEditor
                        key={key}
                        label={key.toUpperCase()}
                        value={empProposal.attributes[key]}
                        confidence={confidence[key] ?? "med"}
                        rationale={empProposal.rationale?.[key]}
                        onChange={(v) =>
                          setEditedProposal((p) => {
                            if (!p || !("attributes" in p)) return p;
                            return { ...p, attributes: { ...p.attributes, [key]: v } } as EmployeeProposal;
                          })
                        }
                      />
                    ))}
                  </div>
                  <div style={{ fontSize: 10, color: "var(--ink-1)", letterSpacing: "0.06em" }}>
                    Archetype: <strong style={{ color: "var(--rpg-yellow)" }}>{empProposal.archetype.toUpperCase()}</strong>
                  </div>
                </div>
              )}

              {projProposal && (
                <div style={{ display: "grid", gap: 8 }}>
                  <div style={{ fontSize: 11, color: "var(--ink-1)", fontStyle: "italic" }}>
                    {projProposal.summary}
                  </div>
                  <div style={{ display: "grid", gap: 6 }}>
                    {([
                      ["complexity_score","Complexity"],
                      ["urgency_score","Urgency"],
                      ["strategic_value_score","Strategic"],
                      ["delivery_risk_score","Risk"],
                      ["ai_leverage_score","AI Leverage"],
                    ] as const).map(([key, label]) => (
                      <ScoreEditor
                        key={key}
                        label={label}
                        value={projProposal[key]}
                        onChange={(v) =>
                          setEditedProposal((p) => p && { ...p, [key]: v } as ProjectProposal)
                        }
                      />
                    ))}
                  </div>
                  <div style={{ fontSize: 10, color: "var(--ink-1)" }}>
                    Team size: <strong style={{ color: "var(--rpg-yellow)" }}>{projProposal.team_size}</strong>
                    {" · "}Slots: T:{projProposal.suggested_slots.technical} S:{projProposal.suggested_slots.sales} M:{projProposal.suggested_slots.marketing} O:{projProposal.suggested_slots.outsourcing} P:{projProposal.suggested_slots.paperwork}
                  </div>
                  {projProposal.budget_thb && (
                    <div style={{ fontSize: 10, color: "var(--ink-1)" }}>
                      Budget: ฿{projProposal.budget_thb.toLocaleString()}{projProposal.monthly_ceiling ? ` · ceiling ฿${projProposal.monthly_ceiling.toLocaleString()}/mo` : ""}
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Error / status */}
        {error && (
          <div style={{ padding: "8px 20px", fontSize: 10, color: "var(--rpg-orange)", borderTop: "1px solid var(--border-subtle)" }}>
            {error}
          </div>
        )}

        {committed && (
          <div style={{ padding: "10px 20px", fontSize: 11, color: "var(--flux-up, #86CD7E)", borderTop: "1px solid rgba(134,205,126,0.3)" }}>
            ✓ Saved to DB and Sheets. The chatbot now sees the new profile.
          </div>
        )}

        {/* Input area */}
        {!committed && (
          <footer style={{ borderTop: "1px solid var(--border-subtle)", padding: "12px 20px" }}>
            {!editedProposal ? (
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                <textarea
                  value={draft}
                  onChange={(e) => setDraft(e.target.value)}
                  placeholder="Type your answer. Concrete examples win."
                  rows={3}
                  disabled={busy}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
                      e.preventDefault();
                      void converse();
                    }
                  }}
                  style={{
                    width: "100%",
                    background: "rgba(0,0,0,0.3)",
                    border: "1px solid var(--border-subtle)",
                    color: "var(--ink-0)",
                    padding: 10,
                    fontFamily: "inherit",
                    fontSize: 12,
                    resize: "none",
                    boxSizing: "border-box",
                  }}
                />
                <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                  <span style={{ fontSize: 9, color: "var(--ink-1)", flex: 1 }}>
                    Ctrl/Cmd+Enter to send
                  </span>
                  <button
                    type="button"
                    onClick={() => void converse()}
                    disabled={busy || !draft.trim()}
                    style={{
                      background: draft.trim() && !busy ? "var(--rpg-yellow)" : "transparent",
                      color: draft.trim() && !busy ? "#0c0c0c" : "var(--ink-1)",
                      border: `1px solid ${draft.trim() && !busy ? "var(--rpg-yellow)" : "var(--border-subtle)"}`,
                      padding: "8px 14px",
                      fontSize: 10,
                      fontFamily: "var(--font-mono)",
                      letterSpacing: "0.16em",
                      textTransform: "uppercase",
                      cursor: busy ? "not-allowed" : draft.trim() ? "pointer" : "not-allowed",
                      fontWeight: 800,
                    }}
                  >
                    {busy ? "Listening…" : "Send"}
                  </button>
                </div>
              </div>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                <input
                  type="text"
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  placeholder="Reason for audit log (≥10 chars)"
                  disabled={busy}
                  style={{
                    width: "100%",
                    background: "rgba(0,0,0,0.3)",
                    border: "1px solid var(--border-subtle)",
                    color: "var(--ink-0)",
                    padding: 10,
                    fontFamily: "inherit",
                    fontSize: 12,
                    boxSizing: "border-box",
                  }}
                />
                <div style={{ display: "flex", gap: 8 }}>
                  <button
                    type="button"
                    onClick={() => {
                      setEditedProposal(null);
                      setProposal(null);
                    }}
                    disabled={busy}
                    style={{
                      background: "transparent",
                      color: "var(--ink-1)",
                      border: "1px solid var(--border-subtle)",
                      padding: "8px 14px",
                      fontSize: 10,
                      fontFamily: "var(--font-mono)",
                      letterSpacing: "0.16em",
                      textTransform: "uppercase",
                      cursor: "pointer",
                    }}
                  >
                    Refine
                  </button>
                  <button
                    type="button"
                    onClick={() => void commit()}
                    disabled={busy || reason.trim().length < 10}
                    style={{
                      flex: 1,
                      background: reason.trim().length >= 10 && !busy ? "var(--flux-up, #86CD7E)" : "transparent",
                      color: reason.trim().length >= 10 && !busy ? "#0c0c0c" : "var(--ink-1)",
                      border: `1px solid ${reason.trim().length >= 10 && !busy ? "var(--flux-up, #86CD7E)" : "var(--border-subtle)"}`,
                      padding: "8px 14px",
                      fontSize: 10,
                      fontFamily: "var(--font-mono)",
                      letterSpacing: "0.16em",
                      textTransform: "uppercase",
                      cursor: busy ? "not-allowed" : reason.trim().length >= 10 ? "pointer" : "not-allowed",
                      fontWeight: 800,
                    }}
                  >
                    {busy ? "Saving…" : "Approve & Save"}
                  </button>
                </div>
              </div>
            )}
          </footer>
        )}

        {committed && (
          <footer style={{ borderTop: "1px solid var(--border-subtle)", padding: "12px 20px" }}>
            <button
              type="button"
              onClick={onClose}
              style={{
                width: "100%",
                background: "transparent",
                color: "var(--ink-0)",
                border: "1px solid var(--border-subtle)",
                padding: "10px 14px",
                fontSize: 10,
                fontFamily: "var(--font-mono)",
                letterSpacing: "0.16em",
                textTransform: "uppercase",
                cursor: "pointer",
              }}
            >
              Done
            </button>
          </footer>
        )}
      </aside>
    </div>
  );
}

// ─── Stat editors ────────────────────────────────────────────────────────

function AttrEditor({
  label,
  value,
  confidence,
  rationale,
  onChange,
}: {
  label: string;
  value: number;
  confidence: "high" | "med" | "low";
  rationale?: string;
  onChange: (v: number) => void;
}) {
  const confColor =
    confidence === "high" ? "var(--flux-up, #86CD7E)" :
    confidence === "low" ? "var(--rpg-orange, #FB923C)" : "var(--ink-1)";
  return (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: "44px 1fr auto",
        gap: 8,
        alignItems: "center",
        fontSize: 11,
      }}
      title={rationale ?? ""}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
        <span style={{ width: 5, height: 5, background: confColor, borderRadius: 0 }} />
        <strong style={{ fontFamily: "var(--font-mono)", letterSpacing: "0.08em" }}>{label}</strong>
      </div>
      <input
        type="range"
        min={1}
        max={20}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        style={{ width: "100%", accentColor: "var(--rpg-yellow)" }}
      />
      <strong style={{ fontFamily: "var(--font-mono)", color: "var(--rpg-yellow)", minWidth: 22, textAlign: "right" }}>
        {String(value).padStart(2, "0")}
      </strong>
    </div>
  );
}

function ScoreEditor({
  label,
  value,
  onChange,
}: {
  label: string;
  value: number;
  onChange: (v: number) => void;
}) {
  return (
    <div style={{ display: "grid", gridTemplateColumns: "84px 1fr auto", gap: 8, alignItems: "center", fontSize: 11 }}>
      <strong style={{ fontFamily: "var(--font-mono)", letterSpacing: "0.06em" }}>{label}</strong>
      <input
        type="range"
        min={1}
        max={100}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        style={{ width: "100%", accentColor: "var(--rpg-yellow)" }}
      />
      <strong style={{ fontFamily: "var(--font-mono)", color: "var(--rpg-yellow)", minWidth: 28, textAlign: "right" }}>
        {value}
      </strong>
    </div>
  );
}
