"use client";

import type { CSSProperties, ReactNode } from "react";
import { useEffect, useState } from "react";
import type { CompetencyStandard } from "./types";

function numberOr(value: unknown, fallback: number) {
  const n = Number(value ?? fallback);
  return Number.isFinite(n) ? n : fallback;
}

function cloneStandards(standards: CompetencyStandard[]) {
  return standards.map((item) => ({
    ...item,
    weight: numberOr(item.weight, 1),
    expected_level: numberOr(item.expected_level, 3),
    recency_window_days: numberOr(item.recency_window_days, 540),
    linked_dimensions: [...(item.linked_dimensions ?? [])],
    descriptors: { ...(item.descriptors ?? {}) },
    external_refs: { ...(item.external_refs ?? {}) },
  }));
}

export function StandardsWorkshopDrawer({
  open,
  onClose,
  standards,
  onSave,
}: {
  open: boolean;
  onClose: () => void;
  standards: CompetencyStandard[];
  onSave: (standards: CompetencyStandard[]) => Promise<void> | void;
}) {
  const [draft, setDraft] = useState<CompetencyStandard[]>(() => cloneStandards(standards));
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    if (open) {
      setDraft(cloneStandards(standards));
      setMessage(null);
    }
  }, [open, standards]);

  if (!open) return null;

  async function handleSave() {
    setSaving(true);
    setMessage(null);
    try {
      await onSave(draft);
      setMessage("Saved workshop standards.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Failed to save standards.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div
      onClick={onClose}
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(0,0,0,0.62)",
        display: "flex",
        justifyContent: "flex-end",
        zIndex: 120,
      }}
    >
      <div
        onClick={(event) => event.stopPropagation()}
        style={{
          width: "min(560px, 100vw)",
          height: "100%",
          background: "var(--ink-4)",
          borderLeft: "2px solid var(--rpg-yellow)",
          overflowY: "auto",
        }}
      >
        <div style={{ padding: 20, display: "grid", gap: 16 }}>
          <div style={{ display: "flex", justifyContent: "space-between", gap: 12, alignItems: "center" }}>
            <div>
              <div
                className="pixel"
                style={{
                  fontSize: 9,
                  color: "var(--rpg-yellow)",
                  letterSpacing: "0.14em",
                  textTransform: "uppercase",
                }}
              >
                Standards Workshop
              </div>
              <div style={{ color: "var(--ink-0)", fontSize: 20, fontWeight: 700, marginTop: 4 }}>
                Aisha-aligned competency settings
              </div>
              <div style={{ color: "var(--ink-1)", fontSize: 12, lineHeight: 1.5, marginTop: 6 }}>
                Change expected level, weight, and freshness windows during the workshop. Ninja and Formation will rerank immediately against this draft once it saves.
              </div>
            </div>
            <button
              type="button"
              onClick={onClose}
              style={{
                background: "transparent",
                border: "1px solid var(--ink-2)",
                color: "var(--ink-1)",
                padding: "6px 12px",
                cursor: "pointer",
                fontSize: 11,
                fontFamily: "inherit",
              }}
            >
              Close
            </button>
          </div>

          <div style={{ display: "grid", gap: 10 }}>
            {draft.map((standard, index) => (
              (() => {
                const weight = numberOr(standard.weight, 1);
                const expectedLevel = numberOr(standard.expected_level, 3);
                const recencyWindow = numberOr(standard.recency_window_days, 540);
                return (
              <div
                key={`${standard.framework_source}:${standard.skill_key}`}
                style={{
                  border: "1px solid var(--border-subtle)",
                  background: "rgba(0,0,0,0.14)",
                  padding: 12,
                  display: "grid",
                  gap: 10,
                }}
              >
                <div style={{ display: "flex", justifyContent: "space-between", gap: 12, alignItems: "start" }}>
                  <div>
                    <div style={{ color: "var(--ink-0)", fontSize: 14, fontWeight: 700 }}>
                      {standard.display_name}
                    </div>
                    <div style={{ color: "var(--ink-1)", fontSize: 10, letterSpacing: "0.08em", textTransform: "uppercase", marginTop: 3 }}>
                      {standard.framework_source} {standard.framework_id ? `· ${standard.framework_id}` : ""}
                    </div>
                  </div>
                  <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                    {(standard.linked_dimensions ?? []).map((dimension) => (
                      <span
                        key={dimension}
                        style={{
                          border: "1px solid rgba(245,240,232,0.24)",
                          color: "var(--ink-1)",
                          fontSize: 9,
                          padding: "2px 6px",
                          textTransform: "uppercase",
                        }}
                      >
                        {dimension}
                      </span>
                    ))}
                  </div>
                </div>

                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns: "repeat(3, minmax(0, 1fr))",
                    gap: 10,
                  }}
                >
                  <Field label="Expected Level">
                    <select
                      value={expectedLevel}
                      onChange={(event) => {
                        const value = Number(event.target.value);
                        setDraft((current) =>
                          current.map((item, itemIndex) =>
                            itemIndex === index ? { ...item, expected_level: value } : item,
                          ),
                        );
                      }}
                      style={selectStyle}
                    >
                      {[1, 2, 3, 4, 5].map((value) => (
                        <option key={value} value={value}>
                          Level {value}
                        </option>
                      ))}
                    </select>
                  </Field>

                  <Field label={`Weight ${weight.toFixed(1)}`}>
                    <input
                      type="range"
                      min="0.5"
                      max="2"
                      step="0.1"
                      value={weight}
                      onChange={(event) => {
                        const value = Number(event.target.value);
                        setDraft((current) =>
                          current.map((item, itemIndex) =>
                            itemIndex === index ? { ...item, weight: value } : item,
                          ),
                        );
                      }}
                      style={{ width: "100%", accentColor: "var(--rpg-yellow)" }}
                    />
                  </Field>

                  <Field label="Freshness Window">
                    <select
                      value={String(recencyWindow)}
                      onChange={(event) => {
                        const value = Number(event.target.value);
                        setDraft((current) =>
                          current.map((item, itemIndex) =>
                            itemIndex === index ? { ...item, recency_window_days: value } : item,
                          ),
                        );
                      }}
                      style={selectStyle}
                    >
                      <option value="180">180 days</option>
                      <option value="365">365 days</option>
                      <option value="540">540 days</option>
                      <option value="720">720 days</option>
                    </select>
                  </Field>
                </div>
              </div>
                );
              })()
            ))}
          </div>

          <div style={{ display: "flex", justifyContent: "space-between", gap: 12, alignItems: "center" }}>
            <div style={{ color: message?.startsWith("Saved") ? "var(--flux-up)" : "var(--ink-1)", fontSize: 11 }}>
              {message ?? "Changes save back to the workshop standard table."}
            </div>
            <button
              type="button"
              onClick={() => void handleSave()}
              disabled={saving}
              style={{
                border: "none",
                background: saving ? "var(--ink-3)" : "var(--rpg-yellow)",
                color: saving ? "var(--ink-1)" : "var(--ink-4)",
                cursor: saving ? "not-allowed" : "pointer",
                fontFamily: "inherit",
                fontSize: 11,
                fontWeight: 800,
                padding: "10px 16px",
                textTransform: "uppercase",
                letterSpacing: "0.08em",
              }}
            >
              {saving ? "Saving…" : "Save Standards"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <label style={{ display: "grid", gap: 6 }}>
      <span
        style={{
          color: "var(--ink-1)",
          fontSize: 9,
          letterSpacing: "0.1em",
          textTransform: "uppercase",
        }}
      >
        {label}
      </span>
      {children}
    </label>
  );
}

const selectStyle: CSSProperties = {
  background: "rgba(0,0,0,0.28)",
  border: "1px solid var(--border-subtle)",
  color: "var(--ink-0)",
  fontFamily: "inherit",
  fontSize: 11,
  padding: "7px 9px",
};
