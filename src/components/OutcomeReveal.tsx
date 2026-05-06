"use client";

import { useState } from "react";
import type { ProjectOutcome } from "../app/command-center/_shared/types";

/**
 * OutcomeReveal — the Predicted vs. Actual card flip.
 * 
 * Shows the Oracle's prediction on the front and the cold reality on the back.
 * Uses a 3D flip animation.
 */

interface Props {
  outcome: ProjectOutcome;
}

export function OutcomeReveal({ outcome }: Props) {
  const [flipped, setFlipped] = useState(false);

  const statusColors: Record<string, string> = {
    early: "var(--flux-up)",
    on_time: "var(--rpg-yellow)",
    late: "var(--rpg-orange)",
    failed: "var(--rpg-red)",
  };

  const budgetVariance = outcome.budget_actual_thb 
    ? (outcome.budget_actual_thb / (Number(outcome.team_cost_cp || 1) * 1000)) - 1
    : 0;

  return (
    <div 
      className="outcome-card-container"
      onClick={() => setFlipped(!flipped)}
      style={{
        perspective: "1000px",
        width: "100%",
        height: "180px",
        cursor: "pointer",
      }}
    >
      <div 
        className={`outcome-card ${flipped ? 'flipped' : ''}`}
        style={{
          position: "relative",
          width: "100%",
          height: "100%",
          transition: "transform 0.6s cubic-bezier(0.4, 0, 0.2, 1)",
          transformStyle: "preserve-3d",
          transform: flipped ? "rotateY(180deg)" : "rotateY(0deg)",
        }}
      >
        {/* FRONT: PREDICTED */}
        <div 
          className="card-face card-front"
          style={{
            position: "absolute",
            width: "100%",
            height: "100%",
            backfaceVisibility: "hidden",
            background: "linear-gradient(135deg, var(--rpg-blue-deep) 0%, #0a101f 100%)",
            border: "2px solid var(--rpg-blue)",
            padding: "16px",
            display: "grid",
            gap: "12px",
          }}
        >
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <span style={{ fontSize: "10px", color: "var(--rpg-blue)", fontWeight: 800, letterSpacing: "0.1em" }}>PREDICTION</span>
            <span style={{ fontSize: "12px", color: "var(--ink-0)", fontWeight: 700 }}>{outcome.project_code}</span>
          </div>
          
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px" }}>
            <Metric label="EST. FIT" value={`${outcome.predicted_fit ?? '??'}%`} tone="var(--rpg-yellow)" />
            <Metric label="EST. CHEM" value={`${outcome.predicted_chemistry ?? '??'}%`} tone="var(--flux-up)" />
          </div>

          <div style={{ marginTop: "auto", display: "flex", justifyContent: "space-between", fontSize: "11px", color: "var(--ink-1)" }}>
            <span>Oracle Confidence: HIGH</span>
            <span style={{ color: "var(--rpg-blue)" }}>CLICK TO REVEAL</span>
          </div>
        </div>

        {/* BACK: ACTUAL */}
        <div 
          className="card-face card-back"
          style={{
            position: "absolute",
            width: "100%",
            height: "100%",
            backfaceVisibility: "hidden",
            background: "linear-gradient(135deg, #1a150a 0%, #0a0a0a 100%)",
            border: `2px solid ${statusColors[outcome.timeline_status] || "var(--ink-0)"}`,
            padding: "16px",
            display: "grid",
            gap: "12px",
            transform: "rotateY(180deg)",
          }}
        >
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <span style={{ fontSize: "10px", color: statusColors[outcome.timeline_status], fontWeight: 800, letterSpacing: "0.1em" }}>ACTUAL OUTCOME</span>
            <span style={{ fontSize: "12px", color: "var(--ink-0)", fontWeight: 700 }}>{outcome.timeline_status.toUpperCase().replace('_', ' ')}</span>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "8px" }}>
            <Metric label="QUALITY" value={`${outcome.quality_score ?? '??'}%`} tone="var(--flux-up)" />
            <Metric label="CLIENT SAT" value={`${outcome.client_satisfaction ?? '?'}/5`} tone="var(--rpg-yellow)" />
            <Metric 
              label="BUDGET" 
              value={budgetVariance > 0 ? `+${Math.round(budgetVariance * 100)}%` : `${Math.round(budgetVariance * 100)}%`} 
              tone={budgetVariance > 0.1 ? "var(--rpg-red)" : "var(--flux-up)"} 
            />
          </div>

          <div style={{ marginTop: "auto", fontSize: "10px", color: "var(--ink-1)", fontStyle: "italic", lineHeight: 1.4 }}>
            &ldquo;{outcome.notes || "No debrief recorded."}&rdquo;
          </div>
        </div>
      </div>
    </div>
  );
}

function Metric({ label, value, tone }: { label: string; value: string; tone: string }) {
  return (
    <div style={{ display: "grid", gap: "4px" }}>
      <div style={{ fontSize: "9px", color: "var(--ink-1)", letterSpacing: "0.05em" }}>{label}</div>
      <div style={{ fontSize: "18px", color: tone, fontWeight: 800, fontFamily: "var(--font-mono)" }}>{value}</div>
    </div>
  );
}
