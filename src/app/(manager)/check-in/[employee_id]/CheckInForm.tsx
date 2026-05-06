"use client";

/**
 * CheckInForm — client-side interactive form for the Chronicle ritual.
 *
 * Three phases, matching `RITUALS.chronicle` in lore.ts:
 *   1. Scribe  — manager writes narrative on the left.
 *   2. Divine  — POST /api/check-ins/draft → LLM returns proposal.
 *   3. Ratify  — manager edits proposed deltas in the stepper panel,
 *                POST /api/check-ins/approve to commit.
 *
 * Only one check-in is in-flight at a time per page load; after ratify
 * the form locks into a "done" state and invites navigation away.
 */

import { useMemo, useState, type CSSProperties } from "react";
import { PlayerCard, type EmployeeLike } from "@/components/PlayerCard";
import {
  ARCHETYPE_GLOW,
  ARCHETYPE_SPARK,
  getArchetype,
} from "@/lib/token-economy";

type AttrKey = "str" | "int" | "wis" | "cha" | "dex" | "con";

const ATTR_ORDER: readonly AttrKey[] = ["str", "int", "wis", "cha", "dex", "con"] as const;

const ATTR_LABEL: Record<AttrKey, string> = {
  str: "STR",
  int: "INT",
  wis: "WIS",
  cha: "CHA",
  dex: "DEX",
  con: "CON",
};

interface ProposalDelta {
  attr: AttrKey;
  delta: number;
  rationale: string;
}

interface SentimentProposal {
  label: "positive" | "neutral" | "negative" | "mixed";
  score: number;
  confidence: number;
  vector: {
    morale: number;
    trust: number;
    energy: number;
    clarity: number;
    momentum: number;
    risk: number;
  };
  drivers: string[];
  symptoms: string[];
  source: string;
}

interface DraftResponse {
  check_in_id: string;
  proposal: {
    deltas: ProposalDelta[];
    sentiment: SentimentProposal;
    model: string;
    latency_ms: number;
    note?: string;
  };
}

interface ApproveResponse {
  ok: boolean;
  applied: Array<{ attr: AttrKey; delta: number; from: number; to: number }>;
  new_attributes: Record<AttrKey, number>;
}

// ─── Styling helpers ──────────────────────────────────────────────────────

const sectionLabel: CSSProperties = {
  fontSize: 9,
  letterSpacing: "0.18em",
  color: "var(--text-muted)",
  textTransform: "uppercase",
  marginBottom: 10,
};

const panel: CSSProperties = {
  border: "1px solid var(--border-subtle)",
  background: "var(--bg-elevated)",
  padding: 20,
};

const buttonBase: CSSProperties = {
  fontFamily: "inherit",
  fontSize: 10,
  letterSpacing: "0.18em",
  textTransform: "uppercase",
  padding: "10px 18px",
  border: "1px solid var(--border-subtle)",
  background: "transparent",
  color: "var(--text-primary)",
  cursor: "pointer",
  transition: "border-color 160ms ease, background 160ms ease",
};

// ─── Component ────────────────────────────────────────────────────────────

export function CheckInForm({
  employee,
  defaultCycle,
}: {
  employee: EmployeeLike;
  defaultCycle: string;
}) {
  const [cycle, setCycle] = useState(defaultCycle);
  const [narrative, setNarrative] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [draft, setDraft] = useState<DraftResponse | null>(null);

  /** The editable deltas shown in the diff panel — initialised from LLM proposal. */
  const [edits, setEdits] = useState<Record<AttrKey, number>>({
    str: 0,
    int: 0,
    wis: 0,
    cha: 0,
    dex: 0,
    con: 0,
  });

  const [approved, setApproved] = useState<ApproveResponse | null>(null);

  const archetype = useMemo(() => getArchetype(employee), [employee]);
  const glow = ARCHETYPE_GLOW[archetype];
  const spark = ARCHETYPE_SPARK[archetype];

  const rationaleByAttr = useMemo(() => {
    const m = new Map<AttrKey, string>();
    for (const d of draft?.proposal.deltas ?? []) m.set(d.attr, d.rationale);
    return m;
  }, [draft]);

  const currentAttrs: Record<AttrKey, number | null | undefined> = {
    str: employee.attr_str,
    int: employee.attr_int,
    wis: employee.attr_wis,
    cha: employee.attr_cha,
    dex: employee.attr_dex,
    con: employee.attr_con,
  };

  async function handleDraft() {
    setError(null);
    if (narrative.trim().length < 10) {
      setError("Write at least a sentence of observation first.");
      return;
    }
    setLoading(true);
    try {
      const res = await fetch("/api/check-ins/draft", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          employee_id: employee.id,
          narrative: narrative.trim(),
          cycle,
        }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error ?? `Draft failed (${res.status})`);
      }
      const data: DraftResponse = await res.json();
      setDraft(data);
      // Seed the edits map with the LLM's proposed integers.
      const next: Record<AttrKey, number> = { str: 0, int: 0, wis: 0, cha: 0, dex: 0, con: 0 };
      for (const d of data.proposal.deltas) next[d.attr] = d.delta;
      setEdits(next);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Draft failed.");
    } finally {
      setLoading(false);
    }
  }

  async function handleRatify() {
    if (!draft) return;
    setError(null);
    setLoading(true);
    try {
      const approved_deltas = ATTR_ORDER
        .filter((a) => edits[a] !== 0)
        .map((attr) => ({ attr, delta: edits[attr] }));

      const res = await fetch("/api/check-ins/approve", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          check_in_id: draft.check_in_id,
          approved_deltas,
        }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error ?? `Ratify failed (${res.status})`);
      }
      const data: ApproveResponse = await res.json();
      setApproved(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Ratify failed.");
    } finally {
      setLoading(false);
    }
  }

  function bump(attr: AttrKey, by: number) {
    setEdits((prev) => ({
      ...prev,
      [attr]: Math.max(-3, Math.min(3, (prev[attr] ?? 0) + by)),
    }));
  }

  const canRatify = Boolean(draft) && !approved;
  const anyEdits = ATTR_ORDER.some((a) => edits[a] !== 0);

  return (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: "minmax(300px, 1fr) minmax(320px, 1fr)",
        gap: 24,
        alignItems: "start",
      }}
    >
      {/* ─── Left: Scribe ────────────────────────────────────── */}
      <section>
        <div style={sectionLabel}>Phase 1 · Scribe</div>

        <div style={{ marginBottom: 16 }}>
          <PlayerCard employee={employee} />
        </div>

        <div style={panel}>
          <label
            style={{
              display: "block",
              fontSize: 9,
              letterSpacing: "0.16em",
              color: "var(--text-muted)",
              textTransform: "uppercase",
              marginBottom: 6,
            }}
          >
            Cycle
          </label>
          <input
            type="text"
            value={cycle}
            onChange={(e) => setCycle(e.target.value)}
            disabled={loading || !!approved}
            style={{
              width: 160,
              padding: "6px 10px",
              fontFamily: "inherit",
              fontSize: 12,
              background: "var(--bg-base)",
              border: "1px solid var(--border-subtle)",
              color: "var(--text-primary)",
              letterSpacing: "0.08em",
              marginBottom: 18,
            }}
          />

          <label
            style={{
              display: "block",
              fontSize: 9,
              letterSpacing: "0.16em",
              color: "var(--text-muted)",
              textTransform: "uppercase",
              marginBottom: 6,
            }}
          >
            Narrative
          </label>
          <textarea
            value={narrative}
            onChange={(e) => setNarrative(e.target.value)}
            rows={10}
            disabled={loading || !!approved}
            placeholder="What did you see this cycle? Be specific. One or two incidents, named, dated if you can. The Chronicler reads for evidence, not adjectives."
            style={{
              width: "100%",
              padding: 12,
              fontFamily: "inherit",
              fontSize: 12,
              lineHeight: 1.6,
              background: "var(--bg-base)",
              border: "1px solid var(--border-subtle)",
              color: "var(--text-primary)",
              resize: "vertical",
              minHeight: 200,
            }}
            maxLength={4000}
          />
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              marginTop: 8,
              fontSize: 9,
              letterSpacing: "0.12em",
              color: "var(--text-muted)",
              textTransform: "uppercase",
            }}
          >
            <span>{narrative.length} / 4000 chars</span>
            {draft ? (
              <span>
                Chronicler · {draft.proposal.model} · {draft.proposal.latency_ms}ms
              </span>
            ) : null}
          </div>

          <div style={{ marginTop: 18, display: "flex", gap: 10 }}>
            <button
              type="button"
              onClick={handleDraft}
              disabled={loading || !!approved || narrative.trim().length < 10}
              style={{
                ...buttonBase,
                borderColor: draft ? "var(--border-subtle)" : "var(--accent-gold)",
                color: draft ? "var(--text-muted)" : "var(--text-primary)",
                opacity:
                  loading || !!approved || narrative.trim().length < 10 ? 0.4 : 1,
              }}
            >
              {draft ? "Redivine" : loading ? "Divining…" : "Divine deltas"}
            </button>
          </div>
        </div>
      </section>

      {/* ─── Right: Divine + Ratify ──────────────────────────── */}
      <section>
        <div style={sectionLabel}>
          Phase 2 · Divine &nbsp;·&nbsp; Phase 3 · Ratify
        </div>

        <div style={panel}>
          {!draft ? (
            <EmptyState />
          ) : approved ? (
            <ApprovedState result={approved} />
          ) : (
            <DiffPanel
              glow={glow}
              spark={spark}
              note={draft.proposal.note}
              sentiment={draft.proposal.sentiment}
              currentAttrs={currentAttrs}
              edits={edits}
              rationaleByAttr={rationaleByAttr}
              onBump={bump}
            />
          )}

          {error ? (
            <div
              style={{
                marginTop: 16,
                padding: "10px 12px",
                background: "var(--surface-hot)",
                border: "1px solid var(--flux-down)",
                color: "var(--flux-down)",
                fontSize: 11,
                letterSpacing: "0.06em",
              }}
            >
              {error}
            </div>
          ) : null}

          {canRatify ? (
            <div style={{ marginTop: 20, display: "flex", gap: 10 }}>
              <button
                type="button"
                onClick={handleRatify}
                disabled={loading || !anyEdits}
                style={{
                  ...buttonBase,
                  borderColor: anyEdits ? "var(--accent-gold)" : "var(--border-subtle)",
                  color: anyEdits ? "var(--text-primary)" : "var(--text-muted)",
                  opacity: loading || !anyEdits ? 0.4 : 1,
                }}
              >
                {loading ? "Ratifying…" : anyEdits ? "Ratify" : "Nothing to ratify"}
              </button>
              <a
                href="/command-center?screen=roster"
                style={{
                  ...buttonBase,
                  textDecoration: "none",
                  color: "var(--text-muted)",
                }}
              >
                Cancel
              </a>
            </div>
          ) : null}
        </div>
      </section>
    </div>
  );
}

// ─── Sub-components ───────────────────────────────────────────────────────

function EmptyState() {
  return (
    <div
      style={{
        minHeight: 260,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        color: "var(--text-muted)",
        fontSize: 11,
        letterSpacing: "0.08em",
        textAlign: "center",
        padding: "24px 16px",
        lineHeight: 1.7,
      }}
    >
      Write the narrative on the left, then divine the deltas.
      <br />
      The proposal will appear here for your review.
    </div>
  );
}

function DiffPanel({
  glow,
  spark,
  note,
  sentiment,
  currentAttrs,
  edits,
  rationaleByAttr,
  onBump,
}: {
  glow: string;
  spark: string;
  note?: string;
  sentiment: SentimentProposal;
  currentAttrs: Record<AttrKey, number | null | undefined>;
  edits: Record<AttrKey, number>;
  rationaleByAttr: Map<AttrKey, string>;
  onBump: (attr: AttrKey, by: number) => void;
}) {
  return (
    <div>
      {note ? (
        <div
          style={{
            fontSize: 10,
            letterSpacing: "0.06em",
            color: "var(--text-muted)",
            marginBottom: 14,
            fontStyle: "italic",
          }}
        >
          {note}
        </div>
      ) : null}

      <SentimentReadout sentiment={sentiment} />

      <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        {ATTR_ORDER.map((attr) => {
          const current = currentAttrs[attr] ?? 10;
          const delta = edits[attr] ?? 0;
          const next = Math.max(1, Math.min(20, current + delta));
          const rationale = rationaleByAttr.get(attr);
          const hasDelta = delta !== 0;
          return (
            <div
              key={attr}
              style={{
                display: "grid",
                gridTemplateColumns: "46px 1fr auto",
                alignItems: "center",
                gap: 12,
                padding: "10px 12px",
                border: "1px solid var(--border-subtle)",
                background: hasDelta
                  ? `linear-gradient(90deg, ${hexAlpha(glow, 0.08)} 0%, transparent 60%)`
                  : "var(--bg-base)",
              }}
            >
              <span
                style={{
                  fontSize: 10,
                  letterSpacing: "0.16em",
                  color: "var(--text-muted)",
                  textTransform: "uppercase",
                }}
              >
                {ATTR_LABEL[attr]}
              </span>

              <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 8,
                    fontSize: 12,
                    color: "var(--text-primary)",
                    letterSpacing: "0.06em",
                  }}
                >
                  <span style={{ color: "var(--text-secondary)" }}>{current}</span>
                  <span style={{ color: "var(--text-muted)" }}>→</span>
                  <span>{next}</span>
                  {hasDelta ? (
                    <span
                      style={{
                        marginLeft: 6,
                        padding: "1px 6px",
                        fontSize: 9,
                        letterSpacing: "0.14em",
                        color: delta > 0 ? "var(--flux-up)" : "var(--flux-down)",
                        border: `1px solid ${delta > 0 ? "var(--flux-up)" : "var(--flux-down)"}`,
                      }}
                    >
                      {delta > 0 ? `+${delta}` : `${delta}`}
                    </span>
                  ) : null}
                </div>
                {rationale ? (
                  <div
                    style={{
                      fontSize: 10,
                      lineHeight: 1.55,
                      color: "var(--text-muted)",
                      letterSpacing: "0.02em",
                    }}
                  >
                    {rationale}
                  </div>
                ) : null}
              </div>

              <div style={{ display: "flex", gap: 4 }}>
                <StepperButton onClick={() => onBump(attr, -1)} disabled={delta <= -3}>
                  −
                </StepperButton>
                <StepperButton
                  onClick={() => onBump(attr, 1)}
                  disabled={delta >= 3}
                  accent={spark}
                >
                  +
                </StepperButton>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function StepperButton({
  children,
  onClick,
  disabled,
  accent,
}: {
  children: React.ReactNode;
  onClick: () => void;
  disabled?: boolean;
  accent?: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      style={{
        width: 28,
        height: 28,
        fontFamily: "inherit",
        fontSize: 14,
        lineHeight: 1,
        background: "transparent",
        border: "1px solid var(--border-subtle)",
        color: accent ? accent : "var(--text-primary)",
        cursor: disabled ? "not-allowed" : "pointer",
        opacity: disabled ? 0.3 : 1,
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      {children}
    </button>
  );
}

function SentimentReadout({ sentiment }: { sentiment: SentimentProposal }) {
  const tone =
    sentiment.score >= 64
      ? "var(--flux-up)"
      : sentiment.score <= 42
        ? "var(--flux-down)"
        : "var(--accent-gold)";
  const axes = [
    ["Morale", sentiment.vector.morale],
    ["Trust", sentiment.vector.trust],
    ["Energy", sentiment.vector.energy],
    ["Risk", sentiment.vector.risk],
  ] as const;

  return (
    <div
      style={{
        border: "1px solid var(--border-subtle)",
        background: "var(--bg-base)",
        padding: "12px 12px 10px",
        marginBottom: 14,
      }}
    >
      <div style={{ display: "flex", justifyContent: "space-between", gap: 12 }}>
        <div>
          <div
            style={{
              fontSize: 9,
              letterSpacing: "0.16em",
              color: "var(--text-muted)",
              textTransform: "uppercase",
              marginBottom: 5,
            }}
          >
            Rules signal
          </div>
          <div style={{ fontSize: 11, color: "var(--text-secondary)", letterSpacing: "0.08em" }}>
            {sentiment.label} · confidence {Math.round(sentiment.confidence * 100)}%
          </div>
        </div>
        <div style={{ fontSize: 26, lineHeight: 1, color: tone, fontWeight: 700 }}>
          {Math.round(sentiment.score)}
        </div>
      </div>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(4, minmax(0, 1fr))",
          gap: 8,
          marginTop: 12,
        }}
      >
        {axes.map(([label, value]) => (
          <div key={label}>
            <div
              style={{
                fontSize: 8,
                letterSpacing: "0.12em",
                textTransform: "uppercase",
                color: "var(--text-muted)",
                marginBottom: 4,
              }}
            >
              {label}
            </div>
            <div style={{ height: 4, background: "var(--border-subtle)", overflow: "hidden" }}>
              <div
                style={{
                  width: `${Math.max(0, Math.min(100, value))}%`,
                  height: "100%",
                  background: label === "Risk" ? "var(--flux-down)" : "var(--accent-gold)",
                }}
              />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function ApprovedState({ result }: { result: ApproveResponse }) {
  return (
    <div style={{ padding: "12px 2px" }}>
      <div
        style={{
          fontSize: 10,
          letterSpacing: "0.18em",
          color: "var(--flux-up)",
          textTransform: "uppercase",
          marginBottom: 10,
        }}
      >
        Ratified
      </div>
      <div
        style={{
          fontSize: 12,
          lineHeight: 1.7,
          color: "var(--text-secondary)",
          marginBottom: 14,
        }}
      >
        The cycle is stamped. {result.applied.length}{" "}
        {result.applied.length === 1 ? "change" : "changes"} recorded.
      </div>
      <ul
        style={{
          listStyle: "none",
          margin: 0,
          padding: 0,
          display: "flex",
          flexDirection: "column",
          gap: 6,
          fontSize: 11,
          color: "var(--text-primary)",
        }}
      >
        {result.applied.map((c) => (
          <li
            key={c.attr}
            style={{
              display: "flex",
              justifyContent: "space-between",
              padding: "6px 0",
              borderBottom: "1px dashed var(--border-subtle)",
              letterSpacing: "0.04em",
            }}
          >
            <span style={{ color: "var(--text-muted)", letterSpacing: "0.14em" }}>
              {ATTR_LABEL[c.attr]}
            </span>
            <span>
              {c.from} → {c.to}{" "}
              <span
                style={{
                  color: c.delta > 0 ? "var(--flux-up)" : "var(--flux-down)",
                  marginLeft: 8,
                }}
              >
                {c.delta > 0 ? `+${c.delta}` : c.delta}
              </span>
            </span>
          </li>
        ))}
      </ul>
      <div style={{ marginTop: 20, display: "flex", gap: 10 }}>
        <a
          href="/command-center?screen=roster"
          style={{
            ...buttonBase,
            textDecoration: "none",
          }}
        >
          Back to roster
        </a>
      </div>
    </div>
  );
}

/** Tiny helper — the PlayerCard file has its own; inline copy keeps this component standalone. */
function hexAlpha(hex: string, alpha: number): string {
  const h = hex.replace("#", "");
  const r = parseInt(h.substring(0, 2), 16);
  const g = parseInt(h.substring(2, 4), 16);
  const b = parseInt(h.substring(4, 6), 16);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}
