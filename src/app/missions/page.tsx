"use client";

/**
 * /missions — Team Prototype Sprint Tracker
 *
 * Each TKC team committed to one working prototype by 2026-06-27.
 * Non provides API credits + coaching.
 * Commitment made on stage at the 2026-05-27 TKC employee workshop.
 *
 * This page tracks: brief · owner · status · demo URL · days left.
 * A mission without a demo_url is DRAFT regardless of stated status.
 * The no-localhost rule applies: demo_url must be a public URL.
 */

import { useEffect, useRef, useState } from "react";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type MissionStatus = "DRAFT" | "BUILDING" | "DEMO_READY" | "DEPLOYED";

interface Mission {
  id: number;
  team_name: string;
  department: string | null;
  brief: string | null;
  owner_name: string | null;
  deadline: string;
  demo_url: string | null;
  tech_stack: string | null;
  status: MissionStatus;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const DEADLINE = new Date("2026-06-27T23:59:59+07:00");

const STATUS_ORDER: MissionStatus[] = ["DEPLOYED", "DEMO_READY", "BUILDING", "DRAFT"];

const STATUS_LABEL: Record<MissionStatus, string> = {
  DRAFT: "DRAFT",
  BUILDING: "BUILDING",
  DEMO_READY: "DEMO READY",
  DEPLOYED: "DEPLOYED",
};

// ---------------------------------------------------------------------------
// S-Curve SVG widget
// ---------------------------------------------------------------------------

function SCurveWidget() {
  // Points are (x%, y%) within a 100×40 viewBox. 0,0 = bottom-left.
  // Old S-curve: growth 2022→2024, plateau 2024→2026+
  const oldCurve = "M 0,38 C 8,36 18,28 30,18 S 50,4 62,4 S 80,4 100,5";
  // New S-curve forming (starts at NOW, 2026): dotted, upward trajectory
  const newCurve = "M 62,36 C 68,32 76,24 88,14 S 100,6 110,4";
  // Investment profit bar reference: peaks 2025 (x≈55)
  const investLine = "M 40,26 L 55,14 L 62,20";

  return (
    <div
      style={{
        border: "1px solid rgba(212,168,67,0.2)",
        padding: "16px 20px",
        marginBottom: 24,
        background: "rgba(212,168,67,0.03)",
      }}
    >
      <div
        style={{
          fontFamily: "JetBrains Mono, monospace",
          fontSize: 9,
          color: "rgba(212,168,67,0.5)",
          letterSpacing: "0.1em",
          marginBottom: 8,
          textTransform: "uppercase",
        }}
      >
        S-CURVE EXECUTIVE VIEW · TKC CORE BUSINESS
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr auto", gap: 20, alignItems: "start" }}>
        <svg
          viewBox="0 0 100 42"
          style={{ width: "100%", maxWidth: 480, height: 80, overflow: "visible" }}
          aria-label="S-curve diagram showing core business plateau and new S-curve forming"
        >
          {/* Grid lines */}
          <line x1="0" y1="40" x2="100" y2="40" stroke="rgba(255,255,255,0.08)" strokeWidth="0.3" />
          <line x1="0" y1="0" x2="0" y2="40" stroke="rgba(255,255,255,0.08)" strokeWidth="0.3" />

          {/* Year labels */}
          {[
            { x: 0, label: "2022" },
            { x: 25, label: "2023" },
            { x: 50, label: "2024" },
            { x: 62, label: "2025" },
            { x: 75, label: "2026" },
            { x: 100, label: "2027" },
          ].map(({ x, label }) => (
            <text
              key={label}
              x={x}
              y={44}
              textAnchor="middle"
              fontSize="3.5"
              fill="rgba(255,255,255,0.25)"
              fontFamily="monospace"
            >
              {label}
            </text>
          ))}

          {/* Old S-curve — core business (solid amber, fading) */}
          <path
            d={oldCurve}
            fill="none"
            stroke="rgba(212,168,67,0.6)"
            strokeWidth="1.2"
            strokeLinecap="round"
          />

          {/* Investment profit peak (dashed, dimmer) */}
          <path
            d={investLine}
            fill="none"
            stroke="rgba(212,168,67,0.25)"
            strokeWidth="0.8"
            strokeDasharray="1.5,1"
            strokeLinecap="round"
          />

          {/* NOW vertical line */}
          <line
            x1="75"
            y1="0"
            x2="75"
            y2="40"
            stroke="rgba(212,168,67,0.4)"
            strokeWidth="0.5"
            strokeDasharray="1,1"
          />
          <text x="76" y="5" fontSize="3" fill="rgba(212,168,67,0.6)" fontFamily="monospace">
            NOW
          </text>

          {/* New S-curve forming (dotted, brighter) */}
          <path
            d={newCurve}
            fill="none"
            stroke="rgba(212,168,67,0.9)"
            strokeWidth="1"
            strokeDasharray="2,1.5"
            strokeLinecap="round"
          />

          {/* Labels */}
          <text x="30" y="10" fontSize="3" fill="rgba(212,168,67,0.5)" fontFamily="monospace">
            core ops
          </text>
          <text x="82" y="12" fontSize="3" fill="rgba(212,168,67,0.9)" fontFamily="monospace">
            new ↗
          </text>
          <text x="52" y="16" fontSize="2.8" fill="rgba(212,168,67,0.3)" fontFamily="monospace">
            invest.
          </text>
        </svg>

        <div style={{ display: "grid", gap: 8, minWidth: 160 }}>
          {[
            { label: "Core ops stagnant", value: "2+ yrs", color: "rgba(212,168,67,0.5)" },
            { label: "2025 profit source", value: "investments", color: "rgba(212,168,67,0.5)" },
            { label: "New S-curve window", value: "NOW", color: "rgba(212,168,67,1)" },
            { label: "Deadline if no pivot", value: "~2 yrs", color: "#e57373" },
          ].map(({ label, value, color }) => (
            <div key={label} style={{ display: "grid", gridTemplateColumns: "1fr auto", gap: 8, alignItems: "baseline" }}>
              <span
                style={{
                  fontFamily: "JetBrains Mono, monospace",
                  fontSize: 9,
                  color: "rgba(255,255,255,0.35)",
                  textTransform: "uppercase",
                  letterSpacing: "0.05em",
                }}
              >
                {label}
              </span>
              <span
                style={{
                  fontFamily: "JetBrains Mono, monospace",
                  fontSize: 10,
                  color,
                  textAlign: "right",
                }}
              >
                {value}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Countdown
// ---------------------------------------------------------------------------

function useDaysLeft() {
  const [days, setDays] = useState<number | null>(null);
  useEffect(() => {
    const calc = () => {
      const now = new Date();
      const diff = DEADLINE.getTime() - now.getTime();
      setDays(Math.max(0, Math.ceil(diff / (1000 * 60 * 60 * 24))));
    };
    calc();
    const t = setInterval(calc, 60_000);
    return () => clearInterval(t);
  }, []);
  return days;
}

// ---------------------------------------------------------------------------
// Status badge
// ---------------------------------------------------------------------------

function StatusBadge({ status, hasDemo }: { status: MissionStatus; hasDemo: boolean }) {
  const effective: MissionStatus = !hasDemo && status !== "DRAFT" ? "BUILDING" : status;
  const colors: Record<MissionStatus, { border: string; text: string; bg: string }> = {
    DRAFT: {
      border: "rgba(255,255,255,0.15)",
      text: "rgba(255,255,255,0.3)",
      bg: "transparent",
    },
    BUILDING: {
      border: "rgba(212,168,67,0.4)",
      text: "rgba(212,168,67,0.8)",
      bg: "rgba(212,168,67,0.05)",
    },
    DEMO_READY: {
      border: "rgba(212,168,67,0.7)",
      text: "#d4a843",
      bg: "rgba(212,168,67,0.1)",
    },
    DEPLOYED: {
      border: "#d4a843",
      text: "#0d0d10",
      bg: "#d4a843",
    },
  };
  const c = colors[effective];
  return (
    <span
      style={{
        display: "inline-block",
        fontFamily: "JetBrains Mono, monospace",
        fontSize: 9,
        letterSpacing: "0.1em",
        padding: "2px 6px",
        border: `1px solid ${c.border}`,
        color: c.text,
        background: c.bg,
      }}
    >
      {STATUS_LABEL[effective]}
    </span>
  );
}

// ---------------------------------------------------------------------------
// Mission card
// ---------------------------------------------------------------------------

function MissionCard({
  mission,
  onStatusChange,
  onDemoUrlChange,
}: {
  mission: Mission;
  onStatusChange: (id: number, status: MissionStatus) => Promise<void>;
  onDemoUrlChange: (id: number, url: string) => Promise<void>;
}) {
  const [editingUrl, setEditingUrl] = useState(false);
  const [urlDraft, setUrlDraft] = useState(mission.demo_url ?? "");
  const [saving, setSaving] = useState(false);
  const urlRef = useRef<HTMLInputElement>(null);
  const hasDemo = !!mission.demo_url;

  useEffect(() => {
    if (editingUrl) urlRef.current?.focus();
  }, [editingUrl]);

  const handleUrlSave = async () => {
    setSaving(true);
    await onDemoUrlChange(mission.id, urlDraft.trim());
    setSaving(false);
    setEditingUrl(false);
  };

  const nextStatus: Record<MissionStatus, MissionStatus | null> = {
    DRAFT: "BUILDING",
    BUILDING: "DEMO_READY",
    DEMO_READY: "DEPLOYED",
    DEPLOYED: null,
  };

  const ns = nextStatus[mission.status];

  return (
    <div
      style={{
        border: "1px solid rgba(255,255,255,0.1)",
        padding: "16px",
        display: "grid",
        gap: 10,
        background: mission.status === "DEPLOYED" ? "rgba(212,168,67,0.04)" : "transparent",
        position: "relative",
      }}
    >
      {/* Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 8 }}>
        <div>
          <div
            style={{
              fontFamily: "JetBrains Mono, monospace",
              fontSize: 14,
              color: "#e6edf3",
              fontWeight: 600,
              marginBottom: 2,
            }}
          >
            {mission.team_name}
          </div>
          {mission.department && (
            <div
              style={{
                fontFamily: "JetBrains Mono, monospace",
                fontSize: 9,
                color: "rgba(255,255,255,0.3)",
                textTransform: "uppercase",
                letterSpacing: "0.08em",
              }}
            >
              {mission.department}
            </div>
          )}
        </div>
        <StatusBadge status={mission.status} hasDemo={hasDemo} />
      </div>

      {/* Brief */}
      {mission.brief && (
        <p
          style={{
            fontFamily: "JetBrains Mono, monospace",
            fontSize: 11,
            color: "rgba(255,255,255,0.55)",
            margin: 0,
            lineHeight: 1.5,
          }}
        >
          {mission.brief}
        </p>
      )}

      {/* Owner + tech */}
      <div style={{ display: "flex", gap: 16, flexWrap: "wrap" }}>
        {mission.owner_name && (
          <div
            style={{
              fontFamily: "JetBrains Mono, monospace",
              fontSize: 9,
              color: "rgba(255,255,255,0.35)",
            }}
          >
            LEAD · {mission.owner_name}
          </div>
        )}
        {mission.tech_stack && (
          <div
            style={{
              fontFamily: "JetBrains Mono, monospace",
              fontSize: 9,
              color: "rgba(255,255,255,0.25)",
            }}
          >
            {mission.tech_stack}
          </div>
        )}
      </div>

      {/* Demo URL */}
      <div>
        {editingUrl ? (
          <div style={{ display: "flex", gap: 6 }}>
            <input
              ref={urlRef}
              value={urlDraft}
              onChange={(e) => setUrlDraft(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") void handleUrlSave();
                if (e.key === "Escape") setEditingUrl(false);
              }}
              placeholder="https://…"
              style={{
                flex: 1,
                background: "rgba(255,255,255,0.05)",
                border: "1px solid rgba(212,168,67,0.4)",
                color: "#e6edf3",
                fontFamily: "JetBrains Mono, monospace",
                fontSize: 11,
                padding: "4px 8px",
                outline: "none",
              }}
            />
            <button
              onClick={() => void handleUrlSave()}
              disabled={saving}
              style={{
                background: "#d4a843",
                color: "#0d0d10",
                border: "none",
                padding: "4px 10px",
                fontFamily: "JetBrains Mono, monospace",
                fontSize: 10,
                cursor: "pointer",
                fontWeight: 700,
              }}
            >
              {saving ? "…" : "SAVE"}
            </button>
            <button
              onClick={() => setEditingUrl(false)}
              style={{
                background: "transparent",
                color: "rgba(255,255,255,0.4)",
                border: "1px solid rgba(255,255,255,0.15)",
                padding: "4px 8px",
                fontFamily: "JetBrains Mono, monospace",
                fontSize: 10,
                cursor: "pointer",
              }}
            >
              ✕
            </button>
          </div>
        ) : mission.demo_url ? (
          <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
            <a
              href={mission.demo_url}
              target="_blank"
              rel="noopener noreferrer"
              style={{
                fontFamily: "JetBrains Mono, monospace",
                fontSize: 10,
                color: "#d4a843",
                textDecoration: "none",
                borderBottom: "1px solid rgba(212,168,67,0.3)",
                wordBreak: "break-all",
              }}
            >
              {mission.demo_url}
            </a>
            <button
              onClick={() => {
                setUrlDraft(mission.demo_url ?? "");
                setEditingUrl(true);
              }}
              aria-label="Edit demo URL"
              style={{
                background: "transparent",
                border: "none",
                color: "rgba(255,255,255,0.25)",
                cursor: "pointer",
                fontSize: 11,
                padding: 0,
                flexShrink: 0,
              }}
            >
              ✏
            </button>
          </div>
        ) : (
          <button
            onClick={() => setEditingUrl(true)}
            style={{
              background: "transparent",
              border: "1px solid rgba(212,168,67,0.25)",
              color: "rgba(212,168,67,0.5)",
              fontFamily: "JetBrains Mono, monospace",
              fontSize: 9,
              padding: "3px 8px",
              cursor: "pointer",
              letterSpacing: "0.08em",
              textTransform: "uppercase",
            }}
          >
            ⚠ NO DEMO URL · add one
          </button>
        )}
      </div>

      {/* Advance status */}
      {ns && (
        <button
          onClick={() => void onStatusChange(mission.id, ns)}
          style={{
            background: "transparent",
            border: "1px solid rgba(212,168,67,0.2)",
            color: "rgba(212,168,67,0.6)",
            fontFamily: "JetBrains Mono, monospace",
            fontSize: 9,
            padding: "3px 8px",
            cursor: "pointer",
            textAlign: "left",
            letterSpacing: "0.08em",
          }}
        >
          → MARK {STATUS_LABEL[ns]}
        </button>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Add mission form
// ---------------------------------------------------------------------------

interface NewMissionDraft {
  team_name: string;
  department: string;
  brief: string;
  owner_name: string;
  tech_stack: string;
  demo_url: string;
}

const EMPTY_DRAFT: NewMissionDraft = {
  team_name: "",
  department: "",
  brief: "",
  owner_name: "",
  tech_stack: "",
  demo_url: "",
};

function AddMissionForm({ onAdd, onClose }: { onAdd: (m: Mission) => void; onClose: () => void }) {
  const [draft, setDraft] = useState<NewMissionDraft>(EMPTY_DRAFT);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const field = (k: keyof NewMissionDraft) => ({
    value: draft[k],
    onChange: (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
      setDraft((d) => ({ ...d, [k]: e.target.value })),
  });

  const inputStyle: React.CSSProperties = {
    width: "100%",
    background: "rgba(255,255,255,0.04)",
    border: "1px solid rgba(255,255,255,0.12)",
    color: "#e6edf3",
    fontFamily: "JetBrains Mono, monospace",
    fontSize: 12,
    padding: "6px 10px",
    outline: "none",
    boxSizing: "border-box",
  };

  const labelStyle: React.CSSProperties = {
    fontFamily: "JetBrains Mono, monospace",
    fontSize: 9,
    color: "rgba(255,255,255,0.35)",
    letterSpacing: "0.1em",
    textTransform: "uppercase",
    marginBottom: 4,
    display: "block",
  };

  const handleSubmit = async () => {
    if (!draft.team_name.trim()) {
      setError("Team name is required");
      return;
    }
    setSaving(true);
    setError(null);
    try {
      const res = await fetch("/api/db/missions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          team_name: draft.team_name.trim(),
          department: draft.department.trim() || null,
          brief: draft.brief.trim() || null,
          owner_name: draft.owner_name.trim() || null,
          tech_stack: draft.tech_stack.trim() || null,
          demo_url: draft.demo_url.trim() || null,
          status: "BUILDING",
          deadline: "2026-06-27",
        }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        setError((body as { error?: string }).error ?? "Failed to create mission");
        return;
      }
      const body = await res.json() as { mission: Mission };
      onAdd(body.mission);
      onClose();
    } catch {
      setError("Network error");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(10,14,20,0.92)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        zIndex: 100,
        padding: 16,
      }}
    >
      <div
        style={{
          background: "#0d0d10",
          border: "1px solid rgba(212,168,67,0.3)",
          padding: 24,
          width: "100%",
          maxWidth: 480,
          display: "grid",
          gap: 14,
        }}
      >
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
          <span
            style={{
              fontFamily: "JetBrains Mono, monospace",
              fontSize: 12,
              color: "#d4a843",
              letterSpacing: "0.08em",
              textTransform: "uppercase",
            }}
          >
            ADD MISSION
          </span>
          <button
            onClick={onClose}
            aria-label="Close add mission form"
            style={{
              background: "transparent",
              border: "none",
              color: "rgba(255,255,255,0.4)",
              cursor: "pointer",
              fontSize: 16,
              padding: 0,
            }}
          >
            ✕
          </button>
        </div>

        <div>
          <label style={labelStyle}>Team name *</label>
          <input style={inputStyle} placeholder="e.g. PMO Ninjas" {...field("team_name")} />
        </div>
        <div>
          <label style={labelStyle}>Department</label>
          <input style={inputStyle} placeholder="e.g. PMO / HR / Sales" {...field("department")} />
        </div>
        <div>
          <label style={labelStyle}>Brief — what are you building?</label>
          <textarea
            {...field("brief")}
            rows={2}
            placeholder="One sentence describing the prototype"
            style={{ ...inputStyle, resize: "vertical", fontFamily: "JetBrains Mono, monospace" }}
          />
        </div>
        <div>
          <label style={labelStyle}>Squad lead / owner</label>
          <input style={inputStyle} placeholder="Name" {...field("owner_name")} />
        </div>
        <div>
          <label style={labelStyle}>Tech stack</label>
          <input style={inputStyle} placeholder="e.g. Next.js, Supabase, Claude API" {...field("tech_stack")} />
        </div>
        <div>
          <label style={labelStyle}>Demo URL (public — no localhost)</label>
          <input style={inputStyle} placeholder="https://…" {...field("demo_url")} />
        </div>

        {error && (
          <div
            style={{
              fontFamily: "JetBrains Mono, monospace",
              fontSize: 10,
              color: "#e57373",
              border: "1px solid rgba(229,115,115,0.3)",
              padding: "4px 8px",
            }}
          >
            {error}
          </div>
        )}

        <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
          <button
            onClick={onClose}
            style={{
              background: "transparent",
              border: "1px solid rgba(255,255,255,0.12)",
              color: "rgba(255,255,255,0.4)",
              fontFamily: "JetBrains Mono, monospace",
              fontSize: 10,
              padding: "6px 16px",
              cursor: "pointer",
            }}
          >
            CANCEL
          </button>
          <button
            onClick={() => void handleSubmit()}
            disabled={saving}
            style={{
              background: "#d4a843",
              color: "#0d0d10",
              border: "none",
              fontFamily: "JetBrains Mono, monospace",
              fontSize: 10,
              fontWeight: 700,
              padding: "6px 20px",
              cursor: "pointer",
            }}
          >
            {saving ? "SAVING…" : "ADD MISSION"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main page
// ---------------------------------------------------------------------------

export default function MissionsPage() {
  const [missions, setMissions] = useState<Mission[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAdd, setShowAdd] = useState(false);
  const daysLeft = useDaysLeft();

  useEffect(() => {
    fetch("/api/db/missions")
      .then((r) => r.json())
      .then((body: { missions: Mission[] }) => setMissions(body.missions ?? []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const handleStatusChange = async (id: number, status: MissionStatus) => {
    const res = await fetch(`/api/db/missions/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status }),
    });
    if (!res.ok) return;
    const body = await res.json() as { mission: Mission };
    setMissions((prev) => prev.map((m) => (m.id === id ? body.mission : m)));
  };

  const handleDemoUrlChange = async (id: number, demo_url: string) => {
    const res = await fetch(`/api/db/missions/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ demo_url: demo_url || null }),
    });
    if (!res.ok) return;
    const body = await res.json() as { mission: Mission };
    setMissions((prev) => prev.map((m) => (m.id === id ? body.mission : m)));
  };

  const handleAdd = (m: Mission) => {
    setMissions((prev) => [m, ...prev]);
  };

  // Counts
  const counts = {
    total: missions.length,
    deployed: missions.filter((m) => m.status === "DEPLOYED").length,
    demo: missions.filter((m) => m.status === "DEMO_READY").length,
    building: missions.filter((m) => m.status === "BUILDING").length,
    draft: missions.filter((m) => m.status === "DRAFT").length,
    noUrl: missions.filter((m) => !m.demo_url).length,
  };

  const ordered = [...missions].sort((a, b) => {
    const oi = STATUS_ORDER.indexOf(a.status);
    const oi2 = STATUS_ORDER.indexOf(b.status);
    return oi - oi2;
  });

  return (
    <main
      style={{
        minHeight: "100vh",
        background: "#0a0e14",
        color: "#e6edf3",
        padding: "24px 28px",
        boxSizing: "border-box",
      }}
    >
      <style>{`html, body { background: #0a0e14 !important; } * { box-sizing: border-box; }`}</style>

      {/* Page header */}
      <header style={{ marginBottom: 20 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: 12 }}>
          <div>
            <div
              style={{
                fontFamily: "JetBrains Mono, monospace",
                fontSize: 9,
                color: "rgba(212,168,67,0.5)",
                letterSpacing: "0.15em",
                textTransform: "uppercase",
                marginBottom: 6,
              }}
            >
              TKC · 2026-H1 · MISSION BOARD
            </div>
            <h1
              style={{
                fontFamily: "JetBrains Mono, monospace",
                fontSize: 22,
                color: "#e6edf3",
                margin: 0,
                fontWeight: 700,
                letterSpacing: "-0.01em",
              }}
            >
              ONE-MONTH SPRINT
            </h1>
            <p
              style={{
                fontFamily: "JetBrains Mono, monospace",
                fontSize: 11,
                color: "rgba(255,255,255,0.35)",
                margin: "6px 0 0",
              }}
            >
              Every team ships one working prototype. No localhost. Public URL required.
            </p>
          </div>

          <div style={{ textAlign: "right" }}>
            {daysLeft !== null && (
              <div>
                <div
                  style={{
                    fontFamily: "JetBrains Mono, monospace",
                    fontSize: 36,
                    fontWeight: 700,
                    color: daysLeft <= 7 ? "#e57373" : daysLeft <= 14 ? "#d4a843" : "#e6edf3",
                    lineHeight: 1,
                  }}
                >
                  {daysLeft}
                </div>
                <div
                  style={{
                    fontFamily: "JetBrains Mono, monospace",
                    fontSize: 9,
                    color: "rgba(255,255,255,0.3)",
                    letterSpacing: "0.1em",
                    textTransform: "uppercase",
                  }}
                >
                  DAYS LEFT · DEADLINE 27 JUN
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Stats strip */}
        {missions.length > 0 && (
          <div
            style={{
              display: "flex",
              gap: 20,
              marginTop: 16,
              flexWrap: "wrap",
              borderTop: "1px solid rgba(255,255,255,0.06)",
              paddingTop: 12,
            }}
          >
            {[
              { label: "TOTAL", value: counts.total },
              { label: "DEPLOYED", value: counts.deployed, color: "#d4a843" },
              { label: "DEMO READY", value: counts.demo, color: "#d4a843" },
              { label: "BUILDING", value: counts.building },
              { label: "DRAFT", value: counts.draft },
              { label: "NO URL ⚠", value: counts.noUrl, color: counts.noUrl > 0 ? "#e57373" : undefined },
            ].map(({ label, value, color }) => (
              <div key={label}>
                <div
                  style={{
                    fontFamily: "JetBrains Mono, monospace",
                    fontSize: 20,
                    fontWeight: 700,
                    color: color ?? "#e6edf3",
                    lineHeight: 1,
                  }}
                >
                  {value}
                </div>
                <div
                  style={{
                    fontFamily: "JetBrains Mono, monospace",
                    fontSize: 8,
                    color: "rgba(255,255,255,0.25)",
                    letterSpacing: "0.1em",
                  }}
                >
                  {label}
                </div>
              </div>
            ))}
          </div>
        )}
      </header>

      {/* S-curve widget */}
      <SCurveWidget />

      {/* Mission grid */}
      <section>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
          <span
            style={{
              fontFamily: "JetBrains Mono, monospace",
              fontSize: 9,
              color: "rgba(255,255,255,0.25)",
              letterSpacing: "0.1em",
              textTransform: "uppercase",
            }}
          >
            {loading ? "LOADING…" : `${missions.length} MISSION${missions.length === 1 ? "" : "S"}`}
          </span>
          <button
            onClick={() => setShowAdd(true)}
            aria-label="Add new mission"
            style={{
              background: "transparent",
              border: "1px solid rgba(212,168,67,0.4)",
              color: "#d4a843",
              fontFamily: "JetBrains Mono, monospace",
              fontSize: 10,
              padding: "5px 14px",
              cursor: "pointer",
              letterSpacing: "0.08em",
              textTransform: "uppercase",
            }}
          >
            + ADD MISSION
          </button>
        </div>

        {loading ? (
          <div
            style={{
              fontFamily: "JetBrains Mono, monospace",
              fontSize: 11,
              color: "rgba(255,255,255,0.2)",
              padding: "40px 0",
              textAlign: "center",
            }}
          >
            loading missions…
          </div>
        ) : missions.length === 0 ? (
          <div
            style={{
              border: "1px solid rgba(255,255,255,0.06)",
              padding: "40px 24px",
              textAlign: "center",
            }}
          >
            <div
              style={{
                fontFamily: "JetBrains Mono, monospace",
                fontSize: 13,
                color: "rgba(255,255,255,0.2)",
                marginBottom: 8,
              }}
            >
              No missions logged yet.
            </div>
            <div
              style={{
                fontFamily: "JetBrains Mono, monospace",
                fontSize: 10,
                color: "rgba(212,168,67,0.4)",
              }}
            >
              Each team commits to one working prototype by 2026-06-27.
            </div>
          </div>
        ) : (
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))",
              gap: 1,
              background: "rgba(255,255,255,0.05)",
            }}
          >
            {ordered.map((m) => (
              <div key={m.id} style={{ background: "#0a0e14" }}>
                <MissionCard
                  mission={m}
                  onStatusChange={handleStatusChange}
                  onDemoUrlChange={handleDemoUrlChange}
                />
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Add form overlay */}
      {showAdd && <AddMissionForm onAdd={handleAdd} onClose={() => setShowAdd(false)} />}

      {/* Nav back */}
      <footer style={{ marginTop: 32, paddingTop: 16, borderTop: "1px solid rgba(255,255,255,0.06)" }}>
        <a
          href="/command-center?screen=ninja"
          style={{
            fontFamily: "JetBrains Mono, monospace",
            fontSize: 10,
            color: "rgba(212,168,67,0.5)",
            textDecoration: "none",
            letterSpacing: "0.08em",
          }}
        >
          ← COMMAND CENTER
        </a>
      </footer>
    </main>
  );
}
