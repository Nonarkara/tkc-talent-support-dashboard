"use client";

/**
 * FormationTab — thin orchestrator.
 *
 * The drag-drop canvas lives one level down in `../formation/` so the
 * tab file itself stays trivial. Adding header copy or a legend later
 * stays a localised edit here and doesn't pollute the canvas internals.
 */

import { useState } from "react";
import { MenuWindow } from "@/components/MenuWindow";
import { FormationCanvas } from "../formation/FormationCanvas";
import { ProjectScorePanel } from "../formation/ProjectScorePanel";
import { StandardsWorkshopDrawer } from "../_shared/StandardsWorkshopDrawer";
import type { DashboardPayload } from "../_shared/types";

export function FormationTab({ dash }: { dash: DashboardPayload }) {
  const [workshopOpen, setWorkshopOpen] = useState(false);

  async function handleSaveStandards(nextStandards: typeof dash.competency_standards) {
    const res = await fetch("/api/db/competency-standards", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ standards: nextStandards }),
    });
    const json = (await res.json()) as { ok?: boolean; standards?: typeof dash.competency_standards; error?: string };
    if (!res.ok || !json.ok) {
      throw new Error(json.error ?? `HTTP ${res.status}`);
    }
    dash.updateCompetencyStandards(json.standards ?? nextStandards);
    void dash.refresh();
  }

  return (
    <div style={{ display: "grid", gap: 14 }}>
      <MenuWindow title="Workshop Controls">
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 260px), 1fr))",
            gap: 12,
          }}
        >
          <div style={{ display: "grid", gap: 8 }}>
            <div style={{ color: "var(--ink-0)", fontSize: 14, fontWeight: 700 }}>
              Standards Workshop
            </div>
            <div style={{ color: "var(--ink-1)", fontSize: 11, lineHeight: 1.55 }}>
              Formation now reads against workshop standards as well as structural slot fit. Update expected levels and freshness windows here before you commit a board state.
            </div>
            <button
              type="button"
              onClick={() => setWorkshopOpen(true)}
              style={{
                width: "fit-content",
                border: "none",
                background: "var(--rpg-yellow)",
                color: "var(--ink-4)",
                cursor: "pointer",
                fontFamily: "inherit",
                fontSize: 10,
                fontWeight: 800,
                padding: "9px 12px",
                textTransform: "uppercase",
                letterSpacing: "0.08em",
              }}
            >
              Open Standards Workshop
            </button>
          </div>

          <div style={{ display: "grid", gap: 6 }}>
            <div style={{ color: "var(--ink-0)", fontSize: 14, fontWeight: 700 }}>
              External Hooks
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 8 }}>
              {dash.integration_status.map((item) => (
                <div
                  key={item.key}
                  style={{
                    border: "1px solid var(--border-subtle)",
                    background: "rgba(0,0,0,0.12)",
                    padding: "8px 10px",
                    display: "grid",
                    gap: 4,
                  }}
                >
                  <div style={{ display: "flex", justifyContent: "space-between", gap: 8 }}>
                    <span style={{ color: "var(--ink-0)", fontSize: 11, fontWeight: 700 }}>{item.label}</span>
                    <span style={{ color: "var(--ink-1)", fontSize: 9, textTransform: "uppercase" }}>
                      {item.status.replaceAll("_", " ")}
                    </span>
                  </div>
                  <div style={{ color: "var(--ink-1)", fontSize: 10 }}>{item.source}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </MenuWindow>

      <FormationCanvas dash={dash} />

      <MenuWindow title="Project Scores">
        <ProjectScorePanel />
      </MenuWindow>

      <StandardsWorkshopDrawer
        open={workshopOpen}
        onClose={() => setWorkshopOpen(false)}
        standards={dash.competency_standards}
        onSave={handleSaveStandards}
      />
    </div>
  );
}
