"use client";

import { useEffect, useState } from "react";
import type { WorldEvent } from "../app/command-center/_shared/types";
import { MenuWindow } from "./MenuWindow";

/**
 * WorldTicker — the "Animal Crossing" style daily bulletin.
 * 
 * Surfaced in the Cockpit, it shows the current world modifier
 * and its impact on the organization.
 */

interface Props {
  events: WorldEvent[];
}

export function WorldTicker({ events }: Props) {
  const [currentIndex, setCurrentIndex] = useState(0);

  // If multiple events today, rotate them every 8 seconds.
  useEffect(() => {
    if (events.length <= 1) return;
    const interval = setInterval(() => {
      setCurrentIndex((prev) => (prev + 1) % events.length);
    }, 8000);
    return () => clearInterval(interval);
  }, [events.length]);

  if (events.length === 0) {
    return (
      <MenuWindow title="World Bulletin">
        <div style={{ color: "var(--ink-1)", fontSize: "11px", padding: "10px 0" }}>
          The world is quiet today. Normal operating conditions apply.
        </div>
      </MenuWindow>
    );
  }

  const event = events[currentIndex];

  const accentColor: Record<string, string> = {
    stat_buff: "var(--flux-up)",
    fte_debuff: "var(--rpg-red)",
    xp_multiplier: "var(--rpg-yellow)",
  };

  return (
    <MenuWindow title="World Bulletin">
      <div style={{ display: "grid", gridTemplateColumns: "auto 1fr", gap: "16px", alignItems: "center", padding: "8px 0" }}>
        <div 
          className="anim-glow-pulse"
          style={{ 
            width: "12px", 
            height: "12px", 
            background: accentColor[event.modifier_type] || "var(--rpg-blue)",
            boxShadow: `0 0 8px ${accentColor[event.modifier_type] || "var(--rpg-blue)"}`
          }} 
        />
        <div style={{ display: "grid", gap: "2px" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
            <span style={{ fontSize: "14px", fontWeight: 800, color: "var(--ink-0)", textTransform: "uppercase", letterSpacing: "0.05em" }}>
              {event.name}
            </span>
            <span style={{ fontSize: "9px", color: "var(--ink-2)", fontFamily: "var(--font-mono)" }}>
              {new Date(event.event_date).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
            </span>
          </div>
          <div style={{ fontSize: "12px", color: "var(--ink-1)", lineHeight: 1.4 }}>
            {event.description}
          </div>
          <div style={{ 
            marginTop: "6px", 
            fontSize: "10px", 
            color: accentColor[event.modifier_type], 
            fontWeight: 700, 
            textTransform: "uppercase",
            letterSpacing: "0.1em",
            borderTop: "1px solid rgba(245,240,232,0.08)",
            paddingTop: "4px"
          }}>
            MODIFIER: {event.modifier_type.replace('_', ' ')}
          </div>
        </div>
      </div>
    </MenuWindow>
  );
}
