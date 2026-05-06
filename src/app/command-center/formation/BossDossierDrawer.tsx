"use client";

import { useEffect, useMemo, useState } from "react";
import { PlayerCard } from "@/components/PlayerCard";
import { ClassGlyph } from "@/components/ClassGlyph";
import {
  buildHeuristicHeroBrief,
  type HeroBrief,
  type HeroIntelEmployee,
} from "@/lib/hero-intel";
import { ARCHETYPE_COLOR, ARCHETYPE_LABEL, getArchetype, ARCHETYPES, type Archetype } from "@/lib/token-economy";
import { useDashboard } from "../_shared/useDashboard";

type AttrKey = "str" | "int" | "wis" | "cha" | "dex" | "con";

const ATTRS: Array<{ key: AttrKey; label: string }> = [
  { key: "str", label: "STR" },
  { key: "int", label: "INT" },
  { key: "wis", label: "WIS" },
  { key: "cha", label: "CHA" },
  { key: "dex", label: "DEX" },
  { key: "con", label: "CON" },
];

interface ApiHeroBrief extends HeroBrief {
  source?: "gemini" | "heuristic";
  note?: string;
}

function valueForAttr(employee: HeroIntelEmployee, key: AttrKey) {
  const raw = employee[`attr_${key}` as const];
  return typeof raw === "number" ? raw : 10;
}

function attrPct(value: number) {
  return Math.max(8, Math.min(100, Math.round((value / 20) * 100)));
}

export function BossDossierDrawer({
  employee,
  onClose,
}: {
  employee: HeroIntelEmployee;
  onClose: () => void;
}) {
  const archetype = useMemo(() => getArchetype(employee), [employee]);
  const tone = ARCHETYPE_COLOR[archetype];
  const fallbackBrief = useMemo(() => buildHeuristicHeroBrief(employee), [employee]);
  const [brief, setBrief] = useState<ApiHeroBrief>(fallbackBrief);
  const [loading, setLoading] = useState(true);
  const [vocationLoading, setVocationLoading] = useState(false);
  const dash = useDashboard();

  const handleVocationChange = async (next: Archetype | "none") => {
    setVocationLoading(true);
    try {
      const res = await fetch("/api/alltrades", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          employee_id: employee.id,
          from_archetype: archetype,
          to_archetype: next,
          reason: "Manual vocation change via Boss Dossier",
        }),
      });
      if (res.ok) {
        await dash.refresh();
      }
    } finally {
      setVocationLoading(false);
    }
  };

  useEffect(() => {
    let cancelled = false;

    (async () => {
      try {
        const response = await fetch("/api/ai/player-brief", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ employee }),
        });
        const data = await response.json();
        if (cancelled) return;
        if (response.ok) setBrief(data);
      } catch {
        if (cancelled) return;
        setBrief(fallbackBrief);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [employee, fallbackBrief]);

  return (
    <div
      onClick={onClose}
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 120,
        background: "rgba(6, 4, 2, 0.76)",
        display: "flex",
        justifyContent: "flex-end",
      }}
    >
      <div
        onClick={(event) => event.stopPropagation()}
        style={{
          width: 480,
          maxWidth: "100vw",
          height: "100%",
          overflowY: "auto",
          background:
            `linear-gradient(180deg, rgba(35,26,15,0.98) 0%, rgba(21,15,9,0.99) 100%)`,
          borderLeft: `2px solid ${tone}`,
          boxShadow: "-18px 0 60px rgba(0,0,0,0.3)",
          padding: "20px 18px 42px",
        }}
      >
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
          <div>
            <div
              className="pixel"
              style={{
                fontSize: 8,
                color: tone,
                letterSpacing: "0.16em",
                textTransform: "uppercase",
                marginBottom: 6,
              }}
            >
              Hero Dossier
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <ClassGlyph archetype={archetype} size={16} />
              <span style={{ fontSize: 12, color: "var(--text-secondary)", textTransform: "uppercase", letterSpacing: "0.12em" }}>
                {ARCHETYPE_LABEL[archetype]}
              </span>
            </div>
          </div>

          <button
            onClick={onClose}
            style={{
              background: "transparent",
              border: "1px solid var(--border-subtle)",
              color: "var(--text-secondary)",
              padding: "5px 10px",
              cursor: "pointer",
              fontFamily: "inherit",
              fontSize: 10,
              letterSpacing: "0.12em",
              textTransform: "uppercase",
            }}
          >
            Close
          </button>
        </div>

        <div style={{ marginBottom: 16 }}>
          <PlayerCard employee={employee} variant="full" />
        </div>

        <Section title="Attributes">
          <div style={{ display: "grid", gap: 10 }}>
            {ATTRS.map((attr) => {
              const value = valueForAttr(employee, attr.key);
              return (
                <div key={attr.key} style={{ display: "grid", gridTemplateColumns: "48px 1fr 32px", gap: 10, alignItems: "center" }}>
                  <div style={{ fontSize: 10, letterSpacing: "0.12em", color: "var(--text-muted)", textTransform: "uppercase" }}>
                    {attr.label}
                  </div>
                  <div style={{ height: 6, background: "var(--border-subtle)", position: "relative", overflow: "hidden" }}>
                    <div
                      style={{
                        position: "absolute",
                        inset: 0,
                        width: `${attrPct(value)}%`,
                        background: tone,
                      }}
                    />
                  </div>
                  <div style={{ fontSize: 11, color: "var(--text-primary)", textAlign: "right" }}>
                    {value}
                  </div>
                </div>
              );
            })}
          </div>
        </Section>

        <Section title="Alltrades Abbey">
          <p style={{ fontSize: 10, color: "var(--text-muted)", marginBottom: 12, lineHeight: 1.5, fontStyle: "italic" }}>
            &ldquo;Welcome to Alltrades Abbey. Here, one may shed their past and embrace a new destiny. However, only those who have reached Level 20 may truly transcend their natural limits.&rdquo;
          </p>
          <div style={{ 
            padding: "8px 12px", 
            background: "rgba(0,0,0,0.3)", 
            border: "1px solid var(--rpg-yellow)", 
            marginBottom: 12,
            fontSize: 10,
            color: "var(--rpg-yellow)",
            display: "flex",
            justifyContent: "space-between"
          }}>
            <span>CURRENT LEVEL: {1 + Math.floor(Math.sqrt((employee.xp ?? 0) / 100))}</span>
            <span>MIN. LEVEL: 20</span>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: 6 }}>
            {ARCHETYPES.map((arch) => {
              const isForced = employee.rpg_class === arch;
              return (
                <button
                  key={arch}
                  disabled={vocationLoading || isForced || (1 + Math.floor(Math.sqrt((employee.xp ?? 0) / 100)) < 20)}
                  onClick={() => handleVocationChange(arch)}
                  style={{
                    background: isForced ? ARCHETYPE_COLOR[arch] : "rgba(0,0,0,0.2)",
                    border: `1px solid ${isForced ? "var(--accent-gold)" : ARCHETYPE_COLOR[arch] + "88"}`,
                    color: isForced ? "#fff" : "var(--text-secondary)",
                    padding: "8px",
                    cursor: vocationLoading || isForced ? "default" : "pointer",
                    fontSize: 10,
                    textAlign: "left",
                    display: "flex",
                    alignItems: "center",
                    gap: 6,
                    opacity: vocationLoading || (!isForced && (1 + Math.floor(Math.sqrt((employee.xp ?? 0) / 100)) < 20)) ? 0.4 : 1,
                    transition: "all 0.2s ease",
                  }}
                >
                  <ClassGlyph archetype={arch} size={12} />
                  <span style={{ fontWeight: isForced ? 700 : 400 }}>
                    {ARCHETYPE_LABEL[arch]}
                    {isForced && " (Soulbound)"}
                    {arch === "ops" && " 🛡️"}
                    {arch === "tech" && " 🪄"}
                  </span>
                </button>
              );
            })}
            <button
              disabled={vocationLoading || !employee.rpg_class}
              onClick={() => handleVocationChange("none")}
              style={{
                gridColumn: "span 2",
                background: "rgba(255,255,255,0.05)",
                border: "1px dashed var(--border-subtle)",
                color: "var(--text-muted)",
                padding: "8px",
                cursor: vocationLoading || !employee.rpg_class ? "default" : "pointer",
                fontSize: 10,
                marginTop: 4,
                opacity: vocationLoading || !employee.rpg_class ? 0.3 : 1,
              }}
            >
              Reset to Natural Affinity
            </button>
          </div>
        </Section>

        <Section title="Reading">
          <p style={{ margin: 0, color: "var(--text-secondary)", fontSize: 12, lineHeight: 1.7 }}>
            {brief.summary}
          </p>
          <MetaNote loading={loading} source={brief.source} note={brief.note} />
        </Section>

        <Section title="Strengths">
          <TagList items={brief.strengths} tone={tone} />
        </Section>

        <Section title="Skills">
          <TagList items={brief.skills} />
        </Section>

        <Section title="Completed Training">
          <div style={{ display: "grid", gap: 8 }}>
            {brief.completed_trainings.map((training) => (
              <div
                key={`${training.provider}-${training.title}`}
                style={{
                  display: "grid",
                  gridTemplateColumns: "1fr auto",
                  gap: 8,
                  padding: "10px 12px",
                  border: "1px solid var(--border-subtle)",
                  background: "rgba(0,0,0,0.08)",
                }}
              >
                <div>
                  <div style={{ fontSize: 12, color: "var(--text-primary)" }}>{training.title}</div>
                  <div style={{ fontSize: 10, color: "var(--text-muted)", marginTop: 3 }}>{training.provider}</div>
                </div>
                <div
                  style={{
                    alignSelf: "start",
                    fontSize: 9,
                    letterSpacing: "0.12em",
                    textTransform: "uppercase",
                    color: training.status === "completed" ? "var(--accent-green)" : "var(--accent-gold)",
                  }}
                >
                  {training.status.replace("_", " ")}
                </div>
              </div>
            ))}
          </div>
        </Section>

        <Section title="AI Training Path">
          <TagList items={brief.recommended_trainings} tone="var(--accent-gold)" />
        </Section>

        <Section title="Project Fit">
          <BulletList items={brief.project_fit} />
        </Section>

        <Section title="Watchouts">
          <BulletList items={brief.watchouts} tone="var(--accent-red)" />
        </Section>
      </div>
    </div>
  );
}

function Section({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section style={{ marginBottom: 16, border: "1px solid var(--border-subtle)", background: "rgba(0,0,0,0.08)", padding: "14px" }}>
      <div
        className="pixel"
        style={{
          fontSize: 8,
          color: "var(--accent-gold)",
          letterSpacing: "0.16em",
          textTransform: "uppercase",
          marginBottom: 10,
        }}
      >
        {title}
      </div>
      {children}
    </section>
  );
}

function TagList({
  items,
  tone = "var(--accent-blue)",
}: {
  items: string[];
  tone?: string;
}) {
  return (
    <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
      {items.map((item) => (
        <span
          key={item}
          style={{
            padding: "5px 8px",
            border: `1px solid ${tone}55`,
            background: "rgba(0,0,0,0.12)",
            color: tone,
            fontSize: 10,
            letterSpacing: "0.04em",
          }}
        >
          {item}
        </span>
      ))}
    </div>
  );
}

function BulletList({
  items,
  tone = "var(--text-secondary)",
}: {
  items: string[];
  tone?: string;
}) {
  return (
    <div style={{ display: "grid", gap: 8 }}>
      {items.map((item) => (
        <div key={item} style={{ display: "grid", gridTemplateColumns: "10px 1fr", gap: 8, alignItems: "start" }}>
          <span style={{ color: tone, marginTop: 3 }}>•</span>
          <span style={{ color: tone, fontSize: 12, lineHeight: 1.6 }}>{item}</span>
        </div>
      ))}
    </div>
  );
}

function MetaNote({
  loading,
  source,
  note,
}: {
  loading: boolean;
  source?: "gemini" | "heuristic";
  note?: string;
}) {
  return (
    <div style={{ marginTop: 10, fontSize: 10, color: "var(--text-muted)", lineHeight: 1.6 }}>
      {loading ? "Reading this hero..." : source === "gemini" ? "AI brief source: Gemini" : "AI brief source: heuristic fallback"}
      {note ? <span> · {note}</span> : null}
    </div>
  );
}
